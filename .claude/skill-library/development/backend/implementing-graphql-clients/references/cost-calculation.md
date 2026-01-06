# Query Cost Calculation

Understanding and estimating GraphQL query costs for rate limit management.

## Cost Formula

GitHub's GraphQL API uses a point-based rate limiting system. The general formula:

```
Cost = NodeCount × ConnectionMultiplier × FieldComplexity
```

Where:

- **NodeCount**: Number of nodes requested (via `first` argument)
- **ConnectionMultiplier**: Multiplier for nested connections
- **FieldComplexity**: Additional cost for expensive fields

## Basic Cost Examples

### Single Node Query

```graphql
query {
  viewer {
    login
    email
  }
}
```

**Cost: 1 point**

Explanation: Fetching a single node with scalar fields.

### Simple Pagination

```graphql
query {
  repository(owner: "org", name: "repo") {
    issues(first: 100) {
      nodes {
        id
        title
      }
    }
  }
}
```

**Cost: 101 points** (1 for repository + 100 for issues)

### Nested Pagination

```graphql
query {
  repository(owner: "org", name: "repo") {
    issues(first: 50) {
      nodes {
        id
        title
        comments(first: 10) {
          nodes {
            body
          }
        }
      }
    }
  }
}
```

**Cost: 551 points** (1 + 50 + 50×10)

### Deep Nesting (Expensive!)

