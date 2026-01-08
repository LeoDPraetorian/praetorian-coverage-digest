# Test Strategy Review: URL Refactoring Project

**Reviewer:** test-lead
**Date:** 2025-12-31
**Documents Reviewed:**
- TEST-PLAN.md (comprehensive test plan)
- PLAN.md (main implementation plan)
- phase-2-pii-free-urls.md (PII removal strategy)
- phase-3-tanstack-router.md (router migration strategy)

---

## Executive Summary

The existing TEST-PLAN.md is **comprehensive and well-structured**, covering all 5 phases with TDD strategy, anti-patterns, and regression analysis. However, it was created **before** the three-agent review and security review, which introduced significant changes:

- **Phase 0 (Preparatory Work)** was added but not reflected in test plan
- **Security fixes** (15 findings) require dedicated security tests
- **Phase 3 revised** from 7 tasks → 15-18 PRs (not reflected in test plan)
- **Hash length change** (8→12 chars) introduces migration risks

This review identifies **critical gaps** and provides **updated testing requirements** based on post-review changes.

---

## 1. Coverage Gaps in TEST-PLAN.md

### Gap 1: Phase 0 Not Covered

**Issue:** TEST-PLAN.md was written before Phase 0 (Preparatory Work) was added.

**Missing Test Coverage:**

| Task | Test Required | Why Critical |
|------|---------------|--------------|
| **Task 0.1: E2E Test Infrastructure** | Verify `buildUrl()` helper works with feature flags | 41 E2E files depend on this |
| **Task 0.2: Feature Flag Service** | Verify flag evaluation for all phases | Rollback depends on flags |
| **Task 0.3: Performance Baseline** | Capture LCP, FCP, route load times | Cannot detect regression without baseline |
| **Task 0.4: forwardRef Audit** | Document forwardRef count, React 19 compatibility | Migration blocker if incompatible |

**Recommendation:** Add Phase 0 test section to TEST-PLAN.md with these deliverables:

```typescript
// e2e/tests/infrastructure/url-helpers.spec.ts
test('buildUrl respects TANSTACK_ROUTER_ENABLED flag', async ({ page }) => {
  // Test both old and new URL formats based on flag
})

// e2e/tests/infrastructure/feature-flags.spec.ts
test('feature flags load correctly from environment', async ({ page }) => {
  // Verify all 7 phase flags available
})

// scripts/capture-performance-baseline.ts
// Must run BEFORE any Phase 1 changes
```

---

### Gap 2: Security Test Coverage Missing

**Issue:** 15 security fixes identified in security review, but TEST-PLAN.md doesn't have dedicated security test sections.

**Missing Security Tests:**

| Finding | Severity | Test Required |
|---------|----------|---------------|
| **CRIT-2: Open Redirect** | 8.1 | Unit test for `validateRedirectUrl()` with malicious vectors |
| **HIGH-1: XSS via Zod** | 7.3 | Unit test for `sanitizeSearchParam()` with XSS payloads |
| **HIGH-3: Impersonation Timeout** | 7.1 | E2E test for 1hr expiration enforcement |
| **HIGH-4: Zod Type Coercion DoS** | 6.5 | Unit test rejecting `Infinity`, `NaN`, `1e308` |
| **H-02: Impersonation Persists** | HIGH | E2E test verifying logout clears sessionStorage |
| **H-05: Nested Drawer Access** | HIGH | E2E test for unauthorized nested drawer rejection |
| **M-03: Continue Anyway** | MEDIUM | E2E test verifying 5-second countdown |
| **M-04: localStorage TTL** | MEDIUM | Unit test verifying logout clears `drawer_*` keys |
| **M-05: Zod Error Exposure** | MEDIUM | Unit test verifying `.catch()` hides validation errors |
| **M-09: Drawer Type Confusion** | MEDIUM | Unit test validating entityType matches key format |
| **MED-2: Cache Poisoning** | MEDIUM | Integration test invalidating cache on impersonation change |
| **MED-3: Hash TTL Too Long** | MEDIUM | Unit test verifying 1hr TTL (not 24hr) |
| **MED-4: Column Path Injection** | MEDIUM | Unit test for column accessor whitelist |
| **MED-5: Nested Drawer DoS** | MEDIUM | Unit test **rejecting** (not warning) when `stack.length > 2` |

