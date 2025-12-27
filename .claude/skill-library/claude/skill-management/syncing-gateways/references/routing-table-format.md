# Routing Table Format

**Exact formatting requirements for gateway routing tables.**

## Standard Format

Every gateway MUST use this exact table format:

```markdown
| Skill      | Path                                                 |
| ---------- | ---------------------------------------------------- |
| Skill Name | `.claude/skill-library/category/skill-name/SKILL.md` |
```

## Header Requirements

**Column headers:**

- First column: `Skill` (capital S)
- Second column: `Path` (capital P)

**Separator row:**

- Must use dashes: `|-------|------|`
- Must align with header columns
- No other characters allowed

## Row Requirements

### Skill Name Column

**Format:** Human-readable display name

**Rules:**

- Use title case (e.g., "TanStack Query", not "tanstack-query")
- Use spaces between words
- No special characters except hyphens
- Keep concise (ideally < 40 characters)

**Examples:**

- ✅ "TanStack Query"
- ✅ "React Patterns"
- ✅ "Frontend Performance"
- ❌ "frontend-performance" (not title case)
- ❌ "TanStack Query Library Documentation" (too verbose)

### Path Column

**Format:** Relative path from repository root, wrapped in backticks

**Rules:**

- MUST start with `.claude/skill-library/`
- MUST end with `/SKILL.md`
- MUST use forward slashes (even on Windows)
- MUST be wrapped in backticks: `` `.claude/...` ``
- NO spaces in path
- NO `~` or `$HOME` expansion

**✅ Correct:**

```
`.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md`
```

**❌ Wrong:**

```
frontend-tanstack                                  # Missing full path
`skill-library/frontend-tanstack/SKILL.md`         # Missing .claude prefix
`.claude/skill-library/frontend-tanstack`          # Missing /SKILL.md
.claude/skill-library/frontend-tanstack/SKILL.md   # Missing backticks
`~/.claude/skill-library/frontend-tanstack`        # Using ~
```

## Sorting

**Rows MUST be sorted alphabetically by skill name (case-insensitive).**

**Example:**

```markdown
| Skill                  | Path                                                                          |
| ---------------------- | ----------------------------------------------------------------------------- |
| Frontend Accessibility | `.claude/skill-library/development/frontend/accessibility/...`                |
| Frontend Performance   | `.claude/skill-library/development/frontend/performance/...`                  |
| React Patterns         | `.claude/skill-library/development/frontend/patterns/...`                     |
| TanStack Query         | `.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md` |
| Zustand State          | `.claude/skill-library/development/frontend/state/frontend-zustand/SKILL.md`  |
```

**NOT:**

```markdown
| Skill                  | Path |
| ---------------------- | ---- |
| TanStack Query         | ...  |
| Frontend Performance   | ...  |
| Zustand State          | ...  |
| React Patterns         | ...  |
| Frontend Accessibility | ...  |
```

## Whitespace

**Required:**

- Single space after opening pipe: `| Skill`
- Single space before closing pipe: `Path |`
- NO extra spaces within cells

**✅ Correct:**

```markdown
| Skill Name | `.claude/skill-library/...` |
```

**❌ Wrong:**

```markdown
|Skill Name|`.claude/skill-library/...`| # Missing spaces
| Skill Name | `.claude/skill-library/...` | # Extra spaces
| Skill Name | `.claude/skill-library/...` | # Leading space in cell
```

## Table Boundaries

**What to preserve when editing:**

**Before table:**

- All content up to (but not including) the table header
- Gateway explanation sections
- Two-tier system documentation
- Usage instructions

**After table:**

- All content after the last table row
- Related skills sections
- Examples sections
- Changelog

**Only modify the table itself** (header + separator + data rows).

## Validation

After modifying a routing table, verify:

1. **Header row matches exactly:** `| Skill | Path |`
2. **Separator row matches exactly:** `|-------|------|`
3. **All paths:**
   - Start with `.claude/skill-library/`
   - End with `/SKILL.md`
   - Are wrapped in backticks
   - Use forward slashes only
4. **Rows are sorted alphabetically by skill name**
5. **No duplicate entries** (same path appears multiple times)
6. **All paths exist in filesystem** (verify with `test -f`)

## Common Errors

### Missing Backticks

**Problem:**

```markdown
| TanStack Query | .claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md |
```

**Fix:**

```markdown
| TanStack Query | `.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md` |
```

### Wrong Path Prefix

**Problem:**

```markdown
| TanStack Query | `skill-library/development/frontend/state/frontend-tanstack/SKILL.md` |
```

**Fix:**

```markdown
| TanStack Query | `.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md` |
```

### Missing SKILL.md Suffix

**Problem:**

```markdown
| TanStack Query | `.claude/skill-library/development/frontend/state/frontend-tanstack` |
```

**Fix:**

```markdown
| TanStack Query | `.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md` |
```

### Unsorted Rows

**Problem:**

```markdown
| Skill          | Path |
| -------------- | ---- |
| Zustand State  | ...  |
| React Patterns | ...  |
| TanStack Query | ...  |
```

**Fix:**

```markdown
| Skill          | Path |
| -------------- | ---- |
| React Patterns | ...  |
| TanStack Query | ...  |
| Zustand State  | ...  |
```

## Edit Tool Usage

When using Edit tool to update routing table:

**old_string:** Entire current table (header + separator + all rows)
**new_string:** Entire new table (header + separator + updated rows)

**Example:**

```typescript
Edit({
  file_path: ".claude/skills/gateway-frontend/SKILL.md",
  old_string: `| Skill | Path |
|-------|------|
| React Patterns | \`.claude/skill-library/development/frontend/patterns/frontend-react-patterns/SKILL.md\` |
| TanStack Query | \`.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md\` |`,
  new_string: `| Skill | Path |
|-------|------|
| Frontend Performance | \`.claude/skill-library/development/frontend/performance/frontend-performance/SKILL.md\` |
| React Patterns | \`.claude/skill-library/development/frontend/patterns/frontend-react-patterns/SKILL.md\` |
| TanStack Query | \`.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md\` |`,
});
```

**Note:** Include the header and separator in both old_string and new_string for uniqueness.
