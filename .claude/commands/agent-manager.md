---
description: Agent management - create, update, audit, fix, rename, test, search, or list agents
argument-hint: <create|update|audit|fix|rename|test|search|list> [agent-name] [options]
model: sonnet
allowed-tools: Skill, AskUserQuestion
skills: agent-manager
---

# Agent Management

**ACTION:** Invoke the `agent-manager` skill immediately.

**Arguments:**

- `$1` - Subcommand (create, update, audit, fix, rename, test, search, list)
- `$2` - Agent name (required for most subcommands)
- `$3` - Additional options (description, --type, --all, --dry-run, --suggest)

**Critical Rules:**

1. **DELEGATE COMPLETELY:** The agent-manager skill routes to operation-specific skills. Let it handle the routing.
2. **USE INTERACTION:** Skills may use `AskUserQuestion` for user choices (e.g., fixing-agents, creating-agents).
3. **DISPLAY OUTPUT:** Display the skill output verbatim.
4. **DO NOT BYPASS:** Do not attempt to execute operations yourself or call CLI scripts directly.

**Note:** The `agent-manager` skill delegates to operation-specific skills that handle all workflow complexity, including TDD cycles, interactive user prompts, and validation.

---

## Quick Reference

| Command                                          | Description               |
| ------------------------------------------------ | ------------------------- |
| `/agent-manager create <name> "<desc>" --type X` | Create agent with TDD     |
| `/agent-manager update <name> "<changes>"`       | Update agent              |
| `/agent-manager audit <name>`                    | Validate single agent     |
| `/agent-manager audit --all`                     | Validate all agents       |
| `/agent-manager fix <name> [--dry-run]`          | Fix issues                |
| `/agent-manager fix <name> --suggest`            | Show fix suggestions      |
| `/agent-manager rename <old> <new>`              | Rename agent              |
| `/agent-manager test <agent> [skill]`            | Test agent behavioral validation |
| `/agent-manager search "<keyword>"`              | Search agents             |
| `/agent-manager list [--type <category>]`        | List agents               |
