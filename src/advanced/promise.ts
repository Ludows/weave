/**
 * promise() fetch integration with reactive refs
 */

import { createReactiveEffect, runEffect } from '../core/dependency-tracker';
import { ref } from '../reactive/ref';
import type { PromiseOptions, PromiseResult } from '../types';

/**
 * Fetch a resource and expose reactive loading/data/error refs.
 *
 * @example
 * // Auto-starts immediately
 * const { data, loading, error, refetch } = promise('/api/users')
 *
 * @example
 * // Lazy — only runs when refetch() is called
 * const { data, loading, refetch } = promise('/api/users', { enabled: false })
 *
 * @example
 * // Reactive URL — re-fetches when the getter's deps change
 * const { data } = promise(() => `/api/users/${userId.value}`, { watch: true })
 */
export function promise<T = unknown>(
  url: string | (() => string),
  options?: PromiseOptions<T>
): PromiseResult<T> {
  const data = ref<T | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  let currentController: AbortController | null = null;
  let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

  const isEnabled = (): boolean => {
    if (options?.enabled === undefined) return true;
    if (typeof options.enabled === 'function') return options.enabled();
    return options.enabled;
  };

  const execute = (): void => {
    if (currentController) {
      currentController.abort();
    }

    currentController = new AbortController();
    const resolvedUrl = typeof url === 'function' ? url() : url;

    loading.value = true;
    error.value = null;

    if (options?.onStart) options.onStart();

    fetch(resolvedUrl, { signal: currentController.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json() as Promise<T>;
      })
      .then(result => {
        data.value = result;
        if (options?.onSuccess) options.onSuccess(result);
      })
      .catch(err => {
        if ((err as Error).name === 'AbortError') return;
        error.value = err as Error;
        if (options?.onError) options.onError(err as Error);
      })
      .finally(() => {
        loading.value = false;
        currentController = null;
        if (options?.onFinally) options.onFinally();
      });
  };

  const refetch = (): void => execute();

  const abort = (): void => {
    if (currentController) currentController.abort();
    if (debounceTimeout) clearTimeout(debounceTimeout);
  };

  if (options?.watch && typeof url === 'function') {
    const urlFn = url;
    const effect = createReactiveEffect(() => {
      // Track URL reactive deps and enabled getter
      urlFn();
      if (typeof options.enabled === 'function') options.enabled();

      if (!isEnabled()) return;

      if (options.debounce && options.debounce > 0) {
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(execute, options.debounce);
      } else {
        execute();
      }
    });
    runEffect(effect);
  } else if (isEnabled()) {
    execute();
  }

  return { data, loading, error, refetch, abort };
}
