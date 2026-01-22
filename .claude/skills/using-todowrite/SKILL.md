---
name: using-todowrite
description: Use when planning multi-step tasks - enforces TodoWrite for ≥2 steps, multi-phase workflows, real-time progress tracking
allowed-tools: TodoWrite, Read, AskUserQuestion
---

# Using TodoWrite

TodoWrite is Claude Code's built-in task management system for tracking progress during coding sessions. This skill teaches when and how to use TodoWrite effectively.

## When to Use This Skill

Use TodoWrite when you encounter ANY of these complexity triggers:

### Definite Yes (Must Use TodoWrite)

- **≥2 distinct steps** - Task requires two or more separate actions
- **≥5 phases** - Workflow has five or more phases
- **>10 minutes** - Task will take more than 10 minutes to complete
- **Context drift risk** - Long operations where you might forget earlier steps
- **User visibility** - User needs real-time progress updates

### Probably Use (Strong Signal)

- **Non-trivial request** - Not a simple one-step operation
- **Multiple files** - Task touches 3+ files across different directories
- **Iteration required** - Need to process items in a loop
- **Parallel work** - Managing concurrent tasks or agents

### Don't Use (Wrong Tool)

- **Single straightforward task** - One simple operation
- **<2 steps** - Task completes in 1 step
- **Conversational** - Just answering questions, no action needed
- **Trivial operations** - Quick reads, simple checks

## Quick Start

**1. Initialize complete task list FIRST (before any work):**

```json
{
  "todos": [
    {
      "content": "Analyze requirements",
      "status": "pending",
      "activeForm": "Analyzing requirements"
    },
    { "content": "Design solution", "status": "pending", "activeForm": "Designing solution" },
    { "content": "Implement changes", "status": "pending", "activeForm": "Implementing changes" },
    { "content": "Write tests", "status": "pending", "activeForm": "Writing tests" },
    {
      "content": "Verify and commit",
      "status": "pending",
      "activeForm": "Verifying and committing"
    }
  ]
}
```

**2. Mark in_progress BEFORE starting work:**

```json
{
  "todos": [
    {"content": "Analyze requirements", "status": "in_progress", "activeForm": "Analyzing requirements"},
    {"content": "Design solution", "status": "pending", "activeForm": "Designing solution"},
    ...
  ]
}
```

**3. Update to completed IMMEDIATELY after finishing:**

```json
{
  "todos": [
    {"content": "Analyze requirements", "status": "completed", "activeForm": "Analyzing requirements"},
    {"content": "Design solution", "status": "in_progress", "activeForm": "Designing solution"},
    ...
  ]
}
```

## Table of Contents

### Core Concepts

- **[When to Use TodoWrite](references/when-to-use.md)** - Detailed complexity triggers and decision flowchart
- **[TodoWrite Structure](references/structure.md)** - Task states, status transitions, field requirements
- **[Update Patterns](references/update-patterns.md)** - How updates work, complete list requirement

### Best Practices

- **[Progress Tracking](references/progress-tracking.md)** - 5 rules for real-time updates, timing guidelines
- **[Common Mistakes](references/common-mistakes.md)** - Anti-patterns and how to fix them

### Advanced Usage

- **Multi-Agent Workflows** - Sub-agent TodoWrite updates are internal only (known limitation); sub-agents should return todo status in JSON output for parent tracking
- **Custom Configurations** - CLAUDE.md can set project-specific TodoWrite thresholds (e.g., minimum task count)

## Core Workflow

### 1. Recognize Complexity

**Before starting any task**, check complexity triggers:

```
Is this ≥2 steps? → YES → Use TodoWrite
Is this ≥5 phases? → YES → Use TodoWrite
Will this take >10 minutes? → YES → Use TodoWrite
Might I forget earlier steps? → YES → Use TodoWrite
Does user need progress updates? → YES → Use TodoWrite
```

See [When to Use TodoWrite](references/when-to-use.md) for decision flowchart.

### 2. Initialize Complete Task List

**FIRST tool call = TodoWrite with ALL planned tasks**

```json
{
  "todos": [
    { "content": "Step 1", "status": "pending", "activeForm": "Doing step 1" },
    { "content": "Step 2", "status": "pending", "activeForm": "Doing step 2" },
    { "content": "Step 3", "status": "pending", "activeForm": "Doing step 3" }
  ]
}
```

**Why upfront:** Creates accountability and prevents scope creep.

### 3. Mark in_progress BEFORE Work

```json
{ "content": "Step 1", "status": "in_progress", "activeForm": "Doing step 1" }
```

**Timing:** Update status → THEN start work (not after)

**Limit:** Ideally only ONE task in_progress at a time

### 4. Update completed IMMEDIATELY After

```json
{ "content": "Step 1", "status": "completed", "activeForm": "Doing step 1" }
```

