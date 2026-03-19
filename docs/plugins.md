# Plugin System Guide

Weave stores support a plugin system that lets you hook into every stage of a store's lifecycle. Plugins can observe, validate, persist, or transform state changes and action calls.

## What Is a Plugin?

A plugin is an object that implements the `StorePlugin` interface. Each plugin has a `name` and can provide any combination of lifecycle hooks:

```ts
interface StorePlugin {
  name: string;
  priority?: number;
  onInit?: (store: StoreInstance) => void;
  onStateChange?: (newState: unknown, oldState: unknown, store: StoreInstance) => void;
  onAfterStateChange?: (newState: unknown, oldState: unknown, store: StoreInstance) => void;
  onBeforeAction?: (actionName: string, payload: unknown, store: StoreInstance) => void;
  onActionCall?: (actionName: string, payload: unknown, store: StoreInstance) => void;
  onDestroy?: (store: StoreInstance) => void;
  onError?: (error: Error, context: string, store: StoreInstance) => void;
}
```

Plugins are registered via `use()` inside a `createStore()` callback, or dynamically with `store.plugin()`:

```ts
import { createStore } from 'weave';
import { persist, logger } from 'weave';

const cart = createStore('cart', ({ state, use }) => {
  state({ items: [], total: 0 });

  use(persist({ key: 'cart' }));
  use(logger({ prefix: '[cart]' }));
});

// Or add a plugin after creation:
cart.plugin(myCustomPlugin);
```

## Lifecycle Hooks

