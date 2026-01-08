# Frontend Security Review: URL Refactoring Plan (Second Review)

> **Reviewer:** frontend-security (Frontend Security Specialist)
> **Review Date:** 2025-12-31
> **Plan Version:** Post Three-Agent Review (with security-lead, test-lead, frontend-reviewer feedback)
> **Status:** CONDITIONAL APPROVAL - Critical Findings Must Be Addressed

---

## Executive Summary

This frontend security review evaluates the URL refactoring plan across five phases from a React/TypeScript security perspective, focusing on XSS prevention, client-side data exposure, authentication/authorization implementation, and browser security model implications.

**Overall Assessment:** The plan demonstrates strong security awareness with explicit PII removal, defense-in-depth patterns, and comprehensive rollback strategies. However, several React-specific and browser-specific security concerns require attention before implementation.

### Key Findings Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| XSS & Input Validation | 0 | 2 | 4 | 2 |
| React Security Patterns | 0 | 1 | 3 | 1 |
| Browser Security Model | 1 | 2 | 3 | 2 |
| Authentication/Authorization | 0 | 3 | 2 | 1 |
| Data Protection (PII) | 0 | 1 | 2 | 3 |
| **Total** | **1** | **9** | **14** | **9** |

### Recommendation

**CONDITIONAL APPROVAL** - Implementation may proceed with the following conditions:

1. **CRITICAL** findings MUST be addressed before Phase 1 deployment
2. **HIGH** findings MUST be addressed before production rollout
3. **MEDIUM** findings should be addressed within the phase they affect
4. **LOW** findings are advisory and can be addressed as part of ongoing maintenance

---

## 1. URL Security Analysis

### 1.1 PII Exposure in URLs (SOLVED - Phase 2)

**Current State (INSECURE):**
```
/u/{base64email}/assets?assetDrawerKey=#asset#user@email.com
```

**Problems:**
- Email addresses visible in URL path
- Entity keys with email in query parameters
- Browser history contains PII
- Server logs contain PII
- Referrer headers leak PII to third parties

**Proposed State (Phase 2 - SECURE):**
```
/assets?detail=asset:abc123de4567
```

**Security Improvements:**
- ✅ No email addresses in URLs
- ✅ Hash-based entity references (12-char hex = 48 bits entropy)
- ✅ Browser history contains no identifiable information
- ✅ Server logs contain no PII
- ✅ Referrer headers leak only non-sensitive hashes

**Verdict:** ✅ **APPROVED** - Phase 2 design adequately addresses PII exposure in URLs.

---

### 1.2 URL Parameter Tampering Risks

#### H-01: Hash Collision Without Cryptographic Binding (HIGH) ⚠️

**Location:** Phase 2, Task 2.2 - Entity Key Registry

**Issue:** The 12-character hash provides adequate entropy (48 bits, ~0.03% collision at 100k entities), but the system allows pre-computed hash injection via localStorage.

**Attack Scenario:**
```typescript
// Attacker computes hash offline
const hash = await hashEntityKey("#asset#victim@email.com"); // "abc123de4567"

// Attacker plants in their own localStorage
localStorage.setItem('drawer_abc123de4567', JSON.stringify({
  key: "#asset#victim@email.com",
  hash: "abc123de4567",
  storedAt: Date.now()
}));

// Attacker shares URL: /assets?detail=asset:abc123de4567
// Victim opens URL
// Hash resolves to attacker's planted entity
// Backend validates - but victim now sees data for victim@email.com
```

**Current Mitigation (Partial):**
```typescript
// Hash re-verification detects tampering
const recomputedHash = await hashEntityKey(entry.key)
if (recomputedHash !== hash) {
  console.error('Hash collision detected - possible attack')
  return null
}
```

**Gap:** This validates integrity but doesn't prevent the attack above because the attacker used the correct key-hash pair.

**Recommended Fix:**
```typescript
// Add user-binding to hash storage
const entry: RegistryEntry = {
  key: entityKey,
  hash: hash,
  storedAt: Date.now(),
  storedBy: getCurrentUserHash(), // Bind to user session
}

// On retrieve - validate user binding
if (entry.storedBy !== getCurrentUserHash()) {
  // Cross-user access attempt - requires fresh backend validation
  const canAccess = await validateEntityAccess(entityKey);
  if (!canAccess) {
    console.warn('Unauthorized cross-user hash resolution attempt');
    return null;
  }
}
```

**Severity:** HIGH - Allows attacker to craft URLs that display unauthorized data to victims.

**Required Before:** Phase 2 production rollout

---

#### M-01: Hash Length May Allow Brute Force (MEDIUM) ⚠️

**Location:** Phase 2, Task 2.2 - Hash Generation

**Issue:** 12-character hex hash = 48 bits entropy. While adequate for collision resistance, brute force attack space is 2^48 = 281 trillion hashes.

**Attack Scenario:**
```javascript
// Attacker attempts to guess valid hashes
const alphabet = 'abcdef0123456789';
for (let i = 0; i < 10000; i++) {
  const hash = generateRandomHash(12);
  const url = `/assets?detail=asset:${hash}`;
  // Try to access - backend will validate
  // If entity exists and attacker has access, reveals info
}
```

**Current Mitigation:**
- Backend authorization checks prevent unauthorized access
- Hash doesn't reveal entity type or ownership

**Recommended Additional Controls:**
1. **Rate limiting** on hash resolution endpoint
2. **Monitoring** for unusual hash resolution patterns
3. **Audit logging** of failed hash resolution attempts

**Recommended Fix (Phase 0 or Phase 2):**
```typescript
// Add rate limiting to hash resolution
const HASH_RESOLUTION_RATE_LIMIT = 100; // per minute per user

// In EntityKeyRegistry.get()
if (await isRateLimitExceeded('hash-resolution', userId, HASH_RESOLUTION_RATE_LIMIT)) {
  throw new Error('Rate limit exceeded for hash resolution');
}

// Log failed attempts
if (!entry) {
  auditLog({
    action: 'HASH_RESOLUTION_FAILED',
    hash: hash,
    userId: currentUserId,
    timestamp: Date.now()
  });
}
```

**Severity:** MEDIUM - Brute force is computationally expensive, backend prevents unauthorized access, but monitoring is needed.

**Required Before:** Phase 2 production rollout (rate limiting and monitoring)

---

#### M-02: Legacy URL Warning "Continue Anyway" Defeats Purpose (MEDIUM) ⚠️

**Location:** Phase 2, Task 2.4 - LegacyUrlWarning Component

**Issue:** The plan includes a "Continue Anyway" button on the legacy URL warning:

```typescript
<Button onClick={onContinue}>Continue Anyway</Button>
```

**Problem:** Users (including security-unaware users) will click "Continue Anyway" because it's the path of least resistance. This defeats the purpose of warning about PII in URLs.

**Recommended Fix:**
```typescript
// Remove "Continue Anyway" for external/shared URLs
// Only show "Update Link" option
<div className="space-y-2">
  <Button onClick={onUpdateLink} variant="default">
    Update Link (Recommended)
  </Button>

  {/* Only show "Continue" for internal navigation with delay */}
  {isInternalNavigation && (
    <Button
      variant="outline"
      onClick={onContinue}
      disabled={countdown > 0}
    >
      {countdown > 0
        ? `Continue in ${countdown}s`
        : 'I understand the privacy risks - Continue'}
    </Button>
  )}
</div>
```

**Severity:** MEDIUM - Allows continued PII exposure if users choose to ignore warning.

**Required Before:** Phase 2 production rollout

---

### 1.3 Authorization Bypass via URL Manipulation

#### H-02: Route Guards Bypass via Direct URL Manipulation (HIGH) ⚠️

**Location:** Phase 3, Task 1.3 - Authentication Layout Route

**Issue:** The `beforeLoad` guard relies solely on client-side context:

```typescript
beforeLoad: async ({ context }) => {
  if (!context.auth.isSignedIn) {
    throw redirect({ to: '/login', ... })
  }
}
```

**Attack Scenario:**
1. Attacker opens React DevTools
2. Modifies context: `context.auth.isSignedIn = true`
3. Route guard passes
4. Page renders with unauthorized data requests

**Current Mitigation:** Backend JWT validation is the authoritative access control.

**Gap:** Not explicitly documented that frontend route guards are defense-in-depth only.

**Recommended Fix:**
```typescript
// _authenticated.tsx
/**
 * SECURITY NOTE: This route guard is defense-in-depth only.
 * Backend JWT validation is the authoritative access control.
 * Do NOT rely solely on this guard for security-critical routes.
 *
 * This guard provides:
 * - Better UX (redirect to login before API calls fail)
 * - Performance (avoid unnecessary API calls)
 * - NOT SECURITY (client-side checks are bypassable)
 */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context }) => {
    // Client-side UX optimization only
    if (!context.auth.isSignedIn) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
})
```

**Additional Requirement:**
```typescript
// Add to Phase 3 PR checklist:
// - [ ] Verify ALL data-fetching hooks include JWT in request headers
// - [ ] Verify backend validates JWT on EVERY endpoint
// - [ ] Document that route guards are NOT security boundaries
```

**Severity:** HIGH - If developers rely on route guards for security, unauthorized access may occur.

**Required Before:** Phase 3 production rollout

---

#### H-03: Nested Drawer State Allows Deep Linking to Restricted Content (HIGH) ⚠️

**Location:** Phase 5, Task 5.1 - useDrawerState hook

**Issue:** The drawer state allows constructing URLs that directly link to entity details:

```
/assets?detail=asset:abc123&stack=risk:xyz789
```

