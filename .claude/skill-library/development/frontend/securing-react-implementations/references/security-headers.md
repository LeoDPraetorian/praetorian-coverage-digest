# Security Headers for React

**HTTP security headers configuration for React applications.**

---

## Essential Headers

| Header | Purpose | Priority |
|--------|---------|----------|
| Content-Security-Policy | Prevent XSS | Critical |
| Strict-Transport-Security | Force HTTPS | Critical |
| X-Frame-Options | Prevent clickjacking | High |
| X-Content-Type-Options | Prevent MIME sniffing | High |
| Referrer-Policy | Control referrer leakage | Medium |
| Permissions-Policy | Restrict browser features | Medium |

---

## Content Security Policy (CSP)

### Basic CSP

```typescript
// Next.js - next.config.js
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, ''),
          },
        ],
      },
    ];
  },
};
```

### Nonce-Based CSP (Strict)

```typescript
// Next.js middleware for nonce-based CSP
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `;

  const response = NextResponse.next();
  response.headers.set(
    'Content-Security-Policy',
    cspHeader.replace(/\s{2,}/g, ' ').trim()
  );

  // Make nonce available to scripts
  response.headers.set('x-nonce', nonce);

  return response;
}
```

### Using Nonce in Components

```typescript
// app/layout.tsx
import { headers } from 'next/headers';
import Script from 'next/script';

export default function RootLayout({ children }) {
  const nonce = headers().get('x-nonce') || '';

  return (
    <html>
      <head>
        <Script
          src="/analytics.js"
          nonce={nonce}
          strategy="afterInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## helmet.js (Express)

For Express-based React SSR.

```typescript
import express from 'express';
import helmet from 'helmet';

const app = express();

// Basic helmet (enables many security headers)
app.use(helmet());

// Custom CSP
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'https://api.example.com'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  })
);

// HSTS
app.use(
  helmet.hsts({
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  })
);
```

---

## Strict-Transport-Security (HSTS)

Forces HTTPS for the domain.

```typescript
// Header value
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

// Next.js
headers: [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
],
```

**Warning:** `preload` adds your domain to browser preload lists. Only use if you're committed to HTTPS permanently.

---

## X-Frame-Options

Prevents clickjacking.

```typescript
// Prevent any framing
X-Frame-Options: DENY

// Allow same-origin framing only
X-Frame-Options: SAMEORIGIN

// Next.js
headers: [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
],
```

**Note:** CSP `frame-ancestors` is the modern replacement.

---

## X-Content-Type-Options

Prevents MIME-type sniffing.

```typescript
X-Content-Type-Options: nosniff
```

---

## Referrer-Policy

Controls what referrer information is sent.

```typescript
// Recommended for most sites
Referrer-Policy: strict-origin-when-cross-origin

// Maximum privacy
Referrer-Policy: no-referrer

// Options:
// - no-referrer: Never send referrer
// - origin: Send only origin (no path)
// - strict-origin-when-cross-origin: Full URL same-origin, origin cross-origin
```

---

## Permissions-Policy

Restrict browser features.

```typescript
// Disable potentially dangerous features
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()

// Allow specific origins
Permissions-Policy: geolocation=(self "https://maps.example.com")
```

---

## Complete Next.js Configuration

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval';
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data: https:;
      font-src 'self';
      connect-src 'self' https://api.example.com;
      frame-ancestors 'none';
      form-action 'self';
      base-uri 'self';
      upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim(),
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

---

## Testing Security Headers

```bash
# Using curl
curl -I https://example.com

# Online tools
# - https://securityheaders.com
# - https://observatory.mozilla.org
```

---

## Security Checklist

- [ ] CSP configured (at minimum report-only)
- [ ] HSTS enabled with long max-age
- [ ] X-Frame-Options set to DENY
- [ ] X-Content-Type-Options set to nosniff
- [ ] Referrer-Policy configured
- [ ] Permissions-Policy restricts unused features
- [ ] Headers tested with online scanners

---

## Related Resources

- [MDN Security Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security)
- [helmet.js](https://helmetjs.github.io/)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
