# Example: Refactoring Workflow with TodoWrite

## Scenario

**User request:** "Refactor the authentication system to use JWT instead of sessions"

**Complexity analysis:**
- ≥3 steps? YES (5+ distinct phases)
- ≥5 phases? YES
- >10 minutes? YES (estimated 45 minutes)
- Context drift risk? YES (multiple files, design decisions)
- User visibility? YES (critical system, user wants updates)

**Decision: Use TodoWrite** ✅

## Complete Workflow

### Step 1: Initialize Complete Task List (0:00)

**First tool call before any work:**

```json
{
  "todos": [
    {"content": "Analyze current session-based auth implementation", "status": "pending", "activeForm": "Analyzing current session-based auth implementation"},
    {"content": "Research JWT best practices and security", "status": "pending", "activeForm": "Researching JWT best practices and security"},
    {"content": "Design new JWT architecture", "status": "pending", "activeForm": "Designing new JWT architecture"},
    {"content": "Implement JWT middleware", "status": "pending", "activeForm": "Implementing JWT middleware"},
    {"content": "Update route handlers for JWT", "status": "pending", "activeForm": "Updating route handlers for JWT"},
    {"content": "Write unit tests for JWT auth", "status": "pending", "activeForm": "Writing unit tests for JWT auth"},
    {"content": "Write integration tests", "status": "pending", "activeForm": "Writing integration tests"},
    {"content": "Update authentication documentation", "status": "pending", "activeForm": "Updating authentication documentation"},
    {"content": "Remove old session code", "status": "pending", "activeForm": "Removing old session code"},
    {"content": "Deploy and verify", "status": "pending", "activeForm": "Deploying and verifying"}
  ]
}
```

**User sees:** Complete scope upfront (10 tasks, ~45 minutes)

### Step 2: Start First Task (0:00)

**Mark in_progress BEFORE starting work:**

```json
{
  "todos": [
    {"content": "Analyze current session-based auth implementation", "status": "in_progress", "activeForm": "Analyzing current session-based auth implementation"},
    {"content": "Research JWT best practices and security", "status": "pending", "activeForm": "Researching JWT best practices and security"},
    {"content": "Design new JWT architecture", "status": "pending", "activeForm": "Designing new JWT architecture"},
    {"content": "Implement JWT middleware", "status": "pending", "activeForm": "Implementing JWT middleware"},
    {"content": "Update route handlers for JWT", "status": "pending", "activeForm": "Updating route handlers for JWT"},
    {"content": "Write unit tests for JWT auth", "status": "pending", "activeForm": "Writing unit tests for JWT auth"},
    {"content": "Write integration tests", "status": "pending", "activeForm": "Writing integration tests"},
    {"content": "Update authentication documentation", "status": "pending", "activeForm": "Updating authentication documentation"},
    {"content": "Remove old session code", "status": "pending", "activeForm": "Removing old session code"},
    {"content": "Deploy and verify", "status": "pending", "activeForm": "Deploying and verifying"}
  ]
}
```

**THEN:** Start analyzing code.

**User sees:** "Analyzing current session-based auth implementation"

### Step 3: Complete First Task (0:08)

**Mark completed IMMEDIATELY after finishing:**

```json
{
  "todos": [
    {"content": "Analyze current session-based auth implementation", "status": "completed", "activeForm": "Analyzing current session-based auth implementation"},
    {"content": "Research JWT best practices and security", "status": "in_progress", "activeForm": "Researching JWT best practices and security"},
    {"content": "Design new JWT architecture", "status": "pending", "activeForm": "Designing new JWT architecture"},
    {"content": "Implement JWT middleware", "status": "pending", "activeForm": "Implementing JWT middleware"},
    {"content": "Update route handlers for JWT", "status": "pending", "activeForm": "Updating route handlers for JWT"},
    {"content": "Write unit tests for JWT auth", "status": "pending", "activeForm": "Writing unit tests for JWT auth"},
    {"content": "Write integration tests", "status": "pending", "activeForm": "Writing integration tests"},
    {"content": "Update authentication documentation", "status": "pending", "activeForm": "Updating authentication documentation"},
    {"content": "Remove old session code", "status": "pending", "activeForm": "Removing old session code"},
    {"content": "Deploy and verify", "status": "pending", "activeForm": "Deploying and verifying"}
  ]
}
```

