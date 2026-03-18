# Common Use Cases and Examples

## Todo List

```typescript
import { weave } from '@ludoows/weave';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

weave('#todo-app', ({ $, ref, computed }) => {
  const todos = ref<Todo[]>([]);
  const newTodoText = ref('');
  let nextId = 1;
  
  computed('activeTodos', () => todos.value.filter(t => !t.completed));
  computed('completedTodos', () => todos.value.filter(t => t.completed));
  
  // Add todo
  $('#add-todo').on('click', () => {
    if (newTodoText.value.trim()) {
      todos.value = [
        ...todos.value,
        { id: nextId++, text: newTodoText.value, completed: false }
      ];
      newTodoText.value = '';
    }
  });
  
  // Toggle todo
  on('click', '.todo-item', (e) => {
    const id = parseInt((e.target as HTMLElement).dataset.id || '0');
    todos.value = todos.value.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
  });
  
  // Delete todo
  on('click', '.delete-btn', (e) => {
    const id = parseInt((e.target as HTMLElement).dataset.id || '0');
    todos.value = todos.value.filter(t => t.id !== id);
  });
  
  // Render list
  $('#todo-list').html(() => `
    <ul>
      ${todos.value.map(t => `
        <li class="todo-item ${t.completed ? 'completed' : ''}" data-id="${t.id}">
          <span>${t.text}</span>
          <button class="delete-btn" data-id="${t.id}">Delete</button>
        </li>
      `).join('')}
    </ul>
  `);
  
  // Show counts
  $('#active-count').text(() => instance.activeTodos.length);
  $('#completed-count').text(() => instance.completedTodos.length);
});
```

## Form Validation with model()

```typescript
weave('#signup-form', ({ $, ref, computed }) => {
  const email = ref('');
  const password = ref('');
  const confirmPassword = ref('');

  // Two-way binding — no need to manually handle input events
  $('#email').model(email);
  $('#password').model(password);
  $('#confirm-password').model(confirmPassword);
  
  computed('isEmailValid', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.value);
  });
  
  computed('isPasswordValid', () => password.value.length >= 8);
  
  computed('doPasswordsMatch', () => 
    password.value === confirmPassword.value
  );
  
  computed('isFormValid', () =>
    instance.isEmailValid &&
    instance.isPasswordValid &&
    instance.doPasswordsMatch
  );
  
  // Show validation messages
  $('#email-error').show(() => email.value && !instance.isEmailValid);
  $('#password-error').show(() => password.value && !instance.isPasswordValid);
  $('#match-error').show(() => 
    confirmPassword.value && !instance.doPasswordsMatch
  );
  
  // Enable/disable submit
  $('#submit').bind('disabled', () => !instance.isFormValid);
  
  // Handle submit
  $('#signup-form').on('submit', async (e) => {
    e.preventDefault();
    if (instance.isFormValid) {
      await submitForm({ email: email.value, password: password.value });
    }
  });
});
```

## Data Fetching with Loading States

```typescript
weave('#user-profile', ({ $, ref, promise }) => {
  const userId = ref(1);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const userData = ref<any>(null);
  
  const fetchUser = promise(
    () => `/api/users/${userId.value}`,
    {
      watch: true,
      debounce: 300,
      onStart: () => {
        isLoading.value = true;
        error.value = null;
      },
      onSuccess: (data) => {
        userData.value = data;
        isLoading.value = false;
      },
      onError: (err) => {
        error.value = err.message;
        isLoading.value = false;
      }
    }
  );
  
  // Show loading state
  $('#loading').show(() => isLoading.value);
  $('#content').hide(() => isLoading.value);
  $('#error').show(() => error.value !== null);
  
  // Display user data
  $('#user-name').text(() => userData.value?.name || '');
  $('#user-email').text(() => userData.value?.email || '');
  
  // Change user
  $('#user-select').on('change', (e) => {
    userId.value = parseInt((e.target as HTMLSelectElement).value);
  });
});
```

## Shopping Cart with Store

```typescript
import { createStore, weave } from '@ludoows/weave';

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

const cartStore = createStore('cart', ({ state, action, computed }) => {
  state({ items: [] as CartItem[] });
  
  computed('total', (s) =>
    s.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
  
  computed('itemCount', (s) =>
    s.items.reduce((sum, item) => sum + item.quantity, 0)
  );
  
  action('addItem', (s, item: CartItem) => {
    const existing = s.items.find(i => i.id === item.id);
    if (existing) {
      existing.quantity++;
    } else {
      s.items.push({ ...item, quantity: 1 });
    }
  });
  
  action('removeItem', (s, id: number) => {
    s.items = s.items.filter(i => i.id !== id);
  });
  
  action('updateQuantity', (s, payload: { id: number; quantity: number }) => {
    const item = s.items.find(i => i.id === payload.id);
    if (item) {
      item.quantity = payload.quantity;
      if (item.quantity <= 0) {
        s.items = s.items.filter(i => i.id !== payload.id);
      }
    }
  });
  
  action('clear', (s) => {
    s.items = [];
  });
});

// Product list component
weave('#product-list', ({ store, on }) => {
  store(cartStore);
  
  on('click', '.add-to-cart', (e) => {
    const btn = e.target as HTMLElement;
    const product = {
      id: parseInt(btn.dataset.id || '0'),
      name: btn.dataset.name || '',
      price: parseFloat(btn.dataset.price || '0'),
      quantity: 1
    };
    cartStore.actions.addItem(product);
  });
});

// Cart component
weave('#cart', ({ $, store }) => {
  store(cartStore);
  
  // Display cart items
  $('#cart-items').html(() => `
    <ul>
      ${cartStore.state.items.map(item => `
        <li>
          <span>${item.name}</span>
          <span>$${item.price}</span>
          <input type="number" 
                 value="${item.quantity}" 
                 data-id="${item.id}"
                 class="quantity-input">
          <button class="remove-btn" data-id="${item.id}">Remove</button>
        </li>
      `).join('')}
    </ul>
  `);
  
  // Show total
  $('#cart-total').text(() => `$${cartStore.state.total.toFixed(2)}`);
  $('#cart-count').text(() => cartStore.state.itemCount);
  
  // Update quantity
  on('change', '.quantity-input', (e) => {
    const input = e.target as HTMLInputElement;
    const id = parseInt(input.dataset.id || '0');
    const quantity = parseInt(input.value);
    cartStore.actions.updateQuantity({ id, quantity });
  });
  
  // Remove item
  on('click', '.remove-btn', (e) => {
    const id = parseInt((e.target as HTMLElement).dataset.id || '0');
    cartStore.actions.removeItem(id);
  });
  
  // Clear cart
  $('#clear-cart').on('click', () => {
    if (confirm('Clear cart?')) {
      cartStore.actions.clear();
    }
  });
});
```

