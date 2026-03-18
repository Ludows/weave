import { JSDOM } from 'jsdom';
import { beforeEach, describe, expect, it } from 'vitest';
import { initCloak } from './cloak';

describe('initCloak()', () => {
  let document: Document;
  let root: HTMLElement;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
    root = document.createElement('div');
    document.body.appendChild(root);
    global.document = document as any;
  });

  it('removes weave-cloak from the root element', () => {
    root.setAttribute('weave-cloak', '');
    initCloak(root);
    expect(root.hasAttribute('weave-cloak')).toBe(false);
  });

  it('removes weave-cloak from all child elements', () => {
    const child1 = document.createElement('div');
    const child2 = document.createElement('span');
    child1.setAttribute('weave-cloak', '');
    child2.setAttribute('weave-cloak', '');
    root.appendChild(child1);
    root.appendChild(child2);

    initCloak(root);

    expect(child1.hasAttribute('weave-cloak')).toBe(false);
    expect(child2.hasAttribute('weave-cloak')).toBe(false);
  });

  it('removes weave-cloak from deeply nested elements', () => {
    const parent = document.createElement('div');
    const child = document.createElement('div');
    const grandchild = document.createElement('span');
    grandchild.setAttribute('weave-cloak', '');
    parent.appendChild(child);
    child.appendChild(grandchild);
    root.appendChild(parent);

    initCloak(root);

    expect(grandchild.hasAttribute('weave-cloak')).toBe(false);
  });

  it('does nothing when no weave-cloak attributes are present', () => {
    const child = document.createElement('div');
    root.appendChild(child);

    expect(() => initCloak(root)).not.toThrow();
    expect(root.hasAttribute('weave-cloak')).toBe(false);
  });

  it('only removes weave-cloak, not other attributes', () => {
    root.setAttribute('weave-cloak', '');
    root.setAttribute('data-id', '42');
    root.setAttribute('class', 'app');

    initCloak(root);

    expect(root.hasAttribute('weave-cloak')).toBe(false);
    expect(root.getAttribute('data-id')).toBe('42');
    expect(root.getAttribute('class')).toBe('app');
  });
});
