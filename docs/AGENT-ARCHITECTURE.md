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

### Problem 4: Skill Invocation Gap (Discovered 2025)

Agents with mandatory skills in their `skills:` frontmatter follow principles behaviorally but don't explicitly invoke skills, making their skill usage untestable and unauditable.

**Root Cause:**

The `skills:` frontmatter field makes skills **available** but does NOT automatically invoke them:

```yaml
skills: adhering-to-yagni  # Makes skill available to agent
                          # Does NOT force explicit invocation
```

Agents internalize principles from the Mandatory Skills section but skip the explicit Skill tool call that makes invocation visible:

```markdown
Expected: skill: "adhering-to-yagni"  # Visible invocation
Actual: [implements with YAGNI principles but no invocation shown]
```

**Impact:**

| Aspect | Behavioral Compliance | Process Compliance |
|--------|----------------------|-------------------|
| **Definition** | Follows skill principles in implementation | Shows explicit skill invocation |
| **Evidence** | Code matches methodology | `skill: "skill-name"` in output |
| **Testing** | ❌ Can't verify which skills used | ✅ Can audit and test |
| **Accountability** | ❌ No audit trail | ✅ Clear skill usage record |

**The Gap**: Agents were passing behavioral tests (correct implementation) but failing process tests (no visible skill invocation). This meant:
- No way to verify mandatory skills were actually consulted
- Testing could only check outcomes, not workflow adherence
- Audit trails incomplete for compliance validation

**Discovery**: Identified December 2025 during `testing-agent-skills` validation of `frontend-developer` agent with `adhering-to-yagni` skill.

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
├── analysis/         # 2 agents - security review
│   ├── backend-security-reviewer.md
│   └── frontend-security-reviewer.md
├── architecture/     # 3 agents - system design, patterns, decisions
│   ├── backend-architect.md
│   ├── frontend-architect.md
│   └── security-architect.md
├── development/      # 5 agents - implementation, coding, features
│   ├── aws-infrastructure-specialist.md
│   ├── backend-developer.md
│   ├── frontend-developer.md
│   ├── integration-developer.md
│   └── python-developer.md
├── mcp-tools/        # 2 agents - specialized MCP tool access
│   ├── chromatic-test-engineer.md
│   └── praetorian-cli-expert.md
├── orchestrator/     # 2 agents - domain-specific coordination
│   ├── backend-orchestrator.md
│   └── frontend-orchestrator.md
├── quality/          # 3 agents - code review, auditing, standards
│   ├── backend-reviewer.md
│   ├── frontend-reviewer.md
│   └── uiux-designer.md
├── research/         # 1 agent - pattern analysis
│   └── code-pattern-analyzer.md
└── testing/          # 8 agents - unit, integration, e2e, quality
    ├── acceptance-test-engineer.md
    ├── backend-integration-test-engineer.md
    ├── backend-unit-test-engineer.md
    ├── frontend-e2e-test-engineer.md
    ├── frontend-integration-test-engineer.md
    ├── frontend-unit-test-engineer.md
    ├── test-coverage-auditor.md
    └── test-quality-assessor.md