## Modal Dialog with teleport() and dispatch()

```html
<div id="app">
  <button id="open-modal-btn">Open Modal</button>

  <!-- The modal will be teleported into <body> to avoid z-index issues -->
  <div id="modal" style="display:none">
    <div id="modal-overlay"></div>
    <div id="modal-box">
      <h2 id="modal-title"></h2>
      <p id="modal-content"></p>
      <button id="close-modal">Close</button>
    </div>
  </div>
</div>
```

```typescript
weave('#app', ({ $, ref, dispatch }) => {
  const isOpen = ref(false);
  const title = ref('');
  const content = ref('');

  // Teleport the modal into <body> for correct z-index stacking
  $('#modal').teleport('body');

  // Show/hide modal
  $('#modal').show(() => isOpen.value);

  // Content
  $('#modal-title').text(() => title.value);
  $('#modal-content').text(() => content.value);

  // Close handlers
  $('#close-modal').on('click', () => {
    isOpen.value = false;
    dispatch('modal:closed');
  });
  $('#modal-overlay').on('click', () => { isOpen.value = false; });

  // Listen for the open event
  document.addEventListener('modal:open', (e) => {
    const { titleText, bodyText } = (e as CustomEvent).detail;
    title.value = titleText;
    content.value = bodyText;
    isOpen.value = true;
  });
});

// Depuis n'importe où dans la page :
document.dispatchEvent(new CustomEvent('modal:open', {
  detail: { titleText: 'Hello', bodyText: 'This is modal content' }
}));
```

## Direct element access with $refs()

```html
<form id="login-form" weave-cloak>
  <input weave-ref="email" type="email" placeholder="Email" />
  <input weave-ref="password" type="password" placeholder="Password" />
  <button weave-ref="submit" type="submit">Login</button>
  <p weave-ref="error" style="display:none; color:red"></p>
</form>
```

```typescript
weave('#login-form', ({ $refs, ref, nextTick }) => {
  const isLoading = ref(false);

  const { email, password, submit, error } = $refs();

  (submit as HTMLButtonElement).addEventListener('click', async (e) => {
    e.preventDefault();
    isLoading.value = true;
    (submit as HTMLButtonElement).disabled = true;

    try {
      await loginApi({
        email: (email as HTMLInputElement).value,
        password: (password as HTMLInputElement).value,
      });
      window.location.href = '/dashboard';
    } catch (err) {
      (error as HTMLElement).textContent = (err as Error).message;
      (error as HTMLElement).style.display = 'block';

      // Wait for the next cycle before re-focusing
      await nextTick();
      (email as HTMLInputElement).focus();
    } finally {
      isLoading.value = false;
      (submit as HTMLButtonElement).disabled = false;
    }
  });
  // weave-cloak is automatically removed after init
});
```

## Tabs Component

```typescript
weave('#tabs', ({ $, ref }) => {
  const activeTab = ref('tab1');
  
  // Tab buttons
  on('click', '.tab-btn', (e) => {
    const btn = e.target as HTMLElement;
    activeTab.value = btn.dataset.tab || 'tab1';
  });
  
  // Highlight active tab
  $('.tab-btn').forEach((btn) => {
    const tabId = btn.dataset.tab;
    btn.toggleClass('active', () => activeTab.value === tabId);
  });
  
  // Show/hide tab content
  $('.tab-content').forEach((content) => {
    const tabId = content.dataset.tab;
    content.show(() => activeTab.value === tabId);
  });
});
```

## Infinite Scroll

```typescript
weave('#infinite-list', ({ $, ref, promise }) => {
  const page = ref(1);
  const items = ref<any[]>([]);
  const hasMore = ref(true);
  const isLoading = ref(false);
  
  const loadMore = async () => {
    if (isLoading.value || !hasMore.value) return;
    
    isLoading.value = true;
    
    const result = await promise(
      () => `/api/items?page=${page.value}`,
      {
        onSuccess: (data) => {
          items.value = [...items.value, ...data.items];
          hasMore.value = data.hasMore;
          page.value++;
          isLoading.value = false;
        },
        onError: () => {
          isLoading.value = false;
        }
      }
    );
  };
  
  // Initial load
  loadMore();
  
  // Scroll handler
  on('scroll', window, () => {
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    
    if (scrollTop + windowHeight >= docHeight - 100) {
      loadMore();
    }
  });
  
  // Render items
  $('#item-list').html(() => `
    <ul>
      ${items.value.map(item => `
        <li>${item.name}</li>
      `).join('')}
    </ul>
  `);
  
  $('#loading').show(() => isLoading.value);
});
```

