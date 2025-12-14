# Skills Architecture Migration

## The Problem

Claude Code has a **hard limit of ~15,000 characters** for skill metadata in the Skill tool. This translates to approximately **70 skills** before truncation occurs. Skills beyond this limit are completely invisible to Claude—it cannot select or use them.

We have **147 skills**. Claude only sees the first ~70 alphabetically. The remaining 77 skills are invisible, including critical ones like `test-driven-development`, `systematic-debugging`, and `verification-before-completion`.

### Why This Happens

When Claude Code starts, it scans all skills from:

- `.claude/skills/` (project skills)
- `~/.claude/skills/` (personal skills)
- Plugin `skills/` directories

It builds a list of skill names + descriptions and injects this into the Skill tool's prompt. When this list exceeds ~15,000 characters, it truncates alphabetically.

**Key insight**: Only the metadata (name + description) is loaded at startup. The full SKILL.md content loads on-demand when Claude invokes the skill. But if Claude can't see a skill exists, it can never invoke it.

### Problem 2: Lifecycle Management Complexity (RESOLVED via Hybrid Pattern)

**Previous state**: Unclear whether to use instruction-based skills or TypeScript CLI directly for operations like auditing and fixing.

**Current state**: Hybrid Pattern with clear separation:
- **Instruction-based skills** (`.claude/skill-library/claude/skill-management/`) provide guidance, decision points, and result interpretation
- **TypeScript CLI** (`.claude/skills/skill-manager/scripts/`) provides fast, deterministic execution
- **Skills invoke CLI** when needed via Bash tool for batch operations

**Resolution**: Layered orchestration eliminates confusion while maintaining:
- Speed for batch operations (147 skills validated in 5-10 min)
- Guidance for complex workflows (TDD, progressive disclosure)
- Automation for CI/CD integration (deterministic validation)

---

## The Solution: Hybrid Librarian Architecture

We're implementing a three-tier architecture that keeps us well under the 70-skill limit while maintaining access to all 147 skills.

### Tier 1: Core Skills (Native)

**Location**: `.claude/skills/` (flat structure)  
**Count**: ~10-15 skills  
**Purpose**: High-frequency, universally needed skills

These are auto-discovered and accessible via the normal Skill tool. They consume the 15K budget but are used constantly.

**Examples**:

- `test-driven-development`
- `systematic-debugging`
- `verification-before-completion`
- `writing-plans`
- `using-skills` (the navigator/librarian)
- `orchestrating-multi-agent-workflows` (multi-agent coordination)
- `persisting-progress-across-sessions` (cross-session state)

### Tier 2: Gateway Skills (Domain Entry Points)

**Location**: `.claude/skills/` (flat structure)
**Count**: 7 skills
**Purpose**: Single entry points that route to library skills

Each gateway consumes one slot in the 15K budget but provides access to 4-16+ library skills.

**Naming Convention**: `gateway-{domain}` (e.g., `gateway-frontend`, `gateway-backend`)

#### Gateway Summary

| Gateway | Description | Skills Routed |
|---------|-------------|---------------|
| `gateway-frontend` | React, State, UI, Testing patterns | 20 skills |
| `gateway-backend` | Go, AWS, Infrastructure, Integration | 16 skills |
| `gateway-testing` | API, E2E, Mocking, Performance | 14 skills |
| `gateway-mcp-tools` | External APIs (Linear, CLI, Context7) | 14 skills |
| `gateway-capabilities` | VQL development, Scanner integration, Tool orchestration | 9 skills |
| `gateway-security` | Auth, Secrets, Cryptography, Defense | 6 skills |
| `gateway-integrations` | API research, Chariot patterns, Validation | 5 skills |

#### Gateway Selection by Agent Type

| Agent Type | Primary Gateway | Secondary |
|------------|-----------------|-----------|
| Frontend Developer | `gateway-frontend` | - |
| Backend Developer | `gateway-backend` | - |
| Full-Stack Developer | `gateway-frontend` | `gateway-backend` |
| Security Architect | `gateway-security` | `gateway-backend` |
| Integration Developer | `gateway-integrations` | `gateway-mcp-tools` |
| Frontend Test Engineer | `gateway-frontend` | `gateway-testing` |
| Backend Test Engineer | `gateway-testing` | `gateway-backend` |
| Security Reviewer | `gateway-security` | `gateway-testing` |
| Capability Developer | `gateway-capabilities` | `gateway-backend` |

**Note**: Some skills appear in multiple gateways (e.g., security skills in both `gateway-backend` and `gateway-security`). This is intentional—agents choose the gateway that matches their primary domain, and the overlap ensures relevant skills are discoverable from multiple entry points.

### Tier 3: Library Skills (Extended)

**Location**: `.claude/skill-library/` (nested structure)
**Count**: ~120+ skills
**Purpose**: Specialized, domain-specific skills

These are **not** auto-discovered. They don't consume the 15K budget. Claude accesses them via:

1. Gateway skills that list paths
2. The `skill-search` CLI (`npm run -w @chariot/skill-search search -- "query"`)
3. Direct `Read` tool calls

**Structure**:

```
.claude/skill-library/
├── development/
│   ├── frontend/
│   │   ├── frontend-zustand-state-management/SKILL.md
│   │   ├── frontend-tanstack-query/SKILL.md
│   │   └── frontend-tanstack-tables/SKILL.md
│   ├── backend/
│   │   ├── backend-go-concurrency/SKILL.md
│   │   └── backend-api-design/SKILL.md
│   └── capabilities/
│       ├── capabilities-vql-development/SKILL.md
│       ├── capabilities-nuclei-templates/SKILL.md
│       ├── capabilities-scanner-integration/SKILL.md
│       └── capabilities-janus-chains/SKILL.md
├── testing/
│   ├── testing-e2e-patterns/SKILL.md
│   └── testing-api-contracts/SKILL.md
└── operations/
    └── ops-aws-lambda/SKILL.md
```

---

## How It Works Together

### Example: Frontend Task

```
User: "Fix the sorting bug in the users table"

1. Claude sees `gateway-frontend` in available skills (via Skill tool)
2. Claude invokes `gateway-frontend`
3. Gateway loads, showing available frontend skills with paths
4. Claude reads `.claude/skill-library/development/frontend/frontend-tanstack-tables/SKILL.md`
5. Claude follows the loaded skill's instructions
```

### Example: Unknown Domain

```
User: "Help me with Zustand state management"

1. Claude invokes `using-skills` (the navigator)
2. Claude runs: npm run -w @chariot/skill-search search -- "zustand"
3. CLI returns: [LIB] frontend-zustand-state-management → Read: .claude/skill-library/development/frontend/frontend-zustand-state-management/SKILL.md
4. Claude reads that skill
5. Claude follows the instructions
```

---

## How Agents and Commands Use This

### Commands

Commands follow the **Router Pattern**: they parse arguments and delegate to skills, containing zero business logic.

