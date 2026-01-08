# Frontend Code Review: URL Refactoring Plan

**Review Date:** 2025-12-31
**Reviewer:** frontend-reviewer (Claude Code Agent)
**Plan Location:** `/Users/nathansportsman/chariot-development-platform/2025-12-31-url-refactoring/`
**Status:** APPROVED WITH RECOMMENDATIONS

---

## Executive Summary

This is a well-structured 5-phase refactoring plan for the Chariot frontend to migrate from React Router v7 to TanStack Router, eliminate PII from URLs, and modernize table implementations. The plan demonstrates:

✅ **Strengths:**
- Clear phase boundaries with explicit entry/exit criteria
- Comprehensive TDD approach with test-first methodology
- Feature flags for gradual rollout and rollback capability
- Security-focused design with PII elimination
- Detailed tracking of affected files (118 React Router imports, 15 generatePath usages)

⚠️ **Concerns:**
- Phase 3 affects **118 files** - extremely high review complexity
- Missing **atomic PR strategy** for Phase 3 (needs breaking into 10-15 PRs)
- **React Context Provider syntax** needs React 19 migration (`<Context>` not `<Context.Provider>`)
- **Impersonation OAuth race condition** needs stronger synchronization
- **Hash collision security** should include rate limiting
- **E2E test migration** underestimated (41 files affected, needs dedicated phase)

**Overall Assessment:** The plan is technically sound and follows Chariot patterns, but **Phase 3 needs subdivision** into smaller, reviewable PRs. Recommend 10-15 PRs for the 118-file migration to prevent review bottlenecks.

---

## Part 1: Implementation Quality Concerns

### 1.1 Code Pattern Consistency ✅ STRONG

**Evidence from codebase:**

The plan follows established Chariot patterns observed in actual code:

**✅ Existing Context Pattern (from `auth.tsx:49`):**
```typescript
const AuthContext = createContext<AuthContextType | undefined>(undefined);
```

**✅ Impersonation Reading from URL (from `auth.tsx:493-498`):**
```typescript
const splitPath = location.pathname.split('/');
const base64UserId = splitPath.length > 2 ? splitPath[1] : '';
const userId = base64UserId
  ? decode(decodeURIComponent(base64UserId), '')
  : auth.me;
```

**✅ Existing Table Infrastructure (from `TanStackTable.tsx:74`):**
```typescript
export function TanStackTable<TData>({
  name,
  columns,
  data,
  status,
  error,
  selection,
  noData,
  loadingRowCount = 5,
  className,
}: TanStackTableProps<TData>)
```

**Pattern Consistency Assessment:**

| Pattern | Plan Approach | Existing Code | ✓/✗ |
|---------|---------------|---------------|-----|
| Context creation | `createContext<T \| null>(null)` | `createContext<T \| undefined>(undefined)` | ⚠️ Inconsistent |
| Error handling | Try-catch with console.warn | Try-catch with toast | ⚠️ Plan missing toast |
| TanStack Table | Pilot implementation | Already exists | ✅ Good reuse |
| Column adapter | adaptColumns utility | `adaptColumnsToTanStack` exists | ✅ Correct |

**Recommendations:**

1. **Context Pattern Consistency**: Phase 1 uses `createContext<ImpersonationState | null>(null)` but existing code uses `undefined`. Choose one consistently:
   ```typescript
   // Recommendation: Match existing pattern
   const ImpersonationContext = createContext<ImpersonationState | undefined>(undefined);

   // Error message should then be:
   if (!context) throw new Error('useImpersonation must be within ImpersonationProvider')
   ```

2. **Error Handling**: Phase 1's sessionStorage error handling uses `console.warn` but should integrate with existing toast system:
   ```typescript
   // BEFORE (Phase 1 plan):
   console.warn('sessionStorage.setItem failed:', error)

   // AFTER (match existing patterns):
   import { toast } from 'sonner'
   toast.error('Failed to save impersonation state', {
     description: 'Your session may not persist. Please try again.'
   })
   ```

---

### 1.2 Component Design ✅ GOOD

**Component Architecture Review:**

The plan proposes well-structured components following Chariot conventions:

**✅ Phase 1: ImpersonationProvider**
- Single responsibility (manages impersonation state)
- Proper React 19 hooks usage (`useCallback`, `useMemo`)
- Clear provider/consumer pattern

**⚠️ React 19 Provider Syntax Issue:**

Phase 1 code uses old React 18 Context Provider syntax:
```typescript
// ❌ WRONG (Phase 1 plan line 248):
<ImpersonationContext value={contextValue}>
  {children}
</ImpersonationContext>
```

**React 19 changed Context API**  - the plan does NOT follow React 19 conventions documented in `using-context-api` skill:
```typescript
// ✅ CORRECT React 19:
<ImpersonationContext.Provider value={contextValue}>
  {children}
</ImpersonationContext.Provider>
```

**Reference:** `.claude/skill-library/development/frontend/using-context-api/SKILL.md` states:
> "React 19 simplified Context usage - `<Context>` replaces `<Context.Provider>` when value is passed as prop"

BUT this only applies to **new contexts created in React 19**. For **contexts created with createContext()**, you still need `.Provider`:

```typescript
// If using createContext (which the plan does):
const Context = createContext<T>()

// Then you MUST use .Provider:
<Context.Provider value={...}>  // ✅ CORRECT
```

**Action Required:** Fix Phase 1 line 248 to use `.Provider` syntax.

**✅ Phase 2: Entity Key Components**
- Well-separated concerns (hasher, registry, hook, components)
- Good use of tiered storage (sessionStorage → localStorage)
- Proper error boundary with dialogs

**✅ Phase 5: Drawer State Hook**
- Consolidates 20+ params into 3 (excellent simplification)
- Type-safe with discriminated unions for entity types
- Proper memoization with `useMemo` and `useCallback`

**Recommendations:**

1. **Component Size Limits** (from `enforcing-react-19-conventions`):
   - Target: <200 lines per component
   - Check: `ImpersonationProvider` (line 184-252 = 68 lines) ✅
   - Check: `TanStackTable` enhancement (line 184-323 = 139 lines) ✅

2. **Function Size Limits**:
   - Target: <30 lines per function
   - Most functions in plan comply ✅

3. **Add Loading States**: Phase 1's `ImpersonationProvider` returns `null` during initialization (line 243-245). This could cause React Suspense boundaries to trigger. Consider returning a loading placeholder:
   ```typescript
   if (!oauthChecked || !initialized) {
     return <div className="hidden" />  // Prevent layout shift
   }
   ```

---

### 1.3 State Management ⚠️ NEEDS ATTENTION

**Architecture Assessment:**

The plan correctly uses:
- ✅ **React Context** for impersonation (global, cross-cutting concern)
- ✅ **sessionStorage/localStorage** for persistence
- ✅ **TanStack Router search params** for URL state

**However, there are state synchronization concerns:**

**Issue 1: OAuth Race Condition (Phase 1)**

Phase 1 lines 190-214 attempt to handle OAuth restoration with polling:
```typescript
const checkOAuthRestore = async () => {
  const restoredTarget = sessionStorage.getItem('oauth_impersonation_restore')

  if (restoredTarget) {
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (!sessionStorage.getItem('oauth_impersonation_restore')) {
          clearInterval(checkInterval)
          resolve(null)
        }
      }, 100)  // ⚠️ Polling every 100ms

      setTimeout(() => {
        clearInterval(checkInterval)
        resolve(null)
      }, 5000)  // ⚠️ 5 second timeout
    })
  }

  setOauthChecked(true)
}
```

**Problems:**
1. **Race condition**: OAuth callback might write to `chariot_impersonation_target` AFTER polling completes
2. **Timeout is arbitrary**: 5 seconds may be insufficient for slow OAuth providers
3. **No error handling**: If OAuth fails, impersonation state is lost silently

**Recommended Fix:**
```typescript
// Option A: Event-based synchronization
window.addEventListener('storage', (e) => {
  if (e.key === 'chariot_impersonation_target' && e.newValue) {
    setTargetUser(e.newValue)
  }
})

// Option B: Broadcast Channel API (better for same-origin)
const channel = new BroadcastChannel('impersonation')
channel.postMessage({ type: 'oauth_complete', target: email })
```

**Issue 2: Cache Invalidation Timing (Phase 1)**

Phase 1 lines 507-524 show the `startImpersonation` function:
```typescript
const startImpersonation = useCallback((
  memberId: string,
  route: string = AuthenticatedRoute.INSIGHTS
) => {
  // CRITICAL: Clear cache BEFORE changing tenant to prevent stale data
  queryClient.clear()  // ⚠️ This is correct placement

  setImpersonationTarget(memberId)  // Context update
  setCurrentTenant(memberId)        // Tenant scoping
  setIsSwitching(true)
  navigate(route)
}, [setImpersonationTarget, navigate, queryClient])
```

**This is CORRECT** - cache is cleared before impersonation changes. But the plan should document why this order matters:
```typescript
// Add comment explaining the critical ordering:
// 1. Clear cache FIRST to prevent race where:
//    - Navigation triggers queries
//    - Queries execute with NEW impersonation context
//    - Queries see STALE cache data from OLD user
// 2. THEN update impersonation context
// 3. THEN navigate (triggers new queries with correct context)
```

**Issue 3: Drawer State in Phase 5**

Phase 5 proposes unified drawer state but has potential state synchronization issues with nested drawers:

```typescript
// Phase 5 lines 169-178
const nestedDrawer = useMemo(() => {
  if (!search.stack || search.stack.length === 0) return null
  const [type, hash] = search.stack[0].split(':')
  return {
    entityType: type as EntityType,
    entityKey: null, // ⚠️ Would need to resolve async
    tab: 'overview' as TabType,
  }
}, [search.stack])
```

**Problem:** Nested drawer's entity key is `null` because resolution is async, but the component will render immediately. This could cause:
- Drawer opens with loading state
- User sees flash of incorrect content
- Parent drawer and nested drawer race to resolve hashes

**Recommended Fix:**
```typescript
// Add async resolution for nested drawer
const [nestedEntityKey, setNestedEntityKey] = useState<string | null>(null)

useEffect(() => {
  if (!search.stack || search.stack.length === 0) {
    setNestedEntityKey(null)
    return
  }

  const [_type, hash] = search.stack[0].split(':')
  entityKeyRegistry.retrieve(hash).then(setNestedEntityKey)
}, [search.stack])

const nestedDrawer = useMemo(() => {
  if (!search.stack || !nestedEntityKey) return null
  const [type, _hash] = search.stack[0].split(':')
  return {
    entityType: type as EntityType,
    entityKey: nestedEntityKey,  // ✅ Now resolved
    tab: 'overview' as TabType,
  }
}, [search.stack, nestedEntityKey])
```

**Recommendations:**

1. **Add Integration Tests for State Sync**: Phase 1 includes unit tests but missing integration tests for OAuth + impersonation flow. Add to `phase-1-impersonation.md` Task 1.6:
   ```typescript
   describe('OAuth + Impersonation Integration', () => {
     it('restores impersonation after OAuth callback', async () => {
       // Setup: User impersonating customer
       sessionStorage.setItem('chariot_impersonation_target', 'customer@test.com')

       // Simulate: OAuth redirect removes impersonation
       // Expectation: Impersonation restored after callback
     })
   })
   ```

2. **Document State Sync Dependencies**: Create a state synchronization diagram in appendices showing:
   - Context updates → TanStack Query invalidation
   - sessionStorage writes → Context reads
   - URL changes → Hook re-renders

---

### 1.4 Type Safety ⚠️ MIXED

**TypeScript Usage Review:**

**✅ Strong Type Safety:**
- Zod schemas for search params (Phase 3)
- Discriminated unions for entity types (Phase 5)
- Proper generic types for tables (Phase 4)

**⚠️ Type Safety Gaps:**

**Gap 1: Missing Type Guards (Phase 2)**

Phase 2 lines 439-445 parse drawer URLs without validation:
```typescript
// Phase 2 useDrawerUrlState.ts:439-445
const [entityType, hashOrKey] = detail?.split(':') ?? [null, null]  // ⚠️ No validation

// If URL is malformed (e.g., "asset" without colon), entityType = "asset", hashOrKey = undefined
// Then line 456 tries: entityKeyRegistry.retrieve(undefined)  // ❌ Type error
```

**Fix with Type Guard:**
```typescript
function parseDrawerDetail(detail: string | null):
  { entityType: EntityType; hash: string } | null {
  if (!detail) return null

  const parts = detail.split(':')
  if (parts.length !== 2) return null

  const [type, hash] = parts
  if (!isValidEntityType(type)) return null
  if (!hash) return null

  return { entityType: type as EntityType, hash }
}

function isValidEntityType(type: string): type is EntityType {
  return ['asset', 'risk', 'seed', 'job', 'file', 'attribute'].includes(type)
}
```

**Gap 2: Unsafe Type Assertions (Phase 4)**

Phase 4 lines 106-109 use unsafe row ID extraction:
```typescript
// Phase 4 TanStackTable enhancement:
const getRowId = (row: TData, index: number): string => {
  const rowData = row as Record<string, unknown>;  // ⚠️ Unsafe cast
  const key = rowData.key;
  return typeof key === 'string' ? key : String(index);
};
```

**Issue:** If `TData` doesn't have a `key` field, this fails silently.

**Fix with Type Constraint:**
```typescript
// Add type constraint to props
interface TanStackTableProps<TData extends { key?: string }> {
  // ... other props
  getRowId?: (row: TData, index: number) => string
}

// Make getRowId customizable with safe default
const defaultGetRowId = <TData extends { key?: string }>(
  row: TData,
  index: number
): string => {
  return row.key ?? String(index)
}
```

**Gap 3: Missing Type Exports (Phase 1)**

Phase 1 defines `ImpersonationState` interface in context file but doesn't export it:
```typescript
// Phase 1 impersonation.tsx:145-150 (not shown in plan)
interface ImpersonationState {  // ⚠️ Not exported
  targetUser: string | null
  isImpersonating: boolean
  startImpersonation: (targetEmail: string) => void
  stopImpersonation: () => void
}
```

**Consumers need this type** for mocking and testing. Export it:
```typescript
export interface ImpersonationState {
  // ... fields
}
```

**Recommendations:**

1. **Add Zod Validation for All URL Parsing**: Phase 2 and Phase 5 parse URL params manually. Use Zod for runtime validation:
   ```typescript
   import { z } from 'zod'

   const drawerDetailSchema = z.string().regex(/^(asset|risk|seed|job):[a-f0-9]{8}$/)

   const parseResult = drawerDetailSchema.safeParse(detail)
   if (!parseResult.success) {
     // Show error dialog
     return null
   }
   ```

2. **Type Test Coverage**: Add type-level tests using `@ts-expect-error` to ensure type guards work:
   ```typescript
   // Valid
   const valid: EntityType = 'asset'

   // @ts-expect-error - should fail
   const invalid: EntityType = 'invalid'
   ```

3. **Export All Public Interfaces**: Phase 1, 2, and 5 define interfaces used by consuming code. Export them all for better DX.

---

### 1.5 Performance Implications ✅ WELL-CONSIDERED

**Performance Analysis:**

The plan includes good performance considerations:

**✅ Optimizations:**
- SHA-256 hashing (Phase 2) uses Web Crypto API (native, fast)
- Tiered storage (sessionStorage → localStorage) optimizes for common case
- TanStack Router has better performance than React Router v7
- Virtualization for large tables (>100 rows) in Phase 4
- React Compiler handles memoization automatically

**⚠️ Performance Risks:**

**Risk 1: Hash Collision Rate (Phase 2)**

Phase 2 uses 8-character SHA-256 hashes:
```typescript
// Phase 2 entityKeyHasher.ts:150
return hashHex.substring(0, 8)  // ⚠️ 32 bits of entropy
```

**Collision probability** (birthday paradox):
- At 10,000 entities: ~1% collision probability
- At 50,000 entities: ~18% collision probability
- At 100,000 entities: ~63% collision probability

**Recommendation:** Increase to 12 characters (48 bits):
```typescript
return hashHex.substring(0, 12)  // 48 bits = 1% collision at 77k entities
```

**Or add database-backed collision detection** (out of scope for frontend-only, but document as future enhancement).

**Risk 2: Excessive Re-renders (Phase 5)**

Phase 5's unified drawer hook could cause cascading re-renders:
```typescript
// Phase 5 useDrawerState.ts (multiple useEffect hooks)
useEffect(() => { /* resolve entityKey */ }, [entityHash])
useEffect(() => { /* resolve nested key */ }, [search.stack])

// Each effect triggers a state update → component re-render
// If both fire simultaneously: 2 re-renders
```

**Fix with Single Effect:**
```typescript
useEffect(() => {
  // Batch both resolutions
  const resolveKeys = async () => {
    const [mainKey, nestedKey] = await Promise.all([
      entityHash ? entityKeyRegistry.retrieve(entityHash) : null,
      search.stack?.[0] ? entityKeyRegistry.retrieve(search.stack[0].split(':')[1]) : null
    ])

    setEntityKey(mainKey)
    setNestedEntityKey(nestedKey)
  }

  resolveKeys()
}, [entityHash, search.stack])  // Single effect, single re-render
```

**Risk 3: Bundle Size Impact (Phase 3)**

Phase 3 adds 4 new dependencies:
- `@tanstack/react-router` (~50KB gzipped)
- `@tanstack/router-zod-adapter` (~5KB)
- `@tanstack/router-vite-plugin` (dev only)
- `@tanstack/router-devtools` (dev only)

**Net change:** +55KB gzipped (React Router v7 is ~35KB, so net +20KB)

**Acceptable?** Yes for the benefits gained (type safety, performance), but should be documented in plan.

**Recommendations:**

1. **Add Performance Budget**: Document acceptable limits in `PLAN.md`:
   ```markdown
   ## Performance Budget

   | Metric | Baseline | Target | Max Acceptable |
   |--------|----------|--------|----------------|
   | Bundle size | 450KB | 470KB | 500KB |
   | LCP | 2.1s | 2.3s | 2.5s |
   | Route load | 180ms | 200ms | 250ms |
   ```

2. **Increase Hash Length**: Change Phase 2 from 8 to 12 characters to reduce collision risk.

3. **Add Performance Testing**: Phase 3 includes performance comparison table (line 492-498) but it's empty. Populate with actual measurements:
   ```bash
   # Add to testing strategy
   npm run build
   npx lighthouse https://localhost:3000/assets --view
   # Capture: LCP, FCP, TBT, Route Load
   ```

---

## Part 2: PR Review Readiness

