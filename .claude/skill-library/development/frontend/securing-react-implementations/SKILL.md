---
name: securing-react-implementations
description: Use when securing React 19 frontends against XSS, CSRF, injection attacks - DOMPurify sanitization, JWT token storage, OAuth PKCE, security headers, PII protection, dangerouslySetInnerHTML safety, Server Components/Actions validation, localStorage security, bundle secret detection, GDPR compliance
allowed-tools: Read, Grep, Glob, Bash, TodoWrite, AskUserQuestion, WebSearch
---

# Securing React Implementations

**Systematic methodology for identifying and preventing critical frontend security vulnerabilities in React 19 applications.**

> **You MUST use TodoWrite** before starting to track all security review phases. Multi-phase security workflows require external tracking to ensure no steps are skipped.

## When to Use

Use this skill when:

- Reviewing React components for security vulnerabilities
- Implementing authentication/authorization in React apps
- Handling user input or rendering untrusted content
- Integrating third-party libraries or APIs
- Building forms with sensitive data
- Implementing security features (CSP, CORS, etc.)
- Conducting security audits of React codebases

## Quick Reference

| Attack Vector                     | Primary Defense                                     | See Reference                                                       |
| --------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| XSS (Cross-Site Scripting)        | Input sanitization, avoid `dangerouslySetInnerHTML` | [xss-prevention.md](references/xss-prevention.md)                   |
| CSRF (Cross-Site Request Forgery) | CSRF tokens, SameSite cookies                       | [csrf-protection.md](references/csrf-protection.md)                 |
| Injection Attacks                 | Input validation, parameterized queries             | [injection-prevention.md](references/injection-prevention.md)       |
| Authentication Bypass             | Secure token storage, proper session management     | [authentication-patterns.md](references/authentication-patterns.md) |
| Authorization Flaws               | Server-side validation, RBAC                        | [authorization-patterns.md](references/authorization-patterns.md)   |
| Sensitive Data Exposure           | Encryption, secure storage, no client-side secrets  | [data-protection.md](references/data-protection.md)                 |

## Security Review Workflow

**MANDATORY: Use TodoWrite to track security review checklist.**

### Phase 1: Threat Modeling

1. Identify assets (user data, auth tokens, PII)
2. Map attack surface (forms, API calls, file uploads)
3. Enumerate threat actors (external attackers, malicious users)
4. Prioritize risks by impact and likelihood

**See:** [threat-modeling.md](references/threat-modeling.md)

### Phase 2: Input Validation

**All user input is untrusted until proven safe.**

```typescript
// ❌ VULNERABLE: Direct use of user input
function SearchResults({ query }) {
  return <div dangerouslySetInnerHTML={{ __html: query }} />;
}

// ✅ SECURE: Sanitized input
import DOMPurify from 'dompurify';

function SearchResults({ query }) {
  const sanitized = DOMPurify.sanitize(query);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

// ✅ BETTER: Avoid dangerouslySetInnerHTML entirely
function SearchResults({ query }) {
  return <div>{query}</div>;
}
```

**Validation rules:**

- Whitelist allowed characters/patterns
- Reject malicious patterns (script tags, event handlers)
- Length limits on all inputs
- Type validation (email, URL, phone)

**See:** [input-validation.md](references/input-validation.md)

### Phase 3: Authentication & Authorization

**Critical principle: Never trust client-side auth state.**

```typescript
// ❌ VULNERABLE: Client-side only auth check
function AdminPanel() {
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  if (!isAdmin) return <div>Access Denied</div>;

  return <AdminDashboard />;
}

// ✅ SECURE: Server-validated auth
function AdminPanel() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => fetch('/api/auth/me').then(r => r.json())
  });

  if (!user?.roles.includes('admin')) {
    return <div>Access Denied</div>;
  }

  return <AdminDashboard />;
}
```

**Authentication patterns:**

- JWT tokens with secure storage (httpOnly cookies)
- Token refresh flows
- Session timeout and renewal
- Multi-factor authentication (MFA)

**Authorization patterns:**

- Role-based access control (RBAC)
- Attribute-based access control (ABAC)
- Server-side permission checks on every request
- UI element hiding (defense in depth, not security)

**See:** [authentication-patterns.md](references/authentication-patterns.md), [authorization-patterns.md](references/authorization-patterns.md)

### Phase 4: Data Protection

**Sensitive data must never be exposed client-side.**

