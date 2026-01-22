# Agent Output Validation: Templates

**Parent**: [agent-output-validation.md](agent-output-validation.md)

Re-spawn compliance template, validation matrix by agent type, and retry policy.

---

## Section 6: Re-Spawn Compliance Template

When validation fails, re-spawn the agent with this template:

````markdown
---
COMPLIANCE FAILURE - Re-execution Required
---

Your previous output failed validation.

### Missing Skills

**Tier 1 (Universal):** [list missing universal skills]
**Tier 2 (Role-Specific):** [list missing role skills]
**Tier 3 (Gateway Match):** [list missing gateways]
**Tier 3 (Gateway Mandatory):** [list missing mandatory library skills]
**Tier 4 (Task-Specific):** [list missing task-specific library skills based on keywords: {keywords}]

### MANDATORY: Read These Library Skills NOW

Based on your task '[task summary]' and code touched '[file patterns]', you MUST Read():

1. [path/to/skill1.md] - because task contains '[keyword]'
2. [path/to/skill2.md] - because code touches '[technology]'
3. [path/to/skill3.md] - MANDATORY for all [role] agents

### The 1% Rule (NON-NEGOTIABLE)

If there is even a 1% chance a skill might apply, you MUST invoke it.

IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. This is not optional. You cannot rationalize your way out of this.

### Anti-Rationalization Reminder

- 'I already know this' → WRONG. Training data is stale.
- 'Simple task' → WRONG. That's what every failed agent thought.
- 'I can see the answer' → WRONG. Confidence without evidence = hallucination.
- 'Time pressure' → WRONG. You are 100x faster than humans. You have time.
- 'The gateway was enough' → WRONG. Gateway routes to skills. You must READ them.

### Required Action

Re-execute your task with ALL required skills invoked and library skills read.

Your output MUST include updated `skills_invoked` and `library_skills_read` arrays.

**Expected output format:**

```json
{
  "skills_invoked": ["using-skills", "gateway-frontend", "developing-with-tdd", ...],
  "library_skills_read": [
    ".claude/skill-library/development/frontend/using-tanstack-query/SKILL.md",
    ".claude/skill-library/testing/testing-anti-patterns/SKILL.md",
    ...
  ],
  "files_modified": [...],
  "status": "complete"
}
```

---
````

### Re-Spawn Example (TypeScript)

```typescript
// After validation fails
const validationResult = validateAgentOutput(agentOutput, originalTask, agentType);

if (!validationResult.valid) {
  const compliancePrompt = `
    ${originalTask}

    ${buildComplianceTemplate(validationResult, originalTask, agentOutput.files_modified)}
  `;

  Task({
    subagent_type: agentType,
    description: `Retry with tier ${validationResult.tier} compliance`,
    prompt: compliancePrompt,
  });
}
```

---

## Section 7: Validation Matrix by Agent Type

Complete reference table showing all tier requirements per agent type:

| Agent Type            | Tier 1 (8)      | Tier 2                       | Gateways                                                    | Tier 3 Mandatory                                                                                             | Tier 4   |
| --------------------- | --------------- | ---------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------- |
| frontend-lead         | All 8 universal | brainstorming, writing-plans | gateway-frontend                                            | -                                                                                                            | Per task |
| frontend-developer    | All 8 universal | developing-with-tdd          | gateway-frontend                                            | -                                                                                                            | Per task |
| frontend-tester       | All 8 universal | developing-with-tdd          | gateway-frontend, gateway-testing                           | testing-anti-patterns, behavior-vs-implementation-testing, avoiding-low-value-tests, condition-based-waiting | Per task |
| frontend-reviewer     | All 8 universal | -                            | gateway-frontend                                            | -                                                                                                            | Per task |
| backend-lead          | All 8 universal | brainstorming, writing-plans | gateway-backend                                             | -                                                                                                            | Per task |
| backend-developer     | All 8 universal | developing-with-tdd          | gateway-backend                                             | -                                                                                                            | Per task |
| backend-tester        | All 8 universal | developing-with-tdd          | gateway-backend, gateway-testing                            | (same as frontend-tester)                                                                                    | Per task |
| backend-reviewer      | All 8 universal | -                            | gateway-backend                                             | -                                                                                                            | Per task |
| tool-lead             | All 8 universal | brainstorming, writing-plans | gateway-mcp-tools, gateway-typescript, gateway-integrations | -                                                                                                            | Per task |
| tool-developer        | All 8 universal | developing-with-tdd          | gateway-mcp-tools, gateway-typescript, gateway-integrations | -                                                                                                            | Per task |
| tool-tester           | All 8 universal | developing-with-tdd          | gateway-mcp-tools, gateway-typescript, gateway-testing      | (same as frontend-tester)                                                                                    | Per task |
| tool-reviewer         | All 8 universal | -                            | gateway-mcp-tools, gateway-typescript                       | -                                                                                                            | Per task |
| capability-lead       | All 8 universal | brainstorming, writing-plans | gateway-capabilities, gateway-backend                       | -                                                                                                            | Per task |
| capability-developer  | All 8 universal | developing-with-tdd          | gateway-capabilities, gateway-backend, gateway-integrations | -                                                                                                            | Per task |
| capability-tester     | All 8 universal | developing-with-tdd          | gateway-capabilities, gateway-backend, gateway-testing      | (same as frontend-tester)                                                                                    | Per task |
| capability-reviewer   | All 8 universal | -                            | gateway-capabilities, gateway-backend                       | -                                                                                                            | Per task |
| integration-lead      | All 8 universal | brainstorming, writing-plans | gateway-integrations, gateway-backend                       | -                                                                                                            | Per task |
| integration-developer | All 8 universal | developing-with-tdd          | gateway-integrations, gateway-backend                       | -                                                                                                            | Per task |
| integration-tester    | All 8 universal | developing-with-tdd          | gateway-integrations, gateway-backend, gateway-testing      | (same as frontend-tester)                                                                                    | Per task |

