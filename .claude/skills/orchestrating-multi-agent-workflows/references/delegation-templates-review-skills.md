# Delegation Templates: Review & Skills

**Parent**: [delegation-templates.md](delegation-templates.md)

Reviewer agent templates and skill requirements in delegation prompts.

---

## Reviewer Agent Templates

### Code Quality Review

```markdown
Task: Review implementation for code quality

Files to review:

- [path 1]
- [path 2]

Context:

- Requirements: [original requirements]
- Architecture decisions: [key decisions]

Review criteria:

1. Does implementation match requirements?
2. Are patterns consistent with codebase?
3. Is error handling comprehensive?
4. Is code maintainable and readable?

Scope: Review ONLY. Do NOT fix issues yourself.

Expected output:
Return structured JSON with:

- assessment: "approved" | "changes_required"
- strengths: [list]
- issues: [
  { severity: "critical|important|minor", description, file, line }
  ]
- suggestions: [optional improvements]
```

### Security Review

```markdown
Task: Review implementation for security vulnerabilities

Files to review:

- [path 1]
- [path 2]

Context:

- Feature handles: [auth/user input/secrets/etc.]
- Attack surface: [describe exposure]

Review criteria:

1. Input validation (injection prevention)
2. Authentication/authorization checks
3. Sensitive data handling
4. Error messages (no information leakage)
5. OWASP Top 10 compliance

Scope: Security review ONLY. Do NOT fix issues yourself.

Expected output:
Return structured JSON with:

- risk_level: "low" | "medium" | "high" | "critical"
- vulnerabilities: [
  { severity, type, description, file, line, remediation }
  ]
- recommendations: [security improvements]
```

---

## Skill Requirements in Delegation Prompts

### Why Include Skills in Delegation

Agents have universal Step 1 skills baked into their prompts. But the orchestrator knows the TASK CONTEXT and can:

1. Pre-identify which library skills match the task keywords
2. Explicitly require those skills in the prompt
3. Reinforce the 1% rule with task-specific reasoning

This creates defense in depth:

- Agent's Step 1 → Universal skills (baked into agent prompt)
- Delegation prompt → Task-specific library skills (orchestrator adds based on keywords)
- agent-output-validation.md → Verifies both were invoked

**Why this matters:**

- Agents may rationalize skipping skills ("I already know TanStack Table")
- Task keywords trigger specific skills that Step 1 doesn't cover
- Explicit delegation requirements prevent the "I know this" trap

### Template Addition for All Delegation Prompts

Add this block to EVERY delegation template:

```markdown
## Task-Specific Skill Requirements

Based on this task's keywords, you MUST Read() these library skills:

- [path/to/skill1.md] - task mentions '[keyword]'
- [path/to/skill2.md] - task involves '[technology]'

This is IN ADDITION to your Step 1 mandatory skills.

## Reminder: The 1% Rule

Your training data is stale. The gateway and library skills have CURRENT patterns.
DO NOT skip reading them because you 'already know' the topic.
If there is even a 1% chance a skill applies, you MUST invoke it.
```

**When to include skills:**

- Task mentions specific libraries/frameworks (TanStack Query, Zustand, React Hook Form)
- Task involves specific patterns (integration, testing, state management)
- Task requires domain knowledge (security, performance, accessibility)

**When NOT to include:**

- Pure architecture tasks (no implementation keywords)
- Simple CRUD operations with no library-specific requirements
- Tasks where generic patterns suffice

### Keyword → Library Skill Mapping

Provide guidance for orchestrators on how to map task keywords to library skills:

| Task Contains                         | Required Library Skill                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 'TanStack Query', 'cache', 'fetch'    | `Read(".claude/skill-library/development/frontend/using-tanstack-query/SKILL.md")`             |
| 'TanStack Table', 'grid', 'filtering' | `Read(".claude/skill-library/development/frontend/using-tanstack-table/SKILL.md")`             |
| 'form', 'validation'                  | `Read(".claude/skill-library/development/frontend/implementing-react-hook-form-zod/SKILL.md")` |
| 'Zustand', 'store'                    | `Read(".claude/skill-library/development/frontend/using-zustand-state-management/SKILL.md")`   |
| 'Go test', 'testing'                  | `Read(".claude/skill-library/testing/backend/implementing-golang-tests/SKILL.md")`             |
| 'integration', 'third-party API'      | `Read(".claude/skill-library/development/integrations/developing-integrations/SKILL.md")`      |
| 'security', 'auth', 'OWASP'           | `Skill("gateway-security")` (spawns security-lead)                                             |

