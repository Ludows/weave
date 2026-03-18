/**
 * computed() implementation for derived state
 */

import { createReactiveEffect, getActiveEffect, runEffect, track, trigger } from '../core/dependency-tracker';

/**
 * Represents a computed value with caching and dependency tracking
 */
export interface ComputedRef<T> {
  readonly value: T;
}

/**
 * Creates a computed value that automatically recalculates when dependencies change
 * The value is cached and only recalculated when a tracked dependency changes
 * 
 * OPTIMIZED: Single getter definition, efficient caching
 */
export function computed<T>(fn: () => T): ComputedRef<T> {
  let cachedValue: T;
  let dirty = true;
  
  // Create the computed ref object first
  const computedRef = {} as ComputedRef<T>;
  
  // Create a reactive effect with a scheduler that marks the value as dirty
  // and triggers any effects that depend on this computed
  const effect = createReactiveEffect(() => {
    cachedValue = fn();
  }, () => {
    dirty = true;
    // Trigger any effects that depend on this computed value
    trigger(computedRef, 'value');
  });
  
  // Define the value property with getter only (read-only)
  Object.defineProperty(computedRef, 'value', {
    get() {
      if (dirty) {
        // Run the effect to track dependencies
        runEffect(effect);
        dirty = false;
      }
      // Track this computed as a dependency if accessed within another effect
      const activeEffect = getActiveEffect();
      if (activeEffect) {
        track(computedRef, 'value');
      }
      return cachedValue;
    },
    set() {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Computed properties are read-only');
      }
    },
    enumerable: true,
    configurable: false
  });
  
  return computedRef;
}
