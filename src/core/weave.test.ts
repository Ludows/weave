/**
 * Tests for core weave() function
 */

import * as fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { weave } from './weave';

describe('weave() - Project Setup Verification', () => {
  it('should have testing framework configured', () => {
    expect(true).toBe(true);
  });

  it('should support property-based testing with fast-check', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n === n;
      }),
      { numRuns: 100 }
    );
  });
});

describe('weave() - Element Resolution (Task 4.1)', () => {
  let testContainer: HTMLDivElement;

  beforeEach(() => {
    // Create a test container
    testContainer = document.createElement('div');
    testContainer.id = 'test-container';
    document.body.appendChild(testContainer);
  });

  afterEach(() => {
    // Clean up
    document.body.removeChild(testContainer);
  });

  it('should resolve element from CSS selector', () => {
    testContainer.innerHTML = '<div class="target"></div>';
    
    const instance = weave('.target', () => {});
    
    expect(instance).toBeDefined();
    expect(instance.$).toBeDefined();
  });

  it('should accept direct HTML element', () => {
    const element = document.createElement('div');
    testContainer.appendChild(element);
    
    const instance = weave(element, () => {});
    
    expect(instance).toBeDefined();
    expect(instance.$).toBeDefined();
  });

  it('should throw error for missing element', () => {
    expect(() => {
      weave('.non-existent', () => {});
    }).toThrow('weave : élément introuvable (.non-existent)');
  });

  it('should return array for multiple element matches', () => {
    testContainer.innerHTML = `
      <div class="item"></div>
      <div class="item"></div>
      <div class="item"></div>
    `;
    
    const instances = weave('.item', () => {});
    
    expect(Array.isArray(instances)).toBe(true);
    expect(instances).toHaveLength(3);
    instances.forEach(instance => {
      expect(instance.$).toBeDefined();
    });
  });

  it('should return single instance for single match', () => {
    testContainer.innerHTML = '<div class="single"></div>';
    
    const instance = weave('.single', () => {});
    
    expect(Array.isArray(instance)).toBe(false);
    expect(instance.$).toBeDefined();
  });

  it('should execute callback with context', () => {
    testContainer.innerHTML = '<div class="target"></div>';
    let contextReceived = false;
    
    weave('.target', (ctx) => {
      contextReceived = true;
      expect(ctx).toBeDefined();
      expect(typeof ctx.$).toBe('function');
    });
    
    expect(contextReceived).toBe(true);
  });
});

