# Phase 2: Planning

Create a lightweight implementation plan with concrete tasks and verification steps.

## Purpose

Transform the refined design into actionable tasks by:

- Breaking down work into 3-5 concrete steps
- Identifying affected files
- Specifying verification criteria
- Confirming < 100 line estimate

## Workflow

### Step 1: Invoke Writing-Plans Skill

```
skill: "writing-plans"
```

The writing-plans skill creates plans optimized for simple features:

- Exact file paths
- Concrete tasks (not vague)
- Quick verification steps
- Code size estimates

### Step 2: Save Plan

The writing-plans skill should save to:

```
.claude/.output/features/{feature-id}/implementation-plan.md
```

Plan structure for simple features:

```markdown
# Implementation Plan: {Feature Name}

## Overview

{What we're building - 2-3 sentences}

## Estimated Scope

- **Lines of code**: ~{estimate} (must be < 100)
- **Files affected**: {1-5 files}
- **Time estimate**: {15-30 minutes}

## Implementation Tasks

### Task 1: {Specific action}

**File**: `exact/path/to/file.ts`
**Action**: Create/Modify
**Changes**:
- Add function `functionName()`
- Handle edge case: {specific case}

**Verification**:
- [ ] Function handles null inputs
- [ ] Existing tests still pass

### Task 2: {Specific action}

...

## Final Verification

- [ ] Total code < 100 lines
- [ ] All existing tests pass
- [ ] No lint errors
- [ ] Follows existing patterns in codebase
```

### Step 3: Scope Validation

**CRITICAL**: Review plan against scope limits:

| Limit           | Plan Value | Status |
| --------------- | ---------- | ------ |
| Lines of code   | {estimate} | ✅/❌  |
| Files affected  | {count}    | ✅/❌  |
| New patterns    | {any?}     | ✅/❌  |
| Test infra      | {new?}     | ✅/❌  |

**If ANY limit exceeded, escalate:**

```
The implementation plan revealed scope beyond simple feature limits:
- {specific limit exceeded}

Escalating to orchestrating-feature-development workflow.
```

### Step 4: Human Checkpoint (MANDATORY)

Use AskUserQuestion:

```
The planning phase produced an implementation plan:

Tasks: {count} concrete tasks
Estimated lines: ~{estimate} lines
Affected files: {count} files

Key tasks:
- {task 1}
- {task 2}

Scope validation:
✅ < 100 lines
✅ < 5 files
✅ Follows existing patterns

Do you approve this plan before implementation?

Options:
- Yes, proceed to implementation
- No, the plan needs revision
- Let me review the full plan first (provides path to plan.md)
```

### Step 5: Update Progress

Update MANIFEST.yaml:

```yaml
phases_completed:
  - name: brainstorming
    completed_at: "2026-01-06T10:15:00Z"
  - name: planning
    completed_at: "2026-01-06T10:25:00Z"
    approved: true
    task_count: 3
    estimated_lines: 45

artifacts:
  - design.md
  - implementation-plan.md
```

### Step 6: Mark TodoWrite Complete

```
TodoWrite: Mark "Phase 2: Planning" as completed
TodoWrite: Mark "Phase 3: Implementation" as in_progress
```

## Exit Criteria

✅ Proceed to Phase 3 when:

- Plan saved to `implementation-plan.md`
- Scope validation passed (< 100 lines, < 5 files)
- User explicitly approves plan
- Tasks are concrete (not vague like "fix the bug")
- TodoWrite marked complete

❌ Do NOT proceed if:

- User hasn't approved
- Scope limits exceeded (escalate instead)
- Plan has vague tasks
- Missing verification criteria

## Common Issues

### "Plan exceeds 100 lines"

**Solution**: Escalate to `orchestrating-feature-development`. This isn't a simple feature.

### "Plan reveals need for new patterns"

**Solution**: Escalate. New patterns require architecture phase.

### "User wants to skip planning"

**Answer**: No. Even 20-line features need:
- Clear verification steps
- Edge case handling
- Scope confirmation

Planning takes 5 minutes, prevents hours of rework.

### "Tasks are too vague"

**Solution**: Ask writing-plans to add:
- Exact function/variable names
- Specific edge cases to handle
- File-level precision (not just "update the module")

## Related References

- [Phase 1: Brainstorming](phase-1-brainstorming.md) - Previous phase
- [Phase 3: Implementation](phase-3-implementation.md) - Next phase
