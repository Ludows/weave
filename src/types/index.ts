/**
 * All exported TypeScript types for the Weave library
 */

// Core types
export interface ObserveInstance<S = unknown> {
  $: UtilsAPI<S>;
  [key: string]: unknown;
}

export interface CallbackContext<S = unknown> {
  $: (selector: string) => NodeRef;
  on: (event: string, selector: string | Document | Window, handler: EventHandler) => Unlisten;
  off: (event?: string, selector?: string, handler?: EventHandler) => void;
  ref: <T>(initialValue: T) => Ref<T>;
  computed: (name: string, fn: () => unknown) => void;
  state: () => Snapshot<S>;
  batch: (fn: BatchFn) => void | Promise<void>;
  promise: <T>(url: string | (() => string), options?: PromiseOptions<T>) => PromiseResult<T>;
  store: <St, C, A>(storeInstance: StoreInstance<St, C, A>) => StoreInstance<St, C, A>;
  head: (config: HeadConfig) => void;
  watch: (fn: WatchSource | WatchSource[], handler: WatchHandler | WatchOptions) => Unwatch;
  when: (condition: () => boolean, fn: () => void) => void;
  unless: (condition: () => boolean, fn: () => void) => void;
  memo: <T>(fn: () => T) => () => T;
  has: (key: string, value?: unknown) => boolean;
  sync: (options: SyncOptions) => void;
  onInit: (fn: (state: Snapshot<S>) => void | Promise<void>) => void;
  onUpdate: (fn: (newState: Snapshot<S>, oldState: Snapshot<S>) => void) => void;
  onDestroy: (fn: (state: Snapshot<S>) => void) => void;
  cleanup: (fn: () => void) => void;
  macro: (name: string, fn: ContextMacroFn) => void;
}

export interface UtilsAPI<S = unknown> {
  state: () => Snapshot<S>;
  patch: (updates: Partial<S>) => void;
  batch: (fn: BatchFn) => void | Promise<void>;
  emit: (eventName: string, data?: unknown) => void;
  destroy: () => void;
  onInit: (fn: (state: Snapshot<S>) => void | Promise<void>) => void;
  onUpdate: (fn: (newState: Snapshot<S>, oldState: Snapshot<S>) => void) => Unwatch;
  onDestroy: (fn: (state: Snapshot<S>) => void) => void;
  isDirty: (key?: string) => boolean;
  getDirty: () => Partial<S>;
  diff: (snapshot?: Snapshot<S>) => Record<string, { from: unknown; to: unknown }>;
  reset: () => void;
}

// NodeRef types
export interface NodeRef {
  value: unknown;
  text: (value: unknown | (() => unknown)) => NodeRef;
  html: (value: unknown | (() => unknown)) => NodeRef;
  show: (value: boolean | (() => boolean)) => NodeRef;
  hide: (value: boolean | (() => boolean)) => NodeRef;
  if: (condition: () => boolean, options?: IfOptions) => NodeRef;
  bind: (attribute: string, value: unknown | (() => unknown)) => NodeRef;
  attr: (name: string, value?: unknown | (() => unknown)) => NodeRef | string | null;
  data: (key: string, value?: unknown) => NodeRef | string | number | null;
  addClass: (className: string | (() => string)) => NodeRef;
  removeClass: (className: string) => NodeRef;
  toggleClass: (className: string, condition: boolean | (() => boolean)) => NodeRef;
  style: (styles: Record<string, string | (() => string)>) => NodeRef;
  focus: (condition: boolean | (() => boolean)) => NodeRef;
  blur: (condition: boolean | (() => boolean)) => NodeRef;
  scroll: (condition: boolean | (() => boolean), options?: ScrollIntoViewOptions) => NodeRef;
  for: <T>(items: T[] | (() => T[]), callback: (item: T, index: number, context: ForContext) => void) => NodeRef;
  template: (config: TemplateConfig) => NodeRef;
  has: (attribute: string, value?: unknown) => boolean;
  when: (condition: () => boolean, callback: (element: Element) => void) => NodeRef;
}

export interface IfOptions {
  then?: string;
  elseIf?: [() => boolean, string][];
  else?: string;
  template?: string;
}

export interface ForContext extends CallbackContext {
  siblings: () => ObserveInstance[];
  index: () => number;
}

// Reactive types
export interface Ref<T> {
  value: T;
}

export type Snapshot<S> = Readonly<S>;

export type BatchFn = () => void | Promise<void>;

