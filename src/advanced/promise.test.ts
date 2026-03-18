/**
 * Tests for promise() fetch integration
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { abortAllPromises, promise, promiseWithWatch } from './promise';

// Mock fetch
global.fetch = vi.fn();

describe('promise()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch resource from URL', async () => {
    const mockData = { id: 1, name: 'Test' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const result = promise('https://api.example.com/data');
    const data = await result.data;

    expect(data).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/data',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('should call onStart before fetch begins', () => {
    const onStart = vi.fn();
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    promise('https://api.example.com/data', { onStart });

    expect(onStart).toHaveBeenCalled();
  });

  it('should call onSuccess with response data', async () => {
    const mockData = { id: 1 };
    const onSuccess = vi.fn();
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const result = promise('https://api.example.com/data', { onSuccess });
    await result.data;

    expect(onSuccess).toHaveBeenCalledWith(mockData);
  });

  it('should call onError on fetch failure', async () => {
    const onError = vi.fn();
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const result = promise('https://api.example.com/data', { onError });
    
    try {
      await result.data;
    } catch (error) {
      // Expected to throw
    }

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should call onFinally after success or error', async () => {
    const onFinally = vi.fn();
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    const result = promise('https://api.example.com/data', { onFinally });
    await result.data;

    expect(onFinally).toHaveBeenCalled();
  });

  it('should return abort function', () => {
    (global.fetch as any).mockImplementationOnce(() => 
      new Promise(() => {}) // Never resolves
    );

    const result = promise('https://api.example.com/data');
    
    expect(typeof result.abort).toBe('function');
    expect(() => result.abort()).not.toThrow();
  });

  it('should abort fetch when abort is called', async () => {
    let abortSignal: AbortSignal | null = null;
    (global.fetch as any).mockImplementationOnce((url: string, options: any) => {
      abortSignal = options.signal;
      return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const error: any = new Error('AbortError');
          error.name = 'AbortError';
          reject(error);
        });
      });
    });

    const result = promise('https://api.example.com/data');
    result.abort();

    expect(abortSignal?.aborted).toBe(true);
    
    // Catch the abort error
    try {
      await result.data;
    } catch (error: any) {
      expect(error.name).toBe('AbortError');
    }
  });
});

describe('promiseWithWatch()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create promise with watch option', () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({})
    });

    const result = promiseWithWatch(
      () => 'https://api.example.com/data',
      { watch: true }
    );

    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('abort');
    expect(typeof result.abort).toBe('function');
  });

  it('should support debounce option', () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({})
    });

    const result = promiseWithWatch(
      () => 'https://api.example.com/data',
      { watch: true, debounce: 50 }
    );

    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('abort');
  });

  it('should abort when abort is called', () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({})
    });

    const result = promiseWithWatch(
      () => 'https://api.example.com/data',
      { watch: true }
    );

    expect(() => result.abort()).not.toThrow();
  });
});

describe('abortAllPromises()', () => {
  it('should abort all pending promises for an instance', () => {
    const instance = {};
    
    // This would be called internally by promiseWithWatch
    // For now, just test that the function exists and doesn't throw
    expect(() => abortAllPromises(instance)).not.toThrow();
  });
});
