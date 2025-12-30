# Agent Architecture

## The Problem

Claude Code agents face a paradox: the more capable an agent becomes, the less effective it is. Every line of instruction, every example, every anti-pattern list consumes tokens that could be used for actual work. Anthropic's research shows that "token usage alone explains 80% of performance variance" in agent tasks—yet the natural instinct when an agent misbehaves is to add more instructions, creating a vicious cycle of bloat.

**Anthropic's official guidance is explicit**: ["Keep SKILL.md body under 500 lines for optimal performance"](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices). This isn't a suggestion—it's a performance threshold. Beyond 500 lines, Claude's attention degrades, critical instructions get diluted, and the agent becomes less reliable. The same principle applies to agent prompts: every token beyond the minimum necessary reduces the context available for actual work.

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

**Gold Standard**: `frontend-lead` (~160 lines) - Use as template for all new agents.

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
│ • Mandatory skills by role (paths)      │
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

### Anthropic's Official Position

Anthropic's [Claude 4 Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices) states that Claude is trained for precise instruction following and that aggressive language causes overtriggering. The official guidance recommends using direct, normal language.

### Our Empirical Finding: Under-Triggering is the Real Problem

**Testing has proven this guidance insufficient for skill invocation in agents.**

Through systematic pressure testing (see `testing-skills-with-subagents` skill), we discovered that agents using "polite" instruction patterns consistently **under-trigger**—they skip mandatory skill invocations when given realistic tasks that don't explicitly mention skills.

**Evidence (2025-12-30):**
- `frontend-lead` with aggressive `<EXTREMELY-IMPORTANT>` block: **100% skill invocation**
- `frontend-reviewer` with polite table-based instructions: **Failed to invoke Step 1 skills** when given realistic task "Review the TanStack migration plan and provide feedback"

The agent returned inline text instead of:
1. Invoking mandatory skills
2. Reading library skills from gateway
3. Writing output to feature directory
4. Updating MANIFEST.yaml

**Root cause:** "Skill-aware" tests (mentioning skills in prompts) pass because they prime agents to think about skills. Realistic tasks without skill mentions reveal the under-triggering problem.

### What Works: Aggressive Blocking Language

For **mandatory skill invocation**, use aggressive patterns:

| Pattern | Purpose |
| ------- | ------- |
| `<EXTREMELY-IMPORTANT>` block | Stops agent before task processing |
| "STOP. READ THIS FIRST. DO NOT SKIP." | Forces attention before rationalization |
| "Your VERY FIRST ACTION must be..." | Explicit sequencing requirement |
| Literal tool call syntax | Shows exact calls, not just names |
| "IF YOU ARE THINKING [X], YOU ARE ABOUT TO FAIL" | Pre-empts specific rationalizations |
| "YOU MUST WRITE YOUR OUTPUT TO A FILE" | Prevents text response shortcut |

### What Doesn't Work: Polite Instructions

| Pattern | Why It Fails |
| ------- | ------------ |
| Tables listing skills without emphasis | Agent reads task, skips to "obvious" solution |
| "You should invoke..." | Treated as suggestion, not requirement |
| Anti-bypass section buried after process | Agent never reaches it |
| Brief bullet points | Insufficient to override task-focus |

### The Correct Pattern (from frontend-lead)

```markdown
<EXTREMELY-IMPORTANT>
# STOP. READ THIS FIRST. DO NOT SKIP.

Your VERY FIRST ACTION must be invoking skills. Not reading the task. Not thinking about the task. INVOKING SKILLS.

## YOUR FIRST TOOL CALLS MUST BE:

```
Skill: "enforcing-evidence-based-analysis"
Skill: "gateway-frontend"
Skill: "persisting-agent-outputs"
```

DO THIS NOW. BEFORE ANYTHING ELSE.

## IF YOU ARE THINKING ANY OF THESE, YOU ARE ABOUT TO FAIL:

- "I'll invoke skills after understanding the task" → WRONG. Skills tell you HOW to understand.
- "This task is simple/obvious" → WRONG. That's what every failed agent thought.
...
</EXTREMELY-IMPORTANT>
```

