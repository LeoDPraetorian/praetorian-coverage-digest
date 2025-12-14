---
name: agent-manager
description: Use when creating, updating, auditing, fixing, renaming, testing, searching, or listing agents - unified lifecycle management with 8-phase compliance validation, TDD enforcement, lean agent pattern (<300 lines), and description syntax enforcement (no block scalars).
allowed-tools: 'Read, Write, Edit, Bash, Grep, Glob, TodoWrite, Task, Skill, AskUserQuestion'
---

# Agent Lifecycle Manager

**Complete agent lifecycle with TDD enforcement, 8-phase compliance validation, lean agent pattern, and description syntax enforcement.**

> **MANDATORY**: You MUST use TodoWrite before starting to track all steps. This is a complex workflow with multiple phases - mental tracking leads to skipped steps.

## Quick Reference

| Operation | Skill | Time | Purpose |
|-----------|-------|------|---------|
| **Create** | `creating-agents` | 60-90 min | Full TDD workflow with pressure testing |
| **Update** | `updating-agents` | 20-40 min | Simplified TDD with conditional pressure testing |
| **Test** | `testing-agent-skills` | 10-25 min/skill, hours for full agent | Behavioral validation - spawns agents with Task tool, tests skill invocation under pressure |
| **Audit** | `auditing-agents` | 30-60 sec | Structural/lint validation - file format, syntax, description, line count |
| **Fix** | `fixing-agents` | 2-5 min | Interactive remediation - auto-fixes and manual guidance |
| **Rename** | `renaming-agents` | 2-5 min | Safe renaming - validates, updates all references, verifies integrity |
| **Search** | `searching-agents` | 30-60 sec | Keyword discovery - relevance scoring, filtering, result interpretation |
| **List** | `listing-agents` | 30-60 sec | Display all agents - grouped by category, alphabetically sorted |

---

## 🚨 CRITICAL: Pure Router Pattern

**This skill ONLY routes to operation-specific skills in the library. It contains ZERO business logic.**

### How Routing Works

When user invokes `/agent-manager <operation>`:

1. **Parse operation** from arguments ($1)
2. **Route to appropriate library skill:**

   | Operation | Routes To |
   |-----------|-----------|
   | `create` | `.claude/skill-library/claude/agent-management/creating-agents/SKILL.md` |
   | `update` | `.claude/skill-library/claude/agent-management/updating-agents/SKILL.md` |
   | `test` | `.claude/skill-library/claude/agent-management/testing-agent-skills/SKILL.md` |
   | `audit` | `.claude/skill-library/claude/agent-management/auditing-agents/SKILL.md` |
   | `fix` | `.claude/skill-library/claude/agent-management/fixing-agents/SKILL.md` |
   | `rename` | `.claude/skill-library/claude/agent-management/renaming-agents/SKILL.md` |
   | `search` | `.claude/skill-library/claude/agent-management/searching-agents/SKILL.md` |
   | `list` | `.claude/skill-library/claude/agent-management/listing-agents/SKILL.md` |

3. **Read the library skill** using the Read tool
4. **Follow the skill's instructions**
5. **Display output** from skill execution

### What This Means

✅ **DO:**
- Invoke the appropriate skill based on operation
- Pass user arguments to the skill
- Display skill output verbatim

❌ **DO NOT:**
- Execute CLI commands directly (npm run audit, npm run fix, etc.)
- Implement business logic in this skill
- Skip skill delegation and do operations manually

### Why This Matters

**From Architecture Documentation:**
> "Commands follow the Router Pattern: they parse arguments and delegate to skills, containing zero business logic."

**Benefits:**
- **Skills load on-demand** - Only when actually used (context efficiency)
- **Commands stay lightweight** - Loaded into context on every invocation
- **Skills are reusable** - Can be invoked directly or via commands
- **Maintainability** - Business logic lives in one place (skills)

### Internal Implementation Details

**CLI scripts are located within the library skills** they support:
- `audit-critical.ts` → Located in `auditing-agents/scripts/src/`
- `search.ts` → Located in `searching-agents/scripts/src/`

**Users should NEVER invoke CLI scripts directly.** Always use the routing skills.

**Note:** The `test.ts` CLI script is deprecated. Behavioral validation is now handled entirely by the `testing-agent-skills` skill, which spawns agents and evaluates skill integration through the `testing-skills-with-subagents` workflow.

---

## Prerequisites

**For users:** None. All operations use skills that handle setup internally.

