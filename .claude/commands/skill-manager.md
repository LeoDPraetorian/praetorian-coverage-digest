---
description: Skill management - create, update, audit, fix, rename, migrate, search, or list skills
argument-hint: <create|update|audit|fix|rename|migrate|search|list> [skill-name] [options]
model: sonnet
allowed-tools: Skill, AskUserQuestion
skills: skill-manager
---

# Skill Management

**ACTION:** Invoke the `skill-manager` skill immediately.

**Arguments:**

- `$1` - Subcommand (create, update, audit, fix, rename, migrate, search, list)
- `$2` - Skill name (required for most subcommands)
- `$3` - Options: `--location`, `--skill-type`, `--suggest`, `--dry-run`, `--apply`, `--refresh-context7`

**Critical Rules:**

1. **INTERCEPT SUGGESTIONS:** If `skill-manager` returns a JSON payload (specifically configuration questions or `--suggest` output), you **MUST NOT** proceed automatically.
2. **USE INTERACTION:** In the case of JSON configuration output, use the `AskUserQuestion` tool to present the options (Context, Directory, Type) to the user.
3. **DELEGATE COMPLETELY:** For non-interactive commands, display output verbatim.
4. **DO NOT SEARCH:** Do not attempt to find files yourself.
5. **Output:** Display the tool output verbatim.

**Workflow for Creation (`create`):**

1. Call `skill-manager` with the `--suggest` flag or equivalent to generate configuration options.
2. Parse the returned JSON.
3. **STOP** and use `AskUserQuestion` to present the menu to the user (e.g., "Where should this be created?", "Query Context7?").
4. Once the user responds, run the final creation command with the chosen parameters.

---

## Quick Reference

| Command                                                        | Description                      |
| -------------------------------------------------------------- | -------------------------------- |
| `/skill-manager create <name> "<desc>" --location <loc>`       | Create skill with TDD            |
| `/skill-manager create <name> --location <loc> --skill-type X` | Create with specific type        |
| `/skill-manager create <name> --suggest`                       | Interactive creation (JSON)      |
| `/skill-manager update <name> "<changes>"`                     | Update skill                     |
| `/skill-manager update <name> --refresh-context7`              | Refresh library docs             |
| `/skill-manager audit <name>`                                  | Validate skill (13 phases)       |
| `/skill-manager audit`                                         | Validate all skills              |
| `/skill-manager fix <name> [--dry-run]`                        | Fix issues (preview)             |
| `/skill-manager fix <name> --suggest`                          | Show fix suggestions (JSON)      |
| `/skill-manager fix <name> --apply <id> --value "<val>"`       | Apply specific fix               |
| `/skill-manager rename <old-name> <new-name>`                  | Rename skill                     |
| `/skill-manager migrate <name> <target>`                       | Move core ↔ library              |
| `/skill-manager search "<keyword>"`                            | Search skills (both locations)   |
| `/skill-manager list`                                          | List all skills (both locations) |