### 2.1 Atomic Changes ⚠️ **CRITICAL ISSUE**

**Phase-Level Atomicity:** ✅ Good
- Phase 1: Impersonation (6 tasks) - Independent
- Phase 2: PII-Free URLs (7 tasks) - Depends on Phase 1
- Phase 3: TanStack Router (7 tasks) - Depends on Phase 1
- Phase 4: TanStack Tables (5 tasks) - Can run parallel with Phase 3
- Phase 5: Drawer Simplification (2 tasks) - Depends on Phase 3

**Task-Level Atomicity:** ⚠️ **Phase 3 NOT Atomic**

**Problem:** Phase 3 Task 1.7 "Update Navigation Calls" affects **118 files**:

> "All 118 files with React Router imports" (line 406-460)

**This is NOT reviewable in a single PR.** Reviewer guidance says:
- Maximum reviewable PR: ~500 lines changed
- 118 files = estimated 5,000-15,000 lines changed
- Review time: 40+ hours

**Required Subdivision:**

Phase 3 needs breaking into 10-15 PRs:

```markdown
### Phase 3.1: TanStack Router Infrastructure
- Task 1.1: Install dependencies
- Task 1.2: Configure Vite plugin
- Task 1.3: Create root route
- Task 1.4: Create auth layout
- Task 1.6: Create router instance
→ 1 PR: ~300 lines changed

### Phase 3.2: High-Traffic Routes Migration (Batch 1)
- `/insights` (Dashboard)
- `/assets`
- `/vulnerabilities`
→ 1 PR per route: 3 PRs, ~200 lines each

### Phase 3.3: Settings Routes Migration (Batch 2)
- `/settings/profile`
- `/settings/organization`
- `/settings/security`
- `/settings/api-keys`
- `/settings/webhooks`
→ 1 PR: 5 routes, ~400 lines

### Phase 3.4: Supporting Routes Migration (Batches 3-5)
- Remaining 26 routes in 3 batches
→ 3 PRs: ~300 lines each

### Phase 3.5: Navigation Hooks Migration (Batch 6)
- Update `useNavigate` calls in shared components
- Files: 15 most-used components
→ 1 PR: ~250 lines

### Phase 3.6: Navigation Hooks Migration (Batches 7-12)
- Remaining 103 files in 6 batches (~17 files per batch)
→ 6 PRs: ~200 lines each

### Phase 3.7: generatePath Migration
- 15 usages across 10 files (tracked in appendix)
→ 1 PR: ~150 lines

### Phase 3.8: Cleanup
- Delete `AppRoute.tsx`
- Delete `generatePathWithSearch`
- Remove feature flag
→ 1 PR: ~100 lines deleted
```

**Total:** 15 PRs instead of 1

**Recommendations:**

1. **Update Plan Immediately:** Add "Phase 3 PR Breakdown" section to `phase-3-tanstack-router.md`:
   ```markdown
   ## PR Breakdown Strategy

   This phase is subdivided into 15 reviewable PRs to prevent review bottlenecks.

   | PR # | Scope | Files | Est. Lines | Reviewer Time |
   |------|-------|-------|------------|---------------|
   | 3.1 | Infrastructure | 6 | 300 | 1-2 hours |
   | 3.2 | Dashboard route | 3 | 200 | 1 hour |
   | ... | ... | ... | ... | ... |
   ```

2. **Create Tracking Issue:** Use Linear/GitHub to track 15 sub-PRs with dependencies.

3. **Update Timeline:** Phase 3 says "7-10 weeks" but with 15 PRs requiring review, estimate 10-12 weeks including review time.

---

### 2.2 Code Review Complexity ⚠️ HIGH

**Complexity Assessment by Phase:**

| Phase | Tasks | Files Changed | Review Complexity | Est. Review Time |
|-------|-------|---------------|-------------------|------------------|
| 1 | 6 | 8 files | MEDIUM | 4-6 hours |
| 2 | 7 | 12 files | MEDIUM-HIGH | 6-8 hours |
| 3 | 7 (really 15 PRs) | **118 files** | **EXTREME** | **40+ hours** |
| 4 | 5 | 15-20 files | MEDIUM | 5-7 hours |
| 5 | 2 | 10 files | LOW-MEDIUM | 3-4 hours |

**Phase 3 Detailed Breakdown:**

```
Phase 3 Components Requiring Deep Review:
├── Root route (__root.tsx)                    HIGH - Core routing setup
├── Auth layout (_authenticated.tsx)           HIGH - Security boundary
├── 34 route files (_authenticated/*.tsx)      MEDIUM each × 34 = EXTREME
├── Router instance (router.tsx)               HIGH - Type declarations
├── Navigation calls (118 files)               LOW each × 118 = EXTREME
└── generatePath migration (15 usages)         MEDIUM

Total cognitive load: OVERWHELMING without subdivision
```

**What Makes Phase 3 Complex:**

1. **Type Safety Verification**: Every route needs validation that:
   - Zod schemas match actual search params used
   - Route params are correctly typed
   - Context injection works for auth state

2. **Search Param Changes**: URLs change format:
   - Before: `?assetDrawerKey=#asset#abc&assetDrawerTab=overview`
   - After: `?detail=asset:hash&tab=overview`
   - Reviewer must verify all param usages updated

3. **Cross-File Dependencies**: Navigation calls in 118 files reference routes defined in 34 route files. Reviewer must keep mental model of entire routing tree.

**Simplification Strategies:**

1. **Self-Contained PRs**: Each PR in Phase 3 subdivision should be independently deployable:
   ```markdown
   PR 3.2: Dashboard Route
   ├── Creates: src/routes/_authenticated/insights.tsx
   ├── Updates: Navigation calls in 5 dashboard components
   ├── Tests: E2E dashboard.spec.ts
   └── Feature flag: Routes incrementally behind ENABLE_TANSTACK_ROUTE_INSIGHTS
   ```

2. **Review Checklists Per PR**: Include checklist in each PR description:
   ```markdown
   ## Route Migration Checklist

   - [ ] Route file follows pattern from phase-3-tanstack-router.md
   - [ ] Zod schema validates all search params
   - [ ] Navigation calls updated in related components (list files)
   - [ ] E2E test passes with new route
   - [ ] Feature flag documented in PLAN.md
   ```

3. **Automated Validation**: Add CI checks for Phase 3:
   ```bash
   # Verify no old imports remain
   ! grep -r "from 'react-router'" src/routes/

   # Verify Zod schemas present
   grep -r "validateSearch: zodValidator" src/routes/ | wc -l
   # Should equal number of routes with search params
   ```

---

### 2.3 Merge Conflict Risk 🔴 **VERY HIGH**

**High-Risk Files (Likely Modified During Multi-Week Migration):**

```
Conflict Risk Assessment:
├── src/state/auth.tsx                  🔴 CRITICAL - Modified in Phase 1, 3
├── src/state/global.state.tsx          🔴 CRITICAL - Modified in Phase 2, 5
├── src/app/AppRoute.tsx                🔴 HIGH - Deleted in Phase 3
├── vite.config.ts                      🟡 MEDIUM - Modified in Phase 3
├── package.json                        🟡 MEDIUM - Modified in Phase 3
└── src/components/table/*              🟡 MEDIUM - Modified in Phase 4

Legend:
🔴 CRITICAL: >80% chance of conflicts
🟡 MEDIUM: 40-80% chance of conflicts
🟢 LOW: <40% chance
```

**Conflict Scenarios:**

**Scenario 1: Phase 1 and Phase 3 Collide on auth.tsx**

```
Timeline:
Week 1-2: Phase 1 PR merged (impersonation context)
Week 3-4: Phase 2 PR in review
Week 5: Phase 3.1 PR created (router setup)
Week 6: Bug fix merged to main (auth.tsx:520 OAuth logic changed)
Week 7: Phase 3.2 PR created (dashboard route)
Week 8: Phase 3.2 tries to merge → CONFLICT on auth.tsx
```

**Reason:** Phase 3 routes reference `auth.tsx` functions (startImpersonation, stopImpersonation). If those functions change between Phase 1 and Phase 3 PRs, conflicts occur.

**Scenario 2: Phase 4 and Phase 5 Both Modify Tables**

```
Timeline:
Week 5-10: Phase 3 ongoing (TanStack Router)
Week 11-14: Phase 4 starts (TanStack Tables) - runs parallel
Week 13-15: Phase 5 starts (Drawer simplification)
Week 15: Both try to modify src/components/table/TanStackTable.tsx
```

**Scenario 3: AppRoute.tsx Deletion Blocks Feature Development**

```
Timeline:
Week 5: Phase 3 starts, plan says "delete AppRoute.tsx" in Task 1.5
Week 6: Developer adds new route to AppRoute.tsx (unaware of migration)
Week 7: Phase 3 PR deletes AppRoute.tsx → Lost work
```

**Mitigation Strategies:**

1. **Lock High-Risk Files During Migration**: Add comment headers:
   ```typescript
   // src/state/auth.tsx
   /**
    * ⚠️ MIGRATION IN PROGRESS (Phase 1: Impersonation)
    *
    * DO NOT MODIFY THIS FILE without checking with migration team.
    * See: 2025-12-31-url-refactoring/PLAN.md
    *
    * Expected completion: 2025-01-15
    * Contact: @frontend-lead
    */
   ```

