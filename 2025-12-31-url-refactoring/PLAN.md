# TanStack Ecosystem Migration & URL Security Refactor

> **For Claude:** Use `skill: "executing-plans"` to implement this plan phase-by-phase.

**Created:** 2025-12-31
**Last Updated:** 2026-01-07
**Status:** In Progress
**Current Phase:** 3-4 Batches 1-3 Complete, Remaining Tasks In Progress

---

## Goal

Migrate Chariot frontend to TanStack ecosystem (Router, Table, Virtual) while eliminating URL security vulnerabilities (PII exposure from impersonation). Drawer state remains in URL search params to preserve shareable links.

---

## Architecture Overview

**Architecture Decision:** TanStack Router + Query + Table + Virtual integrated stack with type-safe routing, Zod search validation, and unified state management.

**Scope:** **FRONTEND-ONLY** - No backend changes required. All changes are limited to the React frontend application.

**Tech Stack:**
- TanStack Router v1.x (replacing React Router v7)
- TanStack Table v8.x (standardizing table implementations)
- TanStack Virtual v3.x (already partially adopted)
- TanStack Query v5.x (already in use)
- Zod v4.x (already in use)

**Key Principles:**
- DRY, YAGNI, TDD
- Frequent commits
- Test-first development
- Feature flags for rollback
- **Bite-sized PRs** (avoid big-bang releases)

---

## Critical Issues (Must Fix Before Implementation)

> These issues were identified in the 2025-12-31 three-agent review.

| Issue | Severity | Phase | Description | Resolution |
|-------|----------|-------|-------------|------------|
| **OAuth Race Condition** | CRITICAL | 1 | Polling approach has race conditions | Replace with `storage` event listener |
| **React 19 Context Syntax** | HIGH | 1 | Missing `.Provider` in JSX | Use `<ImpersonationContext.Provider>` |
| **Hash Length Too Short** | HIGH | 2 | 8 chars = 63% collision at 100k entities | Increase to 12 characters |
| **Phase 3 Not Atomic** | CRITICAL | 3 | 118 files in 1 PR is unreviewable | Break into 15-18 PRs (~8 files each) |

See phase files for specific code fixes.

---

## Security Fixes (Frontend-Only)

> These fixes were identified in the 2025-12-31 security review (Security Lead + Frontend Security).
> **Scope:** Frontend-only implementations. Backend security enhancements are deferred.

### Critical/High Priority

| ID | Finding | Phase | Action | CVSS |
|----|---------|-------|--------|------|
| **CRIT-2** | Open Redirect via Router | 3 | Add `validateRedirectUrl()` with same-origin + whitelist | 8.1 |
| **HIGH-1** | XSS via Zod search params | 3 | Add DOMPurify `.transform()` to string schemas | 7.3 |
| **HIGH-3** | Impersonation no timeout | 1 | Add `expiresAt` timestamp + 30-sec periodic check (1hr TTL) | 7.1 |
| **HIGH-4** | Zod type coercion DoS | 3 | Replace `.coerce` with explicit validation (reject `Infinity`, `NaN`) | 6.5 |
| **H-02** | Impersonation persists after logout | 1 | Clear sessionStorage keys in logout handler | HIGH |
| **H-05** | Nested drawer access | 5 | Pre-validate entity access before opening nested drawer | HIGH |

### Medium Priority

| ID | Finding | Phase | Action |
|----|---------|-------|--------|
| **M-03** | "Continue Anyway" defeats warning | 2 | Remove button or add 5-sec countdown |
| **M-04** | localStorage 24hr TTL | 2 | Clear `drawer_*` keys on logout |
| **M-05** | Zod errors expose input | 3 | Use `.catch(defaultValue)` on all URL param schemas |
| **M-09** | Drawer type confusion | 5 | Validate `entityType` matches resolved key format |
| **MED-2** | Cache poisoning | 1 | Invalidate TanStack Query cache on impersonation change |
| **MED-3** | Hash TTL too long | 2 | Reduce localStorage TTL from 24h → 1h |
| **MED-5** | Nested drawer DoS | 5 | **Reject** (not just warn) when `stack.length > 2` |
| **MED-4** | Column path injection | 4 | Whitelist column accessor paths |

