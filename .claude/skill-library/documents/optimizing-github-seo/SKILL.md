---
name: optimizing-github-seo
description: Use when optimizing GitHub repositories for SEO, AEO, and GitHub search discoverability - provides comprehensive analysis and actionable recommendations based on 2025/2026 best practices
allowed-tools: Read, Grep, Glob, Bash, Write, Edit, AskUserQuestion, WebSearch, WebFetch
---

# Optimizing GitHub SEO

**Comprehensive GitHub repository optimization for SEO, AEO, and GitHub search discoverability.**

## When to Use

Use this skill when:

- User asks to optimize a GitHub repository for search/discoverability
- Analyzing repository visibility and ranking potential
- Improving repository metadata, README, and documentation
- Planning distribution strategy for open source projects
- User wants to increase stars, watchers, or community engagement

## Quick Reference

| Phase | Purpose                                   | Duration  |
| ----- | ----------------------------------------- | --------- |
| 1     | Repository audit - analyze current state  | 5-10 min  |
| 2     | Keyword research - identify opportunities | 5-10 min  |
| 3     | Optimization - metadata, README, docs     | 10-15 min |
| 4     | Distribution strategy - sharing plan      | 5 min     |
| 5     | Quick wins vs long-term - prioritize      | 5 min     |

**For complete best practices and detailed methodology, see:**

- [SEO Best Practices](references/seo-best-practices.md)
- [AEO Principles](references/aeo-principles.md)
- [Keyword Research Guide](references/keyword-research.md)
- [Distribution Strategies](references/distribution-strategies.md)

## Skill Purpose

This skill analyzes GitHub repositories and provides specific, actionable recommendations to improve:

- **SEO**: Search engine optimization for Google/Bing discovery
- **AEO**: Answer engine optimization for AI systems (ChatGPT, Claude, Perplexity)
- **GitHub Search**: Internal GitHub search ranking and discoverability

## Analysis Process

### Phase 1: Repository Audit

Read and analyze the following repository elements:

1. **Repository name and URL structure**

   ```bash
   # Get repository info
   gh repo view --json name,description,url
   ```

2. **About section/description**
3. **Topics/tags** (count and relevance)
4. **README.md** content and structure
5. **Additional documentation files**
   - CONTRIBUTING.md
   - SECURITY.md
   - CODE_OF_CONDUCT.md
   - CHANGELOG.md
   - LICENSE
   - CITATION.cff
   - .github/FUNDING.yml
6. **GitHub Wiki presence** (if applicable)
7. **Recent commit activity**
8. **Stars, watchers, forks count**

**Document current state** for each element before making recommendations.

### Phase 2: Keyword Research

Identify and validate:

- **Primary keywords** from repository purpose
- **Secondary keywords** from technology stack
- **Long-tail keywords** from use cases
- **Competitor repository keywords**
- **Trending vs saturated topic analysis**

**See:** [Keyword Research Guide](references/keyword-research.md) for detailed methodology and tools.

### Phase 3: Optimization Recommendations

Provide specific recommendations for:

#### Repository Metadata

**Ranking hierarchy:** Keywords in Title > Description > Tags > Stars > Activity

- **Name**: Suggest keyword-rich alternatives if current name is generic
  - ✅ Good: `react-authentication-hooks`, `python-data-pipeline`
  - ❌ Bad: `my-project`, `tool`, `app`
- **About Section**: Draft 5-15 word description starting with primary keyword
  - Must be compelling and keyword-optimized
  - Front-load the primary keyword
- **Topics**: Recommend 8-12 specific topics with reasoning
  - Include precise technical terms (e.g., 'oauth2', 'fastapi', 'typescript')
  - **Avoid saturated tags for new repos** (e.g., 'python', 'react')
  - Target trending niche tags with fewer competing repos
  - Balance broad vs specific topics

**See:** [Repository Metadata Optimization](references/metadata-optimization.md)

#### README Optimization

**Key elements:**

- **Title and Header Structure**: Ensure H1 includes primary keyword
- **Opening Paragraph**: Rewrite to include keywords naturally
- **Feature Sections**: Add keyword-rich headings
- **Code Examples**: Ensure descriptive filenames with keywords
- **Internal Structure**: Add table of contents, badges, shields.io metrics

**See:** [README Optimization Guide](references/readme-optimization.md)

#### Documentation Expansion

Identify missing standard files and prioritize creation:

| File                | Purpose                       | Priority |
| ------------------- | ----------------------------- | -------- |
| CONTRIBUTING.md     | Contributor guidelines        | High     |
| SECURITY.md         | Security policy               | High     |
| CODE_OF_CONDUCT.md  | Community standards           | Medium   |
| CHANGELOG.md        | Version history               | Medium   |
| LICENSE             | Legal terms                   | Critical |
| CITATION.cff        | Academic citation (if needed) | Low      |
| .github/FUNDING.yml | Sponsorship info              | Low      |

