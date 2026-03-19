import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCollectionMutations } from './collection-mutations';

describe('createCollectionMutations()', () => {
  let container: HTMLElement;
  let items: any[];
  let createInstance: ReturnType<typeof vi.fn>;
  let destroyInstance: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    items = [];
    createInstance = vi.fn((element: Element) => ({ el: element, id: Math.random() }));
    destroyInstance = vi.fn();
  });

  describe('push()', () => {
    it('appends element to container and item to array', () => {
      const mutations = createCollectionMutations(items, container, createInstance, destroyInstance);

      mutations.push('<span class="item">Hello</span>');

      expect(container.children).toHaveLength(1);
      expect(container.children[0]!.tagName).toBe('SPAN');
      expect(container.children[0]!.textContent).toBe('Hello');
      expect(items).toHaveLength(1);
      expect(createInstance).toHaveBeenCalledOnce();
    });

    it('appends multiple elements sequentially', () => {
      const mutations = createCollectionMutations(items, container, createInstance, destroyInstance);

      mutations.push('<div>First</div>');
      mutations.push('<div>Second</div>');

      expect(container.children).toHaveLength(2);
      expect(items).toHaveLength(2);
      expect(createInstance).toHaveBeenCalledTimes(2);
    });

    it('throws on invalid HTML', () => {
      const mutations = createCollectionMutations(items, container, createInstance, destroyInstance);

      expect(() => mutations.push('')).toThrow('push(): invalid HTML string');
      expect(() => mutations.push('   ')).toThrow('push(): invalid HTML string');
      expect(container.children).toHaveLength(0);
      expect(items).toHaveLength(0);
    });
  });

  describe('remove()', () => {
    it('removes matching items from array and calls destroyInstance', () => {
      const item1 = { el: document.createElement('div'), name: 'Alice' };
      const item2 = { el: document.createElement('div'), name: 'Bob' };
      const item3 = { el: document.createElement('div'), name: 'Charlie' };
      items.push(item1, item2, item3);

      const mutations = createCollectionMutations(items, container, createInstance, destroyInstance);

      mutations.remove((item: any) => item.name === 'Bob');

      expect(items).toHaveLength(2);
      expect(items).toContain(item1);
      expect(items).toContain(item3);
      expect(items).not.toContain(item2);
      expect(destroyInstance).toHaveBeenCalledWith(item2);
    });

    it('removes multiple matching items', () => {
      const item1 = { name: 'Alice', active: true };
      const item2 = { name: 'Bob', active: false };
      const item3 = { name: 'Charlie', active: true };
      items.push(item1, item2, item3);

      const mutations = createCollectionMutations(items, container, createInstance, destroyInstance);

      mutations.remove((item: any) => item.active);

      expect(items).toHaveLength(1);
      expect(items[0]).toBe(item2);
      expect(destroyInstance).toHaveBeenCalledTimes(2);
    });

    it('handles no matches gracefully', () => {
      const item1 = { name: 'Alice' };
      items.push(item1);

      const mutations = createCollectionMutations(items, container, createInstance, destroyInstance);

      mutations.remove((item: any) => item.name === 'Zara');

      expect(items).toHaveLength(1);
      expect(destroyInstance).not.toHaveBeenCalled();
    });
  });

  describe('clear()', () => {
    it('removes all items, calls destroyInstance for each, and clears DOM', () => {
      const item1 = { name: 'Alice' };
      const item2 = { name: 'Bob' };
      items.push(item1, item2);

      container.appendChild(document.createElement('div'));
      container.appendChild(document.createElement('div'));

      const mutations = createCollectionMutations(items, container, createInstance, destroyInstance);

      mutations.clear();

      expect(items).toHaveLength(0);
      expect(container.children).toHaveLength(0);
      expect(destroyInstance).toHaveBeenCalledTimes(2);
      expect(destroyInstance).toHaveBeenCalledWith(item1);
      expect(destroyInstance).toHaveBeenCalledWith(item2);
    });

    it('handles empty array', () => {
      const mutations = createCollectionMutations(items, container, createInstance, destroyInstance);

      mutations.clear();

      expect(items).toHaveLength(0);
      expect(container.children).toHaveLength(0);
      expect(destroyInstance).not.toHaveBeenCalled();
    });
  });
});
