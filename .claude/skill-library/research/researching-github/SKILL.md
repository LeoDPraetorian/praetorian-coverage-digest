---
name: researching-github
description: Use when researching GitHub repositories, code patterns, issues, discussions, and implementations - provides systematic 6-phase workflow with gh CLI (primary) and web fallback, quality indicators for repository assessment, and structured synthesis with citations
allowed-tools: Bash, WebSearch, WebFetch, Read, Write, TodoWrite, AskUserQuestion
---

# Researching GitHub

**Systematic GitHub research methodology for discovering repositories, code patterns, issues, discussions, and implementations with dual-tool strategy (gh CLI + web fallback).**

## When to Use

Use this skill when:

- Searching for open-source implementations of techniques
- Finding example repositories for a technology/pattern
- Discovering GitHub issues/discussions about specific problems
- Locating code snippets across public repositories
- Researching project adoption/community health
- Comparing implementations across multiple repositories

**DO NOT use when:**

- npm/library docs needed → use `researching-context7`
- Academic papers needed → use `researching-arxiv`
- Local codebase patterns → use `researching-codebase`
- General web/blog content → use `researching-web`

**You MUST use TodoWrite** before starting to track all workflow phases.

## Quick Reference

| Phase                        | Purpose                       | Primary Tool | Fallback  | Time    |
| ---------------------------- | ----------------------------- | ------------ | --------- | ------- |
| 1. Environment & Query       | Detect gh CLI, formulate      | Bash         | -         | 2 min   |
| 2. Search Execution          | Execute searches              | gh CLI       | WebSearch | 3-5 min |
| 3. Quality Assessment        | Filter by indicators          | -            | -         | 2 min   |
| 4. Deep Inspection           | Fetch details for top results | gh CLI       | WebFetch  | 5 min   |
| 5. Code Extraction (if code) | Extract patterns              | gh CLI       | WebFetch  | 3 min   |
| 6. Synthesis                 | Structured findings           | Write        | -         | 3 min   |

**Total time**: 15-20 minutes

---

## Tool Strategy (CRITICAL)

### Primary: gh CLI

**Advantages:**

- Authenticated access (no rate limits with `gh auth login`)
- JSON output for structured parsing
- Advanced filtering (language, stars, license, date)
- Direct repository content access

**Availability check:**

```bash
gh auth status
```

### Fallback: WebSearch + WebFetch

**When to use:**

- `gh auth status` fails (not authenticated)
- User prefers web-based research
- gh CLI timeout/errors

**Pattern:**

```
WebSearch('site:github.com "query" language:go stars:>100')
WebFetch('https://github.com/search?q={URL_ENCODED_QUERY}&type=repositories', 'Extract top 10 repository names, owners, descriptions, star counts, last updated dates, and URLs')
WebFetch('https://github.com/{owner}/{repo}', 'Extract README, license, star count, open issues, and technology stack')
```

---

## Workflow Phases

### Phase 1: Environment Detection & Query Formulation

#### 1.1 Check gh CLI Availability

```bash
gh auth status 2>&1
```

**Parse output:**

- Success → use gh CLI (primary)
- `not logged in` or `gh: command not found` → use web fallback

**Record tool choice** - affects all subsequent phases.

#### 1.2 Formulate Search Queries

**Pattern:** Broad → Specific → Niche

**Query 1 (Broad):** Core technology or domain

- Example: `rate limiting`
- Purpose: Survey landscape

**Query 2 (Specific):** Technology + language or framework

- Example: `rate limiting golang`
- Purpose: Target implementation stack

**Query 3 (Niche):** Problem-specific with context

- Example: `rate limiting redis golang middleware`
- Purpose: Exact use case

**Advanced filters (gh CLI):**

- `language:go`, `language:python`, `language:rust`
- `stars:>1000`, `stars:100..1000`
- `license:mit`, `license:apache-2.0`
- `pushed:>2024-01-01` (recent activity)

**For complete query formulation patterns, see:** [references/query-formulation.md](references/query-formulation.md)

---

### Phase 2: Search Execution

#### 2.1 Repository Search

**gh CLI:**

```bash
gh search repos "rate limiting golang" --limit 20 --json name,owner,description,stargazersCount,updatedAt,url,licenseInfo
```

**Web fallback:**

