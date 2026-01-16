# Phase 6: Implementation

Execute the implementation plan by spawning developer agents with architecture context.

## Purpose

Transform plans and architecture into working code by:

- Implementing features following architecture decisions
- Maintaining code quality standards
- Verifying builds pass
- Documenting code changes

## Workflow

### Step 1: Determine Developer Type(s)

Based on feature domain:

| Feature Type             | Developer Agent(s)           | Parallelization |
| ------------------------ | ---------------------------- | --------------- |
| React UI only            | `frontend-developer`         | Single agent    |
| Go API only              | `backend-developer`          | Single agent    |
| Full-stack (independent) | Both developers              | ✅ Parallel     |
| Full-stack (dependent)   | Backend first, then frontend | ❌ Sequential   |

**Dependency test**: Can frontend work without backend completion?

- Yes (mocked APIs) → Parallel
- No (needs real backend) → Sequential

### Step 2: Determine Review Mode

**NEW:** Check task count in plan.md to select review mode:

- **1-3 tasks**: Use **Batch Mode** (current workflow - implement all → review at phase end)
- **4+ tasks**: Use **Per-Task Mode** (immediate review after each task)

See [phase-6-per-task-mode.md](phase-6-per-task-mode.md) for per-task workflow details.

**Remainder of this document describes Batch Mode workflow.**

### Step 3: Spawn Developer Agent(s)

#### Single Agent Pattern

```
Task(
  subagent_type: "frontend-developer",
  description: "Implement {feature-name}",
  prompt: "Implement this feature following the plan and architecture:

FEATURE: {feature-name}

PLAN:
{content from .claude/.output/features/{id}/plan.md}

ARCHITECTURE:
{content from .claude/.output/features/{id}/architecture.md}

CONTEXT FROM ARCHITECT:
{handoff.context from architecture phase}

IMPLEMENTATION REQUIREMENTS:
1. Follow all architecture decisions
2. Use existing patterns from codebase
3. Maintain code quality:
   - TypeScript strict mode
   - ESLint passing
   - No unused imports
4. Verify build passes after implementation

DELIVERABLE:
Implement all tasks from the plan.

Return JSON with:
{
  'status': 'complete|blocked|needs_review',
  'phase': 'implementation',
  'summary': 'What was implemented',
  'files_modified': ['list', 'of', 'paths'],
  'verification': {
    'build_passed': true|false,
    'lint_passed': true|false,
    'command_output': 'relevant output'
  },
  'handoff': {
    'next_phase': 'testing',
    'context': 'Key implementation details for test engineers'
  }
}
"
)
```

### Step 3.5: Handle Clarification Requests (MANDATORY)

**NEW:** Developers may return with `status: "needs_clarification"` per the STEP 0 protocol.

**If developer returns clarification request:**

1. **Review all questions** in the `questions` array:

```json
{
  "status": "needs_clarification",
  "questions": [
    {
      "category": "requirement",
      "question": "Should the filter dropdown show all statuses or only active ones?",
      "options": ["All statuses", "Only active"],
      "impact": "Affects UX and data loading performance"
    },
    {
      "category": "dependency",
      "question": "Does the backend /assets endpoint support status filtering?",
      "options": ["Yes", "No", "Unknown - need to check"],
      "impact": "May need backend work first"
    }
  ]
}
```

2. **Answer each question explicitly**:
   - For technical questions: research codebase, read documentation
   - For requirements questions: use AskUserQuestion to get user input
   - For architecture questions: refer to architecture.md or escalate

3. **Re-dispatch developer with answers**:

```
Task(
  subagent_type: "frontend-developer",
  description: "Implement {feature-name} with clarifications",
  prompt: "
    CLARIFICATION ANSWERS:

    Q1: Should the filter dropdown show all statuses or only active ones?
    → A1: Show all statuses. Performance is acceptable per architecture.md.

    Q2: Does the backend /assets endpoint support status filtering?
    → A2: Yes, verified in backend/handlers/assets.go:45-67. Use query param ?status=X

    Now proceed with implementation using these answers.

    [rest of original prompt with plan, architecture, etc.]
  "
)
```

4. **Do NOT let developer proceed with assumptions**. If questions remain unanswered, gather information first.

**Example user escalation** (when answer requires user decision):

