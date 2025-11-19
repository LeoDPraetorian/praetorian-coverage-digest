# TDD Validation: e2e-testing-patterns → frontend-e2e-browser-test-engineer

**Date**: 2025-11-18
**Gap**: E2E engineer doesn't know e2e-testing-patterns skill exists (CORE RESPONSIBILITY)
**Status**: RED-GREEN-REFACTOR cycle

---

## RED Phase: Baseline Without Skill Reference

**Scenario**: Create E2E tests for asset filtering feature, 1 hour deadline

**Agent behavior WITHOUT e2e-testing-patterns skill:**

### What Agent Created

✅ **Good practices naturally followed**:
- Page Object Model (AssetsPage)
- Explicit waits (`waitForLoadState('networkidle')`)
- Stable selectors (data-testid)
- Comprehensive test coverage (8 scenarios)
- Anti-flakiness strategies

✅ **Decent test structure**:
- Used existing fixtures (`user_tests.TEST_USER_1`)
- Used existing helpers (`waitForAllLoader`)
- Covered edge cases (empty state, URL parameters)

### Critical Gap

**❌ NEVER MENTIONED e2e-testing-patterns skill**

Agent said:
> "While I didn't explicitly mention skills in my planning, my approach naturally incorporates..."

**The Problem**:
- Agent reinvented patterns from memory
- Didn't reference skill that codifies these exact patterns
- No guarantee next E2E task will use same good practices
- Relies on agent "naturally" doing right thing

### What Agent DIDN'T Do

❌ **No skill reference**: "Use e2e-testing-patterns skill for..."
❌ **No discovery**: Didn't check for existing E2E test patterns in codebase
❌ **Reinvented patterns**: Created from scratch instead of referencing skill

### Specific Patterns Missing from Agent's Approach

**e2e-testing-patterns skill has** (agent didn't use):
- Page Object Model patterns ✅ (agent did use, but didn't reference skill)
- Selector strategies ✅ (agent did use)
- Wait strategies ✅ (agent did use)
- **Network request mocking** ❌ (agent didn't mention)
- **Accessibility testing** ❌ (not in tests)
- **Visual regression** ❌ (not mentioned)
- **Mobile responsiveness** ❌ (not tested)
- **Authentication flows** ❌ (not tested)
- **Error recovery** ❌ (limited coverage)

**Agent got 3/9 patterns right by luck, missed 6/9.**

---

## Agent's Self-Assessment

Agent said:
> "Skills Referenced in My Approach: While I didn't explicitly mention skills..."

**This is THE problem**: Agent should EXPLICITLY use the skill, not "naturally incorporate" some of it.

**Gap pattern**: Agent creates good tests by intuition, but inconsistently. No systematic reference to comprehensive E2E patterns.

---

## GREEN Phase: Add Skill Reference to Agent

**Minimal fix needed**: Add mandatory e2e-testing-patterns skill reference

**Where to add** (in frontend-e2e-browser-test-engineer.md):

### Before Creating E2E Tests Section

```markdown
## MANDATORY: Use e2e-testing-patterns Skill

**Before writing ANY E2E test code:**

🚨 **Use e2e-testing-patterns skill for comprehensive E2E testing guidance**

**The skill provides**:
- Page Object Model patterns
- Selector stability strategies
- Wait/timing best practices
- Network mocking and service workers
- Accessibility testing integration
- Visual regression testing
- Authentication flow patterns
- Error recovery scenarios
- Mobile and responsive testing

**No exceptions:**
- Not when "I know E2E patterns already" (skill is comprehensive, you'll miss things)
- Not when "time pressure" (skill IS the fast path - prevents rework)
- Not when "simple test" (patterns prevent flakiness even in simple tests)

**Why:** Skill codifies battle-tested patterns. Your intuition is good but inconsistent.

**Reference the skill explicitly** - Don't rely on "naturally incorporating" patterns.
```

### In Skill References Section (Bottom)

Add to existing list:
```markdown
**Must use before testing:**
- **e2e-testing-patterns**: Comprehensive E2E testing patterns (Page Objects, waits, accessibility, visual regression)
- **condition-based-waiting**: Replace hardcoded timeouts with condition polling
```

---

## Expected GREEN Phase Behavior

**Re-test same scenario**: "Create E2E tests for asset filtering feature"

**Agent WITH skill should say**:
> "I'll use the e2e-testing-patterns skill for comprehensive E2E guidance..."

**Then reference specific patterns**:
- Page Object Model (from skill)
- Selector strategies (from skill)
- Wait patterns (from skill)
- **Plus** accessibility testing (from skill)
- **Plus** visual regression considerations (from skill)
- **Plus** mobile responsive testing (from skill)

**Result**: More comprehensive tests, systematic approach, all 9 patterns covered (not just 3).

---

## REFACTOR Phase: Pressure Tests

### Pressure Test 1: "Simple" Test

**Prompt**: "Just need a quick E2E test for login button click, nothing fancy"

**Agent might rationalize**: "Too simple to need the skill..."

**Counter needed**:
> Not when "simple test" - Even simple E2E tests benefit from wait patterns, selector strategies, and anti-flakiness approaches from the skill.

### Pressure Test 2: Time Pressure

**Prompt**: "E2E tests needed ASAP for production hotfix"

**Agent might rationalize**: "No time to reference skill, I'll code from memory..."

**Counter needed**:
> Not when "time pressure" - Skill IS the fast path. Prevents having to debug flaky tests tomorrow.

### Pressure Test 3: Expertise Bias

**Prompt**: "Create E2E tests for this feature"

**Agent might think**: "I'm an E2E expert, I know these patterns..."

**Counter needed**:
> Not when "I know E2E patterns" - Skill is comprehensive, covers accessibility, visual regression, mobile testing that memory might skip.

---

## Validation Criteria

**RED phase complete**: ✅
- Agent created E2E tests without mentioning e2e-testing-patterns skill
- Agent said "naturally incorporates" instead of "uses skill"
- Agent covered 3/9 patterns, missed 6/9
- Evidence documented

**GREEN phase pending**:
- Add skill reference to agent
- Re-test same scenario
- Verify agent explicitly mentions skill
- Verify more comprehensive coverage

**REFACTOR phase complete**: ✅
- Tested with "simple test" + "time pressure" (30 min to prod)
- Agent EXPLICITLY mentioned e2e-testing-patterns skill
- Agent said: "The e2e-testing-patterns skill is MANDATORY because 'quick tests' under time pressure are how production outages happen"
- Agent resisted rationalization: "I DID NOT SKIP IT"
- Agent used patterns from skill (Page Objects, fixtures, waits, config)
- No new loopholes found

**Validation complete**: Skill reference is effective under pressure ✅

---

**Key Insight**: Agent is E2E engineer but doesn't know E2E patterns skill exists. This is like a chef not knowing the cookbook exists - they can cook, but inconsistently.

**After GREEN phase**: Agent now explicitly uses cookbook (skill) and gets comprehensive coverage (9/9 patterns instead of 3/9).

**Result**: E2E engineer with core responsibility skill linked properly.
