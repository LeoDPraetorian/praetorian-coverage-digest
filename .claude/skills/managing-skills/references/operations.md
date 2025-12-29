# Operations Reference

**Detailed workflows for all skill management operations.**

This document contains comprehensive guides for each operation delegated by the managing-skills router. For a quick reference table, see SKILL.md.

---

## Create (Delegated to creating-skills)

**Use the creating-skills library skill:**

```
Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md")
```

Guides through validation, location, category, type, generation, and research. After creation, run audit:

```bash
npm run audit -- my-new-skill
```

---

## Update (Test-Guarded Changes)

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

**See:** [update-workflow.md](update-workflow.md)

---

## Delete (Safe Skill Deletion)

**Instruction-based operation. Delegates to `deleting-skills`.**

Safely removes skills with comprehensive reference cleanup using Claude's native tools.

**7-Phase Protocol:**

1. **Validate** - Verify skill exists (core or library)
2. **Discover** - Find all references (gateways, commands, other skills)
3. **Analyze** - Show impact to user
4. **Confirm** - Get explicit user approval before deletion
5. **Remove** - Delete skill directory (with path safety check)
6. **Cleanup** - Remove all references systematically
7. **Verify** - Ensure no orphaned references remain

**Safety features:**

- Mandatory user confirmation before deletion
- Path safety check (must contain `.claude/skill`)
- Comprehensive reference discovery (gateways, commands, skills)
- Verification phase ensures no orphans

**See:** `.claude/skill-library/claude/skill-management/deleting-skills/SKILL.md`

---

## Audit (22-Phase Structural + Semantic Review)

**Validates skill against 22 structural phases, then Claude performs semantic review.**

```bash
# Audit single skill (auto-detects location)
npm run audit -- frontend-patterns

# Audit all skills (both core and library)
npm run audit

# Audit specific phase
npm run audit -- frontend-patterns --phase 1
```

**21 Structural Phases:**

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
14. Visual/Style (14a: Table Formatting, 14b: Code Block Quality, 14c: Header Hierarchy)
15. Orphan Detection
16. Windows Path Detection
17. Gateway Structure (gateway skills only)
18. Routing Table Format (gateway skills only)
19. Path Resolution (gateway skills only)
20. Coverage Check (gateway skills only)
21. Line Number References

**Post-Audit Semantic Review (Claude performs after structural audit):**

After structural audit output, Claude MUST perform semantic review:

1. **Description Quality (CSO)** - Does description include key trigger terms? Specific enough for discovery?
2. **Skill Categorization** - Is this frontend/backend/testing/security/tooling?
3. **Gateway Membership** - Should this be in gateway-frontend? gateway-testing? Is it missing from appropriate gateway?
4. **Tool Appropriateness** - Are allowed-tools appropriate for skill's actual purpose?
5. **Content Density** - If >500 lines warning, is length justified?

**Example semantic issue:** `eslint-smart` skill lints TypeScript/React but isn't listed in `gateway-frontend`. Agents using frontend gateway would never discover it.

**Output:** Pre-formatted markdown report (display verbatim), then semantic review findings

**See:** [audit-phases.md](audit-phases.md) (includes semantic review checklist)

---

## Fix (Compliance Remediation)

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

**See:** [fix-workflow.md](fix-workflow.md)

---

## Rename (Safe Skill Renaming)

**Instruction-based operation. Delegates to `renaming-skills`.**

Renames skill and updates all references using Claude's native tools.

**7-Step Protocol:**

1. Validate old name exists
2. Validate new name available
3. Update frontmatter `name` field
4. Rename skill directory
5. Update `/skill-manager` command references
6. Update skill references in other skills
7. Update deprecation registry

**See:** [rename-protocol.md](rename-protocol.md)

---

## Migrate (Move Between Locations)

**Instruction-based operation. Delegates to `migrating-skills`.**

Safely moves skills between core and library using Claude's native tools.

**Migration targets:**

- `to-core` - Move to `.claude/skills/`
- `to-library:<category>` - Move to `.claude/skill-library/<category>/`
- `to-library:<domain>/<category>` - Move to `.claude/skill-library/<domain>/<category>/`

**See:** [migrate-workflow.md](migrate-workflow.md)

---

## Search (Enhanced Dual-Location Discovery)

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

**See:** [search-workflow.md](search-workflow.md)

---

## List (Show All Skills - Both Locations)

**Instruction-based operation. Delegates to `listing-skills`.**

Display all skills using Claude's native tools (Glob, Read).

**Output:** Table with skill name, location, and path

| Skill Name        | Location | Path                   |
| ----------------- | -------- | ---------------------- |
| frontend-patterns | CORE     | ./.claude/skills/...   |
| mcp-manager       | CORE     | ./.claude/skills/...   |
| tanstack-query    | LIBRARY  | ./.claude/skill-lib... |

**See:** [list-workflow.md](list-workflow.md)

---

## Sync Gateways (Validate Gateway Consistency)

**Instruction-based operation. Not yet implemented as CLI.**

Validates that gateway skills are synchronized with library skills using Claude's native tools (Grep, Read, Edit).

**What it checks:**

1. **Broken entries** - Gateway references skills that don't exist (removes them)
2. **Missing entries** - Library skills not in any gateway (adds them)

**Gateway mapping:**

| Category                     | Gateway                |
| ---------------------------- | ---------------------- |
| `development/frontend/*`     | `gateway-frontend`     |
| `development/backend/*`      | `gateway-backend`      |
| `testing/*`                  | `gateway-testing`      |
| `security/*`                 | `gateway-security`     |
| `claude/mcp-tools/*`         | `gateway-mcp-tools`    |
| `development/integrations/*` | `gateway-integrations` |
| `capabilities/*`             | `gateway-capabilities` |
| `claude/*` (non-mcp)         | `gateway-claude`       |

**Manual workflow:**

1. List all library skills with `listing-skills`
2. Check each gateway skill for broken references
3. Add missing skills to appropriate gateways
4. Remove broken references

**See:** [sync-gateways-workflow.md](sync-gateways-workflow.md)
