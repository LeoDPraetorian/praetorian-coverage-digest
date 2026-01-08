# Architecture Decision Records (ADRs)

This document captures key architecture decisions made during the URL refactoring project.

---

## ADR-001: sessionStorage for Impersonation State

**Status:** Accepted
**Date:** 2025-12-31
**Phase:** 1

### Context

Impersonation state (which customer the Praetorian user is viewing as) was previously stored in the URL path as base64-encoded email. This exposed PII in:
- Browser history
- Server logs
- Referer headers
- Shared/copied URLs

### Decision

Store impersonation state in `sessionStorage` with a React context wrapper.

### Consequences

**Positive:**
- PII removed from URLs
- Tab isolation (each tab can impersonate different users)
- No backend changes required

**Negative:**
- Does NOT protect against XSS (if attacker runs JS, they can read sessionStorage)
- New tabs don't inherit impersonation (by design for security)

**Mitigations:**
- XSS protection via CSP headers and input sanitization (separate concern)
- OAuth restoration mechanism for auth flows

---

## ADR-002: Hash-Based Entity References (12 Characters)

**Status:** Accepted (Revised)
**Date:** 2025-12-31
**Phase:** 2

### Context

Drawer URLs contained entity keys with PII (e.g., `?detail=asset:#asset#user@email.com`).

### Decision

Use SHA-256 hash (first 12 characters) with tiered storage:
1. sessionStorage (same tab, instant)
2. localStorage (same browser, 24h TTL)
3. Graceful degradation (cross-browser shows dialog)

### Revision (Post-Review)

Original plan used 8-character hashes. Review identified collision risk:
- 8 chars = 32 bits = **63% collision probability at 100k entities** (unacceptable)
- 12 chars = 48 bits = **0.03% collision probability at 100k entities** (acceptable)

### Consequences

**Positive:**
- Zero PII in URLs
- Same-tab and same-browser deep linking works
- Graceful degradation for cross-browser

**Negative:**
- Cross-browser/device sharing requires explicit "copy shareable link" action
- 24-hour TTL means bookmarks may expire

---

## ADR-003: TanStack Router Over React Router

**Status:** Accepted
**Date:** 2025-12-31
**Phase:** 3

### Context

React Router v7 has limitations:
- Manual search param parsing
- Partial type safety (string-based routes)
- Separate data loading patterns

### Decision

Migrate to TanStack Router for:
- Full type-safe routing (compile-time checks)
- Built-in Zod search validation
- Integration with TanStack Query for data loading
- File-based routing (optional)

### Consequences

**Positive:**
- Type-safe navigation (compiler catches bad routes)
- Search params validated automatically
- Better DX with TypeScript

**Negative:**
- Large migration (118 files)
- Dual-router period during migration
- Team learning curve

**Mitigations:**
- Per-route feature flags for granular rollback
- 15-18 PRs instead of big-bang

---

## ADR-004: Per-Route Feature Flags

**Status:** Accepted
**Date:** 2025-12-31
**Phase:** 3

### Context

Original plan had single `ENABLE_TANSTACK_ROUTER` flag. Review identified:
- All-or-nothing rollback has high blast radius
- Hard to isolate issues to specific routes

### Decision

Implement per-route feature flags:
```typescript
TANSTACK_ROUTER_ASSETS: boolean
TANSTACK_ROUTER_VULNERABILITIES: boolean
// etc.
```

### Consequences

**Positive:**
- Granular rollback per feature area
- Can identify which route has issues
- Gradual rollout to production

**Negative:**
- More flags to manage
- Dual-router complexity during migration
- Need to track flag cleanup

---

## ADR-005: 15-18 PRs for Phase 3

**Status:** Accepted
**Date:** 2025-12-31
**Phase:** 3

### Context

Original plan had 7 tasks covering 118 files. Review identified:
- Single 118-file PR = 40+ hours review time
- High merge conflict risk
- Unreviewable changes

### Decision

Break Phase 3 into 15-18 PRs:
- Infrastructure (3 PRs)
- Route migration by feature area (8 PRs)
- Navigation calls (5 PRs)
- Integration (2 PRs)

Target per PR:
- 5-10 files
- <500 LOC changes
- 2-4 hours review time

### Consequences

**Positive:**
- Reviewable PRs
- Lower merge conflict risk
- Progress visibility
- Easier rollback per PR

**Negative:**
- More PRs to coordinate
- Longer total timeline (10-12 weeks vs 7-10 weeks)

---

## ADR-006: Unified Drawer State

**Status:** Accepted
**Date:** 2025-12-31
**Phase:** 5

### Context

`global.state.tsx` (1063 lines) managed 20+ URL parameters for drawer state:
- `assetDrawerKey`, `assetDrawerTab`
- `vulnerabilityDrawerKey`, `vulnerabilityDrawerTab`
- etc.

### Decision

Consolidate to 3 URL params:
- `detail`: Single drawer (`type:hash`)
- `tab`: Selected tab
- `stack`: Nested drawers (max 2)

### Consequences

**Positive:**
- 1063 lines reduced to ~300 lines
- Type-safe with Zod validation
- Simpler mental model

**Negative:**
- Breaking change for bookmarks (one-time migration)
- Max 2 nested drawers (design constraint)

---

## ADR-007: Event-Based OAuth Restoration

**Status:** Accepted (Revised)
**Date:** 2025-12-31
**Phase:** 1

### Context

OAuth redirects lose impersonation state (sessionStorage is tab-scoped).

### Original Decision

Use polling to wait for OAuth completion:
```typescript
const checkInterval = setInterval(() => {
  if (!sessionStorage.getItem('oauth_impersonation_restore')) {
    resolve(null)
  }
}, 100)
```

### Revision (Post-Review)

Polling has race conditions. Replace with `storage` event listener:
```typescript
window.addEventListener('storage', handleStorageChange)
```

### Consequences

**Positive:**
- No polling overhead
- No race conditions
- Reliable restoration

**Negative:**
- `storage` event only fires cross-tab (need fallback for same-tab)

---

## ADR-008: Testing Overhead (40% of Implementation)

**Status:** Accepted
**Date:** 2025-12-31
**Phase:** All

### Context

Review identified significant testing requirements:
- 41 E2E test files need URL pattern updates
- New test utilities needed
- Characterization tests before refactoring

### Decision

Plan for 40% testing overhead (~7 additional weeks).

### Consequences

**Positive:**
- Comprehensive test coverage
- Regression detection
- Confidence in rollback

**Negative:**
- Longer timeline (27-33 weeks vs 15-23 weeks)
- More resources needed

---

## Decision Log

| ID | Decision | Phase | Status |
|----|----------|-------|--------|
| ADR-001 | sessionStorage for impersonation | 1 | Accepted |
| ADR-002 | 12-char hashes for entity refs | 2 | Accepted (Revised) |
| ADR-003 | TanStack Router | 3 | Accepted |
| ADR-004 | Per-route feature flags | 3 | Accepted |
| ADR-005 | 15-18 PRs for Phase 3 | 3 | Accepted |
| ADR-006 | Unified drawer state | 5 | Accepted |
| ADR-007 | Event-based OAuth restoration | 1 | Accepted (Revised) |
| ADR-008 | 40% testing overhead | All | Accepted |
