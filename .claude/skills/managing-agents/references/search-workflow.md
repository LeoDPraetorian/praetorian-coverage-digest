# Agent Search Workflow

**Keyword-based agent discovery with relevance scoring.**

⚠️ **As of December 2024, agent searching uses instruction-based workflow with CLI wrapper for scoring algorithm.**

---

## Overview

Searching finds agents by keyword across names, descriptions, types, and skills. Results are ranked by relevance score (0-100+ points).

## How to Search for Agents

**Route to the searching-agents skill:**

```
Read: .claude/skill-library/claude/agent-management/searching-agents/SKILL.md
```

The `searching-agents` skill provides the complete workflow.

---

## What the Workflow Provides

### Keyword Search

- **Searches across** - Names, descriptions, types, skills
- **Relevance scoring** - Ranks by match quality (0-100+ points)
- **Category filtering** - Optional filter by agent type
- **Result limiting** - Show top N matches
- **Score interpretation** - Explains what scores mean

### Scoring Algorithm

| Match Type              | Points |
| ----------------------- | ------ |
| Name exact match        | 100    |
| Name substring          | 50     |
| Description match       | 30     |
| Type match              | 20     |
| Skills match            | 10     |
| Valid description bonus | 5      |

---

## Why Instruction-Based?

Searching requires specialized capabilities:

- **Portable repo root resolution** - Works in super-repo and normal repo
- **CLI wrapper** - Scoring algorithm implementation
- **Result interpretation** - Contextual recommendations
- **Task tool integration** - Search → select → use workflow

---

## Time Estimate

- **Typical:** 30-60 seconds

---

## Prerequisites

None - the searching-agents skill handles all setup internally.

---

## Documentation

**Full workflow details:**
`.claude/skill-library/claude/agent-management/searching-agents/SKILL.md`

**Related references:**

- [List Workflow](list-workflow.md) - Browse all agents
- [Directory Structure](directory-structure.md) - Agent organization
