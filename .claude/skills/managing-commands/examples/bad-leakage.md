# Anti-Pattern Examples: Tool and Logic Leakage

This document shows common violations and how to fix them.

## Anti-Pattern 1: Tool Leakage

### ❌ Wrong

```markdown
---
description: Manage agents in the system
argument-hint: <new|audit|fix|list> [agent-name]
allowed-tools: Skill, Read, Write, Edit, Bash, Grep, Glob, Task
skills: agent-write, agent-audit, agent-fix, agent-search
---

# Agent Management

Help the user manage agents by using the appropriate skill.
```

### Problems

| Issue                   | Severity | Why It's Wrong                       |
| ----------------------- | -------- | ------------------------------------ |
| Extra tools with skills | CRITICAL | Enables LLM to work around failures  |
| Vague instructions      | CRITICAL | "Help the user" is not imperative    |
| Multiple skills         | WARNING  | Should route to single unified skill |
| No argument mapping     | WARNING  | Unclear how $1, $2 map to skills     |
| No verbatim directive   | WARNING  | Output may be reformatted            |

### ✅ Fixed

```markdown
---
description: Agent management - create, audit, fix, list agents
argument-hint: <new|audit|fix|list> [agent-name]
allowed-tools: Skill, AskUserQuestion
skills: agent-manager
---

# Agent Management

**Subcommand:** $1
**Agent name:** $2

## Dispatch Based on $1

### new - Create New Agent

**ACTION:** Invoke the `agent-manager` skill.

**Arguments:**

- `operation`: "create"
- `agentName`: $2 (Required)

**Output:** Display the tool output verbatim.

[... similar for other subcommands ...]

## Error Handling

If $1 invalid:
Explain valid subcommands.
```

---

## Anti-Pattern 2: Logic Leakage

### ❌ Wrong (60+ lines of logic)

```markdown
---
description: Process and transform data files
allowed-tools: Read, Write, Bash
---

# Data Processor

1. First, read the input file:
   Use Read tool to get contents of $1

2. Parse the JSON:
   Extract the "data" array from the JSON

3. Transform each item:
   For each item in the array:
   - Convert timestamps to ISO format
   - Normalize field names
   - Calculate derived values

4. Validate the output:
   Check that all required fields are present
   Verify data types are correct
   Ensure no duplicates

5. Write the result:
   Use Write tool to save to output/$1.processed.json

6. Generate report:
   Create summary of changes made
   Count records processed
   List any errors encountered

7. Notify completion:
   Display success message with statistics
```

### Problems

| Issue               | Severity | Why It's Wrong                     |
| ------------------- | -------- | ---------------------------------- |
| 60+ lines           | WARNING  | Logic belongs in a skill           |
| Uses Write tool     | WARNING  | Command shouldn't write files      |
| Complex logic       | WARNING  | Not testable, not reusable         |
| No skill delegation | INFO     | Should create data-processor skill |

### ✅ Fixed

```markdown
---
description: Process and transform data files
argument-hint: <input-file>
allowed-tools: Skill, AskUserQuestion
skills: data-processor
---

# Data Processor

**Input file:** $1

## ACTION

Invoke the `data-processor` skill.

**Arguments:**

- `inputFile`: $1 (Required)

**Output:** Display the tool output verbatim.

## Error Handling

If $1 not provided:
Explain: Input file path required.
Show usage: /process-data <input-file>
```

---

## Anti-Pattern 3: Vague Instructions

### ❌ Wrong

```markdown
---
allowed-tools: Skill, AskUserQuestion
skills: code-reviewer
---

# Code Review

You should help the user review their code.
Assist them by running the code-reviewer skill.
Try to be helpful and thorough.
```

### Problems

| Issue                 | Severity | Why It's Wrong            |
| --------------------- | -------- | ------------------------- |
| "You should help"     | CRITICAL | Vague, not imperative     |
| "Assist them"         | CRITICAL | Vague, not imperative     |
| "Try to be"           | CRITICAL | Vague, not imperative     |
| No argument mapping   | WARNING  | How does $1 map?          |
| No verbatim directive | WARNING  | Output may be reformatted |

### ✅ Fixed

```markdown
---
description: Review code for quality and issues
argument-hint: <file-path>
allowed-tools: Skill, AskUserQuestion
skills: code-reviewer
---

# Code Review

**Target file:** $1

## ACTION

Invoke the `code-reviewer` skill.

**Arguments:**

- `filePath`: $1 (Required)

**Output:** Display the tool output verbatim.

## Error Handling

If $1 not provided:
Explain: File path required for review.
```

---

## Quick Reference: Violation Detection

| Pattern                               | Violation Type     | Severity |
| ------------------------------------- | ------------------ | -------- |
| `skills:` + `Bash, Read, Write, Edit` | Tool Leakage       | CRITICAL |
| "help the user", "assist with"        | Vague Instructions | CRITICAL |
| Command > 50 lines                    | Logic Leakage      | WARNING  |
| No "verbatim" in output               | Missing Directive  | WARNING  |
| $1, $2 without mapping                | Implicit Mapping   | WARNING  |

## Auto-Fix Available

```bash
# Fix Tool Leakage
npm run fix -- <command> --dry-run

# Review changes
npm run fix -- <command>

# Verify
npm run audit -- <command>
```

Note: Vague instructions and logic leakage require manual fixes.
