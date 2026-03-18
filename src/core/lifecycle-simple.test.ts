/**
 * Simple test to debug lifecycle hooks
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { weave } from './weave';

describe('Simple lifecycle test', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  it('should have $ property', () => {
    const instance = weave('#test-container', () => {});
    
    console.log('Instance:', instance);
    console.log('Instance.$:', instance.$);
    
    expect(instance.$).toBeDefined();
    expect(instance.$.state).toBeDefined();
  });

  it('should execute onInit after delay', async () => {
    let called = false;
    
    weave('#test-container', ({ onInit }) => {
      console.log('In callback, registering onInit');
      onInit(() => {
        console.log('onInit called!');
        called = true;
      });
    });
    
    console.log('Before wait, called:', called);
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log('After wait, called:', called);
    
    expect(called).toBe(true);
  });
});
