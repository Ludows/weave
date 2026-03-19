# Adapters & Sync Guide

Page transition libraries like Swup, Turbo Drive, and Barba.js replace portions of the DOM when navigating between pages. This destroys Weave's reactive bindings, event listeners, and MutationObservers that were attached to the old elements. The **sync system** solves this by snapshotting state before a transition and reattaching everything to the new DOM after it completes. **Adapters** are preconfigured sync options for popular libraries.

## The SyncOptions Interface

At the core of the sync system is the `SyncOptions` interface:

```ts
interface SyncOptions {
  before?: () => void;   // Called before DOM replacement begins
  after?: () => void;    // Called after DOM replacement completes
  target?: () => Element; // Returns the new root element to reattach to
  restore?: boolean;     // Replay state after reattachment (default: true)
  cleanup?: () => void;  // Tear down event listeners when sync is no longer needed
}
```

| Option | Description |
|---|---|
| `before` | Hook into the transition library's "before swap" event. Weave uses this moment to snapshot state, disconnect MutationObservers, and remove event listeners from the old DOM. |
| `after` | Hook into the "after swap" event. Weave resolves the new DOM element, reattaches the instance, replays directives, and restores state. |
| `target` | A function that returns the new root element after the DOM swap. If omitted, Weave falls back to re-querying the original selector. |
| `restore` | When `true` (the default), Weave replays `onInit` hooks with the snapshotted state so the new DOM reflects the pre-transition state. |
| `cleanup` | Called to remove the adapter's own event listeners. Use this to prevent memory leaks when the Weave instance is destroyed. |

## Using Sync in a Weave Instance

The `sync()` function is available inside a `weave()` callback:

```ts
import weave from 'weave';
import { adapters } from 'weave';

weave('#app', ({ sync }) => {
  sync(adapters.swup());
});
```

You can also pass a custom `SyncOptions` object directly:

```ts
weave('#app', ({ sync }) => {
  sync({
    before: () => document.addEventListener('my-lib:before', handler),
    after: () => document.addEventListener('my-lib:after', handler),
    target: () => document.querySelector('#app'),
    restore: true,
    cleanup: () => {
      document.removeEventListener('my-lib:before', handler);
      document.removeEventListener('my-lib:after', handler);
    }
  });
});
```

## Built-in Adapters

Weave ships with three built-in adapters, all available from the `adapters` export.

### `adapters.swup(swupInstance?)` — Swup

Hooks into Swup's `willReplaceContent` and `contentReplaced` events. Targets the element matching `#swup` or `[data-swup]`.

```ts
import Swup from 'swup';
import weave from 'weave';
import { adapters } from 'weave';

const swup = new Swup();

weave('#swup', ({ state, sync }) => {
  state({ count: 0 });

  // Pass the Swup instance so the adapter can register/unregister events
  sync(adapters.swup(swup));
});
```

**Target resolution:** Looks for `#swup` first, then `[data-swup]`. Throws if neither is found.

**Cleanup:** Removes the `willReplaceContent` and `contentReplaced` listeners from the Swup instance.

### `adapters.turbo()` — Turbo Drive

Hooks into Turbo's `turbo:before-render` and `turbo:render` document events. Targets the first `<turbo-frame>` element, falling back to `document.body`.

```ts
import weave from 'weave';
import { adapters } from 'weave';

weave('#content', ({ state, sync }) => {
  state({ items: [] });

  sync(adapters.turbo());
});
```

**Target resolution:** Queries for `turbo-frame`, falls back to `document.body`.

**Cleanup:** Removes the `turbo:before-render` and `turbo:render` document event listeners.

### `adapters.barba(barbaInstance?)` — Barba.js

Hooks into Barba's `hooks.before` and `hooks.after` lifecycle. Targets the element matching `[data-barba="container"]`.

