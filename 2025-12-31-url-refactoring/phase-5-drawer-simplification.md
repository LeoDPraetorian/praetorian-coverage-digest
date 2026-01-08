# Phase 5: Drawer State Simplification

> **Phase Status:** Not Started
> **Estimated PRs:** 3
> **Duration:** 2-3 weeks
> **Risk Level:** MEDIUM

---

## Post-Review Notes

> These clarifications were added based on the 2025-12-31 three-agent review.

| Note | Context |
|------|---------|
| **Async Hash Resolution** | Nested drawer must resolve hash asynchronously before rendering. |
| **Max Nesting Enforcement** | Add runtime validation to reject >2 nested drawers. |
| **DrawerController Switch** | Replace switch statement with registry pattern for extensibility. |

---

## Code Quality Fixes (Post-Frontend-Reviewer Feedback)

> These issues were identified in the 2025-12-31 frontend-reviewer feedback (Round 2) and SHOULD be addressed.

| Issue | Priority | Fix Location |
|-------|----------|--------------|
| **Discriminated Unions** | HIGH | Task 5.1 - Redesign DrawerState type to prevent impossible states |
| **Async Cleanup** | HIGH | Task 5.1 - Add cleanup flag pattern to prevent setState on unmounted component |

---

## Security Fixes (Post-Security Review)

> These issues were identified in the 2025-12-31 security review and MUST be addressed.

| Issue | Severity | Fix Location |
|-------|----------|--------------|
| **MED-5: Nested Drawer DoS** | MEDIUM | Task 5.1 - **Reject** (not warn) when `stack.length > 2` |
| **M-09: Drawer Type Confusion** | MEDIUM | Task 5.1 - Validate entityType matches resolved key format |
| **H-05: Access Pre-Check** | HIGH | Task 5.3 (NEW) - Pre-validate entity access before opening nested drawer |

---

## Entry Criteria

**Prerequisites from previous phases:**

- ✅ Phase 1: Impersonation context implemented
- ✅ Phase 2: PII-free URLs implemented
- ✅ Phase 3: TanStack Router migration complete
- ✅ Tests passing before starting this phase

**If entry criteria not met:** Complete Phase 3 first.

---

## Exit Criteria (Definition of Done)

This phase is complete when:

- [ ] All 3 tasks implemented with passing tests (including Task 5.3 security fix)
- [ ] No TypeScript compilation errors
- [ ] `global.state.tsx` significantly reduced in complexity
- [ ] Drawers open/close correctly
- [ ] Nested drawers (max 2) work
- [ ] Shareable links work (copy URL → paste → drawer opens)
- [ ] Deep links work (navigate directly to `/assets?detail=asset:hash`)
- [ ] Browser back/forward works
- [ ] Feature flag `SIMPLIFIED_DRAWER_STATE` functional
- [ ] **SECURITY:** >2 nested drawers rejected (not warned) and URL cleared
- [ ] **SECURITY:** Entity type validated against resolved key format
- [ ] **SECURITY:** Entity access pre-validated before nested drawer opens
- [ ] All E2E tests updated and passing
- [ ] Committed to version control

---

## Phase Goal

**What this phase accomplishes:**

Simplify drawer URL state using TanStack Router's type-safe search params. Reduce `global.state.tsx` from 1063 lines by consolidating 12+ `{type}DrawerKey` params into a single unified `detail` param.

**What this phase does NOT include:**

- Any backend changes
- Additional drawer features

---

## Current Complexity

`src/state/global.state.tsx` (1063 lines) manages 20+ URL parameters:

```typescript
// Current: Complex, error-prone, hard to maintain
- drawerOrder (array of drawer types)
- assetDrawerKey, assetDrawerTab
- vulnerabilityDrawerKey, vulnerabilityDrawerTab
- seedDrawerKey, seedDrawerTab
- riskDrawerKey, riskDrawerTab
- jobDrawerKey, jobDrawerTab
- ... 7 more drawer types
```

---

## Simplified Architecture

**Target: Unified drawer state with TanStack Router**

```typescript
const searchSchema = z.object({
  // Single drawer param with entity ID (prefix indicates type)
  detail: z.string().optional(), // "asset:a7f3b2c1" or "risk:abc123"
  tab: z.string().optional(),    // Selected tab - shareable via URL
  stack: z.array(z.string()).max(2).optional(), // Nested drawers
})

// Example shareable URL: /assets?detail=asset:abc123&tab=vulnerabilities
```

