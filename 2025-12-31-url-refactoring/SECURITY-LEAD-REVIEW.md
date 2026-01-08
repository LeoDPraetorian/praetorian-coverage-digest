# Security Architecture Review: URL Refactoring Plan

> **Reviewer:** Security Lead (Architect)
> **Review Date:** 2025-12-31
> **Plan Version:** Post 2025-12-31 Three-Agent Review
> **Status:** CONDITIONAL APPROVAL - See Required Changes

---

## Executive Summary

This security architecture review evaluates the URL refactoring plan across five phases: Impersonation State Migration, PII-Free URLs, TanStack Router Migration, TanStack Tables, and Drawer State Simplification.

**Overall Assessment:** The plan demonstrates strong security awareness with explicit PII removal goals, defense-in-depth patterns, and comprehensive rollback strategies. However, several security concerns require attention before implementation.

### Key Findings

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Authentication/Authorization | 0 | 2 | 3 | 1 |
| Data Protection (PII) | 0 | 1 | 2 | 2 |
| Session Management | 1 | 1 | 2 | 0 |
| Input Validation | 0 | 1 | 3 | 1 |
| Information Disclosure | 0 | 0 | 2 | 3 |
| **Total** | **1** | **5** | **12** | **7** |

### Recommendation

**CONDITIONAL APPROVAL** - Implementation may proceed with the following conditions:
1. Address all CRITICAL findings before Phase 1 deployment
2. Address all HIGH findings before production rollout
3. MEDIUM findings should be addressed within the phase they affect
4. LOW findings are advisory and can be addressed as part of ongoing maintenance

---

## Risk Matrix

### Critical Risk (CVSS 9.0-10.0)

| ID | Phase | Finding | Impact | Likelihood |
|----|-------|---------|--------|------------|
| **C-01** | Phase 1 | Impersonation session not bound to original authentication | Privilege escalation if session hijacked | Medium |

### High Risk (CVSS 7.0-8.9)

| ID | Phase | Finding | Impact | Likelihood |
|----|-------|---------|--------|------------|
| **H-01** | Phase 1 | Missing audit logging for impersonation actions | Compliance violation, forensic gaps | High |
| **H-02** | Phase 1 | Impersonation state persists after admin logout | Unauthorized access window | Medium |
| **H-03** | Phase 2 | Hash collision without cryptographic binding | Entity reference manipulation | Low |
| **H-04** | Phase 3 | Route guards bypass via direct URL manipulation | Unauthorized page access | Medium |
| **H-05** | Phase 5 | Nested drawer state allows deep linking to restricted content | Information disclosure | Medium |

### Medium Risk (CVSS 4.0-6.9)

| ID | Phase | Finding | Impact | Likelihood |
|----|-------|---------|--------|------------|
| **M-01** | Phase 1 | sessionStorage XSS vulnerability acknowledged but not mitigated | Session compromise via XSS | Medium |
| **M-02** | Phase 1 | OAuth impersonation restore lacks integrity verification | State injection | Low |
| **M-03** | Phase 2 | Legacy URL warning allows "Continue Anyway" | PII exposure continues | High |
| **M-04** | Phase 2 | 24-hour localStorage TTL creates persistence window | Stale references, cache poisoning | Low |
| **M-05** | Phase 3 | Search param Zod validation errors not sanitized | Error message information disclosure | Medium |
| **M-06** | Phase 3 | Dual router coexistence increases attack surface | Routing confusion attacks | Low |
| **M-07** | Phase 4 | Table filter parameters not sanitized before display | Reflected XSS via URL | Medium |
| **M-08** | Phase 4 | Virtualization skips row validation for performance | Invalid data rendered | Low |
| **M-09** | Phase 5 | Drawer state allows cross-entity type confusion | Incorrect data displayed | Low |
| **M-10** | General | Feature flags exposed in client bundle | Feature discovery by attackers | Medium |
| **M-11** | General | No rate limiting on hash generation endpoint | Resource exhaustion | Low |
| **M-12** | General | Missing CSP headers for script sources | XSS mitigation gap | High |

