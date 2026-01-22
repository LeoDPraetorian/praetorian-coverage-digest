# Checkpoint Configuration (Integration Development)

**Strategic human approval points in integration development workflows.**

## Checkpoint Matrix by Work Type

| Work Type  | Checkpoint Phases                  | Description                               |
| ---------- | ---------------------------------- | ----------------------------------------- |
| **SMALL**  | 4 (if skill missing), 10, 16       | Skill creation, P0 compliance, Completion |
| **MEDIUM** | 4 (if skill missing), 7, 10, 16    | +Architecture approval                    |
| **LARGE**  | 4 (if skill missing), 6, 7, 10, 16 | +Design approval                          |

## Integration-Specific Checkpoints

| Phase | Checkpoint              | Trigger         | Gate Criteria                     |
| ----- | ----------------------- | --------------- | --------------------------------- |
| 4     | Skill creation approval | Skill missing   | Confirm creating new vendor skill |
| 6     | Design approval         | LARGE work type | brainstorming.md complete         |
| 7     | Architecture approval   | MEDIUM+ work    | architecture-plan.md complete     |
| 10    | P0 violations           | Any P0 fails    | All 7 P0 requirements pass        |
| 11    | Retry exhausted         | Max retries hit | Need user direction               |
| 15    | Retry exhausted         | Max retries hit | Need user direction               |
| 16    | Final verification      | Always          | All verification passes           |

---

## Phase 4: Skill Creation Approval

**Trigger:** No existing `integrating-with-{vendor}` skill found

**Checkpoint Format:**

```markdown
No existing skill found for {vendor}.

Creating `integrating-with-{vendor}` skill will:

- Document vendor API patterns
- Capture auth, rate limiting, pagination details
- Be reusable for future integrations

Create new skill?
```

**Options:** Yes, create skill (Recommended) | No, proceed without

---

## Phase 6: Design Approval (LARGE only)

**Trigger:** Work type is LARGE

**Checkpoint Format:**

```markdown
Phase 6 Design Review:

Vendor: {vendor}
Type: {asset_discovery | vuln_sync | bidirectional_sync}
Auth: {API Key | OAuth2 | Service Account}

Key design decisions:

1. {decision 1}
2. {decision 2}
3. {decision 3}

Proceed to Phase 7 (Architecture Plan)?
```

**Options:** Approve | Revise | Cancel

---

## Phase 7: Architecture Approval (MEDIUM+)

**Trigger:** Work type is MEDIUM or LARGE

**Checkpoint Format:**

```markdown
Phase 7 Architecture Review:

Integration: {vendor}
Type: {integration_type}
Files to create: {count}

P0 Requirements Addressed:
✅ VMFilter: {approach}
✅ CheckAffiliation: {approach}
✅ ValidateCredentials: First in Invoke()
✅ errgroup: SetLimit({n}) with capture
✅ Pagination: maxPages={n} OR LastPage check
✅ Error handling: All errors checked
✅ File size: {estimate} lines

Frontend: {YES (enum, logos, hook) | NO (reason)}

Proceed to Phase 8 (Implementation)?
```

**Options:** Approve | Revise | Cancel

---

## Phase 10: P0 Violations

**Trigger:** Any P0 requirement fails validation

**Checkpoint Format:**

```markdown
P0 Compliance Verification found {count} violations.

**Critical**: {violation description}
**Error**: {violation description}
**Warning**: {violation description}

Options:

1. Fix violations now (Recommended) - I will guide you through fixes
2. Proceed anyway with violations documented - Code review will likely reject
3. Review violations and decide - Show me details of each violation
```

**Options:** Fix violations now (Recommended) | Proceed anyway | Review violations

---

## Phase 11/15: Retry Exhausted

**Trigger:** Review or test fails 3+ times

**Checkpoint Format:**

