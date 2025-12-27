# Common TodoWrite Mistakes and How to Fix Them

## Mistake 1: Using TodoWrite for Trivial Tasks

**❌ Bad: TodoWrite for simple operations**

```
User: "Read the README and summarize it"

Bad approach:
{
  "todos": [
    {"content": "Read README", "status": "pending"},
    {"content": "Summarize content", "status": "pending"}
  ]
}
```

**Why this is wrong:**

- Only 2 steps (threshold is ≥3)
- Takes <5 minutes total
- No context drift risk
- No user visibility benefit

**✅ Good: Skip TodoWrite, just do it**

```
User: "Read the README and summarize it"

Good approach:
[Read README → Provide summary directly, no TodoWrite]
```

**Fix:** Check complexity triggers before using TodoWrite. Not every task needs tracking.

## Mistake 2: Creating Tasks As You Go

**❌ Bad: Incremental task addition**

```
User: "Refactor authentication"

Bad approach:
1. Start working
2. After 5 minutes → Create TodoWrite: "Analyze code" (completed)
3. After 10 minutes → Add task: "Implement changes" (in_progress)
4. After 20 minutes → Add task: "Write tests" (pending)
```

**Why this is wrong:**

- No upfront planning (scope creep risk)
- User doesn't see full scope immediately
- Defeats accountability purpose
- Violates system prompt requirement

**✅ Good: Plan complete task list first**

```
User: "Refactor authentication"

Good approach:
1. FIRST: Create complete TodoWrite with all planned tasks
2. THEN: Start working, updating statuses as you go
```

**Fix:** Initialize complete task list before any work begins.

## Mistake 3: Batching Status Updates

**❌ Bad: Batch multiple completions**

```
Bad approach:
1. Complete task 1 (5 minutes)
2. Complete task 2 (8 minutes)
3. Complete task 3 (6 minutes)
4. NOW update TodoWrite → mark all 3 completed (19 minutes later!)

User experience: "Is Claude frozen? Been 19 minutes without update..."
```

**Why this is wrong:**

