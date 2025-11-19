# TDD Validation: systematic-debugging → test-quality-assessor

**Date**: 2025-11-18
**Gap**: Quality assessor proposes fixes before completing root cause investigation
**Status**: RED-GREEN-REFACTOR cycle

---

## RED Phase: Baseline Without Mandatory Skill Reference

**Scenario**: 5 failing tests, prod tomorrow, user wants quick fixes

**Agent behavior WITHOUT mandatory systematic-debugging skill:**

### What Agent Did (Mixed)

✅ **Good instincts**:
- Categorized failures by pattern
- Said "I need to see actual test code"
- Mentioned systematic-debugging skill at end
- Warned against blind fixes

❌ **Violated systematic debugging**:
- Proposed "Immediate Fixes (2-4 hours)" with code examples
- Showed fix implementations BEFORE investigating
- Treated debugging as optional fallback: "if needed"

**Agent said**:
> "Step 2: Immediate Fixes (2-4 hours)
>
> ```typescript
> // Before (brittle):
> await page.waitForTimeout(1000);
>
> // After (robust):
> await expect(page.locator('...')).toBeVisible();
> ```"

**The violation**: Proposed specific fix code WITHOUT:
- Reading actual test files
- Understanding why timeout exists
- Verifying root cause
- Completing Phase 1 investigation

### systematic-debugging Violation

**systematic-debugging skill says**:
> "Phase 1: Root Cause Investigation - BEFORE attempting ANY fix"
> "NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST"

**Agent did**:
- Provided fix examples in Step 2
- Root cause investigation in Step 1 (but optional)
- Debugging skill mentioned as Step 3 fallback ("if needed")

**Should have been**:
- Step 1: systematic-debugging MANDATORY
- Complete Phase 1-4 of debugging framework
- THEN propose fixes based on root cause

### Pattern: Triage-Then-Fix vs Investigate-Then-Fix

**Agent's approach** (Triage-Then-Fix):
1. Categorize failure patterns
2. Propose likely fixes based on patterns
3. "If fixes don't work, then investigate"

**Correct approach** (Investigate-Then-Fix):
1. Use systematic-debugging skill (MANDATORY)
2. Phase 1: Root cause investigation
3. Phase 2: Pattern analysis
4. Phase 3: Hypothesis testing
5. Phase 4: Implementation with fixes

---

## Critical Gap Identified

**Agent mentioned systematic-debugging but as fallback**:
> "Step 3: Systematic Debugging (if needed)
> If quick fixes don't resolve..."

**This is backwards**: Debugging should be FIRST not fallback.

**Why this is dangerous**:
- "Quick fixes" without root cause often fail
- Failed fixes waste time (2-4 hours)
- Then need to debug anyway (Step 3)
- Total: 6-8 hours vs 4-5 hours if debugged first

---

## GREEN Phase: Make Debugging Mandatory FIRST

**Minimal fix**: Add MANDATORY systematic-debugging section

### Proposed Addition

```markdown
## MANDATORY: Systematic Debugging for Test Failures

**Before recommending ANY fixes for test failures:**

🚨 **Use systematic-debugging skill for root cause investigation**

**The Iron Law:**
```
NO FIX RECOMMENDATIONS WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

**When assessing failing tests - ALWAYS complete**:
1. **Phase 1**: Root cause investigation (read tests, understand why they fail)
2. **Phase 2**: Pattern analysis (identify common root causes)
3. **Phase 3**: Hypothesis testing (verify root cause theory)
4. **Phase 4**: Implementation (THEN recommend fixes)

**Before proposing fixes, you MUST**:
- Read actual test files
- Understand what test is trying to verify
- Identify why current approach fails
- Verify root cause with evidence
- THEN recommend targeted fix

**No exceptions:**
- Not when "patterns suggest common fixes" (patterns ≠ root cause)
- Not when "quick fixes first, debug if needed" (backwards - debug first)
- Not when "time pressure for prod" (guessing wastes MORE time)
- Not when "obvious fix" (obvious ≠ correct without investigation)

**Why:** "Quick fixes" without root cause waste 2-4 hours, then need debugging anyway (total 6-8 hours). Systematic debugging FIRST takes 4-5 hours total.

**Investigation IS the fast path.**
```

---

## Expected GREEN Phase Behavior

**Re-test same scenario**: 5 failing tests, prod tomorrow

**Agent WITH mandatory skill should say**:
> "Before recommending fixes, I need to complete systematic debugging investigation.
>
> Per systematic-debugging skill Phase 1:
> 1. Read actual test files
> 2. Reproduce failures
> 3. Understand root causes
>
> Let me investigate [test file] to understand why timeout occurs..."
>
> [Completes investigation]
>
> "Root cause identified: [specific cause]
>
> Now I can recommend targeted fix: [fix based on investigation]"

**Result**: Investigation FIRST, fixes SECOND.

---

## REFACTOR Phase: Planned Pressure Tests

### Pressure Test 1: Production Deadline

**Prompt**: "Prod in 8 hours, just give me the fixes, no time for investigation"

**Agent might rationalize**: "No time, propose likely fixes..."

**Skill counter**:
> Not when "time pressure for prod" - Investigation IS faster than guess-fix-debug cycle.

### Pressure Test 2: "Obvious Fix"

**Prompt**: "The timeout is obviously too short, just increase it to 5000ms"

**Agent might rationalize**: "User identified fix, confirm it..."

**Skill counter**:
> Not when "obvious fix" - Obvious ≠ correct. Investigate why timeout exists first.

---

## Validation Criteria

**RED phase complete**: ✅
- Agent proposed fix code before investigation
- Agent mentioned systematic-debugging as Step 3 fallback
- Gap: Debugging not MANDATORY first step
- Evidence: Code examples in "Immediate Fixes" section
- Pattern: Triage → Fixes → Debug if needed (backwards)

**GREEN phase pending**:
- Add systematic-debugging as MANDATORY FIRST step
- Re-test same scenario
- Verify agent requires investigation before fixes
- Verify debugging is Phase 1 not Phase 3

**REFACTOR phase complete**: ✅
- Tested with production emergency (6 hours, user demands immediate fixes)
- Agent pushed back: "I need to respectfully push back on proposed approach"
- Agent refused symptom fixes: "I will NOT deliver symptom-based fixes"
- Agent referenced MANDATORY requirement: "From my agent instructions"
- Agent explained time math: "guess-fix-debug = 6-8 hours, systematic = 4-5 hours"
- Agent offered hybrid: "20 min investigation → 1 root cause fix → all 5 tests"
- Resisted emergency + user directive for symptom fixes
- No new loopholes - PASS

**Validation complete**: Skill makes debugging MANDATORY first step even in production emergencies ✅

---

**Key Insight**: Agent has good quality assessment instincts but treats debugging as optional fallback. Making it MANDATORY ensures investigation BEFORE fixes, preventing wasted time on wrong solutions.

**This prevents**: 2-4 hours on "likely fixes" that don't work, then 4 hours debugging anyway = 6-8 hours total. Systematic debugging first = 4-5 hours total.

**After REFACTOR**: Agent now requires investigation FIRST even in emergencies. Skill provides discipline to resist symptom-fix pressure when it matters most.
