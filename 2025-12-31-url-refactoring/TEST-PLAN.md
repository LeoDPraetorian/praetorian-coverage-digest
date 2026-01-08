# Comprehensive Test Plan: URL Refactoring Project

**Created by:** test-lead
**Date:** 2025-12-31
**Project:** TanStack Ecosystem Migration & URL Security Refactor
**Scope:** Frontend-only testing strategy for 6-phase refactoring (Phase 0-5)

---

## Executive Summary

This test plan covers comprehensive testing strategy for a frontend-only refactoring affecting:
- **118 files** with React Router imports
- **34 authenticated routes**
- **15 `generatePath` usages**
- **41 E2E test files** requiring updates
- **Security-critical** impersonation and PII handling

**Critical Testing Priorities:**
1. **Security**: Zero PII in URLs (CRITICAL - attack vector)
2. **Regression**: All existing functionality preserved
3. **Performance**: No degradation in route load times
4. **E2E Stability**: No flaky tests introduced

**Estimated Testing Effort:** 40% of implementation time per phase

---

## Part 1: Test Strategy Assessment

### Phase 0: Preparatory Work

**Test Coverage Required:**

| Test Type | Target Coverage | Priority | Rationale |
|-----------|----------------|----------|-----------|
| **Unit Tests** | 90%+ | HIGH | URL helpers are foundation for 41 E2E tests |
| **Integration Tests** | 80%+ | MEDIUM | Feature flag infrastructure must work |
| **E2E Tests** | N/A | N/A | No user-facing changes in this phase |
| **Performance Tests** | 100% | HIGH | Baseline must be captured before changes |

**Test Files Needed:**
1. `e2e/src/helpers/__tests__/url.test.ts` (unit)
2. `src/hooks/__tests__/useFeatureFlag.test.ts` (unit)
3. `src/config/__tests__/featureFlags.test.ts` (unit)
4. `src/config/__tests__/searchParamSerialization.test.ts` (unit)

**Regression Risks:**

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| URL helpers break existing tests | MEDIUM | LOW | Test helpers against current URL patterns |
| Feature flag defaults wrong | HIGH | LOW | Unit tests verify all defaults are false |
| Performance baseline inaccurate | LOW | MEDIUM | Run baseline collection 3x, use median |
| forwardRef audit misses usages | MEDIUM | LOW | Automated grep + manual review |

**Missing Test Scenarios in Plan:**
- ❌ URL helper edge cases (empty params, special characters)
- ❌ Feature flag SSR behavior (if applicable)
- ❌ Performance baseline flakiness detection
- ❌ Search param Zod schema validation errors

**Anti-Patterns to Avoid:**
1. **BLOCKING**: Do NOT test URL helper internals - test output format
2. **BLOCKING**: Do NOT skip feature flag tests - rollback depends on them
3. **BLOCKING**: Do NOT capture baseline during high-load periods

**Test Execution Order:**

```
PR 0.1: E2E URL Helpers
├─ Pre: url.test.ts (RED - helpers don't exist)
├─ Implement: URL helpers
├─ Pre: url.test.ts (GREEN)
└─ Verify: helpers work with existing E2E test patterns

PR 0.2: Feature Flag Infrastructure
├─ Pre: useFeatureFlag.test.ts (RED - need to verify behavior)
├─ Pre: featureFlags.test.ts (RED - config doesn't exist)
├─ Implement: Feature flag config
├─ Pre: featureFlags.test.ts (GREEN)
└─ Pre: useFeatureFlag.test.ts (GREEN)

PR 0.3: Performance Baseline
├─ Run: collect-performance-baseline.ts
├─ Verify: metrics captured for all 6 routes
├─ Store: baseline-2025-01.json
└─ Document: acceptable variance thresholds

PR 0.4: Blocking Items Resolution
├─ Audit: forwardRef usages documented
├─ Pre: searchParamSerialization.test.ts (RED)
├─ Implement: Zod schemas for search params
└─ Pre: searchParamSerialization.test.ts (GREEN)
```

**Exit Criteria:**
- [ ] All URL helper tests passing
- [ ] Feature flag infrastructure verified
- [ ] Performance baseline captured and stored
- [ ] Blocking items B1, B2 resolved with tests
- [ ] No regression in existing E2E test suite

---

### Phase 1: Impersonation State Migration

**Test Coverage Required:**

| Test Type | Target Coverage | Priority | Rationale |
|-----------|----------------|----------|-----------|
| **Unit Tests** | 80%+ | CRITICAL | Context logic is security-critical |
| **Integration Tests** | 90%+ | CRITICAL | Cache isolation MUST work |
| **E2E Tests** | 100% | CRITICAL | Impersonation is core security feature |
| **Security Tests** | 100% | CRITICAL | Tab isolation, OAuth preservation |

**Test Files Needed:**
1. `src/state/__tests__/impersonation.test.tsx` (unit)
2. `src/state/__tests__/impersonation.integration.test.tsx` (integration)
3. `e2e/tests/impersonation-context.spec.ts` (E2E)
4. `e2e/tests/impersonation-persistence.spec.ts` (E2E)
5. `e2e/tests/impersonation-tab-isolation.spec.ts` (E2E)
6. `e2e/tests/impersonation-oauth.spec.ts` (E2E)

**Regression Risks:**

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Cache returns wrong user data | HIGH | MEDIUM | Integration tests with TanStack Query |
| Impersonation lost on OAuth | HIGH | HIGH | E2E test with OAuth flow |
| Tab isolation broken | MEDIUM | LOW | Multi-tab E2E tests |
| sessionStorage quota exceeded | LOW | LOW | Unit tests with error injection |
| Race condition during init | MEDIUM | MEDIUM | Async state initialization tests |

**Missing Test Scenarios in Plan:**
- ❌ Multi-tab behavior not tested (plan mentions, no test spec)
- ❌ Private browsing mode (sessionStorage disabled)
- ❌ Cookie-less environments
- ❌ Browser extension interference
- ❌ Concurrent tab switching scenarios
- ❌ Network failure during impersonation switch

**Anti-Patterns to Avoid:**
1. **BLOCKING**: Do NOT test mock behavior - test actual context value changes
2. **BLOCKING**: Do NOT test sessionStorage directly - test user-visible outcomes
3. **BLOCKING**: Do NOT test internal state - test cache isolation behavior

---

### Phase 2: PII-Free Drawer URLs

**Test Coverage Required:**

