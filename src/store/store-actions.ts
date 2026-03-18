/**
 * Action system helpers
 * 
 * Provides utilities for creating reusable action patterns
 */

import type { ActionContext } from '../types';

/**
 * Create an async action with loading state management
 * 
 * @example
 * ```ts
 * action('fetchProducts', asyncAction(
 *   async (state, query) => {
 *     const response = await fetch(`/api/products?q=${query}`);
 *     return response.json();
 *   },
 *   {
 *     onStart: (state) => { state.isLoading = true; state.error = null; },
 *     onSuccess: (state, data) => { state.products = data; },
 *     onError: (state, error) => { state.error = error.message; },
 *     onFinally: (state) => { state.isLoading = false; }
 *   }
 * ));
 * ```
 */
export function asyncAction<S extends object, P, R>(
  asyncFn: (state: S, payload: P, context: ActionContext) => Promise<R>,
  hooks?: {
    onStart?: (state: S, payload: P) => void;
    onSuccess?: (state: S, result: R, payload: P) => void;
    onError?: (state: S, error: Error, payload: P) => void;
    onFinally?: (state: S, payload: P) => void;
  }
) {
  return async (state: S, payload: P, context: ActionContext): Promise<R | undefined> => {
    try {
      hooks?.onStart?.(state, payload);
      const result = await asyncFn(state, payload, context);
      hooks?.onSuccess?.(state, result, payload);
      return result;
    } catch (error) {
      hooks?.onError?.(state, error as Error, payload);
      return undefined;
    } finally {
      hooks?.onFinally?.(state, payload);
    }
  };
}

/**
 * Create an action that calls multiple other actions in sequence
 * 
 * @example
 * ```ts
 * action('resetAll', composeActions(['clearCart', 'clearFilters', 'resetPagination']));
 * ```
 */
export function composeActions(actionNames: string[]) {
  return async (_state: any, payload: any, context: ActionContext) => {
    for (const actionName of actionNames) {
      await context.call(actionName, payload);
    }
  };
}

/**
 * Create an action that calls multiple other actions in parallel
 * 
 * @example
 * ```ts
 * action('loadAll', parallelActions(['fetchProducts', 'fetchCategories', 'fetchUser']));
 * ```
 */
export function parallelActions(actionNames: string[]) {
  return async (_state: any, payload: any, context: ActionContext) => {
    await Promise.all(
      actionNames.map(actionName => context.call(actionName, payload))
    );
  };
}

/**
 * Create an action with retry logic
 * 
 * @example
 * ```ts
 * action('fetchWithRetry', retryAction(
 *   async (state, url) => {
 *     const response = await fetch(url);
 *     if (!response.ok) throw new Error('Failed');
 *     return response.json();
 *   },
 *   { maxRetries: 3, delay: 1000 }
 * ));
 * ```
 */
export function retryAction<S extends object, P, R>(
  asyncFn: (state: S, payload: P, context: ActionContext) => Promise<R>,
  options: {
    maxRetries?: number;
    delay?: number;
    onRetry?: (state: S, attempt: number, error: Error) => void;
  } = {}
) {
  const { maxRetries = 3, delay = 1000, onRetry } = options;

  return async (state: S, payload: P, context: ActionContext): Promise<R> => {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await asyncFn(state, payload, context);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          onRetry?.(state, attempt + 1, lastError);
          await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
        }
      }
    }

    throw lastError;
  };
}

/**
 * Create an action with debouncing
 * 
 * @example
 * ```ts
 * action('search', debounceAction(
 *   async (state, query) => {
 *     state.results = await fetch(`/api/search?q=${query}`).then(r => r.json());
 *   },
 *   300
 * ));
 * ```
 */
export function debounceAction<S extends object, P>(
  actionFn: (state: S, payload: P, context: ActionContext) => void | Promise<void>,
  delay: number
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (state: S, payload: P, context: ActionContext) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return new Promise<void>((resolve) => {
      timeoutId = setTimeout(async () => {
        await actionFn(state, payload, context);
        resolve();
      }, delay);
    });
  };
}

/**
 * Create an action with throttling
 * 
 * @example
 * ```ts
 * action('trackScroll', throttleAction(
 *   (state, position) => {
 *     state.scrollPosition = position;
 *   },
 *   100
 * ));
 * ```
 */
export function throttleAction<S extends object, P>(
  actionFn: (state: S, payload: P, context: ActionContext) => void | Promise<void>,
  delay: number
) {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return async (state: S, payload: P, context: ActionContext) => {
    const now = Date.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      await actionFn(state, payload, context);
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(async () => {
        lastCall = Date.now();
        await actionFn(state, payload, context);
      }, delay - (now - lastCall));
    }
  };
}

