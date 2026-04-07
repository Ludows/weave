/**
 * Tests for promise() fetch integration
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { promise } from './promise';

const mockFetch = (data: unknown, ok = true) =>
  vi.fn().mockResolvedValueOnce({ ok, json: async () => data });

const mockFetchError = (message: string) =>
  vi.fn().mockRejectedValueOnce(new Error(message));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('promise() — reactive refs', () => {
  it('should return reactive refs with initial values', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    const result = promise('https://api.example.com/data');

    expect(result.data.value).toBeNull();
    expect(result.loading.value).toBe(true);
    expect(result.error.value).toBeNull();
    expect(typeof result.refetch).toBe('function');
    expect(typeof result.abort).toBe('function');
  });

  it('should populate data.value on success', async () => {
    const mockData = { id: 1, name: 'Test' };
    global.fetch = mockFetch(mockData);

    const result = promise('https://api.example.com/data');

    await vi.waitFor(() => expect(result.loading.value).toBe(false));

    expect(result.data.value).toEqual(mockData);
    expect(result.error.value).toBeNull();
  });

  it('should populate error.value on fetch failure', async () => {
    global.fetch = mockFetchError('Network error');

    const result = promise('https://api.example.com/data');

    await vi.waitFor(() => expect(result.loading.value).toBe(false));

    expect(result.data.value).toBeNull();
    expect(result.error.value).toBeInstanceOf(Error);
    expect(result.error.value?.message).toBe('Network error');
  });

  it('should populate error.value on non-ok HTTP response', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) });

    const result = promise('https://api.example.com/data');

    await vi.waitFor(() => expect(result.loading.value).toBe(false));

    expect(result.error.value?.message).toContain('404');
  });

  it('should set loading to true then false', async () => {
    global.fetch = mockFetch({});

    const result = promise('https://api.example.com/data');

    expect(result.loading.value).toBe(true);
    await vi.waitFor(() => expect(result.loading.value).toBe(false));
  });
});

describe('promise() — callbacks', () => {
  it('should call onStart before fetch', () => {
    const onStart = vi.fn();
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    promise('https://api.example.com/data', { onStart });

    expect(onStart).toHaveBeenCalledOnce();
  });

  it('should call onSuccess with response data', async () => {
    const mockData = { id: 1 };
    const onSuccess = vi.fn();
    global.fetch = mockFetch(mockData);

    const result = promise('https://api.example.com/data', { onSuccess });
    await vi.waitFor(() => expect(result.loading.value).toBe(false));

    expect(onSuccess).toHaveBeenCalledWith(mockData);
  });

  it('should call onError on failure', async () => {
    const onError = vi.fn();
    global.fetch = mockFetchError('Network error');

    const result = promise('https://api.example.com/data', { onError });
    await vi.waitFor(() => expect(result.loading.value).toBe(false));

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should call onFinally after success', async () => {
    const onFinally = vi.fn();
    global.fetch = mockFetch({});

    const result = promise('https://api.example.com/data', { onFinally });
    await vi.waitFor(() => expect(result.loading.value).toBe(false));

    expect(onFinally).toHaveBeenCalledOnce();
  });

  it('should call onFinally after failure', async () => {
    const onFinally = vi.fn();
    global.fetch = mockFetchError('Fail');

    const result = promise('https://api.example.com/data', { onFinally });
    await vi.waitFor(() => expect(result.loading.value).toBe(false));

    expect(onFinally).toHaveBeenCalledOnce();
  });
});

describe('promise() — enabled option', () => {
  it('should not start when enabled is false', () => {
    global.fetch = vi.fn();

    const result = promise('https://api.example.com/data', { enabled: false });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.loading.value).toBe(false);
    expect(result.data.value).toBeNull();
  });

  it('should start when enabled is true (explicit)', async () => {
    const mockData = { id: 1 };
    global.fetch = mockFetch(mockData);

    const result = promise('https://api.example.com/data', { enabled: true });

    expect(result.loading.value).toBe(true);
    await vi.waitFor(() => expect(result.loading.value).toBe(false));
    expect(result.data.value).toEqual(mockData);
  });

  it('should not start when enabled getter returns false', () => {
    global.fetch = vi.fn();

    const result = promise('https://api.example.com/data', { enabled: () => false });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.loading.value).toBe(false);
  });

  it('refetch() should start even when enabled is false', async () => {
    const mockData = { id: 42 };
    global.fetch = mockFetch(mockData);

    const result = promise('https://api.example.com/data', { enabled: false });

    expect(global.fetch).not.toHaveBeenCalled();

    result.refetch();

    expect(result.loading.value).toBe(true);
    await vi.waitFor(() => expect(result.loading.value).toBe(false));
    expect(result.data.value).toEqual(mockData);
  });
});

describe('promise() — refetch()', () => {
  it('should re-fetch and update data', async () => {
    const first = { id: 1 };
    const second = { id: 2 };
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => first })
      .mockResolvedValueOnce({ ok: true, json: async () => second });

    const result = promise('https://api.example.com/data');
    await vi.waitFor(() => expect(result.data.value).toEqual(first));

    result.refetch();
    await vi.waitFor(() => expect(result.data.value).toEqual(second));
  });

  it('should reset error on refetch', async () => {
    global.fetch = mockFetchError('First error');
    const result = promise('https://api.example.com/data');
    await vi.waitFor(() => expect(result.error.value).toBeTruthy());

    global.fetch = mockFetch({ ok: true });
    result.refetch();
    await vi.waitFor(() => expect(result.loading.value).toBe(false));

    expect(result.error.value).toBeNull();
  });
});

describe('promise() — abort()', () => {
  it('should abort an in-flight request', async () => {
    let abortSignal: AbortSignal | undefined;
    global.fetch = vi.fn().mockImplementationOnce((_url: string, opts: RequestInit) => {
      abortSignal = opts.signal as AbortSignal;
      return new Promise((_resolve, reject) => {
        opts.signal?.addEventListener('abort', () => {
          const err = new Error('AbortError');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    const result = promise('https://api.example.com/data');
    result.abort();

    expect(abortSignal?.aborted).toBe(true);
  });

  it('should not set error.value on abort', async () => {
    global.fetch = vi.fn().mockImplementationOnce((_url: string, opts: RequestInit) => {
      return new Promise((_resolve, reject) => {
        opts.signal?.addEventListener('abort', () => {
          const err = new Error('AbortError');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    const result = promise('https://api.example.com/data');
    result.abort();

    await new Promise(r => setTimeout(r, 20));
    expect(result.error.value).toBeNull();
  });
});

describe('promise() — watch mode', () => {
  it('should start immediately when watch is true', async () => {
    const mockData = { id: 1 };
    global.fetch = mockFetch(mockData);

    const result = promise(() => 'https://api.example.com/data', { watch: true });

    expect(result.loading.value).toBe(true);
    await vi.waitFor(() => expect(result.loading.value).toBe(false));
    expect(result.data.value).toEqual(mockData);
  });

  it('should not start in watch mode when enabled is false', () => {
    global.fetch = vi.fn();

    promise(() => 'https://api.example.com/data', { watch: true, enabled: false });

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