**GitHub Wiki**: Recommend wiki pages for comprehensive guides, tutorials, and extended documentation.

#### AEO-Specific Optimizations

- **Structured content** that AI can parse
- **Clear 'why' explanations**, not just 'what'
- **Use cases and context** throughout documentation
- **Consistent terminology** across all files
- **Complete metadata** in package files (package.json, setup.py, go.mod, etc.)

**See:** [AEO Principles](references/aeo-principles.md)

### Phase 4: Distribution Strategy

Recommend specific actions:

- **Platform Sharing**: Dev.to, Daily.dev, Medium, Reddit communities
- **Blog Content**: Suggest 3-5 blog post topics about the project
- **Social Media**: Draft announcement posts
- **Community Engagement**: Identify relevant forums/communities

**See:** [Distribution Strategies](references/distribution-strategies.md)

### Phase 5: Quick Wins vs Long-term

Categorize recommendations:

- **Immediate wins**: Name, About, Topics updates
- **Short-term**: README restructure, add standard files
- **Ongoing**: Wiki creation, blog posts, community engagement

## Output Format

Provide recommendations in this structure:

### Executive Summary

- Current SEO score estimate (1-10)
- Top 3 immediate opportunities
- Expected impact of changes

### Detailed Recommendations

#### 1. Repository Metadata

- **Current**: [what exists now]
- **Recommended**: [specific changes]
- **Why**: [reasoning with keyword strategy]

#### 2. README Optimization

- Section-by-section recommendations
- Provide draft text for critical sections
- Keyword placement strategy

#### 3. Topics/Tags

- **Current topics**: [list]
- **Remove**: [list with reasons]
- **Add**: [list with reasons and keyword research]

#### 4. Documentation Gaps

- **Missing files**: [list]
- **Priority order** for creation
- **Template recommendations**

#### 5. AEO Strategy

- Structured content improvements
- Semantic clarity enhancements
- Metadata completeness

#### 6. Distribution Plan

- Immediate sharing opportunities
- Content creation roadmap
- Community engagement targets

### Implementation Checklist

- [ ] Immediate actions
- [ ] Short-term tasks
- [ ] Ongoing activities

## Important Constraints

- **Never suggest**: Time estimates for implementation
- **Always provide**: Specific, actionable text recommendations
- **Validate**: All keyword suggestions against repository's actual purpose
- **Balance**: SEO optimization with genuine value and readability
- **Prioritize**: Quick wins that deliver immediate ranking improvements

## Success Metrics

Track these after implementing recommendations:

- GitHub search position for target keywords
- Google search appearances
- Stars/watchers growth rate
- External referral traffic
- Community engagement (issues, PRs, discussions)

## Best Practices Reference

### Ranking Factor Hierarchy

1. Keywords in repository name (highest impact)
2. Keywords in About section
3. Keywords in Topics
4. Stars count
5. Watchers and forks
6. Recent activity

### Topic Selection Strategy

- Use 8-12 topics (not all 20)
- Include precise technical keywords
- For new repos: **avoid saturated tags** (python, react, javascript)
- Target trending niche tags with fewer competing repos
- Balance broad discoverability with specific targeting

### README SEO Elements

- Primary keyword in title and first paragraph
- Keywords in section headings (H2, H3)
- Descriptive alt text for images
- Internal links to documentation
- Code block descriptions with keywords

### Google Search Optimization

- GitHub repos rank exceptionally well in Google
- Focus on technical long-tail keywords
- Include troubleshooting and how-to sections
- Use descriptive commit messages (also indexed)

## Execution Guidelines

**Execute this analysis thoroughly:**

1. **Read actual repository files** rather than making assumptions
2. **Provide copy-paste ready text** for immediate implementation
3. **Show before/after examples** for all recommendations
4. **Validate keywords** against actual search trends
5. **Prioritize actionable changes** over theoretical improvements

## Related Skills

- `conducting-research` - For deep-dive keyword and competitor research
- `writing-documentation` - For creating missing documentation files
- `analyzing-repositories` - For technical repository analysis

## References

Detailed reference documentation:

- [SEO Best Practices](references/seo-best-practices.md) - Complete SEO optimization guide
- [AEO Principles](references/aeo-principles.md) - Answer engine optimization
- [Keyword Research Guide](references/keyword-research.md) - Finding the right keywords
- [Metadata Optimization](references/metadata-optimization.md) - Repository metadata details
- [README Optimization Guide](references/readme-optimization.md) - README best practices
- [Distribution Strategies](references/distribution-strategies.md) - Promotion and outreach
- [Success Metrics](references/success-metrics.md) - Tracking and measurement
