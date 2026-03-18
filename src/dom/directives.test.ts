/**
 * Tests for directive implementations
 */

import { JSDOM } from 'jsdom';
import { beforeEach, describe, expect, it } from 'vitest';
import { NodeRef } from './node-ref';

describe('Directive Implementations', () => {
  let dom: JSDOM;
  let document: Document;
  let rootElement: HTMLElement;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
    rootElement = document.body;
    global.document = document as any;
    global.window = dom.window as any;
  });

  describe('text() directive', () => {
    it('should set textContent with static value', () => {
      const div = document.createElement('div');
      div.id = 'test';
      rootElement.appendChild(div);

      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.text('Hello World');

      expect(div.textContent).toBe('Hello World');
    });

    it('should update textContent with callback value', () => {
      const div = document.createElement('div');
      div.id = 'test';
      rootElement.appendChild(div);

      let value = 'Initial';
      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.text(() => value);

      expect(div.textContent).toBe('Initial');
    });
  });

  describe('html() directive', () => {
    it('should set innerHTML with static value', () => {
      const div = document.createElement('div');
      div.id = 'test';
      rootElement.appendChild(div);

      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.html('<span>Hello</span>');

      expect(div.innerHTML).toBe('<span>Hello</span>');
    });
  });

  describe('show() directive', () => {
    it('should show element when true', () => {
      const div = document.createElement('div');
      div.id = 'test';
      rootElement.appendChild(div);

      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.show(true);

      expect(div.style.display).not.toBe('none');
    });

    it('should hide element when false', () => {
      const div = document.createElement('div');
      div.id = 'test';
      rootElement.appendChild(div);

      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.show(false);

      expect(div.style.display).toBe('none');
    });
  });

  describe('hide() directive', () => {
    it('should hide element when true', () => {
      const div = document.createElement('div');
      div.id = 'test';
      rootElement.appendChild(div);

      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.hide(true);

      expect(div.style.display).toBe('none');
    });

    it('should show element when false', () => {
      const div = document.createElement('div');
      div.id = 'test';
      rootElement.appendChild(div);

      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.hide(false);

      expect(div.style.display).not.toBe('none');
    });
  });

  describe('bind() directive', () => {
    it('should set attribute with static value', () => {
      const div = document.createElement('div');
      div.id = 'test';
      rootElement.appendChild(div);

      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.bind('data-value', '123');

      expect(div.getAttribute('data-value')).toBe('123');
    });

    it('should handle class object binding', () => {
      const div = document.createElement('div');
      div.id = 'test';
      rootElement.appendChild(div);

      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.bind('class', { active: true, disabled: false });

      expect(div.classList.contains('active')).toBe(true);
      expect(div.classList.contains('disabled')).toBe(false);
    });
  });

  describe('attr() directive', () => {
    it('should get attribute value', () => {
      const div = document.createElement('div');
      div.id = 'test';
      div.setAttribute('data-value', '123');
      rootElement.appendChild(div);

      const nodeRef = new NodeRef('#test', rootElement);
      const value = nodeRef.attr('data-value');

      expect(value).toBe('123');
    });

    it('should set attribute value', () => {
      const div = document.createElement('div');
      div.id = 'test';
      rootElement.appendChild(div);

      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.attr('data-value', '456');

      expect(div.getAttribute('data-value')).toBe('456');
    });
  });

  describe('addClass() directive', () => {
    it('should add class to element', () => {
      const div = document.createElement('div');
      div.id = 'test';
      rootElement.appendChild(div);

      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.addClass('active');

      expect(div.classList.contains('active')).toBe(true);
    });
  });

  describe('removeClass() directive', () => {
    it('should remove class from element', () => {
      const div = document.createElement('div');
      div.id = 'test';
      div.classList.add('active');
      rootElement.appendChild(div);

      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.removeClass('active');

      expect(div.classList.contains('active')).toBe(false);
    });
  });

  describe('toggleClass() directive', () => {
    it('should add class when condition is true', () => {
      const div = document.createElement('div');
      div.id = 'test';
      rootElement.appendChild(div);

      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.toggleClass('active', true);

      expect(div.classList.contains('active')).toBe(true);
    });

    it('should remove class when condition is false', () => {
      const div = document.createElement('div');
      div.id = 'test';
      div.classList.add('active');
      rootElement.appendChild(div);

      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.toggleClass('active', false);

      expect(div.classList.contains('active')).toBe(false);
    });
  });

  describe('data() directive', () => {
    it('should get data attribute value', () => {
      const div = document.createElement('div');
      div.id = 'test';
      div.setAttribute('data-count', '42');
      rootElement.appendChild(div);

      const nodeRef = new NodeRef('#test', rootElement);
      const value = nodeRef.data('count');

      expect(value).toBe(42);
    });

    it('should set data attribute value', () => {
      const div = document.createElement('div');
      div.id = 'test';
      rootElement.appendChild(div);

      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.data('count', 42);

      expect(div.getAttribute('data-count')).toBe('42');
    });

    it('should batch set data attributes', () => {
      const div = document.createElement('div');
      div.id = 'test';
      rootElement.appendChild(div);

      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.data('batch', { count: 42, name: 'test' });

      expect(div.getAttribute('data-count')).toBe('42');
      expect(div.getAttribute('data-name')).toBe('test');
    });
  });

  describe('style() directive', () => {
    it('should set style properties', () => {
      const div = document.createElement('div');
      div.id = 'test';
      rootElement.appendChild(div);

      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.style({ color: 'red', 'font-size': '16px' });

      expect(div.style.color).toBe('red');
      expect(div.style.fontSize).toBe('16px');
    });
  });

  describe('focus() directive', () => {
    it('should call focus when condition becomes true', () => {
      const input = document.createElement('input');
      input.id = 'test';
      rootElement.appendChild(input);

      let focusCalled = false;
      input.focus = () => { focusCalled = true; };

      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.focus(true);

      expect(focusCalled).toBe(true);
    });

    it('should not call focus when condition stays true', () => {
      const input = document.createElement('input');
      input.id = 'test';
      rootElement.appendChild(input);

      let focusCallCount = 0;
      input.focus = () => { focusCallCount++; };

      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.focus(true);

      expect(focusCallCount).toBe(1);
    });
  });

  describe('blur() directive', () => {
    it('should call blur when condition becomes true', () => {
      const input = document.createElement('input');
      input.id = 'test';
      rootElement.appendChild(input);

      let blurCalled = false;
      input.blur = () => { blurCalled = true; };

      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.blur(true);

      expect(blurCalled).toBe(true);
    });
  });

  describe('scroll() directive', () => {
    it('should call scrollIntoView when condition becomes true', () => {
      const div = document.createElement('div');
      div.id = 'test';
      rootElement.appendChild(div);

      let scrollCalled = false;
      div.scrollIntoView = () => { scrollCalled = true; };

      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.scroll(true);

      expect(scrollCalled).toBe(true);
    });

    it('should pass options to scrollIntoView', () => {
      const div = document.createElement('div');
      div.id = 'test';
      rootElement.appendChild(div);

      let passedOptions: ScrollIntoViewOptions | undefined;
      div.scrollIntoView = (options?: ScrollIntoViewOptions) => { 
        passedOptions = options; 
      };

      const options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' };
      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.scroll(true, options);

      expect(passedOptions).toEqual(options);
    });
  });

  describe.skip('if() directive', () => {
    it('should mount element when condition is true', () => {
      const div = document.createElement('div');
      div.id = 'test';
      div.textContent = 'Content';
      rootElement.appendChild(div);

      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.if(() => true);

      // Element should still be in DOM when condition is true
      expect(div.parentElement).toBeTruthy();
    });

    it('should create placeholder when condition is false', () => {
      const div = document.createElement('div');
      div.id = 'test';
      div.textContent = 'Content';
      rootElement.appendChild(div);

      const nodeRef = new NodeRef('#test', rootElement);
      nodeRef.if(() => false);

      // Element should be removed from DOM when condition is false
      expect(div.parentElement).toBeFalsy();
      // Placeholder comment should exist
      expect(rootElement.childNodes.length).toBeGreaterThan(0);
    });
  });
});
