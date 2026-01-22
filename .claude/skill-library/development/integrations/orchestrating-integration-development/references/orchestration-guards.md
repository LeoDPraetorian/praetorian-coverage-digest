# Orchestration Guards (Integration Development)

Protocols for preventing infinite loops, managing retries, and ensuring human oversight at critical decision points.

## Retry Limits with Escalation

**NEVER loop indefinitely.** All feedback loops have maximum retry limits.

### Default Retry Limits

Values from `.claude/config/orchestration-limits.yaml` (`orchestrator` section):

| Loop Type              | Config Path                                 | Default | Then             |
| ---------------------- | ------------------------------------------- | ------- | ---------------- |
| Requirement compliance | orchestrator.requirement_compliance_retries | 2       | Escalate to user |
| Quality fixes          | orchestrator.quality_fix_retries            | 2       | Escalate to user |
| Test/validation fixes  | orchestrator.test_fix_retries               | 2       | Escalate to user |

> **Scope**: These are PATTERN-LEVEL retries (re-invoke entire feedback loop). For WITHIN-LOOP limits, see `inter_phase` section in config file.

### Escalation Protocol

After MAX retries exceeded, use AskUserQuestion:

```typescript
AskUserQuestion({
  questions: [
    {
      question: "[Phase/Task] still failing after [N] attempts. How to proceed?",
      header: "[Phase]",
      multiSelect: false,
      options: [
        { label: "Show issues", description: "Review failure details" },
        { label: "Proceed anyway", description: "Accept current state, document known issues" },
        { label: "Revise approach", description: "Change strategy or requirements" },
        { label: "Cancel", description: "Stop workflow" },
      ],
    },
  ],
});
```

### Retry Tracking

Track retry counts in progress:

```json
{
  "phase": "p0_compliance",
  "retry_count": 1,
  "max_retries": 2,
  "last_failure": "P0 compliance: missing VMFilter check"
}
```

## Integration-Specific Rationalizations

**CRITICAL: These are common rationalizations in integration development. Stop immediately if you catch yourself thinking them.**

| Rationalization                               | Detection Phrases                                   | Why It's Wrong                                   | Prevention                                    |
| --------------------------------------------- | --------------------------------------------------- | ------------------------------------------------ | --------------------------------------------- |
| "P0 doesn't apply to this simple integration" | "simple", "small", "just a few endpoints"           | P0 ALWAYS applies to ALL integrations            | Check p0-compliance.md before any impl        |
| "I'll add CheckAffiliation later"             | "later", "after", "second pass"                     | CheckAffiliation must be present from start      | Block implementation without CheckAffiliation |
| "VMFilter is overkill for this"               | "overkill", "unnecessary", "small data"             | Required for ALL integrations regardless of size | No merge without VMFilter                     |
| "This vendor doesn't need rate limiting"      | "fast API", "no limits", "won't hit"                | All external APIs need rate limit handling       | Require rate limit in client.go               |
| "errgroup adds complexity"                    | "too complex", "single goroutine", "simpler"        | Required for proper error handling in collectors | Block without errgroup pattern                |
| "I'll write tests after implementation"       | "tests later", "verify manually", "obviously works" | TDD - tests first, then implementation           | Block impl without failing test               |
| "The existing integration doesn't do this"    | "other integrations don't", "pattern from X"        | Bad patterns shouldn't propagate                 | Follow P0, not existing code                  |

## General Rationalizations

| Rationalization                 | Detection Phrases                            | Prevention                            |
| ------------------------------- | -------------------------------------------- | ------------------------------------- |
| "This is simple"                | "just", "quickly", "simple", "trivial"       | Check effort scaling tier first       |
| "I'll fix it later"             | "later", "next time", "TODO", "tech debt"    | Enforce completion before proceeding  |
| "Close enough"                  | "basically", "mostly", "approximately", "~"  | Require explicit verification         |
| "User won't notice"             | "minor", "edge case", "unlikely"             | Document for user decision            |
| "Tests can wait"                | "test later", "verify manually", "obvious"   | Block on verification phase           |
| "Skip this step"                | "unnecessary", "overkill", "overhead"        | Follow checklist exactly              |
| "Being safer with lower limits" | "conservative", "safer", "stricter"          | Config values are authoritative       |
| "Limits should add together"    | "combined", "total", "plus", "3 + 2"         | Limits are hierarchical, not additive |
| "New loop, counter resets"      | "fresh start", "different approach", "reset" | Progress file is authoritative        |
| "Flaky test doesn't count"      | "flaky", "intermittent", "sometimes"         | ALL failures count toward limit       |

### Detection Protocol

If you detect rationalization phrases in your thinking:

1. **STOP** - Do not proceed
2. **Return to checklist** - Review phase requirements
3. **Complete all items** - No exceptions
4. **If genuinely blocked** - Use clarification protocol, not skip

## Human Checkpoint Framework

### When to Add Checkpoints

Add mandatory human checkpoints when:

- **Major design decisions**: Architecture, approach selection
- **Resource commitment**: Before significant implementation starts
- **Point of no return**: Before irreversible changes
- **User preferences matter**: UX decisions, trade-offs with no clear winner

### Checkpoint Protocol

1. Use AskUserQuestion with clear options
2. Record approval in progress tracking
3. Do NOT proceed without explicit approval
4. If user selects 'pause', document state for resume

### Checkpoint Metadata

```json
{
  "phase": "architecture",
  "checkpoint": true,
  "approved": true,
  "approved_at": "2025-01-11T10:30:00Z",
  "user_selection": "Option A",
  "notes": "User preferred simpler approach"
}
```

## Emergency Abort Protocol

When orchestration must stop immediately.

### Abort Triggers

- User requests stop
- Unrecoverable error detected
- Agent in infinite loop (same failure 5+ times)
- Context window exhausted
- MAX_RETRIES exceeded on critical path

### Abort Procedure

1. **Stop all pending agents** - Do not spawn new tasks
2. **Document state** - Write current progress to file
3. **Preserve work** - `git stash` uncommitted changes
4. **Notify user** - Via AskUserQuestion with status summary

### State Preservation Format

```json
{
  "abort_reason": "max_retries_exceeded | user_requested | unrecoverable_error",
  "phase_at_abort": "implementation",
  "completed_phases": ["architecture"],
  "pending_work": ["testing", "review"],
  "uncommitted_changes": true,
  "recovery_instructions": "Resume from implementation phase"
}
```

## Override Protocol

If workflow MUST deviate from standard process:

1. Use AskUserQuestion to propose deviation
2. Explain specific risk and trade-off
3. Present alternatives considered
4. Document user's explicit decision
5. Proceed only with approval

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Proposing to skip [step]. Risk: [specific risk]. Proceed?",
      header: "Override",
      options: [
        { label: "Skip with documented risk", description: "[trade-off explanation]" },
        { label: "Don't skip", description: "Complete step as designed" },
      ],
    },
  ],
});
```

**All overrides must be documented in progress tracking with rationale.**

---

## Related References

- [rationalization-table.md](rationalization-table.md) - Full rationalization patterns
- [p0-compliance.md](p0-compliance.md) - P0 requirements that cannot be skipped
- [emergency-abort.md](emergency-abort.md) - Detailed abort procedures
