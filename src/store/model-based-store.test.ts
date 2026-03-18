/**
 * Model-Based Store Property Tests
 * Tests that verify Store mutations are equivalent to plain JavaScript object mutations
 */

import * as fc from 'fast-check';
import { beforeEach, describe, it } from 'vitest';
import { createStore } from './create-store';

describe('Store Model-Based Properties', () => {
  beforeEach(() => {
    // Reset any global state if needed
  });

  describe('Property 27: Model-Based Store Equivalence', () => {
    /**
     * **Validates: Requirements 63.2**
     * 
     * For any Store mutations, the final Store.state SHALL be equivalent to 
     * applying the same mutations to a plain JavaScript object.
     */

    it('Store state mutations produce same result as plain object mutations', () => {
      fc.assert(
        fc.property(
          fc.record({
            initial: fc.record({
              count: fc.integer(),
              name: fc.string({ maxLength: 20 }),
              active: fc.boolean()
            }),
            mutations: fc.array(
              fc.oneof(
                fc.record({ type: fc.constant('count'), value: fc.integer() }),
                fc.record({ type: fc.constant('name'), value: fc.string({ maxLength: 20 }) }),
                fc.record({ type: fc.constant('active'), value: fc.boolean() })
              ),
              { minLength: 1, maxLength: 10 }
            )
          }),
          ({ initial, mutations }) => {
            // Create Store
            const store = createStore('test', ({ state, action }) => {
              state(initial);
              
              action('setCount', (s, value: number) => {
                s.count = value;
              });
              
              action('setName', (s, value: string) => {
                s.name = value;
              });
              
              action('setActive', (s, value: boolean) => {
                s.active = value;
              });
            });

            // Create plain object
            const plainObj = { ...initial };

            // Apply mutations to both
            for (const mutation of mutations) {
              if (mutation.type === 'count') {
                store.actions.setCount(mutation.value);
                plainObj.count = mutation.value;
              } else if (mutation.type === 'name') {
                store.actions.setName(mutation.value);
                plainObj.name = mutation.value;
              } else if (mutation.type === 'active') {
                store.actions.setActive(mutation.value);
                plainObj.active = mutation.value;
              }
            }

            // Verify equivalence
            return (
              store.state.count === plainObj.count &&
              store.state.name === plainObj.name &&
              store.state.active === plainObj.active
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Store with nested state mutations matches plain object', () => {
      fc.assert(
        fc.property(
          fc.record({
            initial: fc.record({
              user: fc.record({
                id: fc.integer(),
                profile: fc.record({
                  name: fc.string({ maxLength: 20 }),
                  age: fc.integer({ min: 0, max: 120 })
                })
              })
            }),
            mutations: fc.array(
              fc.oneof(
                fc.record({ type: fc.constant('id'), value: fc.integer() }),
                fc.record({ type: fc.constant('name'), value: fc.string({ maxLength: 20 }) }),
                fc.record({ type: fc.constant('age'), value: fc.integer({ min: 0, max: 120 }) })
              ),
              { minLength: 1, maxLength: 10 }
            )
          }),
          ({ initial, mutations }) => {
            const store = createStore('nested', ({ state, action }) => {
              state(initial);
              
              action('setId', (s, value: number) => {
                s.user.id = value;
              });
              
              action('setName', (s, value: string) => {
                s.user.profile.name = value;
              });
              
              action('setAge', (s, value: number) => {
                s.user.profile.age = value;
              });
            });

            const plainObj = JSON.parse(JSON.stringify(initial));

            for (const mutation of mutations) {
              if (mutation.type === 'id') {
                store.actions.setId(mutation.value);
                plainObj.user.id = mutation.value;
              } else if (mutation.type === 'name') {
                store.actions.setName(mutation.value);
                plainObj.user.profile.name = mutation.value;
              } else if (mutation.type === 'age') {
                store.actions.setAge(mutation.value);
                plainObj.user.profile.age = mutation.value;
              }
            }

            return (
              store.state.user.id === plainObj.user.id &&
              store.state.user.profile.name === plainObj.user.profile.name &&
              store.state.user.profile.age === plainObj.user.profile.age
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Store array mutations match plain array mutations', () => {
      fc.assert(
        fc.property(
          fc.record({
            initial: fc.array(fc.integer(), { minLength: 0, maxLength: 5 }),
            mutations: fc.array(
              fc.oneof(
                fc.record({ type: fc.constant('push'), value: fc.integer() }),
                fc.record({ type: fc.constant('pop') }),
                fc.record({ type: fc.constant('set'), index: fc.integer({ min: 0, max: 4 }), value: fc.integer() })
              ),
              { minLength: 1, maxLength: 10 }
            )
          }),
          ({ initial, mutations }) => {
            const store = createStore('array', ({ state, action }) => {
              state({ items: [...initial] });
              
              action('push', (s, value: number) => {
                s.items.push(value);
              });
              
              action('pop', (s) => {
                s.items.pop();
              });
              
              action('set', (s, payload: { index: number; value: number }) => {
                if (payload.index < s.items.length) {
                  s.items[payload.index] = payload.value;
                }
              });
            });

            const plainArray = [...initial];

            for (const mutation of mutations) {
              if (mutation.type === 'push') {
                store.actions.push(mutation.value);
                plainArray.push(mutation.value);
              } else if (mutation.type === 'pop') {
                store.actions.pop();
                plainArray.pop();
              } else if (mutation.type === 'set') {
                store.actions.set({ index: mutation.index, value: mutation.value });
                if (mutation.index < plainArray.length) {
                  plainArray[mutation.index] = mutation.value;
                }
              }
            }

            // Compare arrays
            if (store.state.items.length !== plainArray.length) {
              return false;
            }

            return store.state.items.every((item, i) => item === plainArray[i]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Store computed properties match plain object computed values', () => {
      fc.assert(
        fc.property(
          fc.record({
            initial: fc.record({
              firstName: fc.string({ maxLength: 20 }),
              lastName: fc.string({ maxLength: 20 }),
              age: fc.integer({ min: 0, max: 120 })
            }),
            mutations: fc.array(
              fc.oneof(
                fc.record({ type: fc.constant('firstName'), value: fc.string({ maxLength: 20 }) }),
                fc.record({ type: fc.constant('lastName'), value: fc.string({ maxLength: 20 }) }),
                fc.record({ type: fc.constant('age'), value: fc.integer({ min: 0, max: 120 }) })
              ),
              { minLength: 1, maxLength: 5 }
            )
          }),
          ({ initial, mutations }) => {
            const store = createStore('computed', ({ state, computed, action }) => {
              state(initial);
              
              computed('fullName', (s) => `${s.firstName} ${s.lastName}`);
              computed('isAdult', (s) => s.age >= 18);
              
              action('setFirstName', (s, value: string) => {
                s.firstName = value;
              });
              
              action('setLastName', (s, value: string) => {
                s.lastName = value;
              });
              
              action('setAge', (s, value: number) => {
                s.age = value;
              });
            });

            const plainObj = { ...initial };

            for (const mutation of mutations) {
              if (mutation.type === 'firstName') {
                store.actions.setFirstName(mutation.value);
                plainObj.firstName = mutation.value;
              } else if (mutation.type === 'lastName') {
                store.actions.setLastName(mutation.value);
                plainObj.lastName = mutation.value;
              } else if (mutation.type === 'age') {
                store.actions.setAge(mutation.value);
                plainObj.age = mutation.value;
              }
            }

            // Compute values for plain object
            const plainFullName = `${plainObj.firstName} ${plainObj.lastName}`;
            const plainIsAdult = plainObj.age >= 18;

            return (
              store.state.fullName === plainFullName &&
              store.state.isAdult === plainIsAdult &&
              store.state.firstName === plainObj.firstName &&
              store.state.lastName === plainObj.lastName &&
              store.state.age === plainObj.age
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Store action composition produces same result as sequential mutations', () => {
      fc.assert(
        fc.property(
          fc.record({
            initial: fc.record({
              x: fc.integer(),
              y: fc.integer()
            }),
            operations: fc.array(
              fc.oneof(
                fc.record({ type: fc.constant('increment'), axis: fc.constantFrom('x', 'y') }),
                fc.record({ type: fc.constant('decrement'), axis: fc.constantFrom('x', 'y') }),
                fc.record({ type: fc.constant('reset') })
              ),
              { minLength: 1, maxLength: 10 }
            )
          }),
          ({ initial, operations }) => {
            const store = createStore('actions', ({ state, action }) => {
              state(initial);
              
              action('incrementX', (s) => {
                s.x += 1;
              });
              
              action('incrementY', (s) => {
                s.y += 1;
              });
              
              action('decrementX', (s) => {
                s.x -= 1;
              });
              
              action('decrementY', (s) => {
                s.y -= 1;
              });
              
              action('reset', (s) => {
                s.x = initial.x;
                s.y = initial.y;
              });
            });

            const plainObj = { ...initial };

            for (const op of operations) {
              if (op.type === 'increment') {
                if (op.axis === 'x') {
                  store.actions.incrementX();
                  plainObj.x += 1;
                } else {
                  store.actions.incrementY();
                  plainObj.y += 1;
                }
              } else if (op.type === 'decrement') {
                if (op.axis === 'x') {
                  store.actions.decrementX();
                  plainObj.x -= 1;
                } else {
                  store.actions.decrementY();
                  plainObj.y -= 1;
                }
              } else if (op.type === 'reset') {
                store.actions.reset();
                plainObj.x = initial.x;
                plainObj.y = initial.y;
              }
            }

            return (
              store.state.x === plainObj.x &&
              store.state.y === plainObj.y
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
