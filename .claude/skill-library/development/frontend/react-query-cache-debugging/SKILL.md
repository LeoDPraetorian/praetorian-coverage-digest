---
name: react-query-cache-debugging
description: Use when React Query cache isn't updating after mutations, data doesn't appear after creation, or refresh shows data but component doesn't update - systematic investigation of query keys, invalidation patterns, and cache state before proposing fixes
---

# React Query Cache Debugging

## Overview

Random query invalidation fixes create race conditions and cache corruption. Guessing at query key formats wastes hours debugging why "it works after refresh but not immediately."

**Core principle:** Map complete query flow and verify key matching BEFORE changing invalidation logic.

**Violating this process leads to:** Blank data, stale caches, duplicate requests, and frustrated users.

## The Iron Law

```
NO QUERY INVALIDATION CHANGES WITHOUT COMPLETE KEY MAPPING FIRST
```

If you haven't traced the actual query keys and verified the mismatch, you cannot propose invalidation fixes.

## When to Use

Use for React Query cache issues:
- Data doesn't appear after mutations
- Component shows stale data after create/update/delete
- Refresh fixes it but immediate update doesn't work
- Query invalidation seems to do nothing
- Display values show old data or fall back to defaults

**Use this ESPECIALLY when:**
- User says "it works after refresh" (classic cache invalidation symptom)
- Multiple queries provide different pieces of same entity
- Using TanStack Query with complex query key structures
- Frontend uses query keys like `['MY', 'resource', param1, param2, ...]`

**Don't skip when:**
- Query invalidation "should be simple" (key mismatches are subtle)
- Using helper functions like `getQueryKey.getMy()` (still need to verify format)
- Issue seems obvious (query key case sensitivity catches everyone)

## The Four Phases

You MUST complete each phase before proceeding to the next.

### Phase 1: Map All Queries (NO CHANGES TO CODE)

**BEFORE changing ANY invalidation logic:**

1. **Find Every Query Involved in the Feature**

   Search for query definitions:
   ```typescript
   // Find all useMy, useQuery, useInfiniteQuery in the feature
   grep -r "useMy\|useQuery\|useInfiniteQuery" src/sections/featureName
   ```

   Document each query:
   ```
   Query 1: useCustomerManagement → useMy({ resource: 'account' })
   Query 2: useCustomerDisplayName → useMy({ resource: 'account', allTenants: true })
   Query 3: useCustomerType → useMy({ resource: 'configuration', query: 'customer_type' })
   ```

2. **Trace Actual Query Key Construction**

   For EACH query, trace through:
   - Query hook call site (what parameters are passed)
   - Query key constructor (getQueryKey.getMy or manual construction)
   - Any wrappers that modify the key (useGetUserKey, etc.)

   **Example trace:**
   ```typescript
   // Call site
   useMy({ resource: 'account', allTenants: true }, { doNotImpersonate: true })

   // Goes through useMy.ts line 64-75
   queryKey: useGetUserKey(
     getQueryKey.getMy('account', undefined, undefined, undefined, undefined, true),
     true,
     undefined
   )

   // getQueryKey.getMy returns (useQueryKeys.ts:17-25)
   [UniqueQueryKeys.MY, 'account', true]
   // = ['MY', 'account', true]

   // useGetUserKey with doNotImpersonate: true (useQueryKeys.ts:117-136)
   // Returns key as-is (no friend appended)

   // FINAL QUERY KEY: ['MY', 'account', true]
   ```

3. **Document Data Aggregation**

   If multiple queries feed one component:
   ```typescript
   // CustomerTable shows CustomerData which comes from:
   - email: collaborators query (useMy 'account')
   - displayName: useCustomerDisplayName (useMy 'account' + allTenants)
   - type: useCustomerType (useMy 'configuration' + query)
   - risks: useCustomerRiskCounts (useMy 'risk' + allTenants)
   ```

   **Critical insight**: Invalidating only ONE query won't update the full object!

4. **Create Query Key Reference Table**

   Before proceeding, create this table:

   | Query Description | Hook/Component | Actual Query Key | Purpose |
   |------------------|----------------|------------------|---------|
   | Collaborators list | useCustomerManagement | `['MY', 'account']` | List of customer emails |
   | Display names | useCustomerDisplayName | `['MY', 'account', true]` | Organization names |
   | Customer types | useCustomerType | `['MY', 'configuration', '"customer_type"']` | PILOT/ENGAGEMENT/etc |
   | Risk counts | useCustomerRiskCounts | `['MY', 'risk', true]` | Security metrics |

