---
outline: deep
---

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2026-03-19

### Added
- **Enhanced Plugin System** — New lifecycle hooks: `onAfterStateChange`, `onBeforeAction`, `onDestroy`, `onError`. Plugin priority ordering (lower runs first). `createPlugin()` helper.
- **Redux DevTools Extension** integration — Time-travel debugging, action replay, state inspection via the browser extension
- **Standalone DevTools Inspector** — `window.__WEAVE_DEVTOOLS__` with stores map, event timeline, `getState()`, `getEvents()`, `clear()`
- **`getDevtoolsInspector()`** — Programmatic access to the devtools inspector
- **`createPlugin()`** — Helper function to create typed store plugins with defaults
- **`store.destroy()`** — Proper store teardown with `onDestroy` plugin notification
- **VitePress documentation site** with full sidebar navigation and search
- **New documentation**: Plugin System guide, DevTools guide, Adapters & Sync guide
- Comprehensive test suites for 10 previously untested modules

### Improved
- **Plugin system** — Plugins now sorted by priority, errors in plugins caught and forwarded to `onError` hooks
- **persist plugin** — Now uses `onAfterStateChange` (fires after mutation) instead of `onStateChange` (fires before); cleans up timeout on destroy
- **logger plugin** — Now uses `onAfterStateChange` and `onBeforeAction` for more accurate logging
- **validate plugin** — Default priority 1 (runs first)
- **devtools plugin** — Default priority 99 (observes everything)

## [0.7.0] - 2026-03-19

### Added
- **`effect()`** — Public reactive effect API: runs a function and re-runs it when dependencies change, returns a stop function with cleanup support
- **Event modifiers** on `on()` — `.prevent`, `.stop`, `.once`, `.self`, `.debounce-{ms}` (`$('#form').on('submit.prevent', handler)`)
- **`$el` accessor** — Direct access to the root DOM element from callback context and NodeRef (`$el`, `$('#btn').el`)
- **`onError` hook** — Error boundary system: catch errors in callbacks, onInit, onUpdate, onDestroy without crashing the instance
- **Keyed diffing** for `for()` — Optional `key` function for efficient list reconciliation (`$('#list').for(items, cb, item => item.id)`)
- **`cleanup` option** on SyncOptions for adapter teardown

### Fixed
- **Memory leaks** in adapters (swup, turbo, barba) — event listeners now properly removed on cleanup
- **Memory leaks** in `debounceAction()` and `throttleAction()` — added `.cancel()` method, timeouts cleared on completion
- **Memory leak** in persist plugin — debounced timeout properly nullified after execution

### Improved
- **Error messages** — Switched from French to English, more contextual (`weave(): element not found (selector)`)
- **Dev warnings** — Empty selector warning in `$()`, invalid target in `weave()`
- 17 new tests (effect, event modifiers, keyed for, $el)

## [0.6.0] - 2026-03-19

### Improved
- **`for()` directive** — Complete rewrite with real DOM rendering: clones a template child, dynamically creates/removes elements, supports reactive arrays with efficient diffing (only new items trigger callbacks)
- **`model()` directive** — Added checkbox and radio button support via `checked` property binding
- **`on()` / `off()` on NodeRef** — Chainable event handling directly on selected elements (`$('#btn').on('click', handler).addClass('active')`)

### Added
- Comprehensive test suites for `for()` (10 tests), `model()` (12 tests), and `on()`/`off()` (8 tests)
- Updated documentation with new examples and usage guides

## [0.5.0] - 2026-03-19

### Added
- Complete documentation suite: reactive-state, store system, and extensibility guides

## [0.4.0] - 2026-03-19

### Added
- `model()` — Two-way binding for `<input>`, `<textarea>`, and `<select>`
- `teleport()` — Move elements to a different DOM target with automatic cleanup
- `dispatch()` — Emit custom events from component root
- `$refs()` — Direct element access via `weave-ref` attribute
- `nextTick()` — Wait for the next microtask cycle after reactive updates
- `[weave-cloak]` — Hide elements until Weave initialization completes

## [0.3.0] - 2026-03-19

### Added
- CDN support via unpkg and jsDelivr (`dist/umd/weave.min.js`)
- `unpkg` and `jsdelivr` fields in package.json

### Fixed
- Import paths in documentation examples

## [0.2.0] - 2026-03-19

### Fixed
- TypeScript strict mode errors (`TS6133` unused variables, `TS2322` type mismatches)
- Property-based test failure with counterexample `[-14, 0, -14]`
- Source map generation disabled (no more `.map` files in dist)

## [0.1.0] - 2026-03-19

### Added

#### Core Features
- Initial release of Weave reactive library
- Core `weave()` function for creating reactive instances
- Proxy-based reactive system with automatic dependency tracking
- Bidirectional DOM-state synchronization via MutationObserver

#### Reactive State
- `ref()` for creating reactive values
- `computed()` for derived state with automatic caching
- `state()` for immutable state snapshots
- `batch()` for grouping mutations with single render
- Automatic microtask batching for performance

#### DOM Integration
- NodeRef system with lazy querySelector resolution
- Comprehensive directive system: `text()`, `html()`, `show()`, `hide()`, `if()`, `bind()`, `attr()`, `addClass()`, `removeClass()`, `toggleClass()`, `data()`, `style()`, `focus()`, `blur()`, `scroll()`, `for()`, `template()`

#### Event System
- Event delegation with `on()` and `off()`
- Support for document and window events
- Automatic cleanup on destruction

#### Store System
- `createStore()` for global reactive state
- Store actions with composition via `call()`
- Store computed properties and plugin system
- `createStoreGroup()` for orchestrating multiple stores

#### Advanced Features
- `promise()` for integrated fetch with lifecycle callbacks
- `watch()` for reactive value observation with debouncing
- `when()` and `unless()` for conditional execution
- `memo()` for memoization
- `head()` for document metadata management
- `sync()` for DOM reattachment (Swup, Turbo, Barba.js adapters)

#### Lifecycle & Cleanup
- `onInit()`, `onUpdate()`, `onDestroy()` lifecycle hooks
- `cleanup()` for resource management
- Automatic cleanup of observers, listeners, and watchers

#### Build & Distribution
- ES Module (ESM), CommonJS (CJS), and UMD builds
- Complete TypeScript declaration files (.d.ts)
- Tree-shaking support
- Zero runtime dependencies
