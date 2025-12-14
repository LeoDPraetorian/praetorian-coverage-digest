---
name: searching-skills
description: Use when finding skills by keyword - searches both core and library locations with fuzzy matching
allowed-tools: Bash, Grep, Read, TodoWrite
---

# Searching Skills

**Keyword-based skill discovery across core and library locations.**

---

## What This Skill Does

Searches for skills by keyword across:
- ✅ Core skills (`.claude/skills/`)
- ✅ Library skills (`.claude/skill-library/`)
- ✅ Fuzzy matching on name and description
- ✅ Scored results (exact > substring > fuzzy)

---

## When to Use

- Finding skills by keyword ("React", "testing", "audit")
- Discovering available skills before creating duplicates
- Exploring skill library organization
- Locating skills for reference

**NOT for:**
- Listing all skills (use `listing-skills`)
- Creating skills (use `creating-skills`)
- Auditing skills (use `auditing-skills`)

---

## Quick Search

**Simple search:**
```bash
Grep {
  pattern: "keyword",
  path: ".claude",
  output_mode: "files_with_matches"
}

# Filter for SKILL.md files
# Show skill name from path
```

**Enhanced search with scoring:**
1. Name exact match: 100 points
2. Name substring: 50 points
3. Description match: 30 points
4. Path match: 10 points

---

## Workflow

### Step 1: Get Search Query

If user provided query, use it. Otherwise, ask:

```
Question: What are you searching for?
Header: Search Query
Options:
  - Keyword (e.g., "React", "testing")
  - Skill name fragment
  - Domain (e.g., "frontend", "backend")
```

### Step 2: Search Core Skills

```bash
# Search core skill names
ls .claude/skills/ | grep -i "keyword"

# Search core descriptions
Grep {
  pattern: "keyword",
  path: ".claude/skills",
  glob: "**/SKILL.md",
  output_mode: "content",
  "-i": true
}
```

### Step 3: Search Library Skills

```bash
# Search library skill names
find .claude/skill-library -name "*keyword*" -type d

# Search library descriptions
Grep {
  pattern: "keyword",
  path: ".claude/skill-library",
  glob: "**/SKILL.md",
  output_mode: "content",
  "-i": true
}
```

### Step 4: Score and Sort Results

For each match:
- Extract skill name from path
- Read SKILL.md for description
- Calculate score
- Sort by score descending

### Step 5: Format Output

```
Search Results for "{keyword}":

[CORE] skill-name (Score: 100)
  Location: .claude/skills/skill-name
  Description: {first line of description}
  → Use: skill: "skill-name"

[LIB] another-skill (Score: 50)
  Location: .claude/skill-library/category/another-skill
  Description: {first line}
  → Read: .claude/skill-library/category/another-skill/SKILL.md

Found {count} matches
```

---

## Example Searches

**Search: "react"**
```
[CORE] creating-skills (Score: 30)
  Description mentions React in examples

[LIB] frontend-tanstack-query (Score: 50)
  Category contains React patterns

[LIB] frontend-react-patterns (Score: 100)
  Name exact match
```

**Search: "test"**
```
[CORE] testing-skills-with-subagents (Score: 100)
[LIB] frontend-unit-test-engineer (Score: 50)
[LIB] backend-unit-test-engineer (Score: 50)
```

---

## Related Skills

- `listing-skills` - List all skills
- `creating-skills` - Create new skills
- `skill-manager` - Router to this skill
