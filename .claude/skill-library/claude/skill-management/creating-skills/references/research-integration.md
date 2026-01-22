# Research Integration Workflow

**When to use:** After Sub-Phase 6.2 (orchestrating-research) completes and user selected "Yes" to research.

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

Add detailed content to `references/` directory. **Each file MUST have >50 lines of substantive content (not placeholders).**

#### Research-to-Reference Mapping Table

Use this table to route research output content to the correct reference files:

| Reference File       | Primary Source in Research Output                | Content to Extract                                       |
| -------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| workflow.md          | SYNTHESIS.md → Findings by Interpretation        | Step-by-step procedures, phase breakdowns, checklists    |
| api-reference.md     | context7-\*.md files + SYNTHESIS.md API sections | API methods, parameters, return types, examples          |
| patterns.md          | SYNTHESIS.md → Cross-Interpretation Patterns     | Usage patterns, best practices, common combinations      |
| advanced-patterns.md | github-\*.md files + SYNTHESIS.md patterns       | Complex workflows, edge cases, optimization techniques   |
| error-handling.md    | SYNTHESIS.md → Conflicts section                 | Error types, recovery strategies, debugging approaches   |
| configuration.md     | codebase-\*.md + web-\*.md setup guides          | Setup steps, environment variables, integration examples |

#### Per-File Content Guidance

**For Process/Pattern skills:**

- `workflow.md` (>50 lines)
  - Extract step-by-step procedures from SYNTHESIS.md "Findings by Interpretation"
  - Include decision trees from github-\*.md examples
  - Add checklists from web-\*.md tutorials
  - Cite specific source files (e.g., "From github-react-patterns.md: ...")
- `advanced-patterns.md` (>50 lines)
  - Extract complex patterns from github-\*.md open-source implementations
  - Include optimization techniques from SYNTHESIS.md patterns section
  - Add edge case handling from perplexity-\*.md discussions
  - Provide real code examples (not hypothetical)

**For Library/Framework skills:**

- `api-reference.md` (>50 lines)
  - Extract complete API from context7-\*.md official documentation
  - Include method signatures, parameters, return types
  - Add SYNTHESIS.md API sections for cross-method patterns
  - Cite version numbers (e.g., "TanStack Query v5.17.0")
- `patterns.md` (>50 lines)
  - Extract usage patterns from codebase-\*.md local examples
  - Include best practices from web-\*.md community resources
  - Add SYNTHESIS.md "Cross-Interpretation Patterns" section
  - Reference actual codebase files (e.g., `modules/chariot/ui/src/hooks/useAssets.ts`)

**For Integration skills:**

- `api-reference.md` (>50 lines)
  - Extract API endpoints from context7-\*.md or web-\*.md documentation
  - Include authentication methods from SYNTHESIS.md security section
  - Add request/response examples from github-\*.md implementations
  - Cite API version and endpoint URLs
- `configuration.md` (>50 lines)
  - Extract setup steps from codebase-\*.md existing integrations
  - Include environment variables from web-\*.md setup guides
  - Add troubleshooting from SYNTHESIS.md conflicts section
  - Provide complete working examples

**For Tool Wrapper skills:**

- `commands.md` (>50 lines)
  - Extract CLI commands from context7-\*.md tool documentation
  - Include flag descriptions and examples from web-\*.md tutorials
  - Add command chaining patterns from github-\*.md scripts
  - Cite tool version (e.g., "praetorian-cli v2.3.0")
- `error-handling.md` (>50 lines)
  - Extract error types from SYNTHESIS.md conflicts section
  - Include recovery strategies from github-\*.md issue discussions
  - Add debugging approaches from web-\*.md troubleshooting guides
  - Provide error message examples and fixes

### 4. Example: Complete Reference File from Research

For a complete worked example of creating a reference file from research findings, see [examples/tanstack-query-research-example.md](../examples/tanstack-query-research-example.md).

This example demonstrates:

- How to synthesize multiple research sources (SYNTHESIS.md, GitHub examples, codebase patterns)
- Proper citation format for research sources
- Real code examples with file locations
- Context for when to use each pattern

### 5. Replace Template Placeholders

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

### 6. Add Citations

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

## Handling Large Research Outputs

**🚨 CRITICAL: Each reference file MUST be <400 lines.**

When research returns large documents (API docs, advanced patterns, etc.), split them logically by category/module/phase.

**See:** [Splitting Large Outputs](splitting-large-outputs.md) for:

- Splitting strategy (by module, concern, phase)
- File naming conventions
- Common split patterns (API, Patterns, Workflow)
- Verification scripts

---

## Verification Checklist

**Before proceeding to Phase 7, ALL items must pass:**

- [ ] SYNTHESIS.md has been read and understood
- [ ] SKILL.md updated with patterns from SYNTHESIS.md
- [ ] All required reference files for skill type exist (see mapping table)
- [ ] Each reference file has >50 lines of content (not placeholder)
- [ ] Each reference file has <400 lines (split if exceeded)
- [ ] Reference files cite research sources (not training data)
- [ ] All examples are real (not hypothetical)
- [ ] Examples use current syntax (not outdated from training data)
- [ ] File paths reference actual codebase files
- [ ] Citations link to research sources

**Bash verification:**

```bash
# Verify reference files exist with proper size (50-400 lines)
for file in references/*.md; do
  [ ! -f "$file" ] && continue
  lines=$(wc -l < "$file")
  if [ "$lines" -lt 50 ]; then
    echo "FAIL: $file too short ($lines lines, min: 50)"
    exit 1
  elif [ "$lines" -gt 400 ]; then
    echo "FAIL: $file too long ($lines lines, max: 400) - MUST SPLIT"
    exit 1
  fi
done
echo "All reference files within 50-400 line range"
```

**Cannot proceed to Phase 7 until verification passes** ✅

## Table of Contents Requirement

For reference files over 100 lines, include a table of contents at the top:

```markdown
# API Reference

## Contents

- Authentication and setup
- Core methods (create, read, update, delete)
- Advanced features
- Error handling
- Code examples

## Authentication and setup

...
```

This ensures Claude can see the full scope of available content even when previewing files with partial reads (`head -100`).

## Anti-Patterns

| Anti-Pattern                              | Why It's Wrong                                         | Fix                                     |
| ----------------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| Skip reading SYNTHESIS.md                 | Miss cross-source patterns                             | Always read synthesis first             |
| Copy research verbatim                    | Creates bloated skill                                  | Extract key patterns only               |
| Keep template examples                    | Generic, not project-specific                          | Replace with real examples              |
| Use hypothetical paths                    | Not greppable, not verifiable                          | Use actual file paths                   |
| Mix training data + research              | Can contradict (old vs new)                            | Trust research over training            |
| **Create empty placeholder files**        | **Fails Phase 7 verification, GREEN tests incomplete** | **Write >50 lines substantive content** |
| **Update only SKILL.md, skip references** | **Detailed content belongs in references/**            | **Create ALL required reference files** |
| **Create references "later"**             | **Phase 7+ assumes they exist**                        | **Complete all files before Phase 7**   |

## Common Rationalizations

**"Research is optional, I'll skip integration"**

- WRONG: Research was conducted, must be used
- If research wasn't needed, should have selected "No" in Sub-Phase 6.1

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
