import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isDevelopmentMode,
  devWarn,
  devError,
  checkCircularDependency,
  trackEffectExecution,
  trackInstance,
  warnUncleanedResources,
  warnPerformance,
  stripDevCode,
} from './dev-mode';

describe('dev-mode utilities', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('isDevelopmentMode', () => {
    it('returns true when NODE_ENV is not "production"', () => {
      process.env.NODE_ENV = 'development';
      expect(isDevelopmentMode()).toBe(true);
    });

    it('returns true when NODE_ENV is "test"', () => {
      process.env.NODE_ENV = 'test';
      expect(isDevelopmentMode()).toBe(true);
    });

    it('returns false when NODE_ENV is "production"', () => {
      process.env.NODE_ENV = 'production';
      expect(isDevelopmentMode()).toBe(false);
    });
  });

  describe('devWarn', () => {
    it('calls console.warn in dev mode', () => {
      process.env.NODE_ENV = 'development';
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      devWarn('test warning');

      expect(spy).toHaveBeenCalledWith('[Weave Dev Warning] test warning');
      spy.mockRestore();
    });

    it('is silent in production', () => {
      process.env.NODE_ENV = 'production';
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      devWarn('test warning');

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('devError', () => {
    it('calls console.error in dev mode', () => {
      process.env.NODE_ENV = 'development';
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      devError('test error');

      expect(spy).toHaveBeenCalledWith('[Weave Dev Error] test error');
      spy.mockRestore();
    });

    it('is silent in production', () => {
      process.env.NODE_ENV = 'production';
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      devError('test error');

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('checkCircularDependency', () => {
    it('returns false for a new effect', () => {
      const effect = { id: 'new-effect' };
      expect(checkCircularDependency(effect)).toBe(false);
    });

    it('returns true for an already-executing effect', () => {
      process.env.NODE_ENV = 'development';
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const effect = { id: 'circular' };

      trackEffectExecution(effect, () => {
        expect(checkCircularDependency(effect)).toBe(true);
      });

      warnSpy.mockRestore();
    });
  });

  describe('trackEffectExecution', () => {
    it('tracks and cleans up properly', () => {
      process.env.NODE_ENV = 'development';
      const effect = { id: 'tracked' };
      const fn = vi.fn();

      trackEffectExecution(effect, fn);

      expect(fn).toHaveBeenCalledOnce();
      // After execution, effect should no longer be tracked
      expect(checkCircularDependency(effect)).toBe(false);
    });

    it('cleans up even if fn throws', () => {
      process.env.NODE_ENV = 'development';
      const effect = { id: 'throws' };

      expect(() => {
        trackEffectExecution(effect, () => {
          throw new Error('oops');
        });
      }).toThrow('oops');

      // Should be cleaned up despite the error
      expect(checkCircularDependency(effect)).toBe(false);
    });

    it('just calls fn in production mode', () => {
      process.env.NODE_ENV = 'production';
      const effect = { id: 'prod' };
      const fn = vi.fn();

      trackEffectExecution(effect, fn);

      expect(fn).toHaveBeenCalledOnce();
    });
  });

  describe('trackInstance / warnUncleanedResources', () => {
    it('warns for tracked instances', () => {
      process.env.NODE_ENV = 'development';
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const instance = { id: 'inst' };

      trackInstance(instance);
      warnUncleanedResources(instance);

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('uncleaned resources')
      );
      spy.mockRestore();
    });

    it('does not warn for untracked instances', () => {
      process.env.NODE_ENV = 'development';
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const instance = { id: 'unknown' };

      warnUncleanedResources(instance);

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('warnPerformance', () => {
    it('logs in dev mode', () => {
      process.env.NODE_ENV = 'development';
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      warnPerformance('too many renders');

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('Performance: too many renders')
      );
      spy.mockRestore();
    });

    it('is silent in production', () => {
      process.env.NODE_ENV = 'production';
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      warnPerformance('too many renders');

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('stripDevCode', () => {
    it('calls devFn in dev mode', () => {
      process.env.NODE_ENV = 'development';
      const result = stripDevCode(() => 'dev', () => 'prod');
      expect(result).toBe('dev');
    });

    it('calls prodFn in production mode', () => {
      process.env.NODE_ENV = 'production';
      const result = stripDevCode(() => 'dev', () => 'prod');
      expect(result).toBe('prod');
    });
  });
});