### Low Priority (Hardening)

| ID | Finding | Action |
|----|---------|--------|
| **H-04** | Route guard bypass | Add code comment documenting backend is authoritative |
| **M-07** | Filter params in UI | Audit for no `dangerouslySetInnerHTML` with URL params |

### Security Test Requirements (15 Findings Need Dedicated Tests)

> **CRITICAL:** Each security finding MUST have a dedicated test verifying the fix. Security tests block phase completion.

| Finding | Severity | Test Type | Test Requirement |
|---------|----------|-----------|------------------|
| **CRIT-2: Open Redirect** | 8.1 | Unit | `validateRedirectUrl()` with malicious vectors |
| **HIGH-1: XSS via Zod** | 7.3 | Unit | `sanitizeSearchParam()` with XSS payloads |
| **HIGH-3: Impersonation Timeout** | 7.1 | E2E | 1hr expiration enforcement |
| **HIGH-4: Zod Type Coercion DoS** | 6.5 | Unit | Rejects `Infinity`, `NaN`, `1e308` |
| **H-02: Impersonation Persists** | HIGH | E2E | Logout clears sessionStorage |
| **H-05: Nested Drawer Access** | HIGH | E2E | Unauthorized nested drawer rejection |
| **M-03: Continue Anyway** | MEDIUM | E2E | 5-second countdown before continue |
| **M-04: localStorage TTL** | MEDIUM | Unit | Logout clears `drawer_*` keys |
| **M-05: Zod Error Exposure** | MEDIUM | Unit | `.catch()` hides validation errors |
| **M-09: Drawer Type Confusion** | MEDIUM | Unit | entityType matches key format |
| **MED-2: Cache Poisoning** | MEDIUM | Integration | Cache invalidated on impersonation change |
| **MED-3: Hash TTL Too Long** | MEDIUM | Unit | 1hr TTL (not 24hr) |
| **MED-4: Column Path Injection** | MEDIUM | Unit | Column accessor whitelist |
| **MED-5: Nested Drawer DoS** | MEDIUM | Unit | **Reject** (not warn) when `stack.length > 2` |
| **Hash Length** | HIGH | Unit | 12 characters (not 8) |

**Security Test Checklist by Phase:**

**Phase 1:**
- [ ] Impersonation timeout enforcement (1hr TTL)
- [ ] Logout clears sessionStorage keys (H-02)
- [ ] Cache invalidation on impersonation change (MED-2)

**Phase 2:**
- [ ] Hash length is 12 characters (not 8)
- [ ] Logout clears entity registry (M-04)
- [ ] Legacy URL "Continue Anyway" has 5-sec delay (M-03)
- [ ] TTL is 1 hour (not 24 hours) (MED-3)

**Phase 3:**
- [ ] `validateRedirectUrl()` rejects all malicious vectors (CRIT-2)
- [ ] `sanitizeSearchParam()` removes all XSS payloads (HIGH-1)
- [ ] Zod schemas reject `Infinity`, `NaN`, type coercion DoS (HIGH-4)
- [ ] All Zod schemas use `.catch()` defaults (M-05)
- [ ] Route guard has security documentation comment (H-04)

**Phase 4:**
- [ ] Column accessor paths are whitelisted (MED-4)

**Phase 5:**
- [ ] Nested drawer access pre-validation (H-05)
- [ ] Nested drawer limit enforced, **rejects** at max 2 (MED-5, M-09)

### Security Review Documents

- `SECURITY-LEAD-REVIEW.md` - Architecture security review
- `FRONTEND-SECURITY-REVIEW.md` - Frontend implementation security review
- `FRONTEND-SECURITY-REVIEW-2.md` - Second frontend security review (post three-agent review)

