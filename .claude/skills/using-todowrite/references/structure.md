# TodoWrite Structure - Task States and Field Requirements

## Complete TodoWrite Schema

```json
{
  "todos": [
    {
      "content": "Task description (imperative form)",
      "status": "pending|in_progress|completed",
      "activeForm": "Present continuous form for display",
      "priority": "high|medium|low"
    }
  ]
}
```

## Required Fields

### 1. `content` (required)

**Purpose:** Describes what needs to be done.

**Format:** Imperative form (command voice)

**Examples:**

```json
✅ Good:
"Analyze requirements"
"Design solution architecture"
"Implement authentication middleware"
"Write unit tests"
"Deploy to production"

❌ Bad:
"Requirements" (not a verb)
"I need to analyze requirements" (first person)
"Analyzing requirements" (present continuous - use activeForm for this)
```

**Length:** Keep under 80 characters for display. If longer, break into sub-tasks.

### 2. `status` (required)

**Purpose:** Current state of the task.

**Valid values:**

- `"pending"` - Not started yet
- `"in_progress"` - Currently working on
- `"completed"` - Finished

**Case sensitive:** Must be lowercase with underscores.

### 3. `activeForm` (required)

**Purpose:** Present continuous form shown to users when task is in_progress.

**Format:** Present continuous tense (verb + -ing)

**Examples:**

```json
{
  "content": "Analyze requirements",
  "activeForm": "Analyzing requirements"
}

{
  "content": "Write unit tests",
  "activeForm": "Writing unit tests"
}

{
  "content": "Deploy to production",
  "activeForm": "Deploying to production"
}
```

**Why both?**

