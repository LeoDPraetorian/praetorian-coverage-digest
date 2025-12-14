---
name: listing-skills
description: Use when viewing all available skills - lists skills from core and library with status information
allowed-tools: Bash, Glob, Read, TodoWrite
---

# Listing Skills

**Comprehensive listing of all skills across core and library locations.**

---

## What This Skill Does

Lists all skills with:
- ✅ Location (core vs library)
- ✅ Category (for library skills)
- ✅ Status (compliant vs has issues)
- ✅ Line count
- ✅ Description preview

---

## When to Use

- Getting overview of all available skills
- Understanding skill organization
- Planning new skill creation (avoid duplicates)
- Auditing skill coverage

**NOT for:**
- Searching for specific skills (use `searching-skills`)
- Auditing individual skills (use `auditing-skills`)

---

## Quick List

**List core skills:**
```bash
ls .claude/skills/
```

**List library skills:**
```bash
find .claude/skill-library -name "SKILL.md" -type f | \
  sed 's|.claude/skill-library/||' | \
  sed 's|/SKILL.md||' | \
  sort
```

---

## Workflow

### Step 1: List Core Skills

```bash
# Get all core skill directories
ls -d .claude/skills/*/

# For each, read SKILL.md frontmatter
Read .claude/skills/{skill-name}/SKILL.md | head -10
```

**Extract:**
- Skill name
- Description
- Line count (`wc -l`)

### Step 2: List Library Skills

```bash
# Get all library skills organized by category
find .claude/skill-library -name "SKILL.md" | sort
```

**Group by category:**
- Parse path to extract category
- Group skills under category headers

### Step 3: Check Status (Optional)

For each skill, check if it has issues:
```bash
# Quick validation
- Has frontmatter?
- Description valid?
- Under 500 lines?
```

Mark as:
- ✅ Compliant
- ⚠️ Has warnings
- ❌ Has errors

### Step 4: Format Output

**Organized by location:**

```
=== CORE SKILLS (15) ===

creating-skills (421 lines) ✅
  Use when creating skills - TDD workflow

skill-manager (312 lines) ✅
  Use when managing skills - lifecycle operations

...

=== LIBRARY SKILLS (120) ===

## claude/agent-management (8 skills)
- creating-agents (387 lines) ✅
- updating-agents (333 lines) ✅
- auditing-agents (298 lines) ✅
...

## claude/skill-management (8 skills)
- updating-skills (347 lines) ✅
- auditing-skills (413 lines) ✅
- fixing-skills (337 lines) ✅
...

## development/frontend (20 skills)
- frontend-tanstack-query (421 lines) ✅
- frontend-zustand (312 lines) ✅
...

TOTAL: 135 skills (15 core, 120 library)
```

---

## Filters

### By Location

```
Question: Which skills to list?
Options:
  - All skills (core + library)
  - Core skills only
  - Library skills only
```

### By Category

```
Question: Filter by category?
Options:
  - All categories
  - claude/ (Claude Code specific)
  - development/ (Frontend, Backend)
  - testing/ (Test engineering)
```

### By Status

```
Question: Filter by status?
Options:
  - All skills
  - Compliant only (✅)
  - Has issues (⚠️ or ❌)
```

---

## Summary Statistics

**Count by location:**
- Core: {count}
- Library: {count}

**Count by category:**
- claude/: {count}
- development/: {count}
- testing/: {count}
- operations/: {count}

**Status breakdown:**
- ✅ Compliant: {count}
- ⚠️ Warnings: {count}
- ❌ Errors: {count}

**Line count stats:**
- Average: {avg} lines
- Under 300: {count}
- 300-400: {count}
- 400-500: {count}
- Over 500: {count} ⚠️

---

## Related Skills

- `searching-skills` - Find skills by keyword
- `auditing-skills` - Validate skill compliance
- `skill-manager` - Router to this skill
