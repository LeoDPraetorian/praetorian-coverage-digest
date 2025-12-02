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

1. **INTERCEPT SUGGESTIONS:** If `agent-manager` returns JSON configuration output (`--suggest` mode), you **MUST NOT** proceed automatically.
2. **USE INTERACTION:** Present configuration options to user via `AskUserQuestion` tool.
3. **DELEGATE COMPLETELY:** For non-interactive commands, display output verbatim.
4. **DO NOT SEARCH:** Do not attempt to find agent files yourself.
5. **Output:** Display the CLI output verbatim.

**Workflow for Creation (`create`):**

1. Call `agent-manager` with `--suggest` to generate configuration options.
2. Parse the returned JSON.
3. **STOP** and use `AskUserQuestion` to present options (category, description).
4. Run final creation command with chosen parameters.

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
| `/agent-manager test <agent> [skill]`            | Test agent discovery      |
| `/agent-manager search "<keyword>"`              | Search agents             |
| `/agent-manager list [--type <category>]`        | List agents               |
