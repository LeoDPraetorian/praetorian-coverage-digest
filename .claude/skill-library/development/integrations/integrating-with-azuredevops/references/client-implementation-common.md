# Azure DevOps Client - Common Patterns & Best Practices

Shared patterns and best practices for Azure DevOps API clients across all languages.

**Related files:**

- [Go Implementation](client-implementation-go.md)
- [Python Implementation](client-implementation-python.md)

---

## Custom HTTP Client (Alternative)

### When to Use Custom Client

Use custom HTTP client when:

- Need very specific behavior not in SDK
- Working with unsupported languages
- Minimizing dependencies

### Go Custom HTTP Client

```go
package azdo

import (
    "bytes"
    "context"
    "encoding/base64"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
)

type CustomClient struct {
    orgURL     string
    pat        string
    httpClient *http.Client
}

func NewCustomClient(orgURL, pat string) *CustomClient {
    return &CustomClient{
        orgURL: orgURL,
        pat:    pat,
        httpClient: &http.Client{
            Timeout: 30 * time.Second,
        },
    }
}

func (c *CustomClient) request(ctx context.Context, method, path string, body interface{}) ([]byte, error) {
    var bodyReader io.Reader
    if body != nil {
        jsonBody, err := json.Marshal(body)
        if err != nil {
            return nil, err
        }
        bodyReader = bytes.NewBuffer(jsonBody)
    }

    url := fmt.Sprintf("%s/_apis/%s?api-version=7.1", c.orgURL, path)
    req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
    if err != nil {
        return nil, err
    }

    // PAT authentication: Base64 encode ":{PAT}"
    auth := base64.StdEncoding.EncodeToString([]byte(":" + c.pat))
    req.Header.Set("Authorization", "Basic "+auth)
    req.Header.Set("Content-Type", "application/json")

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    respBody, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, err
    }

    if resp.StatusCode >= 400 {
        return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(respBody))
    }

    return respBody, nil
}
```

---

## Best Practices

### 1. Connection Reuse

**DO:**

```go
// Reuse single client instance
client := NewAzureDevOpsClient(orgURL, pat)
defer client.Close()

// Use for multiple operations
repos := client.ListRepositories(ctx, projectID)
prs := client.ListPullRequests(ctx, projectID, repoID)
```

**DON'T:**

```go
// Creating new client per request
for _, repo := range repos {
    client := NewAzureDevOpsClient(orgURL, pat) // BAD!
    prs := client.ListPullRequests(ctx, projectID, repo.ID)
}
```

### 2. Context Usage

**DO:**

```go
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()

workItem, err := client.GetWorkItem(ctx, 123)
```

### 3. Batch Operations

**DO:**

```go
// Batch get (1 API call)
ids := []int{1, 2, 3, 4, 5}
workItems, err := client.GetWorkItemsBatch(ctx, ids)
```

**DON'T:**

```go
// Individual gets (5 API calls)
for _, id := range ids {
    workItem, err := client.GetWorkItem(ctx, id)
}
```

### 4. Error Handling

Always handle specific error codes:

| Status Code | Meaning              | Action             |
| ----------- | -------------------- | ------------------ |
| 401         | Authentication error | Check PAT validity |
| 403         | Permission denied    | Verify scopes      |
| 404         | Resource not found   | Handle gracefully  |
| 429         | Rate limited         | Back off and retry |
| 5xx         | Server error         | Retry with backoff |

### 5. Rate Limiting

Implement exponential backoff:

```go
func withRetry(fn func() error) error {
    backoff := 1 * time.Second
    maxRetries := 5

    for i := 0; i < maxRetries; i++ {
        err := fn()
        if err == nil {
            return nil
        }

        if isRateLimited(err) {
            time.Sleep(backoff)
            backoff *= 2
            continue
        }

        return err
    }
    return fmt.Errorf("max retries exceeded")
}
```

---

## Related Resources

- [API Reference](api-reference.md)
- [Authentication Guide](authentication.md)
- [Rate Limiting](rate-limiting.md)
- [Error Handling](error-handling.md)
