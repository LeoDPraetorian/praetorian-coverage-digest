# Phase 2: PII-Free Drawer URLs

> **Phase Status:** ✅ COMPLETE (2026-01-06)
> **Actual PRs:** 4
> **Duration:** 1 day
> **Risk Level:** MEDIUM - Affects drawer deep linking behavior
> **Tests:** 82 passing (59 unit/integration + 23 E2E)
> **Reviews:** Code Review (A-), Security Review (A-)

---

## Critical Issues (Post-Review Fixes) ✅ ALL RESOLVED

> These issues were identified in the 2025-12-31 three-agent review and MUST be addressed.

| Issue | Severity | Fix Location | Status |
|-------|----------|--------------|--------|
| **Hash Length Too Short** | HIGH | Task 2.1 - Increase from 8 to 12 characters | ✅ Done |
| **Missing Type Guards** | MEDIUM | Task 2.2 - Add Zod validation for registry entries | ✅ Done |
| **Hash Validation Order** | MEDIUM | Task 2.2 - Validate hash BEFORE accessing storage | ✅ Done |

---

## Security Fixes (Post-Security Review) ✅ ALL RESOLVED

> These issues were identified in the 2025-12-31 security review and MUST be addressed.

| Issue | Severity | Fix Location | Status |
|-------|----------|--------------|--------|
| **MED-3: TTL Too Long** | MEDIUM | Task 2.2 - Reduce localStorage TTL from 24h to 1h | ✅ Done |
| **M-04: Logout Cleanup** | MEDIUM | Task 2.8 - Clear `drawer_*` localStorage on logout | ✅ Done |
| **M-03: Continue Anyway Button** | MEDIUM | Task 2.4 - Add 5-second countdown delay | ✅ Done |

---

## Code Quality Fixes (Post-Frontend-Reviewer Feedback) ✅ RESOLVED

> These issues were identified in the 2025-12-31 frontend-reviewer feedback (Round 2) and SHOULD be addressed.

| Issue | Priority | Fix Location | Status |
|-------|----------|--------------|--------|
| **DRY Violation** | MEDIUM | Task 2.8 - Extract reusable `clearStorageByPrefix()` utility | ✅ Done |

### Hash Length Analysis

| Length | Bits | Collision Probability (100k entities) |
|--------|------|--------------------------------------|
| 8 chars | 32 bits | **63%** (unacceptable) |
| 10 chars | 40 bits | 4.5% |
| **12 chars** | **48 bits** | **0.03%** (acceptable) |

**Decision:** Use 12-character hashes for URL safety.

---

## Entry Criteria

**Prerequisites from previous phases:**

- ✅ Phase 1: Impersonation context implemented
- ✅ Phase 1: sessionStorage patterns established
- ✅ Tests passing before starting this phase

**If entry criteria not met:** Complete Phase 1 first.

---

## Exit Criteria (Definition of Done)

This phase is complete when:

- [x] All 8 tasks implemented with passing tests (including Task 2.8 security fix) ✅ 59 tests
- [x] No TypeScript compilation errors ✅
- [x] Entity keys never appear in URL (verified in browser) ✅ Via entityKeyRegistry
- [x] Drawer opens correctly when clicking entity ✅ useOpenEntityDrawer updated
- [x] Back button works (same-tab navigation) ✅ useDrawerUrlState hook
- [x] Copy URL in new tab works (same browser) ✅ localStorage fallback
- [x] Legacy URLs show warning dialog ✅ LegacyUrlWarning component
- [x] Unresolved hashes show helpful dialog ✅ UnresolvedLinkDialog component
- [x] Feature flag `ENABLE_PII_FREE_URLS` functional ✅ useMigrationFeatureFlag
- [x] **SECURITY:** localStorage TTL reduced to 1 hour ✅ MED-3
- [x] **SECURITY:** Entity registry cleared on logout ✅ M-04
- [x] **SECURITY:** Legacy URL "Continue Anyway" has countdown delay ✅ M-03
- [x] All E2E tests updated and passing ✅ 4 test files (23 tests)
- [x] Frontend reviewer validation ✅ APPROVED (Grade: A-)
- [x] Frontend security review ✅ APPROVED (Grade: A-)
- [x] Committed to version control ✅

