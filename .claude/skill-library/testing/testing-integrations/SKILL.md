---
name: testing-integrations
description: Use when writing tests for Chariot backend integrations (Go) - provides patterns for mock HTTP servers, mock collectors, P0 compliance testing, and Go test best practices
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Testing Integrations

**Comprehensive testing patterns for Chariot backend integrations with third-party APIs.**

## When to Use

Use this skill when:

- Writing unit tests for new integrations
- Writing integration tests with mock servers
- Testing rate limit handling and retry logic
- Testing pagination edge cases
- Verifying P0 compliance in tests (VMFilter, CheckAffiliation, ValidateCredentials, errgroup)

## Quick Reference

| Test Type               | Pattern                  | Reference                     |
| ----------------------- | ------------------------ | ----------------------------- |
| Mock HTTP servers       | httptest.NewServer       | [mock-server-patterns.md]     |
| Mock Chariot collectors | mock.NewCollector()      | [mock-collector-patterns.md]  |
| Credentials             | In-memory test creds     | [credential-mocking.md]       |
| Pagination              | Multi-page responses     | [pagination-testing.md]       |
| Rate limits             | 429 + Retry-After        | [rate-limit-testing.md]       |
| Concurrency             | errgroup with -race      | [errgroup-testing.md]         |
| Test structure          | Table-driven tests       | [table-driven-patterns.md]    |
| P0 compliance           | Mandatory test cases     | [required-test-cases.md]      |
| Build tags              | `//go:build integration` | See Integration Tests section |

## Required Test Cases for Every Integration

Every Chariot integration MUST have test coverage for these P0 requirements:

### 1. ValidateCredentials Tests

**Purpose**: Verify credential validation logic

**Required scenarios**:

- ✅ Success case (valid credentials return nil error)
- ✅ Failure case (401 Unauthorized returns error)
- ✅ Expired token case (if applicable, return error)

