# Developer Prompt Templates

**Phase 8 prompts for frontend-developer and backend-developer.**

---

## Frontend Developer Prompt

```markdown
Task(
subagent_type: "frontend-developer",
description: "Implement {task} for {feature}",
prompt: "

## Task: Implement Frontend Feature

### Implementation Tasks

{Tasks from Phase 7 plan.md for your domain}

### Architecture Reference

{From .feature-development/architecture-plan.md - frontend section}

### MANDATORY SKILLS TO READ FIRST

You MUST read these skills before coding:

- developing-with-tdd
- verifying-before-completion
  {skills_by_domain.frontend.library_skills from skill-manifest.yaml}

### Files to Modify/Create

{Specific file paths from plan}

### Constraints

- Follow existing patterns from codebase
- TypeScript strict mode - no 'any' types
- Use TanStack Query for data fetching
- Use Zustand for client state
- Accessible components (keyboard navigation)
- Write tests alongside implementation

### TDD Requirement

For each function:

1. Write test first (RED)
2. Implement until test passes (GREEN)
3. Refactor if needed (REFACTOR)

### Output Format

{
'status': 'complete',
'tasks_completed': ['T001', 'T002'],
'files_modified': ['src/hooks/useAssetFilters.ts'],
'files_created': ['src/hooks/useAssetFilters.test.ts'],
'tests_written': 5,
'skills_invoked': ['developing-with-tdd', 'using-tanstack-query', ...]
}

### Verification Before Returning

Run and confirm:

- npm run build (passes)
- npm run lint (no errors)
- npm test (all pass)

DO NOT claim completion without running verification commands.
"
)
```

---

## Backend Developer Prompt

```markdown
Task(
subagent_type: "backend-developer",
description: "Implement {task} for {feature}",
prompt: "

## Task: Implement Backend Feature

### Implementation Tasks

{Tasks from Phase 7 plan.md for your domain}

### Architecture Reference

{From .feature-development/architecture-plan.md - backend section}

### MANDATORY SKILLS TO READ FIRST

You MUST read these skills before coding:

- developing-with-tdd
- verifying-before-completion
  {skills_by_domain.backend.library_skills from skill-manifest.yaml}

### Files to Modify/Create

{Specific file paths from plan}

### Constraints

- Follow existing Go patterns
- Proper error wrapping and handling
- Concurrency-safe code
- Use existing repository patterns
- Write tests alongside implementation

### TDD Requirement

For each function:

1. Write test first (RED)
2. Implement until test passes (GREEN)
3. Refactor if needed (REFACTOR)

### Output Format

{
'status': 'complete',
'tasks_completed': ['T003', 'T004'],
'files_modified': ['pkg/handler/asset.go'],
'files_created': ['pkg/handler/asset_test.go'],
'tests_written': 8,
'skills_invoked': ['developing-with-tdd', 'go-best-practices', ...]
}

### Verification Before Returning

Run and confirm:

- go build ./... (passes)
- golangci-lint run (no errors)
- go test ./... (all pass)

DO NOT claim completion without running verification commands.
"
)
```

---

## BUGFIX/SMALL Path (Simplified)

For work types without architecture plan:

```markdown
Task(
subagent_type: "{domain}-developer",
description: "Implement small change for {feature}",
prompt: "

## Task: {Small change description}

### Files to Modify

{From Phase 3 discovery - affected files}

### MANDATORY SKILLS TO READ FIRST

- developing-with-tdd
- verifying-before-completion
  {Skills from skill-manifest.yaml}

### Constraint

Keep changes minimal and focused. This is a SMALL/BUGFIX change.

### TDD Requirement

1. Write test first (RED)
2. Implement until test passes (GREEN)

### Verification Before Returning

{Domain-specific verification commands}

DO NOT claim completion without running verification commands.
"
)
```

---

## Batch Execution Pattern

For complex features with multiple batches:

```markdown
# Batch 1: Foundation (execute first)

Task(
subagent_type: "frontend-developer",
prompt: "
BATCH: 1 of 3 (Foundation)

### Tasks for This Batch

- T001: Create base hook
- T002: Add type definitions

### Dependencies

None (foundation batch)

{... rest of prompt ...}
"
)

# Wait for batch 1 to complete

# Batch 2: Dependent tasks

Task(
subagent_type: "frontend-developer",
prompt: "
BATCH: 2 of 3 (Building on foundation)

### Tasks for This Batch

- T003: Implement filter logic (depends on T001)
- T004: Add validation (depends on T002)

### Dependencies

Batch 1 must be complete.

### Context from Previous Batch

{Summary of what was implemented in batch 1}

{... rest of prompt ...}
"
)
```

---

## Related References

- [Phase 8: Implementation](../phase-8-implementation.md) - Phase context
- [Agent Matrix](../agent-matrix.md) - Agent selection
- [File Scope Boundaries](../file-scope-boundaries.md) - Conflict detection
