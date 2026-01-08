# Reference Materials

This document contains NPM packages, file changes, and security considerations for the URL refactoring project.

---

## NPM Packages

### Required (Phase 3)

| Package | Version | Purpose |
|---------|---------|---------|
| `@tanstack/react-router` | ^1.x | Type-safe routing |
| `@tanstack/router-zod-adapter` | ^1.x | Zod search validation (optional with Zod v4) |
| `@tanstack/router-vite-plugin` | ^1.x | File-based routing |
| `@tanstack/router-devtools` | ^1.x | Development debugging |

### Already Installed

| Package | Version | Purpose |
|---------|---------|---------|
| `@tanstack/react-query` | 5.90.8 | Server state |
| `@tanstack/react-table` | ^8.21.3 | Table logic |
| `@tanstack/react-virtual` | ^3.13.12 | Virtualization |
| `zod` | ^4.1.12 | Schema validation |
| `react-router` | ^7.9.1 | Current routing (to be replaced) |

### Not Needed

| Package | Reason |
|---------|--------|
| `nuqs` | TanStack Router has built-in search validation |
| `nanoid` | Only needed for opaque IDs (backend feature) |

### Installation Command

```bash
cd modules/chariot/ui
npm install @tanstack/react-router @tanstack/router-zod-adapter
npm install -D @tanstack/router-vite-plugin @tanstack/router-devtools
```

---

## File Change Summary

### Files to Create

| Path | Phase | Description |
|------|-------|-------------|
| `src/state/impersonation.tsx` | 1 | Impersonation context + sessionStorage |
| `src/components/ImpersonationBanner.tsx` | 1 | Impersonation UI (optional) |
| `src/utils/entityKeyHasher.ts` | 2 | SHA-256 hash generation |
| `src/utils/entityKeyRegistry.ts` | 2 | Tiered storage for entity keys |
| `src/hooks/useDrawerUrlState.ts` | 2 | Drawer URL state management |
| `src/components/LegacyUrlWarning.tsx` | 2 | Warning dialog for legacy URLs |
| `src/components/UnresolvedLinkDialog.tsx` | 2 | Dialog for unresolved hashes |
| `src/routes/__root.tsx` | 3 | Root route with context |
| `src/routes/_authenticated.tsx` | 3 | Auth layout route |
| `src/routes/_authenticated/assets.tsx` | 3 | Assets page route |
| `src/routes/_authenticated/*.tsx` | 3 | All other routes (34 total) |
| `src/router.tsx` | 3 | Router instance with context |
| `src/hooks/useDrawerState.ts` | 5 | Unified drawer state hook |

### Files to Modify Significantly

| Path | Phase | Changes |
|------|-------|---------|
| `src/index.tsx` or `src/App.tsx` | 1 | Add ImpersonationProvider to hierarchy |
| `src/state/auth.tsx` | 1 | Read impersonation from context, not URL |
| `src/hooks/useOpenEntityDrawer.ts` | 2 | Use hash-based URLs |
| `vite.config.ts` | 3 | Add TanStack Router plugin |
| `src/components/table/TanStackTable.tsx` | 4 | Add sorting, virtualization |
| `src/components/table/columnAdapter.ts` | 4 | Handle edge cases |
| `src/state/global.state.tsx` | 5 | Simplified drawer state |
| `src/app/AppRoute.tsx` | 3 | Remove after migration |

### Files to Delete (After Migration)

| Path | Phase | Reason |
|------|-------|--------|
| `src/app/AppRoute.tsx` | 3 | Replaced by TanStack Router |
| `src/utils/encrypt.util.ts` | 3 | No more URL encoding needed |

---

## Critical Files (High Risk)

| File | Lines | Impact | Phase |
|------|-------|--------|-------|
| `src/app/AppRoute.tsx` | 400 | Main routing, `:userId` parameter | Phase 3 |
| `src/app/constant.tsx` | ~200 | `AuthenticatedRoute` enum (34 routes) | Phase 3 |
| `src/state/auth.tsx` | 653 | `userIdFromUrl`, impersonation | Phase 1 |
| `src/state/global.state.tsx` | 1063 | Drawer state, 20+ URL params | Phase 5 |
| `src/hooks/useQueryKeys.ts` | ~130 | `useGetUserKey()` cache isolation | Phase 1 |
| `src/components/table/Table.tsx` | 1083 | Main table component | Phase 4 |

---

## Security Considerations

### sessionStorage vs URL - Security Analysis

| Aspect | URL (Current) | sessionStorage (New) |
|--------|---------------|---------------------|
| XSS Vulnerability | Exposed in URL, server logs | Still vulnerable to XSS |
| Browser History | PII in history | PII not in history |
| Shared Links | PII in shared URL | PII not shared |
| Server Logs | PII logged | PII not logged |
| Tab Isolation | Not isolated | Isolated per tab |

### What sessionStorage Protects Against

- ✅ PII in browser history
- ✅ PII in server logs
- ✅ PII in Referer headers
- ✅ PII in shared/copied URLs
- ✅ Tab isolation (same-origin policy)

