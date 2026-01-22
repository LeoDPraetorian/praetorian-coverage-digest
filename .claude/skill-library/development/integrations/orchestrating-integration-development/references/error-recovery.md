# Error Recovery Protocol (Integration Development)

**Recovery patterns for failures during integration development workflows.**

**Related References:**

- [emergency-abort.md](emergency-abort.md) - Safe workflow termination
- [orchestration-guards.md](orchestration-guards.md) - Retry limits, checkpoints, escalation

---

## Recovery Decision Framework

When a phase fails, follow this decision tree:

```
Phase failed
    │
    ├─ Is this a transient error? (network, timeout, API rate limit)
    │   └─ Yes → Retry (up to limit)
    │
    ├─ Is this a fixable error? (code bug, P0 compliance issue)
    │   └─ Yes → Fix and retry
    │
    ├─ Is this a blocking error? (missing vendor docs, architecture flaw)
    │   └─ Yes → Route to specialist or escalate to user
    │
    └─ Is this unrecoverable? (vendor down, fundamental design issue)
        └─ Yes → Abort with state preservation
```

---

## Retry Limits

See [orchestration-guards.md](orchestration-guards.md) for:

- Default retry limits table
- Escalation protocol
- Failure definition
- Iteration persistence rules

**Key principle:** Iteration counts persist in progress files, not agent memory. Renaming task, changing approach, or spawning new agents does NOT reset counters.

---

## Integration-Specific Recovery

| Phase               | Common Failures                   | Recovery Action                            |
| ------------------- | --------------------------------- | ------------------------------------------ |
| Discovery (3)       | No existing patterns found        | Proceed with reference integration pattern |
| Skill Discovery (4) | No vendor skill exists            | Continue without vendor-specific skill     |
| Architecture (7)    | P0 requirements unclear           | Escalate for P0 clarification              |
| Implementation (8)  | P0 compliance failure             | Return to implementation with specific fix |
| P0 Review (10)      | VMFilter/CheckAffiliation missing | CRITICAL - must fix before proceeding      |
| Code Quality (11)   | Review rejection                  | Fix issues and re-review                   |
| Testing (13)        | Mock server failures              | Check test fixtures, retry                 |
| Coverage (14)       | Below 80% threshold               | Add tests or escalate                      |

### P0 Compliance Recovery (CRITICAL)

P0 failures require immediate attention:

| P0 Requirement      | Recovery if Missing                                               |
| ------------------- | ----------------------------------------------------------------- |
| VMFilter            | Return to Phase 8, add VMFilter call before asset processing      |
| CheckAffiliation    | Return to Phase 8, add CheckAffiliation check for each resource   |
| errgroup            | Return to Phase 8, refactor concurrent operations to use errgroup |
| ValidateCredentials | Return to Phase 8, implement credential validation                |

**P0 failures are blocking** - do not proceed past Phase 10 without all P0 requirements met.

---

## Emergency Abort Protocol

### Integration-Specific Abort Triggers

| Trigger              | Detection                           | Action                            |
| -------------------- | ----------------------------------- | --------------------------------- |
| Max retries exceeded | 3+ failures on same phase           | Abort with 'max_retries_exceeded' |
| User requests abort  | User says 'stop', 'cancel', 'abort' | Abort with 'user_requested'       |
| P0 unfixable         | Cannot implement P0 requirement     | Abort with 'p0_unfixable'         |
| Vendor API down      | API returns 5xx consistently        | Abort with 'vendor_unavailable'   |
| Context exhausted    | Token threshold exceeded            | Abort with 'context_exhausted'    |

### Abort Procedure

1. **Stop pending agents** - Do not spawn new Task calls
2. **Preserve partial work**:
   ```bash
   git stash push -m 'integration-abort-{vendor}-{timestamp}'
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

On abort or failure, write to MANIFEST.yaml:

```yaml
abort_state:
  reason: "{abort_reason}"
  phase_at_abort: { N }
  completed_phases: [1, 2, ..., N-1]
  pending_phases: [N, N+1, ...]
  files_created:
    - backend/pkg/integrations/{vendor}/client.go
    - backend/pkg/integrations/{vendor}/collector/collector.go
  p0_compliance_status:
    VMFilter: "implemented"
    CheckAffiliation: "missing" # If this caused abort
    errgroup: "implemented"
  git_stash_ref: "stash@{0}"
  recovery_command: "Resume from Phase {N}"
```

---

## Rollback Strategies

| Strategy           | When to Use                | Procedure                                       |
| ------------------ | -------------------------- | ----------------------------------------------- |
| **Phase rollback** | Single phase failed        | Delete phase outputs, mark as 'pending', re-run |
| **P0 rollback**    | P0 compliance failed       | Return to Phase 8, fix specific P0 issue        |
| **Full rollback**  | Fundamental approach wrong | `git stash pop` or start fresh                  |

---

## Rationalization Prevention

If you detect rationalization phrases ('P0 can wait', 'We can add VMFilter later'):

1. STOP
2. Return to phase checklist
3. P0 is NON-NEGOTIABLE

**See:** [orchestration-guards.md](orchestration-guards.md) for rationalization table.

---

## Related References

- [emergency-abort.md](emergency-abort.md) - Full abort protocol
- [orchestration-guards.md](orchestration-guards.md) - Retry limits and escalation
- [p0-compliance.md](p0-compliance.md) - P0 requirements
- [checkpoint-configuration.md](checkpoint-configuration.md) - Human checkpoint protocol
