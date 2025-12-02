# Workflow Phases

## Overview

The researching-libraries skill operates in three sequential phases:

1. **Context7 Search** - Query library documentation
2. **Web Research** - Find supplemental sources
3. **Skill Generation** - Create skill structure

## Phase 1: Context7 Search

### Purpose
Search the Context7 documentation index for library documentation.

### Process
1. User provides topic (e.g., "tanstack query", "zustand")
2. CLI calls Context7 resolve-library-id wrapper
3. Results displayed with package status indicators:
   - ✅ Recommended - Main package for the library
   - ⚠️ Caution - Internal/core packages, pre-release versions
   - ❌ Deprecated - Should not be used

### Selection
- In CLI mode: Auto-selects recommended packages
- In interactive mode: User confirms selection

## Phase 2: Web Research (Optional)

### Purpose
Find supplemental sources for patterns, articles, and examples.

### Source Types
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

## Phase 3: Skill Generation

### Purpose
Create complete skill structure from research data.

### Output Structure
```
skill-name/
├── SKILL.md              # 300-600 lines
├── references/           # 8-15 documentation files
├── templates/            # 5-10 code templates
│   └── {language}/       # Organized by language
└── .local/
    └── metadata.json     # Generation metadata
```

### Content Generation
- **SKILL.md**: Frontmatter, quick reference, core concepts, patterns
- **References**: API docs, guides, migration notes
- **Templates**: Code examples organized by language

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Request                             │
│              "Research tanstack query"                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           Phase 1: Context7 Search                          │
│  • Search packages matching topic                           │
│  • Display results with status indicators                   │
│  • Auto-select recommended packages                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           Phase 2: Web Research (if enabled)                │
│  • Search for supplemental sources                          │
│  • Score and rank by quality                                │
│  • Filter high-quality sources (score >= 70)                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           Phase 3: Skill Generation                         │
│  • Parse documentation into sections                        │
│  • Extract code blocks                                      │
│  • Generate SKILL.md + references/ + templates/             │
└─────────────────────────────────────────────────────────────┘
```
