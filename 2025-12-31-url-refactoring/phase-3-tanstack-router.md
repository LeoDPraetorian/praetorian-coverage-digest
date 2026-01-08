# Phase 3: TanStack Router Migration

> **Phase Status:** Not Started
> **Estimated PRs:** 15-18 (REVISED from 7 tasks)
> **Duration:** 10-12 weeks (REVISED from 7-10 weeks)
> **Risk Level:** HIGH - Core routing changes, 118 files affected

---

## Critical Issues (Post-Review Fixes)

> These issues were identified in the 2025-12-31 three-agent review and MUST be addressed.

| Issue | Severity | Resolution |
|-------|----------|------------|
| **Phase Not Atomic** | CRITICAL | Break 118 files into 15-18 PRs (~8 files each) |
| **E2E Test Migration** | HIGH | Dedicate 1 sprint (3-5 days) to 41 test file updates |
| **Per-Route Feature Flags** | MEDIUM | Enable per-route rollback, not all-or-nothing |

---

## Security Fixes (Post-Security Review)

> These issues were identified in the 2025-12-31 security review and MUST be addressed.

| Issue | Severity | Fix Location | CVSS |
|-------|----------|--------------|------|
| **CRIT-2: Open Redirect** | CRITICAL | Task 3.1 (NEW) - Add `validateRedirectUrl()` | 8.1 |
| **HIGH-1: XSS via Zod** | HIGH | Task 3.2 (NEW) - Add DOMPurify sanitization | 7.3 |
| **HIGH-4: Type Coercion DoS** | HIGH | Task 1.5 - Replace `.coerce` with explicit validation | 6.5 |
| **M-05: Zod Error Exposure** | MEDIUM | Task 1.5 - Use `.catch()` defaults | - |
| **H-04: Route Guard Docs** | MEDIUM | Task 1.4 - Add security comment | - |

### Why 15-18 PRs?

| Original Plan | Problem | Revised Plan |
|---------------|---------|--------------|
| 7 tasks, ~118 files total | 40+ hours review time, unreviewable | 15-18 PRs, ~8 files each |
| 1 navigation migration PR | Massive merge conflict risk | 8 PRs by feature area |
| All-or-nothing rollback | High blast radius | Per-route feature flags |

**Review time per PR:** Target 2-4 hours max
**Files per PR:** Target 5-10 files max
**LOC per PR:** Target <500 LOC changes

---

## Entry Criteria

**Prerequisites from previous phases:**

- ✅ Phase 0: Preparatory Work complete (E2E helpers, feature flags)
- ✅ Phase 1: Impersonation context implemented (no userId in URL)
- ✅ Blocking item B1: forwardRef audit complete
- ✅ Blocking item B2: Search param serialization defined
- ✅ Blocking item B3: E2E test infrastructure ready
- ✅ Performance baselines captured
- ✅ Tests passing before starting this phase

**If entry criteria not met:** Complete Phase 0 and Phase 1 first.

---

## Exit Criteria (Definition of Done)

This phase is complete when:

- [ ] All 7 tasks implemented with passing tests
- [ ] No TypeScript compilation errors
- [ ] All 34 authenticated routes migrated
- [ ] All 118 files with React Router imports updated
- [ ] All 15 generatePath usages migrated
- [ ] Type-safe routing working
- [ ] Search params validated with Zod
- [ ] Performance within acceptable thresholds
- [ ] Feature flag `ENABLE_TANSTACK_ROUTER` functional
- [ ] **SECURITY:** `validateRedirectUrl()` implemented and used in auth redirect
- [ ] **SECURITY:** All string search params sanitized with DOMPurify
- [ ] **SECURITY:** No `.coerce` usage - explicit validation with range limits
- [ ] **SECURITY:** All Zod schemas use `.catch()` defaults
- [ ] All E2E tests updated and passing
- [ ] Committed to version control

---

## Phase Goal

**What this phase accomplishes:**

Replace React Router v7 with TanStack Router for type-safe, file-based routing with built-in Zod search validation. This affects 118 files and 34 authenticated routes.

**What this phase does NOT include:**