---

## Test Coverage Requirements (Post-Frontend-Reviewer Feedback)

> **CRITICAL:** Each phase has explicit coverage targets. Tests block phase completion.

### Phase 0: Preparatory Work
| Test Type | Target Coverage | Key Files |
|-----------|----------------|-----------|
| Unit | ≥90% | `url.ts`, `featureFlags.ts`, `searchParamSerialization.ts` |
| Integration | ≥80% | Feature flag hooks |

### Phase 1: Impersonation State Migration
| Test Type | Target Coverage | Key Files |
|-----------|----------------|-----------|
| Unit | ≥80% | `ImpersonationContext.tsx` |
| Integration | ≥90% | Cache isolation, auth context integration |
| E2E | 100% | Impersonation flows, OAuth restoration |
| Security | 100% | Timeout enforcement, logout cleanup |

### Phase 2: PII-Free Drawer URLs
| Test Type | Target Coverage | Key Files |
|-----------|----------------|-----------|
| Unit | ≥80% | `entityKeyHasher.ts`, `entityKeyRegistry.ts`, `useDrawerUrlState.ts`, `storageCleanup.ts` |
| Integration | ≥85% | Hash storage/retrieval, TTL expiration |
| E2E | ≥95% | Drawer URL contains no PII, copy/paste URL, legacy warning |
| Security | 100% | Hash length (12 chars), TTL (1hr), logout cleanup |

### Phase 3: TanStack Router Migration
| Test Type | Target Coverage | Key Files |
|-----------|----------------|-----------|
| Unit | ≥80% | `validateRedirectUrl()`, `sanitizeSearchParam()`, route search schemas |
| Integration | ≥80% | Route navigation, auth redirect |
| E2E | 100% | All 34 routes load, search params persist |
| Security | 100% | Open redirect prevention, XSS prevention, Zod DoS prevention |

### Phase 4: TanStack Tables + Virtualization
| Test Type | Target Coverage | Key Files |
|-----------|----------------|-----------|
| Unit | ≥85% | `columnAdapter.ts`, `TanStackTable.tsx` |
| Integration | ≥80% | URL state sync |
| E2E | ≥90% | Table sorting, filtering, virtualization |
| Performance | Within 10% | 10,000 row rendering |

### Phase 5: Drawer State Simplification
| Test Type | Target Coverage | Key Files |
|-----------|----------------|-----------|
| Unit | ≥80% | `useDrawerState.ts`, `useEntityAccessCheck.ts` |
| Integration | ≥85% | Drawer state sync, nested drawers |
| E2E | ≥95% | Drawer open/close, deep linking, shareable links |
| Security | 100% | Nested drawer limit, type validation, access pre-check |

---

## Phase Index

### Phase 0: Preparatory Work ✅ COMPLETE
**File:** `phase-0-preparatory-work.md`
**Focus:** Test infrastructure, feature flags, performance baseline, blocking items
**PRs:** 4
**Duration:** 1 week
**Dependencies:** None
**Status:** ✅ Complete (2026-01-01)
**Tests:** 78 verified (40 E2E URL + 13 Feature Flag + 25 Search Param)
**Outputs:**
- `e2e/src/helpers/url.ts` + `e2e/src/tests/helpers/url.spec.ts`
- `src/config/featureFlags.ts` + `src/hooks/useMigrationFeatureFlag.ts`
- `src/config/searchParamSerialization.ts`
- `docs/audits/forwardRef-audit-2025-01.md`
- `docs/performance/baseline-2025-01.json`

