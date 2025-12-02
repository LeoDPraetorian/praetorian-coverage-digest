---
name: researching-skills
description: Use when creating any skill - orchestrates brainstorming, codebase research, Context7 docs, web research, generates complete skill structure
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, WebFetch, WebSearch, AskUserQuestion
---

# Researching Skills

**Automated research and generation workflow for creating gold-standard skills.**

## Quick Reference

| Command | Description | Time |
|---------|-------------|------|
| `npm run research -- "<topic>"` | Full workflow (brainstorm + codebase + Context7 + web) | 15-30 min |
| `npm run research -- "<topic>" --context7-only` | Context7 only (library skills) | 5-10 min |
| `npm run research -- "<topic>" --no-context7` | Skip Context7 (process skills) | 10-20 min |
| `npm run generate -- --from-research <path>` | Generate skill from research data | 5-10 min |

## When to Use

Use this skill when:
- Creating ANY new skill (process, library, integration, tool-wrapper)
- You want automated codebase analysis to find similar skills and patterns
- You want Context7 documentation search (for library/integration skills)
- You want optional web research (GitHub, official docs, articles)
- You need to generate complete skill structure matching quality standards

**You MUST use TodoWrite before starting** to track all workflow steps.

## Overview

This skill automates the research-to-generation workflow for creating comprehensive skills. It replaces 2-4 hours of manual research with a 30-minute interactive workflow that produces consistent, high-quality output.

### The Problem It Solves

Creating skills requires:
1. Understanding existing patterns (what similar skills exist?)
2. Gathering documentation (Context7, official docs, articles)
3. Extracting code patterns from the codebase
4. Synthesizing into a well-structured skill

### What This Skill Provides

1. **Brainstorming** - Extract detailed requirements through Q&A
2. **Codebase Research** - Find similar skills, patterns, conventions
3. **Context7 Search** - Official library documentation (conditional)
4. **Web Research** - GitHub/docs/articles (optional)
5. **Skill Generation** - Complete structure matching quality standards

## Workflow Phases

### Phase 0: Brainstorming

Extracts requirements through guided Q&A (one question at a time):

```
┌─────────────────────────────────────────────────────────────┐
│  🎯 Understanding Your Skill                                 │
│                                                             │
│  ? What type of skill is this?                              │
│    ○ Process (methodology, workflow)                        │
│    ● Library (npm package, API)                             │
│    ○ Integration (connecting tools)                         │
│    ○ Tool Wrapper (CLI, MCP)                                │
│                                                             │
│  ? Where should this skill live?                            │
│    ○ Core Skills (high-frequency)                           │
│    ● Skill Library (specialized)                            │
│                                                             │
│  ? Which category? [if library]                             │
│    ○ development/frontend/patterns                          │
│    ● development/frontend/state                             │
│    ○ development/backend/api                                │
└─────────────────────────────────────────────────────────────┘
```

**Questions asked:**
1. Skill type (process, library, integration, tool-wrapper)
2. Location (core vs library)
3. Category (if library - dynamic from filesystem)
4. Purpose/scope (open-ended)
5. Key workflows to cover (multi-select)
6. Target audience (beginner, intermediate, expert)
7. Library name (if library/integration type)

### Phase 1: Codebase Research

Analyzes existing patterns and conventions:

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Analyzing Codebase...                                    │
│                                                             │
│  ✓ Found 3 similar skills                                   │
│    - frontend-tanstack (similarity: 78%)                    │
│    - frontend-zustand (similarity: 72%)                     │
│    - frontend-react-hook-form-zod (similarity: 65%)         │
│                                                             │
│  ✓ Searched 2 relevant modules                              │
│    - chariot/ui (47 pattern matches)                        │
│    - chariot-ui-components (12 pattern matches)             │
│                                                             │
│  ✓ Extracted project conventions                            │
└─────────────────────────────────────────────────────────────┘
```

**What it analyzes:**
- Similar existing skills (by keyword/type similarity)
- Relevant submodules (dynamically discovered)
- Code patterns (grep for related implementations)
- Project conventions (from CLAUDE.md, DESIGN-PATTERNS.md)

### Phase 2: Context7 Search (Conditional)

Runs only for `library` or `integration` skill types:

```
┌─────────────────────────────────────────────────────────────┐
│  📦 Fetching Library Documentation...                        │
│                                                             │
│  Found 3 packages:                                          │
│  [1] ✅ @tanstack/react-query (v5.67.0) - 127 pages        │
│  [2] ⚠️  @tanstack/query-core (v5.67.0) - 45 pages         │
│  [3] ❌ react-query (v3.39.0) - DEPRECATED                  │
│                                                             │
│  Select packages (comma-separated): 1,2                     │
└─────────────────────────────────────────────────────────────┘
```

### Phase 3: Web Research (Optional)

User-controlled additional research:

```
┌─────────────────────────────────────────────────────────────┐
│  ? Include web research? [Y/n]                              │
│                                                             │
│  Found 12 high-quality sources:                             │
│                                                             │
│  GitHub:                                                    │
│  [1] ✅ TanStack/query (47.2k ⭐) - Score: 98              │
│  [2] ✅ TanStack/query/examples - Score: 95                │
│                                                             │
│  Official Docs:                                             │
│  [3] ✅ tanstack.com/query/v5 - Score: 100                 │
│                                                             │
│  Expert Articles:                                           │
│  [4] ⭐ tkdodo.eu/practical-react-query - Score: 92        │
│                                                             │
│  Select sources (comma-separated, or 'all'): 1,3,4         │
└─────────────────────────────────────────────────────────────┘
```

**Source Quality Scoring:**

| Source Type | Base Score | Modifiers |
|-------------|------------|-----------|
| Official docs | 100 | +10 versioned, -20 outdated |
| GitHub official | 95 | +5 per 10k stars |
| Context7 | 88 | +15 complete API docs |
| Maintainer blogs | 85 | -5 per year old |
| Quality blogs | 70 | -10 per year old |

### Phase 4: Skill Generation

Combines all research into complete skill:

```
┌─────────────────────────────────────────────────────────────┐
│  🔨 Generating Skill Structure...                            │
│                                                             │
│  ✓ SKILL.md (412 lines)                                    │
│  ✓ references/                                              │
│    ├── api-configuration.md                                 │
│    ├── best-practices.md                                    │
│    └── common-patterns.md                                   │
│  ✓ templates/                                               │
│    ├── basic-usage.tsx                                      │
│    └── advanced-patterns.tsx                                │
│                                                             │
│  ✅ Skill created: .claude/skill-library/.../my-skill/     │
└─────────────────────────────────────────────────────────────┘
```

**Uses similar skills as structural templates** - if `frontend-tanstack` is the most similar, uses that structure.

## CLI Reference

All commands run from the scripts directory:

```bash
# From anywhere in the repo
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null || git rev-parse --show-toplevel)
cd "$REPO_ROOT/.claude/skills/researching-skills/scripts"
```

### Research Command

```bash
# Full workflow (all phases)
npm run research -- "tanstack query"