**For maintainers:** CLI tools are maintained within their respective library skills (`.claude/skill-library/claude/agent-management/`). See individual skill documentation for setup instructions.

## Critical Problem: Block Scalar Descriptions

**YAML block scalars (`|` and `>`) break agent discovery.** Claude Code's parser returns the literal character, not the content.

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

**This is non-negotiable. All agents MUST use single-line descriptions with `\n` escapes.**

## Agent Directory Structure

```
.claude/agents/
├── architecture/     # 7 agents - system design (permissionMode: plan)
├── development/      # 16 agents - implementation (permissionMode: default)
├── testing/          # 8 agents - unit, integration, e2e
├── quality/          # 5 agents - code review, auditing
├── analysis/         # 6 agents - security, complexity (permissionMode: plan)
├── research/         # 3 agents - web search, docs (permissionMode: plan)
├── orchestrator/     # 8 agents - coordination, workflows
├── mcp-tools/        # 2 agents - specialized MCP access
└── .archived/        # Deprecated agents with reason
```

## TDD Workflow (MANDATORY)

### 🔴 RED Phase (Prove Gap Exists)
1. Document why agent is needed or what gap exists
2. Test scenario without agent → **MUST FAIL**
3. Capture exact failure behavior (verbatim)

### 🟢 GREEN Phase (Minimal Implementation)
4. Create/update agent to address specific gap
5. Re-test scenario → **MUST PASS**
6. Verify no regression in existing behavior

### 🔵 REFACTOR Phase (Close Loopholes)
7. Test agent discovery (quote description in new session)
8. Verify line count <300 (or <400 for complex)
9. Verify skill delegation (not embedded patterns)

**Cannot proceed without failing test first.**

## Operations

### Understanding Audit vs Test

**Critical distinction** between structural/lint validation and behavioral validation:

| Aspect | Audit (Structural) | Test (Behavioral) |
|--------|-------------------|-------------------|
| **Purpose** | Lint validation - file format, syntax, description, line count, required sections | Behavioral validation - does agent correctly invoke and follow skills under realistic pressure? |
| **Method** | Static analysis via `audit-critical.ts` CLI + extended structural checks | Spawns actual agents with Task tool, evaluates skill integration with pressure scenarios |
| **What it checks** | YAML frontmatter syntax, description format (no block scalars), name consistency, line count limits, file structure | Skill invocation behavior, methodology compliance (TDD/debugging/verification), workflow execution under time/authority/sunk cost pressure |
| **Speed** | Fast (30-60 seconds) | Slower (10-25 min per skill, potentially hours for full agent with all gateway skills) |
| **When to use** | Before committing, after editing agent file, quick compliance checks | After major changes, before deployment, when debugging why agent bypasses skills, validating TDD enforcement |
| **Implementation** | Uses `auditing-agents` skill (wraps `audit-critical.ts`) | Uses `testing-agent-skills` skill (delegates to `testing-skills-with-subagents` for pressure scenarios) |
| **Output** | 8-phase compliance report (PASS/FAIL per phase with auto-fix suggestions) | PASS/FAIL/PARTIAL per skill with detailed reasoning (why agent succeeded/failed at skill invocation) |

**Analogy:**
- **Audit** = ESLint (syntax, formatting, structure rules)
- **Test** = Jest/Vitest (runtime behavior, correctness under execution)

**Important:**
- The `test.ts` CLI script is deprecated - it was performing structural checks that belong in audit
- The `test` operation now ONLY routes to `testing-agent-skills` skill for behavioral validation
- Never invoke `test.ts` directly - always use the `testing-agent-skills` skill

**Use both:** Audit catches format/structure issues quickly (seconds). Test catches behavioral issues that only appear when agents execute under pressure (minutes/hours).

---

### Create Agent (Instruction-Based Workflow)

**⚠️ IMPORTANT: Agent creation is now instruction-based (as of December 2024).**

**Read the creating-agents skill:**
```
Read: .claude/skill-library/claude/agent-management/creating-agents/SKILL.md
```

The `creating-agents` skill provides:
- **Full 10-phase TDD workflow** with RED-GREEN-REFACTOR
- **Phase 8: Skill Verification** - Tests each mandatory skill individually
- **Phase 10: Pressure Testing** - Subagent-based rationalization testing
- **Interactive guidance** via AskUserQuestion for decisions

**Why instruction-based?** December 2024 analysis showed 97% of TypeScript code duplicated Claude's native capabilities. Instructions provide more flexibility for interactive workflows, pressure testing, and skill verification.

