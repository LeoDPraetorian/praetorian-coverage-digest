# Router Pattern Guide

## What is the Router Pattern?

The Router Pattern is a command design principle where commands parse arguments and delegate to skills, containing **zero business logic**.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Command   │────▶│    Skill    │────▶│   Result    │
│   (Router)  │     │   (Logic)   │     │  (Output)   │
└─────────────┘     └─────────────┘     └─────────────┘
     │                    │                    │
     │ Parse args         │ Execute logic      │ Format output
     │ Validate input     │ Access tools       │ Return verbatim
     │ Delegate           │ Handle errors      │
     └────────────────────┴────────────────────┘
```

## Why Enforce It?

### Token Budget Economics

| Aspect       | Command          | Skill          |
| ------------ | ---------------- | -------------- |
| When loaded  | Every invocation | On-demand      |
| Context cost | Always paid      | Only when used |
| Ideal size   | < 50 lines       | Any size       |

**Math:** If a command is invoked 100 times but only 10 need the skill's logic, you've wasted 90 loads of that logic in context.

### Safety

| Without Router Pattern                  | With Router Pattern           |
| --------------------------------------- | ----------------------------- |
| LLM can "fix" failures with extra tools | LLM forced to report failures |
| Hallucination possible                  | Hallucination prevented       |
| Unpredictable behavior                  | Deterministic behavior        |

**Physical restriction:** If allowed-tools only includes `Skill, AskUserQuestion`, the LLM literally cannot execute Bash commands to work around a failed skill call.

### Maintainability

| Commands as Routers | Commands with Logic   |
| ------------------- | --------------------- |
| Simple, predictable | Complex, error-prone  |
| Easy to test        | Hard to test          |
| Clear separation    | Tangled concerns      |
| One place to change | Many places to change |

## Router Pattern Template

```markdown
---
description: Use when [trigger] - [keywords] # < 120 chars
argument-hint: <subcommand> [args]
allowed-tools: Skill, AskUserQuestion
skills: backing-skill-name
---

# Command Name

**Subcommand:** $1
**Arguments:** $2, $3

## ACTION

Invoke the `backing-skill-name` skill.

**Arguments:**

- `operation`: $1 (Required)
- `target`: $2 (Optional)

**Output:** Display the tool output verbatim.

## Error Handling

If $1 invalid:
Explain valid options.
```

## Key Elements

### 1. Minimal Tools

```yaml
# Router Pattern (correct)
allowed-tools: Skill, AskUserQuestion

# Tool Leakage (wrong)
allowed-tools: Skill, Bash, Read, AskUserQuestion
```

### 2. Imperative Instructions

```markdown
# Correct (imperative)

Invoke the `my-skill` skill.
Display the tool output verbatim.

# Wrong (vague)

Help the user with their request.
You should assist by running the skill.
```

### 3. Explicit Argument Mapping

```markdown
# Correct (explicit)

**Arguments:**

- `operation`: $1 (Required)
- `target`: $2 (Optional)

# Wrong (implicit)

Pass the arguments to the skill.
```

### 4. Verbatim Output

```markdown
# Correct

**Output:** Display the tool output verbatim.

# Wrong

(no output directive, LLM may reformat)
```

## When NOT to Use Router Pattern

### Direct System Utilities

Some commands don't have backing skills and directly execute system commands:

```yaml
---
description: Show git status
allowed-tools: Bash(git:*)
---

Execute: !`git status`
Display the output.
```

### File Listing

```yaml
---
description: List files in directory
allowed-tools: Glob
---
Use Glob to find files matching the pattern.
```

### When No Skill Exists

If there's no skill that implements the logic, you may need tools in the command. But consider:

- Should a skill be created?
- Is the logic simple enough for a command?
- Will this command grow over time?

## Common Violations

### Tool Leakage

```yaml
# VIOLATION: Has skills but includes extra tools
---
allowed-tools: Skill, Bash, Read, AskUserQuestion
skills: my-skill
---
```

**Fix:** Remove `Bash, Read`:

```yaml
---
allowed-tools: Skill, AskUserQuestion
skills: my-skill
---
```

### Logic Leakage

```markdown
# VIOLATION: Business logic in command (60 lines)

---

description: Process data
allowed-tools: Bash, Read, Write

---

1. Read the file
2. Parse the JSON
3. Transform the data
4. Write output
5. Validate result
   ...
```

**Fix:** Move logic to a skill, command becomes router:

```markdown
---
description: Process data
allowed-tools: Skill, AskUserQuestion
skills: data-processor
---

Invoke the `data-processor` skill.
**Output:** Display the tool output verbatim.
```

### Vague Instructions

```markdown
# VIOLATION: Vague language

Help the user by running the skill.
Assist with their request.
```

**Fix:** Imperative language:

```markdown
Invoke the `my-skill` skill.
Display the tool output verbatim.
```

## Enforcement

The `command-manager audit` operation includes Check 8: Router Pattern Compliance.

**What it checks:**

- Has `skills:` + extra tools? → CRITICAL (Tool Leakage)
- Has vague instructions? → CRITICAL (Instruction Determinism)
- Missing verbatim directive? → WARNING
- Command > 50 lines? → WARNING (Logic Leakage)
- No explicit argument mapping? → WARNING

**Auto-fixes available:**

- Remove unnecessary tools
- Add verbatim output directive
- Add argument-hint

Run `npm run fix -- <command> --dry-run` to preview fixes.