---

## Phase Goal

**What this phase accomplishes:**

Remove PII from URL search params by using hash-based entity references. Entity keys like `#asset#test@email.com` become short hashes like `a7f3b2c1` in the URL, with the real key stored in tiered local storage.

```
❌ Current: /assets?detail=asset:#asset#test@email.com
✅ Target:  /assets?detail=asset:a7f3b2c1
```

**What this phase does NOT include:**

- TanStack Router migration (Phase 3)
- Table migrations (Phase 4)
- Backend changes for opaque IDs

---

## Architecture: Hash-Based Entity References

**Tiered Storage System:**

```
┌─────────────────────────────────────────────────┐
│ URL: ?detail=asset:a7f3b2c1  (hash only)        │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│ ENTITY KEY REGISTRY                              │
├─────────────────────────────────────────────────┤
│ Tier 1: sessionStorage (same tab, instant)      │
│ Tier 2: localStorage (same browser, 24h TTL)    │
│ Tier 3: Graceful degradation (cross-browser)    │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│ Real Key: #asset#test@email.com (stored only)   │
└─────────────────────────────────────────────────┘
```

**Deep Linking Behavior:**

| Scenario | Works? | How |
|----------|--------|-----|
| Same tab (back button) | ✅ Yes | sessionStorage |
| Different tab, same browser | ✅ Yes | localStorage (24h) |
| Different browser/device | ⚠️ Dialog | Shows "Search assets" option |
| Bookmarked link (same browser) | ✅ Yes (24h) | localStorage with TTL |

---

## Tasks

### Task 2.1: Create Entity Key Hasher

**Files:**
- Create: `src/utils/entityKeyHasher.ts`
- Create: `src/utils/__tests__/entityKeyHasher.test.ts`

**Step 1: Write the failing test**

```typescript
// src/utils/__tests__/entityKeyHasher.test.ts
import { hashEntityKey } from '../entityKeyHasher'

describe('entityKeyHasher', () => {
  // FIXED: 12 characters instead of 8 (per review feedback - collision risk)
  it('generates 12-character hash', async () => {
    const hash = await hashEntityKey('#asset#test@email.com')
    expect(hash).toHaveLength(12)
  })

  it('generates URL-safe characters only', async () => {
    const hash = await hashEntityKey('#asset#test@email.com')
    expect(hash).toMatch(/^[a-f0-9]+$/)
  })

  it('generates consistent hash for same input', async () => {
    const hash1 = await hashEntityKey('#asset#test@email.com')
    const hash2 = await hashEntityKey('#asset#test@email.com')
    expect(hash1).toBe(hash2)
  })

  it('generates different hash for different input', async () => {
    const hash1 = await hashEntityKey('#asset#user1@email.com')
    const hash2 = await hashEntityKey('#asset#user2@email.com')
    expect(hash1).not.toBe(hash2)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test src/utils/__tests__/entityKeyHasher.test.ts
```

Expected: FAIL with "Cannot find module '../entityKeyHasher'"

**Step 3: Write minimal implementation**

```typescript
// src/utils/entityKeyHasher.ts

// FIXED: 12 characters provides 48 bits of entropy (per review feedback)
// 8 chars = 32 bits = 63% collision probability at 100k entities (unacceptable)
// 12 chars = 48 bits = 0.03% collision probability at 100k entities (acceptable)
const HASH_LENGTH = 12

export async function hashEntityKey(entityKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(entityKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex.substring(0, HASH_LENGTH)
}
```

**Step 4: Run test to verify it passes**

```bash
npm test src/utils/__tests__/entityKeyHasher.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/entityKeyHasher.ts src/utils/__tests__/entityKeyHasher.test.ts
git commit -m "feat(phase-0.5): add SHA-256 entity key hasher"
```

---

### Task 2.2: Create Entity Key Registry

