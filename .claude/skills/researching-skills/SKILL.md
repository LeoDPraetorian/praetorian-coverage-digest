---
name: researching-skills
description: Use when creating any skill - guides research through codebase, Context7, and web sources
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, WebFetch, WebSearch, AskUserQuestion
---

# Researching Skills

**Interactive research workflow for creating comprehensive skills.**

## When to Use

Use this skill when:
- Creating ANY new skill (process, library, integration, tool-wrapper)
- You need to research existing patterns before writing a skill
- You want to use Context7 for library documentation
- You want to find similar skills as structural templates

**You MUST use TodoWrite** to track progress through all phases.

## Quick Reference

| Phase | Purpose | Tools Used |
|-------|---------|------------|
| 1. Requirements | Gather skill details | AskUserQuestion |
| 2. Codebase Research | Find similar skills/patterns | Grep, Glob, Read |
| 3. Context7 Research | Library documentation | MCP tools |
| 4. Web Research | Supplemental sources | WebSearch, WebFetch |
| 5. Generation | Create skill structure | Write |

## Phase 1: Requirements Gathering

Ask the user these questions (one at a time via AskUserQuestion):

### Question 1: Skill Type
```
What type of skill is this?
- Process: Methodology or workflow (TDD, debugging, brainstorming)
- Library: npm package or framework (TanStack Query, Zustand)
- Integration: Connecting services (GitHub + Linear)
- Tool Wrapper: CLI or MCP tool wrapper
```

### Question 2: Location
```
Where should this skill live?
- Core: High-frequency, always loaded (.claude/skills/)
- Library: Specialized, on-demand (.claude/skill-library/)
```

### Question 3: Category (if Library)
If library location selected, discover available categories:
```bash
ls -d .claude/skill-library/*/ .claude/skill-library/*/*/ 2>/dev/null | sed 's|.claude/skill-library/||' | sort -u
```

Then ask which category.

### Question 4: Scope
```
What specific workflows or patterns should this skill cover?
(Open-ended, let user describe)
```

### Question 5: Library Name (if Library/Integration type)
```
What is the main library or package name?
(e.g., "@tanstack/react-query", "zustand", "zod")
```

## Phase 2: Codebase Research

### 2.1 Find Similar Skills

Search for skills with similar keywords:

```bash
# Search skill descriptions
grep -r "description:.*[keyword]" .claude/skills/ .claude/skill-library/ --include="SKILL.md"
```

Read the top 2-3 most similar skills to use as structural templates.

### 2.2 Find Codebase Usage

Search for how the library/pattern is used in the codebase:

```bash
# Search modules for imports/usage
grep -r "[library-name]" modules/ --include="*.ts" --include="*.tsx" -l | head -10
```

Read 3-5 files to understand real usage patterns.

### 2.3 Check Conventions

Read project conventions:
- `CLAUDE.md` - Project-wide conventions
- `docs/DESIGN-PATTERNS.md` - Architecture patterns
- `docs/TECH-STACK.md` - Technology decisions

## Phase 3: Context7 Research (Library/Integration types only)

**This phase is INTERACTIVE - ask the user at each step.**

> **Tool Reference:** Read `.claude/skill-library/claude/mcp-tools/mcp-tools-context7/SKILL.md` for detailed type definitions, parameters, and return values.

### 3.1 Ask: Use Context7?

Ask via AskUserQuestion:
```
Would you like to search Context7 for official documentation?

Options:
- Yes, search Context7
- No, skip to web research
- No, skip all research (use template only)
```

**If user skips, go to Phase 4 or Phase 5.**

### 3.2 Ask: Search Query

Ask via AskUserQuestion:
```
What should I search for in Context7?

Default: {library-name from Phase 1}
Examples: "jira", "@atlassian/jira", "jira-cloud-api"

(You can refine this if the default doesn't find good results)
```

### 3.3 Execute Search & Show Results