```

### Agent Categories

| Category | Count | Purpose | Permission Mode |
|----------|-------|---------|-----------------|
| `architecture` | 3 | System design, patterns, decisions | `plan` |
| `development` | 5 | Implementation, coding, features | `default` |
| `testing` | 8 | Unit, integration, e2e testing | `default` |
| `quality` | 3 | Code review, auditing | `default` |
| `analysis` | 2 | Security, complexity assessment | `plan` |
| `research` | 1 | Web search, documentation | `plan` |
| `orchestrator` | 2 | Domain-specific coordination | `default` |
| `mcp-tools` | 2 | Specialized MCP access | `default` |

**Total**: 26 agents across 8 categories (consolidated from 49+ through lean agent initiative)

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

<EXTREMELY_IMPORTANT>
You MUST explicitly invoke mandatory skills using the Skill tool. This is not optional.

Before starting ANY implementation task:
1. Check if it matches a mandatory skill trigger (see Mandatory Skills section below)
2. If yes, invoke the skill with: `skill: "skill-name"`
3. Show the invocation in your output
4. Follow the skill's instructions exactly

Common rationalizations to avoid:
- "This is just a simple feature" → NO. Check for skills.
- "I can implement this quickly" → NO. Invoke skills first.
- "The skill is overkill" → NO. If a skill exists, use it.

If you skip mandatory skill invocation, your work will fail validation.
</EXTREMELY_IMPORTANT>

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

**CRITICAL**: You MUST explicitly invoke these skills using the Skill tool. Do not just follow principles implicitly.

1. **`[skill-1-name]`** - **INVOKE WHEN [TRIGGER]**: `skill: "skill-1-name"`
   - [Brief principle summary]
   - [Key rule or requirement]

2. **`[skill-2-name]`** - **INVOKE WHEN [TRIGGER]**: `skill: "skill-2-name"`
   - [Brief principle summary]
   - [Key rule or requirement]

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

### The 9 Agent Quality Phases

| Phase | Name | Auto-Fix | Description |
|-------|------|----------|-------------|
| 1 | Frontmatter Syntax | ✅ | Description not block scalar, name matches filename |
| 2 | Description Quality | ❌ | "Use when" trigger, includes examples, <1024 chars |
| 3 | Prompt Efficiency | ❌ | <300 lines, delegates to skills, no duplication |
| 4 | Skill Integration | ✅ | Uses gateway skills, not direct library paths |
| 5 | Output Standardization | ❌ | Returns structured JSON with handoff |
| 6 | Escalation Protocol | ❌ | Clear stopping conditions, agent recommendations |
| 7 | Body References | ✅ | Phantom skill detection (referenced skills that don't exist) |
| 8 | Skill Coverage | ❌ | Recommended skills based on agent type and keywords |
| 9 | Explicit Skill Invocation | ❌ | EXTREMELY_IMPORTANT block present, explicit invocation syntax, anti-rationalization patterns |

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

The Agent Manager is the lifecycle management system for agents. It uses a **Partial Hybrid Pattern**: instruction-based skills provide guidance, with selective TypeScript CLI for deterministic operations (audit, search, test).

### Overview

| Aspect | Details |
|--------|---------|
| **Location** | `.claude/skill-library/claude/agent-management/` (8 distributed skills) |
| **Purpose** | Create, audit, fix, rename, test, search, list agents |
| **Architecture** | **Partial Hybrid**: Instruction-based skills + selective CLI |
| **Command Router** | `/agent-manager` delegates to 8 instruction-based skills |
| **Coverage** | 9 validation phases, TDD enforcement |
| **Scope** | Manages all agents across 8 categories in `.claude/agents/` |

### Partial Hybrid Architecture Pattern

The agent-manager uses **layered orchestration** where instruction-based skills provide guidance, invoking TypeScript CLI selectively for deterministic operations:

```
┌─────────────────────────────────────────┐
│  Command Router                         │
│  (.claude/commands/agent-manager.md)   │
│  Pattern: Pure delegation to skills     │
└──────────────┬──────────────────────────┘
               │ skill: "auditing-agents"
               ▼
┌─────────────────────────────────────────┐
│  Instruction Layer                      │
│  (8 skills in skill-library)            │
│  Pattern: Guide, interpret, decide      │
│  Tools: Read, Edit, Bash, AskUser       │
└──────────────┬──────────────────────────┘
               │ Selective invocation
               │ (3/8 ops use CLI)
               ▼
┌─────────────────────────────────────────┐
│  Execution Layer (Selective)            │
│  TypeScript CLI: audit-critical, search │
│  Native Tools: create, update, fix, etc │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Implementation                         │
│  Phase validation / Edit operations     │
└─────────────────────────────────────────┘
```

**Example workflow (auditing an agent)**:

```
User: /agent-manager audit frontend-developer
        ↓
1. Command routes: skill: "auditing-agents"
2. auditing-agents/SKILL.md loads
3. Explains: Critical vs extended checks (9 phases)
4. Executes via Bash: npm run audit-critical -- frontend-developer
5. CLI validates block scalars, name, description (fast)
6. Skill interprets results:
   ✅ Pass → "Agent ready to use"
   ⚠️ Warnings → "Review extended checks"
   ❌ Critical failures → "Run: skill: 'fixing-agents'"
