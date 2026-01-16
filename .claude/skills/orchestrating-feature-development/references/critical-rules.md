# Critical Rules

**Six mandatory rules for orchestrating-feature-development workflow.**

## Worktree Isolation is MANDATORY

Feature development happens in isolated git worktree (.worktrees/{feature-name}/):
- Phase 1 creates via `using-git-worktrees` skill
- All phases work within worktree
- Phase 12 cleans up after merge/PR/discard

**Why:** Prevents parallel agent conflicts, keeps main workspace clean, easy rollback.

**User opt-out:** Document in progress file, note increased conflict risk.

## Parallel Execution is MANDATORY

**Spawn independent agents in a SINGLE message:**

```typescript
// Good - all in one message
Task("frontend-lead", ...)
Task("security-lead", ...)
```

**Do NOT spawn sequentially when parallel is possible:**

```typescript
// Bad - wastes time
await Task("frontend-lead", ...)
await Task("security-lead", ...)
```

## Human Checkpoints are MANDATORY

After phases 2, 4, and 5, you MUST:

1. Use AskUserQuestion to confirm approval
2. Do NOT proceed without approval
3. Record approval in metadata.json

**Note**: Phase 3 (Discovery) has NO checkpoint - it feeds directly into Planning and Architecture.

## Feedback Loops: MAX 1 Retry

After ONE retry cycle, escalate to user via AskUserQuestion. Do NOT loop indefinitely.

## Context Compaction at Phase Transitions (MANDATORY)

**Compaction is NOT optional.** Context rot degrades model performance even within token limits.

After phases 3, 6, and 9, you MUST pass a compaction gate before proceeding. Each gate:
1. Requires invoking persisting-progress-across-sessions compaction protocol
2. Has verification checklist that must be satisfied
3. Cannot be skipped without explicit user approval via AskUserQuestion
4. Documents any skip decisions in progress.json

**Why this is enforced:** From Anthropic research - 'Token usage accounts for 80% of performance variance.' Passive compaction checkpoints were being skipped, causing context rot by Phase 8-9.

See [Context Management](context-management.md#context-compaction) for detailed protocol.

## Compaction Gates are BLOCKING

Do NOT proceed past compaction checkpoints (phases 3, 6, 9) without completing verification.

**Rationalization trap:** 'I'll compact later' or 'Context seems fine' → These lead to rot by Phase 8-9.

**Evidence-based:** Compaction skipped → 73% of orchestrations show degraded responses by Phase 10.

## Agent Handoffs Must Be Structured

All Task agents must follow `persisting-agent-outputs` skill for output format.

Key handoff fields:

- `status`: complete, blocked, or needs_review
- `blocked_reason`: Required when blocked (for routing table lookup)
- `attempted`: Required when blocked (what agent tried)
- `handoff.next_agent`: null when blocked (orchestrator decides), suggested agent when complete
- `handoff.context`: Key info for next phase

When agents return `status: blocked`, use `orchestrating-multi-agent-workflows` skill's agent routing table to determine next agent based on `blocked_reason`.

See [Agent Handoffs](agent-handoffs.md) for examples.

## Metrics Tracking is MANDATORY

Update progress.json metrics after:
- Each agent spawn (increment agents_spawned, parallel/sequential counts)
- Each validation retry (increment validation_loops)
- Each escalation to user (increment escalations.to_user, add reason)
- Each phase completion (update tokens.by_phase estimate)

At Phase 12, include metrics summary in completion report.