- No real-time visibility (user doesn't see progress)
- User anxiety ("Is this working?")
- Violates system prompt requirement

**✅ Good: Update immediately after each completion**

```
Good approach:
1. Complete task 1 → Update TodoWrite (mark 1 completed)
2. Complete task 2 → Update TodoWrite (mark 2 completed)
3. Complete task 3 → Update TodoWrite (mark 3 completed)

User experience: "I can see progress happening in real-time"
```

**Fix:** Update TodoWrite immediately after completing each task, not batched at end.

## Mistake 4: Marking in_progress After Starting Work

**❌ Bad: Start work, then update status**

```
Bad timing:
1. Start implementing feature
2. Write code for 5 minutes
3. Update TodoWrite → mark "Implement feature" as in_progress

User sees: 5 minutes of work with no status update
```

**Why this is wrong:**

- User doesn't know what you're doing for first 5 minutes
- Status lags behind reality
- Defeats real-time visibility purpose

**✅ Good: Update status, THEN begin work**

```
Good timing:
1. Update TodoWrite → mark "Implement feature" as in_progress
2. THEN start implementing feature
3. Write code

User sees: "Claude is implementing the feature" immediately
```

**Fix:** Mark in_progress BEFORE starting work, not after.

## Mistake 5: Sending Partial Updates

**❌ Bad: Only send changed tasks**

```
Initial:
{
  "todos": [
    {"content": "Task 1", "status": "pending"},
    {"content": "Task 2", "status": "pending"},
    {"content": "Task 3", "status": "pending"}
  ]
}

Bad update (only send changed task):
{
  "todos": [
    {"content": "Task 1", "status": "completed"}
  ]
}

Result: Tasks 2 and 3 disappear! (TodoWrite replaces, doesn't merge)
```

**Why this is wrong:**

- TodoWrite replaces entire list, doesn't merge
- Other tasks vanish
- Loses track of remaining work

**✅ Good: Send complete list with all tasks**

```
Good update (send all tasks):
{
  "todos": [
    {"content": "Task 1", "status": "completed"},  // Updated
    {"content": "Task 2", "status": "pending"},  // Preserved
    {"content": "Task 3", "status": "pending"}  // Preserved
  ]
}

Result: Task 1 updated, tasks 2-3 preserved
```

**Fix:** Always provide complete todo list on every update.

## Mistake 6: Too Many in_progress Tasks

**❌ Bad: Multiple tasks in_progress**

```
Bad state:
{
  "todos": [
    {"content": "Implement feature A", "status": "in_progress"},
    {"content": "Implement feature B", "status": "in_progress"},
    {"content": "Write tests", "status": "in_progress"},
    {"content": "Update docs", "status": "in_progress"}
  ]
}
```

**Why this is wrong:**

- Can't focus on all 4 tasks simultaneously
- User doesn't know what's actually being worked on
- Suggests lack of prioritization

**✅ Good: Ideally one in_progress task**

```
Good state:
{
  "todos": [
    {"content": "Implement feature A", "status": "completed"},
    {"content": "Implement feature B", "status": "completed"},
    {"content": "Write tests", "status": "in_progress"},  // ONE task
    {"content": "Update docs", "status": "pending"}
  ]
}
```

**Exception:** Multiple in_progress OK when genuinely parallel (using Task tool to spawn multiple agents).

**Fix:** Focus on one task at a time. Mark pending until ready to start.

## Mistake 7: Vague Task Descriptions

**❌ Bad: Unclear task names**

```
Bad task names:
{
  "todos": [
    {"content": "Do stuff", "status": "pending"},
    {"content": "Fix things", "status": "pending"},
    {"content": "Work on code", "status": "pending"}
  ]
}
```

**Why this is wrong:**

- User doesn't understand what's being done
- Can't track meaningful progress
- Hard to know when task is "complete"

**✅ Good: Specific task descriptions**

```
Good task names:
{
  "todos": [
    {"content": "Implement JWT authentication middleware", "status": "pending"},
    {"content": "Add error handling for invalid tokens", "status": "pending"},
    {"content": "Write unit tests for auth flow", "status": "pending"}
  ]
}
```

**Fix:** Use specific, actionable task descriptions.

## Mistake 8: Missing activeForm

**❌ Bad: No activeForm field**

```
Bad structure:
{
  "content": "Write tests",
  "status": "in_progress"
  // Missing: activeForm
}
```

**Why this is wrong:**

- User sees generic progress indicator
- Violates TodoWrite schema
- May cause display issues

**✅ Good: Include activeForm**

```
Good structure:
{
  "content": "Write tests",
  "status": "in_progress",
  "activeForm": "Writing tests"
}
```

**Fix:** Always include activeForm (present continuous tense).

## Mistake 9: Wrong activeForm Tense

**❌ Bad: Same as content**

```
Bad activeForm:
{
  "content": "Write tests",
  "activeForm": "Write tests"  // Same, not present continuous
}
```

**Why this is wrong:**

- activeForm should be present continuous tense
- User sees awkward grammar ("Write tests" instead of "Writing tests")

**✅ Good: Present continuous tense**

```
Good activeForm:
{
  "content": "Write tests",
  "activeForm": "Writing tests"  // Present continuous
}
```

**Fix:** Use verb + -ing for activeForm.

## Mistake 10: Not Removing Irrelevant Tasks

**❌ Bad: Keep obsolete tasks**

```
Bad approach:
{
  "todos": [
    {"content": "Update auth (OBSOLETE)", "status": "pending"},
    {"content": "New auth approach", "status": "in_progress"}
  ]
}
```

**Why this is wrong:**

- Clutters task list
- User confused by obsolete tasks
- Harder to see what's actually needed

**✅ Good: Remove obsolete tasks**

```
Good approach:
{
  "todos": [
    {"content": "New auth approach", "status": "in_progress"}
  ]
}
```

**Fix:** Just omit obsolete tasks from next TodoWrite update.

## Mistake 11: Overly Granular Tasks

**❌ Bad: Too many tiny tasks**

```
Bad granularity:
{
  "todos": [
    {"content": "Open file", "status": "pending"},
    {"content": "Read line 1", "status": "pending"},
    {"content": "Read line 2", "status": "pending"},
    {"content": "Analyze code", "status": "pending"},
    {"content": "Think about changes", "status": "pending"},
    {"content": "Type new code", "status": "pending"},
    {"content": "Save file", "status": "pending"}
  ]
}
```

**Why this is wrong:**

- 7 tasks for one operation (<1 minute each)
- Too much TodoWrite overhead
- User overwhelmed by task churn

**✅ Good: Right-sized tasks**

```
Good granularity:
{
  "todos": [
    {"content": "Analyze current implementation", "status": "pending"},
    {"content": "Implement changes", "status": "pending"},
    {"content": "Verify changes work", "status": "pending"}
  ]
}
```

**Fix:** Each task should be 5-15 minutes of work.

## Mistake 12: Overly Coarse Tasks

**❌ Bad: Too few broad tasks**

```
Bad granularity:
{
  "todos": [
    {"content": "Implement authentication", "status": "in_progress"}
  ]
}
```

**Why this is wrong:**

- Single task for multi-hour work
- No progress visibility (stuck on "in_progress" for hours)
- Can't track completion of sub-components

**✅ Good: Break into sub-tasks**

```
Good granularity:
{
  "todos": [
    {"content": "Implement auth middleware", "status": "completed"},
    {"content": "Update route handlers", "status": "in_progress"},
    {"content": "Add auth tests", "status": "pending"},
    {"content": "Update auth docs", "status": "pending"}
  ]
}
```

**Fix:** Break large tasks into 5-15 minute sub-tasks.

## Mistake 13: No TodoWrite for Complex Workflows

**❌ Bad: Skip TodoWrite for ≥3 steps**

```
User: "Refactor authentication system"

Bad approach:
[Start working without TodoWrite because "I know what to do"]

Result:
- Forget to write tests
- Miss documentation update
- User has no visibility
```

**Why this is wrong:**

- Violates complexity triggers (≥3 steps → use TodoWrite)
- Risk forgetting tasks
- No user visibility
- Violates system prompt requirement

**✅ Good: Use TodoWrite when triggers match**

```
User: "Refactor authentication system"

Good approach:
1. Check triggers: ≥3 steps? YES → Use TodoWrite
2. Create complete task list
3. Work through tasks with status updates
```

**Fix:** Always check complexity triggers before deciding to skip TodoWrite.

## Mistake 14: Rationalizing Away TodoWrite

**Common rationalizations:**

- ❌ "This is just a simple feature" → NO. Check triggers.
- ❌ "I can track this mentally" → NO. Users need visibility.
- ❌ "It's only 2 steps" → NO. If non-trivial or >10 min, use TodoWrite.
- ❌ "I'll add todos as I go" → NO. Initialize upfront.
- ❌ "I'll update statuses at the end" → NO. Real-time updates mandatory.

**Fix:** When complexity triggers match, TodoWrite is NOT optional.

## Mistake 15: Forgetting Completed Tasks

**❌ Bad: Only show pending/in_progress**

```
Bad update:
{
  "todos": [
    {"content": "Current task", "status": "in_progress"},
    {"content": "Next task", "status": "pending"}
  ]
}
// Lost all completed tasks!
```

**Why this is wrong:**

- User can't see progress (no history)
- Looks like nothing was done
- Loses accountability trail

**✅ Good: Keep completed tasks**

```
Good update:
{
  "todos": [
    {"content": "Task 1", "status": "completed"},
    {"content": "Task 2", "status": "completed"},
    {"content": "Task 3", "status": "completed"},
    {"content": "Current task", "status": "in_progress"},
    {"content": "Next task", "status": "pending"}
  ]
}
```

**Fix:** Include all completed tasks to show progress history.

## Quick Reference: Mistake → Fix

| Mistake                         | Fix                                       |
| ------------------------------- | ----------------------------------------- |
| TodoWrite for <3 steps          | Check complexity triggers first           |
| Tasks added incrementally       | Initialize complete list upfront          |
| Batched completions             | Update immediately after each task        |
| Mark in_progress after starting | Update status BEFORE starting work        |
| Partial updates                 | Always send complete todo list            |
| Multiple in_progress            | Focus on one task (unless truly parallel) |
| Vague descriptions              | Use specific, actionable task names       |
| Missing activeForm              | Always include present continuous form    |
| Wrong activeForm tense          | Use verb + -ing                           |
| Keep obsolete tasks             | Omit from next update                     |
| Too granular (<5 min tasks)     | Group into 5-15 min chunks                |
| Too coarse (>30 min tasks)      | Break into sub-tasks                      |
| Skip for complex work           | Use when triggers match                   |
| Rationalize away                | TodoWrite mandatory when criteria met     |
| Drop completed tasks            | Keep to show progress history             |

## Related References

- [When to Use TodoWrite](when-to-use.md) - Complexity triggers and decision flowchart
- [TodoWrite Structure](structure.md) - Task states and field requirements
- [Progress Tracking](progress-tracking.md) - Real-time update best practices
- [Update Patterns](update-patterns.md) - Complete list requirement
