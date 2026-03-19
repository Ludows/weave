# DevTools Integration Guide

Weave ships with a `devtools` plugin that provides two complementary debugging tools: integration with the **Redux DevTools Extension** for time-travel debugging, and a **standalone inspector API** accessible from `window.__WEAVE_DEVTOOLS__` for programmatic access.

## Quick Start

```ts
import { createStore } from 'weave';
import { devtools } from 'weave';

const cart = createStore('cart', ({ state, action, use }) => {
  state({ items: [], total: 0 });

  action('addItem', (s, item) => {
    s.items = [...s.items, item];
    s.total = s.items.length;
  });

  use(devtools({ name: 'Cart Store' }));
});
```

The plugin is automatically disabled in production (`process.env.NODE_ENV === 'production'`). When disabled, it returns a no-op plugin with zero overhead.

## Configuration Options

| Option | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | `'Store'` | Display name shown in Redux DevTools and used as the key in the inspector's `stores` map |
| `enabled` | `boolean` | `true` in dev, `false` in prod | Force enable or disable regardless of environment |
| `maxEvents` | `number` | `500` | Maximum number of events kept in the timeline before the oldest are discarded |

```ts
use(devtools({
  name: 'User Preferences',
  enabled: true,           // Force enable even in production (not recommended)
  maxEvents: 1000          // Keep more history
}));
```

## Redux DevTools Extension Integration

### Installation

Install the Redux DevTools Extension for your browser:

