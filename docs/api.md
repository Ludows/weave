# API Reference

Complete reference for all public exports from `@ludoows/weave`.

## Core

### `weave(target, callback)`

Creates a reactive instance bound to a DOM element.

```typescript
function weave(
  target: string | Element,
  callback: (context: CallbackContext) => void
): ObserveInstance
```

**Parameters**
- `target` — CSS selector or DOM element
- `callback` — Setup function receiving the [context object](#callbackcontext)

**Returns** — `ObserveInstance` with `.destroy()` and `.update()` methods

```typescript
const app = weave('#app', ({ ref, $, text }) => {
  const count = ref(0);
  text('#count', () => count.value);
  $('#btn').on('click', () => count.value++);
});
```

---

### `macro(name, fn)`

Registers a global context macro — adds a function to the callback context.

```typescript
macro('formatDate', (ctx, date: Date) => date.toLocaleDateString());
```

#### `macro.nodeRef(name, fn)`

Registers a macro on all `NodeRef` instances.

```typescript
macro.nodeRef('tooltip', (ref, text: string) => ref.attr('title', text));
```

#### `macro.collection(name, fn)`

Registers a macro on `ProxyCollection` instances.

```typescript
macro.collection('active', (col) => col.$.where(item => item.active));
```

---

## Reactive Primitives

### `ref(initialValue)`

Creates a reactive reference.

```typescript
function ref<T>(initialValue: T): Ref<T>
```

```typescript
const count = ref(0);
count.value++; // triggers reactivity
```

---

### `computed(fn)`

Creates a derived reactive value with automatic caching.

```typescript
function computed<T>(fn: () => T): Ref<T>
```

```typescript
const doubled = computed(() => count.value * 2);
```

---

### `effect(fn, options?)`

Runs a function reactively and re-runs it when its dependencies change.

```typescript
function effect(fn: () => void | (() => void), options?: { immediate?: boolean }): () => void
```

Returns a `stop` function. The callback may return a cleanup function.

```typescript
const stop = effect(() => {
  console.log('count is', count.value);
  return () => console.log('cleaned up');
});
```

---

### `watch(source, handler, options?)`

Observes a reactive source and calls a handler on change.

```typescript
function watch<T>(
  source: WatchSource<T>,
  handler: WatchHandler<T>,
  options?: WatchOptions
): Unwatch
```

```typescript
const stop = watch(() => count.value, (newVal, oldVal) => {
  console.log(newVal, oldVal);
}, { immediate: true, debounce: 100 });
```

---

### `batch(fn)`

Groups multiple reactive mutations into a single update cycle.

```typescript
function batch(fn: BatchFn): void
```

```typescript
batch(() => {
  a.value = 1;
  b.value = 2;
  // DOM updates once
});
```

---

### `memo(fn)`

Memoizes a function — returns cached result until dependencies change.

```typescript
const expensive = memo(() => heavyComputation(data.value));
```

---

### `when(condition, fn)` / `unless(condition, fn)`

Executes `fn` only when condition is truthy / falsy.

```typescript
when(() => isLoggedIn.value, () => loadDashboard());
unless(() => isReady.value, () => showSpinner());
```

---

### `nextTick()`

Returns a promise that resolves after the next microtask (after reactive updates flush).

```typescript
async function afterUpdate() {
  count.value++;
  await nextTick();
  // DOM is updated here
}
```

---

## Store System

### `createStore(name, setup)`

Creates a global reactive store.

```typescript
function createStore<S, A, C>(
  name: string,
  setup: (api: StoreSetupAPI) => void
): StoreInstance<S, A, C>
```

```typescript
const store = createStore('cart', ({ state, action, computed, use }) => {
  state({ items: [], total: 0 });
  computed('itemCount', (s) => s.items.length);
  action('addItem', (s, item) => { s.items.push(item); });
  use(persist({ key: 'cart' }));
});

store.state.items;        // reactive state
store.actions.addItem(x); // run action
store.computed.itemCount; // derived value
store.destroy();          // teardown
```

---

### `createPlugin(config)`

Creates a typed store plugin with default priority (10).

```typescript
function createPlugin(config: StorePlugin): StorePlugin
```

```typescript
const myPlugin = createPlugin({
  name: 'my-plugin',
  priority: 5,
  onInit: (store) => { /* ... */ },
  onAfterStateChange: (newState, oldState) => { /* ... */ },
  onDestroy: () => { /* ... */ }
});
```

---

### `createStoreGroup(stores)`

Orchestrates multiple stores with cross-store actions.

```typescript
const group = createStoreGroup({
  cart: cartStore,
  user: userStore
});

group.action('checkout', ({ stores }) => {
  stores.cart.actions.clear();
  stores.user.actions.setLastOrder(Date.now());
});
```

---

### Built-in Plugins

#### `persist(options)`

Saves and restores store state to/from storage.

```typescript
use(persist({
  key: 'my-store',       // storage key (required)
  storage: localStorage,  // default: window.localStorage
  include: ['count'],     // only persist these keys
  exclude: ['temp'],      // exclude these keys
  debounce: 300           // ms (default: 300)
}));
```

#### `logger(options)`

Logs state changes and action calls (dev only).

```typescript
use(logger({
  prefix: '[cart]',    // default: '[store]'
  collapsed: false,    // use console.groupCollapsed
  logState: true,      // log state changes
  logActions: true     // log action calls
}));
```

#### `validate(validators)`

Validates state mutations — throws on invalid values.

```typescript
use(validate({
  count: (val) => typeof val === 'number' && val >= 0,
  email: (val) => val.includes('@') || 'Email must contain @'
}));
```

#### `devtools(options)`

Integrates with Redux DevTools Extension and exposes `window.__WEAVE_DEVTOOLS__`.

```typescript
use(devtools({
  name: 'Cart Store',  // display name
  enabled: true,       // default: NODE_ENV !== 'production'
  maxEvents: 500       // timeline cap
}));
```

---

### Store Action Helpers

```typescript
asyncAction(fn)           // wraps async logic with loading/error state
composeActions(...fns)    // chain multiple actions into one
debounceAction(fn, ms)    // debounce an action
throttleAction(fn, ms)    // throttle an action
parallelActions(...fns)   // run actions in parallel
retryAction(fn, options)  // retry on failure with backoff
```

---

## Advanced

### `head(config)` / `createHeadManager()` / `resetHead()`

Manages `<title>`, `<meta>`, `<link>` tags reactively.

```typescript
head({
  title: 'My Page',
  meta: [{ name: 'description', content: 'Hello' }],
  link: [{ rel: 'canonical', href: 'https://example.com' }]
});
```

---

### `promise(fn, options)`

Integrates fetch/async calls with lifecycle callbacks.

```typescript
promise(
  () => fetch('/api/data').then(r => r.json()),
  {
    onPending: () => { loading.value = true; },
    onSuccess: (data) => { items.value = data; },
    onError: (err) => { error.value = err.message; },
    onFinally: () => { loading.value = false; }
  }
);
```

---

### `sync(options)` / `createSyncManager()`

Re-attaches Weave instances after page transitions (Swup, Turbo, Barba.js).

```typescript
sync({
  adapter: adapters.swup(swupInstance),
  onAttach: () => { /* re-init */ },
  onDetach: () => { /* cleanup */ }
});
```

---

### `adapters`

Pre-built sync adapters:

```typescript
adapters.swup(swupInstance)   // Swup page transitions
adapters.turbo()              // Turbo Drive (Hotwire)
adapters.barba(barbaInstance) // Barba.js
```

---

## Collections

### `createCollectionMethods(items)`

Adds query methods (`.where()`, `.sortBy()`, `.paginate()`, etc.) to an array.

### `createCollectionMutations(items, container, create, destroy)`

Adds DOM-synced mutation methods (`.push()`, `.remove()`, `.clear()`) to a collection.

### `createCollectionAccessor(items)`

Combines methods and mutations into a single `ProxyCollection` accessor.

---

## Utilities

### `some(selector)`

Checks if a selector matches any element in the document.

```typescript
if (some('.modal')) { /* ... */ }
```

### `initCloak()`

Removes `[weave-cloak]` attribute from all elements — call after Weave is initialized to reveal UI.

```typescript
initCloak(); // removes [weave-cloak], elements become visible
```

### `parseConfig(raw)` / `parseConfigWithSchema(raw, schema)`

Parse and validate configuration objects.

### `prettyPrint(value)` / `serialize(value)`

Format reactive state for display or serialization.

---

## DevTools Inspector

```typescript
import { getDevtoolsInspector } from '@ludoows/weave';

const inspector = getDevtoolsInspector();

inspector.stores;                    // Map<string, { state, name }>
inspector.events;                    // DevtoolsEvent[]
inspector.getState('Cart Store');    // current state snapshot
inspector.getEvents('Cart Store');   // events for a store
inspector.getEvents();               // all events
inspector.clear();                   // reset timeline
```

Also accessible at `window.__WEAVE_DEVTOOLS__` in the browser.

---

## Types

All types are exported from `@ludoows/weave`:

| Type | Description |
|------|-------------|
| `ObserveInstance` | Return type of `weave()` |
| `CallbackContext` | Context object passed to `weave()` callback |
| `Ref<T>` | Reactive reference (`{ value: T }`) |
| `StoreInstance<S,A,C>` | Return type of `createStore()` |
| `StorePlugin` | Plugin interface |
| `StoreGroupInstance` | Return type of `createStoreGroup()` |
| `NodeRef` | Chainable DOM selector wrapper |
| `DevtoolsEvent` | Event in the devtools timeline |
| `DevtoolsInspector` | Inspector API interface |
| `WatchOptions` | Options for `watch()` |
| `SyncOptions` | Options for `sync()` |
| `HeadConfig` | Config for `head()` |
| `PromiseOptions` | Options for `promise()` |
