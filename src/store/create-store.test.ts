/**
 * Tests for createStore() implementation
 */

import { describe, expect, it } from 'vitest';
import { createStore } from './create-store';

describe('createStore', () => {
  it('should create a store with name and state', () => {
    const store = createStore('test', ({ state }) => {
      state({ count: 0, name: 'Test' });
    });

    expect(store.name).toBe('test');
    expect(store.state.count).toBe(0);
    expect(store.state.name).toBe('Test');
  });

  it('should create computed properties', () => {
    const store = createStore('test', ({ state, computed }) => {
      state({ count: 5 });
      computed('double', (s) => s.count * 2);
    });

    expect(store.state.double).toBe(10);
  });

  it('should create actions that mutate state', () => {
    const store = createStore('test', ({ state, action }) => {
      state({ count: 0 });
      action('increment', (s) => {
        s.count++;
      });
    });

    expect(store.state.count).toBe(0);
    store.actions.increment();
    expect(store.state.count).toBe(1);
  });

  it('should support call() in actions', () => {
    const store = createStore('test', ({ state, action }) => {
      state({ count: 0 });
      action('increment', (s) => {
        s.count++;
      });
      action('incrementTwice', (s, payload, { call }) => {
        call('increment');
        call('increment');
      });
    });

    store.actions.incrementTwice();
    expect(store.state.count).toBe(2);
  });

  it('should track dirty state', () => {
    const store = createStore('test', ({ state }) => {
      state({ count: 0, name: 'Test' });
    });

    expect(store.isDirty()).toBe(false);
    
    store.state.count = 5;
    expect(store.isDirty()).toBe(true);
    expect(store.isDirty('count')).toBe(true);
    expect(store.isDirty('name')).toBe(false);
  });

  it('should reset to initial state', () => {
    const store = createStore('test', ({ state }) => {
      state({ count: 0 });
    });

    store.state.count = 10;
    expect(store.state.count).toBe(10);
    
    store.reset();
    expect(store.state.count).toBe(0);
    expect(store.isDirty()).toBe(false);
  });

  it('should support plugins', () => {
    let stateChanges = 0;
    let actionCalls = 0;

    const plugin = {
      name: 'test-plugin',
      onStateChange: () => { stateChanges++; },
      onActionCall: () => { actionCalls++; }
    };

    const store = createStore('test', ({ state, action, use }) => {
      state({ count: 0 });
      action('increment', (s) => { s.count++; });
      use(plugin);
    });

    store.state.count = 5;
    expect(stateChanges).toBe(1);

    store.actions.increment();
    expect(actionCalls).toBe(1);
  });
});
