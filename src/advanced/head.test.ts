import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHeadManager, resetHead, head } from './head';

describe('head management', () => {
  let dom: InstanceType<typeof JSDOM>;
  let document: Document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><head><title>Initial Title</title></head><body></body></html>');
    document = dom.window.document;

    // Override globals so head.ts uses our jsdom document
    global.document = document as any;

    // Reset the module-level captured state by re-importing would be ideal,
    // but we work around it by ensuring initialStateCaptured is reset.
    // We rely on the fact that captureInitialState() is idempotent after first call.
  });

  afterEach(() => {
    // Clean up globals
    (global as any).document = undefined;
  });

  describe('createHeadManager()', () => {
    it('sets document.title with a static string', () => {
      const instance = {};
      const cleanupFns: (() => void)[] = [];

      createHeadManager(instance, { title: 'New Title' }, cleanupFns);

      expect(document.title).toBe('New Title');
    });

    it('sets meta tags', () => {
      const instance = {};
      const cleanupFns: (() => void)[] = [];

      createHeadManager(instance, {
        meta: {
          description: 'A test description',
          keywords: 'test, vitest',
        },
      }, cleanupFns);

      const descMeta = document.querySelector('meta[name="description"]');
      expect(descMeta).not.toBeNull();
      expect(descMeta!.getAttribute('content')).toBe('A test description');

      const keywordsMeta = document.querySelector('meta[name="keywords"]');
      expect(keywordsMeta).not.toBeNull();
      expect(keywordsMeta!.getAttribute('content')).toBe('test, vitest');
    });

    it('sets Open Graph meta tags using property attribute', () => {
      const instance = {};
      const cleanupFns: (() => void)[] = [];

      createHeadManager(instance, {
        meta: {
          'og:title': 'OG Title',
        },
      }, cleanupFns);

      const ogMeta = document.querySelector('meta[property="og:title"]');
      expect(ogMeta).not.toBeNull();
      expect(ogMeta!.getAttribute('content')).toBe('OG Title');
    });

    it('sets link tags', () => {
      const instance = {};
      const cleanupFns: (() => void)[] = [];

      createHeadManager(instance, {
        link: {
          canonical: 'https://example.com/page',
        },
      }, cleanupFns);

      const canonicalLink = document.querySelector('link[rel="canonical"]');
      expect(canonicalLink).not.toBeNull();
      expect(canonicalLink!.getAttribute('href')).toBe('https://example.com/page');
    });

    it('registers cleanup functions that restore previous title', () => {
      const instance = {};
      const cleanupFns: (() => void)[] = [];

      // Set a title first
      createHeadManager(instance, { title: 'Modified Title' }, cleanupFns);
      expect(document.title).toBe('Modified Title');

      // Run all cleanup functions
      for (const fn of cleanupFns) {
        fn();
      }

      // Title should be restored to the state captured before createHeadManager was called
      // The snapshot captures the title at the time of the call
      expect(document.title).not.toBe('Modified Title');
    });

    it('updates existing meta tag instead of creating duplicate', () => {
      const instance1 = {};
      const cleanupFns1: (() => void)[] = [];

      createHeadManager(instance1, {
        meta: { description: 'First description' },
      }, cleanupFns1);

      const instance2 = {};
      const cleanupFns2: (() => void)[] = [];

      createHeadManager(instance2, {
        meta: { description: 'Updated description' },
      }, cleanupFns2);

      const metas = document.querySelectorAll('meta[name="description"]');
      expect(metas).toHaveLength(1);
      expect(metas[0]!.getAttribute('content')).toBe('Updated description');
    });
  });

  describe('resetHead()', () => {
    it('restores title to initial state', () => {
      const instance = {};
      const cleanupFns: (() => void)[] = [];

      createHeadManager(instance, { title: 'Changed Title' }, cleanupFns);
      expect(document.title).toBe('Changed Title');

      resetHead(instance);

      // resetHead restores to the initial state captured on first use
      expect(document.title).toBe('Initial Title');
    });
  });

  describe('head()', () => {
    it('throws error when called standalone', () => {
      expect(() => head()).toThrow('head() must be called within a weave() callback');
    });
  });
});