```
WebSearch('site:github.com "rate limiting golang" stars:>100')
WebFetch('https://github.com/search?q=rate+limiting+golang&type=repositories', 'Extract the top 10 repository names, owners, descriptions, star counts, and URLs')
```

#### 2.2 Code Search (requires gh auth)

**gh CLI:**

```bash
gh search code "func RateLimit" --language=go --limit 20 --json repository,path,textMatches
```

**Web fallback:**

```
WebFetch('https://github.com/search?q=func+RateLimit+language:go&type=code', 'Extract code snippets showing function signatures and usage patterns')
```

#### 2.3 Issues/Discussions Search

**gh CLI:**

```bash
gh search issues "rate limiting bug" --state=open --limit 20 --json title,repository,state,url,createdAt,comments
```

**Web fallback:**

```
WebSearch('site:github.com "rate limiting bug" type:issue state:open')
```

**For complete search command reference, see:** [references/gh-cli-commands.md](references/gh-cli-commands.md)

---

### Phase 3: Result Filtering & Quality Assessment

Apply quality indicators to filter results:

| Indicator       | Criteria                                                     | Action       |
| --------------- | ------------------------------------------------------------ | ------------ |
| ✅ High Quality | >1000 stars, active in last 6 months, has license, good docs | Prioritize   |
| ⚠️ Medium       | 100-1000 stars, updated in last year                         | Consider     |
| 🔍 Evaluate     | <100 stars but recent/relevant                               | Inspect more |
| ❌ Skip         | Archived, no updates >2 years, no license for production use | Deprioritize |

**Assessment criteria:**

1. **Stars** - Community validation (>1000 = high, 100-1000 = medium, <100 = evaluate)
2. **Recent activity** - Last commit within 6 months = active, 1 year = maintained, >2 years = stale
3. **License** - OSI-approved license present (MIT, Apache-2.0, BSD)
4. **Documentation** - README with examples, architecture docs, API reference

**Filter output:** Top 3-5 repositories that meet ✅ or ⚠️ criteria.

**For complete quality indicators and assessment criteria, see:** [references/quality-indicators.md](references/quality-indicators.md)

#### 3.1 Prioritization Algorithm

After filtering by quality tiers, rank repositories using weighted scoring:

| Factor       | Weight | Metric                       | Source (gh CLI)   |
| ------------ | ------ | ---------------------------- | ----------------- |
| Popularity   | 40%    | Stars                        | `stargazersCount` |
| Maintenance  | 35%    | Days since last commit       | `updatedAt`       |
| Forks        | 15%    | Fork count                   | `forkCount`       |
| Issue Health | 10%    | Open issues (fewer = better) | `openIssues`      |

**Scoring formula:**

```
Score = (popularity × 0.40) + (maintenance × 0.35) + (forks × 0.15) + (issue_health × 0.10)

Where each component is normalized to 0-1:
- popularity = min(stars / 10000, 1.0)
- maintenance = max(0, 1 - (days_since_commit / 365))
- forks = min(forks / 1000, 1.0)
- issue_health = 1 / (1 + log10(open_issues + 1))
```

**Research basis:** Weights informed by npms.io (maintenance 35%, popularity 35%), GitHub trending (velocity-based), and Snyk Advisor. Stars weighted higher (40%) since GitHub lacks download metrics.

**Sort order:** Within quality tiers, sort by score descending.

**For detailed calculation methodology, edge cases, and customization guidance, see:** [references/prioritization-algorithm.md](references/prioritization-algorithm.md)

---

### Phase 4: Deep Inspection

For each of the top 3-5 filtered results, fetch detailed information.

#### 4.1 Repository Details

**gh CLI:**

```bash
gh repo view {owner}/{repo} --json name,description,readme,licenseInfo,stargazerCount,forkCount,openIssues,defaultBranch
```

**Web fallback:**

```
WebFetch('https://github.com/{owner}/{repo}', 'Extract: full README content, license name, star count, fork count, last commit date, open issues count, programming languages used, and topics/tags')
```

#### 4.2 README Content

**gh CLI:**

```bash
gh api repos/{owner}/{repo}/contents/README.md | jq -r '.content' | base64 --decode
```

**Web fallback:**

```
WebFetch('https://raw.githubusercontent.com/{owner}/{repo}/main/README.md', 'Extract full README markdown content')
```

**Alternative branch fallback:** Try `master` if `main` fails.

#### 4.3 Extract Key Information

