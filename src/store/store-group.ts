/**
 * createStoreGroup() implementation
 */

import { track } from '../core/dependency-tracker';
import type { GroupActionContext, StoreGroupInstance, Unwatch, WatchHandler, WatchOptions, WatchSource } from '../types';

/**
 * Callback context provided to createStoreGroup callback
 */
interface StoreGroupCallbackContext<G> {
  computed: <K extends string>(name: K, fn: (stores: G) => any) => void;
  action: <K extends string>(name: K, fn: (stores: G, payload: any, context: GroupActionContext) => any) => void;
  watch: (fn: WatchSource | WatchSource[], handler: WatchHandler | WatchOptions) => Unwatch;
}

/**
 * Internal store group state
 */
interface StoreGroupInternals<G extends object> {
  name: string;
  stores: G;
  _computed: Record<string, (stores: G) => any>;
  _actions: Record<string, (stores: G, payload: any, context: GroupActionContext) => any>;
  _watchers: Map<string, Set<(newValue: any, oldValue: any) => void>>;
}

/**
 * Creates a Store Group that orchestrates multiple stores
 */
export function createStoreGroup<G extends object = any, C = any, A = any>(
  name: string,
  stores: G,
  callback: (context: StoreGroupCallbackContext<G>) => void
): StoreGroupInstance<G, C, A> {
  const internals: StoreGroupInternals<G> = {
    name,
    stores,
    _computed: {},
    _actions: {},
    _watchers: new Map()
  };

  // Create the callback context
  const context: StoreGroupCallbackContext<G> = {
    computed: (name, fn) => {
      internals._computed[name] = fn;
    },
    
    action: (name, fn) => {
      internals._actions[name] = fn;
    },
    
    watch: (_fn: WatchSource | WatchSource[], handler: WatchHandler | WatchOptions) => {
      const actualHandler = typeof handler === 'function' ? handler : handler.then;
      
      // Watch all stores for changes
      const unwatchFns: Unwatch[] = [];
      
      (Object.values(stores) as any[]).forEach((store: any) => {
        if (store && typeof store.watch === 'function') {
          const unwatch = store.watch('*', (newValue: any, oldValue: any) => {
            actualHandler(newValue, oldValue);
          });
          unwatchFns.push(unwatch);
        }
      });
      
      return () => {
        unwatchFns.forEach(unwatch => unwatch());
      };
    }
  };

  // Execute the callback to initialize the group
  callback(context);

  // Create reactive state proxy for computed properties
  const stateProxy: any = new Proxy({}, {
    get(_target, key: string) {
      // Track dependency
      track(stateProxy, key);
      
      // Check if it's a computed property
      const computedFn = internals._computed[key];
      if (computedFn) {
        return computedFn(internals.stores);
      }
      
      return undefined;
    }
  });

  // Create actions object with call() support
  const actionsProxy: any = {};
  const actionContext: GroupActionContext = {
    call: (path: string, payload?: any) => {
      // Parse 'storeName.actionName' syntax
      const parts = path.split('.');
      
      if (parts.length === 2) {
        const storeName = parts[0];
        const actionName = parts[1];
        
        if (!storeName || !actionName) {
          throw new Error(`Invalid action path: ${path}`);
        }
        
        const store = (internals.stores as any)[storeName];
        
        if (!store) {
          throw new Error(`Store '${storeName}' not found in group '${name}'`);
        }
        
        if (!store.actions || !store.actions[actionName]) {
          throw new Error(`Action '${actionName}' not found in store '${storeName}'`);
        }
        
        return store.actions[actionName](payload);
      } else if (parts.length === 1) {
        // Call a group action
        const actionName = parts[0];
        
        if (!actionName) {
          throw new Error(`Invalid action path: ${path}`);
        }
        
        const action = internals._actions[actionName];
        
        if (!action) {
          throw new Error(`Action '${actionName}' not found in group '${name}'`);
        }
        
        return action(internals.stores, payload, actionContext);
      } else {
        throw new Error(`Invalid action path: ${path}`);
      }
    }
  };

  Object.keys(internals._actions).forEach(actionName => {
    const action = internals._actions[actionName];
    if (action) {
      actionsProxy[actionName] = (payload?: any) => {
        return action(internals.stores, payload, actionContext);
      };
    }
  });

  // Create the store group instance
  const groupInstance: StoreGroupInstance<G, C, A> = {
    name,
    stores: internals.stores,
    state: stateProxy as C,
    actions: actionsProxy as A,
    
    watch: (_fn: WatchSource | WatchSource[], handler: WatchHandler | WatchOptions) => {
      const actualHandler = typeof handler === 'function' ? handler : handler.then;
      
      // Watch all stores for changes
      const unwatchFns: Unwatch[] = [];
      
      (Object.values(stores) as any[]).forEach((store: any) => {
        if (store && typeof store.watch === 'function') {
          const unwatch = store.watch('*', (newValue: any, oldValue: any) => {
            actualHandler(newValue, oldValue);
          });
          unwatchFns.push(unwatch);
        }
      });
      
      return () => {
        unwatchFns.forEach(unwatch => unwatch());
      };
    }
  };

  return groupInstance;
}