```ts
import barba from '@barba/core';
import weave from 'weave';
import { adapters } from 'weave';

barba.init({ /* ... */ });

weave('[data-barba="container"]', ({ state, sync }) => {
  state({ page: 'home' });

  sync(adapters.barba(barba));
});
```

**Target resolution:** Queries for `[data-barba="container"]`. Throws if not found.

**Cleanup:** Sets an internal `active` flag to `false`, preventing the hooks from executing after cleanup.

## Creating a Custom Adapter

Use `adapters.register(name, factory)` to add your own adapter. The factory function receives an optional library instance and must return a `SyncOptions` object.

```ts
adapters.register(name: string, factory: (instance?: any) => SyncOptions): void
```

After registration, the adapter is available as `adapters.<name>(instance)`.

### Example: HTMX Adapter

```ts
import { adapters } from 'weave';

adapters.register('htmx', (htmxInstance?: any) => {
  let beforeHandler: ((e: Event) => void) | undefined;
  let afterHandler: ((e: Event) => void) | undefined;

  return {
    before: () => {
      beforeHandler = () => {
        // Weave snapshots state automatically before this callback returns
      };
      document.body.addEventListener('htmx:beforeSwap', beforeHandler);
    },

    after: () => {
      afterHandler = () => {
        // Weave reattaches to the new DOM automatically after this callback returns
      };
      document.body.addEventListener('htmx:afterSwap', afterHandler);
    },

    target: () => {
      // Return the element that HTMX swapped into
      return document.querySelector('[hx-target]') || document.querySelector('#content') || document.body;
    },

    restore: true,

    cleanup: () => {
      if (beforeHandler) document.body.removeEventListener('htmx:beforeSwap', beforeHandler);
      if (afterHandler) document.body.removeEventListener('htmx:afterSwap', afterHandler);
    }
  };
});

// Now use it:
weave('#content', ({ sync }) => {
  sync((adapters as any).htmx());
});
```

### Example: Custom SPA Router Adapter

For a custom SPA router that emits events on route changes:

```ts
import { adapters } from 'weave';

interface MyRouter {
  on(event: string, handler: () => void): void;
  off(event: string, handler: () => void): void;
  currentRoute: string;
}

adapters.register('myRouter', (router: MyRouter) => {
  let beforeHandler: (() => void) | undefined;
  let afterHandler: (() => void) | undefined;

  return {
    before: () => {
      beforeHandler = () => {};
      router.on('beforeNavigate', beforeHandler);
    },

    after: () => {
      afterHandler = () => {};
      router.on('afterNavigate', afterHandler);
    },

    target: () => {
      // The router replaces content inside #router-outlet
      const outlet = document.querySelector('#router-outlet');
      if (!outlet) {
        throw new Error('Router outlet not found');
      }
      return outlet;
    },

    restore: true,

    cleanup: () => {
      if (beforeHandler) router.off('beforeNavigate', beforeHandler);
      if (afterHandler) router.off('afterNavigate', afterHandler);
    }
  };
});

// Usage:
import { createRouter } from './my-router';

const router = createRouter({ /* routes */ });

weave('#router-outlet', ({ state, sync }) => {
  state({ user: null, notifications: [] });

  sync((adapters as any).myRouter(router));
});
```

## How Sync Works Internally

When `sync(options)` is called inside a `weave()` callback, Weave creates a **sync manager** (`createSyncManager`) that orchestrates the full lifecycle. Here is what happens step by step:

### 1. Before Phase (DOM is about to be replaced)

The `before` callback fires. Weave then:

- **Snapshots** the current state by calling the instance's internal `state()` getter.
- **Copies** the list of active directives, MutationObservers, and event listeners.
- **Disconnects** all MutationObservers by calling `observer.disconnect()`.
- **Removes** all event listeners by calling `removeEventListener` for each registered listener.

At this point the old DOM can be safely destroyed without leaving dangling references.

### 2. After Phase (new DOM is in place)

