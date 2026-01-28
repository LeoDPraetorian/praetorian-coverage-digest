# Error Recovery (Fingerprintx Development)

Patterns for recovering from failures during fingerprintx module development workflows.

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

## Fingerprintx-Specific Errors

| Error Type                 | Common Cause                  | Recovery Action             |
| -------------------------- | ----------------------------- | --------------------------- |
| Go compilation error       | Syntax, missing imports       | Fix code and retry          |
| Interface not satisfied    | Missing method implementation | Implement missing methods   |
| Test environment failure   | Docker not running            | Start Docker, retry         |
| Protocol detection failure | Wrong probe implementation    | Review RFC, fix probe       |
| Version extraction failure | Incorrect regex/parser        | Debug with actual responses |

## Phase-Specific Recovery

| Phase               | Common Failures                       | Recovery Action                  |
| ------------------- | ------------------------------------- | -------------------------------- |
| Discovery (1-5)     | No similar plugins found              | Proceed with greenfield approach |
| Architecture (6-7)  | Protocol spec unclear                 | Research more, consult RFCs      |
| Implementation (8)  | Go build errors, interface mismatches | Fix and retry                    |
| Verification (9-11) | Review rejection, detection issues    | Return to implementation         |
| Testing (13-15)     | Test failures, Docker issues          | Fix tests or environment         |
| Completion (16)     | Exit criteria not met                 | Return to blocking phase         |

## Retry Limits

See [orchestration-guards.md](orchestration-guards.md) for default retry limits.

**Key principle:** Iteration counts persist in progress files, not agent memory. Renaming task, changing approach, or spawning new agents does NOT reset counters.

### Failure Definition

A failure is ANY non-passing result:

- Go compilation errors count as failures
- Partial test passes count as failures
- Docker container startup failures count as failures

Do NOT retry hoping for 'lucky pass' - fix underlying issue or escalate.

## Emergency Abort Protocol

### Abort Triggers

| Trigger              | Detection                           | Action                            |
| -------------------- | ----------------------------------- | --------------------------------- |
| Max retries exceeded | 3+ failures on same phase           | Abort with 'max_retries_exceeded' |
| User requests abort  | User says 'stop', 'cancel', 'abort' | Abort with 'user_requested'       |
| Context exhaustion   | Token threshold exceeded            | Abort with 'context_exhausted'    |
| Stuck loop detected  | Same error 3+ iterations            | Abort with 'stuck_loop'           |

### Abort Procedure

1. **Stop pending agents** - Do not spawn new Task calls
2. **Preserve partial work**:
   ```bash
   git stash push -m 'orchestration-abort-fingerprintx-{timestamp}'
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

## Rollback Strategies

| Strategy             | When to Use                             | Procedure                                       |
| -------------------- | --------------------------------------- | ----------------------------------------------- |
| **Phase rollback**   | Single phase failed, prior phases valid | Delete phase outputs, mark as 'pending', re-run |
| **Partial rollback** | Multiple phases affected                | Rollback to last known-good checkpoint          |
| **Full rollback**    | Fundamental approach wrong              | `git stash pop` or start fresh                  |

## Metadata Tracking

Always update MANIFEST.yaml when recovery occurs:

```yaml
phases:
  phase_{N}:
    status: "recovered"
    recovery_strategy: "resume"
    recovery_reason: "Error description"
    original_attempt: "2026-01-14T10:00:00Z"
    recovery_timestamp: "2026-01-14T10:30:00Z"
```

## Related References

- [emergency-abort.md](emergency-abort.md) - Full abort protocol
- [orchestration-guards.md](orchestration-guards.md) - Retry limits and escalation
- [checkpoint-configuration.md](checkpoint-configuration.md) - Human checkpoint protocol
