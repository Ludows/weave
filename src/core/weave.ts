/**
 * Core weave() function - FIXED VERSION
 */

import { createHeadManager, type HeadConfig } from '../advanced/head';
import { devWarn } from '../utils/dev-mode';
import { initCloak } from '../dom/cloak';
import { nextTick as nextTickFn } from '../utils/next-tick';
import { promise as promiseFn, promiseWithWatch } from '../advanced/promise';
import { createSyncManager, type SyncOptions } from '../advanced/sync';
import { createEventDelegator, type EventHandler, type Unlisten } from '../dom/event-delegation';
import { NodeRef } from '../dom/node-ref';
import { batch as batchFn } from '../reactive/batch';
import { computed as createComputed } from '../reactive/computed';
import { ref as createRef } from '../reactive/ref';
import { memo as memoFn, watch as watchFn } from '../reactive/watch';
import type { CallbackContext, ContextMacroFn, ObserveInstance, Ref, Snapshot } from '../types';
import { createReactiveEffect, runEffect, track, trigger } from './dependency-tracker';
import { cleanupLocalMacros, getLocalRegistry, injectContextMacros, injectNodeRefMacros } from './macro';
import { createProxyHandler, type ProxyTarget } from './proxy';

function getStateSnapshot<S = any>(proxyTarget: ProxyTarget, instanceState: InstanceState): Readonly<S> {
  const snapshot: any = {};
  instanceState.refs.forEach((refObj, key) => {
    snapshot[key] = refObj.value;
  });
  // Use computed functions directly to get fresh values
  Object.keys(proxyTarget._computed).forEach(key => {
    const computedFn = proxyTarget._computed[key];
    snapshot[key] = computedFn ? computedFn() : undefined;
  });
  Object.keys(proxyTarget._state).forEach(key => {
    if (!snapshot[key]) {
      snapshot[key] = proxyTarget._state[key];
    }
  });
  return Object.freeze(snapshot) as Readonly<S>;
}

function triggerUpdateHooks<S = any>(proxyTarget: ProxyTarget, instanceState: InstanceState) {
  if (!instanceState.isInitialized) return;
  
  const newState = getStateSnapshot<S>(proxyTarget, instanceState);
  const oldState = instanceState.previousState as Readonly<S>;
  
  instanceState.lifecycleHooks.onUpdate.forEach(hook => {
    try {
      hook(newState, oldState);
    } catch (error) {
      handleError(error as Error, 'onUpdate', instanceState);
    }
  });
  
  instanceState.previousState = newState;
}

interface InstanceState {
  refs: Map<string, Ref<any>>;
  computedRefs: Map<string, any>;
  nodeRefs: Map<string, any>;
  cleanupFns: Array<() => void>;
  eventDelegator: any; // EventDelegator instance
  lifecycleHooks: {
    onInit: Array<(state: Snapshot<any>) => void | Promise<void>>;
    onUpdate: Array<(newState: Snapshot<any>, oldState: Snapshot<any>) => void>;
    onDestroy: Array<(state: Snapshot<any>) => void>;
    onError: Array<(error: Error, info: string) => void>;
  };
  isInitialized: boolean;
  previousState: Snapshot<any> | null;
  initialState: Snapshot<any> | null;
  dirtyKeys: Set<string>;
  originalSelector?: string; // For sync() reattachment
}

function handleError(error: Error, info: string, instanceState: InstanceState): void {
  const handlers = instanceState.lifecycleHooks.onError;
  if (handlers.length > 0) {
    handlers.forEach(handler => {
      try {
        handler(error, info);
      } catch {
        console.error(`[Weave] Error in onError handler:`, error);
      }
    });
  } else if (process.env.NODE_ENV !== 'production') {
    console.error(`[Weave] Unhandled error in ${info}:`, error);
  }
}

export function weave<S = any>(
  target: string | Element,
  callback: (context: CallbackContext<S>) => void
): ObserveInstance<S> | ObserveInstance<S>[] {
  let elements: Element[];
  const originalSelector = typeof target === 'string' ? target : undefined;
  
  if (typeof target === 'string') {
    if (!target.trim()) {
      throw new Error(`weave(): selector cannot be empty`);
    }
    const nodeList = document.querySelectorAll(target);
    if (nodeList.length === 0) {
      throw new Error(`weave(): element not found (${target})`);
    }
    elements = Array.from(nodeList);
  } else if (target instanceof Element) {
    elements = [target];
  } else {
    throw new Error(`weave(): invalid target — expected a CSS selector or Element`);
  }
  
  if (elements.length > 1) {
    return elements.map(el => createInstance(el, callback, originalSelector)) as ObserveInstance<S>[];
  }
  
  return createInstance(elements[0]!, callback, originalSelector);
}

