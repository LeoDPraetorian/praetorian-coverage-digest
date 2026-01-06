# Testing Patterns

Comprehensive testing strategies for GraphQL clients including unit tests, integration tests, and mock servers.

## Mock Server with httptest

### Basic Mock Server

```go
package graphql_test

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestGraphQLClient_Query(t *testing.T) {
    // Create mock server
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Verify request
        assert.Equal(t, "POST", r.Method)
        assert.Equal(t, "application/json", r.Header.Get("Content-Type"))
        assert.Contains(t, r.Header.Get("Authorization"), "Bearer")

        // Parse request body
        var req struct {
            Query     string                 `json:"query"`
            Variables map[string]interface{} `json:"variables"`
        }
        err := json.NewDecoder(r.Body).Decode(&req)
        require.NoError(t, err)

        // Verify query structure
        assert.Contains(t, req.Query, "repository(owner: $owner, name: $name)")

        // Return mock response
        response := map[string]interface{}{
            "data": map[string]interface{}{
                "repository": map[string]interface{}{
                    "name":        "test-repo",
                    "description": "A test repository",
                },
            },
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(response)
    }))
    defer server.Close()

    // Create client with mock server URL
    client := NewClient(server.URL, "test-token")

    // Execute query
    query := `
        query GetRepo($owner: String!, $name: String!) {
            repository(owner: $owner, name: $name) {
                name
                description
            }
        }
    `
    variables := map[string]interface{}{
        "owner": "test-org",
        "name":  "test-repo",
    }

    result, err := client.Query(context.Background(), query, variables)

    // Assertions
    require.NoError(t, err)
    assert.NotNil(t, result)
}
```

### Mock Server with Rate Limit Headers

```go
func TestGraphQLClient_RateLimiting(t *testing.T) {
    requestCount := 0

    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        requestCount++

        // Simulate rate limit headers
        w.Header().Set("X-RateLimit-Limit", "5000")
        w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", 5000-requestCount*100))
        w.Header().Set("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(time.Hour).Unix()))

        response := map[string]interface{}{
            "data": map[string]interface{}{
                "viewer": map[string]interface{}{
                    "login": "test-user",
                },
            },
            "rateLimit": map[string]interface{}{
                "cost":      100,
                "remaining": 5000 - requestCount*100,
                "resetAt":   time.Now().Add(time.Hour).Format(time.RFC3339),
            },
        }

        json.NewEncoder(w).Encode(response)
    }))
    defer server.Close()

    client := NewClient(server.URL, "test-token")

    // Make multiple requests
    for i := 0; i < 5; i++ {
        _, err := client.Query(context.Background(), `{ viewer { login } }`, nil)
        require.NoError(t, err)
    }

    // Verify rate limiter was updated
    assert.Less(t, client.rateLimiter.remaining, 5000)
}
```

### Mock Server with GraphQL Errors

```go
func TestGraphQLClient_HandlesGraphQLErrors(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Return HTTP 200 with GraphQL errors
        response := map[string]interface{}{
            "data": nil,
            "errors": []map[string]interface{}{
                {
                    "message": "Field 'nonexistent' doesn't exist on type 'Repository'",
                    "type":    "FIELD_NOT_FOUND",
                    "path":    []string{"repository", "nonexistent"},
                    "locations": []map[string]int{
                        {"line": 3, "column": 5},
                    },
                },
            },
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(response)
    }))
    defer server.Close()

    client := NewClient(server.URL, "test-token")

    query := `{ repository(owner: "o", name: "r") { nonexistent } }`
    _, err := client.Query(context.Background(), query, nil)

    // Should return error containing GraphQL error message
    require.Error(t, err)
    assert.Contains(t, err.Error(), "FIELD_NOT_FOUND")
}
```

---

## Testing Pagination

### Pagination Loop Test

```go
func TestGraphQLClient_Pagination(t *testing.T) {
    pageCount := 0
    totalItems := 250 // 3 pages of 100 items

    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        pageCount++

        var req struct {
            Variables map[string]interface{} `json:"variables"`
        }
        json.NewDecoder(r.Body).Decode(&req)

        cursor := req.Variables["cursor"]
        hasNextPage := pageCount < 3
        endCursor := fmt.Sprintf("cursor_%d", pageCount)

        // Generate mock items for this page
        items := make([]map[string]interface{}, 100)
        for i := 0; i < 100; i++ {
            items[i] = map[string]interface{}{
                "id":    fmt.Sprintf("item_%d_%d", pageCount, i),
                "title": fmt.Sprintf("Item %d", (pageCount-1)*100+i),
            }
        }

        response := map[string]interface{}{
            "data": map[string]interface{}{
                "repository": map[string]interface{}{
                    "issues": map[string]interface{}{
                        "nodes": items,
                        "pageInfo": map[string]interface{}{
                            "hasNextPage": hasNextPage,
                            "endCursor":   endCursor,
                        },
                    },
                },
            },
        }

        json.NewEncoder(w).Encode(response)
    }))
    defer server.Close()

    client := NewClient(server.URL, "test-token")

    // Fetch all pages
    var allItems []Issue
    var cursor *string

    for {
        query := `
            query GetIssues($cursor: String) {
                repository(owner: "o", name: "r") {
                    issues(first: 100, after: $cursor) {
                        nodes { id, title }
                        pageInfo { hasNextPage, endCursor }
                    }
                }
            }
        `
        variables := map[string]interface{}{"cursor": cursor}

        result, err := client.Query(context.Background(), query, variables)
        require.NoError(t, err)

        // Parse and accumulate
        var resp IssuesResponse
        json.Unmarshal(result.Data, &resp)
        allItems = append(allItems, resp.Repository.Issues.Nodes...)

        if !resp.Repository.Issues.PageInfo.HasNextPage {
            break
        }
        cursor = &resp.Repository.Issues.PageInfo.EndCursor
    }

    // Verify all items fetched
    assert.Len(t, allItems, 300) // 3 pages × 100 items
    assert.Equal(t, 3, pageCount)
}
```

