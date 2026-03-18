/**
 * Property tests for NodeRef implementation
 */

import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';
import { beforeEach, describe, expect, it } from 'vitest';
import { ref } from '../reactive/ref';
import { NodeRef } from './node-ref';

describe('NodeRef - Property Tests', () => {
  let dom: JSDOM;
  let document: Document;
  let rootElement: HTMLElement;

  beforeEach(() => {
    // Create a fresh DOM for each test
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
    rootElement = document.createElement('div');
    document.body.appendChild(rootElement);
    
    // Set global document for NodeRef to use
    global.document = document as any;
    global.HTMLInputElement = dom.window.HTMLInputElement as any;
    global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement as any;
    global.HTMLSelectElement = dom.window.HTMLSelectElement as any;
  });

  /**
   * Property 3: Lazy Resolution Timing
   * **Validates: Requirements 3.2, 3.3, 41.1-41.5**
   * 
   * For any NodeRef created by $(), the querySelector SHALL not execute until
   * the first access to any directive method or .value property, and the result
   * SHALL be cached for subsequent accesses.
   */
  it('Property 3: querySelector is not called during NodeRef construction', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('div', 'span', 'p', 'button', 'input'), { minLength: 1, maxLength: 5 }),
        fc.array(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0 && /^[a-zA-Z]/.test(s)), { minLength: 1, maxLength: 5 }),
        (tagNames, classNames) => {
          // Create elements in the DOM
          const elements: HTMLElement[] = [];
          tagNames.forEach((tag, i) => {
            const el = document.createElement(tag);
            el.className = classNames[i % classNames.length]!;
            rootElement.appendChild(el);
            elements.push(el);
          });

          // Track querySelector calls
          let querySelectorCallCount = 0;
          const originalQuerySelector = rootElement.querySelector.bind(rootElement);
          rootElement.querySelector = function(selector: string) {
            querySelectorCallCount++;
            return originalQuerySelector(selector);
          } as any;

          // Create NodeRef - should NOT call querySelector
          const selector = `.${classNames[0]}`;
          const nodeRef = new NodeRef(selector, rootElement);

          // Verify querySelector was NOT called during construction
          expect(querySelectorCallCount).toBe(0);

          // Restore original querySelector
          rootElement.querySelector = originalQuerySelector;

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 3: querySelector is called on first .value access', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (id) => {
          // Create an element with a unique ID
          const el = document.createElement('div');
          el.id = `test-${id}`;
          el.textContent = 'test';
          rootElement.appendChild(el);

          // Track querySelector calls
          let querySelectorCallCount = 0;
          const originalQuerySelector = rootElement.querySelector.bind(rootElement);
          rootElement.querySelector = function(selector: string) {
            querySelectorCallCount++;
            return originalQuerySelector(selector);
          } as any;

          // Create NodeRef
          const nodeRef = new NodeRef(`#test-${id}`, rootElement);
          expect(querySelectorCallCount).toBe(0);

          // Access .value - should call querySelector
          const value = nodeRef.value;
          expect(querySelectorCallCount).toBe(1);

          // Restore original querySelector
          rootElement.querySelector = originalQuerySelector;

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 3: querySelector result is cached for subsequent accesses', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 1, max: 100 }),
        (accessCount, id) => {
          // Create an element
          const el = document.createElement('div');
          el.id = `test-${id}`;
          el.textContent = 'test';
          rootElement.appendChild(el);

          // Track querySelector calls
          let querySelectorCallCount = 0;
          const originalQuerySelector = rootElement.querySelector.bind(rootElement);
          rootElement.querySelector = function(selector: string) {
            querySelectorCallCount++;
            return originalQuerySelector(selector);
          } as any;

          // Create NodeRef
          const nodeRef = new NodeRef(`#test-${id}`, rootElement);

          // Access .value multiple times
          for (let i = 0; i < accessCount; i++) {
            const value = nodeRef.value;
          }

          // querySelector should only be called once (on first access)
          expect(querySelectorCallCount).toBe(1);

          // Restore original querySelector
          rootElement.querySelector = originalQuerySelector;

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 3: element not found throws error on first access', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s)),
        (selector) => {
          // Create NodeRef with non-existent selector
          const nodeRef = new NodeRef(`#nonexistent-${selector}`, rootElement);

          // Should not throw during construction
          expect(() => nodeRef).not.toThrow();

          // Should throw on first access
          try {
            const val = nodeRef.value;
            // If we get here without throwing, fail the test
            return false;
          } catch (error: any) {
            // Accept either our error message or invalid selector error
            return error.message.includes('NodeRef: element not found') || 
                   error.message.includes('Invalid selector');
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 3: .value getter returns correct values for input elements', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s.length < 100), // Limit string length to avoid JSDOM issues
        fc.integer({ min: 1, max: 100 }),
        (value, id) => {
          // Create a fresh root element for this test iteration
          const testRoot = document.createElement('div');
          document.body.appendChild(testRoot);
          
          const el = document.createElement('input');
          el.id = `test-${id}`;
          el.value = value;
          testRoot.appendChild(el);

          const nodeRef = new NodeRef(`#test-${id}`, testRoot);
          
          // JSDOM may normalize the value, so we compare what's actually in the element
          const result = nodeRef.value === el.value;
          
          // Cleanup
          document.body.removeChild(testRoot);
          
          return result;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 3: .value getter returns parsed number for data-* attributes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000000, max: 1000000 }), // Use safer integer range
        fc.integer({ min: 1, max: 100 }),
        (numValue, id) => {
          // Create a fresh root element for this test iteration
          const testRoot = document.createElement('div');
          document.body.appendChild(testRoot);
          
          const el = document.createElement('div');
          el.id = `test-${id}`;
          el.setAttribute('data-value', String(numValue));
          testRoot.appendChild(el);

          const nodeRef = new NodeRef(`#test-${id}`, testRoot);
          const value = nodeRef.value;

          // Verify the attribute was set correctly first
          const attrValue = el.getAttribute('data-value');
          const expectedValue = Number(attrValue);
          
          const result = value === expectedValue && typeof value === 'number';
          
          // Cleanup
          document.body.removeChild(testRoot);
          
          return result;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 3: .value setter updates input elements correctly', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s.length < 100),
        fc.string().filter(s => s.length < 100),
        fc.integer({ min: 1, max: 100 }),
        (initial, updated, id) => {
          // Create a fresh root element for this test iteration
          const testRoot = document.createElement('div');
          document.body.appendChild(testRoot);
          
          const el = document.createElement('input');
          el.id = `test-${id}`;
          el.value = initial;
          testRoot.appendChild(el);

          const nodeRef = new NodeRef(`#test-${id}`, testRoot);
          
          // Set new value
          nodeRef.value = updated;

          // Verify the element was updated - compare with what's actually in the DOM
          // JSDOM may normalize values, so we check what the element actually has
          const result = nodeRef.value === el.value && el.value === String(updated);
          
          // Cleanup
          document.body.removeChild(testRoot);
          
          return result;
        }
      ),
      { numRuns: 50 }
    );
  });

  // ─── model() ────────────────────────────────────────────────────────────────

  it('model(): initializes input value from ref', () => {
    const input = document.createElement('input');
    input.id = 'model-init';
    rootElement.appendChild(input);

    const name = ref('hello');
    new NodeRef('#model-init', rootElement).model(name);

    expect(input.value).toBe('hello');
  });

  it('model(): updates input when ref changes', async () => {
    const input = document.createElement('input');
    input.id = 'model-reactive';
    rootElement.appendChild(input);

    const name = ref('initial');
    new NodeRef('#model-reactive', rootElement).model(name);

    name.value = 'updated';
    // Wait a microtask for the reactive effect to run
    await Promise.resolve();
    expect(input.value).toBe('updated');
  });

  it('model(): updates ref when input fires an input event', () => {
    const input = document.createElement('input');
    input.id = 'model-bidir';
    rootElement.appendChild(input);

    const name = ref('');
    new NodeRef('#model-bidir', rootElement).model(name);

    input.value = 'typed';
    input.dispatchEvent(new (dom.window.Event)('input', { bubbles: true }));

    expect(name.value).toBe('typed');
  });

  it('model(): throws on non-input elements', () => {
    const div = document.createElement('div');
    div.id = 'model-err';
    rootElement.appendChild(div);

    const r = ref('x');
    expect(() => new NodeRef('#model-err', rootElement).model(r)).toThrow(
      'model() can only be used on input, textarea, or select elements'
    );
  });

  // ─── teleport() ─────────────────────────────────────────────────────────────

  it('teleport(): moves element to target', () => {
    const el = document.createElement('div');
    el.id = 'teleport-src';
    rootElement.appendChild(el);

    const target = document.createElement('section');
    target.id = 'teleport-target';
    document.body.appendChild(target);

    global.document = document as any;

    new NodeRef('#teleport-src', rootElement).teleport('#teleport-target');

    expect(target.contains(el)).toBe(true);
    expect(rootElement.contains(el)).toBe(false);
  });

  it('teleport(): leaves a placeholder comment in original position', () => {
    const el = document.createElement('div');
    el.id = 'teleport-placeholder';
    rootElement.appendChild(el);

    const target = document.createElement('section');
    target.id = 'teleport-ph-target';
    document.body.appendChild(target);

    global.document = document as any;

    new NodeRef('#teleport-placeholder', rootElement).teleport('#teleport-ph-target');

    const comments = Array.from(rootElement.childNodes).filter(n => n.nodeType === 8);
    expect(comments.length).toBeGreaterThan(0);
  });

  it('teleport(): throws when target is not found', () => {
    const el = document.createElement('div');
    el.id = 'teleport-nofound';
    rootElement.appendChild(el);

    global.document = document as any;

    expect(() =>
      new NodeRef('#teleport-nofound', rootElement).teleport('#does-not-exist')
    ).toThrow('teleport(): target not found');
  });

  it('Property 3: lazy resolution works consistently across multiple NodeRef instances', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 2, maxLength: 5 }),
        (ids) => {
          // Create elements with unique IDs
          const elements: HTMLElement[] = [];
          ids.forEach((id) => {
            const el = document.createElement('div');
            el.id = `test-${id}`;
            el.textContent = String(id);
            rootElement.appendChild(el);
            elements.push(el);
          });

          // Track querySelector calls
          let querySelectorCallCount = 0;
          const originalQuerySelector = rootElement.querySelector.bind(rootElement);
          rootElement.querySelector = function(selector: string) {
            querySelectorCallCount++;
            return originalQuerySelector(selector);
          } as any;

          // Create multiple NodeRefs
          const nodeRefs = ids.map(id => new NodeRef(`#test-${id}`, rootElement));

          // No querySelector calls yet
          expect(querySelectorCallCount).toBe(0);

          // Access each NodeRef once
          nodeRefs.forEach((nodeRef) => {
            const value = nodeRef.value;
          });

          // Should have called querySelector once per NodeRef
          expect(querySelectorCallCount).toBe(ids.length);

          // Access again - should use cached values
          nodeRefs.forEach((nodeRef) => {
            const value = nodeRef.value;
          });

          // No additional querySelector calls
          expect(querySelectorCallCount).toBe(ids.length);

          // Restore original querySelector
          rootElement.querySelector = originalQuerySelector;

          return true;
        }
      ),
      { numRuns: 30 }
    );
  });
});