describe('weave() - Property 29: Error on Missing Element', () => {
  let testContainer: HTMLDivElement;

  beforeEach(() => {
    testContainer = document.createElement('div');
    testContainer.id = 'test-container';
    document.body.appendChild(testContainer);
  });

  afterEach(() => {
    document.body.removeChild(testContainer);
  });

  it('should throw error for any selector that matches no elements', () => {
    /**
     * Property 29: Error on Missing Element
     * For any weave() call with a selector that matches no elements,
     * an error SHALL be thrown with a descriptive message.
     * 
     * Validates: Requirements 1.4, 61.1, 61.2
     */
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).map(s => {
          // Generate valid CSS class selectors that don't exist
          const validSelector = s.replace(/[^a-zA-Z0-9_]/g, '').replace(/^[0-9]+/, '');
          return validSelector.length > 0 ? validSelector : 'nonexistent';
        }).filter(s => {
          // Ensure the selector doesn't match any elements
          try {
            return !document.querySelector(`.${s}`);
          } catch {
            return false; // Skip invalid selectors
          }
        }),
        (selector) => {
          const cssSelector = `.${selector}`;
          
          // Verify the selector doesn't match any elements
          expect(document.querySelectorAll(cssSelector).length).toBe(0);
          
          // Verify weave() throws an error
          expect(() => {
            weave(cssSelector, () => {});
          }).toThrow(/weave : élément introuvable/);
          
          // Verify the error message includes the selector
          try {
            weave(cssSelector, () => {});
            return false; // Should not reach here
          } catch (error) {
            return (error as Error).message.includes(cssSelector);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should throw error with exact message format', () => {
    const selector = '.definitely-does-not-exist-12345';
    
    expect(() => {
      weave(selector, () => {});
    }).toThrow(`weave : élément introuvable (${selector})`);
  });
});


describe('weave() - CallbackContext API Methods (Task 4.3)', () => {
  let testContainer: HTMLDivElement;

  beforeEach(() => {
    testContainer = document.createElement('div');
    testContainer.id = 'test-container';
    document.body.appendChild(testContainer);
  });

  afterEach(() => {
    document.body.removeChild(testContainer);
  });

  it('should provide ref() function that creates reactive references', () => {
    testContainer.innerHTML = '<div class="target"></div>';
    
    weave('.target', (ctx) => {
      const count = ctx.ref(0);
      
      expect(count.value).toBe(0);
      
      count.value = 5;
      expect(count.value).toBe(5);
    });
  });

  it('should provide computed() function that creates computed properties', () => {
    testContainer.innerHTML = '<div class="target"></div>';
    
    const instance = weave('.target', (ctx) => {
      const count = ctx.ref(10);
      ctx.computed('double', () => count.value * 2);
    });
    
    expect((instance as any).double).toBe(20);
  });

  it('should provide state() function that returns immutable snapshot', () => {
    testContainer.innerHTML = '<div class="target"></div>';
    
    weave('.target', (ctx) => {
      const count = ctx.ref(42);
      ctx.computed('doubled', () => count.value * 2);
      
      const snapshot = ctx.state();
      
      expect(snapshot).toBeDefined();
      expect(Object.isFrozen(snapshot)).toBe(true);
    });
  });

  it('should provide has() function to check property existence', () => {
    testContainer.innerHTML = '<div class="target"></div>';
    
    weave('.target', (ctx) => {
      const count = ctx.ref(5);
      ctx.computed('doubled', () => count.value * 2);
      
      // has() should return true for existing properties
      expect(ctx.has('ref_0')).toBe(true);
      expect(ctx.has('doubled')).toBe(true);
      
      // has() should return false for non-existent properties
      expect(ctx.has('nonexistent')).toBe(false);
    });
  });

  it('should provide lifecycle hooks (onInit, onUpdate, onDestroy)', () => {
    testContainer.innerHTML = '<div class="target"></div>';
    
    let initCalled = false;
    let updateCalled = false;
    let destroyCalled = false;
    
    weave('.target', (ctx) => {
      ctx.onInit(() => {
        initCalled = true;
      });
      
      ctx.onUpdate(() => {
        updateCalled = true;
      });
      
      ctx.onDestroy(() => {
        destroyCalled = true;
      });
    });
    
    // Hooks should be registered (not called yet in this implementation)
    expect(initCalled).toBe(false);
    expect(updateCalled).toBe(false);
    expect(destroyCalled).toBe(false);
  });

  it('should provide cleanup() function to register cleanup functions', () => {
    testContainer.innerHTML = '<div class="target"></div>';
    
    let cleanupCalled = false;
    
    weave('.target', (ctx) => {
      ctx.cleanup(() => {
        cleanupCalled = true;
      });
    });
    
    // Cleanup should be registered (not called yet)
    expect(cleanupCalled).toBe(false);
  });

  it('should provide $.state() external API method', () => {
    testContainer.innerHTML = '<div class="target"></div>';
    
    const instance = weave('.target', (ctx) => {
      ctx.ref(100);
      ctx.computed('doubled', () => 200);
    });
    
    const snapshot = instance.$.state();
    
    expect(snapshot).toBeDefined();
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it('should provide $.onUpdate() that returns unwatch function', () => {
    testContainer.innerHTML = '<div class="target"></div>';

    const instance = weave('.target', () => {});

    let updateCalled = false;
    const unwatch = instance.$.onUpdate(() => {
      updateCalled = true;
    });

    expect(typeof unwatch).toBe('function');

    // Calling unwatch should remove the hook
    unwatch();
    expect(updateCalled).toBe(false);
  });
});

describe('weave() - nextTick, dispatch, $refs', () => {
  let testContainer: HTMLDivElement;

  beforeEach(() => {
    testContainer = document.createElement('div');
    testContainer.id = 'new-features-container';
    document.body.appendChild(testContainer);
  });

  afterEach(() => {
    document.body.removeChild(testContainer);
  });

  it('nextTick() returns a Promise that resolves after current microtask', async () => {
    testContainer.innerHTML = '<div class="target"></div>';
    let resolved = false;
    let p: Promise<void>;

    weave('.target', ({ nextTick }) => {
      p = nextTick(() => { resolved = true; });
    });

    expect(resolved).toBe(false);
    await p!;
    expect(resolved).toBe(true);
  });

  it('nextTick() executes the provided callback', async () => {
    testContainer.innerHTML = '<div class="target"></div>';
    let called = false;

    weave('.target', ({ nextTick }) => {
      nextTick(() => { called = true; });
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(called).toBe(true);
  });

  it('dispatch() fires a CustomEvent on the root element', () => {
    testContainer.innerHTML = '<div class="target"></div>';
    const received: any[] = [];

    testContainer.querySelector('.target')!.addEventListener('my-event', (e: Event) => {
      received.push((e as CustomEvent).detail);
    });

    weave('.target', ({ dispatch }) => {
      dispatch('my-event', { value: 42 });
    });

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ value: 42 });
  });

  it('dispatch() event bubbles up the DOM', () => {
    testContainer.innerHTML = '<div class="target"></div>';
    let bubbled = false;

    testContainer.addEventListener('bubble-test', () => { bubbled = true; });

    weave('.target', ({ dispatch }) => {
      dispatch('bubble-test');
    });

    expect(bubbled).toBe(true);
  });

  it('$refs() returns elements by weave-ref attribute', () => {
    testContainer.innerHTML = `
      <div class="target">
        <input weave-ref="username" />
        <button weave-ref="submit">Go</button>
      </div>
    `;

    weave('.target', ({ $refs }) => {
      const refs = $refs();
      expect(refs['username']).toBeInstanceOf(HTMLInputElement);
      expect(refs['submit']).toBeInstanceOf(HTMLButtonElement);
    });
  });

  it('$refs() returns empty object when no weave-ref attributes exist', () => {
    testContainer.innerHTML = '<div class="target"><span>hello</span></div>';

    weave('.target', ({ $refs }) => {
      expect($refs()).toEqual({});
    });
  });
});
