# Agent Architecture

## The Problem

Claude Code agents face a paradox: the more capable an agent becomes, the less effective it is. Every line of instruction, every example, every anti-pattern list consumes tokens that could be used for actual work. Anthropic's research shows that "token usage alone explains 80% of performance variance" in agent tasks—yet the natural instinct when an agent misbehaves is to add more instructions, creating a vicious cycle of bloat.

This manifests in three critical ways:

### 1. Selection Accuracy Degrades with Agent Proliferation

Claude sees agent descriptions via the Task tool's system prompt. With 35 specialized agents, each description competes for attention in Claude's context window. Bloated descriptions with extensive examples and anti-pattern lists don't improve selection—they dilute signal with noise. When a user says "fix the search in assets page," Claude must pattern-match against ~35 descriptions. Verbose descriptions make similar agents harder to distinguish, leading to misrouting.

**The math**: Each agent description averages 500-1000 characters. With 35 agents, that's 17,500-35,000 characters just for agent discovery—before any agent is spawned.

### 2. Execution Quality Suffers from Prompt Obesity

Early agents in our system exceeded 1,200 lines (~24,000 tokens). These "bloated orchestrator" patterns attempted to encode every possible scenario, anti-pattern, and workflow directly in the agent prompt. The result:

- **Attention dilution**: Claude's attention budget spreads across thousands of tokens of instructions instead of focusing on the actual task
- **Stale knowledge**: Embedded patterns drift from current codebase state
- **Duplication**: Same patterns repeated across agents, multiplying token cost
- **Context starvation**: Less room for code, tool results, and conversation

A 1,200-line agent consuming 24,000 tokens at spawn leaves only ~176K tokens for work—a 12% reduction before the first tool call.

### 3. Sub-Agent Isolation Breaks with Context Pollution

When parent agents share full context with spawned sub-agents, the "clean slate" benefit of sub-agents disappears. Instead of focused workers with minimal context, we get recursive context bloat where each level inherits the parent's entire conversation history. This defeats the primary architectural benefit of sub-agents: their ability to work with only the tokens they need.

---

## The Solution: Lean Agent Pattern

We implemented a **thin orchestrator architecture** that keeps agent prompts lean while delegating detailed patterns to the skill library.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      User Request                           │
│              "Fix the search in assets page"                │
└─────────────────────┬───────────────────────────────────────┘
                      │ 1. Claude sees agent descriptions via Task tool
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                Agent Selection (Task Tool)                  │
│  • Descriptions from frontmatter (~500-1000 chars each)     │
│  • Examples help Claude match intent to agent               │
│  • "Use when" trigger pattern enables accurate selection    │
└─────────────────────┬───────────────────────────────────────┘
                      │ 2. Agent spawned with lean prompt (~150-250 lines)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           Agent Execution (.claude/agents/)                 │
