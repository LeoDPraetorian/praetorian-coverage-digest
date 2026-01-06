# Common Pitfalls

Critical mistakes when implementing GraphQL clients and how to avoid them.

## 1. GraphQL Injection via String Interpolation

### The Vulnerability

```go
// ❌ DANGEROUS: GraphQL injection vulnerability
func getRepository(userInput string) (*Response, error) {
    // Attacker can inject: " } mutation { deleteRepo(id: "123") { id } "
    query := fmt.Sprintf(`
        query {
            repository(name: "%s") {
                name
                description
            }
        }
    `, userInput)

    return client.Query(ctx, query, nil)
}
```

**Attack vector**: Malicious input like `" } mutation { deleteRepo(id: "123") { id }` breaks out of the query structure and executes arbitrary operations.

### The Solution

```go
// ✅ SAFE: Variable binding prevents injection
func getRepository(userInput string) (*Response, error) {
    query := `
        query GetRepo($name: String!) {
            repository(name: $name) {
                name
                description
            }
        }
    `

    variables := map[string]interface{}{
        "name": userInput, // Safely bound as typed variable
    }

    return client.Query(ctx, query, variables)
}
```

**Why it's safe**: GraphQL engine validates the variable type and escapes special characters automatically. The variable cannot break out of its designated position.

### Type-Safe Alternative (shurcooL/graphql)

```go
// ✅ SAFEST: Compile-time type checking
type Query struct {
    Repository struct {
        Name        githubv4.String
        Description githubv4.String
    } `graphql:"repository(name: $name)"`
}

func getRepository(name string) (*Query, error) {
    var query Query
    variables := map[string]interface{}{
        "name": githubv4.String(name),
    }
    err := client.Query(ctx, &query, variables)
    return &query, err
}
```

---

## 2. Ignoring Rate Limits Until Failure

### The Problem

```go
// ❌ BAD: No rate limit awareness
func fetchAllRepositories(repos []string) error {
    for _, repo := range repos {
        _, err := client.Query(ctx, query, map[string]interface{}{"repo": repo})
        if err != nil {
            // By now you've hit the rate limit and all subsequent requests fail
            return err
        }
    }
    return nil
}
```

**What happens**: Requests succeed until you exhaust the limit, then ALL remaining requests fail with 429 errors. No recovery, no visibility.

### The Solution

```go
// ✅ GOOD: Proactive rate limit monitoring
func fetchAllRepositories(repos []string) error {
    for _, repo := range repos {
        // Check BEFORE making request
        if err := rateLimiter.CheckAndWait(ctx, estimatedCost); err != nil {
            return err
        }

        resp, err := client.Query(ctx, queryWithRateLimit, map[string]interface{}{"repo": repo})
        if err != nil {
            return err
        }

        // Update from response
        rateLimiter.UpdateFromResponse(resp.RateLimit)

        // Log visibility
        log.Printf("Rate limit: %d/%d remaining, resets at %s",
            resp.RateLimit.Remaining,
            resp.RateLimit.Limit,
            resp.RateLimit.ResetAt)
    }
    return nil
}

// Always include rateLimit in your queries
const queryWithRateLimit = `
    query GetRepo($repo: String!) {
        repository(name: $repo) {
            name
        }
        rateLimit {
            cost
            remaining
            resetAt
        }
    }
`
```

---

## 3. Silent GraphQL Error Handling

### The Problem

```go
// ❌ BAD: Ignores GraphQL errors array
resp, err := client.Query(ctx, query, variables)
if err != nil {
    return err // Only catches HTTP/network errors
}

// GraphQL can return 200 OK with errors in the response body!
// resp.Errors might contain: [{"message": "Field 'foo' doesn't exist"}]
return processData(resp.Data) // Processing potentially incomplete data
```

**What happens**: GraphQL returns HTTP 200 even when queries partially fail. The `errors` array contains detailed error messages, but you never see them.

### The Solution

```go
// ✅ GOOD: Check both HTTP errors and GraphQL errors
resp, err := client.Query(ctx, query, variables)
if err != nil {
    return fmt.Errorf("request failed: %w", err)
}

// Always check GraphQL errors array
if len(resp.Errors) > 0 {
    for _, e := range resp.Errors {
        log.Printf("GraphQL error: %s (type: %s, path: %v)",
            e.Message, e.Type, e.Path)
    }

    // Decide: fail completely or handle partial data
    if hasBlockingErrors(resp.Errors) {
        return fmt.Errorf("GraphQL errors: %v", resp.Errors)
    }
    // Continue with partial data if acceptable
}

return processData(resp.Data)

func hasBlockingErrors(errors []GraphQLError) bool {
    for _, e := range errors {
        // RATE_LIMITED and FORBIDDEN are blocking
        if e.Type == "RATE_LIMITED" || e.Type == "FORBIDDEN" {
            return true
        }
    }
    return false
}
```

---

## 4. Non-Nullable Cursor on First Page

### The Problem

