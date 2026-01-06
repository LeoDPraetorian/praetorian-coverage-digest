# Research Integration Workflow

**When to use:** After Phase 6.2 (researching-skills) completes and user selected "Yes" to research.

## Output Location

Research artifacts are saved to:

```
.claude/.output/research/{timestamp}-{topic}/
```

Example: `.claude/.output/research/2026-01-02-153045-tanstack-query-patterns/`

## Files Generated

| File            | Content                                               |
| --------------- | ----------------------------------------------------- |
| `SYNTHESIS.md`  | Combined findings across all sources (always created) |
| `codebase.md`   | Local patterns and conventions (if selected)          |
| `context7.md`   | Official library documentation (if selected)          |
| `github.md`     | Open-source implementations (if selected)             |
| `arxiv.md`      | Academic papers (if selected)                         |
| `perplexity.md` | AI-synthesized research (if selected)                 |
| `web.md`        | Blogs, tutorials, Stack Overflow (if selected)        |

## Integration Steps

### 1. Read SYNTHESIS.md

Open the synthesis file:

```bash
cat .claude/.output/research/{timestamp}-{topic}/SYNTHESIS.md
```

Review:

- **Executive Summary** - High-level findings
- **Cross-Source Patterns** - Common themes
- **Recommendations** - Actionable next steps

### 2. Update SKILL.md Content

Incorporate findings into the main skill file:

**From Codebase Research:**

- Existing patterns in similar skills
- Naming conventions used in this project
- File organization patterns
- Tool usage patterns

**From Context7 Research:**

- Official API documentation
- Current version features (not outdated)
- Framework-specific patterns
- Migration guides for version changes

**From Web Research:**

- Best practices from community
- Common pitfalls and how to avoid them
- Performance optimization tips
- Real-world usage examples

### 3. Populate Reference Files

Add detailed content to `references/` directory:

**For Process/Pattern skills:**

- `workflow.md` - Step-by-step procedures from research
- `advanced-patterns.md` - Complex patterns discovered

**For Library/Framework skills:**

- `api-reference.md` - Complete API docs from Context7
- `patterns.md` - Usage patterns from codebase + web

**For Integration skills:**

- `api-reference.md` - Service APIs from docs
- `configuration.md` - Setup examples from research

**For Tool Wrapper skills:**

- `commands.md` - CLI commands from docs
- `error-handling.md` - Error patterns from issues/discussions

### 4. Replace Template Placeholders

Transform generic templates into real content:

**Before (template):**

```markdown
## Quick Start

1. Install the package
2. Configure settings
3. Use in your code
```

**After (research-informed):**

```markdown
## Quick Start

1. Install: `npm install @tanstack/react-query@5.17.0`
2. Configure QueryClient with staleTime: 5 minutes (recommended in docs)
3. Wrap app with QueryClientProvider (see codebase pattern in modules/chariot/ui/src/App.tsx)
```

**Key principle:** Every example should be:

- Real (not hypothetical)
- Current (from latest docs, not training data)
- Project-specific (uses actual file paths, conventions)

### 5. Add Citations

Include source attribution:

```markdown
## Related Resources

**Official Documentation:**

- [TanStack Query v5 Docs](https://tanstack.com/query/v5) - Latest API reference
- [Migration Guide v4→v5](https://tanstack.com/query/v5/docs/migration) - Breaking changes

**Codebase Examples:**

- `modules/chariot/ui/src/hooks/useAssets.ts` - Query hook pattern
- `modules/chariot/ui/src/providers/QueryProvider.tsx` - Client setup

**Community Resources:**

- [TanStack Query Best Practices (2025)](https://example.com/article) - Optimization guide
```

## Verification Checklist

Before proceeding to Phase 7, verify:

- [ ] SYNTHESIS.md has been read and understood
- [ ] SKILL.md contains patterns from codebase research
- [ ] SKILL.md includes API docs from Context7 (if library skill)
- [ ] SKILL.md incorporates best practices from web research
- [ ] Reference files are populated (not empty placeholders)
- [ ] All examples are real (not hypothetical)
- [ ] Examples use current syntax (not outdated from training data)
- [ ] File paths reference actual codebase files
- [ ] Citations link to research sources

## Anti-Patterns

| Anti-Pattern                 | Why It's Wrong                | Fix                          |
| ---------------------------- | ----------------------------- | ---------------------------- |
| Skip reading SYNTHESIS.md    | Miss cross-source patterns    | Always read synthesis first  |
| Copy research verbatim       | Creates bloated skill         | Extract key patterns only    |
| Keep template examples       | Generic, not project-specific | Replace with real examples   |
| Use hypothetical paths       | Not greppable, not verifiable | Use actual file paths        |
| Mix training data + research | Can contradict (old vs new)   | Trust research over training |

## Common Rationalizations

**"Research is optional, I'll skip integration"**

- WRONG: Research was conducted, must be used
- If research wasn't needed, should have selected "No" in Phase 6.1

**"I'll integrate later after GREEN phase"**

- WRONG: GREEN tests whether skill works with real content
- Template-based skills fail GREEN because they lack real patterns

**"I'll just use a few findings, not all"**

- ACCEPTABLE: Extract key patterns, don't bloat skill
- But ensure coverage across all research sources selected

**"Research contradicts my understanding"**

- TRUST RESEARCH: Your training data is 12-18 months stale
- React 16→19, library major versions, patterns evolve rapidly

## Related Patterns

- [Progressive Disclosure](.claude/skills/managing-skills/references/progressive-disclosure.md) - When to extract to references
- [Line Count Limits](.claude/skills/managing-skills/references/patterns/line-count-limits.md) - Managing file size
- [Research Rationalizations](research-rationalizations.md) - Why research isn't optional
