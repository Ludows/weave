# Getting Started with Weave

## Installation

### npm / yarn

```bash
npm install @ludoows/weave
```

```bash
yarn add @ludoows/weave
```

### CDN

Use directly in the browser without a bundler:

```html
<!-- unpkg -->
<script src="https://unpkg.com/@ludoows/weave"></script>

<!-- jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/@ludoows/weave"></script>
```

Le package est exposé en global sous `window.Weave` :

```html
<script src="https://unpkg.com/@ludoows/weave"></script>
<script>
  const { weave } = Weave;

  weave('#app', ({ $, ref }) => {
    const count = ref(0);
    $('#counter').text(() => count.value);
    $('#increment').on('click', () => count.value++);
  });
</script>
```

## Your First Weave Application

### 1. Create HTML

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Weave App</title>
</head>
<body>
  <div id="app">
    <h1 id="title">Counter</h1>
    <div id="counter">0</div>
    <button id="increment">+</button>
    <button id="decrement">-</button>
  </div>
  
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

### 2. Create TypeScript

```typescript
import { weave } from '@ludoows/weave';

weave('#app', ({ $, ref }) => {
  // Create reactive state
  const count = ref(0);
  
  // Bind state to DOM
  $('#counter').text(() => count.value);
  
  // Handle events
  $('#increment').on('click', () => count.value++);
  $('#decrement').on('click', () => count.value--);
});
```

### 3. Run

That's it! Your counter is now reactive. When you click the buttons, the count updates automatically.

## Key Concepts

### Reactive State

Use `ref()` to create reactive values:

```typescript
const name = ref('World');
const count = ref(0);
const isActive = ref(true);
```

Access and modify via `.value`:

```typescript
console.log(name.value); // "World"
name.value = 'Weave';
count.value++;
```

### DOM Selection

Use `$()` to select elements (scoped to your component):

```typescript
$('#title')      // Select by ID
$('.item')       // Select by class
$('[data-id]')   // Select by attribute
```

### Directives

Directives bind reactive state to DOM:

```typescript
// Update text content
$('#output').text(() => message.value);

// Update HTML
$('#content').html(() => `<strong>${text.value}</strong>`);

// Show/hide elements
$('#modal').show(() => isOpen.value);
$('#loading').hide(() => !isLoading.value);

// Add/remove classes
$('#button').addClass('active');
$('#button').removeClass('disabled');
$('#button').toggleClass('selected', () => isSelected.value);

// Bind attributes
$('#input').bind('value', () => inputValue.value);
$('#link').bind('href', () => url.value);

// Apply styles
$('#box').style({
  color: 'red',
  fontSize: '16px',
  display: () => isVisible.value ? 'block' : 'none'
});
```

### Event Handling

Register event listeners with `on()`:

```typescript
// Click events
$('#button').on('click', (e) => {
  console.log('Clicked!');
});

// Input events
$('#input').on('input', (e) => {
  const target = e.target as HTMLInputElement;
  value.value = target.value;
});

// Delegated events
on('click', '.item', (e) => {
  console.log('Item clicked');
});

// Document/window events
on('scroll', window, (e) => {
  console.log('Scrolled');
});
```

### Computed Properties

Derive values from reactive state:

```typescript
const firstName = ref('John');
const lastName = ref('Doe');

computed('fullName', () => `${firstName.value} ${lastName.value}`);

// Access via proxy instance
console.log(instance.fullName); // "John Doe"
```

### Lifecycle Hooks

Execute code at specific points:

```typescript
onInit((state) => {
  console.log('Initialized with state:', state);
});

onUpdate((newState, oldState) => {
  console.log('State changed');
});

onDestroy((state) => {
  console.log('Cleaning up');
});

cleanup(() => {
  // Release resources
});
```

### model() — Two-way binding

Automatically syncs an `<input>`, `<textarea>` or `<select>` with a ref in both directions:

```typescript
weave('#app', ({ $, ref }) => {
  const username = ref('');

  // username.value ↔ input.value en temps réel
  $('#username').model(username);

  $('#greeting').text(() => `Hello, ${username.value}!`);
});
```

### teleport() — Move an element

Moves an element to a different DOM target (useful for modals, tooltips):

```typescript
weave('#app', ({ $ }) => {
  // Déplace #modal-content dans <body>
  $('#modal-content').teleport('body');
});
```
A comment placeholder is inserted at the original position and the element is automatically restored on cleanup.

### dispatch() — Emit events

Dispatches a `CustomEvent` that bubbles up from the component root:

```typescript
weave('#checkout-btn', ({ dispatch }) => {
  $('#checkout-btn').on('click', () => {
    dispatch('cart:checkout', { items: [] });
  });
});

// Dans un autre composant :
document.addEventListener('cart:checkout', (e) => {
  console.log((e as CustomEvent).detail);
});
```

### $refs() — Direct element access

Access DOM elements marked with `weave-ref` without CSS selectors:

```html
<form id="app">
  <input weave-ref="email" type="email" />
  <button weave-ref="submit">Send</button>
</form>
```

```typescript
weave('#app', ({ $refs }) => {
  const { email, submit } = $refs();

  submit.addEventListener('click', () => {
    console.log((email as HTMLInputElement).value);
  });
});
```

### nextTick() — Wait for the next cycle

Useful for reading DOM state after a reactive update:

```typescript
weave('#app', ({ $, ref, nextTick }) => {
  const items = ref<string[]>([]);

  $('#add').on('click', async () => {
    items.value = [...items.value, 'New item'];
    await nextTick();
    // Le DOM est maintenant à jour
    console.log($('#list').value);
  });
});
```

### [weave-cloak] — Hide before initialization

Prevents a flash of un-initialized content. Weave automatically removes the `weave-cloak` attribute after `onInit`.

```html
<!-- Required CSS (add once in your stylesheet) -->
<style>
  [weave-cloak] { display: none !important; }
</style>

<div id="app" weave-cloak>
  <!-- Hidden until Weave is ready -->
  <span id="counter">0</span>
</div>
```

```typescript
weave('#app', ({ $, ref }) => {
  const count = ref(0);
  $('#counter').text(() => count.value);
  // weave-cloak is removed automatically after onInit
});
```

## Next Steps

- Explore [Reactive State](./reactive-state.md) in depth
- Set up [Store System](./store.md) for global state
- Check out [Examples](./examples.md) for common patterns

