# Phase 4: Architecture

Make design decisions by spawning domain lead + security-lead agents in parallel. Their combined analysis ensures comprehensive architecture validation with security considerations before implementation.

## Purpose

Resolve architectural questions before implementation by:

- Analyzing existing codebase patterns (domain lead)
- Assessing security implications (security-lead)
- Choosing appropriate designs with quality gates
- Documenting decisions with rationale
- Identifying security requirements early

## Why Parallel Lead + Security?

**Domain Lead** (frontend-lead or backend-lead) focuses on:

- Component hierarchy and structure
- State management patterns
- API integration approaches
- File organization
- Scalability and extensibility
- Invokes `brainstorming` and `writing-plans` for their domain

**Security Lead** focuses on:

- Authentication/authorization requirements
- Input validation needs
- Data protection considerations
- OWASP Top 10 relevance
- Threat modeling
- Compliance requirements

**Together**: Comprehensive validation that catches both structural issues AND security gaps before implementation.

## Workflow

### Step 1: Determine Agent Types

Based on feature domain from plan:

| Feature Type  | Lead Agent(s)                    | Security Agent  | Total |
| ------------- | -------------------------------- | --------------- | ----- |
| Frontend only | `frontend-lead`                  | `security-lead` | 2     |
| Backend only  | `backend-lead`                   | `security-lead` | 2     |
| Full-stack    | `frontend-lead` + `backend-lead` | `security-lead` | 3     |

**Note**: Security-lead is ALWAYS included regardless of feature type.

### Step 2: Spawn All Agents in Parallel

**CRITICAL:** Spawn ALL agents in a SINGLE message using parallel Task calls.

#### Frontend Feature Pattern

```
# Spawn BOTH in same message
Task(
  subagent_type: "frontend-lead",
  description: "Architecture for {feature-name}",
  prompt: "Design architecture for this feature:

FEATURE: {feature-name}

DESIGN:
{content from .claude/.output/features/{id}/design.md}

PLAN:
{content from .claude/.output/features/{id}/plan.md}

INSTRUCTIONS:
1. Invoke `brainstorming` skill to explore alternatives
2. Invoke `writing-plans` skill to document decisions
3. Search codebase for existing patterns to reuse

DELIVERABLE:
Document your architectural decisions focusing on:
1. Component hierarchy and structure
2. State management approach
3. API integration patterns
4. File organization
5. Reusable components identified
6. Implementation tasks breakdown

Save to: .claude/.output/features/{id}/architecture.md

Return JSON:
{
  'status': 'complete|blocked',
  'summary': '1-2 sentence description',
  'recommendations': ['key decision 1', 'key decision 2'],
  'concerns': ['potential issue 1', 'potential issue 2']
}
"
)

Task(
  subagent_type: "security-lead",
  description: "Security assessment for {feature-name}",
  prompt: "Assess security implications for this feature:

FEATURE: {feature-name}

DESIGN:
{content from .claude/.output/features/{id}/design.md}

PLAN:
{content from .claude/.output/features/{id}/plan.md}

FOCUS AREAS:
1. Authentication/authorization requirements
2. Input validation needs
3. Data protection (at rest and in transit)
4. OWASP Top 10 relevance
5. Session management
6. API security

DELIVERABLE:
Document your security assessment focusing on:
1. Required security controls
2. Authentication flow (if applicable)
3. Authorization requirements (RBAC, etc.)
4. Input validation requirements
5. Data handling requirements
6. Security test requirements

Save to: .claude/.output/features/{id}/security-assessment.md

Return JSON:
{
  'status': 'complete|blocked',
  'summary': '1-2 sentence description',
  'security_requirements': ['requirement 1', 'requirement 2'],
  'concerns': ['risk 1', 'risk 2']
}
"
)
```

#### Backend Feature Pattern

```
# Spawn BOTH in same message
Task(subagent_type: "backend-lead", ...)
Task(subagent_type: "security-lead", ...)
```

#### Full-Stack Feature Pattern

```
# Spawn ALL THREE in same message
Task(subagent_type: "frontend-lead", ...)
Task(subagent_type: "backend-lead", ...)
Task(subagent_type: "security-lead", ...)
```

### Step 3: Wait for All Agents to Complete

All agents run in parallel. Wait for ALL to finish before proceeding.

### Step 4: Merge Outputs into Final Architecture

Combine outputs from all agents:

