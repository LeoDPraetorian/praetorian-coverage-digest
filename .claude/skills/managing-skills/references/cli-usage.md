# CLI Usage Reference

**Running CLI commands from anywhere in the repository.**

This document provides detailed instructions for executing skill management CLI commands.

---

## Setup

**Recommended:** Use workspace shortcuts from `.claude/` root (from anywhere in the repo):

```bash
# Setup ROOT (uses backticks for Claude Code compatibility)
ROOT=`git rev-parse --show-superproject-working-tree 2>/dev/null`
test -z "$ROOT" && ROOT=`git rev-parse --show-toplevel`
cd "$ROOT/.claude"
```

> **Prerequisites:** Run `npm install` in `.claude/` first to link workspace packages.

---

## Available Commands

Once in the `.claude/` directory, run these commands:

```bash
# Audit a skill
npm run audit -- <skill-name>

# Fix compliance issues
npm run fix -- <skill-name>

# Search for skills
npm run search -- "<query>"

# Update a skill
npm run update -- <skill-name>
```

---

## Command Examples

### Audit Commands

```bash
# Audit single skill (auto-detects core or library location)
npm run audit -- frontend-patterns

# Audit all skills
npm run audit

# Audit specific phase
npm run audit -- frontend-patterns --phase 1
```

### Fix Commands

```bash
# Preview fixes (dry-run)
npm run -w @chariot/fixing-skills fix -- frontend-patterns --dry-run

# Apply deterministic fixes only
npm run -w @chariot/fixing-skills fix -- frontend-patterns

# Claude-mediated mode (outputs JSON)
npm run -w @chariot/fixing-skills fix -- frontend-patterns --suggest

# Apply specific semantic fix
npm run -w @chariot/fixing-skills fix -- frontend-patterns --apply phase1-description --value "new description"
```

### Search Commands

```bash
# Search all locations (core + library)
npm run search -- "react"

# Limit results
npm run search -- "testing" --limit 5

# Filter by location
npm run search -- "backend" --location core
npm run search -- "backend" --location library
```

### Update Commands

```bash
# Standard update
npm run update -- frontend-patterns "Add React 19 hooks patterns"

# With suggest mode (outputs JSON for Claude)
npm run update -- frontend-patterns --suggest

# Refresh context7 documentation for library skills
npm run update -- tanstack-query-skill --refresh-context7 --context7-data /tmp/new-docs.json
```

---

## CLI Ownership

Scripts live in the library skill that owns the functionality:

| Package                    | Location                                                        | Commands          |
| -------------------------- | --------------------------------------------------------------- | ----------------- |
| `@chariot/auditing-skills` | `skill-library/claude/skill-management/auditing-skills/scripts` | `audit`, `search` |
| `@chariot/fixing-skills`   | `skill-library/claude/skill-management/fixing-skills/scripts`   | `fix`             |
| `@chariot/updating-skills` | `skill-library/claude/skill-management/updating-skills/scripts` | `update`          |

**Shared library** (audit-engine, phases, utilities):

- Located in `auditing-skills/scripts/src/lib/`
- Used by fixing-skills and updating-skills via relative imports

---

## Troubleshooting

### "Command not found"

**Problem:** npm can't find the workspace package

**Solution:** Run `npm install` in `.claude/` directory first:

```bash
cd "$ROOT/.claude"
npm install
```

### "Skill not found"

**Problem:** CLI can't locate the skill

**Solution:** Skill name should match directory name (without `.md`). CLI auto-detects location (core or library).

```bash
# ✅ Correct
npm run audit -- managing-skills

# ❌ Wrong
npm run audit -- managing-skills.md
```

### "No such file or directory"

**Problem:** Not in `.claude/` directory

**Solution:** Always navigate to `.claude/` first using the ROOT pattern:

```bash
ROOT=`git rev-parse --show-superproject-working-tree 2>/dev/null`
test -z "$ROOT" && ROOT=`git rev-parse --show-toplevel`
cd "$ROOT/.claude"
```
