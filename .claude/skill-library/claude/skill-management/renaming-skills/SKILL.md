---
name: renaming-skills
description: Use when renaming existing skills - safe 11-step protocol with reference updates across gateways, commands, and other skills, plus integrity verification
allowed-tools: Read, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# Renaming Skills

**Safe skill renaming with comprehensive reference tracking and validation.**

> **IMPORTANT**: Use TodoWrite to track the 11-step rename process. Missing a step can leave broken references.

---

## What This Skill Does

Safely renames skills by:

1. ✅ Validating old skill exists (core or library)
2. ✅ Validating new name available (no conflicts)
3. ✅ Updating frontmatter name field
4. ✅ Renaming the directory
5. ✅ Finding ALL references (gateways, commands, other skills)
6. ✅ Updating each reference (Edit tool)
7. ✅ Verifying no broken references remain

**Critical:** This is an atomic operation - all steps must succeed or rollback.

---

## When to Use

- Standardizing skill names to follow conventions
- Fixing naming inconsistencies
- Reorganizing skill structure
- Consolidating similar skills

**NOT for:**

- Changing skill behavior (use `updating-skills`)
- Creating new skills (use `creating-skills`)
- Moving skills between core ↔ library (use `migrating-skills`)

---

## Quick Reference - 11-Step Safe Rename

| Step | Action                        | Tool             | Verification                  |
| ---- | ----------------------------- | ---------------- | ----------------------------- |
| 1    | Navigate to repository root   | Bash             | In correct directory          |
| 2    | Validate source exists        | Bash, Read       | Directory exists, valid skill |
| 3    | Validate target available     | Bash             | No conflicts                  |
| 4    | Confirm with user             | AskUserQuestion  | User approves                 |
| 5    | Update frontmatter            | Edit             | Name field updated            |
| 6    | Move directory                | Bash             | New dir exists, old gone      |
| 7    | Find references               | Grep             | List all matches              |
| 8    | Update non-gateway references | Edit             | Commands, skills updated      |
| 9    | Sync gateways                 | syncing-gateways | Tables formatted, sorted      |
| 10   | Verify integrity              | Grep             | Zero matches for old name     |
| 11   | Report success                | Output           | Summary displayed             |

---

## Step 1: Navigate to Repository Root (MANDATORY)

**Execute BEFORE any rename operation:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

**Note:** This pattern works from super-repo root, any submodule, or any subdirectory. It uses `--show-superproject-working-tree` and `--show-toplevel` together, with `head -1` to take the first non-empty line (super-repo root when in submodule, repo root otherwise).

**⚠️ If skill file not found:** You are in the wrong directory. Navigate to repo root first. The file exists, you're just looking in the wrong place.

**Cannot proceed without navigating to repo root** ✅

---

## Complete Workflow

> **You MUST use TodoWrite before starting** to track all 11 steps of this workflow. Steps get skipped without tracking.

Copy this checklist and track with TodoWrite:

```markdown
Rename Progress:

- [ ] Step 1: Navigate to repository root
- [ ] Step 2: Validate source skill exists
- [ ] Step 3: Validate target name available
- [ ] Step 4: Confirm with user (show impact)
- [ ] Step 5: Update frontmatter name
- [ ] Step 6: Move/rename directory
- [ ] Step 7: Find all references
- [ ] Step 8: Update non-gateway references (commands, skills)
- [ ] Step 9: Sync gateways with syncing-gateways skill
- [ ] Step 10: Verify integrity (no old name remains)
- [ ] Step 11: Report success with summary
```

---

## Detailed Instructions

**For complete step-by-step instructions, see:** [references/detailed-workflow.md](references/detailed-workflow.md)

The detailed workflow covers:

- Step 1: Repository root navigation
- Steps 2-3: Source/target validation with bash commands
- Step 4: User confirmation via AskUserQuestion
- Steps 5-6: Frontmatter update and directory move
- Steps 7-8: Reference discovery and non-gateway updates
- Step 9: Gateway sync via `syncing-gateways` skill
- Steps 10-11: Integrity verification and success reporting

---

## Common Scenarios

**For real-world rename examples, see:** [references/common-scenarios.md](references/common-scenarios.md)

Quick reference:

| Scenario                 | Before                | After                   | Key Action            |
| ------------------------ | --------------------- | ----------------------- | --------------------- |
| Standardizing convention | `my_skill`            | `my-skill`              | Kebab-case conversion |
| Clarifying purpose       | `helper-skill`        | `frontend-helper-skill` | Add domain prefix     |
| Consolidating duplicates | `skill-a` + `skill-b` | `skill-a`               | Merge + delete        |

---

## Rollback Procedure

**For recovery from failed renames, see:** [references/rollback-procedures.md](references/rollback-procedures.md)

Quick recovery steps:

1. **Failed at frontmatter update** → Revert name field via Edit
2. **Failed at directory move** → `mv {new-path} {old-path}`
3. **Failed at reference updates** → Revert each file, move directory back

---

## Integration

### Called By

- `managing-skills` (router skill) - Delegates rename operations
- `/skill-manager rename` command

### Requires (invoke before starting)

None - standalone operation. Skill validates source/target before proceeding.

### Calls (during execution)

| Skill                        | Phase/Step | Purpose                                            |
| ---------------------------- | ---------- | -------------------------------------------------- |
| `syncing-gateways` (LIBRARY) | Step 8     | Sync gateway routing tables with proper formatting |

**Note:** Read syncing-gateways via: `Read(".claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md")`

### Pairs With (conditional)

| Skill                        | Trigger                           | Purpose                                   |
| ---------------------------- | --------------------------------- | ----------------------------------------- |
| `migrating-skills` (LIBRARY) | Moving skill between core/library | Rename + location change in one operation |
| `deleting-skills` (LIBRARY)  | Consolidating duplicate skills    | Keep one, rename if needed, delete other  |

---

## Related Skills

- `creating-skills` (LIBRARY) - `Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md")` - Create new skills
- `updating-skills` (LIBRARY) - `Read(".claude/skill-library/claude/skill-management/updating-skills/SKILL.md")` - Update existing skills
- `migrating-skills` (LIBRARY) - `Read(".claude/skill-library/claude/skill-management/migrating-skills/SKILL.md")` - Move skills between core ↔ library
- `syncing-gateways` (LIBRARY) - `Read(".claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md")` - Validate and fix gateway routing tables
- `deleting-skills` (LIBRARY) - `Read(".claude/skill-library/claude/skill-management/deleting-skills/SKILL.md")` - Safe skill deletion with reference cleanup
