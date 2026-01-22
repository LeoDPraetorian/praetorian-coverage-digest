# Orchestration Guards (Fingerprintx Development)

Protocols for preventing infinite loops, managing retries, and ensuring human oversight.

## Retry Limits with Escalation

**NEVER loop indefinitely.** All feedback loops have maximum retry limits.

### Default Retry Limits

Values from `.claude/config/orchestration-limits.yaml`:

| Loop Type              | Config Path                                 | Default | Then             |
| ---------------------- | ------------------------------------------- | ------- | ---------------- |
| Requirement compliance | orchestrator.requirement_compliance_retries | 2       | Escalate to user |
| Quality fixes          | orchestrator.quality_fix_retries            | 2       | Escalate to user |
| Test/validation fixes  | orchestrator.test_fix_retries               | 2       | Escalate to user |

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
        { label: "Proceed anyway", description: "Accept current state" },
        { label: "Revise approach", description: "Change strategy" },
        { label: "Cancel", description: "Stop workflow" },
      ],
    },
  ],
});
```

### Failure Definition

A failure is ANY non-passing result:

| Result Type             | Counts as Failure? | Action                      |
| ----------------------- | ------------------ | --------------------------- |
| Go compilation error    | YES                | Fix the code                |
| Interface not satisfied | YES                | Implement missing methods   |
| Test failure            | YES                | Fix test or implementation  |
| Flaky test failure      | YES                | Fix the flakiness           |
| Docker startup failure  | YES                | Fix environment or escalate |

### Iteration Counter Persistence

Iteration counts persist in **progress files**, not agent memory:

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
- Only user-approved "Revise approach" resets counter

## Human Checkpoint Framework

### When to Add Checkpoints

Add mandatory human checkpoints when:

- **Protocol choice**: Which protocol version to support
- **Detection threshold**: Accuracy vs false positive trade-off
- **Architecture decision**: Probe design, response parsing approach
- **Point of no return**: Before significant implementation starts

### Checkpoint Protocol

1. Use AskUserQuestion with clear options
2. Record approval in progress tracking
3. Do NOT proceed without explicit approval
4. If user selects 'pause', document state for resume

## Fingerprintx-Specific Rationalizations

| Rationalization                               | Reality                             | Response                     |
| --------------------------------------------- | ----------------------------------- | ---------------------------- |
| "This protocol is simple, skip brainstorming" | All protocols have edge cases       | Always brainstorm first      |
| "Tests can come later"                        | TDD is required for fingerprintx    | Write tests first            |
| "Version detection isn't important"           | It's a core requirement             | Implement version extraction |
| "Docker is too slow, skip integration tests"  | Integration tests catch real issues | Run Docker tests             |
| "The probe works on my machine"               | Need portable implementation        | Test in clean environment    |

## Detection Protocol

If you detect rationalization phrases in your thinking:

1. **STOP** - Do not proceed
2. **Return to checklist** - Review phase requirements
3. **Complete all items** - No exceptions
4. **If genuinely blocked** - Use clarification protocol, not skip

## Override Protocol

If workflow MUST deviate from standard process:

1. Use AskUserQuestion to propose deviation
2. Explain specific risk and trade-off
3. Present alternatives considered
4. Document user's explicit decision
5. Proceed only with approval

**All overrides must be documented in progress tracking with rationale.**

## Related References

- [error-recovery.md](error-recovery.md) - Recovery from failures
- [escalation-protocol.md](escalation-protocol.md) - Routing blocked agents
- [checkpoint-configuration.md](checkpoint-configuration.md) - Human approval points