### Phase 1: Impersonation State Migration ✅ COMPLETE
**File:** `phase-1-impersonation.md`
**Focus:** Move impersonation state from URL path to React context + sessionStorage
**PRs:** 4
**Duration:** 1-2 weeks
**Dependencies:** Phase 0 complete
**Status:** ✅ Complete (2026-01-01)
**Tests:** 16 verified (6 unit + 2 timeout + 8 integration)
**Outputs:**
- `src/state/impersonation.tsx` - ImpersonationContext with 1hr timeout
- `src/state/__tests__/impersonation.test.tsx` - Unit tests
- `src/state/__tests__/impersonation-timeout.test.tsx` - Timeout tests
- `src/state/__tests__/impersonation.integration.test.tsx` - Cache isolation tests
- `src/state/auth.tsx` - Updated to use impersonation context
- `src/app/App.tsx` - Provider hierarchy updated

### Phase 2: PII-Free Drawer URLs ✅ COMPLETE
**File:** `phase-2-pii-free-urls.md`
**Focus:** Hash-based entity references to remove PII from search params
**PRs:** 4
**Duration:** 1 day (2026-01-06)
**Dependencies:** Phase 1 complete
**Status:** ✅ Complete (2026-01-06)
**Tests:** 82 verified (59 unit/integration + 23 E2E)
**Reviews:**
- Frontend Reviewer: APPROVED (Grade: A-) - Production-ready, minor file size issue
- Frontend Security: APPROVED (Grade: A-) - All mandated fixes verified, 1 new MEDIUM finding (M-10)
**Outputs:**
- `src/utils/entityKeyHasher.ts` - SHA-256 hash generation (12-char)
- `src/utils/entityKeyRegistry.ts` - Tiered storage with Zod validation
- `src/utils/storageCleanup.ts` - DRY logout cleanup utility
- `src/hooks/useDrawerUrlState.ts` - URL state management hook
- `src/hooks/useOpenEntityDrawer.ts` - Updated with feature flag + hash
- `src/components/LegacyUrlWarning.tsx` - Legacy URL warning dialog (M-03 fix)
- `src/components/UnresolvedLinkDialog.tsx` - Unresolved hash dialog
- `src/components/DrawerUrlHandler.tsx` - Root URL handler component
- `src/state/auth.tsx` - Added clearEntityRegistry to logout (M-04 fix)
- E2E tests: `drawer-url-security.spec.ts`, `legacy-url-warning.spec.ts`, `url-migration.spec.ts`, `unresolved-link.spec.ts`
**Security Fixes:** MED-3 (1hr TTL), M-03 (5-sec countdown), M-04 (logout cleanup), Hash Length (12 chars)
**New Findings:** M-10 (entity type validation - non-blocking), L-01/L-02/L-03 (low severity)

### Phase 3: TanStack Router Migration 🚧 IN PROGRESS
**File:** `phase-3-tanstack-router.md`
**Focus:** Replace React Router v7 with type-safe file-based routing (118 files)
**PRs:** 15-18 (revised from 7 tasks)
**Duration:** 10-12 weeks (revised)
**Dependencies:** Phase 0 complete, blocking items resolved
**Status:** Batches 1-3 Complete (2026-01-07)
**Progress:** 7/7 infrastructure tasks complete (86% of initial phase)
**Tests:** 88 total (20 unit + 68 E2E) - 12 E2E passing, 56 blocked on Task 1.5
**Security Fixes:** CRIT-2 (open redirect), HIGH-1 (XSS), H-04 (documentation)
**Reviews:** All approved (Frontend-Lead A-, Frontend-Reviewer APPROVED, Test-Lead A-)
**Outputs:**
- `src/utils/redirectValidation.ts` - CRIT-2 security fix with 11 tests
- `src/utils/searchParamSanitization.ts` - HIGH-1 security fix with 9 tests
- `vite.config.ts` - TanStack Router Vite plugin configured
- `src/routes/__root.tsx` - Root route with error boundary, H3 accessibility
- `src/routes/_authenticated.tsx` - Auth guard with CRIT-2 integration
- `src/router.tsx` - Router instance with QueryClient + auth context
- `src/routeTree.gen.ts` - Route tree with type definitions
- `src/components/ImpersonationBanner.tsx`, `src/components/layout/MainLayout.tsx` - Supporting components
- E2E tests: `router-navigation.spec.ts`, `search-params-persistence.spec.ts`, `auth-redirect.spec.ts`, `error-handling.spec.ts`
**Dependencies Installed:** @tanstack/react-router@1.145.7, @tanstack/router-zod-adapter, @tanstack/router-vite-plugin, dompurify@3.2.5
**Remaining:** Task 1.5 (34 route migrations), Task 1.7 (118 navigation call updates)

