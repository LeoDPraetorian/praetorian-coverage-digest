# Synthesis Template

Use this template for SYNTHESIS.md in Phase 5.

```markdown
# Research: {Topic Title}

**Date:** {YYYY-MM-DD}
**Sources Used:** {comma-separated list: Codebase, Context7, GitHub, arxiv, Web}
**Purpose:** {user's original research goal in 1-2 sentences}
**Output Location:** `.claude/research/{timestamp}-{topic}/`

---

## Executive Summary

{2-3 paragraphs synthesizing key findings across all sources. Answer:}
- What did we learn?
- What patterns emerged?
- What should we do with this information?

---

## Findings by Source

### Codebase
{If used, summarize key findings from codebase.md:}
- Patterns discovered
- Conventions identified
- Example files/functions found

{If not used: "Not included in this research."}

### Context7
{If used, summarize key findings from context7.md:}
- Library version researched
- Key APIs discovered
- Best practices from official docs

{If not used: "Not included in this research."}

### GitHub
{If used, summarize key findings from github.md:}
- Top repositories found
- Implementation patterns
- Community consensus

{If not used: "Not included in this research."}

### arxiv
{If used, summarize key findings from arxiv.md:}
- Papers reviewed
- Theoretical foundations
- State-of-the-art techniques

{If not used: "Not included in this research."}

### Web
{If used, summarize key findings from web.md:}
- Tutorials/guides found
- Community discussions
- Practical tips

{If not used: "Not included in this research."}

---

## Cross-Source Patterns

{Themes that appeared across multiple sources. Look for:}
- Consistent recommendations across sources
- Patterns validated by multiple sources
- Common terminology or concepts

| Pattern | Sources Confirming | Confidence |
| ------- | ------------------ | ---------- |
| {pattern1} | {source1, source2} | High/Medium/Low |
| {pattern2} | {source1, source3} | High/Medium/Low |

---

## Conflicts & Discrepancies

{Disagreements between sources. For each conflict:}
- What sources disagree?
- What are the competing views?
- Which source should be trusted and why?

| Topic | Source A Says | Source B Says | Recommended |
| ----- | ------------- | ------------- | ----------- |
| {topic} | {viewA} | {viewB} | {which to trust and why} |

{If no conflicts: "No significant conflicts found between sources."}

---

## Recommendations

{Actionable next steps based on research findings:}

1. **Immediate Action:** {what to do now}
2. **Pattern to Adopt:** {recommended approach from research}
3. **Things to Avoid:** {anti-patterns discovered}
4. **Further Research:** {gaps that need more investigation}

---

## Citations

### Codebase References
{File paths with function signatures - NO line numbers}
- `path/to/file.ts` - `function/class name`

### Context7 References
- Package: {package-name} v{version}
- Context7 ID: {library-id}

### GitHub References
- [{repo-name}](https://github.com/{owner}/{repo}) - {description}

### arxiv References
- arxiv:{id} - [{paper-title}](https://arxiv.org/abs/{id})

### Web References
- [{title}]({url}) - {publication/site name}

---

## Metadata

| Field | Value |
| ----- | ----- |
| Research ID | {timestamp}-{topic} |
| Duration | {approximate time spent} |
| Sources Selected | {count}/5 |
| Total Citations | {count} |
```

## Usage Notes

1. **Always create SYNTHESIS.md** - Even for single-source research
2. **Be specific in summaries** - Don't just say "found useful patterns"; list them
3. **Cite everything** - Every claim should have a source
4. **Highlight conflicts** - Disagreements are valuable; don't hide them
5. **Make recommendations actionable** - "Use X" not "Consider X"