**Note:** Full keyword mappings are in each gateway's routing table. Orchestrator should consult the relevant gateway skill:

- `gateway-backend` - Backend library skills (Go patterns, Lambda, DynamoDB)
- `gateway-capabilities` - Security capability skills (VQL, Nuclei, Janus, fingerprintx)
- `gateway-claude` - Claude Code skills (skills, agents, MCP, hooks)
- `gateway-frontend` - Frontend library skills (React, TanStack, state management)
- `gateway-integrations` - Integration library skills (third-party APIs, Chariot integrations)
- `gateway-mcp-tools` - MCP tool skills (wrapper development, schema design)
- `gateway-security` - Security library skills (threat modeling, CVSS, auth)
- `gateway-testing` - Testing library skills (Go tests, React tests, E2E)
- `gateway-typescript` - TypeScript library skills (patterns, optimization)

### Example Updated Template

**Before (current):**

```markdown
## Task

[Implementation details]

## Expected Output

[Format]
```

**After (with skills):**

```markdown
## Task

[Implementation details]

## Task-Specific Skill Requirements

Based on this task, you MUST Read():

- .claude/skill-library/development/frontend/using-tanstack-table/SKILL.md (task mentions 'table', 'filtering')

This is IN ADDITION to your Step 1 mandatory skills.

## Reminder: The 1% Rule

Your training data is stale. DO NOT skip library skills because you 'already know' the topic.

## Expected Output

[Format]
```

### Concrete Example: Frontend Implementation with TanStack Table

**Task delegation WITH skill requirements:**

```markdown
Task: Implement data table component with filtering using TanStack Table

Context from architecture:

- Component tier: 2 (moderate complexity)
- State approach: Local state for filters, TanStack Table for table state
- API endpoints: GET /api/data (paginated)

Location: src/sections/dashboard/components/

Implementation requirements:

1. Follow Chariot UI patterns from existing tables
2. Use TanStack Table for table functionality
3. Include loading and error states
4. Add accessibility attributes

Scope: Implementation + basic tests. Follow TDD.

## Task-Specific Skill Requirements

Based on this task's keywords, you MUST Read():

- .claude/skill-library/development/frontend/using-tanstack-table/SKILL.md
  - Reason: Task explicitly mentions "TanStack Table" and "filtering"
  - Contains: Column definitions, filter patterns, Chariot-specific table patterns

This is IN ADDITION to your Step 1 mandatory skills (using-skills, gateway-frontend, etc.).

## Reminder: The 1% Rule

Your training data is stale. The using-tanstack-table skill has CURRENT v8 API patterns.
DO NOT skip reading it because you 'already know' TanStack Table.

Expected output:

- Component file at src/sections/dashboard/components/DataTable.tsx
- Unit test file with React Testing Library
- Return structured JSON with files created and test results
```

**Why this works:**

1. **Explicit path** - Agent knows exactly which skill to Read()
2. **Keyword justification** - Shows why this skill is required
3. **1% rule reinforcement** - Counters "I already know this" rationalization
4. **Separates concerns** - Step 1 handles universals, delegation handles task-specific

### Integration with Agent Step 1

Agents have Step 1 that requires:

1. Read agent prompt completely
2. Invoke using-skills
3. Check gateway for role-specific skills
4. Read mandatory core skills

**Orchestrator's delegation prompt adds:**

- Task-specific library skills based on keywords
- Explicit paths (agent doesn't need to search)
- Justification (reduces rationalization)

**Validation happens in agent-output-validation.md:**

- Checks for Step 1 skills (universal)
- Checks for delegation prompt skills (task-specific)
- Both must be invoked for output to be valid

---

## Related

- **Main templates**: [delegation-templates.md](delegation-templates.md)
- **Testing templates**: [delegation-templates-testing.md](delegation-templates-testing.md)