| Test Type | Target Coverage | Priority | Rationale |
|-----------|----------------|----------|-----------|
| **Unit Tests** | 90%+ | HIGH | Hash collision detection is security-critical |
| **Integration Tests** | 85%+ | HIGH | Registry tier fallback must work |
| **E2E Tests** | 95%+ | CRITICAL | PII exposure is security vulnerability |
| **Security Tests** | 100% | CRITICAL | No PII in browser history/URLs |

**Test Files Needed:**
1. `src/utils/__tests__/entityKeyHasher.test.ts` (unit)
2. `src/utils/__tests__/entityKeyRegistry.test.ts` (unit)
3. `src/hooks/__tests__/useDrawerUrlState.test.ts` (unit)
4. `e2e/tests/drawer-url-security.spec.ts` (E2E - PII verification)
5. `e2e/tests/legacy-url-warning.spec.ts` (E2E)
6. `e2e/tests/url-migration.spec.ts` (E2E)
7. `e2e/tests/unresolved-link.spec.ts` (E2E)
8. `e2e/tests/cross-browser-link-sharing.spec.ts` (E2E - NEW)

**Regression Risks:**

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Hash collision in production | CRITICAL | LOW | Unit tests + integrity validation |
| Link breaks after 24h TTL | MEDIUM | HIGH | E2E tests with time manipulation |
| Cross-browser link failure | HIGH | MEDIUM | E2E tests with multiple browsers |
| localStorage disabled | LOW | LOW | Fallback to in-memory registry tests |
| Race condition on hash resolution | MEDIUM | MEDIUM | Async resolution tests with waitFor |

**Missing Test Scenarios in Plan:**
- ❌ Hash collision attack simulation
- ❌ Malicious tampering of stored registry data
- ❌ Browser storage quota exceeded (edge case)
- ❌ Rapid drawer open/close (race condition)
- ❌ Hash length brute force vulnerability
- ❌ Concurrent drawer open from multiple tabs

**Anti-Patterns to Avoid:**
1. **BLOCKING**: Do NOT test hash generation in isolation - test complete flow
2. **BLOCKING**: Do NOT mock entityKeyRegistry in drawer tests - test real integration
3. **BLOCKING**: Do NOT test URL format - test user can open drawer from copied URL

---

### Phase 3: TanStack Router Migration

**Test Coverage Required:**

| Test Type | Target Coverage | Priority | Rationale |
|-----------|----------------|----------|-----------|
| **Unit Tests** | 70%+ | MEDIUM | Route definitions are declarative |
| **Integration Tests** | 80%+ | HIGH | Auth redirect logic is critical |
| **E2E Tests** | 100% | CRITICAL | All 34 routes must work |
| **Performance Tests** | 100% | HIGH | No degradation allowed |

**Test Files Needed:**
1. `src/routes/__tests__/__root.test.tsx` (unit)
2. `src/routes/__tests__/_authenticated.test.tsx` (unit)
3. `src/router/__tests__/router.test.tsx` (integration)
4. `e2e/tests/route-navigation.spec.ts` (E2E - all 34 routes)
5. `e2e/tests/search-params.spec.ts` (E2E - Zod validation)
6. `e2e/tests/deep-linking.spec.ts` (E2E)
7. `e2e/tests/auth-redirect.spec.ts` (E2E)
8. `e2e/tests/route-performance.spec.ts` (Performance - NEW)

**Regression Risks:**

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Routes return 404 | CRITICAL | MEDIUM | E2E tests for all 34 routes |
| Search params not persisting | HIGH | HIGH | Integration tests with navigation |
| Auth redirect loop | CRITICAL | LOW | E2E tests with authenticated/unauthenticated states |
| Deep links broken | HIGH | MEDIUM | E2E tests with direct URL navigation |
| Performance degradation | MEDIUM | MEDIUM | Performance baseline comparison |

**E2E Test Migration Impact:**

**CRITICAL: 41 E2E test files require updates.**

**Affected Test Categories:**
- **Page Objects** (10 files): All require `getAuthenticatedUrl()` updates
- **Inline URL Helpers** (7 files): Must consolidate to centralized helpers
- **URL Assertions** (18 files): Must update regex patterns
- **Drawer Param Assertions** (6 files): Must update param names

**Migration Strategy:**
1. Create centralized URL helpers in `e2e/src/helpers/url.ts`
2. Update page objects to use new `buildUrl()` function
3. Update assertions to use `URLAssertions.routePattern()`
4. Feature flag support for gradual rollout

**Missing Test Scenarios in Plan:**
- ❌ Concurrent navigation (browser back during route load)
- ❌ Network failure during route transition
- ❌ Malformed search params handling
- ❌ Route load timeout scenarios
- ❌ Focus management for accessibility (mentioned in plan, no test)
- ❌ Router DevTools interaction

**Anti-Patterns to Avoid:**
1. **BLOCKING**: Do NOT test route definitions - test navigation works
2. **BLOCKING**: Do NOT test Zod schema - test invalid params show error
3. **BLOCKING**: Do NOT test TanStack Router internals - test user flow

---

### Phase 4: TanStack Tables + Virtualization

**Test Coverage Required:**

| Test Type | Target Coverage | Priority | Rationale |
|-----------|----------------|----------|-----------|
| **Unit Tests** | 85%+ | HIGH | Column adapter has edge cases |
| **Integration Tests** | 80%+ | HIGH | URL state sync is critical |
| **E2E Tests** | 90%+ | HIGH | Table interactions are core UX |
| **Performance Tests** | 100% | CRITICAL | Virtualization must not degrade |

**Test Files Needed:**
1. `src/components/table/__tests__/columnAdapter.test.ts` (unit)
2. `src/components/table/__tests__/TanStackTable.test.tsx` (unit)
3. `e2e/tests/table-sorting.spec.ts` (E2E)
4. `e2e/tests/table-virtualization.spec.ts` (E2E)
5. `e2e/tests/table-filtering.spec.ts` (E2E)
6. `e2e/tests/table-selection.spec.ts` (E2E)
7. `e2e/tests/table-performance.spec.ts` (Performance - NEW)

**Regression Risks:**

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Table rendering broken | HIGH | MEDIUM | Visual regression tests |
| Sorting state lost | MEDIUM | MEDIUM | URL state sync tests |
| Virtualization performance | CRITICAL | LOW | Performance benchmarks |
| Column resize broken | LOW | LOW | E2E interaction tests |
| Selection state lost | MEDIUM | LOW | Integration tests |

