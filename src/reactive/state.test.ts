/**
 * Property tests for state() snapshot implementation
 */

import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computed } from './computed';
import { ref } from './ref';
import { createStateSnapshot } from './state';

describe('state() - Property Tests', () => {
  /**
   * Property 6: State Snapshot Immutability
   * **Validates: Requirements 17.1-17.6**
   * 
   * For any call to state(), the returned snapshot SHALL be immutable (frozen),
   * SHALL include all ref values, computed values, and tracked state,
   * and SHALL be a new object independent of internal state.
   */
  it('Property 6: state snapshot is frozen and immutable', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer(),
        fc.string(),
        (refValue, computedBase, trackedValue) => {
          const testRef = ref(refValue);
          const testComputed = computed(() => computedBase * 2);
          const trackedState = { tracked: trackedValue };
          
          const state = createStateSnapshot(
            { myRef: testRef },
            { myComputed: testComputed },
            trackedState
          );
          
          const snapshot = state();
          
          // Snapshot should be frozen
          expect(Object.isFrozen(snapshot)).toBe(true);
          
          // Attempting to modify should fail (either silently or throw)
          try {
            (snapshot as any).myRef = 999;
            (snapshot as any).myComputed = 999;
            (snapshot as any).tracked = 'modified';
            (snapshot as any).newProp = 'new';
          } catch (e) {
            // In strict mode, this throws TypeError
            expect(e).toBeInstanceOf(TypeError);
          }
          
          // Values should remain unchanged
          expect(snapshot.myRef).toBe(refValue);
          expect(snapshot.myComputed).toBe(computedBase * 2);
          expect(snapshot.tracked).toBe(trackedValue);
          expect((snapshot as any).newProp).toBeUndefined();
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 6: state snapshot includes all ref values', () => {
    fc.assert(
      fc.property(
        fc.record({
          ref1: fc.integer(),
          ref2: fc.string(),
          ref3: fc.boolean()
        }),
        (values) => {
          const refs = {
            ref1: ref(values.ref1),
            ref2: ref(values.ref2),
            ref3: ref(values.ref3)
          };
          
          const state = createStateSnapshot(refs, {}, {});
          const snapshot = state();
          
          // All ref values should be in snapshot
          expect(snapshot.ref1).toBe(values.ref1);
          expect(snapshot.ref2).toBe(values.ref2);
          expect(snapshot.ref3).toBe(values.ref3);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 6: state snapshot includes all computed values', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer(),
        (val1, val2) => {
          const source1 = ref(val1);
          const source2 = ref(val2);
          
          const computedProps = {
            doubled: computed(() => source1.value * 2),
            sum: computed(() => source1.value + source2.value),
            product: computed(() => source1.value * source2.value)
          };
          
          const state = createStateSnapshot({}, computedProps, {});
          const snapshot = state();
          
          // All computed values should be in snapshot
          expect(snapshot.doubled).toBe(val1 * 2);
          expect(snapshot.sum).toBe(val1 + val2);
          expect(snapshot.product).toBe(val1 * val2);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 6: state snapshot includes tracked state', () => {
    fc.assert(
      fc.property(
        fc.record({
          prop1: fc.string(),
          prop2: fc.integer(),
          prop3: fc.boolean()
        }),
        (trackedState) => {
          const state = createStateSnapshot({}, {}, trackedState);
          const snapshot = state();
          
          // All tracked state should be in snapshot
          expect(snapshot.prop1).toBe(trackedState.prop1);
          expect(snapshot.prop2).toBe(trackedState.prop2);
          expect(snapshot.prop3).toBe(trackedState.prop3);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 6: each state() call returns a new object', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        (value) => {
          const testRef = ref(value);
          const state = createStateSnapshot({ myRef: testRef }, {}, {});
          
          const snapshot1 = state();
          const snapshot2 = state();
          
          // Should be different objects
          expect(snapshot1).not.toBe(snapshot2);
          
          // But with same values
          expect(snapshot1.myRef).toBe(snapshot2.myRef);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 6: snapshot is independent of internal state changes', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer(),
        (initialValue, newValue) => {
          fc.pre(initialValue !== newValue);
          
          const testRef = ref(initialValue);
          const state = createStateSnapshot({ myRef: testRef }, {}, {});
          
          // Take snapshot
          const snapshot = state();
          expect(snapshot.myRef).toBe(initialValue);
          
          // Change ref
          testRef.value = newValue;
          
          // Old snapshot should be unchanged
          expect(snapshot.myRef).toBe(initialValue);
          
          // New snapshot should have new value
          const newSnapshot = state();
          expect(newSnapshot.myRef).toBe(newValue);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 50: State Property Set Consistency
   * **Validates: Requirements 57.1**
   * 
   * For any state mutation, the set of property keys in state() before and after
   * SHALL be the same (no properties added or removed, only values changed).
   */
  it('Property 50: state property keys remain consistent across mutations', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer(),
        fc.string(),
        fc.string(),
        (initialRefValue, newRefValue, initialTracked, newTracked) => {
          const testRef = ref(initialRefValue);
          const trackedState = { tracked: initialTracked };
          
          const state = createStateSnapshot(
            { myRef: testRef },
            {},
            trackedState
          );
          
          // Get initial snapshot
          const snapshot1 = state();
          const keys1 = Object.keys(snapshot1).sort();
          
          // Mutate ref
          testRef.value = newRefValue;
          
          // Mutate tracked state
          trackedState.tracked = newTracked;
          
          // Get new snapshot
          const snapshot2 = state();
          const keys2 = Object.keys(snapshot2).sort();
          
          // Keys should be the same
          expect(keys2).toEqual(keys1);
          expect(keys2.length).toBe(keys1.length);
          
          // Values should have changed
          expect(snapshot2.myRef).toBe(newRefValue);
          expect(snapshot2.tracked).toBe(newTracked);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 50: state does not add properties dynamically', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer(),
        (value1, value2) => {
          const testRef = ref(value1);
          const state = createStateSnapshot({ myRef: testRef }, {}, {});
          
          // Get initial snapshot
          const snapshot1 = state();
          const keys1 = Object.keys(snapshot1);
          
          // Change ref value
          testRef.value = value2;
          
          // Get new snapshot
          const snapshot2 = state();
          const keys2 = Object.keys(snapshot2);
          
          // Should have same keys
          expect(keys2).toEqual(keys1);
          
          // Should not have any new properties
          expect(keys2.length).toBe(keys1.length);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 50: state with multiple refs and computed maintains key consistency', () => {
    fc.assert(
      fc.property(
        fc.record({
          ref1: fc.integer(),
          ref2: fc.string(),
          ref3: fc.boolean()
        }),
        fc.record({
          ref1: fc.integer(),
          ref2: fc.string(),
          ref3: fc.boolean()
        }),
        (initialValues, newValues) => {
          const refs = {
            ref1: ref(initialValues.ref1),
            ref2: ref(initialValues.ref2),
            ref3: ref(initialValues.ref3)
          };
          
          const computedProps = {
            doubled: computed(() => refs.ref1.value * 2)
          };
          
          const state = createStateSnapshot(refs, computedProps, {});
          
          // Get initial snapshot
          const snapshot1 = state();
          const keys1 = Object.keys(snapshot1).sort();
          
          // Mutate all refs
          refs.ref1.value = newValues.ref1;
          refs.ref2.value = newValues.ref2;
          refs.ref3.value = newValues.ref3;
          
          // Get new snapshot
          const snapshot2 = state();
          const keys2 = Object.keys(snapshot2).sort();
          
          // Keys should be identical
          expect(keys2).toEqual(keys1);
          
          // Should have exactly 4 keys (3 refs + 1 computed)
          expect(keys2.length).toBe(4);
          expect(keys2).toContain('ref1');
          expect(keys2).toContain('ref2');
          expect(keys2).toContain('ref3');
          expect(keys2).toContain('doubled');
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
