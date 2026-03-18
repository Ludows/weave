# Security Best Practices

## XSS Prevention

### html() Directive Risks

The `html()` directive sets `innerHTML` and can execute scripts if used with untrusted content.

**❌ DANGEROUS - Never do this:**

```typescript
// User input directly in HTML
const userInput = ref('<script>alert("XSS")</script>');
$('#output').html(() => userInput.value);

// URL parameters in HTML
const params = new URLSearchParams(window.location.search);
$('#content').html(params.get('content'));
```

**✅ SAFE - Use text() instead:**

```typescript
// text() escapes HTML automatically
const userInput = ref('<script>alert("XSS")</script>');
$('#output').text(() => userInput.value);
// Renders as: &lt;script&gt;alert("XSS")&lt;/script&gt;
```

**✅ SAFE - Sanitize before using html():**

```typescript
import DOMPurify from 'dompurify';

const userContent = ref('<p>User content</p><script>alert("XSS")</script>');
$('#output').html(() => DOMPurify.sanitize(userContent.value));
// Script tags are removed
```

### Safe HTML Patterns

Use template literals with known-safe values:

```typescript
const count = ref(5);
const items = ref(['Apple', 'Banana', 'Orange']);

// Safe - values are from your application
$('#list').html(() => `
  <ul>
    ${items.value.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
  </ul>
`);

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

## CORS and template()

### Remote Template Fetching

When using `template()` with URLs, be aware of CORS policies:

```typescript
// This will fail if the server doesn't allow CORS
$('#content').template({
  source: 'https://external-site.com/template.html'
});
```

**Best Practices:**

1. **Use same-origin templates** when possible
2. **Configure CORS headers** on your server
3. **Validate template sources** - only fetch from trusted domains

```typescript
const ALLOWED_DOMAINS = ['yourdomain.com', 'cdn.yourdomain.com'];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

// Validate before fetching
const templateUrl = ref('https://yourdomain.com/template.html');

if (isAllowedUrl(templateUrl.value)) {
  $('#content').template({ source: () => templateUrl.value });
}
```

## Sensitive Data Handling

### Don't Store Secrets in State

**❌ DANGEROUS:**

```typescript
const apiKey = ref('sk_live_abc123...');
const password = ref('user_password');

// These are visible in browser DevTools!
```

**✅ SAFE:**

```typescript
// Store tokens in httpOnly cookies (server-side)
// Use environment variables for API keys
// Never expose secrets to client-side code

// For authentication, use secure patterns:
const isAuthenticated = ref(false);
const userRole = ref<'user' | 'admin'>('user');

// Fetch sensitive data only when needed
promise('/api/user/profile', {
  onSuccess: (data) => {
    // Use data immediately, don't store in state
    updateUI(data);
  }
});
```

### State Snapshots

Be careful with `state()` snapshots - they contain all reactive data:

```typescript
// Don't log or send snapshots that might contain sensitive data
const snapshot = instance.$.state();
console.log(snapshot); // ❌ Might expose sensitive data

// Instead, be selective
const publicData = {
  username: instance.username,
  theme: instance.theme
};
console.log(publicData); // ✅ Only public data
```

## Event Handler Security

### Validate User Input

Always validate and sanitize user input in event handlers:

```typescript
$('#email-input').on('input', (e) => {
  const input = (e.target as HTMLInputElement).value;
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(input)) {
    email.value = input;
  } else {
    // Show error
    isValidEmail.value = false;
  }
});
```

### Prevent Injection in Dynamic Selectors

**❌ DANGEROUS:**

```typescript
// User input in selector
const userId = new URLSearchParams(window.location.search).get('id');
$(`#user-${userId}`).text('Selected');
```

**✅ SAFE:**

```typescript
// Validate and sanitize
const userId = new URLSearchParams(window.location.search).get('id');
if (userId && /^[a-zA-Z0-9-]+$/.test(userId)) {
  $(`#user-${userId}`).text('Selected');
}
```

## Store Security

### Action Validation

Validate payloads in store actions:

```typescript
const userStore = createStore('user', ({ state, action }) => {
  state({ users: [] });
  
  action('addUser', (s, payload: { name: string; email: string }) => {
    // Validate payload
    if (!payload.name || !payload.email) {
      throw new Error('Invalid user data');
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      throw new Error('Invalid email format');
    }
    
    s.users.push(payload);
  });
});
```

### Plugin Security

Be cautious with third-party store plugins:

```typescript
// Review plugin code before using
const loggingPlugin = {
  name: 'logger',
  onStateChange: (newState, oldState, store) => {
    // ❌ Don't log sensitive data
    console.log('State changed:', newState);
    
    // ✅ Log only safe data
    console.log('State changed at:', new Date().toISOString());
  }
};
```

## Content Security Policy (CSP)

Weave is compatible with strict CSP. Avoid inline scripts:

**❌ Avoid:**

```html
<button onclick="handleClick()">Click</button>
```

**✅ Use Weave event handlers:**

```typescript
$('#button').on('click', handleClick);
```

### CSP Headers

Recommended CSP headers for Weave applications:

```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.yourdomain.com;
```

## Summary Checklist

- ✅ Use `text()` instead of `html()` for user-generated content
- ✅ Sanitize HTML with DOMPurify before using `html()`
- ✅ Validate all user input in event handlers
- ✅ Never store secrets or sensitive data in reactive state
- ✅ Validate template URLs before fetching
- ✅ Use HTTPS for all remote resources
- ✅ Implement proper CORS policies
- ✅ Validate store action payloads
- ✅ Review third-party plugins for security issues
- ✅ Use Content Security Policy headers
- ✅ Keep Weave and dependencies up to date