function createInstance<S = any>(
  element: Element,
  callback: (context: CallbackContext<S>) => void,
  originalSelector?: string
): ObserveInstance<S> {
  const proxyTarget: ProxyTarget = {
    _state: {},
    _computed: {},
    _watchers: new Map(),
    _directives: new Map(),
    _utils: {},
    _el: element
  };
  
  const instanceState: InstanceState = {
    refs: new Map(),
    computedRefs: new Map(),
    nodeRefs: new Map(),
    cleanupFns: [],
    eventDelegator: createEventDelegator(element),
    lifecycleHooks: {
      onInit: [],
      onUpdate: [],
      onDestroy: [],
      onError: []
    },
    isInitialized: false,
    previousState: null,
    initialState: null,
    dirtyKeys: new Set(),
    originalSelector: originalSelector
  };
  
  // Create utils API first
  proxyTarget._utils = createUtilsAPI(proxyTarget, null as any, instanceState);
  
  const handler = createProxyHandler(proxyTarget, (key: string) => {
    if (instanceState.isInitialized && instanceState.initialState) {
      instanceState.dirtyKeys.add(key);
    }
    triggerUpdateHooks(proxyTarget, instanceState);
  });
  
  const proxy = new Proxy(proxyTarget, handler) as unknown as ObserveInstance<S>;
  
  const context: CallbackContext<S> = createCallbackContext(proxyTarget, proxy, instanceState);
  
  try {
    callback(context);
  } catch (error) {
    handleError(error as Error, 'callback', instanceState);
  }

  // Execute onInit hooks using Promise.resolve() for better test compatibility
  Promise.resolve().then(async () => {
    const initialSnapshot = getStateSnapshot<S>(proxyTarget, instanceState);
    instanceState.initialState = initialSnapshot;
    instanceState.previousState = initialSnapshot;

    // Execute onInit hooks
    for (const hook of instanceState.lifecycleHooks.onInit) {
      try {
        await hook(initialSnapshot);
      } catch (error) {
        handleError(error as Error, 'onInit', instanceState);
      }
    }

    // Mark as initialized AFTER onInit hooks complete
    instanceState.isInitialized = true;

    // Remove [weave-cloak] attributes now that the instance is ready
    initCloak(element);
  });
  
  return proxy;
}

