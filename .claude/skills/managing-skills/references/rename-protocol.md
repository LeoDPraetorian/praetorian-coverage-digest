# Rename Protocol

7-step protocol for safely renaming skills and updating all references.

## Overview

Renaming a skill requires updating multiple locations to maintain consistency. This protocol ensures all references are updated.

## 7-Step Protocol

### Step 1: Validate Old Name Exists

Verify the old skill exists in core (`.claude/skills/`) or library (`.claude/skill-library/`).

Use Glob or Grep to locate the skill directory.

### Step 2: Validate New Name Available

Checks that new name doesn't conflict with:

- Existing core skills
- Existing library skills
- Reserved names

### Step 3: Update Frontmatter Name Field

Updates `SKILL.md` frontmatter:

```yaml
---
name: new-skill-name # Updated from old-skill-name
description: ...
---
```

### Step 4: Rename Skill Directory

Renames directory:

```
.claude/skills/old-skill-name → .claude/skills/new-skill-name
```

Preserves all contents (references/, examples/, templates/, scripts/).

### Step 5: Update Command References

Updates `/skill-manager` command if skill is referenced:

```markdown
skills: new-skill-name # Updated from old-skill-name
```

### Step 6: Update Skill References

Searches and updates references in other skills:

- SKILL.md mentions
- Reference file mentions
- Example file mentions

### Step 7: Update Deprecation Registry

Adds entry to `.claude/skill-library/lib/deprecation-registry.json`:

```json
{
  "renamed": {
    "old-skill-name": {
      "newName": "new-skill-name",
      "renamedDate": "2025-11-29",
      "reason": "Better naming convention"
    }
  }
}
```

## Manual Steps After Rename

### 1. Search for Hardcoded References

```bash
grep -r "old-skill-name" .claude/
```

Update any missed references.

### 2. Update External Documentation

If skill is referenced in:

- README files
- Integration guides
- External wikis

### 3. Re-audit Skill

Audit the renamed skill to verify all phases still pass:

```markdown
Audit {new-skill-name} to verify compliance with all phase requirements.
```

Or invoke auditing-skills library skill directly.

## Common Rename Scenarios

### Scenario 1: Clarify Purpose

**Old:** `react-patterns`
**New:** `react-component-patterns`

**Reason:** More specific, clearer scope

### Scenario 2: Consolidation

**Old:** `react-hooks`, `react-context`
**New:** `react-state-management`

**Reason:** Combined related skills

### Scenario 3: Naming Convention

**Old:** `reactPatterns`
**New:** `react-patterns`

**Reason:** Enforce kebab-case convention

## Safety Features

### Confirmation Prompt

```
Rename 'old-skill-name' to 'new-skill-name'? (y/n)
```

### Collision Detection

Prevents renaming to existing skill name.

### Atomic Operation

If any step fails, previous steps are not rolled back - manual intervention required.

### Backup Recommendation

Before renaming, commit current state:

```bash
git add -A
git commit -m "chore: backup before rename"
```

## Related

- [Migrate Workflow](migrate-workflow.md)
- [Create Workflow](create-workflow.md)