**Attack Scenario:**
1. User A has access to `asset:abc123` and `risk:xyz789`
2. User A shares URL with User B
3. User B has access to `asset:abc123` but NOT `risk:xyz789`
4. Frontend attempts to load restricted data
5. Backend denies (good), but URL reveals that `risk:xyz789` exists (information disclosure)

**More Concerning Scenario:**
1. Attacker crafts URL with nested drawer to sensitive entity
2. Victim opens URL
3. Frontend attempts to fetch restricted data
4. Reveals entity existence, type, and relationship to parent entity

**Recommended Fix:**
```typescript
// In useDrawerState - validate access before setting state
const openNestedDrawer = useCallback(async (type, key, tab) => {
  // Pre-validate access (lightweight check)
  const hasAccess = await checkEntityAccess(type, key);
  if (!hasAccess) {
    toast.error('You do not have access to this item');
    return;
  }

  // Proceed with opening drawer
  setDrawerState(prev => ({
    ...prev,
    stack: [...prev.stack, { type, key, tab }]
  }));
}, [checkEntityAccess]);
```

**Alternative Approach (Defense-in-Depth):**
```typescript
// Validate on drawer render, not just open
const DrawerController = ({ entityType, entityKey }) => {
  const { data: entity, error } = useQuery({
    queryKey: ['entity', entityType, entityKey],
    queryFn: () => fetchEntity(entityType, entityKey),
    // React Query will handle 403 errors from backend
  });

  if (error?.status === 403) {
    return <UnauthorizedDrawer />;
  }

  // ... render drawer
};
```

**Severity:** HIGH - Allows information disclosure about entity existence and relationships.

**Required Before:** Phase 5 production rollout

---

### 1.4 Deep Link Security Implications

#### M-03: Unresolved Hash Dialog Reveals Entity Type (MEDIUM) ⚠️

**Location:** Phase 2, Task 2.4 - UnresolvedLinkDialog Component

**Issue:** The dialog message reveals entity type when hash cannot be resolved:

```typescript
<p>This link refers to a {entityType} that is no longer available.</p>
```

**Problem:** Even though the specific entity cannot be accessed, revealing the entity type is a minor information disclosure.

**Example:**
```
URL: /assets?detail=risk:abc123de
Dialog: "This link refers to a risk that is no longer available."
```

Attacker learns:
- Hash `abc123de` was for a `risk` entity
- Entity existed at some point
- May have been deleted or user lost access

**Recommended Fix:**
```typescript
// Generic message without entity type
<p>This link is no longer available. It may have been deleted or you may not have access.</p>

// Or use vague terminology
<p>This item is no longer available.</p>
```

**Severity:** MEDIUM - Minor information disclosure, but low exploitability.

**Required Before:** Phase 2 production rollout

---

#### L-01: Drawer History Reveals Browsing Patterns (LOW) 📝

**Location:** Phase 5 - Drawer State in URL

**Issue:** Drawer navigation history is visible in browser history:

```
/assets?detail=asset:abc123
/assets?detail=asset:abc123&tab=vulnerabilities
/assets?detail=asset:abc123&stack=risk:xyz789
```

**Privacy Concern:** Browser history reveals:
- Which assets user viewed
- Which tabs user clicked
- Which nested drawers user opened
- Browsing patterns and investigation flow

**Mitigation (Already in Place):**
- Hashes prevent identifying specific entities
- Backend requires authorization for all data fetching

**Recommended Additional Control (Optional):**
```typescript
// Add option to disable history tracking for sensitive views
const { openDrawer } = useDrawerState({
  replaceHistory: true // Use replaceState instead of pushState
});
```

**Severity:** LOW - Privacy concern, not a security vulnerability. Hashes provide adequate anonymization.

**Required Before:** N/A (optional enhancement)

---

## 2. Authentication/Authorization

### 2.1 Impersonation Feature Security

#### C-01: Impersonation Session Not Bound to Original Authentication (CRITICAL) 🚨

**Location:** Phase 1, Task 1.1 - ImpersonationContext

**Issue:** The impersonation state in sessionStorage is independent of the admin's authentication token. If:
1. Admin starts impersonation
2. Admin's JWT expires or is revoked
3. Admin has another valid session elsewhere
4. The impersonation state persists and could be used with a different/compromised session

**Attack Scenario:**
```typescript
// 1. Attacker compromises admin browser (XSS)
// 2. Reads sessionStorage
const target = sessionStorage.getItem('chariot_impersonation_target'); // "victim@example.com"

// 3. Attacker's own (lower-privilege) session now has impersonation context
// 4. Backend validates JWT but impersonation context grants elevated view
```

**Required Fix:**
```typescript
// In ImpersonationProvider - bind to current session
const startImpersonation = useCallback(async (email: string) => {
  const currentJwt = await auth.getToken();
  const jwtHash = await hashJwtSignature(currentJwt);

  const entry: ImpersonationEntry = {
    targetUser: email,
    adminJwtHash: jwtHash, // Bind to session
    startedAt: Date.now(),
    expiresAt: Date.now() + IMPERSONATION_TTL,
  };

  sessionStorage.setItem('chariot_impersonation_target', JSON.stringify(entry));
}, [auth]);

// On retrieve - validate session binding
const currentImpersonation = useMemo(() => {
  const stored = sessionStorage.getItem('chariot_impersonation_target');
  if (!stored) return null;

  const entry = JSON.parse(stored);
  const currentJwt = auth.token;
  const currentHash = hashJwtSignature(currentJwt);

  if (entry.adminJwtHash !== currentHash) {
    // Session mismatch - clear stale impersonation
    sessionStorage.removeItem('chariot_impersonation_target');
    console.warn('Impersonation cleared: session mismatch');
    return null;
  }

  return entry.targetUser;
}, [auth.token]);
```

**Severity:** CRITICAL - Allows impersonation state to persist across different sessions.

**Required Before:** Phase 1 production deployment

---

#### H-04: Impersonation State Persists After Admin Logout (HIGH) ⚠️

**Location:** Phase 1, Task 1.5 - Logout Flow

**Issue:** The plan does not explicitly clear impersonation state on logout. sessionStorage persists until tab closes, meaning:
1. Admin logs out (auth state cleared)
2. Impersonation state remains in sessionStorage
3. Different user logs in on same tab
4. May inherit impersonation context (depending on provider order)

**Required Fix:**
```typescript
// In logout handler (auth.tsx)
const logout = useCallback(() => {
  // REQUIRED: Clear impersonation BEFORE clearing auth
  clearImpersonation(); // From useImpersonation()
  sessionStorage.removeItem('chariot_impersonation_target');
  sessionStorage.removeItem('oauth_impersonation_restore');

  // Then clear auth state
  queryClient.clear(); // Clear TanStack Query cache
  setAuth({ isSignedIn: false, me: null, token: null });

  // Navigate to login
  navigate({ to: '/login' });
}, [clearImpersonation, queryClient, navigate]);
```

**Additional Requirement:**
```typescript
// Add to ImpersonationProvider
useEffect(() => {
  // Clear impersonation if auth state changes
  if (!auth.isSignedIn) {
    clearImpersonation();
  }
}, [auth.isSignedIn, clearImpersonation]);
```

**Severity:** HIGH - Unauthorized user may inherit impersonation context from previous session.

**Required Before:** Phase 1 production deployment

---

#### H-05: OAuth Impersonation Restore Lacks Integrity Verification (HIGH) ⚠️

**Location:** Phase 1, Task 1.1 - OAuth Flow Handling

**Issue:** The `oauth_impersonation_restore` key is read and trusted without verification:

```typescript
const restoredTarget = sessionStorage.getItem('oauth_impersonation_restore')
// No validation that this value was set by legitimate code
```

**Attack Scenario:**
1. User (non-admin) sets `oauth_impersonation_restore` in their browser console:
   ```javascript
   sessionStorage.setItem('oauth_impersonation_restore', 'victim@example.com');
   ```
2. User navigates to OAuth flow
3. On return, impersonation context is set for unauthorized user

**Recommended Fix:**
```typescript
// On OAuth callback - validate impersonation permission
const restoredTarget = sessionStorage.getItem('oauth_impersonation_restore');
if (restoredTarget) {
  const canImpersonate = await validateImpersonationPermission(auth.me, restoredTarget);
  if (!canImpersonate) {
    sessionStorage.removeItem('oauth_impersonation_restore');
    auditLog({
      action: 'IMPERSONATION_RESTORE_BLOCKED',
      actor: auth.me,
      attemptedTarget: restoredTarget,
      timestamp: new Date().toISOString()
    });
    toast.error('You do not have permission to impersonate users.');
  } else {
    setImpersonationTarget(restoredTarget);
  }
}
```

**Backend Requirement:**
```typescript
// Backend must expose impersonation permission check
// GET /api/validate-impersonation?target={email}
// Returns: { canImpersonate: boolean, reason?: string }
```

**Severity:** HIGH - Allows non-admin users to attempt impersonation via OAuth flow.

**Required Before:** Phase 1 production deployment

---

#### M-04: sessionStorage XSS Vulnerability (MEDIUM) ⚠️

**Location:** Phase 1, Task 1.1 - Security Model Clarification

**Issue:** The plan correctly identifies that sessionStorage does NOT protect against XSS:

> "sessionStorage does NOT provide protection against XSS attacks. Mitigation: XSS protection requires separate defenses (CSP headers, input sanitization)"

**Problem:** The plan does not include concrete XSS protection implementation tasks.

**Recommended Fix (Add to Phase 0):**