- Table migrations (Phase 4)
- Drawer state simplification (Phase 5)
- Any backend changes

---

## Why TanStack Router?

| Feature | React Router v7 | TanStack Router |
|---------|----------------|-----------------|
| Type Safety | Partial (strings) | Full (compile-time) |
| Search Params | Manual parsing | Zod validation built-in |
| Data Loading | Loaders (limited) | Integrated with TanStack Query |
| Code Splitting | Manual | Automatic with .lazy.tsx |
| File-Based Routing | No | Yes (optional) |

---

## Migration Scope

| Category | Count |
|----------|-------|
| React Router imports | **118 files** |
| generatePath usage | **15 usages** across 10 files |
| AuthenticatedRoute entries | **34 routes** |
| Total Affected | **~150 unique files** |

---

## Tasks

### Task 3.1: Create Redirect URL Validator (SECURITY)

> **Security Fix:** CRIT-2 - Open Redirect via Router Context (CVSS 8.1)

**Files:**
- Create: `src/utils/redirectValidation.ts`
- Create: `src/utils/__tests__/redirectValidation.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/utils/__tests__/redirectValidation.test.ts
import { validateRedirectUrl } from '../redirectValidation'

describe('validateRedirectUrl', () => {
  // Malicious vectors
  it('rejects different origin', () => {
    const maliciousUrl = 'https://evil.com/phishing'
    expect(validateRedirectUrl(maliciousUrl)).toBe('/insights')
  })

  it('rejects protocol-relative URLs', () => {
    const maliciousUrl = '//evil.com/phishing'
    expect(validateRedirectUrl(maliciousUrl)).toBe('/insights')
  })

  it('rejects javascript: protocol', () => {
    const maliciousUrl = 'javascript:alert(document.cookie)'
    expect(validateRedirectUrl(maliciousUrl)).toBe('/insights')
  })

  it('rejects data: protocol', () => {
    const maliciousUrl = 'data:text/html,<script>alert(1)</script>'
    expect(validateRedirectUrl(maliciousUrl)).toBe('/insights')
  })

  it('rejects host spoofing attempts', () => {
    const maliciousUrl = 'http://localhost:3000@evil.com'
    expect(validateRedirectUrl(maliciousUrl)).toBe('/insights')
  })

  // Valid paths
  it('allows valid same-origin path', () => {
    const validUrl = '/assets?status=active'
    expect(validateRedirectUrl(validUrl)).toBe('/assets?status=active')
  })

  it('allows assets route', () => {
    expect(validateRedirectUrl('/assets')).toBe('/assets')
  })

  it('allows vulnerabilities route', () => {
    expect(validateRedirectUrl('/vulnerabilities')).toBe('/vulnerabilities')
  })

  it('rejects unauthorized paths', () => {
    const unauthorizedUrl = '/admin/delete-all-data'
    expect(validateRedirectUrl(unauthorizedUrl)).toBe('/insights')
  })

  it('returns default for null input', () => {
    expect(validateRedirectUrl(null)).toBe('/insights')
  })

  it('returns default for undefined input', () => {
    expect(validateRedirectUrl(undefined)).toBe('/insights')
  })
})
```

**Step 2: Implement the validator**

