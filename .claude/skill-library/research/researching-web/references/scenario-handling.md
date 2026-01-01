# Scenario Handling

**Common research scenarios and how to handle them effectively.**

---

## Scenario 1: Outdated Information

### Indicators

- Publication date >3 years old
- References deprecated APIs or libraries
- Uses version numbers far below current
- Comments mention "this is outdated"
- Code examples don't work

### Response Strategy

1. **Note the age prominently**

```markdown
**Date Caveat**: This guide is from 2020. Several practices have changed:

- Webpack 4 → Webpack 5 (breaking changes)
- React 16 → React 19 (Hooks, Suspense, Server Components)
- Node.js 12 → Node.js 20 (native fetch, test runner)
```

2. **Search for updated version**

```
'{original-topic} {current-year}'
'{library} migration guide'
'{library} {new-version} changelog'
```

3. **Check official changelog**

- Go to official docs
- Find "Changelog" or "Release Notes"
- Look for breaking changes between versions

4. **Supplement with recent sources**

- Find 2-3 recent sources (within 1-2 years)
- Verify old practices still valid
- Note what changed

### Output Example

```markdown
### State Management Patterns

**Original Source**: [React Context Guide 2020](https://example.com/context-2020)

**Date Caveat**: This guide is from 2020. Since then:

- React 18 added `useTransition` and `useDeferredValue`
- Concurrent features changed Context behavior
- Server Components offer alternative patterns

**Updated Approach**: [React 19 State Management](https://react.dev/learn/managing-state) (2024)

- Use Context for theme/auth (rarely changes)
- Use Zustand/TanStack Query for frequent updates
- Consider Server Components for server state
```

---

## Scenario 2: Conflicting Sources

### Indicators

- Different sources recommend different approaches
- Official docs say X, community says Y
- Old best practice contradicted by new practice
- Multiple valid solutions (not just one right way)

### Response Strategy

1. **Identify conflict clearly**

```markdown
**Conflicting Information:**

- **Official React Docs**: "Context is fine for most apps"
- **Community Blog**: "Never use Context, always Redux"
```

2. **Assess authority**

| Source Type      | Authority | When to Trust                |
| ---------------- | --------- | ---------------------------- |
| Official docs    | Highest   | Always (unless proven wrong) |
| Library author   | High      | Design decisions, API usage  |
| Core contributor | High      | Implementation details       |
| Company eng blog | Medium    | Real-world patterns          |
| Community blog   | Low       | Cross-verify claims          |
| Stack Overflow   | Variable  | Check votes + comments       |

3. **Prefer recent over old**

If both sources credible, trust the newer one (tech evolves).

4. **Look for middle ground**

Often both sides have partial truth:

```markdown
**Resolution**:

- Context is sufficient for low-frequency updates (theme, auth)
- Redux is overkill unless you have complex state
- Consider middle ground: Zustand (simpler than Redux)
```

### Output Example

```markdown
### GraphQL vs REST API

**Conflicting Information:**

- **Source A** (GraphQL.org): "GraphQL replaces REST for all APIs"
  - Authority: High (official GraphQL site)
  - Date: 2024

- **Source B** (AWS Blog): "REST is simpler for most use cases"
  - Authority: High (AWS engineering team)
  - Date: 2024

**Resolution**:
Both are partially correct. Choose based on use case:

| Use Case               | Recommendation | Why                        |
| ---------------------- | -------------- | -------------------------- |
| Public API             | REST           | Simpler for consumers      |
| Complex data fetching  | GraphQL        | Reduces over-fetching      |
| Mobile app             | GraphQL        | Flexible, reduces requests |
| Internal microservices | REST           | Standard, easy to cache    |

**Sources:**

- [When to Use GraphQL](https://graphql.org/learn/thinking-in-graphs/)
- [REST vs GraphQL Trade-offs](https://aws.amazon.com/compare/rest-vs-graphql/)
```

---

## Scenario 3: No Results Found

### Indicators

- WebSearch returns 0-2 relevant results
- All results are generic or off-topic
- Query is too specific or uses wrong terminology
- Topic is very new or niche

### Response Strategy

1. **Broaden search terms**

```
Original: 'Next.js 14 middleware authentication JWT refresh token rotation'
Broader:  'Next.js authentication middleware'
Broader:  'JWT refresh token rotation'
```

2. **Try alternative terminology**

Different communities use different terms:

| Concept               | Alternative Terms                    |
| --------------------- | ------------------------------------ |
| Authentication        | Auth, login, sign-in, access control |
| State management      | Store, state, data management        |
| Server-side rendering | SSR, pre-rendering, hydration        |
| API                   | Endpoint, service, backend, REST     |

