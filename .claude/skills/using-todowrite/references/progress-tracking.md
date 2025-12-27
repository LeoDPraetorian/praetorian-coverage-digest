# Progress Tracking Best Practices

## The 5 Golden Rules

### Rule 1: Initialize Complete Task List Upfront

**❌ Don't: Create tasks as you go**

```
User: "Refactor authentication"

Bad approach:
1. Start analyzing code
2. Finish analysis → Create TodoWrite with "Analyze code" (completed)
3. Start implementing → Add "Implement changes" (in_progress)
4. Finish implementing → Add "Write tests" (in_progress)
```

**✅ Do: Create full task list before any work**

```
User: "Refactor authentication"

Good approach:
1. FIRST: Create TodoWrite with ALL tasks:
   - Analyze current implementation (pending)
   - Design new architecture (pending)
   - Implement changes (pending)
   - Write tests (pending)
   - Update documentation (pending)
2. THEN: Start work, updating statuses as you go
```

**Why this matters:**

- **Accountability** - User sees full scope upfront
- **No scope creep** - Can't silently add work without updating todos
- **Better estimates** - Planning forces thinking through all steps
- **Claude Code best practice** - System prompt explicitly requires this

**From system prompt:**

> "Claude Code uses TODO lists to plan its work and stick to the plan, with creating the TODO list usually being the very first tool call."

### Rule 2: Mark in_progress BEFORE Starting Work

**❌ Don't: Start work, then update status**

```
Bad timing:
1. Start implementing feature
2. Write code for 5 minutes
3. Update TodoWrite → mark "Implement feature" as in_progress
```

**✅ Do: Update status, THEN begin work**

```
Good timing:
1. Update TodoWrite → mark "Implement feature" as in_progress
2. THEN start implementing feature
3. Write code
```

**Why this matters:**

- **Real-time visibility** - User knows what you're doing NOW
- **No gaps** - User doesn't wonder "Is Claude stuck?"
- **State consistency** - TodoWrite always reflects current reality

**Ideal state:** Only ONE task in_progress at a time (shows focus).

**Exception:** Multiple tasks in_progress when truly parallel (using Task tool to spawn multiple agents).

### Rule 3: Update to completed IMMEDIATELY After Finishing

**❌ Don't: Batch multiple completions**

```
Bad approach:
1. Complete task 1
2. Complete task 2
3. Complete task 3
4. NOW update TodoWrite → mark all 3 as completed
```

**✅ Do: Mark completed as soon as each task finishes**

```
Good approach:
1. Complete task 1 → Update TodoWrite (mark task 1 completed)
2. Complete task 2 → Update TodoWrite (mark task 2 completed)
3. Complete task 3 → Update TodoWrite (mark task 3 completed)
```

**Why this matters:**

- **Incremental progress** - User sees progress in real-time, not batched
- **Better user experience** - Confirms work is happening, not stuck
- **Accurate state** - TodoWrite always reflects current reality

**From system prompt:**

> "It is critical that you mark todos as completed as soon as you are done with a task. Do not batch up multiple tasks before marking them as completed."

### Rule 4: Provide Real-Time Updates

**❌ Don't: Wait until end to update all statuses**

```
Bad approach:
1. Create initial TodoWrite (all pending)
2. Work silently for 20 minutes
3. Update TodoWrite at end (all completed)

User experience: "Is Claude frozen? What's happening?"
```

**✅ Do: Update after each step for real-time visibility**

```
Good approach:
1. Create initial TodoWrite (all pending)
2. Mark task 1 in_progress → Work → Mark completed
3. Mark task 2 in_progress → Work → Mark completed
4. Mark task 3 in_progress → Work → Mark completed

User experience: "I can see exactly what Claude is doing"
```

**Why this matters:**

- **User confidence** - Continuous updates confirm Claude is working
- **Progress feedback** - User knows estimated completion time
- **Intervention opportunity** - User can stop if wrong direction

**From system prompt:**

> "Updates should be immediate - marking each task as completed or in_progress as work happens - rather than batched, so users can see real-time progress."

### Rule 5: Use TodoWrite VERY Frequently

**From system prompt:**

> "Use these tools VERY frequently to ensure that you are tracking your tasks and giving the user visibility into your progress. These tools are also EXTREMELY helpful for planning tasks, and for breaking down larger complex tasks into smaller steps. If you do not use this tool when planning, you may forget to do important tasks - and that is unacceptable."

**What "VERY frequently" means:**

