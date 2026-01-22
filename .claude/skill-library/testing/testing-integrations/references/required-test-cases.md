# Required Test Cases

**Mandatory test coverage checklist for every Chariot integration (P0 requirements).**

## P0 Requirements

Every Chariot backend integration MUST implement and test these P0 requirements:

1. **ValidateCredentials** - Verify credential validity before discovery
2. **CheckAffiliation** - Verify asset ownership (prevents data leakage)
3. **VMFilter** - Filter assets by username (multi-tenant isolation)
4. **errgroup.SetLimit()** - Limit concurrent goroutines (prevent goroutine explosion)
5. **Pagination** - Respect maxPages limit (prevent infinite loops)

## 1. ValidateCredentials Tests

### Required Scenarios

- ✅ Success case (valid credentials return nil error)
- ✅ Failure case (401 Unauthorized returns error)
- ✅ Expired token case (if applicable, return error)

### Example

```go
func TestIntegration_ValidateCredentials(t *testing.T) {
    tests := []struct {
        name        string
        credentials map[string]string
        mockStatus  int
        wantErr     bool
        errContains string
    }{
        {
            name:        "valid credentials",
            credentials: map[string]string{"api_key": "valid-key"},
            mockStatus:  http.StatusOK,
            wantErr:     false,
        },
        {
            name:        "invalid credentials - 401",
            credentials: map[string]string{"api_key": "invalid-key"},
            mockStatus:  http.StatusUnauthorized,
            wantErr:     true,
            errContains: "authentication failed",
        },
        {
            name:        "expired token",
            credentials: map[string]string{"api_key": "expired-key"},
            mockStatus:  http.StatusUnauthorized,
            wantErr:     true,
            errContains: "token expired",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                w.WriteHeader(tt.mockStatus)
            }))
            defer server.Close()

            integration := model.NewIntegration("test", server.URL)
            job := model.NewJob("test", &integration)
            job.Secret = tt.credentials

            task := NewIntegration(job, &integration, base.WithHTTPBaseURL(server.URL))
            err := task.ValidateCredentials()

            if tt.wantErr {
                require.Error(t, err)
                if tt.errContains != "" {
                    require.Contains(t, err.Error(), tt.errContains)
                }
            } else {
                require.NoError(t, err)
            }
        })
    }
}
```

## 2. Discover/Enumerate Tests

### Required Scenarios

- ✅ Returns assets with correct Tabularium class/attributes
- ✅ Handles empty response gracefully (no panic)
- ✅ Handles pagination (fetches multiple pages)
- ✅ Respects maxPages limit (prevents infinite loops)
- ✅ VMFilter filters assets by username correctly

### Example

```go
func TestIntegration_Discover(t *testing.T) {
    integration := model.NewIntegration("test", "example.com")
    job := model.NewJob("test", &integration)

    task := NewIntegration(job, &integration, mock.MockCollectors(&integration, &Integration{})...)
    aws := mock.NewMockAWS("test@example.com")

    inv := invoker.NewInvoker(aws, task)
    err := inv.Invoke()
    require.NoError(t, err)

    // Verify asset created
    expectedAsset := model.NewAsset("example.com", "example.com")
    assertions.GraphItemExists(t, aws, &expectedAsset)

    // Verify Tabularium mapping
    assertions.GraphItemCondition(t, aws, expectedAsset.Key, func(a *model.Asset) {
        require.Equal(t, "domain", a.Class)
        require.Equal(t, "A", a.Status)  // Active
    })
}
```

### Empty Response Test

```go
func TestIntegration_DiscoverEmpty(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]interface{}{
            "items": []interface{}{},  // Empty
        })
    }))
    defer server.Close()

    integration := model.NewIntegration("test", server.URL)
    job := model.NewJob("test", &integration)

    task := NewIntegration(job, &integration, base.WithHTTPBaseURL(server.URL))
    aws := mock.NewMockAWS("test@example.com")

    inv := invoker.NewInvoker(aws, task)
    err := inv.Invoke()

    // Should complete without error
    require.NoError(t, err)
    assert.Equal(t, 0, len(aws.Graph.Nodes))
}
```

### Pagination Test

```go
func TestIntegration_DiscoverPagination(t *testing.T) {
    page1Called := false
    page2Called := false

    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        page := r.URL.Query().Get("page")

        if page == "" || page == "1" {
            page1Called = true
            json.NewEncoder(w).Encode(map[string]interface{}{
                "items":    []map[string]string{{"id": "1"}, {"id": "2"}},
                "next_page": server.URL + "?page=2",
            })
        } else if page == "2" {
            page2Called = true
            json.NewEncoder(w).Encode(map[string]interface{}{
                "items":    []map[string]string{{"id": "3"}},
                "next_page": "",  // Last page
            })
        }
    }))
    defer server.Close()

    integration := model.NewIntegration("test", server.URL)
    job := model.NewJob("test", &integration)

    task := NewIntegration(job, &integration, base.WithHTTPBaseURL(server.URL))
    aws := mock.NewMockAWS("test@example.com")

    inv := invoker.NewInvoker(aws, task)
    err := inv.Invoke()

    require.NoError(t, err)
    assert.True(t, page1Called && page2Called, "Should fetch all pages")
    assert.Equal(t, 3, len(aws.Graph.Nodes))
}
```