Execute the search:
```bash
npx tsx -e "(async () => {
  const { resolveLibraryId } = await import('./.claude/tools/context7/resolve-library-id.ts');
  const result = await resolveLibraryId.execute({ libraryName: '{USER_QUERY}' });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Show the results to the user** with quality indicators:
- ✅ **Recommended**: Main package, stable version, not deprecated
- ⚠️ **Caution**: Internal packages (`-core`), pre-release (alpha/beta/rc)
- ❌ **Deprecated**: Contains "deprecated" in name/description

### 3.4 Ask: Select Package or Retry

Ask via AskUserQuestion:
```
Here are the Context7 results for "{query}":

1. {package-name-1} - {description}
2. {package-name-2} - {description}
3. {package-name-3} - {description}

Options:
- Select package 1
- Select package 2
- Select package 3
- Search again with different query
- Skip Context7 research
```

**If "Search again"**: Go back to 3.2 with new query
**If "Skip"**: Go to Phase 4

### 3.5 Fetch Documentation

For the selected package:
```bash
npx tsx -e "(async () => {
  const { getLibraryDocs } = await import('./.claude/tools/context7/get-library-docs.ts');
  const result = await getLibraryDocs.execute({ context7CompatibleLibraryID: '{SELECTED_LIBRARY_ID}' });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### 3.6 Ask: Documentation Quality Check

Show a summary of what was found and ask:
```
Found documentation for {package-name}:
- {X} API functions documented
- {Y} code examples
- Topics: {list of main sections}

Options:
- Looks good, continue
- Try a different package
- Skip Context7 and use web research instead
```

### 3.7 Extract Key Information

From the documentation, extract:
- Core API functions and their signatures
- Common usage patterns with code examples
- Configuration options
- Best practices and anti-patterns
- Migration guides (if relevant)

**Save extracted info for Phase 5 generation.**

## Phase 4: Web Research (Optional)

**This phase is INTERACTIVE - ask the user at each step.**

### 4.1 Ask: Use Web Research?

Ask via AskUserQuestion:
```
Would you like to search the web for additional documentation?

This can find:
- Official documentation sites
- GitHub repositories with examples
- Blog posts from library maintainers
- Best practices guides

Options:
- Yes, search the web
- No, skip to skill generation
```

**If user skips, go to Phase 5.**

### 4.2 Ask: Search Query

Ask via AskUserQuestion:
```
What should I search for?

Suggested queries:
- "{library-name} documentation"
- "{library-name} best practices 2025"
- "{library-name} API reference"
- "{library-name} examples github"

Enter your search query or select a suggestion:
```

### 4.3 Execute Search & Show Results

Execute WebSearch and show results with quality indicators:

| Source Type | Quality | Examples |
|-------------|---------|----------|
| Official docs | ✅ High | tanstack.com, react.dev |
| GitHub repos | ✅ High | Source code, examples |
| Maintainer blogs | ✅ High | tkdodo.eu (TanStack Query) |
| Expert blogs | ⭐ Medium | kentcdodds.com, joshwcomeau.com |
| Tutorials | ⚠️ Lower | General articles |

### 4.4 Ask: Select Sources

Ask via AskUserQuestion:
```
Here are the search results:

1. ✅ {title} - {url} (Official docs)
2. ✅ {title} - {url} (GitHub)
3. ⭐ {title} - {url} (Expert blog)
4. ⚠️ {title} - {url} (Tutorial)

Which sources should I fetch? (Select multiple)
- Source 1
- Source 2
- Source 3
- Source 4
- Search again with different query
- Skip web research
```

### 4.5 Fetch Selected Sources

Use WebFetch for each selected source and summarize key findings.

### 4.6 Ask: Sufficient Information?

Ask via AskUserQuestion:
```
I found the following information:
- {summary of source 1}
- {summary of source 2}
- {summary of source 3}

Options:
- Looks good, continue to generation
- Search for more sources
- Skip remaining research
```

## Phase 5: Skill Generation

### 5.1 Directory Structure

Create the skill with this structure:

```
skill-name/
├── SKILL.md                 # 300-600 lines (main entry point)
├── references/              # Detailed documentation
│   ├── api-reference.md     # Full API docs
│   ├── patterns.md          # Common patterns
│   └── troubleshooting.md   # Common issues
├── templates/               # Code templates (if applicable)
│   └── typescript/
│       ├── README.md        # Template index
│       └── 01-basic.ts      # Example templates
└── .local/
    └── metadata.json        # Generation metadata
```

### 5.2 SKILL.md Structure

Follow this structure for SKILL.md:

```markdown
---
name: skill-name
description: Use when [trigger] - [key capabilities]
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Skill Title

**Brief description of what this skill provides.**

## When to Use

- Bullet points of when to use this skill
- Specific triggers and scenarios

## Quick Reference

| Pattern/API | Description | Example |
|-------------|-------------|---------|
| key_function | What it does | `code()` |

## Core Concepts

### Concept 1
Explanation with code example.

### Concept 2
Explanation with code example.

## Common Patterns

### Pattern 1: Name
```typescript
// Code example
```

### Pattern 2: Name
```typescript
// Code example
```

## Anti-Patterns

### ❌ Don't Do This
Why it's wrong and what to do instead.

## References

- [API Reference](references/api-reference.md)
- [Patterns](references/patterns.md)
- [Troubleshooting](references/troubleshooting.md)

## Related Skills

- `related-skill-name` - Why it's related
```

### 5.3 Content Guidelines

**Line Count Targets:**
| Skill Type | Target | Maximum |
|------------|--------|---------|
| Library | 400-600 | 800 |
| Process | 200-400 | 600 |
| Integration | 300-500 | 700 |

**Quality Requirements:**
- [ ] Description starts with "Use when"
- [ ] Quick reference table present
- [ ] 3-5 core concepts with code
- [ ] Real code examples from codebase research
- [ ] Links to references/
- [ ] No TODO placeholders

### 5.4 Reference Files

Create reference files for detailed content:

**api-reference.md**: Full API documentation
- Function signatures
- Parameter descriptions
- Return types
- Usage examples

**patterns.md**: Common usage patterns
- Real-world examples
- Integration with other libraries
- Performance considerations

**troubleshooting.md**: Common issues
- Error messages and solutions
- Edge cases
- Migration issues

### 5.5 Template Files (if applicable)

For library skills, create code templates:

```typescript
// templates/typescript/01-basic-usage.ts
// Source: [Section from Context7 docs]
// Context: Basic setup and usage

import { useQuery } from '@tanstack/react-query';

export function BasicExample() {
  const { data, isLoading } = useQuery({
    queryKey: ['example'],
    queryFn: fetchExample,
  });
  // ...
}
```

## Success Criteria

Before completing, verify:

- [ ] SKILL.md is 300-600 lines (not stubs)
- [ ] At least 2 reference documents in references/
- [ ] At least 3 code templates (for library skills)
- [ ] All code examples are real (from research, not made up)
- [ ] Description starts with "Use when"
- [ ] No TODO placeholders in content
- [ ] Similar skill structure matches gold-standard examples

## Gold Standard Examples

Reference these skills for quality benchmarks:

**Library Skills:**
- `.claude/skill-library/development/frontend/state/frontend-tanstack/` - TanStack Query patterns
- `.claude/skill-library/development/frontend/state/frontend-zustand/` - Zustand state management

**Process Skills:**
- `.claude/skills/developing-with-tdd/` - TDD methodology
- `.claude/skills/debugging-systematically/` - Debugging process

## References

- [Skill Structure Specification](references/skill-structure.md)
- [Context7 Integration](references/context7-integration.md)
- [Source Quality Criteria](references/source-quality.md)

## Related Skills

- `creating-skills` - Skill creation workflow (uses this skill for research)
- `skill-manager` - Lifecycle management (audit, fix, rename)
- `mcp-tools-context7` - Context7 tool definitions (types, parameters, examples)
- `gateway-mcp-tools` - MCP tool access routing
