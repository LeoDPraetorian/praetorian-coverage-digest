# Phase 1: Brainstorming

Refine the feature concept through collaborative questioning before creating detailed plans.

## Purpose

Transform rough feature requests into well-defined designs by:

- Exploring alternatives
- Identifying constraints
- Clarifying requirements
- Validating assumptions

## Workflow

### Step 1: Invoke Brainstorming Skill

```
skill: "brainstorming"
```

The brainstorming skill uses Socratic method to:

- Ask clarifying questions
- Explore edge cases
- Suggest alternatives
- Refine the design iteratively

### Step 2: Record Design Decisions

Save refined design to feature workspace:

```bash
# Save brainstorming output
cat > .claude/features/{feature-id}/design.md << 'EOF'
# {Feature Name} - Design

## Overview
{refined description}

## Key Decisions
- Decision 1: {rationale}
- Decision 2: {rationale}

## Alternatives Considered
- Alternative 1: {why rejected}

## Constraints
- Constraint 1
- Constraint 2
EOF
```

### Step 3: Human Checkpoint (MANDATORY)

Use AskUserQuestion:

```
The brainstorming phase produced this refined design:

{summary of design.md}

Key decisions:
- {decision 1}
- {decision 2}

Do you approve this design before we proceed to planning?

Options:
- Yes, proceed to planning phase
- No, let's refine the design further
- Pause - I need to think about this
```

### Step 4: Update Progress

```json
{
  "phases": {
    "brainstorming": {
      "status": "complete",
      "approved": true,
      "design_file": ".claude/features/{id}/design.md",
      "completed_at": "2024-12-13T10:30:00Z"
    },
    "planning": {
      "status": "in_progress"
    }
  },
  "current_phase": "planning"
}
```

### Step 5: Mark TodoWrite Complete

```
TodoWrite: Mark "Phase 1: Brainstorming" as completed
TodoWrite: Mark "Phase 2: Discovery" as in_progress
```

## Exit Criteria

✅ Proceed to Phase 2 when:

- Design documented in `design.md`
- User explicitly approves design
- Progress file updated
- TodoWrite marked complete

❌ Do NOT proceed if:

- User hasn't approved
- Design has unresolved questions
- Constraints not identified

## Common Issues

### "User says design is too vague"

**Solution**: Run brainstorming skill again with specific questions about the vague areas.

### "Should I skip brainstorming for simple features?"

**Answer**: No. Even "simple" features benefit from 5-10 minutes of design refinement. Prevents mid-implementation surprises.

### "Brainstorming is taking too long"

**Solution**: Use AskUserQuestion to timebox: "We've spent 15 minutes refining. Should we proceed with current design or continue exploring?"

## Related References

- [Phase 2: Discovery](phase-2-discovery.md) - Next phase
- [Phase 3: Planning](phase-3-planning.md) - Following Discovery
- [Progress Persistence](progress-persistence.md) - Progress file format
