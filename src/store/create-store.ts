/**
 * createStore() implementation
 */

import { track, trigger } from '../core/dependency-tracker';
import type { ActionContext, Snapshot, StoreInstance, StorePlugin, WatchHandler, WatchOptions, WatchSource } from '../types';

/**
 * Callback context provided to createStore callback
 */
interface StoreCallbackContext<S> {
  state: (initialState: S) => void;
  computed: <K extends string>(name: K, fn: (state: S) => any) => void;
  action: <K extends string>(name: K, fn: (state: S, payload: any, context: ActionContext) => any) => void;
  use: (plugin: StorePlugin) => void;
}

/**
 * Internal store state
 */
interface StoreInternals<S extends object> {
  name: string;
  _state: S;
  _computed: Record<string, (state: S) => any>;
  _actions: Record<string, (state: S, payload: any, context: ActionContext) => any>;
  _plugins: StorePlugin[];
  _initialState: S | null;
  _dirtyKeys: Set<string>;
  _watchers: Map<string, Set<(newValue: any, oldValue: any) => void>>;
}

/**
 * Creates a reactive Store instance
 */
export function createStore<S extends object = any, C = any, A = any>(
  name: string,
  callback: (context: StoreCallbackContext<S>) => void
): StoreInstance<S, C, A> {
  const internals: StoreInternals<S> = {
    name,
    _state: {} as S,
    _computed: {},
    _actions: {},
    _plugins: [],
    _initialState: null,
    _dirtyKeys: new Set(),
    _watchers: new Map()
  };

  // Create the callback context
  const context: StoreCallbackContext<S> = {
    state: (initialState: S) => {
      internals._state = { ...initialState };
      internals._initialState = { ...initialState };
    },
    
    computed: (name, fn) => {
      internals._computed[name] = fn;
    },
    
    action: (name, fn) => {
      internals._actions[name] = fn;
    },
    
    use: (plugin) => {
      internals._plugins.push(plugin);
      // onInit will be called after store is fully initialized
    }
  };

  // Execute the callback to initialize the store
  callback(context);

  // Create reactive state proxy
  const stateProxy = new Proxy(internals._state, {
    get(target, key: string) {
      // Track dependency
      track(stateProxy, key);
      
      // Check if it's a computed property
      const computedFn = internals._computed[key];
      if (computedFn) {
        return computedFn(internals._state);
      }
      
      return target[key as keyof S];
    },
    
    set(target, key: string, value) {
      const oldValue = target[key as keyof S];
      
      if (oldValue !== value) {
        // Create a preview of the new state for validation
        const newStatePreview = { ...target, [key]: value } as S;
        
        // Notify plugins BEFORE mutation (for validation)
        internals._plugins.forEach(plugin => {
          if (plugin.onStateChange) {
            plugin.onStateChange(newStatePreview, target as S, storeInstance as any);
          }
        });
        
        // If we reach here, validation passed - now mutate
        target[key as keyof S] = value;
        
        // Track dirty state
        if (internals._initialState) {
          if (internals._initialState[key as keyof S] !== value) {
            internals._dirtyKeys.add(key);
          } else {
            internals._dirtyKeys.delete(key);
          }
        }
        
        // Trigger watchers
        const watchers = internals._watchers.get(key);
        if (watchers) {
          watchers.forEach(handler => handler(value, oldValue));
        }
        
        // Trigger wildcard watchers
        const wildcardWatchers = internals._watchers.get('*');
        if (wildcardWatchers) {
          wildcardWatchers.forEach(handler => handler(internals._state, { ...target, [key]: oldValue }));
        }
        
        // Trigger reactive updates
        trigger(stateProxy, key);
      }
      
      return true;
    }
  });

  // Create actions object with call() support
  const actionsProxy: any = {};
  const actionContext: ActionContext = {
    call: (actionName: string, payload?: any) => {
      const action = internals._actions[actionName];
      if (!action) {
        throw new Error(`Action '${actionName}' not found in store '${name}'`);
      }
      
      // Notify plugins
      internals._plugins.forEach(plugin => {
        if (plugin.onActionCall) {
          plugin.onActionCall(actionName, payload, storeInstance as any);
        }
      });
      
      return action(stateProxy as S, payload, actionContext);
    }
  };

  Object.keys(internals._actions).forEach(actionName => {
    actionsProxy[actionName] = (payload?: any) => {
      const action = internals._actions[actionName];
      if (!action) {
        throw new Error(`Action '${actionName}' not found in store '${name}'`);
      }
      
      // Notify plugins
      internals._plugins.forEach(plugin => {
        if (plugin.onActionCall) {
          plugin.onActionCall(actionName, payload, storeInstance as any);
        }
      });
      
      return action(stateProxy as S, payload, actionContext);
    };
  });

  // Create the store instance
  const storeInstance: StoreInstance<S, C, A> = {
    name,
    state: stateProxy as S & C,
    actions: actionsProxy as A,
    
    watch: (_fn: WatchSource | WatchSource[], handler: WatchHandler | WatchOptions) => {
      const actualHandler = typeof handler === 'function' ? handler : handler.then;
      
      // Simple implementation: watch all state properties
      const prevValues = new Map<string, any>();
      
      (Object.keys(internals._state) as Array<keyof S>).forEach(key => {
        prevValues.set(key as string, internals._state[key]);
        
        let watchers = internals._watchers.get(key as string);
        if (!watchers) {
          watchers = new Set();
          internals._watchers.set(key as string, watchers);
        }
        
        watchers.add((newValue, oldValue) => {
          actualHandler(newValue, oldValue);
        });
      });
      
      return () => {
        // Remove watchers
        (Object.keys(internals._state) as Array<keyof S>).forEach(key => {
          const watchers = internals._watchers.get(key as string);
          if (watchers) {
            watchers.forEach(w => watchers.delete(w));
          }
        });
      };
    },
    
    isDirty: (key?: string) => {
      if (key) {
        return internals._dirtyKeys.has(key);
      }
      return internals._dirtyKeys.size > 0;
    },
    
    getDirty: () => {
      const dirty: Partial<S> = {};
      internals._dirtyKeys.forEach(key => {
        dirty[key as keyof S] = internals._state[key as keyof S];
      });
      return dirty;
    },
    
    diff: (snapshot?: Snapshot<S>) => {
      const compareWith = snapshot || internals._initialState || ({} as S);
      const diff: Record<string, { from: any; to: any }> = {};
      
      (Object.keys(internals._state) as Array<keyof S>).forEach(key => {
        const currentValue = internals._state[key];
        const compareValue = compareWith[key];
        
        if (currentValue !== compareValue) {
          diff[key as string] = { from: compareValue, to: currentValue };
        }
      });
      
      return diff;
    },
    
    reset: () => {
      if (internals._initialState) {
        (Object.keys(internals._initialState) as Array<keyof S>).forEach(key => {
          internals._state[key] = internals._initialState![key];
        });
        internals._dirtyKeys.clear();
        
        // Trigger updates for all properties
        (Object.keys(internals._state) as Array<keyof S>).forEach(key => {
          trigger(stateProxy, key as string);
        });
      }
    },
    
    plugin: (plugin: StorePlugin) => {
      internals._plugins.push(plugin);
      if (plugin.onInit) {
        plugin.onInit(storeInstance as any);
      }
    }
  };

  // Call onInit for plugins
  internals._plugins.forEach(plugin => {
    if (plugin.onInit) {
      plugin.onInit(storeInstance as any);
    }
  });

  return storeInstance;
}