| Workflow Type          | TodoWrite Frequency                    |
| ---------------------- | -------------------------------------- |
| Simple (≥3 steps)      | Every task completion                  |
| Medium (5-10 tasks)    | Every 1-2 minutes                      |
| Complex (10+ tasks)    | Every task start/end + every 5 minutes |
| Long-running (>30 min) | Every 2-3 minutes minimum              |

**Benefits:**

- **Prevents forgotten tasks** - External memory aid
- **Maintains focus** - Clear current priority
- **User visibility** - Continuous progress updates
- **Better debugging** - Can see where Claude got stuck

## Timing Guidelines

### Update Frequency by Task Duration

| Task Duration | Update Pattern                                                         |
| ------------- | ---------------------------------------------------------------------- |
| < 5 minutes   | Mark in_progress → complete (2 updates)                                |
| 5-15 minutes  | Mark in_progress → periodic check → complete (2-3 updates)             |
| > 15 minutes  | Mark in_progress → periodic checks every 5 min → complete (4+ updates) |

**Periodic check example:**

```json
// Long task: "Implement complex feature" (20 minutes)

Start (0 min):
{"content": "Implement complex feature", "status": "in_progress"}

Middle (10 min) - Optional progress comment:
{"content": "Implement complex feature (50% done)", "status": "in_progress"}

End (20 min):
{"content": "Implement complex feature", "status": "completed"}
```

### Update Pattern Examples

#### Example 1: Quick Tasks (< 5 minutes each)

```json
Initial (0:00):
{
  "todos": [
    {"content": "Fix linting errors", "status": "pending"},
    {"content": "Update tests", "status": "pending"},
    {"content": "Commit changes", "status": "pending"}
  ]
}

Update 1 (0:00) - Start first task:
{
  "todos": [
    {"content": "Fix linting errors", "status": "in_progress"},
    {"content": "Update tests", "status": "pending"},
    {"content": "Commit changes", "status": "pending"}
  ]
}

Update 2 (0:03) - Complete first, start second:
{
  "todos": [
    {"content": "Fix linting errors", "status": "completed"},
    {"content": "Update tests", "status": "in_progress"},
    {"content": "Commit changes", "status": "pending"}
  ]
}

Update 3 (0:07) - Complete second, start third:
{
  "todos": [
    {"content": "Fix linting errors", "status": "completed"},
    {"content": "Update tests", "status": "completed"},
    {"content": "Commit changes", "status": "in_progress"}
  ]
}

Update 4 (0:09) - Complete third:
{
  "todos": [
    {"content": "Fix linting errors", "status": "completed"},
    {"content": "Update tests", "status": "completed"},
    {"content": "Commit changes", "status": "completed"}
  ]
}
```

**Total updates: 4 (initial + 3)**
**Frequency: Every 2-3 minutes**

#### Example 2: Medium Tasks (10-15 minutes each)

```json
Initial (0:00):
{
  "todos": [
    {"content": "Analyze requirements", "status": "pending"},
    {"content": "Design solution", "status": "pending"},
    {"content": "Implement changes", "status": "pending"}
  ]
}

Update 1 (0:00) - Start analysis:
{
  "todos": [
    {"content": "Analyze requirements", "status": "in_progress"},
    {"content": "Design solution", "status": "pending"},
    {"content": "Implement changes", "status": "pending"}
  ]
}

Update 2 (0:12) - Complete analysis, start design:
{
  "todos": [
    {"content": "Analyze requirements", "status": "completed"},
    {"content": "Design solution", "status": "in_progress"},
    {"content": "Implement changes", "status": "pending"}
  ]
}

Update 3 (0:25) - Complete design, start implementation:
{
  "todos": [
    {"content": "Analyze requirements", "status": "completed"},
    {"content": "Design solution", "status": "completed"},
    {"content": "Implement changes", "status": "in_progress"}
  ]
}

Update 4 (0:40) - Complete implementation:
{
  "todos": [
    {"content": "Analyze requirements", "status": "completed"},
    {"content": "Design solution", "status": "completed"},
    {"content": "Implement changes", "status": "completed"}
  ]
}
```

**Total updates: 4**
**Frequency: Every 12-15 minutes**

## Multi-Task Scenarios

### Scenario 1: Discovering New Tasks

**Situation:** Started with 3 tasks, discovered 2 more during work.

