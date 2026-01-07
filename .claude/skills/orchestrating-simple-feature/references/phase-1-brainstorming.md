# Phase 1: Brainstorming

Quickly validate the feature approach and identify edge cases before planning.

## Purpose

Ensure simple features solve the right problem by:

- Validating the proposed approach
- Identifying edge cases
- Confirming simplicity assumptions (< 100 lines, no architecture needed)
- Clarifying requirements

## Workflow

### Step 1: Invoke Brainstorming Skill

```
skill: "brainstorming"
```

The brainstorming skill uses Socratic method to:

- Ask clarifying questions
- Explore edge cases
- Suggest alternatives
- Validate simplicity assumptions

**For simple features, focus on:**

- Is this really the simplest approach?
- Are there existing utilities we should reuse?
- What edge cases might we miss?
- Does this follow existing patterns?

### Step 2: Record Design Decisions

Save refined design to feature workspace:

```bash
# Save brainstorming output
cat > .claude/.output/features/{feature-id}/design.md << 'EOF'
# {Feature Name} - Design

## Overview
{refined description}

## Approach
{implementation approach - must be < 100 lines}

## Edge Cases
- Edge case 1: {how to handle}
- Edge case 2: {how to handle}

## Existing Patterns
{which existing code patterns to follow}

## Simplicity Validation
✅ < 100 lines of code
✅ No new architectural patterns
✅ No security implications
✅ < 5 files affected
✅ Low risk

{If any ❌, escalate to orchestrating-feature-development}
EOF
```

### Step 3: Simplicity Gate Check

**CRITICAL**: Review the brainstorming output against simplicity criteria:

| Criteria                    | Status | If ❌, escalate |
| --------------------------- | ------ | --------------- |
| < 100 lines of code         | ✅/❌  | Large feature   |
| No architectural decisions  | ✅/❌  | Needs architect |
| No security implications    | ✅/❌  | Needs security  |
| < 5 files                   | ✅/❌  | Wide scope      |
| Follows existing patterns   | ✅/❌  | New patterns    |

**If ANY criteria fail, escalate:**

```
During brainstorming, I discovered this feature is more complex than initially scoped:
- {specific criteria that failed}

Escalating to orchestrating-feature-development workflow.
```

### Step 4: Human Checkpoint (MANDATORY)

Use AskUserQuestion:

```
The brainstorming phase produced this refined design:

{summary of design.md}

Simplicity validation:
✅ < 100 lines of code
✅ No architectural decisions
✅ No security implications

Approach:
- {approach summary}

Do you approve this design before we proceed to planning?

Options:
- Yes, proceed to planning phase
- No, let's refine the design further
- Escalate - this is more complex than expected
```

### Step 5: Update Progress

Update MANIFEST.yaml:

```yaml
phases_completed:
  - name: brainstorming
    completed_at: "2026-01-06T10:15:00Z"
    approved: true

artifacts:
  - design.md
```

### Step 6: Mark TodoWrite Complete

```
TodoWrite: Mark "Phase 1: Brainstorming" as completed
TodoWrite: Mark "Phase 2: Planning" as in_progress
```

## Exit Criteria

✅ Proceed to Phase 2 when:

- Design documented in `design.md`
- Simplicity validation passed (all ✅)
- User explicitly approves design
- TodoWrite marked complete

❌ Do NOT proceed if:

- User hasn't approved
- Any simplicity criteria failed (escalate instead)
- Design has unresolved questions
- Edge cases not identified

## Common Issues

### "User says design is too vague"

**Solution**: Run brainstorming skill again with specific questions about the vague areas.

### "Brainstorming revealed complexity"

**Answer**: Escalate to `orchestrating-feature-development`. Better to catch complexity now than mid-implementation.

### "Should I skip brainstorming for trivial features?"

**Answer**: No. Even 20-line features benefit from 5 minutes of brainstorming. Prevents:
- Missing edge cases
- Reinventing existing utilities
- Wrong approach requiring refactor

## Related References

- [Phase 0: Setup](phase-0-setup.md) - Previous phase
- [Phase 2: Planning](phase-2-planning.md) - Next phase
