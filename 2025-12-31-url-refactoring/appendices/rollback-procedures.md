# Rollback Procedures

This document contains rollback strategies for each phase of the URL refactoring project.

---

## Feature Flag Strategy

| Phase | Flag Name | Default | Fallback Behavior |
|-------|-----------|---------|-------------------|
| 1 | `USE_CONTEXT_IMPERSONATION` | `false` | URL-based impersonation |
| 2 | `ENABLE_PII_FREE_URLS` | `false` | Entity key in URL (with PII) |
| 3 | `ENABLE_TANSTACK_ROUTER` | `false` | React Router v7 |
| 4 | `TANSTACK_TABLE_[ENTITY]` | `false` | Legacy Table component |
| 5 | `SIMPLIFIED_DRAWER_STATE` | `false` | Current drawer params |

### Rollout Strategy

1. **Canary**: Enable for Praetorian users only
2. **Beta**: Enable for opt-in customers
3. **GA**: Enable for all users
4. **Cleanup**: Remove flag and old code

---

## Phase 1 Rollback: Impersonation Context

### Trigger Conditions

- Impersonation state not persisting across page refresh
- Cache isolation breaking (queries returning wrong user's data)
- sessionStorage errors causing app crashes
- OAuth flow losing impersonation state

### Rollback Steps

**1. Disable Feature Flag**

```typescript
// Set in feature flag service or environment variable
USE_CONTEXT_IMPERSONATION=false
```

**2. Clear User Sessions**

```javascript
// Add to rollback script or run in browser console
sessionStorage.removeItem('chariot_impersonation_target');
sessionStorage.removeItem('oauth_impersonation_restore');
```

**3. Verify Rollback**

- [ ] Impersonation works via URL (e.g., `/u/base64email/assets`)
- [ ] Cache keys include user from URL, not from context
- [ ] No console errors related to ImpersonationContext
- [ ] OAuth flow works without state loss

**4. Monitor for 24 Hours**

Watch error monitoring for:
- `useImpersonation must be within ImpersonationProvider`
- `sessionStorage` errors
- Cache key mismatches

### Communication Template

```
[ROLLBACK] Impersonation Context Feature

We've temporarily rolled back the context-based impersonation feature
due to [specific issue]. Impersonation now works via URL as before.

Impact: No user-facing changes. Impersonation continues to work.
Timeline: Investigating issue, ETA [X] hours for resolution.
```

---

## Phase 2 Rollback: PII-Free URLs

### Trigger Conditions

- Hash resolution failing
- Drawer not opening from URL
- Legacy URL warning causing issues
- Storage errors

### Rollback Steps

**1. Disable Feature Flag**

```typescript
ENABLE_PII_FREE_URLS=false
```

**2. Verify Rollback**

- [ ] Drawers open with entity key directly in URL
- [ ] No hash resolution errors
- [ ] Legacy URL format working

---

## Phase 3 Rollback: TanStack Router

### Trigger Conditions

- Routes not loading (blank screens, 404 errors)
- Navigation breaking (links not working, back button issues)
- Search params not persisting
- Authentication redirects failing
- Performance degradation (>500ms route load time)

### Rollback Steps

**1. Disable Feature Flag**

```typescript
// Set in feature flag service
ENABLE_TANSTACK_ROUTER=false
```

**2. Clear Browser State**

```javascript
// Instruct users to hard refresh or clear cache
localStorage.clear();
sessionStorage.clear();
window.location.reload(true);
```

**3. Verify Rollback**

- [ ] All 34 authenticated routes load correctly
- [ ] Old URL format works (`/u/{base64email}/route`)
- [ ] generatePath() calls work
- [ ] React Router v7 DevTools shows correct state
- [ ] No route-related errors in console

**4. Database of Known Issues**

Keep log of issues that triggered rollback:
- Route X returning 404 → Root cause: [...]
- Search params not validating → Root cause: [...]
- Auth redirect loop → Root cause: [...]

### Rollback Deployment

```bash
# Emergency rollback script
cd modules/chariot/ui
git revert [commit-hash]  # Revert TanStack Router merge
npm install
npm run build
# Deploy to production
make deploy-frontend
```

### Communication Template

```
[ROLLBACK] TanStack Router Migration

We've temporarily rolled back the router migration due to [specific issue].
The application is now using the previous routing system.

Impact: URLs may change format. Please refresh your browser.
Timeline: Investigating issue, ETA [X] hours for fix.
```

---

## Phase 4 Rollback: TanStack Tables

### Trigger Conditions

- Tables not rendering data correctly
- Sorting/filtering broken
- Performance regression (>200ms slower than baseline)
- Selection state not persisting
- Pagination breaking

### Rollback Steps

**1. Disable Per-Table Feature Flags**

```typescript
// Roll back one table at a time
TANSTACK_TABLE_ASSETS=false
TANSTACK_TABLE_VULNERABILITIES=false
// ... etc
```

**2. Verify Each Table**

- [ ] Data renders correctly
- [ ] Sorting works (client and server-side)
- [ ] Filtering works
- [ ] Selection persists
- [ ] Pagination works
- [ ] Virtualization works for large datasets

### Per-Table Rollback Priority

1. High-traffic tables first (Assets, Vulnerabilities)
2. Medium-traffic tables (Seeds, Jobs)
3. Low-traffic tables (Settings tables)

---

## Phase 5 Rollback: Drawer State Simplification

### Trigger Conditions

- Drawers not opening
- Drawer state not persisting in URL
- Nested drawers breaking
- Tab state lost on navigation

### Rollback Steps

**1. Disable Feature Flag**

```typescript
SIMPLIFIED_DRAWER_STATE=false
```

**2. Verify Old Drawer Behavior**

- [ ] Drawers open with `{type}DrawerKey` params
- [ ] Nested drawers work (max 2 levels)
- [ ] Tab state persists in URL
- [ ] Browser back/forward works correctly

---

## Monitoring During Rollout

### Key Metrics to Track

| Metric | Baseline | Alert Threshold | Critical Threshold |
|--------|----------|-----------------|-------------------|
| Route load time (p95) | 200ms | 300ms | 500ms |
| Error rate | 0.1% | 0.5% | 1.0% |
| 404 rate | 0.05% | 0.2% | 0.5% |
| Cache hit rate | 85% | 80% | 75% |
| Impersonation success rate | 99.9% | 99.5% | 99.0% |

### Error Monitoring Queries

```javascript
// Sentry/monitoring service queries

// Phase 0 errors
"useImpersonation must be within ImpersonationProvider"
"sessionStorage.setItem failed"
"OAuth impersonation restore failed"

// Phase 1 errors
"Route not found"
"TanStack Router failed to load"
"validateSearch failed"
"Authentication redirect failed"

// Phase 2 errors
"useReactTable is not a function"
"Table data undefined"
"Sorting failed"
```

### Automated Rollback Triggers

```typescript
// Example automated rollback logic
if (errorRate > CRITICAL_THRESHOLD && duration > 5_MINUTES) {
  await disableFeatureFlag(CURRENT_PHASE_FLAG);
  await notifyTeam('Automated rollback triggered');
  await createIncident({
    severity: 'critical',
    phase: CURRENT_PHASE,
    reason: 'Error rate exceeded critical threshold',
  });
}
```
