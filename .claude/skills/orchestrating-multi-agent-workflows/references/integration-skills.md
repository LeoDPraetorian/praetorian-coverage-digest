# Integration with Other Skills

This document details how orchestrating-multi-agent-workflows integrates with other skills in the platform.

## Skill Invocation Key

| Annotation | Location                 | Invocation                                   |
| ---------- | ------------------------ | -------------------------------------------- |
| (CORE)     | `.claude/skills/`        | `Skill("skill-name")`                        |
| (LIBRARY)  | `.claude/skill-library/` | `Read(".claude/skill-library/.../SKILL.md")` |

## Called By

| Skill                                    | Type                                                                                                               | Purpose                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `orchestrating-feature-development`      | (LIBRARY) `Read(".claude/skill-library/development/orchestrating-feature-development/SKILL.md")`                   | Uses effort scaling, delegation patterns, and feedback loops for complete feature development |
| `orchestrating-capability-development`   | (LIBRARY) `Read(".claude/skill-library/development/capabilities/orchestrating-capability-development/SKILL.md")`   | Uses delegation patterns and parallel execution for security capability development           |
| `orchestrating-integration-development`  | (LIBRARY) `Read(".claude/skill-library/development/integrations/orchestrating-integration-development/SKILL.md")`  | Uses multi-agent coordination for third-party API integration                                 |
| `orchestrating-fingerprintx-development` | (LIBRARY) `Read(".claude/skill-library/development/capabilities/orchestrating-fingerprintx-development/SKILL.md")` | Uses parallel execution and blocking gates for fingerprintx module development                |
| `orchestrating-research`                 | (LIBRARY) `.claude/skill-library/research/orchestrating-research/SKILL.md`                                         | Uses agent synthesis and result handling for research workflows                               |

## Requires (invoke at orchestration start)

| Skill                                 | Type   | When                     | Purpose                                                                    |
| ------------------------------------- | ------ | ------------------------ | -------------------------------------------------------------------------- |
| `persisting-agent-outputs`            | (CORE) | Before first agent spawn | Set up output directory structure, MANIFEST.yaml schema for state tracking |
| `persisting-progress-across-sessions` | (CORE) | Complex/long tasks       | Enable resume protocol and compaction for long-running orchestrations      |

## Calls (during orchestration)

| Skill                            | Type                                                                               | Trigger                 | Purpose                                                |
| -------------------------------- | ---------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------ |
| `developing-with-subagents`      | (CORE)                                                                             | 3+ independent tasks    | Same-session parallel execution with code review gates |
| `dispatching-parallel-agents`    | (CORE)                                                                             | 3+ independent failures | Parallel debugging of independent test failures        |
| `finishing-a-development-branch` | (LIBRARY) `.claude/skill-library/workflow/finishing-a-development-branch/SKILL.md` | Workflow complete       | Branch cleanup, PR creation options                    |

## Pairs With

| Skill                         | Type   | Relationship                                                       |
| ----------------------------- | ------ | ------------------------------------------------------------------ |
| `writing-plans`               | (CORE) | Create detailed implementation plan before orchestrating execution |
| `brainstorming`               | (CORE) | Design exploration and refinement before implementation            |
| `verifying-before-completion` | (CORE) | Embedded in all agent prompts for exit criteria verification       |
| `iterating-to-completion`     | (CORE) | INTRA-task loops (vs this skill's INTER-phase feedback loops)      |

## Skill Invocation Hierarchy

```
orchestrating-multi-agent-workflows (orchestrator)
├── persisting-agent-outputs (setup)
├── persisting-progress-across-sessions (optional, for long tasks)
├── Spawned agents:
│   ├── *-lead (architecture decisions)
│   ├── *-developer (implementation)
│   ├── *-reviewer (quality gates)
│   └── *-tester (verification)
└── Post-orchestration:
    └── finishing-a-development-branch (cleanup)
```

## Coordination Patterns

### Shared State

All spawned agents share:

- OUTPUT_DIRECTORY from `persisting-agent-outputs`
- MANIFEST.yaml for unified state tracking (orchestration state, artifact tracking, phase status, workflow metadata)
- Per-agent .md files with embedded JSON metadata (verification and result extraction)

### Communication Protocol

Agents return structured JSON with:

- `status`: complete | blocked | needs_review | needs_clarification
- `blocked_reason`: Specific blocker type for routing
- `artifacts`: Created files
- `next_agent`: Optional routing suggestion

Orchestrator uses this output + Agent Routing Table to determine next steps.
