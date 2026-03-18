/**
 * All directive implementations (text, html, show, hide, if, bind, etc.)
 */

import { createReactiveEffect, runEffect, type ReactiveEffect } from '../core/dependency-tracker';
import { createAttributeObserver, createTextObserver, setInternalUpdate } from './mutation-observer';

/**
 * Directive type enumeration
 */
export type DirectiveType =
  | 'text'
  | 'html'
  | 'show'
  | 'hide'
  | 'if'
  | 'bind'
  | 'attr'
  | 'class'
  | 'style'
  | 'focus'
  | 'blur'
  | 'scroll'
  | 'template';

/**
 * Represents a directive binding
 */
export interface Directive {
  type: DirectiveType;
  element: Element;
  value: unknown | (() => unknown);
  update: () => void;
  cleanup: () => void;
  effect?: ReactiveEffect;
  observer?: MutationObserver;
}

/**
 * Registry to track directives per element
 */
const directiveRegistry = new WeakMap<Element, Directive[]>();

/**
 * Register a directive for an element
 */
export function registerDirective(element: Element, directive: Directive): void {
  let directives = directiveRegistry.get(element);
  if (!directives) {
    directives = [];
    directiveRegistry.set(element, directives);
  }
  directives.push(directive);
}

/**
 * Get all directives for an element
 */
export function getDirectives(element: Element): Directive[] {
  return directiveRegistry.get(element) || [];
}

/**
 * Cleanup all directives for an element
 */
export function cleanupDirectives(element: Element): void {
  const directives = directiveRegistry.get(element);
  if (directives) {
    directives.forEach(directive => directive.cleanup());
    directiveRegistry.delete(element);
  }
}

/**
 * Create a reactive directive with automatic dependency tracking
 * 
 * @param element - The DOM element to bind to
 * @param type - The directive type
 * @param value - Static value or callback function
 * @param updateFn - Function to update the DOM
 * @param syncFn - Optional function to sync state from DOM changes
 * @param observerConfig - Optional observer configuration for bidirectional sync
 * @returns The created directive
 */
export function createDirective(
  element: Element,
  type: DirectiveType,
  value: unknown | (() => unknown),
  updateFn: (val: unknown) => void,
  syncFn?: (mutations: MutationRecord[]) => void,
  observerConfig?: { attributes?: boolean; attributeFilter?: string[]; text?: boolean }
): Directive {
  let effect: ReactiveEffect | undefined;
  let observer: MutationObserver | undefined;

  // Create the update function
  const update = () => {
    const val = typeof value === 'function' ? value() : value;
    
    // Set internal update flag to prevent observer from triggering
    setInternalUpdate(true);
    try {
      updateFn(val);
    } finally {
      setInternalUpdate(false);
    }
  };

  // If value is a callback, create a reactive effect
  if (typeof value === 'function') {
    effect = createReactiveEffect(update);
    runEffect(effect);
  } else {
    // Static value, just update once
    update();
  }

  // Setup bidirectional sync if syncFn is provided
  if (syncFn) {
    if (observerConfig?.text) {
      observer = createTextObserver(element, syncFn);
    } else if (observerConfig?.attributes) {
      observer = createAttributeObserver(
        element,
        syncFn,
        observerConfig.attributeFilter
      );
    }
  }

  // Create cleanup function
  const cleanup = () => {
    if (effect) {
      // Cleanup effect dependencies
      effect.deps.forEach(dep => {
        dep.effects.delete(effect!);
      });
      effect.deps.clear();
    }
    if (observer) {
      observer.disconnect();
    }
  };

  const directive: Directive = {
    type,
    element,
    value,
    update,
    cleanup,
    effect,
    observer
  };

  registerDirective(element, directive);
  return directive;
}