```markdown
### Task 0.X: Implement XSS Protection Prerequisites

**Entry Criteria:**
- [ ] CSP headers implemented and verified
- [ ] Input sanitization audit complete
- [ ] XSS vulnerability scan clean (using tools like OWASP ZAP or Burp Suite)

**Implementation:**
1. Add Content-Security-Policy headers to backend responses
2. Configure script-src, style-src, connect-src directives
3. Test with report-only mode first
4. Monitor CSP violations
5. Audit all instances of:
   - `dangerouslySetInnerHTML` (must be DOMPurify sanitized)
   - innerHTML direct manipulation
   - User input rendered without escaping
```

**Severity:** MEDIUM - XSS is a known attack vector against sessionStorage, requires external mitigation.

**Required Before:** Phase 1 deployment (XSS audit and CSP headers)

---

### 2.2 Privilege Escalation Risks

#### M-05: Backend Impersonation Permission Check (MEDIUM) ⚠️

**Location:** Phase 1, General

**Issue:** The plan relies on `isPraetorianUser` check on the backend, but does not specify:
1. Where this check happens
2. Whether it happens on EVERY impersonation action
3. Whether it's validated on context reads (not just writes)

**Recommended Documentation:**
```typescript
// Backend must validate impersonation permission:
// 1. On impersonation start (POST /impersonate)
// 2. On every API request that uses impersonation context (account header)

// Example: In backend middleware
function validateImpersonationPermission(req, res, next) {
  const accountHeader = req.headers['account'];
  const authenticatedUser = req.user.email; // From JWT

  if (accountHeader && accountHeader !== authenticatedUser) {
    // User is attempting to impersonate
    if (!req.user.isPraetorianUser) {
      return res.status(403).json({ error: 'Impersonation requires admin privileges' });
    }

    // Audit log
    auditLog({
      action: 'IMPERSONATION_ATTEMPT',
      actor: authenticatedUser,
      target: accountHeader,
      allowed: true
    });
  }

  next();
}
```

**Severity:** MEDIUM - Unclear if backend consistently validates impersonation permission.

**Required Before:** Phase 1 deployment (backend validation documented and tested)

---

### 2.3 Session Management During Impersonation

#### L-02: Tab Isolation Creates UX Confusion for Admins (LOW) 📝

**Location:** Phase 1 - sessionStorage Tab Isolation

**Issue:** sessionStorage is tab-isolated. If admin opens multiple tabs:
- Tab A: Impersonating customer@example.com
- Tab B: Not impersonating (viewing admin data)

**UX Confusion:**
- Admin may forget which tab is impersonating
- Admin may accidentally perform admin actions in impersonation tab
- No visual distinction between tabs in browser UI

**Recommended Fix (UX Enhancement):**
```typescript
// Add visual indicator to document title
useEffect(() => {
  if (isImpersonating) {
    document.title = `🎭 Impersonating ${targetUser} - Chariot`;
  } else {
    document.title = 'Chariot';
  }
}, [isImpersonating, targetUser]);

// Add banner to top of page
{isImpersonating && (
  <div className="bg-warning text-warning-foreground px-4 py-2 text-center">
    🎭 Currently impersonating <strong>{targetUser}</strong>
    <Button onClick={stopImpersonation} variant="link">
      Stop Impersonation
    </Button>
  </div>
)}
```

**Severity:** LOW - UX issue, not a security vulnerability. Admins should be trained on impersonation usage.

**Required Before:** N/A (optional enhancement)

---

## 3. Data Exposure

### 3.1 Browser History/Bookmarks Security

**Current State (Phase 1 Complete, Before Phase 2):**
```
Browser History:
- /u/{base64email}/assets
- /u/{base64email}/assets?assetDrawerKey=#asset#user@email.com
```

**Problem:** Browser history reveals:
- Which customers admin viewed (via base64 email)
- Which entities user accessed (via entity keys)
- Full browsing patterns with identifiable information

**Proposed State (Phase 2 Complete):**
```
Browser History:
- /assets
- /assets?detail=asset:abc123de4567
```

**Security Improvement:**
- ✅ No email addresses in browser history
- ✅ Entity references are hashed (not directly identifiable)
- ✅ Reduced PII exposure if browser history is compromised

**Verdict:** ✅ **APPROVED** - Phase 2 adequately addresses browser history PII exposure.

---

### 3.2 URL Sharing Risks

#### M-06: 24-Hour localStorage TTL Creates Persistence Window (MEDIUM) ⚠️

**Location:** Phase 2, Task 2.2 - EntityKeyRegistry

**Issue:** Hash-to-key mappings persist for 24 hours in localStorage. This means:
1. User A views sensitive entity (hash stored in localStorage)
2. User A logs out
3. User B logs in on same browser
4. User B can resolve the hash for up to 24 hours (if they guess/know the hash)

**Attack Scenario:**
```typescript
// User A logs out
// localStorage still contains:
// drawer_abc123de4567 = { key: "#asset#sensitive", hash: "abc123de4567", storedAt: ... }

// User B logs in on same device
// If User B navigates to: /assets?detail=asset:abc123de4567
// Hash resolves to "#asset#sensitive" from localStorage
// Backend validates authorization (good), but reveals entity key briefly
```

**Recommended Fix:**
```typescript
// Clear localStorage entries on logout
const clearEntityRegistry = () => {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('drawer_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
};

// Call on logout
const logout = useCallback(() => {
  clearEntityRegistry(); // Clear entity hashes
  clearImpersonation(); // Clear impersonation state
  // ... rest of logout
}, []);
```

**Severity:** MEDIUM - Cross-user data leakage possible on shared devices.

**Required Before:** Phase 2 production rollout

---

### 3.3 Referrer Header Leakage

**Current State (Before Phase 2):**
```
Referer: https://chariot.praetorian.com/u/dXNlckBleGFtcGxlLmNvbQ==/assets?assetDrawerKey=#asset#user@example.com
```

**Problem:** When user navigates to external links from Chariot, the Referer header contains:
- Base64-encoded email address
- Entity keys with PII

**Proposed State (Phase 2):**
```
Referer: https://chariot.praetorian.com/assets?detail=asset:abc123de4567
```

**Security Improvement:**
- ✅ No email addresses in Referer header
- ✅ Entity references are hashed
- ✅ Reduced PII leakage to third-party sites

**Additional Recommendation:**
```html
<!-- Add to index.html -->
<meta name="referrer" content="strict-origin-when-cross-origin" />
```

This ensures that cross-origin requests only include the origin, not the full URL:
```
Referer: https://chariot.praetorian.com
```

**Verdict:** ✅ **APPROVED with ENHANCEMENT** - Phase 2 improves Referer security. Meta tag enhancement is recommended but not blocking.

---

### 3.4 Server Logs & Analytics

**Current State (Before Phase 2):**
```
Server Access Logs:
GET /u/dXNlckBleGFtcGxlLmNvbQ==/assets?assetDrawerKey=#asset#user@example.com
```

**Problem:** Server logs contain:
- Base64-encoded email addresses (decodable)
- Entity keys with PII
- Full browsing patterns

**Proposed State (Phase 2):**
```
Server Access Logs:
GET /assets?detail=asset:abc123de4567
```

**Security Improvement:**
- ✅ No email addresses in server logs
- ✅ Entity references are hashed
- ✅ Reduced PII in log retention/backup systems
- ✅ Compliance with data minimization principles (GDPR, CCPA)

**Verdict:** ✅ **APPROVED** - Phase 2 adequately addresses server log PII exposure.

---

## 4. Input Validation

### 4.1 URL Parameter Validation Requirements

#### H-06: Search Param Zod Validation Errors Not Sanitized (HIGH) ⚠️

**Location:** Phase 3, Task 1.5 - Route Definitions

**Issue:** Zod validation errors may include user input in error messages:

```typescript
const searchSchema = z.object({
  page: z.number().int().positive(),
  status: z.enum(['active', 'inactive', 'all']),
})

// User navigates to: /assets?page=<script>alert(1)</script>
// Zod error: Expected number, received "<script>alert(1)</script>"
// If error is rendered in UI without escaping, XSS occurs
```

**Attack Scenario:**
```typescript
// Malicious URL
/assets?page='; DROP TABLE users; --&status=<img src=x onerror=alert(1)>

// Zod validation fails
// Error message contains unsanitized input
// If rendered in error boundary component:
<div>Invalid search params: {error.message}</div>
// XSS vulnerability
```

**Recommended Fix:**
```typescript
// Use .catch() to provide safe defaults instead of throwing errors
const searchSchema = z.object({
  page: z.number().int().positive().catch(1), // Safe default
  status: z.enum(['active', 'inactive', 'all']).catch('all'),
  detail: z.string()
    .regex(/^(asset|risk|seed|job|file|attribute):[a-f0-9]{12}$/)
    .catch(undefined), // Safe default: no drawer
})

// If validation error must be shown:
const sanitizeZodError = (error: ZodError): string => {
  // Strip all user input from error message
  return error.issues.map(issue => {
    return `Invalid ${issue.path.join('.')}: expected ${issue.expected}`;
  }).join(', ');
};
```

**Severity:** HIGH - XSS vulnerability if validation errors are rendered without sanitization.

**Required Before:** Phase 3 production rollout

---

#### M-07: Table Filter Parameters Not Sanitized Before Display (MEDIUM) ⚠️

**Location:** Phase 4, Task 4.4 - URL State Sync

**Issue:** Filter values from URL are displayed in the UI:

```typescript
// URL: /assets?filter=<script>alert(1)</script>
const { filter } = useSearch();

// If rendered directly:
return <FilterBadge>{filter}</FilterBadge> // XSS if not escaped
```

**Current Mitigation:** React auto-escapes by default when using JSX text children.

