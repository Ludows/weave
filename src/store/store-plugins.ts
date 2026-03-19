/**
 * Plugin system for stores
 *
 * Provides built-in plugins for common store patterns:
 * - persist: Save/restore state to storage
 * - logger: Log state changes and actions
 * - validate: Validate state mutations
 * - devtools: Redux DevTools Extension integration + standalone inspector
 */

import type { StorePlugin } from '../types';

/**
 * Persist plugin - Saves store state to storage (localStorage, sessionStorage, etc.)
 *
 * @example
 * ```ts
 * createStore('cart', ({ state, use }) => {
 *   state({ items: [] });
 *   use(persist({ key: 'cart', storage: localStorage }));
 * });
 * ```
 */
export function persist(options: {
  key: string;
  storage?: Storage;
  include?: string[];
  exclude?: string[];
  debounce?: number;
}): StorePlugin {
  const {
    key,
    storage = typeof window !== 'undefined' ? window.localStorage : undefined,
    include,
    exclude,
    debounce = 300
  } = options;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return {
    name: 'persist',
    priority: 5, // Run early to restore state before other plugins

    onInit: (store) => {
      if (!storage) return;

      try {
        const saved = storage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);

          // Restore state
          (Object.keys(parsed) as string[]).forEach(k => {
            if (include && !include.includes(k)) return;
            if (exclude && exclude.includes(k)) return;
            (store.state as any)[k] = parsed[k];
          });
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[persist] Failed to restore state:', error);
        }
      }
    },

    onAfterStateChange: (newState) => {
      if (!storage) return;

      // Debounce saves
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        timeoutId = null;
        try {
          const toSave: any = {};

          (Object.keys(newState as object) as string[]).forEach(k => {
            if (include && !include.includes(k)) return;
            if (exclude && exclude.includes(k)) return;
            toSave[k] = (newState as any)[k];
          });

          storage.setItem(key, JSON.stringify(toSave));
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('[persist] Failed to save state:', error);
          }
        }
      }, debounce);
    },

    onDestroy: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }
  };
}

/**
 * Logger plugin - Logs state changes and action calls
 *
 * @example
 * ```ts
 * createStore('cart', ({ state, use }) => {
 *   state({ items: [] });
 *   use(logger({ prefix: '[cart]', collapsed: true }));
 * });
 * ```
 */
export function logger(options: {
  prefix?: string;
  collapsed?: boolean;
  logState?: boolean;
  logActions?: boolean;
} = {}): StorePlugin {
  const {
    prefix = '[store]',
    collapsed = false,
    logState = true,
    logActions = true
  } = options;

  const log = collapsed ? console.groupCollapsed : console.group;

  return {
    name: 'logger',

    onInit: (store) => {
      if (process.env.NODE_ENV === 'production') return;
      console.log(`${prefix} initialized`, store.state);
    },

    onAfterStateChange: (newState, oldState) => {
      if (process.env.NODE_ENV === 'production' || !logState) return;

      log(`${prefix} state changed`);
      console.log('prev:', oldState);
      console.log('next:', newState);

      // Show diff
      const diff: any = {};
      (Object.keys(newState as object) as string[]).forEach(key => {
        if ((newState as any)[key] !== (oldState as any)[key]) {
          diff[key] = {
            from: (oldState as any)[key],
            to: (newState as any)[key]
          };
        }
      });

      if (Object.keys(diff).length > 0) {
        console.log('diff:', diff);
      }

      console.groupEnd();
    },

    onBeforeAction: (actionName, payload) => {
      if (process.env.NODE_ENV === 'production' || !logActions) return;

      log(`${prefix} action: ${actionName}`);
      if (payload !== undefined) {
        console.log('payload:', payload);
      }
      console.groupEnd();
    }
  };
}

/**
 * Validate plugin - Validates state mutations
 *
 * @example
 * ```ts
 * createStore('cart', ({ state, use }) => {
 *   state({ items: [], total: 0 });
 *   use(validate({
 *     items: (val) => Array.isArray(val),
 *     total: (val) => typeof val === 'number' && val >= 0
 *   }));
 * });
 * ```
 */
export function validate(validators: Record<string, (value: any) => boolean | string>): StorePlugin {
  return {
    name: 'validate',
    priority: 1, // Validation runs first

    onStateChange: (newState) => {
      (Object.keys(validators) as string[]).forEach(key => {
        const validator = validators[key];
        if (!validator) return;

        const value = (newState as any)[key];
        const result = validator(value);

        if (result === false) {
          const error = `[validate] Validation failed for "${key}": ${JSON.stringify(value)}`;
          if (process.env.NODE_ENV !== 'production') {
            console.error(error);
          }
          throw new Error(error);
        } else if (typeof result === 'string') {
          const error = `[validate] ${result}`;
          if (process.env.NODE_ENV !== 'production') {
            console.error(error);
          }
          throw new Error(error);
        }
      });
    }
  };
}

// ─── DevTools types ─────────────────────────────────────────────────

export interface DevtoolsEvent {
  type: 'INIT' | 'STATE_CHANGE' | 'ACTION' | 'ERROR' | 'DESTROY';
  storeName: string;
  timestamp: number;
  payload?: any;
}

export interface DevtoolsInspector {
  /** All registered stores */
  stores: Map<string, { state: any; name: string }>;
  /** Full event timeline */
  events: DevtoolsEvent[];
  /** Get current state snapshot for a store */
  getState: (storeName: string) => any;
  /** Get all events for a store */
  getEvents: (storeName?: string) => DevtoolsEvent[];
  /** Clear event timeline */
  clear: () => void;
}