**Missing Test Scenarios in Plan:**
- ❌ Large dataset rendering (>10,000 rows)
- ❌ Rapid scroll performance
- ❌ Column resize edge cases
- ❌ Multi-column sort
- ❌ Sticky header behavior during scroll
- ❌ Table state persistence across navigation

**Anti-Patterns to Avoid:**
1. **BLOCKING**: Do NOT test TanStack Table API - test data renders correctly
2. **BLOCKING**: Do NOT test column definitions - test user can sort/filter
3. **BLOCKING**: Do NOT mock virtualization - test performance with real scrolling

---

### Phase 5: Drawer State Simplification

**Test Coverage Required:**

| Test Type | Target Coverage | Priority | Rationale |
|-----------|----------------|----------|-----------|
| **Unit Tests** | 80%+ | MEDIUM | Hook logic is straightforward |
| **Integration Tests** | 85%+ | HIGH | Drawer state sync is critical |
| **E2E Tests** | 95%+ | HIGH | Drawer is core UX pattern |

**Test Files Needed:**
1. `src/hooks/__tests__/useDrawerState.test.ts` (unit)
2. `e2e/tests/drawer-open-close.spec.ts` (E2E)
3. `e2e/tests/drawer-nested.spec.ts` (E2E)
4. `e2e/tests/drawer-deep-link.spec.ts` (E2E)
5. `e2e/tests/drawer-tab-state.spec.ts` (E2E)
6. `e2e/tests/drawer-shareable.spec.ts` (E2E)

**Regression Risks:**

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Drawer state lost | HIGH | MEDIUM | URL state persistence tests |
| Nested drawers broken | MEDIUM | MEDIUM | E2E tests with 2-level nesting |
| Tab state not persisting | LOW | LOW | Integration tests |
| Back button broken | HIGH | LOW | E2E browser navigation tests |

**Missing Test Scenarios in Plan:**
- ❌ Max nesting limit enforcement (plan says max 2, no test)
- ❌ Drawer close on navigation
- ❌ Drawer animation interruption
- ❌ Rapid open/close (race condition)
- ❌ Drawer stack overflow prevention

**Anti-Patterns to Avoid:**
1. **BLOCKING**: Do NOT test URL parameter parsing - test drawer opens from URL
2. **BLOCKING**: Do NOT test hash resolution separately - test complete flow
3. **BLOCKING**: Do NOT mock useDrawerState - test real drawer component

---

## Part 2: Test-Driven PR Strategy

### Test Execution Order Per Phase

**General Pattern (All Phases):**

```
1. Characterization Tests (existing behavior) → MUST PASS
2. Pre-implementation Tests (new behavior fails) → RED
3. Implementation → Implementation
4. Pre-implementation Tests → GREEN
5. Characterization Tests → STILL GREEN (no regression)
6. Migration Tests (backward compatibility) → GREEN
7. Post-implementation Tests (new features) → GREEN
```

---

### Phase 0: Preparatory Work

**Pre-Implementation Tests (Write BEFORE coding):**

1. **URL helper output format test**
   ```typescript
   it('buildUrl creates valid URL with params', () => {
     // RED: buildUrl doesn't exist yet
   })
   ```

2. **Feature flag default test**
   ```typescript
   it('all feature flags default to false', () => {
     // RED: Feature flag config doesn't exist
   })
   ```

3. **Search param schema test**
   ```typescript
   it('validates drawer detail param format', () => {
     // RED: Schema doesn't exist
   })
   ```

**Characterization Tests (Capture CURRENT behavior):**

1. **Existing E2E URL patterns test**
   ```typescript
   it('current E2E tests use /u/{base64}/ pattern', () => {
     // GREEN: Document current pattern
     // This test ensures we understand what we're migrating FROM
   })
   ```

**Post-Implementation Tests (Infrastructure verification):**

1. **URL helper backward compatibility test**
   ```typescript
   it('URL helpers generate both old and new formats', () => {
     // Verify helpers can generate legacy format for migration
   })
   ```

2. **Feature flag toggle test**
   ```typescript
   it('feature flags can be toggled at runtime', () => {
     // Verify rollback capability
   })
   ```

**Test Execution Order:**

```
PR 0.1: E2E URL Helpers
├─ Pre: url.test.ts (RED)
├─ Implement: buildUrl, buildDrawerUrl, URLAssertions
├─ Pre: url.test.ts (GREEN)
└─ Post: URL helpers compatible with existing tests (GREEN)

PR 0.2: Feature Flag Infrastructure
├─ Pre: featureFlags.test.ts (RED)
├─ Pre: useFeatureFlag.test.ts (RED)
├─ Implement: FeatureFlags config
├─ Pre: featureFlags.test.ts (GREEN)
├─ Pre: useFeatureFlag.test.ts (GREEN)
└─ Post: feature-flag-toggle.test.ts (GREEN)

PR 0.3: Performance Baseline
├─ No TDD (measurement, not implementation)
├─ Run: collect-performance-baseline.ts
├─ Verify: Output valid JSON with all routes
└─ Store: baseline-2025-01.json

PR 0.4: Blocking Items
├─ Pre: searchParamSerialization.test.ts (RED)
├─ Implement: Zod schemas
├─ Pre: searchParamSerialization.test.ts (GREEN)
└─ Audit: forwardRef-audit.md (documentation only)
```

---

### Phase 1: Impersonation State Migration

**Pre-Implementation Tests (Write BEFORE coding):**

1. **ImpersonationContext initialization test**
   ```typescript
   it('initializes with null when no stored value', () => {
     // RED: Context doesn't exist yet
   })
   ```

2. **sessionStorage persistence test**
   ```typescript
   it('persists impersonation target across refresh', () => {
     // RED: No persistence yet
   })
   ```

3. **Cache isolation test**
   ```typescript
   it('includes impersonation context in cache keys', () => {
     // RED: Cache keys don't include context
   })
   ```

**Characterization Tests (Capture CURRENT behavior):**

1. **URL-based impersonation test**
   ```typescript
   it('reads user from URL path (/u/{base64}/assets)', () => {
     // GREEN: Current behavior
     // MUST stay green during implementation
   })
   ```

2. **Cache key with URL user test**
   ```typescript
   it('cache keys include user from URL', () => {
     // GREEN: Current behavior
     // MUST stay green until switchover
   })
   ```

**Migration Tests (Backward compatibility):**

1. **Feature flag test**
   ```typescript
   it('falls back to URL when flag disabled', () => {
     // Verify rollback works
   })
   ```

