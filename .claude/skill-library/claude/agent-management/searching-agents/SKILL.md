---
name: searching-agents
description: Use when finding agents by keyword - searches names, descriptions, types, skills with relevance scoring. Fast discovery in 30-60 seconds.
allowed-tools: Bash, Read
---

# Searching Agents

**Keyword discovery across all agents with relevance scoring.**

> **Compliance**: This skill USES the [Agent Compliance Contract](../../../../skills/managing-agents/references/agent-compliance-contract.md).

---

## What This Skill Does

Searches for agents by keyword across:

- **Agent names** (highest relevance: 100 points exact, 50 points substring)
- **Descriptions** (high relevance: 30 points)
- **Agent types/categories** (medium relevance: 20 points)
- **Skills referenced** (low relevance: 10 points)

Returns scored results sorted by relevance.

---

## When to Use

- Finding agents for specific tasks ("Which agent handles React?")
- Discovering available agents by capability
- Checking if an agent exists ("Do we have a Python agent?")
- Exploring agent capabilities by domain

**Common workflow:**

```
Search → Find relevant agents → Select best match → Use with Task tool
```

---

## Quick Reference

| Search Type    | Command                     | Example             |
| -------------- | --------------------------- | ------------------- |
| Basic search   | `npm run search -- "query"` | Find React agents   |
| Filter by type | `--type <category>`         | Only testing agents |
| Limit results  | `--limit N`                 | Show top 5 matches  |

---

## Step 0: Navigate to Repository Root (MANDATORY)

**Execute BEFORE any search operation:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

**See:** [Repository Root Navigation](../../../../skills/managing-agents/references/patterns/repo-root-detection.md)

**⚠️ If agent file not found:** You are in the wrong directory. Navigate to repo root first. Never assume "built-in agent" or "system agent" - the file exists, you're looking in the wrong place.

**Cannot proceed without navigating to repo root** ✅

---

## How to Use

### Basic Search

**Setup:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
cd "$ROOT/.claude/skill-library/claude/agent-management/searching-agents/scripts"
```

**Execute:**

```bash
npm run search -- "react"
```

**Output:**

```
Search Results for "react":
────────────────────────────────────────────────────────────────────────────────
✓ frontend-developer (development) [Score: 35]
   Use when developing React frontend - components, UI bugs, performance...

✓ frontend-architect (architecture) [Score: 35]
   Use when making architectural decisions for React frontend applications...

Showing 3 of 8 results. Use --limit to see more.
```

### Filter by Category

```bash
npm run search -- "security" --type analysis
```

**Valid categories:**

- `architecture` - Design and architecture decisions
- `development` - Implementation and coding
- `testing` - Unit, integration, E2E testing
- `quality` - Code review and auditing
- `analysis` - Security and complexity assessment
- `research` - Web search and documentation
- `orchestrator` - Coordination and workflows
- `mcp-tools` - Specialized MCP access

### Limit Results

```bash
npm run search -- "developer" --limit 5
```

---

## Interpreting Results

### Score Ranges

| Score     | Meaning                          | Example                                  |
| --------- | -------------------------------- | ---------------------------------------- |
| **100+**  | Exact name + description match   | Exact agent name (100) + desc (30) = 130 |
| **50-79** | Name match OR strong description | Name substring (50)                      |
| **30-49** | Description match only           | Mentions term (30)                       |
| **10-29** | Type or skills match (weak)      | Category match (20)                      |

**Scores are additive** - an agent can match multiple categories.

### Result Format

```
✓ agent-name (category) [Score: XX]
   Description (first 80 chars)...
```

**Icons:**

- ✓ (green) = Valid description
- ✗ (red) = Invalid/missing description

---

## Quick Examples

### Find by Capability

```bash
npm run search -- "react"
# → frontend-developer, frontend-architect, frontend-reviewer
```

### Filter by Domain

```bash
npm run search -- "frontend" --type testing
# → frontend-browser-test-engineer, frontend-unit-test-engineer
```

### Check Existence

```bash
npm run search -- "python"
# → python-developer [Score: 130]
```

### Broad Discovery

```bash
npm run search -- "" --type development
# → All 16 development agents
```

**For detailed examples, see `references/search-examples.md`.**

---

## Common Questions

### Q: How do I see ALL agents?

Use `listing-agents` skill instead - searching is for finding specific agents.

### Q: Why did search find agents I didn't expect?

Scoring is additive. An agent can match via name, description, type, AND skills.

### Q: How do I find agents by exact name?

```bash
npm run search -- "frontend-developer"
```

Exact match = score 100+.

---

## Error Handling

### Invalid Category

```
⚠️  Tool Error - Invalid category: invalid-category
Valid categories: architecture, development, testing, quality, analysis, research, orchestrator, mcp-tools
```

**Action:** Check spelling, use valid category.

### No Matches

```
No agents found matching: "cobol"
Try searching for: react, go, test, security, architecture
```

**Action:** Try broader terms or different technology.

---

## See Also

- `listing-agents` - List ALL agents by category
- `creating-agents` - Create new agent if search finds nothing
- `agent-manager` - Routes search operations

**Reference files:**

- `references/search-examples.md` - Complete examples and advanced usage
