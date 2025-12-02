---
description: Command management - create, audit, fix, list slash commands
argument-hint: <create|audit|fix|list> [command-name] [options]
model: sonnet
allowed-tools: Skill, AskUserQuestion
skills: command-manager
---

# Command Management

**ACTION:** Invoke the `command-manager` skill immediately.

**Arguments:**

- `$1` - Subcommand (create, audit, fix, list)
- `$2` - Command name (required for create, fix; optional for audit)
- `$3` - Options (--dry-run, --phase N)

**Critical Rules:**

1. **ROUTER PATTERN:** Commands delegate to skills, contain zero logic.
2. **DELEGATE COMPLETELY:** Invoke the skill and display output verbatim.
3. **DO NOT SEARCH:** Do not attempt to find command files yourself.
4. **Output:** Display the CLI output verbatim.

---

## Quick Reference

| Command                                    | Description                     |
| ------------------------------------------ | ------------------------------- |
| `/command-manager create <name> ["desc"]`  | Create command (Router Pattern) |
| `/command-manager audit <name>`            | Validate single command         |
| `/command-manager audit`                   | Validate all commands           |
| `/command-manager audit <name> --phase N`  | Run specific audit phase (1-8)  |
| `/command-manager fix <name> [--dry-run]`  | Fix compliance issues           |
| `/command-manager list`                    | List all commands               |