**User sees:** Task 1 ✓ complete, now researching JWT

### Step 4: Continue Through Tasks (0:08 - 0:40)

**Repeat pattern for each task:**
1. Mark in_progress
2. Do work
3. Mark completed immediately

**Example at 0:25:**

```json
{
  "todos": [
    {"content": "Analyze current session-based auth implementation", "status": "completed", "activeForm": "Analyzing current session-based auth implementation"},
    {"content": "Research JWT best practices and security", "status": "completed", "activeForm": "Researching JWT best practices and security"},
    {"content": "Design new JWT architecture", "status": "completed", "activeForm": "Designing new JWT architecture"},
    {"content": "Implement JWT middleware", "status": "completed", "activeForm": "Implementing JWT middleware"},
    {"content": "Update route handlers for JWT", "status": "in_progress", "activeForm": "Updating route handlers for JWT"},
    {"content": "Write unit tests for JWT auth", "status": "pending", "activeForm": "Writing unit tests for JWT auth"},
    {"content": "Write integration tests", "status": "pending", "activeForm": "Writing integration tests"},
    {"content": "Update authentication documentation", "status": "pending", "activeForm": "Updating authentication documentation"},
    {"content": "Remove old session code", "status": "pending", "activeForm": "Removing old session code"},
    {"content": "Deploy and verify", "status": "pending", "activeForm": "Deploying and verifying"}
  ]
}
```

**User sees:** 4 tasks complete, working on route handlers, 5 tasks remaining

### Step 5: Discover New Task (0:30)

**Situation:** While writing tests, realize need to add refresh token logic.

**Add new task to complete list:**

```json
{
  "todos": [
    {"content": "Analyze current session-based auth implementation", "status": "completed", "activeForm": "Analyzing current session-based auth implementation"},
    {"content": "Research JWT best practices and security", "status": "completed", "activeForm": "Researching JWT best practices and security"},
    {"content": "Design new JWT architecture", "status": "completed", "activeForm": "Designing new JWT architecture"},
    {"content": "Implement JWT middleware", "status": "completed", "activeForm": "Implementing JWT middleware"},
    {"content": "Update route handlers for JWT", "status": "completed", "activeForm": "Updating route handlers for JWT"},
    {"content": "Write unit tests for JWT auth", "status": "in_progress", "activeForm": "Writing unit tests for JWT auth"},
    {"content": "Implement refresh token logic", "status": "pending", "activeForm": "Implementing refresh token logic"},
    {"content": "Write integration tests", "status": "pending", "activeForm": "Writing integration tests"},
    {"content": "Update authentication documentation", "status": "pending", "activeForm": "Updating authentication documentation"},
    {"content": "Remove old session code", "status": "pending", "activeForm": "Removing old session code"},
    {"content": "Deploy and verify", "status": "pending", "activeForm": "Deploying and verifying"}
  ]
}
```

**User sees:** New task added (scope changed, but visible)

### Step 6: Final Tasks (0:40 - 0:48)

**Continue through remaining tasks:**

