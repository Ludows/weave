/**
 * Tests for the for() directive — dynamic list rendering
 */

import { JSDOM } from 'jsdom';
import { beforeEach, describe, expect, it } from 'vitest';
import { createReactiveEffect, runEffect } from '../core/dependency-tracker';
import { ref } from '../reactive/ref';
import { NodeRef } from './node-ref';

describe('for() directive', () => {
  let dom: JSDOM;
  let document: Document;
  let root: HTMLElement;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
    root = document.createElement('div');
    document.body.appendChild(root);
    global.document = document as any;
    global.HTMLInputElement = dom.window.HTMLInputElement as any;
    global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement as any;
    global.HTMLSelectElement = dom.window.HTMLSelectElement as any;
    global.MutationObserver = dom.window.MutationObserver as any;
  });

  it('renders one element per static item using the template child', () => {
    const list = document.createElement('ul');
    list.id = 'list';
    const templateLi = document.createElement('li');
    templateLi.textContent = 'template';
    list.appendChild(templateLi);
    root.appendChild(list);

    const items = ['Apple', 'Banana', 'Cherry'];

    new NodeRef('#list', root).for(items, (item, _index, _ctx) => {
      // The callback receives each item — we can't easily set text on
      // the cloned element without a reference, but the element is created.
    });

    // 3 items → 3 <li> children (the template was removed)
    expect(list.children.length).toBe(3);
  });

  it('removes the template child from the DOM', () => {
    const list = document.createElement('ul');
    list.id = 'rm-tpl';
    const tpl = document.createElement('li');
    tpl.className = 'template';
    list.appendChild(tpl);
    root.appendChild(list);

    new NodeRef('#rm-tpl', root).for([], () => {});

    // Empty array → no children, template is removed
    expect(list.children.length).toBe(0);
  });

  it('adds items when reactive array grows', () => {
    const list = document.createElement('ul');
    list.id = 'reactive-grow';
    const tpl = document.createElement('li');
    list.appendChild(tpl);
    root.appendChild(list);

    const items = ref<string[]>(['a']);

    new NodeRef('#reactive-grow', root).for(() => items.value, () => {});

    expect(list.children.length).toBe(1);

    items.value = ['a', 'b', 'c'];

    expect(list.children.length).toBe(3);
  });

  it('removes items when reactive array shrinks', () => {
    const list = document.createElement('ul');
    list.id = 'reactive-shrink';
    const tpl = document.createElement('li');
    list.appendChild(tpl);
    root.appendChild(list);

    const items = ref(['x', 'y', 'z']);

    new NodeRef('#reactive-shrink', root).for(() => items.value, () => {});

    expect(list.children.length).toBe(3);

    items.value = ['x'];

    expect(list.children.length).toBe(1);
  });

  it('handles complete array replacement', () => {
    const list = document.createElement('ul');
    list.id = 'replace';
    const tpl = document.createElement('li');
    list.appendChild(tpl);
    root.appendChild(list);

    const items = ref(['old1', 'old2']);

    new NodeRef('#replace', root).for(() => items.value, () => {});

    expect(list.children.length).toBe(2);

    items.value = ['new1', 'new2', 'new3'];

    expect(list.children.length).toBe(3);
  });

  it('handles empty array', () => {
    const list = document.createElement('ul');
    list.id = 'empty';
    const tpl = document.createElement('li');
    list.appendChild(tpl);
    root.appendChild(list);

    const items = ref<string[]>([]);

    new NodeRef('#empty', root).for(() => items.value, () => {});

    expect(list.children.length).toBe(0);

    items.value = ['a'];
    expect(list.children.length).toBe(1);

    items.value = [];
    expect(list.children.length).toBe(0);
  });

  it('calls the callback with correct item and index', () => {
    const list = document.createElement('ul');
    list.id = 'cb';
    const tpl = document.createElement('li');
    list.appendChild(tpl);
    root.appendChild(list);

    const received: Array<{ item: string; index: number }> = [];

    new NodeRef('#cb', root).for(['a', 'b', 'c'], (item, index) => {
      received.push({ item, index });
    });

    expect(received).toEqual([
      { item: 'a', index: 0 },
      { item: 'b', index: 1 },
      { item: 'c', index: 2 },
    ]);
  });

  it('ForContext.index() returns correct index', () => {
    const list = document.createElement('ul');
    list.id = 'idx';
    const tpl = document.createElement('li');
    list.appendChild(tpl);
    root.appendChild(list);

    const indices: number[] = [];

    new NodeRef('#idx', root).for(['a', 'b'], (_item, _index, ctx) => {
      indices.push(ctx.index());
    });

    expect(indices).toEqual([0, 1]);
  });

  it('does not re-render existing items when array grows', () => {
    const list = document.createElement('ul');
    list.id = 'no-rerender';
    const tpl = document.createElement('li');
    list.appendChild(tpl);
    root.appendChild(list);

    const items = ref(['a', 'b']);
    let callCount = 0;

    new NodeRef('#no-rerender', root).for(() => items.value, () => {
      callCount++;
    });

    expect(callCount).toBe(2);

    items.value = ['a', 'b', 'c'];

    // Only the new item 'c' should trigger a callback — not 'a' and 'b' again
    expect(callCount).toBe(3);
  });

  it('works with object items', () => {
    const list = document.createElement('ul');
    list.id = 'objects';
    const tpl = document.createElement('li');
    list.appendChild(tpl);
    root.appendChild(list);

    const alice = { id: 1, name: 'Alice' };
    const bob = { id: 2, name: 'Bob' };

    const received: string[] = [];

    new NodeRef('#objects', root).for([alice, bob], (item) => {
      received.push(item.name);
    });

    expect(received).toEqual(['Alice', 'Bob']);
    expect(list.children.length).toBe(2);
  });

  it('returns this for chaining', () => {
    const list = document.createElement('ul');
    list.id = 'chain';
    const tpl = document.createElement('li');
    list.appendChild(tpl);
    root.appendChild(list);

    const nodeRef = new NodeRef('#chain', root);
    const result = nodeRef.for([], () => {});

    expect(result).toBe(nodeRef);
  });
});
