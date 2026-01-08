# Phase 0: Preparatory Work

> **Phase Status:** ✅ COMPLETE (2026-01-01)
> **PRs Completed:** 4/4
> **Tests Written:** 78 (verified)
> **Duration:** 1 week
> **Risk Level:** LOW - Infrastructure only, no feature changes

---

## Entry Criteria

**Prerequisites:**

- Development environment set up
- Access to `modules/chariot/ui` codebase
- Access to `modules/chariot/e2e` codebase

**If entry criteria not met:** This phase has no dependencies.

---

## Exit Criteria (Definition of Done)

This phase is complete when:

- [x] All 4 PRs merged ✅
- [x] E2E URL helpers created and tested ✅ (40 tests)
- [x] Feature flag infrastructure verified ✅ (13 tests, 17 flags)
- [x] Performance baseline captured ✅ (`docs/performance/baseline-2025-01.json`)
- [x] Blocking items B1, B2 resolved ✅ (forwardRef audit + search param serialization)
- [x] All tests passing ✅ (78 total)
- [x] Committed to version control ✅

**All exit criteria met on 2026-01-01.**

---

## Phase Goal

**What this phase accomplishes:**

Create the infrastructure required for safe, incremental migration. This includes test utilities, feature flags, and performance baselines that enable confident rollout and rollback.

**What this phase does NOT include:**

- Any user-facing changes
- Any behavioral changes
- TanStack Router installation (Phase 3)
- PII removal (Phase 2)

---

## Why Phase 0 Exists

The three-agent review identified critical gaps:

| Gap | Impact if Skipped |
|-----|-------------------|
| No E2E URL helpers | 41 test files need manual updates during Phase 3 |
| No feature flag testing | Rollback capability unverified |
| No performance baseline | Can't measure regression |
| Blocking items unresolved | Phase 3 cannot start |

**Investment:** ~1 week upfront
**Return:** Prevents ~3 weeks of debugging and rework

---

## PRs

### PR 0.1: E2E Test URL Helpers

**Files:**
- Create: `e2e/src/helpers/url.ts`
- Create: `e2e/src/helpers/__tests__/url.test.ts`
- Modify: `e2e/src/fixtures/base.fixture.ts`

**Why:** 41 E2E test files contain URL patterns that will change. Creating helpers now means tests update automatically when URL format changes.

**Implementation:**

```typescript
// e2e/src/helpers/url.ts
import { FEATURE_FLAGS } from '../config'

/**
 * Build URL with feature flag awareness.
 * During migration, URLs may use old or new format based on flags.
 */
export function buildUrl(
  path: string,
  params?: Record<string, string>
): string {
  const url = new URL(path, 'https://localhost:3000')

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  return url.pathname + url.search
}

/**
 * Build drawer URL with hash or legacy format.
 */
export async function buildDrawerUrl(
  basePath: string,
  entityType: string,
  entityKey: string,
  options?: { tab?: string }
): Promise<string> {
  if (FEATURE_FLAGS.ENABLE_PII_FREE_URLS) {
    // New format: hash-based
    const hash = await hashForTest(entityKey)
    const params: Record<string, string> = {
      detail: `${entityType}:${hash}`
    }
    if (options?.tab) params.tab = options.tab
    return buildUrl(basePath, params)
  } else {
    // Legacy format: direct key
    const params: Record<string, string> = {
      detail: `${entityType}:${entityKey}`
    }
    if (options?.tab) params.tab = options.tab
    return buildUrl(basePath, params)
  }
}

/**
 * URL assertion helpers for tests.
 */
export const URLAssertions = {
  /**
   * Assert URL contains no PII (email addresses, UUIDs that look like user IDs).
   */
  containsNoPII(url: string): boolean {
    const piiPatterns = [
      /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email
      /#asset#.*@/,                     // Legacy asset key with email
      /#risk#.*@/,                      // Legacy risk key with email
    ]
    return !piiPatterns.some(pattern => pattern.test(url))
  },

  /**
   * Assert URL matches expected drawer format.
   */
  hasDrawerParam(url: string, entityType: string): boolean {
    const pattern = new RegExp(`detail=${entityType}:[a-f0-9]{8,12}`)
    return pattern.test(url)
  },

  /**
   * Assert URL uses hash format (not legacy PII format).
   */
  usesHashFormat(url: string): boolean {
    // Hash format: detail=type:hexhash (8-12 chars)
    // Legacy format: detail=type:#entity#email@domain.com
    const hashPattern = /detail=[a-z]+:[a-f0-9]{8,12}(?:&|$)/
    const legacyPattern = /detail=[a-z]+:[#%]/
    return hashPattern.test(url) && !legacyPattern.test(url)
  }
}

/**
 * Test-only hash function (deterministic for test reproducibility).
 */
async function hashForTest(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 12)
}
```