### Phase 4: TanStack Tables + Virtualization 🚧 IN PROGRESS
**File:** `phase-4-tanstack-tables.md`
**Focus:** Migrate table files to consistent TanStack Table patterns
**PRs:** 5
**Duration:** 4-6 weeks
**Dependencies:** Phase 1 complete (can run parallel with Phase 3)
**Status:** Batches 1-3 Complete (2026-01-07)
**Progress:** 3/5 tasks complete (60%)
**Tests:** 49 unit tests (all passing)
**Security Fixes:** MED-4 (column path injection)
**Tables Migrated:** 2/5 (Assets, Vulnerabilities)
**Outputs:**
- `src/components/table/columnAdapter.ts` - Enhanced with MED-4 security fix (whitelist + Object.hasOwn)
- `src/components/table/TanStackTable.tsx` - Enhanced with virtualization support
- `src/sections/asset/components/TanStackAssetTable.tsx` - First migrated table (9 tests)
- `src/sections/vulnerabilities/components/TanStackVulnerabilitiesTable.tsx` - Second migrated table (9 tests)
- Test files: `columnAdapter.test.ts` (17 tests), `TanStackTable.virtualization.test.tsx` (14 tests)
**Virtualization:** Threshold >100 rows, 10-row overscan, 600px container
**Remaining:** Task 4.3 (3 more tables: Seeds, Jobs, Settings), Task 4.4 (URL state sync - now UNBLOCKED), Task 4.5 (Audit + virtualize lists)

### Phase 5: Drawer State Simplification
**File:** `phase-5-drawer-simplification.md`
**Focus:** Simplify drawer URL state using TanStack Router search params
**PRs:** 3
**Duration:** 2-3 weeks
**Dependencies:** Phase 3 complete
**Status:** Not Started

---

## PR Summary

| Phase | PRs | High-Risk PRs | Duration |
|-------|-----|---------------|----------|
| Phase 0 | 4 | 0 | 1 week |
| Phase 1 | 4 | 1 (Auth Context) | 1-2 weeks |
| Phase 2 | 5 | 1 (Drawer Integration) | 1-2 weeks |
| Phase 3 | 15-18 | 2 (Navigation, Router) | 10-12 weeks |
| Phase 4 | 5 | 1 (High-Traffic Tables) | 4-6 weeks |
| Phase 5 | 3 | 2 (Drawer, State Cleanup) | 2-3 weeks |
| **Total** | **36-39** | **7** | **20-26 weeks** |

**Testing Overhead:** +10 weeks (~50% of implementation time)
- Standard testing: ~40% of implementation time
- Security testing: +10% (15 security findings require dedicated tests)

**Revised Total Timeline:** **30-39 weeks** (including testing + security tests)

---

## Execution Strategy

### Suggested Order

**Sequential phases:**
1. Phase 0 (Preparatory) MUST complete first
2. Phase 1 (Impersonation) After Phase 0
3. Phase 2 (PII-Free URLs) After Phase 1
4. Phase 3 (Router) After Phase 0
5. Phase 4 (Tables) After Phase 1
6. Phase 5 (Drawer) After Phase 3

**Parallel opportunities:**
- Phase 3 and Phase 4 can execute in parallel after Phase 1
- Phase 2 can overlap with Phase 3 start

### Cross-Phase Dependencies

```
Phase 0 (Preparatory) ────────────────────────────────────────────
       │
       ├── Phase 1 (Impersonation) ───────────────────────────────
       │          │
       │          ├── Phase 2 (PII-Free URLs) ────────────────────
       │          │
       │          └── Phase 4 (Tables) ───────────────────────────
       │
       └── Phase 3 (Router) ──────────────┬── Phase 5 (Drawer) ───
                                          │
                              (Task 4.4 blocks on Phase 3)
```

