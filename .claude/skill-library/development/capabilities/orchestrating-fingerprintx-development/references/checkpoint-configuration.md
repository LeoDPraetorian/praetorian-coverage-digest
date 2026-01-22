# Checkpoint Configuration (Fingerprintx Development)

**Strategic human approval points in fingerprintx plugin development workflows.**

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

- [ ] Protocol detection strategy summary
- [ ] Key decisions made during brainstorming
- [ ] Alternative detection approaches considered
- [ ] Recommended approach with rationale
- [ ] Open-source vs closed-source determination

**User options:** [Approve design] [Explore alternatives] [Request changes]

```markdown
## Design Checkpoint (Phase 6 -> 7)

**Protocol**: {protocol_name}
**Default Port(s)**: {ports}

**Detection Strategy Summary**:
{2-3 sentence summary of proposed detection approach}

**Key Decisions**:

1. {decision_1}: {rationale}
2. {decision_2}: {rationale}

**Alternatives Considered**:

- {alternative_1}: Rejected because {reason}
- {alternative_2}: Rejected because {reason}

**Source Availability**: [Open-source/Closed-source]
**Version Detection**: [Required/Optional] - {reason}

**Proceed with this design?**
```

### Phase 7: Architecture Plan (MEDIUM+)

**CHECKPOINT: Plan Approval**

Before proceeding, present:

- [ ] Plugin structure (files to create/modify)
- [ ] Implementation plan with task breakdown
- [ ] Protocol detection logic summary
- [ ] Security assessment summary

**User options:** [Approve plan] [Request changes] [Discuss scope]

```markdown
## Plan Checkpoint (Phase 7 -> 8)

**Protocol**: {protocol_name}

**Plugin Structure**:

- pkg/plugins/{protocol}/plugin.go - Main detection logic
- pkg/plugins/{protocol}/util.go - Helper functions
- pkg/plugins/plugins.go - Import registration
- pkg/plugins/types.go - Type constant

**Implementation Tasks** ({count} tasks):

1. {task_1} - {complexity}
2. {task_2} - {complexity}
   ...

**Detection Logic**:

- Banner pattern: {pattern_description}
- Version extraction: {version_method}
- Error handling: {error_strategy}

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

1. {task} - {status}
2. {task} - {status}
3. {task} - {status}

**Issues Encountered**:

- {issue}: {resolution}

**Detection Tested Locally**: [Yes/No]

- Banner parsing: {status}
- Version extraction: {status}

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
- [ ] Test results (unit, Docker, Shodan)
- [ ] Detection rate statistics
- [ ] Files modified list
- [ ] PR/commit options

**User options:** [Create PR] [Create commit] [Keep branch] [Cleanup]

```markdown
## Completion Checkpoint (Phase 16)

**Protocol**: {protocol_name}

**Phases Completed**: 16/16

**Test Summary**:

- Unit: {pass}/{total} passed
- Docker: {pass}/{total} passed (versions: {version_list})
- Shodan validation: {detection_rate}% ({detected}/{total} hosts)
- Coverage: {percentage}%

**Files Created**:
{file_list_created}

**Files Modified**:
{file_list_modified}

**P0 Compliance**:

- Type constant added
- Plugin import alphabetical
- Default ports documented
- Error handling complete

**What would you like to do?**
```

---

## Checkpoint Placement Strategy

**Always checkpoint:**

- After architecture phase, before implementation
- After implementation, before testing
- When switching from automated to manual tasks
- Before committing or creating PRs
- After Shodan validation (Phase 13) - never auto-approve live tests

**Never checkpoint:**

- Within unit testing (too granular)
- Between independent parallel tasks
- After trivial updates (typo fixes, formatting)
- During protocol research iteration

---

## Fingerprintx-Specific Checkpoints

### Phase 3: Protocol Research Completion

**Additional checkpoint for open-source protocols:**

```markdown
## Version Research Checkpoint (Phase 3.3)

**Protocol**: {protocol_name}
**Source Repository**: {repo_url}

**Version Matrix Created**:
| Version Range | Detection Marker | Confidence |
|---------------|------------------|------------|
| {version_1} | {marker_1} | {high/medium} |
| {version_2} | {marker_2} | {high/medium} |
| {version_3} | {marker_3} | {high/medium} |

**Minimum 3 distinguishable versions?** [Yes/No]

**Proceed to planning?**
```

### Phase 12/13: Validation Checkpoint

**Shodan validation results require user acknowledgment:**

```markdown
## Live Validation Checkpoint (Phase 13)

**Protocol**: {protocol_name}

**Shodan Query Used**: {query}
**Hosts Tested**: {count}

**Results**:

- Detected correctly: {count} ({percentage}%)
- Not detected: {count}
- False positive: {count}

**Detection Rate**: {rate}% (target: 80%)

**{PASS/FAIL}** - {action_required}
```

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

| Situation                      | Type       | Example                       |
| ------------------------------ | ---------- | ----------------------------- |
| End of phase transition        | Checkpoint | "Approve architecture?"       |
| Retry limit exceeded           | Escalation | "Task failed 2x, what now?"   |
| Protocol design decision       | Checkpoint | "Use binary vs text parsing?" |
| Agent blocked by error         | Escalation | "Cannot connect to Shodan"    |
| Progress report                | Checkpoint | "3/6 tasks done, continue?"   |
| Detection rate below threshold | Escalation | "Only 50% detection rate"     |

---

## Implementation Example

```typescript
// Phase transition with checkpoint
Task(
  "capability-lead",
  `
  Design the {protocol} fingerprintx plugin architecture.

  OUTPUT FORMAT:
  - Protocol detection strategy
  - Banner pattern specification
  - Version extraction approach
  - Default ports

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
      question: "Approve this plugin architecture for implementation?",
      header: "Architecture",
      multiSelect: false,
      options: [
        { label: "Approve", description: "Proceed with implementation" },
        { label: "Request changes", description: "Modify architecture first" },
        { label: "Research more", description: "Need more protocol research" },
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
fingerprintx_development:
  auto_approve:
    enabled: false # Default: require all checkpoints
    skip_phases: [] # Empty = no skipping
```

**If user requests auto-approve:**

1. Confirm via AskUserQuestion
2. Document in MANIFEST.yaml
3. Still checkpoint on errors/retries (safety override)
4. Still require validation checkpoint (Phase 13) - never auto-approve live tests

---

## Checkpoint Bypass Protocol

**Never bypass checkpoints automatically.** If a checkpoint condition is met, STOP and present to user.

**Exception:** User can configure `--auto-approve` mode for trusted workflows, but this must be explicit user choice at workflow start, not orchestrator decision.

**MANDATORY checkpoints that cannot be bypassed:**

- Phase 13 (Shodan validation) - live testing always requires human review
- Detection rate below 80% - cannot proceed without explicit approval

---

## Related References

- **Tight Feedback Loop**: Retry checkpoints integrate with [tight-feedback-loop.md](tight-feedback-loop.md)
- **Emergency Abort**: Critical failures trigger [emergency-abort.md](emergency-abort.md) instead of checkpoint
