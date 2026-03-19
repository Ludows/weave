import { describe, it, expect } from 'vitest';
import { prettyPrint, serialize } from './pretty-printer';

describe('pretty-printer utilities', () => {
  describe('prettyPrint', () => {
    it('formats object as JSON with default indent (2)', () => {
      const state = { name: 'test', count: 5 };
      const result = prettyPrint(state);
      expect(result).toBe(JSON.stringify(state, null, 2));
    });

    it('uses custom indent', () => {
      const state = { a: 1 };
      const result = prettyPrint(state, { indent: 4 });
      expect(result).toBe(JSON.stringify({ a: 1 }, null, 4));
    });

    it('includes computed properties when includeComputed is true', () => {
      const state = {
        count: 10,
        double: () => 20,
      };
      const result = prettyPrint(state, { includeComputed: true });
      const parsed = JSON.parse(result);
      expect(parsed.count).toBe(10);
      expect(parsed.double).toBe(20);
    });

    it('excludes computed properties when includeComputed is false', () => {
      const state = {
        count: 10,
        double: () => 20,
      };
      const result = prettyPrint(state, { includeComputed: false });
      const parsed = JSON.parse(result);
      expect(parsed.count).toBe(10);
      expect(parsed).not.toHaveProperty('double');
    });

    it('skips functions that throw', () => {
      const state = {
        name: 'test',
        broken: () => { throw new Error('fail'); },
      };
      const result = prettyPrint(state, { includeComputed: true });
      const parsed = JSON.parse(result);
      expect(parsed.name).toBe('test');
      expect(parsed).not.toHaveProperty('broken');
    });
  });

  describe('serialize', () => {
    it('returns compact JSON (no whitespace)', () => {
      const state = { a: 1, b: 'hello' };
      const result = serialize(state);
      // indent: 0 produces JSON.stringify(obj, null, 0) which has no extra whitespace
      expect(result).toBe(JSON.stringify({ a: 1, b: 'hello' }, null, 0));
    });
  });
});
