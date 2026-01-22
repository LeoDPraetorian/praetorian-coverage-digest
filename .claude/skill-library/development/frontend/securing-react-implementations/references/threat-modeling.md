# Threat Modeling for React Applications

**Identifying and prioritizing security threats in React frontends.**

---

## STRIDE Framework

| Threat | Description | React Example |
|--------|-------------|---------------|
| **S**poofing | Pretending to be someone else | Stolen JWT, session hijacking |
| **T**ampering | Modifying data | DOM manipulation, localStorage edits |
| **R**epudiation | Denying actions | Missing audit logs |
| **I**nformation Disclosure | Exposing data | API keys in bundle, error messages |
| **D**enial of Service | Overwhelming resources | Infinite loops, memory leaks |
| **E**levation of Privilege | Gaining unauthorized access | Admin UI without server check |

---

## React Attack Surface

### Entry Points

| Entry Point | Attack Vectors | Mitigations |
|-------------|----------------|-------------|
| URL parameters | XSS, open redirect | Validate, allowlist |
| Form inputs | XSS, injection | Sanitize, validate |
| API responses | XSS, data tampering | Sanitize, validate schema |
| WebSocket messages | XSS, injection | Sanitize, authenticate |
| postMessage | XSS, CSRF | Validate origin |
| localStorage | Data theft, tampering | No sensitive data |
| Cookies | CSRF, session theft | httpOnly, secure, SameSite |

### Assets to Protect

| Asset | Impact if Compromised | Protection Priority |
|-------|----------------------|---------------------|
| User credentials | Account takeover | Critical |
| Session tokens | Session hijacking | Critical |
| PII | Privacy violation, regulatory | High |
| Business data | Data breach, competitive | High |
| UI state | UX manipulation | Medium |
| Preferences | Minor privacy | Low |

---

## Threat Modeling Process

### Phase 1: Identify Assets

```markdown
## Application: E-commerce Dashboard

### Critical Assets
- User authentication tokens (JWT)
- Payment information (handled by Stripe)
- Customer PII (names, emails, addresses)
- Order history

### Sensitive Assets
- User preferences
- Shopping cart contents
- Search history

### Public Assets
- Product catalog
- Static marketing content
```

### Phase 2: Map Attack Surface

```markdown
## Entry Points Analysis

### Forms
- Login form (email, password)
- Registration form (PII collection)
- Search bar (query injection)
- Product review form (XSS via HTML)

### URL Parameters
- /products?category=electronics (filter injection)
- /product/:id (path traversal)
- /checkout?promo=CODE (tampering)

### API Interactions
- GET /api/user (data exposure)
- POST /api/order (CSRF, tampering)
- WebSocket /ws/notifications (message injection)
```

### Phase 3: Identify Threats (STRIDE)

```markdown
## Threat Analysis

### T1: XSS via Product Reviews
- **Type:** Information Disclosure, Tampering
- **Vector:** User submits review with <script> tag
- **Impact:** Session theft, defacement
- **Likelihood:** High (user-generated content)
- **Severity:** Critical

### T2: CSRF on Order Placement
- **Type:** Tampering
- **Vector:** Malicious site triggers order API
- **Impact:** Unauthorized purchases
- **Likelihood:** Medium (requires auth)
- **Severity:** High

### T3: JWT Theft via XSS
- **Type:** Spoofing, Information Disclosure
- **Vector:** XSS reads localStorage JWT
- **Impact:** Full account takeover
- **Likelihood:** High (if XSS exists)
- **Severity:** Critical
```

### Phase 4: Prioritize and Mitigate

```markdown
## Risk Matrix

| Threat | Likelihood | Impact | Risk Score | Priority |
|--------|------------|--------|------------|----------|
| T1: XSS Reviews | High | Critical | 9 | P1 |
| T3: JWT Theft | High | Critical | 9 | P1 |
| T2: CSRF Orders | Medium | High | 6 | P2 |

## Mitigations

### T1 & T3: XSS Prevention
- [ ] Sanitize all user content with DOMPurify
- [ ] Move JWT to httpOnly cookies
- [ ] Implement CSP headers
- [ ] Add ESLint security rules

### T2: CSRF Prevention
- [ ] Implement CSRF tokens
- [ ] Use SameSite cookies
- [ ] Verify Origin header
```

---

## Component-Level Threat Analysis

```typescript
// Example: Analyzing a UserProfile component

/**
 * THREAT MODEL: UserProfile Component
 *
 * Assets:
 * - User PII (name, email, avatar)
 * - Profile edit capabilities
 *
 * Entry Points:
 * - Props: user object from API
 * - User input: name, bio fields
 * - File upload: avatar image
 *
 * Threats:
 * 1. XSS via bio field (user-generated HTML)
 * 2. Path traversal in avatar URL
 * 3. Privilege escalation via role manipulation
 *
 * Mitigations:
 * 1. Sanitize bio with DOMPurify
 * 2. Validate avatar URL protocol and domain
 * 3. Server-side role validation (frontend is UX only)
 */

interface UserProfileProps {
  user: {
    name: string;
    email: string;
    bio: string; // THREAT: XSS
    avatarUrl: string; // THREAT: URL injection
    role: 'user' | 'admin'; // THREAT: Privilege escalation
  };
}

function UserProfile({ user }: UserProfileProps) {
  // Mitigation 1: Sanitize HTML
  const safeBio = DOMPurify.sanitize(user.bio);

  // Mitigation 2: Validate URL
  const safeAvatarUrl = validateImageUrl(user.avatarUrl);

  // Mitigation 3: Role check is UX only
  // Server MUST validate on every admin action

  return (
    <div>
      <img src={safeAvatarUrl} alt={user.name} />
      <h1>{user.name}</h1>
      <div dangerouslySetInnerHTML={{ __html: safeBio }} />
      {user.role === 'admin' && <AdminControls />}
    </div>
  );
}
```

---

## Data Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│   React     │────▶│   API       │
│             │     │   App       │     │   Server    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │ localStorage      │ State             │ Database
       │ cookies           │ Props             │ Sessions
       │ URL params        │ Context           │
       ▼                   ▼                   ▼
   [Trust          [Trust              [Trust
    Boundary 1]     Boundary 2]         Boundary 3]

Threats at each boundary:
1. XSS, CSRF, clickjacking
2. State tampering, prop injection
3. SQL injection, auth bypass
```

---

## Security Requirements Template

```markdown
## Security Requirements for [Feature Name]

### Authentication
- [ ] Requires authenticated user
- [ ] Specific roles required: [list]
- [ ] Session timeout enforced

### Authorization
- [ ] Server-side permission check
- [ ] Frontend check (UX only)
- [ ] Resource ownership validated

### Input Validation
- [ ] All inputs have max length
- [ ] HTML content sanitized
- [ ] URLs validated against allowlist
- [ ] File uploads: type, size, content checked

### Data Protection
- [ ] No PII logged
- [ ] Sensitive data masked in UI
- [ ] No secrets in client bundle

### Output Encoding
- [ ] User content escaped in HTML
- [ ] URLs encoded in links
- [ ] JSON properly serialized
```

---

## Security Checklist

- [ ] Assets identified and classified
- [ ] Attack surface mapped
- [ ] STRIDE analysis completed
- [ ] Risks prioritized
- [ ] Mitigations documented
- [ ] Security requirements per feature

---

## Related Resources

- [OWASP Threat Modeling](https://owasp.org/www-community/Threat_Modeling)
- [Microsoft STRIDE](https://docs.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