```graphql
query {
  repositories(first: 100) {
    nodes {
      issues(first: 100) {
        nodes {
          comments(first: 50) {
            nodes {
              reactions(first: 10) {
                nodes {
                  content
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Cost: 50,000,101 points** (100 × 100 × 50 × 10 + overhead)

This query would fail - exceeds the 500,000 node limit.

## Cost Monitoring in Queries

### Always Include rateLimit Field

```graphql
query GetIssues($cursor: String) {
  repository(owner: "org", name: "repo") {
    issues(first: 100, after: $cursor) {
      nodes {
        id
        title
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
  rateLimit {
    cost # Actual cost of THIS query
    limit # Your total limit (5000)
    remaining # Points remaining
    resetAt # When limit resets (ISO 8601)
    nodeCount # Nodes returned in this query
  }
}
```

### Go Implementation

```go
type QueryWithRateLimit struct {
    Repository struct {
        Issues struct {
            Nodes    []Issue
            PageInfo PageInfo
        } `graphql:"issues(first: $first, after: $cursor)"`
    } `graphql:"repository(owner: $owner, name: $name)"`

    RateLimit struct {
        Cost      int       `json:"cost"`
        Limit     int       `json:"limit"`
        Remaining int       `json:"remaining"`
        ResetAt   time.Time `json:"resetAt"`
        NodeCount int       `json:"nodeCount"`
    }
}

func fetchWithCostTracking(ctx context.Context, query *QueryWithRateLimit, vars map[string]interface{}) error {
    err := client.Query(ctx, query, vars)
    if err != nil {
        return err
    }

    // Log cost for monitoring
    log.Printf("Query cost: %d, Remaining: %d/%d, Resets: %s",
        query.RateLimit.Cost,
        query.RateLimit.Remaining,
        query.RateLimit.Limit,
        query.RateLimit.ResetAt)

    // Proactive warning at 10%
    if query.RateLimit.Remaining < query.RateLimit.Limit/10 {
        log.Warn("Rate limit below 10%!")
    }

    return nil
}
```

## Cost Estimation Function

```go
// EstimateQueryCost provides rough cost estimation before execution
func EstimateQueryCost(query string) int {
    cost := 1 // Base cost

    // Count pagination arguments
    firstPattern := regexp.MustCompile(`first:\s*(\d+)`)
    matches := firstPattern.FindAllStringSubmatch(query, -1)

    if len(matches) == 0 {
        return cost // No pagination, minimal cost
    }

    // Calculate nested cost
    depths := []int{}
    for _, match := range matches {
        pageSize, _ := strconv.Atoi(match[1])
        depths = append(depths, pageSize)
    }

    // Multiply nested pagination sizes
    multiplier := 1
    for _, depth := range depths {
        multiplier *= depth
    }

    return multiplier + len(matches) // Rough estimate
}

// Usage
query := `
    query {
        repositories(first: 100) {
            nodes {
                issues(first: 50) {
                    nodes { title }
                }
            }
        }
    }
`
estimate := EstimateQueryCost(query)
fmt.Printf("Estimated cost: %d\n", estimate) // ~5000
```

## Cost Optimization Strategies

### 1. Reduce Page Sizes for Nested Queries

```go
// ❌ Expensive: 100 × 100 = 10,000+ points
query := `
    repositories(first: 100) {
        issues(first: 100) { ... }
    }
`

// ✅ Cheaper: 50 × 20 = 1,000+ points
query := `
    repositories(first: 50) {
        issues(first: 20) { ... }
    }
`
```

### 2. Use Query Aliases for Batching

```go
// Instead of 10 separate queries (10 × ~100 = 1000 points)
// Use one batched query with aliases (~200 points)
query := `
    query {
        repo1: repository(owner: "o", name: "r1") { issues(first: 10) { totalCount } }
        repo2: repository(owner: "o", name: "r2") { issues(first: 10) { totalCount } }
        repo3: repository(owner: "o", name: "r3") { issues(first: 10) { totalCount } }
        # ... up to ~10-20 aliases
        rateLimit { cost, remaining }
    }
`
```

### 3. Request Only Needed Fields

```go
// ❌ Expensive: Many fields increase complexity
query := `
    repository(owner: "o", name: "r") {
        issues(first: 100) {
            nodes {
                id, title, body, createdAt, updatedAt, closedAt,
                author { login, avatarUrl, bio },
                labels(first: 10) { nodes { name, color } },
                assignees(first: 5) { nodes { login } },
                comments(first: 20) { nodes { body, author { login } } }
            }
        }
    }
`

// ✅ Cheaper: Only essential fields
query := `
    repository(owner: "o", name: "r") {
        issues(first: 100) {
            nodes {
                id
                title
                state
            }
        }
    }
`
```

### 4. Use totalCount for Counts

```go
// ❌ Don't fetch all nodes just to count
query := `
    repository(owner: "o", name: "r") {
        issues(first: 100) {
            nodes { id }  # Fetching 100 nodes just to count
        }
    }
`

// ✅ Use totalCount
query := `
    repository(owner: "o", name: "r") {
        issues {
            totalCount  # Returns count without fetching nodes
        }
    }
`
```

## Rate Limit Budgeting

### Calculate Required Points

```go
func calculateRequiredPoints(repoCount, issuesPerRepo, commentsPerIssue int) int {
    // repositories × issues × comments + overhead
    return repoCount * issuesPerRepo * commentsPerIssue + repoCount + 1
}

func canCompleteInBudget(required, remaining int) bool {
    // Leave 10% buffer
    available := int(float64(remaining) * 0.9)
    return required <= available
}

// Usage
repos := 500
issuesPerRepo := 50
commentsPerIssue := 0 // Skip comments

required := calculateRequiredPoints(repos, issuesPerRepo, commentsPerIssue)
fmt.Printf("Need %d points for %d repos\n", required, repos)

if !canCompleteInBudget(required, rateLimit.Remaining) {
    // Split into multiple sessions or reduce scope
    batchSize := rateLimit.Remaining / (issuesPerRepo + 1)
    fmt.Printf("Can process %d repos in current window\n", batchSize)
}
```

### Adaptive Page Sizing

```go
func adaptivePageSize(remaining, targetQueries int) int {
    // Calculate safe page size based on remaining budget
    pointsPerQuery := remaining / targetQueries

    // Cap at 100 (GitHub's max)
    if pointsPerQuery > 100 {
        return 100
    }

    // Minimum useful page size
    if pointsPerQuery < 10 {
        return 10
    }

    return pointsPerQuery
}
```

## Cost Reference Table

| Query Pattern                        | Approximate Cost  |
| ------------------------------------ | ----------------- |
| Single node (viewer, repository)     | 1 point           |
| List with `first: N`                 | N points          |
| Nested list `first: N` → `first: M`  | N × M points      |
| Triple nested                        | N × M × P points  |
| totalCount only                      | 1 point           |
| With connections (labels, assignees) | +1 per connection |

## Provider-Specific Notes

### GitHub

- **Limit**: 5,000 points/hour (10,000 Enterprise)
- **Node limit**: 500,000 nodes per query
- **Formula**: Primarily based on node count
- **Monitoring**: `rateLimit` field required

### GitLab

- **Limit**: 10 requests/second, 200 complexity points/query
- **Complexity**: Calculated differently (field weights)
- **Monitoring**: Response headers

### Azure DevOps

- **Limit**: No documented GraphQL-specific limit
- **Complexity**: Treated as single REST call
- **Monitoring**: Standard REST rate limit headers

## References

- [GitHub GraphQL Resource Limitations](https://docs.github.com/en/graphql/overview/resource-limitations)
- [GitHub Rate Limits](https://docs.github.com/en/graphql/overview/rate-limits-and-node-limits-for-the-graphql-api)
