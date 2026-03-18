/**
 * Property tests for ref() implementation
 */

import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { cleanupEffect, createReactiveEffect, runEffect } from '../core/dependency-tracker';
import { ref } from './ref';

describe('ref() - Property Tests', () => {
  /**
   * Property 11: Ref Reactivity
   * **Validates: Requirements 15.3, 15.7, 15.8**
   * 
   * For any ref object, when ref.value is written with a new value,
   * all dependent reactive callbacks (directives, computed, watchers) SHALL re-execute.
   */
  it('Property 11: ref.value changes trigger all dependent effects', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 2, maxLength: 10 }),
        (inputValues) => {
          // Filter to only include values that are different from previous
          const values = [inputValues[0]];
          for (let i = 1; i < inputValues.length; i++) {
            if (inputValues[i] !== values[values.length - 1]) {
              values.push(inputValues[i]);
            }
          }
          
          // Skip if no actual changes
          fc.pre(values.length > 1);
          
          // Create a ref with the first value
          const testRef = ref(values[0]);
          
          // Track effect executions
          const executionCounts = new Map<number, number>();
          const effects: ReturnType<typeof createReactiveEffect>[] = [];
          
          // Create multiple dependent effects
          for (let i = 0; i < 3; i++) {
            executionCounts.set(i, 0);
            const effectId = i;
            const effect = createReactiveEffect(() => {
              // Access ref.value to create dependency
              const _ = testRef.value;
              executionCounts.set(effectId, executionCounts.get(effectId)! + 1);
            });
            effects.push(effect);
            // Run effect initially to establish dependency
            runEffect(effect);
          }
          
          // Reset counts after initial run
          executionCounts.forEach((_, key) => executionCounts.set(key, 0));
          
          // Change ref.value with each subsequent value
          for (let i = 1; i < values.length; i++) {
            testRef.value = values[i];
            
            // All effects should have been triggered
            executionCounts.forEach((count) => {
              expect(count).toBeGreaterThan(0);
            });
            
            // Reset counts for next iteration
            executionCounts.forEach((_, key) => executionCounts.set(key, 0));
          }
          
          // Cleanup effects
          effects.forEach(effect => cleanupEffect(effect));
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 11: ref.value changes do not trigger when value is the same', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.integer(), fc.string(), fc.boolean()),
        (value) => {
          const testRef = ref(value);
          let executionCount = 0;
          
          const effect = createReactiveEffect(() => {
            const _ = testRef.value;
            executionCount++;
          });
          
          // Run effect initially
          runEffect(effect);
          const initialCount = executionCount;
          
          // Set to same value multiple times
          testRef.value = value;
          testRef.value = value;
          testRef.value = value;
          
          // Should not trigger additional executions
          expect(executionCount).toBe(initialCount);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 11: multiple refs can be tracked independently', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer(),
        fc.integer(),
        (val1, val2, newVal1) => {
          const ref1 = ref(val1);
          const ref2 = ref(val2);
          
          let effect1Count = 0;
          let effect2Count = 0;
          
          // Effect that depends only on ref1
          const effect1 = createReactiveEffect(() => {
            const _ = ref1.value;
            effect1Count++;
          });
          
          // Effect that depends only on ref2
          const effect2 = createReactiveEffect(() => {
            const _ = ref2.value;
            effect2Count++;
          });
          
          runEffect(effect1);
          runEffect(effect2);
          
          const initialEffect1Count = effect1Count;
          const initialEffect2Count = effect2Count;
          
          // Change ref1
          ref1.value = newVal1;
          
          // Only effect1 should be triggered
          expect(effect1Count).toBeGreaterThan(initialEffect1Count);
          expect(effect2Count).toBe(initialEffect2Count);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 51: Ref Type Stability
   * **Validates: Requirements 57.2**
   * 
   * For any ref object, the type of ref.value SHALL remain consistent
   * with the initial type throughout the ref's lifetime.
   */
  it('Property 51: ref maintains type consistency throughout lifetime', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer(),
          fc.string(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined)
        ),
        (initialValue) => {
          const testRef = ref(initialValue);
          const initialType = typeof initialValue;
          
          // Access value multiple times
          for (let i = 0; i < 5; i++) {
            const currentValue = testRef.value;
            const currentType = typeof currentValue;
            
            // Type should remain consistent
            expect(currentType).toBe(initialType);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 51: ref type remains stable after mutations', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 2, maxLength: 10 }),
        (values) => {
          const testRef = ref(values[0]);
          const initialType = typeof values[0];
          
          // Mutate ref with values of same type
          for (let i = 1; i < values.length; i++) {
            testRef.value = values[i];
            const currentType = typeof testRef.value;
            expect(currentType).toBe(initialType);
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 51: ref with object type maintains object type', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ x: fc.integer(), y: fc.integer() }), { minLength: 2, maxLength: 5 }),
        (objects) => {
          const testRef = ref(objects[0]);
          
          // Initial type should be object
          expect(typeof testRef.value).toBe('object');
          expect(testRef.value).not.toBeNull();
          
          // Mutate with other objects
          for (let i = 1; i < objects.length; i++) {
            testRef.value = objects[i];
            expect(typeof testRef.value).toBe('object');
            expect(testRef.value).not.toBeNull();
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