**Why Router Pattern?**
- Commands are loaded into context on every invocation
- Skills are loaded on-demand only when used
- Lightweight commands = more available context for actual work

**Router Pattern example:**

```markdown
# commands/command-manager.md

---
description: Command management - create, audit, fix, list slash commands
allowed-tools: Skill, AskUserQuestion
skills: command-manager
---

**ACTION:** Invoke the `command-manager` skill.
**Output:** Display the tool output verbatim.
```

**Key constraints:**
- `allowed-tools` should only be `Skill, AskUserQuestion` when delegating
- Include "Display the tool output verbatim" for all skill delegations
- Commands should be < 50 lines (logic belongs in skills)

**Full documentation:** `.claude/skill-library/claude/commands/command-manager/references/router-pattern.md`

### Agents

Agents can auto-load gateway skills via the `skills` frontmatter field:

```markdown
# agents/frontend-developer.md

---

name: frontend-developer
description: Frontend development specialist. Use for React, TypeScript, and UI tasks.
tools: Read, Write, Bash, Grep, Glob, Skill
model: sonnet
skills: gateway-frontend

---

You are a frontend development specialist.

**First**: Consult the `gateway-frontend` skill to see available frontend capabilities.

Your workflow:

1. Review the gateway's skill routing table
2. Identify which frontend library skills apply (Zustand, TanStack Query, etc.)
3. Read those skills from the library paths listed in the gateway
4. Follow the loaded skill instructions
```

The `skills: gateway-frontend` line makes the gateway tool available in the agent's context. The agent's system prompt must explicitly instruct it to consult this gateway upon starting—it does not auto-execute.

---

## Skill Organization

### Directory Structure

```
.claude/skills/                           # Core skills (auto-discovered)
├── creating-skills/                      # Instruction-based creation
│   ├── SKILL.md                          # TDD workflow guidance
│   └── references/                       # Detailed workflow steps
├── testing-skills-with-subagents/        # Pressure testing framework
│   ├── SKILL.md                          # RED-GREEN-REFACTOR for skills
│   └── examples/                         # Pressure scenario templates
├── skill-manager/                        # Lifecycle management (Hybrid Pattern)
│   ├── SKILL.md                          # Router to sub-skills
│   ├── scripts/                          # TypeScript CLI implementation
│   │   ├── src/
│   │   │   ├── audit.ts                  # 16-phase validation
│   │   │   ├── fix.ts                    # Auto-remediation
│   │   │   ├── update.ts                 # Test-guarded updates
│   │   │   ├── rename.ts                 # Safe renaming
│   │   │   ├── migrate.ts                # Core ↔ Library movement
│   │   │   ├── search.ts                 # Dual-location search
│   │   │   ├── list.ts                   # Comprehensive listing
│   │   │   ├── sync-gateways.ts          # Gateway validation
│   │   │   └── lib/
│   │   │       ├── audit-engine.ts       # Phase orchestration
│   │   │       ├── phases/               # 16 phase implementations
│   │   │       │   ├── phase1-description-format.ts
│   │   │       │   ├── phase2-allowed-tools.ts
│   │   │       │   ├── phase3-word-count.ts
│   │   │       │   └── ... (13 more phases)
│   │   │       ├── fix-applier.ts        # Deterministic fixes
│   │   │       ├── fix-suggest.ts        # Semantic fix suggestions
│   │   │       └── ...
│   │   └── package.json
│   ├── references/                       # Detailed documentation
│   └── templates/                        # Skill generation templates
├── gateway-frontend/
├── gateway-backend/
├── gateway-testing/
├── gateway-mcp-tools/
├── gateway-security/
├── gateway-integrations/
├── gateway-capabilities/
└── ... (other core skills)

.claude/skill-library/                    # Library skills (on-demand)
├── claude/
│   ├── skill-management/                 # Instruction-based guidance
│   │   ├── auditing-skills/              # Guides audit workflow
│   │   ├── fixing-skills/                # Guides fix workflow
│   │   ├── updating-skills/              # Guides update workflow
│   │   ├── renaming-skills/              # Guides rename workflow
│   │   ├── migrating-skills/             # Guides migration workflow
│   │   ├── searching-skills/             # Guides search workflow
│   │   └── listing-skills/               # Guides listing workflow
│   ├── agent-management/                 # Agent lifecycle skills
│   │   ├── auditing-agents/
│   │   ├── fixing-agents/
│   │   └── ... (8 agent management skills)
│   └── mcp-tools/                        # MCP wrapper skills
│       ├── mcp-tools-linear/
│       ├── mcp-tools-praetorian-cli/
│       └── mcp-tools-context7/
├── development/
│   ├── frontend/
│   │   ├── frontend-zustand-state-management/
│   │   ├── frontend-tanstack-query/
│   │   └── frontend-tanstack-tables/
│   ├── backend/
│   │   ├── backend-go-concurrency/
│   │   └── backend-api-design/
│   └── capabilities/
│       ├── capabilities-vql-development/
│       ├── capabilities-nuclei-templates/
│       └── capabilities-scanner-integration/
├── testing/
│   ├── testing-e2e-patterns/
│   └── testing-api-contracts/
├── security/
│   ├── security-authentication/
│   └── security-authorization/
└── operations/
    └── ops-aws-lambda/
```

### Skill Categories

| Category | Count | Purpose | Pattern |
|----------|-------|---------|---------|
| `Core Workflow` | 3 | Creation, testing, navigation | Instruction-based |
| `Lifecycle (skill-manager)` | 1+8 | Create, audit, fix, rename, migrate, search, list, sync | **Hybrid** (instruction + CLI) |
| `Lifecycle (agent-manager)` | 1+8 | Agent creation, audit, fix, rename, test, search, list | **Pure Router** (instruction only) |
| `Gateways` | 7 | Domain routing (frontend, backend, testing, mcp-tools, security, integrations, capabilities) | Instruction-based |
| `Library Skills` | 120+ | Domain-specific patterns, library documentation, tool wrappers | Instruction-based |

**Total**: ~150 skills across all categories