**Recommendation:** Add security test section to TEST-PLAN.md:

```markdown
## Security Testing Requirements

### Phase 1 Security Tests
- [ ] Impersonation timeout enforcement (1hr TTL)
- [ ] Logout clears sessionStorage keys
- [ ] Cache invalidation on impersonation change

### Phase 2 Security Tests
- [ ] Hash length is 12 characters (not 8)
- [ ] Logout clears entity registry
- [ ] Legacy URL "Continue Anyway" has 5-sec delay
- [ ] TTL is 1 hour (not 24 hours)
- [ ] Nested drawer limit enforced (max 2 levels)

### Phase 3 Security Tests
- [ ] `validateRedirectUrl()` rejects all malicious vectors
- [ ] `sanitizeSearchParam()` removes all XSS payloads
- [ ] Zod schemas reject `Infinity`, `NaN`, type coercion DoS
- [ ] All Zod schemas use `.catch()` defaults
- [ ] Route guard has security documentation comment

### Phase 4 Security Tests
- [ ] Column accessor paths are whitelisted
```

---

### Gap 3: Phase 3 PR Breakdown Not Reflected

**Issue:** TEST-PLAN.md shows Phase 3 as 7 tasks, but it's now **15-18 PRs** after review.

**Impact on Testing:**

| Original Plan | Revised Plan | Test Impact |
|---------------|--------------|-------------|
| 1 PR for "Route Migration" (118 files) | 8 PRs by feature area (~8 files each) | Need test strategy per PR batch |
| All-or-nothing feature flag | Per-route feature flags | Need flag combination testing |
| Single E2E test update | 41 E2E files updated incrementally | Need incremental test strategy |

**Missing Test Strategy:**

1. **Per-PR Test Gates:** Each of the 15-18 PRs needs its own test gate
2. **Feature Flag Combinations:** Need to test all feature flag states (routes can be independently enabled)
3. **Incremental E2E Migration:** Cannot update all 41 E2E files in one PR

**Recommendation:** Add PR-level test gates to TEST-PLAN.md:

```markdown
## Phase 3: PR-Level Test Gates

### Infrastructure PRs (3 PRs)
**PR 3.1-3.3:** Install + configure TanStack Router
- [ ] Build succeeds with new packages
- [ ] No TypeScript errors
- [ ] No runtime errors in dev mode

### Route Migration PRs (8 PRs)
**PR 3.4:** Dashboard & Insights (2 routes, ~8 files)
- [ ] Routes load correctly
- [ ] Search params validated
- [ ] Feature flag `TANSTACK_ROUTER_INSIGHTS` works
- [ ] Fallback to React Router when flag disabled

**PR 3.5-3.11:** Repeat pattern for each feature area

### Navigation Migration PRs (5 PRs)
**PR 3.12-3.16:** Migrate navigation calls
- [ ] All useNavigate calls work
- [ ] All useSearchParams calls work
- [ ] All generatePath usages removed
- [ ] Type safety enforced

### Integration PRs (2 PRs)
**PR 3.17:** Router integration
- [ ] All 34 routes work with master flag enabled
- [ ] Performance within 10% of baseline

**PR 3.18:** E2E test migration (41 files)
- [ ] All E2E tests pass with new URL helpers
- [ ] Old and new URL formats both work
```

---

### Gap 4: Hash Length Change Migration Risk

**Issue:** Phase 2 Task 2.1 increases hash length from **8 → 12 characters**, but TEST-PLAN.md doesn't address migration of existing hashes.

**Regression Risk:**

| Scenario | Impact | Likelihood |
|----------|--------|-----------|
| User has bookmarked link with 8-char hash | Link breaks after deploy | HIGH |
| localStorage contains 8-char hashes | Cannot resolve after deploy | MEDIUM |
| Cross-browser shared link (8-char) | Unresolved link dialog | HIGH |

**Missing Tests:**

