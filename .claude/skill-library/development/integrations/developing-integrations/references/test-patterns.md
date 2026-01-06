# Integration Test Patterns

Validated test patterns from production integration test suites.

## Core Testing Principles

1. **Table-Driven Tests** - Test multiple scenarios with minimal code
2. **Mock HTTP Servers** - Isolate external dependencies
3. **Mock Collectors** - Test asset emission without real API calls
4. **Race Detection** - Always run with `-race` flag

---

## Pattern 1: Table-Driven Tests

**Used by**: Most integrations
**Best Example**: `seed-import_test.go` (488 lines)

### Use Case

- Testing multiple input scenarios
- Validating error conditions
- Ensuring consistent behavior across cases

### Implementation

```go
func TestIntegration_ValidateCredentials(t *testing.T) {
    tests := []struct {
        name          string
        secret        map[string]string
        expectError   bool
        errorContains string
    }{
        {
            name: "valid configuration",
            secret: map[string]string{
                "token": "valid-token",
                "url":   "https://api.example.com",
            },
            expectError: false,
        },
        {
            name: "missing token",
            secret: map[string]string{
                "url": "https://api.example.com",
            },
            expectError:   true,
            errorContains: "missing token",
        },
        {
            name: "missing url",
            secret: map[string]string{
                "token": "valid-token",
            },
            expectError:   true,
            errorContains: "missing url",
        },
        {
            name: "invalid url format",
            secret: map[string]string{
                "token": "valid-token",
                "url":   "not-a-url",
            },
            expectError:   true,
            errorContains: "invalid URL",
        },
        {
            name: "empty token value",
            secret: map[string]string{
                "token": "",
                "url":   "https://api.example.com",
            },
            expectError:   true,
            errorContains: "token cannot be empty",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            job := model.Job{Secret: tt.secret}
            integration := NewIntegration(job, &model.Integration{})

            err := integration.ValidateCredentials()

            if tt.expectError {
                require.Error(t, err, "expected error but got none")
                if tt.errorContains != "" {
                    assert.Contains(t, err.Error(), tt.errorContains,
                        "error message should contain expected substring")
                }
            } else {
                assert.NoError(t, err, "expected no error but got: %v", err)
            }
        })
    }
}
```

### Key Points

- Each test case is isolated with `t.Run()`
- Covers success and failure paths
- Validates specific error messages
- Clear test names describe scenario
- Easy to add new test cases

### Expanding to Other Methods

```go
func TestIntegration_CheckAffiliation(t *testing.T) {
    tests := []struct {
        name          string
        asset         model.Asset
        mockResponse  map[string]interface{}
        mockStatus    int
        expectAffiliated bool
        expectError   bool
        errorContains string
    }{
        {
            name: "asset is affiliated",
            asset: model.Asset{
                CloudId: "asset-123",
                DNS:     "server.example.com",
            },
            mockResponse: map[string]interface{}{
                "id":        "asset-123",
                "deletedAt": nil,
            },
            mockStatus:       http.StatusOK,
            expectAffiliated: true,
            expectError:      false,
        },
        {
            name: "asset not found",
            asset: model.Asset{
                CloudId: "asset-999",
            },
            mockResponse:     map[string]interface{}{},
            mockStatus:       http.StatusNotFound,
            expectAffiliated: false,
            expectError:      false,
        },
        {
            name: "asset deleted",
            asset: model.Asset{
                CloudId: "asset-456",
            },
            mockResponse: map[string]interface{}{
                "id":        "asset-456",
                "deletedAt": "2024-01-01T00:00:00Z",
            },
            mockStatus:       http.StatusOK,
            expectAffiliated: false,
            expectError:      false,
        },
        {
            name: "missing cloud ID",
            asset: model.Asset{
                DNS: "server.example.com",
            },
            expectError:   true,
            errorContains: "no cloud ID",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Setup mock server (see Pattern 2)
            server := setupMockServer(tt.mockResponse, tt.mockStatus)
            defer server.Close()

            integration := setupIntegration(server.URL)

            affiliated, err := integration.CheckAffiliation(tt.asset)

            if tt.expectError {
                require.Error(t, err)
                if tt.errorContains != "" {
                    assert.Contains(t, err.Error(), tt.errorContains)
                }
            } else {
                assert.NoError(t, err)
                assert.Equal(t, tt.expectAffiliated, affiliated)
            }
        })
    }
}
```

