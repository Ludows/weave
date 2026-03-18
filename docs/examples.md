# Common Use Cases and Examples

## Todo List

```typescript
import { weave } from 'weave';

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

## Form Validation

```typescript
weave('#signup-form', ({ $, ref, computed }) => {
  const email = ref('');
  const password = ref('');
  const confirmPassword = ref('');
  
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
  
  // Bind inputs
  $('#email').on('input', (e) => {
    email.value = (e.target as HTMLInputElement).value;
  });
  
  $('#password').on('input', (e) => {
    password.value = (e.target as HTMLInputElement).value;
  });
  
  $('#confirm-password').on('input', (e) => {
    confirmPassword.value = (e.target as HTMLInputElement).value;
  });
  
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
import { createStore, weave } from 'weave';

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

## Modal Dialog

```typescript
weave('#modal', ({ $, ref }) => {
  const isOpen = ref(false);
  const title = ref('');
  const content = ref('');
  
  // Show/hide modal
  $('#modal').show(() => isOpen.value);
  
  // Set content
  $('#modal-title').text(() => title.value);
  $('#modal-content').text(() => content.value);
  
  // Close handlers
  $('#close-modal').on('click', () => isOpen.value = false);
  $('#modal-overlay').on('click', () => isOpen.value = false);
  
  // Prevent closing when clicking modal content
  $('#modal-content').on('click', (e) => e.stopPropagation());
  
  // Expose API
  window.openModal = (t: string, c: string) => {
    title.value = t;
    content.value = c;
    isOpen.value = true;
  };
});

// Usage from other components
$('#open-modal-btn').on('click', () => {
  window.openModal('Hello', 'This is modal content');
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