/** Redux DevTools Extension interface */
interface ReduxDevToolsExtension {
  connect: (options?: { name?: string }) => ReduxDevToolsInstance;
}

interface ReduxDevToolsInstance {
  init: (state: any) => void;
  send: (action: string | { type: string; payload?: any }, state: any) => void;
  subscribe: (listener: (message: any) => void) => (() => void);
}

// ─── Global inspector singleton ─────────────────────────────────────

function getInspector(): DevtoolsInspector {
  const win = typeof window !== 'undefined' ? window as any : undefined;
  if (!win) {
    // SSR fallback
    return { stores: new Map(), events: [], getState: () => undefined, getEvents: () => [], clear: () => {} };
  }

  if (!win.__WEAVE_DEVTOOLS__) {
    const stores = new Map<string, { state: any; name: string }>();
    const events: DevtoolsEvent[] = [];

    win.__WEAVE_DEVTOOLS__ = {
      stores,
      events,
      getState: (storeName: string) => {
        const entry = stores.get(storeName);
        return entry ? { ...entry.state } : undefined;
      },
      getEvents: (storeName?: string) => {
        if (storeName) {
          return events.filter(e => e.storeName === storeName);
        }
        return [...events];
      },
      clear: () => {
        events.length = 0;
      }
    } satisfies DevtoolsInspector;
  }

  return win.__WEAVE_DEVTOOLS__ as DevtoolsInspector;
}

// ─── Redux DevTools connection cache ─────────────────────────────────

const devtoolsConnections = new Map<string, ReduxDevToolsInstance>();

function getReduxDevTools(): ReduxDevToolsExtension | undefined {
  if (typeof window !== 'undefined') {
    return (window as any).__REDUX_DEVTOOLS_EXTENSION__;
  }
  return undefined;
}

// ─── devtools plugin ─────────────────────────────────────────────────

/**
 * Devtools plugin - Integrates with Redux DevTools Extension and provides
 * a standalone inspector API at `window.__WEAVE_DEVTOOLS__`.
 *
 * Features:
 * - Redux DevTools Extension integration (time-travel, action replay)
 * - Standalone state inspector via `window.__WEAVE_DEVTOOLS__`
 * - Full event timeline (init, state changes, actions, errors, destroy)
 *
 * @example
 * ```ts
 * createStore('cart', ({ state, use }) => {
 *   state({ items: [] });
 *   use(devtools({ name: 'Cart Store' }));
 * });
 *
 * // Inspect in console:
 * window.__WEAVE_DEVTOOLS__.getState('Cart Store');
 * window.__WEAVE_DEVTOOLS__.getEvents('Cart Store');
 * window.__WEAVE_DEVTOOLS__.stores; // Map of all stores
 * ```
 */
export function devtools(options: {
  name?: string;
  enabled?: boolean;
  maxEvents?: number;
} = {}): StorePlugin {
  const {
    name = 'Store',
    enabled = process.env.NODE_ENV !== 'production',
    maxEvents = 500
  } = options;

  if (!enabled) {
    return { name: 'devtools' };
  }

  const inspector = getInspector();
  let rdtInstance: ReduxDevToolsInstance | undefined;

  function pushEvent(event: DevtoolsEvent): void {
    inspector.events.push(event);
    // Cap timeline size
    if (inspector.events.length > maxEvents) {
      inspector.events.splice(0, inspector.events.length - maxEvents);
    }
  }

  return {
    name: 'devtools',
    priority: 99, // Run last — observe everything

    onInit: (store) => {
      // Register in inspector
      inspector.stores.set(name, { state: store.state, name });

      pushEvent({
        type: 'INIT',
        storeName: name,
        timestamp: Date.now(),
        payload: { state: Object.assign({}, store.state) }
      });

      // Connect to Redux DevTools Extension
      const rdt = getReduxDevTools();
      if (rdt) {
        rdtInstance = rdt.connect({ name: `Weave: ${name}` });
        rdtInstance.init(Object.assign({}, store.state));
        devtoolsConnections.set(name, rdtInstance);

        // Listen for time-travel from DevTools
        rdtInstance.subscribe((message: any) => {
          if (message.type === 'DISPATCH' && message.state) {
            try {
              const newState = JSON.parse(message.state);
              Object.keys(newState).forEach(key => {
                (store.state as any)[key] = newState[key];
              });
            } catch {
              // Ignore parse errors from DevTools
            }
          }
        });
      }
    },

    onAfterStateChange: (newState, oldState) => {
      pushEvent({
        type: 'STATE_CHANGE',
        storeName: name,
        timestamp: Date.now(),
        payload: { newState: { ...newState as any }, oldState: { ...oldState as any } }
      });

      // Send to Redux DevTools
      if (rdtInstance) {
        rdtInstance.send({ type: 'STATE_CHANGE' }, { ...newState as any });
      }
    },

    onBeforeAction: (actionName, payload) => {
      pushEvent({
        type: 'ACTION',
        storeName: name,
        timestamp: Date.now(),
        payload: { actionName, payload }
      });

      // Send to Redux DevTools
      if (rdtInstance) {
        rdtInstance.send({ type: actionName, payload }, undefined as any);
      }
    },

    onError: (error, context) => {
      pushEvent({
        type: 'ERROR',
        storeName: name,
        timestamp: Date.now(),
        payload: { error: error.message, context }
      });
    },

    onDestroy: () => {
      pushEvent({
        type: 'DESTROY',
        storeName: name,
        timestamp: Date.now()
      });

      inspector.stores.delete(name);
      devtoolsConnections.delete(name);
    }
  };
}

/**
 * Get the global devtools inspector (useful for testing or programmatic access)
 */
export function getDevtoolsInspector(): DevtoolsInspector {
  return getInspector();
}