---

## Pattern 2: Mock HTTP Server

**Used by**: OAuth integrations, REST API integrations
**Best Example**: `pingone_test.go` (463 lines)

### Use Case

- Testing without real external APIs
- Simulating various API responses
- Testing error handling

### Implementation

```go
func TestIntegration_WithMockServer(t *testing.T) {
    // 1. Create mock OAuth server
    authServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Route based on path
        switch r.URL.Path {
        case "/oauth/token":
            if r.Method != "POST" {
                w.WriteHeader(http.StatusMethodNotAllowed)
                return
            }

            // Validate request body
            if err := r.ParseForm(); err != nil {
                w.WriteHeader(http.StatusBadRequest)
                return
            }

            grantType := r.Form.Get("grant_type")
            if grantType != "client_credentials" {
                w.WriteHeader(http.StatusBadRequest)
                w.Write([]byte(`{"error": "unsupported_grant_type"}`))
                return
            }

            // Return mock token
            w.Header().Set("Content-Type", "application/json")
            w.WriteHeader(http.StatusOK)
            w.Write([]byte(`{
                "access_token": "test-token-12345",
                "expires_in": 3600,
                "token_type": "Bearer"
            }`))
            return

        default:
            w.WriteHeader(http.StatusNotFound)
        }
    }))
    defer authServer.Close()

    // 2. Create mock API server
    apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Validate authentication
        authHeader := r.Header.Get("Authorization")
        if authHeader != "Bearer test-token-12345" {
            w.WriteHeader(http.StatusUnauthorized)
            return
        }

        // Route API calls
        switch r.URL.Path {
        case "/api/v1/resources":
            w.Header().Set("Content-Type", "application/json")
            w.WriteHeader(http.StatusOK)
            w.Write([]byte(`{
                "resources": [
                    {"id": "res-1", "name": "Resource 1"},
                    {"id": "res-2", "name": "Resource 2"}
                ],
                "nextToken": ""
            }`))
            return

        case "/api/v1/resources/res-1":
            w.Header().Set("Content-Type", "application/json")
            w.WriteHeader(http.StatusOK)
            w.Write([]byte(`{"id": "res-1", "name": "Resource 1", "status": "active"}`))
            return

        default:
            w.WriteHeader(http.StatusNotFound)
        }
    }))
    defer apiServer.Close()

    // 3. Create integration with mock URLs
    job := model.Job{
        Secret: map[string]string{
            "client_id":     "test-client",
            "client_secret": "test-secret",
            "auth_url":      authServer.URL,
            "api_url":       apiServer.URL,
        },
    }

    integration := model.NewIntegration("test", apiServer.URL)
    task := NewTestIntegration(job, &integration)

    // Override URLs to use mock servers
    task.authURL = authServer.URL
    task.apiURL = apiServer.URL

    // 4. Test ValidateCredentials
    err := task.ValidateCredentials()
    assert.NoError(t, err)

    // 5. Test Invoke
    err = task.Invoke()
    assert.NoError(t, err)
}
```

### Advanced Mock Server Patterns

#### Stateful Mock Server

```go
func TestIntegration_Pagination(t *testing.T) {
    pageCount := 0
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        pageCount++

        var nextToken string
        if pageCount < 3 {
            nextToken = fmt.Sprintf("page-%d", pageCount+1)
        }

        response := map[string]interface{}{
            "items":     []string{fmt.Sprintf("item-%d", pageCount)},
            "nextToken": nextToken,
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(response)
    }))
    defer server.Close()

    // Test pagination...
    // Should make 3 requests total
    assert.Equal(t, 3, pageCount)
}
```

#### Error Simulation