- `content`: Task list display (shows all tasks)
- `activeForm`: Progress indicator (shows what's happening now)

### 4. `priority` (optional)

**Purpose:** Task importance for ordering and focus.

**Valid values:**

- `"high"` - Critical path, blocking other tasks
- `"medium"` - Important but not blocking (default)
- `"low"` - Nice-to-have, can defer

**When to use:**

- Most tasks: Omit (defaults to medium)
- Critical path: Mark as "high"
- Optional improvements: Mark as "low"

**Example:**

```json
{
  "todos": [
    {
      "content": "Fix production bug",
      "status": "in_progress",
      "activeForm": "Fixing production bug",
      "priority": "high"
    },
    {
      "content": "Refactor code",
      "status": "pending",
      "activeForm": "Refactoring code",
      "priority": "low"
    }
  ]
}
```

## Task State Transitions

### Valid Transitions

```
pending ──────→ in_progress ──────→ completed
   │                                     ↑
   └─────────────────────────────────────┘
         (skip if no longer needed)
```

**Allowed:**

- `pending` → `in_progress` (start work)
- `in_progress` → `completed` (finish work)
- `pending` → `completed` (skip if no longer relevant)

**Not allowed:**

- ❌ `completed` → `pending` (don't reopen, create new task)
- ❌ `completed` → `in_progress` (don't reopen, create new task)
- ❌ `in_progress` → `pending` (don't revert, mark completed or create new task)

### State Timing Rules

| State         | When to Set                     | Tool Call Timing                   |
| ------------- | ------------------------------- | ---------------------------------- |
| `pending`     | Task planning                   | Initialize TodoWrite               |
| `in_progress` | **BEFORE starting work**        | Update TodoWrite → THEN start work |
| `completed`   | **IMMEDIATELY after finishing** | Finish work → Update TodoWrite     |

**Critical:** Update status BEFORE and AFTER work, not during.

## Common Field Mistakes

### Mistake 1: Wrong Tense in activeForm

```json
❌ Wrong:
{
  "content": "Write tests",
  "activeForm": "Write tests"  // Same as content
}

✅ Correct:
{
  "content": "Write tests",
  "activeForm": "Writing tests"  // Present continuous
}
```

### Mistake 2: First Person in content

```json
❌ Wrong:
{
  "content": "I need to analyze the requirements"
}

✅ Correct:
{
  "content": "Analyze requirements"
}
```

### Mistake 3: Status Typo

```json
❌ Wrong:
"status": "InProgress"   // Wrong case
"status": "in-progress"  // Wrong separator
"status": "pending."     // Extra punctuation

✅ Correct:
"status": "in_progress"  // Lowercase, underscore
```

### Mistake 4: Missing activeForm

```json
❌ Wrong:
{
  "content": "Deploy application",
  "status": "in_progress"
  // Missing activeForm
}

✅ Correct:
{
  "content": "Deploy application",
  "status": "in_progress",
  "activeForm": "Deploying application"
}
```

## Task Granularity Guidelines

### Too Granular (Don't Do This)

```json
❌ Too detailed:
{
  "todos": [
    {"content": "Open auth.ts file"},
    {"content": "Read current implementation"},
    {"content": "Think about changes"},
    {"content": "Type new code"},
    {"content": "Save file"},
    {"content": "Close file"}
  ]
}
```

**Problem:** 6 tasks for one logical operation (too much overhead).

### Too Coarse (Don't Do This)

```json
❌ Too broad:
{
  "todos": [
    {"content": "Implement authentication"}
  ]
}
```

**Problem:** Single task for multi-hour work (no progress visibility).

### Right Balance (Do This)

```json
✅ Good granularity:
{
  "todos": [
    {"content": "Analyze current auth implementation"},
    {"content": "Design new auth architecture"},
    {"content": "Implement auth middleware"},
    {"content": "Update route handlers"},
    {"content": "Write auth tests"},
    {"content": "Update documentation"}
  ]
}
```

**Why:** Each task is 5-15 minutes of focused work.

### Granularity Rule of Thumb

| Task Duration | Granularity  | Example                               |
| ------------- | ------------ | ------------------------------------- |
| < 5 minutes   | Too granular | "Open file", "Read code"              |
| 5-15 minutes  | ✅ Ideal     | "Implement middleware", "Write tests" |
| 15-30 minutes | Acceptable   | "Refactor authentication"             |
| > 30 minutes  | Too coarse   | "Build entire feature"                |

**Recommendation:** Aim for 5-15 minute tasks. Break larger tasks into sub-tasks.

## Task Ordering Strategies

### Strategy 1: Sequential Dependencies

**When:** Tasks must happen in order.

```json
{
  "todos": [
    { "content": "1. Analyze requirements", "status": "completed" },
    { "content": "2. Design architecture", "status": "completed" },
    { "content": "3. Implement core logic", "status": "in_progress" },
    { "content": "4. Add error handling", "status": "pending" },
    { "content": "5. Write tests", "status": "pending" },
    { "content": "6. Document changes", "status": "pending" }
  ]
}
```

**Use numbering** to make order explicit.

### Strategy 2: Priority Groups

**When:** Some tasks are more important than others.

```json
{
  "todos": [
    { "content": "Fix production bug", "status": "in_progress", "priority": "high" },
    { "content": "Deploy hotfix", "status": "pending", "priority": "high" },
    { "content": "Add feature", "status": "pending", "priority": "medium" },
    { "content": "Refactor code", "status": "pending", "priority": "low" }
  ]
}
```

**High priority** tasks float to top.

### Strategy 3: Parallel Work

**When:** Multiple tasks can happen simultaneously.

```json
{
  "todos": [
    { "content": "Backend: Implement API", "status": "in_progress" },
    { "content": "Frontend: Build UI", "status": "in_progress" },
    { "content": "Database: Create migrations", "status": "in_progress" },
    { "content": "Integration: Test end-to-end", "status": "pending" }
  ]
}
```

**Prefix with domain** to show parallel streams.

## Task Modification Patterns

### Adding New Tasks

**When:** Discover new work during execution.

```json
Before:
{
  "todos": [
    {"content": "Implement feature", "status": "completed"},
    {"content": "Write tests", "status": "in_progress"}
  ]
}

After (discovered need for docs):
{
  "todos": [
    {"content": "Implement feature", "status": "completed"},
    {"content": "Write tests", "status": "in_progress"},
    {"content": "Update documentation", "status": "pending"}  // NEW
  ]
}
```

**Add to end** unless order matters.

### Removing Tasks

**When:** Task no longer relevant or was duplicate.

```json
Before:
{
  "todos": [
    {"content": "Analyze requirements", "status": "completed"},
    {"content": "Design architecture", "status": "pending"},
    {"content": "Write design doc", "status": "pending"}  // Duplicate
  ]
}

After (combine design tasks):
{
  "todos": [
    {"content": "Analyze requirements", "status": "completed"},
    {"content": "Design architecture and document", "status": "in_progress"}
  ]
}
```

**Simply omit** tasks from next TodoWrite call.

### Splitting Tasks

**When:** Task is too large, break into sub-tasks.

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
    {"content": "Write auth tests", "status": "pending"}
  ]
}
```

**Mark completed** portions, continue with remaining.

## Related References

- [Update Patterns](update-patterns.md) - Complete list requirement, update frequency
- [Progress Tracking](progress-tracking.md) - Real-time update best practices
- [Common Mistakes](common-mistakes.md) - Anti-patterns to avoid
