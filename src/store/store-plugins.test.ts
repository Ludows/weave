/**
 * Tests for store plugins
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from './create-store';
import { devtools, logger, persist, validate } from './store-plugins';

describe('persist plugin', () => {
  let mockStorage: Storage;

  beforeEach(() => {
    const store = new Map<string, string>();
    mockStorage = {
      getItem: vi.fn((key) => store.get(key) || null),
      setItem: vi.fn((key, value) => store.set(key, value)),
      removeItem: vi.fn((key) => store.delete(key)),
      clear: vi.fn(() => store.clear()),
      key: vi.fn((index) => Array.from(store.keys())[index] || null),
      length: store.size
    };
  });

  it('should save state to storage on change', async () => {
    const store = createStore('test', ({ state, use }) => {
      state({ count: 0, name: 'test' });
      use(persist({ key: 'test-store', storage: mockStorage, debounce: 0 }));
    });

    store.state.count = 5;

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'test-store',
      JSON.stringify({ count: 5, name: 'test' })
    );
  });

  it('should restore state from storage on init', () => {
    mockStorage.setItem('test-store', JSON.stringify({ count: 42, name: 'restored' }));

    const store = createStore('test', ({ state, use }) => {
      state({ count: 0, name: 'test' });
      use(persist({ key: 'test-store', storage: mockStorage }));
    });

    expect(store.state.count).toBe(42);
    expect(store.state.name).toBe('restored');
  });

  it('should respect include option', async () => {
    const store = createStore('test', ({ state, use }) => {
      state({ count: 0, name: 'test', secret: 'hidden' });
      use(persist({ key: 'test-store', storage: mockStorage, include: ['count', 'name'], debounce: 0 }));
    });

    store.state.count = 5;
    store.state.secret = 'changed';

    await new Promise(resolve => setTimeout(resolve, 10));

    const saved = JSON.parse(mockStorage.getItem('test-store')!);
    expect(saved).toEqual({ count: 5, name: 'test' });
    expect(saved.secret).toBeUndefined();
  });

  it('should respect exclude option', async () => {
    const store = createStore('test', ({ state, use }) => {
      state({ count: 0, name: 'test', temp: 'temporary' });
      use(persist({ key: 'test-store', storage: mockStorage, exclude: ['temp'], debounce: 0 }));
    });

    store.state.count = 5;
    store.state.temp = 'changed';

    await new Promise(resolve => setTimeout(resolve, 10));

    const saved = JSON.parse(mockStorage.getItem('test-store')!);
    expect(saved).toEqual({ count: 5, name: 'test' });
    expect(saved.temp).toBeUndefined();
  });
});

describe('logger plugin', () => {
  let consoleLogSpy: any;
  let consoleGroupSpy: any;
  let consoleGroupEndSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleGroupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleGroupSpy.mockRestore();
    consoleGroupEndSpy.mockRestore();
  });

  it('should log state changes', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const store = createStore('test', ({ state, use }) => {
      state({ count: 0 });
      use(logger({ prefix: '[test]', logActions: false }));
    });

    // Direct state mutation to test state change logging
    store.state.count = 5;

    expect(consoleGroupSpy).toHaveBeenCalledWith('[test] state changed');
    expect(consoleLogSpy).toHaveBeenCalledWith('prev:', expect.any(Object));
    expect(consoleLogSpy).toHaveBeenCalledWith('next:', expect.any(Object));

    process.env.NODE_ENV = originalEnv;
  });

  it('should log action calls', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const store = createStore('test', ({ state, use, action }) => {
      state({ count: 0 });
      use(logger({ prefix: '[test]' }));
      action('add', (s, payload) => { s.count += payload; });
    });

    store.actions.add(5);

    expect(consoleGroupSpy).toHaveBeenCalledWith('[test] action: add');
    expect(consoleLogSpy).toHaveBeenCalledWith('payload:', 5);

    process.env.NODE_ENV = originalEnv;
  });

  it('should not log in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const store = createStore('test', ({ state, use, action }) => {
      state({ count: 0 });
      use(logger({ prefix: '[test]' }));
      action('increment', (s) => { s.count++; });
    });

    store.actions.increment();

    expect(consoleGroupSpy).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });
});

describe('validate plugin', () => {
  it('should validate state changes', () => {
    const store = createStore('test', ({ state, use, action }) => {
      state({ count: 0, items: [] as any[] });
      use(validate({
        count: (val) => typeof val === 'number' && val >= 0,
        items: (val) => Array.isArray(val)
      }));
      action('setCount', (s, payload) => { s.count = payload; });
      action('setItems', (s, payload) => { s.items = payload; });
    });

    // Valid changes should work
    expect(() => store.actions.setCount(5)).not.toThrow();
    expect(() => store.actions.setItems([1, 2, 3])).not.toThrow();

    // Invalid changes should throw
    expect(() => store.actions.setCount(-1)).toThrow();
    expect(() => store.actions.setItems('not an array' as any)).toThrow();
  });

  it('should support custom error messages', () => {
    const store = createStore('test', ({ state, use, action }) => {
      state({ email: '' });
      use(validate({
        email: (val) => {
          if (typeof val !== 'string') return 'Email must be a string';
          if (!val.includes('@')) return 'Email must contain @';
          return true;
        }
      }));
      action('setEmail', (s, payload) => { s.email = payload; });
    });

    expect(() => store.actions.setEmail('invalid')).toThrow('Email must contain @');
    expect(() => store.actions.setEmail(123 as any)).toThrow('Email must be a string');
    expect(() => store.actions.setEmail('valid@email.com')).not.toThrow();
  });
});

describe('devtools plugin', () => {
  it('should initialize devtools in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const store = createStore('test', ({ state, use }) => {
      state({ count: 0 });
      use(devtools({ name: 'Test Store' }));
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[devtools] Test Store initialized',
      expect.any(Object)
    );

    consoleLogSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  it('should not initialize in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    createStore('test', ({ state, use }) => {
      state({ count: 0 });
      use(devtools({ name: 'Test Store' }));
    });

    expect(consoleLogSpy).not.toHaveBeenCalled();

    consoleLogSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });
});