### Low Risk (CVSS 0.1-3.9)

| ID | Phase | Finding | Impact | Likelihood |
|----|-------|---------|--------|------------|
| **L-01** | Phase 1 | Tab isolation creates UX confusion for admins | Operational confusion | Medium |
| **L-02** | Phase 2 | Unresolved hash dialog reveals entity type | Minor information leak | Low |
| **L-03** | Phase 3 | Route preloading may fetch unauthorized data | Data exposure in network logs | Low |
| **L-04** | Phase 3 | Error component reveals stack trace in dev | Information disclosure (dev only) | Low |
| **L-05** | Phase 4 | Column sorting state in URL reveals data structure | Schema inference | Low |
| **L-06** | Phase 5 | Drawer history reveals browsing patterns | Privacy concern | Low |
| **L-07** | General | Rollback procedures require manual intervention | Extended vulnerability window | Low |

---

## Detailed Findings by Phase

### Phase 1: Impersonation State Migration

#### Security Architecture Assessment

**Threat Model (STRIDE Analysis):**

| Threat | Category | Current Mitigation | Gap |
|--------|----------|-------------------|-----|
| Admin impersonates without authorization | Spoofing | Backend JWT validation | **None - Backend is source of truth** |
| Impersonation state tampered | Tampering | sessionStorage (browser-protected) | XSS can modify |
| No record of impersonation actions | Repudiation | **Missing** | **HIGH PRIORITY** |
| Impersonation target email exposed | Info Disclosure | Moved to sessionStorage | Adequate |
| Impersonation prevents normal access | DoS | Tab isolation | Adequate |
| Non-admin gains impersonation ability | Elevation | Backend `isPraetorianUser` check | Adequate |

#### C-01: Impersonation Session Not Bound to Original Authentication (CRITICAL)

**Location:** `src/state/impersonation.tsx` (Task 1.1)

**Issue:** The impersonation state in sessionStorage is independent of the admin's authentication token. If:
1. Admin starts impersonation
2. Admin's JWT expires or is revoked
3. Admin has another valid session elsewhere
4. The impersonation state persists and could be used with a different/compromised session

**Attack Scenario:**
```
1. Attacker compromises admin browser (XSS)
2. Reads sessionStorage: chariot_impersonation_target = "victim@example.com"
3. Attacker's own (lower-privilege) session now has impersonation context
4. Backend validates JWT but impersonation context grants elevated view
```

**Required Fix:**
```typescript
// In ImpersonationProvider - bind to current session
const entry: ImpersonationEntry = {
  targetUser: email,
  adminJwtHash: await hashJwtSignature(currentJwt), // Bind to session
  startedAt: Date.now(),
  expiresAt: Date.now() + IMPERSONATION_TTL,
}

// On retrieve - validate session binding
if (entry.adminJwtHash !== await hashJwtSignature(currentJwt)) {
  clearImpersonation(); // Session mismatch - clear state
  return null;
}
```

#### H-01: Missing Audit Logging for Impersonation Actions (HIGH)

**Location:** Task 1.5 - `startImpersonation` and `stopImpersonation` functions

**Issue:** The plan does not include audit logging for impersonation events. This is a compliance requirement for SOC 2 Type II and creates forensic gaps.

**Required Actions:**
1. Impersonation start (who, target, timestamp)
2. Impersonation stop (duration, actions performed)
3. Actions taken while impersonating (marked as impersonated)
4. Impersonation failures (blocked attempts)

**Required Fix:**
```typescript
const startImpersonation = useCallback(async (memberId: string, route: string) => {
  // REQUIRED: Audit log before state change
  await auditLog({
    action: 'IMPERSONATION_START',
    actor: auth.me,
    target: memberId,
    timestamp: new Date().toISOString(),
    metadata: { route, userAgent: navigator.userAgent }
  });

  // ... existing implementation
}, []);
```

