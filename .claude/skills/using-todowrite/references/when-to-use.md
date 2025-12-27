# When to Use TodoWrite - Detailed Decision Guide

## Complexity Triggers (Decision Flowchart)

```
Start: New user request received
  │
  ├─→ Is this ≥3 distinct steps?
  │   └─→ YES → Use TodoWrite
  │   └─→ NO → Continue checking
  │
  ├─→ Is this ≥5 phases or stages?
  │   └─→ YES → Use TodoWrite
  │   └─→ NO → Continue checking
  │
  ├─→ Will this take >10 minutes?
  │   └─→ YES → Use TodoWrite
  │   └─→ NO → Continue checking
  │
  ├─→ Is there context drift risk?
  │   └─→ YES → Use TodoWrite
  │   └─→ NO → Continue checking
  │
  ├─→ Does user need progress visibility?
  │   └─→ YES → Use TodoWrite
  │   └─→ NO → Skip TodoWrite
```

## Detailed Trigger Explanations

### Trigger 1: ≥3 Distinct Steps

**Definition:** Task requires three or more separate, independent actions.

**Examples:**

✅ **Use TodoWrite:**

- "Add authentication" → (1) Install dependencies, (2) Create middleware, (3) Update routes, (4) Write tests
- "Refactor component" → (1) Analyze current code, (2) Extract functions, (3) Update tests, (4) Update docs
- "Fix bug" → (1) Reproduce issue, (2) Identify root cause, (3) Implement fix, (4) Verify fix

❌ **Don't Use TodoWrite:**

- "Read file and summarize" → (1) Read file, (2) Summarize content (2 steps)
- "Fix typo" → (1) Find typo, (2) Correct it (2 steps)
- "Run tests" → (1) Execute test command (1 step)

### Trigger 2: ≥5 Phases or Stages

**Definition:** Workflow has five or more distinct phases, even if some phases are single steps.

**Examples:**

✅ **Use TodoWrite:**

- TDD workflow → (1) Write test, (2) Run test (RED), (3) Write code, (4) Run test (GREEN), (5) Refactor
- Deploy pipeline → (1) Build, (2) Test, (3) Package, (4) Upload, (5) Deploy, (6) Verify
- Research task → (1) Search codebase, (2) Search docs, (3) Web search, (4) Synthesize, (5) Document

❌ **Don't Use TodoWrite:**

- Simple deploy → (1) Build, (2) Deploy (2 phases)
- Quick search → (1) Search, (2) Report (2 phases)

### Trigger 3: >10 Minutes Duration

**Definition:** Task will take more than 10 minutes from start to completion.

**Estimation guidelines:**

| Task Type             | Typical Duration | Use TodoWrite? |
| --------------------- | ---------------- | -------------- |
| Read single file      | 1-2 min          | ❌ No          |
| Write simple function | 3-5 min          | ❌ No          |
| Refactor component    | 15-20 min        | ✅ Yes         |
| Add feature           | 30-60 min        | ✅ Yes         |
| Debug complex issue   | 20-40 min        | ✅ Yes         |
| Research + implement  | 45-90 min        | ✅ Yes         |

**Why 10 minutes?**

- User attention span: After 10 minutes without updates, users wonder if Claude is stuck
- Context drift: Longer tasks risk losing track of earlier decisions
- Accountability: Longer tasks benefit from structured planning

### Trigger 4: Context Drift Risk

**Definition:** Long-running operations where you might forget earlier steps or decisions.

**Indicators of context drift risk:**

✅ **High risk (use TodoWrite):**

- **Multiple file modifications** - Touch 3+ files across different directories
- **Iterative processing** - Loop through items with state carried between iterations
- **Decision dependencies** - Later steps depend on decisions made in earlier steps
- **External dependencies** - Wait for builds, tests, or API responses between steps
- **Multi-tool workflows** - Switch between Read, Write, Edit, Bash multiple times

❌ **Low risk (TodoWrite optional):**

- **Single file operation** - All changes in one file
- **Independent steps** - Each step is self-contained
- **Quick operations** - Complete in single focused burst

**Example:**

```
High Risk (Use TodoWrite):
"Migrate authentication from Cognito to Okta"
- Touch: auth.ts, middleware.ts, config.ts, routes.ts, tests/*.ts
- Must remember: Token format change, endpoint updates, test fixtures
- Dependencies: API keys, Okta config, existing user migration

Low Risk (Skip TodoWrite):
"Fix linting errors in utils.ts"
- Touch: utils.ts only
- Self-contained: Run linter, fix errors, done
```

### Trigger 5: User Visibility Needs

**Definition:** User needs real-time progress updates to understand what's happening.

**When users need visibility:**

✅ **High visibility needs (use TodoWrite):**

