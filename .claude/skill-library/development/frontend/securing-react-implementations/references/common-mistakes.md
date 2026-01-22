# Common Security Mistakes in React

**Top 20 security mistakes and how to fix them.**

---

## XSS Vulnerabilities

### 1. Using dangerouslySetInnerHTML Without Sanitization

```typescript
// ❌ VULNERABLE
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ SECURE
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />
```

### 2. Not Validating URL Protocols

```typescript
// ❌ VULNERABLE
<a href={userUrl}>Link</a> // javascript:alert(1) executes!

// ✅ SECURE
const safeUrl = validateUrl(userUrl);
<a href={safeUrl}>Link</a>

function validateUrl(url) {
  try {
    const { protocol } = new URL(url);
    return ['http:', 'https:', 'mailto:'].includes(protocol) ? url : '#';
  } catch {
    return '#';
  }
}
```

### 3. Using innerHTML Directly on Refs

```typescript
// ❌ VULNERABLE
ref.current.innerHTML = userContent;

// ✅ SECURE
ref.current.textContent = userContent;
// Or use DOMPurify if HTML is needed
```

---

## Authentication Mistakes

### 4. Storing Tokens in localStorage

```typescript
// ❌ VULNERABLE - XSS can steal tokens
localStorage.setItem('token', jwt);

// ✅ SECURE - Use memory for access tokens
const [accessToken, setAccessToken] = useState<string | null>(null);

// Refresh tokens should be in httpOnly cookies (set by server)
```

### 5. Not Implementing Token Refresh

```typescript
// ❌ VULNERABLE - Long-lived tokens
const token = localStorage.getItem('token');
// Token valid for 30 days = 30 days of exposure

// ✅ SECURE - Short access token + refresh
// Access token: 15 minutes (in memory)
// Refresh token: 7 days (httpOnly cookie)
```

### 6. Frontend-Only Authorization

```typescript
// ❌ VULNERABLE - Easily bypassed
if (user.role === 'admin') {
  return <AdminPanel />;
}

// ✅ SECURE - Server validates every request
// Frontend check (UX only):
if (user.role === 'admin') {
  return <AdminPanel />; // Shows UI
}
// Server check (security):
// GET /api/admin/data returns 403 if not admin
```

---

## CSRF Mistakes

### 7. No CSRF Protection for Cookie Auth

```typescript
// ❌ VULNERABLE - Cookie auth without CSRF
await fetch('/api/transfer', {
  method: 'POST',
  credentials: 'include',
});

// ✅ SECURE - Include CSRF token
await fetch('/api/transfer', {
  method: 'POST',
  credentials: 'include',
  headers: { 'X-CSRF-Token': csrfToken },
});
```

### 8. GET Requests That Modify State

```typescript
// ❌ VULNERABLE - State change on GET
<a href="/api/delete/123">Delete</a>

// ✅ SECURE - Use POST/DELETE
<button onClick={() => deleteItem(123)}>Delete</button>
```

---

## Data Exposure Mistakes

### 9. API Keys in Frontend Code

```typescript
// ❌ VULNERABLE - In browser bundle
const API_KEY = 'sk_live_123456';
fetch(`https://api.stripe.com?key=${API_KEY}`);

// ✅ SECURE - Server-side only
// Frontend calls your backend
fetch('/api/create-payment');
// Backend uses API key from env
```

### 10. Logging Sensitive Data

```typescript
// ❌ VULNERABLE
console.log('User data:', user); // Includes PII
console.log('Request:', { ...req, password }); // Logs password

// ✅ SECURE
console.log('User ID:', user.id); // ID only
console.log('Request received for user:', user.id);
```

### 11. Exposing Server Data in Components

```typescript
// ❌ VULNERABLE (Server Component)
const user = await db.user.findUnique({ where: { id } });
return <div>{JSON.stringify(user)}</div>; // Exposes password hash!

// ✅ SECURE
const user = await db.user.findUnique({
  where: { id },
  select: { id: true, name: true }, // Only public fields
});
return <div>{user.name}</div>;
```

---

## Input Handling Mistakes

### 12. Trusting URL Parameters

```typescript
// ❌ VULNERABLE
const params = new URLSearchParams(location.search);
const isAdmin = params.get('admin') === 'true'; // Trivially set to true