3. **Check if topic too new/niche**

- Search GitHub for recent issues/PRs
- Check if feature is in beta/experimental
- Look for RFC (Request for Comments) documents

4. **Fall back to related topics**

```
Original: 'Next.js 14 partial pre-rendering'
Fallback: 'Next.js 14 rendering strategies'
Fallback: 'Next.js 13 incremental static regeneration'
```

### Output Example

```markdown
## Web Research: Next.js Partial Pre-Rendering (PPR)

### Search Queries Used

1. 'Next.js partial pre-rendering' - 2 results (both generic)
2. 'Next.js PPR feature' - 1 result (Next.js blog)
3. 'Next.js 14 rendering strategies' - 12 results (found context)

**Note**: PPR is a very new feature (experimental in Next.js 14). Limited documentation available.

### Sources Found

#### Official Documentation

- [Next.js 14 Release Notes](https://nextjs.org/blog/next-14) - Official blog
  - Key finding: PPR is experimental, enables static + dynamic in same route
  - Status: Experimental flag required
  - Last updated: October 2023

#### GitHub Resources

- [PPR RFC Discussion](https://github.com/vercel/next.js/discussions/12345) - GitHub discussion
  - Key finding: Design decisions and trade-offs explained by team
  - Status: Active discussion
  - Last activity: January 2025

### Key Findings

1. **PPR is Experimental (Limited Documentation)**
   - Source: [Next.js 14 Release Notes](https://nextjs.org/blog/next-14)
   - Details: Feature is experimental and may change. Enable with `experimental.ppr = true` in next.config.js
   - Version note: Only available in Next.js 14+

### Recommendations

1. **Wait for Stable Release**
   - Rationale: Experimental features may have breaking changes
   - Alternative: Use ISR (Incremental Static Regeneration) for similar benefits

2. **Monitor GitHub Discussions**
   - Source: [PPR RFC Discussion](https://github.com/vercel/next.js/discussions/12345)
   - Rationale: Design is still being refined based on community feedback
```

---

## Scenario 4: Paywalled Content

### Indicators

- Medium article requires subscription
- Technical paper behind paywall
- Course/tutorial platform (Udemy, Pluralsight)
- Conference talk video (requires ticket)

### Response Strategy

1. **Note the paywall**

```markdown
**Paywalled Source**: [Advanced Next.js Patterns](https://medium.com/example)

- Requires Medium subscription
- Author: Known expert (10+ years Next.js)
- Not evaluated due to paywall
```

2. **Search for alternative free sources**

- Author's personal blog
- Same content on dev.to or Hashnode
- YouTube video of conference talk
- Open-access preprint (arXiv for academic papers)

3. **Check if cached version exists**

- Google Cache: `cache:example.com/article`
- Archive.org: `https://web.archive.org/web/*/example.com/article`
- Outline.com: `https://outline.com/example.com/article` (may not work)

4. **Do NOT attempt to bypass paywall**

- No screen scraping
- No password sharing
- No pirated PDFs
- Respect author's work

### Output Example

```markdown
## Web Research: Advanced React Performance Optimization

### Sources Found

#### Paywalled Sources (Not Evaluated)

- [React Performance Deep Dive](https://medium.com/paywall-article) - Medium (paywalled)
  - Author: Kent C. Dodds (React expert)
  - Note: Requires Medium subscription

#### Alternative Free Sources

- [React Performance Guide](https://react.dev/learn/performance) - Official React docs
  - Key finding: Comprehensive guide to React.memo, useMemo, useCallback
  - Free and official

- [Kent C. Dodds Blog](https://kentcdodds.com/blog/performance) - Personal blog
  - Key finding: Similar content to Medium article, freely available
  - Author: Same as paywalled source

### Recommendation

Use official React docs and Kent's free blog instead of paywalled Medium article.
```

---

## Scenario 5: Version Mismatch

### Indicators

- Source uses React 16, project uses React 19
- Tutorial shows Node.js 12, you're on Node.js 20
- Stack Overflow answer from 2018
- Code uses deprecated APIs

### Response Strategy

1. **Check changelog for breaking changes**

```
'{library} {old-version} to {new-version} migration'
'{library} breaking changes {new-version}'
'{library} changelog'
```

2. **Search for updated version of same content**

```
'{original-topic} {current-year}'
'{library} {new-version} tutorial'
```

3. **Note version differences in output**

```markdown
**Version Note**: This guide uses React 16. Our project uses React 19, which has:

- Class components → Hooks (different API)
- componentDidMount → useEffect (different syntax)
- Suspense stable (was experimental in 16)
```

