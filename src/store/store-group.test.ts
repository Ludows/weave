/**
 * Tests for createStoreGroup() implementation
 */

import { describe, expect, it } from 'vitest';
import { createStore } from './create-store';
import { createStoreGroup } from './store-group';

describe('createStoreGroup', () => {
  it('should create a store group with multiple stores', () => {
    const cartStore = createStore('cart', ({ state }) => {
      state({ items: [] as any[], total: 0 });
    });

    const userStore = createStore('user', ({ state }) => {
      state({ name: 'John', isLoggedIn: true });
    });

    const group = createStoreGroup('shop', { cart: cartStore, user: userStore }, () => {});

    expect(group.name).toBe('shop');
    expect(group.stores.cart).toBe(cartStore);
    expect(group.stores.user).toBe(userStore);
  });

  it('should create cross-store computed properties', () => {
    const cartStore = createStore('cart', ({ state }) => {
      state({ items: [{ price: 10 }, { price: 20 }] as any[] });
    });

    const userStore = createStore('user', ({ state }) => {
      state({ discount: 0.1 });
    });

    const group = createStoreGroup(
      'shop',
      { cart: cartStore, user: userStore },
      ({ computed }) => {
        computed('totalWithDiscount', (stores) => {
          const total = stores.cart.state.items.reduce((sum: number, item: any) => sum + item.price, 0);
          return total * (1 - stores.user.state.discount);
        });
      }
    );

    expect(group.state.totalWithDiscount).toBe(27); // 30 * 0.9
  });

  it('should create cross-store actions', () => {
    const cartStore = createStore('cart', ({ state, action }) => {
      state({ items: [] as any[] });
      action('addItem', (s, item: any) => {
        s.items.push(item);
      });
    });

    const userStore = createStore('user', ({ state }) => {
      state({ points: 0 });
    });

    const group = createStoreGroup(
      'shop',
      { cart: cartStore, user: userStore },
      ({ action }) => {
        action('addItemWithPoints', (stores, item: any) => {
          stores.cart.state.items.push(item);
          stores.user.state.points += 10;
        });
      }
    );

    group.actions.addItemWithPoints({ name: 'Product', price: 50 });

    expect(cartStore.state.items.length).toBe(1);
    expect(userStore.state.points).toBe(10);
  });

  it('should support call() with storeName.actionName syntax', () => {
    const cartStore = createStore('cart', ({ state, action }) => {
      state({ items: [] as any[] });
      action('addItem', (s, item: any) => {
        s.items.push(item);
      });
    });

    const userStore = createStore('user', ({ state, action }) => {
      state({ points: 0 });
      action('addPoints', (s, amount: number) => {
        s.points += amount;
      });
    });

    const group = createStoreGroup(
      'shop',
      { cart: cartStore, user: userStore },
      ({ action }) => {
        action('purchase', (stores, item: any, { call }) => {
          call('cart.addItem', item);
          call('user.addPoints', 10);
        });
      }
    );

    group.actions.purchase({ name: 'Product', price: 50 });

    expect(cartStore.state.items.length).toBe(1);
    expect(userStore.state.points).toBe(10);
  });

  it('should support watch() for cross-store changes', () => {
    const cartStore = createStore('cart', ({ state }) => {
      state({ total: 0 });
    });

    const userStore = createStore('user', ({ state }) => {
      state({ name: 'John' });
    });

    let watchCallCount = 0;

    const group = createStoreGroup(
      'shop',
      { cart: cartStore, user: userStore },
      ({ watch }) => {
        watch(() => true, () => {
          watchCallCount++;
        });
      }
    );

    cartStore.state.total = 100;
    expect(watchCallCount).toBeGreaterThan(0);
  });
});
