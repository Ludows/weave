import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventDelegator, createEventDelegator } from './event-delegation';

describe('EventDelegator', () => {
  let root: HTMLDivElement;
  let delegator: EventDelegator;

  beforeEach(() => {
    root = document.createElement('div');
    root.innerHTML = '<button class="btn">Click</button><span class="label">Label</span>';
    document.body.appendChild(root);
    delegator = new EventDelegator(root);
  });

  afterEach(() => {
    delegator.destroy();
    document.body.removeChild(root);
  });

  describe('on()', () => {
    it('registers event listener on root for CSS selectors', () => {
      const handler = vi.fn();
      delegator.on('click', '.btn', handler);

      const btn = root.querySelector('.btn')!;
      btn.dispatchEvent(new Event('click', { bubbles: true }));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('handles document special target', () => {
      const handler = vi.fn();
      delegator.on('click', document, handler);

      document.dispatchEvent(new Event('click'));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('handles window special target', () => {
      const handler = vi.fn();
      delegator.on('resize', window, handler);

      window.dispatchEvent(new Event('resize'));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('checks target.matches and bubbles up to parent', () => {
      root.innerHTML = '<div class="parent"><span class="child">text</span></div>';
      const handler = vi.fn();
      delegator.on('click', '.parent', handler);

      const child = root.querySelector('.child')!;
      child.dispatchEvent(new Event('click', { bubbles: true }));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('does not fire handler when selector does not match', () => {
      const handler = vi.fn();
      delegator.on('click', '.nonexistent', handler);

      const btn = root.querySelector('.btn')!;
      btn.dispatchEvent(new Event('click', { bubbles: true }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('returns an unlisten function', () => {
      const handler = vi.fn();
      const unlisten = delegator.on('click', '.btn', handler);

      unlisten();

      const btn = root.querySelector('.btn')!;
      btn.dispatchEvent(new Event('click', { bubbles: true }));

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('off()', () => {
    it('removes all listeners when called with no args', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      delegator.on('click', '.btn', handler1);
      delegator.on('mouseover', '.label', handler2);

      delegator.off();

      const btn = root.querySelector('.btn')!;
      btn.dispatchEvent(new Event('click', { bubbles: true }));
      const label = root.querySelector('.label')!;
      label.dispatchEvent(new Event('mouseover', { bubbles: true }));

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('removes matching listeners by event name', () => {
      const clickHandler = vi.fn();
      const mouseHandler = vi.fn();
      delegator.on('click', '.btn', clickHandler);
      delegator.on('mouseover', '.btn', mouseHandler);

      delegator.off('click');

      const btn = root.querySelector('.btn')!;
      btn.dispatchEvent(new Event('click', { bubbles: true }));
      btn.dispatchEvent(new Event('mouseover', { bubbles: true }));

      expect(clickHandler).not.toHaveBeenCalled();
      expect(mouseHandler).toHaveBeenCalledOnce();
    });

    it('removes specific listeners by event + selector', () => {
      const btnHandler = vi.fn();
      const labelHandler = vi.fn();
      delegator.on('click', '.btn', btnHandler);
      delegator.on('click', '.label', labelHandler);

      delegator.off('click', '.btn');

      const btn = root.querySelector('.btn')!;
      btn.dispatchEvent(new Event('click', { bubbles: true }));
      const label = root.querySelector('.label')!;
      label.dispatchEvent(new Event('click', { bubbles: true }));

      expect(btnHandler).not.toHaveBeenCalled();
      expect(labelHandler).toHaveBeenCalledOnce();
    });

    it('removes exact match by event + selector + handler', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      delegator.on('click', '.btn', handler1);
      delegator.on('click', '.btn', handler2);

      delegator.off('click', '.btn', handler1);

      const btn = root.querySelector('.btn')!;
      btn.dispatchEvent(new Event('click', { bubbles: true }));

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledOnce();
    });
  });

  describe('destroy()', () => {
    it('removes all listeners', () => {
      const handler = vi.fn();
      delegator.on('click', '.btn', handler);

      delegator.destroy();

      const btn = root.querySelector('.btn')!;
      btn.dispatchEvent(new Event('click', { bubbles: true }));

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('createEventDelegator()', () => {
    it('creates an EventDelegator instance', () => {
      const d = createEventDelegator(root);
      expect(d).toBeInstanceOf(EventDelegator);
      d.destroy();
    });
  });
});
