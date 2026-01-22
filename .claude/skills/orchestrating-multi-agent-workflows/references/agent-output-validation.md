# Agent Output Validation

**Comprehensive 4-tier skill hierarchy validation with gateway routing and library skill verification.**

## Overview

Orchestrating skills embed mandatory skills in agent prompts, but agents may skip them during execution. This validation protocol detects non-compliance across all 4 tiers of the skill hierarchy and triggers corrective action.

**Why comprehensive validation matters:**

Without 4-tier validation:

- Agents skip universal core skills (using-skills, semantic-code-operations, etc.)
- Gateway routing is bypassed (agents don't read library skills)
- Testing quality suffers (gateway-testing mandatory skills ignored)
- Task-specific patterns are missed (TanStack Query, form validation, etc.)

With 4-tier validation:

- All universal skills enforced (8 skills, non-negotiable)
- Gateway invocation verified (correct domain gateways per agent type)
- Library skills read and incorporated (via gateway routing tables)
- Task-specific patterns validated (keyword-based skill matching)

---

## Navigation

This document is split for progressive loading. Load sections as needed:

| Section          | File                                                                         | Content                                            |
| ---------------- | ---------------------------------------------------------------------------- | -------------------------------------------------- |
| Main (this file) | agent-output-validation.md                                                   | Overview, Tier 1-4, Gateway Matrix, Output Schema  |
| Algorithm        | [agent-output-validation-algorithm.md](agent-output-validation-algorithm.md) | 7-step validation code, gateway routing tables     |
| Templates        | [agent-output-validation-templates.md](agent-output-validation-templates.md) | Re-spawn template, validation matrix, retry policy |
| Examples         | [agent-output-validation-examples.md](agent-output-validation-examples.md)   | Success/failure examples, rationale, limitations   |

---

## Section 1: Skill Hierarchy Overview

### Tier 1: Universal Core Skills (ALL agents, Step 1)

Every agent MUST invoke these 8 skills FIRST:

| Skill                             | Why                                                                       | Validation Check                                              |
| --------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| using-skills                      | Non-negotiable first read, 1% threshold, skill discovery                  | `skills_invoked` contains "using-skills"                      |
| discovering-reusable-code         | Search for reusable patterns before implementing                          | `skills_invoked` contains "discovering-reusable-code"         |
| semantic-code-operations          | Core code tool - routes to Serena MCP for semantic search/editing         | `skills_invoked` contains "semantic-code-operations"          |
| calibrating-time-estimates        | Prevents 'no time to read skills' rationalization                         | `skills_invoked` contains "calibrating-time-estimates"        |
| enforcing-evidence-based-analysis | Prevents hallucinations - confidence without evidence = failure           | `skills_invoked` contains "enforcing-evidence-based-analysis" |
| gateway-[domain]                  | Routes to mandatory + task-specific library skills (1-3 per agent)        | `skills_invoked` contains at least one "gateway-\*"           |
| persisting-agent-outputs          | Defines WHERE to write output - discovery protocol, file naming, MANIFEST | `skills_invoked` contains "persisting-agent-outputs"          |
| verifying-before-completion       | Ensures outputs are verified before claiming done                         | `skills_invoked` contains "verifying-before-completion"       |

**CRITICAL**: ALL 8 must be present. If any are missing, validation FAILS.

### Tier 2: Role-Specific Core Skills (Step 1 additions)

Additional mandatory skills based on agent role:

| Role           | Additional Core Skills       | Validation Check                 |
| -------------- | ---------------------------- | -------------------------------- |
| Lead/Architect | brainstorming, writing-plans | Both present in `skills_invoked` |
| Developer      | developing-with-tdd          | Present in `skills_invoked`      |
| Tester         | developing-with-tdd          | Present in `skills_invoked`      |
| Reviewer       | (none - only Tier 1)         | No additional check              |

**Note**: gateway-testing is a gateway skill (Tier 1), NOT a Tier 2 skill.

### Tier 3: Gateway Mandatory Library Skills (Step 3)

Skills the gateway marks as mandatory for ANY task in that domain. Agent must Read() these after invoking the gateway.

**From gateway-testing (mandatory for ALL test tasks):**

| Library Skill                      | Path                                                                        | Validation Check                 |
| ---------------------------------- | --------------------------------------------------------------------------- | -------------------------------- |
| testing-anti-patterns              | `.claude/skill-library/testing/testing-anti-patterns/SKILL.md`              | Present in `library_skills_read` |
| behavior-vs-implementation-testing | `.claude/skill-library/testing/behavior-vs-implementation-testing/SKILL.md` | Present in `library_skills_read` |
| condition-based-waiting            | `.claude/skill-library/testing/condition-based-waiting/SKILL.md`            | Present in `library_skills_read` |
| avoiding-low-value-tests           | `.claude/skill-library/testing/avoiding-low-value-tests/SKILL.md`           | Present in `library_skills_read` |

**From gateway-frontend Testing Quality section (mandatory for frontend testing):**

- Same 4 skills as above (applies when agent is frontend-tester)

**Validation**: If agent type is `*-tester`, verify ALL 4 library skills are in `library_skills_read` array.

### Tier 4: Task-Specific Library Skills (Step 3 via routing)

Skills found via gateway intent detection tables based on task keywords. Training data is stale - agents MUST use gateway routing to find current patterns.

**Validation approach**: Extract keywords from `original_task` and `files_modified`, match against gateway routing tables (see [algorithm](agent-output-validation-algorithm.md#section-5-gateway-routing-reference-condensed)), build expected skills list, verify against `library_skills_read`.

**Examples:**

- Task contains 'TanStack Query', 'cache', or 'fetch' → Expect `.claude/skill-library/development/frontend/using-tanstack-query/SKILL.md`
- Task contains 'form' or 'validation' → Expect `.claude/skill-library/development/frontend/implementing-react-hook-form-zod/SKILL.md`
- Files modified include `.go` files + keywords 'test' → Expect `.claude/skill-library/development/backend/implementing-golang-tests/SKILL.md`

---

## Section 2: Complete Gateway Matrix

This table defines which gateways each agent type MUST invoke (Tier 1 validation).

| Agent Type            | Required Gateways                                           | Validation Check                             |
| --------------------- | ----------------------------------------------------------- | -------------------------------------------- |
| frontend-lead         | gateway-frontend                                            | `skills_invoked` contains "gateway-frontend" |
| frontend-developer    | gateway-frontend                                            | `skills_invoked` contains "gateway-frontend" |
| frontend-tester       | gateway-frontend, gateway-testing                           | Both present in `skills_invoked`             |
| frontend-reviewer     | gateway-frontend                                            | `skills_invoked` contains "gateway-frontend" |
| backend-lead          | gateway-backend                                             | `skills_invoked` contains "gateway-backend"  |
| backend-developer     | gateway-backend                                             | `skills_invoked` contains "gateway-backend"  |
| backend-tester        | gateway-backend, gateway-testing                            | Both present in `skills_invoked`             |
| backend-reviewer      | gateway-backend                                             | `skills_invoked` contains "gateway-backend"  |
| tool-lead             | gateway-mcp-tools, gateway-typescript, gateway-integrations | All 3 present in `skills_invoked`            |
| tool-developer        | gateway-mcp-tools, gateway-typescript, gateway-integrations | All 3 present in `skills_invoked`            |
| tool-tester           | gateway-mcp-tools, gateway-typescript, gateway-testing      | All 3 present in `skills_invoked`            |
| tool-reviewer         | gateway-mcp-tools, gateway-typescript                       | Both present in `skills_invoked`             |
| capability-lead       | gateway-capabilities, gateway-backend                       | Both present in `skills_invoked`             |
| capability-developer  | gateway-capabilities, gateway-backend, gateway-integrations | All 3 present in `skills_invoked`            |
| capability-tester     | gateway-capabilities, gateway-backend, gateway-testing      | All 3 present in `skills_invoked`            |
| capability-reviewer   | gateway-capabilities, gateway-backend                       | Both present in `skills_invoked`             |
| integration-lead      | gateway-integrations, gateway-backend                       | Both present in `skills_invoked`             |
| integration-developer | gateway-integrations, gateway-backend                       | Both present in `skills_invoked`             |
| integration-tester    | gateway-integrations, gateway-backend, gateway-testing      | All 3 present in `skills_invoked`            |
| security-\*           | gateway-security + domain gateway                           | Both present in `skills_invoked`             |

---

## Section 3: Agent Output Schema

Required output fields for validation:

```json
{
  "agent": "frontend-developer",
  "task": "Implement user profile component with TanStack Query",
  "skills_invoked": [
    "using-skills",
    "discovering-reusable-code",
    "semantic-code-operations",
    "calibrating-time-estimates",
    "enforcing-evidence-based-analysis",
    "gateway-frontend",
    "persisting-agent-outputs",
    "verifying-before-completion",
    "developing-with-tdd"
  ],
  "library_skills_read": [
    ".claude/skill-library/development/frontend/using-tanstack-query/SKILL.md",
    ".claude/skill-library/development/frontend/using-shadcn-ui/SKILL.md"
  ],
  "files_modified": ["src/components/UserProfile.tsx", "src/hooks/useUserProfile.ts"],
  "status": "complete"
}
```

**Required fields:**

- `agent` - Agent type (for lookup in Gateway Matrix)
- `task` - Original task description (for keyword extraction)
- `skills_invoked` - Array of core skill names
- `library_skills_read` - Array of full paths to library skill files
- `files_modified` - Array of file paths (for technology detection)
- `status` - Completion status ("complete" or "blocked")

---

## Next Steps

- **For validation algorithm**: See [agent-output-validation-algorithm.md](agent-output-validation-algorithm.md)
- **For re-spawn templates**: See [agent-output-validation-templates.md](agent-output-validation-templates.md)
- **For complete examples**: See [agent-output-validation-examples.md](agent-output-validation-examples.md)
