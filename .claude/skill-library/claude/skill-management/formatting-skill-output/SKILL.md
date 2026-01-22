---
name: formatting-skill-output
description: Use when outputting structured findings (audit results, agent recommendations) - provides deterministic table formatting via CLI to solve non-deterministic Claude output
allowed-tools: Bash, Read, Grep, TodoWrite
---

# Formatting Skill Output

**Deterministic output formatting for skill management operations.**

> **You MUST use TodoWrite** when integrating this skill into consumer skills to track the conversion from non-deterministic to deterministic output.

## Problem This Skill Solves

Claude's text generation is **inherently non-deterministic**. Same instructions produce different formatting, prose, and spacing each run. This breaks:

- User experience (inconsistent output)
- Automation (cannot rely on format)
- Testing (output varies)

**Known issue:** [anthropics/claude-code#3370](https://github.com/anthropics/claude-code/issues/3370)

---

## Solution: "Claude Reasons, CLI Formats"

```
┌─────────────────────────────────────────────────────────────┐
│  Claude performs reasoning (semantic review, agent analysis) │
│  Claude outputs STRUCTURED JSON (not tables, not prose)      │
│  CLI takes JSON → outputs DETERMINISTIC formatted table      │
│  Same input → Same output, ALWAYS                            │
└─────────────────────────────────────────────────────────────┘
```

**Key principle:** Claude does reasoning, CLI does formatting.

---

## Quick Reference

| Consumer Skill   | JSON Schema              | Output Type          |
| ---------------- | ------------------------ | -------------------- |
| auditing-skills  | `SemanticFindingsSchema` | Combined audit table |
| syncing-gateways | `GatewayFindingsSchema`  | Gateway sync results |

---

## How to Use

### For Skill Authors (Consumer Skills)

**Step 1: Import the formatter in your CLI**

```typescript
import {
  formatFindingsTable,
  Finding,
} from "../../../formatting-skill-output/scripts/src/lib/table-formatter";
```

**Step 2: Have Claude output JSON (in SKILL.md instructions)**

```markdown
Output findings as JSON only. Do NOT output tables or prose.

{
"findings": [
{
"severity": "WARNING",
"phase": "Semantic: Gateway Membership",
"issue": "Frontend skill missing from gateway-frontend",
"recommendation": "Add to gateway-frontend routing table"
}
]
}
```

**Step 3: CLI merges and formats**

```typescript
const allFindings: Finding[] = [
  ...structuralFindings,
  ...semanticFindings.map((f) => ({ ...f, source: "semantic" as const })),
];

console.log(formatFindingsTable(allFindings));
console.log(formatCompletionMessage(counts));
```

### Standalone CLI Usage

```bash
# Format findings from JSON file
npm run -w @chariot/formatting-skill-output format -- --input findings.json

# Format findings from stdin
echo '{"findings": [...]}' | npm run -w @chariot/formatting-skill-output format
```

---

## JSON Schemas

### SemanticFindingsSchema (for auditing-skills)

```typescript
interface SemanticFinding {
  severity: "CRITICAL" | "WARNING" | "INFO";
  criterion:
    | "Description Quality"
    | "Skill Categorization"
    | "Gateway Membership"
    | "Tool Appropriateness"
    | "Content Density"
    | "External Documentation"
    | "Phase Numbering Hygiene";
  issue: string; // max 100 chars
  recommendation: string; // max 100 chars
}
```

---

## Output Format

The CLI produces a deterministic ANSI-formatted table:

```
╔══════════════╤════════════════════════════╤════════════════════════════════════════════════════════════╤════════════════════════════════════════════════════════════╗
║ Severity     │ Phase                      │ Issue                                                      │ Recommendation                                             ║
╟──────────────┼────────────────────────────┼────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────╢
║ ● CRITICAL   │ Semantic: Gateway Membersh │ Frontend skill missing from gateway-frontend               │ Add to gateway-frontend routing table                      ║
╟──────────────┼────────────────────────────┼────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────╢
║ ▲ WARNING    │ Semantic: Description Qual │ Missing key term "ESLint" in description                   │ Add framework name for better discoverability              ║
╚══════════════╧════════════════════════════╧════════════════════════════════════════════════════════════╧════════════════════════════════════════════════════════════╝
```

**Guarantees:**

- Fixed column widths (14, 28, 60, 60 chars)
- Sorted by severity (CRITICAL → WARNING → INFO)
- Consistent truncation with ellipsis
- Identical ANSI color codes

---

## Integration Guide

### Updating auditing-skills

**In SKILL.md "Performing Semantic Review" section:**

```markdown
### Output Format

Output semantic findings as JSON only:

{
"findings": [
{ "severity": "...", "criterion": "...", "issue": "...", "recommendation": "..." }
]
}

Do NOT output tables. The CLI will format the combined output.
```

**In audit.ts:**

```typescript
import { formatFindingsTable } from "../../../formatting-skill-output/scripts/src/lib/table-formatter";

// After getting semantic JSON from Claude
const semanticFindings = JSON.parse(semanticJson);

const allFindings = [
  ...structuralFindings,
  ...semanticFindings.findings.map((f) => ({
    severity: f.severity,
    phase: `Semantic: ${f.criterion}`,
    issue: f.issue,
    recommendation: f.recommendation,
    source: "semantic" as const,
  })),
];

console.log(formatFindingsTable(allFindings));
```

---

## API Reference

### `formatFindingsTable(findings: Finding[]): string`

Formats an array of findings into a deterministic ANSI table.

**Parameters:**

- `findings` - Array of Finding objects

**Returns:** Formatted table string with ANSI color codes

### `formatCompletionMessage(counts: FindingCounts): string`

Formats the completion summary message.

**Parameters:**

- `counts` - Object with critical, warning, info counts for structural and semantic

**Returns:** Formatted completion message

### `validateFindings(json: unknown): Finding[]`

Validates and parses JSON input against the schema.

**Throws:** Error if JSON doesn't match schema

---

## Integration

### Called By

- **`auditing-skills`** (LIBRARY) - Primary consumer for semantic review output formatting
  - `Read(".claude/skill-library/claude/skill-management/auditing-skills/SKILL.md")`

- **`syncing-gateways`** (LIBRARY) - Consumer for gateway sync result formatting
  - `Read(".claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md")`

### Requires (invoke before starting)

None - Entry point skill for output formatting

### Calls (during execution)

None - Provides formatting utilities only, does not invoke other skills

### Pairs With (conditional)

| Skill              | Trigger                    | Purpose                                                |
| ------------------ | -------------------------- | ------------------------------------------------------ |
| `auditing-skills`  | Semantic review completion | Formats semantic findings into deterministic tables    |
| `syncing-gateways` | Gateway sync completion    | Formats gateway sync results into deterministic tables |

---

## Changelog

See `.history/CHANGELOG` for version history.
