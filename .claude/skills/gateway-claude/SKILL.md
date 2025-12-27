---
name: gateway-claude
description: Use when managing Claude Code infrastructure (agents, skills, commands, MCP tools) - create, update, audit, fix, search, list. Routes to specialized management operations.
allowed-tools: Read, Skill
---

# Gateway: Claude Code Management

**Routes to specialized skills for managing Claude Code infrastructure (agents, skills, commands, MCP tools).**

---

## Understanding This Gateway

**How you got here**: You invoked this gateway via Skill tool:

```
skill: "gateway-claude"
```

**What this gateway provides**: A routing table of **library skills** with their paths.

**How to load library skills**: Use the Read tool with the full path:

```
Read(".claude/skill-library/claude/agent-management/creating-agents/SKILL.md")
```

### Critical: Two-Tier Skill System

**Core/Gateway tier** (in `skills` directory):

- Location: `.claude/skills/{skill-name}/`
- Invoke with: `skill: "gateway-claude"`

**Library tier** (in `skill-library` directory):

- Location: `.claude/skill-library/{domain}/{category}/`
- Invoke with: `Read("{full-path}")`

<IMPORTANT>
Library skills listed below are NOT available via Skill tool.
You MUST use Read tool to load them.

❌ WRONG: skill: "creating-agents" ← Will fail, not a core skill
✅ RIGHT: Read(".claude/skill-library/claude/agent-management/creating-agents/SKILL.md")

❌ WRONG: skill: "auditing-skills" ← Will fail, not a core skill
✅ RIGHT: Read(".claude/skill-library/claude/skill-management/auditing-skills/SKILL.md")
</IMPORTANT>

---

## When to Use

- Managing agents (create, update, test, audit, fix, rename, search, list)
- Managing skills (create, update, audit, fix, rename, migrate, search, list)
- Managing commands (create, audit, fix, list)
- Managing MCP wrappers (create, test, audit, fix)

**This gateway routes you to the appropriate management skill based on what you're managing.**

---

## Agent Management (8 operations)

**Router Skill:** `.claude/skills/managing-agents/SKILL.md`

The managing-agents skill routes to:

| Operation | Skill                                                                         |
| --------- | ----------------------------------------------------------------------------- |
| Create    | `.claude/skill-library/claude/agent-management/creating-agents/SKILL.md`      |
| Update    | `.claude/skill-library/claude/agent-management/updating-agents/SKILL.md`      |
| Test      | `.claude/skill-library/claude/agent-management/testing-agent-skills/SKILL.md` |
| Audit     | `.claude/skill-library/claude/agent-management/auditing-agents/SKILL.md`      |
| Fix       | `.claude/skill-library/claude/agent-management/fixing-agents/SKILL.md`        |
| Rename    | `.claude/skill-library/claude/agent-management/renaming-agents/SKILL.md`      |
| Search    | `.claude/skill-library/claude/agent-management/searching-agents/SKILL.md`     |
| List      | `.claude/skill-library/claude/agent-management/listing-agents/SKILL.md`       |

**Usage:**

```
# Via command (recommended)
/agent-manager <operation> <args>

# Via managing-agents skill
skill: "managing-agents"

# Direct skill access
Read: .claude/skill-library/claude/agent-management/creating-agents/SKILL.md
```

---

## Skill Management (12 operations)

**Router Skill:** `.claude/skills/managing-skills/SKILL.md`

The managing-skills skill routes to:

| Operation     | Skill                                                                            |
| ------------- | -------------------------------------------------------------------------------- |
| Create        | `.claude/skill-library/claude/skill-management/creating-skills/SKILL.md`         |
| Update        | `.claude/skill-library/claude/skill-management/updating-skills/SKILL.md`         |
| Delete        | `.claude/skill-library/claude/skill-management/deleting-skills/SKILL.md`         |
| Audit         | `.claude/skill-library/claude/skill-management/auditing-skills/SKILL.md`         |
| Fix           | `.claude/skill-library/claude/skill-management/fixing-skills/SKILL.md`           |
| Rename        | `.claude/skill-library/claude/skill-management/renaming-skills/SKILL.md`         |
| Migrate       | `.claude/skill-library/claude/skill-management/migrating-skills/SKILL.md`        |
| Search        | `.claude/skill-library/claude/skill-management/searching-skills/SKILL.md`        |
| List          | `.claude/skill-library/claude/skill-management/listing-skills/SKILL.md`          |
| Sync Gateways | `.claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md`        |
| Format Output | `.claude/skill-library/claude/skill-management/formatting-skill-output/SKILL.md` |
| Research      | `.claude/skill-library/claude/skill-management/researching-skills/SKILL.md`      |

**Usage:**

