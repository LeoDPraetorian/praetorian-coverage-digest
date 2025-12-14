# TodoWrite Update Patterns

## The Complete List Requirement

**Critical rule:** TodoWrite requires providing the complete todo list on each update, not just changed items.

**From official docs:**

> "Over time, Claude will call the tool again to update the todo list, providing the complete todo list again with no special logic about updating only a particular item."

### Why Complete List?

**TodoWrite replaces the entire list** on each call. It does NOT:
- ❌ Merge with previous list
- ❌ Apply deltas/diffs
- ❌ Update specific items by ID

**It replaces everything** with what you provide.

### Example: Wrong (Partial Update)

```json
// Initial state
{
  "todos": [
    {"content": "Task 1", "status": "pending"},
    {"content": "Task 2", "status": "pending"},
    {"content": "Task 3", "status": "pending"}
  ]
}

// ❌ WRONG: Only send changed task
{
  "todos": [
    {"content": "Task 1", "status": "completed"}
  ]
}

// Result: Tasks 2 and 3 DISAPPEAR (not intended!)
```

### Example: Correct (Complete List)

```json
// Initial state
{
  "todos": [
    {"content": "Task 1", "status": "pending"},
    {"content": "Task 2", "status": "pending"},
    {"content": "Task 3", "status": "pending"}
  ]
}

// ✅ CORRECT: Send all tasks with updates
{
  "todos": [
    {"content": "Task 1", "status": "completed"},
    {"content": "Task 2", "status": "pending"},
    {"content": "Task 3", "status": "pending"}
  ]
}

// Result: Task 1 updated, tasks 2-3 preserved
```

## What to Include in Each Update

### Rule: Include ALL of These

1. **All existing tasks** - Even if status unchanged
2. **Updated statuses** - Changed from last update
3. **New tasks** - Discovered during work
4. **Keep completed tasks** - Show progress history

### Rule: DON'T Include

- ❌ Tasks you want to remove (just omit them)
- ❌ Cancelled tasks (just omit them)
- ❌ Duplicate tasks (consolidate instead)

## Common Update Scenarios

### Scenario 1: Mark Task Complete

**Before:**
```json
{
  "todos": [
    {"content": "Analyze code", "status": "in_progress"},
    {"content": "Write tests", "status": "pending"},
    {"content": "Deploy", "status": "pending"}
  ]
}
```

**After:**
```json
{
  "todos": [
    {"content": "Analyze code", "status": "completed"},  // Changed
    {"content": "Write tests", "status": "in_progress"},  // Changed
    {"content": "Deploy", "status": "pending"}  // Unchanged, but included
  ]
}
```

**What changed:** Task 1 completed, task 2 started, task 3 unchanged (but still included).

### Scenario 2: Add New Task

**Before:**
```json
{
  "todos": [
    {"content": "Implement feature", "status": "completed"},
    {"content": "Write tests", "status": "in_progress"}
  ]
}
```

**After (discovered need for docs):**
```json
{
  "todos": [
    {"content": "Implement feature", "status": "completed"},  // Keep completed
    {"content": "Write tests", "status": "in_progress"},  // Keep in_progress
    {"content": "Update documentation", "status": "pending"}  // NEW task
  ]
}
```

**What changed:** Added new task, kept all existing tasks.

### Scenario 3: Remove Task

**Before:**
```json
{
  "todos": [
    {"content": "Update auth", "status": "completed"},
    {"content": "Write tests", "status": "pending"},
    {"content": "Update README", "status": "pending"},
    {"content": "Update API docs", "status": "pending"}  // Duplicate
  ]
}
```

**After (combine doc tasks):**
```json
{
  "todos": [
    {"content": "Update auth", "status": "completed"},
    {"content": "Write tests", "status": "in_progress"},
    {"content": "Update documentation (README + API)", "status": "pending"}  // Combined
  ]
}
```

**What changed:** Combined duplicate tasks, omitted the separate "Update API docs" task.

