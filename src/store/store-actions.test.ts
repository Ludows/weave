/**
 * Tests for store action helpers
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asyncAction, composeActions, debounceAction, parallelActions, retryAction, throttleAction } from './store-actions';

describe('asyncAction', () => {
  it('should execute async action with success hooks', async () => {
    const state = { data: null, isLoading: false, error: null };
    const onStart = vi.fn();
    const onSuccess = vi.fn();
    const onFinally = vi.fn();

    const action = asyncAction(
      async (s, payload) => {
        return { result: payload };
      },
      { onStart, onSuccess, onFinally }
    );

    const context = { call: vi.fn() };
    await action(state, 'test', context);

    expect(onStart).toHaveBeenCalledWith(state, 'test');
    expect(onSuccess).toHaveBeenCalledWith(state, { result: 'test' }, 'test');
    expect(onFinally).toHaveBeenCalledWith(state, 'test');
  });

  it('should handle errors with onError hook', async () => {
    const state = { data: null, isLoading: false, error: null };
    const onError = vi.fn();
    const onFinally = vi.fn();

    const action = asyncAction(
      async () => {
        throw new Error('Test error');
      },
      { onError, onFinally }
    );

    const context = { call: vi.fn() };
    const result = await action(state, 'test', context);

    expect(result).toBeUndefined();
    expect(onError).toHaveBeenCalledWith(state, expect.any(Error), 'test');
    expect(onFinally).toHaveBeenCalledWith(state, 'test');
  });
});

describe('composeActions', () => {
  it('should call multiple actions in sequence', async () => {
    const callOrder: string[] = [];
    const context = {
      call: vi.fn(async (actionName) => {
        callOrder.push(actionName);
      })
    };

    const action = composeActions(['action1', 'action2', 'action3']);
    await action({}, 'payload', context);

    expect(context.call).toHaveBeenCalledTimes(3);
    expect(callOrder).toEqual(['action1', 'action2', 'action3']);
  });
});

describe('parallelActions', () => {
  it('should call multiple actions in parallel', async () => {
    const calls: string[] = [];
    const context = {
      call: vi.fn(async (actionName) => {
        calls.push(actionName);
        await new Promise(resolve => setTimeout(resolve, 10));
      })
    };

    const action = parallelActions(['action1', 'action2', 'action3']);
    await action({}, 'payload', context);

    expect(context.call).toHaveBeenCalledTimes(3);
    expect(calls).toHaveLength(3);
    expect(calls).toContain('action1');
    expect(calls).toContain('action2');
    expect(calls).toContain('action3');
  });
});

describe('retryAction', () => {
  it('should retry on failure', async () => {
    let attempts = 0;
    const state = {};
    const onRetry = vi.fn();

    const action = retryAction(
      async () => {
        attempts++;
        if (attempts < 3) throw new Error('Fail');
        return 'success';
      },
      { maxRetries: 3, delay: 10, onRetry }
    );

    const context = { call: vi.fn() };
    const result = await action(state, null, context);

    expect(result).toBe('success');
    expect(attempts).toBe(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('should throw after max retries', async () => {
    const state = {};
    const action = retryAction(
      async () => {
        throw new Error('Always fail');
      },
      { maxRetries: 2, delay: 10 }
    );

    const context = { call: vi.fn() };
    
    await expect(action(state, null, context)).rejects.toThrow('Always fail');
  });
});

describe('debounceAction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should debounce action calls', async () => {
    const state = { value: 0 };
    const actionFn = vi.fn((s, payload) => {
      s.value = payload;
    });

    const action = debounceAction(actionFn, 300);
    const context = { call: vi.fn() };

    // Call multiple times rapidly
    action(state, 1, context);
    action(state, 2, context);
    action(state, 3, context);

    // Should not have been called yet
    expect(actionFn).not.toHaveBeenCalled();

    // Fast-forward time
    vi.advanceTimersByTime(300);
    await vi.runAllTimersAsync();

    // Should have been called only once with the last value
    expect(actionFn).toHaveBeenCalledTimes(1);
    expect(actionFn).toHaveBeenCalledWith(state, 3, context);
  });
});

describe('throttleAction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should throttle action calls', async () => {
    const state = { value: 0 };
    const actionFn = vi.fn((s, payload) => {
      s.value = payload;
    });

    const action = throttleAction(actionFn, 100);
    const context = { call: vi.fn() };

    // First call should execute immediately
    await action(state, 1, context);
    expect(actionFn).toHaveBeenCalledTimes(1);
    expect(actionFn).toHaveBeenCalledWith(state, 1, context);

    // Second call within throttle period should be delayed
    await action(state, 2, context);
    expect(actionFn).toHaveBeenCalledTimes(1); // Still 1

    // Fast-forward past throttle period
    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();

    // Now the second call should have executed
    expect(actionFn).toHaveBeenCalledTimes(2);
  });
});