```typescript
// src/utils/redirectValidation.ts

/**
 * SECURITY FIX (CRIT-2): Validates redirect URLs to prevent open redirect attacks
 *
 * Open redirect attacks allow attackers to craft malicious links that:
 * 1. Start with your legitimate domain
 * 2. After authentication, redirect to a phishing site
 * 3. Harvest credentials on a fake login page
 *
 * This validator ensures redirects only go to:
 * - Same origin (no external redirects)
 * - Whitelisted paths (no admin routes, etc.)
 */

const ALLOWED_REDIRECT_PATHS = [
  '/assets',
  '/vulnerabilities',
  '/seeds',
  '/insights',
  '/settings',
  '/agents',
  '/jobs',
  '/risks',
  '/reports',
  '/files',
  '/help',
  '/integrations',
] as const

const DEFAULT_REDIRECT = '/insights'

export function validateRedirectUrl(redirectUrl: string | null | undefined): string {
  if (!redirectUrl) {
    return DEFAULT_REDIRECT
  }

  try {
    // Handle relative URLs by prefixing with current origin
    const url = new URL(redirectUrl, window.location.origin)

    // CRITICAL: Must be same origin
    if (url.origin !== window.location.origin) {
      console.warn('[Security] Rejected redirect to different origin:', url.origin)
      return DEFAULT_REDIRECT
    }

    // Reject dangerous protocols (javascript:, data:, etc.)
    if (!['http:', 'https:'].includes(url.protocol)) {
      console.warn('[Security] Rejected redirect with dangerous protocol:', url.protocol)
      return DEFAULT_REDIRECT
    }

    // Check if pathname matches allowed patterns
    const isAllowedPath = ALLOWED_REDIRECT_PATHS.some(pattern =>
      url.pathname === pattern || url.pathname.startsWith(`${pattern}/`)
    )

    if (!isAllowedPath) {
      console.warn('[Security] Rejected redirect to unauthorized path:', url.pathname)
      return DEFAULT_REDIRECT
    }

    // Return safe pathname + search params (no hash to prevent DOM-based XSS)
    return url.pathname + url.search

  } catch (error) {
    // Invalid URL format - return safe default
    console.warn('[Security] Invalid redirect URL format:', redirectUrl, error)
    return DEFAULT_REDIRECT
  }
}
```

**Step 3: Run tests and commit**

```bash
npm test src/utils/__tests__/redirectValidation.test.ts
git add src/utils/redirectValidation.ts src/utils/__tests__/redirectValidation.test.ts
git commit -m "security(phase-3): add redirect URL validator (CRIT-2)"
```

---

### Task 3.2: Create Search Param Sanitization (SECURITY)

> **Security Fix:** HIGH-1 - XSS via Zod-validated Search Parameters (CVSS 7.3)

**Files:**
- Create: `src/utils/searchParamSanitization.ts`
- Create: `src/utils/__tests__/searchParamSanitization.test.ts`

**Step 1: Install DOMPurify**

```bash
npm install dompurify
npm install -D @types/dompurify
```

**Step 2: Write the failing tests**

```typescript
// src/utils/__tests__/searchParamSanitization.test.ts
import { sanitizeSearchParam } from '../searchParamSanitization'

describe('sanitizeSearchParam', () => {
  // XSS vectors
  it('removes script tags', () => {
    const malicious = '<script>alert("XSS")</script>'
    expect(sanitizeSearchParam(malicious)).toBe('')
  })

  it('removes event handlers', () => {
    const malicious = '<img src=x onerror=alert(1)>'
    expect(sanitizeSearchParam(malicious)).toBe('')
  })

  it('removes javascript: protocol', () => {
    const malicious = '<a href="javascript:alert(1)">Click</a>'
    expect(sanitizeSearchParam(malicious)).toBe('Click')
  })

  it('removes SVG-based XSS', () => {
    const malicious = '<svg/onload=alert(1)>'
    expect(sanitizeSearchParam(malicious)).toBe('')
  })

  it('removes iframe injection', () => {
    const malicious = '<iframe src="javascript:alert(1)">'
    expect(sanitizeSearchParam(malicious)).toBe('')
  })

  // Safe text preservation
  it('preserves safe text', () => {
    const safe = 'Normal search query'
    expect(sanitizeSearchParam(safe)).toBe('Normal search query')
  })

  it('preserves special characters as text', () => {
    const safe = 'Query with symbols: & < > "'
    expect(sanitizeSearchParam(safe)).toContain('Query with symbols')
  })

  it('handles undefined', () => {
    expect(sanitizeSearchParam(undefined)).toBeUndefined()
  })

  it('handles null', () => {
    expect(sanitizeSearchParam(null)).toBeNull()
  })
})
```

**Step 3: Implement the sanitizer**

