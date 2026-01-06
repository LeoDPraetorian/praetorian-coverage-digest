---
name: implementing-graphql-clients
description: Use when implementing GraphQL clients in Go with batch queries, rate limiting, and performance optimization - GitHub/GitLab/Azure DevOps APIs, cursor-based pagination, variable binding security. Handles "rate limit exceeded", "GraphQL injection", "slow API queries". Achieves 3x performance improvement (1,666 → 5,000 repos/hour)
allowed-tools: Read, Grep, Glob, LSP
---

# Implementing GraphQL Clients

**GraphQL client implementation patterns focusing on batch queries, rate limiting, and performance optimization.**

## When to Use

Use this skill when:

- Implementing GitHub, GitLab, or Azure DevOps API clients
- Need batch query performance (3x improvement over REST)
- Optimizing GraphQL API usage patterns
- Implementing cursor-based pagination
- Managing rate limits (GitHub: 5,000 points/hour)
- Replacing inefficient REST endpoints with GraphQL

**Important:** You MUST use TodoWrite before starting to track all steps

## Performance: Batch Queries vs Individual Queries

### Problem: Individual Queries Are Slow

```go
// ❌ BAD: 1,666 repos/hour (5,000 requests ÷ 3 requests/repo)
for _, repo := range repos {
    // Query 1: Get repository
    GET /repos/{owner}/{repo}

    // Query 2: Get workflows directory
    GET /repos/{owner}/{repo}/contents/.github/workflows

    // Query 3: Get each workflow file
    GET /repos/{owner}/{repo}/contents/.github/workflows/{file}
}
```

**Bottleneck**: 3 requests per repository, rate limit exhausted quickly.

### Solution: GraphQL Batch Queries

```go
// ✅ GOOD: 5,000 repos/hour (batch 50-100 repos per request)
query := `
  query BatchWorkflows($repos: [String!]!) {
    repositories(names: $repos) {
      nodes {
        nameWithOwner
        object(expression: "HEAD:.github/workflows") {
          ... on Tree {
            entries {
              name
              oid
              object {
                ... on Blob { text }
              }
            }
          }
        }
      }
    }
  }
`

variables := map[string]interface{}{
    "repos": []string{
        "owner/repo1",
        "owner/repo2",
        // ... 50-100 repos
    },
}

result, err := client.Query(ctx, query, variables)
```

**Performance**: 3x improvement (1,666 → 5,000 repos/hour)

## Critical Pattern: Variable Binding (NEVER String Interpolation)

### ❌ GraphQL Injection Vulnerability

```go
// ❌ WRONG: Injection risk!
repoName := userInput  // Could be: " } exploit { "
query := fmt.Sprintf(`
  query {
    repository(name: "%s") {
      name
    }
  }
`, repoName)
```

**Attack vector**: Malicious input breaks out of query structure.

### ✅ Safe Variable Binding

```go
// ✅ CORRECT: Type-safe variable binding
query := `
  query GetRepo($name: String!) {
    repository(name: $name) {
      name
    }
  }
`

variables := map[string]interface{}{
    "name": userInput,  // Safely bound as string
}

result, err := client.Query(ctx, query, variables)
```

**Why it's safe**: GraphQL engine validates type and escapes values automatically.

## Rate Limiting Pattern

### GitHub GraphQL Rate Limits

**Points system**: 5,000 points/hour, cost = depth × pagination (e.g., 100 repos × 2 levels = 200 points)

### Proactive Throttling

```go
type RateLimiter struct {
    remaining   int
    resetAt     time.Time
    minRemaining int  // Throttle at 5% (250 points)
}

func (r *RateLimiter) CheckAndWait(ctx context.Context, queryCost int) error {
    r.mu.Lock()
    defer r.mu.Unlock()

    // Update from response headers
    r.remaining -= queryCost

    // Proactive throttle at 5% remaining
    if r.remaining < r.minRemaining {
        waitDuration := time.Until(r.resetAt)
        log.Printf("Rate limit low (%d/%d), waiting %v", r.remaining, 5000, waitDuration)

        select {
        case <-time.After(waitDuration):
            r.remaining = 5000  // Reset
        case <-ctx.Done():
            return ctx.Err()
        }
    }

    return nil
}
```

**See:** [references/rate-limiting-patterns.md](references/rate-limiting-patterns.md)

