# Agent Architecture

## The Problem

Claude Code agents face a paradox: the more capable an agent becomes, the less effective it is. Every line of instruction, every example, every anti-pattern list consumes tokens that could be used for actual work. Anthropic's research shows that "token usage alone explains 80% of performance variance" in agent tasksyet the natural instinct when an agent misbehaves is to add more instructions, creating a vicious cycle of bloat.

**Anthropic's official guidance is explicit**: ["Keep SKILL.md body under 500 lines for optimal performance"](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices). This isn't a suggestionit's a performance threshold. Beyond 500 lines, Claude's attention degrades, critical instructions get diluted, and the agent becomes less reliable. The same principle applies to agent prompts: every token beyond the minimum necessary reduces the context available for actual work.

This manifests in three critical ways:

### 1. Selection Accuracy Degrades with Agent Proliferation

Claude sees agent descriptions via the Task tool's system prompt. With 35 specialized agents, each description competes for attention in Claude's context window. Bloated descriptions with extensive examples and anti-pattern lists don't improve selectionthey dilute signal with noise. When a user says "fix the search in assets page," Claude must pattern-match against ~35 descriptions. Verbose descriptions make similar agents harder to distinguish, leading to misrouting.

**The math**: Each agent description averages 500-1000 characters. With 35 agents, that's 17,500-35,000 characters just for agent discoverybefore any agent is spawned.

### 2. Execution Quality Suffers from Prompt Obesity

Early agents in our system exceeded 1,200 lines (~24,000 tokens). These "bloated orchestrator" patterns attempted to encode every possible scenario, anti-pattern, and workflow directly in the agent prompt. The result:

- **Attention dilution**: Claude's attention budget spreads across thousands of tokens of instructions instead of focusing on the actual task
- **Stale knowledge**: Embedded patterns drift from current codebase state
- **Duplication**: Same patterns repeated across agents, multiplying token cost
- **Context starvation**: Less room for code, tool results, and conversation

A 1,200-line agent consuming 24,000 tokens at spawn leaves only ~176K tokens for worka 12% reduction before the first tool call.

### 3. Sub-Agent Isolation Breaks with Context Pollution

When parent agents share full context with spawned sub-agents, the "clean slate" benefit of sub-agents disappears. Instead of focused workers with minimal context, we get recursive context bloat where each level inherits the parent's entire conversation history. This defeats the primary architectural benefit of sub-agents: their ability to work with only the tokens they need.

---

## Critical Architecture Constraint

**Subagents cannot spawn other subagents.** This is a fundamental limitation of Claude Code's architecture.

When you spawn an agent via `Task(subagent_type: "...")`:

- That agent becomes a **subagent** running in its own context
- Subagents CAN use tools (Read, Write, Bash, Edit, etc.)
- Subagents CAN invoke skills (skills load into their context)
- Subagents **CANNOT** spawn other agents via Task

This constraint has critical implications for orchestration design.

### What Works

```
Main conversation

     Skill("orchestrating-feature-development")   Skill runs IN main

               [Main conversation follows skill instructions]

             Task(frontend-lead)       Main spawns: first-level subagent
             Task(frontend-developer)  Main spawns: first-level subagent
             Task(frontend-tester)     Main spawns: first-level subagent
```

### What Doesn't Work

```
Main conversation

     Task(frontend-orchestrator)      Spawned as subagent

             Task(frontend-lead)       BLOCKED: nested spawning
             Task(frontend-developer)  BLOCKED: nested spawning
```

