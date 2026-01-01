# Output Format

**Structured research output format with citations, findings, and recommendations.**

## Standard Output Template

```markdown
## Web Research: {topic}

### Search Queries Used

1. '{query1}' - {N} relevant results found
2. '{query2}' - {N} relevant results found
3. '{query3}' - {N} relevant results found (if applicable)

### Sources Found

#### Official Documentation

- [{Title}]({url}) - {brief description}
  - Key finding: {what was learned}
  - Version: {if applicable}
  - Last updated: {date}

#### Tutorials/Guides

- [{Title}]({url}) - {author/source}
  - Key finding: {what was learned}
  - Published: {date}
  - Author credentials: {brief}

#### Community Resources

- [{Title}]({url}) - {source type}
  - Key finding: {what was learned}
  - Credibility: {high/medium/low}
  - Engagement: {votes/stars/comments}

#### GitHub Resources

- [{Title}]({url}) - {repo/issue/discussion}
  - Key finding: {what was learned}
  - Stars: {count}
  - Last activity: {date}

### Key Findings

1. **{Finding 1 Title}**
   - Source: [{Source}]({url})
   - Details: {explanation with specifics}
   - Version note: {if applicable}

2. **{Finding 2 Title}**
   - Source: [{Source}]({url})
   - Details: {explanation with specifics}
   - Date caveat: {if source is old}

3. **{Finding 3 Title}**
   - Source: [{Source}]({url})
   - Details: {explanation with specifics}

### Conflicting Information

- **Topic**: {specific topic where sources disagree}
  - **Source A** ({authority level}): {claim A}
  - **Source B** ({authority level}): {claim B}
  - **Resolution**: {which to trust and why}

### Version/Date Caveats

- {caveat 1 about version-specific information}
- {caveat 2 about dated practices}

### Recommendations

1. **{Actionable recommendation 1}**
   - Rationale: {why this is recommended}
   - Source: [{Source}]({url})

2. **{Actionable recommendation 2}**
   - Rationale: {why this is recommended}
   - Alternative: {if multiple approaches valid}

### Sources

- [Official Documentation]({url1})
- [GitHub Repository]({url2})
- [Tutorial Guide]({url3})
- [Stack Overflow Discussion]({url4})
- [Engineering Blog Post]({url5})
```

---

## Real-World Example

