# Checkpoint Configuration (Feature Development)

**Strategic human approval points in feature development workflows.**

## Checkpoint Matrix by Work Type

| Work Type  | Checkpoint Phases | Description                              |
| ---------- | ----------------- | ---------------------------------------- |
| **BUGFIX** | 8, 16             | Implementation, Completion               |
| **SMALL**  | 8, 16             | Implementation, Completion               |
| **MEDIUM** | 7, 8, 16          | Plan, Implementation, Completion         |
| **LARGE**  | 6, 7, 8, 16       | Design, Plan, Implementation, Completion |

## Phase-Specific Checkpoints

### Phase 6: Brainstorming (LARGE only)

**CHECKPOINT: Design Approval**

Before proceeding, present:

- [ ] Design exploration summary
- [ ] Key decisions made during brainstorming
- [ ] Alternative approaches considered
- [ ] Recommended approach with rationale

**User options:** [Approve design] [Explore alternatives] [Request changes]

```markdown
## Design Checkpoint (Phase 6 → 7)

**Feature**: {feature_name}

**Design Summary**:
{2-3 sentence summary of proposed design}

**Key Decisions**:

1. {decision_1}: {rationale}
2. {decision_2}: {rationale}

**Alternatives Considered**:

- {alternative_1}: Rejected because {reason}
- {alternative_2}: Rejected because {reason}

**Proceed with this design?**
```

### Phase 7: Architecture Plan (MEDIUM+)

**CHECKPOINT: Plan Approval**

Before proceeding, present:

- [ ] Architecture diagram or component structure
- [ ] Implementation plan with task breakdown
- [ ] Effort estimate (task count, complexity)
- [ ] Security assessment summary

**User options:** [Approve plan] [Request changes] [Discuss scope]

```markdown
## Plan Checkpoint (Phase 7 → 8)

**Feature**: {feature_name}

**Architecture**:
{component structure or diagram}

**Implementation Tasks** ({count} tasks):

1. {task_1} - {complexity}
2. {task_2} - {complexity}
   ...

**Security Assessment**:
{security_lead findings summary}

**Estimated Effort**: {work_type} - {task_count} tasks

**Proceed with implementation?**
```

### Phase 8: Implementation (Always)

**CHECKPOINT: Implementation Progress**

For plans with >5 tasks, add intermediate checkpoints:

| Tasks Completed | Checkpoint Trigger       |
| --------------- | ------------------------ |
| 3 tasks         | Optional progress report |
| 5 tasks         | Mandatory checkpoint     |
| Every 3 after   | Progress report          |

**Checkpoint report format:**

```markdown
## Implementation Checkpoint (Batch {N})

**Progress**: {completed}/{total} tasks

**Completed This Batch**:

1. ✅ {task} - {status}
2. ✅ {task} - {status}
3. ✅ {task} - {status}

**Issues Encountered**:

- {issue}: {resolution}

**Next Batch**:

- {task_1}
- {task_2}
- {task_3}

**Continue?** [Yes] [Show details] [Pause for review]
```

### Phase 16: Completion (Always)

**CHECKPOINT: Final Approval**

Before completing, present:

- [ ] All phases completed summary
- [ ] Test results (pass/fail, coverage)
- [ ] Files modified list
- [ ] PR/commit options

**User options:** [Create PR] [Create commit] [Keep branch] [Cleanup]

```markdown
## Completion Checkpoint (Phase 16)

**Feature**: {feature_name}

**Phases Completed**: 16/16 ✅

**Test Summary**:

- Unit: {pass}/{total} passed
- Integration: {pass}/{total} passed
- E2E: {pass}/{total} passed
- Coverage: {percentage}%

**Files Modified**: {count} files
{file_list}

**What would you like to do?**
```

---

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

---

## Retry-Triggered Checkpoints

**Mandatory checkpoint when retry threshold exceeded:**

| Trigger           | Threshold             | Checkpoint Type             |
| ----------------- | --------------------- | --------------------------- |
| Same task retries | >2 retries            | MANDATORY: Escalate to user |
| Phase retries     | >1 retry across phase | MANDATORY: Review approach  |
| Cumulative issues | >5 issues in workflow | MANDATORY: Review strategy  |

**Retry escalation format:**

```markdown
## Retry Limit Reached

**Phase**: {phase_name}
**Task**: {task_description}
**Retries**: {count}/2 consumed

**Failure History**:

1. Attempt 1: {error}
2. Attempt 2: {error}

**Options**:

1. [Continue with workaround] - Skip this task, proceed
2. [Try different approach] - Reset retry counter, new strategy
3. [Abort workflow] - Stop and preserve state
```

---

## Checkpoint vs Escalation

| Situation               | Type       | Example                     |
| ----------------------- | ---------- | --------------------------- |
| End of phase transition | Checkpoint | "Approve architecture?"     |
| Retry limit exceeded    | Escalation | "Task failed 2x, what now?" |
| Design decision needed  | Checkpoint | "Choose approach A or B?"   |
| Agent blocked by error  | Escalation | "Missing API key"           |
| Progress report         | Checkpoint | "3/6 tasks done, continue?" |
| Unrecoverable failure   | Escalation | "Build won't pass"          |

---

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

---

## Auto-Approve Mode

**ONLY available via explicit user configuration:**

```yaml
# orchestration-limits.yaml
feature_development:
  auto_approve:
    enabled: false # Default: require all checkpoints
    skip_phases: [] # Empty = no skipping
```

**If user requests auto-approve:**

1. Confirm via AskUserQuestion
2. Document in MANIFEST.yaml
3. Still checkpoint on errors/retries (safety override)

---

## Checkpoint Bypass Protocol

**Never bypass checkpoints automatically.** If a checkpoint condition is met, STOP and present to user.

**Exception:** User can configure `--auto-approve` mode for trusted workflows, but this must be explicit user choice at workflow start, not orchestrator decision.

---

## Related References

- **Tight Feedback Loop**: Retry checkpoints integrate with [tight-feedback-loop.md](tight-feedback-loop.md)
- **Emergency Abort**: Critical failures trigger [emergency-abort.md](emergency-abort.md) instead of checkpoint
