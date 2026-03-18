/**
 * state() snapshot system
 */

import type { Ref } from '../types';
import type { ComputedRef } from './computed';

/**
 * Creates a state snapshot factory that collects values from refs and computed properties
 * Returns a frozen immutable snapshot
 */
export function createStateSnapshot<S = any>(
  refs: Record<string, Ref<any>> = {},
  computed: Record<string, ComputedRef<any>> = {},
  trackedState: Record<string, any> = {}
): () => Readonly<S> {
  return (): Readonly<S> => {
    const snapshot: any = {};
    
    // Include all ref values
    for (const [key, refObj] of Object.entries(refs)) {
      snapshot[key] = refObj.value;
    }
    
    // Include all computed values
    for (const [key, computedObj] of Object.entries(computed)) {
      snapshot[key] = computedObj.value;
    }
    
    // Include all tracked state
    for (const [key, value] of Object.entries(trackedState)) {
      snapshot[key] = value;
    }
    
    // Make immutable and return
    return Object.freeze(snapshot) as Readonly<S>;
  };
}