# Context7 only (faster, library docs only)
npm run research -- "zustand" --context7-only

# Skip Context7 (process skills)
npm run research -- "debugging react" --no-context7

# Include web research automatically
npm run research -- "react hook form" --include-web

# Output research data to specific location
npm run research -- "jotai" --output /tmp/jotai-research.json
```

### Generate Command

```bash
# Generate skill from research data
npm run generate -- --from-research /tmp/tanstack-research.json

# Generate to specific location
npm run generate -- --from-research /tmp/research.json --location library:frontend/state

# Dry run (preview without creating)
npm run generate -- --from-research /tmp/research.json --dry-run
```

## Integration with skill-manager

This skill integrates with skill-manager's create workflow:

```bash
# skill-manager create automatically triggers research
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null || git rev-parse --show-toplevel)
cd "$REPO_ROOT/.claude/skills/skill-manager/scripts"
npm run create -- my-skill "Use when doing X"

# Skip research with --no-research flag
npm run create -- my-skill "Use when doing X" --no-research
```

When create runs (without `--no-research`):
1. skill-manager delegates to researching-skills
2. This skill runs the interactive research workflow
3. Generated files are returned to skill-manager
4. skill-manager writes files and runs audit

## Success Criteria

A successful run produces:

- [ ] SKILL.md with 300-600 lines of real content (not stubs)
- [ ] At least 3 reference documents in references/
- [ ] At least 2 code templates in templates/ (if applicable)
- [ ] All research sources documented in .local/research-sources.json
- [ ] Passes skill-manager 13-phase audit
- [ ] No `TODO:` placeholders in generated content

## Example Output

See `frontend-tanstack` for the gold-standard this skill produces:

```
.claude/skill-library/development/frontend/state/frontend-tanstack/
├── SKILL.md                    # 724 lines
├── references/                 # 21 files
│   ├── integration-patterns.md
│   ├── query-api-configuration.md
│   └── ...
├── templates/                  # 14 files
│   ├── server-paginated-table.tsx
│   └── ...
└── .local/
    └── CHANGELOG.md
```

## Directory Structure

```
.claude/skills/researching-skills/
├── SKILL.md                        # This file
├── scripts/
│   ├── src/
│   │   ├── cli.ts                  # Main CLI entry point
│   │   ├── orchestrator.ts         # Phase coordination
│   │   ├── phases/
│   │   │   ├── brainstorm.ts       # Phase 0: Requirements extraction
│   │   │   ├── codebase.ts         # Phase 1: Codebase analysis
│   │   │   ├── context7.ts         # Phase 2: Context7 docs
│   │   │   └── web.ts              # Phase 3: Web research
│   │   ├── generators/
│   │   │   ├── skill-md.ts         # SKILL.md generation
│   │   │   ├── references.ts       # references/ generation
│   │   │   └── templates.ts        # templates/ generation
│   │   └── lib/
│   │       ├── types.ts            # Type definitions
│   │       ├── submodule-discovery.ts
│   │       ├── similar-skills.ts
│   │       └── codebase-search.ts
│   ├── package.json
│   └── tsconfig.json
├── references/
│   ├── workflow-phases.md
│   ├── source-quality.md
│   ├── skill-structure.md
│   └── context7-integration.md
├── .output/                        # Research data outputs (gitignored)
└── .local/                         # Temp data (gitignored)
```

## References

- [Workflow Phases](references/workflow-phases.md)
- [Source Quality Criteria](references/source-quality.md)
- [Skill Structure Spec](references/skill-structure.md)
- [Context7 Integration](references/context7-integration.md)

## Related Skills

- `skill-manager` - Lifecycle management (create, audit, fix)
- `gateway-mcp-tools` - MCP tool access (Context7 wrappers)
- `frontend-tanstack` - Gold-standard output example