For each repository, document:

- **Name & URL**: `{owner}/{repo}` and GitHub URL
- **Description**: One-line summary
- **Stars/Forks**: Community metrics
- **License**: OSI license name
- **Last Updated**: Last commit date
- **Key Features**: From README (installation, usage, examples)
- **Technology Stack**: Languages, frameworks, dependencies
- **Relevance**: Why this matters for current research task

**For complete deep inspection patterns, see:** [references/deep-inspection.md](references/deep-inspection.md)

---

### Phase 5: Code Example Extraction (Conditional)

**Only for code searches** - skip if researching repositories/issues.

#### 5.1 Identify Code Patterns

From code search results, extract:

- **File path**: Relative to repository root
- **Function/class signature**: Use durable patterns (NOT line numbers)
- **Usage context**: How is this pattern used?
- **Repository attribution**: `{owner}/{repo}` URL

#### 5.2 Durable Code References (MANDATORY)

❌ **NEVER use line numbers** - they change with every commit:

```markdown
❌ BAD: github.com/foo/bar/file.go:123-127
❌ BAD: See line 154 in rate_limiter.go
```

✅ **USE function signatures** - stable across refactors:

```markdown
✅ GOOD: github.com/foo/bar/rate_limiter.go - `func (r *RateLimiter) Allow()`
✅ GOOD: github.com/foo/bar/middleware.go (between NewMiddleware() and ServeHTTP() methods)
```

**For complete code reference patterns, see:** [Code Reference Patterns](../../../../skills/managing-skills/references/patterns/code-reference-patterns.md)

---

### Phase 6: Synthesis

#### 6.1 Structured Output Format

Create research findings document:

```markdown
## GitHub Research: {topic}

**Date:** {current-date}
**Tool Used:** gh CLI / Web Fallback
**Purpose:** Research for {task-description}

### Search Summary

- **Queries Executed:**
  1. {query1} - {N} results
  2. {query2} - {N} results
  3. {query3} - {N} results
- **Total Results:** {count}
- **Filtered Results:** {count after quality assessment}

### Top Repositories

**1. {owner}/{repo-name}** ✅ High Quality — Score: 0.87

- **Stars:** {count} | **Forks:** {count} | **License:** {license}
- **Last Updated:** {date}
- **URL:** https://github.com/{owner}/{repo}
- **Description:** {one-line summary}
- **Relevance:** {why this matters for the task}
- **Key Features:**
  - {feature1}
  - {feature2}
  - {feature3}
- **Key Files:** {relevant files to examine}

**2. {owner}/{repo-name}** ✅ High Quality — Score: 0.72

... (repeat pattern, sorted by score within tier)

### Code Patterns Found (if code search)

| Pattern            | Repository  | File            | Signature               |
| ------------------ | ----------- | --------------- | ----------------------- |
| Rate limiter       | owner/repo1 | rate_limiter.go | `func (r *RL) Allow()`  |
| Middleware wrapper | owner/repo2 | middleware.go   | `func NewRateLimiter()` |

### Issues/Discussions (if searched)

| Title              | Repository | Status | Comments | URL   |
| ------------------ | ---------- | ------ | -------- | ----- |
| {issue-title}      | owner/repo | open   | {count}  | {url} |
| {discussion-title} | owner/repo | closed | {count}  | {url} |

### Recommendations

1. **Primary Choice:** {owner}/{repo} - {why it's recommended}
2. **Alternative Approaches:** {list other viable options}
3. **Caveats:** {known limitations, dependencies, compatibility}
4. **Next Steps:** {what to do with findings}

### Implementation Guidance

Based on research findings:

1. **Pattern:** {common pattern across repositories}
2. **Dependencies:** {shared dependencies}
3. **Best Practices:** {validated approaches from high-quality repos}
4. **Anti-Patterns:** {what to avoid based on closed issues}
```

#### 6.2 Save Synthesis

Write to `.local/github-research-{topic}.md` for reference during implementation.

**For complete output format templates, see:** [references/output-format.md](references/output-format.md)

---

## GitHub Search URL Patterns (Web Fallback)

| Search Type  | URL Pattern                                             |
| ------------ | ------------------------------------------------------- |
| Repositories | `https://github.com/search?q={query}&type=repositories` |
| Code         | `https://github.com/search?q={query}&type=code`         |
| Issues       | `https://github.com/search?q={query}&type=issues`       |
| Discussions  | `https://github.com/search?q={query}&type=discussions`  |
| Commits      | `https://github.com/search?q={query}&type=commits`      |
| Users        | `https://github.com/search?q={query}&type=users`        |

