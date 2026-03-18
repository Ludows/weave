/**
 * Proxy handler implementation for reactive state management
 */

import { track, trigger } from './dependency-tracker';

/**
 * Internal state structure for Proxy instances
 */
export interface ProxyTarget {
  _state: Record<string, any>;
  _computed: Record<string, () => any>;
  _watchers: Map<string, Set<(newValue: any, oldValue: any) => void>>;
  _directives: Map<string, any[]>;
  _utils: any;
  _el?: Element;
}

/**
 * Create a Proxy handler for reactive state management
 */
export function createProxyHandler(
  target: ProxyTarget,
  onPropertyChange?: (key: string) => void
): ProxyHandler<ProxyTarget> {
  return {
    /**
     * Get trap: computed-first, then state lookup, with dependency tracking
     */
    get(target: ProxyTarget, key: string | symbol): any {
      // Handle symbol keys
      if (typeof key === 'symbol') {
        return Reflect.get(target, key);
      }

      // Special case: __target__ property for testing
      if (key === '__target__') {
        return target;
      }

      // Special case: $ property returns utility API
      if (key === '$') {
        return target._utils;
      }

      // Skip special JavaScript properties
      if (typeof key === 'string' && ['__proto__', 'constructor', 'prototype'].includes(key)) {
        return Reflect.get(target, key);
      }

      // Check computed properties first
      if (key in target._computed) {
        const computedFn = target._computed[key];
        // Track the computed property access
        track(target, key);
        return computedFn ? computedFn() : undefined;
      }

      // Check state cache
      if (key in target._state) {
        // Track the state property access
        track(target, key);
        return target._state[key];
      }

      // Track access even for undefined properties
      track(target, key);
      return undefined;
    },

    /**
     * Set trap: reject computed writes, update state, sync DOM, trigger watchers
     */
    set(target: ProxyTarget, key: string | symbol, value: any): boolean {
      // Handle symbol keys
      if (typeof key === 'symbol') {
        return Reflect.set(target, key, value);
      }

      // Reject writes to __proto__ to prevent prototype pollution
      if (key === '__proto__') {
        return false;
      }

      // Reject writes to computed properties
      if (key in target._computed) {
        console.warn(`'${key}' is a computed property and is read-only`);
        return false;
      }

      // Get old value for comparison
      const oldValue = target._state[key];

      // Only update if value actually changed
      if (oldValue === value) {
        return true;
      }

      // Update internal state cache
      target._state[key] = value;

      // Notify change tracker if provided
      if (onPropertyChange) {
        onPropertyChange(key);
      }

      // Sync change to DOM if bound by directives
      // (This will be implemented when directives are added)
      if (target._directives && target._directives.has(key)) {
        const directives = target._directives.get(key);
        directives?.forEach((directive: any) => {
          if (directive.update) {
            directive.update();
          }
        });
      }

      // Notify all watchers of the change
      if (target._watchers && target._watchers.has(key)) {
        const watchers = target._watchers.get(key);
        watchers?.forEach((watcher: any) => {
          watcher(value, oldValue);
        });
      }

      // Trigger reactive updates
      trigger(target, key);

      return true;
    },

    /**
     * Has trap: check if property exists in computed or state
     */
    has(target: ProxyTarget, key: string | symbol): boolean {
      if (typeof key === 'symbol') {
        return Reflect.has(target, key);
      }

      return key in target._computed || key in target._state;
    },

    /**
     * OwnKeys trap: enumerate state and computed properties
     */
    ownKeys(target: ProxyTarget): ArrayLike<string | symbol> {
      const keys = new Set<string>();

      // Add computed property keys
      Object.keys(target._computed).forEach(key => keys.add(key));

      // Add state keys
      Object.keys(target._state).forEach(key => keys.add(key));

      return Array.from(keys);
    },

    /**
     * GetOwnPropertyDescriptor trap: make properties enumerable
     */
    getOwnPropertyDescriptor(target: ProxyTarget, key: string | symbol): PropertyDescriptor | undefined {
      if (typeof key === 'symbol') {
        return Reflect.getOwnPropertyDescriptor(target, key);
      }

      if (key in target._computed || key in target._state) {
        return {
          enumerable: true,
          configurable: true
        };
      }

      return undefined;
    }
  };
}

/**
 * Create a reactive proxy instance
 */
export function createReactiveProxy(initialState: Record<string, any> = {}): any {
  const target: ProxyTarget = {
    _state: { ...initialState },
    _computed: {},
    _watchers: new Map(),
    _directives: new Map(),
    _utils: {}
  };

  const handler = createProxyHandler(target);
  return new Proxy(target, handler);
}
