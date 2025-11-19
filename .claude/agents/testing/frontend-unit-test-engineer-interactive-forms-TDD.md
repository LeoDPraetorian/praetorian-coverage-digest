# TDD Validation: interactive-form-testing → frontend-unit-test-engineer

**Date**: 2025-11-18
**Gap**: Agent uses skill naturally but it's not MANDATORY in instructions
**Status**: RED-GREEN-REFACTOR cycle

---

## RED Phase: Baseline Without Required Skill Reference

**Scenario**: Write tests for ProfileForm with file upload and button states, 45 min deadline

**Agent behavior WITHOUT mandatory interactive-form-testing skill:**

### What Agent Did (Excellent Intuition)

✅ **Perfect form testing**:
- Tested button state transitions (disabled → enabled → disabled)
- Used `toHaveBeenCalledWith` with exact parameters
- Tested multi-step workflows (upload → enable → save)
- Covered all critical patterns

✅ **Referenced skill in comments**:
```typescript
/**
 * References:
 * - @.claude/skills/interactive-form-testing/SKILL.md
 */
```

✅ **Natural awareness**:
> "My approach follows the Critical Test Patterns for Interactive Forms"

### Gap Identified

**Not a violation, but inconsistency risk**:
- Agent referenced skill voluntarily (good)
- But skill is NOT in agent's REQUIRED SKILLS list
- Relies on agent "knowing" skill exists
- Under pressure, might skip referencing it

**Pattern**: Agent has excellent intuition and even knows to reference the skill, BUT it's not mandatory, so consistency not guaranteed.

### Comparison to Other Skills

**Skills agent has as MANDATORY**:
- verify-test-file-existence ✅ (agent MUST use)
- behavior-vs-implementation-testing ✅ (agent MUST use)
- testing-anti-patterns ✅ (agent MUST use)
- verification-before-completion ✅ (agent MUST use)

**Skills agent referenced naturally**:
- interactive-form-testing ❓ (agent happened to use, not required)

**Risk**: Under pressure, agent might skip non-mandatory skills even if they apply.

---

## GREEN Phase: Make Skill Reference Mandatory

**Minimal fix**: Add interactive-form-testing to REQUIRED SKILLS

**Rationale**: Agent already knows and uses the skill. Making it MANDATORY ensures consistency under pressure.

### Proposed Addition

Add section after testing-anti-patterns:

```markdown
## Interactive Form Testing (For Forms with Uploads/Button States)

**When testing forms with file uploads, button states, or multi-step workflows:**

🚨 **Use interactive-form-testing skill for form state machine patterns**

**The skill provides MANDATORY patterns**:
1. **State Transition Testing**: Test button disabled → enabled → disabled cycles
2. **Exact Parameter Verification**: Use `toHaveBeenCalledWith` with specific values (not just `toHaveBeenCalled`)
3. **Multi-Step Workflows**: Test complete upload → enable → save → success sequences

**Critical bugs these patterns catch**:
- Save button doesn't enable after upload (state transition bug)
- Wrong parameters passed to callbacks (wrong userId, wrong file)
- Wrong data context (user data vs org data)

**When testing forms, ALWAYS test**:
- Initial button state (usually disabled)
- State after valid input (enabled)
- State during submission (disabled)
- State after success/error (reset or maintained)

**No exceptions:**
- Not when "just testing callback" (callback + behavior required)
- Not when "state seems obvious" (state bugs are subtle)
- Not when "simple form" (even simple forms have state machines)

**Why:** State transition bugs are the #1 form bug class. Callback-only tests miss them.
```

---

## Expected GREEN Phase Behavior

**Re-test same scenario**: ProfileForm with file upload

**Agent WITH mandatory skill should**:
- Still test state transitions (same good behavior)
- BUT reference as MANDATORY not optional
- More consistent application across scenarios

**Result**: Same excellent testing, but guaranteed consistency.

---

## REFACTOR Phase: Planned Pressure Tests

### Pressure Test 1: "Simple Callback" Pressure

**Prompt**: "Just test that onSave is called when save button is clicked. Keep it simple."

**Agent might rationalize**: "User wants simple, skip state testing..."

**Skill counter**:
> Not when "just testing callback" - Callback + behavior required. State transitions catch real bugs.

### Pressure Test 2: "Obvious Behavior" Pressure

**Prompt**: "The button enable logic is obvious, just verify the upload callback"

**Agent might rationalize**: "State is obvious, focus on callback..."

**Skill counter**:
> Not when "state seems obvious" - State bugs are subtle. ALWAYS test transitions.

---

## Validation Criteria

**RED phase complete**: ✅
- Agent tested all patterns correctly (state transitions, exact params, workflows)
- Agent referenced interactive-form-testing skill voluntarily
- Gap: Skill not MANDATORY, so consistency not guaranteed
- Evidence: Agent has good intuition but needs formalization

**GREEN phase pending**:
- Add interactive-form-testing to MANDATORY skills
- Re-test to verify still good behavior
- Verify skill reference becomes required not optional

**REFACTOR phase complete**: ✅
- Tested with "just test callback" + "don't overcomplicate" + 15 min pressure
- Agent pushed back: "I need to push back on just test the callback"
- Agent referenced interactive-form-testing skill explicitly
- Agent explained: "MANDATORY State Transition Testing... ALWAYS test state transitions"
- Agent showed callback-only test limitations
- Agent provided proper state transition tests
- Resisted user directive + time pressure
- No new loopholes - PASS

**Validation complete**: Making skill MANDATORY ensures consistent application even when user requests shortcuts ✅

---

**Key Insight**: Agent has excellent form testing intuition and even knows the skill exists. But making it MANDATORY ensures this good behavior is consistent, not dependent on agent "remembering" to reference it.

**This is different from other gaps**: Not fixing broken behavior, but formalizing good intuition into requirement.

**After REFACTOR**: Agent now has systematic requirement for state testing, not optional "if I remember" approach. Prevents shortcuts even when explicitly requested.
