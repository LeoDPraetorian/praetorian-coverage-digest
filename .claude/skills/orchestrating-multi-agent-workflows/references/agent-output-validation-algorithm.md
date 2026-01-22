# Agent Output Validation: Algorithm

**Parent**: [agent-output-validation.md](agent-output-validation.md)

7-step validation algorithm with gateway routing reference tables.

---

## Section 4: Validation Algorithm

**INPUT**: `agent_output`, `original_task`, `agent_type`

### STEP 1: Validate Tier 1 (Universal - 8 skills)

```javascript
const TIER_1_UNIVERSAL = [
  "using-skills",
  "discovering-reusable-code",
  "semantic-code-operations",
  "calibrating-time-estimates",
  "enforcing-evidence-based-analysis",
  "persisting-agent-outputs",
  "verifying-before-completion",
  // Note: gateway-* validated separately (must have at least one)
];

function validateTier1(skills_invoked) {
  const missing = TIER_1_UNIVERSAL.filter((s) => !skills_invoked.includes(s));

  const hasGateway = skills_invoked.some((s) => s.startsWith("gateway-"));
  if (!hasGateway) {
    missing.push("gateway-[domain] (none found)");
  }

  if (missing.length > 0) {
    return { valid: false, tier: 1, missing: missing };
  }

  return { valid: true };
}
```

### STEP 2: Validate Tier 2 (Role-Specific)

```javascript
const TIER_2_ROLE_SKILLS = {
  lead: ["brainstorming", "writing-plans"],
  architect: ["brainstorming", "writing-plans"],
  developer: ["developing-with-tdd"],
  tester: ["developing-with-tdd"],
  reviewer: [], // Only Tier 1
  security: [], // Only Tier 1
};

function validateTier2(agent_type, skills_invoked) {
  // Extract role from agent type (e.g., "frontend-developer" → "developer")
  const role = agent_type.split("-").pop();
  const required = TIER_2_ROLE_SKILLS[role] || [];

  const missing = required.filter((s) => !skills_invoked.includes(s));

  if (missing.length > 0) {
    return { valid: false, tier: 2, missing: missing };
  }

  return { valid: true };
}
```

### STEP 3: Validate Gateway Match

```javascript
function validateGatewayMatch(agent_type, skills_invoked) {
  const expectedGateways = GATEWAY_MATRIX[agent_type];
  if (!expectedGateways) {
    return { valid: false, tier: 3, error: `Unknown agent type: ${agent_type}` };
  }

  const missing = expectedGateways.filter((g) => !skills_invoked.includes(g));

  if (missing.length > 0) {
    return { valid: false, tier: 3, missing: missing };
  }

  return { valid: true };
}
```

