# Workflow Phases

## Overview

The researching-skills workflow operates in five sequential phases:

1. **Requirements Gathering** - Gather skill details via AskUserQuestion
2. **Codebase Research** - Find similar skills and usage patterns
3. **Context7 Research** - Library documentation (library/integration types only)
4. **Web Research** - Supplemental sources (optional)
5. **Generation** - Create skill structure and validate

## Phase 1: Requirements Gathering

### Purpose
Understand what skill is needed through interactive Q&A.

### Questions
| Question | Purpose | Affects |
|----------|---------|---------|
| Skill Type | Process/Library/Integration/Tool Wrapper | Phase 3 eligibility |
| Location | Core (.claude/skills/) or Library | Output path |
| Category | Subdirectory in skill-library | Organization |
| Scope | What workflows to cover | Content focus |
| Library Name | Package name for library skills | Context7 search |

### Tools
- **AskUserQuestion**: Gather preferences one question at a time
- **TodoWrite**: Track progress through questions

## Phase 2: Codebase Research

### Purpose
Find existing patterns, similar skills, and project conventions.

### Process
1. Search for similar skills by keyword
2. Read top 2-3 similar skills as structural templates
3. Search for library/pattern usage in codebase
4. Read 3-5 files to understand real patterns
5. Review project conventions (CLAUDE.md, DESIGN-PATTERNS.md)

### Tools
- **Grep**: Search skill descriptions and codebase
- **Glob**: Find files by pattern
- **Read**: Examine similar skills and usage examples

## Phase 3: Context7 Research

### Purpose
Fetch official library documentation from Context7.

### Eligibility
- ✅ Library skills
- ✅ Integration skills
- ❌ Process skills (skip)
- ❌ Tool Wrapper skills (skip)

### Process
1. Ask user if they want Context7 research
2. Search for library by name
3. Present results with quality indicators:
   - ✅ Recommended: Main package, stable
   - ⚠️ Caution: Internal packages, pre-release
   - ❌ Deprecated: Do not use
4. User selects package
5. Fetch documentation
6. Extract key information:
   - API functions and signatures
   - Usage patterns with code
   - Configuration options
   - Best practices

### Tools
- **AskUserQuestion**: Confirm Context7 usage, select package
- **Bash**: Execute Context7 MCP wrappers

See [Context7 Commands](context7-commands.md) for execution patterns.

## Phase 4: Web Research (Optional)

### Purpose
Find supplemental sources for patterns, articles, and examples.

### Process
1. Ask user if they want web research
2. Search with relevant queries
3. Present results with quality scores
4. User selects sources to fetch
5. Fetch and summarize key findings

### Source Quality Scoring

| Type | Base Score | Examples |
|------|------------|----------|
| Official Docs | 100 | tanstack.com, react.dev |
| GitHub Repo | 95 | Source code, examples |
| Maintainer Blog | 85 | TkDodo's blog, Kent C. Dodds |
| Quality Blog | 70 | Verified expert articles |
| Article | 50 | General tutorials |

### Trusted Domain Boosts
- tanstack.com: +20
- react.dev: +18
- github.com/tanstack: +15
- tkdodo.eu: +15
- kentcdodds.com: +12

See [Source Quality](source-quality.md) for full scoring criteria.

### Tools
- **AskUserQuestion**: Confirm web research, select sources
- **WebSearch**: Find relevant sources
- **WebFetch**: Retrieve content from selected sources

## Phase 5: Generation

### Purpose
Create complete skill structure from research data.

### Process
1. Determine output path based on location/category
2. Generate SKILL.md from template
3. Create reference files
4. Create templates (library skills)
5. Validate against quality checklist

### Output Structure
```
skill-name/
├── SKILL.md              # 300-600 lines
├── references/           # Detailed documentation
│   ├── api-reference.md
│   ├── patterns.md
│   └── troubleshooting.md
└── templates/            # Code templates (library skills)
    └── typescript/
```

### Content Sources
- **SKILL.md**: Structure from similar skills, content from research
- **References**: Detailed API docs, guides from Context7/web
- **Templates**: Code examples from codebase and documentation

See [Skill Structure](skill-structure.md) for full specification.
See [Quality Checklist](quality-checklist.md) for validation.

### Tools
- **Write**: Create skill files
- **TodoWrite**: Track validation checklist

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Request                             │
│              "Create a skill for TanStack Query"            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           Phase 1: Requirements Gathering                    │
│  • Ask skill type, location, category                       │
│  • Ask scope and library name                               │
│  • Create TodoWrite todos for workflow                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           Phase 2: Codebase Research                         │
│  • Search for similar skills                                │
│  • Find usage patterns in modules/                          │
│  • Read project conventions                                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           Phase 3: Context7 Research (if library/integration)│
│  • Search Context7 for library                              │
│  • User selects package                                     │
│  • Fetch and extract documentation                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           Phase 4: Web Research (if requested)              │
│  • Search for supplemental sources                          │
│  • Score and rank by quality                                │
│  • Fetch user-selected sources                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           Phase 5: Generation                                │
│  • Generate SKILL.md from template                          │
│  • Create references/ and templates/                        │
│  • Validate against quality checklist                       │
└─────────────────────────────────────────────────────────────┘
```

## TodoWrite Integration

Create these todos at workflow start:

```
1. "Gather requirements via AskUserQuestion" → Phase 1
2. "Search codebase for similar skills" → Phase 2
3. "Research Context7 documentation" → Phase 3 (if applicable)
4. "Search web for supplemental sources" → Phase 4 (if requested)
5. "Generate skill structure" → Phase 5
6. "Validate against quality checklist" → Phase 5
```

Mark each `in_progress` before starting, `completed` when done.
