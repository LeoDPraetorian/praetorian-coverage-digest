# Agent Output Validation

**Enforce mandatory skill invocation by validating agent outputs against compliance requirements.**

## Overview

Orchestrating skills embed mandatory skills in agent prompts, but agents may skip them during execution. This validation protocol detects non-compliance and triggers corrective action.

**Gap identified in**: `.claude/docs/orchestration/MULTI-AGENT-ORCHESTRATION-ARCHITECTURE.md`

**Why it matters:**

Without validation:
- Agents receive mandatory skills in prompts but may skip them
- Orchestrators have no way to detect non-compliance
- Quality degrades silently

With validation:
- Non-compliance is detected immediately
- Agents get explicit retry with clear requirements
- Persistent non-compliance escalates to user

## Mandatory Skills by Agent Type

These skills MUST appear in every agent's `skills_invoked` array:

| Agent Type          | Mandatory Skills                                                            |
| ------------------- | --------------------------------------------------------------------------- |
| \*-lead (architects) | adhering-to-dry, adhering-to-yagni, persisting-agent-outputs                |
| \*-developer         | developing-with-tdd, verifying-before-completion, persisting-agent-outputs  |
| \*-tester            | developing-with-tdd, verifying-before-completion, persisting-agent-outputs  |
| \*-reviewer          | persisting-agent-outputs                                                    |
| \*-security          | persisting-agent-outputs                                                    |
| test-lead            | persisting-agent-outputs                                                    |
| Explore              | persisting-agent-outputs                                                    |

**Pattern matching**: Replace `*` with the domain prefix (e.g., `frontend-developer` matches `*-developer` row).

## Validation Protocol

After EVERY Task agent returns, the orchestrator MUST:

1. Read the agent's output file (not just the response summary)
2. Parse the metadata JSON block at the end
3. Check that `skills_invoked` array exists and is non-empty
4. Compare `skills_invoked` against the mandatory skills table for that agent type
5. If ANY mandatory skill is missing → re-spawn with explicit instruction
6. If validation passes → proceed to next phase

### Validation Pseudo-Code

```javascript
function validateAgentOutput(agentType, outputFile) {
    metadata = parseMetadataFromFile(outputFile)

    if (!metadata.skills_invoked) {
        return { valid: false, missing: getAllMandatorySkills(agentType) }
    }

    mandatory = getMandatorySkills(agentType)
    missing = mandatory.filter(s => !metadata.skills_invoked.includes(s))

    if (missing.length > 0) {
        return { valid: false, missing: missing }
    }

    return { valid: true, missing: [] }
}
```

### Implementation Steps

**Step 1: Read output file**

```bash
cat .claude/.output/[workflow]/[agent]-output.md
```

**Step 2: Extract metadata block**

Every agent output ends with JSON metadata (per persisting-agent-outputs):

```json
{
  "agent": "frontend-developer",
  "skills_invoked": ["developing-with-tdd", "verifying-before-completion", "persisting-agent-outputs"],
  "source_files_verified": ["path:lines"],
  "status": "complete"
}
```

**Step 3: Look up mandatory skills**

```javascript
agentType = metadata.agent
mandatory = MANDATORY_SKILLS_TABLE[agentType]
```

**Step 4: Compare arrays**

```javascript
missing = mandatory.filter(skill => !metadata.skills_invoked.includes(skill))

if (missing.length > 0) {
    // Trigger re-spawn
}
```

## Re-spawn Template

When validation fails, re-spawn the agent with this template appended to the original prompt:

```markdown
---
COMPLIANCE FAILURE - RETRY REQUIRED

Your previous attempt did not invoke these mandatory skills: [LIST MISSING SKILLS]

Before completing this task, you MUST:
1. Invoke each missing skill listed above
2. Follow the skill's instructions completely
3. Document ALL invoked skills in your output metadata

Your output metadata MUST include:
{
  "skills_invoked": ["skill-1", "skill-2", ...],
  // ... other required fields
}

This is your FINAL attempt. Failure to invoke mandatory skills will escalate to user.
---
```

### Re-spawn Example

```typescript
Task({
  subagent_type: "frontend-developer",
  description: "Retry implementation with compliance",
  prompt: `
    [ORIGINAL TASK DESCRIPTION]

    ---
    COMPLIANCE FAILURE - RETRY REQUIRED

    Your previous attempt did not invoke these mandatory skills:
    - developing-with-tdd
    - verifying-before-completion

    Before completing this task, you MUST:
    1. Invoke each missing skill listed above
    2. Follow the skill's instructions completely
    3. Document ALL invoked skills in your output metadata

    Your output metadata MUST include:
    {
      "skills_invoked": ["developing-with-tdd", "verifying-before-completion", "persisting-agent-outputs"],
      // ... other required fields
    }

    This is your FINAL attempt. Failure to invoke mandatory skills will escalate to user.
    ---
  `
})
```

## Max Retry Policy

Prevent infinite loops with a three-attempt limit:

| Attempt | Behavior                                                |
| ------- | ------------------------------------------------------- |
| 1       | Normal prompt with mandatory skills listed              |
| 2       | Re-spawn with compliance failure template (after validation detects missing skills) |
| 3       | Escalate to user via AskUserQuestion with full context  |

### Retry Tracking

Track attempts in TodoWrite or progress file:

```json
{
  "phase": "implementation",
  "agent": "frontend-developer",
  "attempt": 2,
  "max_attempts": 3,
  "validation_failures": ["developing-with-tdd", "verifying-before-completion"]
}
```

### Escalation After Max Retries

```typescript
AskUserQuestion({
  questions: [{
    question: "Agent failed skill compliance after 2 attempts. How to proceed?",
    header: "Compliance",
    multiSelect: false,
    options: [
      {
        label: "Review agent output",
        description: "Show me what the agent did and didn't do"
      },
      {
        label: "Proceed anyway",
        description: "Accept current state, document known gaps"
      },
      {
        label: "Revise requirements",
        description: "Modify mandatory skills list"
      },
      {
        label: "Cancel",
        description: "Stop workflow"
      }
    ]
  }]
})
```

## Integration with Orchestration Skills

The following skills should reference this validation protocol after each Task dispatch phase:

### orchestrating-feature-development

**Integration point**: After Phase 6 (Implementation) completes, before Phase 7 (Plan Completion Review)

```markdown
### Phase 6: Implementation

1. Spawn developer agents (per-task or batch mode)
2. Wait for all agents to complete
3. **VALIDATE OUTPUTS** (per agent-output-validation.md)
4. If validation fails → re-spawn with compliance template
5. If validation passes → proceed to Phase 7
```

### orchestrating-capability-development

**Integration point**: After Phase 5 (Implementation) completes, before Phase 6 (Review)

```markdown
### Phase 5: Implementation

1. Spawn capability-developer agent
2. Wait for agent to complete
3. **VALIDATE OUTPUT** (per agent-output-validation.md)
4. If validation fails → re-spawn with compliance template
5. If validation passes → proceed to Phase 6
```

### orchestrating-integration-development

**Integration point**: After Phase 4 (Implementation) completes, before Phase 5 (P0 Validation)

```markdown
### Phase 4: Implementation

1. Spawn integration-developer agent
2. Wait for agent to complete
3. **VALIDATE OUTPUT** (per agent-output-validation.md)
4. If validation fails → re-spawn with compliance template
5. If validation passes → proceed to Phase 5
```

## Complete Validation Example

### Scenario

Orchestrator spawns frontend-developer for implementation phase.

**Agent prompt includes:**

```markdown
MANDATORY SKILLS (invoke ALL before completing):
- developing-with-tdd: Write tests before implementation
- verifying-before-completion: Verify all exit criteria
- persisting-agent-outputs: Write output to designated file
```

### Agent Returns

Orchestrator receives Task completion and reads output file:

```bash
cat .claude/.output/features/2026-01-16/frontend-developer-implementation.md
```

### Output File Content (End)

```markdown
... [implementation details] ...

---
METADATA
---
{
  "agent": "frontend-developer",
  "skills_invoked": ["persisting-agent-outputs"],
  "source_files_verified": ["src/components/AssetFilter.tsx:47"],
  "status": "complete"
}
```

### Validation

```javascript
mandatory = ["developing-with-tdd", "verifying-before-completion", "persisting-agent-outputs"]
invoked = ["persisting-agent-outputs"]
missing = ["developing-with-tdd", "verifying-before-completion"]

validation = { valid: false, missing: missing }
```

### Orchestrator Action

```markdown
❌ Validation FAILED for frontend-developer
Missing skills: developing-with-tdd, verifying-before-completion

→ Re-spawning with compliance template (Attempt 2/3)
```

### Re-spawn

```typescript
Task({
  subagent_type: "frontend-developer",
  description: "Retry with skill compliance",
  prompt: `
    [ORIGINAL TASK]

    ---
    COMPLIANCE FAILURE - RETRY REQUIRED

    Your previous attempt did not invoke these mandatory skills:
    - developing-with-tdd
    - verifying-before-completion

    [REST OF COMPLIANCE TEMPLATE]
  `
})
```

## Why This Protocol Exists

**Real failure scenario:**

1. Orchestrator spawns developer with TDD mandate
2. Developer completes task, returns summary: "Implementation complete"
3. Orchestrator reads summary, marks phase complete
4. No tests were written (agent skipped TDD)
5. Quality degraded silently

**With validation:**

1. Orchestrator spawns developer with TDD mandate
2. Developer completes task
3. Orchestrator reads output file, parses metadata
4. `skills_invoked` array missing `developing-with-tdd`
5. Validation fails → re-spawn with explicit requirement
6. Developer writes tests on second attempt
7. Validation passes → proceed

## Limitations

This validation protocol detects **if** agents invoked skills, but cannot verify **how well** they followed skill instructions. An agent could:

- Invoke a skill but skip key steps
- Mark skill as invoked in metadata dishonestly
- Follow the letter but not the spirit of the skill

**Mitigation strategies:**

1. Human checkpoints at critical phases
2. Code review by reviewer agents
3. Quality scoring framework (see quality-scoring.md)
4. Explicit exit criteria verification (see verifying-before-completion skill)

## Related

- [Post-Completion Verification Protocol](../SKILL.md#post-completion-verification-protocol-mandatory) - Manual verification process
- [persisting-agent-outputs](../../persisting-agent-outputs/SKILL.md) - Metadata format specification
- [Agent Routing Table](../SKILL.md#agent-routing-table) - What to do when agents are blocked
- [Retry Limits with Escalation](../SKILL.md#retry-limits-with-escalation) - Max retry defaults
