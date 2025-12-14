---
name: skill-manager
description: Use when creating, updating, auditing, fixing, renaming, migrating, searching, or listing skills - unified lifecycle management with TDD enforcement, 16-phase compliance validation, and progressive disclosure. Searches both core (.claude/skills) and library (.claude/skill-library) locations.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, Task, Skill, AskUserQuestion
---

# Skill Lifecycle Manager

**Complete skill lifecycle with TDD enforcement, 16-phase structural audit + semantic review, and dual-location search.**

## Quick Reference

| Operation     | Method                                                                                              | Time      | Purpose                            |
| ------------- | --------------------------------------------------------------------------------------------------- | --------- | ---------------------------------- |
| **Create**    | Use `creating-skills` skill                                                                         | 15-30 min | Instruction-driven skill creation  |
| Update        | `npm run update -- <name> "<changes>"` + progressive disclosure if >500 lines                       | 10-20 min | Minimal updates with TDD           |
| Audit         | `npm run audit -- [name]`                                                                           | 2-5 min   | 16-phase + semantic review         |
| Fix           | `npm run fix -- <name> [--dry-run\|--suggest]`                                                      | 5-15 min  | Auto-remediation (3 modes)         |
| Rename        | `npm run rename -- <old> <new>`                                                                     | 5-10 min  | Safe renaming with updates         |
| Migrate       | `npm run migrate -- <name> <target>`                                                                | 5-10 min  | Move core ↔ library                |
| Search        | `npm run search -- "<query>"`                                                                       | 1-2 min   | Keyword discovery (both locations) |
| List          | `npm run list`                                                                                      | 1 min     | List all skills (both locations)   |
| Sync Gateways | `npm run sync-gateways -- [--dry-run\|--fix]`                                                       | 1-2 min   | Validate gateway consistency       |

## Router Architecture

**skill-manager is a pure router skill.** It delegates to specialized library skills:

| Operation | Delegated To | Implementation Location |
|-----------|--------------|------------------------|
| Create | `creating-skills` | Instruction-based (no CLI) |
| Update | `updating-skills` | `updating-skills/scripts/src/update.ts` |
| Audit | `auditing-skills` | `auditing-skills/scripts/src/audit.ts` |
| Fix | `fixing-skills` | `fixing-skills/scripts/src/fix.ts` |
| Search | `auditing-skills` | `auditing-skills/scripts/src/search.ts` |
| Rename | `renaming-skills` | Instruction-based |
| Migrate | `migrating-skills` | Instruction-based |
| List | `listing-skills` | Instruction-based |

**CLI scripts are located in:** `.claude/skill-library/claude/skill-management/`

**Shared library** (audit-engine, phases, utilities):
- Located in `auditing-skills/scripts/src/lib/`
- Used by fixing-skills and updating-skills via relative imports

**Users should NEVER invoke CLI scripts directly.** Always use this routing skill.

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

### Create (Delegated to creating-skills)

**Skill creation is now instruction-driven via the `creating-skills` skill.**

```
skill: "creating-skills"
```

The `creating-skills` skill guides you through:
1. **Validation** - Name format, check existence
2. **Location** - Core vs Library selection
3. **Category** - Which library folder (if library)
4. **Skill Type** - Process/Library/Integration/Tool-wrapper
5. **Generation** - Create directory and SKILL.md from templates
6. **Research** - Populate content via `researching-skills` skill

**Why instruction-driven?**
- Claude uses native tools (AskUserQuestion, Write, Grep)
- No TypeScript state machine complexity
- Templates as readable markdown code blocks
- Same outcome, simpler implementation

**After creation, run audit:**
```bash
npm run audit -- my-new-skill
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
6. **Progressive Disclosure** - ⚠️ MANDATORY if SKILL.md >500 lines (split into references/)
7. **REFACTOR** - Test under pressure

**🚨 CRITICAL:** If audit shows word count warning (>500 lines), you MUST restructure with progressive disclosure before continuing. See Step 7 in update-workflow.md.

**See:** [references/update-workflow.md](references/update-workflow.md)

### Audit (16-Phase Structural + Semantic Review)

**Validates skill against 16 structural phases, then Claude performs semantic review.**

```bash
# Audit single skill (auto-detects location)
npm run audit -- frontend-patterns

# Audit all skills (both core and library)
npm run audit

# Audit specific phase
npm run audit -- frontend-patterns --phase 1
```

**16 Structural Phases:**

1. Description Format (first/second person, "Use when" trigger)
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
14-15. Reserved
16. Windows Path Detection

**Post-Audit Semantic Review (Claude performs after structural audit):**

After structural audit output, Claude MUST perform semantic review:

1. **Description Quality (CSO)** - Does description include key trigger terms? Specific enough for discovery?
2. **Skill Categorization** - Is this frontend/backend/testing/security/tooling?
3. **Gateway Membership** - Should this be in gateway-frontend? gateway-testing? Is it missing from appropriate gateway?
4. **Tool Appropriateness** - Are allowed-tools appropriate for skill's actual purpose?
5. **Content Density** - If >500 lines warning, is length justified?

**Example semantic issue:** `eslint-smart` skill lints TypeScript/React but isn't listed in `gateway-frontend`. Agents using frontend gateway would never discover it.

**Output:** Pre-formatted markdown report (display verbatim), then semantic review findings

**See:** [references/audit-phases.md](references/audit-phases.md) (includes semantic review checklist)

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
- Compliance validation (all 16 structural phases + semantic review)
- Reference updates and migration

**Deep Dives (references/):**

- [TDD methodology](references/tdd-methodology.md)
- [Progressive disclosure](references/progressive-disclosure.md)
- [Audit phases + semantic review](references/audit-phases.md)
- [Rename protocol](references/rename-protocol.md)
- [Migration workflow](references/migrate-workflow.md)

## Migration from Old Skills

This skill consolidates:

- `claude-skill-write` → use `creating-skills` skill or `npm run update`
- `claude-skill-compliance` → use `npm run audit` or `npm run fix`
- `claude-skill-search` → use `npm run search` (NOW includes library)

**Command integration:** `/skill-manager` command updated to delegate to this skill

## Key Principles

1. **TDD Always** - Cannot create/update without failing test first
2. **Hybrid Audit** - 16-phase structural audit + Claude semantic review
3. **Progressive Disclosure** - Lean SKILL.md + detailed references/
4. **Router Pattern** - `/skill-manager` command delegates here
5. **Instruction-Driven Creation** - Create via `creating-skills` skill (no TypeScript CLI)
6. **Dual-Location Search** - Searches both core and library
7. **TodoWrite Tracking** - You MUST use TodoWrite before starting to track all workflow steps
8. **Research Delegation** - Use `researching-skills` for content population

## Related Skills

- **creating-skills** - Instruction-driven skill creation workflow (location, type, templates)
- **researching-skills** - Interactive research orchestrator for skill creation (source selection, Context7, web research)
- **testing-skills-with-subagents** - For meta-testing skills with pressure scenarios
- **using-skills** - Navigator/librarian for skill discovery
- **developing-with-tdd** - TDD methodology and best practices
- **debugging-systematically** - When skills fail in production
- **verifying-before-completion** - Final validation checklist

## Changelog

Changelogs are now stored in `.history/CHANGELOG` to enable version control (previous location `.local/changelog` was gitignored).

For historical changes, see `.history/CHANGELOG` in each skill directory.
