import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMutationObserver,
  createContainerObserver,
  createAttributeObserver,
  createTextObserver,
  disconnectObserver,
  setInternalUpdate,
  isInternalUpdate,
} from './mutation-observer';

describe('mutation-observer utilities', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    setInternalUpdate(false);
  });

  afterEach(() => {
    document.body.removeChild(container);
    setInternalUpdate(false);
  });

  describe('setInternalUpdate / isInternalUpdate', () => {
    it('defaults to false', () => {
      expect(isInternalUpdate()).toBe(false);
    });

    it('toggles the internal update flag', () => {
      setInternalUpdate(true);
      expect(isInternalUpdate()).toBe(true);
      setInternalUpdate(false);
      expect(isInternalUpdate()).toBe(false);
    });
  });

  describe('createMutationObserver', () => {
    it('creates an observer and observes the element', async () => {
      const callback = vi.fn();
      const observer = createMutationObserver(container, callback, { childList: true });

      container.appendChild(document.createElement('span'));

      // MutationObserver callbacks are async microtasks
      await new Promise(r => setTimeout(r, 0));

      expect(callback).toHaveBeenCalled();
      observer.disconnect();
    });

    it('skips callback during internal updates', async () => {
      const callback = vi.fn();
      const observer = createMutationObserver(container, callback, { childList: true });

      setInternalUpdate(true);
      container.appendChild(document.createElement('span'));

      await new Promise(r => setTimeout(r, 0));

      expect(callback).not.toHaveBeenCalled();
      observer.disconnect();
    });
  });

  describe('createContainerObserver', () => {
    it('observes childList changes', async () => {
      const callback = vi.fn();
      const observer = createContainerObserver(container, callback);

      container.appendChild(document.createElement('div'));

      await new Promise(r => setTimeout(r, 0));

      expect(callback).toHaveBeenCalled();
      observer.disconnect();
    });
  });

  describe('createAttributeObserver', () => {
    it('observes attribute changes', async () => {
      const callback = vi.fn();
      const observer = createAttributeObserver(container, callback);

      container.setAttribute('data-test', 'value');

      await new Promise(r => setTimeout(r, 0));

      expect(callback).toHaveBeenCalled();
      observer.disconnect();
    });

    it('supports attributeFilter', async () => {
      const callback = vi.fn();
      const observer = createAttributeObserver(container, callback, ['data-tracked']);

      container.setAttribute('data-tracked', 'yes');
      container.setAttribute('data-ignored', 'no');

      await new Promise(r => setTimeout(r, 0));

      // Should have been called for data-tracked, the filtered attribute
      expect(callback).toHaveBeenCalled();
      // All calls should only contain mutations for data-tracked
      const allMutations = callback.mock.calls.flatMap((call: any) => call[0]);
      const attributeNames = allMutations.map((m: MutationRecord) => m.attributeName);
      expect(attributeNames).toContain('data-tracked');
      expect(attributeNames).not.toContain('data-ignored');

      observer.disconnect();
    });
  });

  describe('createTextObserver', () => {
    it('observes text content changes via childList', async () => {
      const callback = vi.fn();
      const observer = createTextObserver(container, callback);

      container.textContent = 'Hello world';

      await new Promise(r => setTimeout(r, 0));

      expect(callback).toHaveBeenCalled();
      observer.disconnect();
    });
  });

  describe('disconnectObserver', () => {
    it('disconnects the observer', () => {
      const callback = vi.fn();
      const observer = createMutationObserver(container, callback, { childList: true });
      const disconnectSpy = vi.spyOn(observer, 'disconnect');

      disconnectObserver(observer);

      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('handles null safely', () => {
      expect(() => disconnectObserver(null)).not.toThrow();
    });

    it('handles undefined safely', () => {
      expect(() => disconnectObserver(undefined)).not.toThrow();
    });
  });
});
