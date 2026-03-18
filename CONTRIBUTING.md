# Contributing to Weave

Thank you for your interest in contributing to Weave! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Documentation](#documentation)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Assume good intentions
- Respect differing viewpoints and experiences

## Getting Started

### Prerequisites

- Node.js 16+ and npm 7+
- Git
- A code editor (VS Code recommended)
- Basic knowledge of TypeScript and reactive programming

### First Time Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/weave.git
   cd weave
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/weave.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Run tests** to verify setup:
   ```bash
   npm test
   ```

6. **Build the project**:
   ```bash
   npm run build
   ```

## Development Setup

### Available Scripts

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Build the project
npm run build

# Build in watch mode
npm run build:watch

# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

### Development Environment

We recommend using VS Code with these extensions:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Vitest

### Environment Variables

For development, you can create a `.env` file:

```bash
NODE_ENV=development
```

## Project Structure

```
weave/
├── src/
│   ├── core/              # Core weave() function and proxy system
│   │   ├── weave.ts       # Main weave() implementation
│   │   ├── proxy.ts       # Proxy handler
│   │   ├── dependency-tracker.ts  # Reactive dependency tracking
│   │   └── lifecycle.ts   # Lifecycle hooks
│   ├── reactive/          # Reactive primitives
│   │   ├── ref.ts         # ref() implementation
│   │   ├── computed.ts    # computed() implementation
│   │   ├── state.ts       # state() snapshot system
│   │   ├── watch.ts       # watch() and memo()
│   │   └── batch.ts       # batch() implementation
│   ├── dom/               # DOM manipulation
│   │   ├── node-ref.ts    # NodeRef class and $ selector
│   │   ├── directives.ts  # All directive implementations
│   │   ├── mutation-observer.ts  # Observer system
│   │   └── event-delegation.ts   # Event handling
│   ├── store/             # Store system
│   │   ├── create-store.ts       # createStore() implementation
│   │   ├── store-group.ts        # createStoreGroup()
│   │   ├── store-actions.ts      # Action helpers
│   │   └── store-plugins.ts      # Built-in plugins
│   ├── advanced/          # Advanced features
│   │   ├── head.ts        # head() document metadata
│   │   ├── sync.ts        # sync() reattachment
│   │   ├── adapters.ts    # Sync adapters
│   │   ├── template.ts    # template() rendering
│   │   └── promise.ts     # promise() fetch integration
│   ├── collections/       # Array utilities
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts       # All exported types
│   └── index.ts           # Main entry point
├── docs/                  # Documentation
├── benchmarks/            # Performance benchmarks
├── .kiro/                 # Spec files (design docs, requirements, tasks)
└── tests/                 # Additional test files
```

## Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
# Update your fork
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 2. Make Your Changes

- Write clean, readable code
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Keep commits focused and atomic

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/core/weave.test.ts

# Run tests in watch mode
npm run test:watch
```

### 4. Commit Your Changes

Follow our [commit guidelines](#commit-guidelines):

```bash
git add .
git commit -m "feat: add new directive for X"
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Coding Standards

### TypeScript Guidelines

1. **Use strict mode**: All code must pass TypeScript strict mode
   ```typescript
   // ✅ Good - explicit types
   function createRef<T>(initialValue: T): Ref<T> {
     return { value: initialValue };
   }
   
   // ❌ Bad - implicit any
   function createRef(initialValue) {
     return { value: initialValue };
   }
   ```

2. **Prefer interfaces over types** for object shapes
   ```typescript
   // ✅ Good
   interface NodeRefOptions {
     selector: string;
     root: Element;
   }
   
   // ❌ Avoid (unless needed for unions/intersections)
   type NodeRefOptions = {
     selector: string;
     root: Element;
   }
   ```

3. **Use const assertions** for literal types
   ```typescript
   // ✅ Good
   const DIRECTIVE_TYPES = ['text', 'html', 'show'] as const;
   
   // ❌ Bad
   const DIRECTIVE_TYPES = ['text', 'html', 'show'];
   ```

4. **Avoid `any`** - use `unknown` or proper types
   ```typescript
   // ✅ Good
   function process(value: unknown): string {
     if (typeof value === 'string') {
       return value;
     }
     return String(value);
   }
   
   // ❌ Bad
   function process(value: any): string {
     return value;
   }
   ```

### Code Style

1. **Use descriptive variable names**
   ```typescript
   // ✅ Good
   const isElementVisible = element.style.display !== 'none';
   
   // ❌ Bad
   const x = element.style.display !== 'none';
   ```

2. **Keep functions small and focused**
   ```typescript
   // ✅ Good - single responsibility
   function createElement(tag: string): Element {
     return document.createElement(tag);
   }
   
   function appendElement(parent: Element, child: Element): void {
     parent.appendChild(child);
   }
   
   // ❌ Bad - doing too much
   function createAndAppendElement(parent: Element, tag: string): Element {
     const element = document.createElement(tag);
     parent.appendChild(element);
     element.classList.add('default');
     element.setAttribute('data-created', Date.now().toString());
     return element;
   }
   ```

3. **Use early returns** to reduce nesting
   ```typescript
   // ✅ Good
   function processValue(value: string | null): string {
     if (!value) {
       return '';
     }
     
     if (value.length === 0) {
       return 'empty';
     }
     
     return value.trim();
   }
   
   // ❌ Bad
   function processValue(value: string | null): string {
     if (value) {
       if (value.length > 0) {
         return value.trim();
       } else {
         return 'empty';
       }
     } else {
       return '';
     }
   }
   ```

4. **Comment complex logic**
   ```typescript
   // ✅ Good
   // Track dependency if inside reactive context
   // This allows computed properties to automatically re-run
   // when their dependencies change
   if (activeEffect) {
     track(target, key);
   }
   
   // ❌ Bad - no explanation for complex logic
   if (activeEffect) {
     track(target, key);
   }
   ```

### Performance Considerations

1. **Avoid unnecessary computations**
   ```typescript
   // ✅ Good - cache result
   const elements = Array.from(container.children);
   for (const element of elements) {
     process(element);
   }
   
   // ❌ Bad - recomputes on every iteration
   for (let i = 0; i < container.children.length; i++) {
     process(container.children[i]);
   }
   ```

2. **Use WeakMap/WeakSet** for object-keyed caches
   ```typescript
   // ✅ Good - allows garbage collection
   const cache = new WeakMap<Element, NodeRef>();
   
   // ❌ Bad - prevents garbage collection
   const cache = new Map<Element, NodeRef>();
   ```

3. **Batch DOM operations**
   ```typescript
   // ✅ Good - single reflow
   const fragment = document.createDocumentFragment();
   items.forEach(item => {
     fragment.appendChild(createItem(item));
   });
   container.appendChild(fragment);
   
   // ❌ Bad - multiple reflows
   items.forEach(item => {
     container.appendChild(createItem(item));
   });
   ```

## Testing Guidelines

### Test Structure

We use Vitest for testing. Tests should be colocated with source files:

```
src/
├── core/
│   ├── weave.ts
│   └── weave.test.ts
```

### Writing Tests

1. **Use descriptive test names**
   ```typescript
   // ✅ Good
   it('should update DOM when ref value changes', () => {
     // ...
   });
   
   // ❌ Bad
   it('works', () => {
     // ...
   });
   ```

2. **Follow AAA pattern** (Arrange, Act, Assert)
   ```typescript
   it('should increment counter on button click', () => {
     // Arrange
     const container = document.createElement('div');
     container.innerHTML = '<button class="btn">Click</button>';
     const instance = weave(container, ({ $, ref }) => {
       const count = ref(0);
       $('.btn').on('click', () => count.value++);
     });
     
     // Act
     container.querySelector('.btn').click();
     
     // Assert
     expect(instance.count).toBe(1);
   });
   ```

3. **Test edge cases**
   ```typescript
   describe('ref()', () => {
     it('should handle null values', () => {
       const value = ref<string | null>(null);
       expect(value.value).toBeNull();
     });
     
     it('should handle undefined values', () => {
       const value = ref<string | undefined>(undefined);
       expect(value.value).toBeUndefined();
     });
     
     it('should handle empty strings', () => {
       const value = ref('');
       expect(value.value).toBe('');
     });
   });
   ```

4. **Clean up after tests**
   ```typescript
   describe('weave()', () => {
     let container: HTMLDivElement;
     
     beforeEach(() => {
       container = document.createElement('div');
       document.body.appendChild(container);
     });
     
     afterEach(() => {
       container.remove();
     });
     
     it('should create instance', () => {
       const instance = weave(container, () => {});
       expect(instance).toBeDefined();
     });
   });
   ```

### Test Coverage

- Aim for 80%+ code coverage
- All new features must include tests
- Bug fixes should include regression tests
- Run coverage report: `npm run test:coverage`

### Property-Based Testing

For complex logic, consider property-based tests using fast-check:

```typescript
import fc from 'fast-check';

it('should maintain array length after sortBy', () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), (arr) => {
      const sorted = sortBy(arr, x => x);
      expect(sorted.length).toBe(arr.length);
    })
  );
});
```

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
# Feature
git commit -m "feat(directives): add toggle() directive"

# Bug fix
git commit -m "fix(ref): prevent infinite loop in circular dependencies"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Breaking change
git commit -m "feat(store)!: change action signature

BREAKING CHANGE: Actions now receive context as third parameter"
```

### Commit Best Practices

1. **Keep commits atomic** - one logical change per commit
2. **Write clear messages** - explain what and why, not how
3. **Reference issues** - use `Fixes #123` or `Closes #456`
4. **Avoid "WIP" commits** - squash before PR

## Pull Request Process

### Before Submitting

- [ ] Tests pass locally (`npm test`)
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with main

### PR Template

When creating a PR, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How has this been tested?

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Follows code style
```

### Review Process

1. **Automated checks** must pass (tests, linting, type checking)
2. **At least one approval** from maintainers required
3. **Address feedback** - respond to all comments
4. **Squash commits** if requested
5. **Maintainer will merge** once approved

### After Merge

- Delete your branch
- Update your fork:
  ```bash
  git checkout main
  git pull upstream main
  git push origin main
  ```

## Documentation

### When to Update Docs

- Adding new features
- Changing existing APIs
- Fixing bugs that affect usage
- Adding examples or clarifications

### Documentation Files

- `README.md` - Overview and quick start
- `docs/getting-started.md` - Installation and basics
- `docs/examples.md` - Usage examples
- `docs/troubleshooting.md` - Common issues
- `CHANGELOG.md` - Version history

### Documentation Style

1. **Use clear, simple language**
2. **Include code examples**
3. **Show both correct and incorrect usage**
4. **Link to related documentation**
5. **Keep examples minimal and focused**

Example:

```markdown
### ref()

Creates a reactive reference to a value.

**Usage:**
```typescript
const count = ref(0);
count.value++; // Triggers reactivity
```

**Type signature:**
```typescript
function ref<T>(initialValue: T): Ref<T>
```

**See also:** [computed()](#computed), [watch()](#watch)
```

## Reporting Bugs

### Before Reporting

1. **Search existing issues** - your bug may already be reported
2. **Try latest version** - bug may be fixed
3. **Create minimal reproduction** - isolate the problem

### Bug Report Template

```markdown
**Describe the bug**
Clear description of what's wrong

**To Reproduce**
Steps to reproduce:
1. Create instance with...
2. Call method...
3. See error

**Expected behavior**
What should happen

**Actual behavior**
What actually happens

**Minimal reproduction**
```typescript
// Minimal code that reproduces the issue
```

**Environment**
- Weave version: 
- Browser: 
- OS: 
- Node version (if applicable):

**Additional context**
Any other relevant information
```

## Suggesting Features

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
Description of the problem

**Describe the solution you'd like**
Clear description of desired feature

**Describe alternatives you've considered**
Other approaches you've thought about

**API proposal (if applicable)**
```typescript
// Proposed API
```

**Use cases**
Real-world scenarios where this would be useful

**Additional context**
Any other relevant information
```

### Feature Discussion

- Features are discussed in GitHub issues
- Maintainers will label as `enhancement`
- Community feedback is encouraged
- Implementation may be assigned or open for contribution

## Questions?

- **General questions**: Open a GitHub Discussion
- **Bug reports**: Open a GitHub Issue
- **Security issues**: Email security@weave.dev (do not open public issue)
- **Chat**: Join our Discord server (link in README)

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation (for significant contributions)

Thank you for contributing to Weave! 🎉
