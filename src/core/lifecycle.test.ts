/**
 * Tests for lifecycle hooks (onInit, onUpdate, onDestroy)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { weave } from './weave';

describe('Lifecycle hooks', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up all test containers (in case of test failures or multiple elements)
    document.querySelectorAll('#test-container').forEach(el => el.remove());
  });

  describe('onInit hook', () => {
    it('should execute after all refs and computed are resolved', async () => {
      const onInitSpy = vi.fn();
      
      weave('#test-container', ({ ref, computed, onInit }) => {
        const count = ref(0);
        computed('double', () => count.value * 2);
        
        onInit((state) => {
          onInitSpy(state);
        });
      });
      
      // Wait for onInit to execute (it's async)
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(onInitSpy).toHaveBeenCalledTimes(1);
      expect(onInitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          ref_0: 0,
          double: 0
        })
      );
    });

    it('should pass complete state snapshot to handler', async () => {
      let capturedState: any;
      
      weave('#test-container', ({ ref, computed, onInit }) => {
        const name = ref('Alice');
        const age = ref(30);
        computed('greeting', () => `Hello, ${name.value}!`);
        
        onInit((state) => {
          capturedState = state;
        });
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(capturedState).toBeDefined();
      expect(capturedState.ref_0).toBe('Alice');
      expect(capturedState.ref_1).toBe(30);
      expect(capturedState.greeting).toBe('Hello, Alice!');
    });

    it('should support async handlers', async () => {
      const executionOrder: string[] = [];
      
      weave('#test-container', ({ onInit }) => {
        onInit(async () => {
          executionOrder.push('start');
          await new Promise(resolve => setTimeout(resolve, 5));
          executionOrder.push('end');
        });
      });
      
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(executionOrder).toEqual(['start', 'end']);
    });

    it('should support multiple registrations in order', async () => {
      const executionOrder: number[] = [];
      
      weave('#test-container', ({ onInit }) => {
        onInit(() => {
          executionOrder.push(1);
        });
        
        onInit(() => {
          executionOrder.push(2);
        });
        
        onInit(() => {
          executionOrder.push(3);
        });
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(executionOrder).toEqual([1, 2, 3]);
    });
  });

  describe('onUpdate hook', () => {
    it('should execute after every state change', async () => {
      const onUpdateSpy = vi.fn();
      
      const instance = weave('#test-container', ({ ref, onUpdate }) => {
        const count = ref(0);
        
        onUpdate((newState, oldState) => {
          onUpdateSpy(newState, oldState);
        });
      });
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Change state
      (instance as any).ref_0 = 1;
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(onUpdateSpy).toHaveBeenCalled();
    });

    it('should pass newState and oldState to handler', async () => {
      let capturedNew: any;
      let capturedOld: any;
      
      const instance = weave('#test-container', ({ ref, onUpdate }) => {
        const count = ref(5);
        
        onUpdate((newState, oldState) => {
          capturedNew = newState;
          capturedOld = oldState;
        });
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Change state
      (instance as any).ref_0 = 10;
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(capturedOld.ref_0).toBe(5);
      expect(capturedNew.ref_0).toBe(10);
    });

    it('should support multiple registrations in order', async () => {
      const executionOrder: number[] = [];
      
      const instance = weave('#test-container', ({ ref, onUpdate }) => {
        const count = ref(0);
        
        onUpdate(() => {
          executionOrder.push(1);
        });
        
        onUpdate(() => {
          executionOrder.push(2);
        });
        
        onUpdate(() => {
          executionOrder.push(3);
        });
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Change state
      (instance as any).ref_0 = 1;
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(executionOrder).toEqual([1, 2, 3]);
    });
  });

  describe('onDestroy hook', () => {
    it('should execute immediately before destruction', async () => {
      const onDestroySpy = vi.fn();
      
      // Debug: check how many elements match
      const matchingElements = document.querySelectorAll('#test-container');
      console.log('Matching elements:', matchingElements.length);
      
      const instance = weave('#test-container', ({ ref, onDestroy }) => {
        const count = ref(42);
        
        onDestroy((state) => {
          onDestroySpy(state);
        });
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Debug log
      console.log('instance is array:', Array.isArray(instance));
      console.log('instance length:', Array.isArray(instance) ? instance.length : 'N/A');
      
      // Destroy instance
      if (Array.isArray(instance)) {
        instance[0].$.destroy();
      } else {
        (instance as any).$.destroy();
      }
      
      expect(onDestroySpy).toHaveBeenCalledTimes(1);
      expect(onDestroySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          ref_0: 42
        })
      );
    });

    it('should pass final state snapshot to handler', async () => {
      let capturedState: any;
      let nameRef: any;
      
      const instance = weave('#test-container', ({ ref, computed, onDestroy }) => {
        const name = ref('Bob');
        nameRef = name; // Capture for debugging
        computed('greeting', () => {
          console.log('Computing greeting, name.value:', name.value);
          return `Goodbye, ${name.value}!`;
        });
        
        onDestroy((state) => {
          capturedState = state;
        });
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      console.log('Before change, nameRef.value:', nameRef.value);
      console.log('Before change, instance.ref_0:', (instance as any).ref_0);
      
      // Change state before destroying
      (instance as any).ref_0 = 'Charlie';
      
      console.log('After change, nameRef.value:', nameRef.value);
      console.log('After change, instance.ref_0:', (instance as any).ref_0);
      
      // Destroy instance
      (instance as any).$.destroy();
      
      expect(capturedState).toBeDefined();
      expect(capturedState.ref_0).toBe('Charlie');
      expect(capturedState.greeting).toBe('Goodbye, Charlie!');
    });

    it('should support multiple registrations in order', async () => {
      const executionOrder: number[] = [];
      
      const instance = weave('#test-container', ({ onDestroy }) => {
        onDestroy(() => {
          executionOrder.push(1);
        });
        
        onDestroy(() => {
          executionOrder.push(2);
        });
        
        onDestroy(() => {
          executionOrder.push(3);
        });
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Destroy instance
      (instance as any).$.destroy();
      
      expect(executionOrder).toEqual([1, 2, 3]);
    });
  });

  describe('Lifecycle hook execution order', () => {
    it('should execute in order: onInit → onUpdate → onDestroy', async () => {
      const executionOrder: string[] = [];
      
      const instance = weave('#test-container', ({ ref, onInit, onUpdate, onDestroy }) => {
        const count = ref(0);
        
        onInit(() => {
          executionOrder.push('init');
        });
        
        onUpdate(() => {
          executionOrder.push('update');
        });
        
        onDestroy(() => {
          executionOrder.push('destroy');
        });
      });
      
      // Wait for init
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Trigger update
      (instance as any).ref_0 = 1;
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Trigger destroy
      (instance as any).$.destroy();
      
      expect(executionOrder).toEqual(['init', 'update', 'destroy']);
    });

    it('should execute cleanup functions after onDestroy hooks', async () => {
      const executionOrder: string[] = [];
      
      const instance = weave('#test-container', ({ cleanup, onDestroy }) => {
        onDestroy(() => {
          executionOrder.push('onDestroy');
        });
        
        cleanup(() => {
          executionOrder.push('cleanup');
        });
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Destroy instance
      (instance as any).$.destroy();
      
      expect(executionOrder).toEqual(['onDestroy', 'cleanup']);
    });
  });

  describe('External API lifecycle hooks', () => {
    it('should support $.onInit() external registration', async () => {
      const onInitSpy = vi.fn();
      
      const instance = weave('#test-container', ({ ref }) => {
        const count = ref(0);
      });
      
      // Register externally
      (instance as any).$.onInit((state: any) => {
        onInitSpy(state);
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(onInitSpy).toHaveBeenCalledTimes(1);
    });

    it('should support $.onUpdate() external registration with unwatch', async () => {
      const onUpdateSpy = vi.fn();
      
      const instance = weave('#test-container', ({ ref }) => {
        const count = ref(0);
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Register externally
      const unwatch = (instance as any).$.onUpdate(() => {
        onUpdateSpy();
      });
      
      // Trigger update
      (instance as any).ref_0 = 1;
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(onUpdateSpy).toHaveBeenCalledTimes(1);
      
      // Unwatch
      unwatch();
      
      // Trigger another update
      (instance as any).ref_0 = 2;
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should still be 1 (not called again)
      expect(onUpdateSpy).toHaveBeenCalledTimes(1);
    });

    it('should support $.onDestroy() external registration', async () => {
      const onDestroySpy = vi.fn();
      
      const instance = weave('#test-container', ({ ref }) => {
        const count = ref(0);
      });
      
      // Register externally
      (instance as any).$.onDestroy((state: any) => {
        onDestroySpy(state);
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Destroy instance
      (instance as any).$.destroy();
      
      expect(onDestroySpy).toHaveBeenCalledTimes(1);
    });
  });
});