**Gap:** If using `dangerouslySetInnerHTML` or custom render functions, XSS is possible.

**Recommended Audit:**
```typescript
// Search for dangerous patterns in table components:
// 1. dangerouslySetInnerHTML usage
// 2. Direct innerHTML manipulation
// 3. Custom cell renderers that don't escape values

// Verify all table components follow safe patterns:
// ✅ SAFE
return <td>{row.name}</td>

// ⚠️  UNSAFE
return <td dangerouslySetInnerHTML={{ __html: row.name }} />

// ✅ SAFE (with DOMPurify)
import DOMPurify from 'dompurify';
return <td dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(row.name) }} />
```

**Required Checklist (Phase 4):**
- [ ] Audit all table components for `dangerouslySetInnerHTML`
- [ ] Verify all custom cell renderers escape user input
- [ ] Test with XSS payloads in all URL parameters
- [ ] Verify column definitions don't include unsafe render functions

**Severity:** MEDIUM - React provides default protection, but audit is needed to ensure no bypasses.

**Required Before:** Phase 4 production rollout

---

#### M-08: Entity Type Validation in Drawer URLs (MEDIUM) ⚠️

**Location:** Phase 5, Task 5.1 - DrawerState Parsing

**Issue:** The `detail` parameter format `{type}:{hash}` could be manipulated:

```
/assets?detail=risk:abc123de  // Asset page, but risk drawer type
```

**Attack Scenario:**
```typescript
// DrawerController dispatches based on entityType
switch (entityType) {
  case 'asset': return <AssetDrawer key={entityKey} />
  case 'risk': return <RiskDrawer key={entityKey} />
  ...
}

// If entityType=risk but user is on /assets page:
// RiskDrawer will render with a hash that might resolve to an asset key
// This could cause type confusion or incorrect data display
```

**Recommended Fix:**
```typescript
// Validate entity type matches resolved key format
const retrieve = async (hash: string, expectedType?: EntityType): Promise<string | null> => {
  const entry = await registry.get(hash);
  if (!entry) return null;

  // Validate key format matches expected type
  const keyType = entry.key.split('#')[1]; // "#asset#..." -> "asset"

  if (expectedType && keyType !== expectedType) {
    console.warn('Entity type mismatch', { expected: expectedType, actual: keyType });
    return null;
  }

  return entry.key;
};

// In DrawerController
const entityKey = await retrieve(hash, expectedType); // Pass expected type
if (!entityKey) {
  return <div>Invalid entity reference</div>;
}
```

**Severity:** MEDIUM - Could cause incorrect data display or type confusion.

**Required Before:** Phase 5 production rollout

---

### 4.2 XSS Risks in URL Handling

#### H-07: Missing DOMPurify for Sanitization (HIGH) ⚠️

**Location:** General - Not addressed in plan

**Issue:** The plan mentions "input sanitization" but does not specify:
1. Which library to use (DOMPurify recommended for React)
2. Where to apply sanitization
3. How to audit existing code for XSS vulnerabilities

**Recommended Addition (Phase 0):**

```typescript
// Install DOMPurify
npm install dompurify
npm install --save-dev @types/dompurify

// Create sanitization utility
// src/utils/sanitize.ts
import DOMPurify from 'dompurify';

export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target']
  });
};

export const sanitizeText = (dirty: string): string => {
  // Strip all HTML tags
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
};

// Usage
import { sanitizeHtml } from '@/utils/sanitize';

// When dangerouslySetInnerHTML is necessary:
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userInput) }} />

// For plain text (React handles escaping, but extra safety):
<div>{sanitizeText(userInput)}</div>
```

**Required Audit (Phase 0):**
```bash
# Find all dangerouslySetInnerHTML usage
grep -r "dangerouslySetInnerHTML" src/

# Verify each instance is sanitized
# Verify no direct innerHTML manipulation
grep -r "innerHTML" src/
```

**Severity:** HIGH - XSS is a critical vulnerability if input sanitization is not applied consistently.

**Required Before:** Phase 1 deployment

---

#### M-09: Virtualization Skips Row Validation for Performance (MEDIUM) ⚠️

**Location:** Phase 4, Task 4.2 - TanStackTable with Virtualization

**Issue:** Virtualized rows only validate/render when scrolled into view. If data validation happens at render time, invalid/malicious data may exist undetected until viewed.

**Recommended Fix:**
```typescript
// Validate data at fetch time, not render time
const { data } = useQuery({
  queryKey: ['assets'],
  queryFn: fetchAssets,
  select: (data) => data.map(validateAndSanitize), // Validate upfront
})

// Validation function
const validateAndSanitize = (asset: Asset): Asset => {
  return {
    ...asset,
    name: sanitizeText(asset.name),
    description: sanitizeText(asset.description),
    // Validate enum values
    status: ['active', 'inactive'].includes(asset.status) ? asset.status : 'unknown',
  };
};
```

**Severity:** MEDIUM - Could allow malicious data to be rendered without validation.

**Required Before:** Phase 4 production rollout

---

### 4.3 Path Traversal Considerations

**Assessment:** Path traversal is NOT a concern for this refactoring because:

1. **No file system access** - All routes are client-side React Router routes
2. **No dynamic imports based on user input** - Route tree is generated at build time
3. **No server-side rendering with user input** - Pure SPA architecture

**Verdict:** ✅ **NO ACTION REQUIRED** - Path traversal does not apply to client-side routing.

---

## 5. Security Testing Requirements

### 5.1 Unit Security Tests

**Required Test Coverage (Per Phase):**

#### Phase 1: Impersonation Security Tests

```typescript
// src/state/__tests__/impersonation.security.test.tsx

describe('ImpersonationContext Security', () => {
  it('should bind impersonation to JWT session', async () => {
    // Test C-01: Session binding
    const { startImpersonation } = renderImpersonationProvider();
    await startImpersonation('victim@example.com');

    // Change JWT (simulate session change)
    changeAuthToken('different-token');

    // Impersonation should be cleared
    expect(getCurrentImpersonation()).toBeNull();
  });

  it('should clear impersonation on logout', async () => {
    // Test H-04: Logout cleanup
    const { startImpersonation } = renderImpersonationProvider();
    await startImpersonation('victim@example.com');

    // Logout
    logout();

    // Verify sessionStorage cleared
    expect(sessionStorage.getItem('chariot_impersonation_target')).toBeNull();
  });

  it('should validate OAuth restore permission', async () => {
    // Test H-05: OAuth integrity
    sessionStorage.setItem('oauth_impersonation_restore', 'victim@example.com');

    // Non-admin user
    renderAuthProvider({ user: { isPraetorianUser: false } });

    // OAuth callback
    await handleOAuthCallback();

    // Impersonation should NOT be restored
    expect(getCurrentImpersonation()).toBeNull();
  });

  it('should resist XSS via impersonation target', async () => {
    // Test M-04: XSS protection
    const xssPayload = '<script>alert(1)</script>';
    await startImpersonation(xssPayload);

    // Render component that displays impersonation target
    const { container } = render(<ImpersonationBanner />);

    // Verify no script tags in DOM
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain(xssPayload); // Text content, not HTML
  });
});
```

#### Phase 2: Hash Security Tests

```typescript
// src/utils/__tests__/entityKeyRegistry.security.test.ts

describe('EntityKeyRegistry Security', () => {
  it('should prevent cross-user hash resolution', async () => {
    // Test H-01: User binding
    const registry = createEntityKeyRegistry();

    // User A stores hash
    setCurrentUser('userA@example.com');
    await registry.store('#asset#sensitive', 'abc123de4567');

    // User B attempts to resolve
    setCurrentUser('userB@example.com');
    const resolved = await registry.get('abc123de4567');

    // Should fail or trigger backend validation
    expect(resolved).toBeNull();
  });

  it('should detect hash collision attacks', async () => {
    // Test H-01: Hash integrity
    const registry = createEntityKeyRegistry();

    // Store legitimate hash
    await registry.store('#asset#legitimate', 'abc123de4567');

    // Attacker tampers with localStorage
    localStorage.setItem('drawer_abc123de4567', JSON.stringify({
      key: '#asset#malicious',
      hash: 'abc123de4567', // Collision attempt
      storedAt: Date.now()
    }));

    // Retrieve - should detect mismatch
    const resolved = await registry.get('abc123de4567');

    // Should reject tampered entry
    expect(resolved).toBeNull();
  });

  it('should enforce rate limiting on hash resolution', async () => {
    // Test M-01: Brute force protection
    const registry = createEntityKeyRegistry();

    // Attempt 101 hash resolutions in 1 minute
    for (let i = 0; i < 101; i++) {
      await registry.get(generateRandomHash());
    }

    // 101st attempt should fail with rate limit error
    await expect(registry.get(generateRandomHash()))
      .rejects.toThrow('Rate limit exceeded');
  });
});
```

#### Phase 3: Route Security Tests

```typescript
// src/routes/__tests__/auth.security.test.tsx

describe('Route Guard Security', () => {
  it('should document route guards as defense-in-depth only', () => {
    // Test H-02: Documentation
    const routeFile = readFileSync('src/routes/_authenticated.tsx', 'utf-8');

    // Verify security comment exists
    expect(routeFile).toContain('SECURITY NOTE');
    expect(routeFile).toContain('defense-in-depth only');
    expect(routeFile).toContain('Backend JWT validation is the authoritative');
  });

  it('should sanitize Zod validation errors', () => {
    // Test H-06: XSS in errors
    const searchSchema = z.object({
      page: z.number().catch(1),
    });

    // XSS payload
    const result = searchSchema.safeParse({ page: '<script>alert(1)</script>' });

    // Should use safe default, not throw with unsanitized input
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(1); // Safe default
  });
});
```

