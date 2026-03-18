/**
 * ref() implementation for pure JavaScript reactive state
 */

import { track, trigger } from '../core/dependency-tracker';
import type { Ref } from '../types';

/**
 * Creates a reactive reference with a .value property
 * When .value is read, it tracks the dependency
 * When .value is written, it triggers dependent effects
 */
export function ref<T>(initialValue: T): Ref<T> {
  const refObject: Ref<T> = {
    get value(): T {
      // Track dependency if inside reactive context
      track(refObject, 'value');
      return initialValue;
    },
    set value(newValue: T) {
      if (initialValue !== newValue) {
        initialValue = newValue;
        // Trigger all dependent effects
        trigger(refObject, 'value');
      }
    }
  };
  
  return refObject;
}
