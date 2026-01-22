# Effort Scaling (Integration Development)

Match agent count to integration complexity. Multi-agent systems use ~15x more tokens than single-agent chat—ensure the complexity justifies the cost.

## Scaling Tiers

| Complexity   | Agents           | Tool Calls               | Examples                                         |
| ------------ | ---------------- | ------------------------ | ------------------------------------------------ |
| **Simple**   | 1 agent directly | 3-10 calls               | Bug fix, add prop, typo fix, single endpoint     |
| **Moderate** | 2-4 agents       | 10-15 each               | Compare approaches, implement + test one feature |
| **Complex**  | 5-10 agents      | Divided responsibilities | Full integration with architecture, impl, review |
| **Major**    | 10+ agents       | Parallel phases          | Multi-vendor integration, major refactor         |

## Integration-Specific Tier Examples

| Work Type   | Typical Tier | Agent Count | Example                                         |
| ----------- | ------------ | ----------- | ----------------------------------------------- |
| **BUGFIX**  | Simple       | 1-2         | Fix pagination bug in existing integration      |
| **SMALL**   | Moderate     | 2-4         | Add new API endpoint to existing integration    |
| **MEDIUM**  | Complex      | 5-8         | New vendor integration with 2-3 endpoints       |
| **LARGE**   | Complex      | 8-10        | Complex multi-service integration               |
| **COMPLEX** | Major        | 10+         | Integration with OAuth, webhooks, and streaming |

## Decision Checklist

Before spawning multiple agents, ask:

1. **Can one agent complete this?** If yes, delegate directly (skip orchestrator)
2. **Are the subtasks truly independent?** If no, sequential/manual is better
3. **Does complexity justify 15x token cost?** Simple tasks don't need orchestration
4. **Would parallel execution save significant time?** If tasks are serial anyway, single agent may be better

## Integration-Specific Complexity Indicators

| Indicator                                  | Adds Complexity    | Agent Impact            |
| ------------------------------------------ | ------------------ | ----------------------- |
| OAuth2 authentication                      | +2 complexity      | Add security review     |
| Multiple API endpoints                     | +1 per 3 endpoints | May need parallel impl  |
| Webhook handling                           | +1 complexity      | Dedicated webhook agent |
| Rate limiting logic                        | +1 complexity      | Include in impl agent   |
| Pagination patterns                        | +0.5 complexity    | Usually same agent      |
| P0 compliance (VMFilter, CheckAffiliation) | +1 complexity      | Dedicated review agent  |

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

## Examples by Tier (Integration-Specific)

### Simple (1 agent) - BUGFIX

- "Fix pagination bug in Qualys integration"
- "Update rate limit handling in Wiz collector"
- "Fix credential validation error message"

### Moderate (2-4 agents) - SMALL

- "Add new endpoint to existing Jira integration" (implementation + tests)
- "Compare OAuth vs API key for Qualys" (research + architecture)
- "Fix VMFilter bug and add coverage tests" (debug + test)

### Complex (5-10 agents) - MEDIUM/LARGE

- "Add Shodan integration for asset discovery" (architecture + client + collector + tests + P0 review)
- "Refactor AWS integration to support new regions" (analysis + migration + tests + review)

### Major (10+ agents) - COMPLEX

- "Add ServiceNow integration with OAuth and webhooks" (planning + auth + client + collector + webhooks + tests + review)
- "Multi-cloud integration refactor" (architecture + AWS + Azure + GCP + tests + docs)

## Integration Agent Matrix

| Phase          | Agents Used           | Parallelizable                    |
| -------------- | --------------------- | --------------------------------- |
| Architecture   | integration-lead      | No                                |
| Implementation | integration-developer | Partial (client/collector)        |
| P0 Review      | integration-reviewer  | No (after impl)                   |
| Testing        | backend-tester        | Yes (unit/integration/acceptance) |

---

## Related References

- [agent-matrix.md](agent-matrix.md) - Full agent selection guide
- [p0-compliance.md](p0-compliance.md) - P0 requirements add complexity
- [phase-5-complexity.md](phase-5-complexity.md) - Complexity assessment phase