#### Phase 4: Table Security Tests

```typescript
// src/components/table/__tests__/table.security.test.tsx

describe('Table XSS Protection', () => {
  it('should escape filter parameters from URL', () => {
    // Test M-07: Filter XSS
    const xssPayload = '<script>alert(1)</script>';

    // Navigate with XSS payload in filter
    navigate({ to: '/assets', search: { filter: xssPayload } });

    // Render table
    const { container } = render(<AssetsTable />);

    // Verify no script tags in DOM
    expect(container.querySelector('script')).toBeNull();
  });

  it('should validate data before virtualization', async () => {
    // Test M-09: Virtualization validation
    const maliciousData = [
      { id: '1', name: '<img src=x onerror=alert(1)>' },
      { id: '2', name: 'Valid Name' }
    ];

    // Fetch data (should validate)
    const { data } = await queryClient.fetchQuery({
      queryKey: ['assets'],
      queryFn: () => Promise.resolve(maliciousData)
    });

    // Data should be sanitized
    expect(data[0].name).not.toContain('<img');
  });
});
```

#### Phase 5: Drawer Security Tests

```typescript
// src/hooks/__tests__/useDrawerState.security.test.ts

describe('useDrawerState Security', () => {
  it('should validate entity type matches resolved key', async () => {
    // Test M-08: Type confusion
    const registry = createEntityKeyRegistry();
    await registry.store('#asset#test', 'abc123de4567');

    // Attempt to open as risk (wrong type)
    const { openDrawer } = renderUseDrawerState();
    await openDrawer('risk', 'abc123de4567'); // Type mismatch

    // Should reject
    expect(getCurrentDrawerState()).toBeNull();
  });

  it('should validate access to nested drawers', async () => {
    // Test H-03: Nested drawer access
    const { openNestedDrawer } = renderUseDrawerState();

    // Mock: user has access to asset but NOT risk
    mockAccessCheck('asset:abc123', true);
    mockAccessCheck('risk:xyz789', false);

    // Attempt to open nested drawer
    await openNestedDrawer('risk', 'xyz789');

    // Should fail with error toast
    expect(screen.getByText('You do not have access to this item')).toBeInTheDocument();
  });
});
```

**Test Coverage Targets:**
- **Unit tests:** 85%+ coverage for security-critical code
- **Security-specific tests:** 100% coverage for identified vulnerabilities

---

### 5.2 E2E Security Tests

**Required E2E Test Scenarios:**

#### Phase 1: Impersonation E2E

```typescript
// e2e/tests/security/impersonation.spec.ts

test.describe('Impersonation Security E2E', () => {
  test('should prevent impersonation after logout', async ({ page, context }) => {
    // Test H-04: Logout cleanup
    await page.goto('/login');
    await loginAsAdmin(page);

    // Start impersonation
    await startImpersonation(page, 'customer@example.com');

    // Verify impersonation active
    await expect(page.locator('[data-testid="impersonation-banner"]')).toBeVisible();

    // Logout
    await logout(page);

    // Different user logs in
    await loginAsCustomer(page);

    // Verify no impersonation active
    await expect(page.locator('[data-testid="impersonation-banner"]')).not.toBeVisible();
  });

  test('should require admin permission for OAuth restore', async ({ page, context }) => {
    // Test H-05: OAuth integrity

    // Non-admin user tampers with sessionStorage
    await context.addInitScript(() => {
      sessionStorage.setItem('oauth_impersonation_restore', 'victim@example.com');
    });

    // Login as non-admin
    await page.goto('/login');
    await loginAsCustomer(page);

    // Trigger OAuth flow
    await page.click('[data-testid="oauth-login-button"]');

    // Complete OAuth (redirects back to app)
    await page.waitForURL(/\/assets/);

    // Verify impersonation NOT active
    await expect(page.locator('[data-testid="impersonation-banner"]')).not.toBeVisible();
  });
});
```

#### Phase 2: PII-Free URLs E2E

```typescript
// e2e/tests/security/pii-free-urls.spec.ts

test.describe('PII-Free URLs Security E2E', () => {
  test('should not expose email in browser history', async ({ page }) => {
    // Test: Browser history PII
    await page.goto('/login');
    await loginAsAdmin(page);

    // Navigate to assets
    await page.goto('/assets');

    // Open drawer
    await page.click('[data-testid="asset-row-1"]');

    // Get browser history
    const url = page.url();

    // Verify no email in URL
    expect(url).not.toMatch(/@/);
    expect(url).not.toMatch(/[A-Za-z0-9+/=]{20,}/); // No long base64 strings

    // Verify hash format
    expect(url).toMatch(/detail=asset:[a-f0-9]{12}/);
  });

  test('should show warning for legacy URLs with PII', async ({ page }) => {
    // Test M-02: Legacy URL warning
    const legacyUrl = '/u/dXNlckBleGFtcGxlLmNvbQ==/assets?assetDrawerKey=#asset#user@example.com';

    await page.goto(legacyUrl);

    // Verify warning shown
    await expect(page.locator('[data-testid="legacy-url-warning"]')).toBeVisible();

    // Verify "Continue Anyway" requires acknowledgment
    const continueButton = page.locator('button:has-text("Continue")');
    await expect(continueButton).toBeDisabled(); // Countdown active
  });

  test('should prevent cross-user hash resolution', async ({ page, context }) => {
    // Test H-01: Cross-user hash

    // User A: Create hash in localStorage
    await context.addInitScript(() => {
      localStorage.setItem('drawer_abc123de4567', JSON.stringify({
        key: '#asset#sensitive-data',
        hash: 'abc123de4567',
        storedAt: Date.now(),
        storedBy: 'userA@example.com'
      }));
    });

    // Login as User B
    await page.goto('/login');
    await loginAsUser(page, 'userB@example.com');

    // Attempt to access User A's hash
    await page.goto('/assets?detail=asset:abc123de4567');

    // Should show "Unresolved Link" dialog
    await expect(page.locator('[data-testid="unresolved-link-dialog"]')).toBeVisible();
  });
});
```

#### Phase 3: Router Security E2E

```typescript
// e2e/tests/security/router-security.spec.ts

test.describe('TanStack Router Security E2E', () => {
  test('should not expose Zod errors with user input', async ({ page }) => {
    // Test H-06: XSS in validation errors
    const xssPayload = '<script>alert(1)</script>';

    await page.goto(`/assets?page=${encodeURIComponent(xssPayload)}`);

    // Page should load with safe default (page=1)
    // No error message with unsanitized input
    const html = await page.content();
    expect(html).not.toContain('<script>');
    expect(html).not.toContain(xssPayload);
  });

  test('should document route guards as non-authoritative', async ({ page }) => {
    // Test H-02: Documentation verification
    // This is more of a code audit than E2E test
    // But we can verify behavior:

    // Attempt to access authenticated route without login
    await page.goto('/assets');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Even if we manipulate client state, backend should reject
    await page.evaluate(() => {
      // @ts-ignore - manipulating for test
      window.__auth = { isSignedIn: true };
    });

    await page.goto('/assets');

    // Backend should reject data requests (401/403)
    // Verify no data loaded
    await expect(page.locator('[data-testid="asset-table"]')).not.toBeVisible();
  });
});
```

**E2E Test Coverage Targets:**
- **Security tests:** 100% coverage for identified attack scenarios
- **Cross-browser:** Test on Chrome, Firefox, Safari for browser-specific vulnerabilities

---

### 5.3 Penetration Testing Scenarios

**Recommended Penetration Testing Checklist:**

#### Phase 1: Impersonation Penetration Tests

1. **Session Hijacking**
   - [ ] XSS to steal sessionStorage impersonation state
   - [ ] Session fixation attacks
   - [ ] CSRF on impersonation start/stop

2. **Privilege Escalation**
   - [ ] Non-admin user attempts to set impersonation state
   - [ ] OAuth restore with manipulated sessionStorage
   - [ ] Impersonation state without corresponding JWT

3. **Audit Log Bypass**
   - [ ] Silent impersonation without logging
   - [ ] Log injection attacks
   - [ ] Timestamp manipulation

#### Phase 2: Hash Manipulation Penetration Tests

1. **Hash Brute Force**
   - [ ] Automated hash guessing (rate limiting test)
   - [ ] Rainbow table attacks (pre-computed hashes)
   - [ ] Hash collision attacks

2. **Registry Tampering**
   - [ ] localStorage injection of malicious hashes
   - [ ] Cross-user hash resolution
   - [ ] Hash integrity bypass

3. **Information Disclosure**
   - [ ] Entity type inference from hash format
   - [ ] Timing attacks on hash validation
   - [ ] Error message information leakage

#### Phase 3: Router Penetration Tests

1. **Route Guard Bypass**
   - [ ] Client-side auth manipulation (React DevTools)
   - [ ] Direct URL access to protected routes
   - [ ] Search param manipulation to bypass validation

2. **XSS via URL Parameters**
   - [ ] Zod validation error XSS
   - [ ] Search param reflected XSS
   - [ ] Path parameter XSS

3. **CSRF on Navigation**
   - [ ] Cross-site navigation attacks
   - [ ] Referer header manipulation
   - [ ] Origin header bypass

#### Phase 4: Table Penetration Tests

1. **XSS via Table Data**
   - [ ] Filter parameter XSS
   - [ ] Sort parameter XSS
   - [ ] Column header XSS
   - [ ] Cell renderer XSS

2. **Performance DoS**
   - [ ] Large dataset rendering
   - [ ] Rapid sort/filter changes
   - [ ] Memory exhaustion via virtualization