2. **Dual-mode test**
   ```typescript
   it('works with both context and URL modes', () => {
     // During migration period
   })
   ```

**Post-Implementation Tests (New features):**

1. **OAuth restoration test**
   ```typescript
   it('restores impersonation after OAuth', () => {
     // NEW: OAuth handling
   })
   ```

2. **Tab isolation test**
   ```typescript
   it('impersonation isolated per tab', () => {
     // NEW: sessionStorage behavior
   })
   ```

**Test Execution Order:**

```
PR 1: Context Setup
├─ Pre: impersonation.test.tsx (RED)
├─ Char: URL-based-impersonation.test.tsx (GREEN)
├─ Implement: ImpersonationContext
├─ Pre: impersonation.test.tsx (GREEN)
└─ Char: URL-based-impersonation.test.tsx (STILL GREEN)

PR 2: Auth Integration
├─ Pre: impersonation.integration.test.tsx (RED)
├─ Implement: Auth context integration
├─ Pre: impersonation.integration.test.tsx (GREEN)
└─ Char: cache-keys.test.tsx (STILL GREEN)

PR 3: Feature Flag Switchover
├─ Migration: feature-flag.test.tsx (GREEN)
├─ Implement: Feature flag logic
├─ Post: oauth-restoration.test.tsx (GREEN)
└─ Post: tab-isolation.spec.ts (GREEN)
```

---

### Phase 2: PII-Free Drawer URLs

**Pre-Implementation Tests:**

1. **Hash generation test**
   ```typescript
   it('generates 8-character URL-safe hash', () => {
     // RED: hashEntityKey doesn't exist
   })
   ```

2. **Registry storage test**
   ```typescript
   it('stores and retrieves entity key by hash', () => {
     // RED: EntityKeyRegistry doesn't exist
   })
   ```

3. **PII-free URL test**
   ```typescript
   it('drawer URL contains no @ or email', () => {
     // RED: Current URLs have PII
   })
   ```

**Characterization Tests:**

1. **Current drawer URL format test**
   ```typescript
   it('drawer URL includes entity key directly', () => {
     // GREEN: ?assetDrawerKey=#asset#user@email.com
     // MUST stay green until Phase 2 activates
   })
   ```

**Migration Tests:**

1. **Legacy URL warning test**
   ```typescript
   it('shows warning for PII-containing URLs', () => {
     // Backward compatibility during migration
   })
   ```

2. **Hash resolution fallback test**
   ```typescript
   it('gracefully handles unresolved hashes', () => {
     // Cross-browser link sharing
   })
   ```

**Post-Implementation Tests:**

1. **Hash collision detection test**
   ```typescript
   it('detects and rejects tampered registry entries', () => {
     // NEW: Security validation
   })
   ```

2. **TTL expiration test**
   ```typescript
   it('shows dialog for expired hash (>24h)', () => {
     // NEW: Unresolved link handling
   })
   ```

**Test Execution Order:**

```
PR 1: Hashing Infrastructure
├─ Pre: entityKeyHasher.test.ts (RED)
├─ Pre: entityKeyRegistry.test.ts (RED)
├─ Implement: Hasher + Registry
├─ Pre: entityKeyHasher.test.ts (GREEN)
└─ Pre: entityKeyRegistry.test.ts (GREEN)

PR 2: Drawer URL Integration
├─ Pre: drawer-url-security.spec.ts (RED - PII in URL)
├─ Char: current-drawer-urls.test.tsx (GREEN)
├─ Implement: useDrawerUrlState hook
├─ Pre: drawer-url-security.spec.ts (GREEN - no PII)
└─ Char: current-drawer-urls.test.tsx (STILL GREEN with flag off)

PR 3: Legacy URL Handling
├─ Post: legacy-url-warning.spec.ts (GREEN)
├─ Post: unresolved-link.spec.ts (GREEN)
└─ Migration: hash-resolution-fallback.test.tsx (GREEN)
```

---

### Phase 3: TanStack Router Migration

**Pre-Implementation Tests:**

1. **Root route test**
   ```typescript
   it('renders root route with error boundary', () => {
     // RED: TanStack Router not configured
   })
   ```

2. **Type-safe navigation test**
   ```typescript
   it('navigation has type-safe to parameter', () => {
     // RED: Using React Router useNavigate
   })
   ```

3. **Search param validation test**
   ```typescript
   it('invalid search params show error', () => {
     // RED: No Zod validation yet
   })
   ```

**Characterization Tests:**

1. **All 34 routes load test**
   ```typescript
   it.each(ALL_ROUTES)('route %s loads correctly', (route) => {
     // GREEN: Current React Router behavior
     // MUST stay green during migration
   })
   ```

2. **Current URL format test**
   ```typescript
   it('URLs include /u/{base64email}/ prefix', () => {
     // GREEN: Current behavior
     // Will change after Phase 1 complete
   })
   ```

**Migration Tests:**

1. **Feature flag routing test**
   ```typescript
   it('uses TanStack Router when flag enabled', () => {
     // Dual-mode support
   })
   ```

2. **generatePath migration test**
   ```typescript
   it('navigation works without generatePath', () => {
     // 15 usages migrated
   })
   ```

**Post-Implementation Tests:**

1. **File-based routing test**
   ```typescript
   it('route discovery works from src/routes/', () => {
     // NEW: File-based routing
   })
   ```

2. **Route preloading test**
   ```typescript
   it('preloads route on intent hover', () => {
     // NEW: TanStack Router feature
   })
   ```

**Test Execution Order:**

```
PR 1: Router Setup (Small)
├─ Pre: root-route.test.tsx (RED)
├─ Implement: Install packages, vite config, __root.tsx
├─ Pre: root-route.test.tsx (GREEN)
└─ Char: all-routes-load.spec.ts (GREEN - old router still active)

PR 2-8: Route Migration Batches (5-10 routes each)
├─ Pre: route-navigation.spec.ts for batch (RED - routes don't exist)
├─ Implement: Migrate 5-10 routes
├─ Pre: route-navigation.spec.ts for batch (GREEN)
└─ Char: all-routes-load.spec.ts (STILL GREEN - old router fallback)

PR 9: Router Switchover
├─ Migration: feature-flag-routing.test.tsx (GREEN)
├─ Implement: Feature flag activation
├─ Post: file-based-routing.test.tsx (GREEN)
├─ Post: search-params.spec.ts (GREEN - Zod validation)
└─ Char: all-routes-load.spec.ts (GREEN - new router now)
```

