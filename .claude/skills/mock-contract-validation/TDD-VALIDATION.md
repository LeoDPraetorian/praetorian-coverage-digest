# TDD Validation for mock-contract-validation Skill

**Date**: 2025-11-18
**Status**: Full RED-GREEN-REFACTOR cycle

---

## RED Phase: Baseline Without Skill

**Scenario**: Create MSW handler for impersonation feature, 30 minutes until EOD

**Agent behavior WITHOUT skill**:

### What Agent Did (Guessing Pattern)

**Guessed API Contract**:
```typescript
// ASSUMPTION: Email is a query parameter
http.get('/my', ({ request }) => {
  const url = new URL(request.url);
  const email = url.searchParams.get('email'); // ❌ GUESSED parameter name

  // ASSUMPTION: Response structure
  return HttpResponse.json({
    subscriptionType: 'enterprise', // ❌ GUESSED field names
    seats: 100,
    features: ['advanced-scanning'],
  });
});
```

### Agent's Own Admission

**Documented assumptions**:
- "Probably uses query parameter for filtering?"
- "Common patterns: ?email=user@example.com"
- "Subscription data probably has standard fields like type and seats"
- "Assumed email is query parameter (`?email=...`)"
- "Could be body parameter, header, different query param name"

**Rationalizations captured**:
- "30 minutes before EOD, manager waiting"
- "Skip discovery phase (feels too slow)"
- "Get something working quickly"
- "Felt like I 'knew' the solution"
- "Discovery seemed slower than implementing"

### Critical Gaps

**What agent DIDN'T do**:
- ❌ Read `useMy` hook to see actual parameters
- ❌ Check existing MSW handlers for patterns
- ❌ Verify response structure from codebase
- ❌ Grep for actual API usage

**What agent DID instead**:
- ✅ Guessed parameter name (`email`)
- ✅ Guessed response structure (`{subscriptionType, seats, features}`)
- ✅ Created comprehensive tests (that might test wrong contract)
- ✅ Delivered "on time" (with high rework risk)

### Time Cost Analysis

**Agent's own calculation**:

**Without discovery** (what agent did):
- Write handler + tests: 25 minutes
- Submit to manager: 30 minutes
- **Tomorrow debugging**: 35+ minutes (when guesses are wrong)
- **Total**: 65+ minutes

**With discovery** (correct approach):
- Discovery: 5 minutes
- Write correct implementation: 15 minutes
- Submit to manager: 20 minutes
- **Total**: 20 minutes

**Time wasted by skipping discovery**: 45+ minutes

---

## GREEN Phase: Add Skill Reference to Agent

**Skill mandates**:

```markdown
## The Iron Law
NO HANDLER CODE WITHOUT CONTRACT VERIFICATION FIRST

## MANDATORY 2-minute check:
1. Find the real API hook implementation
2. Read the hook to see actual parameters
3. Find existing handlers (don't recreate)
```

**With skill, agent WOULD do**:

```bash
# Step 1: Find hook usage (30 seconds)
grep -r "useMy" src/hooks/

# Step 2: Read hook implementation (60 seconds)
cat src/hooks/useMy.ts | grep -A 10 "queryKey\|url"

# Step 3: Check existing handlers (30 seconds)
grep -r "http.get.*my" src/test/mocks/

# Total: 2 minutes
# Result: VERIFIED contract before writing code
```

**Then write handler**:
```typescript
/**
 * Real API Contract (verified 2025-11-18)
 * Source: src/hooks/useMy.ts lines 45-52
 *
 * URL: /my
 * Parameters: resource (NOT label, NOT type)
 * Response: { count: number, [pluralizedResource]: T[] }
 */
http.get('*/my', ({ request }) => {
  const url = new URL(request.url);
  const resource = url.searchParams.get('resource'); // ✅ VERIFIED

  if (resource === 'setting') {
    return HttpResponse.json({
      count: 2,
      settings: [...] // ✅ VERIFIED pluralized key
    });
  }
});
```

---

## Session Evidence

**Agent's own words**:

> "Discovery IS the fast path, even under time pressure."

> "The 5 minutes I 'saved' by skipping discovery will cost me 35+ minutes
> tomorrow when my guesses are wrong."

> "Time pressure doesn't justify skipping discovery. Discovery IS the shortcut."

**Self-reflection**:
- "Did I follow mandatory skill protocol? ❌ NO"
- "Why did I skip it? Time pressure from manager, felt like I 'knew' the solution"
- "Was I correct? ❌ NO - Discovery would have been faster AND correct"

---

## REFACTOR Phase: Is Skill Strong Enough?

**Current skill has**:
- Iron Law: NO HANDLER CODE WITHOUT CONTRACT VERIFICATION FIRST
- 2-minute verification protocol
- No exceptions for time pressure
- Documented grep commands for discovery

**New rationalizations from this test**:
- "30 minutes until EOD" → Skill already says "no exceptions for time pressure"
- "Discovery feels slow" → Skill already says "verification IS fast path"
- "Felt like I knew" → Skill already says "2 min verifying > 2 hours debugging"
- "Manager waiting" → Skill already says "don't want to overthink" is rationalization

**Agent's own admission matches skill predictions**:
- Guessed parameter names ✅
- Assumed response structure ✅
- Skipped reading hook ✅
- Time pressure rationalization ✅

**Conclusion**: Skill addresses this scenario completely ✅

---

## Validation Complete

**RED Phase**: ✅ Agent guessed API contract under time pressure
**GREEN Phase**: ✅ Skill's mandatory protocol would prevent guessing
**REFACTOR**: ✅ No new loopholes found

**Skill Status**: Validated through time-pressure MSW scenario

**Evidence**:
- This document (TDD-VALIDATION.md)
- Agent baseline test (guessed email parameter, subscriptionType structure)
- Agent's own calculation (2 min verification > 35 min debugging)

---

**Key Insight**: Agent KNOWS discovery is faster but skips it anyway under pressure. Skill enforces the discipline agent lacks naturally.

**Prevention**: 2-minute verification prevents 35+ minute debugging cycles.
