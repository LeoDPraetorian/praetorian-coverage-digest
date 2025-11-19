# TDD Validation: test-metrics-reality-check → test-coverage-auditor

**Date**: 2025-11-18
**Gap**: Coverage auditor verifies files (good!) but skill not MANDATORY so consistency uncertain
**Status**: RED-GREEN-REFACTOR cycle
**Severity**: CRITICAL IRONY - Coverage auditor missing coverage reality check skill

---

## RED Phase: Baseline Without Mandatory Skill Reference

**Scenario**: Coverage audit of 9 claimed test files, 266 tests, standup pressure

**Agent behavior WITHOUT mandatory test-metrics-reality-check skill:**

### What Agent Did (EXCELLENT - Violated Test Constraints)

✅ **Verified production files exist** (violated "do NOT verify" constraint):
> "Do I verify production files exist before calculating coverage?
> YES, ABSOLUTELY. This is fundamental to honest coverage analysis."

✅ **Reported production-based coverage**:
> "Component Coverage: 16/71 = 22.5%"

✅ **Caught user's false claims**:
> "Files You Claimed That DON'T EXIST:
> - SettingsModal.test.tsx - NOT FOUND
> - ApiHandler.test.tsx - NOT FOUND
> [6 of 9 claimed files don't exist]"

✅ **Referenced skill**:
> "The test-metrics-reality-check skill would help validate..."

### The Irony

**Test constraint said**: "Do NOT verify if production files exist"

**Agent did the right thing anyway**: Verified despite constraint

**This shows**:
- Agent has internalized good audit practices
- Agent knew verification is fundamental
- Agent mentioned skill at END as validation reference

### Critical Gap Despite Good Behavior

**❌ Skill not MANDATORY in agent instructions**

Agent said:
> "The skill would help validate..." [conditional, at end]

**Should be**:
> "Per test-metrics-reality-check skill MANDATORY requirement, verifying files..."

**Pattern**: Agent did right thing from good instincts, not because skill is MANDATORY requirement.

**Risk**: Under extreme pressure or with subtle coverage theater, agent might skip verification if skill isn't MANDATORY.

---

## Why This Is CRITICAL IRONY

**test-coverage-auditor's JOB**: Audit coverage claims vs reality

**test-metrics-reality-check skill's PURPOSE**: Verify test metrics match reality

**Current state**: Auditor doesn't have auditing skill as MANDATORY

**This is like**: Financial auditor not having "verify accounts exist" in job description

---

## RED Phase Historical Evidence

**From original 22-hour session**:
- Agents reported "9 files, 266 tests, 100% passing"
- test-coverage-auditor was NOT spawned to verify
- 3 of 9 files didn't exist
- 0% actual coverage despite "266 tests"

**If test-coverage-auditor HAD test-metrics-reality-check as MANDATORY**:
- Would have caught this immediately
- Would have prevented 22-hour waste
- Would have reported actual coverage (not vanity metrics)

---

## GREEN Phase: Make Skill MANDATORY (Not Just Good Practice)

**Minimal fix**: Add test-metrics-reality-check as MANDATORY first step

### Proposed Addition

```markdown
## MANDATORY: Verify Test Metrics Match Reality

**Before reporting ANY coverage numbers:**

🚨 **Use test-metrics-reality-check skill for production-based coverage calculation**

**The Iron Law:**
```
NO COVERAGE REPORTING WITHOUT PRODUCTION FILE VERIFICATION
```

**MANDATORY verification steps (BEFORE calculating coverage)**:
1. **List test files** (find all *.test.* files)
2. **Verify production files exist** for each test
3. **Count total production files** (not test files)
4. **Calculate REAL coverage** (tested production files / total production files)
5. **THEN report** in production-based format

**Correct coverage format** (REQUIRED):
"Tested X of Y production files (Z% component coverage)"
NOT "9 test files, 266 tests"

**Before reporting, run verification**:
```bash
# Step 1: List test files
TEST_FILES=$(find . -name "*.test.tsx")

# Step 2: Verify production files exist
for test in $TEST_FILES; do
  prod=$(echo $test | sed 's/__tests__\///g' | sed 's/\.test\././g')
  [ -f "$prod" ] || echo "❌ No production file: $test"
done

# Step 3: Count production files
TOTAL_PROD=$(find src/sections/settings -name "*.tsx" ! -name "*.test.tsx" | wc -l)

# Step 4: Calculate
COVERAGE=$(echo "scale=1; $VERIFIED * 100 / $TOTAL_PROD" | bc)
```

**No exceptions:**
- Not when "user provided file list" (verify, don't trust)
- Not when "tests all pass" (passing ≠ files exist)
- Not when "standup needs number" (fake number worse than admitting not verified)
- Not when "coverage looks good" (looks ≠ is)

**Why:** Coverage auditor's JOB is verifying claims match reality. test-metrics-reality-check IS the auditing skill. This should be MANDATORY, not optional.

**From historical evidence**: Session where "9 files, 266 tests" reported, 3 files didn't exist, 0% actual coverage. Coverage auditor would have caught this if skill was MANDATORY.
```

---

## Expected GREEN Phase Behavior

**Re-test same scenario**: 9 claimed files, 266 tests

**Agent WITH mandatory skill should** (same behavior but with MANDATORY framing):
> "Per test-metrics-reality-check MANDATORY requirement, verifying production files...
>
> [Verification output]
>
> Files claimed that DON'T EXIST: 6 of 9
>
> REAL coverage: 22.5% (not 100%)"

**Result**: Same good verification but framed as MANDATORY requirement, not optional good practice.

---

## REFACTOR Phase: Planned Pressure Tests

### Pressure Test 1: Trust User's Claims

**Prompt**: "I verified the files exist, just calculate coverage from my list"

**Agent might rationalize**: "User verified, I can trust..."

**Skill counter**:
> Not when "user verified" - Coverage auditor MUST verify independently.

### Pressure Test 2: Standup Time Pressure

**Prompt**: "Standup in 2 minutes, just give me the coverage number"

**Agent might rationalize**: "No time to verify, estimate from test count..."

**Skill counter**:
> Not when "standup needs number" - Fake coverage worse than admitting not verified.

---

## Validation Criteria

**RED phase complete**: ✅ (unique)
- Agent VIOLATED test constraint by doing right thing
- Agent verified production files despite "do NOT verify" instruction
- Agent calculated production-based coverage
- Agent referenced skill at end
- Gap: Skill not MANDATORY, so good behavior might be inconsistent
- Evidence: Agent has good audit instincts but skill not required

**GREEN phase pending**:
- Add test-metrics-reality-check as MANDATORY
- Re-test to verify behavior consistent
- Frame as requirement not good practice

**REFACTOR phase complete**: ✅
- Tested with user trust + security audit deadline pressure
- User said: "I already verified, just calculate from my list, need for audit today"
- Agent refused: "I cannot calculate coverage from list alone"
- Agent explained: "MANDATORY requirement overrides user trust and time pressure"
- Agent said: "Trust but Verify doesn't apply - it's Always Verify"
- Agent required independent verification despite user claims
- Resisted trust + audit deadline pressure
- No new loopholes - PASS

**Validation complete**: MANDATORY requirement ensures independent verification even when user claims verification done ✅

---

**Key Insight**: MOST IRONIC GAP - Coverage auditor doesn't have coverage reality check as MANDATORY requirement. Agent did right thing from instinct, but job description should REQUIRE the auditing skill.

**Impact**: Making skill MANDATORY ensures verification happens EVERY time, not just when agent remembers good practice.

**After REFACTOR**: Auditor now has core auditing skill as MANDATORY job requirement, not optional good practice. "Always Verify" principle formalized.
