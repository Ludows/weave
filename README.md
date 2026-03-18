# Weave

A modern TypeScript reactive library that makes any existing HTML reactive without compilation, custom attributes, or Virtual DOM.

## Features

- **Zero Markup Pollution**: No custom attributes in HTML - all configuration is in pure TypeScript
- **Progressive Enhancement**: Start simple, add complexity only when needed
- **Bidirectional Sync**: DOM changes update state, state changes update DOM
- **Type Safety**: Full TypeScript strict mode with complete type inference
- **Performance First**: Lazy resolution, surgical observers, automatic batching
- **Store System**: Global reactive state management with actions and computed properties
- **Lifecycle Hooks**: onInit, onUpdate, onDestroy for complete control
- **Advanced Features**: Promise integration, template rendering, head management, page transitions

## Installation

### npm / yarn

```bash
npm install @ludoows/weave
```

```bash
yarn add @ludoows/weave
```

### CDN

```html
<!-- unpkg -->
<script src="https://unpkg.com/@ludoows/weave"></script>

<!-- jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/@ludoows/weave"></script>
```

## Quick Start

```typescript
import { weave } from '@ludoows/weave';

weave('#app', ({ $, ref }) => {
  const count = ref(0);
  
  $('#counter').text(() => `Count: ${count.value}`);
  $('#increment').on('click', () => count.value++);
});
```

## Documentation

- [Getting Started](./docs/getting-started.md) - Installation and basic usage
- [Examples](./docs/examples.md) - Common use cases and patterns
- [Performance](./docs/performance.md) - Best practices for performance
- [Security](./docs/security.md) - Security best practices
- [Browser Compatibility](./docs/browser-compatibility.md) - Supported browsers and features
- [Troubleshooting](./docs/troubleshooting.md) - Common issues and solutions

## Core Concepts

### Reactive State with ref()

```typescript
weave('#app', ({ ref }) => {
  const name = ref('World');
  const count = ref(0);
  
  // Refs are reactive - changes trigger updates
  name.value = 'Weave';
  count.value++;
});
```

### Computed Properties

```typescript
weave('#app', ({ ref, computed }) => {
  const firstName = ref('John');
  const lastName = ref('Doe');
  
  computed('fullName', () => `${firstName.value} ${lastName.value}`);
  
  // Access via proxy
  console.log(instance.fullName); // "John Doe"
});
```

### DOM Directives

```typescript
weave('#app', ({ $, ref }) => {
  const message = ref('Hello');
  const isVisible = ref(true);
  
  $('#output').text(() => message.value);
  $('#container').show(() => isVisible.value);
  $('#title').addClass('active');
  $('#input').bind('value', () => message.value);
});
```

### Store System

```typescript
import { createStore } from '@ludoows/weave';

const counterStore = createStore('counter', ({ state, action, computed }) => {
  state({ count: 0 });
  
  computed('double', (s) => s.count * 2);
  
  action('increment', (s) => s.count++);
  action('decrement', (s) => s.count--);
});

weave('#app', ({ store }) => {
  store(counterStore);
  
  // Access store state
  console.log(counterStore.state.count);
  
  // Call actions
  counterStore.actions.increment();
});
```

### Lifecycle Hooks

```typescript
weave('#app', ({ ref, onInit, onUpdate, onDestroy, cleanup }) => {
  const data = ref(null);
  
  onInit(async (state) => {
    // Initialize after all refs/computed are resolved
    data.value = await fetchData();
  });
  
  onUpdate((newState, oldState) => {
    // Called after every state change
    console.log('State changed:', newState);
  });
  
  onDestroy((state) => {
    // Called before destruction
    console.log('Cleaning up');
  });
  
  cleanup(() => {
    // Release resources
  });
});
```

## Browser Compatibility

Weave requires modern browser features:
- Proxy (ES2015)
- MutationObserver
- AbortController (for promise cancellation)

Supported browsers:
- Chrome/Edge 49+
- Firefox 18+
- Safari 10+

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build
npm run build

# Development mode
npm run dev
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details on:

- Development setup and workflow
- Coding standards and best practices
- Testing guidelines
- Commit message conventions
- Pull request process

We appreciate all contributions, from bug reports to new features!

## License

MIT

