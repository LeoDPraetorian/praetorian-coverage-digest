# Architect Prompt Templates

**Phase 7 prompts for frontend-lead, backend-lead, and security-lead.**

---

## Frontend Lead Prompt

```markdown
Task(
subagent_type: "frontend-lead",
description: "Design frontend architecture for {feature}",
prompt: "

## Task: Design Frontend Architecture

### Feature Request

{User's feature description}

### Codebase Context

{From Phase 3 discovery.md - relevant patterns, existing components}

### MANDATORY SKILLS TO READ FIRST

You MUST read these skills before designing:

- adhering-to-dry
- adhering-to-yagni
- writing-plans
  {skills_by_domain.frontend.library_skills from skill-manifest.yaml}

### Your Deliverables

1. **Architecture Design** (.feature-development/architecture-frontend.md)
   - Component hierarchy
   - State management approach
   - Data flow patterns
   - Integration points

2. **Implementation Tasks** (to be merged into plan.md)
   - Specific, actionable tasks
   - File paths for each task
   - Dependencies between tasks
   - Estimated complexity

### Constraints

- Follow existing patterns from codebase
- Use approved libraries (TanStack Query, Zustand, Tailwind)
- TypeScript strict mode
- Accessibility requirements

### Output Format

{
'status': 'complete',
'architecture_file': '.feature-development/architecture-frontend.md',
'tasks': [
{ 'id': 'T001', 'description': '...', 'file': '...', 'depends_on': [] }
],
'risks': [],
'skills_invoked': ['adhering-to-dry', ...]
}
"
)
```

---

## Backend Lead Prompt

```markdown
Task(
subagent_type: "backend-lead",
description: "Design backend architecture for {feature}",
prompt: "

## Task: Design Backend Architecture

### Feature Request

{User's feature description}

### Codebase Context

{From Phase 3 discovery.md - relevant patterns, existing handlers}

### MANDATORY SKILLS TO READ FIRST

You MUST read these skills before designing:

- adhering-to-dry
- adhering-to-yagni
- writing-plans
  {skills_by_domain.backend.library_skills from skill-manifest.yaml}

### Your Deliverables

1. **Architecture Design** (.feature-development/architecture-backend.md)
   - Handler design
   - Service layer structure
   - Data models
   - External integrations

2. **Implementation Tasks** (to be merged into plan.md)
   - Specific, actionable tasks
   - File paths for each task
   - Dependencies between tasks
   - Estimated complexity

### Constraints

- Follow existing Go patterns
- Use existing DynamoDB/Neo4j patterns
- Error handling with proper wrapping
- Concurrency-safe design

### Output Format

{
'status': 'complete',
'architecture_file': '.feature-development/architecture-backend.md',
'tasks': [
{ 'id': 'T001', 'description': '...', 'file': '...', 'depends_on': [] }
],
'risks': [],
'skills_invoked': ['adhering-to-dry', ...]
}
"
)
```

---

## Security Lead Prompt

```markdown
Task(
subagent_type: "security-lead",
description: "Security assessment for {feature}",
prompt: "

## Task: Security Assessment

### Feature Request

{User's feature description}

### Architecture Proposals

{From frontend-lead and/or backend-lead outputs}

### MANDATORY SKILLS TO READ FIRST

- adhering-to-dry
  {Security-specific skills from skill-manifest.yaml}

### Your Deliverables

1. **Security Assessment** (.feature-development/security-assessment.md)
   - Threat model for this feature
   - Attack vectors to consider
   - Required security controls
   - Data flow security analysis

2. **Security Requirements** (to be added to architecture)
   - Authentication requirements
   - Authorization checks needed
   - Input validation requirements
   - Encryption/data protection needs

### Focus Areas

- OWASP Top 10 relevance
- Authentication/authorization flows
- Input validation points
- Data exposure risks
- API security

### Output Format

{
'status': 'complete',
'assessment_file': '.feature-development/security-assessment.md',
'requirements': [
{ 'category': 'auth', 'requirement': '...', 'priority': 'P0' }
],
'risks': [
{ 'risk': '...', 'mitigation': '...', 'severity': 'HIGH' }
],
'skills_invoked': [...]
}
"
)
```

---

## Full-Stack: Combined Prompt Pattern

When spawning all three in parallel:

```markdown
# Spawn ALL in SINGLE message

Task("frontend-lead", "Design frontend architecture...", {frontend_prompt})
Task("backend-lead", "Design backend architecture...", {backend_prompt})
Task("security-lead", "Security assessment...", {security_prompt})
```

**Wait for all to complete, then merge outputs into:**

- `.feature-development/architecture-plan.md` (combined architecture)
- `.feature-development/plan.md` (all tasks with dependencies)
- `.feature-development/security-assessment.md` (security requirements)

---

## Related References

- [Phase 7: Architecture Plan](../phase-7-architecture-plan.md) - Phase context
- [Agent Matrix](../agent-matrix.md) - Agent selection
