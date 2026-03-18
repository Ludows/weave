import { describe, expect, it, vi } from 'vitest';
import { nextTick } from './next-tick';

describe('nextTick()', () => {
  it('returns a Promise', () => {
    expect(nextTick()).toBeInstanceOf(Promise);
  });

  it('resolves after current microtask queue', async () => {
    let order: number[] = [];

    order.push(1);
    const p = nextTick(() => order.push(3));
    order.push(2);

    await p;

    expect(order).toEqual([1, 2, 3]);
  });

  it('executes the callback when resolved', async () => {
    const fn = vi.fn();
    await nextTick(fn);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('works without a callback', async () => {
    await expect(nextTick()).resolves.toBeUndefined();
  });

  it('can be awaited multiple times sequentially', async () => {
    const results: number[] = [];
    await nextTick(() => results.push(1));
    await nextTick(() => results.push(2));
    await nextTick(() => results.push(3));
    expect(results).toEqual([1, 2, 3]);
  });

  it('allows reading state after a synchronous ref change', async () => {
    let value = 0;

    // Simulate a synchronous change
    value = 42;

    let seenValue = -1;
    await nextTick(() => {
      seenValue = value;
    });

    expect(seenValue).toBe(42);
  });
});