- [Chrome](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/reduxdevtools/)
- [Edge](https://microsoftedge.microsoft.com/addons/detail/redux-devtools/nnkgneoiohoecpdiaponcejilbhhikei)

No additional configuration is needed. The `devtools` plugin automatically detects the extension via `window.__REDUX_DEVTOOLS_EXTENSION__` and connects to it.

### How It Works

When the plugin initializes, it:

1. Calls `__REDUX_DEVTOOLS_EXTENSION__.connect({ name: 'Weave: <your name>' })` to create a named connection.
2. Sends the initial state via `instance.init(state)`.
3. Subscribes to messages from the extension to support time-travel.

After initialization:

- Every **state change** sends a `STATE_CHANGE` action and the new state snapshot to the extension.
- Every **action dispatch** sends the action name and payload to the extension.

### Time-Travel Debugging

The Redux DevTools Extension allows you to jump to any previous state. When you select a past state in the extension, the plugin receives a `DISPATCH` message, parses the serialized state, and applies it directly to the store's reactive state object. This means all reactive bindings (DOM updates, watchers, computed properties) update automatically.

```
DevTools Extension
  |
  | user clicks "Jump to State #3"
  |
  v
devtools plugin receives message
  |
  | parses JSON state
  | assigns each key to store.state
  |
  v
Weave reactivity triggers
  |
  | DOM updates, watchers fire, computed recomputes
```

### What You See in the Extension

Each Weave store appears as a separate instance in the DevTools panel, prefixed with `Weave:`:

- **Weave: Cart Store** — shows all state changes and actions
- **Weave: User Preferences** — shows a separate timeline

Actions appear with their name as the type:

```
{ type: "addItem", payload: { name: "Widget", price: 9.99 } }
{ type: "STATE_CHANGE" }
```

## Standalone Inspector API

Even without the Redux DevTools Extension, the `devtools` plugin exposes a global inspector at `window.__WEAVE_DEVTOOLS__`. This is a singleton shared across all stores that use the plugin.

### `stores` — Map of All Registered Stores

A `Map<string, { state: any; name: string }>` containing every store that has been initialized with the `devtools` plugin and has not been destroyed.

```js
// In the browser console:
window.__WEAVE_DEVTOOLS__.stores;
// Map(2) {
//   "Cart Store" => { state: { items: [...], total: 3 }, name: "Cart Store" },
//   "User Prefs" => { state: { theme: "dark" }, name: "User Prefs" }
// }

window.__WEAVE_DEVTOOLS__.stores.get('Cart Store');
// { state: { items: [...], total: 3 }, name: "Cart Store" }
```

### `events` — Full Event Timeline

An array of `DevtoolsEvent` objects recording everything that has happened across all stores:

```js
window.__WEAVE_DEVTOOLS__.events;
// [
//   { type: "INIT", storeName: "Cart Store", timestamp: 1710842400000, payload: { state: {...} } },
//   { type: "ACTION", storeName: "Cart Store", timestamp: 1710842401000, payload: { actionName: "addItem", payload: {...} } },
//   { type: "STATE_CHANGE", storeName: "Cart Store", timestamp: 1710842401001, payload: { newState: {...}, oldState: {...} } },
//   ...
// ]
```

### `getState(name)` — Get Current State Snapshot

Returns a shallow copy of the current state for the named store, or `undefined` if the store is not registered.

```js
window.__WEAVE_DEVTOOLS__.getState('Cart Store');
// { items: [{ name: "Widget", price: 9.99 }], total: 1 }
```

### `getEvents(name?)` — Filter Events by Store

When called with a store name, returns only events for that store. When called without arguments, returns a copy of the full timeline.

```js
// All events for one store
window.__WEAVE_DEVTOOLS__.getEvents('Cart Store');

// All events across all stores
window.__WEAVE_DEVTOOLS__.getEvents();
```

### `clear()` — Clear the Event Timeline

Empties the events array. Stores remain registered; only the timeline is cleared.

```js
window.__WEAVE_DEVTOOLS__.clear();
window.__WEAVE_DEVTOOLS__.events.length; // 0
```

## DevtoolsEvent Types

Every event in the timeline has a `type` field. The five possible values are:

| Type | When It Fires | Payload |
|---|---|---|
| `INIT` | Store initialized (`onInit`) | `{ state: {...} }` |
| `STATE_CHANGE` | After a state mutation (`onAfterStateChange`) | `{ newState: {...}, oldState: {...} }` |
| `ACTION` | Before an action executes (`onBeforeAction`) | `{ actionName: string, payload: any }` |
| `ERROR` | When an error occurs in another plugin (`onError`) | `{ error: string, context: string }` |
| `DESTROY` | Store destroyed (`onDestroy`) | (none) |

All events include `storeName` (the `name` option passed to the plugin) and `timestamp` (milliseconds since epoch).

```ts
interface DevtoolsEvent {
  type: 'INIT' | 'STATE_CHANGE' | 'ACTION' | 'ERROR' | 'DESTROY';
  storeName: string;
  timestamp: number;
  payload?: any;
}
```

## Programmatic Access with `getDevtoolsInspector()`

If you need to access the inspector from code (for testing, custom tooling, or CI), use the exported `getDevtoolsInspector()` function instead of reaching for the global:

```ts
import { getDevtoolsInspector } from 'weave';

const inspector = getDevtoolsInspector();

// Same API as window.__WEAVE_DEVTOOLS__
console.log(inspector.stores);
console.log(inspector.getState('Cart Store'));
console.log(inspector.getEvents('Cart Store'));
inspector.clear();
```

This function returns the same singleton as `window.__WEAVE_DEVTOOLS__`. In SSR environments where `window` is not available, it returns a safe fallback with empty stores, empty events, and no-op methods.

## Usage Examples

### Development Workflow

Add devtools to all your stores during development:

```ts
import { createStore } from 'weave';
import { devtools, logger, persist } from 'weave';

const userStore = createStore('user', ({ state, action, use }) => {
  state({ name: '', email: '', role: 'guest' });

  action('login', (s, credentials) => {
    s.name = credentials.name;
    s.email = credentials.email;
    s.role = 'user';
  });

  action('logout', (s) => {
    s.name = '';
    s.email = '';
    s.role = 'guest';
  });

  use(persist({ key: 'user' }));
  use(logger({ prefix: '[user]', collapsed: true }));
  use(devtools({ name: 'User' }));
});
```

Then in your browser console:

```js
// See all stores at a glance
window.__WEAVE_DEVTOOLS__.stores

// Check user state
window.__WEAVE_DEVTOOLS__.getState('User')

// See what happened
window.__WEAVE_DEVTOOLS__.getEvents('User')

// Clear timeline after debugging
window.__WEAVE_DEVTOOLS__.clear()
```

### Testing with the Inspector

```ts
import { createStore } from 'weave';
import { devtools, getDevtoolsInspector } from 'weave';

describe('cart store', () => {
  afterEach(() => {
    getDevtoolsInspector().clear();
  });

  it('records actions in the timeline', () => {
    const cart = createStore('cart', ({ state, action, use }) => {
      state({ items: [] });
      action('addItem', (s, item) => { s.items = [...s.items, item]; });
      use(devtools({ name: 'Test Cart', enabled: true }));
    });

    cart.actions.addItem({ name: 'Widget' });

    const events = getDevtoolsInspector().getEvents('Test Cart');
    const actionEvents = events.filter(e => e.type === 'ACTION');

    expect(actionEvents).toHaveLength(1);
    expect(actionEvents[0].payload.actionName).toBe('addItem');

    cart.destroy();
  });
});
```

### Multiple Stores

Each store gets its own connection in Redux DevTools and its own entry in the inspector. They all share the same event timeline, which you can filter with `getEvents(name)`:

```ts
const cartStore = createStore('cart', ({ state, use }) => {
  state({ items: [] });
  use(devtools({ name: 'Cart' }));
});

const uiStore = createStore('ui', ({ state, use }) => {
  state({ sidebarOpen: false, theme: 'light' });
  use(devtools({ name: 'UI' }));
});

// In the console:
window.__WEAVE_DEVTOOLS__.getEvents('Cart');  // Only cart events
window.__WEAVE_DEVTOOLS__.getEvents('UI');    // Only UI events
window.__WEAVE_DEVTOOLS__.getEvents();        // Everything
```

### Monitoring Errors

The devtools plugin records errors from other plugins. This is useful for tracking validation failures or persistence errors:

```ts
const inspector = getDevtoolsInspector();

const errorEvents = inspector.getEvents('Cart').filter(e => e.type === 'ERROR');
errorEvents.forEach(e => {
  console.log(`Error at ${new Date(e.timestamp).toISOString()}:`, e.payload.error);
  console.log('Context:', e.payload.context);
});
```

## Notes

- The devtools plugin uses priority **99**, meaning it runs last and observes the final result of all other plugins.
- When a store is destroyed, it is removed from the inspector's `stores` map and a `DESTROY` event is recorded.
- The `maxEvents` option caps the timeline by removing the oldest events when the limit is exceeded. This prevents unbounded memory growth in long-running applications.
- Redux DevTools connections are cached per store name. If you create and destroy stores with the same name, the connection is reused.