---

## Testing Batch Queries

### Batch Query Test

```go
func TestGraphQLClient_BatchQuery(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        var req struct {
            Query     string                 `json:"query"`
            Variables map[string]interface{} `json:"variables"`
        }
        json.NewDecoder(r.Body).Decode(&req)

        // Verify batch structure (aliased queries)
        assert.Contains(t, req.Query, "repo_0: repository")
        assert.Contains(t, req.Query, "repo_1: repository")
        assert.Contains(t, req.Query, "repo_2: repository")

        response := map[string]interface{}{
            "data": map[string]interface{}{
                "repo_0": map[string]interface{}{
                    "nameWithOwner": "org/repo1",
                    "stargazerCount": 100,
                },
                "repo_1": map[string]interface{}{
                    "nameWithOwner": "org/repo2",
                    "stargazerCount": 200,
                },
                "repo_2": map[string]interface{}{
                    "nameWithOwner": "org/repo3",
                    "stargazerCount": 300,
                },
            },
            "rateLimit": map[string]interface{}{
                "cost":      3,
                "remaining": 4997,
            },
        }

        json.NewEncoder(w).Encode(response)
    }))
    defer server.Close()

    client := NewClient(server.URL, "test-token")

    repos := []string{"org/repo1", "org/repo2", "org/repo3"}
    results, err := client.BatchGetRepositories(context.Background(), repos)

    require.NoError(t, err)
    assert.Len(t, results, 3)
    assert.Equal(t, 100, results["org/repo1"].StargazerCount)
    assert.Equal(t, 200, results["org/repo2"].StargazerCount)
    assert.Equal(t, 300, results["org/repo3"].StargazerCount)
}
```

---

## Testing Error Scenarios

### Rate Limit Exceeded Test

```go
func TestGraphQLClient_RateLimitExceeded(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("X-RateLimit-Remaining", "0")
        w.Header().Set("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(time.Hour).Unix()))
        w.Header().Set("Retry-After", "3600")

        response := map[string]interface{}{
            "data": nil,
            "errors": []map[string]interface{}{
                {
                    "message": "API rate limit exceeded",
                    "type":    "RATE_LIMITED",
                },
            },
        }

        w.WriteHeader(http.StatusForbidden) // 403
        json.NewEncoder(w).Encode(response)
    }))
    defer server.Close()

    client := NewClient(server.URL, "test-token")

    _, err := client.Query(context.Background(), `{ viewer { login } }`, nil)

    require.Error(t, err)
    assert.Contains(t, err.Error(), "rate limit")
}
```

### Network Error Test

```go
func TestGraphQLClient_NetworkError(t *testing.T) {
    // Create server and immediately close it
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
    server.Close()

    client := NewClient(server.URL, "test-token")

    _, err := client.Query(context.Background(), `{ viewer { login } }`, nil)

    require.Error(t, err)
    // Error should be network-related
    assert.Contains(t, err.Error(), "connection refused")
}
```

### Timeout Test

```go
func TestGraphQLClient_Timeout(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Simulate slow response
        time.Sleep(5 * time.Second)
        json.NewEncoder(w).Encode(map[string]interface{}{"data": nil})
    }))
    defer server.Close()

    // Create client with short timeout
    client := NewClientWithOptions(server.URL, "test-token", ClientOptions{
        Timeout: 100 * time.Millisecond,
    })

    ctx := context.Background()
    _, err := client.Query(ctx, `{ viewer { login } }`, nil)

    require.Error(t, err)
    assert.Contains(t, err.Error(), "timeout")
}
```

---

## Table-Driven Tests

### Comprehensive Query Tests

