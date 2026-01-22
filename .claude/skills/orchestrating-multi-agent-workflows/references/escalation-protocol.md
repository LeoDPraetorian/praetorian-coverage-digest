# Escalation Protocol

> **Note**: The `orchestrating-multi-agent-workflows` skill is the single source of truth for all escalation routing logic. Individual agents return structured status with blocked reasons, and orchestrators use this skill to determine next steps.

## Decision Tree

### Escalate to User

Route to user via `AskUserQuestion` when:

- Architecture decision has major trade-offs (e.g., consistency vs availability, cost vs performance)
- Agent blocked by missing requirements or unclear specifications
- Multiple agents return conflicting recommendations
- Agent returns `blocked_reason: "unknown"` (unrecognized blocker type)
- User decision is required for business logic or policy choice

**Template**: Present options with trade-offs, highlight recommended choice, allow user override.

### Spawn Next Agent

Route to appropriate specialist agent (do NOT escalate to user) when:

- Agent returns recognized `blocked_reason` mapping to routing table
- Blocker is within current domain (e.g., backend agent blocked on backend issue)
- No user decision required - technical solution exists
- Routing table provides clear next agent

**Protocol**: Check blocked agent routing table, spawn suggested agent with context from blocked agent's output.

## Blocked Agent Routing Table

The complete routing table is maintained in `persisting-agent-outputs` skill at:
`references/blocked-agent-routing.md`

This skill USES that table as the single source of truth. The routing table is owned by the `persisting-agent-outputs` skill.

## Orchestrator Override Authority

When an agent returns `blocked` status with a suggested `next_agent` (from the routing table), the orchestrator may override this suggestion based on workflow context.

### Valid Override Scenarios

| Scenario                              | Override Action                        | Reason                     |
| ------------------------------------- | -------------------------------------- | -------------------------- |
| Multiple agents blocked on same issue | Consolidate to single specialist       | Avoid duplicate work       |
| Major architectural decision needed   | Escalate to user instead of lead agent | Business decision required |
| Blocker outside current phase scope   | Defer to next phase                    | Maintain phase boundaries  |
| Resource exhaustion (max retries)     | Escalate to user                       | Automatic routing failed   |

### Invalid Override Scenarios

| Scenario                     | Why Invalid                                      |
| ---------------------------- | ------------------------------------------------ |
| "I'll handle this myself"    | Violates orchestrator-only-coordinates principle |
| Skip routing table entirely  | Breaks consistency across workflows              |
| Escalate when routing exists | Wastes user's time on solvable issues            |

## Related Patterns

- **Blocked Agent Routing** (../persisting-agent-outputs/references/blocked-agent-routing.md) - Complete routing table (source of truth)
- **Orchestration Guards** (references/orchestration-guards.md) - Retry limits before escalation
- **Human Checkpoints** (references/checkpoint-configuration.md) - Strategic approval points