1. **Migration Test:** Verify 8-char hashes gracefully degrade (show unresolved dialog)
2. **Forward Compatibility:** Verify 12-char hashes work
3. **Backward Compatibility:** Verify 8-char hashes don't crash

**Recommendation:** Add hash length migration tests:

```typescript
// src/utils/__tests__/entityKeyRegistry.test.ts
describe('Hash Length Migration', () => {
  it('gracefully handles legacy 8-character hashes', async () => {
    // Simulate old hash in localStorage
    const legacyHash = 'a7f3b2c1' // 8 chars
    localStorage.setItem(`drawer_${legacyHash}`, JSON.stringify({
      key: '#asset#test@email.com',
      hash: legacyHash,
      storedAt: Date.now()
    }))

    const registry = new EntityKeyRegistry()
    const result = await registry.retrieve(legacyHash)

    // Should return null (invalid format)
    expect(result).toBeNull()
  })

  it('works with new 12-character hashes', async () => {
    const newHash = 'a7f3b2c1d4e5' // 12 chars
    // ... test passes
  })
})
```

---

### Gap 5: Dual Router Strategy Testing

**Issue:** Phase 3 uses **dual router strategy** (TanStack + React Router coexist), but TEST-PLAN.md doesn't address testing both routers simultaneously.

**Regression Risk:**

| Scenario | Impact | Test Required |
|----------|--------|---------------|
| Both routers try to handle same route | Route breaks or infinite redirect | Integration test |
| Feature flag changes mid-session | Route stops working | E2E test |
| One router updates URL, other router reads it | State desync | Integration test |

**Missing Tests:**

1. **Router Isolation:** Verify routers don't interfere
2. **Flag Hot-Reload:** Verify flag changes work without full page reload
3. **URL Ownership:** Verify only one router handles each route

**Recommendation:** Add dual router tests:

```typescript
// e2e/tests/dual-router.spec.ts
test('TanStack Router and React Router coexist without conflict', async ({ page }) => {
  // Navigate to route handled by TanStack Router
  await page.goto('/assets') // TanStack Router
  await expect(page).toHaveURL(/\/assets/)

  // Navigate to route handled by React Router
  await page.goto('/legacy/settings') // React Router
  await expect(page).toHaveURL(/\/legacy\/settings/)

  // No console errors
  const errors = []
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await page.waitForTimeout(1000)
  expect(errors).toHaveLength(0)
})
```

---

## 2. Regression Risks: URL Changes

### New Risks Identified (Post-Review)

| Risk | Phase | Severity | Mitigation |
|------|-------|----------|------------|
| **8→12 char hash breaks bookmarks** | 2 | HIGH | Show unresolved dialog, don't crash |
| **TTL reduction 24h→1h breaks old links** | 2 | MEDIUM | Show unresolved dialog with explanation |
| **Dual router conflict** | 3 | HIGH | Feature flag isolation tests |
| **E2E test migration breaks CI** | 3 | HIGH | Incremental migration, keep old tests |
| **Security fixes reject valid URLs** | 2, 3 | MEDIUM | Validate against production URL patterns |
| **Per-route flags create untested combinations** | 3 | HIGH | Test matrix of flag combinations |

---

### Existing Risks (From TEST-PLAN.md)

TEST-PLAN.md correctly identifies these risks:

| Phase | Risk | Coverage in TEST-PLAN.md |
|-------|------|--------------------------|
| 1 | Cache returns wrong user data | ✅ Covered (integration tests) |
| 1 | Impersonation lost on OAuth | ✅ Covered (E2E tests) |
| 2 | Hash collision in production | ✅ Covered (unit tests + integrity validation) |
| 2 | Link breaks after 24h TTL | ✅ Covered (E2E with time manipulation) |
| 3 | Routes return 404 | ✅ Covered (E2E for all 34 routes) |
| 3 | Search params not persisting | ✅ Covered (integration tests) |
| 4 | Virtualization performance | ✅ Covered (performance benchmarks) |
| 5 | Drawer state lost | ✅ Covered (URL state persistence tests) |

