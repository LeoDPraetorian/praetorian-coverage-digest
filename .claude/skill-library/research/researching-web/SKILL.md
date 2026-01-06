---
name: researching-web
description: Use when researching general web resources (API docs not in Context7, blog posts, tutorials, GitHub, Stack Overflow, official docs) - fallback skill in research orchestration for non-specialized research needs
allowed-tools: WebSearch, WebFetch, Read, Write, TodoWrite, AskUserQuestion
---

# Researching Web Resources

**General web research methodology for API documentation, blog posts, tutorials, GitHub resources, Stack Overflow, and official documentation.**

## When to Use

Use this skill when:

- API documentation not indexed in Context7
- Blog posts, tutorials, or guides needed
- GitHub repos, issues, discussions, or wikis
- Stack Overflow answers for specific problems
- Official documentation via direct URL
- General technical research
- Comparing multiple approaches/libraries

**DO NOT use when:**

- npm/library docs available → use `researching-context7`
- Academic papers needed → use `researching-arxiv`
- Codebase pattern discovery → use `researching-codebase`
- Protocol fingerprinting → use `researching-protocols`

**You MUST use TodoWrite** before starting to track all workflow steps (query formulation, search execution, content fetching, validation, synthesis).

## Quick Reference

| Phase             | Purpose                        | Tools            |
| ----------------- | ------------------------------ | ---------------- |
| 1. Query          | Formulate search queries       | TodoWrite        |
| 2. Prioritization | Identify authoritative sources | -                |
| 3. Search         | Execute searches               | WebSearch        |
| 4. Fetch          | Get full content               | WebFetch         |
| 5. Validation     | Verify source quality          | -                |
| 6. Synthesis      | Summarize with citations       | Write, TodoWrite |

---

## Workflow Phases

### Phase 1: Query Formulation

1. Identify the research topic from user context
2. Determine search intent:
   - How-to / Tutorial
   - Comparison / Best practices
   - Reference / API documentation
   - Troubleshooting / Error resolution
3. Formulate 2-3 search queries (broad → specific)
4. Identify authoritative domains to prioritize

**See:** [references/query-templates.md](references/query-templates.md) for complete query patterns by intent type.

### Phase 2: Source Prioritization

Prioritize sources by authority:

| Priority | Source Type     | Domain Examples                        | Trust Level |
| -------- | --------------- | -------------------------------------- | ----------- |
| 1        | Official Docs   | docs.\*, developer.\*                  | Highest     |
| 2        | GitHub Official | github.com/{org}/{official-repo}       | High        |
| 3        | Reputable Blogs | engineering blogs from known companies | Medium-High |
| 4        | Stack Overflow  | stackoverflow.com (high-vote answers)  | Medium      |
| 5        | Community Blogs | dev.to, medium.com (verified authors)  | Medium      |
| 6        | General Results | Other sources                          | Verify      |

**See:** [references/source-validation.md](references/source-validation.md) for quality indicators and validation checklist.

### Phase 3: Search Execution

Execute searches using WebSearch tool. Use query templates from Phase 1.

**Examples:**

```
WebSearch('library-name official documentation')
WebSearch('library-name tutorial 2025')
WebSearch('site:github.com library-name example')
WebSearch('site:stackoverflow.com library-name specific-error')
```

**See:** [references/query-templates.md](references/query-templates.md) for complete templates by category.

### Phase 4: Content Fetching

For promising results, fetch full content:

```
WebFetch(url: 'https://example.com/guide', prompt: 'Extract key information about {topic}: installation steps, configuration options, common patterns, and best practices')
```

**Fetch Strategy:**

- Start with highest-priority sources (official docs, GitHub)
- Fetch 3-5 sources per query
- Use specific prompts to extract relevant information

### Phase 5: Source Validation

For each source, validate:

- **Publication date** - prefer recent for evolving tech (within 1-2 years)
- **Author credibility** - official/verified vs anonymous
- **Version relevance** - matches target version?
- **Consistency** - do multiple sources agree?

**See:** [references/source-validation.md](references/source-validation.md) for detailed validation criteria.

### Phase 6: Synthesis

Synthesize findings with:

1. **Source citations** - every finding must have a URL
2. **Date tracking** - tech evolves; dates matter
3. **Conflict resolution** - note disagreements between sources
4. **Version caveats** - highlight version-specific information
5. **Actionable recommendations** - what should the user do?

**Output Format:** See [references/output-format.md](references/output-format.md)

**Output location depends on invocation mode:**

**Mode 1: Standalone (invoked directly)**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
TOPIC="{semantic-topic-name}"
mkdir -p "$ROOT/.claude/.output/research/${TIMESTAMP}-${TOPIC}-web"
# Write synthesis to: $ROOT/.claude/.output/research/${TIMESTAMP}-${TOPIC}-web/SYNTHESIS.md
```

**Mode 2: Orchestrated (invoked by orchestrating-research)**

When parent skill provides `OUTPUT_DIR`:

- Write synthesis to: `${OUTPUT_DIR}/web.md`
- Do NOT create directory (parent already created it)

**Detection logic:** If parent skill passed an output directory path, use Mode 2. Otherwise use Mode 1.

---

## Key Principles

1. **Always cite sources** - Every finding must have a URL
2. **Date everything** - Tech evolves; dates matter
3. **Verify across sources** - Single source = unverified
4. **Prioritize official** - Official docs > community content
5. **Note uncertainty** - 'appears to' vs 'definitely'

## Common Scenarios

### Outdated Information

- Note the date prominently
- Search for newer alternatives
- Check official changelog for breaking changes

### Conflicting Sources

- Prefer official docs over community
- Prefer recent over old
- Check GitHub issues for ground truth
- Note the conflict in output

### No Results Found

- Broaden search terms
- Try alternative terminology
- Check if topic is too new/niche
- Fall back to related topics

### Paywalled Content

- Note the paywall
- Search for alternative free sources
- Check if cached version exists
- Do not attempt to bypass

**See:** [references/scenario-handling.md](references/scenario-handling.md) for complete scenario patterns.

---

## Difference from Sibling Skills

| researching-web       | researching-context7        | researching-arxiv            |
| --------------------- | --------------------------- | ---------------------------- |
| General web           | npm/library docs only       | Academic papers only         |
| Multiple source types | Single authoritative source | Peer-reviewed sources        |
| Requires validation   | Pre-validated by Context7   | Pre-validated by peer review |
| Fallback option       | First choice for libs       | First choice for research    |

## Related Skills

| Skill                      | Access Method                                                                                    | Purpose                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| **orchestrating-research** | `skill: "orchestrating-research"` (CORE)                                                         | Research orchestrator (router)           |
| **researching-context7**   | `Read(".claude/skill-library/research/researching-context7/SKILL.md")` (LIBRARY)                 | npm/library documentation via Context7   |
| **researching-arxiv**      | `Read(".claude/skill-library/research/researching-arxiv/SKILL.md")` (LIBRARY)                    | Academic paper research                  |
| **researching-codebase**   | `Read(".claude/skill-library/research/researching-codebase/SKILL.md")` (LIBRARY)                 | Codebase pattern discovery               |
| **researching-protocols**  | `Read(".claude/skill-library/claude/skill-management/researching-protocols/SKILL.md")` (LIBRARY) | Protocol fingerprinting for fingerprintx |
