import { describe, it, expect, beforeEach } from 'vitest';
import { isAriaAttribute, preserveAriaAttributes } from './accessibility';

describe('accessibility utilities', () => {
  describe('isAriaAttribute', () => {
    it('returns true for aria-* attributes', () => {
      expect(isAriaAttribute('aria-label')).toBe(true);
      expect(isAriaAttribute('aria-hidden')).toBe(true);
      expect(isAriaAttribute('aria-live')).toBe(true);
      expect(isAriaAttribute('aria-describedby')).toBe(true);
    });

    it('returns true for "role"', () => {
      expect(isAriaAttribute('role')).toBe(true);
    });

    it('returns false for non-aria attributes', () => {
      expect(isAriaAttribute('class')).toBe(false);
      expect(isAriaAttribute('id')).toBe(false);
      expect(isAriaAttribute('data-value')).toBe(false);
      expect(isAriaAttribute('style')).toBe(false);
    });
  });

  describe('preserveAriaAttributes', () => {
    let element: HTMLDivElement;

    beforeEach(() => {
      element = document.createElement('div');
    });

    it('applies updates to the element', () => {
      preserveAriaAttributes(element, { 'data-test': 'hello', class: 'active' });

      expect(element.getAttribute('data-test')).toBe('hello');
      expect(element.getAttribute('class')).toBe('active');
    });

    it('preserves existing ARIA attributes not in updates', () => {
      element.setAttribute('aria-label', 'My Label');
      element.setAttribute('role', 'button');
      element.setAttribute('data-old', 'old-value');

      preserveAriaAttributes(element, { 'data-old': 'new-value' });

      expect(element.getAttribute('data-old')).toBe('new-value');
      expect(element.getAttribute('aria-label')).toBe('My Label');
      expect(element.getAttribute('role')).toBe('button');
    });

    it('allows overwriting ARIA attributes when included in updates', () => {
      element.setAttribute('aria-label', 'Old Label');

      preserveAriaAttributes(element, { 'aria-label': 'New Label' });

      expect(element.getAttribute('aria-label')).toBe('New Label');
    });
  });
});