```graphql
# ❌ BAD: Cursor is non-nullable
query GetIssues($cursor: String!) {
  repository(owner: "org", name: "repo") {
    issues(first: 100, after: $cursor) {
      nodes {
        title
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

```go
// First page: cursor is nil
variables := map[string]interface{}{
    "cursor": nil, // ERROR: "Variable cursor of type String! was provided invalid value"
}
```

### The Solution

```graphql
# ✅ GOOD: Cursor is nullable
query GetIssues($cursor: String) {
  repository(owner: "org", name: "repo") {
    issues(first: 100, after: $cursor) {
      nodes {
        title
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

```go
// Use pointer to distinguish nil from empty string
var cursor *string // nil for first page

for {
    variables := map[string]interface{}{
        "cursor": cursor, // nil is valid for String (nullable)
    }

    resp, _ := client.Query(ctx, query, variables)

    if !resp.PageInfo.HasNextPage {
        break
    }

    // Update cursor for next page
    cursor = &resp.PageInfo.EndCursor
}
```

---

## 5. Page Size vs Query Complexity Mismatch

### The Problem

```go
// ❌ BAD: Large page size with deep nesting
query := `
    query {
        repositories(first: 100) {
            nodes {
                name
                issues(first: 100) {
                    nodes {
                        title
                        comments(first: 50) {
                            nodes { body }
                        }
                    }
                }
            }
        }
    }
`
// Cost: 100 repos × 100 issues × 50 comments = 500,000 nodes
// This will likely fail or consume entire rate limit in one query
```

### The Solution

```go
// ✅ GOOD: Adjust page size based on query depth

// Light query (1 level): use max page size
lightQuery := `
    query {
        repositories(first: 100) {
            nodes { name, description }
        }
    }
`

// Medium query (2 levels): reduce page size
mediumQuery := `
    query {
        repositories(first: 50) {
            nodes {
                name
                issues(first: 20) {
                    nodes { title }
                }
            }
        }
    }
`

// Heavy query (3+ levels): use small page sizes
heavyQuery := `
    query {
        repositories(first: 10) {
            nodes {
                name
                issues(first: 10) {
                    nodes {
                        title
                        comments(first: 5) {
                            nodes { body }
                        }
                    }
                }
            }
        }
    }
`

// Always include rateLimit to monitor actual cost
const withRateLimit = `
    %s
    rateLimit { cost, remaining }
`
```

**Rule of thumb**:
| Nesting Depth | Recommended Page Size |
|---------------|----------------------|
| 1 level | 100 items |
| 2 levels | 25-50 items |
| 3+ levels | 10-20 items |

---

## 6. No Retry Logic for Transient Errors

### The Problem

```go
// ❌ BAD: Single attempt, any error is fatal
resp, err := client.Query(ctx, query, variables)
if err != nil {
    return err // 502 Bad Gateway? Connection reset? Game over.
}
```

### The Solution

```go
// ✅ GOOD: Retry with exponential backoff
func queryWithRetry(ctx context.Context, query string, variables map[string]interface{}) (*Response, error) {
    maxRetries := 5
    baseDelay := time.Second

    for attempt := 0; attempt < maxRetries; attempt++ {
        resp, err := client.Query(ctx, query, variables)

        // Success
        if err == nil && len(resp.Errors) == 0 {
            return resp, nil
        }

        // Non-retryable error
        if err != nil && !isRetryable(err) {
            return nil, err
        }

        // Exponential backoff with jitter
        delay := time.Duration(1<<uint(attempt)) * baseDelay
        jitter := time.Duration(rand.Int63n(int64(delay / 4)))

        select {
        case <-time.After(delay + jitter):
            log.Printf("Retry attempt %d after %v", attempt+1, delay+jitter)
        case <-ctx.Done():
            return nil, ctx.Err()
        }
    }

    return nil, fmt.Errorf("max retries exceeded")
}

func isRetryable(err error) bool {
    s := err.Error()
    return strings.Contains(s, "429") ||      // Rate limited
           strings.Contains(s, "502") ||      // Bad gateway
           strings.Contains(s, "503") ||      // Service unavailable
           strings.Contains(s, "504") ||      // Gateway timeout
           strings.Contains(s, "timeout") ||  // Various timeouts
           strings.Contains(s, "connection")  // Connection issues
}
```

---

## 7. Nested Pagination Without State Management

### The Problem

```go
// ❌ BAD: Only paginates outer level, misses nested data
for {
    resp, _ := client.Query(ctx, query, map[string]interface{}{
        "repoCursor": repoCursor,
    })

    for _, repo := range resp.Repositories.Nodes {
        // repo.Issues only has first 10 issues!
        // If repo has 500 issues, you're missing 490
        processIssues(repo.Issues.Nodes)
    }

    if !resp.Repositories.PageInfo.HasNextPage {
        break
    }
    repoCursor = resp.Repositories.PageInfo.EndCursor
}
```

### The Solution

```go
// ✅ GOOD: Track cursors at each level
func fetchAllData(ctx context.Context) error {
    var repoCursor *string

    for {
        repos, _ := fetchRepositories(ctx, repoCursor)

        for _, repo := range repos.Nodes {
            // Paginate issues for EACH repository
            var issueCursor *string
            for {
                issues, _ := fetchIssues(ctx, repo.Name, issueCursor)
                processIssues(issues.Nodes)

                if !issues.PageInfo.HasNextPage {
                    break
                }
                issueCursor = &issues.PageInfo.EndCursor
            }
        }

        if !repos.PageInfo.HasNextPage {
            break
        }
        repoCursor = &repos.PageInfo.EndCursor
    }

    return nil
}
```

**Alternative**: Flatten queries to avoid nested pagination complexity.

---

## Quick Reference: Pitfall Checklist

| Pitfall           | Check                            | Fix                      |
| ----------------- | -------------------------------- | ------------------------ |
| Injection         | Using `fmt.Sprintf` in queries?  | Use variable binding     |
| Rate limits       | No `rateLimit` field in queries? | Add and monitor it       |
| Silent errors     | Only checking `err != nil`?      | Also check `resp.Errors` |
| Cursor type       | Using `String!` for cursor?      | Use nullable `String`    |
| Page size         | Using 100 with deep nesting?     | Reduce based on depth    |
| No retry          | Single attempt per query?        | Add exponential backoff  |
| Nested pagination | Only paginating top level?       | Track cursors per level  |
