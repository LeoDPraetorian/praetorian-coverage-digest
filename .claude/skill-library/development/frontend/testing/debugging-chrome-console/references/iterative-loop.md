# Iterative Fix Loop

Deep dive on the iterative debugging strategy: how to loop until the console is completely clean.

## Table of Contents

- [Core Concept](#core-concept)
- [Why Iteration Matters](#why-iteration-matters)
- [Loop Mechanics](#loop-mechanics)
- [Exit Conditions](#exit-conditions)
- [Common Pitfalls](#common-pitfalls)
- [Advanced Strategies](#advanced-strategies)

---

## Core Concept

**Autonomous debugging is a feedback loop, not a one-shot fix.**

```
┌────────────────────────────────────────┐
│  Read Console → Identify Error         │
└───────────────┬────────────────────────┘
                │
                ▼
┌────────────────────────────────────────┐
│  Fix Code → Apply Change               │
└───────────────┬────────────────────────┘
                │
                ▼
┌────────────────────────────────────────┐
│  Verify Fix → Reload & Re-read Console │
└───────────────┬────────────────────────┘
                │
                ▼
         Errors Remain?
         YES: Loop back to Fix
         NO: Done ✅
```

**Key principle**: Never assume a fix worked. Always verify by reading the console again.

---

## Why Iteration Matters

### Problem: Single-Pass Fixes Often Fail

**Example scenario:**

1. Console shows error: `Cannot read properties of undefined (reading 'name')`
2. You add: `user?.name`
3. **Assumption**: Fixed ✅
4. **Reality**: New error appears: `Cannot read properties of undefined (reading 'email')`

**Why this happens:**
- One fix reveals the next error (cascading failures)
- Multiple instances of the same error in different files
- Fix introduces new bug (regression)
- Error was symptom, not root cause

### Solution: Iterative Verification

**After every fix:**
1. Reload the page
2. Re-read console messages
3. Compare to previous state
4. If errors remain, fix the next one
5. Repeat until console is clean

**This is not optional. This is the workflow.**

---

## Loop Mechanics

### Loop Structure

```typescript
let iteration = 0;
const maxIterations = 10;  // Safety limit

while (iteration < maxIterations) {
  iteration++;

  // Step 1: Read console
  const messages = await listConsoleMessages();
  const errors = messages.filter(m => m.type === 'error');

  // Step 2: Check exit condition
  if (errors.length === 0) {
    console.log('✅ Console clean - exiting loop');
    break;
  }

  // Step 3: Fix next error
  console.log(`Iteration ${iteration}: Fixing error ${errors[0].text}`);
  await fixError(errors[0]);

  // Step 4: Reload and verify
  await reloadPage();
  await sleep(3000);  // Wait for page load

  // Loop continues...
}

if (iteration >= maxIterations) {
  console.log('⚠️ Max iterations reached - manual review needed');
}
```

### Iteration Metrics

Track progress across iterations:

| Iteration | Errors Found | Error Fixed | Status |
|-----------|--------------|-------------|--------|
| 1 | 5 | `Cannot read 'name'` | 🔄 Continuing |
| 2 | 4 | `Cannot read 'email'` | 🔄 Continuing |
| 3 | 3 | `Module not found` | 🔄 Continuing |
| 4 | 2 | `fetch failed` | 🔄 Continuing |
| 5 | 1 | `undefined variable` | 🔄 Continuing |
| 6 | 0 | N/A | ✅ **Complete** |

**Success**: Error count decreases each iteration.
**Problem**: Error count stays same or increases → root cause not addressed.

---

## Exit Conditions

### Primary Exit: Console Clean

**Condition**: `errors.length === 0`

**Verification**:
```bash
npx tsx -e "(async () => {
  const { listConsoleMessages } = await import('./.claude/tools/chrome-devtools/list-console-messages.ts');
  const result = await listConsoleMessages.execute({});
  const errors = result.messages.filter(m => m.type === 'error');

  if (errors.length === 0) {
    console.log('✅ EXIT CONDITION MET: Console is clean');
    process.exit(0);
  } else {
    console.log('❌ Continue loop - errors remain:', errors.length);
    process.exit(1);
  }
})();" 2>/dev/null
```

### Secondary Exits (Safety Mechanisms)

**1. Max Iterations Exceeded**

**Condition**: `iteration >= maxIterations` (default: 10)

**Action**: Stop and report remaining errors for manual review.

**Reason**: Prevents infinite loops if errors can't be fixed automatically.

---

**2. Same Error Persists**

**Condition**: Same error text appears for 3+ consecutive iterations.

**Action**: Report error as unfixable, recommend manual debugging.

**Reason**: Indicates fix strategy is wrong or error is environmental.

---

**3. Error Count Increases**

**Condition**: Error count goes up instead of down.

**Action**: Rollback last change, try different approach.

**Reason**: Last fix introduced new problems (regression).

---

## Common Pitfalls

### Pitfall 1: Stopping Too Early

**❌ Wrong:**
```
Iteration 1: Fixed 1 error
Console now has 2 errors
"Good enough, most issues are fixed" ← WRONG
```

**✅ Correct:**
```
Iteration 1: Fixed 1 error
Console now has 2 errors
Continue loop → Fix next error
Iterate until console has 0 errors
```

**Why**: Partial fixes leave the app in a broken state. User will still see errors.

---

### Pitfall 2: Not Verifying After Each Fix

**❌ Wrong:**
```
Fix error 1
Fix error 2
Fix error 3
NOW check console ← WRONG
```

**✅ Correct:**
```
Fix error 1 → Verify in console
Fix error 2 → Verify in console
Fix error 3 → Verify in console
```

**Why**: Early fixes may resolve later errors. You avoid unnecessary work by verifying incrementally.

---

### Pitfall 3: Ignoring Warnings

**❌ Wrong:**
```
Console has 3 errors, 10 warnings
Fix errors only, ignore warnings ← WRONG (sometimes)
```

**✅ Correct:**
```
Console has 3 errors, 10 warnings
Fix errors first (priority)
Review warnings for real issues:
  - React hook dependency warnings → Fix these
  - React DevTools version mismatch → Ignore
  - Deprecated API warnings → Fix if time allows
```

**Why**: Some warnings indicate bugs that will become errors later. Others are noise.

---

### Pitfall 4: Fixing Without Understanding

**❌ Wrong:**
```
Error: "Cannot read properties of undefined"
Quick fix: Add optional chaining everywhere
Result: Error gone, but root cause (missing data) not solved ← WRONG
```

**✅ Correct:**
```
Error: "Cannot read properties of undefined"
Investigate: Why is the object undefined?
  - API call failed? → Fix API
  - Loading state not handled? → Add loader
  - Data not passed as prop? → Pass prop
Apply fix that addresses root cause
```

**Why**: Suppressing errors != solving problems. Fix root causes.

---

## Advanced Strategies

### Strategy 1: Batch Fixing

**When**: Multiple errors have the same root cause.

**Approach**:
1. Identify common pattern (e.g., all "undefined" errors)
2. Fix all instances in one iteration
3. Verify all are resolved together

**Example**:
```typescript
// All components have same error: user?.name
// Fix all at once with multi-file edit
Edit src/components/UserProfile.tsx ...
Edit src/components/UserCard.tsx ...
Edit src/components/UserList.tsx ...
// Then verify once
```

**Benefit**: Faster than one-by-one, but riskier (multiple changes at once).

---

### Strategy 2: Priority-Based Fixing

**When**: Many errors, need to prioritize.

**Priority order**:
1. **Blocking errors** - prevent page from loading
2. **Functionality errors** - break user features
3. **Visual errors** - UI glitches
4. **Warnings** - potential future issues

**Approach**:
1. Read all console messages
2. Sort by priority
3. Fix highest priority first
4. Iterate through priority levels

---

### Strategy 3: Root Cause Analysis

**When**: Same error keeps appearing despite fixes.

**Approach**:
1. **Stop fixing symptoms** - pause the loop
2. **Investigate deeper**:
   - Check API responses
   - Verify data flow
   - Review component lifecycle
3. **Fix root cause** - address upstream problem
4. **Resume loop** - verify all symptoms resolved

**Example**:
```
Symptom: 5 components show "Cannot read 'name'"
Root cause investigation:
  - Check API call that fetches user data
  - API returns 404 → user endpoint broken
Root cause fix: Fix API endpoint
Result: All 5 component errors disappear
```

---

### Strategy 4: Snapshot Comparison

**When**: Visual bugs or UI state issues.

**Approach**:
1. Take snapshot before fix
2. Apply fix
3. Take snapshot after fix
4. Compare visually

**Example**:
```bash
# Before
npx tsx -e "(async () => {
  const { takeSnapshot } = await import('./.claude/tools/chrome-devtools/take-snapshot.ts');
  await takeSnapshot.execute({});
})();" 2>/dev/null

# Fix...

# After
npx tsx -e "(async () => {
  const { takeSnapshot } = await import('./.claude/tools/chrome-devtools/take-snapshot.ts');
  await takeSnapshot.execute({});
})();" 2>/dev/null

# Compare: Did UI improve?
```

---

## Loop Metrics to Track

| Metric | What It Tells You | Good Trend | Bad Trend |
|--------|-------------------|------------|-----------|
| **Errors per iteration** | Progress rate | Decreasing | Flat/Increasing |
| **Iterations until clean** | Efficiency | <5 iterations | >10 iterations |
| **Repeated errors** | Fix effectiveness | 0 repeats | Same error 3+ times |
| **New errors introduced** | Regression risk | 0 new errors | Multiple new errors |

**Example good trend:**
```
Iteration 1: 8 errors
Iteration 2: 5 errors (-3)
Iteration 3: 2 errors (-3)
Iteration 4: 0 errors (-2) ✅
```

**Example bad trend (investigate):**
```
Iteration 1: 5 errors
Iteration 2: 5 errors (no change) ← WARNING
Iteration 3: 7 errors (+2) ← REGRESSION
```

---

## Summary

**The iterative fix loop is the core of autonomous debugging.**

**Rules:**
1. ✅ **Always verify** after each fix (reload + re-read console)
2. ✅ **Iterate until clean** (0 errors, not "fewer errors")
3. ✅ **Track progress** (error count should decrease)
4. ✅ **Exit on clean console** (primary success condition)
5. ✅ **Safety limit** (max 10 iterations, then manual review)

**This pattern applies to ALL autonomous debugging workflows, not just Chrome console.**

---

## Related References

- [Autonomous Debugging Workflow](workflow.md) - Complete workflow with loop implementation
- [Chrome DevTools MCP Tools](chrome-devtools-tools.md) - Tools for reading console
- [Common Error Patterns](error-patterns.md) - What to fix in each iteration
