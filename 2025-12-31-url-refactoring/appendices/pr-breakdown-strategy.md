# PR Breakdown Strategy

This document provides the detailed PR breakdown for each phase, addressing the three-agent review feedback that large PRs are unreviewable.

---

## Guiding Principles

### PR Size Targets

| Metric | Target | Max |
|--------|--------|-----|
| Files changed | 5-10 | 15 |
| Lines of code | 200-400 | 500 |
| Review time | 1-2 hours | 4 hours |

### PR Quality Gates

Each PR must:
- [ ] Pass all existing tests
- [ ] Include new tests for new code
- [ ] Have clear, atomic scope
- [ ] Be independently mergeable
- [ ] Support rollback without breaking other PRs

---

## Phase 0: Preparatory Work (4 PRs)

| PR | Title | Files | LOC | Dependencies |
|----|-------|-------|-----|--------------|
| 0.1 | Add E2E URL helpers | 3 | ~200 | None |
| 0.2 | Verify feature flag infrastructure | 2 | ~100 | None |
| 0.3 | Collect performance baseline | 2 | ~150 | None |
| 0.4 | Resolve blocking items B1, B2 | 2 | ~200 | None |

**Parallel:** All PRs can be done in parallel.

---

## Phase 1: Impersonation (4 PRs)

| PR | Title | Files | LOC | Dependencies | Risk |
|----|-------|-------|-----|--------------|------|
| 1.1 | Create ImpersonationContext | 2 | ~250 | 0.x | LOW |
| 1.2 | Add storage error handling tests | 1 | ~100 | 1.1 | LOW |
| 1.3 | Update provider hierarchy | 2 | ~50 | 1.1 | HIGH |
| 1.4 | Update auth context and navigation | 2 | ~200 | 1.3 | MEDIUM |

**Merge order:** Sequential (each depends on previous).

### PR 1.3 Review Notes (HIGH RISK)
This PR changes the React component tree structure. Reviewers should verify:
- Provider order is correct (Impersonation outer, Auth inner)
- No circular dependencies introduced
- Context values flow correctly

---

## Phase 2: PII-Free URLs (5 PRs)

| PR | Title | Files | LOC | Dependencies | Risk |
|----|-------|-------|-----|--------------|------|
| 2.1 | Create entity key hasher (12 chars) | 2 | ~100 | 1.x | LOW |
| 2.2 | Create entity key registry with Zod | 2 | ~200 | 2.1 | MEDIUM |
| 2.3 | Create useDrawerUrlState hook | 2 | ~200 | 2.2 | MEDIUM |
| 2.4 | Create URL warning dialogs | 2 | ~150 | None | LOW |
| 2.5 | Integrate with drawer system | 3 | ~300 | 2.3, 2.4 | HIGH |

**Parallel:** PRs 2.1-2.3 are sequential. PR 2.4 can be done in parallel.

### PR 2.5 Review Notes (HIGH RISK)
This PR connects the hash system to the actual drawer. Verify:
- No PII appears in URL (browser dev tools check)
- Legacy URL warning appears correctly
- Hash resolution works for same-tab and cross-tab

---

## Phase 3: TanStack Router (18 PRs)

### Infrastructure (3 PRs)

| PR | Title | Files | LOC | Dependencies | Risk |
|----|-------|-------|-----|--------------|------|
| 3.1 | Install TanStack Router | 3 | ~50 | 0.x | LOW |
| 3.2 | Create root route and error boundaries | 4 | ~200 | 3.1 | LOW |
| 3.3 | Create router instance | 3 | ~150 | 3.2 | LOW |

### Route Migration (8 PRs)

| PR | Feature Area | Routes | Files | LOC | Dependencies | Risk |
|----|--------------|--------|-------|-----|--------------|------|
| 3.4 | Dashboard & Insights | 2 | 8 | ~400 | 3.3 | MEDIUM |
| 3.5 | Assets | 3 | 12 | ~500 | 3.3 | MEDIUM |
| 3.6 | Vulnerabilities | 3 | 10 | ~450 | 3.3 | MEDIUM |
| 3.7 | Seeds & Discovery | 3 | 8 | ~350 | 3.3 | LOW |
| 3.8 | Jobs & Scans | 3 | 10 | ~400 | 3.3 | LOW |
| 3.9 | Settings (all) | 8 | 15 | ~500 | 3.3 | MEDIUM |
| 3.10 | Authentication | 4 | 8 | ~350 | 3.3 | HIGH |
| 3.11 | Remaining routes | 8 | 12 | ~400 | 3.3 | LOW |

**Parallel:** PRs 3.4-3.11 can be done in parallel after 3.3.

### Navigation Migration (5 PRs)

