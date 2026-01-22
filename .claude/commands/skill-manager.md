---
description: Skill management - create, update, delete, audit, fix, rename, migrate, search, list, or compare skills
argument-hint: <create|update|delete|audit|fix|rename|migrate|search|list|compare> [skill-name] [options]
model: sonnet
allowed-tools: Skill, AskUserQuestion
skills: managing-skills
---

# Skill Management

**ACTION:** Invoke the `managing-skills` skill immediately.

**Arguments:**

- `$1` - Subcommand (create, update, delete, audit, fix, rename, migrate, search, list)
- `$2` - Skill name (required for most subcommands)
- `$3` - Additional options (--dry-run, --apply, --suggest, --location, etc.)

**Critical Rules:**

1. **DELEGATE COMPLETELY:** The managing-skills skill routes to operation-specific skills. Let it handle the routing.
2. **USE INTERACTION:** Skills may use `AskUserQuestion` for user choices (e.g., fixing-skills, creating-skills).
3. **DISPLAY OUTPUT:** Display the skill output verbatim.
4. **DO NOT BYPASS:** Do not attempt to execute operations yourself or call CLI scripts directly.

**Note:** The `managing-skills` skill delegates to operation-specific skills that handle all workflow complexity, including TDD cycles, interactive user prompts, and validation.

---
