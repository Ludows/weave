/**
 * Model-Based Property Tests
 * Tests that verify reactive system equivalence with direct DOM manipulation
 */

import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, it } from 'vitest';
import { weave } from './weave';

describe('Model-Based Properties', () => {
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

  afterEach(() => {
    // Clean up all elements with id="target"
    document.querySelectorAll('#target').forEach(el => el.remove());
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('Property 26: Model-Based Reactive Equivalence', () => {
    /**
     * **Validates: Requirements 63.1**
     * 
     * For any reactive update, the final DOM state SHALL be equivalent to 
     * directly updating the DOM without the reactive system.
     */

    it('text() directive produces same result as direct textContent assignment', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { minLength: 1, maxLength: 10 }),
          (textValues) => {
            // Setup: Create element with child span
            const reactiveEl = document.createElement('div');
            const reactiveSpan = document.createElement('span');
            reactiveSpan.id = 'target';
            reactiveEl.appendChild(reactiveSpan);
            container.appendChild(reactiveEl);
            
            const directSpan = document.createElement('span');
            container.appendChild(directSpan);

            // Create reactive instance
            let textRef: any;
            const instance = weave(reactiveEl, ({ $, ref }) => {
              textRef = ref(textValues[0]);
              $('#target').text(() => textRef.value);
            });

            // Apply all text updates AFTER instance creation
            for (let i = 1; i < textValues.length; i++) {
              textRef.value = textValues[i];
            }

            // Apply same updates directly
            for (const value of textValues) {
              directSpan.textContent = value;
            }

            // Verify equivalence
            const result = reactiveSpan.textContent === directSpan.textContent;
            
            // Cleanup
            instance.$.destroy();
            reactiveEl.remove();
            directSpan.remove();
            
            return result;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('html() directive produces same result as direct innerHTML assignment', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              fc.constant('<span>test</span>'),
              fc.constant('<div>content</div>'),
              fc.constant('<p>paragraph</p>')
            ),
            { minLength: 1, maxLength: 5 }
          ),
          (htmlValues) => {
            const reactiveEl = document.createElement('div');
            const reactiveSpan = document.createElement('span');
            reactiveSpan.id = 'target';
            reactiveEl.appendChild(reactiveSpan);
            container.appendChild(reactiveEl);
            
            const directSpan = document.createElement('span');
            container.appendChild(directSpan);

            let htmlRef: any;
            const instance = weave(reactiveEl, ({ $, ref }) => {
              htmlRef = ref(htmlValues[0]);
              $('#target').html(() => htmlRef.value);
            });

            // Apply updates AFTER instance creation
            for (let i = 1; i < htmlValues.length; i++) {
              htmlRef.value = htmlValues[i];
            }

            for (const value of htmlValues) {
              directSpan.innerHTML = value;
            }

            const result = reactiveSpan.innerHTML === directSpan.innerHTML;
            
            instance.$.destroy();
            reactiveEl.remove();
            directSpan.remove();
            
            return result;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('show() directive produces same result as direct display manipulation', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
          (showValues) => {
            const reactiveEl = document.createElement('div');
            const reactiveSpan = document.createElement('span');
            reactiveSpan.id = 'target';
            reactiveEl.appendChild(reactiveSpan);
            container.appendChild(reactiveEl);
            
            const directSpan = document.createElement('span');
            container.appendChild(directSpan);

            let showRef: any;
            const instance = weave(reactiveEl, ({ $, ref }) => {
              showRef = ref(showValues[0]);
              $('#target').show(() => showRef.value);
            });

            // Apply updates AFTER instance creation
            for (let i = 1; i < showValues.length; i++) {
              showRef.value = showValues[i];
            }

            for (const value of showValues) {
              directSpan.style.display = value ? '' : 'none';
            }

            const result = reactiveSpan.style.display === directSpan.style.display;
            
            instance.$.destroy();
            reactiveEl.remove();
            directSpan.remove();
            
            return result;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('addClass/removeClass produces same result as direct classList manipulation', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              action: fc.constantFrom('add', 'remove'),
              className: fc.constantFrom('active', 'hidden', 'selected', 'disabled')
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (operations) => {
            const reactiveEl = document.createElement('div');
            const reactiveSpan = document.createElement('span');
            reactiveSpan.id = 'target';
            reactiveEl.appendChild(reactiveSpan);
            container.appendChild(reactiveEl);
            
            const directSpan = document.createElement('span');
            container.appendChild(directSpan);

            const instance = weave(reactiveEl, ({ $ }) => {
              for (const op of operations) {
                if (op.action === 'add') {
                  $('#target').addClass(op.className);
                } else {
                  $('#target').removeClass(op.className);
                }
              }
            });

            for (const op of operations) {
              if (op.action === 'add') {
                directSpan.classList.add(op.className);
              } else {
                directSpan.classList.remove(op.className);
              }
            }

            const result = reactiveSpan.className === directSpan.className;
            
            instance.$.destroy();
            reactiveEl.remove();
            directSpan.remove();
            
            return result;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('attr() directive produces same result as direct setAttribute', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.constantFrom('data-id', 'data-value', 'title', 'aria-label'),
              value: fc.string({ maxLength: 20 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (attributes) => {
            const reactiveEl = document.createElement('div');
            const reactiveSpan = document.createElement('span');
            reactiveSpan.id = 'target';
            reactiveEl.appendChild(reactiveSpan);
            container.appendChild(reactiveEl);
            
            const directSpan = document.createElement('span');
            container.appendChild(directSpan);

            const instance = weave(reactiveEl, ({ $ }) => {
              for (const attr of attributes) {
                $('#target').attr(attr.name, attr.value);
              }
            });

            for (const attr of attributes) {
              directSpan.setAttribute(attr.name, attr.value);
            }

            // Compare all attributes
            const reactiveAttrs = Array.from(reactiveSpan.attributes)
              .filter(a => a.name !== 'id')
              .sort((a, b) => a.name.localeCompare(b.name));
            const directAttrs = Array.from(directSpan.attributes)
              .sort((a, b) => a.name.localeCompare(b.name));

            const result = reactiveAttrs.length === directAttrs.length &&
              reactiveAttrs.every((attr, i) => 
                attr.name === directAttrs[i].name && 
                attr.value === directAttrs[i].value
              );
            
            instance.$.destroy();
            reactiveEl.remove();
            directSpan.remove();
            
            return result;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('style() directive produces same result as direct style assignment', () => {
      fc.assert(
        fc.property(
          fc.record({
            color: fc.constantFrom('red', 'blue', 'green'),
            fontSize: fc.integer({ min: 10, max: 30 }).map(n => `${n}px`),
            display: fc.constantFrom('block', 'inline', 'none')
          }),
          (styles) => {
            const reactiveEl = document.createElement('div');
            const reactiveSpan = document.createElement('span');
            reactiveSpan.id = 'target';
            reactiveEl.appendChild(reactiveSpan);
            container.appendChild(reactiveEl);
            
            const directSpan = document.createElement('span');
            container.appendChild(directSpan);

            const instance = weave(reactiveEl, ({ $ }) => {
              $('#target').style(styles);
            });

            Object.assign(directSpan.style, styles);

            const result = 
              reactiveSpan.style.color === directSpan.style.color &&
              reactiveSpan.style.fontSize === directSpan.style.fontSize &&
              reactiveSpan.style.display === directSpan.style.display;
            
            instance.$.destroy();
            reactiveEl.remove();
            directSpan.remove();
            
            return result;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('bind() directive produces same result as direct attribute binding', () => {
      fc.assert(
        fc.property(
          fc.record({
            disabled: fc.boolean(),
            readonly: fc.boolean(),
            required: fc.boolean()
          }),
          (attrs) => {
            const reactiveEl = document.createElement('div');
            const reactiveInput = document.createElement('input');
            reactiveInput.id = 'target';
            reactiveEl.appendChild(reactiveInput);
            container.appendChild(reactiveEl);
            
            const directInput = document.createElement('input');
            container.appendChild(directInput);

            const instance = weave(reactiveEl, ({ $ }) => {
              if (attrs.disabled) $('#target').bind('disabled', 'true');
              if (attrs.readonly) $('#target').bind('readonly', 'true');
              if (attrs.required) $('#target').bind('required', 'true');
            });

            if (attrs.disabled) directInput.setAttribute('disabled', 'true');
            if (attrs.readonly) directInput.setAttribute('readonly', 'true');
            if (attrs.required) directInput.setAttribute('required', 'true');

            const result = 
              reactiveInput.hasAttribute('disabled') === directInput.hasAttribute('disabled') &&
              reactiveInput.hasAttribute('readonly') === directInput.hasAttribute('readonly') &&
              reactiveInput.hasAttribute('required') === directInput.hasAttribute('required');
            
            instance.$.destroy();
            reactiveEl.remove();
            directInput.remove();
            
            return result;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
