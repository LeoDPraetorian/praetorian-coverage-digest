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

## Related References

- [Phase 5: Implementation](phase-5-implementation.md)
- [Agent Handoffs](agent-handoffs.md)
