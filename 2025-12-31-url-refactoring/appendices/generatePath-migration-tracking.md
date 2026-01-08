# generatePath Migration Tracking Document

**Total Occurrences Found**: 25 lines (9 imports + 1 definition + 15 actual usages)
**Migration Status**: NOT STARTED
**Last Updated**: 2025-12-30

---

## Summary

This document tracks all `generatePath` and `generatePathWithSearch` occurrences in the codebase that need migration for Phase 1 (TanStack Router).

### Migration Strategy

- **Remove**: All `generatePath` imports from 'react-router'
- **Remove**: `generatePathWithSearch` utility function
- **Replace**: All usages with TanStack Router's type-safe navigation

---

## Files Requiring Migration

### 1. src/state/auth.tsx (3 occurrences)

**Status**: ❌ Not Started

| Line | Type | Code | Migration |
|------|------|------|-----------|
| 25 | Import | `generatePath,` | Remove import |
| 129 | Usage | `generatePath(`:userId/${route}`, { userId: encode(userIdFromUrl) })` | Replace with `navigate({ to: route })` |
| 155 | Usage | `generatePath(`:userId/${route}`, { userId: encode(userIdFromUrl) })` | Replace with `navigate({ to: route })` |

**Notes**:
- This file handles impersonation start/stop
- After Phase 0, userId is in context, not URL
- Navigation should be simple: `navigate({ to: route })`

---

### 2. src/sections/signup/SSO.tsx (2 occurrences)

**Status**: ❌ Not Started

| Line | Type | Code | Migration |
|------|------|------|-----------|
| 10 | Import | `import { generatePathWithSearch } from '@/utils/url.util'` | Remove import |
| 63 | Usage | `generatePathWithSearch({ path: AuthenticatedRoute.INSIGHTS, userId: encode(email) })` | Replace with `navigate({ to: '/insights' })` |

**Notes**:
- OAuth callback navigation
- No userId in path after Phase 0

---

### 3. src/sections/signup/EmailPasswordForm.tsx (3 occurrences)

**Status**: ❌ Not Started

| Line | Type | Code | Migration |
|------|------|------|-----------|
| 15 | Import | `import { generatePathWithSearch } from '@/utils/url.util'` | Remove import |
| 103 | Usage | `generatePathWithSearch({ path: AuthenticatedRoute.INSIGHTS, userId: encode(email) })` | Replace with `navigate({ to: '/insights' })` |
| 116 | Usage | `generatePathWithSearch({ path: AuthenticatedRoute.INSIGHTS, userId: encode(email) })` | Replace with `navigate({ to: '/insights' })` |

**Notes**:
- Email/password signup flow
- Navigation after successful signup

---

### 4. src/sections/signup/PageWrapper.tsx (2 occurrences)

**Status**: ❌ Not Started

| Line | Type | Code | Migration |
|------|------|------|-----------|
| 15 | Import | `import { generatePathWithSearch } from '@/utils/url.util'` | Remove import |
| 114 | Usage | `generatePathWithSearch({ path: AuthenticatedRoute.SIGNUP })` | Replace with `navigate({ to: '/signup' })` |

**Notes**:
- Signup page wrapper
- Simple route navigation

---

### 5. src/sections/signup/ForgotPasswordSteps.tsx (2 occurrences)

**Status**: ❌ Not Started

| Line | Type | Code | Migration |
|------|------|------|-----------|
| 16 | Import | `import { generatePathWithSearch } from '@/utils/url.util'` | Remove import |
| 126 | Usage | `generatePathWithSearch({ path: AuthenticatedRoute.LOGIN })` | Replace with `navigate({ to: '/login' })` |

**Notes**:
- Forgot password flow
- Navigation to login after password reset

---

### 6. src/app/AppRoute.tsx (5 occurrences)

**Status**: ❌ Not Started

