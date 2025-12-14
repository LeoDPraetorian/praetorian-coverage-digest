# Phase 3: Architecture

Make design decisions by spawning specialist architect agents to reference existing patterns.

## Purpose

Resolve architectural questions before implementation by:
- Analyzing existing codebase patterns
- Choosing appropriate designs
- Documenting decisions with rationale
- Identifying reusable components

## Workflow

### Step 1: Determine Architect Type

Based on feature domain from plan:

| Feature Type | Architect Agent |
|--------------|-----------------|
| React UI components | `frontend-architect` |
| Go API/backend | `backend-architect` |
| Security features | `security-architect` |
| Full-stack | Spawn both (sequential) |

### Step 2: Spawn Architect Agent

Use Task tool with structured prompt:

```
Task(
  subagent_type: "frontend-architect",
  description: "Architecture for {feature-name}",
  prompt: "Design architecture for this feature:

FEATURE: {feature-name}

DESIGN:
{content from .claude/features/{id}/design.md}

PLAN:
{content from .claude/features/{id}/plan.md}

ARCHITECTURAL QUESTIONS:
{extract 'Architecture Decisions Needed' from plan.md}

REFERENCE EXISTING PATTERNS:
Search for similar features in these paths:
- {relevant-frontend-paths}
- {relevant-component-patterns}

DELIVERABLE:
Save architecture decisions to:
.claude/features/{id}/architecture.md

Include:
1. Component hierarchy (if UI)
2. State management approach
3. API integration patterns
4. File organization
5. Reusable components identified
6. Rationale for each decision

Return JSON with:
{
  'status': 'complete',
  'phase': 'architecture',
  'summary': '1-2 sentence description',
  'files_modified': ['.claude/features/{id}/architecture.md'],
  'handoff': {
    'next_phase': 'implementation',
    'context': 'Key decisions developers need to know'
  }
}
"
)
```

### Step 3: Validate Architect Output

Check that architect returned:
- ✅ Architecture documented
- ✅ Existing patterns referenced
- ✅ Decisions include rationale
- ✅ File organization specified
- ✅ JSON handoff with context

If blocked status returned:
1. Read `handoff.context` for reason
2. Use AskUserQuestion to get user input
3. Update design/plan as needed
4. Re-spawn architect with updates

### Step 4: Update Progress

```json
{
  "phases": {
    "architecture": {
      "status": "complete",
      "architecture_file": ".claude/features/{id}/architecture.md",
      "agent_used": "frontend-architect",
      "decisions": [
        "Compound component pattern",
        "Zustand for state",
        "TanStack Query for API"
      ],
      "completed_at": "2024-12-13T11:30:00Z"
    },
    "implementation": {
      "status": "in_progress"
    }
  },
  "current_phase": "implementation"
}
```

### Step 5: Mark TodoWrite Complete

```
TodoWrite: Mark "Phase 3: Architecture" as completed
TodoWrite: Mark "Phase 4: Implementation" as in_progress
```

## Exit Criteria

✅ Proceed to Phase 4 when:
- Architecture documented in `architecture.md`
- Architect returned `status: "complete"`
- Handoff includes context for developers
- Progress file updated
- TodoWrite marked complete

❌ Do NOT proceed if:
- Architect returned `status: "blocked"`
- Architecture has unresolved questions
- No rationale provided for decisions
- Handoff.context is empty

## Full-Stack Features

For features spanning frontend + backend:

### Step 1: Backend Architecture First

```
Task(subagent_type: "backend-architect", ...)
```

Save to: `.claude/features/{id}/architecture-backend.md`

### Step 2: Frontend Architecture Second

```
Task(subagent_type: "frontend-architect", ...)
```

Include backend architecture context in prompt.

Save to: `.claude/features/{id}/architecture-frontend.md`

### Step 3: Combine Handoffs

Merge both handoff.context fields for implementation phase.

## Common Issues

### "Architect agent ignores existing patterns"

**Solution**: Make explicit in prompt:
```
CRITICAL: Search codebase for similar patterns BEFORE proposing new designs.
Use Grep/Glob to find existing:
- Component structures
- State patterns
- API integration code
```

### "Architecture decisions are too vague"

**Solution**: Re-spawn with:
```
Previous architecture was too vague. Be specific:
- Exact file paths for new components
- Specific library versions
- Concrete examples, not abstract descriptions
```

### "Should I skip architecture for small features?"

**Answer**: No. Even small features benefit from 10-15 minutes of architecture review to ensure consistency with existing patterns.

## Related References

- [Phase 2: Planning](phase-2-planning.md) - Previous phase
- [Phase 4: Implementation](phase-4-implementation.md) - Next phase
- [Agent Handoffs](agent-handoffs.md) - JSON handoff format