**Type options** (selected in Phase 3):
- `architecture` - System design, patterns, decisions
- `development` - Implementation, coding, features
- `testing` - Unit, integration, e2e testing
- `quality` - Code review, auditing
- `analysis` - Security, complexity assessment
- `research` - Web search, documentation
- `orchestrator` - Coordination, workflows
- `mcp-tools` - Specialized MCP access

**Documentation:** `.claude/skill-library/claude/agent-management/creating-agents/SKILL.md`

### Update Agent (Instruction-Based Workflow)

**⚠️ IMPORTANT: Agent updates are now instruction-based (as of December 2024).**

**Read the updating-agents skill:**
```
Read: .claude/skill-library/claude/agent-management/updating-agents/SKILL.md
```

The `updating-agents` skill provides:
- **Simplified 6-phase TDD workflow** (RED-GREEN with optional REFACTOR)
- **Minimal diff approach** using Edit tool
- **Conditional pressure testing** for major changes (Phase 6)
- **Fast iteration** for minor updates (~20 min vs ~40 min for major)

**When to pressure test:**
- Changed Critical Rules (rules might not resist pressure)
- Added/removed capabilities (behavior changes)
- Modified mandatory skills (workflow changes)
- Major refactoring (>50 lines changed)

**Documentation:** `.claude/skill-library/claude/agent-management/updating-agents/SKILL.md`

### Audit (Critical Validation)

**⚠️ IMPORTANT: Agent auditing is now instruction-based (as of December 2024).**

**Read the auditing-agents skill:**
```
Read: .claude/skill-library/claude/agent-management/auditing-agents/SKILL.md
```

The `auditing-agents` skill provides:
- **Block scalar detection** - Catches `|` and `>` that make agents invisible
- **Name consistency** - Validates frontmatter name matches filename
- **Description validation** - Ensures description field exists and has content
- **Fast execution** - 30-60 seconds per agent

**What it checks:**

| Check | Impact | Fix |
|-------|--------|-----|
| Block scalar (`\|` or `>`) | CRITICAL - Agent invisible to Claude | Convert to single-line |
| Name mismatch | CRITICAL - Discovery fails | Update frontmatter or filename |
| Missing description | CRITICAL - No discovery metadata | Add description field |
| Empty description | CRITICAL - No discovery content | Write description |

**Why instruction-based?** Auditing requires:
- Portable repo root resolution (super-repo + normal repo)
- CLI wrapper for complex regex detection
- Result interpretation and fix guidance

**See:** `.claude/skill-library/claude/agent-management/auditing-agents/SKILL.md` - Complete audit workflow

### Fix (Interactive Remediation)

**⚠️ IMPORTANT: Agent fixing is now instruction-based (as of December 2024).**

**Read the fixing-agents skill:**
```
Read: .claude/skill-library/claude/agent-management/fixing-agents/SKILL.md
```

The `fixing-agents` skill provides:
- **Auto-fixes** - Deterministic fixes applied with Edit tool (block scalars, name mismatches)
- **Manual guidance** - Step-by-step help for issues needing user input (missing/empty descriptions)
- **Interactive** - User chooses which fixes to apply via AskUserQuestion
- **Verified** - Re-audits after fixes to confirm success

**What it fixes:**

| Issue | Type | Example |
|-------|------|---------|
| Block scalar (`\|` or `>`) | AUTO | Convert to single-line with `\n` escapes |
| Name mismatch | AUTO | Update frontmatter name to match filename |
| Missing description | MANUAL | Ask user for description content |
| Empty description | MANUAL | Ask user for description content |

**Workflow:**
1. Audit agent (via `auditing-agents`) → get issues
2. Categorize: auto-fixable vs needs user input
3. Present options via AskUserQuestion
4. Apply selected fixes with Edit tool
5. Re-audit to verify fixes worked
6. Report results

**Why instruction-based?** Fixing requires:
- Reading agent files to understand context
- Categorizing fix types dynamically
- Interactive user selection (AskUserQuestion)
- Applying edits with verification
- Feedback loop (audit → fix → re-audit)

**See:** `.claude/skill-library/claude/agent-management/fixing-agents/SKILL.md` - Complete fix patterns and examples

### Rename (Safe Agent Renaming)

**⚠️ IMPORTANT: Agent renaming is now instruction-based (as of December 2024).**

**Read the renaming-agents skill:**
```
Read: .claude/skill-library/claude/agent-management/renaming-agents/SKILL.md
```

