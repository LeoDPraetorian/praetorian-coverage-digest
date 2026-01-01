# Output Format

**Structured research output format compatible with researching-skills synthesis.**

## Standard Template

```markdown
## Perplexity Research: {topic}

**Tool**: {search|ask|research|reason}
**Query**: "{exact query string}"
**Date**: {YYYY-MM-DD}

### Key Findings

1. **{Finding 1 Title}**
   - {Detailed explanation with specifics}
   - {Supporting evidence or context}
   - [Citation if applicable]

2. **{Finding 2 Title}**
   - {Detailed explanation with specifics}
   - {Additional context}

3. **{Finding 3 Title}**
   - {Detailed explanation with specifics}

### Sources

[1] https://example.com/source1 - Brief description
[2] https://example.com/source2 - Brief description
[3] https://example.com/source3 - Brief description

### Research Notes

- **Method**: AI-powered synthesis via Perplexity `{command}`
- **Model**: {sonar|sonar-pro|sonar-deep-research|sonar-reasoning-pro}
- **Content**: Aggregated from multiple sources and synthesized by AI
- **Verification**: Cross-check critical facts with primary sources
- **Staleness**: Research as of {YYYY-MM-DD} - may become outdated

### Limitations

- {Any limitations noted during research}
- {Topics that need deeper investigation}
- {Conflicting information found}
```

---

## Real-World Example

```markdown
## Perplexity Research: React 19 Server Components

**Tool**: research
**Query**: "React 19 Server Components architecture and best practices"
**Date**: 2025-12-31

### Key Findings

1. **Server Components Enable Zero-Bundle JavaScript**
   - React 19 stabilized Server Components (experimental in React 18)
   - Components render on server, send HTML to client
   - No JavaScript shipped for Server Components themselves
   - Reduces bundle size by 30-50% in typical applications [1]

2. **Async Components Are Native**
   - Server Components can be async functions
   - Fetch data directly in component body
   - No useEffect or useState needed for server data
   - Eliminates waterfall requests and loading states [2]

3. **Client Components Still Essential**
   - Use 'use client' directive for interactivity
   - Server and Client Components compose seamlessly
   - Server Components can pass data to Client Components as props
   - Cannot pass Client Components to Server Components as children [3]

4. **Performance Benefits**
   - Faster initial page load (HTML instead of JSON)
   - Better SEO (pre-rendered content)
   - Reduced hydration cost (less client JS)
   - Streaming support for progressive rendering [1]

### Sources

[1] https://react.dev/blog/2024/12/05/react-19 - Official React 19 release announcement
[2] https://react.dev/reference/rsc/server-components - Server Components reference
[3] https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns - Next.js composition patterns

### Research Notes

- **Method**: AI-powered synthesis via Perplexity `research`
- **Model**: sonar-deep-research
- **Content**: Aggregated from official React documentation, Next.js docs, and community resources
- **Verification**: All key points verified against official React 19 documentation
- **Staleness**: Research as of 2025-12-31 - React 19 released December 2024

### Limitations

- Focus on React 19 stable features; experimental features not covered
- Examples assume Next.js App Router; other frameworks may differ
- Performance numbers are estimates; actual results vary by application
```

---

## Section Explanations

### Tool and Query

**Purpose**: Transparency about research method and exact query used.

**Include**:

- Which Perplexity command (search/ask/research/reason)
- Exact query string (enables reproduction)
- Date of research (for staleness tracking)

### Key Findings

**Purpose**: Structured summary of research outcomes.

**Format**:

- Numbered list (1, 2, 3...)
- Bold titles for each finding
- Bullet points for details
- Include citations [1], [2], [3] where applicable

**Guidelines**:

- Be specific (numbers, percentages, versions)
- Include context (why it matters)
- Note limitations or caveats
- Cross-reference sources

### Sources

**Purpose**: Provide URLs for verification and deeper reading.

**Format**:

```
[N] https://full-url-here - Brief description
```

**Guidelines**:

- Number sources [1], [2], [3] matching citations in findings
- Include descriptive text (not just bare URLs)
- Prefer official documentation and authoritative sources
- Note if source requires subscription/paywall