```go
func TestIntegration_RetryLogic(t *testing.T) {
    attemptCount := 0
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        attemptCount++

        // Fail first 2 attempts, succeed on 3rd
        if attemptCount < 3 {
            w.WriteHeader(http.StatusServiceUnavailable)
            return
        }

        w.WriteHeader(http.StatusOK)
        w.Write([]byte(`{"success": true}`))
    }))
    defer server.Close()

    // Test retry logic...
    assert.Equal(t, 3, attemptCount)
}
```

---

## Pattern 3: Mock Collector

**Used by**: Integration tests
**Best Example**: `xpanse_mock_test.go` (324 lines)

### Use Case

- Testing asset emission without real AWS/Neo4j
- Validating VMFilter application
- Asserting expected assets created

### Implementation

```go
func TestIntegration_WithMockCollector(t *testing.T) {
    // 1. Setup integration and job
    integration := model.NewIntegration("xpanse", "test.xpanse.io")
    job := model.NewJob("xpanse", &integration)
    job.Secret = map[string]string{
        "api_key":    "test-key",
        "api_key_id": "test-key-id",
    }

    // 2. Create integration with mock collectors
    task := NewXpanse(
        job,
        &integration,
        mock.MockCollectors(&integration, &Xpanse{})...,
    )

    // 3. Setup mock AWS (fake data store)
    aws := mock.NewMockAWS("test@example.com")

    // 4. Run integration with invoker
    inv := invoker.NewInvoker(aws, task)
    err := inv.Invoke()
    require.NoError(t, err)

    // 5. Assert expected assets were created
    expectedAsset := model.NewAsset("example.com", "example.com")
    assertions.GraphItemExists(t, aws, &expectedAsset)

    // 6. Assert asset attributes
    assets := aws.GetAssets()
    assert.Len(t, assets, 1)
    assert.Equal(t, "example.com", assets[0].DNS)
    assert.Equal(t, "xpanse", assets[0].CloudProvider)
}
```

### Testing VMFilter

```go
func TestIntegration_VMFilter(t *testing.T) {
    integration := model.NewIntegration("test", "test.example.com")
    job := model.NewJob("test", &integration)
    job.Username = "user@example.com" // VMFilter key

    task := NewTestIntegration(job, &integration)
    aws := mock.NewMockAWS("user@example.com")

    // Create assets with different usernames
    asset1 := model.NewAsset("asset1.example.com", "1.2.3.4")
    asset1.Username = "user@example.com" // Matches filter

    asset2 := model.NewAsset("asset2.example.com", "5.6.7.8")
    asset2.Username = "other@example.com" // Doesn't match

    // Apply VMFilter
    task.Filter.Asset(&asset1)
    task.Filter.Asset(&asset2)

    // Send both
    task.Job.Send(&asset1)
    task.Job.Send(&asset2)

    // Only asset1 should be emitted
    assets := aws.GetAssets()
    assert.Len(t, assets, 1)
    assert.Equal(t, "asset1.example.com", assets[0].DNS)
}
```

### Testing CheckAffiliation

```go
func TestIntegration_CheckAffiliation_WithMock(t *testing.T) {
    integration := model.NewIntegration("test", "test.example.com")
    job := model.NewJob("test", &integration)

    task := NewTestIntegration(job, &integration)
    aws := mock.NewMockAWS("user@example.com")

    // Pre-populate mock data store with known assets
    knownAsset := model.NewAsset("known.example.com", "1.2.3.4")
    knownAsset.CloudId = "asset-123"
    aws.AddAsset(&knownAsset)

    // Test affiliated asset
    asset := model.Asset{CloudId: "asset-123"}
    affiliated, err := task.CheckAffiliation(asset)
    assert.NoError(t, err)
    assert.True(t, affiliated)

    // Test unaffiliated asset
    unknownAsset := model.Asset{CloudId: "asset-999"}
    affiliated, err = task.CheckAffiliation(unknownAsset)
    assert.NoError(t, err)
    assert.False(t, affiliated)
}
```

---

## Pattern 4: Race Detection Tests

### Use Case

- Finding concurrency bugs
- Validating errgroup usage
- Ensuring thread-safe operations

### Implementation

