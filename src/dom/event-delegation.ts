/**
 * Event handling with delegation
 */

export type EventHandler = (event: Event) => void;
export type Unlisten = () => void;

/**
 * Represents a delegated event listener
 */
interface DelegatedListener {
  event: string;
  selector: string | Document | Window;
  handler: EventHandler;
  delegatedHandler: EventHandler;
  target: EventTarget;
}

/**
 * Event delegator for a specific root element
 */
export class EventDelegator {
  private rootElement: Element;
  private listeners: DelegatedListener[] = [];

  constructor(rootElement: Element) {
    this.rootElement = rootElement;
  }

  /**
   * Register a delegated event listener
   * 
   * @param event - Event name (e.g., 'click', 'input')
   * @param selector - CSS selector, document, or window
   * @param handler - Event handler function
   * @returns Unlisten function to remove the listener
   */
  on(event: string, selector: string | Document | Window, handler: EventHandler): Unlisten {
    let target: EventTarget;
    let delegatedHandler: EventHandler;

    // Handle document and window as special cases
    if (selector === document || selector === window) {
      target = selector;
      delegatedHandler = handler;
    } else {
      // Regular selector-based delegation on root element
      target = this.rootElement;
      delegatedHandler = (e: Event) => {
        // Check if event target matches selector
        const targetEl = e.target as Element;
        if (targetEl && targetEl.matches && targetEl.matches(selector as string)) {
          handler(e);
        } else {
          // Check if any parent matches (event bubbling)
          let current = targetEl;
          while (current && current !== this.rootElement) {
            if (current.matches && current.matches(selector as string)) {
              handler(e);
              break;
            }
            current = current.parentElement as Element;
          }
        }
      };
    }

    // Add event listener
    target.addEventListener(event, delegatedHandler);

    // Store listener info
    const listener: DelegatedListener = {
      event,
      selector,
      handler,
      delegatedHandler,
      target
    };
    this.listeners.push(listener);

    // Return unlisten function
    return () => {
      this.removeListener(listener);
    };
  }

  /**
   * Remove specific event listener(s)
   * 
   * @param event - Optional event name
   * @param selector - Optional selector
   * @param handler - Optional handler function
   */
  off(event?: string, selector?: string | Document | Window, handler?: EventHandler): void {
    // Remove all listeners if no arguments
    if (!event && !selector && !handler) {
      this.removeAllListeners();
      return;
    }

    // Filter listeners to remove
    const listenersToRemove = this.listeners.filter(listener => {
      if (event && listener.event !== event) return false;
      if (selector && listener.selector !== selector) return false;
      if (handler && listener.handler !== handler) return false;
      return true;
    });

    // Remove each matching listener
    listenersToRemove.forEach(listener => {
      this.removeListener(listener);
    });
  }

  /**
   * Remove a specific listener
   */
  private removeListener(listener: DelegatedListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      listener.target.removeEventListener(listener.event, listener.delegatedHandler);
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Remove all listeners
   */
  private removeAllListeners(): void {
    this.listeners.forEach(listener => {
      listener.target.removeEventListener(listener.event, listener.delegatedHandler);
    });
    this.listeners = [];
  }

  /**
   * Cleanup all listeners (called on destruction)
   */
  destroy(): void {
    this.removeAllListeners();
  }
}

/**
 * Create an event delegator for a root element
 */
export function createEventDelegator(rootElement: Element): EventDelegator {
  return new EventDelegator(rootElement);
}