**Source**: [Claude Code Sub-agents Documentation](https://code.claude.com/docs/en/sub-agents) confirms "No nested spawning: Subagents cannot spawn other subagents."

---

## Core Principle: Skills Orchestrate, Agents Execute

This is the fundamental architectural principle for multi-agent workflows in Claude Code.

| Component  | Runs In                   | Can Spawn Agents | Role                                            |
| ---------- | ------------------------- | ---------------- | ----------------------------------------------- |
| **Skills** | Main conversation context | Yes              | Guide orchestration, coordinate workflow phases |
| **Agents** | Subagent context          | No               | Execute specific tasks, return results          |

### Why Skills Can Orchestrate

When you invoke `Skill("orchestrating-feature-development")`:

1. The skill content loads INTO the main conversation's context
2. Main conversation (following skill instructions) spawns agents
3. These are first-level subagentsallowed by architecture
4. The skill guides main through phases, main does the spawning

### Why Orchestrator Agents Don't Work

When you spawn `Task(frontend-orchestrator)`:

1. The orchestrator becomes a subagent
2. When it tries to spawn `Task(frontend-lead)`, that's nested spawning
3. Nested spawning is blocked by Claude Code architecture
4. The orchestrator either fails silently or hallucinates having spawned

### Orchestration Commands

| Command         | Invokes                                           | Works Because      |
| --------------- | ------------------------------------------------- | ------------------ |
| `/feature`      | `Skill("orchestrating-feature-development")`      | Skill runs in main |
| `/capability`   | `Skill("orchestrating-capability-development")`   | Skill runs in main |
| `/fingerprintx` | `Skill("orchestrating-fingerprintx-development")` | Skill runs in main |
| `/research`     | `Skill("orchestrating-research")`                 | Skill runs in main |

---

## The Solution: Lean Agent Pattern

We implemented a **thin agent architecture** that keeps agent prompts lean while delegating detailed patterns to the skill library.

### Architecture Overview

```

                      User Request
         "Add dark mode with filtering and tests"

                       1. Multi-agent task?  Use orchestration skill


           Orchestration Skill (runs IN main)
   Skill("orchestrating-feature-development")
   Guides main through phases
   Main conversation does all agent spawning

                       2. Main spawns worker agents (first-level subagents)


              Worker Agents (.claude/agents/)
   Lean prompt: Role + Critical rules + Output format
   Skills auto-loaded via frontmatter (gateway-frontend)
   Execute focused tasks, return results
   CANNOT spawn other agents (subagent limitation)

                       3. Agents read skills just-in-time


              Skill Library (On-Demand)
   Gateway skills route to library skills
   Full patterns loaded via Read tool
   No token cost until actually needed

```

### Single-Agent Tasks

For simple tasks that don't need orchestration:

```

                      User Request
              "Fix the search in assets page"

                       1. Claude sees agent descriptions via Task tool


                Agent Selection (Task Tool)
   Core agents (.claude/agents/) - discoverable
   ~500-1000 chars per agent in system prompt
   "Use when" trigger pattern enables accurate selection

                       2. Single agent spawned with lean prompt


           Agent Execution (.claude/agents/)
   Lean prompt: Role + Critical rules + Output format
   Skills auto-loaded via frontmatter (gateway-frontend)
   Executes task, returns results

```

### Token Savings

| Component         | Discovery Cost  | Execution Cost           | Notes                              |
| ----------------- | --------------- | ------------------------ | ---------------------------------- |
| Core agent        | ~500-1000 chars | Full prompt when spawned | In Task tool system prompt         |
| **Library agent** | **0**           | Full prompt when spawned | Not in Task tool - loaded via Read |
| Gateway skills    | ~100 chars      | ~500 tokens              | Auto-loaded via frontmatter        |
| Library skills    | 0               | ~500-2000 tokens         | Loaded via Read tool               |
| Sub-agent return  | N/A             | <2000 tokens             | Condensed summary                  |

---

## Overview

Claude Code agents are specialized sub-processes that handle complex tasks autonomously. This document defines the architectural patterns, quality standards, and governance rules for all agents in the Chariot platform.

**Gold Standard**: `mcp-tool-lead` (~164 lines) - Use as template for all new agents.

---

## Core Principles

### Principle 1: Minimal High-Signal Tokens

Agent prompts contain only what Claude doesn't already know:

- **Identity** - Role statement (1-2 sentences)
- **Skill Loading Protocol** - How to find and use skills
- **Platform Rules** - Non-negotiable constraints specific to this codebase
- **Output Format** - Coordination requirements
- **Blocked Status** - When to stop and what to report

Everything else delegates to skills for on-demand loading.

### Principle 2: Challenge Every Token

Before adding content to an agent, ask:

- "Does Claude really need this explanation?" Probably not
- "Can I assume Claude knows this?" Usually yes
- "Does this paragraph justify its token cost?" Often no

Claude is already expert-level. Only add context it doesn't have.

### Principle 3: Progressive Disclosure

Information loads in tiers, not all at once:

```

 Agent Spawned (~3,000-5,000 tokens)
  Role statement
  Skill Loading Protocol
  Anti-Bypass (brief)
  Output format + Escalation

                   Step 1: Invoke gateway


 Gateway Loaded (~500-1,000 tokens)
  Mandatory skills by role (paths)
  Task routing tables
  Quick Decision Guide

                   Step 3: Read library skills


 Library Skills On-Demand
  Only loaded when Read() called
  ~500-2,000 tokens per skill
  Zero cost until needed

```

### Principle 4: Sub-Agent Isolation

Each agent starts with clean context, does focused work, returns condensed summary (<2,000 tokens). Parent agents don't share full contextthey share specific task instructions.

---

## Language Guidelines

### Anthropic's Official Position

Anthropic's [Claude 4 Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices) states that Claude is trained for precise instruction following and that aggressive language causes overtriggering. The official guidance recommends using direct, normal language.

### Our Empirical Finding: Under-Triggering is the Real Problem

**Testing has proven this guidance insufficient for skill invocation in agents.**

Through systematic pressure testing (see `pressure-testing-skill-content` skill), we discovered that agents using "polite" instruction patterns consistently **under-trigger**they skip mandatory skill invocations when given realistic tasks that don't explicitly mention skills.

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

| Pattern                                          | Purpose                                 |
| ------------------------------------------------ | --------------------------------------- |
| `<EXTREMELY-IMPORTANT>` block                    | Stops agent before task processing      |
| "STOP. READ THIS FIRST. DO NOT SKIP."            | Forces attention before rationalization |
| "Your VERY FIRST ACTION must be..."              | Explicit sequencing requirement         |
| Literal tool call syntax                         | Shows exact calls, not just names       |
| "IF YOU ARE THINKING [X], YOU ARE ABOUT TO FAIL" | Pre-empts specific rationalizations     |
| "YOU MUST WRITE YOUR OUTPUT TO A FILE"           | Prevents text response shortcut         |

### What Doesn't Work: Polite Instructions

| Pattern                                  | Why It Fails                                  |
| ---------------------------------------- | --------------------------------------------- |
| Tables listing skills without emphasis   | Agent reads task, skips to "obvious" solution |
| "You should invoke..."                   | Treated as suggestion, not requirement        |
| Anti-bypass section buried after process | Agent never reaches it                        |
| Brief bullet points                      | Insufficient to override task-focus           |

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

- "I'll invoke skills after understanding the task"  WRONG. Skills tell you HOW to understand.
- "This task is simple/obvious"  WRONG. That's what every failed agent thought.
...
</EXTREMELY-IMPORTANT>
```

### When to Use Each Style

| Context                           | Style               | Rationale                     |
| --------------------------------- | ------------------- | ----------------------------- |
| Mandatory skill invocation        | Aggressive blocking | Prevents under-triggering     |
| Process steps after skills loaded | Normal instructions | Skills provide the discipline |
| Output format                     | Normal instructions | No bypass incentive           |
| Escalation protocol               | Normal instructions | No bypass incentive           |

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

Include 2-4 examples showing user intent agent selection.

### Prompt Template

```markdown
<EXTREMELY-IMPORTANT>
### Step 1: Always Invoke First

Your VERY FIRST ACTION must be invoking skills. Not reading the task. Not thinking about the task. INVOKING SKILLS.

## YOUR FIRST TOOL CALLS MUST BE:

| Skill                               | Why Always Invoke                                                                                    |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `using-skills`                      | **Non-negotiable first read** - compliance rules, 1% threshold, skill discovery. Skipping = failure. |
| `semantic-code-operations`          | **Core code tool** - routes to Serena MCP for semantic search/editing                                |
| `calibrating-time-estimates`        | Prevents "no time to read skills" rationalization, grounds efforts                                   |
| `enforcing-evidence-based-analysis` | **Prevents hallucinations** - you WILL fail catastrophically without this                            |
| `gateway-[domain]`                  | Routes to mandatory + task-specific library skills                                                   |
| `persisting-agent-outputs`          | **Defines WHERE to write output** - discovery protocol, file naming, MANIFEST                        |
| `verifying-before-completion`       | Ensures outputs are verified before claiming done                                                    |

**Role-specific additions (add directly to this table for relevant agent types):**

| Role Type           | Additional Skills                                                    | Rationale                                |
| ------------------- | -------------------------------------------------------------------- | ---------------------------------------- |
| Architecture (lead) | `brainstorming`, `writing-plans`                                     | Explore alternatives, document decisions |
| Developer           | `developing-with-tdd`                                                | Test-first development                   |
| Tester              | `developing-with-tdd`                                                | Test methodology                         |
| Security            | Second gateway: `gateway-security`                                   | Security-specific patterns               |
| Orchestrator        | `orchestrating-multi-agent-workflows`                                | Coordination patterns                    |
| Cross-domain        | Multiple gateways (e.g., `gateway-mcp-tools` + `gateway-typescript`) | Domain intersection                      |

DO THIS NOW. BEFORE ANYTHING ELSE.

### Step 2: Invoke Core Skills Based on Task Context

Your `skills` frontmatter makes these core skills available. **Invoke based on semantic relevance to your task**:

| Trigger                   | Skill                      | When to Invoke                                                           |
| ------------------------- | -------------------------- | ------------------------------------------------------------------------ |
| Code duplication concerns | `adhering-to-dry`          | Reviewing for patterns, architecting plans, eliminating duplication      |
| Scope creep risk          | `adhering-to-yagni`        | Adding features that were not requested, ask questions for clarification |
| Investigating issues      | `debugging-systematically` | Root cause analysis during review                                        |
| Multi-step task (2 steps) | `using-todowrite`          | Anything requiring > 1 task to perform                                   |

**Semantic matching guidance:**

- Quick question? `enforcing-evidence-based-analysis` + `verifying-before-completion`
- Creating implementation plan? `enforcing-evidence-based-analysis` + `brainstorming` + `adhering-to-dry` + `writing-plans` + `using-todowrite` + gateway task-specific library skills
- Full system design? `enforcing-evidence-based-analysis` + `brainstorming` + `writing-plans` + `adhering-to-dry` + gateway task-specific library skills
- Reviewing complex code? `enforcing-evidence-based-analysis` + `debugging-systematically` + `adhering-to-yagni` + `adhering-to-dry`

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

After invoking gateway-[domain], it will tell you which library skills to Read. YOU MUST READ THEM. **Library skill paths come FROM the gatewaydo NOT hardcode them.**

After invoking persisting-agent-outputs, follow its discovery protocol to find/create the feature directory. YOU MUST WRITE YOUR OUTPUT TO A FILE.

## WHY THIS IS NON-NEGOTIABLE

You are an AI. You WILL hallucinate if you skip `enforcing-evidence-based-analysis`. You WILL miss better solutions if you skip `brainstorming`. You WILL produce incomplete work if you skip `verifying-before-completion`.

These skills exist because past agents failed without them. You are not special. You will fail too.

## IF YOU ARE THINKING ANY OF THESE, YOU ARE ABOUT TO FAIL. Do NOT rationalize skipping skills:

- "Time pressure"  WRONG. You are 100x faster than humans. You have time.  `calibrating-time-estimates` exists precisely because this rationalization is a trap.
- "I'll invoke skills after understanding the task"  WRONG. Skills tell you HOW to understand.
- "Simple task"  WRONG. That's what every failed agent thought. Step 1 + `verifying-before-completion` still apply
- "I already know this"  WRONG. Your training data is stale, you are often not up to date on the latest libraries and patterns, read current skills.
- "Solution is obvious"  WRONG. That's coder thinking, not lead thinking - explore alternatives
- "I can see the answer already"  WRONG. Confidence without evidence = hallucination.
- "The user wants results, not process"  WRONG. Bad results from skipped process = failure.
- "Just this once"  "Just this once" becomes "every time" - follow the workflow
- "I'll just respond with text"  WRONG. Follow `persisting-agent-outputs` - write to a file.
- "I'm confident I know the code"  WRONG. Code is constantly evolving  `enforcing-evidence-based-analysis` exists because confidence without evidence = **hallucination**
- "Step 1 is overkill"  WRONG. Five skills costs less than one bug fix
- "I need to gather context first"  WRONG. Skills tell you HOW to gather context
</EXTREMELY-IMPORTANT>

# Agent Name

You are [role statement - 1-2 sentences with domain expertise]. You [primary responsibility] that [downstream agent] executes and [validation agent] validates against.

## Core Responsibilities

### [Primary Responsibility Category]

- [Responsibility 1]
- [Responsibility 2]
- [Responsibility 3]

## When Blocked

Return structured status to orchestrator. Do NOT recommend specific agents - the orchestrator uses `orchestrating-multi-agent-workflows` routing table to decide next steps.

Include in your output metadata:
- `status: "blocked"`
- `blocked_reason`: category (security_concern, architecture_decision, missing_requirements, test_failures, out_of_scope, unknown)
- `attempted`: what you tried before blocking
- `handoff.next_agent`: null (orchestrator decides)

## Output Format

Follow `persisting-agent-outputs` skill for file output, JSON metadata format, and MANIFEST.yaml updates.

**Agent-specific values:**

| Field                | Value                                                |
| -------------------- | ---------------------------------------------------- |
| `output_type`        | `"[appropriate-type]"` (e.g., "architecture-plan")   |
| `handoff.next_agent` | `"[downstream-agent]"` (for next phase)              |

---

**Remember**: Your [outputs] are the contract. The `[relevant-skill]` skill defines the structurefollow it exactly.
```

### Role-Specific Step 1 Integration

**Important**: Role-specific skills are now integrated directly into the Step 1 table, not listed separately. This matches the `mcp-tool-lead` gold standard pattern.

When creating an agent, add role-specific skills to the Step 1 table with appropriate rationale:

| Role Type           | Skills to Add to Step 1 Table         | Example Rationale                                            |
| ------------------- | ------------------------------------- | ------------------------------------------------------------ |
| Architecture (lead) | `brainstorming`, `writing-plans`      | "Enforces exploring alternatives", "Document every decision" |
| Developer           | `developing-with-tdd`                 | "Test-first development"                                     |
| Tester              | `developing-with-tdd`                 | "Test methodology"                                           |
| Test Lead           | `writing-plans`                       | "Test strategy documentation"                                |
| Reviewer/Analysis   | (noneuniversal only)                  |                                                              |
| Security            | Second gateway: `gateway-security`    | "Security-specific patterns"                                 |
| Cross-domain        | Multiple gateways                     | "Domain intersection patterns"                               |
| Orchestrator        | `orchestrating-multi-agent-workflows` | "Coordination patterns"                                      |

**Multiple Gateways Pattern**: Cross-domain agents (e.g., `mcp-tool-lead` uses both `gateway-mcp-tools` + `gateway-typescript`) include multiple gateways for their intersecting domains. Each gateway provides domain-specific library skill routing.

### Available Gateways

| Gateway                | Routes To                                            |
| ---------------------- | ---------------------------------------------------- |
| `gateway-frontend`     | React, TypeScript, Tailwind, TanStack Query patterns |
| `gateway-backend`      | Go, AWS Lambda, DynamoDB, concurrency patterns       |
| `gateway-testing`      | Vitest, Playwright, MSW, behavior testing patterns   |
| `gateway-security`     | Auth, secrets, cryptography, OWASP patterns          |
| `gateway-typescript`   | Zod, error handling, TypeScript patterns             |
| `gateway-mcp-tools`    | MCP wrapper development patterns                     |
| `gateway-capabilities` | VQL, Nuclei, scanner integration patterns            |

### Line Count Targets

| Agent Type                               | Target | Maximum | Rationale                         |
| ---------------------------------------- | ------ | ------- | --------------------------------- |
| Standard (development, testing, quality) | <150   | 200     | Lean agents, skill delegation     |
| Complex (architecture, orchestrator)     | <250   | 350     | More context for design decisions |

Agents exceeding maximums fail audit. Extract content to skills.

---

## Agent Organization

### Directory Structure

```
.claude/agents/                    # Core agents (discoverable via Task tool)
 analysis/                      # Security review, assessment
 architecture/                  # System design, patterns, decisions
 development/                   # Implementation, coding, features
 mcp-tools/                     # Specialized MCP tool access
 orchestrator/                  # RESERVED (orchestration via skills)
 quality/                       # Code review, auditing, standards
 research/                      # Pattern analysis, exploration
 testing/                       # Unit, integration, e2e, quality

.claude/agent-library/             # Library agents (spawned by orchestration skills)
 integration/                   # Integration workflow agents
    integration-researcher.md  # Spawned via orchestrating-research skill
 research/                      # Research workflow agents
     codebase-researcher.md     # Spawned via orchestrating-research skill
     context7-researcher.md     # Spawned via orchestrating-research skill
     github-researcher.md       # Spawned via orchestrating-research skill
     arxiv-researcher.md        # Spawned via orchestrating-research skill
     perplexity-researcher.md   # Spawned via orchestrating-research skill
     web-researcher.md          # Spawned via orchestrating-research skill
```

### Agent Categories

| Category       | Purpose                                         | Permission Mode | Line Target |
| -------------- | ----------------------------------------------- | --------------- | ----------- |
| `architecture` | System design, patterns                         | `plan`          | <250        |
| `development`  | Implementation, coding                          | `default`       | <150        |
| `testing`      | Unit, integration, e2e                          | `default`       | <150        |
| `quality`      | Code review, auditing                           | `default`       | <150        |
| `analysis`     | Security, assessment                            | `plan`          | <150        |
| `research`     | Exploration, patterns                           | `plan`          | <150        |
| `orchestrator` | **RESERVED** - Use orchestration skills instead | N/A             | N/A         |
| `mcp-tools`    | Specialized MCP access                          | `default`       | <150        |

---

## Token Economics

### Per-Spawn Costs

| Component         | Discovery Cost  | Execution Cost    | Notes                              |
| ----------------- | --------------- | ----------------- | ---------------------------------- |
| Agent description | ~500-1000 chars | N/A               | In Task tool prompt                |
| Agent prompt      | N/A             | Full prompt       | Target: <150 lines (~3,000 tokens) |
| Gateway skill     | ~100 chars      | ~500-1,000 tokens | Auto-loaded via frontmatter        |
| Library skill     | 0               | ~500-2,000 tokens | Loaded via Read tool               |
| Sub-agent return  | N/A             | <2,000 tokens     | Condensed summary                  |

### Savings Example

| Pattern       | Lines | Tokens  | Per-Spawn Cost           |
| ------------- | ----- | ------- | ------------------------ |
| Bloated agent | 1,200 | ~24,000 | High context consumption |
| Lean agent    | 135   | ~2,700  | 89% reduction            |

---

## Agent Execution Model

Agents are worker processes that execute specific tasks. They **CANNOT spawn other agents** due to the subagent architecture constraint.

### Core Agents (.claude/agents/)

Core agents are specialized workers discoverable via the Task tool:

| Aspect         | Details                                                 |
| -------------- | ------------------------------------------------------- |
| **Location**   | `.claude/agents/`                                       |
| **Discovery**  | Task tool sees descriptions (~500-1000 chars per agent) |
| **Spawning**   | `Task(subagent_type: "agent-name")`                     |
| **Capability** | Execute focused tasks, return results                   |
| **Limitation** | **CANNOT spawn other agents** (subagent constraint)     |

**Agent Categories:**

- `architecture/` - System design (backend-lead, frontend-lead, capability-lead)
- `development/` - Implementation (backend-developer, frontend-developer, capability-developer)
- `testing/` - Test implementation (backend-tester, frontend-tester, capability-tester)
- `analysis/` - Code review, security (backend-reviewer, capability-reviewer)
- `research/` - Pattern analysis (use native Explore agent for discovery)
- `orchestrator/` - **RESERVED** (orchestration via skills, not agents)

### Library Skills (.claude/skill-library/)

Complex patterns use library SKILLS (not library agents) for on-demand loading:

| Aspect             | Details                                          |
| ------------------ | ------------------------------------------------ |
| **Location**       | `.claude/skill-library/`                         |
| **Discovery cost** | **0** (not loaded until Read)                    |
| **Access**         | Gateway skill routes Read library skill          |
| **Use case**       | Domain-specific patterns, progressive disclosure |

### Orchestration via Skills

**Critical:** Orchestration happens via SKILLS in main conversation, not via orchestrator agents.

| Old Pattern (Broken)                               | New Pattern (Works)                                            |
| -------------------------------------------------- | -------------------------------------------------------------- |
| `Task(frontend-orchestrator)` tries to spawn fails | `Skill("orchestrating-feature-development")` main spawns works |
| Orchestrator agent coordinates                     | Orchestration skill guides main                                |

**Why skills work:**

1. Skills load INTO main conversation's context
2. Main conversation follows skill instructions
3. Main conversation spawns first-level subagents
4. No nested spawningarchitecture is valid

### Orchestration Skills

| Skill                                    | Command         | Purpose                       |
| ---------------------------------------- | --------------- | ----------------------------- |
| `orchestrating-feature-development`      | `/feature`      | Complete feature workflows    |
| `orchestrating-capability-development`   | `/capability`   | Security capability workflows |
| `orchestrating-fingerprintx-development` | `/fingerprintx` | Fingerprintx module workflows |
| `orchestrating-research`                 | `/research`     | Multi-source research         |
| `developing-with-subagents`              | N/A             | Plan execution with review    |

### Agent Library (.claude/agent-library/)

The agent library contains specialized agent definitions for research workflows:

| Agent                   | Purpose                     | Spawned By                   |
| ----------------------- | --------------------------- | ---------------------------- |
| `codebase-researcher`   | Code pattern research       | orchestrating-research skill |
| `github-researcher`     | GitHub repository analysis  | orchestrating-research skill |
| `perplexity-researcher` | Web research via Perplexity | orchestrating-research skill |
| `web-researcher`        | General web research        | orchestrating-research skill |

**Note:** These are spawned by the main conversation (following orchestration skills), NOT by orchestrator agents. The skill runs in main and directs main to spawn these agents.

---

## Quality Gates

### The 9 Audit Phases

| Phase | Name                    | Auto-Fix | Description                                                                                  |
| ----- | ----------------------- | -------- | -------------------------------------------------------------------------------------------- |
| 1     | Frontmatter Syntax      |          | Description not block scalar, name matches filename                                          |
| 2     | Description Quality     |          | "Use when" trigger, includes examples, <1024 chars                                           |
| 3     | Prompt Efficiency       |          | <150/250 lines, delegates to skills, no duplication                                          |
| 4     | Skill Integration       |          | Uses gateway skills, not direct library paths                                                |
| 5     | Output Standardization  |          | Returns structured JSON with skills tracking                                                 |
| 6     | Blocked Status Protocol |          | Clear stopping conditions, returns blocked_reason (no agent recommendations)                 |
| 7     | Body References         |          | Phantom skill detection (referenced but don't exist)                                         |
| 8     | Skill Coverage          |          | Recommended skills based on agent type                                                       |
| 9     | Skill Loading Protocol  |          | Tiered loading documented (gateway-mediated, role-based mandatory skills), brief anti-bypass |

### Validation Commands

```bash
# Audit single agent
/agent-manager audit frontend-developer

# Audit all agents
/agent-manager audit --all

# Fix issues
/agent-manager fix frontend-developer
```

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
| mcp-tools    |  R   |       |      |  R   |      |      |  +   |      |     |

**Note:** `orchestrator` type removedorchestration happens via skills in main conversation, not via orchestrator agents.

### Skill Recommendations by Type

| Type         | Recommended Skills                                                               |
| ------------ | -------------------------------------------------------------------------------- |
| architecture | `brainstorming`, `writing-plans`                                                 |
| development  | `developing-with-tdd`, `debugging-systematically`, `verifying-before-completion` |
| testing      | `developing-with-tdd`, `verifying-before-completion`                             |
| quality      | `verifying-before-completion`                                                    |
| analysis     | `brainstorming`                                                                  |
| mcp-tools    | `gateway-mcp-tools`                                                              |

Additional skills recommended based on keyword detection (e.g., "React" `gateway-frontend`).

---

## Governance

### The Lean Agent Rule

All agents follow the thin orchestrator pattern:

1. **Prompt <150 lines** (complex agents <250)
2. **Description single-line** with `\n` escapes
3. **Skills via gateway** (not direct library paths in frontmatter)
4. **Standardized output** JSON with skills tracking
5. **Blocked status protocol** defined (return `blocked_reason`, no agent recommendations)

**Enforcement**: PR reviews check agent structure. Use `/agent-manager audit`.

### Skill Delegation Principle

If content can live in a skill, it lives in a skill.

| Content Type            | Lives In | Why                                                  |
| ----------------------- | -------- | ---------------------------------------------------- |
| Role definition         | Agent    | Identity is per-agent                                |
| Skill loading protocol  | Agent    | Core workflow                                        |
| Anti-bypass (brief)     | Agent    | Non-negotiable                                       |
| Output format           | Agent    | Coordination requirement                             |
| Blocked status protocol | Agent    | Agent reports status, orchestrator routes            |
| Detailed patterns       | Skill    | Reusable across agents                               |
| Code examples           | Skill    | Progressive loading                                  |
| Workflows               | Skill    | On-demand retrieval                                  |
| Escalation routing      | Skill    | Centralized in `orchestrating-multi-agent-workflows` |

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

 Working: Claude quotes the full description text with examples
 Broken: Claude says "|" or ">" or has to read the file
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
| **Command Router** | `/agent-manager` 8 instruction-based skills           |
| **Coverage**       | 9 validation phases                                   |

### The 8 Skills

| Skill                              | Purpose                 | CLI              | Interactive |
| ---------------------------------- | ----------------------- | ---------------- | ----------- |
| `creating-agents`                  | TDD-driven creation     | `audit-critical` | Yes         |
| `updating-agents`                  | Test-guarded updates    | None             | Yes         |
| `auditing-agents`                  | 9-phase validation      | `audit-critical` | No          |
| `fixing-agents`                    | Interactive remediation | via audit        | Yes         |
| `renaming-agents`                  | Safe renaming           | None             | Yes         |
| `verifying-agent-skill-invocation` | Behavioral validation   | None             | No          |
| `searching-agents`                 | Keyword discovery       | `search`         | No          |
| `listing-agents`                   | Comprehensive list      | None             | No          |

### TDD Workflow

Agent creation and updates follow Red-Green-Refactor:

```

 RED Phase
 1. Document gap: Why is agent needed?
 2. Test scenario without agent  FAIL
 3. Capture exact failure behavior

                   Cannot proceed without failing test


 GREEN Phase
 4. Create/update agent for specific gap
 5. Re-test scenario  PASS
 6. Verify no regression




 REFACTOR Phase
 7. Test discovery (new session)
 8. Verify line count <150/250
 9. Verify skill delegation

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

Do not test changes in the same sessionresults will be invalid.

---

## Architecture Flow

### Agent Selection

```

 User Request
 "Fix the search in assets page"

                   Claude sees descriptions via Task tool


 Agent Selection
  Descriptions from frontmatter
  Examples help match intent
  "Use when" pattern enables selection

                   Agent spawned with lean prompt


 Agent Execution
  Lean prompt: Role + Protocol + Output
  Skills loaded via gateway
  Detailed patterns from skill library

                   Agent reads skills just-in-time


 Skill Library
  Gateway routes to library skills
  Full patterns via Read tool
  Zero cost until needed

```

### Multi-Agent Coordination

For complex tasks requiring multiple agents, use **orchestration skills** (not orchestrator agents):

```
Main conversation

     Skill("orchestrating-feature-development")   Skill runs IN main

               [Main follows skill through phases]

             Task(frontend-lead)       Phase 4: Architecture
             Task(frontend-developer)  Phase 5: Implementation
             Task(frontend-reviewer)   Phase 6: Review
             Task(frontend-tester)     Phase 8: Testing
```

**Key principles:**

1. **Orchestration skill** runs in main conversation and guides the workflow
2. **Main conversation** spawns all agents (first-level subagents)
3. **Worker agents** execute focused tasks and return results (<2,000 tokens)
4. **Main (following skill)** synthesizes results and handles routing

**Parallel execution**: Independent phases run simultaneously via multiple Task tool calls in single message.

**Why not orchestrator agents?** Orchestrator agents become subagents when spawned. Subagents cannot spawn other subagents. Skills run in main, which CAN spawn.

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

## Anthropic Multi-Agent Research Findings

Key insights from [Anthropic's Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system):

### Token Economics

- Multi-agent systems use **15 more tokens** than single-agent chats
- Only use multi-agent for high-value tasks justifying the increased cost
- Consider effort scaling before spawning multiple agents

### When Multi-Agent is Poor Fit

| Scenario                       | Why                                           |
| ------------------------------ | --------------------------------------------- |
| Tasks requiring shared context | All agents need identical information         |
| Heavy interdependencies        | Agents can't coordinate mid-execution         |
| **Most coding tasks**          | Fewer parallelizable components than research |

### Eight Core Principles

1. **Think like your agents** Simulate with exact prompts/tools to observe failure modes
2. **Teach delegation** Provide objectives, output formats, task boundaries
3. **Scale effort to complexity** Simple: 1 agent, 3-10 calls; Complex: 10+ subagents
4. **Prioritize tool design** Poor descriptions send agents down wrong paths
5. **Enable self-improvement** Claude diagnoses failures and suggests improvements
6. **Start broad, narrow later** Begin with short queries, focus progressively
7. **Guide thinking** Extended thinking improves instruction-following
8. **Parallelize execution** Running 3-5 subagents in parallel cuts time by 90%

### Architectural Insight

> "Lead agent coordinates while delegating to specialized subagents operating in parallel."

In our architecture:

- **Skills are the lead agent** Run in main conversation, guide the workflow
- **Agents are workers** Subagents that execute focused tasks

### Synchronous Execution Limitation

> "Synchronous subagent execution creates information flow bottleneckslead agents cannot steer subagents mid-execution."

Once an agent is spawned, it runs to completion. Design agent prompts carefullythere's no mid-flight correction.

---

## References

### Internal

- **Agent Manager**: `.claude/skills/managing-agents/SKILL.md`
- **Agent Management Skills**: `.claude/skill-library/claude/agent-management/`
- **Gold Standard**: `.claude/agents/architecture/mcp-tool-lead.md`
- **Skills Architecture**: `docs/SKILLS-ARCHITECTURE.md`

### Anthropic Guidance

- [Claude Code Sub-agents](https://code.claude.com/docs/en/sub-agents) - **Critical**: Documents "no nested spawning" constraint
- [Agent Skills Overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) - Three-level progressive disclosure architecture
- [Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system) - Token economics, eight principles, when multi-agent is poor fit
- [Effective Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)
- [Claude 4 Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices)
- [Agent Skills Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

### Community Resources

- [Multi-Agent Orchestration: 10 Claude Instances in Parallel](https://dev.to/bredmond1019/multi-agent-orchestration-running-10-claude-instances-in-parallel-part-3-29da) - Real-world parallel execution patterns
- [Multi-Agents vs Tool Groups: A Layered Approach](https://offnote.substack.com/p/multi-agents-vs-tool-groups-a-layered) - Architectural trade-offs analysis
