/**
 * promise() fetch integration
 */

import { createReactiveEffect, runEffect } from '../core/dependency-tracker';
import type { PromiseOptions, PromiseResult } from '../types';

// Track all active promises for cleanup
const activePromises = new WeakMap<any, Set<AbortController>>();

/**
 * Fetch a resource with reactive integration
 */
export function promise<T = any>(
  url: string | (() => string),
  options?: PromiseOptions<T>
): PromiseResult<T> {
  const controller = new AbortController();
  const fetchOptions = { signal: controller.signal };
  
  // Resolve URL
  const resolvedUrl = typeof url === 'function' ? url() : url;
  
  // Call onStart if provided
  if (options?.onStart) {
    options.onStart();
  }
  
  // Perform fetch
  const dataPromise = fetch(resolvedUrl, fetchOptions)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json() as Promise<T>;
    })
    .then(data => {
      // Call onSuccess if provided
      if (options?.onSuccess) {
        options.onSuccess(data);
      }
      return data;
    })
    .catch(error => {
      // Don't call onError for aborted requests
      if (error.name === 'AbortError') {
        throw error;
      }
      
      // Call onError if provided
      if (options?.onError) {
        options.onError(error);
      }
      throw error;
    })
    .finally(() => {
      // Call onFinally if provided
      if (options?.onFinally) {
        options.onFinally();
      }
    });
  
  return {
    data: dataPromise,
    abort: () => controller.abort()
  };
}

/**
 * Create a reactive promise that re-fetches when dependencies change
 */
export function promiseWithWatch<T = any>(
  url: () => string,
  options?: PromiseOptions<T> & { watch?: boolean; debounce?: number },
  instanceContext?: any
): PromiseResult<T> {
  let currentAbort: (() => void) | null = null;
  let currentPromise: Promise<T> | null = null;
  let debounceTimeout: NodeJS.Timeout | null = null;
  
  const performFetch = () => {
    // Abort previous request if exists
    if (currentAbort) {
      currentAbort();
    }
    
    // Create new fetch
    const result = promise<T>(url, options);
    currentAbort = result.abort;
    currentPromise = result.data;
    
    return result;
  };
  
  // If watch is enabled, create reactive effect
  if (options?.watch) {
    const effect = createReactiveEffect(() => {
      // Track URL dependencies
      url();
      
      const executeFetch = () => {
        performFetch();
      };
      
      // Apply debouncing if specified
      if (options.debounce && options.debounce > 0) {
        if (debounceTimeout) {
          clearTimeout(debounceTimeout);
        }
        debounceTimeout = setTimeout(executeFetch, options.debounce);
      } else {
        executeFetch();
      }
    });
    
    // Initial execution
    runEffect(effect);
  }
  
  // Initial fetch if not watching
  if (!options?.watch) {
    return performFetch();
  }
  
  return {
    data: currentPromise!,
    abort: () => {
      if (currentAbort) {
        currentAbort();
      }
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    }
  };
}

/**
 * Abort all pending promises for an instance
 */
export function abortAllPromises(instanceContext: any): void {
  const controllers = activePromises.get(instanceContext);
  if (controllers) {
    controllers.forEach(controller => controller.abort());
    controllers.clear();
  }
}
