# Sync Algorithm

**Detailed logic for comparing discovered skills with gateway routing tables.**

## Overview

The sync algorithm has 3 main phases:

1. **Discovery** - Find all library skills and map to gateways
2. **Comparison** - Compare discovered vs current gateway state
3. **Application** - Apply changes to gateway routing tables

## Phase 1: Discovery

### Step 2.1: Find All Library Skills

```bash
find .claude/skill-library -name "SKILL.md" -type f
```

**Output:** List of absolute paths to all library skill files.

### Step 2.2: Extract Skill Metadata

For each discovered path:

```
Path: .claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md

Extract:
- Skill name: "frontend-tanstack" (directory name)
- Category: "development/frontend/state"
- Full path: ".claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md"
```

### Step 2.3: Map to Gateways

For each skill, determine gateway using mapping rules (see gateway-mapping.md):

**Data structure after discovery:**

```javascript
{
  "gateway-frontend": [
    { name: "frontend-tanstack", path: ".claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md" },
    { name: "frontend-react-patterns", path: ".claude/skill-library/development/frontend/patterns/frontend-react-patterns/SKILL.md" }
  ],
  "gateway-backend": [
    { name: "backend-go-patterns", path: ".claude/skill-library/development/backend/patterns/backend-go-patterns/SKILL.md" }
  ],
  // ... other gateways
}
```

## Phase 2: Comparison

### Step 3.1: Read Current Gateway State

For each gateway (e.g., `gateway-frontend`):

1. Read `.claude/skills/gateway-frontend/SKILL.md`
2. Find Skill Registry section (starts with `| Skill | Path | Triggers |`)
3. Parse table rows to extract entries

**Example parsing:**

```markdown
| Skill          | Path                                                                                   | Triggers               |
| -------------- | -------------------------------------------------------------------------------------- | ---------------------- |
| TanStack Query | `.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md`          | TanStack, cache, fetch |
| React Patterns | `.claude/skill-library/development/frontend/patterns/frontend-react-patterns/SKILL.md` | component, hook        |
```

**Data structure after parsing:**

```javascript
{
  "TanStack Query": { path: ".claude/skill-library/...", triggers: "TanStack, cache, fetch" },
  "React Patterns": { path: ".claude/skill-library/...", triggers: "component, hook" }
}
```

### Step 3.2: Identify Additions

**Additions** = Skills discovered in library that are NOT in gateway routing table.

**Algorithm:**

```
FOR each discovered skill in gateway's list:
  IF skill.path NOT IN gateway's current routing table paths:
    ADD to additions list
```

**Example:**

```
Discovered: frontend-performance (path: .claude/skill-library/development/frontend/performance/...)
Current table: Does not contain this path
Result: ADD to additions list
```

### Step 3.3: Identify Removals

**Removals** = Skills in gateway routing table whose paths NO LONGER EXIST in filesystem.

**Algorithm:**

```
FOR each entry in gateway's current routing table:
  IF entry.path does NOT exist in filesystem:
    ADD to removals list
```

**Path verification:**

```bash
# For each path in gateway routing table
test -f ".claude/skill-library/development/frontend/old-skill/SKILL.md"
# If exit code != 0, path doesn't exist → removal candidate
```

**IMPORTANT:** Never remove based on "seems wrong". Only remove if path verification fails.

### Step 3.4: Build Change Report

**Data structure:**

```javascript
{
  "gateway-frontend": {
    additions: [
      { name: "Frontend Performance", path: ".claude/skill-library/development/frontend/performance/..." }
    ],
    removals: [
      { name: "Old Skill", path: ".claude/skill-library/development/frontend/old-skill/SKILL.md" }
    ]
  },
  "gateway-backend": {
    additions: [],
    removals: []
  },
  // ... other gateways
}
```

## Phase 3: Application (Full Sync Only)

### Step 4.1: Build New Routing Table

For each gateway with changes:

1. Start with current routing table entries
2. Remove entries in removals list
3. Add entries in additions list
4. Sort alphabetically by skill name

**Example:**

```
Current:
  - React Patterns
  - TanStack Query

Changes:
  - ADD: Frontend Performance
  - REMOVE: (none)

New table (sorted):
  - Frontend Performance
  - React Patterns
  - TanStack Query
```

### Step 4.2: Format Table Rows

Convert data structure to markdown Skill Registry table format:

```markdown
| Skill                | Path                                                                                   | Triggers               |
| -------------------- | -------------------------------------------------------------------------------------- | ---------------------- |
| Frontend Performance | `.claude/skill-library/development/frontend/performance/frontend-performance/SKILL.md` | optimize, slow, render |
| React Patterns       | `.claude/skill-library/development/frontend/patterns/frontend-react-patterns/SKILL.md` | component, hook        |
| TanStack Query       | `.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md`          | TanStack, cache, fetch |
```

### Step 4.3: Apply Edit

Use Edit tool to replace old table with new table:

**old_string:**

```markdown
| Skill          | Path                                                                                   | Triggers               |
| -------------- | -------------------------------------------------------------------------------------- | ---------------------- |
| React Patterns | `.claude/skill-library/development/frontend/patterns/frontend-react-patterns/SKILL.md` | component, hook        |
| TanStack Query | `.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md`          | TanStack, cache, fetch |
```

**new_string:**

```markdown
| Skill                | Path                                                                                   | Triggers               |
| -------------------- | -------------------------------------------------------------------------------------- | ---------------------- |
| Frontend Performance | `.claude/skill-library/development/frontend/performance/frontend-performance/SKILL.md` | optimize, slow, render |
| React Patterns       | `.claude/skill-library/development/frontend/patterns/frontend-react-patterns/SKILL.md` | component, hook        |
| TanStack Query       | `.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md`          | TanStack, cache, fetch |
```

### Step 4.4: Verify Edit

1. Read updated gateway file
2. Verify table format is correct
3. Verify all paths are valid
4. Verify sorting is alphabetical

## Edge Cases

### Empty Gateway

If gateway has no routing table entries:

- Build table from scratch with all discovered skills
- Use standard table format

### Malformed Table

If gateway table cannot be parsed:

- Log ERROR
- SKIP gateway (do not attempt to fix)
- Report to user for manual intervention

### Duplicate Entries

If same path appears multiple times in current table:

- Deduplicate during application phase
- Keep only first occurrence
- Log WARNING

### Path Format Mismatches

If current table has paths in wrong format:

- Normalize during application phase
- Ensure all paths start with `.claude/skill-library/`
- Ensure all paths end with `/SKILL.md`

## Performance

**Time complexity:**

- Discovery: O(n) where n = number of library skills
- Comparison: O(m) where m = number of gateway entries
- Application: O(k) where k = number of gateways with changes

**Expected runtime:**

- Dry run: 2-5 minutes (discovery + comparison only)
- Full sync: 5-10 minutes (discovery + comparison + application)