#### Phase 5: Drawer Penetration Tests

1. **Nested Drawer Access Control**
   - [ ] Unauthorized nested drawer access
   - [ ] Entity type confusion attacks
   - [ ] Max nesting bypass

2. **Deep Link Attacks**
   - [ ] Crafted URLs to restricted entities
   - [ ] Cross-entity type confusion
   - [ ] Tab state manipulation

**Penetration Testing Tools:**
- OWASP ZAP for automated vulnerability scanning
- Burp Suite for manual testing
- XSS Validator browser extension
- CSRF Tester

**Penetration Testing Timeline:**
- **Phase 1:** After Phase 1 deployment (pre-production)
- **Phase 2:** After Phase 2 deployment (pre-production)
- **Phase 3-5:** After Phase 5 complete (full penetration test)

---

### 5.4 OWASP Considerations

**OWASP Top 10 2021 Mapping:**

| OWASP Category | Risk Level | Addressed By | Findings |
|----------------|------------|--------------|----------|
| **A01: Broken Access Control** | HIGH | Phase 1, Phase 5 | C-01, H-02, H-03, H-04, H-05 |
| **A02: Cryptographic Failures** | MEDIUM | Phase 2 | M-01 (hash entropy) |
| **A03: Injection (XSS)** | HIGH | Phase 3, Phase 4 | H-06, H-07, M-07, M-09 |
| **A04: Insecure Design** | LOW | General | Addressed by defense-in-depth |
| **A05: Security Misconfiguration** | MEDIUM | Phase 0 | M-04 (CSP headers missing) |
| **A06: Vulnerable Components** | LOW | N/A | Regular dependency updates |
| **A07: Authentication Failures** | HIGH | Phase 1 | C-01, H-04, H-05 |
| **A08: Software/Data Integrity** | MEDIUM | Phase 2 | H-01 (hash integrity) |
| **A09: Logging Failures** | MEDIUM | Phase 1 | Audit logging needed |
| **A10: SSRF** | N/A | N/A | Not applicable (frontend-only) |

**Priority OWASP Concerns:**

1. **A01: Broken Access Control** (CRITICAL)
   - Impersonation state not bound to JWT (C-01)
   - Nested drawer access control bypass (H-03)
   - Route guard bypass (H-02)

2. **A03: Injection (XSS)** (HIGH)
   - Zod validation errors not sanitized (H-06)
   - Missing DOMPurify integration (H-07)
   - Table filter parameters (M-07)

3. **A07: Authentication Failures** (HIGH)
   - Impersonation persists after logout (H-04)
   - OAuth restore integrity (H-05)

**OWASP Recommendations:**
- Implement OWASP ASVS Level 2 controls for web applications
- Follow OWASP XSS Prevention Cheat Sheet
- Apply OWASP Authentication Cheat Sheet patterns

---

## 6. React-Specific Security Patterns

### 6.1 React 19 Security Considerations

#### M-10: React 19 Compiler and Memoization Security (MEDIUM) 📝

**Location:** General - React 19 patterns

**Issue:** React 19's automatic memoization via the React Compiler could cache sensitive data unintentionally.

**Example:**
```typescript
// React Compiler auto-memoizes this component
function UserProfile({ userId }) {
  const user = useQuery(['user', userId]);

  // If userId changes due to impersonation, compiler might serve cached data
  // for previous user if memoization boundaries are wrong
  return <div>{user.email}</div>;
}
```

**Recommended Pattern:**
```typescript
// Explicitly include impersonation context in dependencies
function UserProfile({ userId }) {
  const { isImpersonating, targetUser } = useImpersonation();

  const user = useQuery({
    queryKey: ['user', userId, isImpersonating, targetUser], // Include context
    queryFn: () => fetchUser(userId)
  });

  return <div>{user.email}</div>;
}
```

**Audit Requirement:**
- [ ] Review all useQuery/useMutation hooks to ensure cache keys include impersonation context
- [ ] Verify React Compiler memoization doesn't cache across impersonation boundaries
- [ ] Test memoization behavior with impersonation state changes

**Severity:** MEDIUM - Could cause data leakage between impersonation sessions if not properly handled.

**Required Before:** Phase 1 deployment (review cache keys)

---

### 6.2 Context API Security (React 19 Syntax)

#### M-11: Context Provider Hierarchy Security (MEDIUM) 📝

**Location:** Phase 1 - Provider ordering

**Issue:** React 19 uses `<Context>` instead of `<Context.Provider>`. Provider ordering matters for security:

```typescript
// ⚠️  INSECURE ORDER
<ImpersonationProvider>
  <AuthProvider>
    {/* Impersonation provider doesn't have auth context */}
    {children}
  </AuthProvider>
</ImpersonationProvider>

// ✅ SECURE ORDER
<AuthProvider>
  <ImpersonationProvider>
    {/* Impersonation provider can access auth context */}
    {children}
  </ImpersonationProvider>
</AuthProvider>
```

**Required Pattern (Phase 1):**
```typescript
// Root provider ordering (security-critical)
<QueryClientProvider client={queryClient}>
  <AuthProvider>           {/* 1. Auth first - source of truth */}
    <ImpersonationProvider> {/* 2. Impersonation depends on auth */}
      <RouterProvider />    {/* 3. Router uses both contexts */}
    </ImpersonationProvider>
  </AuthProvider>
</QueryClientProvider>
```

**Audit Requirement:**
- [ ] Verify provider hierarchy in App.tsx
- [ ] Document provider ordering constraints
- [ ] Test that impersonation can access auth context

**Severity:** MEDIUM - Incorrect provider order could break security assumptions.

**Required Before:** Phase 1 deployment

---

### 6.3 TanStack Query Security

#### M-12: Cache Key Security for Impersonation (MEDIUM) ⚠️

**Location:** Phase 1, Task 1.2 - TanStack Query Integration

**Issue:** Cache keys must include impersonation context to prevent data leakage.

**Current Pattern (from plan):**
```typescript
const { data } = useMySettings({
  queryKeyPrefix: impersonationContext.targetUser
    ? [impersonationContext.targetUser]
    : []
})
```

**Security Review:**
✅ **APPROVED** - The plan correctly includes impersonation context in cache keys.

**Verification Requirement:**
- [ ] Audit ALL useQuery/useMutation calls to verify cache keys include impersonation
- [ ] Create ESLint rule to enforce cache key pattern

**Recommended ESLint Rule:**
```typescript
// .eslintrc.js
module.exports = {
  rules: {
    '@chariot/require-impersonation-in-cache-key': 'error'
  }
}

// Custom ESLint rule
// Verify all useQuery calls inside components include impersonation context
```

**Severity:** MEDIUM - Missing impersonation in cache keys causes data leakage.

**Required Before:** Phase 1 deployment

---

### 6.4 State Management Security

#### L-03: Zustand State Security (LOW) 📝

**Location:** General - Client-side state

**Issue:** Zustand stores persist in memory across component unmounts. If sensitive data is stored:

```typescript
// ⚠️  Potential issue
const useStore = create((set) => ({
  currentUserEmail: null,
  setEmail: (email) => set({ currentUserEmail: email })
}))

// Email persists in store even after logout
```

**Recommended Pattern:**
```typescript
// Clear sensitive data on logout
const useStore = create((set) => ({
  currentUserEmail: null,
  setEmail: (email) => set({ currentUserEmail: email }),
  clear: () => set({ currentUserEmail: null })
}))

// In logout handler
const logout = () => {
  useStore.getState().clear(); // Clear Zustand state
  // ... rest of logout
}
```

**Audit Requirement:**
- [ ] Review all Zustand stores for sensitive data
- [ ] Verify logout handler clears all stores
- [ ] Document which data should never be in client-side state

**Severity:** LOW - Limited impact since JWT is the authoritative source, but good hygiene.

**Required Before:** N/A (best practice, not blocking)

---

## 7. Browser Security Model Implications

### 7.1 Storage API Security

#### M-13: localStorage Quota Exhaustion (MEDIUM) 📝

**Location:** Phase 2 - EntityKeyRegistry

**Issue:** localStorage has a 5-10MB quota per origin. If hash registry grows too large:

```typescript
// Current: No quota management
for (const key of entityKeys) {
  await registry.store(key, hash); // May exceed quota
}
```

**Attack Scenario:**
1. Attacker opens 100,000 drawers rapidly
2. localStorage fills with hash entries
3. Quota exceeded
4. Registry.store() throws DOMException
5. Application breaks

**Recommended Fix:**
```typescript
// Add quota management
const MAX_REGISTRY_SIZE = 1000; // Max hashes to store

class EntityKeyRegistry {
  async store(key: string, hash: string): Promise<void> {
    try {
      // Check quota before storing
      if (this.size() >= MAX_REGISTRY_SIZE) {
        this.evictOldest(); // LRU eviction
      }

      localStorage.setItem(`drawer_${hash}`, JSON.stringify({
        key, hash, storedAt: Date.now()
      }));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, clearing old entries');
        this.evictHalf(); // Emergency eviction
        // Retry
        localStorage.setItem(`drawer_${hash}`, JSON.stringify({
          key, hash, storedAt: Date.now()
        }));
      } else {
        throw e;
      }
    }
  }
}
```

**Severity:** MEDIUM - DoS via quota exhaustion, requires rate limiting protection.

**Required Before:** Phase 2 production rollout

---

#### M-14: Private Browsing Mode (MEDIUM) 📝

**Location:** Phase 1, Phase 2 - sessionStorage and localStorage