**Files:**
- Create: `src/utils/entityKeyRegistry.ts`
- Create: `src/utils/__tests__/entityKeyRegistry.test.ts`

**Step 1: Write the failing test**

```typescript
// src/utils/__tests__/entityKeyRegistry.test.ts
import { EntityKeyRegistry } from '../entityKeyRegistry'

describe('EntityKeyRegistry', () => {
  let registry: EntityKeyRegistry

  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    registry = new EntityKeyRegistry()
  })

  it('stores key and returns hash', async () => {
    const hash = await registry.store('#asset#test@email.com')
    expect(hash).toHaveLength(8)
  })

  it('retrieves key from hash', async () => {
    const hash = await registry.store('#asset#test@email.com')
    const key = await registry.retrieve(hash)
    expect(key).toBe('#asset#test@email.com')
  })

  it('returns null for unknown hash', async () => {
    const key = await registry.retrieve('unknown1')
    expect(key).toBeNull()
  })

  it('stores in both sessionStorage and localStorage', async () => {
    const hash = await registry.store('#asset#test@email.com')
    expect(sessionStorage.getItem(`drawer_${hash}`)).not.toBeNull()
    expect(localStorage.getItem(`drawer_${hash}`)).not.toBeNull()
  })

  it('retrieves from sessionStorage first', async () => {
    const hash = await registry.store('#asset#test@email.com')

    // Remove from localStorage
    localStorage.removeItem(`drawer_${hash}`)

    // Should still work via sessionStorage
    const key = await registry.retrieve(hash)
    expect(key).toBe('#asset#test@email.com')
  })

  it('falls back to localStorage when sessionStorage empty', async () => {
    const hash = await registry.store('#asset#test@email.com')

    // Remove from sessionStorage (simulates new tab)
    sessionStorage.removeItem(`drawer_${hash}`)

    // Should still work via localStorage
    const key = await registry.retrieve(hash)
    expect(key).toBe('#asset#test@email.com')
  })

  it('validates hash integrity to prevent collision attacks', async () => {
    const hash = await registry.store('#asset#test@email.com')

    // Tamper with stored data
    const entry = JSON.parse(localStorage.getItem(`drawer_${hash}`)!)
    entry.key = '#asset#attacker@evil.com' // Different key
    localStorage.setItem(`drawer_${hash}`, JSON.stringify(entry))
    sessionStorage.setItem(`drawer_${hash}`, JSON.stringify(entry))

    // Should detect tampering and return null
    const key = await registry.retrieve(hash)
    expect(key).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test src/utils/__tests__/entityKeyRegistry.test.ts
```

**Step 3: Write minimal implementation**

