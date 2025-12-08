# Agent Architecture

## The Problem

Claude Code agents face two critical problems that degrade selection accuracy and execution quality:

### Problem 1: Broken Descriptions (Invisible Agents)

YAML block scalars (`|` and `>`) don't work for agent descriptions. Claude Code's parser returns the literal character, not the content.

**Empirically verified** through testing with `react-developer` and `haskell-developer` agents:

```yaml
# ❌ BROKEN - Claude sees description as literally "|"
description: |
  Use when developing React applications.

# ❌ BROKEN - Claude sees description as literally ">"
description: >
  Use when developing React applications.

# ✅ WORKING - Claude sees the full description
description: Use when developing React applications - components, UI bugs, performance.
```

**Impact**: Agents using block scalars are **invisible** to Claude's selection mechanism. The Task tool shows the literal `|` or `>` character instead of the actual description. Claude cannot match user intent to agent purpose.

### Problem 2: Context Rot (Agent Prompt Bloat)

Agent prompts directly enter the sub-agent's context window when spawned. Excessive tokens cause "context rot" where model performance degrades.

| Agent | Lines Before | Target | Status |
|-------|-------------|--------|--------|
| `react-developer` | 1,220 | <300 | ✅ Refactored to 336 |
| `universal-coordinator` | 717 | <300 | 🔄 Pending |
| `go-architect` | 518 | <300 | 🔄 Pending |
| `go-developer` | 235 | <300 | ✅ Archived |
| `go-api-developer` | 223 | <300 | ✅ Archived |

**Current state** (estimated):
- Average agent prompt: ~400 lines (~8,000 tokens)
- When spawned, entire prompt enters sub-agent context
- Large prompts reduce room for task execution and tool results

**Target state**:
- Average agent prompt: ~150-250 lines (~3,000-5,000 tokens)
- 50-60% reduction in per-spawn context cost
- More room for actual work

### Problem 3: Orchestrator Sprawl (RESOLVED)

**Previous state**: 8 orchestrator agents created selection confusion.

**Current state**: Consolidated to 2 domain-specific orchestrators:
- `backend-orchestrator` - Go, AWS, infrastructure coordination
- `frontend-orchestrator` - React, TypeScript, UI coordination

**Resolution**: Domain-based orchestration eliminates selection ambiguity. Agents know exactly which orchestrator to use based on task domain.

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
│                Agent Selection (Task Tool)                   │
│  • Descriptions from frontmatter (~500-1000 chars each)     │
│  • Examples help Claude match intent to agent               │
│  • "Use when" trigger pattern enables accurate selection    │
└─────────────────────┬───────────────────────────────────────┘
                      │ 2. Agent spawned with lean prompt (~300 lines)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           Agent Execution (.claude/agents/)                  │
│  • Lean prompt: Role + Critical rules + Output format       │
│  • Skills auto-loaded via frontmatter (gateway-frontend)    │
│  • Detailed patterns delegated to skill library             │
└─────────────────────┬───────────────────────────────────────┘
                      │ 3. Agent reads skills just-in-time
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Skill Library (On-Demand)                       │
│  • Gateway skills route to library skills                   │
│  • Full patterns loaded via Read tool                       │
│  • No token cost until actually needed                      │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

| Principle | Implementation | Benefit |
|-----------|---------------|---------|
| **Thin orchestrators** | Agent prompt <300 lines | More context for work |
| **Skill delegation** | "For X, use skill Y" pattern | Patterns load on-demand |
| **Gateway integration** | `skills: gateway-frontend` | Progressive disclosure |
| **Standardized output** | JSON with handoff info | Clear coordination |
| **Escalation protocols** | When to stop, who to recommend | Maintains control |

### Token Savings