```markdown
# Architecture for {feature-name}

## Component Architecture

{from frontend-lead/backend-lead}

## State Management

{from frontend-lead}

## API Design

{from backend-lead, if applicable}

## File Organization

{from domain leads}

## Security Requirements

{from security-lead}

### Authentication

{if applicable}

### Authorization

{RBAC requirements, etc.}

### Input Validation

{validation requirements}

### Data Protection

{encryption, handling requirements}

## Implementation Tasks

{merged from all leads}

## Security Test Requirements

{from security-lead}
```

Save merged architecture to: `.claude/.output/features/{id}/architecture.md`
Save security assessment to: `.claude/.output/features/{id}/security-assessment.md`

### Step 5: Human Checkpoint (MANDATORY)

```typescript
AskUserQuestion({
  questions: [
    {
      question:
        "Architecture phase complete. Review the proposed architecture before implementation?",
      header: "Architecture",
      multiSelect: false,
      options: [
        { label: "Approve", description: "Proceed to implementation" },
        { label: "Request changes", description: "Modify architecture before proceeding" },
        {
          label: "Review files",
          description: "Show me architecture.md and security-assessment.md",
        },
      ],
    },
  ],
});
```

**Do NOT proceed without human approval.**

### Step 6: Handle Blocked Agents

If any agent returns `status: "blocked"`:

1. Read the agent's `concerns` for blocker details
2. Use AskUserQuestion to present the issue to user
3. Resolve the blocker (may require updating plan)
4. Re-spawn blocked agent with resolution

### Step 7: Update Progress

```json
{
  "phases": {
    "architecture": {
      "status": "complete",
      "agents_used": ["frontend-lead", "security-lead"],
      "outputs": {
        "architecture": ".claude/.output/features/{id}/architecture.md",
        "security": ".claude/.output/features/{id}/security-assessment.md"
      },
      "human_approved": true,
      "completed_at": "2025-12-28T11:30:00Z"
    },
    "implementation": {
      "status": "in_progress"
    }
  },
  "current_phase": "implementation"
}
```

### Step 8: Mark TodoWrite Complete

```
TodoWrite: Mark "Phase 4: Architecture" as completed
TodoWrite: Mark "Phase 5: Implementation" as in_progress
```

## Exit Criteria

✅ Proceed to Phase 5 when:

- Architecture documented in `architecture.md`
- Security assessment documented in `security-assessment.md`
- ALL agents returned `status: "complete"`
- Human explicitly approved architecture
- Progress file updated
- TodoWrite marked complete

❌ Do NOT proceed if:

- Any agent returned `status: "blocked"` (must resolve first)
- Human has not approved
- Architecture missing security requirements
- No rationale provided for decisions

## Full-Stack Features

For features spanning frontend + backend, spawn ALL THREE leads in parallel:

```
# Single message with all three agents
Task(subagent_type: "frontend-lead", description: "Frontend architecture...", ...)
Task(subagent_type: "backend-lead", description: "Backend architecture...", ...)
Task(subagent_type: "security-lead", description: "Security assessment...", ...)
```

**Outputs:**

- `.claude/.output/features/{id}/architecture.md` (frontend decisions)
- `.claude/.output/features/{id}/backend-architecture.md` (backend decisions)
- `.claude/.output/features/{id}/security-assessment.md` (security requirements)

**Total agents for full-stack**: 3 (frontend-lead + backend-lead + security-lead)

## Common Issues

### "Leads disagree on approach"

**Solution**: Present conflict to user via AskUserQuestion with both perspectives. Document user's decision in architecture.md.

### "Security-lead raises concerns about domain lead's design"

**Expected behavior**. Security concerns should:

1. Be documented in security-assessment.md
2. Inform implementation requirements
3. Be addressed in Phase 6 (Code Review) by security reviewers

### "Should I skip security-lead for simple UI features?"

**Answer**: No. Security-lead runs in parallel, adding minimal overhead. Even "simple" features can have XSS vulnerabilities or data handling issues. Always include security assessment.

### "Architecture decisions are too vague"

**Solution**: Re-spawn domain lead with explicit instruction:

```
Previous architecture was too vague. Be specific:
- Exact file paths for new components
- Specific library versions
- Concrete code examples
```

## Related References

- [Phase 2: Discovery](phase-2-discovery.md) - Discovery reports (input)
- [Phase 3: Planning](phase-3-planning.md) - Previous phase
- [Phase 5: Implementation](phase-5-implementation.md) - Next phase
- [Phase 6: Code Review](phase-6-code-review.md) - Where security review happens
- [Agent Handoffs](agent-handoffs.md) - JSON handoff format
- [Conflict Resolution Examples](conflict-resolution-examples.md) - Handling disagreements
