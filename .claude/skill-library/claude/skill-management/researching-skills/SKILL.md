---
name: researching-skills
description: Use when creating any skill - guides research through codebase, Context7, and web sources
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, WebFetch, WebSearch, AskUserQuestion
---

# Researching Skills

Interactive research workflow for creating comprehensive skills.

## When to Use

- Creating ANY new skill (process, library, integration, tool-wrapper)
- Researching existing patterns before writing a skill
- Using Context7 for library documentation
- Finding similar skills as structural templates

## Quick Reference

| Phase           | Purpose                      | Key Tools           |
| --------------- | ---------------------------- | ------------------- |
| 1. Requirements | Gather skill details         | AskUserQuestion     |
| 2. Codebase     | Find similar skills/patterns | Grep, Glob, Read    |
| 3. Context7     | Library documentation        | MCP wrappers        |
| 4. Web          | Supplemental sources         | WebSearch, WebFetch |
| 5. Generation   | Create skill structure       | Write               |

## Progress Tracking

**Create these todos at workflow start:**

1. "Gather requirements via AskUserQuestion" (Phase 1)
2. "Search codebase for similar skills" (Phase 2)
3. "Research Context7 documentation" (Phase 3, if library/integration)
4. "Search web for supplemental sources" (Phase 4, if needed)
5. "Generate skill structure" (Phase 5)
6. "Validate against quality checklist" (Phase 5)

Mark each `in_progress` before starting, `completed` when done.

---

## Phase 1: Requirements Gathering

Ask questions one at a time via AskUserQuestion.

### Question 1: Skill Type

| Field       | Value                         |
| ----------- | ----------------------------- |
| header      | "Skill Type"                  |
| question    | "What type of skill is this?" |
| multiSelect | false                         |

| Option       | Description                                             |
| ------------ | ------------------------------------------------------- |
| Process      | Methodology or workflow (TDD, debugging, brainstorming) |
| Library      | npm package or framework (TanStack Query, Zustand)      |
| Integration  | Connecting services (GitHub + Linear)                   |
| Tool Wrapper | CLI or MCP tool wrapper                                 |

### Question 2: Location

| Field       | Value                           |
| ----------- | ------------------------------- |
| header      | "Location"                      |
| question    | "Where should this skill live?" |
| multiSelect | false                           |

| Option  | Description                                     |
| ------- | ----------------------------------------------- |
| Core    | High-frequency, always loaded (.claude/skills/) |
| Library | Specialized, on-demand (.claude/skill-library/) |

### Question 3: Category (if Library location)

Discover available categories first:

```bash
ls -d .claude/skill-library/*/ .claude/skill-library/*/*/ 2>/dev/null | sed 's|.claude/skill-library/||' | sort -u
```

Then ask which category fits best.

### Question 4: Scope

| Field    | Value                                                          |
| -------- | -------------------------------------------------------------- |
| header   | "Scope"                                                        |
| question | "What specific workflows or patterns should this skill cover?" |

Open-ended - let user describe in their own words.

### Question 5: Library Name (if Library/Integration type)

| Field    | Value                                       |
| -------- | ------------------------------------------- |
| header   | "Library"                                   |
| question | "What is the main library or package name?" |

Examples: `@tanstack/react-query`, `zustand`, `zod`

---

## Phase 2: Codebase Research

### 2.1 Find Similar Skills

Search for skills with similar keywords:

```bash
grep -r "description:.*KEYWORD" .claude/skills/ .claude/skill-library/ --include="SKILL.md"
```

Read top 2-3 most similar skills as structural templates.

### 2.2 Find Codebase Usage

Search for how the library/pattern is used:

```bash
grep -r "LIBRARY_NAME" modules/ --include="*.ts" --include="*.tsx" -l | head -10
```

Read 3-5 files to understand real usage patterns.

### 2.3 Check Conventions

Read project conventions:

- `CLAUDE.md` - Project-wide conventions
- `docs/DESIGN-PATTERNS.md` - Architecture patterns
- `docs/TECH-STACK.md` - Technology decisions

---

## Phase 3: Context7 Research

**Skip this phase for Process and Tool Wrapper types.**

### 3.1 Ask: Use Context7?

