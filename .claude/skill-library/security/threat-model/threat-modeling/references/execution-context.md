# Execution Context

**How this skill is executed within the threat modeling orchestration workflow.**

## Agent Execution

This skill is executed by the `threat-modeler` agent when spawned by the threat-modeling-orchestrator.

| Property             | Value                                       |
| -------------------- | ------------------------------------------- |
| **Executing Agent**  | `threat-modeler`                            |
| **Agent Definition** | `.claude/agents/security/threat-modeler.md` |
| **Spawned By**       | `threat-modeling-orchestrator` (Phase 5)    |
| **Execution Mode**   | Sequential (requires holistic view)         |
| **Parallelization**  | Not parallelized (single agent)             |

## Invocation Pattern

The orchestrator spawns this skill's agent as follows:

```typescript
// In threat-modeling-orchestrator, Phase 5
Task(
  "threat-modeler",
  `
  Execute threat modeling with STRIDE + PASTA + DFD methodology.

  OUTPUT_DIRECTORY: ${OUTPUT_DIR}
  CVSS_VERSION: ${config.cvssVersion}

  Load artifacts:
  - phase-1/summary.md (business context)
  - phase-3/summary.md (architecture)
  - phase-4/summary.md (security controls)

  MANDATORY SKILLS:
  - threat-modeling: Core methodology
  - scoring-cvss-threats: Score each threat
  - persisting-agent-outputs: Write to OUTPUT_DIRECTORY
`,
  "threat-modeler"
);
```

## Context Available

When executed, the agent has access to:

- **Phase 1 Business Context**: Crown jewels, threat actors, compliance requirements, business risk tolerance
- **Phase 3 Codebase Mapping**: Architecture patterns, entry points, data flows, trust boundaries, external dependencies
- **Phase 4 Security Controls**: Controls found, control gaps identified, severity ratings
- **Session Configuration**: Methodology selection (STRIDE/PASTA/DFD), CVSS version, output format preferences

## Workflow Position

```
threat-modeling-orchestrator
  ├── Phase 1: business-context-discovery → business-context-discoverer agent
  ├── Phase 2: sizing-codebases → codebase-sizer agent
  ├── Phase 3: codebase-mapping → codebase-mapper agents (parallel)
  ├── Phase 4: security-controls-mapping → security-controls-mapper agent
  ├── Phase 5: threat-modeling → threat-modeler agent ◄── THIS SKILL
  └── Phase 6: security-test-planning → security-test-planner agent
```

## Why Sequential Execution

Unlike Phase 3 (codebase mapping) or Phase 4 (security controls) which can be parallelized by component, Phase 5 threat modeling requires:

1. **Holistic View**: Cross-component threats (e.g., authentication in frontend + backend)
2. **Business Context Integration**: CVSS Environmental scoring requires crown jewel proximity
3. **Control Gap Synthesis**: Threats emerge from gaps across multiple components
4. **Attack Chain Analysis**: Multi-step attacks span architectural boundaries

Therefore, a single `threat-modeler` agent processes the complete system view.

## Agent Responsibilities

The `threat-modeler` agent must:

1. **Load Phase Artifacts**: Read all phase-1, phase-3, and phase-4 outputs
2. **Apply Methodology**: Execute STRIDE + PASTA + DFD threat identification
3. **Score Threats**: Use `scoring-cvss-threats` skill with business context
4. **Generate Artifacts**: Write threat-model.json, risk-matrix.json, summary.md
5. **Persist Outputs**: Use `persisting-agent-outputs` to write to OUTPUT_DIRECTORY

## Related Documentation

- [threat-modeling-orchestrator SKILL.md](/.claude/skill-library/security/threat-model/threat-modeling-orchestrator/SKILL.md) - Orchestrator that spawns this agent
- [threat-modeler agent definition](/.claude/agents/security/threat-modeler.md) - Agent configuration and mandatory skills
- [phase-1-integration.md](phase-1-integration.md) - How Phase 1 business context is consumed
- [output-schemas.md](output-schemas.md) - Required output artifact formats
