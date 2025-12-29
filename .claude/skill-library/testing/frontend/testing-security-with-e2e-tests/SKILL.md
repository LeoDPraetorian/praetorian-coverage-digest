---
name: testing-security-with-e2e-tests
description: Use when writing E2E security tests for React frontends - XSS, auth flows, authorization, CSRF, input validation
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, Task
---

# Testing Security with E2E Tests

**Comprehensive E2E security testing patterns for React frontends using Playwright, integrating OWASP methodologies with practical test implementation.**

## When to Use

Use this skill when:

- Writing E2E security tests for React applications
- Testing XSS prevention mechanisms in frontend code
- Validating authentication flows (login, logout, session expiry, token refresh, MFA)
- Testing authorization boundaries and privilege escalation attempts
- Validating CSRF protection mechanisms
- Testing input validation and sanitization
- Verifying secure redirect handling
- Setting up security regression test suites
- Integrating security tests into CI/CD pipelines

## Quick Reference

| Security Concern | Test Pattern                                      | Playwright Approach                                |
| ---------------- | ------------------------------------------------- | -------------------------------------------------- |
| XSS Prevention   | Injection attempts, sanitization verification     | Input malicious payloads, verify no execution      |
| Authentication   | Login, logout, session expiry, token refresh, MFA | Page Object Model for auth flows                   |
| Authorization    | RBAC, privilege escalation                        | Test role boundaries, unauthorized access attempts |
| CSRF Protection  | Token validation                                  | Verify token presence and validation               |
| Input Validation | Boundary testing, malicious inputs                | Fixture-based payload testing                      |
| Secure Redirects | Open redirect prevention                          | Test redirect validation logic                     |

## Security Testing Fundamentals

### OWASP Testing Integration

Security testing should follow OWASP Testing Guide principles:

1. **Input Validation Testing** - Test all user inputs for injection attacks
2. **Authentication Testing** - Verify secure authentication mechanisms
3. **Authorization Testing** - Test access controls and privilege boundaries
4. **Session Management** - Validate session handling security
5. **Data Validation** - Ensure client-side validation doesn't bypass server controls

### Test Organization

Organize security tests by threat category:

```
e2e/tests/security/
├── xss-prevention.spec.ts
├── authentication-flows.spec.ts
├── authorization-boundaries.spec.ts
├── csrf-protection.spec.ts
├── input-validation.spec.ts
└── secure-redirects.spec.ts
```

## XSS Prevention Testing

### Injection Attempt Patterns

Test common XSS vectors:

```typescript
// Test XSS in search inputs
await page.fill('[data-testid="search"]', '<script>alert("XSS")</script>');
await page.click('[data-testid="search-button"]');

// Verify script did not execute
expect(await page.evaluate(() => window.xssTriggered)).toBeUndefined();
```

For comprehensive XSS test patterns and payload fixtures, see [references/xss-testing-patterns.md](references/xss-testing-patterns.md).

## Authentication Flow Testing

### Complete Auth Test Coverage

Test all authentication scenarios:

1. **Login Success/Failure**
2. **Session Expiry Handling**
3. **Token Refresh Mechanisms**
4. **MFA Validation**
5. **Logout and Session Cleanup**

### Page Object Model for Auth

```typescript
class AuthPage {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email"]', email);
    await this.page.fill('[data-testid="password"]', password);
    await this.page.click('[data-testid="login-button"]');
  }

  async verifyAuthenticated() {
    await expect(this.page.locator('[data-testid="user-menu"]')).toBeVisible();
  }
}
```

For complete authentication testing patterns, see [references/authentication-testing-patterns.md](references/authentication-testing-patterns.md).

## Authorization Testing

### Role-Based Access Control (RBAC)

Test authorization boundaries:

```typescript
// Test unauthorized access attempt
await loginAsUser("regularUser");
await page.goto("/admin/settings");

// Verify redirect or error
await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
```

### Privilege Escalation Testing

Test that users cannot escalate privileges:

1. Attempt to access admin-only features
2. Attempt to modify other users' data
3. Attempt to bypass role restrictions

