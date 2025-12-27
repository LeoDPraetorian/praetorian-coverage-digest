# Visual/Style Guidelines

**Single source of truth for SKILL.md visual formatting and style requirements.**

This pattern is referenced by:

- `auditing-skills` - Validates table, code block, and header formatting (Phase 14a-c)
- `creating-skills` - Ensures new skills follow style guidelines
- `fixing-skills` - Restores style compliance (Claude-automated phases 14d-f)

---

## Why Style Matters

**Readability impacts comprehension.** Skills are read by both Claude agents and human developers. Poor formatting:

1. **Breaks rendering** - Malformed tables render as plain text
2. **Confuses syntax highlighting** - Missing language tags disable highlighting
3. **Disrupts navigation** - Inconsistent headers make skills hard to scan
4. **Wastes cognitive load** - Readers spend energy parsing instead of understanding

**Consistent style** is the solution: Follow markdown best practices across all skills.

---

## Phase 14 Sub-phases

| Phase | Name                 | Type             | What It Checks                             |
| ----- | -------------------- | ---------------- | ------------------------------------------ |
| 14a   | Table Formatting     | Deterministic    | Header rows, separators, column counts     |
| 14b   | Code Block Quality   | Deterministic    | Language tags, line length, content match  |
| 14c   | Header Hierarchy     | Deterministic    | H1 count, level skipping, orphan headers   |
| 14d   | Section Organization | Claude-Automated | Required sections, logical order           |
| 14e   | Visual Readability   | Claude-Automated | Wall-of-text, emphasis, whitespace         |
| 14f   | Example Quality      | Hybrid           | Before/after examples, self-contained code |

---

## Phase 14a: Table Formatting

### Requirements

1. **Header row with separators** - Every table must have `|---|---|` between header and data
2. **Consistent column count** - All rows must have the same number of columns
3. **Valid alignment indicators** - Only `:---`, `---:`, `:---:`, or `---`
4. **No empty header cells** - All columns should have descriptive headers

### Valid Table Example

```markdown
| Column 1 | Column 2 | Column 3 |
| -------- | :------: | -------: |
| Left     |  Center  |    Right |
| Data     |   Data   |     Data |
```

### Common Issues

| Issue             | Problem               | Fix          |
| ----------------- | --------------------- | ------------ | ----------------- | --- | ------------------ | ------------------------------ |
| Missing separator | Table renders as text | Add `        | ---               | --- | ` row after header |
| Column mismatch   | Rows misalign         | Add/remove ` | ` to match header |
| Invalid alignment | `                     | ::           | `or`              | -   | `                  | Use `:---`, `---:`, or `:---:` |

---

## Phase 14b: Code Block Quality

### Requirements

1. **Always use language tags** - ` ```bash ` not ` ``` `
2. **Match content to tag** - Bash commands tagged as `bash`, TypeScript as `typescript`
3. **Keep lines under 120 characters** - Prevents horizontal scrolling
4. **Use appropriate language** - See valid languages below

### Valid Language Tags

**Shell/Scripts:** `bash`, `sh`, `shell`, `zsh`, `console`, `terminal`

**Web:** `typescript`, `ts`, `tsx`, `javascript`, `js`, `jsx`, `html`, `css`, `json`, `yaml`

**Backend:** `go`, `python`, `py`, `rust`, `java`, `sql`, `cypher`

**Config:** `dockerfile`, `makefile`, `ini`, `toml`, `nginx`

**Other:** `markdown`, `md`, `diff`, `text`, `graphql`, `vql`

### Language Detection Hints

| Content Pattern                            | Suggested Tag |
| ------------------------------------------ | ------------- |
| `npm run`, `git`, `cd`, `$` prompt         | `bash`        |
| `import ... from`, `interface`, `: string` | `typescript`  |
| `package main`, `func`, `type ... struct`  | `go`          |
| `def`, `class`, `import`, `if __name__`    | `python`      |
| `MATCH`, `CREATE`, `-[:REL]->`             | `cypher`      |

---

## Phase 14c: Header Hierarchy

### Requirements