4. **Test code examples**

- Copy code to project
- Check for deprecation warnings
- Verify behavior matches expected

### Output Example

```markdown
### React Lifecycle Methods

**Source**: [React Component Lifecycle](https://example.com/lifecycle-2018) (2018)

**Version Mismatch**: This guide uses React 16 class components. Our project uses React 19 with hooks.

**Migration Guide**:

| React 16 (Class)          | React 19 (Hooks)              |
| ------------------------- | ----------------------------- |
| `componentDidMount()`     | `useEffect(() => {}, [])`     |
| `componentDidUpdate()`    | `useEffect(() => {})`         |
| `componentWillUnmount()`  | `useEffect(() => () => {})`   |
| `shouldComponentUpdate()` | `React.memo()` or `useMemo()` |

**Updated Source**: [React Hooks Guide](https://react.dev/learn/hooks) (official, 2024)
```

---

## Scenario 6: Multiple Valid Approaches

### Indicators

- Different sources recommend different solutions
- All approaches work (no clear winner)
- Trade-offs between approaches
- "It depends on your use case"

### Response Strategy

1. **Present all valid approaches**

Don't pick a winner if there isn't one.

2. **Create decision matrix**

| Approach   | Pros         | Cons                    | Use When          |
| ---------- | ------------ | ----------------------- | ----------------- |
| Approach A | Simple, fast | Limited features        | Simple use cases  |
| Approach B | Feature-rich | Complex, learning curve | Complex use cases |
| Approach C | Balanced     | Medium complexity       | Most use cases    |

3. **Provide selection criteria**

Help reader choose based on their context:

```markdown
### Which State Manager?

**Context**:

- Use when: Theme, auth, user preferences
- Pros: Built-in React, no dependencies
- Cons: Re-renders on any change

**Zustand**:

- Use when: App-wide state, frequent updates
- Pros: Simple API, optimized re-renders
- Cons: Extra dependency

**Redux**:

- Use when: Complex state, time-travel debugging
- Pros: DevTools, middleware, predictable
- Cons: Boilerplate, learning curve

**Recommendation**: Start with Context, upgrade to Zustand if performance issues, use Redux only for very complex state.
```

### Output Example

```markdown
## Web Research: React State Management Solutions

### Key Findings

**Multiple Valid Approaches**: There's no single "best" state manager. Choice depends on use case.

### Comparison Matrix

| Solution | Complexity | Bundle Size | Re-render Optimization | Use Case              |
| -------- | ---------- | ----------- | ---------------------- | --------------------- |
| Context  | Low        | 0 KB        | Manual                 | Theme, auth           |
| Zustand  | Low        | 1.2 KB      | Automatic              | App state             |
| Jotai    | Medium     | 2.9 KB      | Atom-based             | Complex derived state |
| Redux    | High       | 9.5 KB      | Manual                 | Enterprise apps       |
| MobX     | Medium     | 16 KB       | Automatic              | OOP-style state       |

### Decision Guide

**Choose Context if:**

- State rarely changes (theme, auth, user prefs)
- No external dependencies desired
- App is simple (few components)

**Choose Zustand if:**

- Need app-wide state with frequent updates
- Want automatic re-render optimization
- Prefer simple API (no boilerplate)

**Choose Redux if:**

- App has very complex state
- Need time-travel debugging
- Team familiar with Redux patterns
- Want middleware (logging, persistence)

### Recommendations

1. **Start with Context** - Use for theme, auth, user preferences
2. **Upgrade to Zustand** - If Context causes performance issues
3. **Only use Redux** - If you need DevTools, middleware, or team demands it

**Don't prematurely optimize**: Context is sufficient for most apps.

### Sources

- [React Context API](https://react.dev/learn/passing-data-deeply-with-context)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Redux Documentation](https://redux.js.org)
- [State Management Comparison](https://www.youtube.com/watch?v=example) (2024)
```

---

## Summary Table

| Scenario             | Key Actions                                   | Output Must Include            |
| -------------------- | --------------------------------------------- | ------------------------------ |
| **Outdated Info**    | Note age, search for updates, check changelog | Date caveat, updated source    |
| **Conflicting**      | Assess authority, prefer recent, find middle  | Both sides, resolution         |
| **No Results**       | Broaden terms, try alternatives, check if new | Note limited info              |
| **Paywalled**        | Note paywall, find free alternatives          | Paywall note, alternatives     |
| **Version Mismatch** | Check changelog, note differences, test code  | Version note, migration guide  |
| **Multiple Valid**   | Present all, create decision matrix           | Comparison, selection criteria |
