---
name: skill-manager
description: Use when creating, updating, auditing, fixing, renaming, migrating, searching, or listing skills - unified lifecycle management with TDD enforcement, 13-phase compliance validation, and progressive disclosure. Searches both core (.claude/skills) and library (.claude/skill-library) locations.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, Task, Skill, AskUserQuestion
---

# Skill Lifecycle Manager

**Complete skill lifecycle with TDD enforcement, 13-phase compliance validation, and dual-location search.**

## Quick Reference

| Operation     | Command                                                                                             | Time      | Purpose                            |
| ------------- | --------------------------------------------------------------------------------------------------- | --------- | ---------------------------------- |
| Create        | `npm run create -- <name> "<desc>" --location <loc> [--skill-type <type>] [--context7-data <path>]` | 15-30 min | TDD-driven skill creation          |
| Update        | `npm run update -- <name> "<changes>" [--refresh-context7 --context7-data <path>]`                  | 10-20 min | Minimal updates with TDD           |
| Audit         | `npm run audit -- [name]`                                                                           | 2-5 min   | 13-phase compliance check          |
| Fix           | `npm run fix -- <name> [--dry-run\|--suggest]`                                                      | 5-15 min  | Auto-remediation (3 modes)         |
| Rename        | `npm run rename -- <old> <new>`                                                                     | 5-10 min  | Safe renaming with updates         |
| Migrate       | `npm run migrate -- <name> <target>`                                                                | 5-10 min  | Move core ↔ library                |
| Search        | `npm run search -- "<query>"`                                                                       | 1-2 min   | Keyword discovery (both locations) |
| List          | `npm run list`                                                                                      | 1 min     | List all skills (both locations)   |
| Sync Gateways | `npm run sync-gateways -- [--dry-run\|--fix]`                                                       | 1-2 min   | Validate gateway consistency       |

## For Claude Code (Programmatic Invocation)

**IMPORTANT: Do NOT use the bash REPO_ROOT pattern below. Use the simple TypeScript invocation.**

```bash
# ✅ CORRECT: Simple invocation from anywhere in the repo
npx tsx .claude/skills/skill-manager/scripts/src/create.ts <args>

# ✅ CORRECT: Navigate once, then use npm run
cd "$REPO_ROOT/.claude/skills/skill-manager/scripts" && npm run create -- <args>

# ❌ WRONG: Unnecessary REPO_ROOT pattern (only for human CLI setup)
# REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
# REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
# cd "$REPO_ROOT/.claude/skills/skill-manager/scripts"
```

**Why:**

- `findProjectRoot()` handles path detection internally (checks `CLAUDE_PROJECT_DIR` env var, git, filesystem)
- Verbose bash patterns duplicate work that TypeScript already does
- Simple pattern works from anywhere in the repo

## Prerequisites (Human CLI Setup - One-Time Only)

**Initial workspace setup for human developers:**

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT/.claude/skills/skill-manager/scripts"
npm install
```

**After setup:** Use `npm run <command>` from the scripts directory.

## TDD Workflow (MANDATORY)

### 🔴 RED Phase (Prove Gap Exists)

1. Document why skill is needed or what gap exists
2. Test scenario without skill → **MUST FAIL**
3. Capture exact failure behavior (verbatim)

### 🟢 GREEN Phase (Minimal Implementation)

4. Create/update skill to address specific gap
5. Re-test scenario → **MUST PASS**
6. Verify no regression in existing behavior

### 🔵 REFACTOR Phase (Close Loopholes)

7. Run pressure tests (time, authority, sunk cost)
8. Document rationalizations (how agents bypass rules)
9. Add explicit counters ("Not even when...")
10. Re-test until bulletproof

**Cannot proceed without failing test first.**

## Operations

### Create (TDD-First Skill Creation)

**Three modes: suggest (Claude-mediated), direct (with all inputs), or context7-enhanced (with library documentation).**

```bash
# Claude-mediated mode (outputs JSON for location/description prompts)
npm run create -- my-skill --suggest