**Critical:** Mark completed as soon as task finishes, don't batch multiple completions.

### 5. Provide Complete List on Each Update

**Important:** TodoWrite requires the complete todo list on every update, not just changed items.

```json
{
  "todos": [
    { "content": "Step 1", "status": "completed", "activeForm": "Doing step 1" },
    { "content": "Step 2", "status": "in_progress", "activeForm": "Doing step 2" },
    { "content": "Step 3", "status": "pending", "activeForm": "Doing step 3" }
  ]
}
```

Include:

- All existing tasks with updated statuses
- Any new tasks discovered during work
- Remove tasks no longer relevant

See [Update Patterns](references/update-patterns.md) for details.

## Best Practices

### ✅ Do This

- **Initialize upfront** - Create full task list before any work
- **Real-time updates** - Mark in_progress before starting, completed immediately after
- **One in_progress** - Focus on one task at a time (ideally)
- **Complete list** - Provide all tasks on every update, not just changes
- **Use VERY frequently** - Don't skip for complex work

### ❌ Don't Do This

- **Create as you go** - Don't add tasks incrementally during work
- **Batch completions** - Don't wait to mark multiple tasks completed at once
- **Skip in_progress** - Don't start work without marking status first
- **Partial updates** - Don't send only changed tasks (send complete list)
- **Overuse for trivial** - Don't use for simple 1-2 step operations

See [Common Mistakes](references/common-mistakes.md) for detailed anti-patterns.

## Critical Rules

### Rule 1: Frequency is Mandatory

**System prompt states:**

> "Use these tools VERY frequently to ensure that you are tracking your tasks and giving the user visibility into your progress. These tools are also EXTREMELY helpful for planning tasks, and for breaking down larger complex tasks into smaller steps. If you do not use this tool when planning, you may forget to do important tasks - and that is unacceptable."

**This means:** When complexity triggers match, TodoWrite is NOT optional.

### Rule 2: Timing is Critical

**Three timing rules:**

1. **Initialize**: Before any work begins
2. **in_progress**: Before starting each task
3. **completed**: Immediately after finishing each task

**NOT:**

- After work is done
- Batched at end
- When you remember

### Rule 3: Complete List Always

**Each TodoWrite call must include:**

- ✅ All existing tasks (with current statuses)
- ✅ Any new tasks discovered
- ✅ Remove irrelevant tasks

**NOT:**

- ❌ Only changed tasks
- ❌ Only new tasks
- ❌ Delta/diff updates

### Rule 4: activeForm is Required

Every task must have both `content` and `activeForm`:

```json
{
  "content": "Write unit tests", // Imperative: what needs to be done
  "activeForm": "Writing unit tests" // Present continuous: what's happening now
}
```

**Purpose:** `activeForm` is shown to users when task is in_progress, providing real-time status updates.

## Task States Reference

| State         | Meaning           | When to Use                       |
| ------------- | ----------------- | --------------------------------- |
| `pending`     | Not started yet   | Initial state for planned tasks   |
| `in_progress` | Currently working | Mark BEFORE beginning work        |
| `completed`   | Finished          | Mark IMMEDIATELY after completion |

**Valid transitions:**

- `pending` → `in_progress` (starting work)
- `in_progress` → `completed` (finishing work)
- `pending` → `completed` (skip if no longer needed)

**Invalid:**

