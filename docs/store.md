# Store System

Weave's store system provides global reactive state that can be shared across multiple components without prop-drilling or event buses.

---

## createStore()

```typescript
import { createStore } from '@ludoows/weave';

const counterStore = createStore('counter', ({ state, computed, action }) => {
  state({ count: 0 });

  computed('double', (s) => s.count * 2);

  action('increment', (s) => s.count++);
  action('decrement', (s) => s.count--);
  action('reset',     (s) => s.count = 0);
});
```

### state()

Defines the initial state. Call it once inside the callback:

```typescript
state({
  items: [] as CartItem[],
  isLoading: false,
  error: null as string | null,
});
```

### computed()

Derives a read-only value from state. Recalculates reactively:

```typescript
computed('total', (s) => s.items.reduce((sum, i) => sum + i.price, 0));
computed('isEmpty', (s) => s.items.length === 0);
```

Access computed values through `store.state` just like regular state:

```typescript
console.log(cartStore.state.total);
console.log(cartStore.state.isEmpty);
```

### action()

Actions are the only way to mutate state. They receive the current state and an optional payload:

```typescript
action('addItem',    (s, item: CartItem) => { s.items.push(item); });
action('removeItem', (s, id: number)     => { s.items = s.items.filter(i => i.id !== id); });
action('setLoading', (s, val: boolean)   => { s.isLoading = val; });
```

Calling an action:

```typescript
cartStore.actions.addItem({ id: 1, name: 'Book', price: 12 });
cartStore.actions.removeItem(1);
```

---

## Using a store in a component

Pass the store instance to `store()` inside a weave callback to connect it:

```typescript
weave('#cart', ({ $, store }) => {
  store(cartStore);

  $('#total').text(() => `$${cartStore.state.total.toFixed(2)}`);
  $('#count').text(() => cartStore.state.items.length);

  $('#clear').on('click', () => cartStore.actions.clear());
});
```

The same store instance can be used in multiple components — they all react to the same state.

---

## Async actions

Use `asyncAction()` for operations that involve Promises (API calls, etc.):

```typescript
import { createStore, asyncAction } from '@ludoows/weave';

const userStore = createStore('user', ({ state, action }) => {
  state({ profile: null, isLoading: false, error: null });

  action('fetchProfile', asyncAction(
    async (_state, userId: number) => {
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
    {
      onStart:   (s)       => { s.isLoading = true; s.error = null; },
      onSuccess: (s, data) => { s.profile = data; },
      onError:   (s, err)  => { s.error = err.message; },
      onFinally: (s)       => { s.isLoading = false; },
    }
  ));
});
```

---

## Action helpers

### composeActions() — sequential pipeline

Calls a list of actions one after the other:

```typescript
action('resetAll', composeActions(['clearCart', 'clearFilters', 'resetPagination']));
```

### parallelActions() — concurrent execution

Calls a list of actions all at once with `Promise.all`:

```typescript
action('loadAll', parallelActions(['fetchProducts', 'fetchCategories', 'fetchUser']));
```

### retryAction() — automatic retry

Retries a failing async action with exponential back-off:

```typescript
action('fetchWithRetry', retryAction(
  async (_state, url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed');
    return res.json();
  },
  {
    maxRetries: 3,
    delay: 1000,
    onRetry: (_state, attempt, err) => console.warn(`Retry ${attempt}:`, err.message),
  }
));
```

### debounceAction() — debounced action

Waits for a quiet period before executing. Useful for search inputs:

```typescript
action('search', debounceAction(
  async (state, query: string) => {
    state.results = await fetch(`/api/search?q=${query}`).then(r => r.json());
  },
  300
));
```

### throttleAction() — throttled action

Executes at most once per interval. Useful for scroll or resize events:

```typescript
action('trackScroll', throttleAction(
  (state, position: number) => { state.scrollY = position; },
  100
));
```

---

## Calling actions from other actions

Use `context.call()` inside an action to chain other actions:

```typescript
action('checkout', async (state, _payload, context) => {
  await context.call('validateCart');
  await context.call('processPayment', state.paymentMethod);
  await context.call('clearCart');
});
```

---

## Watching store state

```typescript
const unwatch = counterStore.watch(
  () => counterStore.state.count,
  (newVal, oldVal) => console.log(`count: ${oldVal} → ${newVal}`)
);

// Stop watching:
unwatch();
```

---

## Dirty tracking and diff

```typescript
// Is anything dirty since initial state?
counterStore.isDirty();

// Which specific key?
counterStore.isDirty('count');

// Get all dirty values
counterStore.getDirty(); // { count: 5 }

// What changed?
counterStore.diff(); // { count: { from: 0, to: 5 } }

// Reset to initial state
counterStore.reset();
```

---

## Plugins

Plugins hook into the store lifecycle. Use them inside the `createStore` callback with `use()`, or add them later with `store.plugin()`.

### persist — save to localStorage

```typescript
import { createStore, persist } from '@ludoows/weave';

const settingsStore = createStore('settings', ({ state, use }) => {
  state({ theme: 'light', language: 'en' });

  use(persist({
    key: 'weave-settings',
    storage: localStorage,
    include: ['theme', 'language'], // only persist these keys
    debounce: 500,
  }));
});
```

Options:
| Option | Default | Description |
|---|---|---|
| `key` | — | localStorage key |
| `storage` | `localStorage` | Any `Storage`-compatible object |
| `include` | all keys | Keys to persist |
| `exclude` | none | Keys to skip |
| `debounce` | `300` | Debounce saves (ms) |

### logger — log state changes

```typescript
use(logger({
  prefix: '[cart]',
  collapsed: true,   // use console.groupCollapsed
  logState: true,    // log state diffs
  logActions: true,  // log action calls
}));
```

Only active outside production (`NODE_ENV !== 'production'`).

### validate — enforce constraints

```typescript
use(validate({
  count: (val) => typeof val === 'number' && val >= 0,
  email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Invalid email format',
}));
```

Validators return `true` (valid), `false` (invalid, generic error), or a `string` (invalid, custom message). Throws on invalid mutation before it is applied.

### devtools — browser devtools integration

```typescript
use(devtools({ name: 'Cart Store' }));
```

Exposes state and action events on `window.__WEAVE_DEVTOOLS__` for custom devtools tooling.

### Writing a custom plugin

```typescript
import type { StorePlugin } from '@ludoows/weave';

function myPlugin(): StorePlugin {
  return {
    name: 'my-plugin',
    onInit: (store) => {
      console.log('Store ready:', store.name);
    },
    onStateChange: (newState, oldState, store) => {
      // Called before the mutation is applied
    },
    onActionCall: (actionName, payload, store) => {
      // Called when an action is dispatched
    },
  };
}
```

---

## Store groups

`createStoreGroup()` combines multiple stores under a single namespace with shared computed values and cross-store actions:

```typescript
import { createStoreGroup } from '@ludoows/weave';

const appGroup = createStoreGroup('app', {
  cart: cartStore,
  user: userStore,
});

// Access individual stores
appGroup.stores.cart.actions.addItem(product);
appGroup.stores.user.actions.logout();
```