**Output from Phase 1**: Present this table to the user. DO NOT PROPOSE FIXES YET.

### Phase 2: Map Invalidation Logic (NO CHANGES)

**Find existing invalidation:**

1. **Locate All invalidateQueries/refetchQueries Calls**

   ```bash
   grep -r "invalidateQueries\|refetchQueries" src/sections/featureName
   ```

2. **Document Invalidation Keys**

   For each invalidation:
   ```typescript
   // Location: CustomerTable.tsx:233
   queryClient.invalidateQueries({
     queryKey: ['my', { resource: 'account' }]
   })

   // Attempting to invalidate: ['my', { resource: 'account' }]
   ```

3. **Compare Invalidation Keys to Actual Query Keys**

   Create comparison table:

   | Actual Query Key | Invalidation Key | Match? | Why/Why Not |
   |-----------------|------------------|--------|-------------|
   | `['MY', 'account']` | `['my', { resource: 'account' }]` | ❌ NO | Case: 'MY' ≠ 'my'<br>Structure: 'account' ≠ {resource: 'account'} |
   | `['MY', 'account', true]` | `['my', { resource: 'account' }]` | ❌ NO | Same as above |
   | `['MY', 'setting']` | `['my', { resource: 'setting' }]` | ❌ NO | Same pattern |

4. **Identify TanStack Query Prefix Matching Behavior**

   Document how prefix matching works:
   ```
   TanStack Query v5 uses PREFIX matching:

   invalidateQueries({ queryKey: ['MY', 'account'] })

   MATCHES:
   ✅ ['MY', 'account']
   ✅ ['MY', 'account', true]
   ✅ ['MY', 'account', 'friend@example.com']
   ✅ ['MY', 'account', undefined, undefined, true]

   DOES NOT MATCH:
   ❌ ['my', 'account'] (case sensitive)
   ❌ ['MY', 'setting'] (different resource)
   ❌ ['ACCOUNT', 'MY'] (different order)
   ```

**Output from Phase 2**: Present comparison table showing EXACTLY why invalidation isn't working.

### Phase 3: Present Root Cause Analysis (NO CHANGES)

**Template for presenting to user:**

```markdown
## Root Cause Analysis: React Query Cache Not Updating

### Problem Summary
[Describe the symptom in user's words]

### Data Flow Mapping
[Show the query → component → UI flow]

### Query Key Mismatch Identified

**Actual Query Keys** (from Phase 1):
- Collaborators: `['MY', 'account']`
- Display names: `['MY', 'account', true]`

**Current Invalidation Keys** (from Phase 2):
- `['my', { resource: 'account' }]`

**Mismatch Analysis**:
1. Case mismatch: `'my'` (lowercase) vs `'MY'` (uppercase enum)
2. Structure mismatch: `{ resource: 'account' }` (object) vs `'account'` (string)
3. TanStack Query prefix matching: `['my', {...}]` does NOT match `['MY', 'account']`

**Result**: Queries never invalidate → cache never updates → component shows stale data

### Proposed Minimal Fix

Change invalidation to use correct query key helper:

```typescript
// WRONG (current)
queryClient.invalidateQueries({
  queryKey: ['my', { resource: 'account' }],
});

// CORRECT (proposed)
queryClient.invalidateQueries({
  queryKey: getQueryKey.getMy('account'),  // Returns ['MY', 'account']
});
```

This will match ALL account queries via prefix matching:
- `['MY', 'account']` ✅
- `['MY', 'account', true]` ✅
- `['MY', 'account', 'friend']` ✅

### Files to Change
- [List specific files and line numbers]

**WAIT FOR USER APPROVAL BEFORE IMPLEMENTING**
```

**STOP HERE**: Present this analysis to the user. Do not proceed to Phase 4 until user confirms.

### Phase 4: Implement Minimal Fix (ONLY AFTER USER APPROVAL)

**After user approves:**

1. **Make the Minimal Change**

   Change ONLY the invalidation keys, nothing else:
   ```typescript
   // Add import if needed
   import { getQueryKey } from '@/hooks/useQueryKeys';

   // Update invalidation (ONE change)
   queryClient.invalidateQueries({
     queryKey: getQueryKey.getMy('account'),
   });
   ```