### When to Use Each Style

| Context | Style | Rationale |
| ------- | ----- | --------- |
| Mandatory skill invocation | Aggressive blocking | Prevents under-triggering |
| Process steps after skills loaded | Normal instructions | Skills provide the discipline |
| Output format | Normal instructions | No bypass incentive |
| Escalation protocol | Normal instructions | No bypass incentive |

**Summary:** Anthropic's guidance optimizes for overtriggering prevention. Our testing reveals under-triggering is the dominant failure mode for skill invocation. Use aggressive language where compliance is mandatory.

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
skills: adhering-to-dry, adhering-to-yagni, calibrating-time-estimates, debugging-systematically, enforcing-evidence-based-analysis, gateway-frontend, persisting-agent-outputs, using-todowrite, verifying-before-completion # All relevant core skills
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
<EXTREMELY-IMPORTANT>
# STOP. READ THIS FIRST. DO NOT SKIP.

## Skill Loading Protocol

- **Core skills** (in `.claude/skills/`): Invoke via Skill tool → `skill: "skill-name"`
- **Library skills** (in `.claude/skill-library/`): Load via Read tool → `Read("path/from/gateway")`

### Step 1: Always Invoke First

Your VERY FIRST ACTION must be invoking skills. Not reading the task. Not thinking about the task. INVOKING SKILLS.

## YOUR FIRST TOOL CALLS MUST BE:

| Skill                               | Why Always Invoke                                                             |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| `calibrating-time-estimates`        | Prevents "no time to read skills" rationalization, grounds efforts            |
| `enforcing-evidence-based-analysis` | **Prevents hallucinations** - you WILL fail catastrophically without this     |
| `gateway-[domain]`                  | Routes to mandatory + task-specific library skills                            |
| `persisting-agent-outputs`          | **Defines WHERE to write output** - discovery protocol, file naming, MANIFEST |
| `verifying-before-completion`       | Ensures outputs are verified before claiming done                             |

DO THIS NOW. BEFORE ANYTHING ELSE.

### Step 2: Invoke Core Skills Based on Task Context

Your `skills` frontmatter makes these core skills available. **Invoke based on semantic relevance to your task**:

| Trigger                    | Skill                      | When to Invoke                                                           |
| -------------------------- | -------------------------- | ------------------------------------------------------------------------ |
| Code duplication concerns  | `adhering-to-dry`          | Reviewing for patterns, architecting plans, eliminating duplication      |
| Scope creep risk           | `adhering-to-yagni`        | Adding features that were not requested, ask questions for clarification |
| Investigating issues       | `debugging-systematically` | Root cause analysis during review                                        |
| Multi-step task (≥2 steps) | `using-todowrite`          | Anything requiring > 1 task to perform                                   |

**Semantic matching guidance:**

- Quick question? → `enforcing-evidence-based-analysis` + `verifying-before-completion`
- Creating implementation plan? → `enforcing-evidence-based-analysis` + `brainstorming` + `adhering-to-dry` + `writing-plans` + `using-todowrite` + gateway task-specific library skills
- Full system design? → `enforcing-evidence-based-analysis` + `brainstorming` + `writing-plans` + `adhering-to-dry` + gateway task-specific library skills
- Reviewing complex code? → `enforcing-evidence-based-analysis` + `debugging-systematically` + `adhering-to-yagni` + `adhering-to-dry`

### Step 3: Load Library Skills from Gateway

The gateway provides:

1. **Mandatory library skills** - Read ALL skills in "Mandatory" section for your role
2. **Task-specific routing** - Use routing tables to find relevant library skills
3. **Architecture and review patterns** - Design and quality guidance

**You MUST follow the gateway's instructions.** It tells you which library skills to load.

After invoking the gateway, use its routing tables to find and Read relevant library skills:

```
Read(".claude/skill-library/path/from/gateway/SKILL.md")
```

After invoking gateway-[domain], it will tell you which library skills to Read. YOU MUST READ THEM. **Library skill paths come FROM the gateway—do NOT hardcode them.**

