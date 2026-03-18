/**
 * Macro System - Extension mechanism for Weave
 * 
 * Provides global and local macro registration for:
 * - Context macros: Add functions to WeaveContext
 * - NodeRef macros: Add methods to NodeRef instances
 * - Collection macros: Add methods to ProxyCollection instances
 */

import type {
    CollectionMacroFn,
    ContextMacroFn,
    MacroRegistry,
    NodeRefMacroFn,
} from '../types/index.js';

/**
 * Reserved names that cannot be used for macros
 * These are existing WeaveContext methods and properties
 */
const RESERVED_NAMES = new Set([
  '$',
  'on',
  'off',
  'ref',
  'computed',
  'state',
  'batch',
  'promise',
  'store',
  'head',
  'watch',
  'when',
  'unless',
  'memo',
  'has',
  'sync',
  'onInit',
  'onUpdate',
  'onDestroy',
  'cleanup',
  'macro',
]);

/**
 * Global macro registry - stores macros available across all weave instances
 */
export const globalMacroRegistry: MacroRegistry = {
  context: new Map<string, ContextMacroFn>(),
  nodeRef: new Map<string, NodeRefMacroFn>(),
  collection: new Map<string, CollectionMacroFn>(),
};

/**
 * Local macro registries - stores per-instance macros using WeakMap
 * WeakMap ensures automatic cleanup when instances are garbage collected
 */
export const localMacroRegistries = new WeakMap<any, MacroRegistry>();

/**
 * Validates a macro name
 * @throws {TypeError} if name is invalid
 */
function validateMacroName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new TypeError('Macro name must be a non-empty string');
  }

  if (name.trim() === '') {
    throw new TypeError('Macro name must be a non-empty string');
  }

  if (RESERVED_NAMES.has(name)) {
    throw new TypeError(
      `Macro name "${name}" is reserved and cannot be used. Reserved names: ${Array.from(RESERVED_NAMES).join(', ')}`
    );
  }

  // Check for invalid characters (only allow alphanumeric, underscore, and dollar sign)
  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
    throw new TypeError(
      `Macro name "${name}" contains invalid characters. Names must start with a letter, underscore, or dollar sign, and contain only alphanumeric characters, underscores, or dollar signs.`
    );
  }
}

/**
 * Validates a macro function
 * @throws {TypeError} if function is invalid
 */
function validateMacroFunction(fn: any): void {
  if (typeof fn !== 'function') {
    throw new TypeError('Macro must be a function');
  }
}

/**
 * Logs a warning in development mode when overwriting an existing macro
 */
function warnDuplicateMacro(name: string, type: string): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `[Weave] Macro "${name}" of type "${type}" is being overwritten. Previous macro will be replaced.`
    );
  }
}
/**
 * Register a global context macro
 * 
 * Context macros add functions to the WeaveContext destructurable object.
 * They receive the full WeaveContext as their first parameter.
 * 
 * @param name - The name of the macro (will be available in WeaveContext)
 * @param fn - The macro function that receives (context, ...args)
 * @throws {TypeError} if name or function is invalid
 * 
 * @example
 * ```ts
 * // Register a global context macro
 * macro('log', (ctx, message) => {
 *   console.log(message, ctx.state);
 * });
 * 
 * // Use in weave callback
 * weave('#app', ({ log, state }) => {
 *   state.count = 0;
 *   log('Initial state'); // Logs: "Initial state" { count: 0 }
 * });
 * ```
 */
export function macro(name: string, fn: ContextMacroFn): void {
  validateMacroName(name);
  validateMacroFunction(fn);

  // Warn if overwriting existing macro in dev mode
  if (globalMacroRegistry.context.has(name)) {
    warnDuplicateMacro(name, 'context');
  }

  // Register to global registry
  globalMacroRegistry.context.set(name, fn);
}

/**
 * Register a global NodeRef macro
 * 
 * NodeRef macros add methods to NodeRef instances.
 * They receive the NodeRef instance as their first parameter.
 * 
 * @param name - The name of the macro (will be available on NodeRef instances)
 * @param fn - The macro function that receives (nodeRef, ...args)
 * @throws {TypeError} if name or function is invalid
 * 
 * @example
 * ```ts
 * // Register a global NodeRef macro
 * macro.nodeRef('tooltip', (nodeRef, text) => {
 *   nodeRef.attr('title', text);
 *   nodeRef.addClass('has-tooltip');
 * });
 * 
 * // Use in weave callback
 * weave('#app', ({ $ }) => {
 *   $('#button').tooltip('Click me!');
 * });
 * ```
 */
macro.nodeRef = function(name: string, fn: NodeRefMacroFn): void {
  validateMacroName(name);
  validateMacroFunction(fn);

  // Warn if overwriting existing macro in dev mode
  if (globalMacroRegistry.nodeRef.has(name)) {
    warnDuplicateMacro(name, 'nodeRef');
  }

  // Register to global registry
  globalMacroRegistry.nodeRef.set(name, fn);
};

/**
 * Register a global collection macro
 * 
 * Collection macros add methods to ProxyCollection instances.
 * They receive the ProxyCollection instance as their first parameter.
 * 
 * @param name - The name of the macro (will be available on collection .$ accessor)
 * @param fn - The macro function that receives (collection, ...args)
 * @throws {TypeError} if name or function is invalid
 * 
 * @example
 * ```ts
 * // Register a global collection macro
 * macro.collection('filterActive', (collection) => {
 *   return collection.$.where(item => item.active);
 * });
 * 
 * // Use in weave callback
 * weave('#app', ({ state }) => {
 *   state.items = [
 *     { id: 1, active: true },
 *     { id: 2, active: false }
 *   ];
 *   const active = state.items.$.filterActive();
 * });
 * ```
 */