| Component | Discovery Cost | Execution Cost | Notes |
|-----------|----------------|----------------|-------|
| Agent description | ~500-1000 chars | N/A | In Task tool prompt |
| Agent prompt | N/A | Full prompt when spawned | Target: <300 lines |
| Gateway skills | ~100 chars | ~500 tokens | Auto-loaded via frontmatter |
| Library skills | 0 | ~500-2000 tokens | Loaded via Read tool |
| Sub-agent return | N/A | <2000 tokens | Condensed summary |

**Before**: 1220-line react-developer = ~24,000 tokens per spawn
**After**: 336-line react-developer = ~6,700 tokens per spawn
**Savings**: ~72% reduction in per-spawn context cost

---

## Agent Organization

### Directory Structure

```
.claude/agents/
├── architecture/     # 7 agents - system design, patterns, decisions
│   ├── go-architect.md
│   ├── react-architect.md
│   ├── security-architect.md
│   └── ...
├── development/      # 16 agents - implementation, coding, features
│   ├── react-developer.md
│   ├── go-developer.md
│   ├── typescript-developer.md
│   └── ...
├── testing/          # 8 agents - unit, integration, e2e, quality
│   ├── frontend-browser-test-engineer.md
│   ├── backend-unit-test-engineer.md
│   └── ...
├── quality/          # 5 agents - code review, auditing, standards
│   ├── go-code-reviewer.md
│   ├── react-code-reviewer.md
│   └── ...
├── analysis/         # 6 agents - security, complexity, intent
│   ├── security-risk-assessor.md
│   ├── complexity-assessor.md
│   └── ...
├── research/         # 3 agents - web search, patterns, documentation
│   ├── web-research-specialist.md
│   ├── code-pattern-analyzer.md
│   └── ...
├── orchestrator/     # 2 agents - domain-specific coordination
│   ├── backend-orchestrator.md
│   └── frontend-orchestrator.md
└── mcp-tools/        # 2 agents - specialized MCP tool access
    ├── praetorian-cli-expert.md
    └── chromatic-test-engineer.md
```

### Agent Categories

| Category | Count | Purpose | Permission Mode |
|----------|-------|---------|-----------------|
| `architecture` | 7 | System design, patterns, decisions | `plan` |
| `development` | 16 | Implementation, coding, features | `default` |
| `testing` | 8 | Unit, integration, e2e testing | `default` |
| `quality` | 5 | Code review, auditing | `default` |
| `analysis` | 6 | Security, complexity assessment | `plan` |
| `research` | 3 | Web search, documentation | `plan` |
| `orchestrator` | 2 | Domain-specific coordination | `default` |
| `mcp-tools` | 2 | Specialized MCP access | `default` |

**Total**: 49 agents across 8 categories (6 orchestrators consolidated to 2)

---

## Agent Anatomy

### Frontmatter Structure

```yaml
---
name: agent-name                    # REQUIRED: kebab-case, <64 chars, matches filename
description: Use when [trigger]...  # REQUIRED: Single-line, <1024 chars, with examples
type: development                   # Category for organization
permissionMode: default             # default|plan|acceptEdits|bypassPermissions
tools: Read, Write, Edit, Bash      # Comma-separated, minimal viable set
skills: gateway-frontend            # Gateway skills only (not library paths)
model: opus                         # opus|sonnet|haiku|inherit
---
```

### Description Syntax (CRITICAL)

**Rule**: Never use block scalars (`|` or `>`). Always single-line with `\n` escapes.

```yaml
# ✅ CORRECT: Single-line with escaped newlines
description: Use when developing React applications - components, UI bugs, performance.\n\n<example>\nContext: User needs dashboard\nuser: "Create metrics dashboard"\nassistant: "I'll use react-developer"\n</example>

# ❌ WRONG: Block scalar breaks discovery
description: |
  Use when developing React applications.
```

### Description Pattern

```
Use when [TRIGGER] - [CAPABILITIES].\n\n<example>\nContext: [SITUATION]\nuser: "[REQUEST]"\nassistant: "[RESPONSE]"\n</example>
```