| Line | Type | Code | Migration |
|------|------|------|-----------|
| 3 | Import | `generatePath,` | Remove import |
| 107 | Usage | `to={generatePath(\`:userId/${defaultRoute}\`, { userId: encode(userIdFromUrl) })}` | Replace with TanStack Router redirect |
| 165 | Usage | `to={\`/${generatePath(...)\`}` | Replace with TanStack Router redirect |
| 192 | Usage | `to={generatePath(\`/:userId/${defaultRoute}\`, { userId: encode(userIdFromUrl) })}` | Replace with TanStack Router redirect |
| 243 | Usage | `to={generatePath(\`/:userId/${defaultRoute}\`, { userId: userId \|\| '' })}` | Replace with TanStack Router redirect |

**Notes**:
- **CRITICAL**: This file will be DELETED after Phase 1
- All routes move to `src/routes/` directory
- No need to migrate these usages - they're part of the old routing system

---

### 7. src/utils/url.util.ts (1 occurrence)

**Status**: ❌ Not Started

| Line | Type | Code | Migration |
|------|------|------|-----------|
| 39 | Definition | `export function generatePathWithSearch({ ... })` | **DELETE** entire function |

**Notes**:
- Custom utility function wrapping React Router's generatePath
- Not needed with TanStack Router
- Delete entire function after all usages are migrated

---

### 8. src/sections/customerManagement/components/CustomerTable.tsx (2 occurrences)

**Status**: ❌ Not Started

| Line | Type | Code | Migration |
|------|------|------|-----------|
| 5 | Import | `import { generatePath } from 'react-router'` | Remove import |
| 53 | Usage | `const url = generatePath(\`/:userId/${AuthenticatedRoute.INSIGHTS}\`, { userId: encode(customer.key) })` | Replace with `navigate({ to: '/insights' })` + startImpersonation |

**Notes**:
- Customer table row click to impersonate
- Should trigger impersonation flow instead of URL construction
- Example: `startImpersonation(customer.key, '/insights')`

---

### 9. src/components/reporting/PushToPlexTracModal.tsx (3 occurrences)

**Status**: ❌ Not Started

| Line | Type | Code | Migration |
|------|------|------|-----------|
| 19 | Import | `import { generatePathWithSearch } from '@/utils/url.util'` | Remove import |
| 164 | Usage | `generatePathWithSearch({ path: AuthenticatedRoute.ASSETS, search: { assetDrawerKey: ... } })` | Replace with `navigate({ to: '/assets', search: { detail: \`asset:${hash}\` } })` |
| 185 | Usage | `generatePathWithSearch({ path: AuthenticatedRoute.VULNERABILITIES, search: { vulnerabilityDrawerKey: ... } })` | Replace with `navigate({ to: '/vulnerabilities', search: { detail: \`risk:${hash}\` } })` |

**Notes**:
- Modal for linking to assets/vulnerabilities
- Needs Phase 0.5 hash-based entity keys
- Old: `assetDrawerKey` → New: `detail=asset:hash`

---

### 10. src/components/ui/Navigation.tsx (3 occurrences)

**Status**: ❌ Not Started

| Line | Type | Code | Migration |
|------|------|------|-----------|
| 27 | Import | `import { generatePathWithSearch } from '@/utils/url.util'` | Remove import |
| 129 | Usage | `generatePathWithSearch({ path: route, userId: encode(userIdFromUrl) })` | Replace with `navigate({ to: route })` |
| 142 | Usage | `generatePathWithSearch({ path: route, userId: encode(userIdFromUrl) })` | Replace with `navigate({ to: route })` |

**Notes**:
- Main navigation component
- After Phase 0, no userId in path
- Simple route navigation

---

## Migration Checklist

### Pre-Migration
- [x] Document all occurrences (this file)
- [ ] Read Phase 0 implementation to understand impersonation context
- [ ] Read Phase 0.5 implementation to understand hash-based entity keys
- [ ] Understand TanStack Router navigation API

### Migration Order

**Phase 0 Completion** (No generatePath changes yet):
- Impersonation moves to context
- `userId` no longer needed in URLs
- But don't touch generatePath yet