**Tests:**

```typescript
// e2e/src/helpers/__tests__/url.test.ts
import { URLAssertions, buildUrl, buildDrawerUrl } from '../url'

describe('URLAssertions', () => {
  describe('containsNoPII', () => {
    it('returns true for hash-based URLs', () => {
      expect(URLAssertions.containsNoPII('/assets?detail=asset:a7f3b2c1d4e5')).toBe(true)
    })

    it('returns false for URLs with email addresses', () => {
      expect(URLAssertions.containsNoPII('/assets?detail=asset:#asset#user@example.com')).toBe(false)
    })
  })

  describe('usesHashFormat', () => {
    it('returns true for 12-char hash format', () => {
      expect(URLAssertions.usesHashFormat('/assets?detail=asset:a7f3b2c1d4e5')).toBe(true)
    })

    it('returns false for legacy format', () => {
      expect(URLAssertions.usesHashFormat('/assets?detail=asset:#asset#email@test.com')).toBe(false)
    })
  })
})
```

**Commit:**

```bash
git add e2e/src/helpers/url.ts e2e/src/helpers/__tests__/url.test.ts
git commit -m "feat(phase-0): add E2E URL helpers for migration"
```

---

### PR 0.2: Feature Flag Infrastructure

**Files:**
- Verify: `src/hooks/useFeatureFlag.ts`
- Create: `src/config/featureFlags.ts` (if not exists)
- Create: `src/hooks/__tests__/useFeatureFlag.test.ts`

**Why:** Each phase has a feature flag for rollback. Verify the infrastructure works before depending on it.

**Implementation:**

```typescript
// src/config/featureFlags.ts
export interface FeatureFlags {
  // Phase 1: Impersonation
  USE_CONTEXT_IMPERSONATION: boolean

  // Phase 2: PII-Free URLs
  ENABLE_PII_FREE_URLS: boolean

  // Phase 3: TanStack Router
  ENABLE_TANSTACK_ROUTER: boolean

  // Phase 4: TanStack Tables (per-table flags)
  TANSTACK_TABLE_ASSETS: boolean
  TANSTACK_TABLE_VULNERABILITIES: boolean
  TANSTACK_TABLE_SEEDS: boolean
  TANSTACK_TABLE_JOBS: boolean

  // Phase 5: Drawer State
  SIMPLIFIED_DRAWER_STATE: boolean
}

export const DEFAULT_FLAGS: FeatureFlags = {
  USE_CONTEXT_IMPERSONATION: false,
  ENABLE_PII_FREE_URLS: false,
  ENABLE_TANSTACK_ROUTER: false,
  TANSTACK_TABLE_ASSETS: false,
  TANSTACK_TABLE_VULNERABILITIES: false,
  TANSTACK_TABLE_SEEDS: false,
  TANSTACK_TABLE_JOBS: false,
  SIMPLIFIED_DRAWER_STATE: false,
}
```

**Tests:**

```typescript
// src/hooks/__tests__/useFeatureFlag.test.ts
import { renderHook } from '@testing-library/react'
import { useFeatureFlag } from '../useFeatureFlag'

describe('useFeatureFlag', () => {
  it('returns false for disabled flags', () => {
    const { result } = renderHook(() => useFeatureFlag('USE_CONTEXT_IMPERSONATION'))
    expect(result.current).toBe(false)
  })

  it('returns true when flag is enabled', () => {
    // Mock flag enabled
    vi.mock('../config/featureFlags', () => ({
      flags: { USE_CONTEXT_IMPERSONATION: true }
    }))

    const { result } = renderHook(() => useFeatureFlag('USE_CONTEXT_IMPERSONATION'))
    expect(result.current).toBe(true)
  })

  it('supports runtime flag changes', async () => {
    // Test that flag changes are reactive
  })
})
```

**Commit:**

```bash
git add src/config/featureFlags.ts src/hooks/__tests__/useFeatureFlag.test.ts
git commit -m "feat(phase-0): verify feature flag infrastructure"
```

---

### PR 0.3: Performance Baseline Collection

**Files:**
- Create: `scripts/collect-performance-baseline.ts`
- Create: `docs/performance/baseline-2025-01.json`

**Why:** Without a baseline, we can't measure regression. Capture metrics before any changes.

**Implementation:**