The `after` callback fires. Weave then:

- **Resolves the new element** by calling `options.target()`, or by re-querying the original CSS selector if no target function was provided. Throws an error if the element cannot be found.
- **Reattaches** the Weave instance to the new element by updating the internal root element reference.
- **Replays directives** on the new element tree (re-binding `text()`, `bind()`, `show()`, `for()`, etc.).
- **Restores state** by calling all `onInit` hooks with the snapshotted state (when `restore` is `true`).

### 3. Cleanup Phase

When the Weave instance is destroyed, the `cleanup` callback is invoked to remove the adapter's own event listeners.

```
Page transition begins
  |
  v
before() fires
  |-- snapshot state
  |-- copy directives, observers, listeners
  |-- disconnect all MutationObservers
  |-- remove all event listeners
  |
  v
Library replaces DOM
  |
  v
after() fires
  |-- resolve new element via target() or original selector
  |-- reattach Weave instance to new element
  |-- replay all directives on new DOM
  |-- restore state via onInit hooks (if restore: true)
  |
  v
Instance is live on the new DOM
```

## Cleanup Patterns and Memory Management

Adapters that register event listeners on `document`, `window`, or a library instance must clean them up. The `cleanup` option is the right place for this.

### Pattern: Store References for Removal

```ts
adapters.register('myLib', (instance) => {
  let onBefore: (() => void) | undefined;
  let onAfter: (() => void) | undefined;

  return {
    before: () => {
      onBefore = () => {};
      instance.on('beforeSwap', onBefore);
    },
    after: () => {
      onAfter = () => {};
      instance.on('afterSwap', onAfter);
    },
    target: () => document.querySelector('#app')!,
    restore: true,
    cleanup: () => {
      if (onBefore) instance.off('beforeSwap', onBefore);
      if (onAfter) instance.off('afterSwap', onAfter);
    }
  };
});
```

### Pattern: Active Flag

When the library does not support unsubscribing (like Barba.js hooks), use an `active` flag:

```ts
adapters.register('noUnsub', (instance) => {
  let active = true;

  return {
    before: () => {
      instance.onBefore(() => {
        if (!active) return;
        // ... snapshot logic
      });
    },
    after: () => {
      instance.onAfter(() => {
        if (!active) return;
        // ... reattach logic
      });
    },
    target: () => document.querySelector('#app')!,
    restore: true,
    cleanup: () => {
      active = false;
    }
  };
});
```

### Avoiding Leaks

- Always implement `cleanup`. Even if you think the page will be fully unloaded, SPA-style navigation means your listeners can accumulate.
- If overwriting an existing adapter with `adapters.register()`, Weave logs a warning in development. Make sure the old adapter's cleanup has already been called.
- When a Weave instance is destroyed, its sync manager calls `cleanup` automatically.

## When to Use Adapters vs Manual Sync

**Use a built-in adapter** when you are using Swup, Turbo Drive, or Barba.js. The adapters handle event registration, target resolution, and cleanup correctly out of the box.

**Use `adapters.register()`** when you are using a different page transition library or a custom router. This keeps your sync configuration reusable and testable.

**Use manual `SyncOptions`** when you have a one-off situation that does not justify a named adapter, or when you need fine-grained control over the target resolution or restore behavior.

```ts
// One-off manual sync for a specific component
weave('#widget', ({ state, sync }) => {
  state({ expanded: false });

  sync({
    before: () => window.addEventListener('widget:replacing', handler),
    after: () => window.addEventListener('widget:replaced', handler),
    target: () => document.querySelector('#widget')!,
    restore: false, // Do NOT restore state — start fresh after navigation
    cleanup: () => {
      window.removeEventListener('widget:replacing', handler);
      window.removeEventListener('widget:replaced', handler);
    }
  });
});
```

Setting `restore: false` is useful when you want the component to reinitialize with its default state after a page transition rather than preserving the pre-transition state.
