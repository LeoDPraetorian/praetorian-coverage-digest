# Phase 3: Implementation

Execute the implementation plan in controlled batches with review checkpoints.

## Purpose

Transform the plan into working code by:

- Implementing changes following existing patterns
- Verifying build passes
- Handling edge cases properly
- Maintaining code quality standards

## Workflow

### Step 1: Invoke Executing-Plans Skill

```
skill: "executing-plans"
```

The executing-plans skill implements the plan in batches:

- Executes tasks in order
- Runs verification steps
- Provides review checkpoints between batches
- Verifies builds pass

**For simple features:**
- Typical batch size: 2-3 tasks
- Review checkpoint after each batch
- Final verification before marking complete

### Step 2: Implementation Pattern

```
Task flow:
1. Read plan from implementation-plan.md
2. Execute Task 1 → verify
3. Execute Task 2 → verify
4. Review checkpoint (if batch size reached)
5. Continue until all tasks complete
6. Final verification
```

### Step 3: Verification During Implementation

After each task:

```bash
# Build verification (if applicable)
npm run build  # Frontend
go build ./... # Backend

# Lint verification
npm run lint   # Frontend
gofmt -l .     # Backend

# Existing tests
npm test       # Frontend
go test ./...  # Backend
```

### Step 4: Code Quality Checks

**Simple features must maintain quality:**

- ✅ Follows existing code patterns
- ✅ No unused imports
- ✅ Proper error handling
- ✅ Handles edge cases from brainstorming
- ✅ TypeScript strict mode (if applicable)
- ✅ Go vet passes (if applicable)

### Step 5: Scope Creep Check

**During implementation, watch for:**

| Warning Sign                     | Action         |
| -------------------------------- | -------------- |
| Code exceeding 100 lines         | Stop, escalate |
| Need to modify > 5 files         | Stop, escalate |
| Architectural decision needed    | Stop, escalate |
| Existing pattern doesn't fit     | Stop, escalate |
| Need to add new dependencies     | Stop, escalate |
| Complexity higher than estimated | Stop, escalate |

**If scope creep detected:**

```
During implementation, I discovered:
- {specific scope creep}

This exceeds simple feature limits. Stopping implementation and escalating to orchestrating-feature-development.

Document in escalation.md with:
- What was implemented so far
- Why escalation needed
- Recommendation for next steps
```

### Step 6: Update Progress

Update MANIFEST.yaml:

```yaml
phases_completed:
  - name: brainstorming
    completed_at: "2026-01-06T10:15:00Z"
  - name: planning
    completed_at: "2026-01-06T10:25:00Z"
  - name: implementation
    completed_at: "2026-01-06T10:45:00Z"
    actual_lines: 42
    files_modified:
      - src/utils/formatters.ts
      - src/utils/validators.ts

artifacts:
  - design.md
  - implementation-plan.md
  - implementation-notes.md
```

### Step 7: Mark TodoWrite Complete

```
TodoWrite: Mark "Phase 3: Implementation" as completed
TodoWrite: Mark "Phase 4: Completion" as in_progress
```

## Exit Criteria

✅ Proceed to Phase 4 when:

- All tasks from plan completed
- Build passes
- Lint passes
- Existing tests pass
- Code < 100 lines (actual count)
- Follows existing patterns
- TodoWrite marked complete

❌ Do NOT proceed if:

- Build failing
- Lint errors present
- Tests broken
- Scope exceeded limits
- Code doesn't follow patterns

## Common Issues

### "Build fails after implementation"

**Solution**:

1. Capture build error output
2. Fix the specific error
3. Re-run build verification
4. If multiple attempts needed, document in implementation-notes.md

### "Code exceeds 100 lines"

**Solution**: Stop immediately. This isn't a simple feature.

```
Implementation exceeded 100-line limit (actual: {count} lines).
Escalating to orchestrating-feature-development for proper review and testing phases.
```

### "Existing tests fail"

**Solution**:

1. Analyze which tests failed
2. If tests need update (expected), update them
3. If tests reveal bug, fix implementation
4. Do NOT skip or disable tests

### "Pattern doesn't exist in codebase"

**Solution**: This is an architectural decision. Escalate to full workflow for architecture phase.

## Related References

- [Phase 2: Planning](phase-2-planning.md) - Previous phase
- [Phase 4: Completion](phase-4-completion.md) - Next phase
