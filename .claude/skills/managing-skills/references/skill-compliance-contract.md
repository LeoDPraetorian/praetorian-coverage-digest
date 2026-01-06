# Skill Compliance Contract

**This document defines ALL requirements for a valid skill.**

All skill management operations reference this contract:

| Operation         | Relationship            |
| ----------------- | ----------------------- |
| `auditing-skills` | CHECKS this contract    |
| `creating-skills` | FOLLOWS this contract   |
| `updating-skills` | MAINTAINS this contract |
| `fixing-skills`   | RESTORES this contract  |

---

## 1. Frontmatter Requirements

Every skill must have valid YAML frontmatter:

```yaml
---
name: { skill-name }
description: { description }
allowed-tools: { tools }
---
```

### Field Requirements

| Field           | Required | Format                  | Validation                  |
| --------------- | -------- | ----------------------- | --------------------------- |
| `name`          | ✅       | kebab-case, gerund form | Must match directory name   |
| `description`   | ✅       | "Use when..."           | See description rules below |
| `allowed-tools` | ✅       | Comma-separated         | Valid tool names only       |

**For complete naming conventions**, see [Anthropic Best Practices](anthropic-best-practices.md#naming-conventions).

### Description Rules

1. **MUST** start with "Use when"
2. **MUST** be single-line (no block scalars `|` or `>`)
3. **MUST** be <120 characters (warning), <1024 (hard limit)
4. **SHOULD** use third-person voice
5. **SHOULD** include key trigger terms for discovery

**Examples:**

```yaml
# ✅ CORRECT
description: Use when creating skills - guides through TDD workflow with validation

# ❌ WRONG: Block scalar
description: |
  Use when creating skills

# ❌ WRONG: First person
description: I help you create skills

# ❌ WRONG: Missing "Use when"
description: Guides through TDD workflow
```

---

## 2. Directory Structure

### Required Structure

```
{skill-path}/
├── SKILL.md              ← Required, <500 lines
├── references/           ← Required for progressive disclosure
│   └── (reference files)
├── .history/
│   └── CHANGELOG         ← Required (version controlled)
└── .local/               ← Backups (gitignored)
```

### Optional Structure

```
{skill-path}/
├── examples/             ← Optional code examples
├── templates/            ← Optional file templates
└── scripts/              ← Optional (TypeScript only)
    ├── src/
    ├── package.json
    └── tsconfig.json
```

### Directory Rules

- `SKILL.md` is the entry point - always required
- `references/` holds detailed content (progressive disclosure)
- `.history/CHANGELOG` tracks all changes (version controlled)
- `.local/` holds backups (gitignored, local only)
- `scripts/` must be TypeScript, not bash

---

## 3. Line Count Limits

See [Line Count Limits](patterns/line-count-limits.md) for complete details.

### Quick Reference

| Lines   | Status       | Action                                |
| ------- | ------------ | ------------------------------------- |
| < 350   | ✅ Safe zone | No action needed                      |
| 350-450 | ⚠️ Caution   | Consider extraction for next update   |
| 450-500 | ⚠️ Warning   | Plan extraction before adding content |
| > 500   | ❌ FAIL      | MUST extract to references/           |

### Validation

```bash
LINE_COUNT=$(wc -l < {skill-path}/SKILL.md | tr -d ' ')
if [ "$LINE_COUNT" -gt 500 ]; then
  echo "❌ FAIL: >500 lines"
  exit 1
fi
```

---

## 4. Content Requirements

### TDD Phases

All skill modifications follow RED-GREEN-REFACTOR:

1. **RED** - Document the gap/failure that prompted the change
2. **GREEN** - Verify the fix works
3. **REFACTOR** - Pressure test for resistance to rationalization

See [REFACTOR Rules](patterns/refactor-rules.md) for when REFACTOR is mandatory.

### State Tracking

**Multi-step skills MUST mandate TodoWrite:**

```markdown
> **You MUST use TodoWrite** to track progress for all operations.
```

**Why:** Mental tracking = steps get skipped. Every time.

### Progressive Disclosure

- Core workflow in SKILL.md (<500 lines)
- Detailed content in references/
- Links with clear descriptions

See [Progressive Disclosure](progressive-disclosure.md) for patterns.

---

## 5. Backup Strategy

See [Backup Strategy](patterns/backup-strategy.md) for complete details.

**Required before ANY edit:**

```bash
mkdir -p {skill-path}/.local
TIMESTAMP=$(date +%Y-%m-%d-%H-%M-%S)
cp {skill-path}/SKILL.md {skill-path}/.local/${TIMESTAMP}-{operation}.bak
```

**Checkpoint:** Cannot proceed to edits without backup ✅

---

## 6. Changelog Format

See [Changelog Format](patterns/changelog-format.md) for complete details.

**Location:** `{skill-path}/.history/CHANGELOG`

**Required for:** create, update, and fix operations

### Entry Types

| Operation | Primary Section | Required Fields                    |
| --------- | --------------- | ---------------------------------- |
| Create    | `### Created`   | RED failure, category, type        |
| Update    | `### Changed`   | What changed, reason (RED failure) |
| Fix       | `### Fixed`     | Phase, fix description, method     |

---

## 7. Compliance Validation

Skill compliance is validated against requirement categories. For validation details, see [auditing-skills](.claude/skill-library/claude/skill-management/auditing-skills/SKILL.md).

### Requirement Categories

**Frontmatter Requirements:**

- Description: Must start with "Use when...", <120 chars, third-person
- Allowed-tools: Must declare appropriate tools for skill type

**Structural Requirements:**

- Line count: SKILL.md must be <500 lines
- File organization: Must have references/ for progressive disclosure
- Script organization: Scripts must be in scripts/ subdirectory

**Quality Requirements:**

- Links: All markdown links must resolve
- References: No phantom skill/agent references
- Formatting: Tables Prettier-formatted, code blocks have language tags

**Gateway Requirements (gateway-\* skills only):**

- Structure: Must explain two-tier system
- Routing: Must use full paths, paths must exist

For fix categories and patterns, see [phase-categorization.md](patterns/phase-categorization.md).

---

## 8. Compliance Checklist

Use this checklist to validate skill compliance:

### Frontmatter ✅

- [ ] `name` field present and kebab-case
- [ ] `description` starts with "Use when"
- [ ] `description` is single-line (<120 chars)
- [ ] `allowed-tools` field present and valid

### Structure ✅

- [ ] SKILL.md exists at root
- [ ] SKILL.md is <500 lines
- [ ] references/ directory exists
- [ ] .history/CHANGELOG exists

### Content ✅

- [ ] TDD phases documented (RED/GREEN/REFACTOR)
- [ ] TodoWrite mandate for multi-step workflows
- [ ] Progressive disclosure pattern followed
- [ ] Links to references resolve

### Operations ✅

- [ ] Backup created before edits
- [ ] Changelog updated after changes
- [ ] Audit passed after modifications

---

## 9. Quick Commands

### Validate Single Skill

Audit the skill by invoking auditing-skills to verify compliance with all phase requirements.

### Fix Issues

Fix compliance issues by invoking fixing-skills following procedures in phase-categorization.md.

### Check Line Count

```bash
wc -l {skill-path}/SKILL.md
```

---

## Related

- [Line Count Limits](patterns/line-count-limits.md) - Extraction thresholds
- [Backup Strategy](patterns/backup-strategy.md) - Backup procedures
- [Changelog Format](patterns/changelog-format.md) - Entry formats
- [REFACTOR Rules](patterns/refactor-rules.md) - Pressure testing requirements
- [Repo Root Detection](patterns/repo-root-detection.md) - Path resolution for super-repo/submodule contexts
- [Progressive Disclosure](progressive-disclosure.md) - Content organization
- [Phase Categorization](patterns/phase-categorization.md) - Fix categories and validation patterns
- [auditing-skills](.claude/skill-library/claude/skill-management/auditing-skills/SKILL.md) - Compliance validation details
