/**
 * Surgical observer system for DOM change detection
 */

/**
 * Configuration for creating a MutationObserver
 */
export interface ObserverConfig {
  attributes?: boolean;
  attributeFilter?: string[];
  childList?: boolean;
  characterData?: boolean;
  subtree?: boolean;
}

/**
 * Callback type for mutation observers
 */
export type MutationCallback = (mutations: MutationRecord[]) => void;

/**
 * Flag to prevent infinite loops during internal DOM updates
 */
let internalUpdate = false;

/**
 * Set the internal update flag
 */
export function setInternalUpdate(value: boolean): void {
  internalUpdate = value;
}

/**
 * Check if we're in an internal update
 */
export function isInternalUpdate(): boolean {
  return internalUpdate;
}

/**
 * Create a surgical MutationObserver for targeted DOM observation
 * 
 * This creates observers that watch specific nodes with specific configurations,
 * not entire subtrees, for better performance.
 * 
 * @param element - The element to observe
 * @param callback - Function to call when mutations occur
 * @param config - Observer configuration
 * @returns The created MutationObserver instance
 */
export function createMutationObserver(
  element: Element,
  callback: MutationCallback,
  config: ObserverConfig = {}
): MutationObserver {
  const observer = new MutationObserver((mutations) => {
    // Skip if this is an internal update to prevent infinite loops
    if (internalUpdate) {
      return;
    }
    
    callback(mutations);
  });

  observer.observe(element, config);
  return observer;
}

/**
 * Create a container observer for list rendering (for() directive)
 * This watches for child additions/removals in a container
 * 
 * @param container - The container element to observe
 * @param callback - Function to call when child list changes
 * @returns The created MutationObserver instance
 */
export function createContainerObserver(
  container: Element,
  callback: MutationCallback
): MutationObserver {
  return createMutationObserver(container, callback, {
    childList: true,
    subtree: false
  });
}

/**
 * Create an attribute observer for a specific element
 * Optionally filter to specific attributes for better performance
 * 
 * @param element - The element to observe
 * @param callback - Function to call when attributes change
 * @param attributeFilter - Optional array of attribute names to watch
 * @returns The created MutationObserver instance
 */
export function createAttributeObserver(
  element: Element,
  callback: MutationCallback,
  attributeFilter?: string[]
): MutationObserver {
  const config: ObserverConfig = {
    attributes: true,
    subtree: false
  };

  if (attributeFilter && attributeFilter.length > 0) {
    config.attributeFilter = attributeFilter;
  }

  return createMutationObserver(element, callback, config);
}

/**
 * Create a text content observer for an element
 * 
 * @param element - The element to observe
 * @param callback - Function to call when text content changes
 * @returns The created MutationObserver instance
 */
export function createTextObserver(
  element: Element,
  callback: MutationCallback
): MutationObserver {
  return createMutationObserver(element, callback, {
    characterData: true,
    childList: true,
    subtree: true
  });
}

/**
 * Cleanup helper to disconnect an observer
 * 
 * @param observer - The observer to disconnect
 */
export function disconnectObserver(observer: MutationObserver | null | undefined): void {
  if (observer) {
    observer.disconnect();
  }
}