#### H-02: Impersonation State Persists After Admin Logout (HIGH)

**Location:** Task 1.5, logout flow

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
  // ... existing logout logic
}, [clearImpersonation]);
```

#### M-01: sessionStorage XSS Vulnerability (MEDIUM)

**Location:** Task 1.1 - Security Model Clarification section

**Issue:** The plan correctly identifies that sessionStorage does NOT protect against XSS but proposes "Mitigation: XSS protection requires separate defenses (CSP headers, input sanitization)" without concrete implementation.

**Recommendation:** Add a blocking prerequisite:
```markdown
## Entry Criteria (Updated)
- ✅ CSP headers implemented and verified
- ✅ Input sanitization audit complete
- ✅ XSS vulnerability scan clean
```

#### M-02: OAuth Impersonation Restore Lacks Integrity Verification (MEDIUM)

**Location:** Task 1.1 - OAuth Flow Handling

**Issue:** The `oauth_impersonation_restore` key is read and trusted without verification:
```typescript
const restoredTarget = sessionStorage.getItem('oauth_impersonation_restore')
// No validation that this value was set by legitimate code
```

**Attack Scenario:**
1. User (non-admin) sets `oauth_impersonation_restore` in their browser console
2. Navigates to OAuth flow
3. On return, impersonation context is set for unauthorized user

**Mitigation:** Backend should validate impersonation permission on OAuth callback:
```typescript
// On OAuth callback
if (restoredTarget) {
  const canImpersonate = await validateImpersonationPermission(auth.me, restoredTarget);
  if (!canImpersonate) {
    sessionStorage.removeItem('oauth_impersonation_restore');
    // Log security event
  }
}
```

---

### Phase 2: PII-Free Drawer URLs

#### Security Architecture Assessment

**Threat Model (STRIDE Analysis):**

| Threat | Category | Current Mitigation | Gap |
|--------|----------|-------------------|-----|
| Attacker guesses hash to access entity | Spoofing | 12-char hash (48 bits) | Adequate for URL |
| Hash storage tampered | Tampering | Hash re-verification | Adequate |
| Deny entity was viewed | Repudiation | Server access logs | Hash doesn't log entity |
| Entity key visible in URL | Info Disclosure | Hash-based reference | **Solved** |
| Storage quota exhaustion | DoS | 24h TTL cleanup | Adequate |
| Hash collision to access wrong entity | Elevation | Hash integrity check | Minor gap |

#### H-03: Hash Collision Without Cryptographic Binding (HIGH)

**Location:** Task 2.2 - Entity Key Registry

**Issue:** The revised 12-character hash provides 48 bits of entropy (0.03% collision at 100k entities). While acceptable for uniqueness, the system allows pre-computed hash injection:

**Attack Scenario:**
```
1. Attacker computes: hash("#asset#victim@email.com") = "a1b2c3d4e5f6"
2. Attacker stores in their localStorage:
   drawer_a1b2c3d4e5f6 = { key: "#asset#victim@email.com", hash: "a1b2c3d4e5f6", ... }
3. Attacker shares URL: /assets?detail=asset:a1b2c3d4e5f6
4. Victim opens URL - hash resolves to attacker's planted entity
5. Backend validates - but victim now sees data for #asset#victim@email.com
```

**Current Mitigation:** The plan includes hash re-verification:
```typescript
const recomputedHash = await hashEntityKey(entry.key)
if (recomputedHash !== hash) {
  console.error('Hash collision detected - possible attack')
  return null
}
```

**Gap:** This validates integrity but doesn't prevent the attack above because the attacker used the correct key-hash pair.

**Recommended Additional Control:**
```typescript
// Add user-binding to hash storage
const entry: RegistryEntry = {
  key: entityKey,
  hash: hash,
  storedAt: Date.now(),
  storedBy: getCurrentUserHash(), // Bind to user
}

