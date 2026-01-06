# Provider-Specific Differences

Key differences between GitHub, GitLab, and Azure DevOps GraphQL implementations.

## Endpoint URLs

| Provider         | GraphQL Endpoint                            |
| ---------------- | ------------------------------------------- |
| **GitHub**       | `https://api.github.com/graphql`            |
| **GitLab**       | `https://gitlab.com/api/graphql`            |
| **Azure DevOps** | `https://dev.azure.com/{org}/_apis/graphql` |

## Rate Limiting

### GitHub

- **Primary**: 5,000 points/hour (10,000 for Enterprise)
- **Secondary**: 2,000 points/minute
- **Cost**: Based on query depth × pagination size
- **Monitoring**: Include `rateLimit { cost, remaining, resetAt }` in queries

### GitLab

- **Limit**: 10 requests/second per IP address
- **Complexity**: Max 200 complexity points per query
- **Monitoring**: Response headers `RateLimit-Limit`, `RateLimit-Remaining`
- **Note**: Simpler than GitHub - count-based instead of point-based

### Azure DevOps

- **Limit**: No publicly documented GraphQL-specific limit
- **General**: 200 REST API requests per user per minute
- **Note**: GraphQL treated as single REST call regardless of query complexity

## Pagination Patterns

### GitHub (Relay Specification)

```graphql
issues(first: 100, after: $cursor) {
  pageInfo {
    hasNextPage
    endCursor
  }
  nodes { id, title }
}
```

- **Max page size**: 100 items
- **Cursor format**: Opaque base64-encoded string
- **Bidirectional**: Supports `before`/`after` and `first`/`last`

### GitLab (Similar to Relay)

```graphql
issues(first: 100, after: $cursor) {
  pageInfo {
    hasNextPage
    endCursor
  }
  nodes { id, title }
}
```

- **Max page size**: 100 items (recommended 50 for performance)
- **Cursor format**: Opaque string
- **Note**: Very similar to GitHub implementation

### Azure DevOps (Continuation Tokens)

```graphql
workItems(top: 200) {
  continuationToken
  value { id, title }
}
```

- **Max page size**: 200 items
- **Token format**: Opaque continuation token (not cursor-based)
- **Difference**: Uses `top` instead of `first`, `continuationToken` instead of `pageInfo`

## Batch Query Limits

| Provider   | Recommended Batch Size | Notes                                  |
| ---------- | ---------------------- | -------------------------------------- |
| **GitHub** | 50-100 repos           | Monitor rate limit cost per query      |
| **GitLab** | 50 projects            | Conservative due to 10 req/sec limit   |
| **Azure**  | 100 items              | Less restrictive, no complexity limits |

## Authentication

### GitHub

```go
token := "ghp_..."
src := oauth2.StaticTokenSource(
    &oauth2.Token{AccessToken: token},
)
httpClient := oauth2.NewClient(context.Background(), src)
client := githubv4.NewClient(httpClient)
```

**Token types**: Personal access tokens (classic or fine-grained), OAuth apps, GitHub Apps

### GitLab

```go
headers := http.Header{
    "Authorization": []string{"Bearer " + token},
}
client := graphql.NewClient("https://gitlab.com/api/graphql", &http.Client{
    Transport: &transport{headers: headers},
})
```

**Token types**: Personal access tokens, OAuth tokens, Job tokens (CI/CD)

### Azure DevOps

```go
token := "..." // Personal Access Token
auth := base64.StdEncoding.EncodeToString([]byte(":" + token))
headers := http.Header{
    "Authorization": []string{"Basic " + auth},
}
```

**Token types**: Personal Access Tokens (PATs) with specific scopes

## Error Handling Differences

### GitHub

```json
{
  "data": { ... },
  "errors": [
    {
      "type": "RATE_LIMITED",
      "message": "API rate limit exceeded"
    }
  ]
}
```

**Common error types**: `RATE_LIMITED`, `FORBIDDEN`, `NOT_FOUND`, `INSUFFICIENT_SCOPES`

### GitLab

```json
{
  "errors": [
    {
      "message": "Query has complexity of 201, which exceeds max complexity of 200",
      "extensions": {
        "code": "queryLimitReached"
      }
    }
  ]
}
```

**Common errors**: `queryLimitReached`, `rateLimitExceeded`, `unauthorized`

### Azure DevOps

```json
{
  "errors": [
    {
      "message": "VS403027: The request has been denied.",
      "extensions": {
        "code": "FORBIDDEN"
      }
    }
  ]
}
```

**Common errors**: Permission-based (403), authentication (401), not found (404)

## Best Practices per Provider

### GitHub

- Always include `rateLimit` field in queries
- Use pointer cursors for nil handling
- Batch queries with 50-100 items
- Monitor secondary rate limit (2,000/minute)

### GitLab

- Keep complexity under 200 points
- Use smaller batch sizes (50 recommended)
- Respect 10 req/sec limit (add delays between requests)
- Cache responses when possible

### Azure DevOps

- Leverage higher page size limit (200 items)
- Use continuation tokens correctly
- Handle permission errors gracefully
- Note: GraphQL support is more limited than GitHub/GitLab

## References

- [GitHub GraphQL API](https://docs.github.com/en/graphql)
- [GitLab GraphQL API](https://docs.gitlab.com/ee/api/graphql/)
- [Azure DevOps GraphQL](https://learn.microsoft.com/en-us/azure/devops/integrate/concepts/graphql)