---

### Phase 4: TanStack Tables + Virtualization

**Pre-Implementation Tests:**

1. **Column adapter test**
   ```typescript
   it('adapts legacy columns to TanStack format', () => {
     // RED: columnAdapter enhanced version doesn't exist
   })
   ```

2. **Virtualization test**
   ```typescript
   it('virtualizes table with >1000 rows', () => {
     // RED: TanStackTable doesn't have virtualization yet
   })
   ```

**Characterization Tests:**

1. **Legacy table rendering test**
   ```typescript
   it('AssetsTable renders all data', () => {
     // GREEN: Current Table component
     // MUST stay green during migration
   })
   ```

2. **Legacy sorting test**
   ```typescript
   it('clicking column header sorts data', () => {
     // GREEN: Current behavior
   })
   ```

**Migration Tests:**

1. **Per-table feature flag test**
   ```typescript
   it('uses TanStack Table when TANSTACK_TABLE_ASSETS=true', () => {
     // Granular rollback
   })
   ```

2. **Dual-table coexistence test**
   ```typescript
   it('legacy and new tables work side-by-side', () => {
     // During migration period
   })
   ```

**Post-Implementation Tests:**

1. **Virtualization performance test**
   ```typescript
   it('scrolls smoothly through 10,000 rows', () => {
     // NEW: Performance requirement
   })
   ```

2. **URL state sync test**
   ```typescript
   it('table sort persists in URL', () => {
     // NEW: TanStack Router integration
   })
   ```

**Test Execution Order:**

```
PR 1: Enhanced Infrastructure
├─ Pre: columnAdapter.test.ts (RED - new features)
├─ Pre: TanStackTable-virtualization.test.tsx (RED)
├─ Implement: Enhance columnAdapter, add virtualization
├─ Pre: columnAdapter.test.ts (GREEN)
└─ Pre: TanStackTable-virtualization.test.tsx (GREEN)

PR 2-6: Table Migration (1 table per PR)
├─ Char: assets-table-current.test.tsx (GREEN)
├─ Pre: assets-table-tanstack.test.tsx (RED)
├─ Migration: assets-table-feature-flag.test.tsx (GREEN)
├─ Implement: Migrate AssetsTable
├─ Pre: assets-table-tanstack.test.tsx (GREEN)
├─ Char: assets-table-current.test.tsx (STILL GREEN - flag off)
└─ Post: assets-table-performance.spec.ts (GREEN)

(Repeat for VulnerabilitiesTable, SeedsTable, JobsTable, SettingsTables)

PR 7: URL State Sync (Depends on Phase 3)
├─ Pre: table-url-sync.test.tsx (RED)
├─ Implement: TanStackTableWithUrl
├─ Pre: table-url-sync.test.tsx (GREEN)
└─ Post: table-sorting.spec.ts (GREEN - persists in URL)
```

---

### Phase 5: Drawer State Simplification

**Pre-Implementation Tests:**

1. **Unified drawer state test**
   ```typescript
   it('useDrawerState returns single detail param', () => {
     // RED: Current global.state has 20+ params
   })
   ```

2. **Nested drawer test**
   ```typescript
   it('supports max 2-level drawer nesting', () => {
     // RED: Current implementation different
   })
   ```

**Characterization Tests:**

1. **Current drawer params test**
   ```typescript
   it('drawer uses {type}DrawerKey params', () => {
     // GREEN: Current 20+ param system
     // MUST stay green during migration
   })
   ```

**Migration Tests:**

1. **Simplified drawer feature flag test**
   ```typescript
   it('uses unified state when SIMPLIFIED_DRAWER_STATE=true', () => {
     // Rollback support
   })
   ```

**Post-Implementation Tests:**

1. **global.state complexity reduction test**
   ```typescript
   it('global.state reduced from 1063 to ~300 lines', () => {
     // NEW: Code simplification verification
   })
   ```

2. **Shareable drawer link test**
   ```typescript
   it('copied drawer URL opens same drawer in new tab', () => {
     // NEW: Deep linking requirement
   })
   ```

**Test Execution Order:**

```
PR 1: useDrawerState Hook
├─ Pre: useDrawerState.test.ts (RED)
├─ Implement: Unified drawer state hook
├─ Pre: useDrawerState.test.ts (GREEN)
└─ Char: current-drawer-params.test.tsx (GREEN - old system still active)

PR 2: Drawer Component Migration
├─ Pre: drawer-unified-state.test.tsx (RED - not using new hook)
├─ Char: drawer-current-behavior.spec.ts (GREEN)
├─ Implement: Update all drawer components
├─ Pre: drawer-unified-state.test.tsx (GREEN)
├─ Char: drawer-current-behavior.spec.ts (STILL GREEN - flag off)
└─ Post: drawer-shareable.spec.ts (GREEN - new feature)

PR 3: global.state Cleanup
├─ Post: global-state-simplified.test.tsx (GREEN)
├─ Implement: Remove old drawer params from global.state
└─ Migration: drawer-feature-flag.test.tsx (GREEN)
```

---

## Part 3: Incremental Testing Approach

### Bite-Sized PR Strategy

**Goal:** Small PRs (≤500 LOC) with clear test gates

**General Pattern:**

```
PR Size: 1-3 tasks from phase plan
Test Gate: All new tests GREEN, no regression
Review: 1 hour max review time
Rollback: Feature flag per PR if possible
```

---

### Phase 0: Bite-Sized PR Breakdown

**PR 0.1: E2E URL Helpers (150 LOC)**
- **Tests MUST pass**: `url.test.ts` unit tests
- **Can skip**: Integration tests (not applicable)
- **Smoke test**: URL helpers generate valid URLs
- **Rollback**: Delete files (no dependencies yet)

**PR 0.2: Feature Flag Infrastructure (100 LOC)**
- **Tests MUST pass**: `useFeatureFlag.test.ts`, `featureFlags.test.ts`
- **Can skip**: None - foundation for all phases
- **Smoke test**: All flags default to false, can be toggled
- **Rollback**: Revert changes (flags not used yet)

**PR 0.3: Performance Baseline (50 LOC script)**
- **Tests MUST pass**: N/A (measurement, not code)
- **Verification**: JSON output valid, all routes measured
- **Smoke test**: Script runs without errors
- **Rollback**: N/A (no production impact)

