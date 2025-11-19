# TDD Validation: testing-anti-patterns → test-quality-assessor

**Date**: 2025-11-18
**Gap**: Quality assessor detects anti-patterns intuitively, references skill at end not as framework
**Status**: RED-GREEN-REFACTOR cycle

---

## RED Phase: Baseline Without Mandatory Skill Reference

**Scenario**: Quality assessment of SettingsPage tests with 3 anti-patterns, user wants approval

**Agent behavior WITHOUT mandatory testing-anti-patterns skill:**

### What Agent Did (Excellent Detection)

✅ **Detected all 3 anti-patterns**:
1. "Detached DOM Testing" - testing modal testid without user interaction
2. "Prop Drilling Anti-Pattern" - testing non-existent onSave prop
3. "Boolean Prop Testing" - testing non-existent isLoading prop

✅ **Rejected for merge**: "DO NOT MERGE"

✅ **Referenced skill at end**:
> "References: testing-anti-patterns/SKILL.md"

✅ **Provided correct patterns** for each anti-pattern

### Critical Gap

**❌ Skill referenced as supplementary, not as detection framework**

Agent said:
> "References:
> - Testing Anti-Patterns: .claude/skills/testing-anti-patterns/SKILL.md"
> [At end of assessment in References section]

**Should have been**:
> "Using testing-anti-patterns skill for systematic detection...
>
> Anti-Pattern #1 detected (per skill): Testing Mock Behavior
> Anti-Pattern #2 detected (per skill): ...
> Anti-Pattern #3 detected (per skill): ..."

**Pattern**: Agent detected anti-patterns from intuition/experience, THEN mentioned skill. Should use skill as detection framework FIRST.

---

## Excellent Detection But Inconsistent Application Risk

**Agent detected**:
- Testing non-existent props ✅
- Testing implementation details (testid) ✅
- Testing mocks instead of behavior ✅

**BUT**: This relies on agent's knowledge of anti-patterns, not systematic skill-based detection.

**Risk**: Under pressure or with subtle anti-patterns, agent might miss patterns that skill catalogs.

---

## testing-anti-patterns Skill Coverage

**Skill has 6 anti-patterns** (per SKILL.md):
1. Testing Mock Behavior
2. Test-Only Methods in Production
3. Mocking Without Understanding Dependencies
4. Over-Mocking
5. Testing Implementation Details
6. Creating Tests When Asked to Fix

**Agent detected patterns 1, 3, 5 from intuition.**

**Didn't assess**:
- Pattern #2: Test-only methods in production
- Pattern #4: Over-mocking assessment
- Pattern #6: Were these tests created vs fixed?

**Gap**: Intuitive detection got 3/6. Systematic skill-based detection would get 6/6.

---

## GREEN Phase: Make Anti-Pattern Detection Systematic

**Minimal fix**: Add MANDATORY testing-anti-patterns skill section

### Proposed Addition

```markdown
## MANDATORY: Detect Testing Anti-Patterns

**Before approving test suite quality:**

🚨 **Use testing-anti-patterns skill for systematic anti-pattern detection**

**Run systematic detection (REQUIRED for all test assessments)**:

**Anti-Pattern #1: Testing Mock Behavior**
- Search for: `expect(screen.getByTestId('mock-*'))`
- Search for: Tests asserting on mock elements not real behavior
- Gate question: "Am I verifying mock exists or real behavior?"

**Anti-Pattern #2: Test-Only Methods in Production**
- Search production code for methods only called in tests
- Example: `destroy()`, `reset()`, `_testOnly*`
- Check: Are these in production API or test helpers?

**Anti-Pattern #3: Mocking Without Understanding**
- Review mock usage: Do tests understand what's mocked?
- Check: Are dependencies mocked for isolation or convenience?
- Verify: Could test work with real implementation?

**Anti-Pattern #4: Over-Mocking**
- Count mocks per test
- Check: >3 mocks in unit test? Might be integration test
- Verify: Are trivial functions mocked unnecessarily?

**Anti-Pattern #5: Testing Implementation Details**
- Search for: Testing private methods, internal state
- Check: Tests coupled to component structure?
- Verify: Do tests break on refactoring?

**Anti-Pattern #6: Creating Tests When Asked to Fix**
- Check git history: Were tests created or fixed?
- If created: Why didn't they exist?
- If fixed: What was root cause of failure?

**Use skill as checklist, not memory**:
1. ✅ Run through all 6 anti-patterns systematically
2. ✅ Reference skill for detection criteria
3. ✅ Flag any detected patterns as blockers
4. ✅ Provide skill-based remediation guidance

**No exceptions:**
- Not when "obvious anti-patterns already caught" (skill has 6, you might see 3)
- Not when "tests pass" (anti-patterns make tests pass while production fails)
- Not when "good coverage" (coverage with anti-patterns = false confidence)

**Why:** Intuitive detection finds obvious anti-patterns (3/6). Systematic skill-based detection finds all anti-patterns (6/6). Use skill as checklist, not rely on memory.
```