- **Long-running tasks** - >10 minutes without updates creates anxiety
- **Expensive operations** - Builds, deploys, large refactors (user wants confirmation it's working)
- **Multi-phase workflows** - User needs to see progress through phases
- **Critical changes** - User wants to know exactly what's being modified
- **Learning context** - User wants to understand the process, not just results

❌ **Low visibility needs (TodoWrite optional):**

- **Quick queries** - "What does this function do?" (answer is sufficient)
- **Simple reads** - "Show me the config" (read + display)
- **Trivial changes** - "Fix this typo" (just do it)

**Example:**

```
High Visibility (Use TodoWrite):
User: "Deploy to production"
User's mental state: Anxious, wants confirmation at each step
TodoWrite provides: "Building... Testing... Packaging... Uploading... Deploying... Verifying..."

Low Visibility (Skip TodoWrite):
User: "What's in the README?"
User's mental state: Just wants the answer
Response: [read and summarize README]
```

## Edge Cases and Judgment Calls

### Case 1: "Should I add TodoWrite retroactively?"

**Situation:** Started task without TodoWrite, now realize it's complex.

**Answer:** YES, add it immediately.

```
Current state: 2 steps completed, 5 more to go

Action:
1. Create TodoWrite with ALL tasks (including completed ones)
2. Mark first 2 as "completed"
3. Mark current task as "in_progress"
4. Continue with proper tracking
```

**Why:** Better late than never. User visibility improves from this point forward.

### Case 2: "Task is borderline - 3 steps but each is trivial"

**Example:** "Update version in 3 files"

**Decision matrix:**

| Factor        | Points | Reasoning                              |
| ------------- | ------ | -------------------------------------- |
| Steps         | +1     | 3 steps (meets threshold)              |
| Duration      | 0      | ~5 minutes (below threshold)           |
| Context drift | 0      | Low risk (similar changes)             |
| Visibility    | +1     | User wants confirmation of all 3 files |

**Total: +2 points → Use TodoWrite**

**General rule:** When borderline, err toward using TodoWrite. Cost is low, benefit is high.

### Case 3: "User specifically asks not to track"

**Example:** User says "just do it quickly, don't need updates"

**Answer:** Still use TodoWrite if complexity triggers match.

**Why:**

- System prompt mandates TodoWrite for complex tasks
- User request doesn't override system rules
- TodoWrite protects against context drift (benefits Claude, not just user)

**Exception:** If user explicitly says "no todos" AND task is borderline (close call), then skip.

### Case 4: "Nested workflows - TodoWrite within TodoWrite?"

**Example:** Main task has 5 phases, one phase itself has 5 sub-steps.

**Answer:** Single-level TodoWrite with detailed task names.

```json
{
  "todos": [
    { "content": "Phase 1: Setup environment", "status": "completed" },
    { "content": "Phase 2: Implement feature - Step 1: Core logic", "status": "completed" },
    { "content": "Phase 2: Implement feature - Step 2: Error handling", "status": "in_progress" },
    { "content": "Phase 2: Implement feature - Step 3: Edge cases", "status": "pending" },
    { "content": "Phase 3: Write tests", "status": "pending" },
    { "content": "Phase 4: Documentation", "status": "pending" }
  ]
}
```

**Don't:** Create nested TodoWrite structures (not supported).

## Special Workflow Applications

### Multi-Agent Coordination

**When using Task tool to spawn sub-agents:**

✅ **Main agent uses TodoWrite:**

```json
{
  "todos": [
    { "content": "Spawn backend-developer agent", "status": "completed" },
    { "content": "Wait for backend agent completion", "status": "completed" },
    { "content": "Spawn frontend-developer agent", "status": "in_progress" },
    { "content": "Wait for frontend agent completion", "status": "pending" },
    { "content": "Integration testing", "status": "pending" }
  ]
}
```

❌ **Sub-agents use TodoWrite internally:** Updates not visible to user (known bug).

**Workaround:** Sub-agents return todo status in JSON output for main agent to track.

### Iterative Loops

**When processing multiple items:**

✅ **Use TodoWrite for loop structure:**

```json
{
  "todos": [
    { "content": "Process items 1-10", "status": "completed" },
    { "content": "Process items 11-20", "status": "in_progress" },
    { "content": "Process items 21-30", "status": "pending" },
    { "content": "Verify all items processed", "status": "pending" }
  ]
}
```

**NOT:** Create one task per item (too granular).

**Granularity rule:** Group similar items into batches of ~10.

### Parallel Tasks

**When multiple tasks can run concurrently:**

✅ **All tasks can show as in_progress:**

```json
{
  "todos": [
    { "content": "Backend API changes", "status": "in_progress" },
    { "content": "Frontend UI updates", "status": "in_progress" },
    { "content": "Database migrations", "status": "in_progress" },
    { "content": "Integration testing", "status": "pending" }
  ]
}
```

**Why:** Reflects reality (multiple agents or operations running concurrently).

**When to use:** Only when genuinely parallel (using Task tool to spawn multiple agents).

## Summary Decision Table

| Trigger         | Weight | Threshold  | Use TodoWrite?   |
| --------------- | ------ | ---------- | ---------------- |
| ≥3 steps        | High   | 3+ steps   | ✅ YES           |
| ≥5 phases       | High   | 5+ phases  | ✅ YES           |
| >10 minutes     | High   | >10 min    | ✅ YES           |
| Context drift   | Medium | High risk  | ✅ YES           |
| User visibility | Medium | High need  | ✅ YES           |
| Borderline case | Low    | Close call | ✅ YES (default) |

**Override rule:** If ANY high-weight trigger is YES → Use TodoWrite (no debate).

## Related References

- [TodoWrite Structure](structure.md) - Task states and field requirements
- [Progress Tracking](progress-tracking.md) - Best practices for real-time updates
- [Common Mistakes](common-mistakes.md) - Anti-patterns to avoid