```typescript
// src/utils/searchParamSanitization.ts
import DOMPurify from 'dompurify'

/**
 * SECURITY FIX (HIGH-1): Sanitizes search parameters to prevent XSS
 *
 * Zod validation ensures type safety but does NOT sanitize content.
 * A valid z.string() can contain malicious HTML/JavaScript that
 * gets rendered without escaping.
 *
 * This function removes all HTML tags and JavaScript to ensure
 * URL parameters are safe for display.
 */
export function sanitizeSearchParam(value: string | undefined | null): string | undefined | null {
  if (value === undefined) return undefined
  if (value === null) return null

  // Remove ALL HTML tags - search params should never contain HTML
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
}

/**
 * Creates a Zod transform function that sanitizes string values
 * Use in Zod schemas: z.string().optional().transform(sanitizeTransform)
 */
export function sanitizeTransform(value: string | undefined): string | undefined {
  if (!value) return value
  return sanitizeSearchParam(value) ?? undefined
}
```

**Step 4: Run tests and commit**

```bash
npm test src/utils/__tests__/searchParamSanitization.test.ts
git add src/utils/searchParamSanitization.ts src/utils/__tests__/searchParamSanitization.test.ts package.json package-lock.json
git commit -m "security(phase-3): add search param sanitization (HIGH-1)"
```

---

### Task 1.1: Install TanStack Router

**Files:**
- Modify: `package.json`

**Step 1: Install packages**

```bash
cd modules/chariot/ui
npm install @tanstack/react-router @tanstack/router-zod-adapter
npm install -D @tanstack/router-vite-plugin @tanstack/router-devtools
```

**Step 2: Verify installation**

```bash
npm ls @tanstack/react-router
```

Expected: Shows installed version

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(phase-1): install TanStack Router dependencies"
```

---

### Task 1.2: Configure Vite Plugin

**Files:**
- Modify: `vite.config.ts`

**Step 1: Add TanStack Router plugin**

```typescript
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
      routeFileIgnorePattern: '.*\\.test\\.tsx?$',
    }),
    // ... other plugins
  ],
})
```

**Step 2: Create routes directory**

```bash
mkdir -p src/routes
```

**Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "feat(phase-1): configure TanStack Router Vite plugin"
```

---

### Task 1.3: Create Root Route

**Files:**
- Create: `src/routes/__root.tsx`

**Step 1: Write root route with context**

```typescript
import { createRootRouteWithContext, Outlet, useLocation } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { ImpersonationBanner } from '@/components/ImpersonationBanner'
import { useRef, useEffect } from 'react'

export interface RouterContext {
  queryClient: QueryClient
  auth: {
    isSignedIn: boolean
    me: string
    isPraetorianUser: boolean
    friend: string
    viewingAs: string
    getToken: () => Promise<string>
  }
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  errorComponent: RootErrorComponent,
  notFoundComponent: () => <NotFound />,
})

function RootComponent() {
  const pathname = useLocation({ select: (s) => s.pathname })
  const mainRef = useRef<HTMLElement>(null)

  // H3: Focus management on route change for accessibility
  useEffect(() => {
    mainRef.current?.focus()
  }, [pathname])

  return (
    <div>
      <ImpersonationBanner />
      <main ref={mainRef} tabIndex={-1} className="focus:outline-none">
        <Outlet />
      </main>
    </div>
  )
}

function RootErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 text-center">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-gray-600 text-center">
          {error.message || 'An unexpected error occurred'}
        </p>
        <div className="mt-6 flex gap-3">
          <button onClick={reset} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md">
            Try Again
          </button>
          <button onClick={() => (window.location.href = '/')} className="flex-1 px-4 py-2 bg-gray-200 rounded-md">
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="mt-2">Page not found</p>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/routes/__root.tsx
git commit -m "feat(phase-1): create root route with context and a11y focus management"
```

---

### Task 1.4: Create Authentication Layout

**Files:**
- Create: `src/routes/_authenticated.tsx`

**Step 1: Write authenticated layout route**

