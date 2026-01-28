# Checkpoint Configuration (Brutus Development)

**Strategic human approval points in Brutus plugin development workflows.**

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

- [ ] Credential testing strategy summary
- [ ] Key decisions made during brainstorming
- [ ] Alternative authentication approaches considered
- [ ] Recommended approach with rationale
- [ ] KeyPlugin determination (password-only vs key-based)

**User options:** [Approve design] [Explore alternatives] [Request changes]

```markdown
## Design Checkpoint (Phase 6 -> 7)

**Protocol**: {protocol_name}
**Default Port(s)**: {ports}

**Credential Testing Strategy Summary**:
{2-3 sentence summary of proposed testing approach}

**Key Decisions**:

1. {decision_1}: {rationale}
2. {decision_2}: {rationale}

**Alternatives Considered**:

- {alternative_1}: Rejected because {reason}
- {alternative_2}: Rejected because {reason}

**Auth Type**: [Password-only/Key-based (KeyPlugin)]
**Error Classification**: {approach for distinguishing auth vs connection errors}

**Proceed with this design?**
```

### Phase 7: Architecture Plan (MEDIUM+)

**CHECKPOINT: Plan Approval**

Before proceeding, present:

- [ ] Plugin structure (files to create/modify)
- [ ] Implementation plan with task breakdown
- [ ] Error classification logic summary
- [ ] Security assessment summary

**User options:** [Approve plan] [Request changes] [Discuss scope]

```markdown
## Plan Checkpoint (Phase 7 -> 8)

**Protocol**: {protocol_name}

**Plugin Structure**:

- {BRUTUS_ROOT}/internal/plugins/{protocol}/{protocol}.go - Main plugin logic
- {BRUTUS_ROOT}/internal/plugins/{protocol}/{protocol}_test.go - Unit tests
- {BRUTUS_ROOT}/internal/plugins/init.go - Import registration

**Implementation Tasks** ({count} tasks):

1. {task_1} - {complexity}
2. {task_2} - {complexity}
   ...

**Error Classification**:

- Auth failure: {how to detect failed credentials}
- Connection error: {how to detect connection issues}
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

**Plugin Tested Locally**: [Yes/No]

- Build passes: {status}
- Test() method works: {status}

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
- [ ] Test results (unit tests)
- [ ] Coverage statistics
- [ ] Files modified list
- [ ] PR/commit options

**User options:** [Create PR] [Create commit] [Keep branch] [Cleanup]

```markdown
## Completion Checkpoint (Phase 16)

**Protocol**: {protocol_name}

**Phases Completed**: 16/16

**Test Summary**:

- Unit: {pass}/{total} passed
- Error classification tests: {pass}/{total} passed
- Coverage: {percentage}%

**Files Created**:
{file_list_created}

**Files Modified**:
{file_list_modified}

**P0 Compliance**:

- Plugin interface implemented
- Error classification working
- Self-registration in init()
- Import added to init.go

**What would you like to do?**
```

---

## Checkpoint Placement Strategy

**Always checkpoint:**

- After architecture phase, before implementation
- After implementation, before testing
- When switching from automated to manual tasks
- Before committing or creating PRs
- After test validation - never auto-approve without review

**Never checkpoint:**

- Within unit testing (too granular)
- Between independent parallel tasks
- After trivial updates (typo fixes, formatting)
- During library research iteration

---

## Brutus-Specific Checkpoints

### Phase 3: Protocol Research Completion

**Additional checkpoint for protocols with multiple auth methods:**

```markdown
## Auth Research Checkpoint (Phase 3.3)

**Protocol**: {protocol_name}
**Source Repository**: {repo_url}

**Auth Methods Identified**:
| Method | Support Level | Implementation Notes |
|--------|---------------|---------------------|
| {method_1} | Required | {notes} |
| {method_2} | Optional | {notes} |

**KeyPlugin Required?** [Yes/No] - {reason}

**Proceed to planning?**
```

### Phase 13: Testing Checkpoint

**Test results require user acknowledgment:**

```markdown
## Testing Checkpoint (Phase 13)

**Protocol**: {protocol_name}

**Unit Tests Run**: {count}

**Results**:

- Passed: {count} ({percentage}%)
- Failed: {count}
- Skipped: {count} (integration tests)

**Coverage**: {percentage}% (target: 80%)

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

| Situation                    | Type       | Example                        |
| ---------------------------- | ---------- | ------------------------------ |
| End of phase transition      | Checkpoint | "Approve architecture?"        |
| Retry limit exceeded         | Escalation | "Task failed 2x, what now?"    |
| Auth method design decision  | Checkpoint | "Use password vs key-based?"   |
| Agent blocked by error       | Escalation | "Cannot connect to test host"  |
| Progress report              | Checkpoint | "3/6 tasks done, continue?"    |
| Test coverage below 80%      | Escalation | "Only 65% coverage"            |

---

## Auto-Approve Mode

**ONLY available via explicit user configuration:**

```yaml
# orchestration-limits.yaml
brutus_development:
  auto_approve:
    enabled: false # Default: require all checkpoints
    skip_phases: [] # Empty = no skipping
```

**If user requests auto-approve:**

1. Confirm via AskUserQuestion
2. Document in MANIFEST.yaml
3. Still checkpoint on errors/retries (safety override)
4. Still require testing checkpoint (Phase 13) - never auto-approve without review

---

## Checkpoint Bypass Protocol

**Never bypass checkpoints automatically.** If a checkpoint condition is met, STOP and present to user.

**Exception:** User can configure `--auto-approve` mode for trusted workflows, but this must be explicit user choice at workflow start, not orchestrator decision.

**MANDATORY checkpoints that cannot be bypassed:**

- Phase 13 (Testing) - credential testing always requires human review
- Coverage below 80% - cannot proceed without explicit approval

---

## Related References

- **Tight Feedback Loop**: Retry checkpoints integrate with [tight-feedback-loop.md](tight-feedback-loop.md)
- **Emergency Abort**: Critical failures trigger [emergency-abort.md](emergency-abort.md) instead of checkpoint
