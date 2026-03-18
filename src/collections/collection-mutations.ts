/**
 * Array mutation methods
 * 
 * Provides mutation methods on Proxy_Instance arrays via array.$
 * These methods modify both DOM and state synchronously.
 */

export interface CollectionMutations<T> {
  push(html: string): void;
  remove(predicate: (item: T) => boolean): void;
  clear(): void;
}

export function createCollectionMutations<T>(
  items: T[],
  container: Element,
  createInstance: (element: Element) => T,
  destroyInstance: (item: T) => void
): CollectionMutations<T> {
  return {
    /**
     * Insert element in DOM and create Proxy_Instance
     */
    push(html: string): void {
      // Create element from HTML string
      const temp = document.createElement('div');
      temp.innerHTML = html.trim();
      const element = temp.firstElementChild;
      
      if (!element) {
        throw new Error('push(): invalid HTML string');
      }
      
      // Insert element in DOM
      container.appendChild(element);
      
      // Create Proxy_Instance for new element
      const instance = createInstance(element);
      items.push(instance);
    },
    
    /**
     * Remove matching elements from DOM and destroy their Proxy_Instances
     */
    remove(predicate: (item: T) => boolean): void {
      // Find matching items
      const toRemove: T[] = [];
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        if (item && predicate(item)) {
          toRemove.push(item);
          items.splice(i, 1);
        }
      }
      
      // Remove from DOM and destroy Proxy_Instances
      for (const item of toRemove) {
        destroyInstance(item);
      }
    },
    
    /**
     * Remove all elements from DOM and destroy all Proxy_Instances
     */
    clear(): void {
      // Destroy all Proxy_Instances
      for (const item of items) {
        destroyInstance(item);
      }
      
      // Clear array
      items.length = 0;
      
      // Clear DOM
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    }
  };
}
