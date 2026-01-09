# Context Management

## Fresh Subagent Per Task

Each Task dispatch creates a **NEW agent instance**. This is intentional:

- **No context pollution**: Previous phase details don't confuse current phase
- **Clean slate**: Each agent starts with only the context you provide
- **Parallel safe**: Multiple agents (if used) can work without interference

## DO NOT

- Manually fix agent work (pollutes your context)
- Ask agent to "continue" previous work (context lost)
- Reuse agent instance across phases (context accumulates)

## If Agent Fails

Dispatch **NEW fix agent** with specific instructions:

```
Task(
  subagent_type: "capability-developer",
  description: "Fix issue in Phase N",
  prompt: "
    Previous implementation had this issue: [specific issue from review]

    Fix ONLY this issue. Do not refactor other code.

    Context:
    - Protocol Research: [paste relevant sections]
    - Version Matrix: [if applicable]
    - Review Feedback: [specific issues to address]

    MANDATORY SKILLS:
    - writing-fingerprintx-modules
    - developing-with-tdd
    - verifying-before-completion
    - persisting-agent-outputs

    OUTPUT_DIRECTORY: [FEATURE_DIR]
  "
)
```

Do NOT try to guide the failed agent through fixes.

## Phase Isolation

Each phase receives ONLY the context it needs:

| Phase | Receives | Does NOT Receive |
|-------|----------|------------------|
| Protocol Research | Requirements.md | Nothing (fresh start) |
| Version Markers | Requirements.md, protocol-research.md | Nothing else |
| Implementation | Requirements.md, protocol-research.md, version-matrix.md | Previous implementation attempts |
| Testing | Plugin location, protocol spec | Implementation logs (focuses on behavior) |
| Code Review | All research + implementation | Test results (focuses on code quality) |
| Validation | All artifacts | Review feedback (focuses on real-world testing) |

**Rationale**: Agents work best with focused context. Including "everything" leads to distraction and scope creep.

## Related References

- [Phase 5: Implementation](../orchestrating-fingerprintx-development/SKILL.md#phase-5-implementation)
- [Phase 6.5: Code Review](phase-6.5-code-review.md)
- [Agent Handoffs](../orchestrating-feature-development/references/agent-handoffs.md)
