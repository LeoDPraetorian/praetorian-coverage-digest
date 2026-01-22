# Research Phase Rationalization Table

**Why agents skip the research phase and why they're wrong.**

## Common Rationalizations

| Excuse                                                           | Reality                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "I already know this topic well enough"                          | Your training data is at least a year old. Research finds React 19+ patterns, latest API changes, and codebase-specific implementations you don't know exist. Libraries evolve rapidly - Context API changed significantly from React 16 to 19. |
| "This is a simple task"                                          | Simple skills still need current patterns. What seems obvious often has evolved. Even "basic" topics like useState have new patterns in React 19 (useOptimistic, useActionState).                                                               |
| "No time to research"                                            | Skipping research creates outdated skills that waste MORE time fixing later. 15 minutes of research prevents hours of corrections and user confusion.                                                                                           |
| "I'll just write what I know and update later"                   | "Later" never comes. Skills ship with stale knowledge and stay that way. Technical debt compounds - outdated skills teach wrong patterns to other agents.                                                                                       |
| "Research is optional for Library/Framework skills"              | WRONG. These skills ESPECIALLY need research - they document external dependencies that change frequently. Framework docs update constantly.                                                                                                    |
| "I found similar skills in the codebase, that's enough research" | Codebase patterns show HOW we use libraries, not WHAT changed in latest versions. You need both codebase research AND Context7/web research.                                                                                                    |
| "The skill is just documenting existing code"                    | Even documentation needs research to ensure you're documenting CURRENT best practices, not legacy patterns that happen to exist in the codebase.                                                                                                |

## Why This Matters

### Training Data Staleness

Your training data has a cutoff date. For Claude models:

- Training data is typically 12-18 months old
- Libraries release major versions every 6-12 months
- React 19 released October 2024 - if your cutoff is April 2024, you don't know it exists

**Example**: Creating a Context API skill without research might document:

- React 16-18 patterns (Consumer components, class-based context)
- Miss React 19's `use()` hook for Suspense integration
- Miss performance improvements in React 19's compiler
- Use outdated decision thresholds (">1000 components" vs ">10 updates/second")

### Codebase Knowledge Gap

You don't know:

- Which patterns exist in THIS codebase
- How THIS team structures Context providers
- What naming conventions THIS project uses
- Which legacy patterns need migration guidance

**Research finds**: "Oh, this codebase has 15 Context providers all using different patterns. I should document the CURRENT standard and add migration guidance for legacy ones."

### Context7 Advantages

Context7 provides:

- **Latest official docs** - Pulled directly from library maintainers
- **Version-specific examples** - Shows React 19 patterns, not React 16
- **API changes** - "useContext now supports Suspense boundaries"
- **Deprecations** - "Consumer components deprecated in favor of hooks"

Without Context7, you're guessing which patterns are current.

## How to Catch Yourself

**Red flags you're about to skip research:**

1. You start writing content immediately after creating structure
2. You think "I'll just copy patterns from similar skills"
3. You feel confident because "I've used this library before"
4. You rationalize "research is for complex skills, this is simple"
5. You skip to Phase 7 (Gateway Update) without loading orchestrating-research

**Self-test**: Ask yourself "When was this library last updated? What changed in the latest version?" If you can't answer confidently, YOU NEED RESEARCH.

## Correct Workflow

1. **Create structure** (Phase 5)
2. **STOP before writing** ⚠️
3. **Load orchestrating-research** - `Read(".claude/skill-library/research/orchestrating-research/SKILL.md")`
4. **Follow research workflow**:
   - Codebase search: Find existing patterns
   - Context7 query: Get latest documentation
   - Web search: Supplemental best practices
5. **Generate content** from research (not from memory)
6. **Then proceed** to Phase 7 (Gateway Update)

## Examples of Research Catching Mistakes

**Without research**: "Context API is for global state"
**With research**: "Context API is for _rarely-changing_ global state. Zustand for frequent updates, TanStack Query for server state."

**Without research**: "Use Consumer component for class components"
**With research**: "Consumer deprecated - all components should use hooks in React 19+."

**Without research**: "Split contexts when you have >1000 components"
**With research**: "Split contexts when updates happen >10 times per second - component count is irrelevant."

## Related

- [Research Workflow](.claude/skill-library/research/orchestrating-research/SKILL.md) - Complete research process
- [Creating Skills](../SKILL.md) - Main creation workflow
- [TDD Methodology](.claude/skills/managing-skills/references/tdd-methodology.md) - Why research is the "failing test"