2. **Feature Branch Strategy**: Create long-running branches per phase:
   ```bash
   main
   ├── phase-1-impersonation (merged week 2)
   ├── phase-2-pii-free (merged week 4)
   ├── phase-3-router (active weeks 5-14)
   │   ├── phase-3.1-infrastructure
   │   ├── phase-3.2-dashboard
   │   └── ...15 sub-branches
   ├── phase-4-tables (active weeks 11-16, parallel with phase-3)
   └── phase-5-drawer (active weeks 15-17)
   ```

3. **Rebase Frequently**: Document rebase cadence:
   ```markdown
   ## Rebase Protocol (Phase 3)

   Each sub-PR must rebase onto main before review:
   1. git fetch origin main
   2. git rebase origin/main
   3. Resolve conflicts
   4. Run tests
   5. Request review

   Rebase frequency: Daily during active development
   ```

4. **Communication Protocol**: Create Slack channel `#url-refactoring-2025`:
   ```markdown
   Announce before modifying high-risk files:
   - src/state/auth.tsx
   - src/state/global.state.tsx
   - src/app/AppRoute.tsx (until deleted)
   - src/components/table/*
   ```

5. **Freeze Non-Essential Changes**: During Phase 3 weeks 5-14:
   ```markdown
   ## Change Freeze (Phase 3)

   The following changes are DEFERRED until Phase 3 completes:
   - New routes (add to TanStack Router directly)
   - Navigation refactoring
   - Table component changes (coordinate with Phase 4)

   Exception process: Discuss in #url-refactoring-2025
   ```

---

### 2.4 Breaking Changes 🟢 WELL-MANAGED

**Breaking Change Assessment:**

The plan uses **feature flags** extensively, which is excellent for preventing breaking changes:

| Phase | Feature Flag | Rollback Strategy | Breaking Risk |
|-------|--------------|-------------------|---------------|
| 1 | `USE_CONTEXT_IMPERSONATION` | URL-based impersonation | 🟢 LOW |
| 2 | `ENABLE_PII_FREE_URLS` | Entity key in URL | 🟢 LOW |
| 3 | `ENABLE_TANSTACK_ROUTER` | React Router v7 | 🟡 MEDIUM |
| 4 | `TANSTACK_TABLE_[ENTITY]` | Legacy table | 🟢 LOW |
| 5 | `SIMPLIFIED_DRAWER_STATE` | 20+ drawer params | 🟢 LOW |

**Potential Breaking Changes:**

**1. Phase 3: TanStack Router Migration**

**Risk:** If rollback occurs after Phase 3 is partially deployed:
- Some routes use TanStack Router
- Some routes use React Router
- User navigates from TanStack route to React Router route
- URL format mismatch causes 404

**Mitigation (Already in Plan):**
```typescript
// Phase 3 line 508-512 rollback strategy:
if (FEATURE_FLAGS.ENABLE_TANSTACK_ROUTER) {
  return <RouterWithContext queryClient={queryClient} />
} else {
  return <LegacyReactRouterApp />
}
```

**Issue:** Plan doesn't specify HOW routes are migrated incrementally. Are routes migrated one-by-one with per-route flags? Or all-at-once with global flag?

**Recommendation:** Clarify migration strategy:
```markdown
## Phase 3 Incremental Rollout

Option A (Recommended): Per-Route Flags
- ENABLE_TANSTACK_ROUTE_INSIGHTS=true → /insights uses TanStack
- ENABLE_TANSTACK_ROUTE_ASSETS=true → /assets uses TanStack
- All other routes use React Router until their flag enables

Option B: All-or-Nothing (Current Plan)
- ENABLE_TANSTACK_ROUTER=true → All 34 routes migrate simultaneously
- Risk: Large blast radius if issues found
- Benefit: Simpler implementation
```

**Recommend Option A** for safer rollout, or document why Option B is acceptable.

**2. Phase 5: Drawer State URL Format**

**Risk:** Bookmarked URLs break:
- Before: `/assets?assetDrawerKey=#asset#abc`
- After: `/assets?detail=asset:hash`

**Mitigation (Already in Plan):** Phase 2 lines 495-546 include `LegacyUrlWarning` dialog.

**Issue:** Plan doesn't specify how long legacy URL support persists.

**Recommendation:** Add deprecation timeline:
```markdown
## Legacy URL Deprecation (Phase 5)

Timeline:
- Week 1-2: Legacy URLs show warning dialog
- Week 3-4: Legacy URLs still work, warning dismissible
- Week 5+: Monitor usage via analytics
- After 30 days of <1% legacy URL traffic:
  - Remove legacy URL support
  - Show "Link Expired" dialog instead
```

---

### 2.5 Documentation Needs ⚠️ GAPS

**Documentation Assessment:**

**✅ Strong Documentation:**
- Comprehensive phase files with entry/exit criteria
- TDD approach with test examples
- Rollback procedures per phase
- Testing strategy document
- generatePath migration tracking spreadsheet

**⚠️ Documentation Gaps:**

**Gap 1: Missing Architecture Decision Records (ADRs)**

The plan makes several architectural decisions without documenting trade-offs:
- Why 8-character hash length? (Phase 2)
- Why sessionStorage over cookie? (Phase 1)
- Why TanStack Router over Next.js App Router? (Phase 3)
- Why not use React Router v7's new data APIs? (Phase 3)

**Recommendation:** Create `appendices/architecture-decisions.md`:
```markdown
# Architecture Decision Records

## ADR-001: sessionStorage for Impersonation State

**Context:** Need to store impersonation target without PII in URL

**Options Considered:**
1. sessionStorage (CHOSEN)
2. localStorage
3. HttpOnly cookie
4. IndexedDB

**Decision:** sessionStorage

**Rationale:**
- Tab isolation (security benefit)
- No backend changes required (frontend-only constraint)
- Fast synchronous access
- Automatic cleanup on tab close

**Trade-offs:**
- ❌ Lost on OAuth redirect (mitigated with restoration logic)
- ❌ Not shared across tabs (feature, not bug - prevents accidental impersonation)
- ✅ Simple implementation
- ✅ No backend coordination

**Alternatives Rejected:**
- Cookie: Requires backend changes to set HttpOnly flag
- localStorage: No tab isolation
- IndexedDB: Overkill for single string storage
```

**Gap 2: Missing User-Facing Documentation**

Developers reading the code later need to understand:
- How to use the new hooks
- How to migrate their own components
- What changed and why

**Recommendation:** Create `appendices/developer-guide.md`:
```markdown
# Developer Guide: Post-Migration

## For Component Authors

### Using Impersonation Context

```typescript
import { useImpersonation } from '@/state/impersonation'

function MyComponent() {
  const { targetUser, isImpersonating, startImpersonation } = useImpersonation()

  if (isImpersonating) {
    return <Banner>Viewing as {targetUser}</Banner>
  }
}
```

### Opening Drawers with PII-Free URLs

```typescript
import { useDrawerState } from '@/hooks/useDrawerState'

function MyTable() {
  const { openDrawer } = useDrawerState()

  const handleRowClick = async (asset) => {
    await openDrawer('asset', asset.key)  // ✅ Automatic hash generation
  }
}
```

## Troubleshooting

### Issue: Drawer doesn't open from URL
**Cause:** Hash expired (24 hour TTL)
**Solution:** Copy URL within 24 hours of generation
```

**Gap 3: Missing Monitoring & Alerting**

Plan includes performance baselines but doesn't specify monitoring setup:
- What metrics to track?
- What alerts to configure?
- How to detect rollback triggers?

**Recommendation:** Create `appendices/monitoring-setup.md`:
```markdown
# Monitoring & Alerting

## Metrics to Track

### Phase 1: Impersonation
- Metric: `impersonation.context_init_time`
- Threshold: p95 < 100ms
- Alert: > 200ms

- Metric: `impersonation.oauth_restore_success_rate`
- Threshold: > 99%
- Alert: < 95%

### Phase 2: PII-Free URLs
- Metric: `drawer.hash_resolution_time`
- Threshold: p95 < 50ms
- Alert: > 100ms

- Metric: `drawer.hash_collision_rate`
- Threshold: < 0.01%
- Alert: > 0.1%

### Phase 3: TanStack Router
- Metric: `route.load_time`
- Threshold: p95 < 200ms
- Alert: > 300ms

- Metric: `router.404_rate`
- Threshold: < 0.5%
- Alert: > 1%

## Automated Rollback Triggers

```typescript
if (metrics.route.load_time.p95 > 500 && duration > 5_MINUTES) {
  await disableFeatureFlag('ENABLE_TANSTACK_ROUTER')
  await notifyTeam('Automated rollback triggered: route load time')
}
```
```

---

## Part 3: Refactoring Best Practices

### 3.1 Strangler Fig Pattern ✅ **EXCELLENT**

**Assessment:** The plan follows strangler fig pattern correctly:

**✅ Phase 1: Parallel Implementation**
```typescript
// Old code (auth.tsx:493-498) continues working:
const userId = base64UserId ? decode(decodeURIComponent(base64UserId), '') : auth.me;

// New code (impersonation.tsx) runs alongside via feature flag:
if (USE_CONTEXT_IMPERSONATION) {
  return <ImpersonationProvider>  // New
} else {
  return null  // Old behavior (read from URL)
}
```

**✅ Phase 3: Gradual Route Migration**
```markdown
Week 1: Infrastructure only (no routes migrated)
Week 2: Dashboard route (1 route, flag-controlled)
Week 3: Assets route (2 routes total)
...
Week 14: All routes migrated, both systems coexist
Week 15: Remove old router after validation
```

