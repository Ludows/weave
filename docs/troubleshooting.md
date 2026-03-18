# Troubleshooting Guide

This guide covers common issues you might encounter when using Weave and how to resolve them.

## Table of Contents

- [Reactivity Issues](#reactivity-issues)
- [DOM Selection Problems](#dom-selection-problems)
- [Store Issues](#store-issues)
- [Performance Problems](#performance-problems)
- [TypeScript Errors](#typescript-errors)
- [Event Handling Issues](#event-handling-issues)
- [Lifecycle Hook Problems](#lifecycle-hook-problems)
- [Memory Leaks](#memory-leaks)

---

## Reactivity Issues

### Directives not updating when state changes

**Problem**: You change a state property but the DOM doesn't update.

**Common causes**:

1. **Using non-reactive assignment**
   ```typescript
   // ❌ Wrong - bypassing the proxy
   const instance = weave('.card', ({ $, ref }) => {
     const count = ref(0);
     const element = $('.counter');
     
     // This won't trigger reactivity
     element.value = count.value;
   });
   ```
   
   **Solution**: Use directives instead
   ```typescript
   // ✅ Correct
   weave('.card', ({ $, ref }) => {
     const count = ref(0);
     $('.counter').text(() => count.value);
   });
   ```

2. **Mutating objects/arrays without triggering reactivity**
   ```typescript
   // ❌ Wrong - direct mutation
   const items = ref([1, 2, 3]);
   items.value.push(4); // Won't trigger updates
   ```
   
   **Solution**: Reassign the entire value
   ```typescript
   // ✅ Correct
   const items = ref([1, 2, 3]);
   items.value = [...items.value, 4];
   ```

3. **Accessing ref without .value**
   ```typescript
   // ❌ Wrong
   const count = ref(0);
   $('.counter').text(() => count); // Returns the ref object, not the value
   ```
   
   **Solution**: Always use .value
   ```typescript
   // ✅ Correct
   const count = ref(0);
   $('.counter').text(() => count.value);
   ```

### Computed properties not recalculating

**Problem**: Computed property shows stale data.

**Cause**: Computed properties cache their value and only recalculate when dependencies change.

**Solution**: Ensure you're accessing reactive dependencies inside the computed function:

```typescript
// ❌ Wrong - accessing value outside computed
const price = ref(10);
const priceValue = price.value;
computed('total', () => priceValue * 2); // Won't update when price changes

// ✅ Correct - accessing inside computed
const price = ref(10);
computed('total', () => price.value * 2);
```

---

## DOM Selection Problems

### "Element not found" errors

**Problem**: `NodeRef: element not found (selector)` error.

**Common causes**:

1. **Selector doesn't match any element**
   ```typescript
   weave('.card', ({ $ }) => {
     $('.non-existent').text('Hello'); // Error!
   });
   ```
   
   **Solution**: Verify your selector matches an element in the DOM
   ```typescript
   weave('.card', ({ $ }) => {
     // Check if element exists first
     const el = $('.price');
     if (el) {
       el.text('$10');
     }
   });
   ```

2. **Element not yet in DOM**
   ```typescript
   // ❌ Wrong - element added after weave() call
   weave('.card', ({ $ }) => {
     $('.dynamic-element').text('Hello'); // Error if not in DOM yet
   });
   
   document.querySelector('.card').innerHTML += '<div class="dynamic-element"></div>';
   ```
   
   **Solution**: Ensure elements exist before accessing them
   ```typescript
   // ✅ Correct
   document.querySelector('.card').innerHTML += '<div class="dynamic-element"></div>';
   
   weave('.card', ({ $ }) => {
     $('.dynamic-element').text('Hello');
   });
   ```

3. **Scoping issue - element outside root**
   ```typescript
   // ❌ Wrong - .header is outside .card
   weave('.card', ({ $ }) => {
     $('.header').text('Title'); // Error if .header is not inside .card
   });
   ```
   
   **Solution**: All selectors are scoped to the root element
   ```typescript
   // ✅ Correct - select elements inside .card only
   weave('.card', ({ $ }) => {
     $('.card-title').text('Title'); // .card-title must be inside .card
   });
   ```

### Multiple elements matched

**Problem**: `weave()` returns an array when you expect a single instance.

**Cause**: Your selector matches multiple elements.

**Solution**: Either use a more specific selector or handle the array:

```typescript
// If selector matches multiple elements
const instances = weave('.card', ({ $ }) => {
  // ...
});

// Handle as array
if (Array.isArray(instances)) {
  instances.forEach(instance => {
    // Work with each instance
  });
}

// Or use a more specific selector
const instance = weave('.card#main', ({ $ }) => {
  // ...
});
```

---

## Store Issues

### Store state not updating components

**Problem**: Store state changes but components don't update.

**Cause**: Not connecting the store to the component properly.

**Solution**: Use the `store()` method in the callback:

```typescript
const cartStore = createStore('cart', ({ state }) => {
  state({ items: [], total: 0 });
});

// ❌ Wrong - not connected
weave('.cart', ({ $ }) => {
  $('.total').text(() => cartStore.state.total); // Won't update
});

// ✅ Correct - connected via store()
weave('.cart', ({ $, store }) => {
  const cart = store(cartStore);
  $('.total').text(() => cart.state.total); // Updates reactively
});
```

### Store actions not triggering validation

**Problem**: Validation plugin doesn't catch invalid state changes.

**Cause**: Mutating state directly instead of through actions.

**Solution**: Always use actions for state changes:

```typescript
const userStore = createStore('user', ({ state, action, use }) => {
  state({ age: 0 });
  
  use(validate({
    age: (val) => val >= 0 || 'Age must be positive'
  }));
  
  action('setAge', (s, age) => {
    s.age = age; // Validation runs here
  });
});

// ❌ Wrong - bypasses validation
userStore.state.age = -5; // Validation runs but state already mutated

// ✅ Correct - validation runs before mutation
userStore.actions.setAge(-5); // Throws error, state unchanged
```

### Store plugins not working

**Problem**: Plugin hooks not being called.

**Cause**: Plugin registered after state changes.

**Solution**: Register plugins during store creation:

```typescript
// ❌ Wrong - plugin added after creation
const store = createStore('cart', ({ state }) => {
  state({ items: [] });
});
store.plugin(logger()); // Too late for onInit

// ✅ Correct - plugin registered during creation
const store = createStore('cart', ({ state, use }) => {
  state({ items: [] });
  use(logger()); // onInit will be called
});
```

---

## Performance Problems

### Slow rendering with large lists

**Problem**: Performance degrades with many items in `for()` loops.

**Solution**: Use batching and optimize directives:

```typescript
weave('.list', ({ $, batch, ref }) => {
  const items = ref([/* large array */]);
  
  // ✅ Batch multiple updates
  batch(() => {
    items.value = items.value.map(item => ({
      ...item,
      processed: true
    }));
  });
  
  // ✅ Use efficient directives
  $('.container').for(items.value, (item, index, { $ }) => {
    // Only bind what's needed
    $('.name').text(item.name);
    $('.price').text(item.price);
  });
});
```

### Too many reactive dependencies

**Problem**: Computed properties or directives recalculate too often.

**Solution**: Use `memo()` to cache expensive computations:

```typescript
weave('.dashboard', ({ $, ref, memo }) => {
  const data = ref([/* large dataset */]);
  
  // ❌ Recalculates on every access
  $('.result').text(() => {
    return expensiveCalculation(data.value);
  });
  
  // ✅ Cached until dependencies change
  const cachedResult = memo(() => expensiveCalculation(data.value));
  $('.result').text(cachedResult);
});
```

### Memory usage growing over time

**Problem**: Memory increases as you create/destroy instances.

**Solution**: Always call `destroy()` when done:

```typescript
// ❌ Wrong - instances never cleaned up
function showModal() {
  const modal = weave('.modal', ({ $ }) => {
    // ...
  });
  // Modal closed but instance still in memory
}

// ✅ Correct - cleanup when done
function showModal() {
  const modal = weave('.modal', ({ $, on }) => {
    on('click', '.close', () => {
      modal.$.destroy(); // Clean up
    });
  });
}
```

---

## TypeScript Errors

### Type inference not working

**Problem**: TypeScript can't infer types for state or refs.

**Solution**: Provide explicit type parameters:

```typescript
// ❌ Type is 'any'
const count = ref(0);
count.value = 'string'; // No error

// ✅ Type is 'number'
const count = ref<number>(0);
count.value = 'string'; // TypeScript error

// For stores
interface CartState {
  items: Item[];
  total: number;
}

const cart = createStore<CartState>('cart', ({ state }) => {
  state({ items: [], total: 0 });
});
```

### "Property does not exist" errors

**Problem**: TypeScript doesn't recognize computed properties.

**Cause**: Computed properties are added dynamically.

**Solution**: Use type assertions or interfaces:

```typescript
interface CardState {
  price: number;
  tax: number;
  total: number; // Computed property
}

const instance = weave<CardState>('.card', ({ $, ref, computed }) => {
  const price = ref(10);
  const tax = ref(2);
  
  computed('total', () => price.value + tax.value);
});

// Now TypeScript knows about 'total'
console.log(instance.total);
```

---

## Event Handling Issues

### Event listeners not firing

**Problem**: Events registered with `on()` don't trigger.

**Common causes**:

1. **Wrong selector**
   ```typescript
   // ❌ Selector doesn't match
   on('click', '.btn-submit', () => {
     console.log('clicked');
   }); // No element with class 'btn-submit'
   ```

2. **Event bubbling stopped**
   ```typescript
   // ❌ Parent stops propagation
   document.querySelector('.parent').addEventListener('click', (e) => {
     e.stopPropagation(); // Prevents delegation
   });
   
   weave('.parent', ({ on }) => {
     on('click', '.child', () => {
       console.log('Never fires');
     });
   });
   ```

3. **Element added dynamically after registration**
   ```typescript
   // ✅ Event delegation handles this automatically
   weave('.list', ({ on }) => {
     on('click', '.item', () => {
       console.log('Works even for dynamic items');
     });
     
     // Items added later will still trigger the event
   });
   ```

### Memory leaks from event listeners

**Problem**: Event listeners not cleaned up.

**Solution**: Use the returned `unlisten()` function or `cleanup()`:

```typescript
weave('.card', ({ on, cleanup }) => {
  // ✅ Auto cleanup with unlisten
  const unlisten = on('click', '.btn', () => {
    console.log('clicked');
  });
  
  cleanup(() => {
    unlisten(); // Remove listener
  });
  
  // Or let destroy() handle it automatically
});
```

---

## Lifecycle Hook Problems

### onInit not executing

**Problem**: `onInit()` callback never runs.

**Cause**: Async operations or errors in callback.

**Solution**: Check for errors and handle async properly:

```typescript
weave('.card', ({ onInit }) => {
  // ❌ Error prevents execution
  onInit(() => {
    throw new Error('Oops');
  });
  
  // ✅ Handle errors
  onInit(async () => {
    try {
      await fetchData();
    } catch (error) {
      console.error('Init failed:', error);
    }
  });
});
```

### onUpdate firing too often

**Problem**: `onUpdate()` called on every tiny change.

**Solution**: Use `batch()` to group updates:

```typescript
weave('.card', ({ ref, batch, onUpdate }) => {
  const price = ref(10);
  const quantity = ref(1);
  
  onUpdate((newState, oldState) => {
    console.log('State changed');
  });
  
  // ❌ Triggers onUpdate twice
  price.value = 20;
  quantity.value = 2;
  
  // ✅ Triggers onUpdate once
  batch(() => {
    price.value = 20;
    quantity.value = 2;
  });
});
```

### onDestroy not cleaning up resources

**Problem**: Resources not released when instance destroyed.

**Solution**: Use `cleanup()` for all external resources:

```typescript
weave('.card', ({ cleanup }) => {
  const timer = setInterval(() => {
    console.log('tick');
  }, 1000);
  
  const controller = new AbortController();
  
  // ✅ Clean up all resources
  cleanup(() => {
    clearInterval(timer);
    controller.abort();
  });
});
```

---

## Memory Leaks

### Detecting memory leaks

**Symptoms**:
- Browser memory usage grows over time
- Page becomes slow after many interactions
- DevTools shows increasing number of detached DOM nodes

**Debugging steps**:

1. **Use Chrome DevTools Memory Profiler**
   - Take heap snapshot before operations
   - Perform operations (create/destroy instances)
   - Take another snapshot
   - Compare to find retained objects

2. **Check for common leak patterns**:
   ```typescript
   // ❌ Leak: Global reference prevents cleanup
   let globalInstance;
   function createCard() {
     globalInstance = weave('.card', ({ $ }) => {
       // ...
     });
   }
   
   // ✅ Fix: Clear reference and destroy
   let globalInstance;
   function createCard() {
     if (globalInstance) {
       globalInstance.$.destroy();
     }
     globalInstance = weave('.card', ({ $ }) => {
       // ...
     });
   }
   ```

3. **Verify cleanup is called**:
   ```typescript
   weave('.card', ({ cleanup }) => {
     let cleanupCalled = false;
     
     cleanup(() => {
       cleanupCalled = true;
       console.log('Cleanup executed');
     });
     
     // Later, verify cleanup was called
     setTimeout(() => {
       if (!cleanupCalled) {
         console.warn('Memory leak: cleanup not called');
       }
     }, 1000);
   });
   ```

### Common leak sources

1. **Forgotten event listeners**
   ```typescript
   // ❌ Leak
   weave('.card', ({ $ }) => {
     window.addEventListener('resize', handleResize);
     // Never removed
   });
   
   // ✅ Fix
   weave('.card', ({ cleanup }) => {
     window.addEventListener('resize', handleResize);
     cleanup(() => {
       window.removeEventListener('resize', handleResize);
     });
   });
   ```

2. **Circular references**
   ```typescript
   // ❌ Leak
   weave('.card', ({ ref }) => {
     const data = ref({ items: [] });
     data.value.items.push(data); // Circular reference
   });
   
   // ✅ Fix: Avoid circular references
   weave('.card', ({ ref }) => {
     const data = ref({ items: [] });
     // Don't store references to parent objects
   });
   ```

3. **Uncancelled promises**
   ```typescript
   // ❌ Leak
   weave('.card', ({ promise }) => {
     const { data } = promise('/api/data');
     // Promise continues even after destroy
   });
   
   // ✅ Fix
   weave('.card', ({ promise, cleanup }) => {
     const { data, abort } = promise('/api/data');
     cleanup(() => {
       abort(); // Cancel pending request
     });
   });
   ```

---

## Getting Help

If you're still experiencing issues:

1. **Check the examples**: See [examples.md](./examples.md) for working code patterns
2. **Review the API docs**: Ensure you're using the API correctly
3. **Search existing issues**: Check the GitHub issues for similar problems
4. **Create a minimal reproduction**: Isolate the problem in a small example
5. **Open an issue**: Provide your reproduction case and environment details

### Useful debugging tools

```typescript
// Enable development mode warnings
if (process.env.NODE_ENV !== 'production') {
  // Weave will log warnings for common mistakes
}

// Log state changes
weave('.card', ({ onUpdate }) => {
  onUpdate((newState, oldState) => {
    console.log('State changed:', { newState, oldState });
  });
});

// Track dirty state
weave('.card', ({ $ }) => {
  console.log('Is dirty:', $.isDirty());
  console.log('Changed properties:', $.getDirty());
  console.log('Diff:', $.diff());
});

// Monitor store changes
const store = createStore('cart', ({ state, use }) => {
  state({ items: [] });
  use(logger({ prefix: '[cart]' })); // Logs all changes
});
```