**Legend:**

- **All 8 universal**: using-skills, discovering-reusable-code, semantic-code-operations, calibrating-time-estimates, enforcing-evidence-based-analysis, gateway-[domain], persisting-agent-outputs, verifying-before-completion
- **Tier 3 Mandatory**: Library skills marked as mandatory by gateway
- **Per task**: Task-specific library skills based on keyword extraction (see [algorithm](agent-output-validation-algorithm.md#section-5-gateway-routing-reference-condensed))

---

## Max Retry Policy

Prevent infinite loops with a three-attempt limit:

| Attempt | Behavior                                                                            |
| ------- | ----------------------------------------------------------------------------------- |
| 1       | Normal prompt with mandatory skills listed                                          |
| 2       | Re-spawn with compliance failure template (after validation detects missing skills) |
| 3       | Escalate to user via AskUserQuestion with full context                              |

### Retry Tracking

Track attempts in TodoWrite or progress file:

```json
{
  "phase": "implementation",
  "agent": "frontend-developer",
  "attempt": 2,
  "max_attempts": 3,
  "validation_failures": {
    "tier_1": ["semantic-code-operations"],
    "tier_3_mandatory": ["testing-anti-patterns"],
    "tier_4": ["using-tanstack-query"]
  }
}
```

### Escalation After Max Retries

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Agent failed 4-tier skill compliance after 2 attempts. How to proceed?",
      header: "Compliance",
      multiSelect: false,
      options: [
        {
          label: "Review validation details",
          description: "Show me exactly which tiers failed and why",
        },
        {
          label: "Proceed with gaps documented",
          description: "Accept current state, document known compliance gaps",
        },
        {
          label: "Manual fix",
          description: "I'll spawn the agent myself with corrected prompt",
        },
        {
          label: "Cancel workflow",
          description: "Stop and investigate compliance system",
        },
      ],
    },
  ],
});
```

---

## Integration with Orchestration Skills

The following skills should reference this validation protocol after each Task dispatch phase:

### orchestrating-feature-development

**Integration point**: After Phase 6 (Implementation) completes, before Phase 7 (Plan Completion Review)

```markdown
### Phase 6: Implementation

1. Spawn developer agents (per-task or batch mode)
2. Wait for all agents to complete
3. **VALIDATE OUTPUTS** (4-tier validation per agent-output-validation.md)
4. If validation fails → re-spawn with compliance template
5. If validation passes → proceed to Phase 7
```

### orchestrating-capability-development

**Integration point**: After Phase 5 (Implementation) completes, before Phase 6 (Review)

```markdown
### Phase 5: Implementation

1. Spawn capability-developer agent
2. Wait for agent to complete
3. **VALIDATE OUTPUT** (4-tier validation per agent-output-validation.md)
4. If validation fails → re-spawn with compliance template
5. If validation passes → proceed to Phase 6
```

### orchestrating-integration-development

**Integration point**: After Phase 4 (Implementation) completes, before Phase 5 (P0 Validation)

```markdown
### Phase 4: Implementation

1. Spawn integration-developer agent
2. Wait for agent to complete
3. **VALIDATE OUTPUT** (4-tier validation per agent-output-validation.md)
4. If validation fails → re-spawn with compliance template
5. If validation passes → proceed to Phase 5
```

---

## Related

- **Main document**: [agent-output-validation.md](agent-output-validation.md)
- **Algorithm**: [agent-output-validation-algorithm.md](agent-output-validation-algorithm.md)
- **Examples**: [agent-output-validation-examples.md](agent-output-validation-examples.md)