**Assessment:** Existing risk coverage is **solid**. Focus on new risks above.

---

## 3. URL Migration Testing Approach

### Three Migration Scenarios

| Scenario | Test Approach | Priority |
|----------|---------------|----------|
| **Legacy → Hash-based** | E2E test for "Update Link" button | HIGH |
| **Old hash (8 chars) → New hash (12 chars)** | Unit test for graceful degradation | HIGH |
| **Impersonation URL → Context** | Integration test for cache key changes | CRITICAL |

---

### Scenario 1: Legacy → Hash-Based (Phase 2)

**Test:** Verify legacy URL warning and migration

```typescript
// e2e/tests/legacy-url-migration.spec.ts
test('legacy URL shows warning and migrates to hash-based', async ({ page }) => {
  // Visit legacy URL with PII
  await page.goto('/assets?detail=asset:#asset#test@email.com')

  // Warning dialog appears
  await expect(page.getByText('Legacy URL Detected')).toBeVisible()

  // "Continue Anyway" button has 5-second countdown (security fix M-03)
  const continueButton = page.getByRole('button', { name: /Continue in \d+s/ })
  await expect(continueButton).toBeDisabled()

  // Wait for countdown
  await page.waitForTimeout(5000)
  await expect(continueButton).toBeEnabled()

  // Click "Update Link (Recommended)"
  await page.click('button:has-text("Update Link")')

  // URL migrated to hash-based
  await expect(page).toHaveURL(/detail=asset:[a-f0-9]{12}/)
  await expect(page.url()).not.toContain('test@email.com')
})
```

---

### Scenario 2: Old Hash → New Hash (Phase 2)

**Test:** Verify 8-char hashes gracefully degrade

```typescript
// e2e/tests/hash-length-migration.spec.ts
test('8-character hash shows unresolved dialog', async ({ page, context }) => {
  // Simulate old 8-char hash in localStorage
  await context.addInitScript(() => {
    localStorage.setItem('drawer_a7f3b2c1', JSON.stringify({
      key: '#asset#test@email.com',
      hash: 'a7f3b2c1', // 8 chars
      storedAt: Date.now()
    }))
  })

  // Visit URL with 8-char hash
  await page.goto('/assets?detail=asset:a7f3b2c1')

  // Unresolved link dialog appears
  await expect(page.getByText('Link Expired or Unavailable')).toBeVisible()
  await expect(page.getByText('This link is older than 24 hours')).toBeVisible()

  // "Search assets" button works
  await page.click('button:has-text("Search assets")')
  await expect(page).toHaveURL('/assets')
})
```

---

### Scenario 3: Impersonation URL → Context (Phase 1)

**Test:** Verify cache keys change when impersonation moves to context

```typescript
// src/state/__tests__/impersonation-cache.integration.test.tsx
test('cache keys include impersonation context, not URL', async () => {
  const { result } = renderHook(() => useMyQuery(), {
    wrapper: ({ children }) => (
      <ImpersonationProvider initialTarget="customer@example.com">
        <QueryClientProvider client={testQueryClient}>
          {children}
        </QueryClientProvider>
      </ImpersonationProvider>
    )
  })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))

  // Cache key includes impersonation context
  const cacheKeys = testQueryClient.getQueryCache().getAll().map(q => q.queryKey)
  expect(cacheKeys.some(key =>
    JSON.stringify(key).includes('customer@example.com')
  )).toBe(true)

  // Cache key does NOT include /u/{base64}/ from URL
  expect(cacheKeys.some(key =>
    JSON.stringify(key).includes('/u/')
  )).toBe(false)
})
```

---

## 4. TanStack Testing Infrastructure Changes

### Required Test Utilities

TEST-PLAN.md (Part 4) identifies these utilities, but needs **updates** based on post-review changes:

#### 1. URL Helpers (e2e/src/helpers/url.ts) - UPDATE REQUIRED

**Original Plan:** Single `USE_NEW_URL_FORMAT` flag
**Revised Plan:** Per-route feature flags