7. Guides next steps based on results
```

### The 8 Instruction-Based Skills

| Skill | Purpose | Uses CLI? | CLI Script | Interactive? | Time |
|-------|---------|-----------|------------|--------------|------|
| `creating-agents` | TDD-driven agent creation | ✅ Yes | `audit-critical` | ✅ Yes - type, description, examples | 60-90 min |
| `updating-agents` | Test-guarded updates | ❌ No | - | ✅ Yes - confirm changes | 20-40 min |
| `auditing-agents` | 9-phase validation | ✅ Yes | `audit-critical`, `test` | ❌ No - automated | 30-60 sec |
| `fixing-agents` | Interactive remediation | ✅ Yes (indirect) | via `auditing-agents` | ✅ Yes - choose fixes | 2-5 min |
| `renaming-agents` | Safe renaming | ❌ No | - | ✅ Yes - confirm impact | 2-5 min |
| `testing-agent-skills` | Behavioral validation | ✅ Yes | `test` | ❌ No - spawns subagents | 10-25 min/skill |
| `searching-agents` | Keyword discovery | ✅ Yes | `search` | ❌ No - automated | 30-60 sec |
| `listing-agents` | Comprehensive list | ❌ No | - | ❌ No - automated | 30-60 sec |

**Pattern**: 5/8 operations invoke TypeScript CLI (create, audit, fix, search, test). The rest use native tools (Edit, Grep, Glob, Write).

### TypeScript CLI (Selective Operations)

3 CLI scripts provide fast, deterministic execution for specific operations:

| Script | Purpose | Called By | Why CLI? |
|--------|---------|-----------|----------|
| `audit-critical.ts` | Block scalar detection, name validation, description checks | `auditing-agents`, `creating-agents`, `fixing-agents` | Fast batch validation (26 agents in <1 min) |
| `search.ts` | Keyword search with relevance scoring | `searching-agents` | Algorithm performance, scoring logic |
| `test.ts` | Discovery + behavioral validation framework | `testing-agent-skills` | Structured test execution, result parsing |

**Other operations** use native tools because they require:
- Semantic decisions (create: description quality, examples)
- User interaction (update: confirm changes, fix: choose remediation)
- Simple file operations (rename: Edit tool, list: Glob + Read)

### Why Partial Hybrid vs Full Hybrid?

| Aspect | agent-manager (Partial Hybrid) | skill-manager (Full Hybrid) |
|--------|-------------------------------|----------------------------|
| **CLI Operations** | 3/8 (38%) - audit, search, test | 7/8 (88%) - all except create |
| **Determinism** | Mixed - validation is deterministic, creation is semantic | High - file validation, structure checks |
| **Batch Benefit** | Medium (26 agents) | High (147 skills) |
| **Semantic Load** | High (description quality, skill recommendations) | Low (mostly auto-fixable structure) |
| **Design Choice** | CLI only where clear benefit | CLI for all deterministic ops |

**Why different?**
- **Agent operations**: Creating good descriptions, choosing examples = semantic work Claude must do
- **Skill operations**: Validating file structure, checking links = deterministic work CLI does faster

### Dual Implementation: How They Work Together

**Instruction-based skills provide**:
- Context and explanation for what operations do
- Decision points via AskUserQuestion when needed
- Error interpretation and troubleshooting guidance
- Next-step recommendations based on results

**TypeScript CLI provides** (3 operations):
- Fast execution for deterministic checks (block scalars, name matching)
- Batch operations (audit all 26 agents in <1 min)
- Structured output for result interpretation
- Scoring algorithms (search relevance)

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
- All operations include automatic 9-phase audit validation
- Discovery testing ensures descriptions are visible to Claude

### The 9 Audit Phases

Agents must pass compliance validation across 9 phases:

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
| 9 | Explicit Skill Invocation | ❌ | EXTREMELY_IMPORTANT block present, explicit invocation syntax shown, anti-rationalization patterns included |

**Fix Categories**:
- **Deterministic (auto-apply)**: Phases 1 (syntax), 4 (skill paths), 7 (phantom skills)
- **Semantic (Claude-mediated)**: Phases 2, 3, 5, 6, 8, 9 (use `--suggest` mode)

### CLI Reference

**Distributed CLI Architecture**: Each skill maintains its own CLI scripts in its `scripts/` subdirectory:

```
.claude/skill-library/claude/agent-management/
├── auditing-agents/scripts/     # npm run audit-critical
├── searching-agents/scripts/    # npm run search
└── testing-agent-skills/scripts/ # npm run test (if applicable)
```

**Available CLI Scripts** (invoked by skills, not directly):

| Script | Location | Wrapped By |
|--------|----------|------------|
| `audit-critical` | `auditing-agents/scripts/` | `auditing-agents` skill |
| `search` | `searching-agents/scripts/` | `searching-agents` skill |

**Note**: Other operations (create, update, fix, rename, list) are implemented using native tools (Edit, Write, Grep, Glob) within instruction-based skills.

**For users**: Always use `/agent-manager` command or invoke skills directly. CLI scripts are internal implementation details wrapped by skills.

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

**Recommended**: Use the `/agent-manager create` command which invokes the `creating-agents` skill with full TDD workflow.

```bash
# Via command (recommended)
/agent-manager create debugging-specialist "Use when debugging complex issues" --type development

