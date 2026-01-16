# Context Management

## Fresh Subagent Per Task

Each Task dispatch creates a **NEW agent instance**. This is intentional:

- **No context pollution**: Previous task details don't confuse current task
- **Clean slate**: Each agent starts with only the context you provide
- **Parallel safe**: Multiple agents can work without interference

## DO NOT

- Manually fix agent work (pollutes your context)
- Ask agent to "continue" previous work (context lost)
- Reuse agent instance across tasks (context accumulates)

## If Agent Fails

Dispatch **NEW fix agent** with specific instructions:

```
Task(
  description: "Fix issue in Task N",
  prompt: "
    Previous implementation had this issue: [specific issue from review]

    Fix ONLY this issue. Do not refactor other code.

    [Provide full context: plan, architecture, review feedback]
  "
)
```

Do NOT try to guide the failed agent through fixes.

## Context Compaction

### Why Compaction During Orchestration

12-phase orchestration generates significant context:
- Phase 3 Discovery: 3+ agent outputs with findings
- Phase 5 Architecture: Detailed design documents
- Phase 6 Implementation: Code changes, logs
- Phase 8 Review: Multiple reviewer outputs
- Phase 10 Testing: 3 tester outputs

Without compaction, context rot degrades performance by Phase 8-9.

### Compaction Checkpoints

| After Phase | What to Compact | What to Keep |
|-------------|-----------------|--------------|
| 3 (Discovery) | Full discovery findings | Key patterns, file placement summary |
| 6 (Implementation) | Full implementation log | Files modified, key decisions |
| 9 (Test Planning) | Full test plan details | Test strategy summary, coverage targets |

### Compaction Protocol

At each checkpoint:

1. **Update progress file** with full details
2. **Verify write succeeded** before proceeding
3. **Summarize in context** (2-3 lines per completed phase)
4. **Preserve** current phase details and key decisions
5. **Reference files** instead of inline content

### Example: Post-Phase-6 Compaction

**Before compaction:**
- Full Phase 1-6 details in context
- All agent outputs inline
- Discovery findings (800+ tokens)
- Architecture document (1200+ tokens)
- Implementation log (1500+ tokens)

**After compaction:**
```
Phases 1-6 COMPLETE:
- Design: User dashboard with 3 metrics widgets (design.md)
- Discovery: TanStack Query patterns, MSW testing (discovery.md)
- Plan: 4 tasks, all completed (plan.md)
- Architecture: Compound component pattern (architecture.md)
- Implementation: Dashboard.tsx, 3 widgets created (implementation-log.md)

Current: Phase 7 (Plan Completion Review)
Key files: src/sections/dashboard/Dashboard.tsx, src/sections/dashboard/widgets/
```

### Invoke persisting-progress-across-sessions

At compaction checkpoints, the orchestrator should:

1. Read the `persisting-progress-across-sessions` skill
2. Follow the Context Compaction Protocol section
3. Use the compaction checklist before proceeding

### Enforcement

Compaction is enforced via blocking gates in the main skill. You cannot proceed past phases 3, 6, or 9 without:
1. Completing the compaction protocol
2. Verifying all checklist items
3. OR getting explicit user approval to skip (with risk disclosure)

This prevents the common failure mode where compaction is 'documented but not done.'

## Related References

- [Phase 5: Implementation](phase-6-implementation.md)
- [Agent Handoffs](agent-handoffs.md)
