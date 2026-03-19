/**
 * Public effect() API — reactive side effects
 *
 * Creates a reactive effect that re-runs when its dependencies change.
 * Returns a stop function to clean up the effect.
 *
 * @example
 * ```ts
 * const count = ref(0);
 * const stop = effect(() => {
 *   console.log('Count is:', count.value);
 * });
 *
 * count.value = 1; // logs "Count is: 1"
 * stop(); // cleanup, no more logging
 * ```
 */

import { cleanupEffect, createReactiveEffect, runEffect } from '../core/dependency-tracker';

export function effect(fn: () => void | (() => void)): () => void {
  let userCleanup: (() => void) | void;

  const reactiveEffect = createReactiveEffect(() => {
    // Run user cleanup from previous execution
    if (typeof userCleanup === 'function') {
      userCleanup();
    }
    userCleanup = fn();
  });

  runEffect(reactiveEffect);

  // Return a stop function
  return () => {
    if (typeof userCleanup === 'function') {
      userCleanup();
    }
    cleanupEffect(reactiveEffect);
  };
}
