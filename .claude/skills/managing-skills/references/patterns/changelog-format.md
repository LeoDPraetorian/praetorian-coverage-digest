# Changelog Format

**Single source of truth for skill changelog structure.**

**Phase Numbering Convention:**
Skills use sequential integer phase numbers (1, 2, 3, 4, 5...) for major phases. Fractional phase numbers like "Phase 3.5" are not used - when adding phases, renumber sequentially. Sub-steps within phases (e.g., "5.1", "5.2", "5.4") are acceptable for decomposition.

This pattern is referenced by:

- `creating-skills` - Creates initial changelog (Phase 5, sub-step 5.4)
- `updating-skills` - Appends update entries (Phase 5)
- `fixing-skills` - Documents fixes (Step 9)

---

## Location

**Path:** `{skill-path}/.history/CHANGELOG`

**Note:** `.history/` is version controlled (unlike `.local/` which is gitignored).

---

## Directory Setup

```bash
mkdir -p {skill-path}/.history
```

---

## Entry Format

### Base Structure

All entries follow this format:

```markdown
## [Date: YYYY-MM-DD] - {Operation Type}

### {Primary Section}

- {Description}

### {Secondary Section} (optional)

- {Details}
```

---

## Operation-Specific Sections

### For Creation (via `creating-skills`)

```markdown
## [Date: YYYY-MM-DD] - Initial Creation

### Created

- Skill created via creating-skills workflow
- RED failure documented: {brief description of gap that prompted creation}
- Category: {library-category or core}
- Type: {process/library/integration/tool-wrapper}

### Verification

- Audit: PASSED
- Pressure tests: PASSED
```

### For Update (via `updating-skills`)

```markdown
## [Date: YYYY-MM-DD] - Update

### Changed

- {Description of what changed}
- {List each significant modification}

### Reason

- {Why this change was needed (RED failure that prompted update)}
- {User scenario or bug that revealed the gap}

### Verification

- Audit: PASSED
- Tests: PASSED
```

### For Fix (via `fixing-skills`)

```markdown
## [Date: YYYY-MM-DD] - Auto-Fix

### Fixed

- Phase X: {Description of fix applied}
- Phase Y: {Description of fix applied}

### Method

- Auto-fix via fixing-skills
- Manual fix for: {list if any}

### Backup

- Pre-fix backup: .local/{timestamp}-pre-fix.bak

### Verification

- Audit: PASSED
```

---

## Common Sections Reference

| Section      | When to Use              | Example                                      |
| ------------ | ------------------------ | -------------------------------------------- |
| Created      | Initial skill creation   | "Skill created via creating-skills workflow" |
| Changed      | Content modifications    | "Updated Phase 3 validation logic"           |
| Fixed        | Bug fixes or audit fixes | "Phase 4: Fixed broken reference link"       |
| Reason       | Why change was made      | "RED failure: Agent skipped step 5"          |
| Method       | How fix was applied      | "Auto-fix via fixing-skills CLI"             |
| Backup       | Reference to backup file | ".local/2024-01-15-pre-fix.bak"              |
| Verification | Audit/test results       | "Audit: PASSED, Tests: PASSED"               |

---

## Full Example Changelog

```markdown
# CHANGELOG

## [Date: 2024-01-20] - Auto-Fix

### Fixed

- Phase 4: Fixed broken reference to workflow.md
- Phase 10: Removed phantom reference to deleted-skill

### Method

- Auto-fix via fixing-skills

### Backup

- Pre-fix backup: .local/2024-01-20-10-30-00-pre-fix.bak

### Verification

- Audit: PASSED

---

## [Date: 2024-01-15] - Update

### Changed

- Added new Phase 4 for extraction workflow
- Updated line count thresholds from 600 to 500

### Reason

- RED failure: User reported agent ignored extraction when SKILL.md was 550 lines
- Stricter threshold needed to prevent attention degradation

### Verification

- Audit: PASSED
- Tests: PASSED

---

## [Date: 2024-01-01] - Initial Creation

### Created

- Skill created via creating-skills workflow
- RED failure documented: No guidance for updating existing skills
- Category: claude/skill-management
- Type: process

### Verification

- Audit: PASSED
- Pressure tests: PASSED
```

---

## Reading Existing Changelog

```bash
cat {skill-path}/.history/CHANGELOG 2>/dev/null || echo "No existing changelog"
```

---

## Appending to Changelog

**Prepend new entries** (most recent at top):

```bash
# Read existing
EXISTING=$(cat {skill-path}/.history/CHANGELOG 2>/dev/null)

# Write new entry + existing
cat > {skill-path}/.history/CHANGELOG << 'EOF'
## [Date: YYYY-MM-DD] - {Operation}

{New entry content}

---

EOF

# Append existing content
echo "$EXISTING" >> {skill-path}/.history/CHANGELOG
```

---

## Related

- [Backup Strategy](backup-strategy.md) - Backup before making changes
- [Line Count Limits](line-count-limits.md) - May trigger changelog for extraction