**PR 0.4: Blocking Items (200 LOC)**
- **Tests MUST pass**: `searchParamSerialization.test.ts`
- **Can skip**: forwardRef audit (documentation only)
- **Smoke test**: Zod schemas validate expected inputs
- **Rollback**: Delete files (not used until Phase 3)

---

### Phase 1: Bite-Sized PR Breakdown

**PR 1: ImpersonationContext (200 LOC)**
- **Tests MUST pass**: `impersonation.test.tsx` unit tests
- **Can skip**: Integration tests (no auth integration yet)
- **Smoke test**: Context provides values, no crashes
- **Rollback**: Remove context, no flag needed (no production use yet)

**PR 2: Auth Integration (300 LOC)**
- **Tests MUST pass**: `impersonation.integration.test.tsx`
- **Can skip**: E2E tests (flag not activated)
- **Smoke test**: Cache keys include context value
- **Rollback**: Remove auth.tsx changes, context remains unused

**PR 3: Feature Flag Switchover (100 LOC)**
- **Tests MUST pass**: ALL impersonation tests (unit + integration + E2E)
- **Cannot skip**: ANY tests
- **Smoke test**: Impersonation works in production-like environment
- **Rollback**: Set `USE_CONTEXT_IMPERSONATION=false`

---

### Phase 2: Bite-Sized PR Breakdown

**PR 1: Hashing (150 LOC)**
- **Tests MUST pass**: `entityKeyHasher.test.ts` + `entityKeyRegistry.test.ts`
- **Can skip**: Integration tests (not integrated yet)
- **Smoke test**: Hashes generate consistently
- **Rollback**: Delete files (no dependencies yet)

**PR 2: useDrawerUrlState Hook (200 LOC)**
- **Tests MUST pass**: `useDrawerUrlState.test.ts`
- **Can skip**: E2E tests (not used in components yet)
- **Smoke test**: Hook resolves hashes correctly
- **Rollback**: Delete hook (no usage yet)

**PR 3: Drawer URL Integration (300 LOC)**
- **Tests MUST pass**: `drawer-url-security.spec.ts` (PII check)
- **Can skip**: Cross-browser tests (can be async)
- **Smoke test**: No email addresses visible in URL after opening drawer
- **Rollback**: Set `ENABLE_PII_FREE_URLS=false`

---

### Phase 3: Bite-Sized PR Breakdown

**PR 1: Router Setup (200 LOC)**
- **Tests MUST pass**: `root-route.test.tsx`, `authenticated-layout.test.tsx`
- **Can skip**: Route navigation tests (no routes yet)
- **Smoke test**: App renders without errors
- **Rollback**: Remove TanStack Router packages (not used yet)

**PR 2-8: Route Batches (200-300 LOC each)**
- **Tests MUST pass**: Route navigation for batch
- **Can skip**: Other batches' tests
- **Smoke test**: Batch routes load correctly
- **Rollback**: Delete route files (old router still active)

**PR 9: Router Switchover (150 LOC)**
- **Tests MUST pass**: ALL route tests (all 34 routes)
- **Cannot skip**: ANY navigation tests
- **Smoke test**: All routes load, no 404s, auth redirect works
- **Rollback**: Set `ENABLE_TANSTACK_ROUTER=false`

---

### Phase 4: Bite-Sized PR Breakdown

**PR 1: Table Infrastructure (200 LOC)**
- **Tests MUST pass**: `columnAdapter.test.ts`, `TanStackTable.test.tsx`
- **Can skip**: E2E tests (not used yet)
- **Smoke test**: TanStackTable renders correctly
- **Rollback**: Revert changes (not used in production yet)

**PR 2-6: Per-Table Migration (250-300 LOC each)**
- **Tests MUST pass**: Table-specific tests (unit + E2E for that table)
- **Can skip**: Other tables' tests
- **Smoke test**: Table renders, sorting works, no visual regression
- **Rollback**: Set `TANSTACK_TABLE_[TABLE]=false` (per-table flag)

---

### Phase 5: Bite-Sized PR Breakdown

**PR 1: useDrawerState Hook (200 LOC)**
- **Tests MUST pass**: `useDrawerState.test.ts`
- **Can skip**: Component integration tests (not integrated yet)
- **Smoke test**: Hook provides drawer state correctly
- **Rollback**: Delete hook (not used yet)

**PR 2: Drawer Components (400 LOC)**
- **Tests MUST pass**: Drawer E2E tests
- **Can skip**: Nested drawer tests (can be async)
- **Smoke test**: Drawer opens/closes, URL syncs
- **Rollback**: Set `SIMPLIFIED_DRAWER_STATE=false`

**PR 3: global.state Cleanup (200 LOC)**
- **Tests MUST pass**: No tests (code removal)
- **Smoke test**: App works, no console errors
- **Rollback**: Revert cleanup (old params unused but harmless)

---

### Handling Test Flakiness

**Prevention:**
1. **Use `waitFor`** for all async assertions (no arbitrary timeouts)
2. **Mock time** for time-dependent tests (no real delays)
3. **Isolate storage** per test (clear sessionStorage/localStorage)
4. **Stub network** with MSW (no real API calls)

**Detection:**
```bash
# Run tests 10x to detect flakiness
for i in {1..10}; do npm test; done
```

**Resolution Pattern:**
1. Identify flaky test
2. Add `condition-based-waiting` (not setTimeout)
3. Verify test is testing behavior, not implementation
4. Re-run 10x to confirm fix

**Flakiness Thresholds:**
- **Unit tests**: 0% flakiness allowed
- **Integration tests**: 0% flakiness allowed
- **E2E tests**: <1% flakiness acceptable (mark as flaky, investigate)

---

### Smoke Test Strategy Between Phases

**After Each Phase:**

```bash
# 1. Unit tests
npm test -- --coverage

# 2. Integration tests
npm test -- --grep "integration"

# 3. E2E smoke tests (critical paths only)
npx playwright test smoke.spec.ts

# 4. Performance baseline
npm run perf:baseline

# 5. Visual regression (screenshots)
npx playwright test --update-snapshots
```

**Critical Paths (Smoke Tests):**
1. Login → Dashboard → Logout
2. Impersonate customer → View assets → Stop impersonation
3. Open drawer → Navigate tabs → Close drawer
4. Sort table → Filter table → Navigate away
5. Deep link to drawer → Drawer opens correctly

**Pass Criteria:**
- All smoke tests GREEN
- Performance within 10% of baseline
- No visual regressions (or approved)

---

### Rollback Verification Tests

**After Rolling Back:**