```
# Via command (recommended)
/skill-manager <operation> <args>

# Via managing-skills skill
skill: "managing-skills"

# Direct skill access (instruction-based operations)
Read: .claude/skill-library/claude/skill-management/creating-skills/SKILL.md
Read: .claude/skill-library/claude/skill-management/updating-skills/SKILL.md
Read: .claude/skill-library/claude/skill-management/deleting-skills/SKILL.md
Read: .claude/skill-library/claude/skill-management/auditing-skills/SKILL.md
Read: .claude/skill-library/claude/skill-management/fixing-skills/SKILL.md
Read: .claude/skill-library/claude/skill-management/renaming-skills/SKILL.md
Read: .claude/skill-library/claude/skill-management/migrating-skills/SKILL.md
Read: .claude/skill-library/claude/skill-management/searching-skills/SKILL.md
Read: .claude/skill-library/claude/skill-management/listing-skills/SKILL.md
Read: .claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md
Read: .claude/skill-library/claude/skill-management/formatting-skill-output/SKILL.md
Read: .claude/skill-library/claude/skill-management/researching-skills/SKILL.md
```

---

## Command Management

**Router Skill:** `.claude/skills/managing-commands/SKILL.md`

**Operations:** create, audit, fix, list

**Usage:**

```
/command-manager <operation> <args>
```

---

## MCP Management

**Router Skill:** `.claude/skills/managing-mcp-wrappers/SKILL.md`

**Operations:** create, verify-red, generate-wrapper, verify-green, update, audit, fix, test

**Usage:**

```
/mcp-manager <operation> <args>
```

---

## Hooks Management

**Claude Hook Write**: `.claude/skill-library/claude/hooks/claude-hook-write/SKILL.md`

- Git hook creation, hook lifecycle, event handling patterns

---

## Marketplace Management

**Claude Marketplace Management**: `.claude/skill-library/claude/marketplaces/claude-marketplace-management/SKILL.md`

- Plugin marketplace, distribution, team configuration

---

## Plugin Management

**Claude Plugin Security Auditor**: `.claude/skill-library/claude/plugins/claude-plugin-security-auditor/SKILL.md`

- Security auditing for Claude Code plugins

**Claude Plugin Settings**: `.claude/skill-library/claude/plugins/claude-plugin-settings/SKILL.md`

- Plugin settings management and configuration

**Claude Plugin Structure**: `.claude/skill-library/claude/plugins/claude-plugin-structure/SKILL.md`

- Plugin architecture, component patterns, manifest reference

---

## How to Use This Gateway

**Step 1: Find the skill** you need in the sections above

**Step 2: Choose your access method:**

- **Router skill (core)**: `skill: "managing-agents"` - Use Skill tool
- **Operation skill (library)**: `Read("{full-path-from-routing-table}")` - Use Read tool
- **Slash command shortcut**: `/agent-manager create` - Direct command

**Examples:**

```
# Via router skill (Skill tool)
skill: "managing-agents"

# Via slash command
/agent-manager create

# Direct library access (Read tool)
Read(".claude/skill-library/claude/agent-management/creating-agents/SKILL.md")
```

**Pattern: Exploring management operations**

```
User: "How do I manage agents in Claude Code?"
1. Read this gateway (you're here)
2. Find Agent Management section
3. Use skill: "managing-agents" OR Read the operation skill directly
```

---

## Quick Reference: Core Router Skills

> **Note:** This gateway routes to **core** router skills (in `skills` directory), which then route to library skills. This is a meta-gateway pattern.

- **Agents**: `skill: "managing-agents"` → Routes to agent-management library skills
- **Skills**: `skill: "managing-skills"` → Routes to skill-management library skills
- **Commands**: `skill: "managing-commands"` → Routes to command management operations
- **MCP Wrappers**: `skill: "managing-mcp-wrappers"` → Routes to MCP wrapper operations

**Router skills are in Core** → Use `skill: "name"` (Skill tool)
**Operation skills are in Library** → Use `Read("{full-path}")` (Read tool)

---

## Why This Architecture

**From SKILLS-ARCHITECTURE.md:**

> "Gateway skills are intentionally lightweight. A gateway like gateway-frontend contains just:
>
> - A description for discovery (~100 tokens)
> - A routing table of paths (~200 tokens)
>
> This is far more efficient than loading 15 full skill descriptions into the Skill tool."

**Token budget impact:**

- 1 gateway-claude in Core = ~100 chars
- 8 agent-management skills moved to Library = 0 chars at discovery
- Net savings: ~800 chars from Core budget

**Context engineering:**

- Discovery: Gateway visible, low token cost
- Execution: Skills load just-in-time when actually needed
- Result: More room for universal skills in Core

---

## See Also

- `managing-agents` - Agent lifecycle operations (routes to library)
- `managing-skills` - Skill lifecycle operations
- `managing-commands` - Command lifecycle operations
- `managing-mcp-wrappers` - MCP wrapper lifecycle operations
