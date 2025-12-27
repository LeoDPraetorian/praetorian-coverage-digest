# Agent List Workflow

**Display all agents organized by category.**

⚠️ **As of December 2024, agent listing uses instruction-based workflow with Glob discovery.**

---

## Overview

Listing shows all available agents grouped by category (architecture, development, testing, etc.) with descriptions and counts.

## How to List Agents

**Route to the listing-agents skill:**

```
Read: .claude/skill-library/claude/agent-management/listing-agents/SKILL.md
```

The `listing-agents` skill provides the complete workflow.

---

## What the Workflow Provides

### Comprehensive Listing

- **Category grouping** - All agents organized by 8 categories
- **Alphabetical sorting** - Within each category
- **Descriptions shown** - First 80 chars of each agent's purpose
- **Counts provided** - Per category and total
- **Browsing-optimized** - For discovering available agents

### Categories

| Category     | Count | Purpose                    |
| ------------ | ----- | -------------------------- |
| Architecture | 7     | Design decisions, patterns |
| Development  | 16    | Implementation, coding     |
| Testing      | 8     | Unit, integration, E2E     |
| Quality      | 5     | Code review, auditing      |
| Analysis     | 6     | Security, complexity       |
| Research     | 3     | Web search, documentation  |
| Orchestrator | 8     | Coordination, workflows    |
| MCP Tools    | 2     | Specialized MCP access     |

**Total:** ~55 agents (as of December 2024)

---

## Why Instruction-Based?

Listing requires discovery and formatting:

- **Glob discovery** - Find all agent files across categories
- **Frontmatter reading** - Extract name and description
- **Grouping** - Organize by category
- **Formatting** - Present in readable table format

---

## Time Estimate

- **Typical:** 30-60 seconds

---

## Prerequisites

None - the listing-agents skill handles all setup internally.

---

## Documentation

**Full workflow details:**
`.claude/skill-library/claude/agent-management/listing-agents/SKILL.md`

**Related references:**

- [Search Workflow](search-workflow.md) - Keyword-based discovery
- [Directory Structure](directory-structure.md) - Agent organization