function createCallbackContext<S = any>(
  proxyTarget: ProxyTarget,
  proxy: ObserveInstance<S>,
  instanceState: InstanceState
): CallbackContext<S> {
  let refCounter = 0;
  
  // Create base context object
  const context: CallbackContext<S> = {
    $: (selector: string) => {
      if (!selector || !selector.trim()) {
        devWarn('$() called with empty selector');
      }
      // Check if NodeRef already cached
      if (!instanceState.nodeRefs.has(selector)) {
        const nodeRef = new NodeRef(selector, proxyTarget._el!);
        // Inject NodeRef macros before caching
        const enhancedNodeRef = injectNodeRefMacros(nodeRef, instanceState);
        instanceState.nodeRefs.set(selector, enhancedNodeRef);
      }
      return instanceState.nodeRefs.get(selector);
    },
    on: (event: string, selector: string | Document | Window, handler: EventHandler): Unlisten => {
      return instanceState.eventDelegator.on(event, selector, handler);
    },
    off: (event?: string, selector?: string | Document | Window, handler?: EventHandler) => {
      instanceState.eventDelegator.off(event, selector, handler);
    },
    ref: <T>(initialValue: T) => {
      const refObj = createRef(initialValue);
      const refKey = `ref_${refCounter++}`;
      instanceState.refs.set(refKey, refObj);
      proxyTarget._state[refKey] = refObj.value;
      
      Object.defineProperty(refObj, 'value', {
        get() {
          // Track dependency
          track(refObj, 'value');
          return proxyTarget._state[refKey];
        },
        set(newValue: T) {
          const oldValue = proxyTarget._state[refKey];
          if (oldValue !== newValue) {
            proxyTarget._state[refKey] = newValue;
            // Trigger dependencies
            trigger(refObj, 'value');
            triggerUpdateHooks(proxyTarget, instanceState);
          }
        },
        enumerable: true,
        configurable: true
      });
      return refObj;
    },
    computed: (name: string, fn: () => unknown) => {
      const computedRef = createComputed(fn);
      instanceState.computedRefs.set(name, computedRef);
      proxyTarget._computed[name] = fn;
    },
    state: () => {
      return getStateSnapshot<S>(proxyTarget, instanceState);
    },
    batch: (fn: any) => {
      return batchFn(fn);
    },
    promise: <T>(url: string | (() => string), options?: any) => {
      if (typeof url === 'function' && options?.watch) {
        return promiseWithWatch<T>(url, options, proxyTarget);
      }
      return promiseFn<T>(url, options);
    },
    store: (storeInstance: any) => {
      return storeInstance;
    },
    head: (config: HeadConfig) => {
      createHeadManager(proxy, config, instanceState.cleanupFns);
    },
    watch: (fn: any, handler: any) => {
      return watchFn(fn, handler);
    },
    when: (condition: () => boolean, fn: () => void) => {
      const effect = createReactiveEffect(() => {
        if (condition()) {
          fn();
        }
      });
      runEffect(effect);
      instanceState.cleanupFns.push(() => {
        effect.deps.forEach(dep => dep.effects.delete(effect));
        effect.deps.clear();
      });
    },
    unless: (condition: () => boolean, fn: () => void) => {
      const effect = createReactiveEffect(() => {
        if (!condition()) {
          fn();
        }
      });
      runEffect(effect);
      instanceState.cleanupFns.push(() => {
        effect.deps.forEach(dep => dep.effects.delete(effect));
        effect.deps.clear();
      });
    },
    memo: <T>(fn: () => T) => {
      return memoFn(fn);
    },
    has: (key: string, value?: unknown) => {
      if (value !== undefined) {
        return proxyTarget._state[key] === value;
      }
      return key in proxyTarget._state || key in proxyTarget._computed;
    },
    sync: (options: SyncOptions) => {
      createSyncManager(proxyTarget, options, {
        originalSelector: instanceState.originalSelector,
        state: () => getStateSnapshot(proxyTarget, instanceState),
        directives: [], // Not needed - onInit replay handles this
        observers: [], // MutationObservers are managed by NodeRefs
        listeners: [], // Event listeners are managed by eventDelegator
        onInitHooks: instanceState.lifecycleHooks.onInit,
        rootElement: proxyTarget._el,
        replayDirectives: (newElement: Element) => {
          // Update root element
          proxyTarget._el = newElement;
          
          // Clear NodeRef cache so they resolve against new DOM
          instanceState.nodeRefs.clear();
        }
      });
    },
    onInit: (fn: (state: Readonly<S>) => void | Promise<void>) => {
      instanceState.lifecycleHooks.onInit.push(fn);
    },
    onUpdate: (fn: (newState: Readonly<S>, oldState: Readonly<S>) => void) => {
      instanceState.lifecycleHooks.onUpdate.push(fn);
    },
    onDestroy: (fn: (state: Readonly<S>) => void) => {
      instanceState.lifecycleHooks.onDestroy.push(fn);
    },
    cleanup: (fn: () => void) => {
      instanceState.cleanupFns.push(fn);
    },
    nextTick: (fn?: () => void) => {
      return nextTickFn(fn);
    },
    dispatch: (eventName: string, data?: unknown) => {
      const event = new CustomEvent(eventName, {
        detail: data,
        bubbles: true,
        cancelable: true
      });
      proxyTarget._el?.dispatchEvent(event);
    },
    $refs: () => {
      const refsMap: Record<string, Element> = {};
      proxyTarget._el?.querySelectorAll('[weave-ref]').forEach(el => {
        const name = el.getAttribute('weave-ref');
        if (name) refsMap[name] = el;
      });
      return refsMap;
    },
    onError: (fn: (error: Error, info: string) => void) => {
      instanceState.lifecycleHooks.onError.push(fn);
    },
    $el: proxyTarget._el!,
    macro: (name: string, fn: ContextMacroFn) => {
      // Get or create local registry for this instance
      const registry = getLocalRegistry(instanceState);
      
      // Register the macro to the local registry
      registry.context.set(name, fn);
      
      // Immediately inject the macro into the current context
      // Wrap the macro to inject context as first parameter
      (context as any)[name] = (...args: any[]) => fn(context, ...args);
    }
  };
  
  // Inject global and local context macros into the context
  return injectContextMacros(context, instanceState);
}

