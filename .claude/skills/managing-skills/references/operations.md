# Operations Reference

**Detailed workflows for all skill management operations.**

This document contains comprehensive guides for each operation delegated by the managing-skills router. For a quick reference table, see SKILL.md.

---

## Create (Delegated to creating-skills)

**Use the creating-skills library skill:**

```
Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md")
```

Guides through validation, location, category, type, generation, and research. After creation, audit the skill:

```markdown
Audit {skill-name} to verify compliance with all phase requirements.
```

Or invoke the auditing-skills library skill directly.

---

## Update (Test-Guarded Changes)

**Use the updating-skills library skill:**

```
Read(".claude/skill-library/claude/skill-management/updating-skills/SKILL.md")
```

Ensures no regressions via TDD. Follows an 8-step workflow with optional research integration.

**Context7 Refresh Workflow:**

1. When updating a context7-enabled skill, check `.local/context7-source.json` for staleness
2. If >30 days old, re-query context7 for updated documentation
3. Review the diff summary showing new APIs, deprecated APIs, changed signatures
4. Update files: references/api-reference.md, references/patterns.md, examples/basic-usage.md

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

## Audit (Compliance Validation)

**Validates skill against the [Skill Compliance Contract](skill-compliance-contract.md).**

**Use the auditing-skills library skill:**

```
Read(".claude/skill-library/claude/skill-management/auditing-skills/SKILL.md")
```

Validates skills against the Skill Compliance Contract. Follows instruction-based workflow with 28 compliance phases.

For phase details, see [auditing-skills](.claude/skill-library/claude/skill-management/auditing-skills/SKILL.md).

For fix categories (deterministic vs hybrid vs human-required), see [phase-details.md](.claude/skill-library/claude/skill-management/auditing-skills/references/phase-details.md).

---

## Fix (Compliance Remediation)

**Use the fixing-skills library skill:**

```
Read(".claude/skill-library/claude/skill-management/fixing-skills/SKILL.md")
```

Remediates compliance issues following procedures in phase-categorization.md. Uses instruction-based workflow with guidance from phase-details.md.

**Fix Categories:**

For current phase-to-category mapping, see `.claude/skill-library/claude/skill-management/auditing-skills/references/phase-details.md`

- **Deterministic:** Auto-applied following patterns (format fixes, directory creation)
- **Semantic:** Claude-mediated decisions for content changes
- **Human-Required:** Manual intervention needed

**Semantic Fix IDs:**
| ID | Phase | Description |
|----|-------|-------------|
| `phase1-description` | 1 | Update skill description (requires `--value`) |
| `phase3-wordcount` | 3 | Acknowledge word count issue |
| `phase9-scripts` | 9 | Acknowledge non-TypeScript scripts |
| `phase11-command` | 11 | Fix cd command portability |
| `phase13-todowrite` | 13 | Add TodoWrite mandate |

**See:** [fixing-skills](.claude/skill-library/claude/skill-management/fixing-skills/SKILL.md)

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

**Use the searching-skills library skill:**

```
Read(".claude/skill-library/claude/skill-management/searching-skills/SKILL.md")
```

Find skills by keyword in BOTH core and library using Grep and Glob patterns.

**Search locations:**

- `.claude/skills/` (~18 core skills) - marked with [CORE]
- `.claude/skill-library/` (~129 library skills) - marked with [LIB]

**Scoring algorithm:**

- Name exact match: 100 points
- Name substring: 50 points
- Description match: 30 points
- Allowed-tools match: 10 points

**Output:** Scored results with location indicators

**See:** [searching-skills](.claude/skill-library/claude/skill-management/searching-skills/SKILL.md)

---

## List (Show All Skills - Both Locations)

**Instruction-based operation. Delegates to `listing-skills`.**

Display all skills using Claude's native tools (Glob, Read).

**Output:** Table with skill name, location, and path

| Skill Name        | Location | Path                   |
| ----------------- | -------- | ---------------------- |
| frontend-patterns | CORE     | ./.claude/skills/...   |
| tool-manager       | CORE     | ./.claude/skills/...   |
| tanstack-query    | LIBRARY  | ./.claude/skill-lib... |

**See:** [listing-skills](.claude/skill-library/claude/skill-management/listing-skills/SKILL.md)

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