│  • Lean prompt: Role + Critical rules + Output format       │
│  • Skills auto-loaded via frontmatter (gateway-frontend)    │
│  • Detailed patterns delegated to skill library             │
└─────────────────────┬───────────────────────────────────────┘
                      │ 3. Agent reads skills just-in-time
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Skill Library (On-Demand)                      │
│  • Gateway skills route to library skills                   │
│  • Full patterns loaded via Read tool                       │
│  • No token cost until actually needed                      │
└─────────────────────────────────────────────────────────────┘
```

### Token Savings

| Component         | Discovery Cost  | Execution Cost           | Notes                       |
| ----------------- | --------------- | ------------------------ | --------------------------- |
| Agent description | ~500-1000 chars | N/A                      | In Task tool prompt         |
| Agent prompt      | N/A             | Full prompt when spawned | Target: <250 lines          |
| Gateway skills    | ~100 chars      | ~500 tokens              | Auto-loaded via frontmatter |
| Library skills    | 0               | ~500-2000 tokens         | Loaded via Read tool        |
| Sub-agent return  | N/A             | <2000 tokens             | Condensed summary           |

---

## Overview

Claude Code agents are specialized sub-processes that handle complex tasks autonomously. This document defines the architectural patterns, quality standards, and governance rules for all agents in the Chariot platform.

**Gold Standard**: `frontend-developer` (135 lines) - Use as template for all new agents.

---

## Core Principles

### Principle 1: Minimal High-Signal Tokens

Agent prompts contain only what Claude doesn't already know:

- **Identity** - Role statement (1-2 sentences)
- **Skill Loading Protocol** - How to find and use skills
- **Platform Rules** - Non-negotiable constraints specific to this codebase
- **Output Format** - Coordination requirements
- **Escalation** - When to stop, who to recommend

Everything else delegates to skills for on-demand loading.

### Principle 2: Challenge Every Token

Before adding content to an agent, ask:

- "Does Claude really need this explanation?" → Probably not
- "Can I assume Claude knows this?" → Usually yes
- "Does this paragraph justify its token cost?" → Often no

Claude is already expert-level. Only add context it doesn't have.

### Principle 3: Progressive Disclosure

Information loads in tiers, not all at once:

```
┌─────────────────────────────────────────┐
│ Agent Spawned (~3,000-5,000 tokens)     │
│ • Role statement                        │
│ • Skill Loading Protocol                │
│ • Anti-Bypass (brief)                   │
│ • Output format + Escalation            │
└─────────────────┬───────────────────────┘
                  │ Step 1: Invoke gateway
                  ▼
┌─────────────────────────────────────────┐
│ Gateway Loaded (~500-1,000 tokens)      │
│ • Mandatory skill paths                 │
│ • Task routing tables                   │
│ • Quick Decision Guide                  │
└─────────────────┬───────────────────────┘
                  │ Step 3: Read library skills
                  ▼
┌─────────────────────────────────────────┐
│ Library Skills On-Demand                │
│ • Only loaded when Read() called        │
│ • ~500-2,000 tokens per skill           │
│ • Zero cost until needed                │
└─────────────────────────────────────────┘
```

### Principle 4: Sub-Agent Isolation

Each agent starts with clean context, does focused work, returns condensed summary (<2,000 tokens). Parent agents don't share full context—they share specific task instructions.

---

## Language Guidelines

Claude is trained for precise instruction following. Use direct, normal language.

| Avoid                                | Use Instead             |
| ------------------------------------ | ----------------------- |
| "CRITICAL: You MUST..."              | "Use when..."           |
| "ALWAYS call..."                     | "Call..."               |
| "You are REQUIRED to..."             | "You should..."         |
| "NEVER skip..."                      | "Don't skip..."         |
| ALL CAPS EMPHASIS                    | Normal case             |
| Extensive anti-rationalization lists | Brief 3-5 bullet points |
| "YOU DO NOT HAVE A CHOICE"           | Standard instructions   |

**Why**: Aggressive language causes overtriggering. Claude follows instructions precisely—forceful language isn't necessary and degrades performance.

---

## Agent Anatomy

### Frontmatter Structure

```yaml
---
name: agent-name # kebab-case, <64 chars, matches filename
description: Use when [trigger]... # Single-line, <1024 chars, with examples
type: development # Category for organization
permissionMode: default # default|plan|acceptEdits|bypassPermissions
tools: Read, Write, Edit, Bash # Comma-separated, minimal viable set
skills: gateway-frontend # Gateway skills only (not library paths)
model: sonnet # opus|sonnet|haiku
color: green # Terminal display color
---
```

### Description Syntax

Descriptions must be single-line with `\n` escapes. Block scalars (`|` and `>`) break agent discovery.

```yaml
# Correct - Claude sees full description
description: Use when developing React frontend - components, UI bugs, performance.\n\n<example>\nContext: New dashboard\nuser: 'Create metrics dashboard'\nassistant: 'I will use frontend-developer'\n</example>

# Wrong - Claude sees literal "|" character
description: |
  Use when developing React applications.