```markdown
Phase {N} has failed {count} times.

Last failure: {failure_description}

Options:

1. Debug with assistance - I'll help investigate the root cause
2. Revise approach - Change implementation strategy
3. Escalate to expert - Spawn specialized agent
4. Abort workflow - Preserve state for later
```

**Options:** Debug | Revise approach | Escalate | Abort

---

## Phase 16: Final Verification

**Trigger:** All phases complete

**Checkpoint Format:**

```markdown
Integration Development Complete: {vendor}

All verification passed:
✅ P0 Compliance: 7/7 requirements
✅ Spec Compliance: SPEC_COMPLIANT
✅ Code Quality: APPROVED
✅ Security: APPROVED
✅ Test Coverage: {percent}%
✅ Build/Vet/Lint: All pass

How would you like to proceed?
```

**Options:** Merge to main | Create PR | Keep branch

---

## Checkpoint Placement Strategy

**Always checkpoint:**

- After architecture phase, before implementation
- After implementation, before testing
- When switching from automated to manual tasks
- Before committing or creating PRs
- After P0 compliance gate (mandatory for integrations)

**Never checkpoint:**

- Within unit testing (too granular)
- Between independent parallel tasks
- After trivial updates (typo fixes, formatting)
- During API exploration within same vendor

---

## Retry-Triggered Checkpoints

**Mandatory checkpoint when retry threshold exceeded:**

| Trigger           | Threshold             | Checkpoint Type                       |
| ----------------- | --------------------- | ------------------------------------- |
| Same task retries | >2 retries            | MANDATORY: Escalate to user           |
| Phase retries     | >1 retry across phase | MANDATORY: Review approach            |
| P0 failures       | >2 attempts           | MANDATORY: Review integration pattern |

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

| Situation               | Type       | Example                      |
| ----------------------- | ---------- | ---------------------------- |
| End of phase transition | Checkpoint | "Approve architecture?"      |
| Retry limit exceeded    | Escalation | "Task failed 2x, what now?"  |
| P0 compliance decision  | Checkpoint | "Fix violations or proceed?" |
| Agent blocked by error  | Escalation | "Missing API credentials"    |
| Progress report         | Checkpoint | "3/6 tasks done, continue?"  |
| Build failure           | Escalation | "Compilation error"          |

---

## Implementation Example

```typescript
// Phase transition with checkpoint
Task(
  "integration-lead",
  `
  Design the Qualys integration architecture.

  OUTPUT FORMAT:
  - API endpoints to use
  - Authentication approach
  - P0 requirement implementation plan
  - Asset mapping strategy

  After your analysis, I will present this to the user for approval
  before spawning implementation agents.
`
);

// Wait for agent result
const architecture = await readAgentOutput("integration-lead");

// Present checkpoint
AskUserQuestion({
  questions: [
    {
      question: "Approve this integration architecture for implementation?",
      header: "Architecture",
      multiSelect: false,
      options: [
        { label: "Approve", description: "Proceed with implementation" },
        { label: "Request changes", description: "Modify architecture first" },
        { label: "Review P0", description: "Check P0 requirements first" },
      ],
    },
  ],
});
```

---

## Checkpoint Bypass Protocol

**Never bypass checkpoints automatically.** If a checkpoint condition is met, STOP and present to user.

**Exception:** User can configure `--auto-approve` mode for trusted workflows, but this must be explicit user choice at workflow start, not orchestrator decision.

**When user approves bypass, document in MANIFEST.yaml:**

```yaml
gate_override:
  gate_name: p0_compliance
  override_reason: "User-approved deferral of CheckAffiliation"
  risk_accepted: "CheckAffiliation uses stub, will fix in v2"
  timestamp: "2026-01-21T08:00:00Z"
```

---

## Related References

- **Compaction Gates**: [compaction-gates.md](compaction-gates.md) - Compaction checkpoints
- **Error Recovery**: [error-recovery.md](error-recovery.md) - Recovery after checkpoint failures
- **Emergency Abort**: Critical failures trigger [emergency-abort.md](emergency-abort.md) instead of checkpoint