# Direct mode with all inputs
npm run create -- my-skill "Use when developing features" --location core
npm run create -- my-skill "Use when testing APIs" --location library:testing

# With skill type (process, library, integration, tool-wrapper)
npm run create -- my-skill "Use when working with TanStack Query" --location library:frontend --skill-type library

# With context7 documentation data
npm run create -- tanstack-query-skill "Use when implementing data fetching" --location library:frontend --skill-type library --context7-data /tmp/tanstack-query-docs.json
```

**Location options:**

- `core` - `.claude/skills/` - High-frequency, always-loaded (~25 skills)
- `library:<category>` - `.claude/skill-library/<category>/` - Specialized, on-demand (~120 skills)

**Skill type options:**

- `process` - Methodology, workflow, or best practice (TDD, debugging, brainstorming)
- `library` - Documentation for npm package, API, or framework (TanStack Query, Zustand)
- `integration` - Connecting two or more tools/services together
- `tool-wrapper` - Wraps CLI tool or MCP server

**Workflow:**

1. **RED Phase** - Document gap (why is this skill needed?)
2. **Generate Skill** - Create from template with modern structure
3. **GREEN Phase** - Test skill teaches expected behavior
4. **Progressive Disclosure** - Organize into SKILL.md + references/
5. **Audit** - Automatic 13-phase compliance check
6. **REFACTOR** - Pressure test and close loopholes

**See:** [references/create-workflow.md](references/create-workflow.md)

### Creating Library/Framework Skills with Context7

For library/framework skills, you can use context7 to auto-populate documentation:

**Step 1: Query context7 for the library**

```bash
# Use context7 MCP tools to fetch documentation
# 1. Resolve library ID
# 2. Get library docs
# 3. Save to JSON file
```

**Step 2: Create skill with context7 data**

```bash
npm run create -- tanstack-query "Use when implementing data fetching with TanStack Query" \
  --location library:frontend \
  --skill-type library \
  --context7-data /tmp/tanstack-query-docs.json
```

**What gets generated:**

- `SKILL.md` - Main skill with API quick reference table
- `references/api-reference.md` - Full API documentation
- `references/patterns.md` - Common usage patterns
- `examples/basic-usage.md` - Code examples organized by complexity
- `.local/context7-source.json` - Metadata for future updates

**Sample context7 JSON structure:**

```json
{
  "libraryName": "tanstack-query",
  "libraryId": "/npm/@tanstack/react-query",
  "fetchedAt": "2024-01-15T10:30:00.000Z",
  "version": "5.0.0",
  "content": "... raw documentation text ..."
}
```

### Update (Test-Guarded Changes)

**Ensures no regressions via TDD. Supports context7 refresh for library skills.**

```bash
# Standard update
npm run update -- frontend-patterns "Add React 19 hooks patterns"

# With suggest mode (outputs JSON for Claude)
npm run update -- frontend-patterns --suggest

# Refresh context7 documentation for library skills
npm run update -- tanstack-query-skill --refresh-context7 --context7-data /tmp/new-docs.json
```

**Context7 Refresh Workflow:**

1. When updating a context7-enabled skill, use `--suggest` to see if updates are available
2. Re-query context7 for updated documentation
3. Run with `--refresh-context7 --context7-data /path/to/new-data.json`
4. Review the diff summary showing new APIs, deprecated APIs, changed signatures
5. Updated files: references/api-reference.md, references/patterns.md, examples/basic-usage.md

**Standard Workflow:**

1. **Identify Gap** - What instruction is missing?
2. **RED Phase** - Document current failure behavior
3. **Update Skill** - Apply minimal change
4. **GREEN Phase** - Verify gap closes
5. **Audit** - Re-validate compliance
6. **REFACTOR** - Test under pressure

**See:** [references/update-workflow.md](references/update-workflow.md)

### Audit (13-Phase Compliance)

**Validates skill against 13 compliance phases.**

```bash
# Audit single skill (auto-detects location)
npm run audit -- frontend-patterns

