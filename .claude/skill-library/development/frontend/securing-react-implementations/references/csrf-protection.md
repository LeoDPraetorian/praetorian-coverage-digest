# CSRF Protection in React

**Cross-Site Request Forgery (CSRF) prevention patterns for React SPAs.**

---

## When CSRF Protection is Required

| Auth Method | CSRF Required | Reason |
|-------------|---------------|--------|
| Cookie-based sessions | ✅ Yes | Browsers auto-attach cookies |
| JWT in httpOnly cookies | ✅ Yes | Cookies auto-attached |
| JWT in Authorization header | ❌ No | Headers not auto-attached |
| API key in header | ❌ No | Headers not auto-attached |

**Key insight:** CSRF exploits browsers automatically attaching credentials (cookies). Token-based auth with `Authorization` headers is inherently CSRF-safe.

---

## Double Submit Cookie Pattern

The recommended CSRF protection pattern for React SPAs.

### How It Works

1. Server sets two cookies:
   - Auth cookie: `httpOnly`, `secure`, `sameSite=strict`
   - CSRF token cookie: readable by JavaScript (not httpOnly)
2. Client reads CSRF token and sends it in request header
3. Server validates header matches cookie

### Server Implementation (Express)

```typescript
import express from 'express';
import crypto from 'crypto';

const app = express();

// Generate CSRF token
app.use((req, res, next) => {
  if (!req.cookies.csrfToken) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie('XSRF-TOKEN', token, {
      httpOnly: false, // Must be readable by JS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
  }
  next();
});

// Validate CSRF token
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const cookieToken = req.cookies['XSRF-TOKEN'];
    const headerToken = req.headers['x-xsrf-token'];

    if (!cookieToken || cookieToken !== headerToken) {
      return res.status(403).json({ error: 'CSRF validation failed' });
    }
  }
  next();
});
```

### React Implementation (Axios)

```typescript
import axios from 'axios';

// Create configured axios instance
const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Include cookies
});

// Automatically attach CSRF token to requests
api.interceptors.request.use((config) => {
  const methods = ['post', 'put', 'delete', 'patch'];

  if (methods.includes(config.method?.toLowerCase() || '')) {
    // Read token from cookie
    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('XSRF-TOKEN='))
      ?.split('=')[1];

    if (token) {
      config.headers['X-XSRF-TOKEN'] = token;
    }
  }

  return config;
});

export default api;
```

---

## SameSite Cookie Protection

First line of defense against CSRF.

### Cookie Configuration

```typescript
// Server-side cookie settings
res.cookie('session', sessionId, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict', // or 'lax'
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
});
```

### SameSite Values

| Value | Behavior | Protection Level |
|-------|----------|------------------|
| `strict` | Never sent cross-site | Highest (breaks legitimate cross-site navigation) |
| `lax` | Sent on top-level GET only | Good (recommended default) |
| `none` | Always sent (requires `secure`) | None (use only when necessary) |

**Recommendation:** Use `sameSite: 'lax'` as baseline with CSRF tokens for defense-in-depth.

---

## Custom Hook for CSRF

```typescript
import { useCallback } from 'react';

function getCsrfToken(): string | null {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function useCsrfFetch() {
  const csrfFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const token = getCsrfToken();

      const headers = new Headers(options.headers);
      if (token) {
        headers.set('X-XSRF-TOKEN', token);
      }

      return fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    },
    []
  );

  return csrfFetch;
}

// Usage
function MyComponent() {
  const csrfFetch = useCsrfFetch();

  const handleSubmit = async () => {
    await csrfFetch('/api/data', {
      method: 'POST',
      body: JSON.stringify({ data: 'value' }),
    });
  };

  return <button onClick={handleSubmit}>Submit</button>;
}
```

---

## Token-Based Auth (No CSRF Needed)

When using JWT with `Authorization` header, CSRF protection is not required.

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Token stored in memory (not cookies)
let accessToken: string | null = null;

export function setAccessToken(token: string) {
  accessToken = token;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

export default api;
```

**Why no CSRF?** The `Authorization` header is not automatically attached by browsers - it must be explicitly set by JavaScript.

---

## Testing CSRF Protection

```typescript
import { test, expect } from '@playwright/test';

test('should reject requests without CSRF token', async ({ request }) => {
  const response = await request.post('/api/data', {
    data: { test: 'value' },
    headers: {
      Cookie: 'session=valid-session',
      // Missing X-XSRF-TOKEN header
    },
  });

  expect(response.status()).toBe(403);
});

test('should accept requests with valid CSRF token', async ({ request }) => {
  // First get the CSRF token
  const getResponse = await request.get('/api/csrf-token');
  const csrfToken = getResponse.headers()['set-cookie']
    ?.find((c) => c.startsWith('XSRF-TOKEN='))
    ?.split('=')[1]
    ?.split(';')[0];

  const response = await request.post('/api/data', {
    data: { test: 'value' },
    headers: {
      'X-XSRF-TOKEN': csrfToken!,
    },
  });

  expect(response.status()).toBe(200);
});
```

---

## Common Mistakes

| Mistake | Risk | Fix |
|---------|------|-----|
| CSRF token in localStorage | XSS can steal token | Use httpOnly cookie for sensitive tokens |
| No CSRF for cookie auth | Full CSRF vulnerability | Implement Double Submit Cookie |
| SameSite alone | Older browser issues | Add CSRF tokens for defense-in-depth |
| GET requests changing state | CSRF via image/link | Use POST/PUT/DELETE for state changes |
| Per-session tokens only | Token reuse attacks | Consider per-request tokens for sensitive ops |

---

## Related Resources

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [SameSite Cookies Explained](https://web.dev/samesite-cookies-explained/)