```typescript
// UPDATED: e2e/src/helpers/url.ts
export const ROUTER_FLAGS = {
  TANSTACK_ROUTER_INSIGHTS: process.env.TANSTACK_ROUTER_INSIGHTS === 'true',
  TANSTACK_ROUTER_ASSETS: process.env.TANSTACK_ROUTER_ASSETS === 'true',
  TANSTACK_ROUTER_VULNERABILITIES: process.env.TANSTACK_ROUTER_VULNERABILITIES === 'true',
  // ... all 7 flags
  TANSTACK_ROUTER_ALL: process.env.TANSTACK_ROUTER_ALL === 'true',
}

export function buildUrl(
  route: string,
  options?: { params?: Record<string, string> }
): string {
  // Check per-route flag
  const routeBase = route.split('?')[0]
  const useNewRouter = ROUTER_FLAGS.TANSTACK_ROUTER_ALL ||
    (routeBase === '/assets' && ROUTER_FLAGS.TANSTACK_ROUTER_ASSETS) ||
    (routeBase === '/insights' && ROUTER_FLAGS.TANSTACK_ROUTER_INSIGHTS)
    // ... check all routes

  if (useNewRouter) {
    // New: TanStack Router format
    const url = new URL(route, baseUrl)
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
    }
    return url.toString()
  } else {
    // Old: React Router format
    return new URL(route, baseUrl).toString()
  }
}
```

---

#### 2. Router Test Helpers (src/test-utils/router.ts) - NEW REQUIREMENT

**Missing from TEST-PLAN.md:** Security validation testing utilities

```typescript
// src/test-utils/router.ts
import { createMemoryRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'

export function renderWithRouter(
  component: React.ReactElement,
  { initialRoute = '/', searchParams = {}, ...options }: RenderOptions = {}
) {
  const router = createMemoryRouter({
    routeTree,
    context: {
      queryClient: testQueryClient,
      auth: mockAuthContext,
    },
  })

  router.navigate({ to: initialRoute, search: searchParams })

  return render(
    <RouterProvider router={router}>
      {component}
    </RouterProvider>,
    options
  )
}

// NEW: Security testing utility
export function renderWithMaliciousSearch(
  component: React.ReactElement,
  maliciousSearchParams: Record<string, string>
) {
  // Renders component with XSS payloads in search params
  // Used to verify sanitization works
  return renderWithRouter(component, {
    searchParams: maliciousSearchParams
  })
}
```

---

#### 3. MSW Handler Updates - SECURITY FIX REQUIRED

**Missing from TEST-PLAN.md:** Handlers must validate sanitized inputs

```typescript
// src/test/mocks/handlers.ts

// SECURITY: Handlers should receive sanitized inputs
http.get('*/assets', ({ request }) => {
  const url = new URL(request.url)
  const query = url.searchParams.get('query')

  // If sanitization works, XSS payloads should be removed
  // This verifies HIGH-1 fix
  if (query?.includes('<script>')) {
    // Sanitization failed - test should catch this
    throw new Error('Unsanitized XSS payload reached handler')
  }

  return HttpResponse.json({ assets: [] })
})
```

---

#### 4. Performance Testing Utilities - NEW REQUIREMENT

**Missing from TEST-PLAN.md:** Baseline capture and comparison scripts

```bash
# scripts/capture-performance-baseline.sh
#!/bin/bash
# MUST run BEFORE Phase 1 starts

npm run build
npx playwright test performance-baseline.spec.ts --reporter=json

# Save results
mv test-results/performance-baseline.json .baseline/performance-pre-phase1.json

echo "Baseline captured:"
cat .baseline/performance-pre-phase1.json | jq '.[] | {route: .route, lcp: .lcp, fcp: .fcp}'
```

```bash
# scripts/compare-performance.sh
#!/bin/bash
# Run AFTER each phase

npm run build
npx playwright test performance-baseline.spec.ts --reporter=json

# Compare to baseline
node scripts/compare-metrics.js \
  .baseline/performance-pre-phase1.json \
  test-results/performance-baseline.json

# Exit 1 if degradation > 10%
```

---

## 5. Acceptance Criteria: Go/No-Go Per Phase

TEST-PLAN.md provides exit criteria per phase, but needs **security and performance gates** added.

