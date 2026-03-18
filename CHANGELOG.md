# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-XX

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
- Comprehensive directive system:
  - `text()` and `html()` for content updates
  - `show()` and `hide()` for visibility control
  - `if()` for conditional mounting/unmounting
  - `bind()` for attribute binding
  - `attr()`, `addClass()`, `removeClass()`, `toggleClass()` for attribute/class manipulation
  - `data()` for data attribute management
  - `style()` for inline style binding
  - `focus()`, `blur()`, `scroll()` for focus/scroll control
  - `for()` for list rendering with automatic sync
  - `template()` for template rendering (string, URL, sibling)

#### Event System
- Event delegation with `on()` and `off()`
- Support for document and window events
- Automatic cleanup on destruction
- Type-safe event handlers

#### Store System
- `createStore()` for global reactive state
- Store actions with composition via `call()`
- Store computed properties
- Store plugin system for extensibility
- `createStoreGroup()` for orchestrating multiple stores
- Cross-store computed properties and actions
- Store watchers and dirty tracking

#### Advanced Features
- `promise()` for integrated fetch with lifecycle callbacks
- `watch()` for reactive value observation with debouncing
- `when()` and `unless()` for conditional execution
- `memo()` for memoization
- `head()` for document metadata management
- `sync()` for DOM reattachment during page transitions
- Preconfigured adapters for Swup, Turbo, and Barba.js

#### Lifecycle & Cleanup
- `onInit()`, `onUpdate()`, `onDestroy()` lifecycle hooks
- `cleanup()` for resource management
- Automatic cleanup of observers, listeners, and watchers
- Recursive destruction of child instances

#### Developer Experience
- Full TypeScript strict mode support
- Complete type inference for refs, computed, and stores
- Zero `any` types in codebase
- Development mode with warnings and error messages
- Contextual error messages with suggestions

#### Build & Distribution
- ES Module (ESM) build for modern bundlers
- CommonJS (CJS) build for Node.js compatibility
- UMD build for direct browser usage
- Complete TypeScript declaration files (.d.ts)
- Tree-shaking support
- Source maps for debugging

#### Testing
- Comprehensive unit test suite
- Property-based tests with fast-check
- Integration tests for complete workflows
- 100+ test iterations for property tests

#### Documentation
- Complete API reference
- Getting started guide
- Security best practices
- Common use case examples
- TypeScript usage guide
- Performance optimization guide

### Browser Compatibility
- Chrome/Edge 49+
- Firefox 18+
- Safari 10+

### Dependencies
- Zero runtime dependencies
- Development dependencies only for build and testing

