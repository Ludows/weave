/**
 * Weave - A modern TypeScript reactive library
 * 
 * Makes any existing HTML reactive without compilation, custom attributes, or Virtual DOM.
 */

// Core exports
export { weave } from './core/weave';

/**
 * Macro system for extending Weave with reusable behaviors
 * 
 * The macro system provides three types of macros:
 * 
 * **Context Macros** (`macro(name, fn)`):
 * Add functions to the WeaveContext destructurable object.
 * They receive the full WeaveContext as their first parameter.
 * 
 * **NodeRef Macros** (`macro.nodeRef(name, fn)`):
 * Add methods to NodeRef instances.
 * They receive the NodeRef instance as their first parameter.
 * 
 * **Collection Macros** (`macro.collection(name, fn)`):
 * Add methods to ProxyCollection instances.
 * They receive the ProxyCollection instance as their first parameter.
 * 
 * @example
 * ```ts
 * import { macro } from 'weave';
 * 
 * // Register a global context macro
 * macro('log', (ctx, message) => {
 *   console.log(message, ctx.state);
 * });
 * 
 * // Register a global NodeRef macro
 * macro.nodeRef('tooltip', (nodeRef, text) => {
 *   nodeRef.attr('title', text);
 *   nodeRef.addClass('has-tooltip');
 * });
 * 
 * // Register a global collection macro
 * macro.collection('filterActive', (collection) => {
 *   return collection.$.where(item => item.active);
 * });
 * 
 * // Use in weave callback
 * weave('#app', ({ log, $, state }) => {
 *   state.count = 0;
 *   log('Initial state');
 *   
 *   $('#button').tooltip('Click me!');
 *   
 *   state.items = [{ active: true }, { active: false }];
 *   const active = state.items.$.filterActive();
 * });
 * ```
 */
export { macro } from './core/macro';

// Reactive exports
export { batch } from './reactive/batch';
export { computed } from './reactive/computed';
export { ref } from './reactive/ref';
export { effect } from './reactive/effect';
export { memo, unless, watch, when } from './reactive/watch';

// Store exports
export { createStore, createPlugin } from './store/create-store';
export { asyncAction, composeActions, debounceAction, parallelActions, retryAction, throttleAction } from './store/store-actions';
export { createStoreGroup } from './store/store-group';
export { devtools, getDevtoolsInspector, logger, persist, validate } from './store/store-plugins';
export type { DevtoolsEvent, DevtoolsInspector } from './store/store-plugins';

// Advanced exports
export { adapters } from './advanced/adapters';
export { createHeadManager, head, resetHead } from './advanced/head';
export { promise } from './advanced/promise';
export { createSyncManager, sync } from './advanced/sync';
// Note: template() is a method on NodeRef, not a standalone function

// Collection exports
export { createCollectionAccessor, createCollectionMethods } from './collections/collection-methods';
export { createCollectionMutations } from './collections/collection-mutations';

// Utility exports
export { some } from './dom/node-ref';
export { parseConfig, parseConfigWithSchema } from './utils/parser';
export { prettyPrint, serialize } from './utils/pretty-printer';
export { nextTick } from './utils/next-tick';
export { initCloak } from './dom/cloak';

// Type exports
export type { AdapterFactory, BarbaInstance, SwupInstance } from './advanced/adapters';
export type { ProxyCollection, CollectionAccessor, PaginationResult } from './types';
export type {
    ActionContext, BatchFn, CallbackContext, CollectionMacroFn, ContextMacroFn, EventHandler, ForContext, GroupActionContext, HeadConfig, IfOptions, MacroFn, MacroRegistry, NodeRef, NodeRefMacroFn, ObserveInstance, PromiseOptions,
    PromiseResult, Ref,
    Snapshot, StoreGroupInstance, StoreInstance,
    StorePlugin, SyncOptions, TemplateConfig, Unlisten,
    Unwatch, UtilsAPI, WatchHandler,
    WatchOptions, WatchSource
} from './types';