### Phase 0: Preparatory Work

**Go Criteria:**

- [x] E2E URL helpers created (`buildUrl()`, `URLAssertions`)
- [x] Feature flag service verified (all 7 flags available)
- [x] Performance baseline captured (LCP, FCP, route load times)
- [x] forwardRef audit complete (count documented, React 19 compatibility confirmed)
- [x] All preparatory tests passing
- [x] No TypeScript errors
- [x] **BLOCKING:** Cannot start Phase 1 without baseline

**No-Go Triggers:**

- Feature flags not working → Phase 1-5 cannot proceed
- Performance baseline missing → Cannot detect regression
- E2E helpers broken → 41 test files will fail

---

### Phase 1: Impersonation State Migration

**Go Criteria (from TEST-PLAN.md):**

- [x] Unit tests ≥80% coverage
- [x] Integration tests ≥90% coverage
- [x] E2E tests 100% coverage
- [x] Security tests 100% coverage

**NEW: Security Gates (Post-Security Review):**

- [x] **HIGH-3:** Impersonation timeout enforced (1hr TTL)
- [x] **H-02:** Logout clears sessionStorage keys (test passes)
- [x] **MED-2:** Cache invalidation on impersonation change (integration test passes)
- [x] No PII in cache keys (verified in tests)

**Performance Gate:**

- [x] Route load time within 10% of baseline
- [x] No increase in error rate

**No-Go Triggers:**

- Security test fails → **BLOCK merge**, security vulnerability
- Performance degradation >10% → Investigate before proceeding
- Cache isolation broken → Data leakage risk

---

### Phase 2: PII-Free Drawer URLs

**Go Criteria (from TEST-PLAN.md):**

- [x] Unit tests ≥90% coverage
- [x] Integration tests ≥85% coverage
- [x] E2E tests ≥95% coverage
- [x] Security tests 100% coverage

**NEW: Security Gates (Post-Security Review):**

- [x] **Hash length is 12 characters** (not 8) - test passes
- [x] **MED-3:** TTL is 1 hour (not 24 hours) - test passes
- [x] **M-04:** Logout clears entity registry - test passes
- [x] **M-03:** "Continue Anyway" has 5-sec countdown - E2E test passes
- [x] No PII in browser history (verified manually in browser)
- [x] No PII in URL (E2E test verifies)

**Migration Gate:**

- [x] Legacy URLs show warning dialog
- [x] 8-char hashes gracefully degrade (unresolved dialog)
- [x] "Update Link" button migrates to 12-char hash

**No-Go Triggers:**

- PII still visible in URL → **BLOCK merge**, security vulnerability
- Hash collision detected in testing → Increase hash length
- Legacy migration broken → Users lose access to bookmarks

---

### Phase 3: TanStack Router Migration

**Go Criteria (from TEST-PLAN.md):**

- [x] All 34 routes migrated
- [x] All 118 files updated
- [x] All 15 generatePath usages removed
- [x] Type-safe routing working
- [x] Performance within 10% of baseline

**NEW: Security Gates (Post-Security Review):**

- [x] **CRIT-2:** `validateRedirectUrl()` rejects all malicious vectors - test passes
- [x] **HIGH-1:** `sanitizeSearchParam()` removes all XSS payloads - test passes
- [x] **HIGH-4:** No `.coerce` usage, explicit validation with range limits - test passes
- [x] **M-05:** All Zod schemas use `.catch()` defaults - test passes
- [x] **H-04:** Route guard has security documentation comment - verified

**NEW: PR-Level Gates (Post-Review):**

Each of 15-18 PRs must pass:

- [x] Tests pass for affected routes
- [x] No TypeScript errors
- [x] Feature flag works (per-route)
- [x] Fallback to React Router when flag disabled
- [x] No console errors

**Migration Gate:**

- [x] Dual router strategy works (no conflicts)
- [x] All feature flag combinations tested
- [x] E2E tests updated incrementally (41 files)

**Performance Gate:**

- [x] Route load time within 10% of baseline
- [x] LCP within 10% of baseline
- [x] Bundle size increase <50KB

