# Visual/Style Guidelines

**Single source of truth for SKILL.md visual formatting and style requirements.**

This pattern is referenced by:

- `auditing-skills` - Validates table, code block, and header formatting (Phases 14-16)
- `creating-skills` - Ensures new skills follow style guidelines
- `fixing-skills` - Restores style compliance (Phase 14 deterministic fixes)

---

## Why Style Matters

**Readability impacts comprehension.** Skills are read by both Claude agents and human developers. Poor formatting:

1. **Breaks rendering** - Malformed tables render as plain text
2. **Confuses syntax highlighting** - Missing language tags disable highlighting
3. **Disrupts navigation** - Inconsistent headers make skills hard to scan
4. **Wastes cognitive load** - Readers spend energy parsing instead of understanding

**Consistent style** is the solution: Follow markdown best practices across all skills.

---

## Visual/Style Phases

| Phase | Name               | Type            | What It Checks                            |
| ----- | ------------------ | --------------- | ----------------------------------------- |
| 14    | Table Formatting   | Deterministic   | Header rows, separators, column counts    |
| 15    | Code Block Quality | Validation-Only | Language tags, line length, content match |
| 16    | Header Hierarchy   | Validation-Only | H1 count, level skipping, orphan headers  |

> **Note:** Section organization, visual readability, and example quality are checked during **Post-Audit Semantic Review**. See [auditing-skills](.claude/skill-library/claude/skill-management/auditing-skills/SKILL.md) for semantic review details.

---

## Phase 14: Table Formatting

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

## Phase 15: Code Block Quality

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

## Phase 16: Header Hierarchy

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

## Validation

### Running Phase 14 Audit

```bash
To audit visual style compliance, invoke auditing-skills to verify compliance with all phase requirements.

This will check Phase 14 (table formatting), Phase 15 (code block quality), and Phase 16 (header hierarchy).
```

### Auto-fixable Issues

| Phase | Issue                 | Auto-fix Available      |
| ----- | --------------------- | ----------------------- |
| 14    | Missing separator row | Yes (add separator row) |
| 15    | Missing language tag  | No (validation only)    |
| 16    | Skipped header level  | No (validation only)    |

> **Note:** Section organization, visual readability, and example quality are checked during **Post-Audit Semantic Review**. See [auditing-skills](.claude/skill-library/claude/skill-management/auditing-skills/SKILL.md) for semantic review details.

---

## Related

- [Line Count Limits](line-count-limits.md) - Overall length constraints
- [Phase Categorization](phase-categorization.md) - Which phases are auto-fixable
- [Skill Compliance Contract](../skill-compliance-contract.md) - Full requirements
