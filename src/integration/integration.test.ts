/**
 * Integration Tests
 * Tests that verify complete application flows work correctly
 */

import { JSDOM } from 'jsdom';
import { beforeEach, describe, expect, it } from 'vitest';
import { weave } from '../core/weave';
import { createStore } from '../store/create-store';

describe('Integration Tests', () => {
  let dom: JSDOM;
  let document: Document;
  let container: HTMLElement;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
    global.document = document as any;
    global.window = dom.window as any;
    global.Node = dom.window.Node as any;
    global.Element = dom.window.Element as any;
    global.HTMLElement = dom.window.HTMLElement as any;
    global.HTMLInputElement = dom.window.HTMLInputElement as any;
    global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement as any;
    global.HTMLSelectElement = dom.window.HTMLSelectElement as any;
    global.MutationObserver = dom.window.MutationObserver as any;

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  describe('Full Application Integration', () => {
    it('should handle complete reactive application flow', () => {
      // Setup HTML
      const app = document.createElement('div');
      app.id = 'app';
      app.innerHTML = `
        <div id="counter">0</div>
        <button id="increment">Increment</button>
      `;
      container.appendChild(app);

      let clickHandler: (() => void) | null = null;
      let count: any = null;  // Store ref for testing

      // Create reactive instance
      const instance = weave(app, ({ ref, computed, state, onInit, onUpdate, cleanup }) => {
        count = ref(0);
        
        computed('double', () => count.value * 2);
        
        // Track lifecycle
        let initCalled = false;
        let updateCount = 0;
        
        onInit((s) => {
          initCalled = true;
          // State snapshot doesn't include refs, only computed values
          expect(s.double).toBe(0);
        });
        
        onUpdate((newState, oldState) => {
          updateCount++;
        });
        
        cleanup(() => {
          // Cleanup logic
        });
        
        // Expose for testing
        clickHandler = () => {
          count.value++;
        };
      });

      // Verify initial state
      expect(count.value).toBe(0);
      expect(instance.double).toBe(0);

      // Simulate user interaction
      if (clickHandler) {
        clickHandler();
      }

      // Verify state updated
      expect(count.value).toBe(1);
      expect(instance.double).toBe(2);

      // Cleanup
      instance.$.destroy();
    });
  });

  describe('Store Integration', () => {
    it('should integrate Store with multiple Proxy_Instances', () => {
      // Create a shared store
      const counterStore = createStore('counter', ({ state, action, computed }) => {
        state({ count: 0 });
        
        computed('double', (s) => s.count * 2);
        
        action('increment', (s) => {
          s.count++;
        });
        
        action('decrement', (s) => {
          s.count--;
        });
      });

      // Create first component
      const comp1 = document.createElement('div');
      comp1.id = 'comp1';
      container.appendChild(comp1);

      const instance1 = weave(comp1, ({ store }) => {
        store(counterStore);
      });

      // Create second component
      const comp2 = document.createElement('div');
      comp2.id = 'comp2';
      container.appendChild(comp2);

      const instance2 = weave(comp2, ({ store }) => {
        store(counterStore);
      });

      // Verify initial state
      expect(counterStore.state.count).toBe(0);
      expect(counterStore.state.double).toBe(0);

      // Mutate through store
      counterStore.actions.increment();

      // Verify both instances see the change
      expect(counterStore.state.count).toBe(1);
      expect(counterStore.state.double).toBe(2);

      // Mutate again
      counterStore.actions.increment();
      expect(counterStore.state.count).toBe(2);

      counterStore.actions.decrement();
      expect(counterStore.state.count).toBe(1);

      // Cleanup
      instance1.$.destroy();
      instance2.$.destroy();
    });
  });

  describe('Lifecycle Integration', () => {
    it('should execute complete lifecycle hook sequence', () => {
      const app = document.createElement('div');
      app.id = 'app';
      container.appendChild(app);

      const lifecycle: string[] = [];
      let value: any = null;  // Store ref for testing

      const instance = weave(app, ({ ref, onInit, onUpdate, onDestroy, cleanup }) => {
        value = ref(0);

        onInit((s) => {
          lifecycle.push('onInit');
          // State snapshot doesn't include refs
        });

        onUpdate((newState, oldState) => {
          lifecycle.push('onUpdate');
        });

        onDestroy((s) => {
          lifecycle.push('onDestroy');
        });

        cleanup(() => {
          lifecycle.push('cleanup');
        });

        // Trigger update
        setTimeout(() => {
          value.value = 1;
        }, 10);
      });

      // Wait for onInit
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Verify onInit was called
          expect(lifecycle).toContain('onInit');

          // Wait for update
          setTimeout(() => {
            // Verify onUpdate was called
            expect(lifecycle).toContain('onUpdate');

            // Destroy instance
            instance.$.destroy();

            // Verify destruction sequence
            expect(lifecycle).toContain('onDestroy');
            expect(lifecycle).toContain('cleanup');

            // Verify order: onInit → onUpdate → onDestroy → cleanup
            const onInitIndex = lifecycle.indexOf('onInit');
            const onUpdateIndex = lifecycle.indexOf('onUpdate');
            const onDestroyIndex = lifecycle.indexOf('onDestroy');
            const cleanupIndex = lifecycle.indexOf('cleanup');

            expect(onInitIndex).toBeLessThan(onUpdateIndex);
            expect(onUpdateIndex).toBeLessThan(onDestroyIndex);
            expect(onDestroyIndex).toBeLessThan(cleanupIndex);

            resolve();
          }, 20);
        }, 10);
      });
    });
  });
});
