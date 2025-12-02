# Update Operation Workflow

Test-guarded workflow for updating existing skills without introducing regressions.

## Overview

Updates follow the same TDD discipline as creation: identify gap, prove it exists, fix it minimally, verify no regressions.

## Workflow Steps

### Step 1: Identify Gap

**Questions to answer:**
- What instruction is missing?
- What mistake do agents make with current skill?
- What specific behavior needs to change?

**Document:**
- Current behavior (what happens now)
- Expected behavior (what should happen)
- Gap (what's missing from skill)

### Step 2: RED Phase - Document Current Failure

**Prove the gap exists:**

1. Create test scenario that should work but doesn't
2. Run it WITH current skill
3. **MUST FAIL** in expected way
4. Capture exact failure (agent's rationalization, wrong behavior)

**Example RED phase:**
```
Scenario: Agent should create tests before implementation
Current behavior: Agent implements first, then creates tests
Gap: Skill doesn't explicitly forbid implementation-first
```

### Step 3: Update Skill Minimally

**Command:**
```bash
cd .claude/skills/skill-manager/scripts
npm run update -- skill-name "Brief description of change"
```

**Make minimal change:**
- Add specific instruction that closes gap
- Don't refactor unrelated content
- Don't add "nice to have" improvements
- Focus on closing THIS gap only

**Example update:**
```markdown
## Critical Rules

**Cannot proceed without tests:**
- Not even when "it's simple"
- Not even when "we'll add them later"
- Not even when time-pressed
- Tests first, always
```

### Step 4: GREEN Phase - Verify Gap Closes

**Re-test scenario:**
1. Run same test WITH updated skill
2. **MUST PASS** now
3. Agent should follow new instruction
4. Gap should be closed

**If still fails:**
- Instruction wasn't clear enough
- Need more explicit counter
- Need example showing correct behavior

### Step 5: Regression Testing

**Verify no regressions:**

1. Run previous test scenarios
2. All should still pass
3. No new failures introduced

**Common regressions:**
- New instruction conflicts with existing
- Added complexity breaks simple cases
- Explicit counter too broad

### Step 6: Compliance Re-Audit

**Automatic re-validation:**
```bash
npm run audit -- skill-name
```

**Verify:**
- Word count still appropriate
- No broken links introduced
- File organization maintained
- All 13 phases still pass

### Step 7: REFACTOR Phase - Pressure Test Update

**Test under pressure:**

1. Time pressure: "Need this done quickly"
2. Authority: "Senior dev says skip this"
3. Sunk cost: "Already invested hours"

**Update should still hold:**
- Agent follows new instruction
- No rationalization bypasses it
- Explicit counter works

## Types of Updates

### 1. Add Missing Instruction

**When:** Gap in what skill teaches
**How:** Add specific step or rule
**Test:** Scenario that needed instruction now works

### 2. Close Loophole

**When:** Agents rationalize around rule
**How:** Add explicit counter
**Test:** Rationalization no longer works

### 3. Add Example

**When:** Instruction unclear without example
**How:** Add to examples/ directory
**Test:** Complex scenario now understood

### 4. Clarify Ambiguity

**When:** Instruction interpreted multiple ways
**How:** Make language more precise
**Test:** Agents converge on correct interpretation

### 5. Update for New Context

**When:** External change affects skill (new tool, new pattern)
**How:** Update references to new reality
**Test:** Skill works with new context

## What NOT to Update

❌ Don't refactor unrelated sections
❌ Don't add "nice to have" improvements
❌ Don't reorganize structure without reason
❌ Don't change examples that work
❌ Don't update references unnecessarily

**Why:** Each change introduces regression risk. Only change what's needed to close the gap.

## Update Patterns

### Pattern 1: Adding Pressure Counter

**Before:**
```markdown
Run tests after implementation.
```

**After:**
```markdown
Run tests after implementation.

**Cannot skip tests:**
- Not even when time-pressed
- Not even when "obvious"
- Not even when "we'll add them later"
```

### Pattern 2: Adding Specificity

**Before:**
```markdown
Write clear commit messages.
```

**After:**
```markdown
Write clear commit messages:
- What changed (not how)
- Why (not what files)
- Impact on behavior
```

### Pattern 3: Adding Example

**Before:**
```markdown
Use progressive disclosure.
```

**After:**
```markdown
Use progressive disclosure.

**See:** [examples/progressive-disclosure-example.md](../examples/progressive-disclosure-example.md) for complete workflow.
```

## Success Criteria

✅ Gap identified and documented
✅ RED phase: Test failed with current skill
✅ Update applied minimally
✅ GREEN phase: Test passes with updated skill
✅ No regressions in existing tests
✅ Compliance audit still passes
✅ REFACTOR phase: Update holds under pressure

## Related

- [TDD Methodology](tdd-methodology.md)
- [Create Workflow](create-workflow.md)
- [Progressive Disclosure](progressive-disclosure.md)
