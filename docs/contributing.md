# Contributing to Weave

Thank you for your interest in contributing! This guide covers everything you need to get started.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- Basic knowledge of TypeScript and reactive programming

### Setup

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/weave.git
cd weave

# Add upstream
git remote add upstream https://github.com/Ludows/weave.git

# Install dependencies
npm install

# Verify setup
npm test
```

## Development Workflow

### Available Scripts

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
npm run build         # Full build (ESM + CJS + UMD + types)
npm run dev           # TypeScript watch mode
npm run docs:dev      # Documentation dev server
```

### Branch Workflow

```bash
# Start from an up-to-date main
git checkout main
git pull upstream main

# Create your branch
git checkout -b feat/your-feature-name
# or
git checkout -b fix/bug-description
```

## Project Structure

```
weave/
├── src/
│   ├── core/              # weave(), proxy, dependency tracking
│   ├── reactive/          # ref, computed, watch, batch, effect
│   ├── dom/               # NodeRef, directives, event delegation
│   ├── store/             # createStore, plugins, actions, groups
│   ├── advanced/          # head, sync, adapters, promise
│   ├── collections/       # ProxyCollection helpers
│   ├── utils/             # parser, pretty-printer, next-tick
│   └── types/             # TypeScript type definitions
├── docs/                  # VitePress documentation
└── CHANGELOG.md
```

## Coding Standards

### TypeScript

- **Strict mode** — all code must pass `tsc --strict`
- **No `any`** — use `unknown` and proper narrowing
- **Prefer interfaces** over type aliases for object shapes
- **Avoid side effects** at module level

### Code Style

- Early returns to reduce nesting
- Descriptive variable names
- Small, focused functions
- Comment complex or non-obvious logic only

### Performance

- Use `WeakMap`/`WeakSet` for object-keyed caches
- Batch DOM operations via `DocumentFragment`
- Avoid unnecessary computations in hot paths

## Testing

Tests are colocated with source files (`src/foo/bar.test.ts` next to `src/foo/bar.ts`).

```typescript
// Arrange → Act → Assert
it('should update DOM when ref value changes', () => {
  const container = document.createElement('div');
  // ...
});
```

Guidelines:
- Every new feature needs tests
- Bug fixes need a regression test
- Clean up DOM in `afterEach` when using `document.body`
- For complex logic, use property-based tests via [fast-check](https://fast-check.io/)

Run a specific file:

```bash
npm test -- src/reactive/ref.test.ts
```

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(store): add createPlugin() helper
fix(ref): prevent infinite loop on circular deps
docs(readme): update installation instructions
test(watch): add edge cases for immediate option
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

Use `!` for breaking changes:

```
feat(store)!: change action signature

BREAKING CHANGE: Actions now receive context as third parameter.
```

## Pull Request Checklist

- [ ] `npm test` passes locally
- [ ] New code has tests
- [ ] Documentation updated if public API changed
- [ ] Commits follow Conventional Commits format
- [ ] Branch is up to date with `main`

## Reporting Bugs

Open a [GitHub Issue](https://github.com/Ludows/weave/issues) with:

- Steps to reproduce
- Expected vs. actual behavior
- Minimal code reproduction
- Weave version, browser, OS

## Suggesting Features

Open a GitHub Issue with:

- The problem it solves
- Proposed API (code example)
- Alternatives considered

## Questions?

Open a [GitHub Discussion](https://github.com/Ludows/weave/discussions) for general questions, or an Issue for bugs.