**No-Go Triggers:**

- Security test fails → **BLOCK merge**, critical vulnerability
- Any route returns 404 → **BLOCK merge**, broken functionality
- Performance degradation >10% → Investigate, consider rollback
- E2E test migration breaks CI → **BLOCK merge**, fix incrementally

---

### Phase 4: TanStack Tables + Virtualization

**Go Criteria (from TEST-PLAN.md):**

- [x] Unit tests ≥85% coverage
- [x] Integration tests ≥80% coverage
- [x] E2E tests ≥90% coverage
- [x] Performance tests 100% coverage

**NEW: Security Gate (Post-Security Review):**

- [x] **MED-4:** Column accessor paths whitelisted - test passes

**Performance Gate (CRITICAL for virtualization):**

- [x] Table render time with 10,000 rows <500ms
- [x] Scroll performance smooth (60fps)
- [x] Memory usage within 10% of baseline

**No-Go Triggers:**

- Virtualization slower than baseline → **BLOCK merge**, defeats purpose
- Table rendering broken → **BLOCK merge**, core UX
- Memory leak detected → **BLOCK merge**, investigate

---

### Phase 5: Drawer State Simplification

**Go Criteria (from TEST-PLAN.md):**

- [x] Unit tests ≥80% coverage
- [x] Integration tests ≥85% coverage
- [x] E2E tests ≥95% coverage

**NEW: Security Gate (Post-Security Review):**

- [x] **H-05:** Nested drawer access pre-validated - test passes
- [x] **M-09:** Drawer type confusion prevented - test passes
- [x] **MED-5:** Nested drawer DoS rejected (not warned) - test passes

**No-Go Triggers:**

- Drawer state lost → **BLOCK merge**, core UX
- Nested drawers broken → **BLOCK merge**, affects multiple pages
- Back button broken → **BLOCK merge**, browser navigation

---

## 6. Priority Testing: What's Most Critical?

### Priority 1: CRITICAL (Must Pass Before Merge)

| Test Category | Why Critical | Consequence of Failure |
|---------------|--------------|------------------------|
| **Security Tests (15 fixes)** | Prevent vulnerabilities (CVSS 6.5-8.1) | Exploitable XSS, open redirect, DoS |
| **PII Removal (Phase 2)** | Legal/compliance requirement | PII exposure in logs, history, referer |
| **Route 404 Detection (Phase 3)** | Core functionality broken | Users cannot access pages |
| **Cache Isolation (Phase 1)** | Data leakage between users | Wrong user data shown |

**Test Frequency:** Every PR, cannot merge if failing

---

### Priority 2: HIGH (Must Pass Before Phase Complete)

| Test Category | Why High Priority | Consequence of Failure |
|---------------|-------------------|------------------------|
| **E2E Test Migration (41 files)** | CI broken = team blocked | Cannot merge any PRs |
| **Performance Baseline** | Detect regressions early | Slow app, poor UX |
| **Feature Flag Tests** | Rollback capability required | Cannot revert if production issues |
| **Dual Router Tests** | Both routers coexist | Conflicts, infinite redirects |

**Test Frequency:** Per phase, before moving to next phase

---

### Priority 3: MEDIUM (Should Pass, Can Fix Async)

| Test Category | Why Medium Priority | Consequence of Failure |
|---------------|---------------------|------------------------|
| **Legacy URL Migration** | Users with bookmarks affected | Some links break, not widespread |
| **Cross-Browser Tests** | Safari/Firefox users affected | Works in Chrome, not others |
| **Accessibility Tests** | Screen reader users affected | Non-compliant, but functional |

**Test Frequency:** Per phase, can fix in follow-up PR

---

### Priority 4: LOW (Nice to Have)

| Test Category | Why Low Priority | Consequence of Failure |
|---------------|------------------|------------------------|
| **Visual Regression** | Cosmetic changes only | Layout shift, not broken |
| **Performance Optimization** | Already within 10% of baseline | Could be faster, but acceptable |

**Test Frequency:** Ad-hoc, after phase complete

---

## Summary Recommendations