```

**Pattern**: `Use when [TRIGGER] - [CAPABILITIES].\n\n<example>...\n</example>`

Include 2-4 examples showing user intent → agent selection.

### Prompt Template

```markdown
# Agent Name

You are [role statement - 1-2 sentences with domain expertise].

## Skill Loading Protocol

- **Core skills** (in `.claude/skills/`): Invoke via Skill tool → `skill: "skill-name"`
- **Library skills** (in `.claude/skill-library/`): Load via Read tool → `Read("path/from/gateway")`

**Library skill paths come FROM the gateway—do not hardcode them.**

### Step 1: Always Invoke First

Every task requires these (in order):
```

skill: "calibrating-time-estimates"
skill: "gateway-[domain]"

```

- **calibrating-time-estimates**: Grounds effort perception before planning
- **gateway-[domain]**: Routes to mandatory + task-specific library skills

The gateway provides:
1. **Mandatory library skills** - Read ALL skills in "Mandatory for All Work"
2. **Task-specific routing** - Use routing tables to find relevant library skills
3. **Quick Decision Guide** - Follow the decision tree

### Step 2: Invoke Core Skills Based on Task Context

Invoke based on semantic relevance to your task:

| Trigger | Skill | When to Invoke |
|---------|-------|----------------|
| Writing new code | `skill: "developing-with-tdd"` | Creating components, functions |
| Writing/refactoring | `skill: "adhering-to-dry"` | Check existing patterns first |
| Scope creep risk | `skill: "adhering-to-yagni"` | Tempted to add "nice to have" |
| Bug/error/unexpected | `skill: "debugging-systematically"` | Before fixing |
| Multi-step (≥2) | `skill: "using-todowrite"` | Complex implementations |
| Before completion | `skill: "verifying-before-completion"` | Always |

**Semantic matching:**
- Simple typo? → Just `verifying-before-completion`
- New component with API? → TDD + DRY + gateway routing
- Debugging issue? → `debugging-systematically` + gateway

### Step 3: Load Library Skills from Gateway

After invoking the gateway, use its routing tables to Read relevant library skills:

```

Read(".claude/skill-library/path/from/gateway/SKILL.md")

````

## Anti-Bypass

Do not rationalize skipping skills:

- "Simple task" → Step 1 + verifying-before-completion still apply
- "I already know this" → Training data is stale, read current skills
- "No time" → calibrating-time-estimates exists precisely for this
- "Step 1 is overkill" → Two skills costs less than one bug fix

### Core Entities

[Domain-specific entities - 1 line]

## Output Format

```json
{
  "status": "complete|blocked|needs_review",
  "summary": "What was done",
  "skills_invoked": ["calibrating-time-estimates", "gateway-frontend"],
  "library_skills_read": [".claude/skill-library/.../SKILL.md"],
  "gateway_mandatory_skills_read": true,
  "files_modified": ["src/path/to/file.tsx"],
  "verification": {
    "tests_passed": true,
    "build_success": true,
    "command_output": "vitest run - 5 passed"
  }
}
````

## Escalation

### [Category 1]

| Situation   | Recommend    |
| ----------- | ------------ |
| [Condition] | `agent-name` |

### Cross-Domain

| Situation          | Recommend            |
| ------------------ | -------------------- |
| Need clarification | AskUserQuestion tool |

Report: "Blocked: [issue]. Attempted: [what]. Recommend: [agent] for [capability]."

```

### Line Count Targets

| Agent Type | Target | Maximum | Rationale |
|------------|--------|---------|-----------|
| Standard (development, testing, quality) | <150 | 200 | Lean agents, skill delegation |
| Complex (architecture, orchestrator) | <250 | 350 | More context for design decisions |

Agents exceeding maximums fail audit. Extract content to skills.

---

## Agent Organization

### Directory Structure

```

