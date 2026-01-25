---
description: Use when managing slash commands (create, audit, fix, list) - just describe what you want
argument-hint: <create|audit|fix|list> [command-name] [options]
model: sonnet
allowed-tools: Skill, AskUserQuestion
skills: managing-commands
---

# Command Management

**ACTION:** Invoke the `managing-commands` skill immediately.

**Arguments:**

- `$1` - Subcommand (create, audit, fix, list)
- `$2` - Command name (required for create, fix; optional for audit)
- `$3` - Options (--dry-run, --phase N)

**Critical Rules:**

1. **DELEGATE COMPLETELY:** The managing-commands skill handles all command lifecycle operations.
2. **USE INTERACTION:** Skills may use `AskUserQuestion` for user choices.
3. **DISPLAY OUTPUT:** Display the skill output verbatim.
4. **DO NOT BYPASS:** Do not attempt to execute operations yourself.

**Note:** The `managing-commands` skill enforces the Router Pattern and validates frontmatter compliance.

---
