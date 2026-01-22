---
name: searching-skills
description: Use when finding skills by keyword - searches core and library with fuzzy matching, scored results (exact > substring)
allowed-tools: Bash, Grep, Read, TodoWrite, Glob
---

# Searching Skills

**Keyword-based skill discovery across core and library locations.**

<EXTREMELY-IMPORTANT>
**TodoWrite is MANDATORY before any search operation.**

You MUST create a TodoWrite todo list with these items BEFORE proceeding:

1. Navigate to repository root
2. Get search query from user
3. Search core skills by name and description
4. Search library skills by name and description
5. Score and sort results by relevance
6. Format and present search results

**This is NOT optional. This is NOT negotiable.**

- ❌ "This is just a quick search" → Use TodoWrite anyway
- ❌ "I already know the workflow" → TodoWrite makes progress visible to user
- ❌ "It's only 6 steps" → TodoWrite is mandatory for ANY multi-step workflow
- ❌ "The user wants fast results" → TodoWrite IS fast and provides transparency

**If you skip TodoWrite, you are violating this skill's requirements.**
</EXTREMELY-IMPORTANT>

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

```typescript
Grep {
  pattern: "keyword",
  path: ".claude",
  output_mode: "files_with_matches"
}

// Filter for SKILL.md files
// Show skill name from path
```

**Enhanced search with scoring:**

1. Name exact match: 100 points
2. Name substring: 50 points
3. Description match: 30 points
4. Path match: 10 points

---

## Step 1: Navigate to Repository Root (MANDATORY)

**Execute BEFORE any search operation:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

**⚠️ If skill file not found:** You are in the wrong directory. Navigate to repo root first. The file exists, you're just looking in the wrong place.

**Cannot proceed without navigating to repo root** ✅

---

## Workflow

Follow these steps to search for skills by keyword with scoring and result formatting:

### Step 2: Get Search Query

If user provided query, use it. Otherwise, ask:

```typescript
Question: What are you searching for?
Header: Search Query
Options:
  - Keyword (e.g., "React", "testing")
  - Skill name fragment
  - Domain (e.g., "frontend", "backend")
```

### Step 3: Search Core Skills

**Search core skill names:**

```bash
ls .claude/skills/ | grep -i "keyword"
```

**Search core descriptions:**

```typescript
Grep {
  pattern: "keyword",
  path: ".claude/skills",
  glob: "**/SKILL.md",
  output_mode: "content",
  "-i": true
}
```

### Step 4: Search Library Skills

**Search library skill names:**

```typescript
Glob {
  pattern: "**/*keyword*/SKILL.md",
  path: ".claude/skill-library"
}
```

**Search library descriptions:**

```typescript
Grep {
  pattern: "keyword",
  path: ".claude/skill-library",
  glob: "**/SKILL.md",
  output_mode: "content",
  "-i": true
}
```

### Step 5: Score and Sort Results

For each match:

- Extract skill name from path
- Read SKILL.md for description
- Calculate score
- Sort by score descending

### Step 6: Format Output

```text
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

```text
[LIB] creating-skills (Score: 30)
  Description mentions React in examples

[LIB] using-tanstack-query (Score: 50)
  Category contains React patterns

[LIB] using-modern-react-patterns (Score: 100)
  Name exact match
```

**Search: "test"**

```text
[CORE] pressure-testing-skill-content (Score: 100)
[LIB] frontend-unit-test-engineer (Score: 50)
[LIB] backend-tester (Score: 50)
```

---

## Integration

### Called By

- `managing-skills` skill (search operation routing)
- `/skill-manager search <query>` command
- Gateway skills (when user asks "find skills about X")
- Users discovering available skills before creating duplicates

### Requires (invoke before starting)

None - standalone search skill

### Calls (during execution)

None - terminal skill (doesn't invoke other skills)

### Pairs With (conditional)

| Skill                       | Trigger                          | Purpose                                                                                             |
| --------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------- |
| `listing-skills` (LIBRARY)  | When complete enumeration needed | List all skills - `Read(".claude/skill-library/claude/skill-management/listing-skills/SKILL.md")`   |
| `creating-skills` (LIBRARY) | After search finds no match      | Create new skill - `Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md")` |
| `auditing-skills` (LIBRARY) | After finding skill to validate  | Validate skill - `Read(".claude/skill-library/claude/skill-management/auditing-skills/SKILL.md")`   |

---

## Related Skills

| Skill                       | Purpose                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| `listing-skills` (LIBRARY)  | List all skills - `Read(".claude/skill-library/claude/skill-management/listing-skills/SKILL.md")`    |
| `creating-skills` (LIBRARY) | Create new skills - `Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md")` |
| `auditing-skills` (LIBRARY) | Validate skills - `Read(".claude/skill-library/claude/skill-management/auditing-skills/SKILL.md")`   |