# The creating-agents skill guides through:
# 1. 🔴 RED Phase - Document the gap (why agent is needed)
# 2. Validation - Name format, existence checks
# 3. Type selection - 8 categories with permission modes
# 4. Configuration - Description, tools, skills
# 5. Generation - Create file from template
# 6. Content - Populate 7 sections + EXTREMELY_IMPORTANT
# 7. 🟢 GREEN Phase - Verify agent works
# 8. 🎯 Skill verification - Test process + behavioral compliance
# 9. Compliance - Quality checks + audit
# 10. 🔵 REFACTOR Phase - Pressure test
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

### Agent Caching & Testing Protocol

**CRITICAL: Agent Definitions Are Cached at Session Start**

Agent definitions load into memory when Claude Code starts. **File changes during a session DO NOT update spawned agents.**

```
┌─────────────────────────────────────────┐
│ Session Start                            │
│ Agent loaded: 336 lines (old version)   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ You edit agent file                     │
│ Add EXTREMELY_IMPORTANT block           │
│ Agent file now: 350 lines               │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Spawn agent via Task tool               │
│ ❌ Still uses OLD cached version         │
│    (336 lines, no EXTREMELY_IMPORTANT)  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Start FRESH Claude Code session         │
│ Agent loaded: 350 lines (new version)   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Spawn agent via Task tool               │
│ ✅ NOW uses updated version with changes│
└─────────────────────────────────────────┘
```

**Testing Protocol:**

1. Make changes to agent file
2. **Start fresh Claude Code session** (new terminal/window) - **MANDATORY**
3. Test with `/agent-manager test <agent> <skill>`
4. Verify explicit skill invocation appears in agent output
5. Confirm behavioral + process compliance

**DO NOT test changes in the same session** where you made edits - results will be invalid.

**Discovery Testing (Metadata):**

After editing agent description, test in a new session:

```
User: What is the description for the [agent-name] agent? Quote it exactly.

✅ Working: Claude quotes the full description text with examples
❌ Broken: Claude says "|" or ">" or has to read the file
```

**Skill Invocation Testing (Behavior):**

After editing Mandatory Skills section, test in a new session:

```
User: [Trigger scenario for mandatory skill]

✅ Working: Agent shows `skill: "skill-name"` in output
❌ Broken: Agent implements correctly but no invocation shown
```

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

### Note on AGENT-MANAGER-MIGRATION.md

The `AGENT-MANAGER-MIGRATION.md` document describes an **aspirational "Pure Router Pattern"** that was not fully implemented. The actual result is **Partial Hybrid Pattern**:

**What the migration document says**:
> "Migrate to Pure Router Pattern where NO direct CLI command execution from skills"

