# Security Testing for React

**Testing security implementations in React applications.**

---

## Testing Levels

| Level | Tools | What to Test |
|-------|-------|--------------|
| Unit | Vitest/Jest | Sanitization, validation functions |
| Integration | MSW | API auth flows, error handling |
| E2E | Playwright | XSS injection, auth flows |
| SAST | ESLint, Semgrep | Code patterns |
| DAST | OWASP ZAP | Runtime vulnerabilities |

---

## Unit Testing Security Functions

### Testing Sanitization

```typescript
import { describe, it, expect } from 'vitest';
import { sanitizeHtml, validateUrl } from './security';

describe('sanitizeHtml', () => {
  it('should remove script tags', () => {
    const input = '<script>alert("XSS")</script><p>Safe</p>';
    const result = sanitizeHtml(input);

    expect(result).not.toContain('<script>');
    expect(result).toContain('<p>Safe</p>');
  });

  it('should remove event handlers', () => {
    const input = '<img src="x" onerror="alert(1)">';
    const result = sanitizeHtml(input);

    expect(result).not.toContain('onerror');
  });

  it('should remove javascript: URLs', () => {
    const input = '<a href="javascript:alert(1)">Click</a>';
    const result = sanitizeHtml(input);

    expect(result).not.toContain('javascript:');
  });

  it('should preserve safe HTML', () => {
    const input = '<p><strong>Bold</strong> text</p>';
    const result = sanitizeHtml(input);

    expect(result).toBe(input);
  });
});

describe('validateUrl', () => {
  it('should allow https URLs', () => {
    expect(validateUrl('https://example.com')).toBe('https://example.com');
  });

  it('should block javascript: URLs', () => {
    expect(validateUrl('javascript:alert(1)')).toBe('#');
  });

  it('should block data: URLs', () => {
    expect(validateUrl('data:text/html,<script>')).toBe('#');
  });
});
```

### Testing Validation Schemas

```typescript
import { describe, it, expect } from 'vitest';
import { userSchema, passwordSchema } from './schemas';

describe('userSchema', () => {
  it('should reject invalid email', () => {
    const result = userSchema.safeParse({ email: 'invalid', password: 'Test123!' });
    expect(result.success).toBe(false);
  });

  it('should accept valid input', () => {
    const result = userSchema.safeParse({
      email: 'test@example.com',
      password: 'SecurePass123!',
    });
    expect(result.success).toBe(true);
  });
});

describe('passwordSchema', () => {
  it.each([
    ['short', 'Short1!'],
    ['no uppercase', 'lowercase1!'],
    ['no lowercase', 'UPPERCASE1!'],
    ['no number', 'NoNumber!!'],
    ['no special', 'NoSpecial1'],
  ])('should reject %s password', (_, password) => {
    const result = passwordSchema.safeParse(password);
    expect(result.success).toBe(false);
  });
});
```

---

## E2E Security Testing (Playwright)

### XSS Prevention Tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('XSS Prevention', () => {
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

  test('should sanitize HTML in user content', async ({ page }) => {
    await page.goto('/profile/edit');
    await page.fill('[data-testid="bio"]', '<img src=x onerror="alert(1)">');
    await page.click('[data-testid="save"]');

    await page.goto('/profile');
    const bioHtml = await page.locator('[data-testid="bio"]').innerHTML();
    expect(bioHtml).not.toContain('onerror');
  });

  test('should block javascript: URLs', async ({ page }) => {
    await page.goto('/admin/links');
    await page.fill('[data-testid="url"]', 'javascript:alert(1)');
    await page.click('[data-testid="add"]');

    const errorMessage = await page.locator('[data-testid="error"]');
    await expect(errorMessage).toBeVisible();
  });
});
```

### Authentication Tests

```typescript
test.describe('Authentication', () => {
  test('should redirect unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should handle expired tokens', async ({ page, context }) => {
    // Set expired token
    await context.addCookies([
      {
        name: 'token',
        value: 'expired-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should prevent session fixation', async ({ page }) => {
    const getSessionId = () => page.evaluate(() =>
      document.cookie.match(/session=([^;]+)/)?.[1]
    );

    await page.goto('/login');
    const preLoginSession = await getSessionId();

    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="submit"]');

    await page.waitForURL('/dashboard');
    const postLoginSession = await getSessionId();

    expect(postLoginSession).not.toBe(preLoginSession);
  });
});
```

### CSRF Tests

```typescript
test.describe('CSRF Protection', () => {
  test('should reject requests without CSRF token', async ({ request }) => {
    const response = await request.post('/api/transfer', {
      data: { amount: 100, to: 'attacker' },
    });

    expect(response.status()).toBe(403);
  });

  test('should accept requests with valid CSRF token', async ({ page, request }) => {
    await page.goto('/dashboard');
    const csrfToken = await page.evaluate(() =>
      document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    );

    const response = await request.post('/api/transfer', {
      data: { amount: 100, to: 'recipient' },
      headers: { 'X-CSRF-Token': csrfToken! },
    });

    expect(response.status()).toBe(200);
  });
});
```

---

## Static Analysis (SAST)

### ESLint Security Configuration

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['security', 'react-security'],
  extends: [
    'plugin:security/recommended',
  ],
  rules: {
    'react/no-danger': 'warn',
    'react/no-danger-with-children': 'error',
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',
  },
};
```

### Semgrep Rules

```yaml
# .semgrep.yml
rules:
  - id: react-dangerouslysetinnerhtml
    pattern: dangerouslySetInnerHTML={{__html: $X}}
    message: "Ensure $X is sanitized with DOMPurify"
    severity: WARNING
    languages: [typescript, javascript]

  - id: localstorage-sensitive
    pattern-either:
      - pattern: localStorage.setItem("token", ...)
      - pattern: localStorage.setItem("jwt", ...)
    message: "Don't store tokens in localStorage"
    severity: ERROR
    languages: [typescript, javascript]
```

---

## CI/CD Security Pipeline

```yaml
# .github/workflows/security.yml
name: Security

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint

  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm audit --audit-level=high

  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: returntocorp/semgrep-action@v1
        with:
          config: p/react

  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:security
```

---

## Security Checklist

- [ ] Unit tests for sanitization functions
- [ ] Unit tests for validation schemas
- [ ] E2E tests for XSS prevention
- [ ] E2E tests for authentication flows
- [ ] E2E tests for CSRF protection
- [ ] ESLint security plugins configured
- [ ] npm audit in CI pipeline
- [ ] SAST (Semgrep) configured

---

## Related Resources

- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Playwright Documentation](https://playwright.dev/)
- [Semgrep](https://semgrep.dev/)
