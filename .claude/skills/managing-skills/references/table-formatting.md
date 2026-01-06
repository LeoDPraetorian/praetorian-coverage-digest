# Table Formatting Requirements

**Centralized single source of truth for markdown table formatting in skills.**

This is a **cross-cutting concern** that applies to:

- `creating-skills` - Format tables during creation
- `updating-skills` - Format tables during updates
- `auditing-skills` - Validate table formatting (Phase 14)
- `fixing-skills` - Auto-fix table formatting (Tier 1: Deterministic)

---

## Overview

All markdown tables in skill files MUST be formatted using Prettier. This ensures:

1. **Consistency** - All tables have identical formatting across skills
2. **Readability** - Properly aligned columns improve scanning
3. **Determinism** - Same input always produces identical output
4. **Automation** - Can be validated and fixed programmatically

---

## Validation Requirements

### CLI Validation Command

```bash
# Check if tables are formatted correctly (returns exit code 1 if not)
npx prettier --check --parser markdown <file>

# Check specific skill
npx prettier --check .claude/skills/my-skill/SKILL.md
npx prettier --check ".claude/skills/my-skill/**/*.md"
```

### Audit Phase Integration

**Phase 14: Table Formatting Validation**

| Aspect   | Details                                  |
| -------- | ---------------------------------------- |
| Phase    | 14 (Deterministic)                       |
| Tier     | 1 (Deterministic)                        |
| Severity | WARNING (auto-fixable)                   |
| Check    | `npx prettier --check --parser markdown` |
| Auto-Fix | `npx prettier --write --parser markdown` |

---

## Auto-Fix Approach

### Tier 1: Deterministic Fix

Table formatting is a **Tier 1 (Deterministic)** fix because:

- One correct answer exists (Prettier's output)
- No semantic interpretation needed
- Safe to apply automatically without user confirmation

### Fix Command

```bash
# Auto-fix table formatting
npx prettier --write --parser markdown <file>

# Fix all markdown files in a skill
npx prettier --write ".claude/skills/my-skill/**/*.md"

# Fix with specific config (if needed)
npx prettier --write --parser markdown --prose-wrap preserve <file>
```

### Integration with fixing-skills

When `fixing-skills` detects Phase 14 failures:

1. Categorize as Tier 1 (Deterministic)
2. Apply fix automatically: `npx prettier --write`
3. No user confirmation required
4. Re-audit to verify fix

---

## Table Formatting Standards

### Required Format

| Requirement            | Description                           |
| ---------------------- | ------------------------------------- | --- | --- |
| Column alignment       | Pipes aligned vertically              |
| Header separator       | Dashes with pipes: `                  | --- | `   |
| Cell spacing           | Single space padding inside cells     |
| No trailing whitespace | Clean line endings                    |
| Consistent width       | Column widths consistent within table |

### Prettier Configuration

Prettier handles markdown tables with these defaults:

```json
{
  "parser": "markdown",
  "proseWrap": "preserve",
  "tabWidth": 2
}
```

No special configuration needed - Prettier's defaults produce compliant tables.

---

## Examples

### Correct Formatting

```markdown
| Column A | Column B | Column C |
| -------- | -------- | -------- |
| Value 1  | Value 2  | Value 3  |
| Long val | Short    | Medium   |
```

**Characteristics:**

- Pipes aligned vertically
- Header separator row present
- Consistent spacing in cells
- Column widths accommodate longest value

### Incorrect Formatting

```markdown
| Column A | Column B | Column C |
| -------- | -------- | -------- |
| Value 1  | Value 2  | Value 3  |
| Long val | Short    | Medium   |
```

**Issues:**

- No spacing around cell content
- Inconsistent separator widths
- Poor readability

### Another Incorrect Example

```markdown
| Column A | Column B | Column C |
| -------- | -------- | -------- |
| Value 1  | Value 2  | Value 3  |
| Long val | Short    | Medium   |
```

**Issues:**

- Separator width doesn't match column width
- Column widths inconsistent

---

## Workflow Integration

### In creating-skills (Phase 6: Generation)

After generating SKILL.md content:

```bash
# Format tables before completing generation
npx prettier --write --parser markdown {skill-path}/SKILL.md
```

### In updating-skills (Phase 4: Edit)

After applying edits:

```bash
# Format tables after edit
npx prettier --write --parser markdown {skill-path}/SKILL.md
```

### In auditing-skills (Phase 14)

Add to structural validation:

```typescript
// In audit-engine.ts
async function validatePhase14(skillPath: string): Promise<PhaseResult> {
  const result = await exec(`npx prettier --check --parser markdown "${skillPath}"`);
  return {
    phase: "14",
    status: result.exitCode === 0 ? "pass" : "warn",
    message:
      result.exitCode === 0
        ? "Table formatting valid"
        : "Tables need formatting (auto-fixable with prettier --write)",
  };
}
```

### In fixing-skills (Tier 1 Fixes)

Add to deterministic fixes:

```typescript
// In fix.ts
const TIER1_FIXES = {
  // ... existing fixes
  "14": async (skillPath: string) => {
    await exec(`npx prettier --write --parser markdown "${skillPath}"`);
    return { fixed: true, message: "Table formatting fixed with Prettier" };
  },
};
```

---

## Edge Cases

### Tables in Code Blocks

Tables inside fenced code blocks (` ``` `) are NOT formatted by Prettier. This is correct behavior - code examples should preserve their original formatting.

### Tables in References

Reference files (`references/*.md`) should also have formatted tables. Run Prettier on all markdown files:

```bash
npx prettier --write ".claude/skills/my-skill/**/*.md"
```

### Large Tables

Very wide tables may wrap awkwardly. Consider:

1. Using shorter column headers
2. Abbreviating repeated content
3. Splitting into multiple tables
4. Moving to a reference file

---

## Troubleshooting

### Prettier Not Installed

```bash
# Install prettier if not available
npm install --save-dev prettier

# Or use npx (downloads on demand)
npx prettier --version
```

### Parser Errors

If Prettier fails to parse:

1. Check for unclosed code blocks
2. Verify table syntax is valid markdown
3. Look for unescaped pipe characters in cell content

### Tables Not Being Formatted

Ensure:

1. File extension is `.md`
2. Using `--parser markdown` flag
3. Table syntax is valid (header + separator + rows)

---

## Related References

- [Progressive Disclosure](progressive-disclosure.md) - When to extract tables to references
- [Phase Categorization](patterns/phase-categorization.md) - How Phase 14 fits in audit
- [fixing-skills](.claude/skill-library/claude/skill-management/fixing-skills/SKILL.md) - How fixes are applied