```typescript
// ❌ VULNERABLE: API keys in client code
const API_KEY = "sk_live_123456789";
fetch(`/api/data?key=${API_KEY}`);

// ✅ SECURE: API keys on server only
// Client sends request to backend
fetch("/api/data");

// Backend includes API key
app.get("/api/data", (req, res) => {
  const API_KEY = process.env.API_KEY;
  // Use API_KEY here
});
```

**Protection strategies:**

- Environment variables for secrets (server-side only)
- Encryption for data at rest
- HTTPS for data in transit
- Secure cookie flags (httpOnly, secure, SameSite)
- No sensitive data in URLs or logs

**See:** [data-protection.md](references/data-protection.md)

### Phase 5: Dependency Security

**Third-party packages are a major attack vector.**

```bash
# Audit dependencies for known vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Check for outdated packages
npm outdated
```

**Best practices:**

- Minimal dependencies (smaller attack surface)
- Regular updates (security patches)
- Audit new packages before adding
- Use lock files (package-lock.json)
- Subresource Integrity (SRI) for CDN resources

**See:** [dependency-management.md](references/dependency-management.md)

### Phase 6: React-Specific Patterns

**React 19 introduces new security considerations.**

#### Server Components Security

```typescript
// ❌ VULNERABLE: Exposing sensitive data
async function UserProfile({ userId }) {
  const user = await db.user.findUnique({ where: { userId } });

  return <div>{JSON.stringify(user)}</div>; // Exposes password hash!
}

// ✅ SECURE: Selective data exposure
async function UserProfile({ userId }) {
  const user = await db.user.findUnique({
    where: { userId },
    select: { name: true, email: true } // Only public fields
  });

  return <div>{user.name} - {user.email}</div>;
}
```

#### Actions Security

```typescript
"use server";

// ❌ VULNERABLE: No validation
export async function deleteUser(userId: string) {
  await db.user.delete({ where: { id: userId } });
}

// ✅ SECURE: Auth + validation
export async function deleteUser(userId: string) {
  const session = await auth();

  if (!session?.user?.roles.includes("admin")) {
    throw new Error("Unauthorized");
  }

  if (!isValidUUID(userId)) {
    throw new Error("Invalid user ID");
  }

  await db.user.delete({ where: { id: userId } });
}
```

**See:** [react-19-security.md](references/react-19-security.md)

## Security Headers

**Configure security headers for defense in depth.**

```typescript
// Next.js next.config.js
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "default-src 'self'; script-src 'self' 'unsafe-inline'; object-src 'none';",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};
```

**See:** [security-headers.md](references/security-headers.md)

## Recommended Security Libraries

| Library      | Purpose                    | NPM Package    |
| ------------ | -------------------------- | -------------- |
| DOMPurify    | HTML sanitization          | `dompurify`    |
| helmet       | Security headers (Node.js) | `helmet`       |
| validator    | Input validation           | `validator`    |
| bcrypt       | Password hashing           | `bcryptjs`     |
| jsonwebtoken | JWT handling               | `jsonwebtoken` |
| csrf         | CSRF protection            | `csrf`         |

**See:** [security-libraries.md](references/security-libraries.md)

## Security Testing

**Testing is critical for validating security implementations.**

### Unit Testing Security Logic

```typescript
import { render, screen } from "@testing-library/react";
import { sanitizeInput } from "./security";

describe("Security: Input Sanitization", () => {
  it("should remove script tags", () => {
    const malicious = '<script>alert("XSS")</script>';
    const sanitized = sanitizeInput(malicious);

    expect(sanitized).not.toContain("<script>");
    expect(sanitized).not.toContain("alert");
  });

  it("should remove event handlers", () => {
    const malicious = '<img src=x onerror="alert(1)">';
    const sanitized = sanitizeInput(malicious);

    expect(sanitized).not.toContain("onerror");
  });
});
```

### E2E Security Testing

```typescript
import { test, expect } from "@playwright/test";

test("should prevent XSS injection", async ({ page }) => {
  await page.goto("/search");

  // Attempt XSS injection
  await page.fill('[data-testid="search-input"]', '<script>alert("XSS")</script>');
  await page.click('[data-testid="search-button"]');

  // Verify script doesn't execute
  const alerts = [];
  page.on("dialog", (dialog) => {
    alerts.push(dialog.message());
    dialog.dismiss();
  });

  await page.waitForTimeout(1000);
  expect(alerts).toHaveLength(0);
});
```

**See:** [security-testing.md](references/security-testing.md)

## Common Security Mistakes

### 1. Client-Side Security Only