// On retrieve - validate user binding
if (entry.storedBy !== getCurrentUserHash()) {
  // Cross-user access attempt - requires fresh backend validation
  const canAccess = await validateEntityAccess(entityKey);
  if (!canAccess) return null;
}
```

#### M-03: Legacy URL Warning Allows "Continue Anyway" (MEDIUM)

**Location:** Task 2.4 - LegacyUrlWarning component

**Issue:** The "Continue Anyway" button defeats the purpose of the warning. Users (including security-unaware users) will click it because it's the path of least resistance.

**Recommendation:**
1. Remove "Continue Anyway" for external/shared URLs
2. Only show "Update Link" option
3. If user must continue, require explicit acknowledgment with timeout:
```typescript
<Button
  variant="outline"
  onClick={onContinue}
  disabled={countdown > 0}
>
  {countdown > 0
    ? `Continue in ${countdown}s`
    : 'I understand the privacy risks - Continue'}
</Button>
```

#### M-04: 24-Hour localStorage TTL Creates Persistence Window (MEDIUM)

**Location:** Task 2.2 - EntityKeyRegistry

**Issue:** Hash-to-key mappings persist for 24 hours in localStorage. This means:
1. User views sensitive entity
2. User logs out
3. Another user on same browser can resolve the hash for 24 hours

**Recommendation:**
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
logout = () => {
  clearEntityRegistry();
  // ... rest of logout
};
```

---

### Phase 3: TanStack Router Migration

#### Security Architecture Assessment

**Threat Model (STRIDE Analysis):**

| Threat | Category | Current Mitigation | Gap |
|--------|----------|-------------------|-----|
| Unauthenticated access to routes | Spoofing | `beforeLoad` redirect | Adequate |
| Search params manipulated | Tampering | Zod validation | Adequate |
| Route access not logged | Repudiation | Server access logs | Adequate |
| Error messages leak info | Info Disclosure | Custom error component | Minor gap |
| Route flood attack | DoS | Standard rate limiting | Adequate |
| Access unauthorized routes | Elevation | Context auth check | Minor gap |

#### H-04: Route Guards Bypass via Direct URL Manipulation (HIGH)

**Location:** Task 1.3 - Authentication Layout Route

**Issue:** The `beforeLoad` guard relies solely on client-side context:
```typescript
beforeLoad: async ({ context }) => {
  if (!context.auth.isSignedIn) {
    throw redirect({ to: '/login', ... })
  }
}
```

**Attack Scenario:**
1. Attacker modifies React DevTools to set `context.auth.isSignedIn = true`
2. Route guard passes
3. Page renders with unauthorized data requests

**Mitigation:** The backend MUST validate every data request regardless of frontend route guards. This appears to be the case (JWT validation), but should be explicitly documented.

**Recommendation:** Add defense-in-depth documentation:
```typescript
// _authenticated.tsx
/**
 * SECURITY NOTE: This route guard is defense-in-depth only.
 * Backend JWT validation is the authoritative access control.
 * Do NOT rely solely on this guard for security-critical routes.
 */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context }) => {
    // Client-side UX optimization only
    if (!context.auth.isSignedIn) {
      throw redirect({ to: '/login', ... })
    }
  },
})
```

#### M-05: Search Param Zod Validation Errors Not Sanitized (MEDIUM)

**Location:** Task 1.5 - Route definitions

**Issue:** Zod validation errors may include user input in error messages:
```
Invalid search param: Expected number, received "'; DROP TABLE users; --"
```

**Recommendation:**
```typescript
const searchSchema = z.object({
  page: z.number().int().positive().catch(1), // Use .catch() to avoid error exposure
  status: z.enum(['active', 'inactive', 'all']).catch('all'),
})
```

#### M-06: Dual Router Coexistence Increases Attack Surface (MEDIUM)

**Location:** PR Breakdown - Dual Router Strategy