```bash
# 1. Verify feature flag respected
npm test -- --grep "feature-flag"

# 2. Verify old behavior still works
npm test -- --grep "characterization"

# 3. Run full E2E suite
npx playwright test

# 4. Check error rates in monitoring
# (manual check in Sentry/Datadog)
```

**Rollback Success Criteria:**
- All characterization tests GREEN
- E2E tests GREEN
- No increase in error rates
- Users report no issues

---

## Part 4: Test Infrastructure Preparation

### Test Utilities to Create Upfront

**1. URL Helpers (`e2e/src/helpers/url.ts`)**

```typescript
export const USE_NEW_URL_FORMAT = process.env.TANSTACK_ROUTER_ENABLED === 'true';

export function buildUrl(
  route: string,
  options?: { userKey?: string; params?: Record<string, string> }
): string {
  if (USE_NEW_URL_FORMAT) {
    // New: /assets?detail=asset:hash
    const url = new URL(route, baseUrl);
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    return url.toString();
  } else {
    // Old: /u/{base64email}/assets
    const encodedUser = options?.userKey ? encode(options.userKey) : '';
    const path = encodedUser ? `/u/${encodedUser}${route}` : route;
    return new URL(path, baseUrl).toString();
  }
}

export const URLAssertions = {
  routePattern(route: string): RegExp {
    return new RegExp(`(/${route}|/[^/]+/${route})($|\\?|#)`);
  },
  drawerPattern(entityType?: 'asset' | 'risk' | 'seed'): RegExp {
    if (USE_NEW_URL_FORMAT) {
      return new RegExp(`detail=${entityType ?? '(asset|risk|seed)'}:`);
    }
    return new RegExp(`${entityType ?? '(vulnerability|asset|seed)'}DrawerKey=`);
  },
};
```

**2. Storage Test Helpers (`src/test-utils/storage.ts`)**

```typescript
export function mockSessionStorage() {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
}

export function injectStorageError(method: 'getItem' | 'setItem' | 'removeItem') {
  const original = sessionStorage[method];
  sessionStorage[method] = () => {
    throw new DOMException('QuotaExceededError');
  };
  return () => { sessionStorage[method] = original; };
}
```

**3. Router Test Helpers (`src/test-utils/router.ts`)**

```typescript
import { createMemoryRouter, RouterProvider } from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen';

export function renderWithRouter(
  component: React.ReactElement,
  { initialRoute = '/', ...options }: RenderOptions = {}
) {
  const router = createMemoryRouter({
    routeTree,
    context: {
      queryClient: testQueryClient,
      auth: mockAuthContext,
    },
  });

  router.navigate({ to: initialRoute });

  return render(
    <RouterProvider router={router}>
      {component}
    </RouterProvider>,
    options
  );
}
```

**4. Table Test Helpers (`src/test-utils/table.ts`)**

```typescript
export function generateLargeDataset(size: number) {
  return Array.from({ length: size }, (_, i) => ({
    id: `item-${i}`,
    name: `Item ${i}`,
    status: i % 2 === 0 ? 'active' : 'inactive',
  }));
}

