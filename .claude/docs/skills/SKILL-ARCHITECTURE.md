# Skill Architecture

**Complete architectural documentation for the two-tier progressive loading skill system.**

## Table of Contents

1. [The Problem](#the-problem)
2. [The Solution: Two-Tier Progressive Loading](#the-solution-two-tier-progressive-loading)
3. [Two-Tier System](#two-tier-system)
4. [Gateway Skills](#gateway-skills)
5. [Router Skills](#router-skills)
6. [CLI Infrastructure](#cli-infrastructure)
7. [Skill Discovery](#skill-discovery)
8. [Skill Anatomy](#skill-anatomy)
9. [Quality Gates](#quality-gates)
10. [TDD Workflow](#tdd-workflow)
11. [Skill Composition Patterns](#skill-composition-patterns)
12. [Token Budget](#token-budget)
13. [Context Engineering Principles](#context-engineering-principles)
14. [Directory Structure Reference](#directory-structure-reference)
15. [FAQ](#faq)
16. [References](#references)

---

## The Problem

Claude Code faces a fundamental tension between capability and context. Anthropic's research reveals that "token usage alone explains 80% of performance variance" in agent tasks, yet Claude Code imposes a hard limit of ~15,000 characters for skill metadataenough for only ~70 skills before truncation. With 160 skills in our system, a naive approach leaves critical capabilities like developing-with-tdd and debugging-systematically completely invisible to Claude. The challenge isn't just fitting more skills; it's achieving both discoverability (Claude knows skills exist) and depth (skills contain comprehensive guidance) **without consuming the context window that agents need for actual work**.

## The Solution: Two-Tier Progressive Loading

We implemented a two-tier progressive loading architecture that achieves 0-token discovery cost for ~130 specialized skills while maintaining instant access to 42 high-frequency skills. Core skills live in `.claude/skills/` and consume the 15K budget (~4,200 chars total). Nine gateway skills act as domain entry points, each consuming ~100 characters but providing routing to dozens of library skills. Library skills in `.claude/skill-library/` have zero discovery costthey load on-demand via the Read tool only when needed. This mirrors Anthropic's context engineering principle: "Good context engineering means finding the smallest possible set of high-signal tokens that maximize the likelihood of some desired outcome." The result: 172 skills accessible while using only 28% of the discovery budget.

**Current totals:**

- **Core skills**: 42 (in `.claude/skills/`)
- **Library skills**: ~130 (in `.claude/skill-library/`)
- **Total**: ~172 skills

## Two-Tier System

### Tier 1: Core Skills

**Location**: `.claude/skills/` (flat structure)

Core skills are auto-discovered by Claude Code's Skill tool and consume the 15K discovery budget. They include:

| Category             | Count | Purpose                                               |
| -------------------- | ----- | ----------------------------------------------------- |
| Workflow skills      | 21    | TDD, debugging, verification, planning, intent        |
| Gateway skills       | 9     | Route to library skills by domain                     |
| Router skills        | 4     | Lifecycle management (agents, skills, commands, MCPs) |
| Orchestration skills | 5     | Multi-agent coordination, research, MCP development   |
| Utility skills       | 3     | Semantic code ops, agent outputs, reusable code       |

**Invocation**: Use the Skill tool

```
skill: "developing-with-tdd"
skill: "gateway-frontend"
```

### Tier 2: Library Skills

**Location**: `.claude/skill-library/` (nested structure)

Library skills have **zero discovery cost**they load on-demand via the Read tool only when needed. They're organized by domain:

```
.claude/skill-library/
├── claude/              # Agent, skill, command, MCP management
├── development/         # Frontend, backend, TypeScript, shell
├── testing/             # API, E2E, mocking, performance
├── security/            # Auth, secrets, cryptography, threat modeling
├── infrastructure/      # Cloud patterns, cost optimization
├── architecture/        # Frontend, backend architecture decisions
├── documents/           # PDF, DOCX, PPTX, XLSX processing
├── workflow/            # Code review, git workflows
├── quality/             # UI/UX laws
└── ai/                  # LLM evaluation
```

**Invocation**: Use the Read tool with the full path

```
Read(".claude/skill-library/development/frontend/using-tanstack-query/SKILL.md")
```

## Gateway Skills

Gateways are routing indices that help agents discover library skills. Each gateway:

- Consumes ~100 characters in the discovery budget
- Lists library skills with their full paths
- Provides usage guidance and decision trees

### Available Gateways

| Gateway                | Domain                                     | Routes To          |
| ---------------------- | ------------------------------------------ | ------------------ |
| `gateway-frontend`     | React, TypeScript, state management        | ~25 library skills |
| `gateway-backend`      | Go, AWS, infrastructure                    | ~20 library skills |
| `gateway-testing`      | API, E2E, mocking, performance             | ~25 library skills |
| `gateway-claude`       | Agent, skill, command, MCP management      | ~30 library skills |
| `gateway-security`     | Auth, secrets, cryptography, defense       | ~12 library skills |
| `gateway-integrations` | Third-party APIs (Jira, HackerOne, etc.)   | ~8 library skills  |
| `gateway-mcp-tools`    | MCP wrappers (Linear, CLI, Context7)       | ~12 library skills |
| `gateway-capabilities` | VQL, Nuclei templates, scanner integration | ~4 library skills  |
| `gateway-typescript`   | TypeScript patterns, Zod, branded types    | ~15 library skills |

### Gateway Workflow

1. **Invoke gateway**: `skill: "gateway-frontend"`
2. **Identify Role**: Gateway checks user's role (Developer, Architect, Tester, etc.)
3. **Load Mandatory Skills**: Gateway defines specific library skills mandatory for that role
4. **Load Task Skills**: Gateway lists available skills for specific tasks
5. **Follow skill instructions**: Each skill is self-contained

### Mandatory Skills by Role

Gateways now enforce **Role-Based Context Loading**. Instead of every agent hardcoding a list of mandatory skills, the agent invokes the gateway, and the gateway dictates what is mandatory based on the agent's role.

**Example from `gateway-frontend`:**

| Your Role          | Mandatory Sections                             |
| ------------------ | ---------------------------------------------- |
| **Developer**      | ALL ROLES + UI STYLING                         |
| **Lead/Architect** | ALL ROLES + UI STYLING + ARCHITECTURE PATTERNS |
| **Reviewer**       | ALL ROLES + UI STYLING                         |

This ensures:

- **Consistency**: All "Developers" load the same core standards
- **Maintenance**: Update mandatory skills in ONE place (the gateway), not 50 agents
- **Efficiency**: Architects don't load testing minutiae; Testers don't load CSS frameworks

### Common Anti-Patterns

```typescript
//  WRONG: Using Skill tool for library skills
skill: "using-tanstack-query"; // FAILS - library skills are NOT in Skill tool

//  WRONG: Guessing paths
Read(".claude/skill-library/using-tanstack-query/..."); // FAILS - wrong path

//  WRONG: Using skill name instead of full path
Read("using-tanstack-query"); // FAILS - must be full path

//  CORRECT: Full path from gateway
Read(".claude/skill-library/development/frontend/using-tanstack-query/SKILL.md");
```

## Router Skills

Router skills manage lifecycle operations for infrastructure components. They're "pure routers" with no scriptsthey delegate to library skills that own the functionality.

### Available Routers

| Router                  | Domain                | Operations                                                              |
| ----------------------- | --------------------- | ----------------------------------------------------------------------- |
| `managing-skills`       | Skill lifecycle       | create, update, audit, fix, delete, rename, migrate, search, list, sync |
| `managing-agents`       | Agent lifecycle       | create, update, test, audit, fix, rename, search, list                  |
| `managing-commands`     | Command lifecycle     | create, audit, fix, list                                                |
| `managing-tool-wrappers` | MCP wrapper lifecycle | create, verify-red, generate, verify-green, update, audit, fix, test    |

### Router Architecture

```
/skill-manager command

skill: "managing-skills" (core router)

Read: .claude/skill-library/claude/skill-management/auditing-skills/SKILL.md

Bash: npm run audit -- <skill-name>

CLI execution + Claude interpretation
```

## CLI Infrastructure

Router skills delegate to library skills that own CLI implementations:

| Package                    | Location                                                        | Commands          |
| -------------------------- | --------------------------------------------------------------- | ----------------- |
| `@chariot/auditing-skills` | `skill-library/claude/skill-management/auditing-skills/scripts` | `audit`, `search` |
| `@chariot/fixing-skills`   | `skill-library/claude/skill-management/fixing-skills/scripts`   | `fix`             |
| `@chariot/updating-skills` | `skill-library/claude/skill-management/updating-skills/scripts` | `update`          |
| `@chariot/auditing-agents` | `skill-library/claude/agent-management/auditing-agents/scripts` | `audit-critical`  |
| `@chariot/fixing-agents`   | `skill-library/claude/agent-management/fixing-agents/scripts`   | `fix`             |

### Running CLI Commands

From `.claude/` root (uses workspace shortcuts):

```bash
npm run audit -- <skill-name>    # Audit single skill
npm run audit                     # Audit all skills
npm run fix -- <skill-name>       # Fix deterministic issues
npm run search -- "query"         # Search skills (core + library)
npm run update -- <skill-name>    # Update skill
```

## Skill Discovery

The `using-skills` skill establishes the mandatory workflow for finding and using skills.

### Search Command

```bash
# From anywhere in repo
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT/.claude" && npm run search -- "query"
```

### Search Output

```
[CORE] debugging-systematically (Score: 95)
   Use when encountering any bug...
    skill: "debugging-systematically"

[LIB] using-tanstack-query (Score: 87)
   Use when implementing data fetching...
    Path: /Users/.../skill-library/development/frontend/using-tanstack-query/SKILL.md
```

**Key distinction:**

- `[CORE]` skills Use Skill tool: `skill: "name"`
- `[LIB]` skills Use Read tool: `Read("path")`

## Skill Anatomy

Every skill follows a consistent structure:

```
skill-name/
├── SKILL.md              # Main skill file (< 500 lines)
├── references/           # Detailed documentation
│   ├── workflow.md
│   ├── patterns.md
│   └── prompts/          # Subagent prompt templates (orchestration skills)
│       ├── architect-prompt.md
│       ├── developer-prompt.md
│       └── tester-prompt.md
├── examples/             # Code examples
├── scripts/              # CLI implementation (optional)
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── .history/             # Change tracking
│   └── CHANGELOG
├── .output/              # CLI outputs (gitignored)
└── .local/               # Temp data (gitignored)
```

### Required Sections in SKILL.md

Every SKILL.md must include these sections:

1. **Frontmatter** - name, description, allowed-tools
2. **Overview/Purpose** - What the skill does
3. **When to Use** - Trigger conditions
4. **Implementation/Workflow** - Step-by-step process
5. **Integration** - Dependencies (Phase 28 requirement)
6. **References** - Links to detailed documentation

### Frontmatter

```yaml
---
name: skill-name # kebab-case, matches directory
description: Use when [trigger]... # Third-person, <120 chars
allowed-tools: Read, Write, Bash # Tool restrictions (optional)
---
```

### Description Requirements

**Format**: `Use when [TRIGGER] - [HIGH-SIGNAL KEYWORDS]`

```yaml
#  CORRECT: Third-person, "Use when" trigger
description: Use when creating skills - guides through TDD workflow with validation

#  WRONG: First-person
description: I help you create skills

#  WRONG: Missing "Use when"
description: Creates skills with TDD validation
```

### Line Count Targets

| Skill Type   | Target  | Maximum |
| ------------ | ------- | ------- |
| Process      | 200-400 | 500     |
| Library      | 400-600 | 800     |
| Integration  | 300-500 | 700     |
| Tool Wrapper | 200-300 | 500     |

**If skill exceeds 500 lines**: Extract content to `references/` directory using progressive disclosure.

## Quality Gates

### 28-Phase Audit System

Skills must pass compliance validation across 28 phases:

**Standard Phases (1-13, 16)**

| Phase | Name                      | Fix Type | Description                                      |
| ----- | ------------------------- | -------- | ------------------------------------------------ |
| 1     | Description Format        | Claude   | "Use when" trigger, <120 chars, no block scalars |
| 2     | Allowed-Tools Field       | Auto     | Comma-separated, valid tool names                |
| 3     | Word Count                | Claude   | SKILL.md <500 lines                              |
| 4     | Broken Links              | Hybrid   | All references/ paths resolve                    |
| 5     | File Organization         | Auto     | SKILL.md + references/ structure                 |
| 6     | Script Organization       | Hybrid   | scripts/ with src/, package.json                 |
| 7     | Output Directory Pattern  | Auto     | .output/ for CLI, .local/ for temp               |
| 8     | TypeScript Structure      | Human    | tsc compiles, all tests pass                     |
| 9     | Bash-TypeScript Migration | Human    | No bash scripts (except POSIX wrappers)          |
| 10    | Reference Audit           | Hybrid   | All skill/agent references exist                 |
| 11    | Command Example Audit     | Claude   | cd uses portable REPO_ROOT pattern               |
| 12    | CLI Error Handling        | Hybrid   | Proper exit codes, user-friendly errors          |
| 13    | State Externalization     | Claude   | TodoWrite for multi-step operations              |
| 16    | Windows Path Detection    | Auto     | No hardcoded Unix paths                          |

**Visual/Style Phases (14a-c, 15, 21)**

| Phase | Name                   | Fix Type | Description                              |
| ----- | ---------------------- | -------- | ---------------------------------------- |
| 14a   | Table Formatting       | Auto     | Markdown tables have headers, separators |
| 14b   | Code Block Quality     | Auto     | Code blocks have language tags           |
| 14c   | Header Hierarchy       | Auto     | Single H1, no skipped levels             |
| 15    | Orphan Detection       | Hybrid   | Library skills referenced in gateway     |
| 21    | Line Number References | Claude   | No static line numbers                   |

**Gateway-Only Phases (17-20)**

| Phase | Name                 | Fix Type | Description                            |
| ----- | -------------------- | -------- | -------------------------------------- |
| 17    | Gateway Structure    | Claude   | Has routing table, correct frontmatter |
| 18    | Routing Table Format | Auto     | Consistent markdown format             |
| 19    | Path Resolution      | Hybrid   | All library paths resolve              |
| 20    | Coverage Check       | Human    | Library skills in at least one gateway |

**Advanced Phases (22-28)**

| Phase | Name                      | Fix Type | Description                                         |
| ----- | ------------------------- | -------- | --------------------------------------------------- |
| 22    | Broken Gateway Paths      | Hybrid   | Gateway routing table paths resolve                 |
| 23    | Coverage Gap Detection    | Human    | Library skills missing from appropriate gateways    |
| 24    | Line Number References    | Claude   | No hardcoded line numbers (use method names)        |
| 25    | Context7 Staleness        | Claude   | Context7 docs <30 days old                          |
| 26    | Reference Content Quality | Claude   | No empty or placeholder reference files             |
| 27    | Relative Path Depth       | Hybrid   | Paths use correct depth for skill location          |
| 28    | Integration Section       | Claude   | Has Called-By, Requires, Calls, Pairs-With sections |

### Fix Categories

- **Deterministic (Auto)**: 2, 5, 7, 14a-c, 18, 19, 21
- **Hybrid (Claude + User)**: 4, 6, 10, 12, 22
- **Claude-Automated**: 1, 3, 11, 13, 17, 18, 20, 24, 25, 26, 28
- **Validation-Only**: 15, 16
- **Human-Required**: 8, 9, 23

### Running Audits

```bash
# Single skill audit
npm run audit -- creating-skills

# All skills audit
npm run audit

# Fix deterministic issues
npm run fix -- creating-skills

# Get fix suggestions (JSON)
npm run fix -- creating-skills --suggest
```

## TDD Workflow

The skill manager enforces Test-Driven Development for all skill creation and updates.

### RED Phase (Prove Gap Exists)

1. Document why skill is needed
2. Test scenario without skill **MUST FAIL**
3. Capture exact failure behavior

### GREEN Phase (Minimal Implementation)

4. Create/update skill to address specific gap
5. Re-test scenario **MUST PASS**
6. Verify no regression

### REFACTOR Phase (Close Loopholes)

7. Run pressure tests (time, authority, sunk cost)
8. Document rationalizations (how agents bypass rules)
9. Add explicit counters ("Not even when...")
10. Re-test until bulletproof

## Skill Composition Patterns

Based on analysis of [obra/superpowers](https://github.com/obra/superpowers), these patterns enable skills to reliably invoke other skills and form traceable workflow chains.

### Pattern 1: REQUIRED SUB-SKILL Directive

Skills explicitly declare when they hand off to another skill using inline directives:

```markdown
## Phase 3: Architecture

**REQUIRED SUB-SKILL:** Use orchestrating-multi-agent-workflows for agent selection
**REQUIRED SUB-SKILL:** Use persisting-agent-outputs for output directory setup

## After All Tasks Complete

**REQUIRED SUB-SKILL:** Use finishing-a-development-branch to complete work
```

**Why this works:**

- Explicit instruction in skill content (not just metadata)
- Claude sees the directive when skill is loaded
- Creates traceable workflow chain

### Pattern 2: Integration Section (Phase 28)

Every skill MUST include an Integration section documenting dependencies:

```markdown
## Integration

### Called By

- `/feature` command - Primary entry point
- `orchestrating-feature-development` (Phase 4)

### Requires (invoke before starting)

| Skill                      | When  | Purpose                   |
| -------------------------- | ----- | ------------------------- |
| `persisting-agent-outputs` | Start | Discover output directory |

### Calls (during execution)

| Skill           | Phase/Step | Purpose                 |
| --------------- | ---------- | ----------------------- |
| `brainstorming` | Phase 1    | Design refinement       |
| `writing-plans` | Phase 3    | Implementation planning |

### Pairs With (conditional)

| Skill                         | Trigger     | Purpose                |
| ----------------------------- | ----------- | ---------------------- |
| `dispatching-parallel-agents` | 3+ failures | Parallel investigation |
```

**Benefits:**

- Skills are never orphaned (Called By shows usage)
- Clear dependency graph (Requires/Calls)
- Enables automated dependency checking

### Pattern 3: Prompt Templates

Orchestration skills include prompt templates for subagents:

```
orchestrating-feature-development/
 SKILL.md
 references/
    prompts/                    # Subagent prompt templates
       architect-prompt.md
       developer-prompt.md
       reviewer-prompt.md
       tester-prompt.md
```

**Template structure:**

```markdown
# Developer Subagent Prompt Template

## Task

[What to implement - paste from plan.md]

## MANDATORY SKILLS (invoke ALL before completing)

- developing-with-tdd: Write test first
- verifying-before-completion: Verify before claiming done
- persisting-agent-outputs: Use for output format

## Output Format

[Structured JSON metadata]
```

**Why templates work:**

- Orchestrator controls exactly what subagent receives
- Mandatory skills embedded in prompt
- Consistent output format enforced

### Pattern 4: Commands as Thin Wrappers

Commands should only invoke skills, not contain logic:

```markdown
# /feature command

---

## description: Complete feature development workflow

Invoke the `orchestrating-feature-development` skill and follow it exactly.

**Feature Request:** $ARGUMENTS
```

**Why thin wrappers:**

- Single source of truth (the skill)
- Skills can be updated without touching commands
- Commands remain stable entry points

### Pattern 5: Workflow Chains

Skills form explicit chains with clear handoff points:

```
/feature (command)
     orchestrating-feature-development (skill)
             REQUIRED: persisting-agent-outputs

             Phase 1: brainstorming
             Phase 2: Discovery (Explore agents)
             Phase 3: writing-plans
             Phase 4: Architecture (lead agents)
             Phase 5: Implementation (developer agents)
             Phase 6: Review (reviewer agents)
             Phase 7-9: Testing (test-lead + testers)

             Phase 10: finishing-a-development-branch
```

## Token Budget

### Discovery vs Execution

| State     | What's Loaded    | When         | Limit                 |
| --------- | ---------------- | ------------ | --------------------- |
| Discovery | Frontmatter only | Always       | ~15,000 chars         |
| Execution | Full SKILL.md    | When invoked | Context window (200K) |

### Budget Math

| Tier           | Count    | Avg Description | Total Budget |
| -------------- | -------- | --------------- | ------------ |
| Core Skills    | 33       | ~100 chars      | ~3,300       |
| Gateway Skills | 9        | ~100 chars      | ~900         |
| Library Skills | ~130     | N/A             | **0**        |
| **Total**      | **~172** |                 | **~4,200**   |

With optimized descriptions, we use ~28% of the 15K budget, leaving room for growth.

### Description Optimization

```yaml
#  Bloated (230 chars)
description: Use when you are working on the frontend. This skill allows you to access React patterns, handle state management with Zustand, run TanStack queries, and fix UI bugs in the application.

#  Optimized (118 chars)
description: Use when developing frontend UI - includes React patterns, Zustand state, TanStack Query, component testing.
```

**Delete filler phrases**: "you are...", "you need to...", "it helps to...", "this skill allows you to..."

## Context Engineering Principles

Our architecture follows Anthropic's context engineering best practices:

### Minimal High-Signal Tokens

Gateways contain just:

- A description for discovery (~100 tokens)
- A routing table of paths (~200 tokens)

This is more efficient than loading 15+ full skill descriptions.

### Just-in-Time Context Retrieval

- **Gateways** = lightweight identifiers
- **Library skills** = loaded just-in-time via Read tool
- **Full content** = only enters context when needed

### Semantic Navigation via Metadata

The nested path structure provides semantic information:

```
.claude/skill-library/development/frontend/state/using-tanstack-query/
```

Claude can infer the skill relates to frontend state management without reading its contents.

### Role-Based Context Loading

Gateways act as intelligent context filters. By defining "Mandatory Skills by Role," we ensure agents only load what is strictly necessary for their function.

- **Frontend Developer Agent** Invokes `gateway-frontend` Loads `optimizing-react-performance`
- **Frontend Architect Agent** Invokes `gateway-frontend` Loads `frontend-architecture-patterns`

This prevents context pollution where an Architect agent is distracted by low-level implementation details, or a Junior Developer agent misses critical performance standards.

### Sub-Agent Isolation

Domain-specific agents with auto-loaded gateway skills:

- Start with clean context
- Load only relevant skills
- Do focused work
- Return results without polluting main context

## Directory Structure Reference

### Core Skills (`.claude/skills/`)

```
.claude/skills/
├── adhering-to-dry/                        # DRY principle enforcement
├── adhering-to-yagni/                      # Scope discipline
├── agent-manager/                          # Agent management utilities
├── brainstorming/                          # Collaborative design
├── calibrating-time-estimates/             # Time estimation
├── debugging-strategies/                   # Debugging techniques
├── debugging-systematically/               # 4-phase debugging
├── developing-with-subagents/              # Subagent orchestration
├── developing-with-tdd/                    # TDD enforcement
├── discovering-reusable-code/              # Code reuse analysis
├── dispatching-parallel-agents/            # Parallel execution
├── enforcing-evidence-based-analysis/      # Evidence-based reasoning
├── engineering-prompts/                    # Prompt optimization
├── executing-plans/                        # Plan execution
├── gateway-backend/                        # Backend routing
├── gateway-capabilities/                   # Capabilities routing
├── gateway-claude/                         # Claude infra routing
├── gateway-frontend/                       # Frontend routing
├── gateway-integrations/                   # Integration routing
├── gateway-mcp-tools/                      # MCP tools routing
├── gateway-security/                       # Security routing
├── gateway-testing/                        # Testing routing
├── gateway-typescript/                     # TypeScript routing
├── managing-agents/                        # Agent lifecycle router
├── managing-commands/                      # Command lifecycle router
├── managing-tool-wrappers/                 # MCP lifecycle router
├── managing-skills/                        # Skill lifecycle router
├── orchestrating-feature-development/      # Feature orchestration
├── orchestrating-mcp-development/          # MCP wrapper orchestration
├── orchestrating-multi-agent-workflows/    # Workflow coordination
├── orchestrating-research/                 # Research orchestration
├── persisting-agent-outputs/               # Agent output persistence
├── persisting-progress-across-sessions/    # Cross-session state
├── semantic-code-operations/               # Serena MCP code ops
├── pressure-testing-skill-content/         # Skill pressure testing
├── threat-modeling-orchestrator/           # Security modeling
├── tracing-root-causes/                    # Root cause analysis
├── translating-intent/                     # Intent expansion
├── using-skills/                           # Skill navigator
├── using-todowrite/                        # TodoWrite guidance
├── verifying-before-completion/            # Verification checklist
└── writing-plans/                          # Implementation planning
```

### Library Skills (`.claude/skill-library/`)

```
.claude/skill-library/
├── ai/                                      # 1 LLM evaluation skill
├── architecture/
│   └── frontend/                            # 3 frontend architecture skills
├── claude/
│   ├── agent-management/                    # 8 agent lifecycle skills
│   ├── skill-management/                    # 12 skill lifecycle skills
│   ├── mcp-tools/                           # 12 MCP wrapper skills
│   ├── mcp-management/                      # MCP server management
│   ├── plugins/                             # 3 plugin management skills
│   ├── hooks/                               # 1 git hook skill
│   ├── marketplaces/                        # 1 distribution skill
│   └── writing-linear-epics-stories/        # 1 project management skill
├── development/
│   ├── frontend/                            # 20 React/TypeScript skills
│   ├── backend/                             # 9 Go/AWS skills
│   ├── capabilities/                        # 12 VQL/scanner skills
│   ├── integrations/                        # 5 third-party API skills
│   ├── typescript/                          # 15 TypeScript skills
│   ├── shell/                               # 2 Bash/YAML skills
│   ├── analyzing-cyclomatic-complexity/     # 1 code quality skill
│   ├── error-handling-patterns/             # 1 error handling skill
│   └── querying-neo4j-with-cypher/          # 1 database skill
├── documents/                               # 4 document processing skills
├── infrastructure/                          # 3 cloud/infra skills
├── lib/                                     # Shared libraries
├── mcp-management/                          # 3 MCP management skills
│   ├── creating-mcp-wrappers/
│   ├── designing-progressive-loading-wrappers/
│   └── setting-up-mcp-servers/
├── quality/                                 # 1 UI/UX skill
├── research/                                # 6 research skills
│   ├── researching-arxiv/
│   ├── researching-codebase/
│   ├── researching-context7/
│   ├── researching-github/
│   ├── researching-perplexity/
│   └── researching-web/
├── security/                                # 11 security skills
├── testing/
│   ├── frontend/                            # 11 React testing skills
│   ├── backend/                             # 4 Go testing skills
│   └── (root)                               # 12 general testing skills
└── workflow/                                # 7 git/review skills
```

## FAQ

### Why not split into multiple plugins?

Multiple plugins could still hit the 70-skill limit collectively. Plugin changes require session restart. Cross-plugin skill references become awkward. The two-tier approach keeps everything in one plugin with controlled budget usage.

### Why gateways instead of just search?

Gateways provide:

- **Discoverability**: Claude sees `gateway-frontend` in tools
- **Curated paths**: No guessinggateway lists what's available
- **Context-aware selection**: Claude chooses gateway based on task

Search is the fallback for discovery, not the primary workflow.

### Why `gateway-{domain}` naming?

- **Grouping**: All gateways cluster alphabetically
- **Self-documenting**: `gateway-*` files are menus
- **Visual clarity**: Developers recognize gateway files instantly

### Why nested structure in library?

The library isn't auto-discovered, so structure doesn't affect tokens. Nested organization helps humans navigate and makes gateway paths readable.

## References

- [Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Agent Skills Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Skills Overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Subagents Documentation](https://code.claude.com/docs/en/sub-agents)
- [obra/superpowers](https://github.com/obra/superpowers) - REQUIRED SUB-SKILL pattern, Integration sections, prompt templates, workflow chains
