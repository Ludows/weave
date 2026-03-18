/**
 * nextTick - Execute a callback after the current reactive cycle
 *
 * Waits for pending microtasks (reactive effects) to complete before
 * running the callback. Useful for reading updated DOM state after
 * a reactive change.
 *
 * @example
 * ```ts
 * const count = ref(0);
 * count.value++;
 * await nextTick();
 * // DOM is now updated
 * ```
 */
export function nextTick(fn?: () => void): Promise<void> {
  return Promise.resolve().then(() => {
    fn?.();
  });
}
