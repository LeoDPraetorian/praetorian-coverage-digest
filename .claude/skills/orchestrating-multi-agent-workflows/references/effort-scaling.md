# Effort Scaling

Match agent count to task complexity. Multi-agent systems use ~15x more tokens than single-agent chat—ensure the complexity justifies the cost.

## Scaling Tiers

| Complexity   | Agents           | Tool Calls               | Examples                                            |
| ------------ | ---------------- | ------------------------ | --------------------------------------------------- |
| **Simple**   | 1 agent directly | 3-10 calls               | Bug fix, add prop, typo fix, single component       |
| **Moderate** | 2-4 agents       | 10-15 each               | Compare approaches, implement + test one feature    |
| **Complex**  | 5-10 agents      | Divided responsibilities | Full feature with architecture, impl, review, tests |
| **Major**    | 10+ agents       | Parallel phases          | Cross-cutting refactor, new subsystem               |

## Decision Checklist

Before spawning multiple agents, ask:

1. **Can one agent complete this?** If yes, delegate directly (skip orchestrator)
2. **Are the subtasks truly independent?** If no, sequential/manual is better
3. **Does complexity justify 15x token cost?** Simple tasks don't need orchestration
4. **Would parallel execution save significant time?** If tasks are serial anyway, single agent may be better

## Interdependent Task Warning

Multi-agent systems are LESS effective for tightly interdependent tasks. Signs to watch for:

- Each step requires output from previous step (can't parallelize)
- Shared state that agents would conflict on
- Tight coupling where one change affects multiple areas
- Iterative refinement cycles (review → fix → review)

For interdependent work, prefer:

- Single agent with TodoWrite tracking
- Sequential agent spawning with explicit handoffs
- Manual orchestration with human checkpoints

## Token Cost Analysis

| Approach     | Estimated Tokens | When to Use                           |
| ------------ | ---------------- | ------------------------------------- |
| Single agent | 10-30K           | Simple, single-concern tasks          |
| 2-4 agents   | 50-100K          | Moderate complexity, clear boundaries |
| 5-10 agents  | 150-300K         | Full features, multiple concerns      |
| 10+ agents   | 300K+            | Major refactors, new subsystems       |

**Rule of thumb**: If task can be completed in <30 minutes by single agent, don't orchestrate.

## Complexity Assessment Flowchart

```
Task received
     │
     ▼
┌─────────────────────────────┐
│ Does it span 2+ concerns?   │──No──> Single agent
│ (arch, impl, test, review)  │
└─────────────────────────────┘
     │ Yes
     ▼
┌─────────────────────────────┐
│ Are concerns independent?   │──No──> Sequential agents
└─────────────────────────────┘        with handoffs
     │ Yes
     ▼
┌─────────────────────────────┐
│ Would parallel save time?   │──No──> Sequential agents
└─────────────────────────────┘
     │ Yes
     ▼
   Orchestrate with
   parallel execution
```

## Examples by Tier

### Simple (1 agent)

- "Fix the typo in README.md"
- "Add a loading spinner to the button"
- "Update the error message in login.tsx"

### Moderate (2-4 agents)

- "Add form validation to the signup page" (implementation + tests)
- "Compare Redux vs Zustand for this feature" (research + architecture)
- "Fix the pagination bug and add tests" (debug + test)

### Complex (5-10 agents)

- "Add user authentication with JWT" (architecture + backend + frontend + tests + security)
- "Refactor the asset module to use the new API" (analysis + migration + tests + review)

### Major (10+ agents)

- "Migrate from REST to GraphQL" (planning + backend + frontend + tests + docs + review)
- "Add multi-tenancy support" (architecture + database + auth + services + tests)