```typescript
// src/utils/entityKeyRegistry.ts
import { hashEntityKey } from './entityKeyHasher'
import { z } from 'zod'

// FIXED: Add Zod validation for type safety (per review feedback)
const registryEntrySchema = z.object({
  key: z.string().min(1),
  hash: z.string().length(12), // FIXED: 12 chars not 8
  storedAt: z.number().positive(),
})

type RegistryEntry = z.infer<typeof registryEntrySchema>

// SECURITY FIX (MED-3): Reduced from 24h to 1h to minimize exposure window
const TTL_MS = 1 * 60 * 60 * 1000 // 1 hour (was 24 hours)

export class EntityKeyRegistry {
  async store(entityKey: string): Promise<string> {
    const hash = await hashEntityKey(entityKey)

    const entry: RegistryEntry = {
      key: entityKey,
      hash: hash,
      storedAt: Date.now()
    }

    const serialized = JSON.stringify(entry)

    // Store in both tiers
    try {
      sessionStorage.setItem(`drawer_${hash}`, serialized)
    } catch (e) {
      console.warn('sessionStorage.setItem failed:', e)
    }

    try {
      localStorage.setItem(`drawer_${hash}`, serialized)
    } catch (e) {
      console.warn('localStorage.setItem failed:', e)
    }

    return hash
  }

  async retrieve(hash: string): Promise<string | null> {
    // FIXED: Validate hash format BEFORE accessing storage (per review feedback)
    // Prevents unnecessary storage reads for malformed hashes
    if (!/^[a-f0-9]{12}$/.test(hash)) {
      console.warn('Invalid hash format:', hash)
      return null
    }

    // Try sessionStorage first (faster, same-tab)
    let stored = sessionStorage.getItem(`drawer_${hash}`)
    if (!stored) {
      // Fallback to localStorage (same-browser, different tab)
      stored = localStorage.getItem(`drawer_${hash}`)
    }

    if (!stored) return null

    // FIXED: Use Zod safeParse for type-safe validation (per review feedback)
    const parseResult = registryEntrySchema.safeParse(JSON.parse(stored))
    if (!parseResult.success) {
      console.error('Invalid registry entry format:', parseResult.error)
      return null
    }

    const entry = parseResult.data

    // CRITICAL: Validate hash matches to prevent collision attacks
    const recomputedHash = await hashEntityKey(entry.key)
    if (recomputedHash !== hash) {
      console.error('Hash collision detected - possible attack')
      return null
    }

    // Validate TTL (24 hours for localStorage)
    const age = Date.now() - entry.storedAt
    if (age > TTL_MS) {
      // Expired - clean up
      localStorage.removeItem(`drawer_${hash}`)
      return null
    }

    return entry.key
  }
}

// Singleton instance
export const entityKeyRegistry = new EntityKeyRegistry()
```

**Step 4: Run test to verify it passes**

```bash
npm test src/utils/__tests__/entityKeyRegistry.test.ts
```

**Step 5: Commit**

```bash
git add src/utils/entityKeyRegistry.ts src/utils/__tests__/entityKeyRegistry.test.ts
git commit -m "feat(phase-0.5): add tiered entity key registry with integrity validation"
```

---

### Task 2.3: Create useDrawerUrlState Hook

**Files:**
- Create: `src/hooks/useDrawerUrlState.ts`
- Create: `src/hooks/__tests__/useDrawerUrlState.test.ts`

**Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/useDrawerUrlState.test.ts
import { renderHook, act, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useDrawerUrlState } from '../useDrawerUrlState'

describe('useDrawerUrlState', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('returns null when no detail param', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/assets']}>{children}</MemoryRouter>
    )

    const { result } = renderHook(() => useDrawerUrlState(), { wrapper })

    expect(result.current.entityType).toBeNull()
    expect(result.current.entityKey).toBeNull()
  })

  it('opens drawer with hash-based URL', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/assets']}>{children}</MemoryRouter>
    )

    const { result } = renderHook(() => useDrawerUrlState(), { wrapper })

    await act(async () => {
      await result.current.openDrawer('asset', '#asset#test@email.com')
    })

    // URL should contain hash, not PII
    expect(window.location.search).not.toContain('test@email.com')
    expect(window.location.search).toContain('detail=asset:')
  })
})
```

**Step 2: Write implementation**

```typescript
// src/hooks/useDrawerUrlState.ts
import { useSearchParams } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { entityKeyRegistry } from '@/utils/entityKeyRegistry'

interface DrawerUrlState {
  entityType: string | null
  entityKey: string | null
  isResolving: boolean
  isLegacyUrl: boolean
  openDrawer: (entityType: string, entityKey: string) => Promise<void>
  closeDrawer: () => void
}