### Timeline

```
Week 1:     Phase 0 (Preparatory Work) ────────────────────────────
Week 2-3:   Phase 1 (Impersonation Context) ───────────────────────
Week 4-5:   Phase 2 (PII-Free URLs) ───────────────────────────────
Week 6-17:  ┬─ Phase 3 (TanStack Router) ──────────────────────────
            └─ Phase 4 (Tables + Virtual) ─── Parallel!
Week 18-20: Phase 5 (Drawer Simplification) ───────────────────────
Week 21-27: Testing, bug fixes, documentation ─────────────────────
```

**Best case:** 30 weeks | **Most likely:** 34 weeks | **Worst case:** 39 weeks

> Timeline increased due to 15 security findings requiring dedicated tests (+10% testing overhead)

---

## Progress Tracking

**Update this section as phases complete:**

- [x] Phase 0: Preparatory Work - ✅ Complete (2026-01-01) - 78 tests, 4 PRs
- [x] Phase 1: Impersonation State Migration - ✅ Complete (2026-01-01) - 16 tests, 4 PRs
- [x] Phase 2: PII-Free Drawer URLs - ✅ Complete (2026-01-06) - 82 tests, 4 PRs
  - **Reviews:** Frontend (A-), Security (A-) - Production-ready
  - **Findings:** 1 MEDIUM (M-10 - non-blocking), 3 LOW
- [~] Phase 3: TanStack Router Migration - 🚧 In Progress (Batches 1-3 Complete)
  - **Batches 1-3:** Security fixes + infrastructure (7/7 tasks, 86% complete)
  - **Tests:** 20 unit + 68 E2E (12 passing, 56 blocked on Task 1.5)
  - **Security:** CRIT-2, HIGH-1, H-04 implemented
  - **Reviews:** Frontend-Lead (A-), Frontend-Reviewer (APPROVED), Test-Lead (A-)
  - **Remaining:** Task 1.5 (Route migrations), Task 1.7 (Navigation updates)
- [~] Phase 4: TanStack Tables + Virtualization - 🚧 In Progress (Batches 1-3 Complete)
  - **Batches 1-3:** Infrastructure + 2 tables migrated (3/5 tasks, 60% complete)
  - **Tests:** 49 unit (all passing)
  - **Security:** MED-4 implemented
  - **Tables:** Assets, Vulnerabilities migrated
  - **Remaining:** Task 4.3 (3 more tables), Task 4.4 (URL state sync), Task 4.5 (Audit)
- [ ] Phase 5: Drawer State Simplification - Blocked (waiting for Phase 3 Task 1.5)

---

## Blocking Items

| ID | Condition | Status | Resolution |
|----|-----------|--------|------------|
| **B1** | **forwardRef Audit** | ✅ RESOLVED | 10 usages in 9 files, does NOT block React 19. See `docs/audits/forwardRef-audit-2025-01.md` |
| **B2** | **Search Param Serialization** | ✅ RESOLVED | Zod schemas with security hardening. See `src/config/searchParamSerialization.ts` (25 tests) |
| **B3** | **E2E Test Infrastructure** | ✅ RESOLVED | URL helpers created. See `e2e/src/helpers/url.ts` (40 tests) |
| **B4** | **Feature Flag Service** | ✅ RESOLVED | 17 flags defined. See `src/config/featureFlags.ts` (13 tests) |
| **B5** | **Performance Baseline** | ✅ RESOLVED | Baseline captured. See `docs/performance/baseline-2025-01.json` |

**All blocking items resolved in Phase 0 (2026-01-01).**

---

## How to Execute

### For executing-plans Skill

```
1. Load PLAN.md (this file)
2. Read current phase file
3. Verify entry criteria
4. Execute PRs using TDD
5. Verify exit criteria
6. Update progress in PLAN.md
7. Move to next phase
```

