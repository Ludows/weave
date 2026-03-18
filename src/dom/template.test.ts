/**
 * Tests for template() directive
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { weave } from '../core/weave';

describe('template() directive', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe('template string callback', () => {
    it('should render template string', () => {
      container.innerHTML = '<div id="app"><div id="target"></div></div>';
      
      weave('#app', ({ $ }) => {
        $('#target').template({
          source: '<p>Hello World</p>'
        });
      });
      
      const target = container.querySelector('#target');
      expect(target?.innerHTML).toBe('<p>Hello World</p>');
    });

    it('should re-render when callback dependencies change', () => {
      container.innerHTML = '<div id="app"><div id="target"></div></div>';
      
      weave('#app', ({ $, ref }) => {
        const message = ref('Hello');
        
        $('#target').template({
          source: () => `<p>${message.value}</p>`
        });
        
        // Change the message
        setTimeout(() => {
          message.value = 'Goodbye';
        }, 10);
      });
      
      const target = container.querySelector('#target');
      expect(target?.innerHTML).toBe('<p>Hello</p>');
      
      // Wait for reactive update
      return new Promise(resolve => {
        setTimeout(() => {
          expect(target?.innerHTML).toBe('<p>Goodbye</p>');
          resolve(undefined);
        }, 50);
      });
    });
  });

  describe('variable injection', () => {
    it('should inject variables using {{ variable }} syntax', () => {
      container.innerHTML = '<div id="app"><div id="target"></div></div>';
      
      weave('#app', ({ $, ref }) => {
        const name = ref('Alice');
        
        $('#target').template({
          source: '<p>Hello {{ name }}</p>',
          vars: () => ({ name: name.value })
        });
      });
      
      const target = container.querySelector('#target');
      expect(target?.innerHTML).toBe('<p>Hello Alice</p>');
    });

    it('should update when variables change', () => {
      container.innerHTML = '<div id="app"><div id="target"></div></div>';
      
      weave('#app', ({ $, ref }) => {
        const name = ref('Alice');
        
        $('#target').template({
          source: () => '<p>Hello {{ name }}</p>',
          vars: () => ({ name: name.value })
        });
        
        setTimeout(() => {
          name.value = 'Bob';
        }, 10);
      });
      
      const target = container.querySelector('#target');
      expect(target?.innerHTML).toBe('<p>Hello Alice</p>');
      
      return new Promise(resolve => {
        setTimeout(() => {
          expect(target?.innerHTML).toBe('<p>Hello Bob</p>');
          resolve(undefined);
        }, 50);
      });
    });
  });

  describe('sibling template reference', () => {
    it('should find and use sibling template element', () => {
      container.innerHTML = `
        <div id="app">
          <template data-ref="myTemplate">
            <p>Template content</p>
          </template>
          <div id="target"></div>
        </div>
      `;
      
      weave('#app', ({ $ }) => {
        $('#target').template({
          source: 'myTemplate'
        });
      });
      
      const target = container.querySelector('#target');
      expect(target?.innerHTML.trim()).toBe('<p>Template content</p>');
    });

    it('should inject variables into sibling template', () => {
      container.innerHTML = `
        <div id="app">
          <template data-ref="myTemplate">
            <p>Hello {{ name }}</p>
          </template>
          <div id="target"></div>
        </div>
      `;
      
      weave('#app', ({ $, ref }) => {
        const name = ref('Charlie');
        
        $('#target').template({
          source: 'myTemplate',
          vars: () => ({ name: name.value })
        });
      });
      
      const target = container.querySelector('#target');
      expect(target?.innerHTML.trim()).toBe('<p>Hello Charlie</p>');
    });
  });
});
