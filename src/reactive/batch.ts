/**
 * batch() and microtask batching implementation
 */

import type { BatchFn } from '../types';

// Global batch state
let batchDepth = 0;
const pendingUpdates = new Set<() => void>();
let microtaskScheduled = false;

/**
 * Execute a function with batched updates
 * All state mutations within the batch will result in a single render cycle
 */
export function batch(fn: BatchFn): void | Promise<void> {
  batchDepth++;
  
  try {
    const result = fn();
    
    // If async function, wait for resolution before flushing
    if (result instanceof Promise) {
      return result.finally(() => {
        batchDepth--;
        if (batchDepth === 0) {
          flushUpdates();
        }
      });
    }
    
    // Synchronous function
    batchDepth--;
    if (batchDepth === 0) {
      flushUpdates();
    }
  } catch (error) {
    batchDepth--;
    throw error;
  }
}

/**
 * Schedule an update to be executed in the next batch
 * Automatically batches mutations within the same microtask
 */
export function scheduleUpdate(update: () => void): void {
  pendingUpdates.add(update);
  
  // If we're in a batch, don't schedule microtask yet
  if (batchDepth > 0) {
    return;
  }
  
  // Schedule microtask if not already scheduled
  if (!microtaskScheduled) {
    microtaskScheduled = true;
    queueMicrotask(() => {
      microtaskScheduled = false;
      flushUpdates();
    });
  }
}

/**
 * Execute all pending updates
 * Each update function is called once with the latest value
 * 
 * OPTIMIZED: Direct Set iteration instead of Array conversion
 */
function flushUpdates(): void {
  if (pendingUpdates.size === 0) {
    return;
  }
  
  // Create a copy to avoid issues if updates schedule more updates
  const updates = new Set(pendingUpdates);
  pendingUpdates.clear();
  
  // Execute each update once
  updates.forEach(update => {
    try {
      update();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error during batch update:', error);
      }
    }
  });
}

/**
 * Check if currently in a batch
 */
export function isInBatch(): boolean {
  return batchDepth > 0;
}

/**
 * Clear all pending updates (for testing)
 */
export function clearPendingUpdates(): void {
  pendingUpdates.clear();
  microtaskScheduled = false;
}