function createUtilsAPI<S = any>(
  proxyTarget: ProxyTarget,
  _proxy: ObserveInstance<S> | null,
  instanceState: InstanceState
): any {
  return {
    state: () => {
      return getStateSnapshot<S>(proxyTarget, instanceState);
    },
    patch: (updates: Partial<S>) => {
      Object.keys(updates).forEach(key => {
        proxyTarget._state[key] = updates[key as keyof S];
      });
      triggerUpdateHooks(proxyTarget, instanceState);
    },
    batch: (fn: any) => {
      return batchFn(fn);
    },
    emit: (eventName: string, data?: unknown) => {
      const event = new CustomEvent(eventName, {
        detail: data,
        bubbles: true,
        cancelable: true
      });
      proxyTarget._el?.dispatchEvent(event);
    },
    destroy: () => {
      // Execute onDestroy hooks first
      const finalState = getStateSnapshot(proxyTarget, instanceState);
      instanceState.lifecycleHooks.onDestroy.forEach(fn => {
        try {
          fn(finalState);
        } catch (error) {
          handleError(error as Error, 'onDestroy', instanceState);
        }
      });
      
      // Cleanup local macros before other cleanup
      cleanupLocalMacros(instanceState);
      
      // Destroy event delegator
      if (instanceState.eventDelegator) {
        instanceState.eventDelegator.destroy();
      }
      
      // Then execute cleanup functions
      instanceState.cleanupFns.forEach(fn => fn());
      
      // Clear all state
      instanceState.refs.clear();
      instanceState.computedRefs.clear();
      instanceState.nodeRefs.clear();
      instanceState.cleanupFns = [];
      instanceState.lifecycleHooks.onInit = [];
      instanceState.lifecycleHooks.onUpdate = [];
      instanceState.lifecycleHooks.onDestroy = [];
    },
    onInit: (fn: (state: Readonly<S>) => void | Promise<void>) => {
      instanceState.lifecycleHooks.onInit.push(fn);
    },
    onUpdate: (fn: (newState: Readonly<S>, oldState: Readonly<S>) => void) => {
      instanceState.lifecycleHooks.onUpdate.push(fn);
      return () => {
        const index = instanceState.lifecycleHooks.onUpdate.indexOf(fn);
        if (index > -1) {
          instanceState.lifecycleHooks.onUpdate.splice(index, 1);
        }
      };
    },
    onDestroy: (fn: (state: Readonly<S>) => void) => {
      instanceState.lifecycleHooks.onDestroy.push(fn);
    },
    isDirty: (key?: string) => {
      if (key) {
        return instanceState.dirtyKeys.has(key);
      }
      return instanceState.dirtyKeys.size > 0;
    },
    getDirty: () => {
      const dirty: any = {};
      const currentState = getStateSnapshot<S>(proxyTarget, instanceState);
      instanceState.dirtyKeys.forEach(key => {
        dirty[key] = (currentState as any)[key];
      });
      return dirty as Partial<S>;
    },
    diff: (snapshot?: Readonly<S>) => {
      const compareWith = snapshot || instanceState.initialState;
      if (!compareWith) return {};
      
      const currentState = getStateSnapshot<S>(proxyTarget, instanceState);
      const diff: any = {};
      
      Object.keys(currentState).forEach(key => {
        const currentValue = (currentState as any)[key];
        const oldValue = (compareWith as any)[key];
        if (currentValue !== oldValue) {
          diff[key] = { from: oldValue, to: currentValue };
        }
      });
      
      return diff;
    },
    reset: () => {
      if (!instanceState.initialState) return;
      
      Object.keys(instanceState.initialState).forEach(key => {
        proxyTarget._state[key] = (instanceState.initialState as any)[key];
      });
      
      instanceState.dirtyKeys.clear();
      triggerUpdateHooks(proxyTarget, instanceState);
    }
  };
}