```json
{
  "todos": [
    {"content": "Analyze current session-based auth implementation", "status": "completed", "activeForm": "Analyzing current session-based auth implementation"},
    {"content": "Research JWT best practices and security", "status": "completed", "activeForm": "Researching JWT best practices and security"},
    {"content": "Design new JWT architecture", "status": "completed", "activeForm": "Designing new JWT architecture"},
    {"content": "Implement JWT middleware", "status": "completed", "activeForm": "Implementing JWT middleware"},
    {"content": "Update route handlers for JWT", "status": "completed", "activeForm": "Updating route handlers for JWT"},
    {"content": "Write unit tests for JWT auth", "status": "completed", "activeForm": "Writing unit tests for JWT auth"},
    {"content": "Implement refresh token logic", "status": "completed", "activeForm": "Implementing refresh token logic"},
    {"content": "Write integration tests", "status": "completed", "activeForm": "Writing integration tests"},
    {"content": "Update authentication documentation", "status": "completed", "activeForm": "Updating authentication documentation"},
    {"content": "Remove old session code", "status": "completed", "activeForm": "Removing old session code"},
    {"content": "Deploy and verify", "status": "in_progress", "activeForm": "Deploying and verifying"}
  ]
}
```

**User sees:** 10/11 tasks complete, deploying final changes

### Step 7: Completion (0:48)

**Final status:**

```json
{
  "todos": [
    {"content": "Analyze current session-based auth implementation", "status": "completed", "activeForm": "Analyzing current session-based auth implementation"},
    {"content": "Research JWT best practices and security", "status": "completed", "activeForm": "Researching JWT best practices and security"},
    {"content": "Design new JWT architecture", "status": "completed", "activeForm": "Designing new JWT architecture"},
    {"content": "Implement JWT middleware", "status": "completed", "activeForm": "Implementing JWT middleware"},
    {"content": "Update route handlers for JWT", "status": "completed", "activeForm": "Updating route handlers for JWT"},
    {"content": "Write unit tests for JWT auth", "status": "completed", "activeForm": "Writing unit tests for JWT auth"},
    {"content": "Implement refresh token logic", "status": "completed", "activeForm": "Implementing refresh token logic"},
    {"content": "Write integration tests", "status": "completed", "activeForm": "Writing integration tests"},
    {"content": "Update authentication documentation", "status": "completed", "activeForm": "Updating authentication documentation"},
    {"content": "Remove old session code", "status": "completed", "activeForm": "Removing old session code"},
    {"content": "Deploy and verify", "status": "completed", "activeForm": "Deploying and verifying"}
  ]
}
```

**User sees:** All 11 tasks complete! ✅

## Key Takeaways

### What Went Right

1. **✅ Upfront planning** - Complete task list before any work
2. **✅ Real-time updates** - Status updated after each task
3. **✅ Visibility** - User knew what was happening at all times
4. **✅ Scope transparency** - New task added and visible
5. **✅ Progress tracking** - Could see 10/11 tasks complete
6. **✅ Focus** - Only one task in_progress at a time

### Benefits Demonstrated

- **User confidence** - Continuous updates confirmed work was progressing
- **Accurate estimates** - User knew 45 minutes upfront, actual was 48 minutes
- **Intervention opportunity** - User could have stopped if refresh tokens not wanted
- **Accountability** - Full history of all work done
- **No forgotten tasks** - External memory prevented missing documentation

### Timeline

```
0:00 - Initialize TodoWrite (10 tasks)
0:00 - Start task 1
0:08 - Complete task 1, start task 2
0:14 - Complete task 2, start task 3
0:20 - Complete task 3, start task 4
0:25 - Complete task 4, start task 5
0:30 - Complete task 5, start task 6 (discover new task 7)
0:35 - Complete task 6, start task 7
0:38 - Complete task 7, start task 8
0:41 - Complete task 8, start task 9
0:44 - Complete task 9, start task 10
0:46 - Complete task 10, start task 11
0:48 - Complete task 11, DONE
```

**Total:** 11 TodoWrite updates over 48 minutes (average every 4-5 minutes)

## Related Examples

- [Multi-Agent Coordination](multi-agent-coordination.md) - TodoWrite with sub-agents
- [Validation Loop](validation-loop.md) - TodoWrite with iterative validation
- [Bug Investigation](bug-investigation.md) - TodoWrite for debugging workflow
