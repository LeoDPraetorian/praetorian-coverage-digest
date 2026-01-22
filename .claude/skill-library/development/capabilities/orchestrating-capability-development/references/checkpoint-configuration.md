# Checkpoint Configuration (Capability Development)

**Strategic human approval points in capability development workflows.**

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

- [ ] Capability type decision (VQL, Nuclei, Janus, Fingerprintx, Scanner)
- [ ] Detection logic overview
- [ ] Quality targets (detection accuracy, false positive rate)
- [ ] Alternative approaches considered

**User options:** [Approve design] [Explore alternatives] [Request changes]

```markdown
## Design Checkpoint (Phase 6 -> 7)

**Capability**: {capability_name}

**Capability Type**: {VQL | Nuclei | Janus | Fingerprintx | Scanner}

**Detection Logic Summary**:
{2-3 sentence summary of proposed detection approach}

**Quality Targets**:

- Detection Accuracy: {target}%
- False Positive Rate: <={target}%

**Alternatives Considered**:

- {alternative_1}: Rejected because {reason}
- {alternative_2}: Rejected because {reason}

**Proceed with this design?**
```

### Phase 7: Architecture Plan (MEDIUM+)

**CHECKPOINT: Plan Approval**

Before proceeding, present:

- [ ] Capability architecture (query structure, matchers, pipeline)
- [ ] Implementation plan with task breakdown
- [ ] Effort estimate (task count, complexity)
- [ ] Security assessment summary

**User options:** [Approve plan] [Request changes] [Discuss scope]

```markdown
## Plan Checkpoint (Phase 7 -> 8)

**Capability**: {capability_name}
**Type**: {capability_type}

**Architecture**:
{capability structure - query design, template structure, or Go interfaces}

**Implementation Tasks** ({count} tasks):

1. {task_1} - {complexity}
2. {task_2} - {complexity}
   ...

**Security Assessment**:
{security_lead findings - detection accuracy concerns, FP risks}

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

1. PASS {task} - {status}
2. PASS {task} - {status}
3. PASS {task} - {status}

**Capability Artifacts Created**:

- {artifact_path}: {description}

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
- [ ] Quality metrics (detection accuracy, FP rate, coverage)
- [ ] Artifacts created list
- [ ] PR/commit options

**User options:** [Create PR] [Create commit] [Keep branch] [Cleanup]

```markdown
## Completion Checkpoint (Phase 16)

**Capability**: {capability_name}
**Type**: {capability_type}

**Phases Completed**: 16/16 PASS

**Quality Metrics**:

- Detection Accuracy: {actual}% (target: {target}%)
- False Positive Rate: {actual}% (target: <={target}%)
- Test Coverage: {percentage}%

**Artifacts Created**: {count} files
{artifact_list}

**What would you like to do?**
```

---

## Checkpoint Placement Strategy

**Always checkpoint:**

- After architecture phase, before implementation
- After implementation, before testing
- When switching from automated to manual tasks
- Before committing or creating PRs
- After capability type selection (VQL vs Nuclei vs Go)

**Never checkpoint:**

- Within unit testing (too granular)
- Between independent parallel tasks
- After trivial updates (typo fixes, formatting)
- During detection logic iteration within same approach

---

## Retry-Triggered Checkpoints

**Mandatory checkpoint when retry threshold exceeded:**

| Trigger            | Threshold             | Checkpoint Type                   |
| ------------------ | --------------------- | --------------------------------- |
| Same task retries  | >2 retries            | MANDATORY: Escalate to user       |
| Phase retries      | >1 retry across phase | MANDATORY: Review approach        |
| Detection failures | >3 in testing         | MANDATORY: Review detection logic |

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

| Situation                | Type       | Example                     |
| ------------------------ | ---------- | --------------------------- |
| End of phase transition  | Checkpoint | "Approve architecture?"     |
| Retry limit exceeded     | Escalation | "Task failed 2x, what now?" |
| Capability type decision | Checkpoint | "VQL or Nuclei template?"   |
| Agent blocked by error   | Escalation | "Missing test samples"      |
| Progress report          | Checkpoint | "3/6 tasks done, continue?" |
| Detection logic failure  | Escalation | "FP rate too high"          |

---

## Capability-Specific Checkpoints

### VQL Capabilities

| Phase | Extra Checkpoint  | Trigger                         |
| ----- | ----------------- | ------------------------------- |
| 8     | Query validation  | VQL syntax errors               |
| 13    | Platform coverage | Multi-platform support required |

### Nuclei Templates

| Phase | Extra Checkpoint     | Trigger                 |
| ----- | -------------------- | ----------------------- |
| 8     | Matcher validation   | False positive concerns |
| 13    | CVE variant coverage | CVE-specific template   |

### Janus/Fingerprintx/Scanner

| Phase | Extra Checkpoint     | Trigger                     |
| ----- | -------------------- | --------------------------- |
| 8     | Interface compliance | Go interface implementation |
| 13    | Integration testing  | External API dependencies   |

---

## Implementation Example

```typescript
// Phase transition with checkpoint
Task(
  "capability-lead",
  `
  Design the CVE-2024-XXXXX detection capability architecture.

  OUTPUT FORMAT:
  - Capability type recommendation (VQL/Nuclei/Go)
  - Detection logic design
  - Matcher/query structure
  - Quality targets

  After your analysis, I will present this to the user for approval
  before spawning implementation agents.
`
);

// Wait for agent result
const architecture = await readAgentOutput("capability-lead");

// Present checkpoint
AskUserQuestion({
  questions: [
    {
      question: "Approve this capability architecture for implementation?",
      header: "Architecture",
      multiSelect: false,
      options: [
        { label: "Approve", description: "Proceed with implementation" },
        { label: "Request changes", description: "Modify architecture first" },
        { label: "Different type", description: "Switch capability type" },
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
capability_development:
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
