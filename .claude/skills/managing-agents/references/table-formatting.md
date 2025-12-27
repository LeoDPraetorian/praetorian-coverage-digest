# Table Formatting Requirements

**Centralized single source of truth for markdown table formatting in agent files.**

This is a **cross-cutting concern** that applies to:

- `creating-agents` - Format tables during agent creation
- `updating-agents` - Format tables during agent updates
- `auditing-agents` - Validate table formatting (Phase 14g)
- `fixing-agents` - Auto-fix table formatting (Tier 1: Deterministic)

---

## Overview

All markdown tables in agent files MUST be formatted using Prettier. This ensures:

1. **Consistency** - All tables have identical formatting across agents
2. **Readability** - Properly aligned columns improve scanning
3. **Determinism** - Same input always produces identical output
4. **Automation** - Can be validated and fixed programmatically

---

## Validation Requirements

### CLI Validation Command

```bash
# Check if tables are formatted correctly (returns exit code 1 if not)
npx prettier --check --parser markdown <file>

# Check specific agent
npx prettier --check .claude/agents/{category}/{agent-name}.md
```

### Audit Phase Integration

**Phase 14g: Table Formatting Validation**

| Aspect   | Details                                  |
| -------- | ---------------------------------------- |
| Phase    | 14g (sub-phase of Reference Validation)  |
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

# Fix specific agent file
npx prettier --write .claude/agents/{category}/{agent-name}.md

# Fix all agent files in a category
npx prettier --write ".claude/agents/{category}/*.md"
```

### Integration with fixing-agents

When `fixing-agents` detects Phase 14g failures:

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

---

## Workflow Integration

### In creating-agents (Generation Phase)

After generating agent .md content:

```bash
# Format tables before completing generation
npx prettier --write --parser markdown .claude/agents/{category}/{agent-name}.md
```

### In updating-agents (Edit Phase)

After applying edits:

```bash
# Format tables after edit
npx prettier --write --parser markdown .claude/agents/{category}/{agent-name}.md
```

### In auditing-agents (Phase 14g)

Add to structural validation:

```typescript
// In audit-engine.ts
async function validatePhase14g(agentPath: string): Promise<PhaseResult> {
  const result = await exec(`npx prettier --check --parser markdown "${agentPath}"`);
  return {
    phase: "14g",
    status: result.exitCode === 0 ? "pass" : "warn",
    message:
      result.exitCode === 0
        ? "Table formatting valid"
        : "Tables need formatting (auto-fixable with prettier --write)",
  };
}
```

### In fixing-agents (Tier 1 Fixes)

Add to deterministic fixes:

```typescript
// In fix.ts
const TIER1_FIXES = {
  // ... existing fixes
  "14g": async (agentPath: string) => {
    await exec(`npx prettier --write --parser markdown "${agentPath}"`);
    return { fixed: true, message: "Table formatting fixed with Prettier" };
  },
};
```

---

## Agent-Specific Considerations

### Common Tables in Agent Files

Agent files typically contain tables for:

| Table Type      | Location         | Example Content                  |
| --------------- | ---------------- | -------------------------------- |
| Tool access     | Frontmatter area | Which tools agent can use        |
| Decision matrix | Body             | When to use vs not use           |
| Phase/workflow  | Body             | Step-by-step processes           |
| Related agents  | Bottom section   | Cross-references to other agents |

### Agent Directory Structure

```
.claude/agents/
├── architecture/     # Architect agents
├── development/      # Developer agents
├── testing/          # Test engineer agents
├── analysis/         # Analysis/review agents
└── orchestration/    # Orchestrator agents
```

All `.md` files in these directories should have formatted tables.

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

- [Lean Agent Pattern](lean-agent-pattern.md) - Agent file structure guidelines
- [Audit Phases](audit-phases.md) - How Phase 14g fits in agent audit
- [Fix Workflow](fix-workflow.md) - How Tier 1 fixes are applied