# Audit all skills (both core and library)
npm run audit

# Audit specific phase
npm run audit -- frontend-patterns --phase 1
```

**13 Phases:**

1. Description Format
2. Allowed-Tools Field
3. Word Count
4. Broken Links
5. File Organization
6. Script Organization
7. Output Directory Pattern
8. TypeScript Project Structure (tsc compilation, vitest types, 100% test pass)
9. Non-TypeScript Script Migration
10. Reference Audit
11. Command Example Audit
12. CLI Error Handling
13. State Externalization

**Output:** Pre-formatted markdown report (display verbatim)

**See:** [references/audit-phases.md](references/audit-phases.md)

### Fix (Compliance Remediation)

**Three modes: default (auto-apply deterministic), suggest (JSON for Claude), apply (targeted fix).**

```bash
# Preview fixes (dry-run)
npm run fix -- frontend-patterns --dry-run

# Apply deterministic fixes only
npm run fix -- frontend-patterns

# Claude-mediated mode (outputs JSON for semantic decisions)
npm run fix -- frontend-patterns --suggest

# Apply specific semantic fix
npm run fix -- frontend-patterns --apply phase1-description --value "new description"
npm run fix -- frontend-patterns --apply phase13-todowrite
```

**Fix Categories:**

- **Deterministic (auto-apply):** Phases 2,4,5,6,7,10,12
- **Semantic (Claude-mediated):** Phases 1,3,9,11,13 - use `--suggest` mode
- **Specialized CLI:** Phases 8,11 (guidance provided)

**Semantic Fix IDs:**
| ID | Phase | Description |
|----|-------|-------------|
| `phase1-description` | 1 | Update skill description (requires `--value`) |
| `phase3-wordcount` | 3 | Acknowledge word count issue |
| `phase9-scripts` | 9 | Acknowledge non-TypeScript scripts |
| `phase11-command` | 11 | Fix cd command portability |
| `phase13-todowrite` | 13 | Add TodoWrite mandate |

**See:** [references/fix-workflow.md](references/fix-workflow.md)

### Rename (Safe Skill Renaming)

**Renames skill and updates all references.**

```bash
npm run rename -- old-skill-name new-skill-name
```

**7-Step Protocol:**

1. Validate old name exists
2. Validate new name available
3. Update frontmatter `name` field
4. Rename skill directory
5. Update `/skill-manager` command references
6. Update skill references in other skills
7. Update deprecation registry

**See:** [references/rename-protocol.md](references/rename-protocol.md)

### Migrate (Move Between Locations)

**Safely moves skills between core and library.**

```bash
# Move core skill to library
npm run migrate -- my-skill to-library:development/frontend

# Move library skill to core
npm run migrate -- my-skill to-core

# Move within library
npm run migrate -- my-skill to-library:testing
```

**Migration targets:**

- `to-core` - Move to `.claude/skills/`
- `to-library:<category>` - Move to `.claude/skill-library/<category>/`
- `to-library:<domain>/<category>` - Move to `.claude/skill-library/<domain>/<category>/`

**See:** [references/migrate-workflow.md](references/migrate-workflow.md)

### Search (Enhanced Dual-Location Discovery)

**Find skills by keyword in BOTH core and library.**

```bash
# Search all locations
npm run search -- "react"

# Limit results
npm run search -- "testing" --limit 5

# Filter by location
npm run search -- "backend" --location core
npm run search -- "backend" --location library
```

**Search locations:**

- `.claude/skills/` (~18 core skills) - marked with [CORE]
- `.claude/skill-library/` (~129 library skills) - marked with [LIB]

**Scoring algorithm:**

- Name exact match: 100 points
- Name substring: 50 points
- Description match: 30 points
- Allowed-tools match: 10 points

**Output:** Scored results with location indicators

**See:** [references/search-workflow.md](references/search-workflow.md)

### List (Show All Skills - Both Locations)

**Display all skills with compliance status.**

```bash
# List all skills (core + library)
npm run list