.claude/agents/
├── analysis/ # Security review, assessment
├── architecture/ # System design, patterns, decisions
├── development/ # Implementation, coding, features
├── mcp-tools/ # Specialized MCP tool access
├── orchestrator/ # Domain-specific coordination
├── quality/ # Code review, auditing, standards
├── research/ # Pattern analysis, exploration
└── testing/ # Unit, integration, e2e, quality

````

### Agent Categories

| Category | Purpose | Permission Mode | Line Target |
|----------|---------|-----------------|-------------|
| `architecture` | System design, patterns | `plan` | <250 |
| `development` | Implementation, coding | `default` | <150 |
| `testing` | Unit, integration, e2e | `default` | <150 |
| `quality` | Code review, auditing | `default` | <150 |
| `analysis` | Security, assessment | `plan` | <150 |
| `research` | Exploration, patterns | `plan` | <150 |
| `orchestrator` | Coordination, workflows | `default` | <250 |
| `mcp-tools` | Specialized MCP access | `default` | <150 |

---

## Token Economics

### Per-Spawn Costs

| Component | Discovery Cost | Execution Cost | Notes |
|-----------|----------------|----------------|-------|
| Agent description | ~500-1000 chars | N/A | In Task tool prompt |
| Agent prompt | N/A | Full prompt | Target: <150 lines (~3,000 tokens) |
| Gateway skill | ~100 chars | ~500-1,000 tokens | Auto-loaded via frontmatter |
| Library skill | 0 | ~500-2,000 tokens | Loaded via Read tool |
| Sub-agent return | N/A | <2,000 tokens | Condensed summary |

### Savings Example

| Pattern | Lines | Tokens | Per-Spawn Cost |
|---------|-------|--------|----------------|
| Bloated agent | 1,200 | ~24,000 | High context consumption |
| Lean agent | 135 | ~2,700 | 89% reduction |

---

## Quality Gates

### The 9 Audit Phases

