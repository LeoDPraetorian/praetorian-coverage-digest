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

**Scenario:** Creating `advanced-patterns.md` for a TanStack Query skill after research

**Source files available:**

- `SYNTHESIS.md` - Cross-interpretation patterns section
- `github-tanstack-examples.md` - Open-source implementations
- `codebase-chariot-hooks.md` - Local usage patterns

**Resulting advanced-patterns.md (78 lines):**

```markdown
# Advanced TanStack Query Patterns

**Source:** Research conducted 2026-01-12

## Optimistic Updates with Rollback

**Pattern from github-tanstack-examples.md:**

\`\`\`typescript
const mutation = useMutation({
mutationFn: updateUser,
onMutate: async (newUser) => {
// Cancel outgoing refetches
await queryClient.cancelQueries({ queryKey: ['users'] })

    // Snapshot previous value
    const previousUsers = queryClient.getQueryData(['users'])

    // Optimistically update
    queryClient.setQueryData(['users'], (old) => [...old, newUser])

    return { previousUsers }

},
onError: (err, newUser, context) => {
// Rollback on error
queryClient.setQueryData(['users'], context.previousUsers)
},
})
\`\`\`

**Used in codebase:** `modules/chariot/ui/src/mutations/useUpdateAsset.ts:45-67`

## Dependent Queries

**Pattern from SYNTHESIS.md Cross-Interpretation Patterns:**

\`\`\`typescript
const { data: user } = useQuery({
queryKey: ['user', userId],
queryFn: () => fetchUser(userId),
})

const { data: projects } = useQuery({
queryKey: ['projects', user?.id],
queryFn: () => fetchProjects(user.id),
enabled: !!user?.id, // Only run when user exists
})
\`\`\`

**Best practice (from web research):** Always use `enabled` option to prevent unnecessary requests.

## Infinite Queries for Pagination

**Pattern from github-tanstack-examples.md:**

\`\`\`typescript
const {
data,
fetchNextPage,
hasNextPage,
isFetchingNextPage,
} = useInfiniteQuery({
queryKey: ['projects'],
queryFn: ({ pageParam = 0 }) => fetchProjects(pageParam),
getNextPageParam: (lastPage, pages) => lastPage.nextCursor,
})
\`\`\`

**Performance note (from SYNTHESIS.md):** Use `maxPages` option to limit memory usage for very long lists.

## Prefetching Strategies

**Pattern from codebase-chariot-hooks.md:**

\`\`\`typescript
// Prefetch on hover (modules/chariot/ui/src/components/AssetCard.tsx)
<Card
onMouseEnter={() => {
queryClient.prefetchQuery({
queryKey: ['asset', asset.id],
queryFn: () => fetchAssetDetails(asset.id),
})
}}
/>
\`\`\`

**When to use (from web research):** Prefetch for likely next actions, but avoid prefetching everything (wastes bandwidth).

## Related Patterns

- [TanStack Query Official Docs](https://tanstack.com/query/v5/docs) - Latest API
- [Codebase hooks](../../modules/chariot/ui/src/hooks/) - Local implementations
```

**Key characteristics of this example:**

- 78 lines (well over 50-line minimum)
- Cites specific research sources ("from github-tanstack-examples.md")
- References actual codebase files with locations
- Includes real code examples (not placeholders)
- Provides context for when to use each pattern

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

## Verification Checklist

**Before proceeding to Phase 7, ALL items must pass:**

- [ ] SYNTHESIS.md has been read and understood
- [ ] SKILL.md updated with patterns from SYNTHESIS.md
- [ ] All required reference files for skill type exist (see mapping table)
- [ ] Each reference file has >50 lines of content (not placeholder)
- [ ] Reference files cite research sources (not training data)
- [ ] All examples are real (not hypothetical)
- [ ] Examples use current syntax (not outdated from training data)
- [ ] File paths reference actual codebase files
- [ ] Citations link to research sources

**Bash verification:**

```bash
# Verify reference files exist and have content
for file in workflow.md advanced-patterns.md; do
  if [ ! -f "references/$file" ] || [ $(wc -l < "references/$file") -lt 50 ]; then
    echo "FAIL: references/$file missing or too short"
    exit 1
  fi
done
```

**Cannot proceed to Phase 7 until verification passes** ✅

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
