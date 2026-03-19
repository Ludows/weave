/**
 * Tests for on() and off() on NodeRef — chainable event handling
 */

import { JSDOM } from 'jsdom';
import { beforeEach, describe, expect, it } from 'vitest';
import { NodeRef } from './node-ref';

describe('NodeRef on() / off()', () => {
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

  it('on() attaches an event listener', () => {
    const btn = document.createElement('button');
    btn.id = 'btn';
    root.appendChild(btn);

    let clicked = false;

    new NodeRef('#btn', root).on('click', () => { clicked = true; });

    btn.dispatchEvent(new dom.window.Event('click', { bubbles: true }));

    expect(clicked).toBe(true);
  });

  it('on() returns this for chaining', () => {
    const btn = document.createElement('button');
    btn.id = 'chain-btn';
    root.appendChild(btn);

    const nodeRef = new NodeRef('#chain-btn', root);
    const result = nodeRef.on('click', () => {});

    expect(result).toBe(nodeRef);
  });

  it('on() can chain multiple event types', () => {
    const input = document.createElement('input');
    input.id = 'multi';
    root.appendChild(input);

    const events: string[] = [];

    new NodeRef('#multi', root)
      .on('focus', () => events.push('focus'))
      .on('blur', () => events.push('blur'));

    input.dispatchEvent(new dom.window.Event('focus'));
    input.dispatchEvent(new dom.window.Event('blur'));

    expect(events).toEqual(['focus', 'blur']);
  });

  it('on() can chain with other NodeRef methods', () => {
    const div = document.createElement('div');
    div.id = 'chain-mix';
    root.appendChild(div);

    let clicked = false;

    new NodeRef('#chain-mix', root)
      .text('Hello')
      .on('click', () => { clicked = true; })
      .addClass('active');

    expect(div.textContent).toBe('Hello');
    expect(div.classList.contains('active')).toBe(true);

    div.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
    expect(clicked).toBe(true);
  });

  it('off() removes the event listener', () => {
    const btn = document.createElement('button');
    btn.id = 'off-btn';
    root.appendChild(btn);

    let count = 0;
    const handler = () => { count++; };

    const nodeRef = new NodeRef('#off-btn', root);
    nodeRef.on('click', handler);

    btn.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
    expect(count).toBe(1);

    nodeRef.off('click', handler);

    btn.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
    expect(count).toBe(1); // Should not increment
  });

  it('off() returns this for chaining', () => {
    const btn = document.createElement('button');
    btn.id = 'off-chain';
    root.appendChild(btn);

    const nodeRef = new NodeRef('#off-chain', root);
    const result = nodeRef.off('click', () => {});

    expect(result).toBe(nodeRef);
  });

  it('event handler receives the Event object', () => {
    const btn = document.createElement('button');
    btn.id = 'evt-obj';
    root.appendChild(btn);

    let receivedEvent: Event | null = null;

    new NodeRef('#evt-obj', root).on('click', (e) => { receivedEvent = e; });

    btn.dispatchEvent(new dom.window.Event('click', { bubbles: true }));

    expect(receivedEvent).toBeInstanceOf(dom.window.Event);
    expect(receivedEvent!.type).toBe('click');
  });

  it('supports multiple handlers on the same event', () => {
    const btn = document.createElement('button');
    btn.id = 'multi-handler';
    root.appendChild(btn);

    const calls: number[] = [];

    new NodeRef('#multi-handler', root)
      .on('click', () => calls.push(1))
      .on('click', () => calls.push(2));

    btn.dispatchEvent(new dom.window.Event('click', { bubbles: true }));

    expect(calls).toEqual([1, 2]);
  });
});
