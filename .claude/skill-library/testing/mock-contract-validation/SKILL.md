---
name: mock-contract-validation
description: Use when creating MSW handlers or when tempted to guess API parameters under time pressure - prevents creating mocks that diverge from real API contracts by requiring verification of parameter names and response structure BEFORE writing handler code, catching mock-reality gaps that cause tests to pass while production fails
allowed-tools: 'Read, Write, Bash'
---

# Mock Contract Validation

## Overview

**Verify the contract BEFORE mocking it.**

Under time pressure, you'll guess. Guessing creates mocks that pass tests but don't match production.

**Core principle:** 2 minutes verifying saves 2 hours debugging why production fails despite passing tests.

## When to Use

Use when:
- Creating new MSW handlers
- Tempted to guess parameter names
- Time pressure to "just get tests passing"
- Don't want to "overthink it"

**Red flags you need this**:
- "I'll guess the URL path, worst case I'll fix it"
- "Parameter is probably called X"
- "Don't have time to check the real API"
- "This response structure seems reasonable"

## The Iron Law

```
NO HANDLER CODE WITHOUT CONTRACT VERIFICATION FIRST
```

**Violating this wastes MORE time than following it.**

## The Contract-First Protocol

### BEFORE Writing Handler Code

**STOP. Do NOT write ANY handler code yet.**

**MANDATORY 2-minute check** (must complete BEFORE writing code):

```bash
# Step 1: Find the real API hook implementation
grep -r "useMy\|useEndpoint" src/hooks/

# Step 2: Read the hook to see actual parameters
cat src/hooks/useMy.ts | grep -A 10 "queryKey\|url"

# Step 3: Find existing handlers (don't recreate)
grep -r "http.get.*my" src/test/mocks/
```

**Document what you found**:
```typescript
/**
 * Real API Contract (verified 2025-11-18)
 * Source: src/hooks/useMy.ts lines 45-52
 *
 * URL: /my
 * Parameters: resource (NOT label, NOT type)
 * Response: { count: number, [pluralizedResource]: T[] }
 *
 * Example: GET /my?resource=setting
 * Returns: { count: 2, settings: [...] }
 */
```

**No exceptions**:
- Not when "time pressure" (verification IS fast path)
- Not when "just need tests passing" (wrong mocks = failing tests later)
- Not when "seems obvious" (obvious ≠ correct)
- Not when "can fix if wrong" (fixing takes longer than verifying)
- Not when "don't want to overthink" (2 min verification ≠ overthinking)
- Not when "manager expects progress" (broken mocks = no progress)

**Order matters**:
1. FIRST: Verify contract (2 minutes)
2. SECOND: Write handler (5 minutes)

**NEVER**:
1. FIRST: Write handler (5 minutes)
2. SECOND: Debug wrong mock (2 hours)

**Why**: Guessing saves 2 minutes now, costs 2 hours later.

**Time pressure response**: "I'll spend 2 minutes verifying so I don't spend 2 hours debugging."

### After Verification, Then Mock

```typescript
// NOW write handler using VERIFIED contract
http.get('*/my', ({ request }) => {
  const url = new URL(request.url);
  const resource = url.searchParams.get('resource'); // ✅ Verified parameter name

  if (resource === 'setting') {
    return HttpResponse.json({
      count: 2,
      settings: [mockSettings] // ✅ Verified pluralized key
    });
  }

  return HttpResponse.json({ count: 0 }); // ✅ Match real API empty response
});
```

## Baseline Failure Pattern (From RED Phase)

**What agents do without this skill** (time pressure scenario):

**Guess**:
- URL path: `/api/my` (didn't verify, might be `/my`)
- Parameter: `resource` (lucky guess, could be `label`, `type`, `key`)
- Response: `{data: [...]}` (wrong - real is `{count, settings: [...]}`)

**Rationalize**:
- "Worst case test fails, I'll see actual path"
- "Don't overthink it"
- "30 minutes to investigate vs 5 minutes to guess"
- "Just get tests passing"

**Result**:
- Handler might work by luck
- Or creates subtle bugs (wrong response shape)
- Or conflicts with existing handlers
- Mock-reality divergence undetected

## The Skill Prevents

**Guessing**:
- URL paths
- Parameter names
- Response structures
- Header names

**Rationalizations**:
- "I'll fix if wrong" (takes longer than verifying)
- "Don't have time" (verification IS the fast path)
- "Seems reasonable" (reasonable ≠ correct)

## Red Flags - STOP Immediately

**If you're about to write handler code and thinking ANY of these**:
- "Parameter is probably called X"
- "Response structure seems like it would be Y"
- "Don't have time to check the real API"
- "I'll guess and fix if wrong"
- "Just need tests passing quickly"

**ALL of these mean**: STOP. Run 2-minute verification protocol.

## The Bottom Line

```
2 MINUTES VERIFYING > 2 HOURS DEBUGGING
```

**Question**: Do you KNOW the contract or are you GUESSING?
- KNOW (verified) → Write handler
- GUESSING → Stop, verify first

**Pressure response**: "Verification IS the fast path when you include debugging time."
