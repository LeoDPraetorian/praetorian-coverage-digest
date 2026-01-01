# Source Validation

**Quality indicators and validation checklist for web research sources.**

## Quality Indicators

| Indicator      | Good Sign         | Warning Sign            |
| -------------- | ----------------- | ----------------------- |
| **Date**       | Within 1-2 years  | >3 years old            |
| **Author**     | Official/verified | Anonymous               |
| **Engagement** | High votes/stars  | No engagement           |
| **Version**    | Matches target    | Different major version |
| **Domain**     | Official/known    | Unknown domain          |
| **Updates**    | Recently updated  | Abandoned               |

---

## Source Priority Matrix

### Priority 1: Official Documentation

**Characteristics:**

- Published on official domain (docs.\*, developer.\*)
- Maintained by library/service author
- Version-specific and up-to-date
- Includes API reference and guides

**Validation:**

- ✅ Check domain ownership (WHOIS, SSL cert)
- ✅ Verify version matches target
- ✅ Confirm last update date

**Examples:**

- https://react.dev
- https://docs.github.com
- https://developer.mozilla.org

---

### Priority 2: GitHub Official Repositories

**Characteristics:**

- Official repository (org/repo matches library name)
- High star count (>1k for popular libraries)
- Active maintenance (recent commits)
- Issues/discussions with maintainer responses

**Validation:**

- ✅ Verify org ownership (check npm package, official docs)
- ✅ Check commit frequency (weekly/monthly)
- ✅ Review issue response time

**Examples:**

- https://github.com/facebook/react
- https://github.com/vercel/next.js
- https://github.com/TanStack/query

---

### Priority 3: Reputable Engineering Blogs

**Characteristics:**

- Published by known companies/organizations
- Author credentials visible
- Technical depth and code examples
- Editorial review process

**Validation:**

- ✅ Verify publisher reputation
- ✅ Check author LinkedIn/GitHub
- ✅ Cross-reference claims with official docs

**Examples:**

- engineering.fb.com (Meta)
- vercel.com/blog (Vercel)
- aws.amazon.com/blogs (AWS)
- netlify.com/blog (Netlify)

---

### Priority 4: Stack Overflow

**Characteristics:**

- High vote count (>10 votes)
- Accepted answer (green checkmark)
- Recent activity (within 2 years)
- Multiple confirming comments

**Validation:**

- ✅ Check vote count (higher = better)
- ✅ Verify answer date (recent > old)
- ✅ Read comments for caveats
- ✅ Test code snippets before trusting

**Red Flags:**

- ❌ Answer has 0 or negative votes
- ❌ No accepted answer
- ❌ Comments mention the answer is outdated
- ❌ Code has obvious errors

---

### Priority 5: Community Blogs

**Characteristics:**

- dev.to, medium.com, personal blogs
- Individual authors (not companies)
- Variable quality and accuracy
- May lack peer review

**Validation:**

- ✅ Check author credentials (bio, GitHub, Twitter)
- ✅ Verify claims against official docs
- ✅ Look for engagement (claps, comments, shares)
- ✅ Cross-reference with other sources

**Trust Signals:**

- Author has other well-received articles
- Author is contributor to mentioned libraries
- Article has high engagement (>100 claps/reactions)
- Code examples work and are well-explained

**Warning Signs:**

- No author bio or credentials
- Claims contradict official docs
- Code examples have errors
- Article is tutorial-only with no explanation

---

### Priority 6: General Results

**Characteristics:**

- Unknown domains
- Aggregator sites (not original sources)
- AI-generated content
- Copy-pasted from Stack Overflow

**Validation:**

- ✅ Verify every claim with official docs
- ✅ Check if content is copied (search excerpts)
- ✅ Test all code examples
- ✅ Prefer original sources over aggregators

**When to Use:**

- Other sources unavailable
- Niche/new topics with limited coverage
- As supplemental (never primary) source

**Never Trust Without Verification:**

- Tutorial aggregators (tutorialspoint, geeksforgeeks, w3schools)
- AI-generated content sites
- Sites with excessive ads
- Sites with no author attribution

---

## Date Validation

### Recency Requirements by Topic