After invoking persisting-agent-outputs, follow its discovery protocol to find/create the feature directory. YOU MUST WRITE YOUR OUTPUT TO A FILE.

## WHY THIS IS NON-NEGOTIABLE

You are an AI. You WILL hallucinate if you skip `enforcing-evidence-based-analysis`. You WILL miss better solutions if you skip `brainstorming`. You WILL produce incomplete work if you skip `verifying-before-completion`.

These skills exist because past agents failed without them. You are not special. You will fail too.

## IF YOU ARE THINKING ANY OF THESE, YOU ARE ABOUT TO FAIL. Do NOT rationalize skipping skills:

- "Time pressure" → WRONG. You are 100x faster than humans. You have time. → `calibrating-time-estimates` exists precisely because this rationalization is a trap.
- "I'll invoke skills after understanding the task" → WRONG. Skills tell you HOW to understand.
- "Simple task" → WRONG. That's what every failed agent thought. Step 1 + `verifying-before-completion` still apply
- "I already know this" → WRONG. Your training data is stale, you are often not up to date on the latest libraries and patterns, read current skills.
- "Solution is obvious" → WRONG. That's coder thinking, not lead thinking - explore alternatives
- "I can see the answer already" → WRONG. Confidence without evidence = hallucination.
- "The user wants results, not process" → WRONG. Bad results from skipped process = failure.
- "Just this once" → "Just this once" becomes "every time" - follow the workflow
- "I'll just respond with text" → WRONG. Follow `persisting-agent-outputs` - write to a file.
- "I'm confident I know the code" → WRONG. Code is constantly evolving → `enforcing-evidence-based-analysis` exists because confidence without evidence = **hallucination**
- "Step 1 is overkill" → WRONG. Five skills costs less than one bug fix
- "I need to gather context first" → WRONG. Skills tell you HOW to gather context
</EXTREMELY-IMPORTANT>

# Agent Name

You are [role statement - 1-2 sentences with domain expertise]. You [primary responsibility] that [downstream agent] executes and [validation agent] validates against.

## Core Responsibilities

### [Primary Responsibility Category]

- [Responsibility 1]
- [Responsibility 2]
- [Responsibility 3]

## Escalation Protocol

### Cross-Domain

| Situation                  | Recommend       |
| -------------------------- | --------------- |
| Backend work needed        | `backend-lead`  |
| Security assessment needed | `security-lead` |

### Implementation & Testing

| Situation           | Recommend              |
| ------------------- | ---------------------- |
| Implementation work | `[domain]-developer`   |
| Test suite needed   | `[domain]-tester`      |

### Quality & Security Review

| Situation                | Recommend           |
| ------------------------ | ------------------- |
| Code review needed       | `[domain]-reviewer` |
| Security vulnerabilities | `[domain]-security` |

### Coordination

| Situation              | Recommend               |
| ---------------------- | ----------------------- |
| Multi-concern feature  | `[domain]-orchestrator` |
| You need clarification | AskUserQuestion tool    |

Report: "Blocked: [issue]. Attempted: [what]. Recommend: [agent] for [capability]."

## Output Format

Follow `persisting-agent-outputs` skill for file output, JSON metadata format, and MANIFEST.yaml updates.

**Agent-specific values:**

| Field                | Value                                                |
| -------------------- | ---------------------------------------------------- |
| `output_type`        | `"[appropriate-type]"` (e.g., "architecture-plan")   |
| `handoff.next_agent` | `"[downstream-agent]"` (for next phase)              |

---

**Remember**: Your [outputs] are the contract. The `[relevant-skill]` skill defines the structure—follow it exactly.
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
| 9 | Skill Loading Protocol | ❌ | Tiered loading documented (gateway-mediated, role-based mandatory skills), brief anti-bypass |

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
- **Gold Standard**: `.claude/agents/architecture/frontend-lead.md`
- **Skills Architecture**: `docs/SKILLS-ARCHITECTURE.md`

### Anthropic Guidance

- [Claude Code Sub-agents](https://code.claude.com/docs/en/sub-agents)
- [Effective Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)
- [Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Claude 4 Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices)
- [Agent Skills Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
