import { describe, it, expect } from 'vitest';
import { parseConfig, parseConfigWithSchema } from './parser';

describe('parser utilities', () => {
  describe('parseConfig', () => {
    it('parses valid JSON', () => {
      const result = parseConfig('{"name":"test","count":42}');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test', count: 42 });
      expect(result.error).toBeUndefined();
    });

    it('parses arrays', () => {
      const result = parseConfig('[1,2,3]');
      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
    });

    it('returns error for invalid JSON', () => {
      const result = parseConfig('{invalid json}');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
    });

    it('returns error for empty string', () => {
      const result = parseConfig('');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('parseConfigWithSchema', () => {
    it('validates with custom validator returning true', () => {
      const validator = (data: any): data is { name: string } =>
        typeof data === 'object' && typeof data.name === 'string';

      const result = parseConfigWithSchema('{"name":"test"}', validator);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test' });
    });

    it('fails when validator returns false', () => {
      const validator = (data: any): data is { count: number } =>
        typeof data === 'object' && typeof data.count === 'number';

      const result = parseConfigWithSchema('{"name":"test"}', validator);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Data does not match expected schema');
    });

    it('works without validator (passthrough)', () => {
      const result = parseConfigWithSchema('{"key":"value"}');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ key: 'value' });
    });

    it('returns parse error when JSON is invalid', () => {
      const validator = (data: any): data is any => true;
      const result = parseConfigWithSchema('not json', validator);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