### Scenario 4: Reorder Tasks

**Before:**
```json
{
  "todos": [
    {"content": "Feature A", "status": "pending"},
    {"content": "Feature B", "status": "pending"},
    {"content": "Feature C", "status": "pending"}
  ]
}
```

**After (priority changed):**
```json
{
  "todos": [
    {"content": "Feature C", "status": "in_progress", "priority": "high"},  // Moved up
    {"content": "Feature A", "status": "pending"},
    {"content": "Feature B", "status": "pending"}
  ]
}
```

**What changed:** Reordered to prioritize Feature C.

## Update Frequency Guidelines

### When to Update TodoWrite

| Trigger | Update Reason |
|---------|---------------|
| Mark task in_progress | Starting work (before actual work) |
| Mark task completed | Finished work (immediately after) |
| Discover new task | Scope changed, add to list |
| Remove task | Task no longer relevant |
| Reorder tasks | Priority changed |
| Task takes >5 minutes | Periodic progress check (optional) |

### Minimum Update Frequency

**Absolute minimum:** Update before/after each task

```
Task lifecycle:
1. Update TodoWrite → mark in_progress
2. Do work
3. Update TodoWrite → mark completed
```

**Better:** Also update periodically during long tasks

```
Long task lifecycle:
1. Update TodoWrite → mark in_progress
2. Do work (5 minutes)
3. Update TodoWrite → optional progress note
4. Do work (5 minutes)
5. Update TodoWrite → mark completed
```

## Efficient Update Patterns

### Pattern 1: Batch Status Changes

**When:** Quickly completing multiple small tasks.

```json
// After completing tasks 1 and 2, starting task 3
{
  "todos": [
    {"content": "Task 1", "status": "completed"},  // Changed
    {"content": "Task 2", "status": "completed"},  // Changed
    {"content": "Task 3", "status": "in_progress"},  // Changed
    {"content": "Task 4", "status": "pending"}
  ]
}
```

**Acceptable IF:** Tasks 1-2 completed within ~1 minute total (not 10 minutes apart).

### Pattern 2: Progressive Task Addition

**When:** Discovering tasks iteratively.

```json
// Round 1: Initial tasks
{
  "todos": [
    {"content": "Analyze requirements", "status": "completed"},
    {"content": "Design solution", "status": "in_progress"}
  ]
}

// Round 2: Discovered implementation tasks
{
  "todos": [
    {"content": "Analyze requirements", "status": "completed"},
    {"content": "Design solution", "status": "completed"},
    {"content": "Implement core logic", "status": "in_progress"},
    {"content": "Add error handling", "status": "pending"},  // NEW
    {"content": "Write tests", "status": "pending"}  // NEW
  ]
}
```

**Acceptable IF:** You genuinely couldn't predict all tasks upfront (unusual scenarios only).

**Prefer:** Upfront planning with all known tasks.

### Pattern 3: Consolidate Completed Tasks

**When:** Todo list becomes unwieldy (>15 tasks).

```json
// Before: 10 completed tasks, 5 pending
{
  "todos": [
    {"content": "Setup task 1", "status": "completed"},
    {"content": "Setup task 2", "status": "completed"},
    {"content": "Setup task 3", "status": "completed"},
    {"content": "Implementation task 1", "status": "completed"},
    {"content": "Implementation task 2", "status": "completed"},
    {"content": "Implementation task 3", "status": "completed"},
    {"content": "Testing task 1", "status": "completed"},
    {"content": "Testing task 2", "status": "completed"},
    {"content": "Testing task 3", "status": "completed"},
    {"content": "Documentation task 1", "status": "completed"},
    {"content": "Current task", "status": "in_progress"},
    {"content": "Remaining task 1", "status": "pending"},
    {"content": "Remaining task 2", "status": "pending"},
    {"content": "Remaining task 3", "status": "pending"},
    {"content": "Remaining task 4", "status": "pending"}
  ]
}

// After: Consolidated completed phases
{
  "todos": [
    {"content": "✓ Setup phase (3 tasks)", "status": "completed"},
    {"content": "✓ Implementation phase (3 tasks)", "status": "completed"},
    {"content": "✓ Testing phase (3 tasks)", "status": "completed"},
    {"content": "✓ Documentation phase (1 task)", "status": "completed"},
    {"content": "Current task", "status": "in_progress"},
    {"content": "Remaining task 1", "status": "pending"},
    {"content": "Remaining task 2", "status": "pending"},
    {"content": "Remaining task 3", "status": "pending"},
    {"content": "Remaining task 4", "status": "pending"}
  ]
}
```