// ✅ SECURE
// Never trust URL params for auth decisions
const { user } = useAuth();
const isAdmin = user?.roles.includes('admin');
```

### 13. Client-Only Validation

```typescript
// ❌ VULNERABLE - Bypass by modifying request
if (amount > 10000) return; // Client check only
await api.transfer(amount);

// ✅ SECURE - Server validates
await api.transfer(amount); // Server returns error if invalid
```

### 14. Open Redirects

```typescript
// ❌ VULNERABLE
const redirect = params.get('redirect');
window.location.href = redirect; // Redirects to attacker site

// ✅ SECURE
const redirect = params.get('redirect');
const safeRedirect = validateRedirect(redirect);
window.location.href = safeRedirect;

function validateRedirect(url) {
  try {
    const { origin } = new URL(url, window.location.origin);
    return origin === window.location.origin ? url : '/';
  } catch {
    return '/';
  }
}
```

---

## Configuration Mistakes

### 15. Missing Security Headers

```typescript
// ❌ VULNERABLE - No CSP, no HSTS
// No headers configured

// ✅ SECURE - Security headers configured
// next.config.js
async headers() {
  return [{
    source: '/:path*',
    headers: [
      { key: 'Content-Security-Policy', value: "default-src 'self'" },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
      { key: 'X-Frame-Options', value: 'DENY' },
    ],
  }];
}
```

### 16. CORS Too Permissive

```typescript
// ❌ VULNERABLE
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true

// ✅ SECURE
Access-Control-Allow-Origin: https://myapp.com
Access-Control-Allow-Credentials: true
```

---

## Dependency Mistakes

### 17. Not Running npm audit

```bash
# ❌ VULNERABLE - Never checked
npm install

# ✅ SECURE - Regular audits
npm audit --audit-level=high
# In CI: fail on vulnerabilities
```

### 18. Using Outdated Packages

```typescript
// ❌ VULNERABLE - React 19.0.0 has CVE-2025-55182
"react": "19.0.0"

// ✅ SECURE - Patched version
"react": "19.2.3"
```

---

## Session Mistakes

### 19. Not Regenerating Session After Login

```typescript
// ❌ VULNERABLE - Session fixation
// Attacker sets session ID, victim logs in, attacker has access

// ✅ SECURE - Generate new session on login
await auth.login(credentials);
await regenerateSession(); // New session ID after auth
```

### 20. No Session Timeout

```typescript
// ❌ VULNERABLE - Session never expires
// User walks away, attacker uses browser

// ✅ SECURE - Implement timeout
// Server: Session expires after 30 min inactive
// Client: Detect idle and prompt re-auth
```

---

## Quick Reference Table

| # | Mistake | Severity | Fix |
|---|---------|----------|-----|
| 1 | Unsanitized dangerouslySetInnerHTML | Critical | DOMPurify |
| 2 | No URL protocol validation | High | Allowlist protocols |
| 3 | Direct innerHTML | High | Use textContent |
| 4 | Tokens in localStorage | High | Memory + httpOnly |
| 5 | No token refresh | Medium | Short access + refresh |
| 6 | Frontend-only auth | Critical | Server validation |
| 7 | No CSRF for cookies | High | CSRF tokens |
| 8 | GET modifies state | Medium | Use POST/DELETE |
| 9 | API keys in frontend | Critical | Server-side only |
| 10 | Logging sensitive data | Medium | Log IDs only |
| 11 | Exposing server data | High | Select specific fields |
| 12 | Trusting URL params | High | Server validation |
| 13 | Client-only validation | High | Server validation |
| 14 | Open redirects | Medium | Allowlist domains |
| 15 | Missing headers | Medium | Configure CSP, HSTS |
| 16 | Permissive CORS | High | Specific origins |
| 17 | No npm audit | Medium | CI integration |
| 18 | Outdated packages | Varies | Regular updates |
| 19 | No session regen | High | Regen on login |
| 20 | No session timeout | Medium | Implement timeout |

---

## Related Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Security Best Practices](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html)
