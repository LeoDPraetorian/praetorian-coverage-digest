# Agent Search Workflow

## Overview

The search command finds agents by name, description, category, or skills with relevance scoring.

## Quick Start

```bash
# Search by keyword
npm run --silent search -- "react"

# Filter by category
npm run --silent search -- "test" --type testing

# Limit results
npm run --silent search -- "security" --limit 5

# JSON output
npm run --silent search -- "api" --json
```

## Command Reference

```bash
npm run --silent search -- "<query>"
npm run --silent search -- "<query>" --type <category>
npm run --silent search -- "<query>" --limit <number>
npm run --silent search -- "<query>" --json
```

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `query` | (required) | Search term |
| `--type` | (all) | Filter by category |
| `--limit` | 10 | Max results to show |
| `--json` | false | Output as JSON |

## Scoring Algorithm

Results are ranked by relevance score:

| Match Type | Score |
|------------|-------|
| Name exact match | 100 |
| Name substring | 50 |
| Description match | 30 |
| Category match | 20 |
| Skills match | 10 |
| Valid description bonus | 5 |

### Example Scoring

Query: "react"

| Agent | Name | Desc | Type | Skills | Total |
|-------|------|------|------|--------|-------|
| react-developer | 50 | 30 | 0 | 0 | 80 |
| react-architect | 50 | 30 | 0 | 0 | 80 |
| frontend-developer | 0 | 30 | 0 | 0 | 30 |

## Search Examples

### Find React-Related Agents

```bash
npm run --silent search -- "react"

# Output:
# Search Results for "react":
# ────────────────────────────────────────────────────────────────
# ✓ react-developer (development) [Score: 85]
#    Use when developing React frontend applications...
#
# ✓ react-architect (architecture) [Score: 85]
#    Use when making architectural decisions for React...
#
# ✗ react-code-reviewer (quality) [Score: 90]
#    Use this agent when you need to review React...
```

### Find Testing Agents

```bash
npm run --silent search -- "test" --type testing

# Only shows agents in testing category
```

### Find Security Agents

```bash
npm run --silent search -- "security"

# Matches:
# - security-architect
# - security-risk-assessor
# - go-security-reviewer
```

### Find Backend Agents

```bash
npm run --silent search -- "backend" --limit 5

# Top 5 backend-related agents
```

## Output Format

### Default Output

```
Search Results for "query":
────────────────────────────────────────────────────────────────
✓ agent-name (category) [Score: 85]
   Truncated description (80 chars)...

✗ broken-agent (category) [Score: 50]
   Description using block scalar...
```

Legend:
- ✓ = Valid description (discoverable)
- ✗ = Broken description (invisible to Claude)

### JSON Output

```bash
npm run --silent search -- "react" --json

# Output:
[
  {
    "name": "react-developer",
    "score": 85,
    "type": "development",
    "description": "Use when developing React...",
    "descriptionStatus": "valid"
  },
  ...
]
```

## Common Search Queries

### By Technology

```bash
npm run --silent search -- "react"
npm run --silent search -- "go"
npm run --silent search -- "typescript"
npm run --silent search -- "graphql"
```

### By Task

```bash
npm run --silent search -- "debug"
npm run --silent search -- "review"
npm run --silent search -- "test"
npm run --silent search -- "deploy"
```

### By Domain

```bash
npm run --silent search -- "frontend"
npm run --silent search -- "backend"
npm run --silent search -- "security"
npm run --silent search -- "infrastructure"
```

### By Category

```bash
npm run --silent search -- "" --type architecture
npm run --silent search -- "" --type testing
npm run --silent search -- "" --type quality
```

## Integration with Other Commands

### Find and Audit

```bash
# Find agents
npm run --silent search -- "react" --json | jq '.[].name'

# Audit top result
npm run --silent audit -- react-developer
```

### Find Broken Agents

```bash
# Search and look for ✗ markers
npm run --silent search -- ""  # Empty query lists all with scores

# Or use list with status filter
npm run --silent list -- --status broken
```

## Tips

### Empty Query Lists All

```bash
npm run --silent search -- ""

# Returns all agents ranked by valid description bonus
```

### Combine with Category Filter

```bash
npm run --silent search -- "unit" --type testing

# Narrows to testing category agents matching "unit"
```

### Use JSON for Processing

```bash
# Get all agent names matching query
npm run --silent search -- "security" --json | jq -r '.[].name'

# Filter by score
npm run --silent search -- "api" --json | jq '.[] | select(.score >= 50)'
```

## No Results?

If no results found:

1. Check spelling
2. Try broader terms
3. Try without category filter
4. Use `npm run --silent list` to see all agents

```bash
npm run --silent search -- "zustand"
# No agents found matching: "zustand"
# Try searching for: react, go, test, security, architecture
```

## References

- [List Workflow](./list-workflow.md)
- [Audit Phases](./audit-phases.md)
- [Agent Architecture](../../../docs/AGENT-ARCHITECTURE.md)
