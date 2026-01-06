# Routing Table Format

**Exact formatting requirements for gateway Skill Registry tables.**

## Standard Format

Every gateway MUST use this exact table format for the Skill Registry:

```markdown
| Skill      | Path                                                 | Triggers           |
| ---------- | ---------------------------------------------------- | ------------------ |
| Skill Name | `.claude/skill-library/category/skill-name/SKILL.md` | keyword1, keyword2 |
```

## Header Requirements

**Column headers:**

- First column: `Skill` (capital S)
- Second column: `Path` (capital P)
- Third column: `Triggers` (capital T)

**Separator row:**

- Must use dashes: `|-------|------|----------|`
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

### Triggers Column

**Format:** Comma-separated keywords that trigger routing to this skill

**Rules:**

- Use lowercase keywords
- Separate multiple triggers with commas
- Keep concise (3-5 keywords typically)
- Match keywords to Intent Detection table entries

**Examples:**

- ✅ "TanStack, React Query, caching"
- ✅ "state, zustand, store"
- ✅ "API, REST, endpoint"
- ❌ "Use this skill when working with TanStack Query" (too verbose)
- ❌ "" (empty - must have at least one trigger)

## Sorting

**Rows MUST be sorted alphabetically by skill name (case-insensitive).**

**Example:**

```markdown
| Skill                  | Path                                                                          | Triggers                 |
| ---------------------- | ----------------------------------------------------------------------------- | ------------------------ |
| Frontend Accessibility | `.claude/skill-library/development/frontend/accessibility/...`                | a11y, WCAG, aria         |
| Frontend Performance   | `.claude/skill-library/development/frontend/performance/...`                  | optimize, slow, render   |
| React Patterns         | `.claude/skill-library/development/frontend/patterns/...`                     | component, hook, pattern |
| TanStack Query         | `.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md` | TanStack, cache, fetch   |
| Zustand State          | `.claude/skill-library/development/frontend/state/frontend-zustand/SKILL.md`  | zustand, store, state    |
```

**NOT:**

```markdown
| Skill                  | Path | Triggers |
| ---------------------- | ---- | -------- |
| TanStack Query         | ...  | ...      |
| Frontend Performance   | ...  | ...      |
| Zustand State          | ...  | ...      |
| React Patterns         | ...  | ...      |
| Frontend Accessibility | ...  | ...      |
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

After modifying a Skill Registry table, verify:

1. **Header row matches exactly:** `| Skill | Path | Triggers |`
2. **Separator row matches exactly:** `|-------|------|----------|`
3. **All paths:**
   - Start with `.claude/skill-library/`
   - End with `/SKILL.md`
   - Are wrapped in backticks
   - Use forward slashes only
4. **All triggers:**
   - Are comma-separated keywords
   - Are not empty
   - Match Intent Detection entries
5. **Rows are sorted alphabetically by skill name**
6. **No duplicate entries** (same path appears multiple times)
7. **All paths exist in filesystem** (verify with `test -f`)

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

When using Edit tool to update Skill Registry table:

**old_string:** Entire current table (header + separator + all rows)
**new_string:** Entire new table (header + separator + updated rows)

**Example:**

```typescript
Edit({
  file_path: ".claude/skills/gateway-frontend/SKILL.md",
  old_string: `| Skill | Path | Triggers |
|-------|------|----------|
| React Patterns | \`.claude/skill-library/development/frontend/patterns/frontend-react-patterns/SKILL.md\` | component, hook |
| TanStack Query | \`.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md\` | TanStack, cache |`,
  new_string: `| Skill | Path | Triggers |
|-------|------|----------|
| Frontend Performance | \`.claude/skill-library/development/frontend/performance/frontend-performance/SKILL.md\` | optimize, slow |
| React Patterns | \`.claude/skill-library/development/frontend/patterns/frontend-react-patterns/SKILL.md\` | component, hook |
| TanStack Query | \`.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md\` | TanStack, cache |`,
});
```

**Note:** Include the header and separator in both old_string and new_string for uniqueness.