**GATEWAY_MATRIX**: See [agent-output-validation.md Section 2](agent-output-validation.md#section-2-complete-gateway-matrix)

### STEP 4: Extract Keywords from Task + Code

```javascript
function extractKeywords(original_task, files_modified) {
  const keywords = new Set();

  // Technology indicators from file extensions
  files_modified.forEach((file) => {
    if (file.endsWith(".tsx") || file.endsWith(".jsx")) {
      keywords.add("React");
    }
    if (file.endsWith(".go")) {
      keywords.add("Go");
    }
    if (file.endsWith(".py")) {
      keywords.add("Python");
    }
  });

  // Extract keywords from task description
  const taskLower = original_task.toLowerCase();

  // Frontend patterns
  if (
    taskLower.includes("tanstack query") ||
    taskLower.includes("cache") ||
    taskLower.includes("fetch")
  ) {
    keywords.add("TanStack Query");
  }
  if (
    taskLower.includes("tanstack table") ||
    taskLower.includes("grid") ||
    taskLower.includes("data table")
  ) {
    keywords.add("TanStack Table");
  }
  if (taskLower.includes("form") || taskLower.includes("validation")) {
    keywords.add("form validation");
  }
  if (
    taskLower.includes("zustand") ||
    taskLower.includes("store") ||
    taskLower.includes("client state")
  ) {
    keywords.add("Zustand");
  }

  // Backend patterns
  if (taskLower.includes("go test") || taskLower.includes("testing")) {
    keywords.add("Go testing");
  }

  // Integration patterns
  if (
    taskLower.includes("oauth") ||
    taskLower.includes("auth") ||
    taskLower.includes("credentials")
  ) {
    keywords.add("authentication");
  }

  return Array.from(keywords);
}
```

### STEP 5: Validate Tier 3 (Gateway Mandatory)

```javascript
const GATEWAY_TESTING_MANDATORY = [
  ".claude/skill-library/testing/testing-anti-patterns/SKILL.md",
  ".claude/skill-library/testing/behavior-vs-implementation-testing/SKILL.md",
  ".claude/skill-library/testing/condition-based-waiting/SKILL.md",
  ".claude/skill-library/testing/avoiding-low-value-tests/SKILL.md",
];

function validateTier3(agent_type, library_skills_read) {
  // If agent is a tester type, verify gateway-testing mandatory skills
  if (agent_type.endsWith("-tester")) {
    const missing = GATEWAY_TESTING_MANDATORY.filter((s) => !library_skills_read.includes(s));

    if (missing.length > 0) {
      return { valid: false, tier: 3, missing: missing };
    }
  }

  return { valid: true };
}
```

### STEP 6: Validate Tier 4 (Task-Specific)

```javascript
function validateTier4(keywords, library_skills_read) {
  const expected = buildExpectedSkills(keywords); // See Section 5 routing tables
  const missing = expected.filter((s) => !library_skills_read.some((read) => read.includes(s)));

  if (missing.length > 0) {
    return { valid: false, tier: 4, missing: missing, hint: "Check gateway routing tables" };
  }

  return { valid: true };
}

function buildExpectedSkills(keywords) {
  const expected = [];

  // Map keywords to expected library skills (condensed from Section 5)
  if (keywords.includes("TanStack Query")) {
    expected.push("using-tanstack-query");
  }
  if (keywords.includes("TanStack Table")) {
    expected.push("using-tanstack-table");
  }
  if (keywords.includes("form validation")) {
    expected.push("implementing-react-hook-form-zod");
  }
  if (keywords.includes("Zustand")) {
    expected.push("using-zustand-state-management");
  }
  if (keywords.includes("Go testing")) {
    expected.push("implementing-golang-tests");
  }

  return expected;
}
```

### STEP 7: Return Result

```javascript
function validateAgentOutput(agent_output, original_task, agent_type) {
  const { skills_invoked, library_skills_read, files_modified } = agent_output;

  // Tier 1: Universal core skills
  const tier1 = validateTier1(skills_invoked);
  if (!tier1.valid) return tier1;

  // Tier 2: Role-specific core skills
  const tier2 = validateTier2(agent_type, skills_invoked);
  if (!tier2.valid) return tier2;

  // Tier 3: Gateway match
  const tier3Gateway = validateGatewayMatch(agent_type, skills_invoked);
  if (!tier3Gateway.valid) return tier3Gateway;

  // Tier 3: Gateway mandatory library skills
  const tier3Mandatory = validateTier3(agent_type, library_skills_read);
  if (!tier3Mandatory.valid) return tier3Mandatory;

  // Tier 4: Task-specific library skills
  const keywords = extractKeywords(original_task, files_modified);
  const tier4 = validateTier4(keywords, library_skills_read);
  if (!tier4.valid) return tier4;

  return { valid: true, message: "All 4 tiers validated successfully" };
}
```

---

## Section 5: Gateway Routing Reference (Condensed)

### gateway-frontend keywords

| Keywords                                | Library Skill                    | Path                                                                                   |
| --------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------- |
| 'TanStack Query', 'cache', 'fetch'      | using-tanstack-query             | `.claude/skill-library/development/frontend/using-tanstack-query/SKILL.md`             |
| 'TanStack Table', 'grid', 'data table'  | using-tanstack-table             | `.claude/skill-library/development/frontend/using-tanstack-table/SKILL.md`             |
| 'form', 'validation', 'react-hook-form' | implementing-react-hook-form-zod | `.claude/skill-library/development/frontend/implementing-react-hook-form-zod/SKILL.md` |
| 'Zustand', 'store', 'client state'      | using-zustand-state-management   | `.claude/skill-library/development/frontend/using-zustand-state-management/SKILL.md`   |
| 'performance', 'optimize', 'slow'       | optimizing-react-performance     | `.claude/skill-library/development/frontend/optimizing-react-performance/SKILL.md`     |
| 'Shadcn', 'UI', 'radix'                 | using-shadcn-ui                  | `.claude/skill-library/development/frontend/using-shadcn-ui/SKILL.md`                  |

### gateway-testing keywords

| Keywords                    | Library Skill                             | Path                                                                        | Mandatory |
| --------------------------- | ----------------------------------------- | --------------------------------------------------------------------------- | --------- |
| ANY test task               | testing-anti-patterns                     | `.claude/skill-library/testing/testing-anti-patterns/SKILL.md`              | ✅ YES    |
| ANY test task               | behavior-vs-implementation-testing        | `.claude/skill-library/testing/behavior-vs-implementation-testing/SKILL.md` | ✅ YES    |
| ANY test task               | avoiding-low-value-tests                  | `.claude/skill-library/testing/avoiding-low-value-tests/SKILL.md`           | ✅ YES    |
| 'async', 'flaky', 'timeout' | condition-based-waiting                   | `.claude/skill-library/testing/condition-based-waiting/SKILL.md`            | ✅ YES    |
| 'mock', 'stub', 'spy'       | testing-with-vitest-mocks, creating-mocks | `.claude/skill-library/testing/...`                                         | Optional  |

### gateway-backend keywords

| Keywords               | Library Skill             | Path                                                                           |
| ---------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| 'Go test', 'testing'   | implementing-golang-tests | `.claude/skill-library/development/backend/implementing-golang-tests/SKILL.md` |
| 'CLI', 'command line'  | go-best-practices         | `.claude/skill-library/development/backend/go-best-practices/SKILL.md`         |
| 'Lambda', 'serverless' | (via gateway routing)     | See gateway-backend for specific paths                                         |

### gateway-integrations keywords

| Keywords                                 | Library Skill                | Path                                                                                   |
| ---------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------- |
| 'Chariot integration', 'third-party API' | chariot-integration-patterns | `.claude/skill-library/development/integrations/chariot-integration-patterns/SKILL.md` |
| 'auth', 'OAuth', 'credentials'           | (via gateway routing)        | See gateway-integrations for specific paths                                            |

---

## Related

- **Main document**: [agent-output-validation.md](agent-output-validation.md)
- **Templates**: [agent-output-validation-templates.md](agent-output-validation-templates.md)
- **Examples**: [agent-output-validation-examples.md](agent-output-validation-examples.md)
