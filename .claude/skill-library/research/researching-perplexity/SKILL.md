---
name: researching-perplexity
description: Use when researching with AI-powered search - Perplexity MCP for fast synthesis with citations, alternative to traditional WebSearch+WebFetch. Requires API key setup.
allowed-tools: Bash, Read, Write, TodoWrite
---

# Researching with Perplexity AI

**AI-powered web research using Perplexity MCP wrappers for faster synthesis with built-in citations.**

## When to Use

Use this skill when:

- AI-powered search with built-in citations needed
- Quick synthesis more important than exhaustive search
- Deep research with academic-style references required
- Complex multi-source research benefits from AI aggregation
- Logical reasoning or analysis needed alongside research

**DO NOT use when:**

- API key not configured → use `researching-web`
- npm/library docs available → use `researching-context7`
- Academic papers needed → use `researching-arxiv`
- Codebase pattern discovery → use `researching-codebase`
- GitHub-specific resources → use `researching-github`

**You MUST use TodoWrite** before starting to track all workflow steps (API validation, query formulation, tool selection, execution, formatting).

## Quick Reference

| Phase             | Purpose                        | Tools       |
| ----------------- | ------------------------------ | ----------- |
| 1. API Validation | Check Perplexity API key setup | Read, Bash  |
| 2. Query          | Formulate query from topic     | -           |
| 3. Tool Selection | Map intent to Perplexity tool  | -           |
| 4. Execution      | Run CLI, capture output        | Bash        |
| 5. Formatting     | Structure for synthesis        | Write, Bash |

---

## Workflow Phases

### Phase 1: API Key Validation

**MANDATORY**: Verify API key before attempting research.

#### Check Credentials

```bash
cat .claude/tools/config/credentials.json | grep -A 2 "perplexity"
```

**Expected output:**

```json
"perplexity": {
  "apiKey": "pplx-..."
}
```

**Validation logic:**

1. If `apiKey` missing → **FAIL** with setup instructions
2. If `apiKey` is placeholder `${PERPLEXITY_API_KEY}` → **FAIL** with env var instructions
3. If `apiKey` starts with `pplx-` → **PASS**, proceed

**Failure message (copy verbatim):**

```
❌ Perplexity API key not configured

SETUP REQUIRED:

1. Get API key: https://www.perplexity.ai/account/api/group
2. Add to .claude/tools/config/credentials.json:
   {
     "perplexity": {
       "apiKey": "pplx-your-key-here"
     }
   }
3. See .claude/tools/perplexity/README.md for details

Cannot proceed without API key.
```

### Phase 2: Query Formulation

Extract research topic from user's request and formulate query.

**Query patterns:**

| User Intent       | Query Format                    | Example                                       |
| ----------------- | ------------------------------- | --------------------------------------------- |
| How-to / Tutorial | `how to {action} with {tool}`   | "how to implement auth with NextAuth"         |
| Comparison        | `{option-a} vs {option-b}`      | "REST vs GraphQL 2025"                        |
| Best practices    | `{topic} best practices {year}` | "React state management best practices 2025"  |
| Troubleshooting   | `{error} solution`              | "CORS preflight error Express solution"       |
| Deep research     | `research {topic}`              | "research large language model architectures" |
| Logical analysis  | `analyze {problem}`             | "analyze tradeoffs between Zustand and Redux" |

**See:** [references/query-templates.md](references/query-templates.md) for complete patterns.

### Phase 3: Tool Selection

Map research intent to Perplexity command:

| Intent                | Command    | Model               | When to Use                           |
| --------------------- | ---------- | ------------------- | ------------------------------------- |
| **Deep research**     | `research` | sonar-deep-research | Comprehensive with citations          |
| **Quick search**      | `search`   | sonar               | Fast factual lookup                   |
| **Conversational**    | `ask`      | sonar-pro           | Follow-up questions, explanations     |
| **Logical reasoning** | `reason`   | sonar-reasoning-pro | Analysis, logic problems, comparisons |

**See:** [references/tool-selection.md](references/tool-selection.md) for decision matrix.

**Default recommendation**: Use `research` for most cases (citations + depth).

### Phase 4: Execution

Execute via Perplexity CLI with directory-independent path:

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
$ROOT/.claude/bin/perplexity.ts {command} "{query}"
```

**Commands:**

```bash
# Deep research with citations (most common)
$ROOT/.claude/bin/perplexity.ts research "your topic here"

# Quick search
$ROOT/.claude/bin/perplexity.ts search "your query here"

# Ask follow-up question
$ROOT/.claude/bin/perplexity.ts ask "your question here"

