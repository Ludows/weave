/**
 * NodeRef class and $ selector implementation
 */

import { cleanupEffect, createReactiveEffect, runEffect } from '../core/dependency-tracker';
import type { ForContext, NodeRef as INodeRef, IfOptions, TemplateConfig } from '../types';
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

  for<T>(items: T[] | (() => T[]), callback: (item: T, index: number, context: ForContext) => void): NodeRef {
    const container = this.resolve();
    
    // Map to track item proxies
    const itemProxies = new Map<T, any>();
    
    // Shared MutationObserver for the container
    const containerObserver = new MutationObserver((mutations) => {
      // Detect external DOM removals
      for (const mutation of mutations) {
        for (const removed of mutation.removedNodes) {
          // Find and destroy proxy for removed element
          for (const [item, proxy] of itemProxies.entries()) {
            if (proxy._el === removed) {
              // Destroy proxy instance
              if (proxy.$ && proxy.$.destroy) {
                proxy.$.destroy();
              }
              itemProxies.delete(item);
              break;
            }
          }
        }
      }
    });
    
    // Observe container for child removals
    containerObserver.observe(container, { childList: true });
    
    const update = () => {
      const itemArray = typeof items === 'function' ? items() : items;
      const existingItems = new Set(itemProxies.keys());
      
      // Remove items no longer in array
      for (const item of existingItems) {
        if (!itemArray.includes(item)) {
          const proxy = itemProxies.get(item);
          if (proxy && proxy.$ && proxy.$.destroy) {
            proxy.$.destroy();
          }
          itemProxies.delete(item);
        }
      }
      
      // Add or update items
      itemArray.forEach((item, index) => {
        if (!itemProxies.has(item)) {
          // Create new element for item
          const itemElement = container.children[index] as Element;
          
          if (itemElement) {
            // Create a ForContext with siblings() and index() helpers
            const forContext: ForContext = {
              ...({} as any), // Placeholder for full CallbackContext
              siblings: () => {
                return Array.from(itemProxies.values()).filter(p => p !== itemProxies.get(item));
              },
              index: () => {
                return itemArray.indexOf(item);
              }
            };
            
            // Call the callback with item, index, and context
            // Note: This is a simplified version. Full implementation would create
            // a proper Proxy_Instance using weave() for each item
            callback(item, index, forContext);
            
            // Store a placeholder proxy (full implementation would use weave())
            itemProxies.set(item, { _el: itemElement, $: { destroy: () => {} } });
          }
        }
      });
    };
    
    // Create reactive effect if items is a callback
    if (typeof items === 'function') {
      const effect = createReactiveEffect(update);
      runEffect(effect);
      
      const cleanup = () => {
        effect.deps.forEach(dep => {
          dep.effects.delete(effect);
        });
        effect.deps.clear();
        containerObserver.disconnect();
        
        // Destroy all item proxies
        for (const proxy of itemProxies.values()) {
          if (proxy.$ && proxy.$.destroy) {
            proxy.$.destroy();
          }
        }
        itemProxies.clear();
      };
      
      const directive: Directive = {
        type: 'if', // Using 'if' as placeholder since 'for' is not in DirectiveType yet
        element: container,
        value: items,
        update,
        cleanup,
        effect
      };
      
      registerDirective(container, directive);
    } else {
      // Static array, just render once
      update();
      
      // Register cleanup for static case
      const cleanup = () => {
        containerObserver.disconnect();
        for (const proxy of itemProxies.values()) {
          if (proxy.$ && proxy.$.destroy) {
            proxy.$.destroy();
          }
        }
        itemProxies.clear();
      };
      
      const directive: Directive = {
        type: 'if', // Using 'if' as placeholder
        element: container,
        value: items,
        update: () => {},
        cleanup,
      };
      
      registerDirective(container, directive);
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