// Event types
export type EventHandler = (event: Event) => void;
export type Unlisten = () => void;
export type Unwatch = () => void;

// Watch types
export type WatchSource = () => unknown;
export type WatchHandler = (newValue: unknown, oldValue: unknown) => void;

export interface WatchOptions {
  then: WatchHandler;
  deep?: boolean;
  debounce?: number;
}

// Promise types
export interface PromiseOptions<T> {
  onStart?: () => void;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onFinally?: () => void;
  watch?: boolean;
  debounce?: number;
}

export interface PromiseResult<T> {
  data: Promise<T>;
  abort: () => void;
}

// Store types
export interface StoreInstance<S, C, A> {
  name: string;
  state: S & C;
  actions: A;
  watch: (fn: WatchSource | WatchSource[], handler: WatchHandler | WatchOptions) => Unwatch;
  isDirty: (key?: string) => boolean;
  getDirty: () => Partial<S>;
  diff: (snapshot?: Snapshot<S>) => Record<string, { from: unknown; to: unknown }>;
  reset: () => void;
  plugin: (plugin: StorePlugin) => void;
}

export interface StorePlugin {
  name: string;
  onStateChange?: (newState: unknown, oldState: unknown, store: StoreInstance<unknown, unknown, unknown>) => void;
  onActionCall?: (actionName: string, payload: unknown, store: StoreInstance<unknown, unknown, unknown>) => void;
  onInit?: (store: StoreInstance<unknown, unknown, unknown>) => void;
}

export interface ActionContext {
  call: (actionName: string, payload?: unknown) => unknown | Promise<unknown>;
}

// Store Group types
export interface StoreGroupInstance<G, C, A> {
  name: string;
  stores: G;
  state: C;
  actions: A;
  watch: (fn: WatchSource | WatchSource[], handler: WatchHandler | WatchOptions) => Unwatch;
}

export interface GroupActionContext {
  call: (path: string, payload?: unknown) => unknown | Promise<unknown>;
}

// Template types
export interface TemplateConfig {
  source: string | (() => string);
  vars?: () => Record<string, unknown>;
  loading?: string;
  error?: (err: Error) => string;
}

// Head types
export interface HeadConfig {
  title?: string | (() => string);
  meta?: Record<string, string | (() => string)>;
  link?: Partial<Record<'canonical' | 'alternate' | 'prev' | 'next', string | (() => string)>>;
}

// Sync types
export interface SyncOptions {
  before?: () => void;
  after?: () => void;
  target?: () => Element;
  restore?: boolean;
}

// Macro types
export type ContextMacroFn = (context: CallbackContext, ...args: any[]) => void | any;
export type NodeRefMacroFn = (nodeRef: NodeRef, ...args: any[]) => void | any;
export type CollectionMacroFn = (collection: ProxyCollection, ...args: any[]) => void | any;

export interface MacroRegistry {
  context: Map<string, ContextMacroFn>;
  nodeRef: Map<string, NodeRefMacroFn>;
  collection: Map<string, CollectionMacroFn>;
}

export interface MacroFn {
  (name: string, fn: ContextMacroFn): void;
  nodeRef: (name: string, fn: NodeRefMacroFn) => void;
  collection: (name: string, fn: CollectionMacroFn) => void;
}

// ProxyCollection type
export type ProxyCollection = any[] & {
  $: CollectionAccessor;
};

// Collection accessor interface
export interface CollectionAccessor {
  where: (predicate: (item: any) => boolean) => ProxyCollection;
  sortBy: (key: string) => ProxyCollection;
  first: () => any;
  last: () => any;
  pluck: (key: string) => any[];
  sum: (key: string) => number;
  min: (key: string) => number;
  max: (key: string) => number;
  count: () => number;
  find: (predicate: (item: any) => boolean) => any;
  groupBy: (key: string) => Record<string, any[]>;
  some: (predicate: (item: any) => boolean) => boolean;
  every: (predicate: (item: any) => boolean) => boolean;
  none: (predicate: (item: any) => boolean) => boolean;
  has: (key: string, value: any) => boolean;
  unique: (key?: string) => ProxyCollection;
  chunk: (size: number) => any[][];
  shuffle: () => ProxyCollection;
  paginate: (page: number, options: { perPage: number }) => PaginationResult;
  push: (item: any) => void;
  remove: (predicate: (item: any) => boolean) => void;
  clear: () => void;
  // Dynamic macro methods will be added here
  [key: string]: any;
}

export interface PaginationResult {
  items: any[];
  total: number;
  totalPages: number;
  currentPage: number;
}
