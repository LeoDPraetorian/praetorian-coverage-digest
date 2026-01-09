# Checkpoint Configuration

Human approval is required at strategic points to ensure alignment and catch issues early.

## Phase-Level Checkpoints (Default)

Human approval required at:
- **Phase 1 (Brainstorming)**: Design approval via AskUserQuestion
- **Phase 3 (Planning)**: Plan approval via AskUserQuestion
- **Phase 4 (Architecture)**: Architecture + security + tech debt approval via AskUserQuestion

## Task-Level Checkpoints (For Large Plans)

When plan has **>5 tasks**, add intermediate checkpoints during implementation:

| Trigger | Checkpoint Type |
|---------|----------------|
| Every 3 tasks completed | Progress report + optional human review |
| Any task takes >2 retries | **Mandatory** human review |
| Cumulative issues > 5 | **Mandatory** human review |

## Checkpoint Report Format

```markdown
## Progress Checkpoint

**Completed:** Tasks 1-3 of 10
**Status:** On track / Issues detected

### Task Summaries
- Task 1: Implemented asset filter dropdown ✓
- Task 2: Added filter state management (1 retry) ✓
- Task 3: Integrated filter API endpoint ✓

### Issues Encountered
- Task 2: Initial state structure incorrect, fixed after spec compliance review
- Performance: Filter re-renders on every keystroke (noted for optimization)

### Next Steps
Tasks 4-6: Add filter persistence, tests, and E2E validation

**Continue?** [Yes / Show details / Pause]
```

## Related References

- [Phase 5: Implementation](phase-5-implementation.md)
- [Phase 5: Per-Task Mode](phase-5-per-task-mode.md)