**Components**:
- **Trigger**: What activates this agent ("developing React", "designing architecture")
- **Capabilities**: Comma-separated list of what agent can do
- **Examples**: 2-4 `<example>` blocks showing user intent → agent selection

### Prompt Structure (Target: <300 lines)

```markdown
# Agent Name

You are [role statement - 1-2 sentences].

## Core Responsibilities

- [Responsibility 1]
- [Responsibility 2]
- [Responsibility 3]

## Skill References (Load On-Demand via Gateway)

**IMPORTANT**: Before implementing, consult the `gateway-X` skill.

| Task | Skill to Read |
|------|---------------|
| [Task 1] | `.claude/skill-library/path/to/SKILL.md` |
| [Task 2] | `.claude/skill-library/path/to/SKILL.md` |

## Critical Rules (Non-Negotiable)

### [Rule Category 1]
[Specific rules that cannot live in skills]

### [Rule Category 2]
[Platform-specific constraints]

## Mandatory Skills (Must Use)

### [Skill 1 Name]
**When**: [Trigger condition]
**Use**: `skill-name` skill

### [Skill 2 Name]
**When**: [Trigger condition]
**Use**: `skill-name` skill

## Output Format (Standardized)

Return results as structured JSON:

```json
{
  "status": "complete|blocked|needs_review",
  "summary": "1-2 sentence description",
  "files_modified": ["paths"],
  "verification": {
    "tests_passed": true,
    "build_success": true,
    "command_output": "snippet"
  },
  "handoff": {
    "recommended_agent": "agent-name",
    "context": "what to do next"
  }
}
```

## Escalation Protocol

**Stop and escalate if**:
- [Condition 1] → Recommend `agent-name`
- [Condition 2] → Recommend `agent-name`
- Blocked by unclear requirements → Use AskUserQuestion tool

## Quality Checklist

Before completing, verify:
- [ ] [Check 1]
- [ ] [Check 2]
- [ ] [Check 3]
```

---

## Quality Gates

### The 6 Agent Quality Phases

| Phase | Name | Auto-Fix | Description |
|-------|------|----------|-------------|
| 1 | Frontmatter Syntax | ✅ | Description not block scalar, name matches filename |
| 2 | Description Quality | ❌ | "Use when" trigger, includes examples, <1024 chars |
| 3 | Prompt Efficiency | ❌ | <300 lines, delegates to skills, no duplication |
| 4 | Skill Integration | ✅ | Uses gateway skills, not direct library paths |
| 5 | Output Standardization | ❌ | Returns structured JSON with handoff |
| 6 | Escalation Protocol | ❌ | Clear stopping conditions, agent recommendations |

### Validation Commands

```bash
# Check agent description syntax (must not be | or >)
# Use via command:
/agent-manager audit react-developer

# Or directly invoke skill:
skill: "auditing-agents"

# Audit all agents
/agent-manager audit --all

# Fix issues
/agent-manager fix react-developer
```

### Line Count Targets

| Agent Type | Target | Maximum | Rationale |
|------------|--------|---------|-----------|
| Development | <250 | 300 | Implementation focus |
| Architecture | <300 | 400 | More context for decisions |
| Testing | <200 | 250 | Focused on verification |
| Orchestrator | <300 | 400 | Coordination complexity |

---

## Governance & Maintenance

### The Lean Agent Rule

All agents **MUST** follow the thin orchestrator pattern:

1. **Prompt <300 lines** (complex agents <400 max)
2. **Description single-line** with `\n` escapes
3. **Skills via gateway** (not direct library paths in frontmatter)
4. **Standardized output** JSON format
5. **Escalation protocol** defined

**Enforcement**: PR reviews must check agent structure. Use `agent-manager audit` command.

### Agent Consolidation Policy

When agents have overlapping responsibilities:

1. **Identify overlap**: Search for agents with similar descriptions/capabilities
2. **Merge or parameterize**: Create one agent with domain parameter
3. **Update references**: Find all places referencing old agents
4. **Archive old agents**: Move to `.archived/` with reason