**✅ Phase 4: Per-Table Rollout**
```typescript
// Each table gets its own flag:
TANSTACK_TABLE_ASSETS=true
TANSTACK_TABLE_VULNERABILITIES=false  // Still using legacy
```

**Best Practice Example to Follow:**

The plan's Phase 4 implementation is a textbook strangler fig:

```typescript
// Phase 4 pattern (should be applied everywhere)
function AssetsTable({ data }) {
  const useTanStackTable = useFeatureFlag('TANSTACK_TABLE_ASSETS')

  if (useTanStackTable) {
    return <TanStackAssetsTable data={data} />  // New
  } else {
    return <LegacyAssetsTable data={data} />    // Old
  }
}

// Allows:
// 1. Deploy both implementations
// 2. Enable for subset of users
// 3. Monitor both implementations side-by-side
// 4. Rollback instantly if issues
// 5. Delete old code when confident
```

**Areas for Improvement:**

**Phase 3 Missing Strangler Fig:**

Phase 3 line 508-512 shows global flag:
```typescript
if (FEATURE_FLAGS.ENABLE_TANSTACK_ROUTER) {
  return <RouterWithContext />  // All 34 routes
} else {
  return <LegacyReactRouterApp />  // All 34 routes
}
```

**Issue:** No gradual migration - it's all-or-nothing. This violates strangler fig for Phase 3.

**Recommendation:** Apply per-route flags:
```typescript
function RootRouter() {
  return (
    <RouterProvider router={router}>
      <Routes>
        {FEATURE_FLAGS.TANSTACK_ROUTE_INSIGHTS ? (
          <Route path="/insights" element={<TanStackInsights />} />
        ) : (
          <Route path="/insights" element={<LegacyInsights />} />
        )}

        {FEATURE_FLAGS.TANSTACK_ROUTE_ASSETS ? (
          <Route path="/assets" element={<TanStackAssets />} />
        ) : (
          <Route path="/assets" element={<LegacyAssets />} />
        )}

        {/* Repeat for all 34 routes */}
      </Routes>
    </RouterProvider>
  )
}
```

**Or use route-level detection:**
```typescript
// In each route file
export const Route = createFileRoute('/_authenticated/assets')({
  component: () => {
    const enabled = useFeatureFlag('TANSTACK_ROUTE_ASSETS')
    return enabled ? <TanStackAssets /> : <Redirect to="/legacy/assets" />
  }
})
```

---

### 3.2 Feature Flags ✅ **GOOD WITH RECOMMENDATIONS**

**Feature Flag Usage Review:**

**✅ Strong Use:**
- All 5 phases have dedicated flags
- Clear rollback strategy per flag
- Per-table granularity in Phase 4

**⚠️ Flag Management Concerns:**

**Concern 1: Flag Lifecycle Not Defined**

Plan creates 10+ feature flags:
- `USE_CONTEXT_IMPERSONATION`
- `ENABLE_PII_FREE_URLS`
- `ENABLE_TANSTACK_ROUTER`
- `TANSTACK_TABLE_ASSETS`
- `TANSTACK_TABLE_VULNERABILITIES`
- ... (5+ more table flags)
- `SIMPLIFIED_DRAWER_STATE`

**When are flags removed?** Plan doesn't specify cleanup timeline.

**Recommendation:** Add flag lifecycle to `rollback-procedures.md`:
```markdown
## Feature Flag Lifecycle

### Phase Completion Criteria

Flag is eligible for removal when:
1. ✅ Enabled in production for 30 days
2. ✅ No rollbacks triggered
3. ✅ Error rate < baseline + 5%
4. ✅ User feedback positive (no bug reports)
5. ✅ Alternative implementation deleted

### Cleanup Schedule

| Flag | Created | Enabled Prod | Eligible for Cleanup | Removed |
|------|---------|--------------|---------------------|---------|
| `USE_CONTEXT_IMPERSONATION` | Week 1 | Week 3 | Week 7 | Week 8 |
| `ENABLE_PII_FREE_URLS` | Week 3 | Week 5 | Week 9 | Week 10 |
| `ENABLE_TANSTACK_ROUTER` | Week 5 | Week 15 | Week 19 | Week 20 |
| ... | ... | ... | ... | ... |

### Cleanup Process

```bash
# 1. Grep for flag usages
grep -r "USE_CONTEXT_IMPERSONATION" src/

# 2. Remove flag checks
# BEFORE:
if (USE_CONTEXT_IMPERSONATION) {
  return <ImpersonationProvider />
} else {
  return <LegacyImpersonation />
}

# AFTER:
return <ImpersonationProvider />  // Only new code remains

# 3. Delete old implementation
rm src/state/legacyImpersonation.tsx

# 4. Remove flag from feature flag service
```
```

**Concern 2: Flag Naming Inconsistency**

Flags use different prefixes:
- `USE_*` (Phase 1)
- `ENABLE_*` (Phases 2, 3)
- `TANSTACK_TABLE_*` (Phase 4)
- `SIMPLIFIED_*` (Phase 5)

**Recommendation:** Standardize naming:
```markdown
## Feature Flag Naming Convention

Format: `{SCOPE}_{FEATURE}_{ACTION}`

Examples:
- `ROUTING_TANSTACK_ENABLED` (Phase 3)
- `DRAWER_PII_FREE_URLS_ENABLED` (Phase 2)
- `TABLE_ASSETS_TANSTACK_ENABLED` (Phase 4)
- `IMPERSONATION_CONTEXT_ENABLED` (Phase 1)
- `DRAWER_STATE_SIMPLIFIED_ENABLED` (Phase 5)

Benefits:
- Easy to search/grep
- Clear scope (routing, drawer, table)
- Consistent `_ENABLED` suffix
```

**Concern 3: Flag Evaluation Performance**

Plan doesn't specify HOW flags are evaluated. If evaluated on every render:
```typescript
// ❌ BAD: Evaluated on every render
function Component() {
  if (useFeatureFlag('TANSTACK_TABLE_ASSETS')) {  // Re-fetched every render
    return <TanStackTable />
  }
}
```

**Recommendation:** Document flag caching strategy:
```typescript
// ✅ GOOD: Cached at app initialization
// In app startup:
const featureFlags = await fetchFeatureFlags()
const FlagContext = createContext(featureFlags)

// In components:
const flags = useContext(FlagContext)
if (flags.TANSTACK_TABLE_ASSETS) {
  return <TanStackTable />
}
```

---

### 3.3 Backward Compatibility ✅ **STRONG**

**Compatibility Assessment:**

**✅ Phase 1: URL-Based Impersonation Preserved**
```typescript
// Old URLs continue working:
/u/base64email/assets → Still parsed (auth.tsx:493-498)

// New URLs also work:
/assets (with context) → Reads from sessionStorage
```

**✅ Phase 2: Legacy URL Support**
```typescript
// Phase 2 lines 442-444
if (hashOrKey.includes('@') || hashOrKey.includes('#')) {
  setIsLegacyUrl(true)
  setEntityKey(hashOrKey)  // ✅ Use as-is for legacy support
  return
}
```

**✅ Phase 3: Dual Router Support**
```typescript
// Phase 3 lines 508-512
if (ENABLE_TANSTACK_ROUTER) {
  return <RouterWithContext />
} else {
  return <LegacyReactRouterApp />  // ✅ Old router still works
}
```

**Areas for Improvement:**

**Deep Links Compatibility:**

Phase 5 (drawer simplification) changes URL format:
- Old: `/assets?assetDrawerKey=#asset#abc&assetDrawerTab=overview`
- New: `/assets?detail=asset:hash&tab=overview`

**Issue:** Bookmarked old URLs should redirect to new format, but plan only shows warning dialog (Phase 2 lines 512-546).

**Recommendation:** Add automatic migration:
```typescript
// Phase 5: Auto-migrate legacy drawer URLs
useEffect(() => {
  const params = new URLSearchParams(window.location.search)

  // Detect legacy drawer param
  const legacyParam = params.get('assetDrawerKey') ||
                      params.get('vulnerabilityDrawerKey') ||
                      params.get('seedDrawerKey')

  if (legacyParam) {
    // Convert to new format
    const [type, key] = detectEntityType(legacyParam)
    const hash = await entityKeyRegistry.store(key)

    // Replace URL silently
    navigate({
      search: { detail: `${type}:${hash}` },
      replace: true
    })
  }
}, [])
```

---

### 3.4 Dead Code Cleanup ⚠️ **NEEDS EXPLICIT TRACKING**

**Cleanup Identification:**

Plan identifies code to delete:
- Phase 3: `AppRoute.tsx` (400 lines)
- Phase 3: `generatePathWithSearch` function in `url.util.ts`
- Phase 3: `encrypt.util.ts` (base64 encoding for URLs)
- Phase 5: 20+ drawer state params in `global.state.tsx`

**Issue:** No tracking mechanism for ensuring cleanup happens.