**Key Distinction**: skill-manager uses Hybrid Pattern (instruction-based skills that invoke TypeScript CLI), while agent-manager uses Pure Router Pattern (instruction-based skills only). See [Skill Manager](#skill-manager) section for detailed explanation.

---

## Skill Anatomy

### Frontmatter Structure

```yaml
---
name: skill-name                    # REQUIRED: kebab-case, <64 chars, matches directory
description: Use when [trigger]...  # REQUIRED: Single-line, <120 chars, third-person
allowed-tools: Read, Write, Bash    # OPTIONAL: Tool access control
---
```

### Description Syntax (CRITICAL)

**Rule**: Must be third-person voice with "Use when" trigger pattern.

```yaml
# ✅ CORRECT: Third-person, "Use when" trigger
description: Use when creating skills - guides through TDD workflow with validation

# ❌ WRONG: First-person
description: I help you create skills

# ❌ WRONG: Second-person
description: You can use this to create skills

# ❌ WRONG: Missing "Use when"
description: Creates skills with TDD validation
```

**Why third-person**: Descriptions appear in system prompt. Consistent voice improves skill selection accuracy. First or second person creates point-of-view confusion that degrades matching.

### Description Pattern

```
Use when [ACTION/TRIGGER] - [HIGH-SIGNAL KEYWORDS]
```

| Component | Purpose | Example |
|-----------|---------|---------|
| `Use when...` | The anchor. Tells Claude "this is a condition" | `Use when` |
| `[Action]` | The trigger. Matches user's verb | `creating`, `auditing`, `testing` |
| `[Keywords]` | The match. Specific technologies/domains | `skills, TDD, validation` |

**Examples**:

```yaml
# Process skill (115 chars)
description: Use when creating skills - guides through TDD workflow (RED-GREEN-REFACTOR) with validation and testing

# Library skill (98 chars)
description: Use when using TanStack Query - patterns for queries, mutations, caching, and optimistic updates

# Tool wrapper skill (105 chars)
description: Use when accessing Linear API - issue management, project tracking, and team collaboration workflows
```

### Structure (Target: <500 lines)

```markdown
---
name: skill-name
description: Use when [trigger] - [capabilities]
allowed-tools: Read, Write, Edit, Bash
---

# Skill Name

**Brief description of what this skill provides.**

## When to Use

- Bullet points of when to use this skill
- Specific triggers and scenarios
- Symptoms that indicate this skill applies

## Quick Reference

| Operation | Command/Pattern | Time |
|-----------|----------------|------|
| Key action 1 | `command` or pattern | Est. time |
| Key action 2 | `command` or pattern | Est. time |

## Core Workflow

[High-level steps with links to detailed references]

1. **Step 1** - Brief description
2. **Step 2** - Brief description
3. **Step 3** - Brief description

See [Detailed Workflow](references/workflow.md) for step-by-step instructions.

## Critical Rules

[Non-negotiable constraints that cannot live in references]

- ✅ Do this
- ❌ Never do that

## Best Practices

[Summary bullets only]

- Pattern 1: Why it works
- Pattern 2: Why it works

## Troubleshooting

[Common issues with quick solutions]

**Problem**: Description of issue
**Solution**: How to fix it

## References

- [Detailed Workflow](references/workflow.md)
- [API Reference](references/api-reference.md) (for library skills)
- [Examples](references/examples.md)

## Related Skills

- `related-skill-name` - Why it's related and when to use it instead
```

**Progressive Disclosure**: Keep SKILL.md <500 lines. Move detailed content to `references/` directory:

| Content Type | Location | Why |
|--------------|----------|-----|
| Overview, when-to-use | SKILL.md | Helps Claude decide if skill applies |
| Quick examples (<10 lines) | SKILL.md | Shows basic usage immediately |
| Core workflow (high-level) | SKILL.md | Provides roadmap |
| Best practices (summary) | SKILL.md | Quick reference |
| Critical rules | SKILL.md | Must-know constraints |
| Detailed explanations | references/ | Load only when implementing |
| API references | references/ | Reference material |
| Advanced patterns | references/ | Specialized techniques |
| Complete examples | examples/ | Full case studies |

### Tool Access Control (Optional)

Use `allowed-tools` to restrict which tools Claude can use when executing this skill:

```yaml
# Read-only file access (safe for analysis skills)
allowed-tools: Read, Grep, Glob

# Git operations only
allowed-tools: Bash(git:*), Read, Write

# NPM/Node operations only
allowed-tools: Bash(npm:*), Bash(node:*), Read, Write

# Full access (no restrictions)
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite
```

**Why use scoping**:
- Prevents accidental destructive operations
- Makes skill intent explicit
- Easier to audit what skill can do
- Security isolation for sensitive operations

---

## Token Budget: The Two-State Economy

Understanding the token budget requires distinguishing between **Discovery Cost** (expensive, constant) and **Execution Cost** (cheap, on-demand).

| State         | What's Loaded                             | When                   | Limit                        |
| ------------- | ----------------------------------------- | ---------------------- | ---------------------------- |
| **Discovery** | Frontmatter only (`name` + `description`) | Always (system prompt) | ~15,000 chars total          |
| **Execution** | Full `SKILL.md` body                      | Only when invoked      | Context window (200k tokens) |

**Critical insight**: The length of your skill's instructions (body) does NOT affect the 70-skill limit. Only the frontmatter description does.

### Hard Limits (Frontmatter)

These constraints apply to text between the `---` YAML markers:

| Field         | Max Characters | Best Practice      | Notes                        |
| ------------- | -------------- | ------------------ | ---------------------------- |
| `name`        | 64             | `kebab-case` only  | Must match filename          |
| `description` | 1,024          | **< 150 chars**    | This is your "budget burner" |
| Format        | N/A            | Single line string | Never use `>-` or multiline  |

#### Naming Conventions

Anthropic recommends **gerund form** (verb + -ing) for skill names, as this clearly describes the activity or capability the skill provides.

| Form | Examples | Preference |
| ---- | -------- | ---------- |
| **Gerund (recommended)** | `processing-pdfs`, `debugging-errors`, `managing-skills` | ✅ Ideal |
| Noun phrases | `pdf-processor`, `error-handler`, `skill-manager` | Acceptable |
| Action verbs | `process-pdfs`, `debug-errors` | Acceptable |

**Naming rules:**
- Must use lowercase letters, numbers, and hyphens only (kebab-case)
- Must match the skill directory name
- Avoid vague names: `helper`, `utils`, `tools`
- Avoid overly generic: `documents`, `data`, `files`
- Avoid reserved words: `anthropic-helper`, `claude-tools`

**Why gerund form is preferred:**
- Clearly describes what the skill *does* as an ongoing activity
- Easier to understand at a glance ("debugging-errors" vs "error-debugger")
- Consistent with Anthropic's official examples
- Creates a cohesive, professional skill library

**The math that matters**:

- If every skill uses 1,024 chars → ~14 skills before truncation
- If every skill uses 200 chars → ~70 skills
- If every skill uses 100 chars → ~140 skills

### Soft Limits (Skill Body)

No physical character limit for the `SKILL.md` body, but performance degrades with size.

| Metric    | Recommendation     | Why                               |
| --------- | ------------------ | --------------------------------- |
| Max lines | ~500 lines         | Attention degradation beyond this |
| Max chars | ~20-30k characters | Latency increases with size       |

**If a skill exceeds 500 lines, split it**:

- ❌ Bad: One massive `SKILL.md` with 20 pages of documentation
- ✅ Good: A lean `SKILL.md` that says "Read `docs/specific-guide.md` for details"

### Optimization Strategy

#### A. Frontmatter: The "Compressed Trigger" Strategy

The `description` field must start with **"Use when..."** - this is a routing trigger that helps Claude's attention mechanism match user intent to tool purpose. But you don't need full sentences after that.

**The Pattern**:

```
Use when [ACTION/TRIGGER] - [HIGH-SIGNAL KEYWORDS]
```

| Component     | Purpose                                        | Example                              |
| ------------- | ---------------------------------------------- | ------------------------------------ |
| `Use when...` | The anchor. Tells Claude "this is a condition" | `Use when`                           |
| `[Action]`    | The trigger. Matches user's verb               | `debugging`, `developing`, `testing` |
| `[Keywords]`  | The match. Specific technologies/domains       | `React, API errors, race conditions` |

**Examples**:

```yaml
# ❌ Bloated (230 chars)
description: Use when you are working on the frontend. This skill allows you to access React patterns, handle state management with Zustand, run TanStack queries, and fix UI bugs in the application.

# ✅ Optimized (118 chars)
description: Use when developing frontend UI - includes React patterns, Zustand state, TanStack Query, component testing.
```

```yaml
# ❌ Bloated (180 chars)
description: Use when you are writing code and want to follow Test Driven Development practices by writing a failing test first before you write the implementation.

# ✅ Optimized (85 chars)
description: Use when writing new code or fixes - enforces TDD Red-Green-Refactor cycle.
```

```yaml
# ❌ Bloated (160 chars)
description: Use when you encounter a bug or error message and need to find the root cause before you attempt to apply any fixes to the code.

# ✅ Optimized (92 chars)
description: Use when fixing bugs - strict 4-step systematic debugging protocol (Reproduce -> Fix).
```

**Delete these filler phrases**: "you are...", "you need to...", "it helps to...", "this skill allows you to..."

#### Why "Use when" is Non-Negotiable

1. **Intent Matching**: Claude predicts which tool satisfies the prompt. "Use when" aligns the tool definition with the model's reasoning chain ("I need to debug... here's a tool to _use when debugging_").

2. **Semantic Distinction**: Differentiates actionable skills from passive documentation:

   - `description: React Documentation` → Passive (implies reading)
   - `description: Use when coding React` → Active (implies workflow)

3. **Conflict Resolution**: When multiple skills could match, "Use when" is the tie-breaker:
   - `gateway-frontend`: "Use when working on UI/Components..."
   - `gateway-backend`: "Use when working on API/Database..."

#### B. Body: The "Manual" Strategy

Once loaded, you have ample budget. Be verbose here:

- ✅ Include: Detailed checklists, strict rules ("NEVER do X"), concrete examples
- ❌ Exclude: Generic fluff, redundant explanations

### Budget Math for Our Architecture

| Tier           | Location                  | Count   | Avg Description | Total Budget |
| -------------- | ------------------------- | ------- | --------------- | ------------ |
| Core Skills    | `.claude/skills/`         | ~18     | ~100 chars      | ~1,800       |
| Gateway Skills | `.claude/skills/`         | 7       | ~100 chars      | ~700         |
| Library Skills | `.claude/skill-library/`  | ~120    | N/A             | **0**        |
| **Total**      |                           | **~145**|                 | **~2,500**   |

With optimized "Use when" descriptions, we use ~16% of the 15K budget, leaving massive room for growth.

**Current Gateway Budget**:

| Gateway | Description Length | Status |
|---------|-------------------|--------|
| `gateway-frontend` | 82 chars | ✅ Optimized |
| `gateway-backend` | 90 chars | ✅ Optimized |
| `gateway-testing` | 82 chars | ✅ Optimized |
| `gateway-mcp-tools` | 98 chars | ✅ Optimized |
| `gateway-security` | 88 chars | ✅ Optimized |
| `gateway-integrations` | 96 chars | ✅ Optimized |
| `gateway-capabilities` | 111 chars | ✅ Optimized |

**Target limits**:

- Hard max: 1,024 characters (technical limit)
- Safe max: ~300 characters
- **Optimization target: < 120 characters**

---

## Quality Gates

### The 16 Skill Quality Phases

Skills must pass compliance validation across 16 phases:

| Phase | Name | Auto-Fix | Description |
|-------|------|----------|-------------|
| 1 | Description Format | ❌ | "Use when" trigger, <120 chars, third-person, no block scalars |
| 2 | Allowed-Tools Field | ✅ | Comma-separated, valid tool names |
| 3 | Word Count | ❌ | SKILL.md <500 lines (progressive disclosure) |
| 4 | Broken Links | ✅ | All references/ and examples/ paths resolve |
| 5 | File Organization | ✅ | SKILL.md + references/ + examples/ structure |
| 6 | Script Organization | ✅ | scripts/ with src/, package.json, tsconfig.json |
| 7 | Output Directory Pattern | ✅ | .output/ for CLI outputs, .local/ for temp data |
| 8 | TypeScript Structure | ❌ | tsc compiles, vitest types resolve, 100% test pass |
| 9 | Bash-TypeScript Migration | ❌ | No bash scripts (except POSIX-portable wrappers) |
| 10 | Reference Audit | ✅ | All SKILL.md references resolve to actual files |
| 11 | Command Example Audit | ❌ | cd commands use portable REPO_ROOT pattern |
| 12 | CLI Error Handling | ✅ | Scripts exit with proper codes, user-friendly errors |
| 13 | State Externalization | ❌ | TodoWrite mandate for multi-step operations |
| 16 | Windows Path Detection | ✅ | No hardcoded Unix paths |

**Fix Categories**:
- **Deterministic (auto-apply)**: Phases 2, 4, 5, 6, 7, 10, 12, 16
- **Semantic (Claude-mediated)**: Phases 1, 3, 9, 11, 13 (use `--suggest` mode)
- **Specialized CLI**: Phase 8 (TypeScript compilation guidance)

### Validation Commands

```bash
# Setup (one-time for humans)
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT/.claude/skills/skill-manager/scripts"

# Audit single skill (auto-detects location)
npm run audit -- skill-name

# Audit all skills (both core and library)
npm run audit

# Auto-fix deterministic issues
npm run fix -- skill-name

# Semantic fix suggestions (JSON output for Claude)
npm run fix -- skill-name --suggest

# Apply specific semantic fix
npm run fix -- skill-name --apply phase1-description --value "new description"
```

### Line Count Targets

| Skill Type | Target | Maximum | Rationale |
|------------|--------|---------|-----------|
| Process | 200-400 | 500 | Methodology with examples |
| Library | 400-600 | 800 | API documentation needs more content |
| Integration | 300-500 | 700 | Service connection patterns |
| Tool Wrapper | 200-300 | 500 | Focused on single tool |

**If skill exceeds maximum**: Extract detailed content to `references/` directory using progressive disclosure pattern.

### Critical Phase Details

#### Phase 1: Description Format

**Checks**:
- ✅ Starts with "Use when"
- ✅ No block scalars (`|` or `>`)
- ✅ <120 characters (warning if >120, <1024)
- ✅ Third-person voice

**Common failures**:
```yaml
# ❌ WRONG: Block scalar
description: |
  Use when creating skills

# ❌ WRONG: First person
description: I help you create skills

# ✅ CORRECT: Single-line, third-person
description: Use when creating skills - guides through TDD workflow
```

#### Phase 3: Word Count (Critical)

**Limit**: <500 lines for SKILL.md

**Why**: Attention degradation beyond 500 lines. Skills should use progressive disclosure pattern.

**Fix**: Extract detailed content to `references/` directory:
```markdown
## Detailed Workflow

See [Workflow Reference](references/workflow.md) for step-by-step instructions.
```

#### Phase 8: TypeScript Structure (If scripts/ exists)

**Checks**:
- `tsc` compiles without errors
- `vitest` types resolve
- All tests pass (100%)

**Why**: Broken TypeScript = broken skill functionality

#### Phase 13: State Externalization

**Checks**: Multi-step skills use TodoWrite for tracking

**Why**: Mental tracking = steps get skipped

**Pattern**:
```markdown
**IMPORTANT**: Use TodoWrite to track phases.

1. Phase 1: Task description
2. Phase 2: Another task
```

---

## Governance & Maintenance

To prevent regression of the 15k limit and broken paths:

### The 120-Character Rule

Core and Gateway skills **MUST** have descriptions under 120 characters, strictly following the compressed trigger format:

```
Use when [TRIGGER] - [KEYWORDS]
```

**Enforcement**: PR reviews must check frontmatter length. Consider adding a linter.

### Link Verification

Gateway skills contain hardcoded paths to library skills. If a library skill moves, the gateway silently breaks—Claude tries to read the path, fails, and potentially hallucinates content.

**Solution**: The `sync-gateways` command validates and repairs gateway consistency:

```bash
# Check for discrepancies (report only)
cd .claude/skills/skill-manager/scripts
npm run sync-gateways

# Preview fixes without applying
npm run sync-gateways -- --dry-run

# Apply fixes automatically
npm run sync-gateways -- --fix
```

**What it validates**:
1. **Broken entries** - Gateway references skills that don't exist (removes them)
2. **Missing entries** - Library skills not in any gateway (adds them to appropriate gateway)
3. **Category mapping** - Skills automatically added to correct gateway based on category:
   - `development/frontend/*` → `gateway-frontend`
   - `development/backend/*` → `gateway-backend`
   - `testing/*` → `gateway-testing`
   - `claude/mcp-tools/*` → `gateway-mcp-tools`

**Automatic updates**:
- **On create**: Library skills automatically added to appropriate gateway
- **On migrate**: Gateway paths updated or skill moved between gateways
- **On sync**: Validates all gateways and repairs discrepancies

**CI/CD Integration** (planned):
```bash
# Add to .github/workflows/validate.yml
- name: Validate Gateway Consistency
  run: |
    cd .claude/skills/skill-manager/scripts
    npm run sync-gateways
```

### Skill Consolidation Policy

When skills share significant overlap (e.g., `skill-audit`, `skill-fix`, `skill-write`), consolidate into a single skill with flags or modes. This reclaims slots in the Core budget.

---

## Skill Manager

The Skill Manager is the lifecycle management system for skills. It uses a **Hybrid Pattern** combining instruction-based guidance with TypeScript CLI execution for fast, deterministic operations.

### Overview

| Aspect | Details |
|--------|---------|
| **Location** | `.claude/skills/skill-manager/` |
| **Purpose** | Create, audit, fix, rename, migrate, search, list skills |
| **Architecture** | **Hybrid**: Instruction-based skills + TypeScript CLI |
| **Command Router** | `/skill-manager` delegates to 8 instruction-based skills |
| **Coverage** | 16 validation phases, TDD enforcement |
| **Scope** | Manages both Core (`.claude/skills/`) and Library (`.claude/skill-library/`) skills |

### Hybrid Architecture Pattern

The skill-manager uses **layered orchestration** where instruction-based skills provide guidance and invoke TypeScript CLI for execution:

```
┌─────────────────────────────────────────┐
│  Command Router                         │
│  (.claude/commands/skill-manager.md)   │
│  Pattern: Pure delegation to skills     │
└──────────────┬──────────────────────────┘
               │ skill: "auditing-skills"
               ▼
┌─────────────────────────────────────────┐
│  Instruction Layer                      │
│  (8 skills in skill-library)            │
│  Pattern: Guide, interpret, decide      │
│  Tools: Read, Write, Bash, AskUser      │
└──────────────┬──────────────────────────┘
               │ Bash tool
               │ npm run audit -- skill-name
               ▼
┌─────────────────────────────────────────┐
│  Execution Layer                        │
│  (TypeScript CLI in scripts/src/)       │
│  Pattern: Fast, deterministic execution │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Phase Implementation                   │
│  (lib/phases/phase*.ts)                 │
│  Pattern: Validation logic              │
└─────────────────────────────────────────┘
```

**Example workflow (auditing a skill)**:

```
User: /skill-manager audit my-skill
        ↓
1. Command routes: skill: "auditing-skills"
2. auditing-skills/SKILL.md loads
3. Explains: What audit does (16 phases)
4. Executes via Bash: npm run audit -- my-skill
5. CLI runs 16 phases in parallel
6. Skill interprets results:
   ✅ Pass → "Ready to commit"
   ⚠️ Warnings → "Review but not blocking"
   ❌ Failures → "Run: npm run fix -- my-skill"
7. Guides next steps based on results
```

### Why Hybrid vs Pure Router?

Unlike agent-manager (which aims for Pure Router), skill-manager benefits from TypeScript CLI:

| Aspect | skill-manager (Hybrid) | agent-manager (Partial Hybrid) |
|--------|------------------------|-------------------------------|
| **Operations** | File validation, structure checks | Description quality, recommendations |
| **Determinism** | High (structural validation) | Mixed (3/8 ops use CLI) |
| **Semantic Decisions** | Few (mostly auto-fixable) | Many (requires Claude analysis) |
| **Batch Performance** | Critical (147 skills to validate) | Less critical (49 agents) |
| **CLI Benefit** | High (5-10 min for all skills) | Medium (only for audit/search) |
| **Design** | Full Hybrid (8/8 ops have CLI) | Partial Hybrid (3/8 ops have CLI) |

**Decision**: Skill operations are **deterministic enough** to benefit from TypeScript CLI speed, while most agent operations require too much semantic analysis to automate.

### Dual Implementation: How They Work Together

**Instruction-based skills provide**:
- Context and explanation for what operations do
- Decision points via AskUserQuestion when needed
- Error interpretation and troubleshooting guidance
- Next-step recommendations based on results

**TypeScript CLI provides**:
- Fast execution (2-3 min for single skill, 5-10 min for all)
- Deterministic validation (no subjective decisions)
- Batch operations for CI/CD integration
- Structured JSON output for parsing

### The 8 Instruction-Based Skills

| Skill | Purpose | Calls CLI? | Interactive? | Time |
|-------|---------|------------|--------------|------|
| `creating-skills` | TDD-driven skill creation | ❌ No | ✅ Yes - location, type, research | 15-30 min |
| `updating-skills` | Test-guarded updates | ✅ Yes (`audit`) | ✅ Yes - confirm changes | 10-20 min |
| `auditing-skills` | 16-phase validation | ✅ Yes (`audit`) | ❌ No - automated | 2-5 min |
| `fixing-skills` | Compliance remediation | ✅ Yes (`audit`, `fix`) | ✅ Yes - choose fix strategy | 5-15 min |
| `renaming-skills` | Safe renaming | ✅ Yes (`rename`) | ✅ Yes - confirm impact | 5-10 min |
| `migrating-skills` | Core ↔ Library movement | ✅ Yes (`migrate`) | ✅ Yes - confirm target | 5-10 min |
| `searching-skills` | Keyword discovery | ✅ Yes (`search`) | ❌ No - automated | 1-2 min |
| `listing-skills` | Comprehensive list | ✅ Yes (`list`) | ❌ No - automated | 1 min |

**Pattern**: 7/8 operations invoke TypeScript CLI. Only `creating-skills` is fully instruction-based (uses native tools + delegates to `researching-skills`).

### Directory Structure

```
.claude/skills/skill-manager/
├── SKILL.md                    # Main skill documentation
├── scripts/
│   ├── src/
│   │   ├── create.ts           # TDD-driven skill creation
│   │   ├── update.ts           # Test-guarded updates
│   │   ├── audit.ts            # 13-phase compliance validation
│   │   ├── fix.ts              # Compliance remediation (3 modes)
│   │   ├── rename.ts           # Safe renaming with reference updates
│   │   ├── migrate.ts          # Move between Core ↔ Library
│   │   ├── search.ts           # Dual-location keyword search
│   │   ├── list.ts             # List all skills with status
│   │   └── lib/
│   │       ├── audit-engine.ts         # Audit orchestration
│   │       ├── fix-applier.ts          # Deterministic fixes
│   │       ├── fix-suggest.ts          # Semantic fix suggestions
│   │       ├── context7-integration.ts # Library documentation import
│   │       ├── library-discovery.ts    # Skill location resolution
│   │       ├── skill-finder.ts         # Find skills by name
│   │       ├── skill-searcher.ts       # Keyword search engine
│   │       ├── phases/                 # 13 audit implementations
│   │       │   ├── phase1-description-format.ts
│   │       │   ├── phase2-allowed-tools.ts
│   │       │   ├── phase3-word-count.ts
│   │       │   ├── phase4-broken-links.ts
│   │       │   ├── phase5-organize-files.ts
│   │       │   ├── phase6-script-organization.ts
│   │       │   ├── phase7-output-directory.ts
│   │       │   ├── phase8-typescript-structure.ts
│   │       │   ├── phase9-bash-typescript-migration.ts
│   │       │   ├── phase10-reference-audit.ts
│   │       │   ├── phase11-command-audit.ts
│   │       │   ├── phase12-cli-error-handling.ts
│   │       │   └── phase13-state-externalization.ts
│   │       └── reporters/              # Output formatting
│   ├── package.json
│   └── tsconfig.json
├── templates/                  # Skill generation templates
└── references/                 # Workflow documentation
    ├── create-workflow.md
    ├── update-workflow.md
    ├── audit-phases.md
    ├── fix-workflow.md
    ├── rename-protocol.md
    ├── migrate-workflow.md
    ├── search-workflow.md
    └── tdd-methodology.md
```

### TDD Workflow (Mandatory)

The Skill Manager enforces a strict Red-Green-Refactor cycle for all skill creation and updates. You cannot create or modify a skill without first proving the gap exists.

```
┌─────────────────────────────────────────────────────────────┐
│                    🔴 RED Phase                              │
│  1. Document gap: Why is this skill needed?                 │
│  2. Test scenario without skill → MUST FAIL                 │
│  3. Capture exact failure behavior (verbatim)               │
└─────────────────────┬───────────────────────────────────────┘
                      │ Cannot proceed without failing test
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    🟢 GREEN Phase                            │
│  4. Create/update skill to address specific gap             │
│  5. Re-test scenario → MUST PASS                            │
│  6. Verify no regression in existing behavior               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    🔵 REFACTOR Phase                         │
│  7. Run pressure tests (time, authority, sunk cost)         │
│  8. Document rationalizations (how agents bypass rules)     │
│  9. Add explicit counters ("Not even when...")              │
│  10. Re-test until bulletproof                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Enforcement**:
- `create` requires gap documentation before generation
- `update` requires RED phase documentation of current failure
- All operations include automatic audit validation
- Pressure testing ensures skills remain effective under agent rationalization

### The 16 Audit Phases (Implemented in TypeScript CLI)

Skills must pass compliance validation across 16 phases:

| Phase | Name | Auto-Fix | Description |
|-------|------|----------|-------------|
| 1 | Description Format | ❌ | "Use when" trigger, <120 chars, no block scalars |
| 2 | Allowed-Tools Field | ✅ | Comma-separated, valid tool names |
| 3 | Word Count | ❌ | SKILL.md <500 lines (progressive disclosure) |
| 4 | Broken Links | ✅ | All references/ and examples/ paths resolve |
| 5 | File Organization | ✅ | SKILL.md + references/ + examples/ structure |
| 6 | Script Organization | ✅ | scripts/ with src/, package.json, tsconfig.json |
| 7 | Output Directory Pattern | ✅ | .output/ for CLI outputs, .local/ for temp data |
| 8 | TypeScript Structure | ❌ | tsc compiles, vitest types resolve, 100% test pass |
| 9 | Bash-to-TypeScript Migration | ❌ | No bash scripts (except POSIX-portable wrappers) |
| 10 | Reference Audit | ✅ | All SKILL.md references resolve to actual files |
| 11 | Command Example Audit | ❌ | cd commands use portable REPO_ROOT pattern |
| 12 | CLI Error Handling | ✅ | Scripts exit with proper codes, user-friendly errors |
| 13 | State Externalization | ❌ | TodoWrite mandate for multi-step operations |
| 16 | Windows Path Detection | ✅ | No hardcoded Unix paths |

**Fix Categories**:
- **Deterministic (auto-apply)**: Phases 2, 4, 5, 6, 7, 10, 12, 16
- **Semantic (Claude-mediated)**: Phases 1, 3, 9, 11, 13 (use `--suggest` mode)
- **Specialized CLI**: Phase 8 (TypeScript compilation guidance)

**Note**: Phases 14-15 are reserved for future use.

### CLI Reference

All commands run from anywhere in the repository via `npx tsx` or from the scripts directory via `npm run`:

```bash
# From anywhere in repo (recommended for Claude Code)
npx tsx .claude/skills/skill-manager/scripts/src/create.ts <args>

# From scripts directory (recommended for humans)
cd .claude/skills/skill-manager/scripts
npm run create -- <args>
```

#### Core Operations

| Command | Description | Time |
|---------|-------------|------|
| `npm run create -- <name> "<desc>" --location <loc>` | TDD-driven skill creation | 15-30 min |
| `npm run update -- <name> "<changes>"` | Test-guarded updates | 10-20 min |
| `npm run audit -- [name]` | 16-phase compliance check | 2-5 min |
| `npm run fix -- <name> [--dry-run\|--suggest]` | Compliance remediation | 5-15 min |
| `npm run rename -- <old> <new>` | Safe renaming with updates | 5-10 min |
| `npm run migrate -- <name> <target>` | Move Core ↔ Library | 5-10 min |
| `npm run search -- "<query>"` | Keyword discovery (both locations) | 1-2 min |
| `npm run list` | List all skills with status | 1 min |

#### Location Options

**For `create` and `migrate` commands:**

- `core` - `.claude/skills/` - High-frequency, always-loaded (~25 skills)
- `library:<category>` - `.claude/skill-library/<category>/` - Specialized, on-demand (~120 skills)
- `library:<domain>/<category>` - Nested library structure

**Examples**:
```bash
# Core skill (always loaded)
npm run create -- my-skill "Use when building features" --location core

# Library skill (on-demand)
npm run create -- tanstack-query "Use when using TanStack Query" --location library:frontend
```

#### Example: Creating a New Skill

```bash
# 1. Setup (one-time, humans only)
cd .claude/skills/skill-manager/scripts
npm install

# 2. RED Phase - Document the gap
# [Document why skill is needed, test without it, capture failure]

# 3. Create skill (suggests location if not specified)
npm run create -- debugging-react "Use when debugging React components" --location core

# 4. GREEN Phase - Verify skill works
# [Test with new skill, should pass]

# 5. Audit compliance
npm run audit -- debugging-react
# ✅ All phases passed

# 6. REFACTOR Phase - Pressure test
# [Test under time pressure, authority pressure, sunk cost bias]
# [Add explicit counters for rationalizations]
```

### Context7 Integration

For library/framework skills, you can auto-populate documentation from Context7:

```bash
# Step 1: Fetch documentation via context7 MCP tools
# (Use context7 wrappers to query library docs, save to JSON)

# Step 2: Create skill with context7 data
npm run create -- tanstack-query \
  "Use when implementing data fetching with TanStack Query" \
  --location library:frontend \
  --skill-type library \
  --context7-data /tmp/tanstack-query-docs.json

# Generated structure:
# - SKILL.md (main skill with API quick reference)
# - references/api-reference.md (full API docs)
# - references/patterns.md (common patterns)
# - examples/basic-usage.md (code examples)
# - .local/context7-source.json (metadata for updates)
```

**Update context7-enabled skills**:
```bash
# Refresh documentation with latest version
npm run update -- tanstack-query \
  --refresh-context7 \
  --context7-data /tmp/new-docs.json
```

### Progressive Disclosure Pattern

Skills use a lean SKILL.md + detailed references/ structure:

```
skill-name/
├── SKILL.md                    # Quick start (< 500 lines)
│   ├── Quick Reference         # Command table
│   ├── Overview                # 1-2 paragraph intro
│   ├── Core Operations         # High-level usage
│   └── See references/         # Deep dive links
├── references/                 # Detailed documentation
│   ├── workflow.md             # Step-by-step guides
│   ├── audit-phases.md         # Phase details
│   ├── tdd-methodology.md      # TDD practices
│   └── troubleshooting.md      # Common issues
├── examples/                   # Code examples
│   ├── basic-usage.md
│   └── advanced-patterns.md
├── scripts/                    # CLI implementation
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── .output/                    # CLI outputs (gitignored)
└── .local/                     # Temp data (gitignored)
```

**Why this works**:
- SKILL.md loads fast (< 500 lines = ~10k tokens)
- Detailed content loaded via Read tool only when needed
- Prevents attention degradation from massive skill bodies

### Dual-Location Search

The `search` command searches both Core and Library skills:

```bash
# Search all skills
npm run search -- "react"

# Output shows location:
[CORE] react-developer (Score: 95)
   → Use with Skill tool: skill: "react-developer"

[LIB] frontend-tanstack-query (Score: 87)
   → Read: .claude/skill-library/frontend/frontend-tanstack-query/SKILL.md
```

**Search algorithm**:
- Name exact match: 100 points
- Name substring: 50 points
- Description match: 30 points
- Allowed-tools match: 10 points

### Migration Between Tiers

Move skills between Core and Library as usage patterns change:

```bash
# Promote library skill to core (high-frequency usage)
npm run migrate -- my-skill to-core

# Demote core skill to library (low-frequency usage)
npm run migrate -- my-skill to-library:development

# Move within library
npm run migrate -- my-skill to-library:testing
```

**7-step safe migration**:
1. Validate source location exists
2. Validate target location available
3. Update frontmatter metadata
4. Move directory to target
5. Update gateway skill references
6. Update command references
7. Update deprecation registry

### Skill Consolidation Policy

When multiple skills have overlapping functionality, consolidate into a unified skill with operation routing.

**Consolidation Examples**:

| Original Skills | Consolidated To | Slots Reclaimed | Pattern |
|----------------|-----------------|-----------------|---------|
| `claude-skill-write`, `claude-skill-compliance`, `claude-skill-search` | `skill-manager` | 2 slots | Unified lifecycle management |
| `claude-agent-write`, `claude-agent-audit`, `claude-agent-fix` | `agent-manager` | 2 slots | Unified lifecycle management |
| `mcp-create`, `mcp-verify`, `mcp-test` | `mcp-manager` | 2 slots | Unified wrapper management |

**Total reclaimed**: 6 Core skill slots through consolidation

**Benefits**:
- Reclaims Core skill slots (3× improvement: 9 skills → 3)
- Unified CLI with consistent patterns across all operations
- Shared utilities and validation logic (no duplication)
- Single source of truth for lifecycle operations
- Better user experience (one command for all operations: `/skill-manager`, `/agent-manager`, `/mcp-manager`)

**Consolidation Criteria** (when to consolidate):
- Skills share >60% of code (utilities, validation, file operations)
- Operations form a natural lifecycle (create → audit → fix → update)
- Users would benefit from unified interface
- CLI commands follow same patterns

---

### Why not just split into multiple plugins?

We considered splitting into `chariot-core`, `chariot-frontend`, `chariot-backend`, etc. Problems:

- Users installing multiple plugins could still hit the 70-skill limit
- Plugin changes require session restart
- Cross-plugin skill references are awkward

The hybrid librarian approach keeps everything in one plugin with controlled budget usage.

### Why gateways instead of just `find-skills`?

Gateways provide:

- **Discoverability**: Claude sees `gateway-frontend` in its tools and knows frontend skills exist
- **Curated paths**: No guessing—gateway lists exactly what's available
- **Model-invoked selection**: Claude can automatically choose the gateway based on task context

`skill-search` CLI is the fallback for discovery, not the primary workflow.

### Why `gateway-{domain}` naming convention?

We use `gateway-frontend` instead of `frontend-gateway` because:

- **Grouping**: All gateways cluster together alphabetically in file listings
- **Self-documenting**: `gateway-*` files are menus, everything else is a tool
- **Visual clarity**: Developers immediately recognize gateway files when browsing `.claude/skills/`

This convention makes the directory structure self-explanatory without relying on documentation.

### Why nested structure in the library?

The library uses nested folders (`development/frontend/`) because:

- It's not auto-discovered, so structure doesn't affect the token budget
- Logical organization helps humans navigate
- Paths in gateways are more readable

Core and gateway skills stay flat because they're auto-discovered and flat is required.

---

## Why This Works: Context Engineering Principles

Our architecture follows Anthropic's [context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) best practices. Context engineering is the evolution of prompt engineering—it's about curating the optimal set of tokens available to the LLM at any given moment, not just writing good prompts.

### The Core Insight

> "Context must be treated as a finite resource with diminishing marginal returns. Like humans, who have limited working memory capacity, LLMs have an 'attention budget' that they draw on when parsing large volumes of context. Every new token introduced depletes this budget."

The 15K skill budget isn't an arbitrary limit—it reflects a real constraint. Even if we could fit more skills, attention degradation would reduce Claude's ability to select and use them effectively.

### Principle 1: Minimal High-Signal Tokens

> "Good context engineering means finding the smallest possible set of high-signal tokens that maximize the likelihood of some desired outcome."

Our gateway skills are intentionally lightweight. A gateway like `gateway-frontend` contains just:

- A description for discovery (~100 tokens)
- A routing table of paths (~200 tokens)

This is far more efficient than loading 15 full frontend skill descriptions into the Skill tool.

### Principle 2: Just-in-Time Context Retrieval

> "Rather than pre-processing all relevant data up front, agents built with the 'just in time' approach maintain lightweight identifiers (file paths, stored queries, web links, etc.) and use these references to dynamically load data into context at runtime using tools."

This is exactly what our architecture does:

- **Gateways** = lightweight identifiers (paths to skills)
- **Library skills** = loaded just-in-time via `Read` tool
- **Full skill content** = only enters context when actually needed

### Principle 3: Semantic Navigation via Metadata

> "Folder hierarchies, naming conventions, and timestamps all provide important signals that help both humans and agents understand how and when to utilize information."

Our nested library structure (`.claude/skill-library/development/frontend/frontend-tanstack-query/`) isn't just organization—the path itself is semantic information. Claude can infer that a skill in `development/frontend/` relates to frontend development without reading its contents.

### Principle 4: Hybrid Retrieval Strategy

> "Claude Code is an agent that employs this hybrid model: CLAUDE.md files are naively dropped into context up front, while primitives like glob and grep allow it to navigate its environment and retrieve files just-in-time."

Our three tiers map directly to this hybrid model:

| Tier           | Strategy               | Equivalent             |
| -------------- | ---------------------- | ---------------------- |
| Core Skills    | Loaded upfront         | Like CLAUDE.md         |
| Gateway Skills | Lightweight navigation | Like file paths        |
| Library Skills | Retrieved just-in-time | Like glob/grep results |

### Principle 5: Sub-Agent Isolation

> "Sub-agent architectures provide another way around context limitations. Rather than one agent attempting to maintain state across an entire project, specialized sub-agents can handle focused tasks with clean context windows."

Our domain-specific agents (frontend-developer, backend-developer) with auto-loaded gateway skills implement this pattern. Each agent starts with a clean context, loads only relevant skills, does deep work, and returns results without polluting the main agent's context.

### The Result

Instead of 147 skills competing for attention in a crowded context window, we have:

- ~15 high-signal skills visible to the Skill tool
- Domain-specific agents with focused, relevant context
- 130+ specialized skills available on-demand without attention cost

This isn't just a workaround for a token limit—it's better context engineering that will improve Claude's performance even if limits increase.

---

## References

- [Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) - The theoretical foundation for our architecture
- [Agent Skills Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Skills Overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Subagents Documentation](https://code.claude.com/docs/en/sub-agents) - Agent frontmatter including `skills` field
- [obra/superpowers](https://github.com/obra/superpowers) - Reference implementation of the librarian pattern
- [Claude Agent Skills Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/) - Technical architecture analysis

---

## Migration Status

### Completed

- [x] Identified the 15K character truncation problem
- [x] Designed the hybrid librarian architecture
- [x] Defined the three-tier structure (Core / Gateway / Library)
- [x] Update `using-skills` to use `skill-search` CLI (replaces bash `find-skills`)
- [x] **Gerund naming migration** — rename agent-discoverable skills to gerund form
- [x] Create the `.claude/skill-library/` directory structure
- [x] Move extended skills to library (preserving functionality)
- [x] **Write gateway skills for each domain** (8 gateways complete):
  - `gateway-frontend` (20 skills)
  - `gateway-backend` (16 skills)
  - `gateway-testing` (14 skills)
  - `gateway-mcp-tools` (14 skills)
  - `gateway-capabilities` (9 skills)
  - `gateway-security` (6 skills)
  - `gateway-integrations` (5 skills)
  - `gateway-claude` (8 skills - agent management) ✨ NEW Dec 2024
- [x] **Optimize all gateway frontmatter to "Use when [action] - [keywords]" pattern (< 120 chars)**
- [x] **Consolidate overlapping skills** — skill-manager, agent-manager, mcp-manager, command-manager
- [x] Update agents to reference gateways — 19/24 agents (79%) have gateway references
- [x] Update `session-start.sh` hook to inject navigator context
- [x] Update commands to use router pattern (delegate to skills)
- [x] Create `sync-gateways` CLI to validate gateway paths resolve to actual files
- [x] Add frontmatter length linter in phase1 audit (enforces < 1024 chars, warns for complexity)

### To Do

- [x] **agent-manager Pure Router Pattern migration** (completed Dec 7, 2024)
  - Created 5 new instruction-based skills (auditing, fixing, renaming, searching, listing)
  - Migrated all 8 operations to skill delegation
  - Created gateway-claude and moved agent-management skills to library
  - Reduced Core from 39 → 32 skills (18% reduction)
  - See: `.claude/skills/agent-manager/AGENT-MANAGER-MIGRATION.md`
- [ ] **skill-manager Router Pattern evaluation**
  - Current: Hybrid pattern (1 skill creation skill + 8 CLI scripts exposed)
  - Decision needed: Migrate to Pure Router Pattern vs document hybrid approach
  - Estimated effort: 28-37 hours if migrating (more complex than agent-manager)
  - Complexity: 16-phase audit, context7 integration, progressive disclosure enforcement
- [ ] Add gateway validation to CI pipeline (sync-gateways CLI exists, not yet in CI)
- [ ] Audit skill bodies > 500 lines and split into skill + docs pattern (many exceed limit)
- [ ] Update remaining 5 agents to reference gateways