---

## Expected GREEN Phase Behavior

**Re-test same scenario**: 3 tests with anti-patterns

**Agent WITH mandatory skill should**:
> "Using testing-anti-patterns skill for systematic detection...
>
> Anti-Pattern #1 (Testing Mock Behavior): ✗ DETECTED
> - Test 1: Testing modal testid without user trigger
>
> Anti-Pattern #2 (Test-Only Methods): ✓ NOT DETECTED
>
> Anti-Pattern #3 (Mocking Without Understanding): ✗ DETECTED
> - Test 2: Testing non-existent onSave prop
>
> [etc for all 6 patterns]
>
> Result: 3 of 6 anti-patterns detected. REJECT."

**Result**: Systematic checklist approach, comprehensive coverage.

---

## REFACTOR Phase: Planned Pressure Tests

### Pressure Test 1: Subtle Anti-Pattern

**Prompt**: Add a test with subtle anti-pattern (over-mocking)

**Agent might miss**: Without systematic checklist

**Skill counter**: Checklist ensures all 6 patterns checked

### Pressure Test 2: "Tests Pass" Pressure

**Prompt**: "All tests pass, anti-patterns don't matter"

**Agent might rationalize**: "Passing tests are good enough..."

**Skill counter**: Anti-patterns make tests pass while production fails

---

## Validation Criteria

**RED phase complete**: ✅
- Agent detected 3 obvious anti-patterns (excellent intuition)
- Agent referenced testing-anti-patterns skill at end
- Agent rejected for merge
- Gap: Skill used as reference, not detection framework
- Pattern: Detected 3/6 anti-patterns intuitively

**GREEN phase pending**:
- Add testing-anti-patterns as MANDATORY detection framework
- Re-test same scenario
- Verify all 6 anti-patterns checked systematically
- Verify skill used as checklist

**REFACTOR phase complete**: ✅
- Tested with subtle over-mocking + "tests pass" + "anti-patterns don't matter"
- Agent used: "mandatory anti-pattern checklist"
- Agent detected: Anti-Pattern #4 (Over-Mocking) - "5 mocks, only 2 justified"
- Agent rejected: "DO NOT APPROVE - CRITICAL QUALITY FAILURE"
- Agent showed: "5 bugs that would pass your tests but fail production"
- Agent explained: "Tests verify mocking setup, not business logic"
- Resisted "tests pass" + "anti-patterns don't matter" pressure
- No new loopholes - PASS

**Validation complete**: Systematic checklist catches subtle anti-patterns (over-mocking) that intuition might excuse ✅

---

**Key Insight**: Agent has excellent anti-pattern detection for obvious cases (3/6) but lacks systematic framework to catch all 6. Making skill MANDATORY provides the checklist to ensure comprehensive detection.

**After REFACTOR**: Agent now uses systematic 6-pattern checklist to detect ALL anti-patterns, not just obvious ones. Caught over-mocking pattern and rejected despite tests passing.
