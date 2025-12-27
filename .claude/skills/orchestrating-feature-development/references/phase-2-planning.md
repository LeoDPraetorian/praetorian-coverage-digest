# Phase 2: Planning

Create a detailed implementation plan with specific tasks, file paths, and verification steps.

## Purpose

Transform the refined design into actionable implementation tasks by:

- Breaking down work into concrete steps
- Identifying affected files
- Specifying verification criteria
- Creating task assignments

## Workflow

### Step 1: Invoke Writing-Plans Skill

```
skill: "writing-plans"
```

The writing-plans skill creates comprehensive plans with:

- Exact file paths
- Complete code examples
- Verification steps
- Assumes zero codebase context

### Step 2: Save Plan

The writing-plans skill should save to:

```
.claude/features/{feature-id}/plan.md
```

Plan structure:

```markdown
# Implementation Plan: {Feature Name}

## Overview

{What we're building}

## Architecture Decisions Needed

- Decision 1: {question for architect}
- Decision 2: {question for architect}

## Implementation Tasks

### Task 1: {Component/Module Name}

**File**: `path/to/file.ts`
**Action**: Create/Modify
**Details**:
{specific changes}

**Verification**:

- [ ] Tests pass
- [ ] Build successful

### Task 2: {Component/Module Name}

...

## Testing Requirements

### Unit Tests

- Test file 1: {what to test}
- Test file 2: {what to test}

### E2E Tests

- Scenario 1: {user workflow}
- Scenario 2: {user workflow}

## Success Criteria

- [ ] All tasks complete
- [ ] Tests passing
- [ ] Coverage ≥80%
```

### Step 3: Human Checkpoint (MANDATORY)

Use AskUserQuestion:

```
The planning phase produced an implementation plan with:

{number} implementation tasks
{number} test scenarios
Estimated affected files: {count}

Key tasks:
- {task 1}
- {task 2}
- {task 3}

Do you approve this plan before we proceed to architecture phase?

Options:
- Yes, proceed to architecture phase
- No, the plan needs revision
- Let me review the full plan first
```

If "Let me review": Provide path to plan.md

### Step 4: Update Progress

```json
{
  "phases": {
    "brainstorming": { "status": "complete", "approved": true },
    "planning": {
      "status": "complete",
      "approved": true,
      "plan_file": ".claude/features/{id}/plan.md",
      "task_count": 8,
      "completed_at": "2024-12-13T11:00:00Z"
    },
    "architecture": {
      "status": "in_progress"
    }
  },
  "current_phase": "architecture"
}
```

### Step 5: Mark TodoWrite Complete

```
TodoWrite: Mark "Phase 2: Planning" as completed
TodoWrite: Mark "Phase 3: Architecture" as in_progress
```

## Exit Criteria

✅ Proceed to Phase 3 when:

- Plan saved to `plan.md`
- User explicitly approves plan
- Plan includes file paths, tasks, and verification steps
- Progress file updated
- TodoWrite marked complete

❌ Do NOT proceed if:

- User hasn't approved
- Plan has vague tasks ("fix the bug", "improve performance")
- Missing verification criteria
- No test requirements specified

## Common Issues

### "Plan is too high-level"

**Solution**: Ask writing-plans to add:

- Exact file paths
- Specific function names
- Code examples for complex logic
- Step-by-step verification

### "Should I include architecture decisions in the plan?"

**Answer**: No. The plan should list "Architecture decisions needed" as questions for the architect agent. Let Phase 3 make those decisions.

### "User wants to change approach mid-planning"

**Solution**:

1. Save current plan as `plan-v1.md`
2. Re-run writing-plans with new approach
3. Save as `plan-v2.md`
4. Ask user which version to use

## Related References

- [Phase 1: Brainstorming](phase-1-brainstorming.md) - Previous phase
- [Phase 3: Architecture](phase-3-architecture.md) - Next phase
- [Progress Persistence](progress-persistence.md) - Progress file format
