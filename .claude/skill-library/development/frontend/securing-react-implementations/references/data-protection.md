# Data Protection in React

**Protecting sensitive data in React frontend applications.**

---

## Core Principle

**Sensitive data should never exist in the frontend unless absolutely necessary.**

```
❌ WRONG: Store API keys in React app, filter on frontend
✅ RIGHT: API keys on server only, server returns filtered data
```

---

## What NOT to Store Client-Side

| Data Type | Risk | Solution |
|-----------|------|----------|
| API Keys | Full API access | Server-side only |
| Secrets | Credential theft | Environment variables (server) |
| PII | Privacy violation | Minimize, encrypt, server-filter |
| Payment data | PCI compliance | Use Stripe/payment provider SDKs |
| Passwords | Credential stuffing | Never store, hash server-side |

---

## Environment Variables

### Vite/React (Client-Side)

```typescript
// ❌ WRONG: Secret in client bundle
const API_KEY = import.meta.env.VITE_API_KEY; // Exposed in bundle!

// ✅ CORRECT: Only public values
const API_URL = import.meta.env.VITE_API_URL; // Public endpoint only
```

**Rule:** `VITE_*` variables are bundled into client code. Never put secrets there.

### Next.js

```typescript
// ❌ WRONG: NEXT_PUBLIC_ prefix exposes to client
const secret = process.env.NEXT_PUBLIC_API_SECRET; // In browser bundle!

// ✅ CORRECT: Server-only (no NEXT_PUBLIC_ prefix)
// This only works in Server Components or API routes
const secret = process.env.API_SECRET; // Server only
```

---

## localStorage/sessionStorage Security

### Never Store Sensitive Data

```typescript
// ❌ VULNERABLE: Tokens in localStorage
localStorage.setItem('accessToken', token);  // XSS can steal this
localStorage.setItem('refreshToken', token); // Persists indefinitely

// ✅ SECURE: Use memory for access tokens
const [accessToken, setAccessToken] = useState<string | null>(null);

// ✅ SECURE: Use httpOnly cookies for refresh tokens
// Set by server, not accessible to JavaScript
```

### Safe localStorage Usage

```typescript
// Only store non-sensitive user preferences
interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  timezone: string;
}

export function savePreferences(prefs: UserPreferences) {
  // Validate before storing
  const validThemes = ['light', 'dark'];
  if (!validThemes.includes(prefs.theme)) {
    prefs.theme = 'light';
  }

  localStorage.setItem('preferences', JSON.stringify(prefs));
}

export function loadPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem('preferences');
    if (!stored) return getDefaultPreferences();

    const parsed = JSON.parse(stored);
    // Validate loaded data
    return validatePreferences(parsed);
  } catch {
    return getDefaultPreferences();
  }
}
```

---

## PII Protection

### Minimize Data Collection

```typescript
// ❌ WRONG: Collect everything
interface UserForm {
  name: string;
  email: string;
  phone: string;
  ssn: string;        // Do you NEED this?
  dateOfBirth: string; // Do you NEED this?
  address: string;    // Do you NEED this?
}

// ✅ CORRECT: Only what's necessary
interface UserForm {
  email: string;      // Required for auth
  displayName: string; // Required for UX
}
```

### Mask Sensitive Display

```typescript
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const maskedLocal = local[0] + '***' + local.slice(-1);
  return `${maskedLocal}@${domain}`;
}

function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

function maskCreditCard(card: string): string {
  return '**** **** **** ' + card.slice(-4);
}

// Usage
<div>Email: {maskEmail(user.email)}</div>  // j***n@example.com
<div>Phone: {maskPhone(user.phone)}</div>  // 555****1234
```

---

## Bundle Security

### Detecting Secrets in Bundle

```bash
# Check for exposed secrets
grep -r "sk_live\|api_key\|secret\|password" dist/

# Use tools
npx @anthropic-ai/sdk-audit  # Check for exposed API keys
npx secretlint "dist/**/*"   # General secret detection
```

### Webpack/Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    // Only expose safe values
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    // Never do this:
    // __API_KEY__: JSON.stringify(process.env.API_KEY),
  },
});
```

---

## GDPR Compliance (2026 Updates)

### Key Requirements

1. **Global Privacy Control (GPC)** - Must recognize and respect GPC signals
2. **One-click reject** - Reject button must be equally prominent as accept
3. **6-month consent cooldown** - Cannot re-ask for consent within 6 months of rejection
4. **SME relief** - Exemption threshold raised to 750 employees

### Consent Management

```typescript
import { useEffect, useState } from 'react';

function useGPCSignal(): boolean {
  const [gpcEnabled, setGpcEnabled] = useState(false);

  useEffect(() => {
    // Check for Global Privacy Control signal
    const gpc = (navigator as any).globalPrivacyControl;
    setGpcEnabled(gpc === true);
  }, []);

  return gpcEnabled;
}

function CookieConsent() {
  const gpcEnabled = useGPCSignal();
  const [consent, setConsent] = useState<boolean | null>(null);

  useEffect(() => {
    // Respect GPC signal automatically
    if (gpcEnabled) {
      setConsent(false);
      saveConsentChoice(false);
    }
  }, [gpcEnabled]);

  if (gpcEnabled) {
    return null; // GPC users don't see banner
  }

  if (consent !== null) {
    return null; // Already made choice
  }

  return (
    <div className="cookie-banner">
      <p>We use cookies for analytics.</p>
      <div className="button-group">
        {/* Equally prominent buttons */}
        <button onClick={() => handleConsent(true)}>Accept</button>
        <button onClick={() => handleConsent(false)}>Reject</button>
      </div>
    </div>
  );
}
```

---

## Data Encryption

### Client-Side Encryption (When Necessary)

```typescript
// Use Web Crypto API for client-side encryption
async function encryptData(data: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

async function decryptData(encryptedBase64: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}
```

---

## Security Checklist

- [ ] No API keys/secrets in frontend code
- [ ] No sensitive data in localStorage/sessionStorage
- [ ] PII minimized and masked when displayed
- [ ] Bundle scanned for exposed secrets
- [ ] GDPR consent properly implemented
- [ ] GPC signal respected
- [ ] HTTPS enforced for all requests

---

## Related Resources

- [OWASP Sensitive Data Exposure](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/09-Testing_for_Weak_Cryptography/04-Testing_for_Weak_Encryption)
- [GDPR Official Text](https://gdpr.eu/)