```go
func TestGraphQLClient_Queries(t *testing.T) {
    tests := []struct {
        name           string
        query          string
        variables      map[string]interface{}
        mockResponse   map[string]interface{}
        mockStatusCode int
        expectError    bool
        errorContains  string
    }{
        {
            name:  "successful query",
            query: `{ viewer { login } }`,
            mockResponse: map[string]interface{}{
                "data": map[string]interface{}{
                    "viewer": map[string]interface{}{"login": "testuser"},
                },
            },
            mockStatusCode: 200,
            expectError:    false,
        },
        {
            name:  "query with variables",
            query: `query GetRepo($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { name } }`,
            variables: map[string]interface{}{
                "owner": "org",
                "name":  "repo",
            },
            mockResponse: map[string]interface{}{
                "data": map[string]interface{}{
                    "repository": map[string]interface{}{"name": "repo"},
                },
            },
            mockStatusCode: 200,
            expectError:    false,
        },
        {
            name:  "GraphQL error",
            query: `{ invalid }`,
            mockResponse: map[string]interface{}{
                "errors": []map[string]interface{}{
                    {"message": "Field 'invalid' doesn't exist"},
                },
            },
            mockStatusCode: 200,
            expectError:    true,
            errorContains:  "doesn't exist",
        },
        {
            name:           "server error",
            query:          `{ viewer { login } }`,
            mockResponse:   nil,
            mockStatusCode: 500,
            expectError:    true,
            errorContains:  "500",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                w.WriteHeader(tt.mockStatusCode)
                if tt.mockResponse != nil {
                    json.NewEncoder(w).Encode(tt.mockResponse)
                }
            }))
            defer server.Close()

            client := NewClient(server.URL, "test-token")
            _, err := client.Query(context.Background(), tt.query, tt.variables)

            if tt.expectError {
                require.Error(t, err)
                if tt.errorContains != "" {
                    assert.Contains(t, err.Error(), tt.errorContains)
                }
            } else {
                require.NoError(t, err)
            }
        })
    }
}
```

---

## Integration Test Patterns

### With Real API (Skip in CI)

```go
func TestGraphQLClient_Integration(t *testing.T) {
    // Skip if no token provided
    token := os.Getenv("GITHUB_TOKEN")
    if token == "" {
        t.Skip("GITHUB_TOKEN not set, skipping integration test")
    }

    client := NewClient("https://api.github.com/graphql", token)

    query := `
        query {
            viewer {
                login
            }
            rateLimit {
                remaining
            }
        }
    `

    result, err := client.Query(context.Background(), query, nil)

    require.NoError(t, err)
    assert.NotNil(t, result)

    var resp struct {
        Viewer struct {
            Login string `json:"login"`
        } `json:"viewer"`
        RateLimit struct {
            Remaining int `json:"remaining"`
        } `json:"rateLimit"`
    }

    err = json.Unmarshal(result.Data, &resp)
    require.NoError(t, err)
    assert.NotEmpty(t, resp.Viewer.Login)
    assert.Greater(t, resp.RateLimit.Remaining, 0)
}
```

---

## Test Helpers

### Response Builder

```go
// testutil/graphql.go
package testutil

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
)

// GraphQLResponse builds mock responses
type GraphQLResponse struct {
    Data   interface{}            `json:"data,omitempty"`
    Errors []map[string]interface{} `json:"errors,omitempty"`
}

// MockGraphQLServer creates a configurable mock server
func MockGraphQLServer(handler func(query string, variables map[string]interface{}) GraphQLResponse) *httptest.Server {
    return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        var req struct {
            Query     string                 `json:"query"`
            Variables map[string]interface{} `json:"variables"`
        }
        json.NewDecoder(r.Body).Decode(&req)

        response := handler(req.Query, req.Variables)

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(response)
    }))
}

// Usage
func TestWithMockServer(t *testing.T) {
    server := testutil.MockGraphQLServer(func(query string, vars map[string]interface{}) testutil.GraphQLResponse {
        if strings.Contains(query, "viewer") {
            return testutil.GraphQLResponse{
                Data: map[string]interface{}{
                    "viewer": map[string]interface{}{"login": "testuser"},
                },
            }
        }
        return testutil.GraphQLResponse{
            Errors: []map[string]interface{}{
                {"message": "Unknown query"},
            },
        }
    })
    defer server.Close()

    // Use server.URL in tests
}
```

---

## Test Coverage Checklist

- [ ] **Happy path**: Successful queries with data
- [ ] **Pagination**: Multiple pages, empty pages, single page
- [ ] **Batch queries**: Multiple aliases, partial failures
- [ ] **Rate limiting**: Headers parsed, proactive throttling
- [ ] **GraphQL errors**: Single error, multiple errors, partial data
- [ ] **HTTP errors**: 4xx, 5xx status codes
- [ ] **Network errors**: Connection refused, timeout, DNS failure
- [ ] **Context cancellation**: Request cancelled mid-flight
- [ ] **Retry logic**: Transient errors retried, permanent errors fail fast
- [ ] **Variable binding**: Different types, null values, missing values

## References

- [Go httptest Package](https://pkg.go.dev/net/http/httptest)
- [testify/assert](https://github.com/stretchr/testify)
- [Testing in Go](https://go.dev/doc/tutorial/add-a-test)
