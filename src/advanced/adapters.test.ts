/**
 * Tests for adapter registration system
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adapters } from './adapters';

describe('adapters.register()', () => {
  // Clean up registered adapters after each test
  beforeEach(() => {
    // Remove any custom adapters added during tests
    const customAdapters = Object.keys(adapters).filter(
      key => !['register', 'swup', 'turbo', 'barba'].includes(key)
    );
    customAdapters.forEach(key => {
      delete (adapters as any)[key];
    });
  });

  it('should register a custom adapter', () => {
    const factory = vi.fn(() => ({
      before: () => {},
      after: () => {},
      target: () => document.body,
      restore: true
    }));

    adapters.register('myAdapter', factory);

    expect((adapters as any).myAdapter).toBe(factory);
  });

  it('should allow calling the registered adapter', () => {
    const mockInstance = { on: vi.fn() };
    const factory = (instance: any) => ({
      before: () => instance.on('before', () => {}),
      after: () => instance.on('after', () => {}),
      target: () => document.body,
      restore: true
    });

    adapters.register('myAdapter', factory);
    const config = (adapters as any).myAdapter(mockInstance);

    expect(config).toHaveProperty('before');
    expect(config).toHaveProperty('after');
    expect(config).toHaveProperty('target');
    expect(config.restore).toBe(true);
  });

  it('should throw TypeError for invalid name', () => {
    const factory = () => ({
      target: () => document.body
    });

    expect(() => adapters.register('', factory)).toThrow(TypeError);
    expect(() => adapters.register('', factory)).toThrow('non-empty string');
    expect(() => adapters.register('   ', factory)).toThrow(TypeError);
    expect(() => (adapters.register as any)(123, factory)).toThrow(TypeError);
  });

  it('should throw TypeError for invalid factory', () => {
    expect(() => (adapters.register as any)('test', null)).toThrow(TypeError);
    expect(() => (adapters.register as any)('test', null)).toThrow('must be a function');
    expect(() => (adapters.register as any)('test', 'not a function')).toThrow(TypeError);
    expect(() => (adapters.register as any)('test', {})).toThrow(TypeError);
  });

  it('should warn when overwriting existing adapter in dev mode', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const factory1 = () => ({ target: () => document.body });
    const factory2 = () => ({ target: () => document.body });

    adapters.register('test', factory1);
    adapters.register('test', factory2);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Adapter "test" is being overwritten')
    );

    consoleWarnSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  it('should not warn in production mode', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const factory1 = () => ({ target: () => document.body });
    const factory2 = () => ({ target: () => document.body });

    adapters.register('test', factory1);
    adapters.register('test', factory2);

    expect(consoleWarnSpy).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  it('should allow registering multiple adapters', () => {
    const factory1 = () => ({ target: () => document.body });
    const factory2 = () => ({ target: () => document.body });
    const factory3 = () => ({ target: () => document.body });

    adapters.register('adapter1', factory1);
    adapters.register('adapter2', factory2);
    adapters.register('adapter3', factory3);

    expect((adapters as any).adapter1).toBe(factory1);
    expect((adapters as any).adapter2).toBe(factory2);
    expect((adapters as any).adapter3).toBe(factory3);
  });

  it('should create working adapter with event listeners', () => {
    const mockLib = {
      on: vi.fn(),
      off: vi.fn()
    };

    adapters.register('customLib', (instance) => ({
      before: () => {
        instance.on('willTransition', () => {
          console.log('Before transition');
        });
      },
      after: () => {
        instance.on('didTransition', () => {
          console.log('After transition');
        });
      },
      target: () => document.querySelector('#app') || document.body,
      restore: true
    }));

    const config = (adapters as any).customLib(mockLib);
    
    // Execute before callback
    config.before();
    expect(mockLib.on).toHaveBeenCalledWith('willTransition', expect.any(Function));
    
    // Execute after callback
    config.after();
    expect(mockLib.on).toHaveBeenCalledWith('didTransition', expect.any(Function));
    
    // Check target
    expect(config.target()).toBe(document.body);
    expect(config.restore).toBe(true);
  });

  it('should support adapter without instance parameter', () => {
    adapters.register('simple', () => ({
      before: () => {
        document.body.setAttribute('data-transitioning', 'true');
      },
      after: () => {
        document.body.removeAttribute('data-transitioning');
      },
      target: () => document.body,
      restore: false
    }));

    const config = (adapters as any).simple();
    
    config.before();
    expect(document.body.getAttribute('data-transitioning')).toBe('true');
    
    config.after();
    expect(document.body.getAttribute('data-transitioning')).toBeNull();
    
    expect(config.restore).toBe(false);
  });
});

describe('Built-in adapters', () => {
  it('should have swup adapter', () => {
    expect(adapters.swup).toBeDefined();
    expect(typeof adapters.swup).toBe('function');
  });

  it('should have turbo adapter', () => {
    expect(adapters.turbo).toBeDefined();
    expect(typeof adapters.turbo).toBe('function');
  });

  it('should have barba adapter', () => {
    expect(adapters.barba).toBeDefined();
    expect(typeof adapters.barba).toBe('function');
  });
});
