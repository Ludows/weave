/**
 * Integration tests for custom adapters with sync()
 */

import { JSDOM } from 'jsdom';
import { beforeEach, describe, expect, it } from 'vitest';
import { adapters } from './adapters';

describe('Custom adapter integration', () => {
  let dom: JSDOM;
  let document: Document;

  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="app">
            <h1>Original Content</h1>
            <p>This will be replaced</p>
          </div>
        </body>
      </html>
    `);
    document = dom.window.document;
    global.document = document as any;
  });

  it('should create a working HTMX-style adapter', () => {
    // Mock HTMX-like behavior
    const mockHTMX = {
      events: new Map<string, Function[]>(),
      on(event: string, handler: Function) {
        if (!this.events.has(event)) {
          this.events.set(event, []);
        }
        this.events.get(event)!.push(handler);
      },
      trigger(event: string) {
        const handlers = this.events.get(event) || [];
        handlers.forEach(h => h());
      }
    };

    // Register HTMX adapter
    adapters.register('htmx', (instance) => ({
      before: () => {
        instance.on('htmx:beforeSwap', () => {
          document.body.setAttribute('data-swapping', 'true');
        });
      },
      after: () => {
        instance.on('htmx:afterSwap', () => {
          document.body.removeAttribute('data-swapping');
        });
      },
      target: () => document.querySelector('#app')!,
      restore: true
    }));

    // Get the adapter config
    const config = (adapters as any).htmx(mockHTMX);

    // Setup event listeners
    config.before();
    config.after();

    // Simulate HTMX swap
    expect(document.body.getAttribute('data-swapping')).toBeNull();
    
    mockHTMX.trigger('htmx:beforeSwap');
    expect(document.body.getAttribute('data-swapping')).toBe('true');
    
    mockHTMX.trigger('htmx:afterSwap');
    expect(document.body.getAttribute('data-swapping')).toBeNull();

    // Verify target
    expect(config.target()).toBe(document.querySelector('#app'));
    expect(config.restore).toBe(true);
  });

  it('should create a working View Transitions API adapter', () => {
    // Register View Transitions adapter
    adapters.register('viewTransitions', () => ({
      before: () => {
        document.body.setAttribute('data-view-transition', 'starting');
      },
      after: () => {
        document.body.setAttribute('data-view-transition', 'finished');
      },
      target: () => document.querySelector('#app')!,
      restore: true
    }));

    const config = (adapters as any).viewTransitions();

    config.before();
    expect(document.body.getAttribute('data-view-transition')).toBe('starting');

    config.after();
    expect(document.body.getAttribute('data-view-transition')).toBe('finished');
  });

  it('should create a simple navigation adapter without external library', () => {
    // Register simple SPA navigation adapter
    adapters.register('simpleNav', () => {
      let beforeCallback: Function | null = null;
      let afterCallback: Function | null = null;

      return {
        before: () => {
          beforeCallback = () => {
            document.body.classList.add('navigating');
          };
          window.addEventListener('popstate', beforeCallback as any);
        },
        after: () => {
          afterCallback = () => {
            document.body.classList.remove('navigating');
          };
          window.addEventListener('popstate', afterCallback as any);
        },
        target: () => document.querySelector('#app')!,
        restore: true
      };
    });

    const config = (adapters as any).simpleNav();

    config.before();
    config.after();

    // Simulate navigation
    expect(document.body.classList.contains('navigating')).toBe(false);
    
    window.dispatchEvent(new Event('popstate'));
    
    // Both callbacks would be called on popstate
    expect(config.target()).toBe(document.querySelector('#app'));
  });

  it('should support adapter with custom container selector', () => {
    // Add a custom container
    const container = document.createElement('div');
    container.id = 'custom-container';
    document.body.appendChild(container);

    adapters.register('customContainer', (selector: string) => ({
      before: () => {
        const el = document.querySelector(selector);
        if (el) el.setAttribute('data-loading', 'true');
      },
      after: () => {
        const el = document.querySelector(selector);
        if (el) el.removeAttribute('data-loading');
      },
      target: () => document.querySelector(selector)!,
      restore: false
    }));

    const config = (adapters as any).customContainer('#custom-container');

    config.before();
    expect(container.getAttribute('data-loading')).toBe('true');

    config.after();
    expect(container.getAttribute('data-loading')).toBeNull();

    expect(config.target()).toBe(container);
    expect(config.restore).toBe(false);
  });
});
