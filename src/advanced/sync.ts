/**
 * sync() DOM reattachment system
 * 
 * Allows Proxy_Instance to reattach after DOM replacement,
 * useful for page transition libraries like Swup, Turbo, and Barba.js
 */

export interface SyncOptions {
  before?: () => void;
  after?: () => void;
  target?: () => Element;
  restore?: boolean;  // default: true
}

interface SyncSnapshot {
  state: any;
  directives: any[];
  observers: MutationObserver[];
  listeners: any[];
  originalSelector?: string;
}

export function createSyncManager(
  _instance: any,
  options: SyncOptions,
  internals: any
): void {
  const snapshot: SyncSnapshot = {
    state: {},
    directives: [],
    observers: [],
    listeners: [],
    originalSelector: internals.originalSelector
  };
  
  const restore = options.restore !== false; // default to true
  
  // Setup before callback
  if (options.before) {
    const beforeHandler = () => {
      options.before!();
      
      // Snapshot current state
      snapshot.state = internals.state ? internals.state() : {};
      snapshot.directives = [...(internals.directives || [])];
      snapshot.observers = [...(internals.observers || [])];
      snapshot.listeners = [...(internals.listeners || [])];
      
      // Stop all MutationObservers
      if (internals.observers) {
        for (const observer of internals.observers) {
          if (observer && typeof observer.disconnect === 'function') {
            observer.disconnect();
          }
        }
      }
      
      // Remove all event listeners
      if (internals.listeners) {
        for (const listener of internals.listeners) {
          if (listener && listener.target && listener.event && listener.handler) {
            listener.target.removeEventListener(listener.event, listener.handler, listener.options);
          }
        }
      }
    };
    
    // Store the handler for later use
    internals.syncBeforeHandler = beforeHandler;
  }
  
  // Setup after callback
  if (options.after) {
    const afterHandler = () => {
      options.after!();
      
      // Resolve new DOM element
      let newElement: Element;
      if (options.target) {
        newElement = options.target();
      } else if (snapshot.originalSelector) {
        const resolved = document.querySelector(snapshot.originalSelector);
        if (!resolved) {
          throw new Error(`sync(): element not found after reattachment (${snapshot.originalSelector})`);
        }
        newElement = resolved;
      } else {
        throw new Error('sync(): cannot resolve new element - no target function or original selector');
      }
      
      // Reattach Proxy to new element
      internals.rootElement = newElement;
      
      // Replay all directives on new element
      if (snapshot.directives && internals.replayDirectives) {
        internals.replayDirectives(newElement);
      }
      
      // Replay onInit with snapshotted state if restore is true
      if (restore && internals.onInitHooks && snapshot.state) {
        for (const hook of internals.onInitHooks) {
          hook(snapshot.state);
        }
      }
    };
    
    // Store the handler for later use
    internals.syncAfterHandler = afterHandler;
  }
}

export function sync() {
  // This is a placeholder - actual implementation is in createSyncManager
  // which is called from the weave context
  throw new Error('sync() must be called within a weave() callback');
}
