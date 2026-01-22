# Security Libraries for React

**Recommended npm packages for React security.**

---

## Quick Reference

| Category | Library | Purpose |
|----------|---------|---------|
| XSS | DOMPurify | HTML sanitization |
| Validation | Zod | Schema validation |
| Headers | helmet | Security headers (Express) |
| Auth | Auth0/NextAuth | Authentication |
| CSRF | csurf | CSRF protection |
| Crypto | crypto-js | Client-side encryption |

---

## HTML Sanitization

### DOMPurify (Recommended)

**The OWASP-recommended library for HTML sanitization.**

```bash
npm install dompurify
npm install --save-dev @types/dompurify

# For Next.js/SSR
npm install isomorphic-dompurify
```

```typescript
import DOMPurify from 'dompurify';

// Basic usage
const clean = DOMPurify.sanitize(dirty);

// With configuration
const clean = DOMPurify.sanitize(dirty, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
  ALLOWED_ATTR: ['href'],
});
```

| Metric | Value |
|--------|-------|
| Weekly Downloads | 11M+ |
| Bundle Size | ~15KB |
| Last Updated | Active |

### sanitize-html (Alternative)

More configuration options, larger bundle.

```bash
npm install sanitize-html
```

```typescript
import sanitizeHtml from 'sanitize-html';

const clean = sanitizeHtml(dirty, {
  allowedTags: ['b', 'i', 'em', 'strong', 'a'],
  allowedAttributes: { a: ['href'] },
});
```

| Metric | Value |
|--------|-------|
| Weekly Downloads | 3.2M |
| Bundle Size | ~25KB |

**Recommendation:** Use DOMPurify unless you need sanitize-html's specific configuration features.

---

## Input Validation

### Zod (Recommended)

TypeScript-first schema validation.

```bash
npm install zod
```

```typescript
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const result = userSchema.safeParse(input);
if (!result.success) {
  console.log(result.error.flatten());
}
```

### Yup

Mature, Formik integration.

```bash
npm install yup
```

```typescript
import * as yup from 'yup';

const schema = yup.object({
  email: yup.string().email().required(),
  password: yup.string().min(8).required(),
});
```

### validator.js

String validation utilities.

```bash
npm install validator
npm install --save-dev @types/validator
```

```typescript
import validator from 'validator';

validator.isEmail('test@example.com'); // true
validator.isURL('https://example.com'); // true
validator.escape('<script>'); // &lt;script&gt;
```

---

## Authentication

### Auth0 React SDK

```bash
npm install @auth0/auth0-react
```

```typescript
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';

function App() {
  return (
    <Auth0Provider
      domain="your-domain.auth0.com"
      clientId="your-client-id"
      authorizationParams={{
        redirect_uri: window.location.origin,
      }}
    >
      <MainApp />
    </Auth0Provider>
  );
}

function LoginButton() {
  const { loginWithRedirect, logout, isAuthenticated } = useAuth0();

  return isAuthenticated ? (
    <button onClick={() => logout()}>Logout</button>
  ) : (
    <button onClick={() => loginWithRedirect()}>Login</button>
  );
}
```

### NextAuth.js (Auth.js)

```bash
npm install next-auth
```

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';

export const { handlers, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
});

export const { GET, POST } = handlers;
```

---

## Security Headers

### helmet (Express)

```bash
npm install helmet
```

```typescript
import express from 'express';
import helmet from 'helmet';

const app = express();
app.use(helmet());

// Custom CSP
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  })
);
```

### next-secure-headers (Next.js)

```bash
npm install next-secure-headers
```

```typescript
// next.config.js
const { createSecureHeaders } = require('next-secure-headers');

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: createSecureHeaders(),
      },
    ];
  },
};
```

---

## CSRF Protection

### csurf (Express)

```bash
npm install csurf
```

```typescript
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });

app.get('/form', csrfProtection, (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

app.post('/process', csrfProtection, (req, res) => {
  // CSRF token automatically validated
});
```

---

## Cryptography

### crypto-js

Client-side encryption (use sparingly).

```bash
npm install crypto-js
npm install --save-dev @types/crypto-js
```

```typescript
import CryptoJS from 'crypto-js';

// Encryption
const encrypted = CryptoJS.AES.encrypt('message', 'secret').toString();

// Decryption
const decrypted = CryptoJS.AES.decrypt(encrypted, 'secret').toString(
  CryptoJS.enc.Utf8
);

// Hashing (for checksums, NOT passwords)
const hash = CryptoJS.SHA256('message').toString();
```

**Warning:** Never use client-side crypto for sensitive operations. Always prefer server-side.

---

## ESLint Security

### eslint-plugin-security

```bash
npm install --save-dev eslint-plugin-security
```

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['security'],
  extends: ['plugin:security/recommended'],
};
```

### eslint-plugin-react-security

```bash
npm install --save-dev eslint-plugin-react-security
```

---

## Comparison Table

| Library | Purpose | Size | Downloads/wk |
|---------|---------|------|--------------|
| DOMPurify | XSS sanitization | 15KB | 11M+ |
| Zod | Validation | 12KB | 8M+ |
| Yup | Validation | 22KB | 5M+ |
| helmet | Headers | 8KB | 2M+ |
| Auth0 | Auth | 45KB | 500K+ |
| NextAuth | Auth | 25KB | 1M+ |

---

## Security Checklist

- [ ] DOMPurify for HTML sanitization
- [ ] Zod/Yup for input validation
- [ ] Auth library configured
- [ ] Security headers via helmet or config
- [ ] ESLint security plugins enabled
- [ ] All packages up to date

---

## Related Resources

- [DOMPurify](https://github.com/cure53/DOMPurify)
- [Zod](https://zod.dev/)
- [helmet.js](https://helmetjs.github.io/)
- [Auth0 React](https://auth0.com/docs/libraries/auth0-react)
