# Pagination Patterns

Comprehensive patterns for cursor-based pagination in GraphQL APIs with Go implementations.

## Basic Cursor Pagination

### Core Pattern

```graphql
query {
  repository(owner: "owner", name: "repo") {
    issues(first: 100, after: $cursor) {
      edges {
        cursor
        node {
          id
          title
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

### Go Implementation (shurcooL/graphql)

```go
type Query struct {
    Repository struct {
        Issues struct {
            Edges []struct {
                Cursor githubv4.String
                Node   struct {
                    ID    githubv4.ID
                    Title githubv4.String
                }
            }
            PageInfo struct {
                HasNextPage githubv4.Boolean
                EndCursor   githubv4.String
            }
        } `graphql:"issues(first: $first, after: $after)"`
    } `graphql:"repository(owner: $owner, name: $name)"`
}

// Use pointer cursors to distinguish nil (first page) from empty string
var cursor *githubv4.String

for {
    variables := map[string]interface{}{
        "owner": githubv4.String("owner"),
        "name":  githubv4.String("repo"),
        "first": githubv4.Int(100),
        "after": cursor, // nil on first iteration
    }

    err := client.Query(context.Background(), &query, variables)
    if err != nil {
        return err
    }

    // Process results
    for _, edge := range query.Repository.Issues.Edges {
        processIssue(edge.Node)
    }

    // Check pagination
    if !query.Repository.Issues.PageInfo.HasNextPage {
        break
    }

    // Update cursor for next page
    cursor = &query.Repository.Issues.PageInfo.EndCursor
}
```

**Key Points:**

- Use pointer cursors (`*githubv4.String`) to handle nil on first page
- Always check `hasNextPage` before continuing
- Break loop when no more pages available

## Batch Query + Pagination

### Query Aliasing Pattern

Fetch multiple resources with independent pagination in a single request:

```graphql
query {
  repo1: repository(owner: "org1", name: "repo1") {
    issues(first: 100, after: $cursor1) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        title
      }
    }
  }
  repo2: repository(owner: "org2", name: "repo2") {
    issues(first: 100, after: $cursor2) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        title
      }
    }
  }
  rateLimit {
    cost
    remaining
  }
}
```

### Go Implementation with Independent Cursors

```go
type BatchQuery struct {
    Repo1 struct {
        Issues struct {
            PageInfo struct {
                HasNextPage githubv4.Boolean
                EndCursor   githubv4.String
            }
            Nodes []Issue
        } `graphql:"issues(first: $first, after: $cursor1)"`
    } `graphql:"repo1: repository(owner: \"org1\", name: \"repo1\")"`

    Repo2 struct {
        Issues struct {
            PageInfo struct {
                HasNextPage githubv4.Boolean
                EndCursor   githubv4.String
            }
            Nodes []Issue
        } `graphql:"issues(first: $first, after: $cursor2)"`
    } `graphql:"repo2: repository(owner: \"org2\", name: \"repo2\")"`
}

// Track cursors independently
var cursor1, cursor2 *githubv4.String

for hasMore := true; hasMore; {
    variables := map[string]interface{}{
        "first":   githubv4.Int(100),
        "cursor1": cursor1,
        "cursor2": cursor2,
    }

    err := client.Query(ctx, &query, variables)
    if err != nil {
        return err
    }

    // Process both result sets
    processIssues(query.Repo1.Issues.Nodes)
    processIssues(query.Repo2.Issues.Nodes)

    // Update cursors independently
    if query.Repo1.Issues.PageInfo.HasNextPage {
        cursor1 = &query.Repo1.Issues.PageInfo.EndCursor
    }
    if query.Repo2.Issues.PageInfo.HasNextPage {
        cursor2 = &query.Repo2.Issues.PageInfo.EndCursor
    }

    // Continue if ANY resource has more pages
    hasMore = query.Repo1.Issues.PageInfo.HasNextPage ||
              query.Repo2.Issues.PageInfo.HasNextPage
}
```

**Recommendation:** Start with 3-5 aliases per request, monitor rate limit cost, adjust based on usage.

## PageInfo Fields

### Complete Structure

```graphql
pageInfo {
  hasNextPage     # bool - Continue forward pagination
  hasPreviousPage # bool - For bidirectional pagination
  startCursor     # string - First item cursor
  endCursor       # string - Last item cursor
}
```

### Connection Arguments

| Argument | Type   | Purpose                        |
| -------- | ------ | ------------------------------ |
| `first`  | Int    | Items to fetch (1-100)         |
| `after`  | String | Cursor for forward pagination  |
| `last`   | Int    | Items from end (alternative)   |
| `before` | String | Cursor for backward pagination |

## Common Pitfalls

### 1. Null Cursor on First Page

**Problem:**

```graphql
query($cursor: String!) { # Non-nullable
  ...
}
```

**Error:** "Variable cursor of type String! was provided invalid value"

**Solution:**

```graphql
query($cursor: String) { # Nullable
  ...
}
```

Use nullable `String` type and pass `null` on first page.

### 2. Page Size vs. Query Complexity

**Heavy queries** (many fields, deep nesting):

- Use 10-25 items per page
- Risk exceeding rate limits with large pages

**Light queries** (few fields, shallow):

- Use maximum 100 items per page
- Optimize throughput

### 3. Nested Pagination Complexity

**Challenge:** Managing cursors for multiple nesting levels:

```graphql
services(first: 10) {
  pageInfo { hasNextPage, endCursor }
  nodes {
    tools(first: 5) {
      pageInfo { hasNextPage, endCursor }
      nodes {
        tags(first: 3) {
          pageInfo { hasNextPage, endCursor }
        }
      }
    }
  }
}
```

**Current State:** No canonical pattern in Go client libraries (open [issue #69](https://github.com/shurcooL/graphql/issues/69)).

**Workaround:** Use fixed page sizes for nested fields or flatten queries.

## Production Checklist

- [ ] Use pointer cursors (`*string` or `*githubv4.String`)
- [ ] Context propagation with timeout
- [ ] Rate limit monitoring (`rateLimit` field in query)
- [ ] Exponential backoff for retries
- [ ] Structured logging with query metadata
- [ ] Cursor persistence for resumability
- [ ] Concurrency control (errgroup with limits)
- [ ] Partial failure handling

## References

- [GitHub GraphQL Pagination](https://docs.github.com/en/graphql/guides/introduction-to-graphql#pagination)
- [Relay Cursor Connections Specification](https://relay.dev/graphql/connections.htm)
- [shurcooL/graphql Issue #69](https://github.com/shurcooL/graphql/issues/69) - Nested pagination discussion
