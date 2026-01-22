# Delegation Templates

**Pre-built prompt templates for delegating to specialized agents in feature development.**

## Navigation

Templates are organized by agent role in the `prompts/` subdirectory:

| Agent Role         | File                                                       | Used In  |
| ------------------ | ---------------------------------------------------------- | -------- |
| Architecture Leads | [prompts/architect-prompt.md](prompts/architect-prompt.md) | Phase 7  |
| Developers         | [prompts/developer-prompt.md](prompts/developer-prompt.md) | Phase 8  |
| Reviewers          | [prompts/reviewer-prompt.md](prompts/reviewer-prompt.md)   | Phase 11 |
| Testers            | [prompts/tester-prompt.md](prompts/tester-prompt.md)       | Phase 13 |

## Template Structure

Every delegation prompt should include:

```markdown
Task: [Clear objective - what to accomplish]

Context from prior phases:

- [Key decisions from architecture]
- [Implementation details if relevant]
- [File locations, patterns used]

MANDATORY SKILLS TO READ FIRST:
{skills_by_domain.{domain}.library_skills from skill-manifest.yaml}

Scope: [What to do] / [What NOT to do]

Expected output:

- [Specific deliverables]
- [File locations for artifacts]
- [Output format for results]
```

## Context Size Guidelines

Keep agent prompts focused to avoid context pollution:

| Agent Type         | Max Context | Include                                  | Exclude                           |
| ------------------ | ----------- | ---------------------------------------- | --------------------------------- |
| {domain}-lead      | 2000 tokens | Requirements, constraints, patterns      | Full discovery output             |
| {domain}-developer | 3000 tokens | Architecture summary, file paths, skills | Other domain details              |
| {domain}-reviewer  | 2000 tokens | Plan, implementation files               | Discovery, architecture rationale |
| {domain}-tester    | 2000 tokens | Test plan, file locations                | Implementation logs               |

## Skill Injection

**Critical:** All templates include MANDATORY SKILLS section that pulls from Phase 4 skill manifest:

```yaml
# From .feature-development/skill-manifest.yaml
skills_by_domain:
  frontend:
    library_skills:
      - preventing-react-hook-infinite-loops
      - using-tanstack-table
      - working-with-sigma-js
  backend:
    library_skills:
      - go-best-practices
      - implementing-golang-tests
```

Inject into prompts as:

```
MANDATORY SKILLS TO READ FIRST:
{skills_by_domain.{domain}.library_skills}
```

## Fresh Agent Principle

Each `Task()` spawns a NEW agent instance:

- No context pollution from previous agents
- Include ALL necessary context in the prompt
- Reference files instead of inlining content
- Never ask agent to "continue" previous work

## Agent Selection by Feature Type

| Feature Type | Phase 7 Leads                | Phase 8 Devs       | Phase 11 Reviewers                   | Phase 13 Testers   |
| ------------ | ---------------------------- | ------------------ | ------------------------------------ | ------------------ |
| Frontend     | frontend-lead, security-lead | frontend-developer | frontend-reviewer, frontend-security | frontend-tester ×3 |
| Backend      | backend-lead, security-lead  | backend-developer  | backend-reviewer, backend-security   | backend-tester ×3  |
| Full-Stack   | Both leads + security-lead   | Both developers    | All 4 reviewers                      | All 6 testers      |

## Related References

- [Agent Matrix](agent-matrix.md) - Complete agent responsibilities and selection rules
- [File Scope Boundaries](file-scope-boundaries.md) - Parallel agent conflict prevention
- [Phase 8: Implementation](phase-8-implementation.md) - Developer coordination patterns
