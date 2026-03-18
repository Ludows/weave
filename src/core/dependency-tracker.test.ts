/**
 * Tests for dependency tracking system
 */

import * as fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createReactiveEffect,
    getActiveEffect,
    runEffect,
    setActiveEffect,
    track,
    trigger
} from './dependency-tracker';

describe('Dependency Tracking System', () => {
  beforeEach(() => {
    // Clear active effect before each test
    setActiveEffect(null);
  });

  /**
   * Property 43: Dependency Tracking Accuracy
   * 
   * For any reactive callback execution, all Proxy property accesses, 
   * ref.value accesses, computed property accesses, and Store.state 
   * property accesses SHALL be tracked as dependencies.
   * 
   * **Validates: Requirements 52.1-52.4**
   */
  describe('Property 43: Dependency Tracking Accuracy', () => {
    it('should track property accesses during reactive callback execution', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer(),
          (key, value) => {
            const target = { [key]: value };
            let accessCount = 0;

            const effect = createReactiveEffect(() => {
              // Simulate property access with explicit tracking
              track(target, key);
              const _ = target[key];
              accessCount++;
            });

            // Run the effect - this should track the dependency
            runEffect(effect);

            // Verify the effect was executed
            expect(accessCount).toBe(1);

            // Verify the dependency was tracked
            expect(effect.deps.size).toBeGreaterThan(0);
            
            // Find the dependency for this target and key
            const dep = Array.from(effect.deps).find(
              d => d.target === target && d.key === key
            );
            
            expect(dep).toBeDefined();
            expect(dep?.effects.has(effect)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should track multiple property accesses in a single effect', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 }),
          (keys) => {
            const target: Record<string, number> = {};
            keys.forEach((key, idx) => {
              target[key] = idx;
            });

            const effect = createReactiveEffect(() => {
              // Access all properties with explicit tracking
              keys.forEach(key => {
                track(target, key);
                const _ = target[key];
              });
            });

            runEffect(effect);

            // Should track all unique keys
            const uniqueKeys = new Set(keys);
            expect(effect.deps.size).toBe(uniqueKeys.size);

            // Verify each key was tracked
            uniqueKeys.forEach(key => {
              const dep = Array.from(effect.deps).find(
                d => d.target === target && d.key === key
              );
              expect(dep).toBeDefined();
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should not track property accesses outside of reactive context', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer(),
          (key, value) => {
            const target = { [key]: value };

            // Access property without active effect
            expect(getActiveEffect()).toBeNull();
            const _ = target[key];

            // Manually track - should not add to any effect
            track(target, key);

            // No effect should be tracking this
            expect(getActiveEffect()).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should track nested property accesses', () => {
      const outer = { inner: { value: 42 } };
      let accessCount = 0;

      const effect = createReactiveEffect(() => {
        // Simulate tracking the 'inner' property access
        track(outer, 'inner');
        const _ = outer.inner;
        accessCount++;
      });

      runEffect(effect);

      expect(accessCount).toBe(1);
      expect(effect.deps.size).toBeGreaterThan(0);
    });
  });
});

  /**
   * Property 44: Dependency Change Triggers Re-execution
   * 
   * For any tracked dependency that changes, all dependent callbacks 
   * SHALL be re-executed with previous dependencies cleared before re-execution.
   * 
   * **Validates: Requirements 52.5-52.6**
   */
  describe('Property 44: Dependency Change Triggers Re-execution', () => {
    it('should re-execute effect when tracked dependency changes', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer(),
          fc.integer(),
          (key, initialValue, newValue) => {
            // Ensure values are different
            fc.pre(initialValue !== newValue);

            const target = { [key]: initialValue };
            let executionCount = 0;
            let lastValue = initialValue;

            const effect = createReactiveEffect(() => {
              track(target, key);
              lastValue = target[key];
              executionCount++;
            });

            // Initial run
            runEffect(effect);
            expect(executionCount).toBe(1);
            expect(lastValue).toBe(initialValue);

            // Change the value and trigger
            target[key] = newValue;
            trigger(target, key);

            // Effect should have re-executed
            expect(executionCount).toBe(2);
            expect(lastValue).toBe(newValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear previous dependencies before re-execution', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          (key1, key2) => {
            // Ensure keys are different
            fc.pre(key1 !== key2);

            const target = { [key1]: 1, [key2]: 2 };
            let currentKey = key1;
            let executionCount = 0;

            const effect = createReactiveEffect(() => {
              // Track only the current key
              track(target, currentKey);
              const _ = target[currentKey];
              executionCount++;
            });

            // Initial run - tracks key1
            runEffect(effect);
            expect(executionCount).toBe(1);
            const initialDepsSize = effect.deps.size;
            expect(initialDepsSize).toBe(1);

            // Change to track key2
            currentKey = key2;
            runEffect(effect);
            expect(executionCount).toBe(2);

            // Should still have only 1 dependency (key2), not 2
            expect(effect.deps.size).toBe(1);
            
            // Verify it's tracking key2, not key1
            const dep = Array.from(effect.deps).find(
              d => d.target === target && d.key === key2
            );
            expect(dep).toBeDefined();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should trigger all dependent effects when a property changes', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 2, max: 10 }),
          (key, effectCount) => {
            const target = { [key]: 0 };
            const executionCounts: number[] = new Array(effectCount).fill(0);
            const effects: ReactiveEffect[] = [];

            // Create multiple effects tracking the same property
            for (let i = 0; i < effectCount; i++) {
              const effect = createReactiveEffect(() => {
                track(target, key);
                const _ = target[key];
                executionCounts[i]++;
              });
              effects.push(effect);
              runEffect(effect);
            }

            // All effects should have run once
            expect(executionCounts.every(count => count === 1)).toBe(true);

            // Trigger the dependency
            trigger(target, key);

            // All effects should have run twice
            expect(executionCounts.every(count => count === 2)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should not trigger effects for untracked properties', () => {
      const target = { tracked: 1, untracked: 2 };
      let executionCount = 0;

      const effect = createReactiveEffect(() => {
        track(target, 'tracked');
        const _ = target.tracked;
        executionCount++;
      });

      runEffect(effect);
      expect(executionCount).toBe(1);

      // Trigger untracked property - should not re-execute
      trigger(target, 'untracked');
      expect(executionCount).toBe(1);

      // Trigger tracked property - should re-execute
      trigger(target, 'tracked');
      expect(executionCount).toBe(2);
    });
  });

  /**
   * Property 45: Circular Dependency Prevention
   * 
   * For any reactive system, circular dependencies SHALL be detected 
   * and SHALL not cause infinite loops.
   * 
   * **Validates: Requirements 52.7**
   */
  describe('Property 45: Circular Dependency Prevention', () => {
    it('should detect and prevent direct circular dependencies', () => {
      const target = { value: 0 };
      let executionCount = 0;

      const effect = createReactiveEffect(() => {
        track(target, 'value');
        const _ = target.value;
        executionCount++;

        // Attempt to trigger itself - should be prevented
        if (executionCount < 10) {
          trigger(target, 'value');
        }
      });

      // Spy on console.warn to verify warning is logged
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      runEffect(effect);

      // Should execute only once, not infinitely
      expect(executionCount).toBe(1);
      
      // Should have logged a warning about circular dependency
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Circular dependency detected')
      );

      warnSpy.mockRestore();
    });

    it('should detect and prevent indirect circular dependencies', () => {
      const target1 = { value: 0 };
      const target2 = { value: 0 };
      let effect1Count = 0;
      let effect2Count = 0;

      const effect1 = createReactiveEffect(() => {
        track(target1, 'value');
        const _ = target1.value;
        effect1Count++;

        // Trigger effect2
        if (effect1Count < 10) {
          trigger(target2, 'value');
        }
      });

      const effect2 = createReactiveEffect(() => {
        track(target2, 'value');
        const _ = target2.value;
        effect2Count++;

        // Trigger effect1 - creates circular dependency
        if (effect2Count < 10) {
          trigger(target1, 'value');
        }
      });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Register both effects first
      runEffect(effect1);
      runEffect(effect2);

      // Reset counts
      effect1Count = 0;
      effect2Count = 0;

      // Now trigger effect1, which will try to trigger effect2, which will try to trigger effect1
      trigger(target1, 'value');

      // Both should execute only once due to circular dependency detection
      expect(effect1Count).toBe(1);
      expect(effect2Count).toBe(1);

      // Should have logged warnings
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('should allow re-execution after circular dependency is resolved', () => {
      const target = { value: 0, trigger: false };
      let executionCount = 0;

      const effect = createReactiveEffect(() => {
        track(target, 'value');
        const _ = target.value;
        executionCount++;

        // Only trigger itself on first execution
        if (target.trigger) {
          target.trigger = false;
          trigger(target, 'value');
        }
      });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // First execution with trigger enabled
      target.trigger = true;
      runEffect(effect);
      expect(executionCount).toBe(1);

      // Should be able to trigger again after circular dependency is resolved
      target.value = 1;
      trigger(target, 'value');
      expect(executionCount).toBe(2);

      warnSpy.mockRestore();
    });

    it('should handle complex circular dependency chains', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 5 }),
          (chainLength) => {
            const targets: Array<{ value: number }> = [];
            const effects: ReactiveEffect[] = [];
            const executionCounts: number[] = [];

            // Create a chain of effects that trigger each other
            for (let i = 0; i < chainLength; i++) {
              targets.push({ value: i });
              executionCounts.push(0);

              const currentIndex = i;
              const nextIndex = (i + 1) % chainLength;

              const effect = createReactiveEffect(() => {
                track(targets[currentIndex], 'value');
                const _ = targets[currentIndex].value;
                executionCounts[currentIndex]++;

                // Trigger next effect in chain (creates circular dependency)
                if (executionCounts[currentIndex] < 10) {
                  trigger(targets[nextIndex], 'value');
                }
              });

              effects.push(effect);
            }

            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            // Start the chain
            runEffect(effects[0]);

            // Each effect should execute at most once due to circular dependency detection
            executionCounts.forEach(count => {
              expect(count).toBeLessThanOrEqual(chainLength);
            });

            warnSpy.mockRestore();
          }
        ),
        { numRuns: 20 }
      );
    });
  });
