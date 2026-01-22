# Orchestration Guards

**Foundation reference:** `orchestrating-multi-agent-workflows` lines 265-294, references/orchestration-guards.md

## Retry Limits

**Configuration:** Uses `inter_phase` and `orchestrator` sections from `.claude/config/orchestration-limits.yaml`

| Phase | Loop Type            | Limit Source                                | Default | Escalation                                    |
| ----- | -------------------- | ------------------------------------------- | ------- | --------------------------------------------- |
| 6     | Implementation fixes | inter_phase.implementation_retry_limit      | 2       | Spawn debugger or escalate to user            |
| 7     | P0 compliance fixes  | orchestrator.requirement_compliance_retries | 2       | 🛑 Human Checkpoint (fix, defer, or abort)    |
| 8     | Code review fixes    | inter_phase.review_retry_limit              | 1       | Escalate to user with review.md history       |
| 9     | Test fixes           | orchestrator.test_fix_retries               | 2       | Spawn dispatching-parallel-agents or escalate |

**Precedence:** Skill-specific override > config file > hardcoded fallback

**Critical:** Do NOT override config values unilaterally. To change limits, update config file or use AskUserQuestion.

## Failure Definition

A failure is ANY non-passing result:

- Phase 9: ANY P0 requirement violation
- Phase 10: CHANGES_REQUESTED or BLOCKED verdict
- Phase 11: ANY test failure, coverage <80%, or flaky tests

**Flaky tests count as failures.** Do NOT retry hoping for 'lucky pass' - fix the flake or escalate.

## Iteration Persistence

Iteration counts persist in MANIFEST.yaml `agents_contributed` array, not agent memory. Each agent execution increments iteration count for that phase+tool.

**Critical:** Renaming the task, changing approach, or spawning new agents does NOT reset counters. Only user-approved 'Revise approach' (via escalation) resets iteration counts.

**MANIFEST.yaml tracking:**

```yaml
agents_contributed:
  - agent: tool-reviewer
    artifact: tools/get-issue/review.md
    timestamp: 2026-01-19T10:30:00Z
    status: changes_requested
    iteration: 1
  - agent: tool-developer
    artifact: get-issue.ts
    timestamp: 2026-01-19T11:00:00Z
    status: complete
    iteration: 1 # Fix iteration
  - agent: tool-reviewer
    artifact: tools/get-issue/review.md
    timestamp: 2026-01-19T11:30:00Z
    status: changes_requested
    iteration: 2 # Retry iteration
  # Next review would exceed limit (review_retry_limit=1)
```

## Escalation Protocol

**Foundation Pattern**: orchestrating-multi-agent-workflows lines 413-428

When retry limit reached:

**Step 1:** Document failure history

- List all iterations with timestamps, verdicts, issues identified
- Identify recurring vs one-time issues
- Determine if issue is: skill gap, architectural flaw, or external blocker

**Step 2:** Use AskUserQuestion with explicit options:

- Fix manually (orchestrator attempts direct fix, may burn final retry)
- Spawn debugger agent (for complex issues requiring investigation)
- Revise approach (resets iteration counter, requires new architecture)
- Defer to later (document in MANIFEST.yaml gate_override)
- Abort workflow (safe termination via emergency-abort.md pattern)

**Example escalation prompt:**
'Phase 10 code review retry limit reached for get-issue wrapper (2 iterations). Issues: (1) Token optimization insufficient, (2) Error handling incomplete. Options: Fix manually (risky, last attempt), Spawn debugger (investigate root cause), Revise approach (redesign wrapper), Defer, or Abort?'

## Safety Boundaries

**NEVER loop indefinitely.** All feedback loops have maximum retry limits. If you detect yourself thinking:

- 'Just one more try'
- 'This time it will pass'
- 'Let me adjust the test expectations'
- 'I'll rename this retry so it doesn't count'

**STOP.** You're rationalizing. Follow escalation protocol immediately.
