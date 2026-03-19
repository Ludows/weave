import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  macro,
  globalMacroRegistry,
  getLocalRegistry,
  cleanupLocalMacros,
  injectContextMacros,
  injectNodeRefMacros,
  injectCollectionMacros,
  localMacroRegistries,
} from './macro';

describe('macro system', () => {
  beforeEach(() => {
    globalMacroRegistry.context.clear();
    globalMacroRegistry.nodeRef.clear();
    globalMacroRegistry.collection.clear();
  });

  describe('macro() - context macros', () => {
    it('registers a global context macro', () => {
      const fn = vi.fn();
      macro('myMacro', fn);
      expect(globalMacroRegistry.context.has('myMacro')).toBe(true);
      expect(globalMacroRegistry.context.get('myMacro')).toBe(fn);
    });
  });

  describe('macro.nodeRef() - nodeRef macros', () => {
    it('registers a global NodeRef macro', () => {
      const fn = vi.fn();
      macro.nodeRef('tooltip', fn);
      expect(globalMacroRegistry.nodeRef.has('tooltip')).toBe(true);
      expect(globalMacroRegistry.nodeRef.get('tooltip')).toBe(fn);
    });
  });

  describe('macro.collection() - collection macros', () => {
    it('registers a global collection macro', () => {
      const fn = vi.fn();
      macro.collection('filterActive', fn);
      expect(globalMacroRegistry.collection.has('filterActive')).toBe(true);
      expect(globalMacroRegistry.collection.get('filterActive')).toBe(fn);
    });
  });

  describe('validateMacroName', () => {
    const reservedNames = [
      '$', 'on', 'off', 'ref', 'computed', 'state', 'batch',
      'promise', 'store', 'head', 'watch', 'when', 'unless',
      'memo', 'has', 'sync', 'onInit', 'onUpdate', 'onDestroy',
      'cleanup', 'macro',
    ];

    it.each(reservedNames)('rejects reserved name "%s"', (name) => {
      expect(() => macro(name, vi.fn())).toThrow(TypeError);
    });

    it('rejects names with invalid characters', () => {
      expect(() => macro('my-macro', vi.fn())).toThrow(TypeError);
      expect(() => macro('my macro', vi.fn())).toThrow(TypeError);
      expect(() => macro('123abc', vi.fn())).toThrow(TypeError);
    });

    it('rejects empty strings', () => {
      expect(() => macro('', vi.fn())).toThrow(TypeError);
      expect(() => macro('   ', vi.fn())).toThrow(TypeError);
    });

    it('accepts valid names', () => {
      expect(() => macro('myMacro', vi.fn())).not.toThrow();
      expect(() => macro('_private', vi.fn())).not.toThrow();
      expect(() => macro('$$special', vi.fn())).not.toThrow();
    });
  });

  describe('validateMacroFunction', () => {
    it('rejects non-functions', () => {
      expect(() => macro('test', 'not a function' as any)).toThrow(TypeError);
      expect(() => macro('test', 42 as any)).toThrow(TypeError);
      expect(() => macro('test', null as any)).toThrow(TypeError);
      expect(() => macro('test', undefined as any)).toThrow(TypeError);
    });
  });

  describe('getLocalRegistry', () => {
    it('creates a new registry if none exists', () => {
      const instance = {};
      const registry = getLocalRegistry(instance);
      expect(registry).toBeDefined();
      expect(registry.context).toBeInstanceOf(Map);
      expect(registry.nodeRef).toBeInstanceOf(Map);
      expect(registry.collection).toBeInstanceOf(Map);
    });

    it('returns existing registry on subsequent calls', () => {
      const instance = {};
      const registry1 = getLocalRegistry(instance);
      const registry2 = getLocalRegistry(instance);
      expect(registry1).toBe(registry2);
    });
  });

  describe('cleanupLocalMacros', () => {
    it('clears and removes registry', () => {
      const instance = {};
      const registry = getLocalRegistry(instance);
      registry.context.set('a', vi.fn());
      registry.nodeRef.set('b', vi.fn());
      registry.collection.set('c', vi.fn());

      cleanupLocalMacros(instance);

      expect(localMacroRegistries.has(instance)).toBe(false);
    });

    it('does nothing if no registry exists', () => {
      const instance = {};
      expect(() => cleanupLocalMacros(instance)).not.toThrow();
    });
  });

  describe('injectContextMacros', () => {
    it('adds global macros to context', () => {
      const fn = vi.fn((_ctx: any, msg: string) => msg);
      macro('greet', fn);

      const context: any = {};
      const instanceState = {};
      injectContextMacros(context, instanceState);

      expect(typeof context.greet).toBe('function');
      context.greet('hello');
      expect(fn).toHaveBeenCalledWith(context, 'hello');
    });
  });

  describe('injectNodeRefMacros', () => {
    it('adds global macros to nodeRef', () => {
      const fn = vi.fn((_ref: any, text: string) => text);
      macro.nodeRef('tooltip', fn);

      const nodeRef: any = {};
      const instanceState = {};
      injectNodeRefMacros(nodeRef, instanceState);

      expect(typeof nodeRef.tooltip).toBe('function');
      nodeRef.tooltip('tip');
      expect(fn).toHaveBeenCalledWith(nodeRef, 'tip');
    });
  });

  describe('injectCollectionMacros', () => {
    it('adds global macros to accessor', () => {
      const fn = vi.fn((_col: any) => 'filtered');
      macro.collection('filterActive', fn);

      const accessor: any = {};
      const collection: any = { items: [] };
      const instanceState = {};
      injectCollectionMacros(accessor, collection, instanceState);

      expect(typeof accessor.filterActive).toBe('function');
      const result = accessor.filterActive();
      expect(fn).toHaveBeenCalledWith(collection);
      expect(result).toBe('filtered');
    });
  });

  describe('local macros override global macros', () => {
    it('local context macro overrides global with same name', () => {
      const globalFn = vi.fn(() => 'global');
      const localFn = vi.fn(() => 'local');
      macro('shared', globalFn);

      const instanceState = {};
      const registry = getLocalRegistry(instanceState);
      registry.context.set('shared', localFn);

      const context: any = {};
      injectContextMacros(context, instanceState);

      const result = context.shared();
      expect(localFn).toHaveBeenCalled();
      expect(result).toBe('local');
    });
  });

  describe('duplicate macro registration warns in dev mode', () => {
    it('warns when overwriting an existing context macro', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      macro('dup', vi.fn());
      macro('dup', vi.fn());
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Macro "dup" of type "context" is being overwritten')
      );
      warnSpy.mockRestore();
    });

    it('warns when overwriting an existing nodeRef macro', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      macro.nodeRef('dup', vi.fn());
      macro.nodeRef('dup', vi.fn());
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Macro "dup" of type "nodeRef" is being overwritten')
      );
      warnSpy.mockRestore();
    });

    it('warns when overwriting an existing collection macro', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      macro.collection('dup', vi.fn());
      macro.collection('dup', vi.fn());
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Macro "dup" of type "collection" is being overwritten')
      );
      warnSpy.mockRestore();
    });
  });
});
