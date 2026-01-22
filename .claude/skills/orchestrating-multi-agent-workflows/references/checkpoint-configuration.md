# Checkpoint Configuration

**Strategic human approval points in multi-agent orchestration workflows.**

## Checkpoint Types

### Phase-Level Checkpoints

**When to require human approval:**

- **Major design decisions** - Architecture patterns, technology choices
- **Resource commitment** - Before significant implementation starts (>2 hour effort)
- **Point of no return** - Before irreversible changes (database migrations, API contracts)
- **User preferences matter** - UX decisions, trade-offs with no clear winner

**Implementation:**

```markdown
## Phase 1: Architecture → Phase 2: Implementation

**CHECKPOINT: Architecture Review**

Before proceeding, present:

- [ ] Proposed architecture diagram
- [ ] Key design decisions with trade-offs
- [ ] Implementation effort estimate

User options: [Approve] [Request changes] [Discuss alternatives]
```

### Task-Level Checkpoint Triggers

**Automatic checkpoints when:**

| Trigger           | Threshold                 | Action                            |
| ----------------- | ------------------------- | --------------------------------- |
| Tasks completed   | Every 3 tasks             | Progress report + optional review |
| Task retries      | >2 retries on same task   | MANDATORY human review            |
| Cumulative issues | >5 issues across workflow | MANDATORY human review            |

## Checkpoint Report Format

When triggering a task-level checkpoint, present:

```markdown
## Checkpoint Report

**Status**: [On track | Issues detected]

**Progress**: [X] of [Y] tasks completed

**Completed Tasks**:

1. Task A - ✅ Complete (0 retries)
2. Task B - ✅ Complete (1 retry: dependency issue resolved)
3. Task C - ✅ Complete (0 retries)

**Issues Encountered**:

- Task B retry: Missing type definition (resolved by adding interface)

**Next Steps**:

- Task D: Integration testing
- Task E: Code review
- Task F: Documentation update

**Continue?** [Yes] [Show details] [Pause for review]
```

## Checkpoint Placement Strategy

**Always checkpoint:**

- After architecture phase, before implementation
- After implementation, before testing
- When switching from automated to manual tasks
- Before committing or creating PRs

**Never checkpoint:**

- Within unit testing (too granular)
- Between independent parallel tasks
- After trivial updates (typo fixes, formatting)

## Checkpoint vs Escalation

**Checkpoints** are planned approval points for expected decision-making.

**Escalations** are unplanned blocks requiring user intervention.

| Situation                          | Use        |
| ---------------------------------- | ---------- |
| "Approve this architecture?"       | Checkpoint |
| "Agent blocked by missing API key" | Escalation |
| "Choose between Option A or B?"    | Checkpoint |
| "Test failed 3 times, can't fix"   | Escalation |

## Implementation Example

```typescript
// Phase transition with checkpoint
Task(
  "frontend-lead",
  `
  Design the Asset Management Dashboard architecture.

  OUTPUT FORMAT:
  - Architecture diagram
  - Component hierarchy
  - State management approach
  - Key trade-offs

  After your analysis, I will present this to the user for approval
  before spawning implementation agents.
`
);

// Wait for agent result
const architecture = await readAgentOutput("frontend-lead");

// Present checkpoint
AskUserQuestion({
  questions: [
    {
      question: "Approve this architecture for implementation?",
      header: "Architecture",
      multiSelect: false,
      options: [
        { label: "Approve", description: "Proceed with implementation" },
        { label: "Request changes", description: "Modify architecture first" },
        { label: "Discuss alternatives", description: "Explore other options" },
      ],
    },
  ],
});
```

## Checkpoint Bypass Protocol

**Never bypass checkpoints automatically.** If a checkpoint condition is met, STOP and present to user.

**Exception:** User can configure `--auto-approve` mode for trusted workflows, but this must be explicit user choice at workflow start, not orchestrator decision.
