---
name: writing-plans
description: Use when design is complete and detailed implementation tasks are needed for engineers with zero codebase context - creates comprehensive implementation plans with exact file paths, complete code examples, and verification steps assuming engineer has minimal domain knowledge
allowed-tools: "Read, Write, Edit, Bash, Grep"
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

> **MANDATORY:** You MUST use TodoWrite before starting to track all planning steps.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** This should be run in a dedicated worktree (created by brainstorming skill).

## Prerequisites (MANDATORY - Cannot Skip)

**Before writing ANY implementation plan, you MUST complete evidence-based analysis:**

### Step 1: Invoke enforcing-evidence-based-analysis

```
skill: "enforcing-evidence-based-analysis"
```

**This skill enforces the Discovery phase where you:**

1. READ all source files you'll modify or reference
2. QUOTE actual API signatures with line numbers
3. DOCUMENT verified findings in required format
4. MARK assumptions explicitly

### Step 2: Verify Required Artifacts Exist

**Cannot proceed without these verified artifacts:**

| Required Artifact          | What It Contains                                                         | How to Verify                                        |
| -------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------- |
| **Verified APIs**          | Source quotes showing actual API shapes, interfaces, function signatures | Must have Read tool evidence with exact line numbers |
| **Current Implementation** | Actual code from files to be modified                                    | Must quote existing code showing what's there now    |
| **Assumptions List**       | Explicitly documented unverified items with risk assessment              | Must exist even if empty ('All verified')            |

### Step 3: Check Discovery Output Format

Your enforcing-evidence-based-analysis phase MUST produce documentation like this:

```markdown
## Verified APIs (from enforcing-evidence-based-analysis phase)

### API: useWizard

**Source:** src/hooks/useWizard.ts (lines 72-77)
**Actual Return Type:**
\`\`\`typescript
// QUOTED FROM SOURCE - NOT FROM MEMORY:
return {
navigation: { goToNextStep, goToPreviousStep, ... },
progress: { currentStep, totalSteps, ... },
validation: { isValid, errors, ... },
}
\`\`\`
**My Planned Usage:**
\`\`\`typescript
const wizard = useWizard(config);
wizard.navigation.goToNextStep(); // ✅ Matches actual API
\`\`\`
**Verified Match:** ✅ Signatures match

### API: WizardStep Interface

**Source:** src/types.ts (lines 15-22)
**Actual Interface:**
\`\`\`typescript
// QUOTED FROM SOURCE:
interface WizardStep<T> {
id: string;
title: string; // NOT 'label'
order: number; // REQUIRED property
validate: (data: T) => boolean; // Returns boolean, NOT string
}
\`\`\`
**My Planned Usage:** [show your step definitions]
**Verified Match:** ✅ Yes

## Assumptions (Not Directly Verified)

| Assumption                                            | Why Unverified                           | Risk if Wrong                        |
| ----------------------------------------------------- | ---------------------------------------- | ------------------------------------ |
| Error handling pattern follows standard toast pattern | Didn't read error handler implementation | Plan might show wrong error handling |

If this section is empty: 'All claims verified against source files.'
```

### Step 4: Integration - How Discovery Feeds Planning

Evidence-based analysis (Phase 1) discovers WHAT EXISTS:

- Reads source files
- Quotes actual APIs
- Documents current state

Writing plans (Phase 2) documents HOW TO CHANGE IT:

- Uses verified APIs in task code
- Shows transformations from current to proposed
- References the verified findings

Example flow:

```
# Phase 1 Output (enforcing-evidence-based-analysis):
## Verified API: Repository.Create
**Source:** pkg/repository/asset.go (lines 45-52)
**Actual Signature:** func (r *Repository) Create(ctx context.Context, asset *model.Asset) error

# Phase 2 Input (writing-plans uses this):
### Task 1: Add asset creation
**Code:**
\`\`\`go
// Using verified API from discovery phase:
err := repo.Create(ctx, newAsset)  // ✅ Signature matches line 45 of asset.go
if err != nil {
    return fmt.Errorf("creating asset: %w", err)
}
\`\`\`
```

### Pre-Planning Validation Checklist

Before writing a single task in your plan, verify:

- [ ] I invoked skill: "enforcing-evidence-based-analysis"
- [ ] I have source file quotes (with Read tool evidence) for every API I reference
- [ ] I have exact line numbers for all code I reference
- [ ] I verified my planned API usage matches actual source signatures
- [ ] I created an Assumptions section listing anything NOT directly verified
- [ ] Every code example in my plan uses APIs that ACTUALLY EXIST (not assumed/hallucinated)

