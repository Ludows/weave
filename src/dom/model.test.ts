/**
 * Tests for the model() directive — two-way binding
 */

import { JSDOM } from 'jsdom';
import { beforeEach, describe, expect, it } from 'vitest';
import { ref } from '../reactive/ref';
import { NodeRef } from './node-ref';

describe('model() directive', () => {
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
  });

  // ── text input ────────────────────────────────────────────────────────

  it('sets initial input value from ref', () => {
    const input = document.createElement('input');
    input.id = 'i1';
    root.appendChild(input);

    const name = ref('hello');
    new NodeRef('#i1', root).model(name);

    expect(input.value).toBe('hello');
  });

  it('updates input when ref changes', () => {
    const input = document.createElement('input');
    input.id = 'i2';
    root.appendChild(input);

    const name = ref('initial');
    new NodeRef('#i2', root).model(name);

    name.value = 'updated';

    expect(input.value).toBe('updated');
  });

  it('updates ref when input fires an input event', () => {
    const input = document.createElement('input');
    input.id = 'i3';
    root.appendChild(input);

    const name = ref('');
    new NodeRef('#i3', root).model(name);

    input.value = 'typed';
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

    expect(name.value).toBe('typed');
  });

  it('updates ref on change event', () => {
    const input = document.createElement('input');
    input.id = 'i4';
    root.appendChild(input);

    const name = ref('');
    new NodeRef('#i4', root).model(name);

    input.value = 'selected';
    input.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    expect(name.value).toBe('selected');
  });

  // ── textarea ──────────────────────────────────────────────────────────

  it('works with textarea', () => {
    const ta = document.createElement('textarea');
    ta.id = 'ta';
    root.appendChild(ta);

    const text = ref('hello textarea');
    new NodeRef('#ta', root).model(text);

    expect(ta.value).toBe('hello textarea');

    text.value = 'updated';
    expect(ta.value).toBe('updated');
  });

  // ── select ────────────────────────────────────────────────────────────

  it('works with select', () => {
    const sel = document.createElement('select');
    sel.id = 'sel';
    const opt1 = document.createElement('option');
    opt1.value = 'a';
    const opt2 = document.createElement('option');
    opt2.value = 'b';
    sel.appendChild(opt1);
    sel.appendChild(opt2);
    root.appendChild(sel);

    const choice = ref('b');
    new NodeRef('#sel', root).model(choice);

    expect(sel.value).toBe('b');
  });

  // ── checkbox ──────────────────────────────────────────────────────────

  it('sets initial checked state from ref for checkbox', () => {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = 'cb1';
    root.appendChild(cb);

    const isChecked = ref(true);
    new NodeRef('#cb1', root).model(isChecked);

    expect(cb.checked).toBe(true);
  });

  it('updates checkbox when ref changes', () => {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = 'cb2';
    root.appendChild(cb);

    const isChecked = ref(false);
    new NodeRef('#cb2', root).model(isChecked);

    expect(cb.checked).toBe(false);

    isChecked.value = true;

    expect(cb.checked).toBe(true);
  });

  it('updates ref when checkbox is toggled', () => {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = 'cb3';
    root.appendChild(cb);

    const isChecked = ref(false);
    new NodeRef('#cb3', root).model(isChecked);

    cb.checked = true;
    cb.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    expect(isChecked.value).toBe(true);

    cb.checked = false;
    cb.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    expect(isChecked.value).toBe(false);
  });

  // ── radio ─────────────────────────────────────────────────────────────

  it('sets initial checked state from ref for radio', () => {
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.id = 'r1';
    root.appendChild(radio);

    const isSelected = ref(true);
    new NodeRef('#r1', root).model(isSelected);

    expect(radio.checked).toBe(true);
  });

  it('updates ref when radio is selected', () => {
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.id = 'r2';
    root.appendChild(radio);

    const isSelected = ref(false);
    new NodeRef('#r2', root).model(isSelected);

    radio.checked = true;
    radio.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    expect(isSelected.value).toBe(true);
  });

  // ── error handling ────────────────────────────────────────────────────

  it('throws on non-input elements', () => {
    const div = document.createElement('div');
    div.id = 'err';
    root.appendChild(div);

    expect(() => new NodeRef('#err', root).model(ref('x'))).toThrow(
      'model() can only be used on input, textarea, or select elements'
    );
  });

  // ── chaining ──────────────────────────────────────────────────────────

  it('returns this for chaining', () => {
    const input = document.createElement('input');
    input.id = 'chain';
    root.appendChild(input);

    const nodeRef = new NodeRef('#chain', root);
    const result = nodeRef.model(ref(''));

    expect(result).toBe(nodeRef);
  });
});
