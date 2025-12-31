---
name: executing-plans
description: Use when partner provides a complete implementation plan to execute in controlled batches with review checkpoints - handles both single-file and phased plans, loads plan, reviews critically, executes tasks in batches, reports for review between batches
allowed-tools: "Read, Write, Edit, Bash, Grep, Glob, TodoWrite"
---

# Executing Plans

## Overview

Load plan, review critically, execute tasks in batches, report for review between batches.

**Core principle:** Batch execution with checkpoints for architect review.

> **MANDATORY:** You MUST use TodoWrite before starting to track all execution steps.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

## Plan Type Detection

**Two plan formats:**

1. **Single-file plan:** `docs/plans/YYYY-MM-DD-feature.md`
2. **Phased plan:** `docs/plans/YYYY-MM-DD-feature/` (directory with PLAN.md + phase files)

**Detection logic:**

```bash
# If path is a directory with PLAN.md → phased plan
if [ -d "$plan_path" ] && [ -f "$plan_path/PLAN.md" ]; then
  use_phased_workflow
else
  use_single_file_workflow
fi
```

**For phased plans, see:** [Phased Plan Workflow](#phased-plan-workflow)

## The Process (Single-File Plans)

### Step 1: Load and Review Plan

1. Read plan file
2. Review critically - identify any questions or concerns about the plan
3. If concerns: Raise them with your human partner before starting
4. If no concerns: Create TodoWrite and proceed

### Step 2: Execute Batch

**Default: First 3 tasks**

For each task:

1. Mark as in_progress
2. Follow each step exactly (plan has bite-sized steps)
3. Run verifications as specified
4. Mark as completed

### Step 3: Report

When batch complete:

- Show what was implemented
- Show verification output
- Say: "Ready for feedback."

### Step 4: Continue

Based on feedback:

- Apply changes if needed
- Execute next batch
- Repeat until complete

### Step 5: Complete Development

After all tasks complete and verified:

- Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- **REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch
- Follow that skill to verify tests, present options, execute choice

## When to Stop and Ask for Help

**STOP executing immediately when:**

- Hit a blocker mid-batch (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly

**Ask for clarification rather than guessing.**

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**

- Partner updates the plan based on your feedback
- Fundamental approach needs rethinking

**Don't force through blockers** - stop and ask.

## Remember

- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Between batches: just report and wait
- Stop when blocked, don't guess

---

## Phased Plan Workflow

**For plans created by writing-plans with >30 tasks or >5 components.**

### Step 1: Load PLAN.md Manifest

```bash
# Read the manifest
cat docs/plans/YYYY-MM-DD-feature/PLAN.md
```

**Extract from manifest:**

- Feature goal and architecture
- Phase index (list of all phases)
- Phase dependencies (what must complete first)
- Current phase status (which phase to execute next)

### Step 2: Identify Current Phase

**Check progress tracking in PLAN.md:**

```markdown
## Progress Tracking

- [x] Phase 0: Foundation - Complete (2025-12-30)
- [ ] Phase 1: Component A - Not Started ← CURRENT PHASE
- [ ] Phase 2: Component B - Not Started
```

**If no phases started:** Begin with Phase 0

**If phases in progress:** Resume from first incomplete phase

### Step 3: Load Current Phase File

```bash
# Read the phase file
cat docs/plans/YYYY-MM-DD-feature/phase-N-name.md
```

**Extract from phase file:**

- Entry criteria (prerequisites)
- Exit criteria (definition of done)
- Task list
- Phase goal and scope

### Step 4: Verify Entry Criteria

**Before executing phase, check prerequisites:**

```markdown
## Entry Criteria

**Prerequisites from previous phases:**

- ✅ Phase 0: Foundation infrastructure in place
- ✅ Phase 0: Shared utilities available
- ✅ Tests passing before starting this phase
```

**If entry criteria NOT met:**

- STOP execution
- Report which criteria failed
- Ask partner to complete prerequisites first

**If entry criteria met:** Proceed to execution

### Step 5: Execute Phase Tasks in Batches

**Same batch execution as single-file plans:**

1. Create TodoWrite with all tasks from current phase
2. Execute first 3 tasks
3. Mark tasks as in_progress/completed
4. Run verifications
5. Report after each batch
6. Continue based on feedback

**Phase-specific notes:**

- Stay within current phase (don't jump to next phase)
- Don't reference tasks from other phases
- Commit frequently within phase

### Step 6: Verify Exit Criteria

**After completing all phase tasks, check:**

```markdown
## Exit Criteria (Definition of Done)

This phase is complete when:

- [ ] All N tasks implemented with passing tests
- [ ] No TypeScript/Go compilation errors
- [ ] All new tests passing
- [ ] Code reviewed (if applicable)
- [ ] Committed to version control
```

**Verification steps:**

```bash
# Run tests
npm test  # or pytest, go test, etc.

# Check compilation
npm run build  # or go build, etc.

# Verify commits
git log --oneline -5
```

**If exit criteria NOT met:**

- Identify which criteria failed
- Fix issues within current phase
- Re-verify before proceeding

**If exit criteria met:** Proceed to Step 7

### Step 7: Update PLAN.md Progress

**Mark phase complete in manifest:**

```bash
# Edit PLAN.md
```

**Update progress tracking:**

```markdown
## Progress Tracking

- [x] Phase 0: Foundation - Complete (2025-12-30)
- [x] Phase 1: Component A - Complete (2025-12-30) ← MARK COMPLETE
- [ ] Phase 2: Component B - Not Started
```

**Commit the progress update:**

```bash
git add docs/plans/YYYY-MM-DD-feature/PLAN.md
git commit -m "docs: mark phase 1 complete"
```

### Step 8: Report Phase Completion

**Report to partner:**

```
✅ Phase 1 Complete: Component A

**What was implemented:**
- [List key deliverables from phase]

**Exit criteria verified:**
- ✅ All N tasks passing tests
- ✅ No compilation errors
- ✅ Code committed

**Next phase:** Phase 2 - Component B
**Entry criteria for Phase 2:**
- [List prerequisites for next phase]

Ready to continue with Phase 2?
```

### Step 9: Continue to Next Phase

**Based on partner feedback:**

- **Continue:** Return to Step 2 (Identify Current Phase)
- **Pause:** Stop and wait for further instructions
- **Adjust:** If issues found, fix within completed phase

**Repeat Steps 2-9 until all phases complete.**

### Step 10: Complete Development

**After all phases complete:**

- Verify all phases marked complete in PLAN.md
- Run full test suite
- Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- **REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch

---

## Phased Plan: Key Differences

| Aspect              | Single-File Plan | Phased Plan                            |
| ------------------- | ---------------- | -------------------------------------- |
| **Load**            | Read one file    | Read PLAN.md, then phase files         |
| **Progress**        | Task-by-task     | Phase-by-phase, then task-by-task      |
| **Verification**    | After each batch | After each batch + phase exit criteria |
| **Reporting**       | Task completion  | Phase completion                       |
| **Manifest Update** | N/A              | Update PLAN.md progress after phase    |
| **Resume**          | From last task   | From last incomplete phase             |
| **Context**         | Full plan loaded | One phase at a time                    |

---

## Phase Dependencies

**Some phases have dependencies:**

```
Phase 0 (Foundation) → Phase 1 (Component A) → Phase 3 (Integration)
                    ↘ Phase 2 (Component B) ↗
```

**Sequential phases:** Must complete in order (Phase 1 requires Phase 0)

**Parallel opportunities:** Phase 1 and Phase 2 can execute independently after Phase 0

**Check PLAN.md for dependency graph.**

---

## Troubleshooting Phased Plans

### "Entry criteria not met"

**Solution:** Return to previous phase, verify exit criteria, fix issues

### "Exit criteria failing"

**Solution:** Debug within current phase, don't move to next phase until passing

### "Can't find phase file"

**Solution:** Verify plan structure, check PLAN.md phase index for correct filename

### "Lost track of progress"

**Solution:** Read PLAN.md progress tracking section to identify current phase

---

## Reference

**For complete phase structure details:**

See [writing-plans/references/plan-decomposition.md](../writing-plans/references/plan-decomposition.md)

**Includes:**

- PLAN.md manifest format
- Phase file structure
- Entry/exit criteria templates
- Decomposition strategies
- Examples (TanStack migration, auth refactor, DB migration)
