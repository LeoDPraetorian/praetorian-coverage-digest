---
name: researching-context7
description: Use when researching official library documentation from Context7 MCP service for npm packages (TanStack Query, Zustand, Zod, React Hook Form) - guides through resolve-library-id search, package confirmation, get-library-docs fetch, and API extraction/synthesis. Handles "Cannot find module" errors, empty library results, timeouts, and deprecated packages with quality indicators (✅ Recommended, ⚠️ Caution, ❌ Deprecated)
allowed-tools: Bash, Read, Write, TodoWrite, AskUserQuestion
---

# Researching Context7

**Research workflow for fetching official library documentation from Context7 MCP service.**

## When to Use

Use this skill when:

- Creating library/framework skills (TanStack Query, Zustand, Zod, React Hook Form, etc.)
- Validating API patterns against official documentation
- Checking for version-specific changes in npm packages
- Populating skill references with accurate, authoritative documentation
- Answering "how do I use X library" questions with official sources

**Do NOT use for:**

- General web research (use WebSearch or WebFetch instead)
- Codebase analysis (use Grep/Glob + Read instead)
- Non-npm libraries (protocols, APIs, cloud services)

**You MUST use TodoWrite before starting** to track all workflow steps.

## Quick Reference

| Phase                     | Purpose                         | Tools   | Time    |
| ------------------------- | ------------------------------- | ------- | ------- |
| 1. Library Identification | Determine package name          | Read    | 1 min   |
| 2. Library Search         | Find package via resolve-lib-id | Bash    | 2 min   |
| 3. User Confirmation      | Confirm which package to fetch  | AskUser | 1 min   |
| 4. Documentation Fetch    | Get docs via get-library-docs   | Bash    | 2-5 min |
| 5. Documentation Analysis | Parse markdown, extract APIs    | Read    | 3 min   |
| 6. Synthesis              | Summarize findings for task     | Write   | 2 min   |

**Total time**: 10-15 minutes

---

## Understanding Context7

**What is Context7?**

Context7 is an MCP (Model Context Protocol) service that provides indexed, official documentation for npm packages and frameworks. It ensures skill content is accurate, up-to-date, and authoritative rather than hallucinated or based on stale training data.

**Why use Context7 instead of web search?**

- **Authoritative**: Official docs from package maintainers
- **Indexed**: Optimized for AI consumption with token estimates
- **Versioned**: Specific to package versions
- **Structured**: Consistent markdown format across all libraries

**When Context7 is NOT available:**

If a library isn't indexed or Context7 times out, fall back to:

1. WebSearch for official documentation URLs
2. WebFetch to retrieve and parse documentation
3. Repository README files (via GitHub)

---

## Context7 MCP Tools

**Tool 1: resolve-library-id**

Search for libraries by name/topic:

```bash
npx tsx -e "(async () => {
  const { resolveLibraryId } = await import('./.claude/tools/context7/resolve-library-id.ts');
  const result = await resolveLibraryId.execute({ libraryName: 'LIBRARY_NAME' });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Tool 2: get-library-docs**

Fetch documentation for a library ID:

```bash
npx tsx -e "(async () => {
  const { getLibraryDocs } = await import('./.claude/tools/context7/get-library-docs.ts');
  const result = await getLibraryDocs.execute({
    context7CompatibleLibraryID: 'LIBRARY_ID',
    topic: 'OPTIONAL_TOPIC'
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**For complete tool schemas and import patterns**, see [references/context7-tools.md](references/context7-tools.md)

---

## Workflow Phases

### Phase 1: Library Identification

**Goal**: Determine the correct npm package name from user context.

1. **Extract library name** from user's request or skill being created
2. **Identify package name**:
   - Scoped packages: `@tanstack/react-query`, `@radix-ui/react-dialog`
   - Unscoped packages: `zustand`, `zod`, `axios`
3. **Note specific topics** if user mentioned particular APIs (e.g., "mutations in TanStack Query")

**Example**:

- User says: "Create a skill for React Query"
- Package name: `@tanstack/react-query`
- Topic: None specified (fetch all docs)

**Output**: Package name ready for search

---

### Phase 2: Library Search

**Goal**: Find the library in Context7 index and identify the correct package.

Execute `resolve-library-id`:

```bash
npx tsx -e "(async () => {
  const { resolveLibraryId } = await import('./.claude/tools/context7/resolve-library-id.ts');
  const result = await resolveLibraryId.execute({ libraryName: '@tanstack/react-query' });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Parse results** and apply quality indicators:

| Indicator      | Criteria                                       | Action            |
| -------------- | ---------------------------------------------- | ----------------- |
| ✅ Recommended | Main package, stable version, not deprecated   | Select by default |
| ⚠️ Caution     | -core/-internal package, alpha/beta/rc version | Ask user          |
| ❌ Deprecated  | 'deprecated' in name or description            | Skip              |

**Example result**:

```json
{
  "libraries": [
    {
      "id": "/npm/@tanstack/react-query",
      "name": "@tanstack/react-query",
      "version": "5.28.0",
      "description": "Powerful asynchronous state management for TS/JS, React, Vue, and more"
    },
    {
      "id": "/npm/@tanstack/react-query-devtools",
      "name": "@tanstack/react-query-devtools",
      "version": "5.28.0",
      "description": "Developer tools for React Query"
    }
  ]
}
```

**Select**: `/npm/@tanstack/react-query` (✅ Recommended - main package)

**For complete quality indicator rules**, see [references/quality-indicators.md](references/quality-indicators.md)

---

### Phase 3: User Confirmation (Conditional)

**When to skip**: Only one ✅ Recommended result found.

**When to ask**: Multiple packages or ⚠️ Caution packages found.

Use AskUserQuestion:

```
I found multiple packages for your search:

1. @tanstack/react-query (v5.28.0) - Main package ✅ Recommended
2. @tanstack/react-query-devtools (v5.28.0) - Developer tools ⚠️ Caution
3. @tanstack/react-query-core (v5.28.0) - Internal core package ⚠️ Caution

Which package should I fetch documentation for?

Options:
- Option 1: Main package (Recommended)
- Option 2: Developer tools
- Option 3: Internal core package
```

**Default**: Always recommend the ✅ Recommended package (main package, stable version).

---

### Phase 4: Documentation Fetch

**Goal**: Retrieve official documentation from Context7.

Execute `get-library-docs`:

```bash
npx tsx -e "(async () => {
  const { getLibraryDocs } = await import('./.claude/tools/context7/get-library-docs.ts');
  const result = await getLibraryDocs.execute({
    context7CompatibleLibraryID: '/npm/@tanstack/react-query',
    topic: ''
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Optional: Add topic parameter** to focus on specific area:

- `topic: 'mutations'` - Fetch only mutation-related docs
- `topic: 'queries'` - Fetch only query-related docs
- `topic: ''` - Fetch all documentation (default)

**Extract from result**:

- `libraryName`: Package name
- `version`: Semantic version
- `content`: Markdown documentation
- `estimatedTokens`: Size estimate for content

**If fetch fails**: See [references/troubleshooting.md](references/troubleshooting.md)

---

### Phase 5: Documentation Analysis

**Goal**: Parse markdown content and extract relevant information.

**Analyze structure**:

1. **Quick Reference**: High-level API overview
2. **API Documentation**: Detailed function/hook signatures
3. **Code Examples**: Usage patterns and best practices
4. **Migration Guides**: Version-specific changes
5. **Common Patterns**: Recommended approaches

**Extract**:

- Function/hook signatures with TypeScript types
- Required vs optional parameters
- Return types and interfaces
- Error handling patterns
- Performance considerations

**For complete analysis patterns**, see [references/documentation-analysis.md](references/documentation-analysis.md)

---

### Phase 6: Synthesis

**Goal**: Summarize findings in structured format for the task at hand.

**Output format**:

```markdown
## Context7 Research: {library-name}

### Library Info

- Package: {package-name}
- Version: {version}
- Context7 ID: {library-id}
- Estimated Tokens: {tokens}

### Key APIs Discovered

| API           | Purpose              | Example                         |
| ------------- | -------------------- | ------------------------------- |
| useQuery()    | Fetch and cache data | useQuery({ queryKey, queryFn }) |
| useMutation() | Modify server data   | useMutation({ mutationFn })     |
| QueryClient   | Manage query cache   | new QueryClient()               |

### Relevant Patterns

**Query Keys**: Array-based hierarchy for cache organization
\`\`\`typescript
const queryKey = ['todos', { status: 'active' }]
\`\`\`

**Stale Time**: Control cache freshness
\`\`\`typescript
staleTime: 5 _ 60 _ 1000 // 5 minutes
\`\`\`

### Recommendations for Skill

- Include Quick Reference with most common hooks (useQuery, useMutation, useQueryClient)
- Explain query key patterns (affects cache invalidation)
- Document error handling with onError callbacks
- Show loading/error/success states pattern
- Mention React Suspense integration (experimental)

### Anti-Patterns Discovered

- ❌ Don't use query keys without arrays: `queryKey: 'todos'`
- ❌ Don't mutate queryFn return values
- ❌ Don't call hooks conditionally (violates Rules of Hooks)
```

**Output location depends on invocation mode:**

**Mode 1: Standalone (invoked directly)**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
LIBRARY="{library-name-slug}"
mkdir -p "$ROOT/.claude/.output/research/${TIMESTAMP}-${LIBRARY}-context7"
# Write synthesis to: $ROOT/.claude/.output/research/${TIMESTAMP}-${LIBRARY}-context7/SYNTHESIS.md
```

**Mode 2: Orchestrated (invoked by orchestrating-research)**

When parent skill provides `OUTPUT_DIR`:

- Write synthesis to: `${OUTPUT_DIR}/context7.md`
- Do NOT create directory (parent already created it)

**Detection logic:** If parent skill passed an output directory path, use Mode 2. Otherwise use Mode 1.

---

## Difference from mcp-tools-context7

| This Skill (researching-context7)                    | mcp-tools-context7                           |
| ---------------------------------------------------- | -------------------------------------------- |
| Research WORKFLOW with phases                        | Tool CATALOG with schemas                    |
| Guides through search → confirm → fetch → synthesize | Lists available tools and their parameters   |
| Produces structured research output                  | Provides import paths and execution patterns |
| Used by: researchers, skill creators                 | Used by: agents needing raw tool access      |

**When to use each**:

- Use **researching-context7** (this skill) when creating skills or answering "how to use X library" questions
- Use **mcp-tools-context7** when you need raw MCP tool access for custom workflows

---

## Example Searches

| Library Type     | Search Query           | Expected Package            |
| ---------------- | ---------------------- | --------------------------- |
| React Query      | @tanstack/react-query  | /npm/@tanstack/react-query  |
| State Management | zustand                | /npm/zustand                |
| Validation       | zod                    | /npm/zod                    |
| Forms            | react-hook-form        | /npm/react-hook-form        |
| Router           | @tanstack/react-router | /npm/@tanstack/react-router |
| UI Components    | @radix-ui/react-dialog | /npm/@radix-ui/react-dialog |
| HTTP Client      | axios                  | /npm/axios                  |

---

## Common Rationalizations (DO NOT SKIP RESEARCH)

| Rationalization                           | Why It's Wrong                                                  |
| ----------------------------------------- | --------------------------------------------------------------- |
| "I already know this library"             | Training data is 12-18 months stale, APIs change                |
| "This is a simple library"                | Even basic libraries evolve (React 16→19 changed hooks)         |
| "No time for Context7 lookup"             | 15 min research prevents hours of fixes for outdated patterns   |
| "Documentation won't help"                | Official docs show current best practices, you know old ones    |
| "Context7 is optional for library skills" | WRONG - these change most frequently, need authoritative source |

**Cannot skip Context7 research for library/framework skills.** ✅

---

## Related Skills

| Skill                    | Purpose                                       |
| ------------------------ | --------------------------------------------- |
| `orchestrating-research` | Orchestrates all research types (CORE skill)  |
| `researching-protocols`  | Research network protocols and specifications |
| `researching-arxiv`      | Research academic papers and ML techniques    |
| `mcp-tools-context7`     | Raw MCP tool catalog for Context7 service     |
| `creating-skills`        | Skill creation workflow (uses this skill)     |
| `updating-skills`        | Skill update workflow (uses this skill)       |

---

## Key Principles

1. **Authoritative Sources**: Context7 provides official, indexed library docs
2. **Version Awareness**: Always note package version in synthesis
3. **Quality Indicators**: Prefer main packages over -core/-internal variants
4. **User Confirmation**: Ask when multiple valid packages found
5. **Fallback Strategy**: Use web research if Context7 unavailable
6. **Structured Output**: Consistent synthesis format for skill creation
