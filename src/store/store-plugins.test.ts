/**
 * Tests for store plugins
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from './create-store';
import { devtools, getDevtoolsInspector, logger, persist, validate } from './store-plugins';

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
  beforeEach(() => {
    // Reset the inspector
    if (typeof window !== 'undefined') {
      (window as any).__WEAVE_DEVTOOLS__ = undefined;
    }
  });

  it('should register store in inspector on init', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    createStore('test', ({ state, use }) => {
      state({ count: 0 });
      use(devtools({ name: 'Test Store' }));
    });

    const inspector = getDevtoolsInspector();
    expect(inspector.stores.has('Test Store')).toBe(true);
    expect(inspector.getEvents('Test Store').some(e => e.type === 'INIT')).toBe(true);

    process.env.NODE_ENV = originalEnv;
  });

  it('should track state changes in timeline', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const store = createStore('test', ({ state, use }) => {
      state({ count: 0 });
      use(devtools({ name: 'Timeline Store' }));
    });

    store.state.count = 42;

    const inspector = getDevtoolsInspector();
    const events = inspector.getEvents('Timeline Store');
    expect(events.some(e => e.type === 'STATE_CHANGE')).toBe(true);

    process.env.NODE_ENV = originalEnv;
  });

  it('should track actions in timeline', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const store = createStore('test', ({ state, use, action }) => {
      state({ count: 0 });
      use(devtools({ name: 'Action Store' }));
      action('increment', (s) => { s.count++; });
    });

    store.actions.increment();

    const inspector = getDevtoolsInspector();
    const events = inspector.getEvents('Action Store');
    expect(events.some(e => e.type === 'ACTION' && e.payload?.actionName === 'increment')).toBe(true);

    process.env.NODE_ENV = originalEnv;
  });

  it('should not initialize when disabled', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    createStore('test', ({ state, use }) => {
      state({ count: 0 });
      use(devtools({ name: 'Disabled Store' }));
    });

    const inspector = getDevtoolsInspector();
    expect(inspector.stores.has('Disabled Store')).toBe(false);

    process.env.NODE_ENV = originalEnv;
  });

  it('should remove store on destroy', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const store = createStore('test', ({ state, use }) => {
      state({ count: 0 });
      use(devtools({ name: 'Destroy Store' }));
    });

    const inspector = getDevtoolsInspector();
    expect(inspector.stores.has('Destroy Store')).toBe(true);

    store.destroy();

    expect(inspector.stores.has('Destroy Store')).toBe(false);
    expect(inspector.getEvents('Destroy Store').some(e => e.type === 'DESTROY')).toBe(true);

    process.env.NODE_ENV = originalEnv;
  });

  it('should clear timeline', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    createStore('test', ({ state, use }) => {
      state({ count: 0 });
      use(devtools({ name: 'Clear Store' }));
    });

    const inspector = getDevtoolsInspector();
    expect(inspector.events.length).toBeGreaterThan(0);

    inspector.clear();
    expect(inspector.events.length).toBe(0);

    process.env.NODE_ENV = originalEnv;
  });
});

describe('plugin priority', () => {
  it('should execute plugins in priority order', () => {
    const executionOrder: string[] = [];

    createStore('test', ({ state, use }) => {
      state({ count: 0 });
      use({
        name: 'last',
        priority: 20,
        onInit: () => { executionOrder.push('last'); }
      });
      use({
        name: 'first',
        priority: 1,
        onInit: () => { executionOrder.push('first'); }
      });
      use({
        name: 'middle',
        priority: 10,
        onInit: () => { executionOrder.push('middle'); }
      });
    });

    expect(executionOrder).toEqual(['first', 'middle', 'last']);
  });
});

describe('plugin lifecycle hooks', () => {
  it('should call onBeforeAction before action execution', () => {
    const calls: string[] = [];

    const store = createStore('test', ({ state, use, action }) => {
      state({ count: 0 });
      use({
        name: 'tracker',
        onBeforeAction: (actionName) => { calls.push(`before:${actionName}`); },
        onActionCall: (actionName) => { calls.push(`action:${actionName}`); }
      });
      action('increment', (s) => {
        calls.push('execute');
        s.count++;
      });
    });

    store.actions.increment();

    expect(calls).toEqual(['before:increment', 'action:increment', 'execute']);
  });

  it('should call onAfterStateChange after mutation', () => {
    let afterCalled = false;
    let afterNewState: any;

    const store = createStore('test', ({ state, use }) => {
      state({ count: 0 });
      use({
        name: 'after-tracker',
        onAfterStateChange: (newState) => {
          afterCalled = true;
          afterNewState = { ...newState as any };
        }
      });
    });

    store.state.count = 99;

    expect(afterCalled).toBe(true);
    expect(afterNewState.count).toBe(99);
  });

  it('should call onDestroy when store is destroyed', () => {
    let destroyed = false;

    const store = createStore('test', ({ state, use }) => {
      state({ count: 0 });
      use({
        name: 'destroy-tracker',
        onDestroy: () => { destroyed = true; }
      });
    });

    store.destroy();
    expect(destroyed).toBe(true);
  });

  it('should call onError when a plugin throws', () => {
    const errors: { error: string; context: string }[] = [];

    const store = createStore('test', ({ state, use }) => {
      state({ count: 0 });
      use({
        name: 'error-reporter',
        priority: 99,
        onError: (error, context) => {
          errors.push({ error: error.message, context });
        }
      });
      use({
        name: 'buggy',
        onAfterStateChange: () => { throw new Error('buggy plugin failed'); }
      });
    });

    store.state.count = 1;

    expect(errors.length).toBe(1);
    expect(errors[0]!.error).toBe('buggy plugin failed');
    expect(errors[0]!.context).toContain('buggy');
  });

  it('should not call destroy twice', () => {
    let count = 0;

    const store = createStore('test', ({ state, use }) => {
      state({ count: 0 });
      use({ name: 'counter', onDestroy: () => { count++; } });
    });

    store.destroy();
    store.destroy();

    expect(count).toBe(1);
  });
});