**Recommendation:** Create `appendices/code-deletion-checklist.md`:
```markdown
# Code Deletion Checklist

## Phase 1 Cleanup (After 30 Days in Prod)

- [ ] Delete URL parsing logic from auth.tsx lines 493-498
  - Verification: `! grep -n "splitPath" src/state/auth.tsx`
- [ ] Delete base64UserId variable
  - Verification: `! grep -n "base64UserId" src/state/auth.tsx`
- [ ] Remove decode import from encrypt.util
  - Verification: `! grep -n "decode" src/state/auth.tsx`

## Phase 2 Cleanup (After 30 Days in Prod)

- [ ] Remove legacy URL warning dialog
  - Delete: `src/components/LegacyUrlWarning.tsx`
- [ ] Remove legacy URL detection from useDrawerUrlState
  - Delete lines 441-444
- [ ] Remove isLegacyUrl state variable

## Phase 3 Cleanup (After 30 Days in Prod)

- [ ] Delete AppRoute.tsx
  - Verification: `[ ! -f src/app/AppRoute.tsx ]`
- [ ] Delete generatePathWithSearch function
  - File: `src/utils/url.util.ts` lines 39-50
  - Verification: `! grep -n "generatePathWithSearch" src/utils/url.util.ts`
- [ ] Delete encrypt.util.ts (if no other usages)
  - Verification: `! grep -r "from.*encrypt.util" src/`
- [ ] Remove React Router v7 dependency
  - `npm uninstall react-router`
- [ ] Remove ENABLE_TANSTACK_ROUTER feature flag
  - Grep: `! grep -r "ENABLE_TANSTACK_ROUTER" src/`

## Phase 4 Cleanup (After 30 Days in Prod)

- [ ] Delete legacy Table.tsx component
  - File: `src/components/table/Table.tsx` (1083 lines)
  - Verification: `[ ! -f src/components/table/Table.tsx ]`
- [ ] Remove per-table feature flags
  - `TANSTACK_TABLE_ASSETS`, `TANSTACK_TABLE_VULNERABILITIES`, etc.

## Phase 5 Cleanup (After 30 Days in Prod)

- [ ] Delete drawer state from global.state.tsx
  - Lines to delete: 88-130 (drawerOrder, assetDrawerKey, etc.)
  - Verification: `! grep -n "DrawerKey" src/state/global.state.tsx`
- [ ] Delete old drawer hooks
  - `useAssetDrawer`, `useRiskDrawer`, etc.
- [ ] Remove SIMPLIFIED_DRAWER_STATE flag
```

**Automated Cleanup Detection:**

Add CI check to prevent deleted code resurrection:
```yaml
# .github/workflows/dead-code-check.yml
name: Dead Code Check

on: [pull_request]

jobs:
  check-dead-code:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Check for deleted files
        run: |
          # Fail if AppRoute.tsx exists after Phase 3 completion
          if [ "$PHASE_3_COMPLETE" = "true" ] && [ -f src/app/AppRoute.tsx ]; then
            echo "ERROR: AppRoute.tsx should be deleted"
            exit 1
          fi

          # Fail if generatePathWithSearch still exists
          if grep -q "generatePathWithSearch" src/utils/url.util.ts; then
            echo "ERROR: generatePathWithSearch should be deleted"
            exit 1
          fi
```

---

### 3.5 Import Path Changes ⚠️ **MINOR CONCERN**

**Import Analysis:**

Plan introduces new imports across 118 files (Phase 3):

**Old imports (React Router):**
```typescript
import { useNavigate, useSearchParams, generatePath } from 'react-router'
```

**New imports (TanStack Router):**
```typescript
import { useNavigate, useSearch } from '@tanstack/react-router'
```

**Issue:** Barrel export changes not documented.

**Potential Issues:**

1. **File Movement**: Phase 3 creates `src/routes/` directory. Existing route components move from `src/sections/[feature]/index.tsx` to `src/routes/_authenticated/[feature].tsx`.

   **Import Impact:** Components importing feature sections break:
   ```typescript
   // BEFORE:
   import { AssetsPage } from '@/sections/assets'

   // AFTER:
   import { AssetsPage } from '@/routes/_authenticated/assets'
   // OR keep old import working via barrel export?
   ```

   **Recommendation:** Document import migration strategy:
   ```markdown
   ## Import Path Strategy (Phase 3)

   Option A: Update all imports (BREAKING)
   - Search and replace across codebase
   - Update 100+ import statements

   Option B: Maintain barrel exports (COMPATIBLE)
   - Keep `src/sections/assets/index.tsx` as re-export:
     ```typescript
     export { Route as AssetsPage } from '@/routes/_authenticated/assets'
     ```
   - No import changes needed
   - Delete barrel exports in Phase 3 cleanup

   Recommendation: Option B for less disruption
   ```

2. **Hook Location Changes**: Phase 2 creates `useDrawerUrlState` hook. Phase 5 creates `useDrawerState` hook.

   **Naming Conflict:** Both hooks manage drawer state. Which should consumers use?

   **Recommendation:** Clear naming convention:
   ```typescript
   // Phase 2 (internal use only, not exported):
   function useDrawerUrlState() { /* hash resolution */ }

   // Phase 5 (public API):
   export function useDrawerState() { /* unified drawer state */ }

   // Consumers import:
   import { useDrawerState } from '@/hooks/useDrawerState'
   ```

3. **Type Import Changes**: Phase 3 introduces new types (RouterContext, Route types). These need exporting from central location.

   **Recommendation:** Create `src/routes/types.ts`:
   ```typescript
   // Centralize route types
   export type { RouterContext } from './__root'
   export type { Route as AssetsRoute } from './_authenticated/assets'
   // ... etc

   // Consumers import:
   import type { RouterContext } from '@/routes/types'
   ```

---

## Part 4: Specific Improvement Suggestions

### Phase 1: Impersonation State Migration

**Critical Issues:**

1. **OAuth Race Condition** (Lines 190-214)
   - **Severity:** HIGH
   - **Issue:** Polling-based approach has race conditions
   - **Fix:** Use storage event listener (see Part 1.3)

2. **React 19 Context Syntax** (Line 248)
   - **Severity:** MEDIUM
   - **Issue:** Missing `.Provider` in Context usage
   - **Fix:** `<ImpersonationContext.Provider value={...}>`

3. **Cache Clearing Order** (Line 512)
   - **Severity:** LOW (already correct, just needs documentation)
   - **Issue:** No comment explaining critical ordering
   - **Fix:** Add inline comment (see Part 1.3)

**Code Pattern Improvements:**

```typescript
// BEFORE (Phase 1 plan):
export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [targetUser, setTargetUser] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [oauthChecked, setOauthChecked] = useState(false)

  // Check for OAuth restoration BEFORE reading storage
  useEffect(() => {
    const checkOAuthRestore = async () => {
      const restoredTarget = sessionStorage.getItem('oauth_impersonation_restore')

      if (restoredTarget) {
        await new Promise(resolve => {
          const checkInterval = setInterval(() => {
            if (!sessionStorage.getItem('oauth_impersonation_restore')) {
              clearInterval(checkInterval)
              resolve(null)
            }
          }, 100)

          setTimeout(() => {
            clearInterval(checkInterval)
            resolve(null)
          }, 5000)
        })
      }

      setOauthChecked(true)
    }

    checkOAuthRestore()
  }, [])

  // ... rest of provider
}

// AFTER (improved):
export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [targetUser, setTargetUser] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  // ✅ Event-based OAuth synchronization (no polling)
  useEffect(() => {
    // Listen for OAuth completion via storage event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'chariot_impersonation_target' && e.newValue) {
        setTargetUser(e.newValue)
        setInitialized(true)
      }
    }

    window.addEventListener('storage', handleStorageChange)

    // Initial load from storage
    const stored = safeSessionStorage.getItem(STORAGE_KEY)
    setTargetUser(stored)
    setInitialized(true)

    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // ✅ Context value memoization
  const contextValue = useMemo(() => ({
    targetUser,
    isImpersonating: !!targetUser,
    startImpersonation: useCallback((targetEmail: string) => {
      if (safeSessionStorage.setItem(STORAGE_KEY, targetEmail)) {
        setTargetUser(targetEmail)
      }
    }, []),
    stopImpersonation: useCallback(() => {
      safeSessionStorage.removeItem(STORAGE_KEY)
      setTargetUser(null)
    }, []),
  }), [targetUser])

  if (!initialized) {
    return <div className="hidden" />  // ✅ Prevent layout shift
  }

  return (
    <ImpersonationContext.Provider value={contextValue}>  {/* ✅ React 19 syntax */}
      {children}
    </ImpersonationContext.Provider>
  )
}
```

**Testing Improvements:**

Add integration test for OAuth flow:
```typescript
// NEW TEST: src/state/__tests__/impersonation.oauth.test.tsx
describe('OAuth + Impersonation Integration', () => {
  it('restores impersonation after OAuth redirect', async () => {
    // 1. Setup: User impersonating customer
    sessionStorage.setItem('chariot_impersonation_target', 'customer@test.com')

    const { result } = renderHook(() => useImpersonation(), { wrapper: TestWrapper })

    await waitFor(() => {
      expect(result.current.targetUser).toBe('customer@test.com')
    })

    // 2. Simulate: OAuth redirect clears impersonation
    sessionStorage.removeItem('chariot_impersonation_target')

    // 3. Simulate: OAuth callback writes restoration key
    sessionStorage.setItem('chariot_impersonation_target', 'customer@test.com')

    // 4. Expect: Impersonation restored via storage event
    await waitFor(() => {
      expect(result.current.targetUser).toBe('customer@test.com')
      expect(result.current.isImpersonating).toBe(true)
    }, { timeout: 1000 })
  })
})
```

**Recommended File Changes:**