macro.collection = function(name: string, fn: CollectionMacroFn): void {
  validateMacroName(name);
  validateMacroFunction(fn);

  // Warn if overwriting existing macro in dev mode
  if (globalMacroRegistry.collection.has(name)) {
    warnDuplicateMacro(name, 'collection');
  }

  // Register to global registry
  globalMacroRegistry.collection.set(name, fn);
};

/**
 * Get or create a local macro registry for an instance
 * 
 * Local registries are stored in a WeakMap keyed by InstanceState.
 * If a registry doesn't exist for the instance, a new one is created
 * with empty Maps for context, nodeRef, and collection macros.
 * 
 * @param instanceState - The weave instance state
 * @returns The local MacroRegistry for this instance
 * 
 * @internal
 */
export function getLocalRegistry(instanceState: any): MacroRegistry {
  // Check if registry already exists
  let registry = localMacroRegistries.get(instanceState);
  
  if (!registry) {
    // Create new registry with empty Maps
    registry = {
      context: new Map<string, ContextMacroFn>(),
      nodeRef: new Map<string, NodeRefMacroFn>(),
      collection: new Map<string, CollectionMacroFn>(),
    };
    
    // Store in WeakMap
    localMacroRegistries.set(instanceState, registry);
  }
  
  return registry;
}

/**
 * Cleanup local macros for a destroyed instance
 * 
 * Removes the local macro registry from the WeakMap and clears all
 * macro type maps (context, nodeRef, collection). This ensures proper
 * cleanup when a weave instance is destroyed.
 * 
 * @param instanceState - The weave instance state being destroyed
 * 
 * @internal
 */
export function cleanupLocalMacros(instanceState: any): void {
  // Get the local registry if it exists
  const registry = localMacroRegistries.get(instanceState);
  
  if (registry) {
    // Clear all three macro type maps
    registry.context.clear();
    registry.nodeRef.clear();
    registry.collection.clear();
    
    // Remove the registry from the WeakMap
    localMacroRegistries.delete(instanceState);
  }
}

/**
 * Inject context macros into CallbackContext
 * 
 * Enhances the CallbackContext with both global and local context macros.
 * Local macros override global macros with the same name.
 * Each macro is wrapped to automatically inject the context as the first parameter.
 * 
 * @param context - The CallbackContext to enhance
 * @param instanceState - The weave instance state (for local macro lookup)
 * @returns The enhanced CallbackContext with injected macros
 * 
 * @internal
 */
export function injectContextMacros(
  context: any,
  instanceState: any
): any {
  // First, inject global context macros
  for (const [name, macroFn] of globalMacroRegistry.context.entries()) {
    // Wrap the macro to inject context as first parameter
    context[name] = (...args: any[]) => macroFn(context, ...args);
  }
  
  // Then, inject local context macros (these override globals with same name)
  const localRegistry = localMacroRegistries.get(instanceState);
  if (localRegistry) {
    for (const [name, macroFn] of localRegistry.context.entries()) {
      // Wrap the macro to inject context as first parameter
      context[name] = (...args: any[]) => macroFn(context, ...args);
    }
  }
  
  return context;
}

/**
 * Inject NodeRef macros into a NodeRef instance
 * 
 * Enhances the NodeRef instance with both global and local NodeRef macros.
 * Local macros override global macros with the same name.
 * Each macro is wrapped to automatically inject the NodeRef instance as the first parameter.
 * 
 * @param nodeRef - The NodeRef instance to enhance
 * @param instanceState - The weave instance state (for local macro lookup)
 * @returns The enhanced NodeRef with injected macros
 * 
 * @internal
 */
export function injectNodeRefMacros(
  nodeRef: any,
  instanceState: any
): any {
  // First, inject global NodeRef macros
  for (const [name, macroFn] of globalMacroRegistry.nodeRef.entries()) {
    // Wrap the macro to inject nodeRef as first parameter
    nodeRef[name] = (...args: any[]) => macroFn(nodeRef, ...args);
  }
  
  // Then, inject local NodeRef macros (these override globals with same name)
  const localRegistry = localMacroRegistries.get(instanceState);
  if (localRegistry) {
    for (const [name, macroFn] of localRegistry.nodeRef.entries()) {
      // Wrap the macro to inject nodeRef as first parameter
      nodeRef[name] = (...args: any[]) => macroFn(nodeRef, ...args);
    }
  }
  
  return nodeRef;
}

/**
 * Inject collection macros into CollectionAccessor
 * 
 * Enhances the CollectionAccessor with both global and local collection macros.
 * Local macros override global macros with the same name.
 * Each macro is wrapped to automatically inject the ProxyCollection as the first parameter.
 * 
 * @param accessor - The CollectionAccessor to enhance
 * @param collection - The ProxyCollection instance
 * @param instanceState - The weave instance state (for local macro lookup)
 * @returns The enhanced CollectionAccessor with injected macros
 * 
 * @internal
 */
export function injectCollectionMacros(
  accessor: any,
  collection: any,
  instanceState: any
): any {
  // First, inject global collection macros
  for (const [name, macroFn] of globalMacroRegistry.collection.entries()) {
    // Wrap the macro to inject collection as first parameter
    accessor[name] = (...args: any[]) => macroFn(collection, ...args);
  }
  
  // Then, inject local collection macros (these override globals with same name)
  const localRegistry = localMacroRegistries.get(instanceState);
  if (localRegistry) {
    for (const [name, macroFn] of localRegistry.collection.entries()) {
      // Wrap the macro to inject collection as first parameter
      accessor[name] = (...args: any[]) => macroFn(collection, ...args);
    }
  }
  
  return accessor;
}
