# Phase 0: Setup

Create feature workspace directory and initialize progress tracking.

## Purpose

Establish organized workspace for simple feature development by:

- Creating feature output directory
- Initializing MANIFEST.yaml
- Setting up TodoWrite tracking
- Documenting feature metadata

## Workflow

### Step 1: Invoke Persisting-Agent-Outputs Skill

```
skill: "persisting-agent-outputs"
```

This skill discovers or creates the feature output directory using the standard pattern:

```
.claude/.output/features/YYYY-MM-DD-HHMMSS-{semantic-name}/
```

### Step 2: Create MANIFEST.yaml

```yaml
feature_name: "Simple Feature Name"
feature_slug: "simple-feature-name"
workflow: "orchestrating-simple-feature"
created_at: "2026-01-06T10:00:00Z"
created_by: "orchestrator"

phases:
  - brainstorming
  - planning
  - implementation
  - completion

artifacts: []

agents_contributed: []
```

### Step 3: Initialize TodoWrite

Use TodoWrite to track all phases:

```
TodoWrite([
  { content: 'Phase 0: Setup', status: 'in_progress', activeForm: 'Setting up feature workspace' },
  { content: 'Phase 1: Brainstorming', status: 'pending', activeForm: 'Brainstorming design' },
  { content: 'Phase 2: Planning', status: 'pending', activeForm: 'Creating implementation plan' },
  { content: 'Phase 3: Implementation', status: 'pending', activeForm: 'Implementing changes' },
  { content: 'Phase 4: Completion', status: 'pending', activeForm: 'Verifying completion' }
])
```

### Step 4: Mark Setup Complete

```
TodoWrite: Mark "Phase 0: Setup" as completed
TodoWrite: Mark "Phase 1: Brainstorming" as in_progress
```

## Exit Criteria

✅ Proceed to Phase 1 when:

- Feature directory created
- MANIFEST.yaml exists with correct structure
- TodoWrite initialized with all phases

❌ Do NOT proceed if:

- Feature directory creation failed
- MANIFEST.yaml missing required fields

## Simple vs Complex Feature Check

**IMPORTANT**: If during setup you realize the feature is MORE complex than initially thought:

- Scope > 100 lines
- Security implications discovered
- Architectural decisions needed
- Multiple services affected

**STOP and escalate to `orchestrating-feature-development`:**

```
I've discovered this feature is more complex than initially scoped.
Escalating to full orchestrating-feature-development workflow.

Create escalation.md documenting the reason for escalation.
```

## Related References

- [Phase 1: Brainstorming](phase-1-brainstorming.md) - Next phase
