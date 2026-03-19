import { describe, expect, it, vi } from 'vitest';
import { ref } from './ref';
import { effect } from './effect';

describe('effect()', () => {
  it('runs immediately', () => {
    const fn = vi.fn();
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('re-runs when dependencies change', () => {
    const count = ref(0);
    const values: number[] = [];

    effect(() => {
      values.push(count.value);
    });

    expect(values).toEqual([0]);

    count.value = 1;
    expect(values).toEqual([0, 1]);

    count.value = 2;
    expect(values).toEqual([0, 1, 2]);
  });

  it('returns a stop function', () => {
    const count = ref(0);
    const values: number[] = [];

    const stop = effect(() => {
      values.push(count.value);
    });

    count.value = 1;
    expect(values).toEqual([0, 1]);

    stop();

    count.value = 2;
    expect(values).toEqual([0, 1]); // no more tracking
  });

  it('calls user cleanup on re-run', () => {
    const count = ref(0);
    const cleanupFn = vi.fn();

    effect(() => {
      count.value; // track dependency
      return cleanupFn;
    });

    expect(cleanupFn).not.toHaveBeenCalled();

    count.value = 1;
    expect(cleanupFn).toHaveBeenCalledTimes(1);
  });

  it('calls user cleanup on stop', () => {
    const cleanupFn = vi.fn();

    const stop = effect(() => {
      return cleanupFn;
    });

    stop();
    expect(cleanupFn).toHaveBeenCalledTimes(1);
  });

  it('tracks multiple dependencies', () => {
    const a = ref(1);
    const b = ref(2);
    const values: number[] = [];

    effect(() => {
      values.push(a.value + b.value);
    });

    expect(values).toEqual([3]);

    a.value = 10;
    expect(values).toEqual([3, 12]);

    b.value = 20;
    expect(values).toEqual([3, 12, 30]);
  });
});