The `renaming-agents` skill provides:
- **7-step safe rename** - Validates source/target, updates all references
- **Reference tracking** - Finds ALL references across commands, skills, agents
- **Integrity verification** - Confirms no broken references remain
- **Conflict detection** - Prevents overwriting existing agents
- **Atomic operation** - All updates succeed or all rollback

**What it updates:**
1. Frontmatter name field
2. Agent filename
3. All references in commands (examples, usage)
4. All references in skills (workflows, integration points)
5. All references in other agents (delegation, recommendations)

**Why instruction-based?** Renaming requires:
- Comprehensive reference search across codebase
- Multiple file updates with Edit tool
- Validation before and after operation
- User confirmation for safety
- Integrity verification to prevent broken references

**See:** `.claude/skill-library/claude/agent-management/renaming-agents/SKILL.md` - Complete rename workflow

### Test (Behavioral Validation - Skill Integration)

**⚠️ IMPORTANT: Agent testing is now instruction-based (as of December 2024).**

**Read the testing-agent-skills skill:**
```
Read: .claude/skill-library/claude/agent-management/testing-agent-skills/SKILL.md
```

The `testing-agent-skills` skill provides:
- **Behavioral validation** - Spawns agents with trigger scenarios
- **Skill invocation testing** - Verifies agent invokes mandatory skills
- **Methodology compliance** - Checks if agent follows skill workflows
- **PASS/FAIL/PARTIAL** - Reports with detailed reasoning

**Inputs:**
- Agent name (required): `frontend-developer`
- Skill name (optional): `developing-with-tdd` (if omitted, tests ALL mandatory skills)

**Example:**
```
User: "Test if react-developer uses developing-with-tdd correctly"
Agent: Read .claude/skill-library/claude/agent-management/testing-agent-skills/SKILL.md
       Provide agent=react-developer, skill=developing-with-tdd
```

**Why instruction-based?** Testing requires:
- Spawning agents with Task tool
- Evaluating complex behavior patterns
- Multi-step workflows with TodoWrite tracking
- Scenario design based on skill descriptions

**For structural validation** (syntax, format, line count), use `audit` instead:
```
Read: .claude/skill-library/claude/agent-management/auditing-agents/SKILL.md
```

**See:** `.claude/skill-library/claude/agent-management/testing-agent-skills/SKILL.md` - Complete testing workflow

### Search (Agent Discovery)

**⚠️ IMPORTANT: Agent searching is now instruction-based (as of December 2024).**

**Read the searching-agents skill:**
```
Read: .claude/skill-library/claude/agent-management/searching-agents/SKILL.md
```

The `searching-agents` skill provides:
- **Keyword search** - Searches across names, descriptions, types, skills
- **Relevance scoring** - Ranks results by match quality (0-100+ points)
- **Category filtering** - Optionally filter by agent type
- **Result limiting** - Show top N matches
- **Score interpretation** - Explains what scores mean

**Scoring algorithm:**
- Name exact match: 100 points
- Name substring: 50 points
- Description match: 30 points
- Type match: 20 points
- Skills match: 10 points
- Valid description bonus: 5 points

**Why instruction-based?** Searching requires:
- Portable repo root resolution
- CLI wrapper for scoring algorithm
- Result interpretation and recommendations
- Integration with Task tool workflow (search → select → use)

**See:** `.claude/skill-library/claude/agent-management/searching-agents/SKILL.md` - Complete search patterns and examples

### List (Show All Agents)

**⚠️ IMPORTANT: Agent listing is now instruction-based (as of December 2024).**

**Read the listing-agents skill:**
```
Read: .claude/skill-library/claude/agent-management/listing-agents/SKILL.md
```

The `listing-agents` skill provides:
- **Category grouping** - All agents organized by 8 categories
- **Alphabetical sorting** - Within each category
- **Descriptions shown** - First 80 chars of each agent's purpose
- **Counts provided** - Per category and total
- **Browsing-optimized** - For discovering available agents

**Categories:**
- Architecture (3) - Design decisions, patterns
- Development (5) - Implementation, coding
- Testing (8) - Unit, integration, E2E
- Quality (3) - Code review, auditing
- Analysis (2) - Security, complexity
- Research (1) - Web search, documentation
- Orchestrator (2) - Coordination, workflows
- MCP Tools (2) - Specialized MCP access

**Total:** 26 agents (as of December 2024)

**Why instruction-based?** Listing requires:
- Discovery via Glob across all categories
- Reading frontmatter from each agent
- Grouping and formatting output
- Simple but comprehensive presentation