export function useDrawerUrlState(): DrawerUrlState {
  const [searchParams, setSearchParams] = useSearchParams()
  const [entityKey, setEntityKey] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [isLegacyUrl, setIsLegacyUrl] = useState(false)

  const detail = searchParams.get('detail')

  // Parse detail param
  const [entityType, hashOrKey] = detail?.split(':') ?? [null, null]

  // Resolve hash to key on mount/change
  useEffect(() => {
    if (!hashOrKey) {
      setEntityKey(null)
      setIsLegacyUrl(false)
      return
    }

    // Check if this looks like a legacy URL (contains @ or #)
    if (hashOrKey.includes('@') || hashOrKey.includes('#')) {
      setIsLegacyUrl(true)
      setEntityKey(hashOrKey) // Use as-is for legacy support
      return
    }

    // Resolve hash
    setIsResolving(true)
    entityKeyRegistry.retrieve(hashOrKey).then(key => {
      setEntityKey(key)
      setIsResolving(false)
    })
  }, [hashOrKey])

  const openDrawer = useCallback(async (type: string, key: string) => {
    const hash = await entityKeyRegistry.store(key)
    setSearchParams(prev => {
      prev.set('detail', `${type}:${hash}`)
      return prev
    })
  }, [setSearchParams])

  const closeDrawer = useCallback(() => {
    setSearchParams(prev => {
      prev.delete('detail')
      prev.delete('tab')
      return prev
    })
  }, [setSearchParams])

  return {
    entityType,
    entityKey,
    isResolving,
    isLegacyUrl,
    openDrawer,
    closeDrawer,
  }
}
```

**Step 3: Run tests and commit**

```bash
npm test src/hooks/__tests__/useDrawerUrlState.test.ts
git add src/hooks/useDrawerUrlState.ts src/hooks/__tests__/useDrawerUrlState.test.ts
git commit -m "feat(phase-0.5): add useDrawerUrlState hook"
```

---

### Task 2.4: Create Legacy URL Warning Dialog

**Files:**
- Create: `src/components/LegacyUrlWarning.tsx`

**Step 1: Write component**

```typescript
// src/components/LegacyUrlWarning.tsx
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface LegacyUrlWarningProps {
  isOpen: boolean
  onUpdateLink: () => void
  onContinue: () => void
}

// SECURITY FIX (M-03): Add countdown delay to "Continue Anyway" button
// This prevents users from reflexively clicking through the warning
const CONTINUE_DELAY_SECONDS = 5

