# Azure DevOps Pagination Patterns

Guide to handling paginated responses in Azure DevOps REST API.

---

## Pagination Model

Azure DevOps uses **continuation tokens** for pagination, not offset/limit.

**Critical:** Continuation tokens are in **response headers**, not the response body.

---

## Response Headers

```http
X-MS-ContinuationToken: {opaque-token}
```

**Token Format:** Opaque base64-encoded string (do not parse or modify)

---

## Go Implementation

### Basic Pagination

```go
func (c *Client) ListAllRepositories(ctx context.Context, projectID string) ([]git.GitRepository, error) {
    var allRepos []git.GitRepository
    continuationToken := ""

    for {
        args := git.GetRepositoriesArgs{
            Project: &projectID,
        }

        if continuationToken != "" {
            args.ContinuationToken = &continuationToken
        }

        repos, err := c.gitClient.GetRepositories(ctx, args)
        if err != nil {
            return nil, err
        }

        allRepos = append(allRepos, *repos...)

        // Check for continuation token in response
        // Note: SDK handles this internally
        if len(*repos) == 0 {
            break
        }

        // In SDK, continuation tokens are handled automatically
        // For custom HTTP clients, check X-MS-ContinuationToken header
        break
    }

    return allRepos, nil
}
```

### Custom HTTP Client Pagination

```go
func (c *CustomClient) paginatedRequest(ctx context.Context, path string) ([]json.RawMessage, error) {
    var allItems []json.RawMessage
    continuationToken := ""

    for {
        url := fmt.Sprintf("%s/_apis/%s?api-version=7.1", c.orgURL, path)
        if continuationToken != "" {
            url += fmt.Sprintf("&continuationToken=%s", continuationToken)
        }

        req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
        if err != nil {
            return nil, err
        }

        // Add authentication
        auth := base64.StdEncoding.EncodeToString([]byte(":" + c.pat))
        req.Header.Set("Authorization", "Basic "+auth)

        resp, err := c.httpClient.Do(req)
        if err != nil {
            return nil, err
        }

        // Read response body
        body, err := io.ReadAll(resp.Body)
        resp.Body.Close()
        if err != nil {
            return nil, err
        }

        var result struct {
            Count int               `json:"count"`
            Value []json.RawMessage `json:"value"`
        }

        if err := json.Unmarshal(body, &result); err != nil {
            return nil, err
        }

        allItems = append(allItems, result.Value...)

        // Get continuation token from headers
        continuationToken = resp.Header.Get("X-MS-ContinuationToken")
        if continuationToken == "" {
            break
        }
    }

    return allItems, nil
}
```

---

## Python Implementation

```python
def list_all_repositories(self, project_id: str):
    """List all repositories with pagination"""
    all_repos = []
    continuation_token = None

    while True:
        repos = self.git_client.get_repositories(
            project=project_id,
            continuation_token=continuation_token
        )

        if not repos:
            break

        all_repos.extend(repos)

        # Check if more pages exist
        # SDK handles continuation token internally
        # For custom clients, check response headers
        if len(repos) < 100:  # Assuming default page size
            break

    return all_repos
```

---

## Common Pitfalls

### ❌ Looking for Token in Response Body

```go
// WRONG: Token is NOT in response body
var result struct {
    ContinuationToken string `json:"continuationToken"` // Doesn't exist!
    Value []Repository `json:"value"`
}
```

### ✅ Correct: Check Response Headers

```go
// CORRECT: Token is in headers
continuationToken := resp.Header.Get("X-MS-ContinuationToken")
```

### ❌ Assuming Fixed Page Size

```python
# WRONG: Page size varies
for page in range(0, total_count, 100):  # Doesn't work!
    repos = client.get_repositories(skip=page, top=100)
```

### ✅ Correct: Use Continuation Tokens

```python
# CORRECT: Follow continuation tokens
while continuation_token:
    repos = client.get_repositories(continuation_token=continuation_token)
```

---

## Best Practices

1. **Always check for continuation token** in response headers
2. **Treat tokens as opaque** - do not parse or modify
3. **Handle empty results** - no token means end of results
4. **Set reasonable page sizes** - balance API calls vs memory
5. **Implement timeouts** - prevent infinite pagination loops

---

## Related Resources

- [API Reference](api-reference.md)
- [Client Implementation](client-implementation.md)
- [Rate Limiting](rate-limiting.md)
