# XSS Prevention in React

**Cross-Site Scripting (XSS) prevention patterns for React applications.**

---

## React's Built-in Protection

React automatically escapes values rendered through JSX, converting potentially dangerous characters to HTML entities:

```typescript
// ✅ SAFE: React auto-escapes this
function SafeComponent({ userInput }) {
  return <div>{userInput}</div>; // <script> becomes &lt;script&gt;
}
```

**What JSX escaping protects:**
- Text content between tags
- String attributes

**What JSX escaping does NOT protect:**
- `dangerouslySetInnerHTML`
- `javascript:` URLs in `href`/`src`
- Direct DOM manipulation via refs
- Event handler strings

---

## Critical Attack Vectors

### 1. dangerouslySetInnerHTML

The most common XSS vector in React applications.

```typescript
// ❌ VULNERABLE: No sanitization
function UnsafeComponent({ htmlContent }) {
  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
}

// ✅ SECURE: DOMPurify sanitization
import DOMPurify from 'dompurify';

function SafeHtmlRenderer({ htmlContent }) {
  const sanitized = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    ALLOW_ARIA_ATTR: true,
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

### 2. URL Injection (javascript: protocol)

React warns but does NOT block `javascript:` URLs.

```typescript
// ❌ VULNERABLE: javascript: URLs execute
function UnsafeLink({ url }) {
  return <a href={url}>Click me</a>; // javascript:alert('XSS') executes!
}

// ✅ SECURE: Protocol allowlist validation
function validateUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];

    if (!allowedProtocols.includes(parsed.protocol)) {
      console.warn(`Blocked unsafe URL protocol: ${parsed.protocol}`);
      return '#';
    }
    return url;
  } catch {
    return '#'; // Invalid URL
  }
}

function SafeLink({ url, children }) {
  return <a href={validateUrl(url)}>{children}</a>;
}
```

### 3. Dynamic Attribute Injection

```typescript
// ❌ VULNERABLE: Event handler injection
function UnsafeImage({ src, onError }) {
  return <img src={src} onError={onError} />; // onError="alert('XSS')"
}

// ✅ SECURE: Only allow function handlers
function SafeImage({ src, onError }) {
  const safeOnError = typeof onError === 'function' ? onError : undefined;
  return <img src={validateUrl(src)} onError={safeOnError} />;
}
```

---

## DOMPurify Configuration

### Basic Setup

```typescript
import DOMPurify from 'dompurify';

// Basic sanitization
const clean = DOMPurify.sanitize(dirty);

// With configuration
const clean = DOMPurify.sanitize(dirty, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
  ALLOWED_ATTR: ['href', 'title'],
  FORBID_TAGS: ['script', 'style', 'iframe'],
  FORBID_ATTR: ['onerror', 'onclick', 'onload'],
});
```

### SSR/Next.js Setup (isomorphic-dompurify)

```typescript
import DOMPurify from 'isomorphic-dompurify';

// Works on both client and server
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'title'],
  });
}
```

### Memoization for Performance

```typescript
import { useMemo } from 'react';
import DOMPurify from 'dompurify';

function SafeHtmlRenderer({ htmlContent }) {
  const sanitized = useMemo(
    () => DOMPurify.sanitize(htmlContent),
    [htmlContent]
  );

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

### Custom Hooks

```typescript
import { useMemo } from 'react';
import DOMPurify from 'dompurify';

interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttr?: string[];
}

export function useSanitizedHtml(
  html: string,
  options: SanitizeOptions = {}
): string {
  return useMemo(() => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: options.allowedTags,
      ALLOWED_ATTR: options.allowedAttr,
    });
  }, [html, options.allowedTags, options.allowedAttr]);
}

// Usage
function MyComponent({ content }) {
  const safeContent = useSanitizedHtml(content, {
    allowedTags: ['b', 'i', 'a'],
    allowedAttr: ['href'],
  });

  return <div dangerouslySetInnerHTML={{ __html: safeContent }} />;
}
```

---

## ESLint Security Rules

### Installation

```bash
npm install --save-dev eslint-plugin-security eslint-plugin-react-security
```

### Configuration (.eslintrc.js)

```javascript
module.exports = {
  plugins: ['security', 'react-security'],
  rules: {
    'react/no-danger': 'warn',
    'react/no-danger-with-children': 'error',
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',
  },
};
```

---

## Testing XSS Prevention

### Unit Tests

```typescript
import { render, screen } from '@testing-library/react';
import { sanitizeHtml } from './security';
import SafeHtmlRenderer from './SafeHtmlRenderer';

describe('XSS Prevention', () => {
  it('should remove script tags', () => {
    const malicious = '<script>alert("XSS")</script><p>Safe</p>';
    const result = sanitizeHtml(malicious);

    expect(result).not.toContain('<script>');
    expect(result).toContain('<p>Safe</p>');
  });

  it('should remove event handlers', () => {
    const malicious = '<img src=x onerror="alert(1)">';
    const result = sanitizeHtml(malicious);

    expect(result).not.toContain('onerror');
  });

  it('should block javascript: URLs', () => {
    const malicious = '<a href="javascript:alert(1)">Click</a>';
    const result = sanitizeHtml(malicious);

    expect(result).not.toContain('javascript:');
  });
});
```

### E2E Tests (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('should not execute injected scripts', async ({ page }) => {
  const alerts: string[] = [];
  page.on('dialog', async (dialog) => {
    alerts.push(dialog.message());
    await dialog.dismiss();
  });

  await page.goto('/search');
  await page.fill('[data-testid="search"]', '<script>alert("XSS")</script>');
  await page.click('[data-testid="submit"]');

  await page.waitForTimeout(1000);
  expect(alerts).toHaveLength(0);
});
```

---

## Common Mistakes

| Mistake | Risk | Fix |
|---------|------|-----|
| Using `innerHTML` directly | Full XSS | Use React's JSX or DOMPurify |
| Custom sanitization regex | Bypass-prone | Use DOMPurify |
| Trusting URL parameters | URL injection | Validate protocol allowlist |
| SSR without isomorphic sanitization | Server XSS | Use isomorphic-dompurify |
| Not updating DOMPurify | Known bypasses | Keep dependencies updated |

---

## Related Resources

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [React Security Best Practices](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html)