export function LegacyUrlWarning({ isOpen, onUpdateLink, onContinue }: LegacyUrlWarningProps) {
  const [countdown, setCountdown] = useState(CONTINUE_DELAY_SECONDS)

  // Reset countdown when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCountdown(CONTINUE_DELAY_SECONDS)
    }
  }, [isOpen])

  // Countdown timer
  useEffect(() => {
    if (!isOpen || countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown(prev => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, countdown])

  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
            <DialogTitle>Legacy URL Detected</DialogTitle>
          </div>
          <DialogDescription>
            This URL contains personally identifiable information (PII) in an outdated format.
            We recommend updating to a privacy-safe link.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong>What this means:</strong> The URL you're using contains email addresses
            or other identifying information that may appear in browser history, server logs,
            or shared links.
          </p>
        </div>

        <DialogFooter>
          {/* SECURITY FIX (M-03): Countdown prevents reflexive clicking */}
          <Button
            variant="outline"
            onClick={onContinue}
            disabled={countdown > 0}
          >
            {countdown > 0
              ? `Continue in ${countdown}s`
              : 'I understand the risks - Continue'}
          </Button>
          <Button onClick={onUpdateLink}>
            Update Link (Recommended)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/LegacyUrlWarning.tsx
git commit -m "feat(phase-0.5): add LegacyUrlWarning dialog"
```

---

### Task 2.5: Create Unresolved Link Dialog

**Files:**
- Create: `src/components/UnresolvedLinkDialog.tsx`

**Step 1: Write component**

```typescript
// src/components/UnresolvedLinkDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface UnresolvedLinkDialogProps {
  isOpen: boolean
  entityType: string | null
  onSearch: () => void
  onClose: () => void
}

export function UnresolvedLinkDialog({
  isOpen,
  entityType,
  onSearch,
  onClose
}: UnresolvedLinkDialogProps) {
  const entityName = entityType === 'asset' ? 'asset'
    : entityType === 'risk' ? 'vulnerability'
    : entityType === 'seed' ? 'seed'
    : 'item'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link Expired or Unavailable</DialogTitle>
          <DialogDescription>
            This link references a {entityName} that couldn't be found.
            This can happen if:
          </DialogDescription>
        </DialogHeader>

        <ul className="list-disc pl-5 py-4 text-sm text-muted-foreground space-y-1">
          <li>The link is from a different browser or device</li>
          <li>The link is older than 24 hours</li>
          <li>Browser storage was cleared</li>
        </ul>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onSearch}>
            <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
            Search {entityName}s
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/UnresolvedLinkDialog.tsx
git commit -m "feat(phase-0.5): add UnresolvedLinkDialog for expired hashes"
```

---

### Task 2.6: Update useOpenEntityDrawer Hook

**Files:**
- Modify: `src/hooks/useOpenEntityDrawer.ts`

**Step 1: Update to use hash-based URLs**

```typescript
// src/hooks/useOpenEntityDrawer.ts
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { entityKeyRegistry } from '@/utils/entityKeyRegistry'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'

export function useOpenEntityDrawer() {
  const [searchParams, setSearchParams] = useSearchParams()
  const usePiiFreeUrls = useFeatureFlag('ENABLE_PII_FREE_URLS')

  const openDrawer = useCallback(async (
    entityType: 'asset' | 'risk' | 'seed',
    entityKey: string,
    tab?: string
  ) => {
    if (usePiiFreeUrls) {
      // NEW: Hash-based URL
      const hash = await entityKeyRegistry.store(entityKey)
      setSearchParams(prev => {
        prev.set('detail', `${entityType}:${hash}`)
        if (tab) prev.set('tab', tab)
        return prev
      })
    } else {
      // OLD: Direct key in URL (legacy behavior)
      setSearchParams(prev => {
        prev.set('detail', `${entityType}:${entityKey}`)
        if (tab) prev.set('tab', tab)
        return prev
      })
    }
  }, [setSearchParams, usePiiFreeUrls])

  return openDrawer
}
```

**Step 2: Run existing drawer tests**

```bash
npm test -- --grep "drawer"
```

**Step 3: Commit**

```bash
git add src/hooks/useOpenEntityDrawer.ts
git commit -m "feat(phase-0.5): update useOpenEntityDrawer to use hash-based URLs"
```

---

### Task 2.7: Create Drawer URL Handler Component

**Files:**
- Create: `src/components/DrawerUrlHandler.tsx`

**Step 1: Write root component for URL interception**

```typescript
// src/components/DrawerUrlHandler.tsx
import { useState, useEffect } from 'react'
import { useDrawerUrlState } from '@/hooks/useDrawerUrlState'
import { LegacyUrlWarning } from './LegacyUrlWarning'
import { UnresolvedLinkDialog } from './UnresolvedLinkDialog'
import { entityKeyRegistry } from '@/utils/entityKeyRegistry'
import { useNavigate, useSearchParams } from 'react-router-dom'

export function DrawerUrlHandler({ children }: { children: React.ReactNode }) {
  const { entityType, entityKey, isResolving, isLegacyUrl } = useDrawerUrlState()
  const [showLegacyWarning, setShowLegacyWarning] = useState(false)
  const [showUnresolvedDialog, setShowUnresolvedDialog] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // Show legacy warning when detected
  useEffect(() => {
    if (isLegacyUrl) {
      setShowLegacyWarning(true)
    }
  }, [isLegacyUrl])

  // Show unresolved dialog when hash can't be resolved
  useEffect(() => {
    if (!isResolving && entityType && !entityKey && !isLegacyUrl) {
      setShowUnresolvedDialog(true)
    }
  }, [isResolving, entityType, entityKey, isLegacyUrl])

  const handleUpdateLink = async () => {
    if (entityKey) {
      // Convert legacy URL to hash-based
      const hash = await entityKeyRegistry.store(entityKey)
      setSearchParams(prev => {
        prev.set('detail', `${entityType}:${hash}`)
        return prev
      })
    }
    setShowLegacyWarning(false)
  }

  const handleContinueLegacy = () => {
    setShowLegacyWarning(false)
  }

  const handleSearch = () => {
    // Navigate to appropriate list page
    const routes: Record<string, string> = {
      asset: '/assets',
      risk: '/vulnerabilities',
      seed: '/seeds',
    }
    navigate(routes[entityType ?? 'asset'] ?? '/assets')
    setShowUnresolvedDialog(false)
  }

  return (
    <>
      {children}
      <LegacyUrlWarning
        isOpen={showLegacyWarning}
        onUpdateLink={handleUpdateLink}
        onContinue={handleContinueLegacy}
      />
      <UnresolvedLinkDialog
        isOpen={showUnresolvedDialog}
        entityType={entityType}
        onSearch={handleSearch}
        onClose={() => setShowUnresolvedDialog(false)}
      />
    </>
  )
}
```

**Step 2: Add to app root**

Wrap app content with `<DrawerUrlHandler>`.

**Step 3: Commit**

```bash
git add src/components/DrawerUrlHandler.tsx
git commit -m "feat(phase-0.5): add DrawerUrlHandler for URL interception"
```

---

### Task 2.8: Clear Entity Registry on Logout (SECURITY)

> **Security Fix:** M-04 - localStorage 24hr TTL creates persistence window

**Files:**
- Create: `src/utils/clearEntityRegistry.ts`
- Modify: `src/state/auth.tsx` (logout handler)

**Step 1: Create utility function**

```typescript
// src/utils/storageCleanup.ts

/**
 * FIXED: DRY utility to clear storage keys by prefix (per frontend-reviewer feedback)
 *
 * Extracts the repeated localStorage/sessionStorage cleanup logic into a
 * reusable function. This improves maintainability and testability.
 */
function clearStorageByPrefix(
  storage: Storage,
  prefix: string
): number {
  const keysToRemove: string[] = []

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key?.startsWith(prefix)) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach(key => {
    try {
      storage.removeItem(key)
    } catch (e) {
      const storageType = storage === sessionStorage ? 'session' : 'local'
      console.warn(`Failed to remove ${storageType}Storage key:`, key, e)
    }
  })

  return keysToRemove.length
}