```typescript
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { MainLayout } from '@/components/layout/MainLayout'
import { validateRedirectUrl } from '@/utils/redirectValidation'

/**
 * SECURITY NOTE (H-04): This route guard is defense-in-depth only.
 *
 * Backend JWT validation is the AUTHORITATIVE access control.
 * Do NOT rely solely on this client-side guard for security-critical routes.
 *
 * This guard provides:
 * - Better UX (immediate redirect vs waiting for 401)
 * - Reduced unnecessary API calls
 *
 * It does NOT protect against:
 * - DevTools manipulation (context.auth.isSignedIn = true)
 * - Direct API access
 *
 * All data fetching still requires valid JWT token validated by backend.
 */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    if (!context.auth.isSignedIn) {
      // SECURITY FIX (CRIT-2): Validate redirect URL to prevent open redirect
      const safeRedirect = validateRedirectUrl(location.pathname)

      throw redirect({
        to: '/login',
        search: {
          redirect: safeRedirect,
        },
      })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  )
}
```

**Step 2: Commit**

```bash
git add src/routes/_authenticated.tsx
git commit -m "feat(phase-1): create authenticated layout route"
```

---

### Task 1.5: Migrate Routes (PR-by-PR Breakdown)

> **REVISED:** Original plan had 1 task for 118 files. Now broken into 8 PRs by feature area.

**Migration Pattern for Each Route:**

```typescript
// Example: src/routes/_authenticated/assets.tsx
import { createFileRoute } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/router-zod-adapter'
import { z } from 'zod'
import { sanitizeTransform } from '@/utils/searchParamSanitization'

/**
 * SECURITY FIX (HIGH-4): Replace .coerce with explicit validation
 *
 * .coerce.number() accepts:
 * - "Infinity" → Infinity (can crash pagination loops)
 * - "NaN" → NaN (breaks comparisons)
 * - "1e308" → Infinity overflow
 *
 * Use explicit validation with range limits instead.
 */
const safeNumberSchema = z.string()
  .transform(val => {
    const num = parseInt(val, 10)
    // Reject non-integers, NaN, Infinity
    if (!Number.isFinite(num) || !Number.isInteger(num)) {
      return 1 // Default
    }
    // Enforce sane limits (no DoS via ?page=999999999)
    if (num < 1) return 1
    if (num > 10000) return 10000
    return num
  })
  .catch(1) // SECURITY FIX (M-05): Use .catch() to hide validation errors

// Define search schema with Zod
const searchSchema = z.object({
  // SECURITY FIX (HIGH-1): Sanitize string params to prevent XSS
  status: z.enum(['active', 'inactive', 'all']).optional().catch(undefined),
  page: safeNumberSchema.default('1'),

  // SECURITY FIX (HIGH-1): Sanitize user-controllable strings
  detail: z.string().optional().transform(sanitizeTransform).catch(undefined),
  tab: z.string().optional().transform(sanitizeTransform).catch(undefined),
  query: z.string().optional().transform(sanitizeTransform).catch(undefined),
})

export const Route = createFileRoute('/_authenticated/assets')({
  validateSearch: zodValidator(searchSchema),
  component: AssetsPage,
})

function AssetsPage() {
  const { status, page, detail, tab } = Route.useSearch()
  const navigate = Route.useNavigate()

  // ... component implementation
}
```

---

## PR Breakdown (REVISED)

### Infrastructure PRs (3 PRs)

| PR | Scope | Files | Risk |
|----|-------|-------|------|
| **PR 3.1** | Install TanStack Router, configure Vite plugin | 3 | LOW |
| **PR 3.2** | Create root route, error boundaries | 4 | LOW |
| **PR 3.3** | Create router instance, type declarations | 3 | LOW |

### Route Migration PRs (8 PRs by feature area)

| PR | Feature Area | Routes | Files | Risk |
|----|--------------|--------|-------|------|
| **PR 3.4** | Dashboard & Insights | 2 | ~8 | MEDIUM |
| **PR 3.5** | Assets (list, detail, search) | 3 | ~12 | MEDIUM |
| **PR 3.6** | Vulnerabilities (list, detail) | 3 | ~10 | MEDIUM |
| **PR 3.7** | Seeds & Discovery | 3 | ~8 | LOW |
| **PR 3.8** | Jobs & Scans | 3 | ~10 | LOW |
| **PR 3.9** | Settings (all sub-routes) | 8 | ~15 | MEDIUM |
| **PR 3.10** | Authentication (login, SSO, OAuth) | 4 | ~8 | HIGH |
| **PR 3.11** | Remaining routes (help, reports, etc.) | 8 | ~12 | LOW |