| Topic Type                 | Max Age   | Rationale                              |
| -------------------------- | --------- | -------------------------------------- |
| **Frontend frameworks**    | 1-2 years | Rapid evolution (React 16→19)          |
| **Build tools**            | 1-2 years | Frequent major changes (Vite, esbuild) |
| **Backend frameworks**     | 2-3 years | More stable (Express, Fastify)         |
| **Cloud services**         | 1 year    | Constant new features (AWS, GCP)       |
| **Core language features** | 3-5 years | Stable (JavaScript basics)             |
| **Security practices**     | 1 year    | Threat landscape evolves               |

### Handling Outdated Information

When source is outdated but useful:

1. **Note the age prominently** in synthesis
2. **Check official changelog** for breaking changes
3. **Search for updated version** of same article
4. **Supplement with recent sources** to confirm still valid

**Example:**

```markdown
### Authentication Patterns

Source: [JWT Authentication Guide](https://example.com/jwt-2022) (2022)

**Date Caveat**: This guide is from 2022. Since then:

- Node.js 20 introduced native fetch API
- Express 5.0 changed error handling
- bcrypt deprecated in favor of argon2

**Updated approach**: [Current Auth Best Practices](https://example.com/auth-2025) (2025)
```

---

## Version Matching

### Critical Version Fields

| Field                   | Where to Check                  | Importance |
| ----------------------- | ------------------------------- | ---------- |
| **Library version**     | package.json, documentation     | Critical   |
| **Language version**    | runtime (Node.js, Python)       | High       |
| **Framework version**   | Major releases (React 18 vs 19) | Critical   |
| **Dependency versions** | Breaking changes in deps        | Medium     |

### Version Mismatch Handling

When source version ≠ target version:

1. **Check changelog** for breaking changes
2. **Search for migration guide** (e.g., "React 18 to 19 migration")
3. **Note version difference** in synthesis
4. **Test code examples** against target version

**Example:**

```markdown
### Server Components

Source: [Next.js 13 App Router](https://example.com/next13) (Next.js 13)

**Version Note**: Our project uses Next.js 14. Key differences:

- Turbopack now stable (was experimental in 13)
- Server Actions stabilized (different syntax from 13)
- Metadata API changed

**Updated approach**: [Next.js 14 Documentation](https://nextjs.org/docs)
```

---

## Conflict Resolution

### When Sources Disagree

| Scenario                   | Resolution Strategy                      |
| -------------------------- | ---------------------------------------- |
| **Official vs Community**  | Trust official unless proven wrong       |
| **Recent vs Old**          | Prefer recent for evolving tech          |
| **High-vote vs Low-vote**  | Trust high engagement                    |
| **Library author vs User** | Trust library author on design decisions |

### Documenting Conflicts

Always note conflicts in synthesis:

```markdown
### State Management Approach

**Conflicting Information:**

- **Source A** (Official React docs): "Context is sufficient for most apps"
- **Source B** (Community blog): "Always use Redux for production apps"

**Resolution**: Official docs (Source A) are more trustworthy. Redux is overkill for apps without complex state. Use Context + useReducer first, upgrade to Redux only when needed.

**Sources:**

- [React Context Documentation](https://react.dev/context)
- [When to Use Redux](https://blog.example.com/redux) (community opinion)
```

---

## Red Flags

### Immediate Disqualifiers

- **No HTTPS** on documentation site
- **Excessive ads** drowning content
- **Broken code examples** (syntax errors)
- **Copy-pasted without attribution**
- **AI-generated with hallucinations**

### Warning Signs

- Author has no credentials or portfolio
- Content contradicts official docs without explanation
- Tutorial skips error handling entirely
- Code uses deprecated APIs without mention
- No engagement (0 votes, 0 comments, 0 stars)

---

## Validation Checklist

Before citing a source, verify:

- [ ] **Date**: Published or updated within acceptable timeframe?
- [ ] **Author**: Credible (official, verified, or community-trusted)?
- [ ] **Version**: Matches or compatible with target version?
- [ ] **Domain**: Known, reputable, secure (HTTPS)?
- [ ] **Engagement**: Positive votes/stars/comments?
- [ ] **Accuracy**: Claims align with official docs?
- [ ] **Code**: Examples work and follow best practices?
- [ ] **Maintenance**: Recently updated or actively maintained?

**Only cite sources that pass this checklist.**