# Filter by location
npm run list -- --location core
npm run list -- --location library
```

**Output:** Table with skill name, location, and path

| Skill Name        | Location | Path                   |
| ----------------- | -------- | ---------------------- |
| frontend-patterns | CORE     | ./.claude/skills/...   |
| mcp-manager       | CORE     | ./.claude/skills/...   |
| tanstack-query    | LIBRARY  | ./.claude/skill-lib... |

**See:** [references/list-workflow.md](references/list-workflow.md)

### Sync Gateways (Validate Gateway Consistency)

**Validates that gateway skills are synchronized with library skills.**

```bash
# Check for discrepancies (report only)
npm run sync-gateways

# Preview fixes without applying
npm run sync-gateways -- --dry-run

# Apply fixes automatically
npm run sync-gateways -- --fix
```

**What it checks:**

1. **Broken entries** - Gateway references skills that don't exist (removes them)
2. **Missing entries** - Library skills not in any gateway (adds them)

**Gateway mapping:**

| Category                   | Gateway                  |
| -------------------------- | ------------------------ |
| `development/frontend/*`   | `gateway-frontend`       |
| `development/backend/*`    | `gateway-backend`        |
| `testing/*`                | `gateway-testing`        |
| `security/*`               | `gateway-security`       |
| `claude/mcp-tools/*`       | `gateway-mcp-tools`      |
| `development/integrations/*` | `gateway-integrations` |

**Automatic updates:**

- **On create**: Library skills automatically added to appropriate gateway
- **On migrate**: Gateway paths updated or skill moved between gateways
- **On sync**: Validates all gateways and repairs discrepancies

**Output:** Report of broken/missing entries with optional auto-fix

**See:** [references/sync-gateways-workflow.md](references/sync-gateways-workflow.md)

## Progressive Disclosure

**Quick Start (15 min):**

- Create with TDD (RED-GREEN-REFACTOR)
- Audit for compliance
- Fix deterministic issues

**Comprehensive (60 min):**

- Full TDD cycle with pressure testing
- Progressive disclosure organization
- Compliance validation (all 13 phases)
- Reference updates and migration

**Deep Dives (references/):**

- [TDD methodology](references/tdd-methodology.md)
- [Progressive disclosure](references/progressive-disclosure.md)
- [13 audit phases](references/audit-phases.md)
- [Rename protocol](references/rename-protocol.md)
- [Migration workflow](references/migrate-workflow.md)

## Migration from Old Skills

This skill consolidates:

- `claude-skill-write` → use `npm run create` or `npm run update`
- `claude-skill-compliance` → use `npm run audit` or `npm run fix`
- `claude-skill-search` → use `npm run search` (NOW includes library)

**Command integration:** `/skill-manager` command updated to delegate to this skill

## Key Principles

1. **TDD Always** - Cannot create/update without failing test first
2. **13-Phase Compliance** - All skills validated before deployment
3. **Progressive Disclosure** - Lean SKILL.md + detailed references/
4. **Router Pattern** - `/skill-manager` command delegates here
5. **Behavioral Parity** - All old functionality preserved
6. **Dual-Location Search** - Searches both core and library
7. **TodoWrite Tracking** - You MUST use TodoWrite before starting to track all workflow steps
8. **Context7 Integration** - Library skills can auto-populate from official documentation

## Related Skills

- **testing-skills-with-subagents** - For meta-testing skills with pressure scenarios
- **using-skills** - Navigator/librarian for skill discovery
- **developing-with-tdd** - TDD methodology and best practices
- **debugging-systematically** - When skills fail in production
- **verifying-before-completion** - Final validation checklist

## Changelog

Changelogs are now stored in `.history/CHANGELOG` to enable version control (previous location `.local/changelog` was gitignored).

For historical changes, see `.history/CHANGELOG` in each skill directory.
