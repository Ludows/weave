/**
 * Property tests for computed() implementation
 */

import * as fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { computed } from './computed';
import { ref } from './ref';

describe('computed() - Property Tests', () => {
  /**
   * Property 12: Computed Dependency Caching
   * **Validates: Requirements 16.3-16.5**
   * 
   * For any computed property, the value SHALL be cached between dependency changes,
   * and SHALL only recalculate when a tracked dependency changes.
   */
  it('Property 12: computed value is cached between dependency changes', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer(),
        (initialValue, newValue) => {
          // Skip if values are the same (no actual change)
          fc.pre(initialValue !== newValue);
          
          const source = ref(initialValue);
          let computeCount = 0;
          
          const derived = computed(() => {
            computeCount++;
            return source.value * 2;
          });
          
          // First access should compute
          const firstResult = derived.value;
          expect(computeCount).toBe(1);
          expect(firstResult).toBe(initialValue * 2);
          
          // Multiple accesses without dependency change should use cache
          const secondResult = derived.value;
          const thirdResult = derived.value;
          expect(computeCount).toBe(1); // Still 1, not recomputed
          expect(secondResult).toBe(firstResult);
          expect(thirdResult).toBe(firstResult);
          
          // Change dependency
          source.value = newValue;
          
          // Next access should recompute
          const fourthResult = derived.value;
          expect(computeCount).toBe(2); // Recomputed once
          expect(fourthResult).toBe(newValue * 2);
          
          // Multiple accesses after change should still use cache
          const fifthResult = derived.value;
          expect(computeCount).toBe(2); // Still 2, not recomputed again
          expect(fifthResult).toBe(fourthResult);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 12: computed only recalculates when tracked dependencies change', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer(),
        fc.integer(),
        (val1, val2, newVal1) => {
          // Skip if ref1 value doesn't actually change
          fc.pre(val1 !== newVal1);
          
          const ref1 = ref(val1);
          const ref2 = ref(val2);
          let computeCount = 0;
          
          // Computed depends only on ref1
          const derived = computed(() => {
            computeCount++;
            return ref1.value + 10;
          });
          
          // Initial access
          derived.value;
          expect(computeCount).toBe(1);
          
          // Change ref2 (not a dependency)
          ref2.value = ref2.value + 1;
          
          // Access derived - should still use cache
          derived.value;
          expect(computeCount).toBe(1); // Not recomputed
          
          // Change ref1 (a dependency)
          ref1.value = newVal1;
          
          // Access derived - should recompute
          derived.value;
          expect(computeCount).toBe(2); // Recomputed
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 12: computed with multiple dependencies recalculates when any dependency changes', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer(),
        fc.integer(),
        fc.integer(),
        (val1, val2, newVal1, newVal2) => {
          // Skip if values don't actually change
          fc.pre(val1 !== newVal1 || val2 !== newVal2);
          
          const ref1 = ref(val1);
          const ref2 = ref(val2);
          let computeCount = 0;
          
          const derived = computed(() => {
            computeCount++;
            return ref1.value + ref2.value;
          });
          
          // Initial access
          const initial = derived.value;
          expect(computeCount).toBe(1);
          expect(initial).toBe(val1 + val2);
          
          // Change first dependency (only if it actually changes)
          if (val1 !== newVal1) {
            ref1.value = newVal1;
            const afterFirst = derived.value;
            expect(computeCount).toBe(2);
            expect(afterFirst).toBe(newVal1 + val2);
          }
          
          // Change second dependency (only if it actually changes)
          if (val2 !== newVal2) {
            ref2.value = newVal2;
            const afterSecond = derived.value;
            const expectedCount = (val1 !== newVal1 ? 3 : 2);
            expect(computeCount).toBe(expectedCount);
            expect(afterSecond).toBe((val1 !== newVal1 ? newVal1 : val1) + newVal2);
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 12: chained computed properties cache correctly', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer(),
        (initialValue, newValue) => {
          // Skip if values are the same (no actual change)
          fc.pre(initialValue !== newValue);
          
          const source = ref(initialValue);
          let compute1Count = 0;
          let compute2Count = 0;
          
          const derived1 = computed(() => {
            compute1Count++;
            return source.value * 2;
          });
          
          const derived2 = computed(() => {
            compute2Count++;
            return derived1.value + 10;
          });
          
          // Initial access
          derived2.value;
          expect(compute1Count).toBe(1);
          expect(compute2Count).toBe(1);
          
          // Multiple accesses should use cache
          derived2.value;
          derived2.value;
          expect(compute1Count).toBe(1);
          expect(compute2Count).toBe(1);
          
          // Change source
          source.value = newValue;
          
          // Access derived2 should recompute both
          derived2.value;
          expect(compute1Count).toBe(2);
          expect(compute2Count).toBe(2);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 5: Computed Property Immutability
   * **Validates: Requirements 16.6, 57.3**
   * 
   * For all computed properties, attempts to write to the property SHALL be rejected
   * with a warning, and the property SHALL remain read-only throughout the Proxy_Instance lifetime.
   */
  it('Property 5: computed properties are read-only and reject writes', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer(),
        (initialValue, attemptedValue) => {
          const source = ref(initialValue);
          const derived = computed(() => source.value * 2);
          
          // Get initial value
          const initialDerivedValue = derived.value;
          expect(initialDerivedValue).toBe(initialValue * 2);
          
          // Attempt to write to computed property
          const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
          
          // TypeScript won't allow this, but JavaScript will try
          (derived as any).value = attemptedValue;
          
          // Should have logged a warning
          expect(consoleWarnSpy).toHaveBeenCalledWith('Computed properties are read-only');
          
          // Value should remain unchanged
          expect(derived.value).toBe(initialValue * 2);
          expect(derived.value).not.toBe(attemptedValue);
          
          consoleWarnSpy.mockRestore();
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 5: computed remains read-only after dependency changes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 2, maxLength: 5 }),
        fc.integer(),
        (values, attemptedValue) => {
          const source = ref(values[0]);
          const derived = computed(() => source.value * 2);
          
          const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
          
          // Change source multiple times and attempt writes after each change
          for (let i = 1; i < values.length; i++) {
            source.value = values[i];
            const expectedValue = values[i] * 2;
            
            // Skip if attempted value happens to equal expected value
            if (expectedValue === attemptedValue) {
              continue;
            }
            
            // Verify computed updated correctly
            expect(derived.value).toBe(expectedValue);
            
            // Attempt to write
            (derived as any).value = attemptedValue;
            
            // Should still be read-only
            expect(derived.value).toBe(expectedValue);
            expect(derived.value).not.toBe(attemptedValue);
          }
          
          // Should have warned for each write attempt (excluding skipped ones)
          const actualAttempts = values.slice(1).filter(v => v * 2 !== attemptedValue).length;
          expect(consoleWarnSpy).toHaveBeenCalledTimes(actualAttempts);
          
          consoleWarnSpy.mockRestore();
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 5: computed property descriptor is non-configurable', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        (value) => {
          const source = ref(value);
          const derived = computed(() => source.value * 2);
          
          // Get property descriptor
          const descriptor = Object.getOwnPropertyDescriptor(derived, 'value');
          
          // Should exist and be non-configurable
          expect(descriptor).toBeDefined();
          expect(descriptor!.configurable).toBe(false);
          expect(descriptor!.enumerable).toBe(true);
          expect(descriptor!.get).toBeDefined();
          expect(descriptor!.set).toBeDefined();
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
