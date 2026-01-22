# Orchestration Guards

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
  "phase": "review",
  "retry_count": 1,
  "max_retries": 2,
  "last_failure": "Spec compliance: missing error handling"
}
```

### Failure Definition

A failure is ANY non-passing result from Review or Test phases:

| Result Type              | Counts as Failure? | Action                                       |
| ------------------------ | ------------------ | -------------------------------------------- |
| Flaky test failure       | ✅ YES             | Fix the flakiness, not retry hoping for pass |
| Partial pass (3/5 tests) | ✅ YES             | All tests must pass                          |
| Infrastructure failure   | ✅ YES             | Fix infrastructure or escalate               |
| Review with minor issues | ✅ YES             | Address issues, don't dismiss                |
| Timeout                  | ✅ YES             | Investigate root cause                       |

**Flaky Test Protocol:**

1. Flaky failure counts toward iteration limit
2. Fix flakiness (stabilize test) rather than retry
3. If flakiness cannot be fixed, escalate with "flaky test" documented
4. Do NOT retry hoping for "lucky pass" - this is rationalization

**What is NOT a failure:**

- Successful pass (even if output differs from expectation)
- Explicitly skipped phases (with user approval)

### Iteration Counter Persistence

Iteration counts persist in **progress files**, not in agent memory:

```json
{
  "feedback_loop": {
    "iteration": 3,
    "max_iterations": 5,
    "started_at": "2026-01-17T10:00:00Z",
    "last_updated": "2026-01-17T10:45:00Z"
  }
}
```

**Counter Reset Rules:**

- Renaming the task does NOT reset counter
- Changing approach does NOT reset counter
- Spawning new agents does NOT reset counter
- New context window does NOT reset counter (read from progress file)
- Only user-approved "Revise approach" (from escalation menu) resets counter

**Reset requires explicit user approval:**

```typescript
// When user selects "Revise approach" from escalation
{
  "counter_reset": {
    "reason": "user_approved_revise_approach",
    "previous_iterations": 4,
    "approved_at": "2026-01-17T11:00:00Z",
    "new_approach": "Switching from polling to websockets"
  }
}
```

**Gaming detection:** If progress file shows iteration < TodoWrite iteration count, flag inconsistency and escalate.

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

### Checkpoint Question Template

```typescript
AskUserQuestion({
  questions: [
    {
      question: "[Phase] complete. Review before proceeding to [next phase]?",
      header: "[Phase]",
      multiSelect: false,
      options: [
        { label: "Approve", description: "Proceed to [next phase]" },
        { label: "Request changes", description: "Modify before proceeding" },
        { label: "Review details", description: "Show me [artifacts]" },
        { label: "Pause", description: "Stop here, resume later" },
      ],
    },
  ],
});
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

## Rationalization Prevention

### Common Rationalizations

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

### Override Protocol

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