**What actually happened**:
- ✅ Command router delegates to instruction-based skills (achieved)
- ✅ 8 instruction-based skills created in library (achieved)
- ❌ CLI elimination (not achieved - 3 CLI scripts remain for audit/search/test)
- ✅ Hybrid pattern with selective CLI (actual outcome)

**Status**: Migration document is **stale**. The "migration" is complete, but the result is Partial Hybrid (not Pure Router). CLI scripts for audit, search, and test operations provide performance benefits and are intentionally kept.

**Why CLI remains**: Validating 26 agents for block scalars, searching with scoring algorithms, and running structured tests benefit from TypeScript CLI performance. These are **deterministic operations** where CLI provides value.

## Quick Reference

### Create New Agent

```bash
# Use agent-manager command (recommended)
/agent-manager create my-agent "Use when [trigger] - [capabilities]" --type development
```

### Audit Agent

```bash
# Use agent-manager command (invokes auditing-agents skill)
/agent-manager audit agent-name        # Single agent
/agent-manager audit --all             # All agents

# Or invoke skill directly
skill: "auditing-agents"
```

### Fix Agent Issues

```bash
# Use agent-manager command (invokes fixing-agents skill)
/agent-manager fix agent-name --dry-run  # Preview
/agent-manager fix agent-name            # Apply
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

## Research Findings: Ensuring Skill Invocation (2025)

### The obra/superpowers Pattern

Research into [obra/superpowers](https://github.com/obra/superpowers) revealed the gold standard for enforcing mandatory skill usage in Claude Code agents.

**Discovery Context**: During December 2025 testing of `frontend-developer` agent with `adhering-to-yagni` skill, we found agents followed skill principles behaviorally but didn't explicitly invoke skills. Research into existing patterns led to obra's approach.

#### Key Principles

**1. Absolute Language (Non-Negotiable)**

The using-superpowers skill uses forceful, unambiguous language:

```markdown
<EXTREMELY_IMPORTANT>
If you think there is even a 1% chance a skill might apply to what you are doing,
you ABSOLUTELY MUST read the skill.

IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. This is not optional. You cannot rationalize your way out of this.
</EXTREMELY_IMPORTANT>
```

**Why it works**: Preemptively counters agent rationalization with absolute statements that leave no room for interpretation.

**2. Common Rationalizations List**

The skill explicitly lists rationalizations agents use to skip skills:

```markdown
If you catch yourself thinking ANY of these thoughts, STOP. You are rationalizing.

- "This is just a simple question" → WRONG. Check for skills.
- "I can check git/files quickly" → WRONG. Skills tell you HOW.
- "Let me gather information first" → WRONG. Skills tell you how to gather.
- "This doesn't need a formal skill" → WRONG. If a skill exists, use it.
- "I remember this skill" → WRONG. Skills evolve. Read the current version.
- "The skill is overkill" → WRONG. Use it anyway.
```

**Why it works**: By listing common excuses preemptively, the skill makes it harder for agents to rationalize around it.

**3. Mandatory First Response Protocol**

Before responding to ANY user message:

```markdown
1. Ask yourself: "Does ANY skill match this request?"
2. If yes → Find and read the skill
3. Announce which skill you're using
4. Follow the skill exactly

Responding WITHOUT completing this checklist = automatic failure.
```

**Why it works**: Creates a pre-task checkpoint that forces skill evaluation before action.

#### Implementation in Chariot Agents

We adapted the obra pattern for our agents:

```markdown
<EXTREMELY_IMPORTANT>
You MUST explicitly invoke mandatory skills using the Skill tool. This is not optional.

Before starting ANY implementation task:
1. Check if it matches a mandatory skill trigger
2. If yes, invoke the skill with: `skill: "skill-name"`
3. Show the invocation in your output
4. Follow the skill's instructions exactly

Common rationalizations to avoid:
- "This is just a simple feature" → NO. Check for skills.
- "I can implement this quickly" → NO. Invoke skills first.
- "The skill is overkill" → NO. If a skill exists, use it.