**Example**: `go-developer` + `go-api-developer` → single `go-developer` with full capabilities

### Skill Delegation Principle

**If content can live in a skill, it MUST live in a skill.**

| Content Type | Lives In | Why |
|--------------|----------|-----|
| Role definition | Agent | Identity is per-agent |
| Critical rules | Agent | Non-negotiable constraints |
| Output format | Agent | Coordination requirement |
| Escalation | Agent | Agent-specific boundaries |
| Detailed patterns | Skill | Reusable across agents |
| Code examples | Skill | Progressive loading |
| Workflows | Skill | On-demand retrieval |

### Description Discovery Testing

After editing an agent, test discovery in a new session:

```
User: What is the description for the [agent-name] agent? Quote it exactly.

✅ Working: Claude quotes the full description text with examples
❌ Broken: Claude says "|" or ">" or has to read the file
```

**Note**: Agent metadata is cached at session start. You MUST start a new session to see updated descriptions.

---

## Agent Manager

The Agent Manager is the lifecycle management system for Claude Code agents. It enforces the lean agent pattern (<300 lines), validates compliance through 8 audit phases, fixes the critical block scalar description problem, and provides comprehensive tooling for creating, updating, auditing, fixing, renaming, testing, searching, and listing agents.

### Overview

| Aspect | Details |
|--------|---------|
| **Location** | `.claude/skills/agent-manager/` |
| **Purpose** | Unified agent lifecycle management with TDD enforcement |
| **Philosophy** | Test-first: agents must prove gap exists before creation |
| **Coverage** | 8 validation phases for agent quality |
| **Invocation** | Via `/agent-manager` command or `agent-manager` skill |
| **Scope** | Manages all agents across 8 categories in `.claude/agents/` |

### Directory Structure

```
.claude/skills/agent-manager/
├── SKILL.md                    # Main skill documentation
├── scripts/
│   ├── src/
│   │   ├── create.ts           # TDD-driven agent creation
│   │   ├── update.ts           # Test-guarded updates
│   │   ├── audit.ts            # 8-phase compliance validation
│   │   ├── fix.ts              # Compliance remediation (3 modes)
│   │   ├── rename.ts           # Safe renaming with reference updates
│   │   ├── test.ts             # Discovery and skill testing
│   │   ├── search.ts           # Keyword agent search
│   │   ├── list.ts             # List all agents with status
│   │   └── lib/
│   │       ├── agent-finder.ts         # Find agents by name/pattern
│   │       ├── agent-parser.ts         # Parse agent frontmatter/body
│   │       ├── audit-runner.ts         # Audit orchestration
│   │       ├── fix-handlers.ts         # Fix application logic
│   │       ├── skill-checker.ts        # Validate skill references
│   │       ├── skill-recommender.ts    # Suggest missing skills
│   │       ├── phases/                 # 8 audit implementations
│   │       │   ├── phase1-frontmatter-syntax.ts
│   │       │   ├── phase2-description-quality.ts
│   │       │   ├── phase3-prompt-efficiency.ts
│   │       │   ├── phase4-skill-integration.ts
│   │       │   ├── phase5-output-standardization.ts
│   │       │   ├── phase6-escalation-protocol.ts
│   │       │   ├── phase7-body-references.ts
│   │       │   └── phase8-skill-coverage.ts
│   │       └── types.ts                # TypeScript type definitions
│   ├── package.json
│   └── tsconfig.json
├── templates/                  # Agent generation templates
└── references/                 # Workflow documentation
    ├── create-workflow.md
    ├── update-workflow.md
    ├── audit-phases.md
    ├── fix-workflow.md
    ├── rename-protocol.md
    ├── test-workflow.md
    └── search-workflow.md
```

### TDD Workflow (Mandatory)

The Agent Manager enforces a strict Red-Green-Refactor cycle for all agent creation and updates. You cannot create or modify an agent without first proving the gap exists.

