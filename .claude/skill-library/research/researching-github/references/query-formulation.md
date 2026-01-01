# Query Formulation Patterns

Systematic approach to formulating effective GitHub search queries.

## Query Strategy: Broad → Specific → Niche

### Phase 1: Broad Survey

**Purpose:** Understand the landscape

**Pattern:** `{core-concept}`

**Examples:**

- `rate limiting`
- `authentication`
- `caching`
- `message queue`

**Expected results:** 100s-1000s of repositories

### Phase 2: Specific Technology

**Purpose:** Target implementation stack

**Pattern:** `{concept} {language/framework}`

**Examples:**

- `rate limiting golang`
- `authentication react`
- `caching redis`
- `message queue rabbitmq`

**Expected results:** 10s-100s of repositories

### Phase 3: Niche Use Case

**Purpose:** Exact problem/context

**Pattern:** `{concept} {tech} {context}`

**Examples:**

- `rate limiting golang middleware http`
- `authentication react jwt hooks`
- `caching redis distributed go`
- `message queue rabbitmq fanout pattern`

**Expected results:** 5-50 repositories

## Query Templates by Task

### Finding Libraries

```
{library-type} language:{lang}
Example: "rate limiter" language:go
```

### Finding Implementations

```
{pattern} {language} example
Example: circuit breaker go example
```

### Finding Issues/Solutions

```
{error-message} is:issue
Example: "connection refused" is:issue language:go
```

### Comparing Alternatives

```
{concept} OR {alternative} language:{lang}
Example: redis OR memcached language:go
```

## Filter Progression

### Level 1: Essential Filters

```
query language:{lang}
```

### Level 2: Quality Filters

```
query language:{lang} stars:>100
```

### Level 3: Maintenance Filters

```
query language:{lang} stars:>100 pushed:>2024-01-01
```

### Level 4: Production Filters

```
query language:{lang} stars:>100 pushed:>2024-01-01 license:mit archived:false
```

## See Also

- [Search Filters Reference](search-filters.md)
