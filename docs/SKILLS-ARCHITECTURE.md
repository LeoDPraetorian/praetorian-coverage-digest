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

**Solution**: A pre-commit hook or CI step validates that all paths in gateway skills resolve to actual files:

```bash
# scripts/verify-gateways.sh (conceptual)
for gateway in .claude/skills/gateway-*.md; do
  grep -oE '\.claude/skill-library/[^)]+' "$gateway" | while read path; do
    if [[ ! -f "$path" ]]; then
      echo "ERROR: $gateway references missing file: $path"
      exit 1
    fi
  done
done
```

### Skill Consolidation Policy

When skills share significant overlap (e.g., `skill-audit`, `skill-fix`, `skill-write`), consolidate into a single skill with flags or modes. This reclaims slots in the Core budget.

---

## Skill Manager

The Skill Manager is the lifecycle management system for Claude Code skills. It enforces quality standards across all three tiers (Core, Gateway, Library), validates compliance through 13 audit phases, and provides comprehensive tooling for creating, updating, auditing, fixing, renaming, migrating, searching, and listing skills.

### Overview

| Aspect | Details |
|--------|---------|
| **Location** | `.claude/skills/skill-manager/` |
| **Purpose** | Unified skill lifecycle management with TDD enforcement |
| **Philosophy** | Test-first: skills must prove gap exists before creation |
| **Coverage** | 13 validation phases for skill quality |
| **Invocation** | Via `/skill-manager` command or `skill-manager` skill |
| **Scope** | Manages both Core (`.claude/skills/`) and Library (`.claude/skill-library/`) skills |

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

### The 13 Audit Phases

Skills must pass compliance validation across 13 phases:

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

**Fix Categories**:
- **Deterministic (auto-apply)**: Phases 2, 4, 5, 6, 7, 10, 12
- **Semantic (Claude-mediated)**: Phases 1, 3, 9, 11, 13 (use `--suggest` mode)
- **Specialized CLI**: Phase 8 (TypeScript compilation guidance)

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
| `npm run audit -- [name]` | 13-phase compliance check | 2-5 min |
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

When multiple skills have overlapping functionality, consolidate into a unified skill:

**Example**: `claude-skill-write`, `claude-skill-compliance`, `claude-skill-search` → `skill-manager`

**Benefits**:
- Reclaims Core skill slots (3 skills → 1)
- Unified CLI with consistent patterns
- Shared utilities and validation logic
- Single source of truth for skill operations

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
- [x] **Write gateway skills for each domain** (7 gateways complete):
  - `gateway-frontend` (20 skills)
  - `gateway-backend` (16 skills)
  - `gateway-testing` (14 skills)
  - `gateway-mcp-tools` (14 skills)
  - `gateway-capabilities` (9 skills)
  - `gateway-security` (6 skills)
  - `gateway-integrations` (5 skills)
- [x] **Optimize all gateway frontmatter to "Use when [action] - [keywords]" pattern (< 120 chars)**
- [x] **Consolidate overlapping skills** — skill-manager, agent-manager, mcp-manager, command-manager
- [x] Update agents to reference gateways — 19/24 agents (79%) have gateway references
- [x] Update `session-start.sh` hook to inject navigator context
- [x] Update commands to use router pattern (delegate to skills)
- [x] Create `sync-gateways` CLI to validate gateway paths resolve to actual files
- [x] Add frontmatter length linter in phase1 audit (enforces < 1024 chars, warns for complexity)

### To Do

- [ ] Add gateway validation to CI pipeline (CLI exists, not yet in CI)
- [ ] Audit skill bodies > 500 lines and split into skill + docs pattern (many exceed limit)
- [ ] Update remaining 5 agents to reference gateways