```
┌─────────────────────────────────────────────────────────────┐
│                    🔴 RED Phase                              │
│  1. Document gap: Why is this agent needed?                 │
│  2. Test scenario without agent → MUST FAIL                 │
│  3. Capture exact failure behavior (verbatim)               │
└─────────────────────┬───────────────────────────────────────┘
                      │ Cannot proceed without failing test
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    🟢 GREEN Phase                            │
│  4. Create/update agent to address specific gap             │
│  5. Re-test scenario → MUST PASS                            │
│  6. Verify no regression in existing behavior               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    🔵 REFACTOR Phase                         │
│  7. Test agent discovery (quote description in new session) │
│  8. Verify line count <300 (or <400 for complex)            │
│  9. Verify skill delegation (not embedded patterns)         │
└─────────────────────────────────────────────────────────────┘
```

**Key Enforcement**:
- `create` requires gap documentation before generation
- `update` requires RED phase documentation of current failure
- All operations include automatic 8-phase audit validation
- Discovery testing ensures descriptions are visible to Claude

### The 8 Audit Phases

Agents must pass compliance validation across 8 phases:

| Phase | Name | Auto-Fix | Description |
|-------|------|----------|-------------|
| 1 | Frontmatter Syntax | ✅ | Description not block scalar, name matches filename, color field, permissionMode alignment, field ordering, alphabetical tool/skill sorting |
| 2 | Description Quality | ❌ | "Use when" trigger pattern, includes `<example>` blocks, <1024 chars |
| 3 | Prompt Efficiency | ❌ | <300 lines (complex <400), delegates patterns to skills, no duplication |
| 4 | Skill Integration | ✅ | Uses gateway skills (not library paths), tool appropriateness by agent type |
| 5 | Output Standardization | ❌ | Returns structured JSON with status, summary, verification, handoff |
| 6 | Escalation Protocol | ❌ | Clear stopping conditions, agent recommendations for handoffs |
| 7 | Body References | ✅ | Phantom skill detection (referenced skills that don't exist) |
| 8 | Skill Coverage | ❌ | Recommended skills based on agent type and keywords |

**Fix Categories**:
- **Deterministic (auto-apply)**: Phases 1 (syntax), 4 (skill paths), 7 (phantom skills)
- **Semantic (Claude-mediated)**: Phases 2, 3, 5, 6, 8 (use `--suggest` mode)

### CLI Reference

All commands run from the scripts directory:

```bash
# Setup (one-time)
cd .claude/skills/agent-manager/scripts
npm install

# Or from anywhere via npx
npx tsx .claude/skills/agent-manager/scripts/src/audit.ts <args>
```

#### Core Operations

| Command | Description | Time |
|---------|-------------|------|
| `npm run create -- <name> "<desc>" --type <category>` | TDD-driven agent creation | 15-30 min |
| `npm run update -- <name> "<changes>"` | Test-guarded updates | 10-20 min |
| `npm run audit -- [name] [--all]` | 8-phase compliance check | 2-5 min |
| `npm run fix -- <name> [--dry-run\|--suggest]` | Compliance remediation | 5-15 min |
| `npm run rename -- <old> <new>` | Safe renaming with updates | 5-10 min |
| `npm run test -- <name> [skill-name]` | Discovery and skill testing | 5-10 min |
| `npm run search -- "<query>"` | Keyword agent search | 1-2 min |
| `npm run list -- [--type <category>]` | List all agents with status | 1 min |

#### Agent Type Options

For `create` command `--type` parameter:

| Type | Purpose | Permission Mode | Example Agents |
|------|---------|-----------------|----------------|
| `architecture` | System design, patterns, decisions | `plan` | `go-architect`, `react-architect` |
| `development` | Implementation, coding, features | `default` | `react-developer`, `go-developer` |
| `testing` | Unit, integration, e2e testing | `default` | `frontend-browser-test-engineer` |
| `quality` | Code review, auditing | `default` | `go-code-reviewer`, `react-code-reviewer` |
| `analysis` | Security, complexity assessment | `plan` | `security-risk-assessor` |
| `research` | Web search, documentation | `plan` | `web-research-specialist` |
| `orchestrator` | Coordination, workflows | `default` | `universal-coordinator` |
| `mcp-tools` | Specialized MCP access | `default` | `praetorian-cli-expert` |

#### Example: Creating a New Agent

```bash
# 1. Setup (one-time)
cd .claude/skills/agent-manager/scripts
npm install

# 2. RED Phase - Document the gap
# [Document why agent is needed, test without it, capture failure]

# 3. Create agent with type
npm run create -- debugging-specialist \
  "Use when debugging complex issues - systematic root cause analysis, breakpoint strategies" \
  --type development

# 4. GREEN Phase - Verify agent solves the gap
# [Test with new agent, should pass]

# 5. Audit compliance
npm run audit -- debugging-specialist
# ✅ All 8 phases passed

# 6. Discovery Test - Verify description visible
# [Start new Claude Code session, ask: "What is the description for debugging-specialist?"]
```

#### Semantic Fix IDs

When using `--suggest` mode, these fix IDs are available for `--apply`:

| ID | Phase | Description |
|----|-------|-------------|
| `phase1-description` | 1 | Convert block scalar to single-line |
| `phase1-color-missing` | 1 | Add color field |
| `phase1-color-mismatch` | 1 | Fix incorrect color for agent type |
| `phase1-permission-mode` | 1 | Fix permissionMode value |
| `phase1-ordering` | 1 | Reorder frontmatter fields |
| `phase1-tools-sort` | 1 | Sort tools alphabetically |
| `phase1-skills-sort` | 1 | Sort skills alphabetically |
| `phase2-trigger` | 2 | Add "Use when" trigger |
| `phase2-examples` | 2 | Add example blocks |
| `phase3-trim` | 3 | Extract patterns to skills |
| `phase4-gateway` | 4 | Replace library paths with gateway |
| `phase4-add-tool-{name}` | 4 | Add required/recommended tool |
| `phase4-remove-tool-{name}` | 4 | Remove forbidden tool |
| `phase5-output` | 5 | Add standardized JSON output |
| `phase6-escalation` | 6 | Add escalation protocol |
| `phase7-remove-phantom-{name}` | 7 | Remove phantom skill reference |
| `phase8-add-skill-{name}` | 8 | Add recommended skill |

### Block Scalar Problem (Critical)

The Agent Manager specifically addresses the YAML block scalar problem that makes agents invisible to Claude.

**The Problem**: YAML block scalars (`|` and `>`) don't work for agent descriptions. Claude Code's parser returns the literal character, not the content.

```yaml
# ❌ BROKEN - Claude sees description as literally "|"
description: |
  Use when developing React applications.

# ❌ BROKEN - Claude sees description as literally ">"
description: >
  Use when developing React applications.

# ✅ WORKING - Claude sees the full description
description: Use when developing React applications - components, UI bugs, performance.\n\n<example>\nContext: User needs dashboard\nuser: "Create metrics dashboard"\nassistant: "I'll use react-developer"\n</example>
```

**Detection**: Phase 1 audit detects block scalars and flags them as critical issues
**Fix**: `npm run fix -- <agent> --apply phase1-description` converts to single-line format

### Discovery Testing Protocol

**After editing ANY agent, test in a NEW session:**

```
User: What is the description for the [agent-name] agent? Quote it exactly.

✅ Working: Claude quotes the full description text with examples
❌ Broken: Claude says "|" or ">" or has to read the file
```

**Important**: Agent metadata is cached at session start. You MUST start a new session to see updated descriptions.

The `npm run test -- <agent-name>` command automates this verification.

### Agent Search

Find agents by keyword across all categories:

```bash
npm run search -- "react"
npm run search -- "security" --type analysis
npm run search -- "coordinator" --limit 5
```

**Scoring algorithm**:
- Name exact match: 100 points
- Name substring: 50 points
- Description match: 30 points
- Type match: 20 points
- Skills match: 10 points

### Tool Appropriateness by Type

Phase 4 audit checks tool assignments against agent type requirements:

| Agent Type | Required Tools | Forbidden Tools | Recommended Tools |
|------------|----------------|-----------------|-------------------|
| `architecture` | Read, Grep, Glob | - | TodoWrite, WebFetch |
| `development` | Read, Write, Edit, Bash | - | TodoWrite, Grep, Glob |
| `testing` | Read, Write, Bash | - | TodoWrite, Edit |
| `quality` | Read, Grep, Glob | Write, Edit | TodoWrite |
| `analysis` | Read, Grep, Glob | Write, Edit | TodoWrite, WebFetch |
| `research` | Read, WebFetch, WebSearch | Write, Edit | TodoWrite |
| `orchestrator` | Task, TodoWrite | - | Read, AskUserQuestion |
| `mcp-tools` | Read, Bash | - | TodoWrite |

### Skill Recommendations by Type

Phase 8 audit suggests skills based on agent type and body keywords:

| Agent Type | Base Recommended Skills |
|------------|------------------------|
| `architecture` | `brainstorming`, `writing-plans` |
| `development` | `developing-with-tdd`, `debugging-systematically`, `verifying-before-completion` |
| `testing` | `developing-with-tdd`, `verifying-before-completion` |
| `quality` | `verifying-before-completion` |
| `analysis` | `brainstorming` |
| `research` | - |
| `orchestrator` | `writing-plans`, `executing-plans` |
| `mcp-tools` | `gateway-mcp-tools` |

Additional skills are recommended based on keyword detection in the agent body (e.g., "React" → `gateway-frontend`).

---

## Migration from Legacy Agents

### Before (Legacy Pattern)

```yaml
# ❌ Block scalar breaks discovery
description: >
  Use this agent when you need expert-level Go development assistance, including
  writing new Go code, refactoring existing code, implementing complex
  algorithms, designing Go architectures, optimizing performance, handling
  concurrency patterns, or solving advanced Go programming challenges.

  <example>
  Context: User needs worker pool
  user: 'Create a worker pool'
  assistant: 'I'll use golang-expert-developer'
  </example>
```

**Problems**:
- Description invisible to Claude (shows `>`)
- 235 lines of duplicated patterns
- No standardized output format
- No escalation protocol

### After (Lean Pattern)

```yaml
# ✅ Single-line with \n escapes
description: Use when developing React frontend applications - creating components, fixing UI bugs, optimizing performance, integrating APIs.\n\n<example>\nContext: User needs dashboard\nuser: "Create metrics dashboard"\nassistant: "I'll use react-developer"\n</example>
```

**Improvements**:
- Description visible to Claude
- 336 lines with skill delegation
- Standardized JSON output
- Clear escalation to other agents

### Migration Procedure

1. **Convert description**: Block scalar → single-line with `\n` escapes
2. **Extract patterns**: Move detailed workflows to skills
3. **Add skill routing**: Create "Skill References" table
4. **Add output format**: Standardized JSON structure
5. **Add escalation**: When to stop, who to recommend
6. **Verify line count**: Target <300 lines
7. **Test discovery**: New session, ask Claude to quote description
8. **Archive old version**: Move original to `.archived/`

## Quick Reference

### Create New Agent

```bash
# Use agent-manager skill
/agent-manager new my-agent "Use when [trigger] - [capabilities]"
```

### Audit Agent

```bash
cd .claude/skills/agent-manager/scripts
npm run audit -- agent-name        # Single agent
npm run audit -- --all             # All agents
```

### Fix Agent Issues

```bash
npm run fix -- agent-name --dry-run  # Preview
npm run fix -- agent-name            # Apply
```

### Test Agent Discovery

In new Claude Code session:
```
What is the description for the react-developer agent? Quote it exactly.
```

---

## Gold Standard: react-developer

The refactored `react-developer` agent demonstrates the lean pattern:

**Location**: `.claude/agents/development/react-developer.md`

**Metrics**:
- Lines: 336 (vs 1220 original)
- Description: Single-line with 3 examples
- Skills: Gateway pattern (`gateway-frontend`)
- Output: Standardized JSON with handoff
- Escalation: 4 conditions with agent recommendations

**Key Patterns**:
1. Role statement in 1 sentence
2. Skill routing table with exact paths
3. Critical rules (import order, file limits, styling)
4. Mandatory skills (TDD, debugging, verification)
5. Platform-specific patterns (Chariot UI, API integration)
6. Quality checklist before completion
7. Verification commands (exit criteria)

**Use as template** for refactoring other agents.

---

## Why This Works: Context Engineering Principles

### Principle 1: Minimal High-Signal Tokens

> "Good context engineering means finding the smallest possible set of high-signal tokens."

Agent prompts should contain only:
- Identity (role statement)
- Non-negotiable rules
- Coordination info (output format, escalation)

Everything else delegates to skills for on-demand loading.

### Principle 2: Just-in-Time Retrieval

> "Agents maintain lightweight identifiers and use references to dynamically load data at runtime."

Gateway skills provide paths to detailed patterns. Agents don't embed patterns—they reference them and load via Read tool when needed.

### Principle 3: Sub-Agent Isolation

> "Sub-agents handle focused tasks with clean context windows."

Each agent starts with a lean prompt, loads only relevant skills, does deep work, and returns a condensed summary (<2000 tokens).

### Principle 4: Clear Boundaries

> "Stop conditions and handoffs maintain control."

Every agent has:
- Escalation protocol (when to stop)
- Handoff recommendations (who should continue)
- Structured output (coordination information)

---

## References

### Internal Documentation

- **Agent Manager**: `.claude/skills/agent-manager/SKILL.md`
- **Skills Architecture**: `docs/SKILLS-ARCHITECTURE.md`
- **MCP Tools Architecture**: `docs/MCP-TOOLS-ARCHITECTURE.md`
- **Gold Standard Agent**: `.claude/agents/development/react-developer.md`

### Anthropic Guidance

- [Claude Code Sub-agents](https://code.claude.com/docs/en/sub-agents) - Configuration, tools, prompts
- [Effective Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) - Token budgets, progressive loading
- [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) - Architecture patterns, autonomy levels
- [Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system) - Orchestrator-worker pattern

### Related Patterns

- [obra/superpowers](https://github.com/obra/superpowers) - Librarian pattern reference
- [Claude Agent Skills Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/) - Technical architecture analysis

---

## Current Status & TODO

### Completed

- [x] **react-developer refactored**: 1220 → 336 lines
- [x] **react-architect created**: 248 lines following lean pattern
- [x] **Description syntax documented**: Block scalar issue identified and fixed
- [x] **Lean agent template**: Standardized structure defined
- [x] **Agent-manager skill**: Audit/fix commands available
- [x] **Consolidate orchestrators**: 8 → 2 domain-specific orchestrators (backend, frontend)

### In Progress

- [ ] **Fix broken descriptions**: Convert all `|` and `>` to single-line
- [ ] **Consolidate Go agents**: `go-developer` + `go-api-developer`
- [ ] **Consolidate security agents**: 5 → 1-2 with domain parameter
- [ ] **Trim verbose agents**: `go-architect` (if >400 lines)

### To Do

- [ ] **Add output format** to all agents
- [ ] **Add escalation protocol** to all agents
- [ ] **Audit all agents** for <300 line compliance
- [ ] **Create agent library tier** (`.claude/agent-library/`) for specialized agents
- [ ] **Add frontmatter linter** to CI pipeline
- [ ] **Document agent selection patterns** for users
