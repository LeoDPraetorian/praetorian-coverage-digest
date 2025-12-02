---
name: agent-manager
description: Use when creating, updating, auditing, fixing, renaming, testing, searching, or listing agents - unified lifecycle management with 8-phase compliance validation, TDD enforcement, lean agent pattern (<300 lines), and description syntax enforcement (no block scalars).
allowed-tools: 'Read, Write, Edit, Bash, Grep, Glob, TodoWrite, Task, Skill, AskUserQuestion'
---

# Agent Lifecycle Manager

**Complete agent lifecycle with TDD enforcement, 8-phase compliance validation, lean agent pattern, and description syntax enforcement.**

> **MANDATORY**: You MUST use TodoWrite before starting to track all steps. This is a complex workflow with multiple phases - mental tracking leads to skipped steps.

## Quick Reference

| Operation | Command | Time | Purpose |
|-----------|---------|------|---------|
| Create | `npm run --silent create -- <name> "<desc>" --type <category>` | 15-30 min | TDD-driven agent creation |
| Update | `npm run --silent update -- <name> "<changes>"` | 10-20 min | Minimal updates with TDD |
| Audit | `npm run --silent audit -- [name] [--all]` | 2-5 min | 8-phase compliance check |
| Fix | `npm run --silent fix -- <name> [--dry-run\|--suggest]` | 5-15 min | Auto-remediation |
| Rename | `npm run --silent rename -- <old> <new>` | 5-10 min | Safe renaming with updates |
| Test | `npm run --silent test -- <name> [skill-name]` | 5-10 min | Test agent with skill invocation |
| Search | `npm run --silent search -- "<query>"` | 1-2 min | Keyword discovery |
| List | `npm run --silent list -- [--type <category>]` | 1 min | List all agents |

## Prerequisites

**Workspace setup:**
```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT/.claude/skills/agent-manager/scripts"
npm install
```

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

### Create (TDD-First Agent Creation)

```bash
# Standard creation with category
npm run --silent create -- my-agent "Use when [trigger] - [capabilities]" --type development

# With suggest mode (outputs JSON for Claude)
npm run --silent create -- my-agent --suggest
```

**Type options:**
- `architecture` - System design, patterns, decisions
- `development` - Implementation, coding, features
- `testing` - Unit, integration, e2e testing
- `quality` - Code review, auditing
- `analysis` - Security, complexity assessment
- `research` - Web search, documentation
- `orchestrator` - Coordination, workflows
- `mcp-tools` - Specialized MCP access

**Workflow:**
1. **RED Phase** - Document gap (why is this agent needed?)
2. **Generate Agent** - Create from lean template
3. **GREEN Phase** - Test agent solves the gap
4. **Audit** - Automatic 8-phase compliance check
5. **Discovery Test** - Verify description visible in new session

**See:** [references/create-workflow.md](references/create-workflow.md)

### Update (Test-Guarded Changes)

```bash
npm run --silent update -- react-developer "Add Chariot API integration patterns"
npm run --silent update -- react-developer --suggest
```

**Workflow:**
1. **Identify Gap** - What instruction is missing?
2. **RED Phase** - Document current failure behavior
3. **Update Agent** - Apply minimal change
4. **GREEN Phase** - Verify gap closes
5. **Audit** - Re-validate compliance (esp. line count)

**See:** [references/update-workflow.md](references/update-workflow.md)

### Audit (8-Phase Compliance)

```bash
npm run --silent audit -- react-developer           # Single agent
npm run --silent audit -- --all                     # All agents
npm run --silent audit -- react-developer --phase 1 # Specific phase
```

**8 Phases:**

| Phase | Name | Auto-Fix | Description |
|-------|------|----------|-------------|
| 1 | Frontmatter Syntax | ✅ | Description not block scalar, name matches filename, color, permissionMode, field order, alphabetical sorting |
| 2 | Description Quality | ❌ | "Use when" trigger, includes examples, <1024 chars |
| 3 | Prompt Efficiency | ❌ | <300 lines, delegates to skills, no duplication |
| 4 | Skill Integration | ✅ | Uses gateway skills, tool appropriateness by type |
| 5 | Output Standardization | ❌ | Returns structured JSON with handoff |
| 6 | Escalation Protocol | ❌ | Clear stopping conditions, agent recommendations |
| 7 | Body References | ✅ | Phantom skill detection (referenced but non-existent) |
| 8 | Skill Coverage | ❌ | Recommended skills based on type and keywords |

