/**
 * Preconfigured sync adapters for page transition libraries
 * 
 * Provides ready-to-use sync() configurations for:
 * - Swup
 * - Turbo
 * - Barba.js
 * 
 * You can also register custom adapters using `adapters.register()`:
 * 
 * @example
 * ```ts
 * import { adapters } from 'weave';
 * 
 * // Register a custom adapter for your transition library
 * adapters.register('htmx', (htmxInstance) => ({
 *   before: () => {
 *     document.body.addEventListener('htmx:beforeSwap', () => {
 *       console.log('Saving state before swap...');
 *     });
 *   },
 *   after: () => {
 *     document.body.addEventListener('htmx:afterSwap', () => {
 *       console.log('Restoring state after swap...');
 *     });
 *   },
 *   target: () => document.querySelector('#content'),
 *   restore: true
 * }));
 * 
 * // Use it in your weave instance
 * weave('#app', ({ sync }) => {
 *   sync(adapters.htmx());
 * });
 * ```
 */

import { SyncOptions } from './sync';

export interface SwupInstance {
  on(event: string, handler: () => void): void;
  off(event: string, handler: () => void): void;
}

export interface BarbaInstance {
  hooks: {
    before(handler: () => void): void;
    after(handler: () => void): void;
  };
}

export interface AdapterFactory {
  (instance?: any): SyncOptions;
}

export const adapters = {
  /**
   * Register a custom adapter
   * 
   * @param name - The name of the adapter
   * @param factory - A function that returns SyncOptions
   * 
   * @example
   * ```ts
   * adapters.register('myLib', (instance) => ({
   *   before: () => instance.on('before', () => {}),
   *   after: () => instance.on('after', () => {}),
   *   target: () => document.querySelector('#app'),
   *   restore: true
   * }));
   * 
   * // Use it
   * sync(adapters.myLib(myLibInstance));
   * ```
   */
  register(name: string, factory: AdapterFactory): void {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new TypeError('Adapter name must be a non-empty string');
    }
    
    if (typeof factory !== 'function') {
      throw new TypeError('Adapter factory must be a function');
    }
    
    if (name in adapters) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[Weave] Adapter "${name}" is being overwritten`);
      }
    }
    
    (adapters as any)[name] = factory;
  },
  
  /**
   * Swup adapter
   * Configures sync() for Swup page transitions
   */
  swup(swupInstance?: SwupInstance): SyncOptions {
    let beforeHandler: (() => void) | undefined;
    let afterHandler: (() => void) | undefined;
    
    return {
      before: () => {
        if (swupInstance && beforeHandler) {
          swupInstance.on('willReplaceContent', beforeHandler);
        }
      },
      after: () => {
        if (swupInstance && afterHandler) {
          swupInstance.on('contentReplaced', afterHandler);
        }
      },
      target: () => {
        // Swup typically replaces content in #swup or data-swup container
        const container = document.querySelector('#swup') || 
                         document.querySelector('[data-swup]');
        if (!container) {
          throw new Error('Swup container not found');
        }
        return container;
      },
      restore: true
    };
  },
  
  /**
   * Turbo adapter
   * Configures sync() for Turbo Drive page transitions
   */
  turbo(): SyncOptions {
    return {
      before: () => {
        document.addEventListener('turbo:before-render', () => {
          // Turbo before render event
        });
      },
      after: () => {
        document.addEventListener('turbo:render', () => {
          // Turbo after render event
        });
      },
      target: () => {
        // Turbo replaces the entire body or specific turbo-frame
        const frame = document.querySelector('turbo-frame');
        return frame || document.body;
      },
      restore: true
    };
  },
  
  /**
   * Barba.js adapter
   * Configures sync() for Barba.js page transitions
   */
  barba(barbaInstance?: BarbaInstance): SyncOptions {
    return {
      before: () => {
        if (barbaInstance) {
          barbaInstance.hooks.before(() => {
            // Barba before transition
          });
        }
      },
      after: () => {
        if (barbaInstance) {
          barbaInstance.hooks.after(() => {
            // Barba after transition
          });
        }
      },
      target: () => {
        // Barba typically uses data-barba="container"
        const container = document.querySelector('[data-barba="container"]');
        if (!container) {
          throw new Error('Barba container not found');
        }
        return container;
      },
      restore: true
    };
  }
};
