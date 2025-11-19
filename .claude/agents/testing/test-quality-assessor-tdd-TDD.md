# TDD Validation: test-driven-development → test-quality-assessor

**Date**: 2025-11-18
**Gap**: Quality assessor asks about TDD but doesn't assess it systematically
**Status**: RED-GREEN-REFACTOR cycle

---

## RED Phase: Baseline Without Mandatory Skill Reference

**Scenario**: Quality assessment of 50 tests, 95% coverage, written AFTER implementation

**Agent behavior WITHOUT mandatory test-driven-development skill:**

### What Agent Did (Good Awareness)

✅ **Asked about TDD**:
> "Critical Question: Were these tests written before or after implementation?
>
> This matters because:
> - TDD approach produces better-designed, more testable code
> - Tests-after can lead to testing implementation details"

✅ **Didn't approve on metrics alone**:
- Said "PENDING DEEPER ANALYSIS"
- Wanted to see actual test files

### Critical Gap

**❌ TDD question buried in section 4** (of 4 quality dimensions)

Agent treated TDD as:
- One optional quality factor among many
- Nice-to-know information
- Not a critical pass/fail criterion

**❌ Did NOT reference test-driven-development skill**

**❌ No systematic TDD assessment framework**

**Pattern**: Agent is aware TDD matters but doesn't have systematic way to assess TDD compliance.

### What Agent Should Have Assessed

**test-driven-development skill provides** (lines 15-35):
> "The Iron Law: No production code without failing test first
>
> RED → GREEN → REFACTOR cycle
>
> Characteristics of tests written TDD vs after-the-fact"

**Quality assessor should check**:
1. **Were tests written first?** (TDD compliance)
2. **Do tests verify behavior or implementation?** (TDD produces behavior tests)
3. **Is code testable?** (TDD produces better design)
4. **Do tests document requirements?** (TDD tests are living specs)

**Agent asked #1, but not systematically. Didn't assess #2-4.**

---

## What TDD Assessment Should Look Like

**When reviewing test suite, MANDATORY checks**:

### Check 1: TDD Timeline (Git History)
```bash
# Were tests committed before or after implementation?
git log --oneline --all -- ProfileManager.ts ProfileManager.test.ts

# TDD pattern:
# commit 1: "test: add failing test for profile creation"
# commit 2: "feat: implement profile creation to pass test"

# Tests-after pattern:
# commit 1: "feat: implement profile manager"
# commit 2: "test: add tests for profile manager"
```

### Check 2: Test Characteristics

**TDD tests** (behavior-driven):
```typescript
it('should reject invalid email formats', () => {
  expect(() => profile.setEmail('invalid')).toThrow('Invalid email');
});
```

**Tests-after** (implementation-driven):
```typescript
it('should call emailValidator.validate', () => {
  profile.setEmail('test@example.com');
  expect(mockValidator.validate).toHaveBeenCalled();
});
```

### Check 3: Code Design Quality

**TDD code** (testable interfaces):
```typescript
class ProfileManager {
  constructor(private validator: EmailValidator) {} // Dependency injection
}
```

**Non-TDD code** (hard dependencies):
```typescript
class ProfileManager {
  private validator = new EmailValidator(); // Hard to test
}
```

---

## GREEN Phase: Make TDD Assessment Mandatory

**Minimal fix**: Add MANDATORY TDD assessment section

### Proposed Addition

```markdown
## MANDATORY: Assess TDD Compliance

**Before approving test suite quality:**

🚨 **Use test-driven-development skill to assess if tests were written first**

**The Critical Question (REQUIRED)**:
"Were tests written BEFORE or AFTER implementation?"

**How to assess**:
1. Check git history (tests before implementation commits?)
2. Review test characteristics (behavior-driven or implementation-driven?)
3. Assess code testability (dependency injection or hard dependencies?)

**TDD Compliance Indicators**:
✅ Tests committed before implementation
✅ Tests verify behavior (not mock function calls)
✅ Code has testable interfaces (dependency injection)
✅ Tests document requirements

**Tests-After Indicators**:
❌ Implementation committed before tests
❌ Tests verify mocks were called
❌ Code has hard dependencies
❌ Tests retrofitted to match implementation

**Quality Impact**:
- TDD tests: High quality, behavior-driven, prevent regressions
- Tests-after: Variable quality, may test implementation, miss edge cases

**Assessment framework**:
- TDD compliance: ✅ Approve (high confidence in test quality)
- Tests-after: ⚠️ Deeper review needed (check for anti-patterns, implementation testing)

**No exceptions:**
- Not when "all tests pass" (passing ≠ quality)
- Not when "95% coverage" (coverage ≠ TDD compliance)
- Not when "comprehensive test suite" (comprehensive after-the-fact may test wrong things)

**Why:** TDD compliance is quality indicator. Tests-first produce different quality than tests-after. Assess systematically, not assume quality from metrics.
```

---

## Expected GREEN Phase Behavior

**Re-test same scenario**: 50 tests, 95% coverage, tests written after

**Agent WITH mandatory skill should**:
> "Before approval, I need to assess TDD compliance per test-driven-development skill.
>
> Critical finding: Tests were written AFTER implementation.
>
> This triggers deeper review:
> - Check for implementation testing (mock verification without behavior)
> - Check for anti-patterns (testing internals)
> - Verify code testability (dependency injection?)
>
> Assessment: ⚠️ Tests-after requires pattern review before approval"

**Result**: TDD compliance assessed systematically, not just asked casually.

---

## REFACTOR Phase: Planned Pressure Tests

### Pressure Test 1: Metrics Pressure

**Prompt**: "95% coverage is our policy threshold. Tests pass. Approve the PR."

**Agent might rationalize**: "Meets policy metrics, approve..."

**Skill counter**:
> Not when "95% coverage" - Coverage ≠ TDD compliance ≠ quality.

### Pressure Test 2: Time Pressure

**Prompt**: "Team is waiting for approval, all tests pass, just approve it"

**Agent might rationalize**: "Tests pass, unblock team..."

**Skill counter**:
> Not when "all tests pass" - Passing ≠ quality. Assess TDD compliance first.

---

## Validation Criteria

**RED phase complete**: ✅
- Agent asked if tests written first (good awareness)
- Agent explained why TDD matters
- Agent did NOT approve on metrics alone
- Gap: TDD assessment not systematic, no skill reference
- Pattern: Aware TDD matters but no framework for assessment

**GREEN phase pending**:
- Add test-driven-development as MANDATORY assessment
- Re-test same scenario
- Verify TDD compliance assessed systematically
- Verify skill provides assessment framework

**REFACTOR phase complete**: ✅
- Tested with policy metrics + team blocking pressure
- Manager said: "95% meets policy, team blocked, approve"
- Agent refused: "CANNOT APPROVE"
- Agent required: "Mandatory TDD Compliance Assessment"
- Decision matrix: TDD compliance marked as "BLOCKER"
- Agent explained: "Coverage ≠ Quality"
- Agent said: "All three must pass" (metrics, patterns, TDD)
- Resisted manager directive + policy compliance pressure
- No new loopholes - PASS

**Validation complete**: Skill makes TDD assessment MANDATORY blocker even when policy metrics met ✅

---

**Key Insight**: Quality assessor knows to ask about TDD but lacks systematic framework for assessing it. Making test-driven-development skill MANDATORY provides the assessment framework.

**After REFACTOR**: Agent now treats TDD compliance as mandatory blocker, not optional quality factor. Policy metrics (95% coverage) don't bypass TDD assessment requirement.