| Field       | Value                                         |
| ----------- | --------------------------------------------- |
| header      | "Context7"                                    |
| question    | "Search Context7 for official documentation?" |
| multiSelect | false                                         |

| Option   | Description                      |
| -------- | -------------------------------- |
| Yes      | Search Context7 for library docs |
| Skip     | Proceed to web research          |
| Skip All | Use template only (no research)  |

### 3.2 Execute Search

Search using library name from Phase 1. See [Context7 Commands](references/context7-commands.md) for execution patterns.

### 3.3 Present Results

Show results with quality indicators:

- ✅ **Recommended**: Main package, stable version
- ⚠️ **Caution**: Internal packages (`-core`), pre-release
- ❌ **Deprecated**: Do not use

### 3.4 Ask: Select Package

| Field       | Value                                             |
| ----------- | ------------------------------------------------- |
| header      | "Package"                                         |
| question    | "Which package should I fetch documentation for?" |
| multiSelect | false                                             |

Options: List packages from search results + "Search again" + "Skip"

### 3.5 Fetch & Extract

Fetch documentation for selected package. Extract:

- Core API functions and signatures
- Common usage patterns with code examples
- Configuration options
- Best practices and anti-patterns

---

## Phase 4: Web Research (Optional)

### 4.1 Ask: Use Web Research?

| Field       | Value                                          |
| ----------- | ---------------------------------------------- |
| header      | "Web"                                          |
| question    | "Search the web for additional documentation?" |
| multiSelect | false                                          |

| Option | Description                                    |
| ------ | ---------------------------------------------- |
| Yes    | Search for official docs, GitHub, expert blogs |
| Skip   | Proceed to skill generation                    |

### 4.2 Execute Search

Use WebSearch with queries like:

- `{library-name} documentation`
- `{library-name} best practices 2025`
- `{library-name} examples github`

### 4.3 Present Results

Show results with source quality. See [Source Quality](references/source-quality.md) for scoring criteria.

### 4.4 Fetch Selected Sources

Use WebFetch for user-selected sources. Summarize key findings.

---

## Phase 5: Generation

### 5.1 Directory Structure

```
skill-name/
├── SKILL.md                 # 300-600 lines
├── references/              # Detailed documentation
│   ├── api-reference.md
│   ├── patterns.md
│   └── troubleshooting.md
└── templates/               # Code templates (library skills)
    └── typescript/
```

See [Skill Structure](references/skill-structure.md) for full specification.

### 5.2 SKILL.md Template

```markdown
---
name: skill-name
description: Use when [trigger] - [key capabilities]
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Skill Title

**Brief description.**

## When to Use

- Bullet points of triggers

## Quick Reference

| Pattern | Description | Example |
| ------- | ----------- | ------- |

## Core Concepts

### Concept 1

### Concept 2

## Common Patterns

### Pattern 1

### Pattern 2

## Anti-Patterns

### Don't Do This

## References

- [API Reference](references/api-reference.md)

## Related Skills

- `related-skill` - Why related
```

### 5.3 Validation

Run quality checklist. See [Quality Checklist](references/quality-checklist.md).

**Must pass:**

- [ ] Description starts with "Use when"
- [ ] Line count under maximum (600 for library, 400 for process)
- [ ] No TODO placeholders
- [ ] At least 2 reference files

---

## Gold Standard Examples

**Library Skills:**

- `.claude/skill-library/development/frontend/state/frontend-tanstack/`
- `.claude/skill-library/development/frontend/state/frontend-zustand/`

**Process Skills:**

- `.claude/skills/developing-with-tdd/`
- `.claude/skills/debugging-systematically/`

---

## References

- [Skill Structure](references/skill-structure.md) - Directory and file structure
- [Context7 Commands](references/context7-commands.md) - MCP wrapper execution
- [Context7 Integration](references/context7-integration.md) - Detailed integration patterns
- [Source Quality](references/source-quality.md) - Quality scoring criteria
- [Quality Checklist](references/quality-checklist.md) - Validation checklist
- [Workflow Phases](references/workflow-phases.md) - Detailed phase documentation

## Related Skills

- `creating-skills` - Skill creation workflow (uses this skill for research)
- `managing-skills` - Lifecycle management (audit, fix, rename)
- `gateway-mcp-tools` - MCP tool access routing