## Pagination with Cursors

### Basic Cursor Pattern

```go
query := `
  query GetRepos($cursor: String) {
    repositories(first: 100, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        name
        createdAt
      }
    }
  }
`

var cursor *string
for {
    variables := map[string]interface{}{}
    if cursor != nil {
        variables["cursor"] = *cursor
    }

    result, err := client.Query(ctx, query, variables)
    if err != nil {
        return err
    }

    // Process result.Repositories.Nodes

    if !result.Repositories.PageInfo.HasNextPage {
        break
    }

    cursor = &result.Repositories.PageInfo.EndCursor
}
```

### Batch + Pagination Combined

```go
// Query 100 repos per request, paginate through all
query := `
  query BatchReposWithWorkflows($cursor: String, $repos: [String!]!) {
    repositories(first: 100, after: $cursor, names: $repos) {
      pageInfo { hasNextPage endCursor }
      nodes {
        nameWithOwner
        object(expression: "HEAD:.github/workflows") {
          ... on Tree { entries { name oid } }
        }
      }
    }
  }
`
```

**See:** [references/pagination-patterns.md](references/pagination-patterns.md)

## Client Implementation Pattern

### Basic GraphQL Client

```go
type Client struct {
    httpClient  *http.Client
    endpoint    string
    token       string
    rateLimiter *RateLimiter
}

func (c *Client) Query(ctx context.Context, query string, variables map[string]interface{}) (*Response, error) {
    // Build request
    reqBody := map[string]interface{}{
        "query":     query,
        "variables": variables,
    }

    body, err := json.Marshal(reqBody)
    if err != nil {
        return nil, err
    }

    req, err := http.NewRequestWithContext(ctx, "POST", c.endpoint, bytes.NewReader(body))
    if err != nil {
        return nil, err
    }

    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+c.token)

    // Check rate limit before sending
    if err := c.rateLimiter.CheckAndWait(ctx, estimateQueryCost(query)); err != nil {
        return nil, err
    }

    // Execute request
    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    // Update rate limiter from headers
    c.rateLimiter.UpdateFromHeaders(resp.Header)

    // Parse response
    var result Response
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    if len(result.Errors) > 0 {
        return nil, fmt.Errorf("GraphQL errors: %v", result.Errors)
    }

    return &result, nil
}
```

**See:** [references/client-implementation.md](references/client-implementation.md)

## Query Cost Estimation

### Formula

```
Cost = NodeDepth × PaginationSize × Multipliers
```

### Examples

```go
// Cost = 1 (single node, no pagination)
query { viewer { login } }

// Cost = 100 (100 repos, 1 level deep)
query { repositories(first: 100) { nodes { name } } }

// Cost = 10,000 (100 repos × 100 issues = 10,000 nodes)
query {
  repositories(first: 100) {
    nodes {
      issues(first: 100) { nodes { title } }
    }
  }
}
```

**See:** [references/cost-calculation.md](references/cost-calculation.md)

## Production Example: Gato-X Batch Workflow Retrieval

**Architecture**: Batch 50-100 repositories per GraphQL query

```go
func GetWorkflows(ctx context.Context, repos []string) ([]Workflow, error) {
    const batchSize = 50

    var allWorkflows []Workflow

    for i := 0; i < len(repos); i += batchSize {
        end := i + batchSize
        if end > len(repos) {
            end = len(repos)
        }

        batch := repos[i:end]
        workflows, err := queryBatch(ctx, batch)
        if err != nil {
            return nil, err
        }

        allWorkflows = append(allWorkflows, workflows...)
    }

    return allWorkflows, nil
}

func queryBatch(ctx context.Context, repos []string) ([]Workflow, error) {
    query := `
      query BatchWorkflows($repos: [String!]!) {
        repositories(names: $repos) {
          nodes {
            nameWithOwner
            object(expression: "HEAD:.github/workflows") {
              ... on Tree {
                entries {
                  name
                  oid
                  object {
                    ... on Blob { text }
                  }
                }
              }
            }
          }
        }
      }
    `

    variables := map[string]interface{}{"repos": repos}
    result, err := client.Query(ctx, query, variables)
    // ... parse and return
}
```

**Performance**: Processes 5,000 repos/hour (3x improvement over REST)

**See:** [references/production-examples.md](references/production-examples.md)

## Common Pitfalls

