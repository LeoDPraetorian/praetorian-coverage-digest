---
name: gateway-claude
description: Routes Claude Code management tasks to library skills. Intent detection + progressive loading.
allowed-tools: Read
---

<EXTREMELY-IMPORTANT>
# STOP. READ THIS FIRST. DO NOT SKIP.

## The 1% Rule (NON-NEGOTIABLE)

If there is even a **1% chance** a skill might apply to your task:

- You MUST invoke that skill
- This is not optional
- This is not negotiable
- You cannot rationalize your way out of this

Uncertainty = Invocation. Period.

## Skill Announcement (MANDATORY)

Before using any skill, you MUST announce it in your response:

"I am invoking `{skill-name}` because {reason}."

This announcement must appear BEFORE you begin work.
No announcement = no invocation = PROTOCOL VIOLATION = FAILURE!
</EXTREMELY-IMPORTANT>

# Gateway: Claude Code Management

Routes Claude Code management tasks to appropriate skills. Does NOT contain methodology—skills do.

## Progressive Disclosure

This gateway implements 3-tier loading:

- **Level 1 (now):** Routing tables (~300 tokens)
- **Level 2 (on-demand):** Skill SKILL.md loaded when routed
- **Level 3 (as-needed):** Skill resources loaded during execution

## Intent Detection

**Match your task to a routing pattern:**

| Task Intent                                         | Route To                                    |
| --------------------------------------------------- | ------------------------------------------- |
| "create agent" / "update agent" / "agents"          | → `managing-agents` (core skill)            |
| "create skill" / "update skill" / "skills"          | → `managing-skills` (core skill)            |
| "command" / "slash command"                         | → `managing-commands` (core skill)          |
| "MCP wrapper" / "tool wrapper"                      | → `managing-tool-wrappers` (core)           |
| "hook" / "pre-commit" / "post-tool"                 | → `claude-hook-write` (library)             |
| "plugin" / "extension"                              | → `claude-plugin-structure` (library)       |
| "marketplace" / "publish"                           | → `claude-marketplace-management`           |
| "large file" / "context limit" / "split"            | → `processing-large-artifacts` (library)    |
| "prompt patterns" / "few-shot" / "chain-of-thought" | → `orchestration-prompt-patterns` (library)        |
| "parallel LLM" / "multi-model" / "attack diversity" | → `reasoning-with-parallel-attack-paths` (library) |
| "research" / "investigate"                          | → `researching-skills` (core)                      |
| "brainstorm" / "design"                             | → `brainstorming` (core)                           |

## Routing Algorithm

```
1. Parse task for trigger keywords from Intent Detection
2. If core skill → use Skill tool: skill: "skill-name"
3. If library skill → use Read tool: Read("path")
4. Check Cross-Gateway Routing for domain-specific gateways
5. Follow skill instructions
```

## Core Skills (Use Skill Tool)

| Skill                   | Command            | Triggers                   |
| ----------------------- | ------------------ | -------------------------- |
| `managing-agents`       | `/agent-manager`   | agents, create, update     |
| `managing-skills`       | `/skill-manager`   | skills, audit, fix         |
| `managing-commands`     | `/command-manager` | commands, slash            |
| `managing-tool-wrappers` | `/tool-manager`    | MCP wrappers, tool wrapper |
| `researching-skills`    | —                  | research, investigate      |
| `brainstorming`         | —                  | brainstorm, design         |

```
skill: "managing-agents"
skill: "managing-skills"
skill: "managing-commands"
```

## Skill Registry (Library Skills - Use Read Tool)

### Agent Management

| Skill           | Path                                                                                      | Triggers     |
| --------------- | ----------------------------------------------------------------------------------------- | ------------ |
| Creating Agents | `.claude/skill-library/claude/agent-management/creating-agents/SKILL.md`                  | create agent |
| Updating Agents | `.claude/skill-library/claude/agent-management/updating-agents/SKILL.md`                  | update agent |
| Testing Agents  | `.claude/skill-library/claude/agent-management/verifying-agent-skill-invocation/SKILL.md` | test agent   |
| Auditing Agents | `.claude/skill-library/claude/agent-management/auditing-agents/SKILL.md`                  | audit agent  |
| Fixing Agents   | `.claude/skill-library/claude/agent-management/fixing-agents/SKILL.md`                    | fix agent    |
| Renaming Agents | `.claude/skill-library/claude/agent-management/renaming-agents/SKILL.md`                  | rename agent |