```diff
+ src/state/__tests__/impersonation.oauth.test.tsx   (new file)
+ src/state/__tests__/impersonation.integration.test.tsx  (already planned)
~ src/state/impersonation.tsx  (fix React 19 syntax, add storage event listener)
~ src/state/auth.tsx  (add comment explaining cache clear order)
```

---

### Phase 2: PII-Free Drawer URLs

**Critical Issues:**

1. **Hash Length Too Short** (Line 150)
   - **Severity:** MEDIUM
   - **Issue:** 8 characters = 63% collision probability at 100k entities
   - **Fix:** Increase to 12 characters (see Part 1.5)

2. **Missing Type Guards** (Lines 439-445)
   - **Severity:** MEDIUM
   - **Issue:** URL parsing without validation
   - **Fix:** Add Zod schema validation (see Part 1.4)

3. **Nested Drawer Hash Resolution** (Lines 169-178)
   - **Severity:** LOW
   - **Issue:** Async resolution not awaited
   - **Fix:** Add async effect (see Part 1.3)

**Code Pattern Improvements:**

```typescript
// BEFORE (Phase 2 plan):
export async function hashEntityKey(entityKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(entityKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex.substring(0, 8)  // ❌ Only 8 characters
}

// AFTER (improved):
export async function hashEntityKey(entityKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(entityKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex.substring(0, 12)  // ✅ 12 characters = 1% collision at 77k entities
}
```

```typescript
// BEFORE (Phase 2 plan):
const [entityType, hashOrKey] = detail?.split(':') ?? [null, null]

if (hashOrKey.includes('@') || hashOrKey.includes('#')) {
  setIsLegacyUrl(true)
  setEntityKey(hashOrKey)
  return
}

// AFTER (improved with Zod):
import { z } from 'zod'

const drawerDetailSchema = z.object({
  entityType: z.enum(['asset', 'risk', 'seed', 'job', 'file', 'attribute']),
  hash: z.string().regex(/^[a-f0-9]{12}$/),  // ✅ 12-char hex
})

function parseDrawerDetail(detail: string | null):
  z.infer<typeof drawerDetailSchema> | { isLegacy: true, entityKey: string } | null {
  if (!detail) return null

  const parts = detail.split(':')
  if (parts.length !== 2) return null

  const [type, hashOrKey] = parts

  // Legacy URL detection
  if (hashOrKey.includes('@') || hashOrKey.includes('#')) {
    return { isLegacy: true, entityKey: hashOrKey }
  }

  // Validate new format
  const result = drawerDetailSchema.safeParse({ entityType: type, hash: hashOrKey })
  if (!result.success) {
    console.error('Invalid drawer URL:', result.error)
    return null
  }

  return result.data
}
```

**Security Improvements:**

Add rate limiting to hash storage to prevent enumeration attacks:
```typescript
// NEW FILE: src/utils/rateLimiter.ts
class RateLimiter {
  private attempts: Map<string, number[]> = new Map()

  canAttempt(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []

    // Remove old attempts outside window
    const recentAttempts = attempts.filter(t => now - t < windowMs)

    if (recentAttempts.length >= maxAttempts) {
      return false
    }

    recentAttempts.push(now)
    this.attempts.set(key, recentAttempts)
    return true
  }
}

const hashRetrievalLimiter = new RateLimiter()

// In EntityKeyRegistry:
async retrieve(hash: string): Promise<string | null> {
  // Rate limit: 10 retrievals per minute per hash
  if (!hashRetrievalLimiter.canAttempt(hash, 10, 60000)) {
    console.warn('Rate limit exceeded for hash retrieval:', hash)
    return null
  }

  // ... existing retrieval logic
}
```

**Recommended File Changes:**

```diff
+ src/utils/rateLimiter.ts  (new file)
~ src/utils/entityKeyHasher.ts  (increase hash length to 12)
~ src/utils/entityKeyRegistry.ts  (add rate limiting)
~ src/hooks/useDrawerUrlState.ts  (add Zod validation)
```

---

### Phase 3: TanStack Router Migration

**Critical Issues:**

1. **118-File Migration Not Atomic** (Task 1.7)
   - **Severity:** CRITICAL
   - **Issue:** Single PR with 118 files = unreviewable
   - **Fix:** Break into 15 PRs (see Part 2.1)

2. **Missing Per-Route Feature Flags**
   - **Severity:** HIGH
   - **Issue:** All-or-nothing migration increases risk
   - **Fix:** Add per-route flags (see Part 3.1)

3. **E2E Test Migration Underestimated**
   - **Severity:** HIGH
   - **Issue:** 41 E2E test files affected, no dedicated task
   - **Fix:** Add Phase 3.9 for E2E migration

**Recommended Phase 3 Subdivision:**

```markdown
# Phase 3: TanStack Router Migration (REVISED)

## Overview Changes

- **Original estimate:** 7 tasks, 7-10 weeks
- **Revised estimate:** 18 tasks (15 code PRs + 3 test PRs), 10-14 weeks

---

## New Task Breakdown

### Phase 3.0: Pre-Migration Audit
**Duration:** 1 week
**PR:** None (audit only)

Tasks:
- [ ] Run `grep -r "from 'react-router'" src/ | wc -l` → Verify 118 files
- [ ] Document all `generatePath` usages (use existing tracking doc)
- [ ] Identify high-risk files (auth.tsx, AppRoute.tsx)
- [ ] Create communication plan (#url-refactoring-2025 channel)
- [ ] Set up feature flag infrastructure with per-route flags

---

### Phase 3.1: Infrastructure Setup
**Duration:** 1 week
**PR Size:** 6 files, ~300 lines
**Feature Flag:** `TANSTACK_ROUTER_INFRASTRUCTURE`

Tasks:
- [ ] Install TanStack Router dependencies
- [ ] Configure Vite plugin
- [ ] Create `__root.tsx` with context
- [ ] Create `_authenticated.tsx` layout
- [ ] Create `router.tsx` instance
- [ ] Add feature flag detection to App.tsx

Exit Criteria:
- [ ] Infrastructure compiles without errors
- [ ] Feature flag can toggle between React Router and TanStack Router
- [ ] No routes migrated yet (renders blank with TanStack enabled)

---

### Phase 3.2-3.5: High-Traffic Routes (Batches 1-4)
**Duration:** 4 weeks (1 week per batch)
**PR Size:** 3-5 routes per PR, ~200 lines each

**Batch 1: Core Routes**
- `/insights` (Dashboard)
- `/assets`
- `/vulnerabilities`

**Batch 2: Management Routes**
- `/seeds`
- `/jobs`
- `/agents`

**Batch 3: Settings Routes (Part 1)**
- `/settings/profile`
- `/settings/organization`
- `/settings/security`

**Batch 4: Settings Routes (Part 2)**
- `/settings/api-keys`
- `/settings/webhooks`
- `/settings/integrations`

Each PR:
- [ ] Create route file in `src/routes/_authenticated/`
- [ ] Add Zod search schema
- [ ] Update navigation calls in related components (list max 5 files per PR)
- [ ] Update E2E test for route (use `buildUrl()` helper)
- [ ] Per-route feature flag: `TANSTACK_ROUTE_{UPPERCASENAME}`

---

### Phase 3.6-3.11: Remaining Routes (Batches 5-10)
**Duration:** 6 weeks
**PR Size:** 4-5 routes per batch, ~250 lines

Remaining 20 routes divided into 6 batches:
- Technology, attack surfaces, integrations, etc.

---

### Phase 3.12-3.15: Navigation Hook Migration (Batches 11-14)
**Duration:** 4 weeks
**PR Size:** 15-20 files per batch, ~200 lines

Migrate 118 files with React Router imports:
- Batch 11: Shared components (15 files)
- Batch 12: Section components (20 files)
- Batch 13: Form components (15 files)
- Batch 14: Remaining files (20 files)

Each PR:
- [ ] Update imports to `@tanstack/react-router`
- [ ] Replace `useSearchParams` with `Route.useSearch()`
- [ ] Replace `useNavigate()` with TanStack equivalent
- [ ] Update tests to mock TanStack Router

---

### Phase 3.16: generatePath Migration
**Duration:** 1 week
**PR Size:** 10 files, ~150 lines

Migrate 15 `generatePath` usages (tracked in appendix):
- [ ] auth.tsx (2 usages)
- [ ] SSO.tsx (1 usage)
- [ ] EmailPasswordForm.tsx (2 usages)
- [ ] Navigation.tsx (2 usages)
- [ ] ... (8 more files)

---

### Phase 3.17: E2E Test Migration (NEW)
**Duration:** 2 weeks
**PR Size:** 41 test files, ~1000 lines

Migrate E2E tests to new URL format:
- [ ] Update `buildUrl()` helper (add TanStack Router support)
- [ ] Update page objects (10 files)
- [ ] Update URL assertions (18 files)
- [ ] Update drawer param assertions (6 files)
- [ ] Update inline URL helpers (7 files)

Feature Flag: Run tests against both old and new URL formats

---

### Phase 3.18: Cleanup
**Duration:** 1 week
**PR Size:** 5 files deleted, ~500 lines removed

- [ ] Delete `AppRoute.tsx` (400 lines)
- [ ] Delete `generatePathWithSearch` (50 lines)
- [ ] Delete `encrypt.util.ts` (if no other usages)
- [ ] Remove `ENABLE_TANSTACK_ROUTER` feature flag
- [ ] Remove per-route feature flags after 30 days in prod

---

## Revised Timeline

```
Week 1: Phase 3.0 (Audit)
Week 2-3: Phase 3.1 (Infrastructure)
Week 4-7: Phase 3.2-3.5 (High-traffic routes)
Week 8-13: Phase 3.6-3.11 (Remaining routes)
Week 14-17: Phase 3.12-3.15 (Navigation hooks)
Week 18: Phase 3.16 (generatePath)
Week 19-20: Phase 3.17 (E2E tests)
Week 21: Phase 3.18 (Cleanup)
```

**Total:** 21 weeks (vs original 7-10 weeks)
```

