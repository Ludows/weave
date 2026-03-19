# Reactive State In Depth

Weave's reactivity system is built on a lightweight dependency-tracking engine. Understanding how it works helps you write more predictable and efficient code.

## How reactivity works

When you read `ref.value` inside a reactive context (a directive, a `watch`, a `computed`, …), Weave records that the current effect *depends* on this ref. When the ref's value is later mutated, every dependent effect is re-executed automatically.

```
ref.value read  →  track(ref)  →  dependency recorded
ref.value = x   →  trigger(ref) →  all dependent effects re-run
```

No virtual DOM, no dirty-checking loop — only the effects that actually read a given ref are re-executed.

---

## ref()

`ref()` wraps a single value in a reactive container. Read and write through `.value`.

```typescript
import { weave } from '@ludoows/weave';

weave('#app', ({ $, ref }) => {
  const count = ref(0);

  $('#counter').text(() => count.value);  // tracks count
  $('#btn').on('click', () => count.value++);  // triggers update
});
```

### Any value type

```typescript
const name    = ref('Alice');
const isOpen  = ref(false);
const items   = ref<string[]>([]);
const user    = ref<{ id: number; name: string } | null>(null);
```

### Refs are always accessed via .value

```typescript
count.value      // read
count.value = 5  // write — triggers reactive updates
count.value++    // also triggers
```

---

## computed()

`computed()` derives a value from one or more refs. It re-evaluates automatically when its dependencies change.

```typescript
weave('#app', ({ ref, computed }) => {
  const firstName = ref('John');
  const lastName  = ref('Doe');

  computed('fullName', () => `${firstName.value} ${lastName.value}`);

  // Access via the proxy instance
  $('#name').text(() => (instance as any).fullName);
});
```

Computed values are **lazy** — they only recalculate when actually read after a dependency change.

---

## watch()

`watch()` runs a callback whenever one or more reactive sources change.

### Basic usage

```typescript
weave('#app', ({ ref, watch }) => {
  const query = ref('');

  watch(
    () => query.value,
    (newVal, oldVal) => {
      console.log(`query changed: ${oldVal} → ${newVal}`);
    }
  );
});
```

### Multiple sources

```typescript
watch(
  [() => firstName.value, () => lastName.value],
  ([newFirst, newLast], [oldFirst, oldLast]) => {
    console.log('Name changed', newFirst, newLast);
  }
);
```

### Options

```typescript
watch(
  () => searchQuery.value,
  {
    then: (newVal) => fetchResults(newVal),
    debounce: 300,   // wait 300ms before firing
    deep: true,      // deep equality check for objects/arrays
  }
);
```

`watch()` returns an `unwatch()` function to stop watching:

```typescript
const stop = watch(() => count.value, (val) => console.log(val));
// later:
stop();
```

---

## when() and unless()

Execute a side-effect reactively based on a boolean condition.

```typescript
weave('#app', ({ ref, when, unless }) => {
  const isLoggedIn = ref(false);

  when(
    () => isLoggedIn.value,
    () => console.log('User logged in')
  );

  unless(
    () => isLoggedIn.value,
    () => console.log('User logged out')
  );
});
```

Both re-execute whenever the condition's dependencies change.

---

## memo()

`memo()` memoizes an expensive computation. It only recalculates when its reactive dependencies change, and returns the cached value on subsequent reads.

```typescript
weave('#app', ({ ref, memo }) => {
  const list = ref<number[]>([1, 2, 3, 4, 5]);

  const expensiveSum = memo(() =>
    list.value.reduce((a, b) => a + b, 0)
  );

  // expensiveSum() returns the cached value until list.value changes
  $('#sum').text(() => expensiveSum());
});
```

---

## batch()

`batch()` groups multiple state mutations into a single reactive update cycle, preventing intermediate re-renders.

```typescript
weave('#app', ({ ref, batch }) => {
  const x = ref(0);
  const y = ref(0);
  const z = ref(0);

  $('#update').on('click', () => {
    batch(() => {
      x.value = 1;
      y.value = 2;
      z.value = 3;
      // Only one re-render after all three changes
    });
  });
});
```

---

## Reactivity caveats

### Object and array mutations

Refs track their `.value` reference, not deep mutations. Reassign the whole value to trigger updates:

```typescript
// ❌ Does not trigger — mutates internal object without changing reference
user.value.name = 'Bob';

// ✅ Triggers — new object reference
user.value = { ...user.value, name: 'Bob' };

// ❌ Array push does not trigger
items.value.push('new');

// ✅ Triggers
items.value = [...items.value, 'new'];
```

### Conditional reads

Only the refs actually *read* during the last execution of an effect are tracked. If a condition short-circuits before reaching a ref, that ref is not a dependency until it is actually read:

```typescript
// If isEnabled.value is false, message.value is never read → not tracked
$('#el').text(() => isEnabled.value ? message.value : 'N/A');
```

---

## State snapshot

`state()` returns a frozen snapshot of all refs and computed values at the current moment. It is not reactive — it is a point-in-time read:

```typescript
weave('#app', ({ ref, state }) => {
  const count = ref(0);

  const snap = state(); // { ref_0: 0 }
  console.log(snap);
});
```

Useful for serialising state or comparing with `diff()` on the utils API:

```typescript
instance.$.diff(); // returns { key: { from, to } } for every changed value
```
