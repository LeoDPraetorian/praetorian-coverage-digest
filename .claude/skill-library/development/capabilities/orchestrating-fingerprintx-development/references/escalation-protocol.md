# Escalation Protocol (Fingerprintx Development)

Decision tree for routing blocked agents and escalating to users.

## Decision Tree

### Escalate to User

Route to user via `AskUserQuestion` when:

- Architecture decision has major trade-offs (e.g., probe complexity vs accuracy)
- Agent blocked by missing protocol specifications
- Multiple agents return conflicting recommendations
- Agent returns `blocked_reason: "unknown"`
- User decision is required for detection threshold or accuracy trade-offs

**Template**: Present options with trade-offs, highlight recommended choice, allow user override.

### Spawn Next Agent

Route to appropriate specialist agent (do NOT escalate to user) when:

- Agent returns recognized `blocked_reason` mapping to routing table
- Blocker is within current domain (fingerprintx/Go development)
- No user decision required - technical solution exists
- Routing table provides clear next agent

## Fingerprintx-Specific Escalations

| Blocker                       | Route To                             | Escalate to User? |
| ----------------------------- | ------------------------------------ | ----------------- |
| Protocol spec unclear         | Explore agent for RFC research       | No                |
| Go interface issue            | capability-developer retry           | No                |
| Version detection unreliable  | capability-developer with research   | No                |
| Test infrastructure missing   | DevOps/user                          | Yes               |
| Multiple detection approaches | User for decision                    | Yes               |
| Protocol not documented       | User (may need alternative approach) | Yes               |

## Blocked Agent Routing Table

| blocked_reason             | next_agent           | Context to Provide                |
| -------------------------- | -------------------- | --------------------------------- |
| `missing_protocol_spec`    | Explore              | Protocol name, known ports        |
| `interface_implementation` | capability-developer | Error message, method signature   |
| `version_extraction`       | capability-developer | Sample responses, expected format |
| `test_environment`         | User                 | Docker requirements               |
| `detection_accuracy`       | capability-developer | False positive rate, samples      |

## Orchestrator Override Authority

When an agent returns `blocked` status with a suggested `next_agent`, the orchestrator may override this suggestion based on workflow context.

### Valid Override Scenarios

| Scenario                              | Override Action                   | Reason                     |
| ------------------------------------- | --------------------------------- | -------------------------- |
| Multiple agents blocked on same issue | Consolidate to single specialist  | Avoid duplicate work       |
| Major architectural decision needed   | Escalate to user instead of agent | Business decision required |
| Blocker outside current phase scope   | Defer to next phase               | Maintain phase boundaries  |
| Resource exhaustion (max retries)     | Escalate to user                  | Automatic routing failed   |

### Invalid Override Scenarios

| Scenario                     | Why Invalid                                      |
| ---------------------------- | ------------------------------------------------ |
| "I'll handle this myself"    | Violates orchestrator-only-coordinates principle |
| Skip routing table entirely  | Breaks consistency across workflows              |
| Escalate when routing exists | Wastes user's time on solvable issues            |

## Related References

- [orchestration-guards.md](orchestration-guards.md) - Retry limits before escalation
- [checkpoint-configuration.md](checkpoint-configuration.md) - Strategic approval points
