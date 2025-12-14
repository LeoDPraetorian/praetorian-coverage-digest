---
description: Skill management - create, update, audit, fix, rename, migrate, search, or list skills
argument-hint: <create|update|audit|fix|rename|migrate|search|list> [skill-name] [options]
model: sonnet
allowed-tools: Skill, AskUserQuestion
skills: skill-manager, creating-skills, updating-skills, auditing-skills, fixing-skills, renaming-skills, migrating-skills, searching-skills, listing-skills
---

# Skill Management

**Routing by subcommand:**

| Subcommand | Skill to Invoke |
|------------|-----------------|
| `create`   | `creating-skills` (instruction-based TDD workflow) |
| `update`   | `updating-skills` (instruction-based TDD workflow) |
| `audit`    | `auditing-skills` (instruction-based validation) |
| `fix`      | `fixing-skills` (instruction-based remediation) |
| `rename`   | `renaming-skills` (instruction-based safe rename) |
| `migrate`  | `migrating-skills` (instruction-based core ↔ library) |
| `search`   | `searching-skills` (instruction-based keyword search) |
| `list`     | `listing-skills` (instruction-based comprehensive list) |

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

## For `update` Subcommand

**ACTION:** Invoke the `updating-skills` skill.

The `updating-skills` skill guides through:
1. 🔴 RED phase (document current failure)
2. Locate skill file
3. Create backup
4. Minimal change (edit only what's needed)
5. Update changelog
6. 🟢 GREEN phase (verify fix works)
7. Compliance checks (audit + line count)
8. 🔵 REFACTOR phase (pressure test if major change)

**Output:** Follow the skill's interactive workflow.

---

## For `audit` Subcommand

**ACTION:** Invoke the `auditing-skills` skill.

The `auditing-skills` skill guides through:
1. Locate skill file (core or library)
2. Run 16-phase validation:
   - Structural phases (auto-fixable)
   - Semantic phases (manual review)
3. Interpret results (pass/warning/failure)
4. Fix workflow guidance
5. Re-audit verification

**Output:** Follow the skill's interactive workflow.

---

## For `fix` Subcommand

**ACTION:** Invoke the `fixing-skills` skill.

The `fixing-skills` skill guides through:
1. Run audit to identify issues
2. Read skill file
3. Categorize fixes (auto vs manual)
4. Present options via AskUserQuestion
5. Apply auto-fixes (Phases 2,4,5,6,7,10,12)
6. Guide manual fixes (Phases 1,3,8,9,11,13)
7. Re-audit to verify success
8. Report final status

**Output:** Follow the skill's interactive workflow.

---

## For `rename` Subcommand

**ACTION:** Invoke the `renaming-skills` skill.

The `renaming-skills` skill guides through:
1. Validate source skill exists
2. Validate target name available
3. Confirm with user (show impact)
4. Update frontmatter name
5. Move/rename directory
6. Find all references (gateways, commands, skills)
7. Update each reference with Edit
8. Verify integrity (no old name remains)
9. Report success with summary

**Output:** Follow the skill's interactive workflow.

---

## For `migrate` Subcommand

**ACTION:** Invoke the `migrating-skills` skill.

The `migrating-skills` skill guides through:
1. Validate source skill exists
2. Determine target location (core ↔ library)
3. Move directory to target
4. Update gateway references
5. Update command references
6. Verify no broken references

**Output:** Follow the skill's interactive workflow.

---

## For `search` Subcommand

**ACTION:** Invoke the `searching-skills` skill.

The `searching-skills` skill guides through:
1. Get search query
2. Search core skills (name + description)
3. Search library skills (name + description)
4. Score and sort results
5. Format output with locations and access methods

**Output:** Follow the skill's interactive workflow.

---

## For `list` Subcommand

**ACTION:** Invoke the `listing-skills` skill.

The `listing-skills` skill guides through:
1. List core skills with status
2. List library skills organized by category
3. Show summary statistics
4. Optional filters (location, category, status)

**Output:** Follow the skill's interactive workflow.

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