**See**: [required-test-cases.md](references/required-test-cases.md#validatecredentials-tests)

### 2. Discover/Enumerate Tests

**Purpose**: Verify asset discovery and Tabularium mapping

**Required scenarios**:

- ✅ Returns assets with correct Tabularium class/attributes
- ✅ Handles empty response gracefully (no panic)
- ✅ Handles pagination (fetches multiple pages)
- ✅ Respects maxPages limit (prevents infinite loops)
- ✅ VMFilter filters assets by username correctly

**See**: [required-test-cases.md](references/required-test-cases.md#discover-enumerate-tests)

### 3. CheckAffiliation Tests

**Purpose**: Verify asset ownership validation

**Required scenarios**:

- ✅ Returns true for affiliated asset
- ✅ Returns false for unaffiliated asset
- ✅ Handles 404 (asset not found) gracefully

**See**: [required-test-cases.md](references/required-test-cases.md#checkaffiliation-tests)

### 4. Error Handling Tests

**Purpose**: Verify resilience to API failures

**Required scenarios**:

- ✅ Rate limit (429) triggers exponential backoff
- ✅ Server error (5xx) triggers retry logic
- ✅ Network timeout handled gracefully
- ✅ Context cancellation stops processing immediately

**See**: [rate-limit-testing.md](references/rate-limit-testing.md), [required-test-cases.md](references/required-test-cases.md#error-handling-tests)

### 5. Concurrency Tests

**Purpose**: Verify thread-safety and concurrency correctness

**Required scenarios**:

- ✅ errgroup.SetLimit() respected (no goroutine explosion)
- ✅ Loop variable capture correct (no race conditions)
- ✅ Run with `-race` flag to detect data races

**See**: [errgroup-testing.md](references/errgroup-testing.md)

## Mock Patterns

### Mock HTTP Servers (httptest)

Use Go's `httptest` package to simulate external APIs:

```go
server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    // Verify request
    if r.Header.Get("Authorization") != "Bearer test-token" {
        w.WriteHeader(http.StatusUnauthorized)
        return
    }

    // Return mock response
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(mockResponse)
}))
defer server.Close()
```

**See**: [mock-server-patterns.md](references/mock-server-patterns.md) for complete patterns including:

- Status code simulation (200, 401, 403, 404, 429, 500)
- Paginated responses
- Rate limiting with Retry-After headers
- Header verification

### Mock Chariot Collectors

Use `mock.Collector` from `modules/chariot/backend/pkg/tasks/integrations/mock`:

```go
collector := mock.NewCollector()
job := &tasks.Job{Collector: collector}

// Run integration
err := integration.Discover(ctx, job, credentials)

// Assert on collected assets
assert.NoError(t, err)
assert.Len(t, collector.Assets, expectedCount)
assert.Equal(t, "ipv4", collector.Assets[0].Class)
```

**See**: [mock-collector-patterns.md](references/mock-collector-patterns.md) for:

- Creating mock collectors
- Capturing Job.Send() calls
- Asserting on assets/risks/attributes
- Verifying Tabularium mapping

## Test Structure

### File Organization

```
integrations/vendor/
├── vendor.go                      # Integration implementation
├── vendor_test.go                 # Unit tests with mocks
└── vendor_integration_test.go     # Integration tests (build tag)
```

**Unit tests** (`vendor_test.go`):

- Fast, no external dependencies
- Use httptest for HTTP mocking
- Use mock.Collector for Chariot backend
- Run with: `go test`

**Integration tests** (`vendor_integration_test.go`):

- May call real sandbox APIs (if available)
- Use build tag: `//go:build integration`
- Run with: `go test -tags=integration`

### Table-Driven Tests

Go best practice for testing multiple scenarios:

```go
func TestIntegration_Discover(t *testing.T) {
    tests := []struct {
        name         string
        mockResponse string
        mockStatus   int
        wantAssets   int
        wantErr      bool
    }{
        {
            name:         "success with assets",
            mockResponse: `{"assets": [...]}`,
            mockStatus:   http.StatusOK,
            wantAssets:   3,
            wantErr:      false,
        },
        {
            name:         "empty response",
            mockResponse: `{"assets": []}`,
            mockStatus:   http.StatusOK,
            wantAssets:   0,
            wantErr:      false,
        },
        {
            name:         "rate limit",
            mockResponse: `{"error": "rate limit"}`,
            mockStatus:   http.StatusTooManyRequests,
            wantAssets:   0,
            wantErr:      true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Setup mock server
            server := httptest.NewServer(...)
            defer server.Close()

            // Run test
            result, err := integration.Discover(...)

            // Assert
            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
                assert.Len(t, result, tt.wantAssets)
            }
        })
    }
}
```

**See**: [table-driven-patterns.md](references/table-driven-patterns.md) for:

- Test case structure
- Subtests with t.Run()
- Parallel execution (when safe)
- Common test scenarios

## Coverage Requirements

**Minimum**: 80% code coverage for integration code
**Target**: 95%+ for P0 requirement functions

**Measure coverage**:

```bash
go test -cover ./integrations/vendor/
go test -coverprofile=coverage.out ./integrations/vendor/
go tool cover -html=coverage.out
```

**Critical**: All P0 requirements (ValidateCredentials, CheckAffiliation, VMFilter, errgroup, pagination) MUST have test coverage.

## Build Tags for Integration Tests

Separate unit tests from integration tests using build tags:

**Integration test file** (`vendor_integration_test.go`):

```go
//go:build integration

package vendor

import "testing"

func TestIntegration_RealAPI(t *testing.T) {
    // Tests that call real sandbox APIs
}
```

**Run only unit tests** (default):

```bash
go test ./integrations/vendor/
```

**Run integration tests**:

```bash
go test -tags=integration ./integrations/vendor/
```

**Why**: Integration tests may be slow or require external services. Build tags allow running fast unit tests by default and integration tests on-demand.

## Reference Files

For detailed patterns and examples, see:

- [mock-server-patterns.md](references/mock-server-patterns.md) - httptest patterns for Go
- [mock-collector-patterns.md](references/mock-collector-patterns.md) - Chariot mock.Collector usage
- [credential-mocking.md](references/credential-mocking.md) - Testing without real secrets
- [pagination-testing.md](references/pagination-testing.md) - Testing pagination edge cases
- [rate-limit-testing.md](references/rate-limit-testing.md) - Testing 429 handling and backoff
- [errgroup-testing.md](references/errgroup-testing.md) - Testing concurrent operations
- [required-test-cases.md](references/required-test-cases.md) - Mandatory test coverage checklist
- [table-driven-patterns.md](references/table-driven-patterns.md) - Go table-driven test patterns

## Reference Existing Code

**Integration examples**:

- `modules/chariot/backend/pkg/tasks/integrations/` - Existing integration implementations and tests
- `modules/chariot/backend/pkg/tasks/integrations/mock/` - Mock patterns and utilities

**Related skills**:

- `developing-integrations` - P0 requirements that tests must verify
- `gateway-backend` - Go testing patterns
- `writing-integration-tests-first` - TDD approach for integrations

## Integration

### Called By

- `integration-developer` agent (Step 1: Load testing patterns)
- `backend-tester` agent (integration mode)
- `capability-tester` agent (for scanner integration tests)

### Requires (invoke before starting)

| Skill                     | When  | Purpose                            |
| ------------------------- | ----- | ---------------------------------- |
| `developing-integrations` | Start | Understand P0 requirements to test |

### Calls (during execution)

| Skill                             | Phase/Step | Purpose                    |
| --------------------------------- | ---------- | -------------------------- |
| `writing-integration-tests-first` | Optional   | TDD workflow if applicable |

### Pairs With (conditional)

| Skill                 | Trigger                  | Purpose                        |
| --------------------- | ------------------------ | ------------------------------ |
| `gateway-backend`     | Need Go testing patterns | General Go test best practices |
| `developing-with-tdd` | TDD workflow             | Test-first development         |