**Issue:** Running both React Router and TanStack Router simultaneously during migration:
1. Doubles route handling code
2. May create routing inconsistencies
3. Increases attack surface for routing-related vulnerabilities

**Recommendation:**
1. Minimize dual-router window
2. Add integration tests for routing consistency
3. Monitor for route shadowing issues

---

### Phase 4: TanStack Tables + Virtualization

#### Security Architecture Assessment

**Threat Model (STRIDE Analysis):**

| Threat | Category | Current Mitigation | Gap |
|--------|----------|-------------------|-----|
| Table data spoofed | Spoofing | Data from TanStack Query | Adequate |
| Sort/filter params tampered | Tampering | Zod validation (Phase 3) | Depends on Phase 3 |
| Data export not logged | Repudiation | None planned | Future concern |
| Table exposes sensitive columns | Info Disclosure | Column definitions | Adequate |
| Large dataset DoS | DoS | Virtualization | Adequate |
| Filter bypass to see more data | Elevation | Backend pagination | Adequate |

#### M-07: Table Filter Parameters Not Sanitized Before Display (MEDIUM)

**Location:** Task 4.4 - URL State Sync

**Issue:** Filter values from URL are displayed in the UI:
```typescript
// URL: ?filter=<script>alert(1)</script>
const { filter } = useSearch()
return <FilterBadge>{filter}</FilterBadge> // XSS if not escaped
```

**Mitigation:** React auto-escapes by default, but verify:
1. No `dangerouslySetInnerHTML` usage with URL params
2. Custom render functions escape values
3. Column renderers don't trust raw data

#### M-08: Virtualization Skips Row Validation for Performance (MEDIUM)

**Location:** Task 4.2 - TanStackTable with virtualization

**Issue:** Virtualized rows only validate/render when scrolled into view. If data validation happens at render time, invalid/malicious data may exist undetected until viewed.

**Recommendation:** Validate data at fetch time, not render time:
```typescript
const { data } = useQuery({
  queryKey: ['assets'],
  queryFn: fetchAssets,
  select: (data) => data.map(validateAndSanitize), // Validate upfront
})
```

---

### Phase 5: Drawer State Simplification

#### Security Architecture Assessment

**Threat Model (STRIDE Analysis):**

| Threat | Category | Current Mitigation | Gap |
|--------|----------|-------------------|-----|
| Drawer opens wrong entity | Spoofing | Hash-to-key registry | Adequate |
| Drawer state manipulated | Tampering | URL validation | Minor gap |
| Drawer access not logged | Repudiation | Server-side data fetch logs | Adequate |
| Drawer URL exposes entity type | Info Disclosure | Acceptable trade-off | Minor |
| Infinite nested drawers | DoS | Max 2 limit enforced | Adequate |
| Access restricted entity via drawer | Elevation | Backend authorization | Adequate |

#### H-05: Nested Drawer State Allows Deep Linking to Restricted Content (HIGH)

**Location:** Task 5.1 - useDrawerState hook

**Issue:** The drawer state allows constructing URLs that directly link to entity details:
```
/assets?detail=asset:abc123&tab=vulnerabilities
```

If user A shares this URL with user B, and user B doesn't have access to asset `abc123`, the frontend will:
1. Try to fetch the data
2. Backend will deny (good)
3. But URL reveals that asset `abc123` exists (minor info disclosure)

**More concerning:** The nested drawer allows:
```
/assets?detail=asset:abc123&stack=risk:xyz789
```

User might have access to asset `abc123` but not risk `xyz789`. The nested drawer will attempt to load restricted data.

**Recommendation:**
```typescript
// In useDrawerState - validate access before setting state
const openNestedDrawer = useCallback(async (type, key, tab) => {
  // Pre-validate access (lightweight check)
  const hasAccess = await checkEntityAccess(type, key);
  if (!hasAccess) {
    toast.error('You do not have access to this item');
    return;
  }
  // ... proceed with opening drawer
}, []);
```

