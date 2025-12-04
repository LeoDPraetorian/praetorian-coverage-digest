---
description: Skill management - create, update, audit, fix, rename, migrate, search, or list skills
argument-hint: <create|update|audit|fix|rename|migrate|search|list> [skill-name] [options]
model: sonnet
allowed-tools: Skill, AskUserQuestion
skills: skill-manager, creating-skills
---

# Skill Management

**Routing by subcommand:**

| Subcommand | Skill to Invoke |
|------------|-----------------|
| `create`   | `creating-skills` (instruction-based TDD workflow) |
| All others | `skill-manager` (TypeScript CLI) |

---

## For `create` Subcommand

**ACTION:** Invoke the `creating-skills` skill.

The `creating-skills` skill guides through:
1. 🔴 RED phase (prove gap exists)
2. Location selection (core vs library)
3. Skill type selection (process/library/integration/tool-wrapper)
4. Template generation
5. Research integration
6. 🟢 GREEN phase (verify skill works)
7. 🔵 REFACTOR phase (pressure test)

**Output:** Follow the skill's interactive workflow.

---

## For All Other Subcommands

**ACTION:** Invoke the `skill-manager` skill.

**Arguments:**

- `$1` - Subcommand (update, audit, fix, rename, migrate, search, list)
- `$2` - Skill name (required for most subcommands)
- `$3` - Options: `--dry-run`, `--apply`, `--suggest`, etc.

**Output:** Display the tool output verbatim.

---

## Quick Reference

| Command                                        | Description                      |
|------------------------------------------------|----------------------------------|
| `/skill-manager create <name>`                  | Create skill (uses creating-skills) |
| `/skill-manager update <name> "<changes>"`      | Update skill                     |
| `/skill-manager audit <name>`                   | Validate skill (13 phases)       |
| `/skill-manager audit`                          | Validate all skills              |
| `/skill-manager fix <name> [--dry-run]`         | Fix issues (preview)             |
| `/skill-manager fix <name> --apply <id>`        | Apply specific fix               |
| `/skill-manager rename <old-name> <new-name>`   | Rename skill                     |
| `/skill-manager migrate <name> <target>`        | Move core ↔ library              |
| `/skill-manager search "<keyword>"`             | Search skills (both locations)   |
| `/skill-manager list`                           | List all skills (both locations) |
