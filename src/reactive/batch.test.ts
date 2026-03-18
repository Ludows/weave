/**
 * Tests for batch() and automatic microtask batching
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { batch, clearPendingUpdates, scheduleUpdate } from './batch';

describe('batch()', () => {
  beforeEach(() => {
    clearPendingUpdates();
  });

  it('should execute synchronous function and flush updates', () => {
    const updates: number[] = [];
    
    batch(() => {
      scheduleUpdate(() => updates.push(1));
      scheduleUpdate(() => updates.push(2));
      scheduleUpdate(() => updates.push(3));
    });
    
    expect(updates).toEqual([1, 2, 3]);
  });

  it('should wait for async function resolution before flushing', async () => {
    const updates: number[] = [];
    
    const promise = batch(async () => {
      scheduleUpdate(() => updates.push(1));
      await Promise.resolve();
      scheduleUpdate(() => updates.push(2));
    });
    
    // Updates should not be flushed yet
    expect(updates).toEqual([]);
    
    await promise;
    
    // Now updates should be flushed
    expect(updates).toEqual([1, 2]);
  });

  it('should support nested batch() calls', () => {
    const updates: number[] = [];
    
    batch(() => {
      scheduleUpdate(() => updates.push(1));
      
      batch(() => {
        scheduleUpdate(() => updates.push(2));
      });
      
      // Inner batch should not flush yet
      expect(updates).toEqual([]);
      
      scheduleUpdate(() => updates.push(3));
    });
    
    // All updates flushed after outermost batch
    expect(updates).toEqual([1, 2, 3]);
  });

  it('should deduplicate updates within batch', () => {
    const updates: number[] = [];
    const update = () => updates.push(1);
    
    batch(() => {
      scheduleUpdate(update);
      scheduleUpdate(update);
      scheduleUpdate(update);
    });
    
    // Same function should only execute once
    expect(updates).toEqual([1]);
  });

  it('should handle errors in batch function', () => {
    const updates: number[] = [];
    
    expect(() => {
      batch(() => {
        scheduleUpdate(() => updates.push(1));
        throw new Error('Test error');
      });
    }).toThrow('Test error');
    
    // Updates should still be cleared even on error
    expect(updates).toEqual([]);
  });
});

describe('scheduleUpdate()', () => {
  beforeEach(() => {
    clearPendingUpdates();
  });

  it('should automatically batch mutations in same microtask', async () => {
    const updates: number[] = [];
    
    scheduleUpdate(() => updates.push(1));
    scheduleUpdate(() => updates.push(2));
    scheduleUpdate(() => updates.push(3));
    
    // Updates not executed yet
    expect(updates).toEqual([]);
    
    // Wait for microtask
    await Promise.resolve();
    
    // All updates executed in single batch
    expect(updates).toEqual([1, 2, 3]);
  });

  it('should not schedule microtask when in batch', () => {
    const updates: number[] = [];
    
    batch(() => {
      scheduleUpdate(() => updates.push(1));
      scheduleUpdate(() => updates.push(2));
    });
    
    // Updates executed immediately after batch
    expect(updates).toEqual([1, 2]);
  });

  it('should deduplicate same update function', async () => {
    const updates: number[] = [];
    const update = () => updates.push(1);
    
    scheduleUpdate(update);
    scheduleUpdate(update);
    scheduleUpdate(update);
    
    await Promise.resolve();
    
    // Same function only executed once
    expect(updates).toEqual([1]);
  });

  it('should handle errors in update functions', async () => {
    const updates: number[] = [];
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    scheduleUpdate(() => {
      throw new Error('Update error');
    });
    scheduleUpdate(() => updates.push(1));
    
    await Promise.resolve();
    
    // Error should be logged but not stop other updates
    expect(consoleSpy).toHaveBeenCalled();
    expect(updates).toEqual([1]);
    
    consoleSpy.mockRestore();
  });
});

describe('Batch integration', () => {
  beforeEach(() => {
    clearPendingUpdates();
  });

  it('should batch multiple state changes into single render', async () => {
    let renderCount = 0;
    const state = { count: 0, name: 'test' };
    
    const render = () => {
      renderCount++;
    };
    
    // Simulate multiple state changes
    batch(() => {
      state.count = 1;
      scheduleUpdate(render);
      
      state.count = 2;
      scheduleUpdate(render);
      
      state.name = 'updated';
      scheduleUpdate(render);
    });
    
    // Only one render should occur
    expect(renderCount).toBe(1);
  });

  it('should execute each directive once with latest value', () => {
    const values: number[] = [];
    let latestValue = 0;
    
    const directive = () => {
      values.push(latestValue);
    };
    
    batch(() => {
      latestValue = 1;
      scheduleUpdate(directive);
      
      latestValue = 2;
      scheduleUpdate(directive);
      
      latestValue = 3;
      scheduleUpdate(directive);
    });
    
    // Directive executed once with latest value
    expect(values).toEqual([3]);
  });
});