### maxPages Limit Test

```go
func TestIntegration_MaxPagesLimit(t *testing.T) {
    requestCount := 0

    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        requestCount++

        // Always return next page (infinite pagination simulation)
        json.NewEncoder(w).Encode(map[string]interface{}{
            "items":    []map[string]string{{"id": fmt.Sprintf("%d", requestCount)}},
            "next_page": server.URL + fmt.Sprintf("?page=%d", requestCount+1),
        })
    }))
    defer server.Close()

    integration := model.NewIntegration("test", server.URL)
    job := model.NewJob("test", &integration)

    task := NewIntegration(job, &integration,
        base.WithHTTPBaseURL(server.URL),
        base.WithMaxPages(5),  // Limit to 5 pages
    )
    aws := mock.NewMockAWS("test@example.com")

    inv := invoker.NewInvoker(aws, task)
    err := inv.Invoke()

    require.NoError(t, err)
    assert.Equal(t, 5, requestCount, "Should respect maxPages limit")
}
```

## 3. CheckAffiliation Tests

### Required Scenarios

- ✅ Returns true for affiliated asset
- ✅ Returns false for unaffiliated asset
- ✅ Handles 404 (asset not found) gracefully

### Example

```go
func TestIntegration_CheckAffiliation(t *testing.T) {
    tests := []struct {
        name       string
        assetDNS   string
        mockStatus int
        mockBody   string
        want       bool
        wantErr    bool
    }{
        {
            name:       "affiliated asset",
            assetDNS:   "example.com",
            mockStatus: http.StatusOK,
            mockBody:   `{"affiliated": true}`,
            want:       true,
            wantErr:    false,
        },
        {
            name:       "unaffiliated asset",
            assetDNS:   "other.com",
            mockStatus: http.StatusOK,
            mockBody:   `{"affiliated": false}`,
            want:       false,
            wantErr:    false,
        },
        {
            name:       "asset not found",
            assetDNS:   "notfound.com",
            mockStatus: http.StatusNotFound,
            mockBody:   `{"error": "not_found"}`,
            want:       false,
            wantErr:    false,  // 404 is gracefully handled
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                w.WriteHeader(tt.mockStatus)
                w.Write([]byte(tt.mockBody))
            }))
            defer server.Close()

            integration := model.NewIntegration("test", server.URL)
            job := model.NewJob("test", &integration)
            task := NewIntegration(job, &integration, base.WithHTTPBaseURL(server.URL))

            asset := model.NewAsset(tt.assetDNS, tt.assetDNS)
            affiliated, err := task.CheckAffiliation(&asset)

            if tt.wantErr {
                require.Error(t, err)
            } else {
                require.NoError(t, err)
                assert.Equal(t, tt.want, affiliated)
            }
        })
    }
}
```

## 4. Error Handling Tests

### Required Scenarios

- ✅ Rate limit (429) triggers exponential backoff
- ✅ Server error (5xx) triggers retry logic
- ✅ Network timeout handled gracefully
- ✅ Context cancellation stops processing immediately

### Example

See [rate-limit-testing.md](rate-limit-testing.md) for comprehensive 429 handling tests.

## 5. Concurrency Tests

### Required Scenarios

- ✅ errgroup.SetLimit() respected (no goroutine explosion)
- ✅ Loop variable capture correct (no race conditions)
- ✅ Run with `-race` flag to detect data races

### Example

See [errgroup-testing.md](errgroup-testing.md) for comprehensive concurrency tests.

## Coverage Requirements

### Minimum Coverage

- **80%+ code coverage** for integration code
- **All P0 functions** must have test coverage

### Measure Coverage

```bash
go test -cover ./integrations/service/
go test -coverprofile=coverage.out ./integrations/service/
go tool cover -html=coverage.out
```

### CI/CD Requirements

```bash
# Run tests with race detector
go test -race ./integrations/...

# Run tests with coverage
go test -cover -coverprofile=coverage.out ./integrations/...

# Fail if coverage < 80%
go tool cover -func=coverage.out | grep total | awk '{print $3}' | sed 's/%//' | \
    awk '{if ($1 < 80) exit 1}'
```

## References

- P0 requirements: `.claude/skill-library/development/integrations/developing-integrations/`
- Chariot integration examples: `modules/chariot/backend/pkg/tasks/integrations/`