2. **No "While I'm Here" Refactoring**

   ❌ Don't also remove unused imports
   ❌ Don't also fix nearby code style
   ❌ Don't also add related improvements

   **Only fix the query key mismatch**. Other improvements can be separate commits.

3. **Verify TypeScript Compiles**

   ```bash
   npx tsc --noEmit
   ```

4. **Present Diff to User BEFORE Committing**

   Show the exact changes:
   ```bash
   git diff path/to/file.tsx
   ```

5. **User Tests Immediately**

   DO NOT commit until user confirms it works.

6. **If It Breaks Something Else**

   ```bash
   git checkout path/to/file.tsx  # Immediate revert
   ```

   Return to Phase 1 with the NEW symptom.

## Common Pitfalls (Anti-Patterns)

### ❌ Anti-Pattern 1: Fixing Query Keys AND Adding New Invalidations

**Wrong:**
```typescript
// Changing TWO things at once
queryClient.invalidateQueries({
  queryKey: getQueryKey.getMy('account'),  // Fix 1: Use helper
});
queryClient.invalidateQueries({
  queryKey: getQueryKey.getMy('account', undefined, undefined, undefined, undefined, true),  // Fix 2: Add allTenants
});
```

**Right:**
```typescript
// ONE change: Fix the key format
queryClient.invalidateQueries({
  queryKey: getQueryKey.getMy('account'),  // This matches BOTH regular AND allTenants via prefix
});
```

**Why**: If it breaks, you won't know which change caused it.

### ❌ Anti-Pattern 2: Assuming Prefix Matching Without Verification

**Wrong:**
"I'll just use `['MY']` to invalidate everything"

**Right:**
1. Trace what `['MY']` actually matches
2. Document unintended invalidations
3. Use specific key to avoid over-invalidation

### ❌ Anti-Pattern 3: Invalidating Before Understanding Data Flow

**Wrong:**
```typescript
// Let me try invalidating this...
queryClient.invalidateQueries({ queryKey: ['MY', 'account'] });
// And this too just in case...
queryClient.invalidateQueries({ queryKey: ['MY', 'setting'] });
// Oh and this might help...
queryClient.invalidateQueries({ queryKey: ['MY', 'configuration'] });
```

**Right:**
Map which queries provide which data fields FIRST, then invalidate only what's needed.

### ❌ Anti-Pattern 4: Adding Both invalidateQueries AND refetchQueries

**Wrong:**
```typescript
queryClient.invalidateQueries({ queryKey: getQueryKey.getMy('account') });
queryClient.refetchQueries({ queryKey: getQueryKey.getMy('account') }); // DUPLICATE!
```

**Why wrong**: `invalidateQueries` already triggers refetch for active queries. The second call creates duplicate network requests.

**Right:**
```typescript
// Option 1: Just invalidate (for background/non-urgent updates)
queryClient.invalidateQueries({ queryKey: getQueryKey.getMy('account') });

// Option 2: Just refetch (for immediate/urgent updates)
queryClient.refetchQueries({ queryKey: getQueryKey.getMy('account') });
```

**When to use refetchQueries directly**: Only when you need to AWAIT the refetch result:
```typescript
const results = await queryClient.refetchQueries({ queryKey: getQueryKey.getMy('account') });
const freshData = results[0]?.data; // Need the data immediately
```

## Verification Checklist

Before presenting analysis to user:

- [ ] Traced ALL queries involved in the feature
- [ ] Documented actual query key for each (not assumptions)
- [ ] Verified query key constructor functions (helper utilities)
- [ ] Created query key comparison table
- [ ] Identified exact mismatch (case, structure, params)
- [ ] Explained why TanStack Query prefix matching fails
- [ ] Proposed MINIMAL fix (change only invalidation keys)
- [ ] Listed specific files and line numbers to change
- [ ] NO CODE CHANGES MADE YET

## Success Criteria

You've completed this skill successfully when:

✅ User understands the root cause (can explain it back to you)
✅ User approves the proposed fix before you implement it
✅ Fix changes ONLY the invalidation keys, nothing else
✅ After implementation, user tests and confirms it works
✅ If it breaks, you immediately revert and return to Phase 1

## Red Flags (Stop and Reassess)

🚩 You're changing invalidation keys without tracing actual query keys
🚩 User reports fix "made it worse" or "now it's blank"
🚩 You're invalidating multiple resources "just to be safe"
🚩 You added `allTenants` or other parameters without verifying necessity
🚩 You're using both `invalidateQueries` AND `refetchQueries` without understanding why
🚩 Fix includes "while I'm here" refactoring (unused imports, code style, etc.)

