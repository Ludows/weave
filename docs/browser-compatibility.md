# Browser Compatibility

## Minimum Browser Versions

Weave requires modern browser features and is compatible with:

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 49+ | Full support |
| Edge | 79+ (Chromium) | Full support |
| Firefox | 18+ | Full support |
| Safari | 10+ | Full support |
| Opera | 36+ | Full support |
| Samsung Internet | 5+ | Full support |

## Required Browser Features

Weave depends on the following modern JavaScript features:

### 1. Proxy (ES2015)

**Required for:** Core reactive system

Weave uses Proxy to intercept property access and mutations for automatic dependency tracking.

**Browser Support:**
- Chrome 49+
- Edge 12+
- Firefox 18+
- Safari 10+

**Polyfill:** Not available (Proxy cannot be polyfilled)

### 2. MutationObserver

**Required for:** Bidirectional DOM-state synchronization

Weave uses MutationObserver to detect external DOM changes and sync them back to state.

**Browser Support:**
- Chrome 26+
- Edge 12+
- Firefox 14+
- Safari 6+

**Polyfill:** Available but not recommended (performance impact)

### 3. AbortController

**Required for:** Promise cancellation in `promise()` function

Used to cancel pending fetch requests when components are destroyed.

**Browser Support:**
- Chrome 66+
- Edge 16+
- Firefox 57+
- Safari 12.1+

**Polyfill:** Available via `abortcontroller-polyfill`

```bash
npm install abortcontroller-polyfill
```

```typescript
import 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only';
```

### 4. ES2015+ Features

Weave uses modern JavaScript features:
- Arrow functions
- Template literals
- Destructuring
- Spread operator
- Classes
- Promises
- Map and Set
- Symbol

**Browser Support:** All modern browsers (Chrome 49+, Firefox 45+, Safari 10+, Edge 14+)

**Polyfill:** Use Babel with appropriate presets if targeting older browsers

## Feature Detection

You can detect if a browser supports Weave:

```typescript
function isWeaveSupported(): boolean {
  return (
    typeof Proxy !== 'undefined' &&
    typeof MutationObserver !== 'undefined' &&
    typeof AbortController !== 'undefined'
  );
}

if (!isWeaveSupported()) {
  console.error('Weave requires a modern browser with Proxy, MutationObserver, and AbortController support');
  // Fallback to non-reactive version or show upgrade message
}
```

## Polyfills

### Recommended Polyfill Setup

For maximum compatibility, include these polyfills:

```bash
npm install core-js abortcontroller-polyfill
```

```typescript
// polyfills.ts
import 'core-js/stable';
import 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only';
```

Import polyfills before Weave:

```typescript
import './polyfills';
import { weave } from 'weave';
```

### What Cannot Be Polyfilled

**Proxy** cannot be polyfilled. If Proxy is not available, Weave will not work. Consider:

1. **Progressive Enhancement**: Provide a non-reactive fallback
2. **Browser Upgrade Message**: Prompt users to upgrade
3. **Server-Side Rendering**: Render initial HTML on server

## Mobile Browser Support

### iOS Safari
- **Minimum:** iOS 10+ (Safari 10+)
- **Full Support:** iOS 12.2+ (for AbortController)

### Android Chrome
- **Minimum:** Android 5+ (Chrome 49+)
- **Full Support:** Android 7+ (Chrome 66+)

### Android WebView
- **Minimum:** Android 5+ (WebView 49+)
- **Note:** Ensure WebView is updated on user devices

## Testing Browser Compatibility

### Manual Testing

Test on real devices and browsers:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS 12+)
- Chrome Mobile (Android 7+)

### Automated Testing

Use BrowserStack or Sauce Labs for automated cross-browser testing:

```javascript
// Example Playwright config
export default {
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],
};
```

## Build Configuration

### Targeting Modern Browsers

If you only target modern browsers, use this TypeScript config:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ES2020"
  }
}
```

### Targeting Older Browsers (with polyfills)

For broader compatibility:

```json
{
  "compilerOptions": {
    "target": "ES2015",
    "lib": ["ES2015", "DOM"],
    "module": "ES2015"
  }
}
```

Then use Babel to transpile:

```javascript
// babel.config.js
module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        browsers: ['> 0.5%', 'last 2 versions', 'not dead']
      },
      useBuiltIns: 'usage',
      corejs: 3
    }]
  ]
};
```

## Known Issues

### Safari < 10
- No Proxy support - Weave will not work

### Edge Legacy (< 79)
- Limited Proxy support - some features may not work correctly
- Recommend upgrading to Chromium-based Edge

### Internet Explorer
- Not supported - no Proxy support
- No polyfill available

## Graceful Degradation

For unsupported browsers, provide a fallback:

```typescript
if (isWeaveSupported()) {
  // Use Weave
  weave('#app', ({ $, ref }) => {
    // Reactive app
  });
} else {
  // Fallback to vanilla JavaScript
  document.getElementById('app')!.innerHTML = 'Please upgrade your browser';
}
```

## Summary

- **Minimum:** Chrome 49+, Firefox 18+, Safari 10+, Edge 79+
- **Recommended:** Latest versions of modern browsers
- **Mobile:** iOS 10+, Android 5+
- **Not Supported:** Internet Explorer, Edge Legacy
- **Critical Dependency:** Proxy (cannot be polyfilled)

