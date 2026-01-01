# Query Templates

**Search query patterns for Perplexity research organized by intent type.**

## Official Documentation Queries

```
'{library} official documentation'
'{library} docs {version}'
'{library} API reference'
'{library} getting started guide'
'developer.{company}.com {topic}'
```

**Examples:**

```
'React official documentation'
'Next.js 14 docs'
'TanStack Query API reference'
'AWS Lambda developer guide'
```

---

## How-To / Tutorial Queries

```
'how to {action} with {library}'
'{library} tutorial {year}'
'{library} getting started'
'{action} step by step'
'{library} beginner guide'
```

**Examples:**

```
'how to implement authentication with NextAuth'
'TanStack Query tutorial 2025'
'Zustand getting started'
'deploy Next.js to Vercel step by step'
```

---

## Troubleshooting Queries

```
'{error message} solution'
'{library} {error-type} fix'
'resolve {error} in {library}'
'{library} {error-code}'
```

**Examples:**

```
'CORS preflight error Express solution'
'React hydration mismatch fix'
'resolve TypeScript ESM import errors'
'Next.js 404 on dynamic routes'
```

---

## Comparison / Best Practices Queries

```
'{option-a} vs {option-b} {year}'
'{topic} best practices {year}'
'{library} recommended patterns'
'when to use {library}'
'{library} vs {alternative}'
```

**Examples:**

```
'Zustand vs Redux 2025'
'React state management best practices 2025'
'TanStack Query recommended patterns'
'when to use GraphQL over REST'
```

---

## Research Queries (Deep Dive)

```
'research {topic}'
'{topic} comprehensive guide'
'{topic} in-depth analysis'
'understand {concept} deeply'
'{topic} architecture and design'
```

**Examples:**

```
'research large language model architectures'
'React Server Components comprehensive guide'
'microservices architecture in-depth analysis'
'understand Kubernetes networking deeply'
```

---

## Reasoning / Analysis Queries

```
'analyze {problem}'
'compare tradeoffs {option-a} vs {option-b}'
'evaluate {approach} for {use-case}'
'pros and cons of {technology}'
'when should I use {option-a} instead of {option-b}'
```

**Examples:**

```
'analyze tradeoffs between REST and GraphQL'
'compare event-driven vs request-response architecture'
'evaluate serverless vs containers for microservices'
'pros and cons of monorepo vs polyrepo'
```

---

## Version-Specific Queries

```
'{library} {version} migration guide'
'{library} upgrade from {old} to {new}'
'{library} {version} changelog'
'{library} {version} breaking changes'
'{library} {version} new features'
```

**Examples:**

```
'React 19 migration guide'
'Next.js upgrade from 13 to 14'
'TypeScript 5.3 changelog'
'Node.js 20 breaking changes'
```

---

## API / Integration Queries

```
'{service} API documentation'
'{service} REST API reference'
'{service} SDK {language}'
'{service} authentication guide'
'{service-a} integrate with {service-b}'
```

**Examples:**

```
'Stripe API documentation'
'GitHub REST API reference'
'AWS SDK JavaScript'
'Auth0 authentication guide'
'Jira integrate with Linear'
```

---

## Query Strategy

### Progressive Refinement

1. **Start broad**: `'{library} documentation'`
2. **Add specificity**: `'{library} {feature} guide'`
3. **Target exact need**: `'{library} {feature} {use-case}'`

**Example progression:**

```
1. "React documentation"
2. "React Server Components guide"
3. "React Server Components async data fetching patterns"
```

### Year Filtering

Add year to queries for recent information:

```
'{topic} 2025'
'{library} best practices 2025'
'{option-a} vs {option-b} 2025'
```

**Critical**: Always use current year for "best practices" and comparison queries.

---

## Command-Specific Query Patterns

### For `research` Command

Use comprehensive, research-oriented phrasing:

```
"research {topic}"
"comprehensive guide to {topic}"
"in-depth analysis of {topic}"
"{topic} architecture and best practices"
```

### For `search` Command

Use specific, factual query terms:

```
"{specific fact or definition}"
"{library} {version} release date"
"{exact error message}"
```

### For `ask` Command

Use natural question format:

```
"What is {concept}?"
"How does {technology} work?"
"Why is {approach} recommended?"
"When should I use {option}?"
```

### For `reason` Command

Use analytical phrasing:

```
"analyze tradeoffs between {a} and {b}"
"compare {option-a} vs {option-b}"
"evaluate {approach} for {use-case}"
"pros and cons of {technology}"
```

---

## Query Anti-Patterns

### ❌ Too Vague

```
'web development'
'JavaScript'
'API'
```

### ❌ Missing Context

```
'error fix'
'installation'
'tutorial'
```

### ❌ Outdated Year

```
'React best practices 2018'  # Use 2025
'Node.js tutorial 2020'      # Use 2025
```

### ✅ Good Queries

```
'React 19 Server Components tutorial 2025'
'Next.js 14 authentication with NextAuth'
'analyze tradeoffs between REST and GraphQL APIs'
'research large language model security vulnerabilities'
```

---

## Special Case: Perplexity-Specific Syntax

Unlike traditional search engines, Perplexity understands natural language. You don't need:

- Site operators (`site:github.com`)
- Boolean operators (`AND`, `OR`, `NOT`)
- Exact match quotes (though they still work)

**Instead, use natural phrasing:**

```
❌ Traditional: 'site:github.com react hooks example'
✅ Perplexity: 'React hooks examples from GitHub'

❌ Traditional: '"TypeError cannot read property" AND Next.js'
✅ Perplexity: 'TypeError cannot read property in Next.js'
```

Perplexity's AI understands intent without operators.

---

## Query Optimization Tips

1. **Be specific**: "React 19 Server Components" > "React"
2. **Include version**: "Next.js 14 authentication" > "Next.js auth"
3. **Add year for timely topics**: "LLM security 2025" > "LLM security"
4. **Use action verbs**: "implement OAuth 2.0" > "OAuth 2.0"
5. **Mention use case**: "Kubernetes for microservices" > "Kubernetes"