# Reasoning and analysis
$ROOT/.claude/bin/perplexity.ts reason "your problem here"
```

**Capture output**: Store in variable for formatting.

**Timeouts:**

- `search`, `ask`: 30 seconds
- `research`, `reason`: 60 seconds (complex queries take time)

### Phase 5: Output Formatting

Structure output to match `researching-skills` synthesis requirements.

**See:** [references/output-format.md](references/output-format.md) for complete template.

**Required sections:**

1. **Tool Used** - Which Perplexity command (search/ask/research/reason)
2. **Query** - Exact query sent to Perplexity
3. **Key Findings** - Structured summary with numbered citations [1], [2], [3]
4. **Sources** - Extracted URLs from Perplexity response
5. **AI Synthesis Note** - Clarify content is AI-aggregated (not raw search results)
6. **Date** - Research timestamp for staleness tracking

**Output format:**

```markdown
## Perplexity Research: {topic}

**Tool**: {search|ask|research|reason}
**Query**: "{query string}"
**Date**: {YYYY-MM-DD}

### Key Findings

1. **{Finding 1 Title}**
   - {Details with specifics}
   - {Additional context}

2. **{Finding 2 Title}**
   - {Details with specifics}

3. **{Finding 3 Title}**
   - {Details with specifics}

### Sources

[1] https://example.com/source1
[2] https://example.com/source2
[3] https://example.com/source3

### Research Notes

- **Method**: AI-powered synthesis via Perplexity {command}
- **Content**: Aggregated from multiple sources and synthesized by AI
- **Verification**: Cross-check critical facts with primary sources
- **Staleness**: Research as of {date} - may become outdated
```

**Save to file** (for researching-skills router):

When called from `researching-skills` router, output is saved to `perplexity.md` in the research directory. The router handles file creation in Phase 6.

---

## Key Principles

1. **API Key Required** - Always validate before execution
2. **Smart Tool Selection** - Match intent to command (research > search > ask > reason)
3. **Citation Tracking** - Extract URLs from Perplexity response
4. **AI Synthesis Note** - Always clarify content is AI-aggregated
5. **Date Everything** - Research timestamps enable staleness tracking
6. **Structured Output** - Compatible with researching-skills synthesis

## Common Scenarios

### API Key Not Configured

Show setup instructions (see Phase 1 failure message) and suggest fallback:

```
Consider using 'researching-web' skill as alternative (no API key required).
```

### Perplexity Returns Error

Common errors:

- **"Authentication failed"** - API key invalid or expired
- **"Rate limit exceeded"** - Too many requests, wait and retry
- **"Request timed out"** - Complex query, try simpler version or split into parts

### Empty or Poor Results

If Perplexity returns sparse results:

1. Reformulate query (try different keywords)
2. Switch to different command (e.g., `search` instead of `research`)
3. Fall back to `researching-web` for traditional search

### Combining with Traditional Web Research

User may select both "Perplexity" and "Web" from researching-skills router:

- Perplexity: Fast AI synthesis with citations
- Web: Exhaustive manual search+fetch with validation

Router synthesizes both outputs. Each provides different perspective.

---

## Comparison to Sibling Skills

| researching-perplexity               | researching-web                |
| ------------------------------------ | ------------------------------ |
| AI-powered synthesis                 | Manual search + fetch          |
| Single tool call                     | Multiple calls (search, fetch) |
| Built-in citations                   | Manual citation tracking       |
| Requires API key                     | No API key needed              |
| Faster for deep dives                | More control over sources      |
| 4 modes (search/ask/research/reason) | 6-phase methodology            |

## Related Skills

| Skill                    | Access Method                                                                            | Purpose                                   |
| ------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------- |
| **researching-skills**   | `skill: "researching-skills"` (CORE)                                                     | Router orchestrating all research methods |
| **researching-web**      | `Read(".claude/skill-library/research/researching-web/SKILL.md")` (LIBRARY)              | Traditional WebSearch + WebFetch          |
| **researching-context7** | `Read(".claude/skill-library/research/researching-context7/SKILL.md")` (LIBRARY)         | npm/library documentation                 |
| **researching-github**   | `Read(".claude/skill-library/research/researching-github/SKILL.md")` (LIBRARY)           | Open-source repos, issues, discussions    |
| **researching-arxiv**    | `Read(".claude/skill-library/research/researching-arxiv/SKILL.md")` (LIBRARY)            | Academic papers                           |
| **researching-codebase** | `Read(".claude/skill-library/research/researching-codebase/SKILL.md")` (LIBRARY)         | Local pattern discovery                   |
| **mcp-tools-perplexity** | `Read(".claude/skill-library/claude/mcp-tools/mcp-tools-perplexity/SKILL.md")` (LIBRARY) | Perplexity MCP wrapper catalog            |