**Before/After Comparison:**

| Aspect | Before | After |
|--------|--------|-------|
| URL params | 20+ | 3 |
| Code lines | ~1063 | ~300 |
| Type safety | Manual | Zod validated |
| Shareability | Works | Works |
| Deep linking | Works | Works |

---

## Tasks

### Task 5.1: Migrate Drawer State

**Files:**
- Modify: `src/state/global.state.tsx`
- Create: `src/hooks/useDrawerState.ts`

**Step 1: Create new drawer state hook**

```typescript
// src/hooks/useDrawerState.ts
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'
import { entityKeyRegistry } from '@/utils/entityKeyRegistry'

type EntityType = 'asset' | 'risk' | 'seed' | 'job' | 'file' | 'attribute'
type TabType = 'overview' | 'vulnerabilities' | 'history' | 'details' | 'timeline'

// FIXED: Use discriminated unions to prevent impossible states (per frontend-reviewer feedback)
// When isOpen is false, entity fields MUST be null. This type enforces that invariant.
type DrawerState =
  | {
      // Closed state - all entity fields must be null
      isOpen: false
      entityType: null
      entityKey: null
      entityHash: null
      tab: 'overview' // Default tab when closed
      isResolving: false
      nestedDrawer: null
      // Actions (same signature for both states)
      openDrawer: (type: EntityType, key: string, tab?: TabType) => Promise<void>
      closeDrawer: () => void
      setTab: (tab: TabType) => void
      openNestedDrawer: (type: EntityType, key: string, tab?: TabType) => Promise<void>
      closeNestedDrawer: () => void
    }
  | {
      // Open state - entity fields are populated
      isOpen: true
      entityType: EntityType
      entityKey: string | null // Can be null while resolving
      entityHash: string
      tab: TabType
      isResolving: boolean
      nestedDrawer: {
        entityType: EntityType
        entityKey: string | null
        tab: TabType
        isResolving: boolean
      } | null
      // Actions (same signature for both states)
      openDrawer: (type: EntityType, key: string, tab?: TabType) => Promise<void>
      closeDrawer: () => void
      setTab: (tab: TabType) => void
      openNestedDrawer: (type: EntityType, key: string, tab?: TabType) => Promise<void>
      closeNestedDrawer: () => void
    }

export function useDrawerState(): DrawerState {
  const search = useSearch({ strict: false })
  const navigate = useNavigate()

  // Parse current drawer state
  const [entityType, entityHash] = useMemo(() => {
    if (!search.detail) return [null, null]
    const [type, hash] = search.detail.split(':')
    return [type as EntityType, hash]
  }, [search.detail])

  // Resolve hash to key (async)
  const [entityKey, setEntityKey] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)

  useEffect(() => {
    if (!entityHash) {
      setEntityKey(null)
      return
    }

    setIsResolving(true)
    entityKeyRegistry.retrieve(entityHash).then(key => {
      setEntityKey(key)
      setIsResolving(false)
    })
  }, [entityHash])

  // FIXED: Resolve nested drawer hash asynchronously (per review feedback)
  const [nestedDrawer, setNestedDrawer] = useState<{
    entityType: EntityType
    entityKey: string | null
    tab: TabType
    isResolving: boolean
  } | null>(null)

  // FIXED: Add cleanup flag pattern to prevent setState on unmounted component
  // (per frontend-reviewer feedback - prevents React warnings and memory leaks)
  useEffect(() => {
    let cancelled = false  // Cleanup flag

    if (!search.stack || search.stack.length === 0) {
      setNestedDrawer(null)
      return
    }

    // SECURITY FIX (MED-5): REJECT (not warn) when >2 nested drawers
    // This prevents DoS attacks via deeply nested drawer URLs that
    // could cause excessive re-renders or memory consumption
    if (search.stack.length > 2) {
      console.error('[Security] Max drawer nesting exceeded (max 2). Clearing from URL.')
      // Clear the stack from URL to prevent the attack
      navigate({
        search: (prev) => {
          const { stack, ...rest } = prev
          return rest
        },
        replace: true,
      })
      return
    }

    const [type, hash] = search.stack[0].split(':')

    // SECURITY FIX (M-09): Validate entityType format
    const VALID_ENTITY_TYPES = ['asset', 'risk', 'seed', 'job', 'file', 'attribute'] as const
    if (!VALID_ENTITY_TYPES.includes(type as any)) {
      console.error('[Security] Invalid entity type in nested drawer:', type)
      navigate({
        search: (prev) => {
          const { stack, ...rest } = prev
          return rest
        },
        replace: true,
      })
      return
    }

    setNestedDrawer({
      entityType: type as EntityType,
      entityKey: null,
      tab: 'overview',
      isResolving: true,
    })

    // Async resolve hash
    entityKeyRegistry.retrieve(hash).then(key => {
      // FIXED: Check cancelled flag before setState (prevents React warning)
      if (cancelled) return

      // SECURITY FIX (M-09): Validate resolved key format matches entity type
      if (key && !key.startsWith(`#${type}#`)) {
        console.error('[Security] Entity type mismatch - expected', type, 'but key is:', key)
        setNestedDrawer(null)
        return
      }
      setNestedDrawer(prev => prev ? { ...prev, entityKey: key, isResolving: false } : null)
    }).catch(error => {
      // FIXED: Check cancelled flag before setState (prevents React warning)
      if (cancelled) return
      console.error('Failed to resolve nested drawer hash:', error)
      setNestedDrawer(null)
    })

    // FIXED: Return cleanup function that sets cancelled flag
    return () => {
      cancelled = true
    }
  }, [search.stack, navigate])

  const openDrawer = useCallback(async (
    type: EntityType,
    key: string,
    tab: TabType = 'overview'
  ) => {
    const hash = await entityKeyRegistry.store(key)
    navigate({
      search: (prev) => ({
        ...prev,
        detail: `${type}:${hash}`,
        tab,
        stack: undefined, // Clear nested drawers
      }),
    })
  }, [navigate])

  const closeDrawer = useCallback(() => {
    navigate({
      search: (prev) => {
        const { detail, tab, stack, ...rest } = prev
        return rest
      },
    })
  }, [navigate])

  const setTab = useCallback((tab: TabType) => {
    navigate({
      search: (prev) => ({ ...prev, tab }),
      replace: true,
    })
  }, [navigate])

  const openNestedDrawer = useCallback(async (
    type: EntityType,
    key: string,
    tab: TabType = 'overview'
  ) => {
    const hash = await entityKeyRegistry.store(key)
    navigate({
      search: (prev) => ({
        ...prev,
        stack: [`${type}:${hash}`],
      }),
    })
  }, [navigate])

  const closeNestedDrawer = useCallback(() => {
    navigate({
      search: (prev) => {
        const { stack, ...rest } = prev
        return rest
      },
    })
  }, [navigate])

  return {
    entityType,
    entityKey,
    entityHash,
    tab: (search.tab as TabType) ?? 'overview',
    isOpen: !!entityType,
    isResolving,
    nestedDrawer,
    openDrawer,
    closeDrawer,
    setTab,
    openNestedDrawer,
    closeNestedDrawer,
  }
}
```

**Step 2: Write tests**

```typescript
// src/hooks/__tests__/useDrawerState.test.ts
import { renderHook, act, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from '@tanstack/react-router'
import { useDrawerState } from '../useDrawerState'

describe('useDrawerState', () => {
  it('initializes with closed drawer', () => {
    // Test implementation
  })

  it('opens drawer with hash-based URL', async () => {
    // Test implementation
  })

  it('closes drawer and cleans URL', () => {
    // Test implementation
  })

  it('handles nested drawers', async () => {
    // Test implementation
  })

  it('preserves tab state in URL', () => {
    // Test implementation
  })
})
```

**Step 3: Commit**

```bash
git add src/hooks/useDrawerState.ts src/hooks/__tests__/useDrawerState.test.ts
git commit -m "feat(phase-3): add unified drawer state hook"
```

---

### Task 5.2: Update Drawer Components

**Files:**
- Modify: All drawer components

**Step 1: Update drawer components to use new hook**

```typescript
// BEFORE: Using global state with many params
function AssetDrawer() {
  const { assetDrawerKey, assetDrawerTab, setAssetDrawerKey, setAssetDrawerTab } = useGlobalState()

  if (!assetDrawerKey) return null

  return (
    <Drawer open={!!assetDrawerKey} onClose={() => setAssetDrawerKey(null)}>
      <DrawerContent>
        <Tabs value={assetDrawerTab} onValueChange={setAssetDrawerTab}>
          ...
        </Tabs>
      </DrawerContent>
    </Drawer>
  )
}

// AFTER: Using unified drawer state
function AssetDrawer() {
  const { entityType, entityKey, tab, isOpen, closeDrawer, setTab, isResolving } = useDrawerState()

  if (entityType !== 'asset' || !isOpen) return null

  if (isResolving) {
    return <DrawerSkeleton />
  }

  const { data: asset } = useAssetByKey(entityKey)

  return (
    <Drawer open={isOpen} onClose={closeDrawer}>
      <DrawerContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="vulnerabilities">Vulnerabilities</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <AssetOverview asset={asset} />
          </TabsContent>
          <TabsContent value="vulnerabilities">
            <AssetVulnerabilities assetKey={entityKey} />
          </TabsContent>
          <TabsContent value="history">
            <AssetHistory assetKey={entityKey} />
          </TabsContent>
        </Tabs>
      </DrawerContent>
    </Drawer>
  )
}
```

**Step 2: Update DrawerController to dispatch by type**

```typescript
// src/components/drawers/DrawerController.tsx
import { useDrawerState } from '@/hooks/useDrawerState'

export function DrawerController() {
  const { entityType, isOpen } = useDrawerState()

  if (!isOpen) return null

  switch (entityType) {
    case 'asset':
      return <AssetDrawer />
    case 'risk':
      return <RiskDrawer />
    case 'seed':
      return <SeedDrawer />
    case 'job':
      return <JobDrawer />
    default:
      return null
  }
}
```

**Step 3: Remove old drawer state from global.state.tsx**

```typescript
// Remove from global.state.tsx:
// - assetDrawerKey, assetDrawerTab
// - vulnerabilityDrawerKey, vulnerabilityDrawerTab
// - seedDrawerKey, seedDrawerTab
// - riskDrawerKey, riskDrawerTab
// - jobDrawerKey, jobDrawerTab
// - drawerOrder array
// - All related setters and getters
```

**Step 4: Commit**

```bash
git add src/components/drawers/ src/state/global.state.tsx
git commit -m "feat(phase-3): migrate drawer components to unified state"
```

---

### Task 5.3: Pre-Validate Nested Drawer Access (SECURITY)

> **Security Fix:** H-05 - Nested drawer entity access not pre-validated

**Files:**
- Create: `src/hooks/useEntityAccessCheck.ts`
- Modify: `src/hooks/useDrawerState.ts`

**Step 1: Create access check hook**

```typescript
// src/hooks/useEntityAccessCheck.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'

/**
 * SECURITY FIX (H-05): Pre-validate entity access before opening drawer
 *
 * When opening a nested drawer (e.g., clicking a risk from an asset drawer),
 * we should verify the user has access to the nested entity BEFORE
 * adding it to the URL stack.
 *
 * This prevents:
 * 1. Information disclosure via error messages
 * 2. Unnecessary API calls that reveal access patterns
 * 3. Confusing UX where drawer opens but shows "access denied"
 */

interface AccessCheckResult {
  hasAccess: boolean
  isLoading: boolean
  error: Error | null
}

export function useEntityAccessCheck(
  entityType: 'asset' | 'risk' | 'seed' | 'job' | null,
  entityKey: string | null
): AccessCheckResult {
  const query = useQuery({
    queryKey: ['access-check', entityType, entityKey],
    queryFn: async () => {
      if (!entityType || !entityKey) {
        return { hasAccess: false }
      }

      // Use HEAD request to check access without fetching full entity
      // Backend should return 200 if accessible, 403/404 if not
      try {
        await api.head(`/${entityType}s/${encodeURIComponent(entityKey)}`)
        return { hasAccess: true }
      } catch (error: any) {
        if (error.status === 403 || error.status === 404) {
          return { hasAccess: false }
        }
        throw error // Re-throw unexpected errors
      }
    },
    enabled: !!entityType && !!entityKey,
    staleTime: 30000, // Cache for 30 seconds
    retry: false, // Don't retry access checks
  })

  return {
    hasAccess: query.data?.hasAccess ?? false,
    isLoading: query.isLoading,
    error: query.error,
  }
}
```

**Step 2: Update openNestedDrawer to pre-validate**

```typescript
// In src/hooks/useDrawerState.ts

const openNestedDrawer = useCallback(async (
  type: EntityType,
  key: string,
  tab: TabType = 'overview'
) => {
  // SECURITY FIX (H-05): Pre-validate access before adding to URL
  try {
    const response = await fetch(
      `/api/${type}s/${encodeURIComponent(key)}`,
      { method: 'HEAD' }
    )

    if (!response.ok) {
      console.warn('[Security] User does not have access to nested entity:', type, key)
      // Optionally show toast notification
      // toast.error('You do not have access to this item')
      return
    }
  } catch (error) {
    console.error('[Security] Access check failed:', error)
    return
  }

  // Access validated - proceed with opening drawer
  const hash = await entityKeyRegistry.store(key)
  navigate({
    search: (prev) => ({
      ...prev,
      stack: [`${type}:${hash}`],
    }),
  })
}, [navigate])
```

**Step 3: Write tests**

```typescript
// src/hooks/__tests__/useEntityAccessCheck.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEntityAccessCheck } from '../useEntityAccessCheck'
import { rest } from 'msw'
import { server } from '@/test/mocks/server'

describe('useEntityAccessCheck', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  )

  it('returns hasAccess: true when user has access', async () => {
    server.use(
      rest.head('/api/assets/*', (req, res, ctx) => res(ctx.status(200)))
    )

    const { result } = renderHook(
      () => useEntityAccessCheck('asset', '#asset#user@example.com'),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.hasAccess).toBe(true)
    })
  })

  it('returns hasAccess: false when access denied', async () => {
    server.use(
      rest.head('/api/assets/*', (req, res, ctx) => res(ctx.status(403)))
    )

    const { result } = renderHook(
      () => useEntityAccessCheck('asset', '#asset#other@example.com'),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.hasAccess).toBe(false)
    })
  })

  it('returns hasAccess: false when entity not found', async () => {
    server.use(
      rest.head('/api/assets/*', (req, res, ctx) => res(ctx.status(404)))
    )

    const { result } = renderHook(
      () => useEntityAccessCheck('asset', '#asset#nonexistent'),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.hasAccess).toBe(false)
    })
  })
})
```

**Step 4: Commit**

```bash
git add src/hooks/useEntityAccessCheck.ts src/hooks/__tests__/useEntityAccessCheck.test.ts src/hooks/useDrawerState.ts
git commit -m "security(phase-5): pre-validate nested drawer entity access (H-05)"
```

---

## URL Format Comparison

| Scenario | Before | After |
|----------|--------|-------|
| Single drawer | `?assetDrawerKey=abc&assetDrawerTab=overview` | `?detail=asset:a7f3&tab=overview` |
| Nested drawer | `?assetDrawerKey=abc&riskDrawerKey=xyz` | `?detail=asset:a7f3&stack=risk:x2y4` |
| Multiple params | 20+ params possible | 3 params max |

---

## Rollback Strategy

**Feature Flag:** `SIMPLIFIED_DRAWER_STATE`

```typescript
const SIMPLIFIED_DRAWER_STATE = useFeatureFlag('SIMPLIFIED_DRAWER_STATE')

