/**
 * watch(), when(), unless(), and memo() implementations
 */

import { cleanupEffect, createReactiveEffect, runEffect } from '../core/dependency-tracker';
import type { Unwatch, WatchHandler, WatchOptions, WatchSource } from '../types';

/**
 * Watch reactive values and execute handler when they change
 */
export function watch(
  source: WatchSource | WatchSource[],
  handlerOrOptions: WatchHandler | WatchOptions
): Unwatch {
  const sources = Array.isArray(source) ? source : [source];
  
  // Extract handler and options
  let handler: WatchHandler;
  const options: { deep?: boolean; debounce?: number } = {};
  
  if (typeof handlerOrOptions === 'function') {
    handler = handlerOrOptions;
  } else if (typeof handlerOrOptions === 'object' && 'then' in handlerOrOptions) {
    handler = handlerOrOptions.then;
    options.deep = handlerOrOptions.deep;
    options.debounce = handlerOrOptions.debounce;
  } else {
    // If it's an object without 'then', treat it as options with handler as the function
    handler = handlerOrOptions as WatchHandler;
  }
  
  let oldValues: unknown[] = [];
  let timeoutId: NodeJS.Timeout | null = null;
  let isActive = true;
  
  // Create effect that tracks dependencies
  const effect = createReactiveEffect(() => {
    if (!isActive) return;
    
    const newValues = sources.map(fn => {
      const value = fn();
      return value;
    });
    
    // Skip first execution (initialization)
    if (oldValues.length === 0) {
      oldValues = newValues;
      return;
    }
    
    // Check if any value changed
    const hasChanged = newValues.some((newVal, i) => {
      const oldVal = oldValues[i];
      if (options.deep) {
        return JSON.stringify(newVal) !== JSON.stringify(oldVal);
      }
      return newVal !== oldVal;
    });
    
    if (hasChanged) {
      const executeHandler = () => {
        if (!isActive) return;
        
        // Call handler with new and old values
        const newValue = newValues.length === 1 ? newValues[0] : newValues;
        const oldValue = oldValues.length === 1 ? oldValues[0] : oldValues;
        
        handler(newValue, oldValue);
        oldValues = newValues;
      };
      
      // Apply debouncing if specified
      if (options.debounce && options.debounce > 0) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(executeHandler, options.debounce);
      } else {
        executeHandler();
      }
    }
  });
  
  // Initial execution to capture dependencies
  runEffect(effect);
  
  // Return unwatch function
  return () => {
    isActive = false;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    cleanupEffect(effect);
  };
}

/**
 * Execute function when condition is true
 */
export function when(condition: () => boolean, fn: () => void): void {
  const effect = createReactiveEffect(() => {
    if (condition()) {
      fn();
    }
  });
  
  // Execute immediately
  runEffect(effect);
}

/**
 * Execute function when condition is false
 */
export function unless(condition: () => boolean, fn: () => void): void {
  const effect = createReactiveEffect(() => {
    if (!condition()) {
      fn();
    }
  });
  
  // Execute immediately
  runEffect(effect);
}

/**
 * Memoize a function based on reactive dependencies
 */
export function memo<T>(fn: () => T): () => T {
  let cachedValue: T;
  let isDirty = true;
  
  // Create an effect with a scheduler that marks as dirty when dependencies change
  const effect = createReactiveEffect(
    () => {
      cachedValue = fn();
    },
    () => {
      isDirty = true;
    }
  );
  
  return () => {
    if (isDirty) {
      runEffect(effect);
      isDirty = false;
    }
    return cachedValue;
  };
}