**Output:** Pre-formatted markdown report (display verbatim)

**See:** [references/audit-phases.md](references/audit-phases.md)

### Fix (Interactive Compliance Remediation)

**🎯 New JSON Workflow (November 2024):**
The fix command now outputs structured JSON for Claude to intercept and present interactive fix selection via `AskUserQuestion`.

**Flow:**
1. User runs: `/agent-manager audit my-agent`
2. Audit reports failures, exits
3. Claude sees failures, runs: `npm run fix -- my-agent --suggest`
4. `fix.ts` returns JSON with questions
5. Claude uses `AskUserQuestion` to present fix options
6. User selects fixes (multi-select supported)
7. Claude runs: `npm run fix -- my-agent --apply fix-id-1,fix-id-2`

**Commands:**
```bash
# Interactive mode (outputs JSON for Claude)
npm run --silent fix -- react-developer --suggest

# Apply selected fixes (comma-separated)
npm run --silent fix -- react-developer --apply phase1-description,phase1-skills-sort

# Apply all auto-fixable
npm run --silent fix -- react-developer --all-auto

# Preview changes
npm run --silent fix -- react-developer --dry-run
```

**Fix Categories:**
- **[AUTO] Deterministic fixes:** Phases 1 (syntax), 4 (skill paths), 7 (phantom skills)
- **[MANUAL] Semantic fixes:** Phases 2, 3, 5, 6, 8 (require Claude or manual review)

**Semantic Fix IDs:**
| ID | Phase | Description |
|----|-------|-------------|
| `phase1-description` | 1 | Convert block scalar to single-line |
| `phase1-color-missing` | 1 | Add color field |
| `phase1-color-mismatch` | 1 | Fix incorrect color |
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

**See:** [references/fix-workflow.md](references/fix-workflow.md)

### Rename (Safe Agent Renaming)

```bash
npm run --silent rename -- old-agent-name new-agent-name
```

**7-Step Protocol:**
1. Validate old name exists
2. Validate new name available
3. Update frontmatter `name` field
4. Rename agent file
5. Update Task tool references in code
6. Update agent references in other agents
7. Move old to .archived/ if consolidating

**See:** [references/rename-protocol.md](references/rename-protocol.md)

### Test (Agent Discovery Testing)

```bash
npm run --silent test -- react-developer              # Test description discovery
npm run --silent test -- react-developer gateway-frontend  # Test with skill
```

**What it tests:**
1. Description is NOT `|` or `>`
2. Description parses correctly
3. Agent spawns without error
4. (Optional) Skill auto-loads

**See:** [references/test-workflow.md](references/test-workflow.md)

### Search (Agent Discovery)

```bash
npm run --silent search -- "react"
npm run --silent search -- "security" --type analysis
npm run --silent search -- "coordinator" --limit 5
```

**Scoring algorithm:**
- Name exact match: 100 points
- Name substring: 50 points
- Description match: 30 points
- Type match: 20 points
- Skills match: 10 points

**See:** [references/search-workflow.md](references/search-workflow.md)

### List (Show All Agents)

```bash
npm run --silent list                           # All agents
npm run --silent list -- --type development     # Filter by type
npm run --silent list -- --status broken        # Show broken descriptions
```

**Output columns:** Name, Type, Lines, Description Status, Skill Integration

**See:** [references/list-workflow.md](references/list-workflow.md)

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

- **2024-12-01**: Enhanced audit workflow automation
  - Audit automatically runs `npm run fix -- {agent} --suggest` when issues are found
  - Provides immediate fix suggestions without manual intervention
- **2024-11-30**: Expanded to 8-phase audit system
  - Phase 1: Added color field, permissionMode alignment, field ordering, alphabetical sorting
  - Phase 4: Added tool appropriateness checks (required/forbidden/recommended by type)
  - Phase 7: Added phantom skill detection
  - Phase 8: Added skill recommendations
- **2024-11-30**: Initial creation with 6-phase audit system
