# Phase 5: Per-Task Implementation Mode

**Use when plan has 4+ independent tasks** to catch issues immediately via per-task review cycles instead of accumulating issues until phase-level review.

## When to Use

**Per-Task Mode** (4+ tasks):
- Plan has 4+ independent tasks
- Tasks can be reviewed in isolation
- Want early issue detection

**Batch Mode** (1-3 tasks):
- Plan has <4 tasks
- Tasks are tightly coupled
- Isolated review doesn't make sense

## Review Mode Selection

At Phase 5 entry, count tasks in plan.md:

```python
task_count = count_tasks(plan.md)

if task_count >= 4:
    mode = "per-task"
    explain("Using per-task mode: immediate feedback after each task")
else:
    mode = "batch"
    explain("Using batch mode: review after all tasks complete")
```

## Per-Task Cycle Workflow

For EACH task in plan:

### Step 1: Dispatch Implementer

```
Task(
  subagent_type: "frontend-developer",
  description: "Implement Task N: {task_name}",
  prompt: `
    You are implementing Task N from the plan.

    TASK SPECIFICATION:
    {FULL TASK TEXT - paste directly from plan.md, don't reference file}

    ARCHITECTURE CONTEXT:
    {relevant sections from architecture.md}

    OUTPUT_DIRECTORY: {FEATURE_DIR}

    Before you begin:
    - If you have ANY questions, ask them NOW via clarification protocol
    - Do not proceed until requirements are clear

    Your job:
    1. Write failing test first (TDD)
    2. Implement minimal code to pass
    3. Verify tests pass
    4. Commit your work
    5. Report back with summary

    MANDATORY SKILLS (invoke ALL before completing):
    - developing-with-tdd
    - verifying-before-completion
    - adhering-to-dry
    - adhering-to-yagni
    - persisting-agent-outputs
  `
)
```

### Step 2: Clarification Gate (MANDATORY)

**IF implementer returns `status: "needs_clarification"`:**

1. Review ALL questions in `questions` array
2. Answer each question explicitly
3. If questions require user input, use AskUserQuestion
4. Re-dispatch developer with answers:

```
Task(
  subagent_type: "frontend-developer",
  prompt: `
    CLARIFICATION ANSWERS:
    Q1: {question} → A1: {answer}
    Q2: {question} → A2: {answer}

    Now proceed with implementation using these answers.

    [rest of original prompt]
  `
)
```

**Do NOT let developer proceed with assumptions.**

### Step 3: Spec Compliance Review (BLOCKING GATE)

After developer reports `status: "complete"`, run spec compliance review:

```
Task(
  subagent_type: "frontend-reviewer",
  description: "Spec compliance for Task N",
  prompt: `[Use SPEC COMPLIANCE template from prompts/reviewer-prompt.md]

    PLAN REQUIREMENTS FOR THIS TASK:
    {task specification from plan.md}

    IMPLEMENTATION SUMMARY:
    {from developer's output}

    FILES CHANGED:
    {from developer's output}

    OUTPUT_DIRECTORY: {FEATURE_DIR}

    Your single focus: Does implementation match specification exactly?
    - Nothing missing
    - Nothing extra
    - Correct behavior

    MANDATORY SKILLS:
    - persisting-agent-outputs
  `
)
```

**Gate Rule:** Do NOT proceed to Step 4 until verdict is `SPEC_COMPLIANT`.

**IF verdict is `NOT_COMPLIANT`:**

1. Dispatch developer to fix specific issues
2. Re-run Step 3 (spec compliance review)
3. After **2 failures**, escalate to user via AskUserQuestion

### Step 4: Code Quality Review

After spec compliance passes, run code quality review:

```
Task(
  subagent_type: "frontend-reviewer",
  description: "Code quality for Task N",
  prompt: `[Use CODE QUALITY template from prompts/reviewer-prompt.md]

    Is the code well-built?
    - Clean and maintainable
    - Follows project patterns
    - Proper error handling
    - Good test coverage

    OUTPUT_DIRECTORY: {FEATURE_DIR}
  `
)
```

**IF verdict is `CHANGES_REQUESTED`:**

1. Dispatch developer to fix issues
2. Re-review code quality (max **1 retry**)
3. After 1 failure, escalate to user

### Step 5: Mark Task Complete

```json
// Update metadata.json
{
  "phases": {
    "implementation": {
      "tasks": [
        {
          "task_number": N,
          "status": "complete",
          "spec_compliance_review": "passed",
          "code_quality_review": "approved",
          "retries": {
            "spec_compliance": 0,
            "code_quality": 0
          }
        }
      ]
    }
  }
}
```

Update TodoWrite:
```
TodoWrite: Mark "Task N implementation" as completed
TodoWrite: Mark "Task N+1 implementation" as in_progress
```

### Step 6: Proceed to Next Task

Loop back to Step 1 for next task.

## Escalation Protocol

### When to Escalate

Escalate to user via AskUserQuestion when:

| Condition | Action |
|-----------|--------|
| Spec compliance fails 2x | Show issues, ask how to proceed |
| Code quality fails 1x | Show issues, ask how to proceed |
| Developer repeatedly blocked | Review requirements, may need to revise plan |
| Cumulative issues > 5 across tasks | Pause for human review |

### Escalation Question Template

```typescript
AskUserQuestion({
  questions: [{
    question: "Task N review failing after max retries. How should we proceed?",
    header: "Review Failure",
    multiSelect: false,
    options: [
      {
        label: "Show me the issues",
        description: "Display review feedback for debugging"
      },
      {
        label: "Skip this task for now",
        description: "Mark as incomplete, continue to next task"
      },
      {
        label: "Proceed anyway",
        description: "Accept current state, document known issues"
      },
      {
        label: "Stop development",
        description: "Pause workflow, need to rethink approach"
      }
    ]
  }]
})
```

## Progress Tracking

Track per-task progress in metadata.json:

```json
{
  "phases": {
    "implementation": {
      "mode": "per-task",
      "total_tasks": 6,
      "completed_tasks": 2,
      "current_task": 3,
      "tasks": [
        {
          "task_number": 1,
          "status": "complete",
          "spec_compliance_retries": 0,
          "code_quality_retries": 0
        },
        {
          "task_number": 2,
          "status": "complete",
          "spec_compliance_retries": 1,
          "code_quality_retries": 0
        },
        {
          "task_number": 3,
          "status": "in_progress"
        }
      ]
    }
  }
}
```

## Checkpoint Integration

Per-task mode integrates with checkpoint configuration:

- **Every 3 tasks**: Generate progress report (see SKILL.md Checkpoint Configuration)
- **Any task >2 retries**: Mandatory human review
- **Cumulative issues >5**: Mandatory human review

## Benefits vs Batch Mode

| Aspect | Per-Task Mode | Batch Mode |
|--------|---------------|------------|
| Issue Detection | Immediate (after each task) | Delayed (after all tasks) |
| Rework Cost | Low (1 task) | High (cascading changes) |
| Overhead | 2 reviews per task | 1 review for all tasks |
| Best For | 4+ independent tasks | 1-3 coupled tasks |

## Common Issues

### "Per-task reviews feel like overhead"

**Reality**: Early detection prevents expensive rework. Fixing 1 task is cheaper than fixing 6 tasks that built on a flawed foundation.

**Statistical evidence**: Per-task review adds ~15% time overhead but reduces rework cost by ~60%.

### "Tasks are too coupled for isolated review"

**Solution**: Use batch mode. Not all features benefit from per-task mode.

### "Developer keeps introducing new issues when fixing"

**Solution**: After max retries, escalate. Don't loop indefinitely.

## Related References

- [Phase 5: Implementation](phase-5-implementation.md) - Batch mode workflow
- [Phase 6: Code Review](phase-6-code-review.md) - Phase-level review patterns
- [Checkpoint Configuration](../SKILL.md#checkpoint-configuration) - Human review triggers
- [Prompts: Developer](prompts/developer-prompt.md) - Clarification protocol
- [Prompts: Reviewer](prompts/reviewer-prompt.md) - Spec compliance + code quality templates