if (SIMPLIFIED_DRAWER_STATE) {
  return <DrawerController /> // New unified state
} else {
  return <LegacyDrawerController /> // Old global state
}
```

---

## E2E Test Deliverables

| Test | Description |
|------|-------------|
| `drawer-open-close.spec.ts` | Verify drawers open/close correctly |
| `drawer-nested.spec.ts` | Verify nested drawers (max 2) work |
| `drawer-deep-link.spec.ts` | Verify direct navigation to drawer URLs |
| `drawer-tab-state.spec.ts` | Verify tab selection persists in URL |
| `drawer-shareable.spec.ts` | Verify copy/paste URL opens correct drawer |

---

## Handoff

**When this phase is complete:**

- Phase 5 provides: Simplified drawer state with TanStack Router
- This is the final phase of the URL refactoring project

**Project Complete Checklist:**

- [ ] Phase 1: Impersonation context ✅
- [ ] Phase 2: PII-free URLs ✅
- [ ] Phase 3: TanStack Router ✅
- [ ] Phase 4: TanStack Tables ✅
- [ ] Phase 5: Drawer simplification ✅
- [ ] All feature flags tested
- [ ] Performance regression testing complete
- [ ] Documentation updated

---

## Phase-Specific Notes

**Technical decisions made in this phase:**

- Maximum 1 nested drawer to prevent complexity
- Tab state in URL for shareability
- Unified `detail` param replaces 12+ individual params

**Dependencies introduced:**

- Uses TanStack Router (from Phase 3)
- Uses entityKeyRegistry (from Phase 2)

**Refactoring opportunities (future work):**

- Drawer history (back button through drawer changes)
- Drawer animations
- Drawer state persistence across sessions