**See:** `.claude/skill-library/claude/agent-management/listing-agents/SKILL.md` - Complete listing patterns and formats

## Lean Agent Pattern

**Target: <300 lines** (complex agents <400 max)

### Required Sections

```markdown
---
name: agent-name
description: Use when [trigger] - [capabilities].\n\n<example>...</example>
type: development
permissionMode: default
tools: Read, Write, Edit, Bash, TodoWrite
skills: gateway-frontend
model: opus
---

# Agent Name

You are [role statement - 1-2 sentences].

## Core Responsibilities
- [3-5 bullet points]

## Skill References (Load On-Demand via Gateway)
| Task | Skill to Read |
|------|---------------|
| ... | ... |

## Critical Rules (Non-Negotiable)
### [Category]
[Rules that CANNOT live in skills - platform constraints, identity]

## Mandatory Skills (Must Use)
### [Skill Name]
**When**: [Trigger]
**Use**: `skill-name` skill

## Output Format (Standardized)
\`\`\`json
{
  "status": "complete|blocked|needs_review",
  "summary": "...",
  "files_modified": [...],
  "verification": {...},
  "handoff": {
    "recommended_agent": "...",
    "context": "..."
  }
}
\`\`\`

## Escalation Protocol
**Stop and escalate if**:
- [Condition] → Recommend `agent-name`

## Quality Checklist
- [ ] [Verification items]
```

### What Lives WHERE

| Content Type | Lives In | Why |
|--------------|----------|-----|
| Role definition | Agent | Identity is per-agent |
| Critical rules | Agent | Non-negotiable constraints |
| Output format | Agent | Coordination requirement |
| Escalation | Agent | Agent-specific boundaries |
| Detailed patterns | Skill | Reusable across agents |
| Code examples | Skill | Progressive loading |
| Workflows | Skill | On-demand retrieval |

## Gold Standards

**Reference these when creating/auditing agents:**

- **react-developer** (336 lines): `.claude/agents/development/react-developer.md`
- **react-architect** (248 lines): `.claude/agents/architecture/react-architect.md`

## Discovery Testing Protocol

**After editing ANY agent, test in a NEW session:**

```
User: What is the description for the [agent-name] agent? Quote it exactly.

✅ Working: Claude quotes the full description text with examples
❌ Broken: Claude says "|" or ">" or has to read the file
```

**Note:** Agent metadata is cached at session start. You MUST start a new session to see updated descriptions.

## Key Principles

1. **No Block Scalars** - Single-line descriptions with `\n` escapes only
2. **Lean Prompts** - <300 lines, delegate patterns to skills
3. **Gateway Skills** - Reference gateways in frontmatter, not library paths
4. **Standardized Output** - JSON with status, summary, verification, handoff
5. **Escalation Protocol** - Clear stopping conditions
6. **TDD Always** - Cannot create/update without proving gap exists
7. **Discovery Testing** - Verify description visible before completion
8. **TodoWrite Tracking** - Track all workflow steps

## Related Skills

- **skill-manager** - For skill lifecycle (similar pattern)
- **mcp-manager** - For MCP wrapper lifecycle
- **command-manager** - For slash command lifecycle
- **developing-with-tdd** - TDD methodology
- **verifying-before-completion** - Final validation

## Changelog

- **2024-12-13**: Clarified Audit vs Test distinction
  - Updated "Understanding Audit vs Test" section with precise definitions
  - AUDIT = structural/lint validation (file format, syntax, description, line count) via audit-critical.ts CLI - fast 30-60 seconds
  - TEST = behavioral validation (skill invocation under pressure) via testing-agent-skills skill delegating to testing-skills-with-subagents - slower 10-25 min/skill, hours for full agent
  - Deprecated test.ts CLI script - structural checks belong in audit, not test
  - Test operation now ONLY routes to testing-agent-skills for behavioral validation
- **2024-12-07**: Migrated to Pure Router Pattern
  - All operations now use instruction-based skills (create, update, test, audit, fix, rename, search, list)
  - Audit workflow integrated with fixing-agents skill for automatic remediation
  - CLI scripts wrapped by skills (audit-critical, search)
- **2024-11-30**: Expanded to 8-phase audit system
  - Phase 1: Added color field, permissionMode alignment, field ordering, alphabetical sorting
  - Phase 4: Added tool appropriateness checks (required/forbidden/recommended by type)
  - Phase 7: Added phantom skill detection
  - Phase 8: Added skill recommendations
- **2024-11-30**: Initial creation with 6-phase audit system