### 1. String Interpolation (Injection Risk)

```go
// ❌ BAD: Vulnerable to injection
query := fmt.Sprintf(`query { repo(name: "%s") }`, userInput)

// ✅ GOOD: Safe variable binding
query := `query GetRepo($name: String!) { repo(name: $name) }`
variables := map[string]interface{}{"name": userInput}
```

### 2. Not Handling Rate Limits

```go
// ❌ BAD: Hits rate limit, fails
for _, repo := range repos {
    client.Query(ctx, query, variables)  // No rate check!
}

// ✅ GOOD: Proactive throttling
for _, repo := range repos {
    rateLimiter.CheckAndWait(ctx, queryCost)
    client.Query(ctx, query, variables)
}
```

### 3. Ignoring GraphQL Errors

```go
// ❌ BAD: Silent failure
result, _ := client.Query(ctx, query, vars)

// ✅ GOOD: Check errors array
result, err := client.Query(ctx, query, vars)
if err != nil {
    return err
}
if len(result.Errors) > 0 {
    return fmt.Errorf("GraphQL errors: %v", result.Errors)
}
```

**See:** [references/common-pitfalls.md](references/common-pitfalls.md)

## Testing Strategies

### Mock GraphQL Responses

```go
func TestBatchQuery(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        var req struct {
            Query     string                 `json:"query"`
            Variables map[string]interface{} `json:"variables"`
        }
        json.NewDecoder(r.Body).Decode(&req)

        // Verify query structure
        assert.Contains(t, req.Query, "repositories(names: $repos)")

        // Return mock response
        response := map[string]interface{}{
            "data": map[string]interface{}{
                "repositories": map[string]interface{}{
                    "nodes": []map[string]interface{}{
                        {"nameWithOwner": "owner/repo1"},
                        {"nameWithOwner": "owner/repo2"},
                    },
                },
            },
        }
        json.NewEncoder(w).Encode(response)
    }))
    defer server.Close()

    client := NewClient(server.URL, "token")
    result, err := client.Query(ctx, query, variables)

    assert.NoError(t, err)
    assert.Len(t, result.Repositories.Nodes, 2)
}
```

**See:** [references/testing-patterns.md](references/testing-patterns.md)

## Quick Reference

| Pattern            | Use When                           | Code Snippet                             |
| ------------------ | ---------------------------------- | ---------------------------------------- |
| Batch queries      | Need performance (3x improvement)  | `repositories(names: $repos)`            |
| Variable binding   | Any user input (prevent injection) | `variables := map[string]interface{}{}`  |
| Cursor pagination  | Large result sets                  | `pageInfo { hasNextPage endCursor }`     |
| Rate limit check   | Before every query                 | `rateLimiter.CheckAndWait(ctx, cost)`    |
| Proactive throttle | Avoid hitting rate limit           | Throttle at 5% remaining (250/5000)      |
| Cost estimation    | Plan queries within rate limit     | `Cost = Depth × Pagination × Multiplier` |

## Provider-Specific Differences

| Feature     | GitHub                   | GitLab                   | Azure DevOps                  |
| ----------- | ------------------------ | ------------------------ | ----------------------------- |
| Endpoint    | `api.github.com/graphql` | `gitlab.com/api/graphql` | `dev.azure.com/_apis/graphql` |
| Rate limit  | 5,000 points/hour        | 10 req/sec per IP        | No public limit               |
| Pagination  | Cursor-based             | Cursor-based             | Continuation tokens           |
| Batch limit | 100 repos recommended    | 50 projects recommended  | 100 items recommended         |

**See:** [references/provider-differences.md](references/provider-differences.md)

## References

**Resources**: [GitHub GraphQL API](https://docs.github.com/en/graphql), [GitLab GraphQL API](https://docs.gitlab.com/ee/api/graphql/), [Azure DevOps GraphQL](https://learn.microsoft.com/en-us/azure/devops/integrate/concepts/graphql), Gato-X: `go-gato/GATO-X-ARCHITECTURE-ANALYSIS.md`, burp-integration skill

## Related Skills

- `implementing-go-semaphore-pools` - Bounded concurrency for parallel queries
- `implementing-go-pipelines` - Multi-stage data processing
- `gateway-integrations` - Third-party API integration patterns
- `debugging-systematically` - Debug GraphQL query issues