If you skip mandatory skill invocation, your work will fail validation.
</EXTREMELY_IMPORTANT>
```

**Applied to**: `frontend-developer`, and template for all agents with mandatory skills.

### Anthropic 2025 Best Practices

From official Claude 4/4.5 documentation:

**Explicit Direction for Tool Use:**
- Claude 4.5 models are trained for precise instruction following
- Benefit from explicit direction to use specific tools
- Use imperative language: "You must," "Always," "Never"

**Efficiency Tendency:**
- Claude 4.5 tends toward efficiency and may skip steps
- May skip verbal summaries after tool calls
- Requires reinforcement for process compliance

**Model-Invoked Skills:**
- Skills are "always on" - Claude activates them based on context
- The `skills:` frontmatter makes skills available, not auto-invoked
- Explicit instruction needed to enforce invocation

**Sources:**
- [Prompting best practices - Claude Docs](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices)
- [Claude Code: Best practices for agentic coding](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Building agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)

### Key Findings Summary

| Finding | Implication | Solution |
|---------|-------------|----------|
| `skills:` frontmatter makes skills available | Agents can access but don't auto-invoke | Add EXTREMELY_IMPORTANT block |
| Agents follow principles implicitly | Behavioral compliance without process compliance | Require explicit invocation syntax |
| Agent caching at session start | File changes don't affect running session | Test in fresh session mandatory |
| Claude 4.5 efficiency bias | May skip "unnecessary" steps like skill invocation | Use absolute language, anti-rationalization |
| obra pattern proven in production | Strong language prevents rationalization | Adapted for Chariot agents |

---

## References

### Internal Documentation

- **Agent Manager (Core Skill)**: `.claude/skills/agent-manager/SKILL.md` (router)
- **Agent Management Skills (Library)**: `.claude/skill-library/claude/agent-management/` (8 implementation skills)
- **Skills Architecture**: `docs/SKILLS-ARCHITECTURE.md`
- **MCP Tools Architecture**: `docs/MCP-TOOLS-ARCHITECTURE.md`
- **Gold Standard Agent**: `.claude/agents/development/react-developer.md`

### Anthropic Guidance

- [Claude Code Sub-agents](https://code.claude.com/docs/en/sub-agents) - Configuration, tools, prompts
- [Effective Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) - Token budgets, progressive loading
- [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) - Architecture patterns, autonomy levels
- [Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system) - Orchestrator-worker pattern

### Related Patterns

- [obra/superpowers](https://github.com/obra/superpowers) - Gold standard for mandatory skill invocation, EXTREMELY_IMPORTANT block pattern
- [using-superpowers skill](https://github.com/obra/superpowers/blob/main/skills/using-superpowers/SKILL.md) - Anti-rationalization patterns and absolute language
- [Claude Agent Skills Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/) - Technical architecture analysis
- [Superpowers to turn Claude Code into a real senior developer](https://betazeta.dev/blog/claude-code-superpowers/) - Implementation patterns

---

## Current Status & TODO

### Completed

- [x] **react-developer refactored**: 1220 → 336 lines
- [x] **react-architect created**: 248 lines following lean pattern
- [x] **Description syntax documented**: Block scalar issue identified and fixed
- [x] **Lean agent template**: Standardized structure defined
- [x] **Agent-manager skill**: Audit/fix commands available
- [x] **Consolidate orchestrators**: 8 → 2 domain-specific orchestrators (backend, frontend)
- [x] **Consolidate Go agents**: Unified to `backend-developer` (5 development agents total)
- [x] **Consolidate security agents**: Unified to 2 agents (backend-security-reviewer, frontend-security-reviewer)
- [x] **Major consolidation**: 49+ agents → 26 agents (47% reduction)
- [x] **Documentation update (Dec 2025)**: Agent counts, CLI paths, skill locations corrected

### In Progress

- [ ] **Fix broken descriptions**: Convert remaining `|` and `>` to single-line
- [ ] **Trim verbose agents**: Some agents may still exceed 300/400 line limits

### To Do

- [ ] **Add output format** to all agents
- [ ] **Add escalation protocol** to all agents
- [ ] **Audit all agents** for <300 line compliance
- [ ] **Create agent library tier** (`.claude/agent-library/`) for specialized agents
- [ ] **Add frontmatter linter** to CI pipeline
- [ ] **Document agent selection patterns** for users