- ❌ `completed` → `pending` (don't reopen, create new task)
- ❌ `completed` → `in_progress` (don't reopen, create new task)

See [TodoWrite Structure](references/structure.md) for detailed field requirements.

## Common Rationalizations (DON'T DO THIS)

Agents commonly rationalize skipping TodoWrite:

- ❌ "This is just a simple feature" → **NO.** Check complexity triggers.
- ❌ "I can track this mentally" → **NO.** Users need visibility.
- ❌ "It's only 2 steps" → **NO.** If non-trivial, use TodoWrite.
- ❌ "I'll add todos as I go" → **NO.** Initialize upfront.
- ❌ "I'll update statuses at the end" → **NO.** Real-time updates mandatory.

**Counter:** When complexity triggers match, TodoWrite is NOT optional. Period.

## Example Workflow

**User request:** "Refactor the authentication system"

### Step 1: Initialize Complete Task List (First Tool Call)

```json
{
  "todos": [
    {
      "content": "Analyze current auth implementation",
      "status": "pending",
      "activeForm": "Analyzing current auth implementation"
    },
    {
      "content": "Identify security issues",
      "status": "pending",
      "activeForm": "Identifying security issues"
    },
    {
      "content": "Design new architecture",
      "status": "pending",
      "activeForm": "Designing new architecture"
    },
    { "content": "Implement changes", "status": "pending", "activeForm": "Implementing changes" },
    { "content": "Write tests", "status": "pending", "activeForm": "Writing tests" },
    {
      "content": "Update documentation",
      "status": "pending",
      "activeForm": "Updating documentation"
    }
  ]
}
```

### Step 2: Mark First Task in_progress BEFORE Starting

```json
{
  "todos": [
    {
      "content": "Analyze current auth implementation",
      "status": "in_progress",
      "activeForm": "Analyzing current auth implementation"
    },
    {
      "content": "Identify security issues",
      "status": "pending",
      "activeForm": "Identifying security issues"
    },
    {
      "content": "Design new architecture",
      "status": "pending",
      "activeForm": "Designing new architecture"
    },
    { "content": "Implement changes", "status": "pending", "activeForm": "Implementing changes" },
    { "content": "Write tests", "status": "pending", "activeForm": "Writing tests" },
    {
      "content": "Update documentation",
      "status": "pending",
      "activeForm": "Updating documentation"
    }
  ]
}
```

**THEN:** Start analyzing the code.

### Step 3: Mark completed IMMEDIATELY After Finishing

```json
{
  "todos": [
    {
      "content": "Analyze current auth implementation",
      "status": "completed",
      "activeForm": "Analyzing current auth implementation"
    },
    {
      "content": "Identify security issues",
      "status": "in_progress",
      "activeForm": "Identifying security issues"
    },
    {
      "content": "Design new architecture",
      "status": "pending",
      "activeForm": "Designing new architecture"
    },
    { "content": "Implement changes", "status": "pending", "activeForm": "Implementing changes" },
    { "content": "Write tests", "status": "pending", "activeForm": "Writing tests" },
    {
      "content": "Update documentation",
      "status": "pending",
      "activeForm": "Updating documentation"
    }
  ]
}
```

### Step 4: Continue Pattern Until All Complete

Repeat the pattern:

1. Mark next task `in_progress`
2. Do the work
3. Mark `completed` immediately
4. Move to next task

See [examples/refactoring-workflow.md](examples/refactoring-workflow.md) for complete example.

## Troubleshooting

### Issue: "TodoWrite updates not visible in sub-agents"

**Symptom:** When using Task tool, TodoWrite calls don't show to user.

**Cause:** Known bug - sub-agent TodoWrite updates are internal only.

**Workaround:** Sub-agents should return todo status in their output JSON for parent to track.

### Issue: "Should I use TodoWrite for this?"

**Answer:** Run the complexity check:

```
≥2 steps? → YES
≥5 phases? → YES
>10 minutes? → YES
Context drift risk? → YES
User visibility needed? → YES

Any YES → Use TodoWrite
All NO → Skip TodoWrite
```

See [When to Use TodoWrite](references/when-to-use.md) for decision flowchart.

### Issue: "How many tasks should I create?"

**Guidelines:**

- **Minimum:** 2 tasks (if fewer, probably don't need TodoWrite)
- **Sweet spot:** 5-10 tasks for most workflows
- **Large projects:** 15-20+ tasks acceptable
- **Custom config:** CLAUDE.md can set minimum (e.g., "always maintain 20 items")

**Granularity:** Each task should be 5-15 minutes of work.

**Tip:** CLAUDE.md can override these defaults for project-specific needs.

## Integration

### Called By

- System prompt (built-in TodoWrite guidance)
- Entry point skill (no direct callers)

### Requires (invoke before starting)

None - standalone skill

### Calls (during execution)

None - instructional skill (teaches TodoWrite usage, doesn't invoke other skills)

### Pairs With (conditional)

| Skill                                                                                                                                        | Trigger                  | Purpose                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------- |
| `adhering-to-yagni`                                                                                                                          | Scope discipline needed  | Prevents feature creep in task list                             |
| `developing-with-tdd`                                                                                                                        | TDD workflow             | TodoWrite tracks RED-GREEN-REFACTOR                             |
| `debugging-systematically`                                                                                                                   | Bug investigation        | TodoWrite tracks hypothesis testing                             |
| `orchestrating-multi-agent-workflows`                                                                                                        | Multi-agent coordination | Parent tracks sub-agent progress                                |
| `pressure-testing-skill-content` (LIBRARY) - `Read(".claude/skill-library/claude/skill-management/pressure-testing-skill-content/SKILL.md")` | Skill validation         | Systematic pressure test scenarios for skill content validation |

## References

### Official Documentation

- [Claude Code: Best Practices for Agentic Coding](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Claude Agent SDK: Todo Tracking](https://docs.claude.com/en/docs/claude-code/sdk/todo-tracking)

### Community Resources

- [ClaudeLog: What is TODO list in Claude Code](https://claudelog.com/faqs/what-is-todo-list-in-claude-code/)
- [TodoWrite Orchestration Plugin](https://claude-plugins.dev/skills/@MadAppGang/claude-code/todowrite-orchestration)