**Issue:** In private browsing mode, some browsers disable or limit storage APIs:
- Safari: sessionStorage/localStorage quota is ~0 (writes throw)
- Firefox: sessionStorage works, localStorage has 10MB quota
- Chrome: sessionStorage/localStorage work normally

**Impact:**
- Phase 1: Impersonation state cannot be stored (sessionStorage throws)
- Phase 2: Hash registry cannot be stored (localStorage throws)

**Recommended Fix:**
```typescript
// Feature detection and fallback
class StorageAdapter {
  private storage: Storage | InMemoryStorage;

  constructor(storageType: 'session' | 'local') {
    try {
      const storage = storageType === 'session' ? sessionStorage : localStorage;
      storage.setItem('__test__', 'test');
      storage.removeItem('__test__');
      this.storage = storage;
    } catch (e) {
      console.warn(`${storageType}Storage unavailable, using in-memory fallback`);
      this.storage = new InMemoryStorage();
    }
  }

  // Delegate methods...
}

// In-memory fallback
class InMemoryStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  // ... other Storage interface methods
}
```

**User Impact with Fallback:**
- Phase 1: Impersonation state lost on refresh (acceptable, admin re-impersonates)
- Phase 2: Hash links break across tabs/refreshes (acceptable, shows "Unresolved Link" dialog)

**Severity:** MEDIUM - Feature degradation in private browsing, but graceful fallback possible.

**Required Before:** Phase 1 deployment (storage adapter with fallback)

---

### 7.2 Browser Extensions Security

#### L-04: Browser Extension Interference (LOW) 📝

**Location:** General - Client-side JavaScript

**Issue:** Browser extensions can:
- Read/modify localStorage and sessionStorage
- Intercept and modify React context
- Inject scripts that manipulate state

**Examples:**
- Password manager extensions read sessionStorage
- Ad blockers modify page content
- Developer tools extensions access React state

**Mitigation (Limited):**
```typescript
// Content Security Policy can restrict some extensions
<meta http-equiv="Content-Security-Policy" content="
  script-src 'self';
  object-src 'none';
" />

// Object.freeze() sensitive state (limited effectiveness)
const impersonationState = Object.freeze({
  targetUser: 'user@example.com',
  startedAt: Date.now()
});
```

**Verdict:** ✅ **ACCEPT RISK** - Browser extensions have full access to page content. Users who install malicious extensions accept this risk. CSP provides defense-in-depth but cannot fully prevent extension access.

**Severity:** LOW - User-installed extensions are trusted by definition. This is an accepted browser security model limitation.

**Required Before:** N/A (accepted risk, document in security policy)

---

### 7.3 Cross-Window Communication

#### L-05: PostMessage Security (LOW) 📝

**Location:** Phase 1 - OAuth Flow

**Issue:** If OAuth flow uses window.postMessage for callback:

```typescript
// ⚠️  Insecure postMessage
window.opener.postMessage({ token: jwt }, '*'); // Any origin can receive
```

**Recommended Pattern:**
```typescript
// ✅ Secure postMessage with origin check
window.opener.postMessage({ token: jwt }, 'https://chariot.praetorian.com');

// Receiver validates origin
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://chariot.praetorian.com') {
    console.warn('Rejected postMessage from untrusted origin:', event.origin);
    return;
  }

  // Process message
  handleOAuthCallback(event.data.token);
});
```

**Audit Requirement:**
- [ ] Verify OAuth flow implementation
- [ ] If postMessage is used, verify origin checks
- [ ] If not using postMessage, mark N/A

**Severity:** LOW - OAuth flow uses redirect, not postMessage (from plan review). If implemented in future, origin checks are required.

**Required Before:** N/A (postMessage not used in current plan)

---

## 8. Additional Security Recommendations

### 8.1 Content Security Policy (CSP)

#### M-15: Missing CSP Headers (MEDIUM) ⚠️

**Location:** General - Not addressed in plan

**Issue:** The plan mentions CSP as XSS mitigation but doesn't include CSP implementation tasks.

**Recommended Addition to Phase 0:**

```markdown
### Task 0.X: Implement Content Security Policy

**Implementation:**

1. Add CSP headers to backend responses (nginx/CloudFront)

```nginx
add_header Content-Security-Policy "
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://api.chariot.praetorian.com;
  frame-src 'self' https://accounts.google.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
" always;
```

2. Test with report-only mode first

```nginx
add_header Content-Security-Policy-Report-Only "...";
```

3. Monitor CSP violations

```typescript
window.addEventListener('securitypolicyviolation', (e) => {
  console.warn('CSP violation:', e.violatedDirective, e.blockedURI);

  // Send to monitoring
  reportCSPViolation({
    directive: e.violatedDirective,
    blockedURI: e.blockedURI,
    documentURI: e.documentURI,
    timestamp: Date.now()
  });
});
```

4. Gradually tighten policy
   - Start with permissive policy
   - Monitor violations
   - Remove 'unsafe-inline' and 'unsafe-eval'
   - Add nonce-based script loading

**Verification:**
- [ ] CSP headers present in all responses
- [ ] No violations in production
- [ ] 'unsafe-inline' removed from script-src
- [ ] Nonce-based script loading implemented

**Exit Criteria:**
- CSP Score A+ on https://csp-evaluator.withgoogle.com/
- Zero CSP violations in production monitoring
```

**Severity:** MEDIUM - XSS mitigation gap without CSP headers.

**Required Before:** Phase 1 deployment

---

### 8.2 Subresource Integrity (SRI)

#### L-06: Missing SRI for CDN Resources (LOW) 📝

**Location:** General - External resources

**Issue:** If loading any resources from CDN (fonts, analytics, etc.), SRI should be used:

```html
<!-- ⚠️  Without SRI -->
<script src="https://cdn.example.com/analytics.js"></script>

<!-- ✅ With SRI -->
<script
  src="https://cdn.example.com/analytics.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/ux9w..."
  crossorigin="anonymous"
></script>
```

**Audit Requirement:**
- [ ] List all external resources (CDN, third-party scripts)
- [ ] Add SRI hashes to all external resources
- [ ] Verify SRI hashes on build

**Severity:** LOW - Only relevant if using CDN resources. If self-hosting all assets, N/A.

**Required Before:** N/A (optional, only if using CDN)

---

### 8.3 Security Audit Logging

#### H-08: Missing Audit Logging Requirements (HIGH) ⚠️

**Location:** Phase 1 - Impersonation

**Issue:** The security-lead review identifies missing audit logging (H-01), but the plan doesn't specify what to log.

**Recommended Audit Log Events:**

```typescript
// Impersonation events (MUST log)
auditLog({
  action: 'IMPERSONATION_START',
  actor: admin.email,
  target: targetUser.email,
  timestamp: new Date().toISOString(),
  metadata: { route: currentRoute, userAgent: navigator.userAgent }
});

auditLog({
  action: 'IMPERSONATION_STOP',
  actor: admin.email,
  target: targetUser.email,
  duration: endTime - startTime,
  timestamp: new Date().toISOString()
});

auditLog({
  action: 'IMPERSONATION_ACTION',
  actor: admin.email,
  target: targetUser.email,
  action_type: 'UPDATE_SETTING', // What action was performed
  resource: '/api/settings/notifications',
  timestamp: new Date().toISOString()
});

// Security events (SHOULD log)
auditLog({
  action: 'HASH_RESOLUTION_FAILED',
  hash: 'abc123de4567',
  userId: currentUser.email,
  timestamp: new Date().toISOString()
});

auditLog({
  action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
  userId: currentUser.email,
  resource: '/api/sensitive-data',
  method: 'GET',
  responseStatus: 403,
  timestamp: new Date().toISOString()
});

auditLog({
  action: 'CSP_VIOLATION',
  violatedDirective: 'script-src',
  blockedURI: 'https://malicious.com/evil.js',
  documentURI: window.location.href,
  timestamp: new Date().toISOString()
});
```

**Audit Log Storage:**
- Backend writes to audit log table/stream
- Immutable (append-only)
- Encrypted at rest
- Retention: 2 years minimum (SOC 2 compliance)

**Audit Log Access:**
- Only security team can read
- All reads are logged
- Export capability for compliance audits

**Severity:** HIGH - Compliance requirement (SOC 2, GDPR) and forensic capability.

**Required Before:** Phase 1 production deployment

---

### 8.4 Feature Flag Security

#### M-16: Feature Flags Exposed in Client Bundle (MEDIUM) ⚠️

**Location:** All phases - Feature flag usage

**Issue:** All feature flags (`USE_CONTEXT_IMPERSONATION`, `ENABLE_PII_FREE_URLS`, `ENABLE_TANSTACK_ROUTER`, etc.) are bundled into the client JavaScript. Attackers can:
1. Discover upcoming features via source inspection
2. Enable flags via browser console manipulation
3. Access beta features not intended for their account

**Example:**
```javascript
// Attacker can do this in browser console:
window.USE_TANSTACK_ROUTER = true;
location.reload();
// Now using beta feature
```

**Recommended Fix:**
```typescript
// Server-side feature flag evaluation
// Backend: GET /api/feature-flags
{
  "impersonation_context": true,
  "pii_free_urls": false,
  "tanstack_router": false
}

// Frontend: Use flag values (not names)
const flags = await fetchFeatureFlags();

if (flags.impersonation_context) {
  // Use context-based impersonation
} else {
  // Use URL-based impersonation
}

// Critical flags should have backend enforcement
// Backend checks flag state, not just frontend
```

**Severity:** MEDIUM - Allows attackers to enable beta features and discover unreleased functionality.

**Required Before:** Phase 1 deployment (server-side feature flag evaluation)

---