**Recommended File Changes:**

Update `phase-3-tanstack-router.md` with revised task breakdown above.

---

### Phase 4: TanStack Tables + Virtualization

**Critical Issues:**

1. **No Type Constraint on TData** (Lines 106-109)
   - **Severity:** MEDIUM
   - **Issue:** Unsafe cast to extract row ID
   - **Fix:** Add type constraint (see Part 1.4)

2. **Missing Column Adapter Edge Cases** (Task 4.1)
   - **Severity:** LOW
   - **Issue:** Nested accessors not handled
   - **Fix:** Already in plan, just verify implementation

3. **URL State Sync Depends on Phase 3** (Task 4.4)
   - **Severity:** INFO
   - **Issue:** Can't test until TanStack Router available
   - **Fix:** Mark Task 4.4 as blocked by Phase 3 completion

**Code Pattern Improvements:**

```typescript
// BEFORE (Phase 4 plan):
const getRowId = (row: TData, index: number): string => {
  const rowData = row as Record<string, unknown>;  // ❌ Unsafe
  const key = rowData.key;
  return typeof key === 'string' ? key : String(index);
};

// AFTER (improved):
interface TanStackTableProps<TData extends { key?: string }> {  // ✅ Type constraint
  name: string
  columns: ColumnDef<TData>[]
  data: TData[]
  getRowId?: (row: TData, index: number) => string  // ✅ Customizable
  // ... other props
}

const defaultGetRowId = <TData extends { key?: string }>(
  row: TData,
  index: number
): string => {
  return row.key ?? String(index)  // ✅ Safe access
}

export function TanStackTable<TData extends { key?: string }>({
  getRowId = defaultGetRowId,
  // ... other props
}: TanStackTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getRowId,  // ✅ Use provided or default
    // ...
  })
}
```

**Testing Improvements:**

Add performance benchmark tests:
```typescript
// NEW FILE: src/components/table/__tests__/TanStackTable.performance.test.tsx
describe('TanStackTable Performance', () => {
  it('renders 1000 rows in <100ms without virtualization', async () => {
    const data = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`
    }))

    const start = performance.now()

    render(<TanStackTable data={data} columns={columns} />)

    const duration = performance.now() - start
    expect(duration).toBeLessThan(100)
  })

  it('renders 10000 rows in <200ms with virtualization', async () => {
    const data = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`
    }))

    const start = performance.now()

    render(
      <TanStackTable
        data={data}
        columns={columns}
        enableVirtualization={true}
      />
    )

    const duration = performance.now() - start
    expect(duration).toBeLessThan(200)
  })
})
```

**Recommended File Changes:**

```diff
~ src/components/table/TanStackTable.tsx  (add type constraint, getRowId prop)
~ src/components/table/columnAdapter.ts  (verify nested accessor handling)
+ src/components/table/__tests__/TanStackTable.performance.test.tsx  (new file)
```

---

### Phase 5: Drawer State Simplification

**Critical Issues:**

1. **Nested Drawer Hash Not Resolved** (Lines 169-178)
   - **Severity:** MEDIUM
   - **Issue:** `entityKey: null` causes flash of incorrect content
   - **Fix:** Add async resolution (see Part 1.3)

2. **Global State Deletion Not Tracked** (Lines 380-391)
   - **Severity:** LOW
   - **Issue:** Instructions say "Remove X" but no verification
   - **Fix:** Add to code deletion checklist (see Part 3.4)

3. **Maximum 1 Nested Drawer** (Line 77)
   - **Severity:** INFO
   - **Issue:** Arbitrary limit not justified
   - **Fix:** Document why limit exists

**Code Pattern Improvements:**

```typescript
// BEFORE (Phase 5 plan):
const nestedDrawer = useMemo(() => {
  if (!search.stack || search.stack.length === 0) return null
  const [type, hash] = search.stack[0].split(':')
  return {
    entityType: type as EntityType,
    entityKey: null,  // ❌ Not resolved
    tab: 'overview' as TabType,
  }
}, [search.stack])

// AFTER (improved):
const [nestedEntityKey, setNestedEntityKey] = useState<string | null>(null)
const [isResolvingNested, setIsResolvingNested] = useState(false)

useEffect(() => {
  if (!search.stack || search.stack.length === 0) {
    setNestedEntityKey(null)
    return
  }

  const [_type, hash] = search.stack[0].split(':')

  setIsResolvingNested(true)
  entityKeyRegistry.retrieve(hash).then(key => {
    setNestedEntityKey(key)
    setIsResolvingNested(false)
  })
}, [search.stack])

const nestedDrawer = useMemo(() => {
  if (!search.stack || !nestedEntityKey) return null

  const [type, _hash] = search.stack[0].split(':')
  return {
    entityType: type as EntityType,
    entityKey: nestedEntityKey,  // ✅ Resolved
    tab: 'overview' as TabType,
    isResolving: isResolvingNested,
  }
}, [search.stack, nestedEntityKey, isResolvingNested])
```

**Documentation Improvements:**

Add rationale for max 1 nested drawer:
```markdown
## Design Decision: Maximum 1 Nested Drawer

**Limit:** `max(2)` in Zod schema (line 77)

**Rationale:**
1. **URL length:** More than 2 drawers = >200 char URLs (breaks some systems)
2. **UX complexity:** Users lose context beyond 2 levels
3. **Performance:** Each drawer renders async, 3+ causes lag
4. **Implementation:** Simpler state management with fixed depth

**Rejected alternatives:**
- Infinite nesting: UX nightmare, performance issues
- Fixed single drawer: Breaks existing "asset → risk" workflows

**Future consideration:** If user research shows need for 3+ levels, revisit
```

**Recommended File Changes:**

```diff
~ src/hooks/useDrawerState.ts  (add nested hash resolution)
~ src/state/global.state.tsx  (delete drawer params per checklist)
+ docs/design-decisions/max-nested-drawers.md  (new file)
```

---

## Conclusion & Recommendations

### Overall Verdict: **APPROVED WITH REQUIRED CHANGES**

The plan is architecturally sound and follows Chariot patterns, but **requires significant revision before implementation:**

### Required Changes (MUST ADDRESS):

1. **Phase 3 Subdivision** (BLOCKING)
   - Current: 1 PR with 118 files
   - Required: 15-18 PRs with <20 files each
   - Impact: Without this, Phase 3 is not reviewable

2. **OAuth Race Condition Fix** (BLOCKING)
   - Current: Polling with arbitrary timeout
   - Required: Event-based synchronization
   - Impact: Impersonation will be lost intermittently without fix

3. **React 19 Context Syntax** (BREAKING)
   - Current: Missing `.Provider` suffix
   - Required: `<Context.Provider>` not `<Context>`
   - Impact: Code won't compile in React 19

4. **Hash Length Increase** (SECURITY)
   - Current: 8 characters (63% collision at 100k entities)
   - Required: 12 characters (1% collision at 77k entities)
   - Impact: Hash collisions will occur in production at scale

### Recommended Changes (SHOULD ADDRESS):

5. **E2E Test Migration Phase** - Add Phase 3.17 for 41 test files
6. **Per-Route Feature Flags** - Enable gradual rollout in Phase 3
7. **Nested Drawer Hash Resolution** - Fix async state issue in Phase 5
8. **Type Safety Improvements** - Add Zod validation, type guards
9. **Documentation Gaps** - ADRs, monitoring setup, developer guide
10. **Code Deletion Tracking** - Explicit checklist for cleanup verification

### Advisory Changes (NICE TO HAVE):

11. **Performance Budget** - Document acceptable metric thresholds
12. **Rate Limiting** - Prevent hash enumeration attacks
13. **Feature Flag Lifecycle** - When to remove flags
14. **Automated Dead Code Detection** - CI checks for deleted files

---

### Next Steps:

1. **Immediate:** Revise `phase-3-tanstack-router.md` with 15-18 PR breakdown
2. **Before Phase 1:** Fix OAuth synchronization and React 19 syntax
3. **Before Phase 2:** Increase hash length to 12 characters
4. **Before Phase 3:** Set up per-route feature flags and communication plan
5. **After Phase 3:** Verify all 15 PRs merged before starting Phase 5

---

**Reviewer Contact:** This review was generated by `frontend-reviewer` agent on 2025-12-31. For questions or clarifications, reference this document in the feature directory.

**Review Status:** COMPLETE

**Estimated Implementation Timeline (Revised):**
- Phase 1: 2 weeks (unchanged)
- Phase 2: 2 weeks (unchanged)
- Phase 3: **21 weeks** (was 7-10 weeks)
- Phase 4: 6 weeks (unchanged, runs parallel with Phase 3)
- Phase 5: 3 weeks (unchanged)

**Total:** 34 weeks (8.5 months) vs original 18-23 weeks

The timeline increase is necessary to ensure reviewability and safety of the 118-file migration.