| PR | Scope | Files | LOC | Dependencies | Risk |
|----|-------|-------|-----|--------------|------|
| 3.12 | useNavigate (components/) | 20 | ~300 | 3.4+ | MEDIUM |
| 3.13 | useNavigate (hooks/) | 15 | ~250 | 3.4+ | MEDIUM |
| 3.14 | useSearchParams | 18 | ~300 | 3.4+ | MEDIUM |
| 3.15 | generatePath (15 usages) | 10 | ~150 | 3.4+ | LOW |
| 3.16 | Link components | 25 | ~350 | 3.4+ | MEDIUM |

### Integration (2 PRs)

| PR | Title | Files | LOC | Dependencies | Risk |
|----|-------|-------|-----|--------------|------|
| 3.17 | Router integration, remove React Router | 5 | ~200 | 3.12-3.16 | HIGH |
| 3.18 | E2E test migration | 41 | ~800 | 3.17 | MEDIUM |

### PR 3.10 Review Notes (HIGH RISK)
Authentication route changes are security-sensitive. Verify:
- Login flow still works
- SSO flow still works
- OAuth callback handling correct
- Redirect after login works

### PR 3.17 Review Notes (HIGH RISK)
This PR removes React Router. Verify:
- All routes work without React Router
- No 404 errors
- Deep linking works
- Back/forward navigation works

---

## Phase 4: TanStack Tables (5 PRs)

| PR | Title | Files | LOC | Dependencies | Risk |
|----|-------|-------|-----|--------------|------|
| 4.1 | Enhance column adapter | 2 | ~150 | 1.x | LOW |
| 4.2 | Add virtualization to TanStackTable | 1 | ~200 | 4.1 | LOW |
| 4.3 | Migrate high-traffic tables | 4 | ~400 | 4.2 | HIGH |
| 4.4 | Add URL state sync | 1 | ~150 | 4.2, 3.17 | MEDIUM |
| 4.5 | Migrate remaining tables | 6 | ~350 | 4.3 | LOW |

### PR 4.3 Review Notes (HIGH RISK)
High-traffic tables (Assets, Vulnerabilities) affect most users. Verify:
- Sorting works
- Filtering works
- Pagination works
- Virtualization smooth (no jank)
- Performance within targets

---

## Phase 5: Drawer Simplification (3 PRs)

| PR | Title | Files | LOC | Dependencies | Risk |
|----|-------|-------|-----|--------------|------|
| 5.1 | Create useDrawerState hook | 2 | ~300 | 3.17, 2.5 | MEDIUM |
| 5.2 | Migrate drawer components | 8 | ~400 | 5.1 | HIGH |
| 5.3 | Clean up global.state.tsx | 1 | -700 | 5.2 | HIGH |

### PR 5.2 Review Notes (HIGH RISK)
All drawer components change. Verify:
- Each drawer type opens correctly
- Tab state persists in URL
- Nested drawers work (max 2)
- Close behavior correct

### PR 5.3 Review Notes (HIGH RISK)
This removes 700+ lines from global state. Verify:
- No remaining references to old drawer state
- No runtime errors
- All E2E tests pass

---

## Summary

| Phase | PRs | High-Risk PRs | Total LOC |
|-------|-----|---------------|-----------|
| Phase 0 | 4 | 0 | ~650 |
| Phase 1 | 4 | 1 | ~600 |
| Phase 2 | 5 | 1 | ~950 |
| Phase 3 | 18 | 3 | ~5,900 |
| Phase 4 | 5 | 1 | ~1,250 |
| Phase 5 | 3 | 2 | ~400 |
| **Total** | **39** | **8** | **~9,750** |

---

## Merge Conflict Hotspots

These files have high conflict potential. Coordinate PRs carefully:

| File | Phases That Touch It | Strategy |
|------|---------------------|----------|
| `src/state/auth.tsx` | 1, 3 | Sequential merges |
| `src/state/global.state.tsx` | 2, 5 | Phase 5 last |
| `src/index.tsx` or `src/App.tsx` | 1, 3 | Sequential merges |
| `package.json` | 0, 3 | Lockfile regeneration |

---

## PR Template

```markdown
## Summary
[1-2 sentences describing what this PR does]

## Phase
Phase X, PR X.Y

## Changes
- [ ] Change 1
- [ ] Change 2

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated (if applicable)
- [ ] Manual testing completed

## Rollback
Feature flag: `[FLAG_NAME]`
Set to `false` to rollback.

## Checklist
- [ ] <500 LOC
- [ ] All tests pass
- [ ] No console errors
- [ ] Works with feature flag enabled
- [ ] Works with feature flag disabled (legacy path)
```