**Benefits:**
- ✅ Cleaner display
- ✅ Focus on remaining work
- ✅ Keep history visible

**When:** After >10 completed tasks.

## Anti-Patterns (Don't Do These)

### Anti-Pattern 1: Delta Updates

**❌ WRONG:**
```json
// "Just update task 2's status"
{
  "todos": [
    {"content": "Task 2", "status": "completed"}
  ]
}
// Other tasks disappear!
```

**✅ CORRECT:**
```json
// Provide complete list with all tasks
{
  "todos": [
    {"content": "Task 1", "status": "completed"},
    {"content": "Task 2", "status": "completed"},  // Updated
    {"content": "Task 3", "status": "pending"}
  ]
}
```

### Anti-Pattern 2: Forgetting Completed Tasks

**❌ WRONG:**
```json
// Only include pending/in_progress tasks
{
  "todos": [
    {"content": "Current task", "status": "in_progress"},
    {"content": "Next task", "status": "pending"}
  ]
}
// Lost progress history!
```

**✅ CORRECT:**
```json
// Keep completed tasks to show progress
{
  "todos": [
    {"content": "Previous task", "status": "completed"},
    {"content": "Current task", "status": "in_progress"},
    {"content": "Next task", "status": "pending"}
  ]
}
```

### Anti-Pattern 3: No Updates Until End

**❌ WRONG:**
```
1. Create initial TodoWrite (all pending)
2. Work silently for 20 minutes
3. Update TodoWrite (all completed)
```

**✅ CORRECT:**
```
1. Create initial TodoWrite (all pending)
2. Mark task 1 in_progress → work → mark completed
3. Mark task 2 in_progress → work → mark completed
4. Mark task 3 in_progress → work → mark completed
```

## Complex Scenario Examples

### Example: Multi-Agent Workflow

**Main agent coordinates sub-agents:**

```json
// Main agent's TodoWrite
{
  "todos": [
    {"content": "Spawn backend-developer agent", "status": "completed"},
    {"content": "Backend agent: Implement API", "status": "completed"},  // Sub-agent done
    {"content": "Spawn frontend-developer agent", "status": "completed"},
    {"content": "Frontend agent: Build UI", "status": "in_progress"},  // Sub-agent working
    {"content": "Integration testing", "status": "pending"},
    {"content": "Deploy", "status": "pending"}
  ]
}
```

**Pattern:** Main agent tracks sub-agent progress via JSON output parsing.

### Example: Validation Loop

**Task requires multiple validation attempts:**

```json
{
  "todos": [
    {"content": "Generate code", "status": "completed"},
    {"content": "Validation attempt 1", "status": "completed"},  // Failed
    {"content": "Fix errors (round 1)", "status": "completed"},
    {"content": "Validation attempt 2", "status": "completed"},  // Failed again
    {"content": "Fix remaining errors (round 2)", "status": "in_progress"},
    {"content": "Final validation", "status": "pending"},
    {"content": "Deploy if valid", "status": "pending"}
  ]
}
```

**Pattern:** Add tasks for additional validation rounds, keep full history.

## Related References

- [TodoWrite Structure](structure.md) - Task states and field requirements
- [Progress Tracking](progress-tracking.md) - Real-time update best practices
- [Common Mistakes](common-mistakes.md) - Anti-patterns to avoid
