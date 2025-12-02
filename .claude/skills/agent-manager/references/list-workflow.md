# Agent List Workflow

## Overview

The list command shows all agents with their status, line count, and compliance metrics.

## Quick Start

```bash
# List all agents
npm run --silent list

# Filter by category
npm run --silent list -- --type development

# Filter by status
npm run --silent list -- --status broken

# Just names
npm run --silent list -- --quiet

# JSON output
npm run --silent list -- --json
```

## Command Reference

```bash
npm run --silent list
npm run --silent list -- --type <category>
npm run --silent list -- --status <valid|broken|all>
npm run --silent list -- --quiet
npm run --silent list -- --json
```

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--type` | (all) | Filter by category |
| `--status` | all | Filter by description status |
| `--quiet` | false | Only show names |
| `--json` | false | Output as JSON |

## Output Columns

### Default Table

```
Agents:
────────────────────────────────────────────────────────────────────────────────────────────────
Name                               Category       Lines  Description           Gateway  Output
────────────────────────────────────────────────────────────────────────────────────────────────
acceptance-test-engineer           testing        189    ✗ block |             ✗        ✗
react-developer                    development    336    ✓ valid               ✓        ✓
react-architect                    architecture   248    ✓ valid               ✓        ✓
────────────────────────────────────────────────────────────────────────────────────────────────
```

| Column | Description |
|--------|-------------|
| Name | Agent name (from frontmatter) |
| Category | architecture, development, testing, etc. |
| Lines | Total line count (colored by limit) |
| Description | Status: valid, block \|, block >, missing, empty |
| Gateway | Has gateway skill in frontmatter |
| Output | Has output format section |

### Line Count Colors

- **White**: <250 lines (good)
- **Yellow**: 250-300 lines (warning)
- **Red**: >300 lines (error)

### Description Status Icons

- ✓ valid - Single-line, properly formatted
- ✗ block | - Uses pipe block scalar (broken)
- ✗ block > - Uses folded block scalar (broken)
- ✗ missing - No description field
- ⚠ empty - Empty description

## Filter by Category

```bash
npm run --silent list -- --type development

# Valid categories:
# - architecture
# - development
# - testing
# - quality
# - analysis
# - research
# - orchestrator
# - mcp-tools
```

## Filter by Status

```bash
# Only valid (discoverable) agents
npm run --silent list -- --status valid

# Only broken (invisible) agents
npm run --silent list -- --status broken
```

## Output Formats

### Quiet Mode (Names Only)

```bash
npm run --silent list -- --quiet

# Output:
# acceptance-test-engineer
# agent-sdk-verifier-py
# react-developer
# ...
```

### JSON Mode

```bash
npm run --silent list -- --json

# Output:
[
  {
    "name": "react-developer",
    "type": "development",
    "lines": 336,
    "descriptionStatus": "valid",
    "hasGatewaySkill": true,
    "hasOutputFormat": true,
    "hasEscalationProtocol": true
  },
  ...
]
```

## Summary Statistics

At the bottom of the default output:

```
Total: 54 | Valid: 3 | Broken: 51

By category: architecture: 7, development: 16, testing: 8, quality: 5, analysis: 6, research: 3, orchestrator: 8, mcp-tools: 2
```

## Common Use Cases

### Find Agents to Fix

```bash
# List all broken agents
npm run --silent list -- --status broken

# Get names for scripting
npm run --silent list -- --status broken --quiet
```

### Check Category Health

```bash
# Check testing agents
npm run --silent list -- --type testing

# Check architecture agents
npm run --silent list -- --type architecture
```

### Export for Analysis

```bash
# Export to JSON file
npm run --silent list -- --json > agents.json

# Process with jq
npm run --silent list -- --json | jq '.[] | select(.lines > 300)'
```

### Count by Status

```bash
# Count valid agents
npm run --silent list -- --status valid --quiet | wc -l

# Count broken agents
npm run --silent list -- --status broken --quiet | wc -l
```

## Integration with Other Commands

### List Then Audit

```bash
# Find broken agents and audit them
for agent in $(npm run --silent list -- --status broken --quiet 2>/dev/null); do
  echo "Auditing $agent..."
  npm run --silent audit -- $agent --quiet
done
```

### List Then Fix

```bash
# Fix all broken agents
for agent in $(npm run --silent list -- --status broken --quiet 2>/dev/null); do
  echo "Fixing $agent..."
  npm run --silent fix -- $agent --all-auto
done
```

### Generate Report

```bash
# Create markdown report
echo "# Agent Status Report" > report.md
echo "" >> report.md
echo "## Summary" >> report.md
npm run --silent list -- --json | jq -r '
  "- Total: \(length)\n- Valid: \([.[] | select(.descriptionStatus == \"valid\")] | length)\n- Broken: \([.[] | select(.descriptionStatus != \"valid\")] | length)"
' >> report.md
```

## Troubleshooting

### Empty List

If no agents shown:
1. Verify you're in the correct directory
2. Check `.claude/agents/` exists
3. Run from repo root

### Wrong Count

If count seems off:
1. Check for `.archived/` agents (excluded from list)
2. Verify agents have `.md` extension
3. Check for parse errors in output

### Parse Warnings

If you see "Warning: Could not parse...":
1. Check the agent file for YAML errors
2. Run `npm run --silent audit -- <agent>` for details

## References

- [Search Workflow](./search-workflow.md)
- [Audit Phases](./audit-phases.md)
- [Agent Architecture](../../../docs/AGENT-ARCHITECTURE.md)