### Critical Actions Required (MUST DO)

1. **Add Phase 0 to TEST-PLAN.md** (preparatory work testing)
2. **Add Security Test Section** (15 security fixes require dedicated tests)
3. **Update Phase 3 to 15-18 PRs** (PR-level test gates required)
4. **Add Hash Length Migration Tests** (8→12 char migration)
5. **Add Dual Router Tests** (TanStack + React Router coexistence)
6. **Capture Performance Baseline** (BEFORE Phase 1 starts)
7. **Update E2E URL Helpers** (per-route feature flags, not single flag)

---

### High Priority Actions (SHOULD DO)

1. **Create Security Test Checklist** (15 findings → 15 test requirements)
2. **Document Per-Route Feature Flag Matrix** (7 flags × 2 states = 128 combinations, test critical subset)
3. **Create Incremental E2E Migration Plan** (41 files cannot update in 1 PR)
4. **Add Security Testing Utilities** (`renderWithMaliciousSearch`, MSW validation)

---

### Medium Priority Actions (COULD DO)

1. **Automate Performance Comparison** (baseline capture → phase compare → CI gate)
2. **Add Flakiness Detection** (run tests 10x, detect <99% pass rate)
3. **Create Test Coverage Dashboard** (visualize coverage per phase)

---

## Conclusion

The existing TEST-PLAN.md is **well-structured and comprehensive**. The main gaps are:

1. **Phase 0 not covered** (added after test plan created)
2. **Security fixes not covered** (15 findings from security review)
3. **Phase 3 revised to 15-18 PRs** (test plan shows 7 tasks)
4. **Hash length change migration** (8→12 chars not addressed)
5. **Dual router strategy** (coexistence testing not addressed)

**Recommendation:** Update TEST-PLAN.md with sections above, then proceed with implementation.

**Timeline Impact:** Adding these tests will increase testing overhead from ~40% → **~50%** of implementation time.

**Revised Total Timeline:** 20-26 weeks (implementation) + 10-13 weeks (testing) = **30-39 weeks** (vs. 27-33 weeks originally estimated)

---

## Test Plan Update Checklist

- [ ] Add Phase 0 test section
- [ ] Add Security Test Requirements section (15 findings)
- [ ] Update Phase 3 to PR-level test gates (15-18 PRs)
- [ ] Add hash length migration tests
- [ ] Add dual router coexistence tests
- [ ] Add performance baseline capture instructions
- [ ] Update E2E URL helpers with per-route flags
- [ ] Add security testing utilities
- [ ] Document per-route feature flag test matrix
- [ ] Add incremental E2E migration strategy

---

## Metadata

```json
{
  "agent": "test-lead",
  "output_type": "test-strategy-review",
  "timestamp": "2025-12-31T16:00:00Z",
  "feature_directory": ".claude/features/2025-12-31-url-refactoring",
  "skills_invoked": [
    "calibrating-time-estimates",
    "enforcing-evidence-based-analysis",
    "gateway-testing",
    "persisting-agent-outputs",
    "writing-plans",
    "verifying-before-completion",
    "adhering-to-dry",
    "adhering-to-yagni",
    "debugging-systematically",
    "developing-with-tdd",
    "using-todowrite"
  ],
  "library_skills_read": [
    ".claude/skill-library/testing/testing-anti-patterns/SKILL.md",
    ".claude/skill-library/testing/behavior-vs-implementation-testing/SKILL.md",
    ".claude/skill-library/testing/condition-based-waiting/SKILL.md",
    ".claude/skill-library/testing/test-infrastructure-discovery/SKILL.md"
  ],
  "source_files_verified": [
    "2025-12-31-url-refactoring/TEST-PLAN.md",
    "2025-12-31-url-refactoring/PLAN.md",
    "2025-12-31-url-refactoring/phase-2-pii-free-urls.md",
    "2025-12-31-url-refactoring/phase-3-tanstack-router.md"
  ],
  "status": "complete",
  "handoff": {
    "next_agent": "frontend-lead",
    "context": "Review test strategy, update TEST-PLAN.md with identified gaps"
  }
}
```