```go
func TestIntegration_ConcurrentProcessing(t *testing.T) {
    integration := model.NewIntegration("test", "test.example.com")
    job := model.NewJob("test", &integration)
    task := NewTestIntegration(job, &integration)
    aws := mock.NewMockAWS("user@example.com")

    // Process many items concurrently
    items := make([]string, 100)
    for i := range items {
        items[i] = fmt.Sprintf("item-%d", i)
    }

    g := errgroup.Group{}
    g.SetLimit(10)

    for _, item := range items {
        item := item // Capture loop variable
        g.Go(func() error {
            asset := model.NewAsset(item, "")
            task.Filter.Asset(&asset)
            task.Job.Send(&asset)
            return nil
        })
    }

    err := g.Wait()
    assert.NoError(t, err)

    // Verify all items processed
    assets := aws.GetAssets()
    assert.Len(t, assets, 100)
}

// Run with: go test -race ./pkg/tasks/integrations/...
```

### Race Detection Command

```bash
# Run all integration tests with race detector
go test -race -v ./modules/chariot/backend/pkg/tasks/integrations/...

# Run specific test with race detector
go test -race -v -run TestIntegration_ConcurrentProcessing ./pkg/tasks/integrations/xpanse

# Run with timeout (important for CI)
go test -race -timeout 5m ./pkg/tasks/integrations/...
```

---

## Complete Test Suite Structure

```go
package integrations

import (
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

// TestIntegration_ValidateCredentials tests credential validation
func TestIntegration_ValidateCredentials(t *testing.T) {
    // Table-driven tests for various credential scenarios
}

// TestIntegration_CheckAffiliation tests affiliation checking
func TestIntegration_CheckAffiliation(t *testing.T) {
    // Table-driven tests for affiliated/unaffiliated assets
}

// TestIntegration_Invoke tests full integration execution
func TestIntegration_Invoke(t *testing.T) {
    // Mock server + mock collector test
}

// TestIntegration_Pagination tests pagination logic
func TestIntegration_Pagination(t *testing.T) {
    // Stateful mock server simulating multiple pages
}

// TestIntegration_ErrorHandling tests error propagation
func TestIntegration_ErrorHandling(t *testing.T) {
    // Mock server returning various error conditions
}

// TestIntegration_VMFilter tests asset filtering
func TestIntegration_VMFilter(t *testing.T) {
    // Mock collector with different usernames
}

// TestIntegration_Concurrency tests concurrent processing
func TestIntegration_Concurrency(t *testing.T) {
    // errgroup test with race detector
}

// TestIntegration_RateLimit tests rate limiting
func TestIntegration_RateLimit(t *testing.T) {
    // Verify rate limiter applied correctly
}
```

---

## Test Checklist

- [ ] ValidateCredentials success/failure cases
- [ ] CheckAffiliation affiliated/unaffiliated/error cases
- [ ] VMFilter application (different usernames)
- [ ] Pagination loop termination (maxPages)
- [ ] Error propagation (no silent failures)
- [ ] Concurrent processing (errgroup limits)
- [ ] Rate limiting (if applicable)
- [ ] All tests pass with `-race` flag
- [ ] Mock servers closed with `defer server.Close()`
- [ ] Assertions use testify/assert or testify/require
- [ ] Test names clearly describe scenario
- [ ] Table-driven tests for multiple cases

---

## Common Mistakes

### ❌ Not Deferring Server Close

```go
server := httptest.NewServer(...)
// Forgot defer server.Close()
```

**Fix**: Always defer:

```go
server := httptest.NewServer(...)
defer server.Close()
```

### ❌ Not Using t.Run for Table Tests

```go
for _, tt := range tests {
    // Direct test without t.Run - failures unclear
    err := function(tt.input)
    assert.NoError(t, err)
}
```

**Fix**: Use t.Run:

```go
for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) {
        err := function(tt.input)
        assert.NoError(t, err)
    })
}
```

### ❌ Not Testing Error Messages

```go
assert.Error(t, err) // Just checks error exists
```

**Fix**: Validate error content:

```go
require.Error(t, err)
assert.Contains(t, err.Error(), "expected substring")
```

### ❌ Forgetting Race Detector

```bash
go test ./... # Missing -race flag
```

**Fix**: Always use `-race`:

```bash
go test -race ./...
```