export function measureRenderTime(fn: () => void): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}
```

---

### MSW Handler Changes

**Phase 1: Impersonation Headers**

```typescript
// Add to src/test/mocks/handlers.ts
http.get('*/my', ({ request }) => {
  const accountHeader = request.headers.get('account');

  // Return data based on impersonated user
  if (accountHeader === 'customer@example.com') {
    return HttpResponse.json({ count: 1, my: customerSettings });
  }

  // Default admin data
  return HttpResponse.json({ count: 1, my: adminSettings });
}),
```

**Phase 2: Entity Key Hashing**

```typescript
// New: Hash-based drawer endpoints
http.get('*/asset/:hash', ({ params }) => {
  const { hash } = params;

  // Simulate hash resolution
  const entityKey = hashToKeyMap.get(hash);
  if (!entityKey) {
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return HttpResponse.json(assetData[entityKey]);
}),
```

**Phase 3: Route-Specific Handlers**

```typescript
// Update handlers for TanStack Router routes
http.get('*/assets', ({ request }) => {
  const url = new URL(request.url);
  const status = url.searchParams.get('status'); // Zod-validated

  return HttpResponse.json({
    assets: mockAssets.filter(a => !status || a.status === status),
  });
}),
```

---

### Playwright Fixture Updates

**Phase 1: Impersonation Fixture**

```typescript
// e2e/fixtures/impersonation.ts
export const test = base.extend<{ impersonate: ImpersonateFixture }>({
  impersonate: async ({ page, context }, use) => {
    const impersonate = async (email: string) => {
      // NEW: Set context instead of URL
      await context.addInitScript(({ email }) => {
        sessionStorage.setItem('chariot_impersonation_target', email);
      }, { email });

      await page.reload();
    };

    await use(impersonate);
  },
});
```

**Phase 2: Hash Registry Fixture**

```typescript
// e2e/fixtures/entityRegistry.ts
export const test = base.extend<{ withEntityHash: WithEntityHashFixture }>({
  withEntityHash: async ({ page, context }, use) => {
    const registerHash = async (entityKey: string, hash: string) => {
      await context.addInitScript(({ entityKey, hash }) => {
        const entry = {
          key: entityKey,
          hash: hash,
          storedAt: Date.now(),
        };
        localStorage.setItem(`drawer_${hash}`, JSON.stringify(entry));
      }, { entityKey, hash });
    };

    await use(registerHash);
  },
});
```

**Phase 3: Router Fixture**

```typescript
// e2e/fixtures/router.ts
export const test = base.extend<{ withRouter: WithRouterFixture }>({
  withRouter: async ({ page }, use) => {
    const navigateTo = async (route: string, params?: Record<string, string>) => {
      const url = buildUrl(route, { params });
      await page.goto(url);
    };

    await use(navigateTo);
  },
});
```

---

### Test Data / Factory Changes

**Phase 1: User Fixtures**

```typescript
// src/fixtures/users.ts
export const TEST_USERS = {
  ADMIN: {
    email: 'admin@praetorian.com',
    role: 'admin',
    isPraetorianUser: true,
  },
  CUSTOMER: {
    email: 'customer@example.com',
    role: 'customer',
    isPraetorianUser: false,
  },
};

export const TEST_IMPERSONATION = {
  ADMIN_AS_CUSTOMER: {
    me: TEST_USERS.ADMIN.email,
    targetUser: TEST_USERS.CUSTOMER.email,
    isImpersonating: true,
  },
};
```

**Phase 2: Entity Key Fixtures**

```typescript
// src/fixtures/entities.ts
export const TEST_ENTITIES = {
  ASSET_1: {
    key: '#asset#test-asset-1',
    hash: 'abc123de',
    name: 'Test Asset 1',
  },
  RISK_1: {
    key: '#risk#test-risk-1',
    hash: 'xyz789gh',
    name: 'Test Vulnerability 1',
  },
};
```

**Phase 3: Route Fixtures**

```typescript
// src/fixtures/routes.ts
export const TEST_ROUTES = {
  DASHBOARD: '/insights',
  ASSETS: '/assets',
  ASSETS_WITH_FILTER: { to: '/assets', search: { status: 'active' } },
  ASSET_DRAWER: { to: '/assets', search: { detail: 'asset:abc123de' } },
};
```

---

### CI Pipeline Considerations

**Add to CI Pipeline (.github/workflows/test.yml):**

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm test -- --coverage --reporter=json --outputFile=coverage.json
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Run integration tests
        run: npm test -- --grep "integration"

  e2e-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npx playwright test --project=${{ matrix.browser }}
      - name: Upload trace on failure
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-traces-${{ matrix.browser }}
          path: test-results/

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Run performance baseline
        run: npm run perf:baseline
      - name: Compare with previous baseline
        run: npm run perf:compare

  test-reality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Verify test coverage reality
        run: |
          TEST_COUNT=$(find src -name "*.test.tsx" | wc -l)
          PROD_COUNT=$(find src -name "*.tsx" ! -name "*.test.tsx" | wc -l)
          COVERAGE=$((TEST_COUNT * 100 / PROD_COUNT))
          echo "Test Coverage Reality: $TEST_COUNT of $PROD_COUNT files ($COVERAGE%)"
          if [ $COVERAGE -lt 20 ]; then
            echo "⚠️  Warning: Coverage below 20%"
          fi
```

**Feature Flag Configuration:**

```yaml
env:
  TANSTACK_ROUTER_ENABLED: ${{ matrix.use-tanstack-router }}
  ENABLE_PII_FREE_URLS: ${{ matrix.use-pii-free-urls }}
  SIMPLIFIED_DRAWER_STATE: ${{ matrix.use-simplified-drawer }}
```

**Multi-Configuration Matrix:**

```yaml
strategy:
  matrix:
    use-tanstack-router: [true, false]
    use-pii-free-urls: [true, false]
```

This tests all feature flag combinations to ensure rollback compatibility.

---

## Summary & Recommendations

### Critical Testing Priorities

1. **Security Testing (Phase 1 & 2):** MUST have 100% coverage - these are attack vectors
2. **Regression Testing (All Phases):** Characterization tests MUST stay green
3. **E2E Test Migration (Phase 3):** 41 files need updates - dedicate sprint to this
4. **Performance Testing (Phase 4):** Baseline before, compare after

### Test Infrastructure Setup (Do FIRST)

1. Create URL helpers (`e2e/src/helpers/url.ts`)
2. Create storage test helpers (`src/test-utils/storage.ts`)
3. Update MSW handlers for impersonation headers
4. Create Playwright fixtures for new features

### Recommended Test Order

```
1. Write test infrastructure (1 day)
2. Write characterization tests (2 days per phase)
3. Write pre-implementation tests (1 day per phase)
4. Implement feature (per phase plan)
5. Write post-implementation tests (1 day per phase)
6. Update E2E tests (3 days for Phase 3)
```

### Test Metrics Targets

| Phase | Unit Coverage | Integration Coverage | E2E Coverage | Performance |
|-------|---------------|---------------------|--------------|-------------|
| 0 | 90%+ | 80%+ | N/A | Baseline captured |
| 1 | 80%+ | 90%+ | 100% | N/A |
| 2 | 90%+ | 85%+ | 95%+ | N/A |
| 3 | 70%+ | 80%+ | 100% | Within 10% |
| 4 | 85%+ | 80%+ | 90%+ | Within 10% |
| 5 | 80%+ | 85%+ | 95%+ | N/A |

### Risk Mitigation

**Highest Risks:**
1. **E2E test migration breaking CI** - Mitigate with gradual rollout, feature flags
2. **Performance degradation** - Mitigate with baseline comparison, performance tests
3. **Security vulnerabilities** - Mitigate with 100% security test coverage
4. **Test flakiness** - Mitigate with condition-based waiting, no arbitrary timeouts

**Risk Mitigation Strategy:**
- Feature flags for ALL phases (rollback capability)
- Characterization tests to prevent regression
- Performance baselines before each phase
- Security-focused E2E tests

---

## Metadata

```json
{
  "agent": "test-lead",
  "output_type": "test-plan",
  "timestamp": "2025-12-31T18:45:00Z",
  "feature_directory": ".claude/features/2025-12-31-url-refactoring",
  "skills_invoked": [
    "calibrating-time-estimates",
    "enforcing-evidence-based-analysis",
    "gateway-testing",
    "persisting-agent-outputs",
    "writing-plans",
    "verifying-before-completion"
  ],
  "library_skills_read": [
    ".claude/skill-library/testing/testing-anti-patterns/SKILL.md",
    ".claude/skill-library/testing/behavior-vs-implementation-testing/SKILL.md",
    ".claude/skill-library/testing/condition-based-waiting/SKILL.md",
    ".claude/skill-library/testing/test-infrastructure-discovery/SKILL.md",
    ".claude/skill-library/testing/verifying-test-metrics-reality/SKILL.md",
    ".claude/skill-library/testing/verifying-test-file-existence/SKILL.md"
  ],
  "source_files_verified": [
    "2025-12-31-url-refactoring/PLAN.md",
    "2025-12-31-url-refactoring/phase-0-preparatory-work.md",
    "2025-12-31-url-refactoring/phase-1-impersonation.md",
    "2025-12-31-url-refactoring/phase-2-pii-free-urls.md",
    "2025-12-31-url-refactoring/phase-3-tanstack-router.md",
    "2025-12-31-url-refactoring/phase-4-tanstack-tables.md",
    "2025-12-31-url-refactoring/phase-5-drawer-simplification.md",
    "2025-12-31-url-refactoring/appendices/testing-strategy.md",
    "2025-12-31-url-refactoring/appendices/rollback-procedures.md"
  ],
  "status": "complete",
  "handoff": {
    "next_agent": "frontend-tester",
    "context": "Implement tests according to this plan, phase by phase"
  }
}
```