**Advanced filters:**

- `language:go`, `language:python`, `language:rust`
- `stars:>1000`, `stars:100..1000`
- `pushed:>2024-01-01` (commits after date)
- `license:mit`, `license:apache-2.0`
- `archived:false` (exclude archived repos)
- `is:public` (only public repos)

**For complete search filter syntax, see:** [references/search-filters.md](references/search-filters.md)

---

## Common Rationalizations (DO NOT SKIP)

| Rationalization                     | Why It's Wrong                                                |
| ----------------------------------- | ------------------------------------------------------------- |
| "I'll just WebSearch GitHub"        | gh CLI has better filtering, JSON output, no rate limits      |
| "gh isn't set up, skip to guessing" | Web fallback exists - use it systematically                   |
| "First result looks good enough"    | Quality indicators exist for a reason - evaluate properly     |
| "Stars don't matter"                | Stars + recent activity = community validation                |
| "I know the popular repos"          | New repos emerge constantly, search to discover               |
| "No time for quality assessment"    | 2 min assessment prevents hours with unmaintained/archived    |
| "Skip code extraction"              | Function signatures provide implementation guidance           |
| "This is just web research"         | GitHub-specific workflow (gh CLI, quality indicators) differs |

---

## Difference from Sibling Skills

| researching-github    | researching-web           | researching-codebase      |
| --------------------- | ------------------------- | ------------------------- |
| GitHub-specific       | General web               | Local codebases           |
| gh CLI + web fallback | WebSearch + WebFetch only | Grep/Glob/Read            |
| Quality indicators    | Source validation         | Convention analysis       |
| Repo/code/issues      | Blogs/docs/Stack Overflow | Patterns/naming/structure |
| Open-source discovery | Supplemental sources      | Internal implementation   |

---

## Integration with researching-skills Router

This skill is invoked during research orchestration by `researching-skills` (CORE skill):

```
skill: "researching-skills"
```

The researching-skills skill delegates to:

1. **Codebase research** → researching-codebase
2. **Context7 research** → researching-context7
3. **GitHub research** → researching-github (THIS SKILL)
4. **arxiv research** → researching-arxiv
5. **Web research** → researching-web

**Routing logic:**

- "find GitHub examples" → researching-github
- "open-source implementations" → researching-github
- "repository with X feature" → researching-github
- "issues about X problem" → researching-github

---

## Key Principles

1. **Dual-Tool Strategy** - gh CLI primary, web fallback always available
2. **Quality Assessment** - Filter by stars, activity, license, docs
3. **Durable References** - Function signatures, not line numbers
4. **Structured Synthesis** - Consistent output format with citations
5. **Progressive Phases** - 6 phases from detection to synthesis
6. **TodoWrite Tracking** - Track all 6 phases for visibility
7. **Evidence-Based** - Every finding must have GitHub URL

---

## Related Skills

| Skill                    | Access Method                                                                                   | Purpose                                |
| ------------------------ | ----------------------------------------------------------------------------------------------- | -------------------------------------- |
| **researching-skills**   | `skill: "researching-skills"` (CORE)                                                            | Orchestrator for all research types    |
| **researching-codebase** | `Read(".claude/skill-library/research/researching-codebase/SKILL.md")` (LIBRARY) | Local codebase pattern discovery       |
| **researching-context7** | `Read(".claude/skill-library/research/researching-context7/SKILL.md")` (LIBRARY) | npm/library documentation via Context7 |
| **researching-arxiv**    | `Read(".claude/skill-library/research/researching-arxiv/SKILL.md")` (LIBRARY)    | Academic papers and research           |
| **researching-web**      | `Read(".claude/skill-library/research/researching-web/SKILL.md")` (LIBRARY)      | General web research (fallback)        |
| **creating-skills**      | `Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md")` (LIBRARY)      | Skill creation workflow                |
| **updating-skills**      | `Read(".claude/skill-library/claude/skill-management/updating-skills/SKILL.md")` (LIBRARY)      | Skill update workflow                  |

---

## Changelog

See `.history/CHANGELOG` for historical changes.

Initial creation: 2025-12-30