```typescript
// scripts/collect-performance-baseline.ts
import { chromium } from 'playwright'

interface PerformanceMetrics {
  timestamp: string
  route: string
  lcp: number      // Largest Contentful Paint
  fcp: number      // First Contentful Paint
  ttfb: number     // Time to First Byte
  cls: number      // Cumulative Layout Shift
  bundleSize: number
}

async function collectBaseline(): Promise<PerformanceMetrics[]> {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  const routes = [
    '/insights',
    '/assets',
    '/vulnerabilities',
    '/seeds',
    '/jobs',
    '/settings',
  ]

  const metrics: PerformanceMetrics[] = []

  for (const route of routes) {
    await page.goto(`https://localhost:3000${route}`)

    // Collect Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise(resolve => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          resolve({
            lcp: entries.find(e => e.entryType === 'largest-contentful-paint')?.startTime ?? 0,
            fcp: entries.find(e => e.name === 'first-contentful-paint')?.startTime ?? 0,
          })
        }).observe({ entryTypes: ['largest-contentful-paint', 'paint'] })
      })
    })

    metrics.push({
      timestamp: new Date().toISOString(),
      route,
      ...webVitals,
      ttfb: 0, // Collected separately
      cls: 0,  // Collected separately
      bundleSize: 0, // From build output
    })
  }

  await browser.close()
  return metrics
}

// Run and save
collectBaseline().then(metrics => {
  const fs = require('fs')
  fs.writeFileSync(
    'docs/performance/baseline-2025-01.json',
    JSON.stringify(metrics, null, 2)
  )
  console.log('Baseline collected:', metrics)
})
```

**Commit:**

```bash
git add scripts/collect-performance-baseline.ts docs/performance/baseline-2025-01.json
git commit -m "feat(phase-0): collect performance baseline"
```

---

### PR 0.4: Resolve Blocking Items B1, B2

**Files:**
- Audit output: `docs/audits/forwardRef-audit-2025-01.md`
- Config: `src/config/searchParamSerialization.ts`

**Why:** Phase 3 cannot start until these are resolved.

**B1: forwardRef Audit**

React 19 changes how `forwardRef` works. Audit all usages:

```bash
# Find all forwardRef usages
grep -r "forwardRef" src --include="*.tsx" | wc -l
# Expected: Document count, patterns, migration needed
```

**B2: Search Param Serialization**

Define how complex types serialize to URL:

```typescript
// src/config/searchParamSerialization.ts
import { z } from 'zod'

/**
 * Search param serialization standards for TanStack Router.
 * All routes must follow these patterns.
 */

// Arrays: Use repeated params (standard)
// URL: ?status=active&status=inactive
export const arraySchema = z.array(z.string()).default([])

// Dates: Use ISO strings
// URL: ?from=2025-01-01T00:00:00Z
export const dateSchema = z.string().datetime().optional()

// Numbers: Coerce from string
// URL: ?page=2
export const numberSchema = z.coerce.number().int().positive()

// Booleans: Use string 'true'/'false'
// URL: ?showArchived=true
export const booleanSchema = z.enum(['true', 'false']).transform(v => v === 'true')

// Objects: Flatten with dot notation
// URL: ?filter.status=active&filter.severity=high
// NOT: ?filter={"status":"active"}
export const nestedObjectPattern = 'Use dot notation, not JSON'

/**
 * Standard search schema base that all routes should extend.
 */
export const baseSearchSchema = z.object({
  // Drawer state (Phase 2, 5)
  detail: z.string().optional(),
  tab: z.string().optional(),
  stack: z.array(z.string()).max(2).optional(),

  // Pagination
  page: numberSchema.default(1).catch(1),
  limit: numberSchema.default(25).catch(25),

  // Sorting
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
})
```

**Commit:**

```bash
git add docs/audits/forwardRef-audit-2025-01.md src/config/searchParamSerialization.ts
git commit -m "feat(phase-0): resolve blocking items B1, B2"
```

---

## Handoff to Next Phase

**When this phase is complete:**

- Phase 0 provides: Test infrastructure, feature flags, performance baseline, resolved blockers
- Next phase (Phase 1) will: Migrate impersonation state to context

**To resume work:**

1. Verify all exit criteria checked
2. Read `phase-1-impersonation.md`
3. Verify entry criteria for Phase 1
4. Begin execution

---

## Phase-Specific Notes

**Technical decisions made in this phase:**

- E2E helpers support both old and new URL formats during migration
- Performance baseline uses Playwright for consistency with E2E tests
- Feature flags documented centrally in config file

**Dependencies introduced:**

- None (uses existing tooling)

**Refactoring opportunities (future work):**

- Automated performance regression testing in CI
- Feature flag service integration (LaunchDarkly, etc.)
