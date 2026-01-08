# Testing Strategy

This document outlines the testing approach for the URL refactoring project.

---

## Testing Layers

### Unit Tests (Vitest)

Each phase includes unit tests for:
- New hooks
- Utility functions
- Component behavior

**Coverage Target**: 80%+ for new code

### Integration Tests (React Testing Library)

Test component interactions:
- Table + Router state sync
- Drawer open/close flows
- Cache invalidation

### E2E Tests (Playwright)

Full user workflow tests:
- Navigation flows
- URL state persistence
- Cross-browser compatibility

---

## E2E Test Migration Impact

### Impact Summary

| Category | Count | Impact |
|----------|-------|--------|
| **Page Objects** | 10 files | ALL require `getAuthenticatedUrl()` updates |
| **Inline URL Helpers** | 7 files | Must consolidate to centralized helpers |
| **URL Assertions** | 18 files | Must update regex patterns |
| **Drawer Param Assertions** | 6 files | Must update param names |
| **Total Test Files** | 41 files | Affected by URL changes |

### Key URL Changes

| Aspect | OLD (React Router) | NEW (TanStack Router) |
|--------|-------------------|----------------------|
| URL Path | `/{base64Email}/assets` | `/assets` |
| User Context | URL path contains encoded email | sessionStorage impersonation |
| Drawer State | `?vulnerabilityDrawerKey=...` | `?detail=risk:hash` |

---

## E2E Test Migration Checklist

Use this checklist for **each E2E test file** that needs migration:

### Pre-Migration

- [ ] Identify all URL construction patterns (hardcoded paths, getAuthenticatedUrl, etc.)
- [ ] Identify all URL assertions (regex patterns, contains checks, etc.)
- [ ] Identify all drawer param assertions
- [ ] Document current test behavior for comparison

### Migration Steps

- [ ] Update imports to use centralized URL helpers from `e2e/src/helpers/url.ts`
- [ ] Replace hardcoded URL patterns with `buildUrl()` calls
- [ ] Replace manual URL construction with helper functions
- [ ] Update assertions to use `URLAssertions.routePattern()`
- [ ] Update drawer assertions to use `URLAssertions.drawerPattern()`
- [ ] Add feature flag check if test has conditional behavior

### Verification

- [ ] Test passes with `TANSTACK_ROUTER_ENABLED=true` (new behavior)
- [ ] Test passes with `TANSTACK_ROUTER_ENABLED=false` (rollback compatibility)
- [ ] Screenshot comparison shows no visual regressions
- [ ] Test execution time hasn't significantly increased
- [ ] No flaky behavior introduced (run 3x to verify)

---

## URL Helper Infrastructure

**Create:** `modules/chariot/ui/e2e/src/helpers/url.ts`

```typescript
export const USE_NEW_URL_FORMAT = process.env.TANSTACK_ROUTER_ENABLED === 'true';

export function buildUrl(
  route: string,
  options?: { userKey?: string; params?: Record<string, string> }
): string {
  const baseUrl = process.env.BASE_URL || 'https://localhost:3000';

  if (USE_NEW_URL_FORMAT) {
    // New format: /assets?params
    const url = new URL(route, baseUrl);
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    return url.toString();
  } else {
    // Old format: /u/{base64email}/assets?params
    const encodedUser = options?.userKey ? encode(options.userKey) : '';
    const path = encodedUser ? `/u/${encodedUser}${route}` : route;
    const url = new URL(path, baseUrl);
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    return url.toString();
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

---

## Example Migration

### Before

```typescript
// Hardcoded URL construction
await page.goto(`https://localhost:3000/u/${encode(user)}/assets`);
await expect(page).toHaveURL(/\/assets/);
await expect(page).toHaveURL(/assetDrawerKey=/);
```

### After

```typescript
// Using centralized helpers
await page.goto(buildUrl('/assets', { userKey: user }));
await expect(page).toHaveURL(URLAssertions.routePattern('assets'));
await expect(page).toHaveURL(URLAssertions.drawerPattern('asset'));
```

---

## Phase-Specific Test Deliverables

### Phase 1: Impersonation

| Test File | Description |
|-----------|-------------|
| `impersonation-context.spec.ts` | Verify impersonation works without URL |
| `impersonation-persistence.spec.ts` | Verify sessionStorage persistence |
| `impersonation-tab-isolation.spec.ts` | Verify tab isolation behavior |
| `impersonation-oauth.spec.ts` | Verify OAuth preserves impersonation |

### Phase 2: PII-Free URLs

| Test File | Description |
|-----------|-------------|
| `drawer-url-security.spec.ts` | Verify no PII in URL when opening drawer |
| `legacy-url-warning.spec.ts` | Verify warning shown for legacy URLs |
| `url-migration.spec.ts` | Verify "Update Link" migrates to hash format |
| `unresolved-link.spec.ts` | Verify graceful handling of unresolved hashes |

### Phase 3: TanStack Router

| Test File | Description |
|-----------|-------------|
| `route-navigation.spec.ts` | Verify all 34 routes load correctly |
| `search-params.spec.ts` | Verify search param validation |
| `deep-linking.spec.ts` | Verify direct URL navigation |
| `auth-redirect.spec.ts` | Verify unauthenticated redirect to login |

### Phase 4: TanStack Tables

| Test File | Description |
|-----------|-------------|
| `table-sorting.spec.ts` | Verify sorting works correctly |
| `table-virtualization.spec.ts` | Verify virtualization with large datasets |
| `table-filtering.spec.ts` | Verify filtering works |
| `table-selection.spec.ts` | Verify row selection |

### Phase 5: Drawer Simplification

| Test File | Description |
|-----------|-------------|
| `drawer-open-close.spec.ts` | Verify drawers open/close correctly |
| `drawer-nested.spec.ts` | Verify nested drawers (max 2) work |
| `drawer-deep-link.spec.ts` | Verify direct navigation to drawer URLs |
| `drawer-tab-state.spec.ts` | Verify tab selection persists in URL |
| `drawer-shareable.spec.ts` | Verify copy/paste URL opens correct drawer |

---

## Performance Testing

### Baseline Collection

Run before and after each phase:

```bash
npx ts-node scripts/collect-performance-baseline.ts
```

### Metrics to Track

| Metric | Target | Alert | Critical |
|--------|--------|-------|----------|
| LCP | <2.5s | <3.0s | <4.0s |
| FCP | <1.8s | <2.5s | <3.5s |
| TBT | <200ms | <300ms | <500ms |
| CLS | <0.1 | <0.15 | <0.25 |
| TTI | <3.5s | <4.5s | <6.0s |
| Route Load | <200ms | <300ms | <500ms |
| Performance Score | >90 | >85 | >80 |

---

## Test Coverage Requirements

| Component | Minimum Coverage |
|-----------|-----------------|
| `impersonation.tsx` | 80% |
| `entityKeyHasher.ts` | 90% |
| `entityKeyRegistry.ts` | 85% |
| `useDrawerState.ts` | 80% |
| `columnAdapter.ts` | 85% |
| Route components | 70% |
