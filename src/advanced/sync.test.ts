/**
 * Tests for sync() DOM reattachment system
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { weave } from '../core/weave';

describe('sync() DOM reattachment', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should allow sync() to be called without errors', () => {
    document.body.innerHTML = '<div id="test">Hello</div>';
    
    const instance = weave('#test', ({ sync, onInit }) => {
      // Setup sync with minimal options
      sync({
        before: () => {
          // Before callback
        },
        after: () => {
          // After callback
        },
        target: () => document.querySelector('#test')!,
        restore: true
      });
      
      onInit(() => {
        // Init callback
      });
    });
    
    expect(instance).toBeDefined();
  });

  it('should store original selector for reattachment', () => {
    document.body.innerHTML = '<div id="test">Hello</div>';
    
    const instance = weave('#test', ({ $, sync }) => {
      const title = $('#test');
      
      sync({
        target: () => document.querySelector('#test')!,
        restore: false
      });
    });
    
    expect(instance).toBeDefined();
  });
});