#### M-09: Drawer State Allows Cross-Entity Type Confusion (MEDIUM)

**Location:** Task 5.1 - DrawerState parsing

**Issue:** The `detail` parameter format `{type}:{hash}` could be manipulated:
```
/assets?detail=risk:abc123  // Asset page, but risk drawer type
```

**Current Behavior:** DrawerController dispatches based on `entityType`:
```typescript
switch (entityType) {
  case 'asset': return <AssetDrawer />
  case 'risk': return <RiskDrawer />
  ...
}
```

If `entityType=risk` but user is on `/assets` page, the RiskDrawer will render with a hash that might resolve to an asset key.

**Recommendation:** Validate entity type matches resolved key format:
```typescript
const retrieve = async (hash, expectedType) => {
  const entry = await registry.get(hash);
  if (!entry) return null;

  // Validate key format matches expected type
  const keyType = entry.key.split('#')[1]; // "#asset#..." -> "asset"
  if (keyType !== expectedType) {
    console.warn('Entity type mismatch');
    return null;
  }
  return entry.key;
};
```

---

## Cross-Cutting Security Concerns

### M-10: Feature Flags Exposed in Client Bundle (MEDIUM)

**Location:** All phases - Feature flag usage

**Issue:** All feature flags (`USE_CONTEXT_IMPERSONATION`, `ENABLE_PII_FREE_URLS`, `ENABLE_TANSTACK_ROUTER`, etc.) are bundled into the client JavaScript. Attackers can:
1. Discover upcoming features
2. Enable flags via browser manipulation
3. Access beta features not intended for their account

**Recommendation:**
1. Feature flags should be server-evaluated
2. Only pass flag values, not names, to client
3. Critical flags (like `USE_CONTEXT_IMPERSONATION`) should have backend enforcement

### M-12: Missing CSP Headers for Script Sources (MEDIUM)

**Location:** General - Not addressed in plan

**Issue:** The plan mentions CSP as XSS mitigation but doesn't include CSP implementation tasks.

**Required Addition to Phase 0:**
```markdown
### Task 0.X: Implement Content Security Policy

1. Add CSP headers to backend responses
2. Configure script-src, style-src, connect-src
3. Test with report-only mode first
4. Monitor CSP violations
```

### Input Validation Recommendations

All URL parameters should follow this validation pattern:

```typescript
// Recommended validation chain
const entityHashSchema = z.string()
  .length(12)                          // Exact length
  .regex(/^[a-f0-9]+$/)               // Hex only
  .transform(s => s.toLowerCase());    // Normalize

const tabSchema = z.enum([
  'overview', 'vulnerabilities', 'history', 'details', 'timeline'
]).catch('overview');                  // Safe default

const searchSchema = z.object({
  detail: z.string()
    .regex(/^(asset|risk|seed|job|file|attribute):[a-f0-9]{12}$/)
    .optional(),
  tab: tabSchema.optional(),
  stack: z.array(z.string()).max(2).optional(),
});
```

---

## Recommended Security Controls

### Before Phase 1 Deployment (REQUIRED)

| Control | Finding | Implementation |
|---------|---------|----------------|
| Session binding | C-01 | Bind impersonation to JWT signature |
| Audit logging | H-01 | Log all impersonation events |
| Logout cleanup | H-02 | Clear impersonation on logout |
| CSP headers | M-12 | Implement Content-Security-Policy |

### Before Production Rollout (REQUIRED)

| Control | Finding | Implementation |
|---------|---------|----------------|
| Access pre-check | H-03 | Validate entity access on hash resolution |
| Route defense-in-depth | H-04 | Document backend as authoritative |
| Nested drawer access | H-05 | Pre-validate nested entity access |

### Recommended Improvements (ADVISORY)