### For Manual Execution

```
1. Read PLAN.md to understand phases
2. Navigate to phase-0-preparatory-work.md
3. Follow PR-by-PR execution
4. Check off exit criteria
5. Update PLAN.md status
6. Proceed to next phase
```

---

## Appendices

| Document | Purpose |
|----------|---------|
| `appendices/rollback-procedures.md` | Rollback strategies per phase |
| `appendices/testing-strategy.md` | E2E + unit testing approach |
| `appendices/reference-materials.md` | NPM packages, file changes, security |
| `appendices/generatePath-migration-tracking.md` | Track 15 generatePath usages |
| `appendices/pr-breakdown-strategy.md` | Detailed PR chunking for Phase 3 |
| `appendices/architecture-decisions.md` | ADRs for key decisions |
| `appendices/code-deletion-checklist.md` | Track deprecated code removal |

---

## Verification Checklist

**Before claiming plan is complete:**

- [ ] All phases have exit criteria met
- [ ] All tests passing
- [ ] **All 15 security tests passing** (see Security Test Requirements)
- [ ] No compilation errors
- [ ] All commits made
- [ ] Documentation updated
- [ ] Feature flags ready for rollback
- [ ] Performance regression verified
- [ ] Security audit of PII removal complete

---

## Review Status

> **Architecture Review #1:** APPROVED WITH CONDITIONS (2025-12-30)
> **Architecture Review #2:** APPROVED WITH RECOMMENDATIONS (2025-12-30)
> **Three-Agent Review:** APPROVED WITH REQUIRED CHANGES (2025-12-31)
> **Phase 0 Review:** APPROVED (2026-01-01)
> **Phase 1 Review:** APPROVED (2026-01-01)
> **Phase 2 Review:** APPROVED (2026-01-06)
> **Phase 3-4 Batches 1-3 Review:** APPROVED (2026-01-07)

### Phase 0 Completion Review (2026-01-01)

**Reviewers:**
- Frontend Lead (Architecture) - APPROVED
- Frontend Reviewer (Code Quality) - APPROVED (Grade: A)
- Test Lead (Testing Strategy) - APPROVED

**Review Documents:**
- `reviews/FRONTEND-LEAD-PHASE0-REVIEW.md`
- `reviews/FRONTEND-REVIEWER-PHASE0-REVIEW.md`
- `reviews/TEST-LEAD-PHASE0-REVIEW.md`

**Key Outcomes:**
- All 4 PRs complete with 78 verified tests
- Security requirements HIGH-4 and M-05 implemented in searchParamSerialization.ts
- Performance baseline captured (FCP avg: 89ms, TTFB avg: 2ms)
- forwardRef audit confirms React 19 migration is NOT blocked

### Phase 2 Completion Review (2026-01-06)

**Reviewers:**
- Frontend Reviewer (Code Quality) - APPROVED WITH RECOMMENDATIONS (Grade: A-)
- Frontend Security (Security Audit) - APPROVED (Grade: A-)

**Review Documents:**
- `reviews/FRONTEND-REVIEWER-PHASE2-REVIEW.md`
- `FRONTEND-SECURITY-PHASE2-REVIEW.md`

**Key Outcomes:**
- All 4 PRs complete with 82 verified tests (59 unit/integration + 23 E2E)
- All 4 mandated security fixes verified passing (MED-3, M-03, M-04, Hash Length)
- Perfect adherence to architecture plan specifications
- Modern React 19 patterns implemented correctly
- Production-ready implementation

**Minor Issues (Non-Blocking):**
- `useOpenEntityDrawer.ts` exceeds 200-line limit by 8.5% (can refactor post-merge)
- New security finding M-10 (entity type validation) - MEDIUM severity, non-blocking