```typescript
// ❌ WRONG: Client-side validation only
function TransferFunds({ amount }) {
  if (amount > 1000) {
    return <div>Amount too large</div>;
  }

  return <button onClick={() => api.transfer(amount)}>Transfer</button>;
}

// ✅ RIGHT: Server-side validation (client-side is UX)
function TransferFunds({ amount }) {
  const transfer = useMutation({
    mutationFn: (amt) => api.transfer(amt), // Server validates
    onError: (error) => toast.error(error.message)
  });

  return <button onClick={() => transfer.mutate(amount)}>Transfer</button>;
}
```

### 2. Trusting URL Parameters

```typescript
// ❌ WRONG: Using URL params for auth decisions
function AdminPage() {
  const params = new URLSearchParams(window.location.search);
  const isAdmin = params.get('admin') === 'true'; // Easily manipulated!

  return isAdmin ? <AdminPanel /> : <AccessDenied />;
}

// ✅ RIGHT: Server-verified auth state
function AdminPage() {
  const { data: user } = useQuery(['user'], fetchCurrentUser);

  return user?.isAdmin ? <AdminPanel /> : <AccessDenied />;
}
```

### 3. Exposing Secrets in Bundle

```typescript
// ❌ WRONG: API key in client bundle
const STRIPE_SECRET_KEY = 'sk_test_123'; // Exposed in bundle!
stripe.charges.create({ ... });

// ✅ RIGHT: Server-side only
// Frontend calls your backend, backend uses secret key
fetch('/api/charge', { method: 'POST', body: JSON.stringify({ amount }) });
```

**See:** [common-mistakes.md](references/common-mistakes.md)

## Codebase Security Review

**Use Grep to search for potential vulnerabilities:**

```bash
# Search for dangerous patterns
grep -r "dangerouslySetInnerHTML" src/
grep -r "eval(" src/
grep -r "Function(" src/
grep -r "innerHTML" src/
grep -r "document.write" src/

# Search for potential secrets
grep -r "api.key" src/
grep -r "secret" src/ --include="*.ts" --include="*.tsx"
grep -r "password" src/

# Search for unsafe HTTP calls
grep -r "http://" src/ --include="*.ts" --include="*.tsx"
```

**See:** [security-audit-checklist.md](references/security-audit-checklist.md)

## Progressive Disclosure

This skill provides a high-level workflow. For detailed implementation guidance:

- **XSS Prevention:** [references/xss-prevention.md](references/xss-prevention.md)
- **CSRF Protection:** [references/csrf-protection.md](references/csrf-protection.md)
- **Injection Prevention:** [references/injection-prevention.md](references/injection-prevention.md)
- **Authentication Patterns:** [references/authentication-patterns.md](references/authentication-patterns.md)
- **Authorization Patterns:** [references/authorization-patterns.md](references/authorization-patterns.md)
- **Data Protection:** [references/data-protection.md](references/data-protection.md)
- **Security Headers:** [references/security-headers.md](references/security-headers.md)
- **Security Libraries:** [references/security-libraries.md](references/security-libraries.md)
- **React 19 Security:** [references/react-19-security.md](references/react-19-security.md)
- **Common Mistakes:** [references/common-mistakes.md](references/common-mistakes.md)
- **Security Audit Checklist:** [references/security-audit-checklist.md](references/security-audit-checklist.md)

## Integration

### Called By

- **`gateway-frontend`** (CORE) - Routes frontend security tasks
  - Purpose: Entry point for React security workflows
  - `skill: "gateway-frontend"`

### Requires (invoke before starting)

None - Entry point skill for security workflows

### Calls (during execution)

None - Provides reference documentation only

### Pairs With (conditional)

- **`frontend-security`** (AGENT) - When automated security review needed
  - Purpose: Agent-based code security analysis
  - Trigger: User requests security review

- **`testing-security-with-e2e-tests`** (LIBRARY) - When implementing security tests
  - Purpose: E2E security test patterns with Playwright
  - `Read(".claude/skill-library/testing/testing-security-with-e2e-tests/SKILL.md")`

- **`using-modern-react-patterns`** (LIBRARY) - When implementing React 19 features
  - Purpose: Modern React patterns with security considerations
  - `Read(".claude/skill-library/development/frontend/using-modern-react-patterns/SKILL.md")`

- **`adhering-to-uiux-laws`** (LIBRARY) - When UI affects security
  - Purpose: UI/UX patterns that impact security (clickjacking, phishing)
  - `Read(".claude/skill-library/development/frontend/adhering-to-uiux-laws/SKILL.md")`

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history.