If ANY checkbox is unchecked:
→ STOP. Return to enforcing-evidence-based-analysis phase.
→ DO NOT proceed to planning with unverified APIs.
→ DO NOT assume we'll catch it during implementation - catch it NOW.

### Why This Gate Exists

Real failure: Frontend-lead created 48KB plan without this prerequisite:

- Claimed analyzed 10 files but never read them
- Assumed useWizard returns flat properties (wrong - returns nested)
- Assumed WizardStep has 'label' (wrong - uses 'title' + requires 'order')
- Every API call in all 15 tasks was incorrect
- Three independent reviewers confirmed: plan won't compile
- Would have wasted hours of implementation debugging broken assumptions

The 5 minutes to complete evidence-based analysis prevents 5 hours of debugging hallucinated plans.

### Relationship to Design Phase

If brainstorming was also used (for design decisions):

Complete sequence:

1. enforcing-evidence-based-analysis → Verify what exists now
2. brainstorming → Explore design alternatives
3. writing-plans → Document implementation with verified APIs
4. verifying-before-completion → Confirm plan completeness

### Escape Hatch (Rare Cases)

Only skip evidence-based-analysis if:

- Creating completely NEW files with NO existing codebase dependencies
- Pure greenfield implementation with no API integration
- Theoretical architecture document (no code references)

Even then: If you reference ANY existing file, API, or interface → evidence-based-analysis is REQUIRED.

---

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md` OR `docs/plans/YYYY-MM-DD-<feature-name>/` (for phased plans)

## Plan Decomposition (Large Features)

**When to decompose:** >30 tasks OR >5 major components OR >2500 lines

For large features, create **phased plans** instead of monolithic files:

```
docs/plans/YYYY-MM-DD-feature-name/
├── PLAN.md                      # Manifest: phases, dependencies, progress
├── phase-0-foundation.md        # Self-contained, 10-20 tasks
├── phase-1-component-a.md       # Self-contained, 10-20 tasks
├── phase-2-component-b.md       # Self-contained, 10-20 tasks
└── phase-3-integration.md       # Self-contained, 10-20 tasks
```

**Benefits:**

- Executing agents load one phase at a time (no context overflow)
- Clear progress tracking (phase-level completion)
- Natural resume points (complete phase before moving on)
- Parallel execution opportunities (independent phases)

**Each phase includes:**

- Entry criteria (prerequisites from previous phases)
- Exit criteria (definition of done)
- Self-contained tasks (no cross-phase references)
- Handoff to next phase

**For complete decomposition strategy, see:** [references/plan-decomposition.md](references/plan-decomposition.md)

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**

- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Task Structure

````markdown
### Task N: [Component Name]

**Files:**

- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```
````

**Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

**Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```

```

## Remember
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant skills with @ syntax
- DRY, YAGNI, TDD, frequent commits

## Execution Handoff

**IMPORTANT:** This skill may be used standalone OR within a larger orchestration workflow (orchestrating-feature-development).

### If Used Within Orchestration

When called from orchestrating-feature-development:
- **Do NOT** offer execution choices
- **Simply announce:** "Plan complete and saved to `docs/plans/<path>`. Returning control to orchestration workflow."
- The orchestration skill will handle Phase 4 (Architecture) next

### If Used Standalone

After saving the plan, offer execution choice:

**For single-file plans:**
"Plan complete and saved to `docs/plans/<filename>.md`."

**For phased plans:**
"Phased plan complete and saved to `docs/plans/<feature-name>/` with PLAN.md manifest and N phase files."

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task/phase, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?"**

**If Subagent-Driven chosen:**
- **REQUIRED SUB-SKILL:** Use superpowers:developing-with-subagents
- For phased plans: Execute one phase at a time, verify exit criteria before next phase
- Stay in this session
- Fresh subagent per task + code review

**If Parallel Session chosen:**
- Guide them to open new session in worktree
- **REQUIRED SUB-SKILL:** New session uses superpowers:executing-plans
- For phased plans: executing-plans loads PLAN.md, then executes phases sequentially

### Detection Logic

To detect orchestration context:
- Check if TodoWrite contains phases (brainstorming, planning, architecture, implementation, testing)
- Check if skill was explicitly called via orchestrating-feature-development
- If uncertain, assume standalone and offer execution choices
```
