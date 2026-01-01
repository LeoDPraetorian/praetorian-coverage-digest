# Query Templates

**Complete search query patterns organized by research intent.**

## Official Documentation Queries

```
'{library} official documentation'
'{library} docs {version}'
'site:{official-domain} {topic}'
'{library} API reference {function}'
'{library} {version} documentation'
'developer.{company}.com {topic}'
```

**Examples:**

```
'Express.js official documentation'
'React docs 19'
'site:docs.github.com actions'
'lodash API reference debounce'
```

---

## How-To / Tutorial Queries

```
'{topic} tutorial {year}'
'how to {action} with {library}'
'{library} getting started guide'
'{topic} step by step'
'{library} beginner tutorial'
'{action} in {library} example'
```

**Examples:**

```
'Next.js tutorial 2025'
'how to handle authentication with Express'
'TanStack Query getting started guide'
'deployment step by step'
```

---

## Troubleshooting Queries

```
'{error message}' (exact match with quotes)
'{library} {error-type} fix'
'site:stackoverflow.com {library} {problem}'
'site:github.com {library} issues {problem}'
'{library} {error-code} solution'
```

**Examples:**

```
'"TypeError: Cannot read property of undefined"'
'React hydration mismatch fix'
'site:stackoverflow.com Next.js 404 error'
'site:github.com axios issues timeout'
```

---

## Comparison / Best Practices Queries

```
'{option-a} vs {option-b} {year}'
'{topic} best practices {year}'
'{library} recommended patterns'
'when to use {library}'
'{library} vs {alternative} comparison'
'{topic} performance comparison'
```

**Examples:**

```
'Zustand vs Redux 2025'
'React state management best practices 2025'
'TanStack Query recommended patterns'
'when to use GraphQL'
```

---

## GitHub-Specific Queries

```
'site:github.com {library} example'
'site:github.com {org}/{repo} {topic}'
'{library} github issues {problem}'
'{library} discussions {topic}'
'site:github.com {library} sample code'
```

**Examples:**

```
'site:github.com Express.js middleware example'
'site:github.com vercel/next.js authentication'
'TanStack Query github issues refetch'
'React discussions concurrent features'
```

---

## Version-Specific Queries

```
'{library} {version} migration guide'
'{library} upgrade from {old-version} to {new-version}'
'{library} {version} changelog'
'{library} {version} breaking changes'
'{library} {version} new features'
```

**Examples:**

```
'React 19 migration guide'
'Node.js upgrade from 18 to 20'
'Next.js 14 changelog'
'TypeScript 5.3 breaking changes'
```

---

## API / Integration Queries

```
'{service} API documentation'
'{service} REST API reference'
'{service} SDK {language}'
'{service} authentication guide'
'{service} rate limits'
'{service-a} integrate with {service-b}'
```

**Examples:**

```
'GitHub API documentation'
'Stripe REST API reference'
'AWS SDK JavaScript'
'Auth0 authentication guide'
'GitHub integrate with Linear'
```

---

## Query Strategy

### Progressive Refinement

1. **Start broad**: `'{library} documentation'`
2. **Add specificity**: `'{library} {specific-feature} guide'`
3. **Target exact need**: `'{library} {feature} {use-case} example'`

### Domain Filtering

Use `site:` operator to target high-quality sources:

```
site:docs.github.com        # GitHub official docs
site:developer.mozilla.org  # MDN Web Docs
site:stackoverflow.com      # Stack Overflow
site:github.com             # GitHub repos/issues
site:dev.to                 # Dev.to blog posts
```

### Year Filtering

Add year to queries for recent information:

```
'{topic} tutorial 2025'
'{library} best practices 2025'
'{option-a} vs {option-b} 2025'
```

**Critical**: Always use current year (2025) for "best practices" and comparison queries.

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
'React best practices 2018'  # Use 2025 instead
'Node.js tutorial 2020'      # Use 2025 instead
```

### ✅ Good Queries

```
'React Server Components tutorial 2025'
'Next.js 14 authentication with NextAuth'
'site:github.com TanStack/query infinite scroll example'
'site:stackoverflow.com Express.js CORS preflight error'
```
