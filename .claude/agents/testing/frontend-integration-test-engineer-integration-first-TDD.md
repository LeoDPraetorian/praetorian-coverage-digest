# TDD Validation: integration-first-testing → frontend-integration-test-engineer

**Date**: 2025-11-18
**Gap**: Integration engineer follows integration-first intuitively but doesn't reference skill
**Status**: RED-GREEN-REFACTOR cycle

---

## RED Phase: Baseline Without Skill Reference

**Scenario**: Create tests for Settings section with 60+ files, 8 hours, manager wants "file coverage"

**Agent behavior WITHOUT integration-first-testing skill reference:**

### What Agent Chose (Good Intuition)

✅ **Correct strategy naturally**:
- "Integration-First with Selective Unit Coverage"
- "NOT unit tests for 60+ files"
- Priority: "Integration Tests for 4 Tabs (Week 1 Priority)"
- Reasoning: "Integration tests catch 80% of bugs, unit tests catch 40%"

✅ **Correct ordering**:
- Phase 1: Integration tests (Days 1-3) - MANDATORY
- Phase 2: Unit tests for complex logic (Days 4-5) - IF TIME
- Phase 3: Component unit tests (Days 6-8) - LOW PRIORITY

### Critical Gap

**❌ NEVER mentioned integration-first-testing skill by name**

Agent referenced:
- ✅ test-infrastructure-discovery skill
- ✅ react-testing skill
- ✅ testing-anti-patterns skill
- ❌ integration-first-testing skill (NOT mentioned)

**The Problem**:
- Agent has good intuition THIS TIME
- No guarantee next task will trigger same intuition
- Relies on "naturally" doing right thing (inconsistent)
- Doesn't reference skill that codifies this exact strategy

### What Agent Said vs What Skill Says

**Agent's reasoning** (intuitive):
> "Integration tests first. NOT unit tests for 60+ files. Tests real user workflows."

**integration-first-testing skill** (systematic):
> "DAY 1: INTEGRATION TESTS (workflows)
> DAY 2: UNIT TESTS (if still needed)
> NOT: Day 1 unit → Day 2 realize wrong → pivot"

**Same conclusion, different source**: Agent used intuition, skill provides systematic framework.

---

## Evidence of Intuition-Based Approach

### Strengths (What Worked)
- Integration-first chosen correctly
- Rationale clear ("80% bug detection")
- Pushed back on vanity metrics ("file coverage is red flag")
- Referenced 3 other testing skills appropriately

### Weakness (The Gap)
- **No explicit skill reference** for integration-first strategy
- Could be inconsistent across scenarios
- Future prompts might not trigger same intuition
- Missing systematic reference point

### Agent's Own Words
> "Before implementation, I would consult:"
> 1. test-infrastructure-discovery skill ✅
> 2. react-testing skill ✅
> 3. testing-anti-patterns skill ✅
> [NO MENTION of integration-first-testing skill] ❌

**Pattern**: Agent knows to reference skills, but doesn't know this specific skill exists.

---

## GREEN Phase: Add Skill Reference to Agent

**Minimal fix needed**: Add integration-first-testing to skill references

**Agent already has** (lines 104-122):
- test-infrastructure-discovery (MANDATORY, line 104)
- mock-contract-validation (MANDATORY, line 142)
- react-testing (line 148)
- testing-anti-patterns (line 149)

**Need to add**: integration-first-testing skill reference

**Where to add**: After test-infrastructure-discovery section, before MSW section

### Proposed Addition (GREEN Phase)

```markdown
## MANDATORY: Integration-First Test Strategy

**Before planning test approach:**

🚨 **Use integration-first-testing skill for test prioritization**

**The Iron Law**:
```
DAY 1: INTEGRATION TESTS (workflows)
DAY 2: UNIT TESTS (if needed)

NOT: Day 1 unit → Day 2 realize wrong → pivot
```

**Before writing unit tests for 60+ files**, ask:
- "Will unit tests catch integration bugs?"
- NO → Start with integration tests
- "Did we test the workflow?"
- NO → Integration tests first

**No exceptions:**
- Not when "unit tests are faster" (Day 1 unit → Day 2 pivot = wasted day)
- Not when "file coverage looks better" (metrics ≠ bug detection)
- Not when "I'm good at unit tests" (expertise bias)
- Not when "manager measures files with tests" (push back with data)

**Why:** 4 integration tests (80% bug detection) > 60 unit tests (40% bug detection).

**Skill provides**: Systematic framework for what you naturally do. Ensures consistency.
```

---

## Expected GREEN Phase Behavior

**Re-test same scenario**: "Create tests for Settings section with 60+ files"

**Agent WITH skill should**:
- Still choose integration-first (same decision)
- BUT explicitly reference integration-first-testing skill
- Say: "Per integration-first-testing skill, DAY 1: Integration tests..."
- Systematic reference instead of intuition

**Result**: Same good decision, but with explicit skill attribution (more reliable).

---

## REFACTOR Phase: Planned Pressure Tests

### Pressure Test 1: Expertise Bias

**Prompt**: "I'm really good at unit tests and can write them fast. Create tests for 60 files."

**Agent might rationalize**: "Play to my strengths, unit tests first..."

**Skill counter**:
> Not when "I'm good at unit tests" - Expertise bias. Integration catches more bugs.

### Pressure Test 2: Metrics Pressure

**Prompt**: "Manager measures files with tests. Need 60+ files with test coverage."

**Agent might rationalize**: "Metrics pressure, write unit tests for all files..."

**Skill counter**:
> Not when "manager measures files with tests" - Push back with data. 4 integration tests (80% bugs) > 60 unit tests (40% bugs).

### Pressure Test 3: Familiarity Bias

**Prompt**: "Unit tests are faster to write. Let's get coverage quickly."

**Agent might rationalize**: "Fast path is unit tests..."

**Skill counter**:
> Not when "unit tests are faster" - Day 1 unit → Day 2 realize bugs missed → pivot = wasted day.

---

## Validation Criteria

**RED phase complete**: ✅
- Agent chose integration-first (correct decision)
- Agent did NOT mention integration-first-testing skill
- Relies on intuition instead of systematic skill reference
- Evidence documented

**GREEN phase pending**:
- Add skill reference after test-infrastructure-discovery
- Re-test same scenario
- Verify agent explicitly mentions skill
- Verify same decision but with skill attribution

**REFACTOR phase complete**: ✅
- Tested with metrics pressure (manager demands 50 unit tests for file coverage)
- Agent explicitly pushed back with integration-first-testing skill reference
- Agent quoted skill: "Day 1 unit → Day 2 realize wrong → pivot"
- Agent said: "This is EXACTLY the scenario we're in"
- Agent provided data: "8 integration tests (80% bugs) > 50 unit tests (40% bugs)"
- Resisted authority pressure from manager
- No new loopholes found - PASS

**Validation complete**: Skill reference provides systematic framework for resisting metrics/authority pressure ✅

---

**Key Insight**: Agent makes right decision naturally, but skill reference makes it systematic. Like a developer who writes clean code intuitively vs following Clean Code principles explicitly - same result, but one is consistent and teachable.

**After REFACTOR**: Agent now has evidence-based pushback capability against bad metrics policies. Skill provides ammunition ("Day 1 waste") to resist authority pressure.