## Example: This Session's Debugging Journey

### What Went Wrong

**Attempt 1**: Changed query keys + removed account invalidation + removed toast
- **Result**: Display name went blank
- **Mistake**: Stacked 3 changes, couldn't isolate which broke it

**Attempt 2**: Added allTenants invalidation in hook
- **Result**: Display name still blank
- **Mistake**: Added invalidation without verifying it was missing

**Attempt 3**: Added case-insensitive matching to normalizeOriginName
- **Result**: Still showing "Microsoft Defender"
- **Mistake**: Changed wrong function (vulnerabilities use different display logic)

**What Should Have Happened**:

**Phase 1**: Map queries
```
useCustomerManagement:
  - useMy({ resource: 'account' }) → ['MY', 'account']
  - useCustomerDisplayName() → ['MY', 'account', true]

Current invalidation:
  - ['my', { resource: 'account' }] ← DOESN'T MATCH
```

**Phase 2**: Compare keys
```
Actual:      ['MY', 'account']
Invalidate:  ['my', { resource: 'account' }]
Match? NO
Why: Case ('my' vs 'MY') and structure (string vs object)
```

**Phase 3**: Present to user
"The invalidation uses lowercase 'my' and object structure, but the actual query key is uppercase 'MY' with string. Should I fix this?"

**Phase 4**: Implement ONLY after approval
```typescript
import { getQueryKey } from '@/hooks/useQueryKeys';

queryClient.invalidateQueries({
  queryKey: getQueryKey.getMy('account'),
});
```

**Result**: Would have worked on first try, no reverts needed.

## Integration with Other Skills

### Use with `systematic-debugging`

For complex bugs involving queries:
1. Use `systematic-debugging` to understand the business logic failure
2. Use `react-query-cache-debugging` to fix the cache invalidation

### Use with `test-driven-development`

After fixing cache invalidation:
1. Write test that verifies query invalidation happens
2. Write test that verifies component receives fresh data
3. Prevent regression

## Tools and Techniques

### Query Key Inspection in Browser

```javascript
// In browser console
window.__REACT_QUERY_DEVTOOLS_GLOBAL_HOOK__?.queryClient.getQueryCache().getAll()
  .map(q => ({ key: q.queryKey, state: q.state.status }))
```

Shows all active query keys and their cache status.

### Logging Query Keys

```typescript
// Temporary debugging code
console.log('Query key:', queryKey);
console.log('Invalidating:', getQueryKey.getMy('account'));
```

### TanStack Query DevTools

Enable in development:
```typescript
// src/app/App.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<ReactQueryDevtools initialIsOpen={false} />
```

View all queries, their keys, and cache state.

## Common Query Key Patterns in Chariot

### Pattern 1: Enum-Based Keys

```typescript
// CORRECT
queryKey: [UniqueQueryKeys.MY, 'account']
// or
queryKey: getQueryKey.getMy('account')

// WRONG
queryKey: ['my', 'account']  // Lowercase won't match enum
queryKey: ['MY', { resource: 'account' }]  // Object structure wrong
```

### Pattern 2: Parameters in Keys

```typescript
// With allTenants
queryKey: getQueryKey.getMy('account', undefined, undefined, undefined, undefined, true)
// Returns: ['MY', 'account', true]

// Prefix match
queryKey: getQueryKey.getMy('account')
// Returns: ['MY', 'account']
// Matches: ['MY', 'account'], ['MY', 'account', true], ['MY', 'account', 'anything']
```

### Pattern 3: User Context Keys

```typescript
// With doNotImpersonate: false (default)
useGetUserKey(['MY', 'account'], false, undefined)
// Returns: ['MY', 'account', 'friend@example.com']

// With doNotImpersonate: true
useGetUserKey(['MY', 'account'], true, undefined)
// Returns: ['MY', 'account']
```

**Critical**: Invalidation must match user context (impersonation state).

## Remember

**The symptom "works after refresh but not after mutation" has ONE root cause 99% of the time:**

**Query invalidation keys don't match actual query keys.**

Don't look for complex explanations. Trace the keys, verify the mismatch, fix it, done.

**Time savings:**
- Wrong approach: 4 hours of trial-and-error fixes
- This skill: 30 minutes of mapping + 5 minutes to fix

**Apply this skill religiously and you'll never waste hours on cache invalidation bugs again.**