### Navigation Migration PRs (5 PRs)

| PR | Scope | Files | Risk |
|----|-------|-------|------|
| **PR 3.12** | Migrate useNavigate calls (components/) | ~20 | MEDIUM |
| **PR 3.13** | Migrate useNavigate calls (hooks/) | ~15 | MEDIUM |
| **PR 3.14** | Migrate useSearchParams calls | ~18 | MEDIUM |
| **PR 3.15** | Migrate generatePath usages (15 total) | 10 | LOW |
| **PR 3.16** | Migrate Link components | ~25 | MEDIUM |

### Integration PRs (2 PRs)

| PR | Scope | Files | Risk |
|----|-------|-------|------|
| **PR 3.17** | Router integration, remove React Router | 5 | HIGH |
| **PR 3.18** | E2E test migration (41 files) | 41 | MEDIUM |

---

### Per-Route Feature Flags

> ADDED: Per-route flags enable granular rollback (per review feedback)

```typescript
// src/config/routerFeatureFlags.ts
export const ROUTER_FEATURE_FLAGS = {
  // Enable TanStack Router per feature area
  TANSTACK_ROUTER_INSIGHTS: false,
  TANSTACK_ROUTER_ASSETS: false,
  TANSTACK_ROUTER_VULNERABILITIES: false,
  TANSTACK_ROUTER_SEEDS: false,
  TANSTACK_ROUTER_JOBS: false,
  TANSTACK_ROUTER_SETTINGS: false,
  TANSTACK_ROUTER_AUTH: false,

  // Master switch (only enable when all above are stable)
  TANSTACK_ROUTER_ALL: false,
}

// Usage in route files
export const Route = createFileRoute('/_authenticated/assets')({
  beforeLoad: () => {
    if (!ROUTER_FEATURE_FLAGS.TANSTACK_ROUTER_ASSETS) {
      throw redirect({ to: '/legacy/assets' }) // Fallback to React Router
    }
  },
  component: AssetsPage,
})
```

---

### Dual Router Strategy

During migration, both routers coexist:

```typescript
// src/App.tsx
function App() {
  const routerFlags = useRouterFeatureFlags()

  // Routes with TanStack Router enabled
  const tanstackRoutes = [
    routerFlags.TANSTACK_ROUTER_ASSETS && '/assets',
    routerFlags.TANSTACK_ROUTER_INSIGHTS && '/insights',
    // ...
  ].filter(Boolean)

  return (
    <>
      {/* TanStack Router handles enabled routes */}
      <RouterProvider router={tanstackRouter} />

      {/* React Router handles remaining routes */}
      <Routes>
        {!routerFlags.TANSTACK_ROUTER_ASSETS && (
          <Route path="/assets/*" element={<LegacyAssets />} />
        )}
        {/* ... */}
      </Routes>
    </>
  )
}
```

---

### Task 1.6: Create Router Instance

**Files:**
- Create: `src/router.tsx`

**Step 1: Write router with context injection**

```typescript
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import { useAuth } from '@/state/auth'

// Create router instance
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  context: {
    queryClient: undefined!, // Will be set in RouterWithContext
    auth: undefined!,
  },
})

// Type declaration for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Component that provides context to router
export function RouterWithContext({ queryClient }: { queryClient: QueryClient }) {
  const auth = useAuth()

  return (
    <RouterProvider
      router={router}
      context={{
        queryClient,
        auth: {
          isSignedIn: auth.isSignedIn,
          me: auth.me,
          isPraetorianUser: auth.isPraetorianUser,
          friend: auth.friend,
          viewingAs: auth.viewingAs,
          getToken: auth.getToken,
        },
      }}
    />
  )
}
```

**Step 2: Commit**

```bash
git add src/router.tsx
git commit -m "feat(phase-1): create router instance with context injection"
```

---

### Task 1.7: Update Navigation Calls

**Files:**
- All 118 files with React Router imports

