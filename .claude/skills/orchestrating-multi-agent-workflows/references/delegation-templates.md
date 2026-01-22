# Delegation Templates

Pre-built prompt templates for delegating to specialized agents.

---

## Navigation

This document is split for progressive loading. Load sections as needed:

| Section          | File                                                                           | Content                                                              |
| ---------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Main (this file) | delegation-templates.md                                                        | Overview, structure, architecture + developer templates, usage guide |
| Testing          | [delegation-templates-testing.md](delegation-templates-testing.md)             | Unit, integration, and E2E test engineer templates                   |
| Review + Skills  | [delegation-templates-review-skills.md](delegation-templates-review-skills.md) | Reviewer templates, skill requirements in delegation                 |

---

## Template Structure

Every delegation prompt should include:

```markdown
Task: [Clear objective - what to accomplish]

Context from prior phases:

- [Key decisions from architecture]
- [Implementation details if relevant]
- [File locations, patterns used]

Scope: [What to do] / [What NOT to do]

Expected output:

- [Specific deliverables]
- [File locations for artifacts]
- [Output format for results]
```

---

## Architecture Agent Templates

### Backend Architecture

```markdown
Task: Design [feature] architecture for the Chariot backend

Requirements:

- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

Constraints:

- Must integrate with existing DynamoDB single-table design
- Follow Chariot's handler/service/repository pattern
- Consider async processing via SQS if appropriate

Scope: Architecture decisions only. Do NOT implement code.

Expected output:

- Service boundaries and responsibilities
- Database schema design (DynamoDB key patterns)
- API contract (endpoints, request/response)
- Queue design if async processing needed
- Return as structured JSON with rationale for each decision
```

### Frontend Architecture

```markdown
Task: Design component architecture for [feature]

Requirements:

- [User-facing requirement 1]
- [User-facing requirement 2]

Current context:

- Existing section: src/sections/[section]/
- Related components: [list any similar components]

Constraints:

- Follow Chariot UI complexity tiers (Tier 1/2/3)
- Use TanStack Query for data fetching
- Use Zustand only if complex cross-component state needed

Scope: Architecture decisions only. Do NOT implement code.

Expected output:

- Component hierarchy and file organization
- State management approach (local vs shared)
- Data fetching strategy
- Return as structured JSON with tier classification
```

---

## Developer Agent Templates

### Backend Implementation

```markdown
Task: Implement [feature] based on architecture decisions

Context from architecture:

- API contract: [endpoints, methods]
- Database schema: [DynamoDB patterns]
- Service boundaries: [which packages]

Location: modules/chariot/backend/pkg/handler/handlers/[domain]/

Implementation requirements:

1. Create handler following existing patterns in [similar handler]
2. Add input validation using JSON schema
3. Implement service layer if business logic complex
4. Add structured logging with request IDs

Scope: Implementation + basic tests. Do NOT create acceptance tests.

Expected output:

- Handler file at [path]
- Service file at [path] if needed
- Unit test file with table-driven tests
- Return structured JSON with files created and test results
```

### Frontend Implementation

```markdown
Task: Implement [component] based on architecture decisions

Context from architecture:

- Component tier: [1/2/3]
- State approach: [local/Zustand/context]
- API endpoints: [list endpoints]

Location: src/sections/[section]/components/

Implementation requirements:

1. Follow Chariot UI patterns from [similar component]
2. Use TanStack Query for data fetching
3. Include loading and error states
4. Add appropriate accessibility attributes

Scope: Implementation + basic tests. Follow TDD.

Expected output:

- Component file at [path]
- Hook file at [path] if data fetching needed
- Unit test file with React Testing Library
- Return structured JSON with files created and test results
```

---

## Using Templates

### 1. Select appropriate template

Match task to agent type:

- Design decisions → Architecture template
- Write code → Developer template
- Write tests → Test Engineer template
- Review code → Reviewer template

### 2. Fill in context

Replace placeholders with:

- Actual file paths
- Real requirements
- Prior phase outputs

### 3. Adjust scope

Be explicit about boundaries:

- What agent SHOULD do
- What agent should NOT do

### 4. Verify output format

Ensure you request:

- Specific deliverables
- Structured JSON for easy parsing
- Files created/modified list

---

## Context Awareness in Delegations

### Token Thresholds

Before spawning agents, check current token usage:

| Threshold         | Layer       | Action                                            |
| ----------------- | ----------- | ------------------------------------------------- |
| <75% (150k)       | —           | Proceed normally                                  |
| 75-80% (150-160k) | Guidance    | SHOULD compact - proactive compaction recommended |
| 80-85% (160-170k) | Guidance    | MUST compact - compact NOW before spawning        |
| >85% (170k)       | Enforcement | Hook BLOCKS agent spawning until /compact         |

**See:** [context-monitoring.md](context-monitoring.md) for token measurement scripts.

### Agent Prompt Context Size

Keep agent prompts focused to avoid context pollution:

| Agent Type   | Max Context | Include                                  | Exclude                           |
| ------------ | ----------- | ---------------------------------------- | --------------------------------- |
| Architecture | 2000 tokens | Requirements, constraints, patterns      | Full discovery output             |
| Developer    | 3000 tokens | Architecture summary, file paths, skills | Other domain details              |
| Reviewer     | 2000 tokens | Plan, implementation files               | Discovery, architecture rationale |
| Tester       | 2000 tokens | Test plan, file locations                | Implementation logs               |

### Fresh Agent Principle

Each `Task()` spawns a NEW agent instance:

- No context pollution from previous agents
- Include ALL necessary context in the prompt
- Reference files instead of inlining content
- Never ask agent to "continue" previous work

**See:** [compaction-gates.md](compaction-gates.md) for compaction protocol at phase transitions.

---

## Next Steps

- **For test templates**: See [delegation-templates-testing.md](delegation-templates-testing.md)
- **For review templates + skill requirements**: See [delegation-templates-review-skills.md](delegation-templates-review-skills.md)