For comprehensive authorization test patterns, see [references/authorization-testing-patterns.md](references/authorization-testing-patterns.md).

## CSRF Protection Testing

### Token Validation

Verify CSRF tokens are:

1. **Present** in forms and AJAX requests
2. **Validated** on the server side
3. **Unique** per session
4. **Invalidated** after use

```typescript
// Verify CSRF token in form
const csrfToken = await page.locator('[name="csrf_token"]').inputValue();
expect(csrfToken).toBeTruthy();
expect(csrfToken.length).toBeGreaterThan(20);
```

For CSRF testing patterns, see [references/csrf-testing-patterns.md](references/csrf-testing-patterns.md).

## Input Validation Testing

### Malicious Payload Fixtures

Create reusable fixtures for common attack vectors:

```typescript
// fixtures/malicious-payloads.ts
export const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "'; DROP TABLE users--",
  "1' UNION SELECT * FROM users--",
];

export const XSS_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  'javascript:alert("XSS")',
];
```

For comprehensive input validation patterns, see [references/input-validation-testing.md](references/input-validation-testing.md).

## Secure Redirect Testing

### Open Redirect Prevention

Test that redirects validate destination URLs:

```typescript
// Test invalid redirect attempt
await page.goto("/login?redirect=https://evil.com");
await login(page);

// Verify redirect stayed within app domain
expect(page.url()).toContain(APP_DOMAIN);
expect(page.url()).not.toContain("evil.com");
```

For secure redirect patterns, see [references/secure-redirect-testing.md](references/secure-redirect-testing.md).

## Security Regression Testing

### CI/CD Integration

Add security tests to your CI pipeline:

```yaml
# .github/workflows/security-tests.yml
name: Security E2E Tests
on: [push, pull_request]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Security E2E Tests
        run: npx playwright test tests/security/
```

### Test Coverage Requirements

Maintain security test coverage:

- ✅ All user input fields tested for XSS
- ✅ All authentication flows covered
- ✅ All authorization boundaries tested
- ✅ CSRF protection verified on all forms
- ✅ Input validation tested with boundary cases
- ✅ Redirect validation tested

## Chariot E2E Infrastructure Integration

### Leveraging Existing Patterns

Analyze Chariot's E2E infrastructure at `modules/chariot/ui/e2e/`:

1. **Test Organization** - Follow existing directory structure
2. **Fixtures** - Reuse authentication fixtures
3. **Page Objects** - Extend existing page objects
4. **Configuration** - Use existing Playwright config

For Chariot-specific patterns, see [references/chariot-e2e-integration.md](references/chariot-e2e-integration.md).

## Examples

See [examples/](examples/) for complete security test implementations:

- [examples/xss-prevention-complete.md](examples/xss-prevention-complete.md)
- [examples/auth-flow-complete.md](examples/auth-flow-complete.md)
- [examples/authorization-boundaries-complete.md](examples/authorization-boundaries-complete.md)

## References

- [references/xss-testing-patterns.md](references/xss-testing-patterns.md) - Comprehensive XSS test patterns
- [references/authentication-testing-patterns.md](references/authentication-testing-patterns.md) - Auth flow testing
- [references/authorization-testing-patterns.md](references/authorization-testing-patterns.md) - RBAC and privilege testing
- [references/csrf-testing-patterns.md](references/csrf-testing-patterns.md) - CSRF protection validation
- [references/input-validation-testing.md](references/input-validation-testing.md) - Input validation patterns
- [references/secure-redirect-testing.md](references/secure-redirect-testing.md) - Redirect security testing
- [references/chariot-e2e-integration.md](references/chariot-e2e-integration.md) - Chariot-specific patterns
- [references/ci-cd-integration.md](references/ci-cd-integration.md) - Pipeline integration patterns

## Related Skills

- `frontend-e2e-test-engineer` - General E2E testing patterns
- `frontend-security` - Frontend security code review
- `backend-security` - Backend security validation
- `security-test-planning` - Security test planning and prioritization