```markdown
## Web Research: Next.js Authentication with NextAuth

### Search Queries Used

1. 'NextAuth.js official documentation' - 12 relevant results
2. 'Next.js 14 authentication tutorial 2025' - 8 relevant results
3. 'site:github.com nextauthjs example' - 15 relevant results

### Sources Found

#### Official Documentation

- [NextAuth.js Documentation](https://next-auth.js.org) - Official docs for NextAuth.js v5
  - Key finding: NextAuth v5 (Auth.js) has breaking changes from v4
  - Version: 5.0 (released 2024)
  - Last updated: January 2025

- [Next.js Authentication Guide](https://nextjs.org/docs/app/building-your-application/authentication) - Official Next.js docs
  - Key finding: Recommends NextAuth for session management in App Router
  - Version: Next.js 14
  - Last updated: December 2024

#### Tutorials/Guides

- [NextAuth v5 Migration Guide](https://authjs.dev/getting-started/migrating-to-v5) - Official migration docs
  - Key finding: v5 renamed to Auth.js, requires code changes for App Router
  - Published: November 2024
  - Author: NextAuth core team

- [Complete Next.js 14 Auth Tutorial](https://www.youtube.com/watch?v=example) - Lee Robinson (Vercel)
  - Key finding: Step-by-step App Router + NextAuth v5 setup
  - Published: January 2025
  - Author: VP of DevEx at Vercel

#### Community Resources

- [NextAuth Best Practices](https://dev.to/example/nextauth-best-practices) - dev.to article
  - Key finding: Custom callbacks for role-based access
  - Credibility: Medium (author is frontend dev)
  - Engagement: 250 reactions, 45 comments

#### GitHub Resources

- [NextAuth Example](https://github.com/nextauthjs/next-auth-example) - Official example repo
  - Key finding: Working example of all auth providers
  - Stars: 3.2k
  - Last activity: 2 days ago

- [NextAuth App Router Issue](https://github.com/nextauthjs/next-auth/issues/8978) - GitHub issue
  - Key finding: App Router middleware patterns
  - Status: Closed (resolved)
  - Last activity: December 2024

### Key Findings

1. **NextAuth v5 (Auth.js) is Current Stable Version**
   - Source: [NextAuth.js Documentation](https://next-auth.js.org)
   - Details: v5 was released in 2024 and renamed to Auth.js. It's designed for Next.js App Router and has breaking changes from v4. All new projects should use v5.
   - Version note: v4 is legacy, not recommended for new projects

2. **App Router Requires Different Configuration**
   - Source: [Next.js Authentication Guide](https://nextjs.org/docs/app/building-your-application/authentication)
   - Details: Auth must use Server Components and Server Actions. Middleware handles route protection. Previous Pages Router patterns don't work.
   - Date caveat: Many tutorials still show v4 + Pages Router (outdated)

3. **Session Management with Database Adapters**
   - Source: [NextAuth Example](https://github.com/nextauthjs/next-auth-example)
   - Details: Use Prisma, Drizzle, or other adapters for persistent sessions. Default JWT sessions work but lack server-side revocation.

### Conflicting Information

- **Topic**: Whether to use JWT or database sessions
  - **Source A** (NextAuth docs, official): "JWT sessions are simpler and don't require database"
  - **Source B** (dev.to community, medium): "Always use database sessions for security"
  - **Resolution**: Trust official docs. JWT is fine for most apps. Use database sessions only when you need server-side session revocation (e.g., logout from all devices).

### Version/Date Caveats

- Many Stack Overflow answers reference NextAuth v4 (pre-2024), which has different API
- Tutorials from before November 2024 may show old `[...nextauth].ts` pattern instead of new `auth.ts` export
- GitHub Copilot often suggests v4 patterns (trained on older code)

### Recommendations

1. **Use NextAuth v5 (Auth.js) with Next.js 14 App Router**
   - Rationale: Official recommendation, best integration with React Server Components
   - Source: [Next.js Authentication Guide](https://nextjs.org/docs/app/building-your-application/authentication)
   - Installation: `npm install next-auth@beta` (v5 is currently in beta channel)

2. **Start with JWT Sessions, Upgrade to Database Only If Needed**
   - Rationale: JWT sessions are simpler and don't require database setup. Database sessions add complexity but enable server-side revocation.
   - Alternative: If you need "logout from all devices" or session analytics, use Prisma adapter from the start

3. **Follow Official Example Repository**
   - Rationale: Working code with all providers (Google, GitHub, email, etc.)
   - Source: [NextAuth Example](https://github.com/nextauthjs/next-auth-example)

### Sources

- [NextAuth.js Documentation](https://next-auth.js.org)
- [Next.js Authentication Guide](https://nextjs.org/docs/app/building-your-application/authentication)
- [NextAuth v5 Migration Guide](https://authjs.dev/getting-started/migrating-to-v5)
- [NextAuth Example Repository](https://github.com/nextauthjs/next-auth-example)
- [Complete Next.js 14 Auth Tutorial (YouTube)](https://www.youtube.com/watch?v=example)
```

---

## Output Principles

### 1. Always Include URLs

Every claim must be traceable to a source:

```markdown
✅ GOOD:

- Key finding: React 19 stabilized Server Components
  - Source: [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)

❌ BAD:

- React 19 has Server Components (no source cited)
```

### 2. Date Everything

Tech evolves rapidly - dates matter:

```markdown
✅ GOOD:

- Published: January 2025
- Version: Next.js 14
- Last updated: December 2024

❌ BAD:

- Recent tutorial (when? last month? last year?)
```

### 3. Note Authority Level

Help readers assess trust:

```markdown
✅ GOOD:

- Author: Lee Robinson (VP of DevEx at Vercel)
- Source: Official React documentation
- Credibility: High (15k stars, maintained by core team)

❌ BAD:

- Some blog post says... (who? why should we trust them?)
```

### 4. Highlight Conflicts

Don't hide disagreements:

```markdown
✅ GOOD:
**Conflicting Information:**

- Official docs recommend X
- Community blog recommends Y
- Resolution: Trust official docs because...

❌ BAD:

- Most sources agree on X (which sources? what about dissenting views?)
```

### 5. Version-Specific Caveats

Prevent version mismatches:

```markdown
✅ GOOD:
**Version Note**: This guide uses React 18. Our project uses React 19, which has:

- Different Suspense behavior
- Server Components stable
- Automatic batching by default

❌ BAD:

- Here's how to do X (works in React 18, breaks in 19)
```

---

## Sections Explained

### Search Queries Used

**Purpose**: Show what you searched for, so others can reproduce or refine.

**Include**:

- Exact query string (with quotes if used)
- Number of relevant results found
- Why this query (if not obvious)

### Sources Found

**Purpose**: Organize sources by authority level (official > tutorials > community).

**Include**:

- Title (linked)
- Brief description (one sentence)
- Key finding (what you learned from this specific source)
- Date/version metadata
- Credibility indicators (stars, engagement, author)

### Key Findings

**Purpose**: Synthesize learnings across sources into actionable insights.

**Include**:

- Finding title (what you learned)
- Source citation (which URL)
- Details (specific, actionable)
- Version/date notes (if applicable)

### Conflicting Information

**Purpose**: Highlight disagreements between sources and resolve them.

**Include**:

- Specific topic of disagreement
- What each source claims
- Authority level of each source
- Your resolution (which to trust and why)

### Version/Date Caveats

**Purpose**: Warn about outdated information or version mismatches.

**Include**:

- What changed between versions
- How old sources differ from current state
- Breaking changes to watch for

### Recommendations

**Purpose**: Actionable next steps based on findings.

**Include**:

- What to do
- Why (rationale)
- Source backing the recommendation
- Alternatives (if multiple valid approaches)

### Sources

**Purpose**: Quick reference list of all URLs cited.

**Format**: Markdown list with descriptive link text (not "click here" or bare URLs).

---

## Format Variations

### Minimal Format (Quick Research)

Use when research is straightforward:

```markdown
## Web Research: {topic}

### Key Findings

1. **{Finding}** - [{Source}]({url}) ({date})
2. **{Finding}** - [{Source}]({url}) ({date})

### Recommendation

- {What to do} based on [{Source}]({url})
```

### Extended Format (Deep Research)

Add sections for complex topics:

```markdown
## Web Research: {topic}

### Background

- {Context needed to understand findings}

### Search Queries Used

- {queries}

### Sources Found

- {organized by type}

### Key Findings

- {synthesized insights}

### Implementation Examples

- {code snippets from sources}

### Performance Considerations

- {if applicable}

### Security Considerations

- {if applicable}

### Conflicting Information

- {disagreements resolved}

### Recommendations

- {actionable next steps}

### Sources

- {all URLs cited}
```

---

## Anti-Patterns

### ❌ No Citations

```markdown
React Server Components are great for performance.
NextAuth is the best auth solution.
```

**Fix**: Add source URLs for every claim.

### ❌ No Dates

```markdown
This tutorial shows how to use NextAuth.
```

**Fix**: Add publication date and check if still current.

### ❌ Burying Conflicts

```markdown
Most experts agree that...
```

**Fix**: Show both sides, resolve with reasoning.

### ❌ Version Agnostic

```markdown
Here's how to use React hooks.
```

**Fix**: Specify version (React 18 vs 19 have differences).

### ❌ Bare URLs

```markdown
Source: https://example.com/really/long/url/that/breaks/formatting
```

**Fix**: Use descriptive link text: `[React 19 Release Notes](url)`
