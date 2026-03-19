import { JSDOM } from 'jsdom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NodeRef } from './node-ref';

describe('Event modifiers on NodeRef.on()', () => {
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

  it('.prevent calls preventDefault', () => {
    const btn = document.createElement('button');
    btn.id = 'prev';
    root.appendChild(btn);

    const handler = vi.fn();
    new NodeRef('#prev', root).on('click.prevent', handler);

    const event = new dom.window.Event('click', { bubbles: true, cancelable: true });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    btn.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
    expect(preventSpy).toHaveBeenCalled();
  });

  it('.stop calls stopPropagation', () => {
    const btn = document.createElement('button');
    btn.id = 'stop';
    root.appendChild(btn);

    const handler = vi.fn();
    new NodeRef('#stop', root).on('click.stop', handler);

    const event = new dom.window.Event('click', { bubbles: true });
    const stopSpy = vi.spyOn(event, 'stopPropagation');
    btn.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
    expect(stopSpy).toHaveBeenCalled();
  });

  it('.once only fires handler once', () => {
    const btn = document.createElement('button');
    btn.id = 'once';
    root.appendChild(btn);

    const handler = vi.fn();
    new NodeRef('#once', root).on('click.once', handler);

    btn.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
    btn.dispatchEvent(new dom.window.Event('click', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('.self only fires if target equals currentTarget', () => {
    const div = document.createElement('div');
    div.id = 'self-parent';
    const child = document.createElement('span');
    div.appendChild(child);
    root.appendChild(div);

    const handler = vi.fn();
    new NodeRef('#self-parent', root).on('click.self', handler);

    // Click on child — should NOT fire
    child.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();

    // Click on div itself — should fire
    div.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('supports multiple modifiers', () => {
    const btn = document.createElement('button');
    btn.id = 'multi';
    root.appendChild(btn);

    const handler = vi.fn();
    new NodeRef('#multi', root).on('click.prevent.stop', handler);

    const event = new dom.window.Event('click', { bubbles: true, cancelable: true });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    const stopSpy = vi.spyOn(event, 'stopPropagation');
    btn.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
    expect(preventSpy).toHaveBeenCalled();
    expect(stopSpy).toHaveBeenCalled();
  });

  it('event without modifiers works normally', () => {
    const btn = document.createElement('button');
    btn.id = 'normal';
    root.appendChild(btn);

    const handler = vi.fn();
    new NodeRef('#normal', root).on('click', handler);

    btn.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
    btn.dispatchEvent(new dom.window.Event('click', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('$el getter returns the DOM element', () => {
    const btn = document.createElement('button');
    btn.id = 'el-test';
    root.appendChild(btn);

    const nodeRef = new NodeRef('#el-test', root);
    expect(nodeRef.el).toBe(btn);
  });
});
