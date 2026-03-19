# Extensibility — Macro System

Weave's macro system lets you extend every layer of the library with reusable, shareable behaviours — without monkey-patching or modifying the core.

There are three kinds of macros, each targeting a different layer:

| Type | Where it shows up | First parameter |
|---|---|---|
| **Context** | Destructured from the weave callback | `CallbackContext` |
| **NodeRef** | Methods on `$()` elements | `NodeRef` instance |
| **Collection** | Methods on `state.items.$` | `ProxyCollection` instance |

---

## Global macros

Global macros are registered once and available in every `weave()` instance.

### Context macro

Adds a function to the weave callback context:

```typescript
import { macro, weave } from '@ludoows/weave';

// Register once (e.g. in your app entry point)
macro('log', (ctx, message: string) => {
  console.log(`[weave]`, message, ctx.state());
});

// Available everywhere
weave('#app', ({ log }) => {
  log('App initialized');
});
```

### NodeRef macro

Adds a method to every `$()` element:

```typescript
macro.nodeRef('tooltip', (nodeRef, text: string) => {
  nodeRef.attr('title', text);
  nodeRef.addClass('has-tooltip');
  return nodeRef; // return for chaining
});

weave('#app', ({ $ }) => {
  $('#save-btn').tooltip('Save your changes');
  $('#delete-btn').tooltip('Delete permanently').addClass('danger');
});
```

### Collection macro

Adds a method to the `.$ ` accessor on reactive arrays:

```typescript
macro.collection('active', (collection) => {
  return collection.$.where((item: any) => item.active);
});

weave('#app', ({ ref }) => {
  const tasks = ref([
    { id: 1, title: 'Buy milk', active: true },
    { id: 2, title: 'Write docs', active: false },
  ]);

  const activeTasks = (tasks.value as any).$.active();
});
```

---

## Local macros

Local macros are registered inside a specific `weave()` callback and are only available within that instance. They are automatically cleaned up when the instance is destroyed.

```typescript
weave('#widget', ({ macro, $ }) => {
  // Register a local context macro
  macro('highlight', (ctx, selector: string) => {
    ctx.$(selector).addClass('highlighted');
  });

  // Use it immediately
  highlight('#title');
});

// 'highlight' is not available outside this weave() callback
```

Local macros **override** global macros with the same name for that instance only.

---

## Naming rules

Macro names must:
- Start with a letter, `_`, or `$`
- Contain only alphanumeric characters, `_`, or `$`
- Not clash with reserved context names (`$`, `ref`, `watch`, `on`, `batch`, …)

Attempting to register a reserved name throws a `TypeError`.

---

## Practical example — form field plugin

A NodeRef macro that adds validation behaviour:

```typescript
import { macro, weave } from '@ludoows/weave';

macro.nodeRef('validate', (nodeRef, validator: (value: string) => string | null) => {
  const el = nodeRef as any;

  el.on('blur', () => {
    const value = String(el.value);
    const error = validator(value);

    if (error) {
      el.addClass('is-invalid');
      el.attr('data-error', error);
    } else {
      el.removeClass('is-invalid');
      el.attr('data-error', null);
    }
  });

  return el;
});

// Usage
weave('#signup', ({ $ }) => {
  ($('#email') as any).validate((v: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Invalid email'
  );

  ($('#password') as any).validate((v: string) =>
    v.length >= 8 ? null : 'At least 8 characters required'
  );
});
```

---

## Practical example — context macro for analytics

```typescript
import { macro } from '@ludoows/weave';

macro('track', (_ctx, event: string, data?: Record<string, unknown>) => {
  // Send to your analytics provider
  window.analytics?.track(event, data);
});

// In any component
weave('#checkout', ({ $, track }) => {
  $('#pay-btn').on('click', () => {
    track('checkout_clicked', { page: 'cart' });
  });
});
```

---

## TypeScript — extending types

To get full type-safety for your custom macros, extend the Weave interfaces:

```typescript
// weave.d.ts (add to your project)
import '@ludoows/weave';

declare module '@ludoows/weave' {
  interface CallbackContext {
    log: (message: string) => void;
    track: (event: string, data?: Record<string, unknown>) => void;
  }

  interface NodeRef {
    tooltip: (text: string) => NodeRef;
    validate: (validator: (value: string) => string | null) => NodeRef;
  }
}
```

---

## Macro scope summary

```
macro('name', fn)           → global, available in all weave() contexts
macro.nodeRef('name', fn)   → global, available on all $() elements
macro.collection('name', fn)→ global, available on all collection .$ accessors

// Inside weave() callback:
macro('name', fn)           → local, only this instance, auto-cleaned on destroy
```