```typescript
AskUserQuestion({
  questions: [{
    question: "Developer needs clarification: Should filter dropdown show all statuses or only active ones?",
    header: "Requirement",
    multiSelect: false,
    options: [
      {
        label: "All statuses",
        description: "Users see complete status list (Active, Inactive, Archived)"
      },
      {
        label: "Only active statuses",
        description: "Simpler UX, excludes Archived"
      }
    ]
  }]
})
```

#### Parallel Pattern (Independent Work)

```
# Spawn both at once
backend_task = Task(subagent_type: "backend-developer", ...)
frontend_task = Task(subagent_type: "frontend-developer", ...)

# Both run simultaneously
# Wait for both to complete
```

#### Sequential Pattern (Backend → Frontend)

```
# Step 1: Backend first
backend_result = Task(subagent_type: "backend-developer", ...)

# Step 2: Frontend with backend context
frontend_result = Task(
  subagent_type: "frontend-developer",
  prompt: "...

  BACKEND IMPLEMENTATION:
  {backend_result.handoff.context}
  Backend files: {backend_result.files_modified}
  ..."
)
```

### Step 3: Validate Developer Output

Check that developer returned:

- ✅ `status: "complete"` (not blocked)
- ✅ Files modified list populated
- ✅ Build verification included
- ✅ Handoff context for testing phase
- ✅ All plan tasks addressed

If `status: "blocked"`:

1. Read `handoff.context` for blocker details
2. Use AskUserQuestion to resolve blocker
3. Update plan/architecture if needed
4. Re-spawn developer with resolution

If `status: "needs_review"`:

1. Present implementation to user
2. Get approval/feedback
3. If changes needed, spawn developer again with feedback

### Step 4: Verify Build Success

Run verification commands:

```bash
# Frontend
cd modules/chariot/ui
npm run build

# Backend
cd modules/chariot/backend
go build ./...

# Capture results in progress file
```

### Step 5: Update Progress

```json
{
  "phases": {
    "implementation": {
      "status": "complete",
      "agents_used": ["frontend-developer"],
      "files_modified": ["list", "of", "paths"],
      "verification": {
        "build_passed": true,
        "lint_passed": true,
        "timestamp": "2024-12-13T12:00:00Z"
      },
      "completed_at": "2024-12-13T12:00:00Z"
    },
    "review": {
      "status": "in_progress",
      "retry_count": 0
    }
  },
  "current_phase": "review"
}
```

### Step 6: Mark TodoWrite Complete

```
TodoWrite: Mark "Phase 6: Implementation" as completed
TodoWrite: Mark "Phase 8: Code Review" as in_progress
```

## Exit Criteria

✅ Proceed to Phase 8 (Code Review) when:

- All developers returned `status: "complete"`
- Build passes
- Files modified documented
- Handoff includes context for testers
- Progress file updated
- TodoWrite marked complete

❌ Do NOT proceed if:

- Any developer blocked
- Build failing
- Lint errors present
- Handoff.context empty

## Parallel vs Sequential Decision Tree

```
Is frontend dependent on backend?
├─ No (mocked APIs) → Spawn in parallel
└─ Yes (needs real backend)
   └─ Backend first, then frontend

Are backend tasks independent?
├─ Yes (different modules) → Spawn in parallel
└─ No (shared dependencies) → Sequential

Are frontend tasks independent?
├─ Yes (different components) → Spawn in parallel
└─ No (shared state/props) → Sequential
```

## Common Issues

### "Developer agent ignores architecture decisions"

**Solution**: Make architecture context more prominent in prompt:

```
CRITICAL: Follow these architecture decisions:
1. {decision 1}
2. {decision 2}

Deviating from these decisions requires user approval.
```

### "Build fails after implementation"

**Solution**:

1. Capture build error output
2. Create issue context with error
3. Re-spawn developer with:

   ```
   Previous implementation caused build failure:

   {build error output}

   Fix the implementation to resolve this error.
   ```

### "Developer modifies unexpected files"

**Solution**: Review `files_modified` list. If out of scope:

1. Use AskUserQuestion: "Developer modified {file}. Was this expected?"
2. If no, revert and re-run with constraint: "Only modify files in plan.md"

## Related References

- [Phase 4: Architecture](phase-5-architecture.md) - Previous phase
- [Phase 6: Code Review](phase-8-code-review.md) - Next phase
- [Agent Handoffs](agent-handoffs.md) - JSON handoff format
- [Troubleshooting](troubleshooting.md) - Common issues
