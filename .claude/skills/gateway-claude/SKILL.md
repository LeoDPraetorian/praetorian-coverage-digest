---
name: gateway-claude
description: Use when managing Claude Code infrastructure - agents, skills, commands. Routes to specialized management operations.
allowed-tools: Read, Skill
---

# Gateway: Claude Code Management

**Routes to specialized skills for managing Claude Code infrastructure (agents, skills, commands, MCP tools).**

---

## When to Use

- Managing agents (create, update, test, audit, fix, rename, search, list)
- Managing skills (create, update, audit, fix, rename, migrate, search, list)
- Managing commands (create, audit, fix, list)
- Managing MCP wrappers (create, test, audit, fix)

**This gateway routes you to the appropriate management skill based on what you're managing.**

---

## Agent Management (8 operations)

**Router Skill:** `.claude/skills/agent-manager/SKILL.md`

The agent-manager skill routes to:

| Operation | Skill |
|-----------|-------|
| Create | `.claude/skill-library/claude/agent-management/creating-agents/SKILL.md` |
| Update | `.claude/skill-library/claude/agent-management/updating-agents/SKILL.md` |
| Test | `.claude/skill-library/claude/agent-management/testing-agent-skills/SKILL.md` |
| Audit | `.claude/skill-library/claude/agent-management/auditing-agents/SKILL.md` |
| Fix | `.claude/skill-library/claude/agent-management/fixing-agents/SKILL.md` |
| Rename | `.claude/skill-library/claude/agent-management/renaming-agents/SKILL.md` |
| Search | `.claude/skill-library/claude/agent-management/searching-agents/SKILL.md` |
| List | `.claude/skill-library/claude/agent-management/listing-agents/SKILL.md` |

**Usage:**
```
# Via command (recommended)
/agent-manager <operation> <args>

# Via agent-manager skill
skill: "agent-manager"

# Direct skill access
Read: .claude/skill-library/claude/agent-management/creating-agents/SKILL.md
```

---

## Skill Management (8 operations)

**Router Skill:** `.claude/skills/skill-manager/SKILL.md`

The skill-manager skill routes to:

| Operation | Skill |
|-----------|-------|
| Create | `.claude/skills/creating-skills/SKILL.md` |
| Update | `.claude/skill-library/claude/skill-management/updating-skills/SKILL.md` |
| Audit | `.claude/skill-library/claude/skill-management/auditing-skills/SKILL.md` |
| Fix | `.claude/skill-library/claude/skill-management/fixing-skills/SKILL.md` |
| Rename | `.claude/skill-library/claude/skill-management/renaming-skills/SKILL.md` |
| Migrate | `.claude/skill-library/claude/skill-management/migrating-skills/SKILL.md` |
| Search | `.claude/skill-library/claude/skill-management/searching-skills/SKILL.md` |
| List | `.claude/skill-library/claude/skill-management/listing-skills/SKILL.md` |

**Usage:**
```
# Via command (recommended)
/skill-manager <operation> <args>

# Via skill-manager skill
skill: "skill-manager"

# Direct skill access (instruction-based operations)
Read: .claude/skills/creating-skills/SKILL.md
Read: .claude/skill-library/claude/skill-management/updating-skills/SKILL.md
Read: .claude/skill-library/claude/skill-management/auditing-skills/SKILL.md
Read: .claude/skill-library/claude/skill-management/fixing-skills/SKILL.md
Read: .claude/skill-library/claude/skill-management/renaming-skills/SKILL.md
Read: .claude/skill-library/claude/skill-management/migrating-skills/SKILL.md
Read: .claude/skill-library/claude/skill-management/searching-skills/SKILL.md
Read: .claude/skill-library/claude/skill-management/listing-skills/SKILL.md
```

---

## Command Management

**Router Skill:** `.claude/skills/command-manager/SKILL.md`

**Operations:** create, audit, fix, list

**Usage:**
```
/command-manager <operation> <args>
```

---

## MCP Management

**Router Skill:** `.claude/skills/mcp-manager/SKILL.md`

**Operations:** create, verify-red, generate-wrapper, verify-green, update, audit, fix, test

**Usage:**
```
/mcp-manager <operation> <args>
```

---

## How to Use This Gateway

**Pattern 1: You know what you're managing**
```
User: "Create a new agent"
→ Use /agent-manager create
OR
→ Read: .claude/skill-library/claude/agent-management/creating-agents/SKILL.md
```

**Pattern 2: You're exploring management operations**
```
User: "How do I manage agents in Claude Code?"
→ Read this gateway
→ See agent management section
→ Follow to agent-manager skill
```

**Pattern 3: Direct library access**
```
User: "I need to audit an agent"
→ Read: .claude/skill-library/claude/agent-management/auditing-agents/SKILL.md
```

---

## Quick Reference

| What to Manage | Router Skill | Location |
|----------------|--------------|----------|
| **Agents** | `agent-manager` | `.claude/skills/agent-manager/SKILL.md` |
| **Skills** | `skill-manager` | `.claude/skills/skill-manager/SKILL.md` |
| **Commands** | `command-manager` | `.claude/skills/command-manager/SKILL.md` |
| **MCP Wrappers** | `mcp-manager` | `.claude/skills/mcp-manager/SKILL.md` |

**All router skills stay in Core. All operation skills moved to Library.**

---

## Why This Architecture

**From SKILLS-ARCHITECTURE.md:**

> "Gateway skills are intentionally lightweight. A gateway like gateway-frontend contains just:
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

- `agent-manager` - Agent lifecycle operations (routes to library)
- `skill-manager` - Skill lifecycle operations
- `command-manager` - Command lifecycle operations
- `mcp-manager` - MCP wrapper lifecycle operations