### Research Notes

**Purpose**: Provide metadata about research methodology.

**Required fields**:

- **Method**: Which Perplexity command used
- **Model**: Underlying AI model (sonar, sonar-pro, etc.)
- **Content**: Clarify this is AI synthesis
- **Verification**: What level of fact-checking performed
- **Staleness**: Date for future reference

**Why this matters**:

- AI synthesis is different from raw search results
- Users need to know content is aggregated
- Critical facts should be verified against primary sources
- Research becomes stale as tech evolves

### Limitations

**Purpose**: Note gaps, conflicts, or areas needing deeper investigation.

**Include**:

- Topics not fully covered
- Conflicting information found
- Assumptions made
- Recommended follow-up research

---

## Output Mode Examples

### For `research` Command

```markdown
## Perplexity Research: {topic}

**Tool**: research
**Model**: sonar-deep-research

{Standard template with comprehensive findings and citations}

### Additional: Thinking Process (Optional)

- Research strategy: {how Perplexity approached the topic}
- Source selection: {which types of sources prioritized}
- Synthesis approach: {how information was aggregated}
```

### For `search` Command

```markdown
## Perplexity Search: {topic}

**Tool**: search
**Model**: sonar

### Search Results

1. **{Result 1 Title}** - [{Source}]({URL})
   - {Summary of result}

2. **{Result 2 Title}** - [{Source}]({URL})
   - {Summary of result}

{Lighter format - more like search results list}
```

### For `ask` Command

```markdown
## Perplexity Q&A: {question}

**Tool**: ask
**Model**: sonar-pro

### Question

{User's question}

### Answer

{Natural language response from Perplexity}

{Conversational format - less structured}
```

### For `reason` Command

```markdown
## Perplexity Analysis: {problem}

**Tool**: reason
**Model**: sonar-reasoning-pro

### Analysis

{Structured logical analysis with reasoning steps}

### Thinking Process (Optional)

<think>
{Perplexity's reasoning process if --strip-thinking not used}
</think>

### Conclusion

{Final recommendation or conclusion}
```

---

## Integration with researching-skills Router

When called from `researching-skills` router, output is saved to `perplexity.md`:

**File location**: `.claude/research/{timestamp}-{topic}/perplexity.md`

**Router expects**:

- Markdown format
- Key Findings section
- Sources section
- Metadata (date, tool, query)

**Synthesis Phase 5**: Router combines perplexity.md with other source files (codebase.md, web.md, etc.) into SYNTHESIS.md.

---

## Anti-Patterns

### ❌ No Sources

```markdown
## Perplexity Research: Topic

React 19 has Server Components.
Server Components are faster.
```

**Fix**: Include numbered citations and Sources section.

### ❌ No Metadata

```markdown
## Research Results

{findings without date, tool, or model info}
```

**Fix**: Always include Tool, Query, Date, and Research Notes.

### ❌ Unclear Citations

```markdown
According to some sources, React 19 is faster.
```

**Fix**: Use numbered citations [1] with URL in Sources section.

### ❌ Missing AI Synthesis Note

```markdown
## Results

{presenting AI-synthesized content as raw search results}
```

**Fix**: Always clarify content is AI-aggregated in Research Notes.

### ❌ No Date

```markdown
Research shows Next.js is popular.
```

**Fix**: Include research date for staleness tracking.

---

## Format Variations

### Minimal Format (Quick Research)

For simple queries via `search` or `ask`:

```markdown
## Perplexity: {topic}

**Tool**: {command} | **Date**: {YYYY-MM-DD}

{Brief findings with key points}

**Sources**: [1] [URL], [2] [URL]

**Note**: AI synthesis via Perplexity {command}
```

### Extended Format (Deep Research)

For comprehensive research via `research` or `reason`:

```markdown
## Perplexity Research: {topic}

{Standard template}

### Implementation Examples

{Code snippets from sources}

### Performance Considerations

{Performance data if applicable}

### Security Considerations

{Security implications if applicable}

### Comparison Matrix

{If comparing multiple options}

{Extended content for complex topics}
```