### What sessionStorage Does NOT Protect Against

- ❌ XSS attacks - If attacker can run JavaScript, they can read sessionStorage
- ❌ Browser extensions with page access
- ❌ Other JavaScript on the same origin

**Mitigation:** XSS protection requires separate defenses (CSP headers, input sanitization, output encoding).

### Security Checklist

| Requirement | Phase | Status |
|-------------|-------|--------|
| No PII in URL path | 1, 3 | Pending |
| Redirect URL validation | 3 | Included |
| Impersonation state isolated per tab | 1 | Pending |
| OAuth flow preserves state securely | 1 | Pending |
| sessionStorage error handling | 1 | Included |
| Hash collision validation | 2 | Included |

### Deferred Security Items (Require Backend - OUT OF SCOPE)

| Requirement | Status | Why Deferred |
|-------------|--------|--------------|
| Opaque IDs non-enumerable | DEFERRED | Requires backend database schema |
| Share links time-limited | DEFERRED | Requires backend persistence layer |
| PII-free entity keys | DEFERRED | Requires opaque ID backend support |
| Impersonation timeout enforcement | DEFERRED | Requires backend JWT validation |

---

## Migration Scope Analysis

### Verified Statistics

| Category | File Count | Verification Command |
|----------|------------|---------------------|
| React Router imports | **118 files** | `grep -r "from 'react-router" src --include="*.tsx" --include="*.ts" \| grep -v node_modules \| cut -d: -f1 \| sort -u \| wc -l` |
| generatePath usage | **15 usages** | See `appendices/generatePath-migration-tracking.md` |
| TanStack Table (partial) | **10 files** | `grep -r "@tanstack/react-table" src --include="*.tsx" \| cut -d: -f1 \| sort -u \| wc -l` |
| Table-related files | **129 files** | `grep -r "Table\|DataTable" src --include="*.tsx" \| cut -d: -f1 \| sort -u \| wc -l` |
| Virtualization files | **13 files** | `grep -r "useVirtualizer" src --include="*.tsx" \| cut -d: -f1 \| sort -u \| wc -l` |
| AuthenticatedRoute entries | **34 routes** | `grep -A 100 "enum AuthenticatedRoute" src/app/constant.tsx \| grep -E "^\s+[A-Z_]+" \| wc -l` |
| **Total Affected** | **~150 unique files** | Overlap exists between categories |

---

## External Resources

### Security Standards

- [OWASP - Information Exposure Through Query Strings](https://owasp.org/www-community/vulnerabilities/Information_exposure_through_query_strings_in_url)
- [OWASP ASVS 8.3.1](https://owasp-aasvs4.readthedocs.io/en/latest/8.3.1.html)
- [W3C - Good Practices for Capability URLs](https://www.w3.org/TR/capability-urls/)

### TanStack Documentation

- [TanStack Router Docs](https://tanstack.com/router/latest)
- [TanStack Table v8 Docs](https://tanstack.com/table/latest)
- [TanStack Virtual v3 Docs](https://tanstack.com/virtual/latest)
- [TanStack Query v5 Docs](https://tanstack.com/query/latest)

---

## Architecture Review Status

> **Architecture Review #1:** APPROVED WITH CONDITIONS (2025-12-30)
> - Full review: `.claude/features/2025-12-30-160000-tanstack-migration-review/frontend-lead-architecture-feedback.md`
> - PII-free URL plan: `.claude/features/2025-12-30-160000-tanstack-migration-review/pii-free-url-implementation-plan.md`

> **Architecture Review #2:** APPROVED WITH RECOMMENDATIONS (2025-12-30)
> - Full review: `.claude/features/2025-12-30-tanstack-migration-review/frontend-lead-architecture-review.md`
> - Assessment: Architecture is sound, phase sequencing correct, frontend-only constraint validated
> - Blocking Items: 2 items (B1: forwardRef audit, B2: search param serialization)
> - High Priority: 4 issues (OAuth race, hash collision, focus management, multi-tab test)

---

## Timeline Estimates

### Best/Most Likely/Worst Case

| Phase | Duration | Best | Most Likely | Worst |
|-------|----------|------|-------------|-------|
| Phase 0 | 1-2 weeks | 1w | 1.5w | 2w |
| Phase 0.5 | 1-2 weeks | 1w | 1.5w | 2w |
| Phase 1 | 7-10 weeks | 7w | 8.5w | 10w |
| Phase 2 | 4-6 weeks | 4w | 5w | 6w |
| Phase 3 | 2-3 weeks | 2w | 2.5w | 3w |
| **Total** | | **15w** | **18w** | **23w** |

### Phase Ownership

| Phase | Lead | Reviewers |
|-------|------|-----------|
| Phase 0 | frontend-developer | frontend-lead, security |
| Phase 0.5 | frontend-developer | frontend-lead, security |
| Phase 1 | frontend-developer | frontend-lead |
| Phase 2 | frontend-developer | frontend-lead |
| Phase 3 | frontend-developer | frontend-lead |
