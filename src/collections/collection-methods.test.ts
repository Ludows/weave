import { describe, expect, it } from 'vitest';
import { createCollectionMethods, createCollectionAccessor } from './collection-methods';

interface Person {
  name: string;
  age: number;
  active: boolean;
}

const sampleData: Person[] = [
  { name: 'Alice', age: 30, active: true },
  { name: 'Bob', age: 25, active: false },
  { name: 'Charlie', age: 35, active: true },
];

describe('createCollectionMethods()', () => {
  describe('where()', () => {
    it('filters items by predicate', () => {
      const methods = createCollectionMethods(sampleData);
      const result = methods.where(item => item.active);
      expect(result).toEqual([sampleData[0], sampleData[2]]);
    });

    it('returns empty array when no items match', () => {
      const methods = createCollectionMethods(sampleData);
      const result = methods.where(item => item.age > 100);
      expect(result).toEqual([]);
    });

    it('returns all items when all match', () => {
      const methods = createCollectionMethods(sampleData);
      const result = methods.where(item => item.age > 0);
      expect(result).toHaveLength(3);
    });
  });

  describe('find()', () => {
    it('finds the first matching item', () => {
      const methods = createCollectionMethods(sampleData);
      const result = methods.find(item => item.active);
      expect(result).toBe(sampleData[0]);
    });

    it('returns undefined when no item matches', () => {
      const methods = createCollectionMethods(sampleData);
      const result = methods.find(item => item.name === 'Zara');
      expect(result).toBeUndefined();
    });
  });

  describe('some()', () => {
    it('returns true if any item matches', () => {
      const methods = createCollectionMethods(sampleData);
      expect(methods.some(item => item.name === 'Bob')).toBe(true);
    });

    it('returns false if no item matches', () => {
      const methods = createCollectionMethods(sampleData);
      expect(methods.some(item => item.age > 100)).toBe(false);
    });
  });

  describe('every()', () => {
    it('returns true if all items match', () => {
      const methods = createCollectionMethods(sampleData);
      expect(methods.every(item => item.age > 20)).toBe(true);
    });

    it('returns false if any item does not match', () => {
      const methods = createCollectionMethods(sampleData);
      expect(methods.every(item => item.active)).toBe(false);
    });
  });

  describe('none()', () => {
    it('returns true if no items match', () => {
      const methods = createCollectionMethods(sampleData);
      expect(methods.none(item => item.age > 100)).toBe(true);
    });

    it('returns false if any item matches', () => {
      const methods = createCollectionMethods(sampleData);
      expect(methods.none(item => item.active)).toBe(false);
    });
  });

  describe('has()', () => {
    it('checks property existence when no value given', () => {
      const methods = createCollectionMethods(sampleData);
      expect(methods.has('name')).toBe(true);
      expect(methods.has('nonexistent')).toBe(false);
    });

    it('checks property value when value is given', () => {
      const methods = createCollectionMethods(sampleData);
      expect(methods.has('name', 'Alice')).toBe(true);
      expect(methods.has('name', 'Zara')).toBe(false);
    });

    it('checks boolean property values', () => {
      const methods = createCollectionMethods(sampleData);
      expect(methods.has('active', true)).toBe(true);
      expect(methods.has('active', false)).toBe(true);
    });
  });

  describe('sortBy()', () => {
    it('sorts items by a string property', () => {
      const methods = createCollectionMethods(sampleData);
      const sorted = methods.sortBy('name');
      expect(sorted.map(i => i.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('sorts items by a numeric property', () => {
      const methods = createCollectionMethods(sampleData);
      const sorted = methods.sortBy('age');
      expect(sorted.map(i => i.age)).toEqual([25, 30, 35]);
    });

    it('does not mutate the original array', () => {
      const items = [...sampleData];
      const methods = createCollectionMethods(items);
      methods.sortBy('age');
      expect(items[0]).toBe(sampleData[0]);
    });
  });

  describe('pluck()', () => {
    it('extracts property values from all items', () => {
      const methods = createCollectionMethods(sampleData);
      expect(methods.pluck('name')).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('extracts numeric values', () => {
      const methods = createCollectionMethods(sampleData);
      expect(methods.pluck('age')).toEqual([30, 25, 35]);
    });

    it('returns undefined for nonexistent properties', () => {
      const methods = createCollectionMethods(sampleData);
      expect(methods.pluck('missing')).toEqual([undefined, undefined, undefined]);
    });
  });

  describe('unique()', () => {
    it('deduplicates by reference', () => {
      const a = { name: 'Alice', age: 30, active: true };
      const items = [a, a, { name: 'Bob', age: 25, active: false }];
      const methods = createCollectionMethods(items);
      expect(methods.unique()).toHaveLength(2);
    });

    it('deduplicates by property value', () => {
      const items = [
        { name: 'Alice', age: 30, active: true },
        { name: 'Bob', age: 30, active: false },
        { name: 'Charlie', age: 35, active: true },
      ];
      const methods = createCollectionMethods(items);
      const result = methods.unique('age');
      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe('Alice');
      expect(result[1]!.name).toBe('Charlie');
    });

    it('returns all items when all are unique', () => {
      const methods = createCollectionMethods(sampleData);
      expect(methods.unique('name')).toHaveLength(3);
    });
  });

  describe('chunk()', () => {
    it('splits array into chunks of given size', () => {
      const methods = createCollectionMethods(sampleData);
      const chunks = methods.chunk(2);
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toHaveLength(2);
      expect(chunks[1]).toHaveLength(1);
    });

    it('returns a single chunk when size >= length', () => {
      const methods = createCollectionMethods(sampleData);
      const chunks = methods.chunk(10);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toHaveLength(3);
    });

    it('returns empty array for empty input', () => {
      const methods = createCollectionMethods([]);
      expect(methods.chunk(2)).toEqual([]);
    });
  });

  describe('shuffle()', () => {
    it('returns array with same length', () => {
      const methods = createCollectionMethods(sampleData);
      const shuffled = methods.shuffle();
      expect(shuffled).toHaveLength(sampleData.length);
    });

    it('contains the same items', () => {
      const methods = createCollectionMethods(sampleData);
      const shuffled = methods.shuffle();
      for (const item of sampleData) {
        expect(shuffled).toContain(item);
      }
    });

    it('does not mutate the original array', () => {
      const items = [...sampleData];
      const methods = createCollectionMethods(items);
      methods.shuffle();
      expect(items).toEqual(sampleData);
    });
  });

  describe('groupBy()', () => {
    it('groups items by a boolean property', () => {
      const methods = createCollectionMethods(sampleData);
      const groups = methods.groupBy('active');
      expect(groups['true']).toHaveLength(2);
      expect(groups['false']).toHaveLength(1);
    });

    it('groups items by a string property', () => {
      const methods = createCollectionMethods(sampleData);
      const groups = methods.groupBy('name');
      expect(Object.keys(groups)).toHaveLength(3);
      expect(groups['Alice']).toHaveLength(1);
    });
  });

  describe('sum()', () => {
    it('sums numeric property values', () => {
      const methods = createCollectionMethods(sampleData);
      expect(methods.sum('age')).toBe(90);
    });

    it('ignores non-numeric values', () => {
      const methods = createCollectionMethods(sampleData);
      expect(methods.sum('name')).toBe(0);
    });

    it('returns 0 for empty array', () => {
      const methods = createCollectionMethods([]);
      expect(methods.sum('age')).toBe(0);
    });
  });

  describe('min()', () => {
    it('finds minimum numeric value', () => {
      const methods = createCollectionMethods(sampleData);
      expect(methods.min('age')).toBe(25);
    });

    it('returns 0 for empty array', () => {
      const methods = createCollectionMethods([]);
      expect(methods.min('age')).toBe(0);
    });
  });

  describe('max()', () => {
    it('finds maximum numeric value', () => {
      const methods = createCollectionMethods(sampleData);
      expect(methods.max('age')).toBe(35);
    });

    it('returns 0 for empty array', () => {
      const methods = createCollectionMethods([]);
      expect(methods.max('age')).toBe(0);
    });
  });

  describe('count()', () => {
    it('returns the number of items', () => {
      const methods = createCollectionMethods(sampleData);
      expect(methods.count()).toBe(3);
    });

    it('returns 0 for empty array', () => {
      const methods = createCollectionMethods([]);
      expect(methods.count()).toBe(0);
    });
  });

  describe('first()', () => {
    it('returns the first item', () => {
      const methods = createCollectionMethods(sampleData);
      expect(methods.first()).toBe(sampleData[0]);
    });

    it('returns undefined for empty array', () => {
      const methods = createCollectionMethods([]);
      expect(methods.first()).toBeUndefined();
    });
  });

  describe('last()', () => {
    it('returns the last item', () => {
      const methods = createCollectionMethods(sampleData);
      expect(methods.last()).toBe(sampleData[2]);
    });

    it('returns undefined for empty array', () => {
      const methods = createCollectionMethods([]);
      expect(methods.last()).toBeUndefined();
    });
  });

  describe('paginate()', () => {
    it('returns correct page data with default perPage', () => {
      const methods = createCollectionMethods(sampleData);
      const result = methods.paginate(1);
      expect(result.data).toHaveLength(3);
      expect(result.page).toBe(1);
      expect(result.perPage).toBe(10);
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(1);
    });

    it('paginates with custom perPage', () => {
      const methods = createCollectionMethods(sampleData);
      const page1 = methods.paginate(1, { perPage: 2 });
      expect(page1.data).toHaveLength(2);
      expect(page1.data[0]!.name).toBe('Alice');
      expect(page1.totalPages).toBe(2);

      const page2 = methods.paginate(2, { perPage: 2 });
      expect(page2.data).toHaveLength(1);
      expect(page2.data[0]!.name).toBe('Charlie');
    });

    it('returns empty data for out-of-range page', () => {
      const methods = createCollectionMethods(sampleData);
      const result = methods.paginate(5, { perPage: 2 });
      expect(result.data).toHaveLength(0);
      expect(result.page).toBe(5);
    });
  });
});

describe('createCollectionAccessor()', () => {
  it('creates an accessor with all collection methods', () => {
    const accessor = createCollectionAccessor(sampleData);
    expect(accessor.count()).toBe(3);
    expect(accessor.first()).toBe(sampleData[0]);
    expect(accessor.sum('age')).toBe(90);
  });

  it('works without instanceState (no macros)', () => {
    const accessor = createCollectionAccessor(sampleData);
    expect(accessor.where(i => i.active)).toHaveLength(2);
    expect(accessor.pluck('name')).toEqual(['Alice', 'Bob', 'Charlie']);
  });
});