**Phase 1 Migration** (All generatePath changes):
1. ✅ **Start with simple unauthenticated routes first**:
   - `ForgotPasswordSteps.tsx` (line 126) - login navigation
   - `PageWrapper.tsx` (line 114) - signup navigation

2. ✅ **Auth flow navigation** (after successful login/signup):
   - `SSO.tsx` (line 63)
   - `EmailPasswordForm.tsx` (lines 103, 116)

3. ✅ **Authenticated navigation**:
   - `Navigation.tsx` (lines 129, 142) - main nav
   - `auth.tsx` (lines 129, 155) - impersonation start/stop

4. ✅ **Complex cases requiring Phase 0.5**:
   - `PushToPlexTracModal.tsx` (lines 164, 185) - drawer links with entity keys
   - `CustomerTable.tsx` (line 53) - impersonation click

5. ✅ **Delete old routing infrastructure**:
   - `AppRoute.tsx` - entire file deleted
   - `url.util.ts` - delete `generatePathWithSearch` function

### Per-File Migration Steps

For each file:
1. [ ] Read current implementation
2. [ ] Identify navigation pattern (simple route / with search params / with impersonation)
3. [ ] Write TanStack Router equivalent
4. [ ] Test navigation works
5. [ ] Remove old import
6. [ ] Mark as complete in this document

---

## Statistics

| Metric | Count |
|--------|-------|
| Total files affected | 10 |
| Import statements to remove | 9 |
| Function definitions to delete | 1 |
| Actual usages to migrate | 15 |
| **Total lines to change** | **25** |

---

## Migration Patterns

### Pattern 1: Simple Route Navigation

**Before**:
```typescript
import { generatePath } from 'react-router'
const path = generatePath(`:userId/${route}`, { userId: encode(userIdFromUrl) })
navigate(path)
```

**After**:
```typescript
import { useNavigate } from '@tanstack/react-router'
const navigate = useNavigate()
navigate({ to: route })
```

---

### Pattern 2: Navigation with Search Params

**Before**:
```typescript
import { generatePathWithSearch } from '@/utils/url.util'
const path = generatePathWithSearch({
  path: AuthenticatedRoute.ASSETS,
  search: { assetDrawerKey: entityKey }
})
navigate(path)
```

**After**:
```typescript
import { useNavigate } from '@tanstack/react-router'
const navigate = useNavigate()
navigate({
  to: '/assets',
  search: { detail: `asset:${hash}` }  // Phase 0.5 hash
})
```

---

### Pattern 3: Impersonation + Navigation

**Before**:
```typescript
const url = generatePath(`/:userId/${route}`, {
  userId: encode(targetEmail)
})
navigate(url)
```

**After**:
```typescript
const { startImpersonation } = useAuth()
startImpersonation(targetEmail, route)  // Handles context + navigation
```

---

## Dependencies

| Migration | Depends On | Reason |
|-----------|-----------|--------|
| Simple routes (Pattern 1) | Phase 0 complete | No userId in URL |
| Drawer routes (Pattern 2) | Phase 0.5 complete | Hash-based entity keys |
| Impersonation routes (Pattern 3) | Phase 0 complete | Context-based impersonation |

---

## Testing Checklist

After each file migration:
- [ ] Navigation works (clicking links/buttons)
- [ ] URL format is correct (no `/u/{base64}/` prefix)
- [ ] Search params preserved (if applicable)
- [ ] Back/forward browser buttons work
- [ ] No console errors
- [ ] Deep linking works (paste URL in new tab)

---

## Notes

- **DO NOT** start migration until Phase 0 is complete and merged
- **DO NOT** migrate drawer-related routes until Phase 0.5 is complete
- `AppRoute.tsx` (4 usages) will be deleted entirely - don't migrate those usages
- `generatePathWithSearch` function will be deleted after all usages are migrated

---

## Completion Criteria

- [ ] All 9 imports removed
- [ ] All 15 usages migrated
- [ ] `generatePathWithSearch` function deleted from `url.util.ts`
- [ ] `AppRoute.tsx` deleted
- [ ] All navigation tests passing
- [ ] No references to `generatePath` in codebase (verify with grep)
