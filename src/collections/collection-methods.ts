/**
 * Array utility methods (where, sortBy, first, last, pluck, etc.)
 * 
 * Provides collection methods on Proxy_Instance arrays via array.$
 */

import { injectCollectionMacros } from '../core/macro';

export interface CollectionMethods<T> {
  // Query methods
  where(predicate: (item: T) => boolean): T[];
  find(predicate: (item: T) => boolean): T | undefined;
  some(predicate: (item: T) => boolean): boolean;
  every(predicate: (item: T) => boolean): boolean;
  none(predicate: (item: T) => boolean): boolean;
  has(property: string, value?: any): boolean;
  
  // Transformation methods
  sortBy(property: string): T[];
  pluck(property: string): any[];
  unique(property?: string): T[];
  chunk(size: number): T[][];
  shuffle(): T[];
  groupBy(property: string): Record<string, T[]>;
  
  // Aggregation methods
  sum(property: string): number;
  min(property: string): number;
  max(property: string): number;
  count(): number;
  
  // Navigation methods
  first(): T | undefined;
  last(): T | undefined;
  paginate(page: number, options?: { perPage?: number }): {
    data: T[];
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export function createCollectionMethods<T>(items: T[]): CollectionMethods<T> {
  return {
    // Query methods
    where(predicate: (item: T) => boolean): T[] {
      return items.filter(predicate);
    },
    
    find(predicate: (item: T) => boolean): T | undefined {
      return items.find(predicate);
    },
    
    some(predicate: (item: T) => boolean): boolean {
      return items.some(predicate);
    },
    
    every(predicate: (item: T) => boolean): boolean {
      return items.every(predicate);
    },
    
    none(predicate: (item: T) => boolean): boolean {
      return !items.some(predicate);
    },
    
    has(property: string, value?: any): boolean {
      return items.some(item => {
        const itemValue = (item as any)[property];
        return value === undefined ? itemValue !== undefined : itemValue === value;
      });
    },
    
    // Transformation methods
    sortBy(property: string): T[] {
      return [...items].sort((a, b) => {
        const aVal = (a as any)[property];
        const bVal = (b as any)[property];
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
      });
    },
    
    pluck(property: string): any[] {
      return items.map(item => (item as any)[property]);
    },
    
    unique(property?: string): T[] {
      if (property) {
        const seen = new Set();
        return items.filter(item => {
          const value = (item as any)[property];
          if (seen.has(value)) {
            return false;
          }
          seen.add(value);
          return true;
        });
      } else {
        // Deduplicate by reference
        return [...new Set(items)];
      }
    },
    
    chunk(size: number): T[][] {
      const chunks: T[][] = [];
      for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
      }
      return chunks;
    },
    
    shuffle(): T[] {
      const shuffled = [...items];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffled[i];
        shuffled[i] = shuffled[j]!;
        shuffled[j] = temp!;
      }
      return shuffled;
    },
    
    groupBy(property: string): Record<string, T[]> {
      const groups: Record<string, T[]> = {};
      for (const item of items) {
        const key = String((item as any)[property]);
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key]!.push(item);
      }
      return groups;
    },
    
    // Aggregation methods
    sum(property: string): number {
      return items.reduce((sum, item) => {
        const value = (item as any)[property];
        return sum + (typeof value === 'number' ? value : 0);
      }, 0);
    },
    
    min(property: string): number {
      const values = items.map(item => (item as any)[property]).filter(v => typeof v === 'number');
      return values.length > 0 ? Math.min(...values) : 0;
    },
    
    max(property: string): number {
      const values = items.map(item => (item as any)[property]).filter(v => typeof v === 'number');
      return values.length > 0 ? Math.max(...values) : 0;
    },
    
    count(): number {
      return items.length;
    },
    
    // Navigation methods
    first(): T | undefined {
      return items[0];
    },
    
    last(): T | undefined {
      return items[items.length - 1];
    },
    
    paginate(page: number, options?: { perPage?: number }) {
      const perPage = options?.perPage || 10;
      const total = items.length;
      const totalPages = Math.ceil(total / perPage);
      const start = (page - 1) * perPage;
      const end = start + perPage;
      const data = items.slice(start, end);
      
      return {
        data,
        page,
        perPage,
        total,
        totalPages
      };
    }
  };
}

/**
 * Create a collection accessor with injected macros
 * 
 * This function creates the .$ accessor for ProxyCollection instances,
 * providing both standard collection methods and any registered macros.
 * 
 * @param collection - The ProxyCollection instance (array)
 * @param instanceState - The weave instance state (for local macro lookup)
 * @returns The collection accessor with methods and macros
 * 
 * @internal
 */
export function createCollectionAccessor<T>(
  collection: T[],
  instanceState?: any
): CollectionMethods<T> {
  // Create the base collection methods
  const accessor = createCollectionMethods(collection);
  
  // Inject collection macros if instanceState is available
  if (instanceState) {
    return injectCollectionMacros(accessor, collection, instanceState);
  }
  
  return accessor;
}
