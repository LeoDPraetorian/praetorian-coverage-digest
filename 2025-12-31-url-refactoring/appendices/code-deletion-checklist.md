# Code Deletion Checklist

Track deprecated code removal throughout the URL refactoring project.

---

## Purpose

This checklist ensures:
1. Dead code is removed (not left as tech debt)
2. Removal happens at the right time (after feature flags confirm stability)
3. Nothing is removed prematurely

---

## Deletion Criteria

Code can be deleted when:
- [ ] Feature flag has been `true` in production for 2+ weeks
- [ ] No rollbacks occurred during that period
- [ ] Monitoring shows no errors related to new implementation
- [ ] Team sign-off obtained

---

## Phase 1: Impersonation (Post-Stability)

### After `USE_CONTEXT_IMPERSONATION` is stable:

| File | Lines/Functions to Remove | Status |
|------|---------------------------|--------|
| `src/state/auth.tsx` | `splitPath` URL parsing logic (lines ~493-502) | Pending |
| `src/state/auth.tsx` | `decode(decodeURIComponent(base64UserId))` pattern | Pending |
| `src/utils/urlHelpers.ts` | `encodeUserIdForPath()` (if exists) | Pending |
| `src/utils/urlHelpers.ts` | `decodeUserIdFromPath()` (if exists) | Pending |

### E2E Tests to Update:
| Test File | Pattern to Remove |
|-----------|-------------------|
| `e2e/tests/impersonation.spec.ts` | URL assertions for `/u/{base64}/` | Pending |

---

## Phase 2: PII-Free URLs (Post-Stability)

### After `ENABLE_PII_FREE_URLS` is stable:

| File | Lines/Functions to Remove | Status |
|------|---------------------------|--------|
| `src/hooks/useOpenEntityDrawer.ts` | Legacy branch with direct key in URL | Pending |
| `src/components/LegacyUrlWarning.tsx` | Entire file (after grace period) | Pending |

### Migration Scripts:
| Script | Purpose | Delete After |
|--------|---------|--------------|
| `scripts/migrate-legacy-urls.ts` | Convert bookmarks | 30 days post-launch |

---

## Phase 3: TanStack Router (Post-Stability)

### After `TANSTACK_ROUTER_ALL` is stable:

| File | Lines/Functions to Remove | Status |
|------|---------------------------|--------|
| `src/routes.tsx` | Entire React Router route definitions | Pending |
| `src/components/AppRoutes.tsx` | React Router wrapper (if exists) | Pending |
| `package.json` | `react-router-dom` dependency | Pending |
| All files | `import { ... } from 'react-router-dom'` | Pending |

### Legacy Route Files:
| Directory | Files to Delete |
|-----------|-----------------|
| `src/pages/legacy/` | All files (if dual-router pattern used) | Pending |

### Feature Flags to Remove:
| Flag | Remove After |
|------|--------------|
| `TANSTACK_ROUTER_INSIGHTS` | When `TANSTACK_ROUTER_ALL` is stable |
| `TANSTACK_ROUTER_ASSETS` | When `TANSTACK_ROUTER_ALL` is stable |
| `TANSTACK_ROUTER_VULNERABILITIES` | When `TANSTACK_ROUTER_ALL` is stable |
| `TANSTACK_ROUTER_SEEDS` | When `TANSTACK_ROUTER_ALL` is stable |
| `TANSTACK_ROUTER_JOBS` | When `TANSTACK_ROUTER_ALL` is stable |
| `TANSTACK_ROUTER_SETTINGS` | When `TANSTACK_ROUTER_ALL` is stable |
| `TANSTACK_ROUTER_AUTH` | When `TANSTACK_ROUTER_ALL` is stable |

---

## Phase 4: TanStack Tables (Post-Stability)

### After individual table flags are stable:

| File | Lines/Functions to Remove | Status |
|------|---------------------------|--------|
| `src/components/table/LegacyTable.tsx` | Entire file | Pending |
| `src/components/assets/LegacyAssetsTable.tsx` | Entire file | Pending |
| `src/components/vulnerabilities/LegacyVulnerabilitiesTable.tsx` | Entire file | Pending |

### Feature Flags to Remove:
| Flag | Remove After |
|------|--------------|
| `TANSTACK_TABLE_ASSETS` | 2 weeks stable in production |
| `TANSTACK_TABLE_VULNERABILITIES` | 2 weeks stable in production |
| `TANSTACK_TABLE_SEEDS` | 2 weeks stable in production |
| `TANSTACK_TABLE_JOBS` | 2 weeks stable in production |

---

## Phase 5: Drawer State (Post-Stability)

### After `SIMPLIFIED_DRAWER_STATE` is stable:

| File | Lines/Functions to Remove | Status |
|------|---------------------------|--------|
| `src/state/global.state.tsx` | 12+ `{type}DrawerKey` params (~700 lines) | Pending |
| `src/state/global.state.tsx` | `drawerOrder` array and logic | Pending |
| `src/hooks/useLegacyDrawerState.ts` | Entire file (if exists) | Pending |

---

## Final Cleanup (After All Phases)

### Bundle Size Verification:
```bash
# Before cleanup
npm run build && ls -la dist/assets/*.js | awk '{sum+=$5} END {print sum}'

# After cleanup
npm run build && ls -la dist/assets/*.js | awk '{sum+=$5} END {print sum}'

# Target: 10-20% reduction from removed dependencies
```

### Dependencies to Remove:
| Package | Remove After |
|---------|--------------|
| `react-router-dom` | Phase 3 complete + 2 weeks |

### Files to Delete:
| Pattern | Count | Remove After |
|---------|-------|--------------|
| `**/Legacy*.tsx` | TBD | All phases complete |
| `**/legacy/**` | TBD | All phases complete |

---

## Tracking Template

Use this template when removing code:

```markdown
## Removal: [File/Function Name]

**Date:** YYYY-MM-DD
**Phase:** N
**Feature Flag:** [FLAG_NAME]
**Flag Status:** Stable since YYYY-MM-DD

### Pre-Removal Checklist:
- [ ] Flag has been true for 2+ weeks
- [ ] No rollbacks in that period
- [ ] Monitoring shows no errors
- [ ] Team sign-off: @[name]

### Removal:
- [ ] Code removed
- [ ] Tests updated
- [ ] PR approved
- [ ] Deployed to production
- [ ] Verified no errors

### Post-Removal:
- [ ] Added to this checklist as "Complete"
- [ ] Bundle size verified
```

---

## Completed Removals

| Date | Item | Phase | Verified By |
|------|------|-------|-------------|
| (None yet) | | | |