1. **Single H1 at top** - Only one `# Title` per skill, at the beginning
2. **No skipped levels** - H1 → H2 → H3, never H1 → H3 directly
3. **Use ATX style** - `# Header` not underlines (`===` or `---`)
4. **Content under headers** - Every header should have content before next header

### Valid Header Structure

```markdown
# Skill Name

## Overview

Content here...

## Phase 1: Setup

### Step 1.1

Content here...

### Step 1.2

Content here...

## Phase 2: Implementation

Content here...
```

### Invalid Patterns

```markdown
# Title

### Skipped H2 ← ERROR: Jumped from H1 to H3

## Section

## Empty Section ← WARNING: No content before next header

# Another Title ← WARNING: Setext style (use # instead)
```

---

## Phase 14d: Section Organization (Claude-Automated)

### Required Sections

Skills should have these sections in logical order:

1. **Quick Reference** - Table or bulleted summary at top
2. **When to Use** - Clear trigger conditions
3. **Workflow/How to Use** - Step-by-step process
4. **Related Skills** - Links to related skills

### Section Order Guidelines

```markdown
# Skill Name

## Quick Reference ← Summary table

## When to Use ← Triggers

## Workflow ← Main content

### Phase 1

### Phase 2

## Troubleshooting ← Common issues (optional)

## Related Skills ← Cross-references
```

---

## Phase 14e: Visual Readability (Claude-Automated)

### Requirements

1. **No wall-of-text** - Break paragraphs longer than 5-6 lines
2. **Use emphasis** - **Bold** for important terms, `code` for technical terms
3. **Use lists** - Convert comma-separated items to bullet lists
4. **Adequate whitespace** - Blank line between sections
5. **Use callouts** - `> **Note:**` for important information

### Good Example

```markdown
## Overview

This skill helps you **debug systematically** using the `tracing-root-causes` approach.

Key benefits:

- Faster root cause identification
- Reproducible debugging process
- Clear documentation of findings

> **Note:** Always use TodoWrite to track debugging steps.
```

### Bad Example

```markdown
## Overview

This skill helps you debug systematically using the tracing root causes approach which provides faster root cause identification and reproducible debugging process and clear documentation of findings. Note that you should always use TodoWrite to track debugging steps because it helps maintain context and prevent missed steps during long debugging sessions.
```

---

## Phase 14f: Example Quality (Hybrid)

### Requirements

1. **Before/after format** - Show transformation clearly
2. **Self-contained** - Examples should work without external context
3. **Appropriate code blocks** - Use proper language tags
4. **Relevant** - Examples should match skill purpose

### Good Example Pattern

````markdown
## Example

**Before:**

```typescript
// Unfocused test
test("user flow", async () => {
  // 50 lines of mixed assertions
});
```
````

**After:**

```typescript
// Focused tests
test("validates email format", async () => {
  await expect(validateEmail("bad")).toBe(false);
});

test("accepts valid email", async () => {
  await expect(validateEmail("user@example.com")).toBe(true);
});
```

````

---

## Validation

### Running Phase 14 Audit

```bash
# Navigate to repo root
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT/.claude"

# Run specific Phase 14 sub-phase
npm run -w @chariot/auditing-skills audit -- <skill-name> --phase 14

# Run full audit including Phase 14
npm run -w @chariot/auditing-skills audit -- <skill-name>
````

### Auto-fixable Issues

| Phase | Issue                 | Auto-fix Available             |
| ----- | --------------------- | ------------------------------ | --- | --- | --- |
| 14a   | Missing separator row | Yes (add `                     | --- | --- | `)  |
| 14b   | Missing language tag  | Yes (suggest based on content) |
| 14c   | Skipped header level  | Yes (adjust level)             |
| 14d   | Missing sections      | Partial (Claude generates)     |
| 14e   | Wall-of-text          | No (requires judgment)         |
| 14f   | Poor examples         | No (requires context)          |

---

## Related

- [Line Count Limits](line-count-limits.md) - Overall length constraints
- [Phase Categorization](phase-categorization.md) - Which phases are auto-fixable
- [Skill Compliance Contract](../skill-compliance-contract.md) - Full requirements
