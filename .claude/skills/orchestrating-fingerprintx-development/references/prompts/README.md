# Fingerprintx Development Prompt Templates

This directory contains prompt templates for orchestrating fingerprintx module development.

## Hybrid Pattern

This orchestrator uses a **hybrid pattern** combining two approaches:

| Pattern              | Phases    | How It Works                                                             |
| -------------------- | --------- | ------------------------------------------------------------------------ |
| **Skill-Invocation** | 3, 4, 7.4 | Orchestrator reads library skill via Read tool, follows instructions     |
| **Agent-Dispatch**   | 5, 6      | Orchestrator spawns specialized agent via Task tool with prompt template |

## Agent Prompt Templates

### Phase 5: Implementation → capability-developer

**Template**: [developer-prompt.md](developer-prompt.md)

**Spawning Example**:

```typescript
Task({
  subagent_type: "capability-developer",
  description: "Implement MySQL fingerprintx plugin",
  prompt: `[developer-prompt.md template filled in]`,
});
```

**Mandatory Skills in Prompt**:

- `writing-fingerprintx-modules` - Core implementation patterns
- `developing-with-tdd` - Write tests first
- `verifying-before-completion` - Verify before claiming done
- `persisting-agent-outputs` - Output file format

### Phase 6: Testing → capability-tester

**Template**: [tester-prompt.md](tester-prompt.md)

**Spawning Example**:

```typescript
Task({
  subagent_type: "capability-tester",
  description: "Write tests for MySQL fingerprintx plugin",
  prompt: `[tester-prompt.md template filled in]`,
});
```

**Mandatory Skills in Prompt**:

- `writing-fingerprintx-tests` - Test patterns (table-driven, mocks)
- `developing-with-tdd` - TDD discipline
- `persisting-agent-outputs` - Output file format

## Skill-Invocation Phases (Read tool)

For research phases, the orchestrator reads library skills directly:

### Phase 3: Protocol Research (BLOCKING)

```
Read('.claude/skill-library/research/researching-protocols/SKILL.md')
```

**Gate Checklist**:

- Protocol detection strategy documented
- Detection probes identified
- Response validation patterns documented
- Lab environment tested
- False positive mitigation addressed

### Phase 4: Version Marker Research (CONDITIONAL)

**Skip if**: Closed-source service

```
Read('.claude/skill-library/research/researching-version-markers/SKILL.md')
```

**Gate Checklist**:

- Version Fingerprint Matrix exists
- At least 3 version ranges distinguishable
- Marker categories documented
- Confidence levels assigned
- CPE format defined

### Phase 7.4: Live Validation (BLOCKING)

```
Read('.claude/skill-library/development/capabilities/validating-fingerprintx-live/SKILL.md')
```

**Gate Checklist**:

- ≥80% detection rate on live Shodan targets
- Validation report generated
- False positives documented

## Blocked Status Handling

When agents return blocked status, use `orchestrating-multi-agent-workflows` routing table:

| blocked_reason       | Route To                              |
| -------------------- | ------------------------------------- |
| unclear_protocol     | Return to Phase 3 (Protocol Research) |
| missing_research     | Return to appropriate research phase  |
| test_failures        | capability-tester to fix or escalate  |
| technical_limitation | Escalate to user via AskUserQuestion  |

## Output Format

All agents should produce outputs with this JSON metadata structure:

```json
{
  "agent": "[agent-type]",
  "output_type": "[type]",
  "protocol": "[PROTOCOL_NAME]",
  "skills_invoked": ["list of skills used"],
  "status": "complete|blocked",
  "handoff": {
    "next_agent": "[agent or null]",
    "context": "Key information for next phase"
  }
}
```

## Why Hybrid Pattern?

- **Research phases** benefit from skill-invocation because:
  - The orchestrator needs to understand the research results
  - Gate decisions require orchestrator judgment
  - Research is sequential and context-dependent

- **Implementation/Testing phases** benefit from agent-dispatch because:
  - `capability-developer` has specialized Go/fingerprintx knowledge
  - `capability-tester` has specialized testing knowledge
  - Work can be done independently with clear handoffs
  - Mandatory skills are embedded in prompts for accountability
