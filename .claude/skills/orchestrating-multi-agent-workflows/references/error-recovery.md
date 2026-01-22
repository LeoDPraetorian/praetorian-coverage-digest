# Error Recovery Protocol

**Foundational patterns for recovering from failures during orchestrated workflows.**

**Foundational References:**

- [emergency-abort.md](emergency-abort.md) - Safe workflow termination
- [orchestration-guards.md](orchestration-guards.md) - Retry limits, checkpoints, escalation

**This file provides:** Generic recovery framework, decision tree, state preservation
**Domain orchestrations provide:** Domain-specific triggers, commands, rollback procedures

---

## Recovery Decision Framework

When a phase fails, follow this decision tree:

```
Phase failed
    │
    ├─ Is this a transient error? (network, timeout)
    │   └─ Yes → Retry (up to limit)
    │
    ├─ Is this a fixable error? (code bug, config)
    │   └─ Yes → Fix and retry
    │
    ├─ Is this a blocking error? (missing requirements, architecture flaw)
    │   └─ Yes → Route to specialist or escalate to user
    │
    └─ Is this unrecoverable? (vendor down, fundamental design issue)
        └─ Yes → Abort with state preservation
```

---

## Retry Limits

See [orchestration-guards.md](orchestration-guards.md#retry-limits-with-escalation) for:

- Default retry limits table
- Escalation protocol
- Failure definition
- Iteration persistence rules

**Key principle:** Iteration counts persist in progress files, not agent memory. Renaming task, changing approach, or spawning new agents does NOT reset counters.

### Failure Definition

A failure is ANY non-passing result:

- Flaky tests count as failures
- Partial passes count as failures
- Infrastructure failures count as failures

Do NOT retry hoping for 'lucky pass' - fix underlying issue or escalate.

---

## Phase-Specific Recovery

| Phase Category      | Common Failures                      | Recovery Action                                      |
| ------------------- | ------------------------------------ | ---------------------------------------------------- |
| Discovery (1-5)     | Timeout, no patterns found           | Retry with broader search OR proceed with greenfield |
| Architecture (6-7)  | Missing requirements, user rejection | Return to discovery OR escalate for clarification    |
| Implementation (8)  | Build errors, compile failures       | Fix and retry OR rollback phase                      |
| Verification (9-11) | Review rejection, max retries        | User decision required                               |
| Testing (13-15)     | Test failures, coverage gaps         | Return to implementation OR adjust targets           |
| Completion (16)     | Exit criteria not met                | Return to blocking phase                             |

**Domain orchestrations extend this table** with domain-specific failures and commands.

---

## Emergency Abort Protocol

**Foundational Reference**: [emergency-abort.md](emergency-abort.md)

### Generic Abort Triggers

| Trigger              | Detection                                  | Action                            |
| -------------------- | ------------------------------------------ | --------------------------------- |
| Max retries exceeded | 3+ failures on same phase                  | Abort with 'max_retries_exceeded' |
| User requests abort  | User says 'stop', 'cancel', 'abort'        | Abort with 'user_requested'       |
| Context exhaustion   | Token threshold exceeded at critical point | Abort with 'context_exhausted'    |
| Stuck loop detected  | Same error 3+ iterations                   | Abort with 'stuck_loop'           |

### Abort Procedure

1. **Stop pending agents** - Do not spawn new Task calls
2. **Preserve partial work**:
   ```bash
   git stash push -m 'orchestration-abort-{workflow}-{timestamp}'
   ```
3. **Update MANIFEST.yaml**:
   ```yaml
   status: "aborted"
   abort_reason: "{trigger}"
   abort_timestamp: "{timestamp}"
   partial_work_stash: "stash@{0}"
   recovery_instructions: "Resume from Phase {N}"
   ```
4. **Notify user** via AskUserQuestion with recovery options

---

## State Preservation

On abort or failure, write to progress file:

```yaml
abort_state:
  reason: "{abort_reason}"
  phase_at_abort: { N }
  completed_phases: [1, 2, ..., N-1]
  pending_phases: [N, N+1, ...]
  files_created: ["list of files"]
  git_stash_ref: "stash@{0}"
  recovery_command: "Resume from Phase {N}"
```

---

## Rollback Strategies

| Strategy             | When to Use                             | Procedure                                       |
| -------------------- | --------------------------------------- | ----------------------------------------------- |
| **Phase rollback**   | Single phase failed, prior phases valid | Delete phase outputs, mark as 'pending', re-run |
| **Partial rollback** | Multiple phases affected                | Rollback to last known-good checkpoint          |
| **Full rollback**    | Fundamental approach wrong              | `git stash pop` or start fresh                  |

### Rollback Procedure (Generic)

1. Identify rollback target phase
2. Delete artifacts from failed phase(s)
3. Update MANIFEST.yaml to mark phases as 'pending'
4. Re-run from rollback target

**Domain orchestrations provide** specific file paths and cleanup commands.

---

## Metadata Tracking

Always update MANIFEST.yaml when recovery occurs:

```yaml
phases:
  phase_{N}:
    status: "recovered"
    recovery_strategy: "resume" # or "rollback", "escalate"
    recovery_reason: "Error description"
    original_attempt: "2026-01-14T10:00:00Z"
    recovery_timestamp: "2026-01-14T10:30:00Z"
```

---

## Rationalization Prevention

If you detect rationalization phrases ('I can skip this', 'This is fine', 'We can fix later'):

1. STOP
2. Return to phase checklist
3. Never self-approve recovery shortcuts

**See:** [orchestration-guards.md](orchestration-guards.md) for rationalization table.

---

## Related References

- [emergency-abort.md](emergency-abort.md) - Full abort protocol
- [orchestration-guards.md](orchestration-guards.md) - Retry limits and escalation
- [checkpoint-configuration.md](checkpoint-configuration.md) - Human checkpoint protocol
- [troubleshooting.md](troubleshooting.md) - Domain-specific issues (in domain orchestrations)