Hooks are called in plugin priority order (see [Priority System](#plugin-priority-system) below). Here is the complete list, in the order they fire during a store's lifetime.

### `onInit(store)`

Called once after the store is fully initialized (state set, actions registered, all plugins loaded). Use this for restoring persisted state, registering the store with external tools, or running setup logic.

```ts
onInit: (store) => {
  console.log(`Store "${store.name}" initialized with state:`, store.state);
}
```

### `onStateChange(newState, oldState, store)`

Called **before** a state mutation is applied. This hook receives a preview of what the new state will look like. If the hook throws an error, the mutation is **rejected** and the state remains unchanged. This makes it the right place for validation.

```ts
onStateChange: (newState, oldState, store) => {
  if ((newState as any).total < 0) {
    throw new Error('Total cannot be negative');
  }
}
```

### `onAfterStateChange(newState, oldState, store)`

Called **after** a state mutation has been applied. Use this for side effects such as persisting state, sending analytics, or syncing with external systems. Errors thrown here are caught and forwarded to `onError` hooks on other plugins; the state change is not reverted.

```ts
onAfterStateChange: (newState, oldState, store) => {
  localStorage.setItem('snapshot', JSON.stringify(newState));
}
```

### `onBeforeAction(actionName, payload, store)`

Called **before** an action's function body executes. Use this for logging, analytics, or blocking actions.

```ts
onBeforeAction: (actionName, payload, store) => {
  console.log(`Action "${actionName}" dispatched with payload:`, payload);
}
```

### `onActionCall(actionName, payload, store)`

A legacy alias for `onBeforeAction`, kept for backward compatibility. Both hooks fire for every action call, in that order.

### `onDestroy(store)`

Called when `store.destroy()` is invoked. Use this to clean up timers, event listeners, or external connections.

```ts
onDestroy: (store) => {
  console.log(`Store "${store.name}" destroyed`);
}
```

### `onError(error, context, store)`

Called when any other plugin throws an error in one of its hooks. The `context` string identifies the source, formatted as `plugin:<pluginName>:<hookName>`. A plugin never receives errors from its own hooks to prevent infinite loops.

```ts
onError: (error, context, store) => {
  console.error(`Error in ${context}:`, error.message);
  reportToSentry(error);
}
```

## Plugin Priority System

Every plugin has a `priority` number. Plugins with a **lower** number run **first**. The default priority is **10**.

```
Priority 1  → runs first  (e.g., validate)
Priority 5  → runs early  (e.g., persist)
Priority 10 → default
Priority 99 → runs last   (e.g., devtools)
```

Weave sorts all plugins by priority once during store initialization and again whenever a plugin is added dynamically with `store.plugin()`.

```ts
const earlyPlugin: StorePlugin = {
  name: 'early',
  priority: 1,
  onInit: () => console.log('I run first')
};

const latePlugin: StorePlugin = {
  name: 'late',
  priority: 50,
  onInit: () => console.log('I run after')
};
```

## Built-in Plugins

Weave ships with four built-in plugins that cover the most common patterns.

### `persist` — Save and Restore State

Saves store state to a `Storage` backend (defaults to `localStorage`). State is restored on `onInit` and saved on every `onAfterStateChange` with a configurable debounce.

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `key` | `string` | (required) | Storage key |
| `storage` | `Storage` | `localStorage` | Any Web Storage API-compatible object |
| `include` | `string[]` | all keys | Only persist these keys |
| `exclude` | `string[]` | none | Skip these keys |
| `debounce` | `number` | `300` | Milliseconds to debounce saves |

**Priority:** 5 (runs early to restore state before other plugins see it).

```ts
import { createStore } from 'weave';
import { persist } from 'weave';

const settings = createStore('settings', ({ state, use }) => {
  state({
    theme: 'light',
    language: 'en',
    sessionToken: ''
  });

  // Persist theme and language, but not the session token
  use(persist({
    key: 'app-settings',
    exclude: ['sessionToken'],
    debounce: 500
  }));
});
```

```ts
// Use sessionStorage instead of localStorage
use(persist({
  key: 'cart',
  storage: sessionStorage
}));
```

### `logger` — Log State Changes and Actions

Logs state changes and action calls to the browser console. Automatically disabled in production (`process.env.NODE_ENV === 'production'`).

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `prefix` | `string` | `'[store]'` | Log prefix |
| `collapsed` | `boolean` | `false` | Use `console.groupCollapsed` instead of `console.group` |
| `logState` | `boolean` | `true` | Log state changes |
| `logActions` | `boolean` | `true` | Log action dispatches |

**Priority:** 10 (default).

```ts
import { createStore } from 'weave';
import { logger } from 'weave';

const cart = createStore('cart', ({ state, action, use }) => {
  state({ items: [], total: 0 });

  action('addItem', (s, item) => {
    s.items = [...s.items, item];
    s.total = s.items.length;
  });

  use(logger({ prefix: '[cart]', collapsed: true }));
});

cart.actions.addItem({ name: 'Widget', price: 9.99 });
// Console output:
//   [cart] action: addItem
//     payload: { name: "Widget", price: 9.99 }
//   [cart] state changed
//     prev: { items: [], total: 0 }
//     next: { items: [...], total: 1 }
//     diff: { items: { from: [], to: [...] }, total: { from: 0, to: 1 } }
```

### `validate` — Validate State Mutations

Runs validation functions **before** state mutations are applied (`onStateChange`). If a validator returns `false` or a string, the mutation is rejected with an error.

**Priority:** 1 (runs first, before any other plugin).

**Validators map:** `Record<string, (value: any) => boolean | string>`

- Return `true` to accept.
- Return `false` to reject with a generic message.
- Return a `string` to reject with a custom error message.

```ts
import { createStore } from 'weave';
import { validate } from 'weave';

const cart = createStore('cart', ({ state, action, use }) => {
  state({ items: [], total: 0 });

  action('setTotal', (s, value) => {
    s.total = value;
  });

  use(validate({
    items: (val) => Array.isArray(val),
    total: (val) => {
      if (typeof val !== 'number') return 'Total must be a number';
      if (val < 0) return 'Total cannot be negative';
      return true;
    }
  }));
});

cart.actions.setTotal(-5);
// Throws: Error: [validate] Total cannot be negative
```

### `devtools` — DevTools Integration

Connects to the Redux DevTools Extension for time-travel debugging and exposes a standalone inspector at `window.__WEAVE_DEVTOOLS__`. See the dedicated [DevTools Integration Guide](./devtools.md) for full details.

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | `'Store'` | Display name in DevTools |
| `enabled` | `boolean` | `true` in dev | Enable or disable |
| `maxEvents` | `number` | `500` | Max events in the timeline |

**Priority:** 99 (runs last to observe everything).

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

## Creating Custom Plugins

### Using `createPlugin()`

The `createPlugin()` helper ensures the default priority of 10 is applied and provides a clean factory pattern:

```ts
import { createPlugin } from 'weave';

const analytics = createPlugin({
  name: 'analytics',

  onBeforeAction: (actionName, payload) => {
    trackEvent('store_action', { action: actionName, payload });
  },

  onAfterStateChange: (newState) => {
    trackEvent('state_change', { state: newState });
  },

  onError: (error, context) => {
    trackEvent('store_error', { error: error.message, context });
  }
});

// Use it
const cart = createStore('cart', ({ state, use }) => {
  state({ items: [] });
  use(analytics);
});
```

### Writing a Plugin from Scratch

You can also define a plugin as a plain object or factory function:

```ts
function rateLimiter(options: { maxChangesPerSecond: number }): StorePlugin {
  let changeCount = 0;
  let resetTimer: ReturnType<typeof setInterval> | null = null;

  return {
    name: 'rate-limiter',
    priority: 2, // Run early, right after validation

    onInit: () => {
      resetTimer = setInterval(() => {
        changeCount = 0;
      }, 1000);
    },

    onStateChange: () => {
      changeCount++;
      if (changeCount > options.maxChangesPerSecond) {
        throw new Error(`Rate limit exceeded: more than ${options.maxChangesPerSecond} state changes per second`);
      }
    },

    onDestroy: () => {
      if (resetTimer) {
        clearInterval(resetTimer);
        resetTimer = null;
      }
    }
  };
}

// Use it
const liveData = createStore('liveData', ({ state, use }) => {
  state({ price: 0 });
  use(rateLimiter({ maxChangesPerSecond: 100 }));
});
```

### Undo/Redo Plugin Example

A more advanced example that tracks state history:

```ts
function undoRedo(options: { maxHistory?: number } = {}): StorePlugin {
  const maxHistory = options.maxHistory ?? 50;
  const past: any[] = [];
  const future: any[] = [];

  return {
    name: 'undo-redo',

    onAfterStateChange: (newState, oldState) => {
      past.push({ ...oldState as object });
      if (past.length > maxHistory) {
        past.shift();
      }
      // Any new change clears the redo stack
      future.length = 0;
    },

    onBeforeAction: (actionName, _payload, store) => {
      if (actionName === 'undo' && past.length > 0) {
        const previous = past.pop();
        future.push({ ...store.state as object });
        Object.assign(store.state, previous);
      }
      if (actionName === 'redo' && future.length > 0) {
        const next = future.pop();
        past.push({ ...store.state as object });
        Object.assign(store.state, next);
      }
    }
  };
}
```

## Plugin Composition and Ordering

Plugins are executed in priority order for every hook. When multiple plugins share the same priority, they run in the order they were registered.

A typical composition for a production store:

```ts
const cart = createStore('cart', ({ state, action, use }) => {
  state({ items: [], total: 0 });

  action('addItem', (s, item) => {
    s.items = [...s.items, item];
    s.total = s.items.length;
  });

  // Priority 1 — validate first
  use(validate({
    items: (val) => Array.isArray(val),
    total: (val) => typeof val === 'number' && val >= 0
  }));

  // Priority 5 — persist early (restores before other plugins)
  use(persist({ key: 'cart' }));

  // Priority 10 (default) — log in dev
  use(logger({ prefix: '[cart]', collapsed: true }));

  // Priority 99 — devtools observes everything last
  use(devtools({ name: 'Cart' }));
});
```

Execution order for a state change:

1. `validate.onStateChange` (priority 1) — rejects invalid mutations
2. `persist.onAfterStateChange` (priority 5) — saves to storage
3. `logger.onAfterStateChange` (priority 10) — logs the change
4. `devtools.onAfterStateChange` (priority 99) — records in timeline

## Best Practices

1. **Name your plugins.** The `name` field is used in error context strings (`plugin:<name>:<hook>`) and makes debugging straightforward.

2. **Set priority deliberately.** Validation plugins should have the lowest priority number (run first). Observability plugins like devtools and logger should have high numbers (run last).

3. **Keep hooks side-effect free in `onStateChange`.** This hook runs before mutation. Only use it for validation or to throw rejections. Put side effects in `onAfterStateChange`.

4. **Handle errors in `onError`.** If you have an error reporting service, use a single plugin with `onError` to catch problems from all other plugins.

5. **Clean up in `onDestroy`.** If your plugin sets up timers, event listeners, or external connections, always tear them down in `onDestroy` to prevent memory leaks.

6. **Disable in production where appropriate.** The built-in `logger` and `devtools` plugins auto-disable in production via `process.env.NODE_ENV`. Follow the same pattern in custom plugins to avoid unnecessary overhead.

7. **Use `createPlugin()` for consistency.** It applies the default priority and keeps plugin definitions uniform across your codebase.