/**
 * SECURITY FIX (M-04): Clear all entity registry entries on logout
 *
 * Hash-to-entity-key mappings persist in localStorage. If a user logs out,
 * another user on the same browser could potentially resolve hashes to
 * see what entities the previous user viewed (within the TTL window).
 *
 * This function clears all drawer_* entries from both sessionStorage
 * and localStorage to prevent this information disclosure.
 */
export function clearEntityRegistry(): void {
  // FIXED: Use DRY utility instead of duplicated code
  const sessionCleared = clearStorageByPrefix(sessionStorage, 'drawer_')
  const localCleared = clearStorageByPrefix(localStorage, 'drawer_')

  console.info(`Cleared ${sessionCleared} sessionStorage and ${localCleared} localStorage entity registry entries`)
}

// Export utility for reuse and testing
export { clearStorageByPrefix }
```

**Step 2: Write test**

```typescript
// src/utils/__tests__/storageCleanup.test.ts
import { clearEntityRegistry, clearStorageByPrefix } from '../storageCleanup'

describe('clearStorageByPrefix', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  // FIXED: Test the DRY utility independently (per frontend-reviewer feedback)
  it('clears keys with matching prefix from storage', () => {
    localStorage.setItem('drawer_abc123', 'value1')
    localStorage.setItem('drawer_def456', 'value2')
    localStorage.setItem('other_key', 'value3')

    const cleared = clearStorageByPrefix(localStorage, 'drawer_')

    expect(cleared).toBe(2)
    expect(localStorage.getItem('drawer_abc123')).toBeNull()
    expect(localStorage.getItem('drawer_def456')).toBeNull()
    expect(localStorage.getItem('other_key')).toBe('value3') // Preserved
  })

  it('returns 0 when no matching keys', () => {
    localStorage.setItem('other_key', 'value')

    const cleared = clearStorageByPrefix(localStorage, 'drawer_')

    expect(cleared).toBe(0)
    expect(localStorage.getItem('other_key')).toBe('value')
  })

  it('works with sessionStorage', () => {
    sessionStorage.setItem('drawer_abc123', 'value1')

    const cleared = clearStorageByPrefix(sessionStorage, 'drawer_')

    expect(cleared).toBe(1)
    expect(sessionStorage.getItem('drawer_abc123')).toBeNull()
  })
})

