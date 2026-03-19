/**
 * NodeRef class and $ selector implementation
 */

import { cleanupEffect, createReactiveEffect, runEffect } from '../core/dependency-tracker';
import type { ForContext, NodeRef as INodeRef, IfOptions, Ref, TemplateConfig } from '../types';
import { cleanupDirectives, createDirective, registerDirective, type Directive } from './directives';

/**
 * Check if at least one element in NodeList matches predicate
 */
export function some(nodeList: NodeList, predicate: (element: Element) => boolean): boolean {
  return Array.from(nodeList).some(node => {
    if (node instanceof Element) {
      return predicate(node);
    }
    return false;
  });
}

export class NodeRef implements INodeRef {
  private selector: string;
  private rootElement: Element;
  private cachedElement: Element | null = null;

  constructor(selector: string, root: Element) {
    this.selector = selector;
    this.rootElement = root;
  }

  /**
   * Lazy resolution - only executes querySelector on first access
   * Caches the result for subsequent accesses
   */
  private resolve(): Element {
    if (!this.cachedElement) {
      this.cachedElement = this.rootElement.querySelector(this.selector);
      if (!this.cachedElement) {
        throw new Error(`NodeRef: element not found (${this.selector})`);
      }
    }
    return this.cachedElement;
  }

  /**
   * Direct access to the underlying DOM element
   */
  get el(): Element {
    return this.resolve();
  }

  /**
   * Get the value of the element
   * - For input/textarea/select: returns element.value
   * - For elements with data-* attributes: returns parsed attribute value
   * - For other elements: returns textContent
   */
  get value(): unknown {
    const el = this.resolve();
    
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
    ) {
      return el.value;
    }
    
    // Check for data-* attributes
    const dataAttrs = Array.from(el.attributes).filter(attr =>
      attr.name.startsWith('data-')
    );
    
    if (dataAttrs.length > 0) {
      const value = dataAttrs[0]!.value;
      const num = Number(value);
      return isNaN(num) ? value : num;
    }
    
