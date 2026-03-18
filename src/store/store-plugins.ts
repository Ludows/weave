/**
 * Plugin system for stores
 * 
 * Provides built-in plugins for common store patterns:
 * - persist: Save/restore state to storage
 * - logger: Log state changes and actions
 * - validate: Validate state mutations
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
    
    onStateChange: (newState) => {
      if (!storage) return;

      // Debounce saves
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
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
    
    onStateChange: (newState, oldState) => {
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
    
    onActionCall: (actionName, payload) => {
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

/**
 * Devtools plugin - Integrates with browser devtools (placeholder for future implementation)
 * 
 * @example
 * ```ts
 * createStore('cart', ({ state, use }) => {
 *   state({ items: [] });
 *   use(devtools({ name: 'Cart Store' }));
 * });
 * ```
 */
export function devtools(options: {
  name?: string;
  enabled?: boolean;
} = {}): StorePlugin {
  const { name = 'Store', enabled = process.env.NODE_ENV !== 'production' } = options;

  if (!enabled) {
    return { name: 'devtools' };
  }

  return {
    name: 'devtools',
    
    onInit: (store) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[devtools] ${name} initialized`, store);
      }
    },
    
    onStateChange: (newState, oldState) => {
      // Future: integrate with Redux DevTools Extension or similar
      if (process.env.NODE_ENV !== 'production') {
        (window as any).__WEAVE_DEVTOOLS__?.push({
          type: 'STATE_CHANGE',
          storeName: name,
          newState,
          oldState,
          timestamp: Date.now()
        });
      }
    },
    
    onActionCall: (actionName, payload) => {
      if (process.env.NODE_ENV !== 'production') {
        (window as any).__WEAVE_DEVTOOLS__?.push({
          type: 'ACTION_CALL',
          storeName: name,
          actionName,
          payload,
          timestamp: Date.now()
        });
      }
    }
  };
}