```json
Initial:
{
  "todos": [
    {"content": "Implement feature", "status": "pending"},
    {"content": "Write tests", "status": "pending"},
    {"content": "Update docs", "status": "pending"}
  ]
}

After implementing (discovered integration tests + deployment needed):
{
  "todos": [
    {"content": "Implement feature", "status": "completed"},
    {"content": "Write unit tests", "status": "in_progress"},
    {"content": "Write integration tests", "status": "pending"},  // NEW
    {"content": "Update docs", "status": "pending"},
    {"content": "Deploy to staging", "status": "pending"}  // NEW
  ]
}
```

**Rule:** Add new tasks to complete list, don't hide scope changes.

### Scenario 2: Removing Tasks

**Situation:** Task became irrelevant or was duplicate.

```json
Before:
{
  "todos": [
    {"content": "Update auth middleware", "status": "completed"},
    {"content": "Update route handlers", "status": "pending"},
    {"content": "Update API docs", "status": "pending"},
    {"content": "Update README", "status": "pending"}  // Duplicate of API docs
  ]
}

After (combine doc tasks):
{
  "todos": [
    {"content": "Update auth middleware", "status": "completed"},
    {"content": "Update route handlers", "status": "in_progress"},
    {"content": "Update documentation (API + README)", "status": "pending"}
  ]
}
```

**Rule:** Simply omit irrelevant tasks from next update. Don't need to mark as "cancelled".

### Scenario 3: Splitting Tasks

**Situation:** Task too large, break into sub-tasks mid-work.

```json
Before:
{
  "todos": [
    {"content": "Implement authentication", "status": "in_progress"}  // Too broad
  ]
}

After (split into sub-tasks):
{
  "todos": [
    {"content": "Implement auth middleware", "status": "completed"},
    {"content": "Update route handlers", "status": "in_progress"},
    {"content": "Add auth tests", "status": "pending"},
    {"content": "Update auth docs", "status": "pending"}
  ]
}
```

**Rule:** Mark completed portions, continue with remaining sub-tasks.

## Validation Loops Pattern

**Problem:** Some tasks require iteration (validation → fix → re-validate).

**Solution:** Use parent task + add "Verification" task.

```json
{
  "todos": [
    { "content": "Phase 1: Generate code", "status": "completed" },
    { "content": "Phase 2: Run validation", "status": "completed" },
    { "content": "Phase 3: Fix validation errors", "status": "in_progress" },
    { "content": "Phase 4: Re-run validation", "status": "pending" },
    { "content": "Phase 5: Deploy if validation passes", "status": "pending" }
  ]
}
```

**If validation fails again:**

```json
{
  "todos": [
    { "content": "Phase 1: Generate code", "status": "completed" },
    { "content": "Phase 2: Run validation (attempt 1)", "status": "completed" },
    { "content": "Phase 3: Fix validation errors (round 1)", "status": "completed" },
    { "content": "Phase 4: Re-run validation (attempt 2)", "status": "completed" },
    { "content": "Phase 5: Fix remaining errors (round 2)", "status": "in_progress" },
    { "content": "Phase 6: Final validation", "status": "pending" },
    { "content": "Phase 7: Deploy if validation passes", "status": "pending" }
  ]
}
```

**Pattern:** Add new tasks for additional rounds, keep history visible.

## Performance Considerations

### Update Cost

**TodoWrite is fast:**

- Typical TodoWrite call: ~200-500 tokens
- Doesn't slow down Claude significantly
- User experience benefit >> token cost

**Don't optimize away updates to "save tokens"** - user visibility is more valuable.

### When to Consolidate

**Situation:** TodoWrite has 20+ tasks, gets unwieldy.

**Solution:** Group completed tasks.

```json
Before (verbose):
{
  "todos": [
    {"content": "Task 1", "status": "completed"},
    {"content": "Task 2", "status": "completed"},
    {"content": "Task 3", "status": "completed"},
    {"content": "Task 4", "status": "completed"},
    {"content": "Task 5", "status": "completed"},
    {"content": "Task 6", "status": "in_progress"},
    {"content": "Task 7", "status": "pending"},
    ...
  ]
}

After (consolidated):
{
  "todos": [
    {"content": "✓ Completed phases 1-5", "status": "completed"},
    {"content": "Phase 6: Current work", "status": "in_progress"},
    {"content": "Phase 7: Next steps", "status": "pending"},
    ...
  ]
}
```

**When to consolidate:** After >10 completed tasks.

## Related References

- [TodoWrite Structure](structure.md) - Task states and field requirements
- [Update Patterns](update-patterns.md) - Complete list requirement
- [Common Mistakes](common-mistakes.md) - Anti-patterns to avoid