| Phase | Name | Auto-Fix | Description |
|-------|------|----------|-------------|
| 1 | Frontmatter Syntax | ✅ | Description not block scalar, name matches filename |
| 2 | Description Quality | ❌ | "Use when" trigger, includes examples, <1024 chars |
| 3 | Prompt Efficiency | ❌ | <150/250 lines, delegates to skills, no duplication |
| 4 | Skill Integration | ✅ | Uses gateway skills, not direct library paths |
| 5 | Output Standardization | ❌ | Returns structured JSON with skills tracking |
| 6 | Escalation Protocol | ❌ | Clear stopping conditions, agent recommendations |
| 7 | Body References | ✅ | Phantom skill detection (referenced but don't exist) |
| 8 | Skill Coverage | ❌ | Recommended skills based on agent type |
| 9 | Skill Loading Protocol | ❌ | Tiered loading documented, brief anti-bypass |

### Validation Commands

```bash
# Audit single agent
/agent-manager audit frontend-developer

# Audit all agents
/agent-manager audit --all

# Fix issues
/agent-manager fix frontend-developer
````

### Tool Appropriateness by Type

**Legend**: R=Required | F=Forbidden | +=Recommended

| Type         | Read | Write | Edit | Bash | Grep | Glob | Todo | Task | Web |
| ------------ | :--: | :---: | :--: | :--: | :--: | :--: | :--: | :--: | :-: |
| architecture |  R   |       |      |      |  R   |  R   |  +   |      |  +  |
| development  |  R   |   R   |  R   |  R   |  +   |  +   |  +   |      |     |
| testing      |  R   |   R   |      |  R   |      |      |  +   |      |     |
| quality      |  R   |   F   |  F   |      |  R   |  R   |  +   |      |     |
| analysis     |  R   |   F   |  F   |      |  R   |  R   |  +   |      |  +  |
| research     |  R   |   F   |  F   |      |      |      |  +   |      |  R  |
| orchestrator |      |       |      |      |      |      |  R   |  R   |     |
| mcp-tools    |  R   |       |      |  R   |      |      |  +   |      |     |

### Skill Recommendations by Type

| Type         | Recommended Skills                                                               |
| ------------ | -------------------------------------------------------------------------------- |
| architecture | `brainstorming`, `writing-plans`                                                 |
| development  | `developing-with-tdd`, `debugging-systematically`, `verifying-before-completion` |
| testing      | `developing-with-tdd`, `verifying-before-completion`                             |
| quality      | `verifying-before-completion`                                                    |
| analysis     | `brainstorming`                                                                  |
| orchestrator | `writing-plans`, `executing-plans`                                               |
| mcp-tools    | `gateway-mcp-tools`                                                              |

Additional skills recommended based on keyword detection (e.g., "React" → `gateway-frontend`).

---

## Governance

### The Lean Agent Rule

All agents follow the thin orchestrator pattern:

1. **Prompt <150 lines** (complex agents <250)
2. **Description single-line** with `\n` escapes
3. **Skills via gateway** (not direct library paths in frontmatter)
4. **Standardized output** JSON with skills tracking
5. **Escalation protocol** defined

**Enforcement**: PR reviews check agent structure. Use `/agent-manager audit`.

### Skill Delegation Principle

If content can live in a skill, it lives in a skill.

| Content Type           | Lives In | Why                       |
| ---------------------- | -------- | ------------------------- |
| Role definition        | Agent    | Identity is per-agent     |
| Skill loading protocol | Agent    | Core workflow             |
| Anti-bypass (brief)    | Agent    | Non-negotiable            |
| Output format          | Agent    | Coordination requirement  |
| Escalation             | Agent    | Agent-specific boundaries |
| Detailed patterns      | Skill    | Reusable across agents    |
| Code examples          | Skill    | Progressive loading       |
| Workflows              | Skill    | On-demand retrieval       |

### Agent Consolidation Policy

When agents have overlapping responsibilities:

1. **Identify overlap**: Search for agents with similar descriptions/capabilities
2. **Merge or parameterize**: Create one agent with broader scope
3. **Update references**: Find all places referencing old agents
4. **Archive old agents**: Move to `.archived/` with reason

### Description Discovery Testing

After editing an agent, test discovery in a new session:

```
User: What is the description for the [agent-name] agent? Quote it exactly.

✅ Working: Claude quotes the full description text with examples
❌ Broken: Claude says "|" or ">" or has to read the file
```

**Agent metadata is cached at session start.** You must start a new session to see updated descriptions.

---

## Agent Manager

The Agent Manager handles lifecycle management for agents using a Partial Hybrid Pattern: instruction-based skills provide guidance with selective TypeScript CLI for deterministic operations.

### Overview

| Aspect             | Details                                               |
| ------------------ | ----------------------------------------------------- |
| **Location**       | `.claude/skill-library/claude/agent-management/`      |
| **Purpose**        | Create, audit, fix, rename, test, search, list agents |
| **Command Router** | `/agent-manager` → 8 instruction-based skills         |
| **Coverage**       | 9 validation phases                                   |

### The 8 Skills

| Skill                  | Purpose                 | CLI              | Interactive |
| ---------------------- | ----------------------- | ---------------- | ----------- |
| `creating-agents`      | TDD-driven creation     | `audit-critical` | Yes         |
| `updating-agents`      | Test-guarded updates    | None             | Yes         |
| `auditing-agents`      | 9-phase validation      | `audit-critical` | No          |
| `fixing-agents`        | Interactive remediation | via audit        | Yes         |
| `renaming-agents`      | Safe renaming           | None             | Yes         |
| `testing-agent-skills` | Behavioral validation   | None             | No          |
| `searching-agents`     | Keyword discovery       | `search`         | No          |
| `listing-agents`       | Comprehensive list      | None             | No          |

### TDD Workflow

Agent creation and updates follow Red-Green-Refactor:

```
┌─────────────────────────────────────────┐
│ RED Phase                               │
│ 1. Document gap: Why is agent needed?   │
│ 2. Test scenario without agent → FAIL   │
│ 3. Capture exact failure behavior       │
└─────────────────┬───────────────────────┘
                  │ Cannot proceed without failing test
                  ▼
┌─────────────────────────────────────────┐
│ GREEN Phase                             │
│ 4. Create/update agent for specific gap │
│ 5. Re-test scenario → PASS              │
│ 6. Verify no regression                 │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ REFACTOR Phase                          │
│ 7. Test discovery (new session)         │
│ 8. Verify line count <150/250           │
│ 9. Verify skill delegation              │
└─────────────────────────────────────────┘
```

### Block Scalar Detection

Phase 1 audit detects and flags block scalars as critical issues:

```yaml
# Broken - Claude sees "|"
description: |
  Use when developing React.

# Broken - Claude sees ">"
description: >
  Use when developing React.

# Working - Claude sees full text
description: Use when developing React - components, UI bugs.\n\n<example>...</example>
```

**Detection**: Phase 1 audit flags block scalars
**Fix**: `/agent-manager fix <agent>` converts to single-line

### Agent Caching Protocol

Agent definitions cache at session start. File changes during a session don't update spawned agents.

**Testing Protocol**:

1. Make changes to agent file
2. **Start fresh Claude Code session** (mandatory)
3. Test with `/agent-manager test <agent> <skill>`
4. Verify skills appear in output
5. Confirm behavioral compliance

Do not test changes in the same session—results will be invalid.

---

## Architecture Flow

### Agent Selection

```
┌─────────────────────────────────────────┐
│ User Request                            │
│ "Fix the search in assets page"         │
└─────────────────┬───────────────────────┘
                  │ Claude sees descriptions via Task tool
                  ▼
┌─────────────────────────────────────────┐
│ Agent Selection                         │
│ • Descriptions from frontmatter         │
│ • Examples help match intent            │
│ • "Use when" pattern enables selection  │
└─────────────────┬───────────────────────┘
                  │ Agent spawned with lean prompt
                  ▼
┌─────────────────────────────────────────┐
│ Agent Execution                         │
│ • Lean prompt: Role + Protocol + Output │
│ • Skills loaded via gateway             │
│ • Detailed patterns from skill library  │
└─────────────────┬───────────────────────┘
                  │ Agent reads skills just-in-time
                  ▼
┌─────────────────────────────────────────┐
│ Skill Library                           │
│ • Gateway routes to library skills      │
│ • Full patterns via Read tool           │
│ • Zero cost until needed                │
└─────────────────────────────────────────┘
```

### Multi-Agent Coordination

For complex tasks requiring multiple agents:

1. **Orchestrator spawns** with task decomposition
2. **Worker agents** execute independent subtasks
3. **Each worker** returns condensed summary (<2,000 tokens)
4. **Orchestrator synthesizes** results

**Parallel execution**: Independent tasks run simultaneously via multiple Task tool calls in single message.

---

## Quick Reference

### Create Agent

```bash
/agent-manager create my-agent "Use when [trigger] - [capabilities]" --type development
```

### Audit Agent

```bash
/agent-manager audit agent-name        # Single
/agent-manager audit --all             # All
```

### Fix Agent

```bash
/agent-manager fix agent-name --dry-run  # Preview
/agent-manager fix agent-name            # Apply
```

### Test Discovery

In new Claude Code session:

```
What is the description for the frontend-developer agent? Quote it exactly.
```

### Search Agents

```bash
/agent-manager search "react"
/agent-manager search "security" --type analysis
```

---

## References

### Internal

- **Agent Manager**: `.claude/skills/managing-agents/SKILL.md`
- **Agent Management Skills**: `.claude/skill-library/claude/agent-management/`
- **Gold Standard**: `.claude/agents/development/frontend-developer.md`
- **Skills Architecture**: `docs/SKILLS-ARCHITECTURE.md`

### Anthropic Guidance

- [Claude Code Sub-agents](https://code.claude.com/docs/en/sub-agents)
- [Effective Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)
- [Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Claude 4 Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices)
- [Agent Skills Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