## 9. Compliance Considerations

### 9.1 GDPR Data Minimization

**Assessment:**

✅ **Phase 2 addresses GDPR data minimization requirements:**

| Requirement | Before Phase 2 | After Phase 2 | Verdict |
|-------------|----------------|---------------|---------|
| PII in URLs | ❌ Email addresses visible | ✅ Hash-based references | COMPLIANT |
| Browser history PII | ❌ Email addresses logged | ✅ Hashes only | COMPLIANT |
| Server log PII | ❌ Email addresses in logs | ✅ Hashes only | COMPLIANT |
| Referrer header PII | ❌ Email addresses leaked | ✅ Hashes only | COMPLIANT |
| Data minimization | ❌ Excessive PII exposure | ✅ Minimal identifiers | COMPLIANT |

**Verdict:** ✅ **APPROVED** - Phase 2 adequately addresses GDPR data minimization.

---

### 9.2 SOC 2 Type II Requirements

**Assessment:**

| Control | Status | Gap |
|---------|--------|-----|
| Access logging | ⚠️  PARTIAL | Need impersonation audit logs (H-08) |
| Session management | ⚠️  GAP | Need session binding (C-01) |
| Data protection | ✅ ADEQUATE | PII removal addresses this |
| Change management | ✅ ADEQUATE | Feature flags + rollback procedures |
| Security monitoring | ⚠️  PARTIAL | Need CSP violation monitoring |

**Required for SOC 2 Compliance:**
- [x] Implement audit logging for impersonation events (H-08)
- [x] Implement session binding for impersonation (C-01)
- [x] Implement CSP headers with violation monitoring (M-15)

**Verdict:** ⚠️  **CONDITIONAL** - Address gaps before SOC 2 audit.

---

### 9.3 CCPA/Privacy Requirements

**Assessment:**

✅ **Phase 2 addresses CCPA privacy requirements:**

- **Right to Know:** Hashes in URLs make it harder to identify which data was accessed (privacy-preserving)
- **Right to Delete:** 24h TTL on hash registry supports data deletion workflows
- **Right to Opt-Out:** Not applicable (internal application, not selling data)

**Verdict:** ✅ **COMPLIANT** - Phase 2 improves privacy posture for CCPA.

---

## 10. Approval Conditions & Sign-off

### 10.1 Critical Findings (Block Deployment)

- [ ] **C-01**: Implement impersonation session binding before Phase 1 production deployment
  - Location: Phase 1, ImpersonationContext
  - Fix: Bind impersonation state to JWT signature hash
  - Verification: Unit test + manual testing with session change

### 10.2 High Findings (Block Production Rollout)

- [ ] **H-01**: Implement user-binding for hash registry before Phase 2 production rollout
  - Location: Phase 2, EntityKeyRegistry
  - Fix: Add storedBy field, validate on cross-user access
  - Verification: E2E test for cross-user hash resolution blocked

- [ ] **H-02**: Document route guards as defense-in-depth before Phase 3 production rollout
  - Location: Phase 3, _authenticated.tsx
  - Fix: Add SECURITY NOTE comment documenting non-authoritative nature
  - Verification: Code review confirms comment present

- [ ] **H-03**: Implement access pre-check for nested drawers before Phase 5 production rollout
  - Location: Phase 5, useDrawerState
  - Fix: Validate access before opening nested drawer
  - Verification: E2E test for unauthorized nested drawer blocked

- [ ] **H-04**: Clear impersonation state on logout before Phase 1 production deployment
  - Location: Phase 1, logout handler
  - Fix: Call clearImpersonation() in logout
  - Verification: E2E test for impersonation cleared after logout

- [ ] **H-05**: Validate OAuth impersonation restore permission before Phase 1 production deployment
  - Location: Phase 1, OAuth callback
  - Fix: Backend validates impersonation permission
  - Verification: E2E test for non-admin OAuth restore blocked

- [ ] **H-06**: Use Zod .catch() for safe defaults before Phase 3 production rollout
  - Location: Phase 3, search param schemas
  - Fix: Replace .parse() with .catch(defaultValue)
  - Verification: E2E test with XSS payload shows safe default

- [ ] **H-07**: Integrate DOMPurify for sanitization before Phase 1 deployment
  - Location: General, XSS protection
  - Fix: Install DOMPurify, create sanitization utilities
  - Verification: Audit all dangerouslySetInnerHTML usage

- [ ] **H-08**: Implement audit logging for impersonation before Phase 1 production deployment
  - Location: Phase 1, impersonation actions
  - Fix: Add auditLog() calls for start/stop/actions
  - Verification: Manual testing confirms logs written

### 10.3 Medium Findings (Address Within Phase)

- [ ] **M-01**: Add rate limiting on hash resolution (Phase 2)
- [ ] **M-02**: Remove "Continue Anyway" or add acknowledgment delay (Phase 2)
- [ ] **M-03**: Use generic message in UnresolvedLinkDialog (Phase 2)
- [ ] **M-04**: Implement XSS audit as Phase 1 entry criteria (Phase 0/1)
- [ ] **M-05**: Document backend impersonation permission check (Phase 1)
- [ ] **M-06**: Clear localStorage entity registry on logout (Phase 2)
- [ ] **M-07**: Audit table components for XSS vulnerabilities (Phase 4)
- [ ] **M-08**: Validate entity type matches resolved key (Phase 5)
- [ ] **M-09**: Validate data at fetch time, not render time (Phase 4)
- [ ] **M-10**: Review React Compiler memoization with impersonation (Phase 1)
- [ ] **M-11**: Verify provider hierarchy in App.tsx (Phase 1)
- [ ] **M-12**: Audit all cache keys include impersonation context (Phase 1)
- [ ] **M-13**: Implement quota management for localStorage (Phase 2)
- [ ] **M-14**: Implement storage adapter with in-memory fallback (Phase 1)
- [ ] **M-15**: Implement CSP headers with violation monitoring (Phase 0)
- [ ] **M-16**: Server-side feature flag evaluation (Phase 0)

### 10.4 Low Findings (Advisory)

- **L-01**: Add visual indicator for impersonation tabs (optional UX enhancement)
- **L-02**: Use generic message in drawer history (privacy enhancement)
- **L-03**: Clear Zustand state on logout (best practice)
- **L-04**: Accept browser extension risk (document in security policy)
- **L-05**: Verify postMessage origin checks if implemented (N/A for current plan)
- **L-06**: Add SRI hashes to CDN resources (only if using CDN)

### 10.5 Sign-off

Upon completion of CRITICAL and HIGH findings, this plan is approved for implementation with security team oversight during rollout.

**Approval Process:**
1. **Phase 1:** Security review after implementation, before feature flag activation
2. **Phase 2:** Security review after implementation, before feature flag activation
3. **Phase 3-5:** Security review after Phase 5 complete
4. **Final:** Penetration testing after all phases complete

**Rollback Criteria:**
- Any CRITICAL finding discovered in production → immediate rollback
- 2+ HIGH findings discovered in production → rollback and fix
- MEDIUM findings → fix-forward with monitoring

---

## 11. Metadata

```json
{
  "agent": "frontend-security",
  "output_type": "security-review",
  "timestamp": "2025-12-31T00:00:00Z",
  "feature_directory": "2025-12-31-url-refactoring",
  "skills_invoked": [
    "calibrating-time-estimates",
    "enforcing-evidence-based-analysis",
    "gateway-security",
    "gateway-frontend",
    "persisting-agent-outputs",
    "verifying-before-completion",
    "adhering-to-dry",
    "adhering-to-yagni",
    "debugging-systematically",
    "using-todowrite"
  ],
  "library_skills_read": [
    ".claude/skill-library/security/defense-in-depth/SKILL.md",
    ".claude/skill-library/security/auth-implementation-patterns/SKILL.md",
    ".claude/skill-library/security/authorization-testing/SKILL.md",
    ".claude/skill-library/security/secret-scanner/SKILL.md",
    ".claude/skill-library/development/frontend/enforcing-react-19-conventions/SKILL.md",
    ".claude/skill-library/development/frontend/using-modern-react-patterns/SKILL.md",
    ".claude/skill-library/development/frontend/optimizing-react-performance/SKILL.md",
    ".claude/skill-library/architecture/frontend/enforcing-information-architecture/SKILL.md",
    ".claude/skill-library/development/frontend/securing-react-implementations/SKILL.md",
    ".claude/skill-library/testing/frontend/testing-security-with-e2e-tests/SKILL.md"
  ],
  "source_files_verified": [
    "2025-12-31-url-refactoring/PLAN.md",
    "2025-12-31-url-refactoring/FRONTEND-SECURITY-REVIEW.md",
    "2025-12-31-url-refactoring/phase-0-preparatory-work.md",
    "2025-12-31-url-refactoring/phase-1-impersonation.md",
    "2025-12-31-url-refactoring/phase-2-pii-free-urls.md",
    "2025-12-31-url-refactoring/phase-3-tanstack-router.md",
    "2025-12-31-url-refactoring/phase-4-tanstack-tables.md",
    "2025-12-31-url-refactoring/phase-5-drawer-simplification.md",
    "2025-12-31-url-refactoring/FRONTEND-REVIEWER-FEEDBACK.md",
    "2025-12-31-url-refactoring/SECURITY-LEAD-REVIEW.md",
    "2025-12-31-url-refactoring/TEST-PLAN.md"
  ],
  "status": "complete",
  "handoff": {
    "next_agent": "frontend-developer",
    "context": "Address CRITICAL and HIGH security findings before implementation. Implement MEDIUM findings within their respective phases. LOW findings are advisory."
  }
}
```