**Migration Pattern:**

```typescript
// BEFORE: React Router
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
const navigate = useNavigate()
navigate('/assets')
navigate({ search: '?page=2' })

// AFTER: TanStack Router
import { useNavigate } from '@tanstack/react-router'
const navigate = useNavigate()
navigate({ to: '/assets' })
navigate({ search: (prev) => ({ ...prev, page: 2 }) })
```

**generatePath Migration (15 usages):**

```typescript
// BEFORE
import { generatePath } from 'react-router-dom'
const path = generatePath('/assets/:id', { id: assetId })

// AFTER
const path = `/assets/${assetId}`
// Or use type-safe Link
<Link to="/assets/$id" params={{ id: assetId }}>View</Link>
```

**Search Params Migration:**

```typescript
// BEFORE
const [searchParams, setSearchParams] = useSearchParams()
const page = parseInt(searchParams.get('page') || '1')

// AFTER
const { page } = Route.useSearch()  // Already validated and typed!
```

**Batch Process:**

1. Run search for React Router imports
2. Group by feature area
3. Migrate 5-10 files per batch
4. Run tests after each batch
5. Commit

```bash
# Find all files to migrate
grep -r "from 'react-router\|from \"react-router" src --include="*.tsx" --include="*.ts" | grep -v node_modules | cut -d: -f1 | sort -u
```

---

## Search Param Serialization (B2 Resolution)

**Arrays:**
```typescript
// URL: ?status=active&status=inactive
const schema = z.object({
  status: z.array(z.string()).default([]),
})
// Parsed: { status: ['active', 'inactive'] }
```

**Dates:**
```typescript
// URL: ?from=2025-01-01
const schema = z.object({
  from: z.string().pipe(z.coerce.date()).optional(),
})
```

**Nested Objects:**
```typescript
// Flatten to dot notation: ?filter.status=active&filter.severity=high
// Or use JSON: ?filter=%7B%22status%22%3A%22active%22%7D
```

---

## Performance Comparison

After Phase 1 completion, compare metrics:

| Metric | Baseline | Post-Phase 1 | Delta |
|--------|----------|--------------|-------|
| LCP | ___ ms | ___ ms | ___ |
| Route Load | ___ ms | ___ ms | ___ |
| Bundle Size | ___ KB | ___ KB | ___ |

---

## Rollback Strategy

**Feature Flag:** `ENABLE_TANSTACK_ROUTER`

```typescript
// In App.tsx
if (FEATURE_FLAGS.ENABLE_TANSTACK_ROUTER) {
  return <RouterWithContext queryClient={queryClient} />
} else {
  return <LegacyReactRouterApp />
}
```

**Emergency Rollback:**
```bash
cd modules/chariot/ui
git revert [commit-hash]
npm install && npm run build
make deploy-frontend
```

---

## E2E Test Deliverables

| Test | Description |
|------|-------------|
| `route-navigation.spec.ts` | Verify all 34 routes load correctly |
| `search-params.spec.ts` | Verify search param validation |
| `deep-linking.spec.ts` | Verify direct URL navigation |
| `auth-redirect.spec.ts` | Verify unauthenticated redirect to login |

---

## Handoff to Next Phase

**When this phase is complete:**

- Phase 3 provides: Type-safe routing with TanStack Router
- Next phase (Phase 5) will: Simplify drawer state using new router

**To resume work:**

1. Verify all exit criteria checked
2. Read `phase-5-drawer-simplification.md`
3. Verify entry criteria for Phase 5
4. Begin execution

Note: Phase 4 (Tables) can run in parallel with Phase 3.

---

## Phase-Specific Notes

**Technical decisions made in this phase:**

- File-based routing for discoverability
- Zod validation for type-safe search params
- Context injection for auth state
- Focus management added for accessibility (H3)

**Dependencies introduced:**

- `@tanstack/react-router`
- `@tanstack/router-zod-adapter`
- `@tanstack/router-vite-plugin`
- `@tanstack/router-devtools`

**Refactoring opportunities (future work):**

- Lazy loading with `.lazy.tsx` files
- Data preloading with route loaders