### Skill Management

| Skill                          | Path                                                                                    | Triggers                        |
| ------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------- |
| Auditing Skills                | `.claude/skill-library/claude/skill-management/auditing-skills/SKILL.md`                | audit skill                     |
| Closing Rationalization Loopholes | `.claude/skill-library/claude/skill-management/closing-rationalization-loopholes/SKILL.md` | loophole, rationalization       |
| Creating Skills                | `.claude/skill-library/claude/skill-management/creating-skills/SKILL.md`                | create skill                    |
| Deleting Skills                | `.claude/skill-library/claude/skill-management/deleting-skills/SKILL.md`                | delete skill                    |
| Fixing Skills                  | `.claude/skill-library/claude/skill-management/fixing-skills/SKILL.md`                  | fix skill                       |
| Migrating Skills               | `.claude/skill-library/claude/skill-management/migrating-skills/SKILL.md`               | migrate skill                   |
| Pressure Testing Skill Content | `.claude/skill-library/claude/skill-management/pressure-testing-skill-content/SKILL.md` | pressure test, verify           |
| Processing Large Skills        | `.claude/skill-library/claude/skill-management/processing-large-skills/SKILL.md`        | understand skill, analyze skill |
| Renaming Skills                | `.claude/skill-library/claude/skill-management/renaming-skills/SKILL.md`                | rename skill                    |
| Syncing Gateways               | `.claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md`               | sync gateway                    |
| Updating Skills                | `.claude/skill-library/claude/skill-management/updating-skills/SKILL.md`                | update skill                    |

### Hooks & Plugins

| Skill                  | Path                                                                               | Triggers          |
| ---------------------- | ---------------------------------------------------------------------------------- | ----------------- |
| Hook Writing           | `.claude/skill-library/claude/hooks/claude-hook-write/SKILL.md`                    | hook, pre-commit  |
| Plugin Structure       | `.claude/skill-library/claude/plugins/claude-plugin-structure/SKILL.md`            | plugin, extension |
| Plugin Settings        | `.claude/skill-library/claude/plugins/claude-plugin-settings/SKILL.md`             | plugin settings   |
| Plugin Security Audit  | `.claude/skill-library/claude/plugins/claude-plugin-security-auditor/SKILL.md`     | plugin security   |
| Marketplace Management | `.claude/skill-library/claude/marketplaces/claude-marketplace-management/SKILL.md` | marketplace       |

### Orchestration

| Skill                         | Path                                                                     | Triggers                                    |
| ----------------------------- | ------------------------------------------------------------------------ | ------------------------------------------- |
| Orchestration Prompt Patterns | `.claude/skill-library/prompting/orchestration-prompt-patterns/SKILL.md` | prompt patterns, few-shot, chain-of-thought |
| Processing Large Artifacts    | `.claude/skill-library/claude/processing-large-artifacts/SKILL.md`       | large file, context limit, split, decompose |

### Agentic Attack Workflows

| Skill                                | Path                                                                                           | Triggers                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Reasoning with Parallel Attack Paths | `.claude/skill-library/agentic-attack-workflows/reasoning-with-parallel-attack-paths/SKILL.md` | parallel LLM, multi-model analysis, attack paths |

## Cross-Gateway Routing

| If Task Involves    | Also Invoke          |
| ------------------- | -------------------- |
| MCP services, tools | `gateway-mcp-tools`  |
| TypeScript, types   | `gateway-typescript` |
| Testing patterns    | `gateway-testing`    |

## Loading Skills

**Core skills:** `skill: "skill-name"`

**Library skills:** `Read(".claude/skill-library/claude/{category}/{skill-name}/SKILL.md")`

Do NOT use `skill: "skill-name"` for library skills—they require Read tool.