| Control | Finding | Implementation |
|---------|---------|----------------|
| XSS prerequisites | M-01 | Add XSS audit as Phase 1 entry criteria |
| OAuth integrity | M-02 | Backend validate impersonation on callback |
| Remove "Continue Anyway" | M-03 | Or add acknowledgment delay |
| Logout registry clear | M-04 | Clear localStorage entity registry on logout |
| Safe defaults | M-05 | Use Zod `.catch()` for all URL params |
| Render-time validation | M-07, M-08 | Validate at fetch, not render |
| Entity type validation | M-09 | Validate resolved key matches expected type |
| Server-side flags | M-10 | Backend-evaluated feature flags |

---

## Security Testing Requirements

### Unit Tests (Required)

1. Impersonation session binding validation
2. Hash integrity verification
3. Entity type validation
4. Zod schema rejection cases
5. Logout cleanup verification

### Integration Tests (Required)

1. Cross-user hash resolution blocked
2. OAuth impersonation restore validation
3. Route guard + backend authorization alignment
4. Feature flag enforcement

### Penetration Testing (Recommended)

1. XSS via URL parameters
2. Impersonation privilege escalation
3. Hash manipulation attacks
4. Route guard bypass attempts
5. CSRF on impersonation actions

---

## Compliance Considerations

### SOC 2 Type II

| Requirement | Status | Gap |
|-------------|--------|-----|
| Access logging | PARTIAL | Need impersonation audit logs (H-01) |
| Session management | GAP | Need session binding (C-01) |
| Data protection | ADEQUATE | PII removal addresses this |

### GDPR

| Requirement | Status | Gap |
|-------------|--------|-----|
| PII minimization | IMPROVED | Hash-based URLs reduce exposure |
| Right to erasure | ADEQUATE | 24h TTL helps |
| Lawful basis for processing | N/A | Application-level concern |

---

## Approval Conditions

### CRITICAL (Block Deployment)

- [ ] **C-01**: Implement impersonation session binding before Phase 1 production deployment

### HIGH (Block Production Rollout)

- [ ] **H-01**: Implement audit logging for impersonation events
- [ ] **H-02**: Clear impersonation state on logout
- [ ] **H-03**: Document and test hash collision attack mitigation
- [ ] **H-04**: Document backend as authoritative for authorization
- [ ] **H-05**: Implement access pre-check for nested drawers

### Sign-off

Upon completion of CRITICAL and HIGH findings, this plan is approved for implementation with security team oversight during rollout.

---

## Metadata

```json
{
  "agent": "security-lead",
  "output_type": "security-architecture-review",
  "timestamp": "2025-12-31T00:00:00Z",
  "feature_directory": "2025-12-31-url-refactoring",
  "skills_invoked": [
    "gateway-security",
    "enforcing-evidence-based-analysis",
    "brainstorming",
    "writing-plans",
    "verifying-before-completion"
  ],
  "library_skills_read": [
    ".claude/skill-library/security/defense-in-depth/SKILL.md",
    ".claude/skill-library/security/auth-implementation-patterns/SKILL.md",
    ".claude/skill-library/security/threat-modeling/SKILL.md"
  ],
  "source_files_verified": [
    "2025-12-31-url-refactoring/PLAN.md",
    "2025-12-31-url-refactoring/phase-0-preparatory-work.md",
    "2025-12-31-url-refactoring/phase-1-impersonation.md",
    "2025-12-31-url-refactoring/phase-2-pii-free-urls.md",
    "2025-12-31-url-refactoring/phase-3-tanstack-router.md",
    "2025-12-31-url-refactoring/phase-4-tanstack-tables.md",
    "2025-12-31-url-refactoring/phase-5-drawer-simplification.md",
    "2025-12-31-url-refactoring/TEST-PLAN.md",
    "2025-12-31-url-refactoring/FRONTEND-REVIEWER-FEEDBACK.md",
    "2025-12-31-url-refactoring/appendices/architecture-decisions.md"
  ],
  "status": "complete",
  "handoff": {
    "next_agent": "frontend-developer or backend-developer",
    "context": "Implement required security controls before proceeding with phases"
  }
}
```