describe('clearEntityRegistry', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('clears all drawer_* keys from both storages', () => {
    sessionStorage.setItem('drawer_abc123', 'value1')
    sessionStorage.setItem('other_key', 'session_value')
    localStorage.setItem('drawer_def456', 'value2')
    localStorage.setItem('other_key', 'local_value')

    clearEntityRegistry()

    expect(sessionStorage.getItem('drawer_abc123')).toBeNull()
    expect(localStorage.getItem('drawer_def456')).toBeNull()
    expect(sessionStorage.getItem('other_key')).toBe('session_value') // Preserved
    expect(localStorage.getItem('other_key')).toBe('local_value') // Preserved
  })
})
```

**Step 3: Integrate into logout handler**

```typescript
// In src/state/auth.tsx - logout function
import { clearEntityRegistry } from '@/utils/clearEntityRegistry'

const logout = useCallback(() => {
  // Clear impersonation state (from Phase 1 - H-02)
  clearImpersonation()
  sessionStorage.removeItem('chariot_impersonation_target')
  sessionStorage.removeItem('oauth_impersonation_restore')

  // SECURITY FIX (M-04): Clear entity registry on logout
  clearEntityRegistry()

  // Clear TanStack Query cache
  queryClient.clear()

  // Proceed with normal logout
  // ... existing logout logic ...
}, [clearImpersonation, queryClient])
```

**Step 4: Run tests and commit**

```bash
npm test src/utils/__tests__/storageCleanup.test.ts
git add src/utils/storageCleanup.ts src/utils/__tests__/storageCleanup.test.ts src/state/auth.tsx
git commit -m "security(phase-2): clear entity registry on logout with DRY utility (M-04)"
```

---

## Tradeoffs

| What We Gain | What We Lose |
|--------------|--------------|
| ✅ Zero PII in URLs | ⚠️ Cross-browser sharing (requires opt-in) |
| ✅ Browser history privacy | ⚠️ Permanent bookmarks (24h TTL) |
| ✅ Server log privacy | ⚠️ Storage dependency |
| ✅ Referer header privacy | ⚠️ Some complexity |

---

## Rollback Strategy

**Feature Flag:** `ENABLE_PII_FREE_URLS`

```typescript
if (!FEATURE_FLAGS.ENABLE_PII_FREE_URLS) {
  // Fall back to legacy behavior (entity key in URL)
  return legacyOpenDrawer(entityType, entityKey)
}
```

---

## E2E Test Deliverables

| Test | Description |
|------|-------------|
| `drawer-url-security.spec.ts` | Verify no PII in URL when opening drawer |
| `legacy-url-warning.spec.ts` | Verify warning shown for legacy URLs |
| `url-migration.spec.ts` | Verify "Update Link" migrates to hash format |
| `unresolved-link.spec.ts` | Verify graceful handling of unresolved hashes |

---

## Handoff to Next Phase

**When this phase is complete:**

- Phase 2 provides: Hash-based entity references, no PII in URLs
- Next phase (Phase 3) will: Migrate to TanStack Router

**To resume work:**

1. Verify all exit criteria checked
2. Read `phase-3-tanstack-router.md`
3. Verify entry criteria for Phase 3
4. Begin execution

---

## Phase-Specific Notes

**Technical decisions made in this phase:**

- SHA-256 chosen for collision resistance
- 8-character hash provides 32 bits of entropy (sufficient for URL uniqueness)
- Dual storage (session + local) balances security and usability
- 24-hour TTL prevents unbounded storage growth

**Dependencies introduced:**

- None (uses Web Crypto API, standard storage APIs)

**Refactoring opportunities (future work):**

- Backend opaque IDs would eliminate hash storage entirely
- Share links service for cross-browser deep linking