    return el.textContent;
  }

  /**
   * Set the value of the element
   * - For input/textarea/select: sets element.value
   * - For other elements: sets textContent
   */
  set value(val: unknown) {
    const el = this.resolve();
    
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
    ) {
      el.value = String(val);
    } else {
      el.textContent = String(val);
    }
  }

  // Directive methods - stubs for now, will be implemented in later tasks
  text(value: unknown | (() => unknown)): NodeRef {
    const element = this.resolve();
    
    createDirective(
      element,
      'text',
      value,
      (val) => {
        element.textContent = String(val);
      },
      // Bidirectional sync: update state when DOM changes externally
      (_mutations) => {
        // For text directive, we could sync back but typically text is one-way
        // This is here for completeness but may not be used in practice
      },
      { text: true }
    );
    
    return this;
  }

  html(value: unknown | (() => unknown)): NodeRef {
    const element = this.resolve();
    
    createDirective(
      element,
      'html',
      value,
      (val) => {
        element.innerHTML = String(val);
      }
      // No bidirectional sync for html - it's one-way only
    );
    
    return this;
  }

  show(value: boolean | (() => boolean)): NodeRef {
    const element = this.resolve();
    
    // Store the original display value
    const originalDisplay = (element as HTMLElement).style.display || '';
    
    createDirective(
      element,
      'show',
      value,
      (val) => {
        if (val) {
          // Show: restore original display or remove display property
          if (originalDisplay && originalDisplay !== 'none') {
            (element as HTMLElement).style.display = originalDisplay;
          } else {
            (element as HTMLElement).style.display = '';
          }
        } else {
          // Hide: set display to none
          (element as HTMLElement).style.display = 'none';
        }
      }
    );
    
    return this;
  }

  hide(value: boolean | (() => boolean)): NodeRef {
    const element = this.resolve();
    
    // Store the original display value
    const originalDisplay = (element as HTMLElement).style.display || '';
    
    createDirective(
      element,
      'hide',
      value,
      (val) => {
        if (val) {
          // Hide: set display to none
          (element as HTMLElement).style.display = 'none';
        } else {
          // Show: restore original display or remove display property
          if (originalDisplay && originalDisplay !== 'none') {
            (element as HTMLElement).style.display = originalDisplay;
          } else {
            (element as HTMLElement).style.display = '';
          }
        }
      }
    );
    
    return this;
  }

  if(condition: () => boolean, options?: IfOptions): NodeRef {
    const element = this.resolve();
    const parent = element.parentElement;
    
    if (!parent) {
      throw new Error('if() directive requires element to have a parent');
    }
    
    // Create placeholder comment node to mark position
    const placeholder = document.createComment('if-placeholder');
    
    // Track current state
    let currentMountedElement: Element | null = null;
    
    // Resolve template element if provided
    let sourceElement = element;
    if (options?.template) {
      const templateEl = this.rootElement.querySelector(options.template);
      if (templateEl instanceof HTMLTemplateElement) {
        // Clone template content
        const clone = templateEl.content.cloneNode(true) as DocumentFragment;
        sourceElement = clone.firstElementChild as Element;
        if (!sourceElement) {
          throw new Error(`if() directive: template has no element content (${options.template})`);
        }
      } else if (templateEl) {
        sourceElement = templateEl;
      } else {
        throw new Error(`if() directive: template element not found (${options.template})`);
      }
    }
    
    // Resolve optional elements
    const thenElement = options?.then ? this.rootElement.querySelector(options.then) : sourceElement;
    const elseElement = options?.else ? this.rootElement.querySelector(options.else) : null;
    const elseIfElements = options?.elseIf?.map(([cond, sel]) => ({
      condition: cond,
      element: this.rootElement.querySelector(sel)
    })) || [];
    
    if (!thenElement) {
      throw new Error(`if() directive: then element not found (${options?.then})`);
    }
    
    // Store reference to next sibling for proper reinsertion (unused but kept for future use)
    // const nextSibling = element.nextSibling;
    
    // Insert placeholder initially
    parent.insertBefore(placeholder, element);
    
    const mountElement = (el: Element) => {
      if (currentMountedElement === el) return; // Already mounted
      
      // Unmount current element if any
      if (currentMountedElement && currentMountedElement.parentNode) {
        currentMountedElement.remove();
        cleanupDirectives(currentMountedElement);
      }
      
      // Mount new element
      if (placeholder.parentNode) {
        placeholder.parentNode.insertBefore(el, placeholder);
      }
      currentMountedElement = el;
    };
    
    const unmountAll = () => {
      if (currentMountedElement && currentMountedElement.parentNode) {
        currentMountedElement.remove();
        cleanupDirectives(currentMountedElement);
      }
      currentMountedElement = null;
    };
    
    const update = () => {
      // Evaluate main condition
      if (condition()) {
        mountElement(thenElement);
        return;
      }
      
      // Evaluate elseIf conditions in order
      for (const { condition: elseIfCond, element: elseIfEl } of elseIfElements) {
        if (elseIfEl && elseIfCond()) {
          mountElement(elseIfEl);
          return;
        }
      }
      
      // Mount else element if provided, otherwise unmount all
      if (elseElement) {
        mountElement(elseElement);
      } else {
        unmountAll();
      }
    };
    
    const effect = createReactiveEffect(update);
    runEffect(effect);
    
    const cleanup = () => {
      // Cleanup effect
      effect.deps.forEach(dep => {
        dep.effects.delete(effect);
      });
      effect.deps.clear();
      
      // Restore element if unmounted
      if (currentMountedElement && !currentMountedElement.parentNode) {
        if (placeholder.parentNode) {
          placeholder.parentNode.insertBefore(currentMountedElement, placeholder);
        }
      }
      
      // Remove placeholder
      if (placeholder.parentNode) {
        placeholder.remove();
      }
    };
    
    const directive: Directive = {
      type: 'if',
      element,
      value: condition,
      update,
      cleanup,
      effect
    };
    
    registerDirective(element, directive);
    
    return this;
  }

  bind(attribute: string, value: unknown | (() => unknown)): NodeRef {
    const element = this.resolve();
    
    // Special handling for class binding with object
    if (attribute === 'class' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Class object binding: { 'class-name': boolean }
      const classObj = value as Record<string, boolean | (() => boolean)>;
      
      // Create a directive for each class
      Object.entries(classObj).forEach(([className, condition]) => {
        createDirective(
          element,
          'bind',
          condition,
          (shouldAdd) => {
            if (shouldAdd) {
              element.classList.add(className);
            } else {
              element.classList.remove(className);
            }
          }
        );
      });
    } else {
      // Regular attribute binding
      createDirective(
        element,
        'bind',
        value,
        (val) => {
          if (val === null || val === undefined || val === false) {
            element.removeAttribute(attribute);
          } else {
            element.setAttribute(attribute, String(val));
          }
        },
        // Bidirectional sync for attributes
        (_mutations) => {
          // Could sync back to state if needed
        },
        { attributes: true, attributeFilter: [attribute] }
      );
    }
    
    return this;
  }

  attr(name: string, value?: unknown | (() => unknown)): NodeRef | string | null {
    const element = this.resolve();
    
    // Getter: return attribute value
    if (value === undefined) {
      return element.getAttribute(name);
    }
    
    // Setter: set attribute
    createDirective(
      element,
      'attr',
      value,
      (val) => {
        if (val === null || val === undefined) {
          element.removeAttribute(name);
        } else {
          element.setAttribute(name, String(val));
        }
      },
      // Bidirectional sync for attributes
      (_mutations) => {
        // Could sync back to state if needed
      },
      { attributes: true, attributeFilter: [name] }
    );
    
    return this;
  }

  data(key: string, value?: unknown): NodeRef | string | number | null {
    const element = this.resolve();
    const attrName = `data-${key}`;
    
    // Getter: return data attribute value
    if (value === undefined) {
      const val = element.getAttribute(attrName);
      if (val === null) return null;
      const num = Number(val);
      return isNaN(num) ? val : num;
    }
    
    // Setter: handle object (batch set) or single value
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Batch setter
      const dataObj = value as Record<string, unknown>;
      Object.entries(dataObj).forEach(([k, v]) => {
        element.setAttribute(`data-${k}`, String(v));
      });
    } else {
      // Single setter
      element.setAttribute(attrName, String(value));
    }
    
    return this;
  }

  addClass(className: string | (() => string)): NodeRef {
    const element = this.resolve();
    
    createDirective(
      element,
      'class',
      className,
      (val) => {
        const classes = String(val).split(/\s+/).filter(c => c);
        classes.forEach(c => element.classList.add(c));
      }
    );
    
    return this;
  }

  removeClass(className: string): NodeRef {
    const element = this.resolve();
    const classes = className.split(/\s+/).filter(c => c);
    classes.forEach(c => element.classList.remove(c));
    return this;
  }

  toggleClass(className: string, condition: boolean | (() => boolean)): NodeRef {
    const element = this.resolve();
    
    createDirective(
      element,
      'class',
      condition,
      (shouldAdd) => {
        if (shouldAdd) {
          element.classList.add(className);
        } else {
          element.classList.remove(className);
        }
      }
    );
    
    return this;
  }

  style(styles: Record<string, string | (() => string)>): NodeRef {
    const element = this.resolve();
    
    // Helper to convert camelCase to kebab-case
    const toKebabCase = (str: string) => str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    
    // Create a directive for each style property
    Object.entries(styles).forEach(([property, value]) => {
      const cssProperty = toKebabCase(property);
      createDirective(
        element,
        'style',
        value,
        (val) => {
          (element as HTMLElement).style.setProperty(cssProperty, String(val));
        }
      );
    });
    
    return this;
  }

  focus(condition: boolean | (() => boolean)): NodeRef {
    const element = this.resolve();
    
    // Track previous condition to only focus when it becomes true
    let previousCondition = false;
    
    createDirective(
      element,
      'focus',
      condition,
      (shouldFocus) => {
        // Only call focus() when condition becomes true (not when it stays true)
        if (shouldFocus && !previousCondition) {
          (element as HTMLElement).focus();
        }
        previousCondition = Boolean(shouldFocus);
      }
    );
    
    return this;
  }

  blur(condition: boolean | (() => boolean)): NodeRef {
    const element = this.resolve();
    
    // Track previous condition to only blur when it becomes true
    let previousCondition = false;
    
    createDirective(
      element,
      'blur',
      condition,
      (shouldBlur) => {
        // Only call blur() when condition becomes true (not when it stays true)
        if (shouldBlur && !previousCondition) {
          (element as HTMLElement).blur();
        }
        previousCondition = Boolean(shouldBlur);
      }
    );
    
    return this;
  }

  scroll(condition: boolean | (() => boolean), options?: ScrollIntoViewOptions): NodeRef {
    const element = this.resolve();
    
    // Track previous condition to only scroll when it becomes true
    let previousCondition = false;
    
    createDirective(
      element,
      'scroll',
      condition,
      (shouldScroll) => {
        // Only call scrollIntoView() when condition becomes true (not when it stays true)
        if (shouldScroll && !previousCondition) {
          (element as HTMLElement).scrollIntoView(options);
        }
        previousCondition = Boolean(shouldScroll);
      }
    );
    
    return this;
  }

  for<T>(
    items: T[] | (() => T[]),
    callback: (item: T, index: number, context: ForContext) => void,
    key?: (item: T, index: number) => string | number
  ): NodeRef {
    const container = this.resolve();

    // Capture the first child element as the template, then remove it
    const templateEl = container.firstElementChild;
    let templateHTML = '';
    if (templateEl) {
      templateHTML = templateEl.outerHTML;
      templateEl.remove();
    }

    // Key function: user-provided or fallback to index
    const getKey = key || ((_item: T, index: number) => index);

    // Track rendered items by key
    const rendered = new Map<string | number, { item: T; element: Element; cleanupFns: Array<() => void> }>();

    const renderItem = (item: T, index: number, currentArray: T[]) => {
      const itemKey = getKey(item, index);

      // Clone the template
      const wrapper = document.createElement('div');
      wrapper.innerHTML = templateHTML;
      const el = wrapper.firstElementChild;
      if (!el) return;

      const itemCleanupFns: Array<() => void> = [];

      // Build a ForContext for the callback
      const forContext: ForContext = {
        ...({} as any),
        siblings: () => {
          return currentArray
            .filter((_, i) => i !== index)
            .map(sibItem => {
              const sibKey = getKey(sibItem, currentArray.indexOf(sibItem));
              const entry = rendered.get(sibKey);
              return entry ? { _el: entry.element, $: { destroy: () => {} } } : null;
            })
            .filter(Boolean) as any[];
        },
        index: () => index,
        cleanup: (fn: () => void) => { itemCleanupFns.push(fn); },
      };

      // Append the cloned element to the container
      container.appendChild(el);

      // Call the user callback so they can bind directives to the new element
      callback(item, index, forContext);

      rendered.set(itemKey, { item, element: el, cleanupFns: itemCleanupFns });
    };

    const destroyItem = (itemKey: string | number) => {
      const entry = rendered.get(itemKey);
      if (!entry) return;
      entry.cleanupFns.forEach(fn => fn());
      cleanupDirectives(entry.element);
      entry.element.remove();
      rendered.delete(itemKey);
    };

    const update = () => {
      const itemArray = typeof items === 'function' ? items() : items;
      const newKeys = new Set(itemArray.map((item, i) => getKey(item, i)));

      // 1. Remove items whose keys are no longer present
      for (const existingKey of rendered.keys()) {
        if (!newKeys.has(existingKey)) {
          destroyItem(existingKey);
        }
      }

      // 2. Add new items
      itemArray.forEach((item, index) => {
        const itemKey = getKey(item, index);
        if (!rendered.has(itemKey)) {
          renderItem(item, index, itemArray);
        }
      });

      // 3. Reorder existing DOM nodes to match array order
      itemArray.forEach((item, index) => {
        const itemKey = getKey(item, index);
        const entry = rendered.get(itemKey);
        if (entry) {
          const currentChild = container.children[index];
          if (currentChild !== entry.element) {
            container.insertBefore(entry.element, currentChild || null);
          }
        }
      });
    };

    // Create reactive effect if items is a function
    if (typeof items === 'function') {
      const effect = createReactiveEffect(update);
      runEffect(effect);

      const cleanup = () => {
        effect.deps.forEach(dep => dep.effects.delete(effect));
        effect.deps.clear();
        for (const itemKey of [...rendered.keys()]) {
          destroyItem(itemKey);
        }
      };

      registerDirective(container, {
        type: 'for',
        element: container,
        value: items,
        update,
        cleanup,
        effect,
      });
    } else {
      // Static array — render once
      update();

      registerDirective(container, {
        type: 'for',
        element: container,
        value: items,
        update: () => {},
        cleanup: () => {
          for (const itemKey of [...rendered.keys()]) {
            destroyItem(itemKey);
          }
        },
      });
    }

    return this;
  }

  template(config: TemplateConfig): NodeRef {
    const element = this.resolve();
    
    const renderTemplate = async () => {
      try {
        let htmlContent: string;
        const source = typeof config.source === 'function' ? config.source() : config.source;
        
        // Determine template source type
        if (source.startsWith('http://') || source.startsWith('https://') || source.startsWith('/')) {
          // URL fetching
          if (config.loading) {
            element.innerHTML = config.loading;
          }
          
          try {
            const response = await fetch(source);
            if (!response.ok) {
              throw new Error(`Failed to fetch template: ${response.statusText}`);
            }
            htmlContent = await response.text();
          } catch (err) {
            if (config.error) {
              element.innerHTML = config.error(err as Error);
            }
            return;
          }
        } else if (source.startsWith('<')) {
          // Template string
          htmlContent = source;
        } else {
          // Sibling template reference - search in root element
          const templateEl = this.rootElement.querySelector(`template[data-ref="${source}"]`);
          if (!templateEl || !(templateEl instanceof HTMLTemplateElement)) {
            throw new Error(`Template not found: ${source}`);
          }
          htmlContent = templateEl.innerHTML;
        }
        
        // Inject variables if provided
        if (config.vars) {
          const vars = config.vars();
          
          // Replace {{ variable }} syntax
          htmlContent = htmlContent.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, varName) => {
            return vars[varName] !== undefined ? String(vars[varName]) : '';
          });
          
          // For sibling templates, also inject into data-* attributes and textContent
          if (!source.startsWith('<') && !source.startsWith('http://') && !source.startsWith('https://') && !source.startsWith('/')) {
            // Parse HTML and inject variables
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            
            // Inject into data-* attributes
            tempDiv.querySelectorAll('[data-var]').forEach(el => {
              const varName = el.getAttribute('data-var');
              if (varName && vars[varName] !== undefined) {
                if (el instanceof HTMLElement) {
                  el.textContent = String(vars[varName]);
                }
              }
            });
            
            // Inject into elements with data-* attributes matching variable names
            Object.keys(vars).forEach(varName => {
              tempDiv.querySelectorAll(`[data-${varName}]`).forEach(el => {
                if (el instanceof HTMLElement) {
                  el.textContent = String(vars[varName]);
                }
              });
            });
            
            htmlContent = tempDiv.innerHTML;
          }
        }
        
        element.innerHTML = htmlContent;
      } catch (err) {
        if (config.error) {
          element.innerHTML = config.error(err as Error);
        } else {
          throw err;
        }
      }
    };
    
    // If source is a callback, make it reactive
    if (typeof config.source === 'function') {
      const effect = createReactiveEffect(renderTemplate);
      runEffect(effect);  // Execute effect to track dependencies
      registerDirective(element, {
        type: 'template',
        element,
        value: config.source,
        update: renderTemplate,
        cleanup: () => cleanupEffect(effect),
        effect
      });
    } else {
      // Initial render for non-reactive templates
      renderTemplate();
    }
    
    return this;
  }

  /**
   * Two-way binding between an input/textarea/select and a Ref.
   * State → DOM: updates the input value when the ref changes.
   * DOM → State: updates the ref when the user types.
   */
  model(refObj: Ref<any>): NodeRef {
    const element = this.resolve();

    if (
      !(element instanceof HTMLInputElement) &&
      !(element instanceof HTMLTextAreaElement) &&
      !(element instanceof HTMLSelectElement)
    ) {
      throw new Error('model() can only be used on input, textarea, or select elements');
    }

    const inputEl = element as HTMLInputElement;
    const isCheckboxOrRadio =
      element instanceof HTMLInputElement &&
      (inputEl.type === 'checkbox' || inputEl.type === 'radio');

    // ── Initial sync ──────────────────────────────────────────────────
    if (isCheckboxOrRadio) {
      inputEl.checked = Boolean(refObj.value);
    } else {
      inputEl.value = String(refObj.value);
    }

    // ── DOM → State ───────────────────────────────────────────────────
    const inputHandler = () => {
      if (isCheckboxOrRadio) {
        refObj.value = inputEl.checked;
      } else {
        refObj.value = inputEl.value;
      }
    };
    element.addEventListener(isCheckboxOrRadio ? 'change' : 'input', inputHandler);
    if (!isCheckboxOrRadio) {
      element.addEventListener('change', inputHandler);
    }

    // ── State → DOM (reactive) ────────────────────────────────────────
    const update = () => {
      if (isCheckboxOrRadio) {
        const checked = Boolean(refObj.value);
        if (inputEl.checked !== checked) {
          inputEl.checked = checked;
        }
      } else {
        const val = String(refObj.value);
        if (inputEl.value !== val) {
          inputEl.value = val;
        }
      }
    };

    const effect = createReactiveEffect(update);
    runEffect(effect);

    registerDirective(element, {
      type: 'model',
      element,
      value: () => refObj.value,
      update,
      cleanup: () => {
        cleanupEffect(effect);
        element.removeEventListener(isCheckboxOrRadio ? 'change' : 'input', inputHandler);
        if (!isCheckboxOrRadio) {
          element.removeEventListener('change', inputHandler);
        }
      },
      effect
    });

    return this;
  }

  /**
   * Move this element into a different DOM target.
   * A comment placeholder is left in the original position and
   * the element is restored there on cleanup.
   */
  teleport(target: string | Element): NodeRef {
    const element = this.resolve();
    const parent = element.parentElement;

    const placeholder = document.createComment('teleport-placeholder');
    if (parent) {
      parent.insertBefore(placeholder, element);
    }

    const targetEl = typeof target === 'string' ? document.querySelector(target) : target;
    if (!targetEl) {
      throw new Error(`teleport(): target not found (${target})`);
    }

    targetEl.appendChild(element);

    registerDirective(element, {
      type: 'teleport',
      element,
      value: target,
      update: () => {},
      cleanup: () => {
        if (placeholder.parentNode) {
          placeholder.parentNode.insertBefore(element, placeholder);
          placeholder.remove();
        }
      }
    });

    return this;
  }

  /**
   * Attach an event listener to the element. Returns this for chaining.
   * Supports modifiers: .prevent, .stop, .once, .self, .debounce-{ms}
   *
   * @example
   * $('#form').on('submit.prevent', handler)
   * $('#btn').on('click.stop.once', handler)
   * $('#input').on('input.debounce-300', handler)
   */
  on(event: string, handler: (e: Event) => void): NodeRef {
    const element = this.resolve();

    // Parse modifiers: "click.prevent.stop" → eventName="click", modifiers=["prevent","stop"]
    const parts = event.split('.');
    const eventName = parts[0]!;
    const modifiers = parts.slice(1);

    let wrappedHandler = handler;
    const listenerOptions: AddEventListenerOptions = {};
    let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

    const hasPrevent = modifiers.includes('prevent');
    const hasStop = modifiers.includes('stop');
    const hasSelf = modifiers.includes('self');
    const hasOnce = modifiers.includes('once');

    // Check for debounce modifier (e.g., "debounce-300")
    let debounceMs = 0;
    const debounceModifier = modifiers.find(m => m.startsWith('debounce'));
    if (debounceModifier) {
      const dParts = debounceModifier.split('-');
      debounceMs = parseInt(dParts[1] || '300', 10);
    }

    if (hasOnce) {
      listenerOptions.once = true;
    }

    if (hasPrevent || hasStop || hasSelf || debounceMs > 0) {
      wrappedHandler = (e: Event) => {
        if (hasSelf && e.target !== e.currentTarget) return;
        if (hasPrevent) e.preventDefault();
        if (hasStop) e.stopPropagation();

        if (debounceMs > 0) {
          if (debounceTimeout) clearTimeout(debounceTimeout);
          debounceTimeout = setTimeout(() => handler(e), debounceMs);
        } else {
          handler(e);
        }
      };
    }

    element.addEventListener(eventName, wrappedHandler, listenerOptions);

    registerDirective(element, {
      type: 'bind',
      element,
      value: handler,
      update: () => {},
      cleanup: () => {
        element.removeEventListener(eventName, wrappedHandler, listenerOptions);
        if (debounceTimeout) clearTimeout(debounceTimeout);
      },
    });

    return this;
  }

  /**
   * Remove an event listener from the element. Returns this for chaining.
   */
  off(event: string, handler: (e: Event) => void): NodeRef {
    const element = this.resolve();
    const eventName = event.split('.')[0]!;
    element.removeEventListener(eventName, handler);
    return this;
  }

  /**
   * Check if attribute exists or has specific value
   * - has('disabled') - returns true if attribute exists
   * - has('class', 'active') - returns true if class is present
   * - has('data-id', '123') - returns true if data-id equals '123'
   */
  has(attribute: string, value?: unknown): boolean {
    const element = this.resolve();
    
    // Special handling for class attribute
    if (attribute === 'class' && value !== undefined) {
      return element.classList.contains(String(value));
    }
    
    // Check if attribute exists
    if (!element.hasAttribute(attribute)) {
      return false;
    }
    
    // If value is provided, check if it matches
    if (value !== undefined) {
      const attrValue = element.getAttribute(attribute);
      return attrValue === String(value);
    }
    
    // Just checking existence
    return true;
  }
  
  /**
   * Execute callback when condition is true
   * Re-evaluates when dependencies change
   */
  when(condition: () => boolean, callback: (element: Element) => void): NodeRef {
    const element = this.resolve();
    
    const update = () => {
      if (condition()) {
        callback(element);
      }
    };
    
    const effect = createReactiveEffect(update);
    runEffect(effect);
    
    registerDirective(element, {
      type: 'when',
      element,
      value: condition,
      update,
      cleanup: () => cleanupEffect(effect),
      effect
    });
    
    return this;
  }
}
