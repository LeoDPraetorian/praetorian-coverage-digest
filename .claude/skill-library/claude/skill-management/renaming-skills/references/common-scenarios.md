# Common Rename Scenarios

**Real-world examples of skill renaming operations.**

## Scenario 1: Standardizing Convention

**Before:** `my_skill` (underscore)
**After:** `my-skill` (kebab-case)

**Why:** Skill names must use kebab-case for consistency

**Fix:**

1. Rename directory
2. Update frontmatter
3. Update all references
4. Verify

## Scenario 2: Clarifying Purpose

**Before:** `helper-skill`
**After:** `frontend-helper-skill`

**Why:** Name too generic, add domain prefix

**Fix:**

1. Rename with domain prefix
2. Update description for clarity
3. Update references
4. May need to update gateway routing

## Scenario 3: Consolidating Duplicates

**Before:** `skill-audit` + `skill-check`
**After:** `skill-audit` (keep one, delete other)

**Process:**

1. Identify which to keep
2. Merge unique content from deleted skill
3. Delete redundant skill directory
4. Update all references to point to kept skill
