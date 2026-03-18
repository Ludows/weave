/**
 * Tests for Proxy handler implementation
 */

import * as fc from 'fast-check';
import { beforeEach, describe, expect, it } from 'vitest';
import { createReactiveEffect, runEffect, setActiveEffect } from './dependency-tracker';
import { createReactiveProxy, type ProxyTarget } from './proxy';

describe('Proxy Handler Implementation', () => {
  beforeEach(() => {
    // Clear active effect before each test
    setActiveEffect(null);
  });

  /**
   * Property 46: Proxy Handler Property Resolution Order
   * 
   * For any Proxy_Instance property read, the system SHALL check 
   * computed properties first, then state cache, and SHALL track 
   * the access for dependency detection.
   * 
   * **Validates: Requirements 51.1, 51.7**
   */
  describe('Property 46: Proxy Handler Property Resolution Order', () => {
    it('should check computed properties before state', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => !['$', '__target__', '__proto__', 'toString', 'valueOf', 'constructor', 'prototype'].includes(s)),
          fc.integer(),
          fc.integer(),
          (key, stateValue, computedValue) => {
            // Ensure values are different
            fc.pre(stateValue !== computedValue);

            const proxy = createReactiveProxy({ [key]: stateValue });
            const target = (proxy as any).__target__ as ProxyTarget;

            // Add a computed property with the same key
            target._computed[key] = () => computedValue;

            // Access should return computed value, not state value
            expect(proxy[key]).toBe(computedValue);
            expect(proxy[key]).not.toBe(stateValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should fall back to state when computed property does not exist', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => !['$', '__target__', '__proto__', 'toString', 'valueOf', 'constructor', 'prototype'].includes(s)),
          fc.integer(),
          (key, value) => {
            const proxy = createReactiveProxy({ [key]: value });

            // Access should return state value
            expect(proxy[key]).toBe(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should track property access during reactive callback', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => !['$', '__target__', '__proto__', 'toString', 'valueOf', 'constructor', 'prototype'].includes(s)),
          fc.integer(),
          (key, value) => {
            const proxy = createReactiveProxy({ [key]: value });
            let accessCount = 0;

            const effect = createReactiveEffect(() => {
              const _ = proxy[key];
              accessCount++;
            });

            runEffect(effect);

            // Effect should have executed
            expect(accessCount).toBe(1);

            // Effect should have tracked the dependency
            expect(effect.deps.size).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return undefined for non-existent properties', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => !['$', '__target__', '__proto__', 'toString', 'valueOf', 'constructor', 'prototype'].includes(s)),
          (key) => {
            const proxy = createReactiveProxy({});

            // Access non-existent property
            expect(proxy[key]).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return utility API for $ property', () => {
      const proxy = createReactiveProxy({});
      const target = (proxy as any).__target__ as ProxyTarget;

      // Set up utility API
      const utilsAPI = { test: 'value' };
      target._utils = utilsAPI;

      // Access $ property
      expect(proxy.$).toBe(utilsAPI);
      expect(proxy.$.test).toBe('value');
    });
  });
});

  /**
   * Property 47: Proxy Handler Write Rejection for Computed
   * 
   * For any attempt to write to a computed property, the write SHALL be rejected, 
   * a warning SHALL be logged, and the set trap SHALL return false.
   * 
   * **Validates: Requirements 51.2**
   */
  describe('Property 47: Proxy Handler Write Rejection for Computed', () => {
    it('should reject writes to computed properties', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => !['$', '__target__', '__proto__', 'toString', 'valueOf', 'constructor', 'prototype'].includes(s)),
          fc.integer(),
          fc.integer(),
          (key, computedValue, newValue) => {
            // Skip test case if values are equal (can't test rejection when values match)
            fc.pre(computedValue !== newValue);
            
            const proxy = createReactiveProxy({});
            const target = (proxy as any).__target__ as ProxyTarget;

            // Add a computed property
            target._computed[key] = () => computedValue;

            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            // Attempt to write to computed property - should throw in strict mode
            try {
              proxy[key] = newValue;
              // If we get here, the assignment didn't throw (non-strict mode)
              // But the warning should still have been logged
              expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining(`'${key}' is a computed property and is read-only`)
              );
            } catch (error) {
              // In strict mode, returning false from set trap throws TypeError
              expect(error).toBeInstanceOf(TypeError);
              expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining(`'${key}' is a computed property and is read-only`)
              );
            }

            // Value should not have changed
            expect(proxy[key]).toBe(computedValue);
            expect(proxy[key]).not.toBe(newValue);

            warnSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow writes to non-computed properties', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => !['$', '__target__', '__proto__', 'toString', 'valueOf', 'constructor', 'prototype'].includes(s)),
          fc.integer(),
          fc.integer(),
          (key, initialValue, newValue) => {
            fc.pre(initialValue !== newValue);

            const proxy = createReactiveProxy({ [key]: initialValue });

            // Write to state property should succeed
            proxy[key] = newValue;

            // Value should have changed
            expect(proxy[key]).toBe(newValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not log warning for non-computed property writes', () => {
      const proxy = createReactiveProxy({ value: 1 });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Write to state property
      proxy.value = 2;

      // Should not have logged a warning
      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  /**
   * Property 48: Proxy Handler State Synchronization
   * 
   * For any Proxy_Instance property write, the internal state cache SHALL be updated, 
   * the change SHALL sync to DOM if bound, and all watchers SHALL be notified.
   * 
   * **Validates: Requirements 51.3-51.5**
   */
  describe('Property 48: Proxy Handler State Synchronization', () => {
    it('should update internal state cache on property write', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => !['$', '__target__', '__proto__', 'toString', 'valueOf', 'constructor', 'prototype'].includes(s)),
          fc.integer(),
          fc.integer(),
          (key, initialValue, newValue) => {
            fc.pre(initialValue !== newValue);

            const proxy = createReactiveProxy({ [key]: initialValue });
            const target = (proxy as any).__target__ as ProxyTarget;

            // Verify initial state
            expect(target._state[key]).toBe(initialValue);

            // Update property
            proxy[key] = newValue;

            // Internal state should be updated
            expect(target._state[key]).toBe(newValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should notify watchers when property changes', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => !['$', '__target__', '__proto__', 'toString', 'valueOf', 'constructor', 'prototype'].includes(s)),
          fc.integer(),
          fc.integer(),
          (key, initialValue, newValue) => {
            fc.pre(initialValue !== newValue);

            const proxy = createReactiveProxy({ [key]: initialValue });
            const target = (proxy as any).__target__ as ProxyTarget;

            let watcherCalled = false;
            let watchedNewValue: any;
            let watchedOldValue: any;

            // Add a watcher
            if (!target._watchers.has(key)) {
              target._watchers.set(key, new Set());
            }
            target._watchers.get(key)!.add((newVal, oldVal) => {
              watcherCalled = true;
              watchedNewValue = newVal;
              watchedOldValue = oldVal;
            });

            // Update property
            proxy[key] = newValue;

            // Watcher should have been called
            expect(watcherCalled).toBe(true);
            expect(watchedNewValue).toBe(newValue);
            expect(watchedOldValue).toBe(initialValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should trigger reactive effects when property changes', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => !['$', '__target__', '__proto__', 'toString', 'valueOf', 'constructor', 'prototype'].includes(s)),
          fc.integer(),
          fc.integer(),
          (key, initialValue, newValue) => {
            fc.pre(initialValue !== newValue);

            const proxy = createReactiveProxy({ [key]: initialValue });
            const target = (proxy as any).__target__ as ProxyTarget;
            let effectCount = 0;

            const effect = createReactiveEffect(() => {
              const _ = proxy[key];
              effectCount++;
            });

            // Initial run
            runEffect(effect);
            expect(effectCount).toBe(1);

            // Update property - should trigger effect
            proxy[key] = newValue;
            expect(effectCount).toBe(2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not trigger updates when value does not change', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => !['$', '__target__', '__proto__', 'toString', 'valueOf', 'constructor', 'prototype'].includes(s)),
          fc.integer(),
          (key, value) => {
            const proxy = createReactiveProxy({ [key]: value });
            const target = (proxy as any).__target__ as ProxyTarget;

            let watcherCalled = false;
            if (!target._watchers.has(key)) {
              target._watchers.set(key, new Set());
            }
            target._watchers.get(key)!.add(() => {
              watcherCalled = true;
            });

            // Set to same value
            proxy[key] = value;

            // Watcher should not have been called
            expect(watcherCalled).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple watchers for the same property', () => {
      const proxy = createReactiveProxy({ value: 1 });
      const target = (proxy as any).__target__ as ProxyTarget;

      const watcherCalls: number[] = [];

      // Add multiple watchers
      if (!target._watchers.has('value')) {
        target._watchers.set('value', new Set());
      }
      
      for (let i = 0; i < 3; i++) {
        const index = i;
        target._watchers.get('value')!.add(() => {
          watcherCalls.push(index);
        });
      }

      // Update property
      proxy.value = 2;

      // All watchers should have been called
      expect(watcherCalls.length).toBe(3);
      expect(watcherCalls).toContain(0);
      expect(watcherCalls).toContain(1);
      expect(watcherCalls).toContain(2);
    });
  });