**E2E Test Files Created:**
- `modules/chariot/ui/e2e/src/tests/drawer/drawer-url-security.spec.ts` - PII-free URL verification
- `modules/chariot/ui/e2e/src/tests/drawer/legacy-url-warning.spec.ts` - M-03 countdown verification
- `modules/chariot/ui/e2e/src/tests/drawer/url-migration.spec.ts` - URL migration flows
- `modules/chariot/ui/e2e/src/tests/drawer/unresolved-link.spec.ts` - Error handling

### Phase 3-4 Batches 1-3 Review (2026-01-07)

**Reviewers:**
- Frontend Lead (Architecture) - APPROVED WITH MINOR RECOMMENDATIONS (Grade: A-)
- Frontend Reviewer (Code Quality) - APPROVED WITH MINOR OBSERVATIONS
- Test Lead (Test Coverage) - APPROVED WITH RECOMMENDATIONS (Grade: A-)

**Review Documents:**
- `ARCHITECTURE-REVIEW-PHASE3-4-BATCHES1-3.md`
- `frontend-reviewer-code-review.md`
- `TEST-LEAD-PHASE3-4-REVIEW.md`

**Key Outcomes:**
- **Phase 3:** 7/7 infrastructure tasks complete, 88 tests (20 unit + 68 E2E)
- **Phase 4:** 3/5 tasks complete, 2 tables migrated, 49 tests
- All security fixes (CRIT-2, HIGH-1, MED-4, H-04) properly implemented
- TDD discipline maintained throughout (RED-GREEN-REFACTOR verified)
- Type safety: Full TypeScript strict mode compliance
- Total: 137 new tests across both phases

**Immediate Fixes Implemented:**
- ✅ Router E2E tests created (68 tests, 12 passing now, 56 blocked on Task 1.5)
- ✅ Column whitelist updated (added `visited`, `priority`, `epss`, `origins`)
- ✅ Router context mapping verified and documented

**Minor Issues (Non-Blocking):**
- Two infrastructure files over 200 lines (accepted with justification)
- Manual route tree updates required (generator issue workaround)
- 56 E2E tests blocked on Task 1.5 route migration (expected)

**Test Coverage Summary:**
- Phase 3: 20 unit + 68 E2E = 88 tests
- Phase 4: 49 unit tests
- **Aggregate: 137 new tests, all critical paths covered**

**Security Validation:**
- CRIT-2 (Open Redirect): 11 unit tests + 5 HIGH PRIORITY E2E tests
- HIGH-1 (XSS): 9 unit tests
- MED-4 (Column Injection): 17 unit tests
- All mandated security tests present and comprehensive

### Three-Agent Review Summary (2025-12-31)

**Reviewers:**
- Frontend Lead (Architecture)
- Test Lead (Testing Strategy)
- Frontend Reviewer (Code Quality)

**Key Findings:**
1. **Phase 0 Required** - Add preparatory work before Phase 1
2. **Phase 3 Must Be Chunked** - 118 files too large for single PR
3. **Critical Code Fixes** - OAuth race condition, React 19 syntax, hash length
4. **Testing Overhead** - Plan for ~50% additional time for testing (was 40%)
5. **15 Security Findings Need Dedicated Tests** - Security tests block phase completion
6. **Timeline Revision** - 27-33 weeks → 30-39 weeks

**Review Documents:**
- `.claude/features/2025-12-31-143000-url-refactoring-architecture-review/frontend-lead-architecture-review.md`
- `TEST-PLAN.md` (in this directory)
- `TEST-LEAD-REVIEW.md` (in this directory) - Security test requirements
- `FRONTEND-REVIEWER-FEEDBACK.md` (in this directory)
- `FRONTEND-LEAD-REVIEW.md` (in this directory)

---

## What's Deferred (Requires Backend - OUT OF SCOPE)

| Feature | Why Deferred |
|---------|--------------|
| Opaque IDs (`public_id`) | Requires database schema changes |
| Share Links Service | Requires persistence layer |
| Impersonation Session Timeout | Requires backend JWT validation |

These features can be added later as separate, backend-inclusive projects.
