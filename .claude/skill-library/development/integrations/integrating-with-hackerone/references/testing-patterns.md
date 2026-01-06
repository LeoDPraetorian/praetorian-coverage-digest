# HackerOne Integration Testing Patterns

**Last Updated:** January 3, 2026

## Overview

Comprehensive testing strategies for HackerOne integrations: unit tests, integration tests with sandbox environment, E2E tests, and contract testing patterns.

## Testing Pyramid

```
        /\
       /E2E\        5% - Full workflow tests
      /------\
     /  INT   \     25% - API integration tests (sandbox)
    /----------\
   /    UNIT    \   70% - Unit tests (mocked)
  /--------------\
```

## Unit Testing

### Mock Client Pattern

```go
package hackerone_test

import (
    "context"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
)

// MockClient implements hackerone.Client interface
type MockClient struct {
    mock.Mock
}

func (m *MockClient) GetReport(ctx context.Context, reportID string) (*hackerone.Report, error) {
    args := m.Called(ctx, reportID)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*hackerone.Report), args.Error(1)
}

func (m *MockClient) UpdateReportState(ctx context.Context, reportID, state, message string) error {
    args := m.Called(ctx, reportID, state, message)
    return args.Error(0)
}

// Test example
func TestSyncService_SyncReport(t *testing.T) {
    mockClient := new(MockClient)
    service := NewSyncService(mockClient, nil)

    // Setup mock expectations
    mockClient.On("GetReport", mock.Anything, "12345").Return(&hackerone.Report{
        ID:             "12345",
        Title:          "XSS Vulnerability",
        State:          "triaged",
        SeverityRating: "high",
    }, nil)

    // Execute
    err := service.SyncReport(context.Background(), "12345")

    // Assert
    assert.NoError(t, err)
    mockClient.AssertExpectations(t)
}
```

### Table-Driven Tests

```go
func TestMapSeverity(t *testing.T) {
    tests := []struct {
        name           string
        hackerOneSeverity string
        expectedChariot string
    }{
        {"None", "none", "info"},
        {"Low", "low", "low"},
        {"Medium", "medium", "medium"},
        {"High", "high", "high"},
        {"Critical", "critical", "critical"},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := mapSeverity(tt.hackerOneSeverity)
            assert.Equal(t, tt.expectedChariot, result)
        })
    }
}
```

### Error Handling Tests

```go
func TestClientErrorHandling(t *testing.T) {
    tests := []struct {
        name          string
        statusCode    int
        responseBody  string
        expectRetry   bool
        expectError   bool
    }{
        {
            name:         "401 Unauthorized",
            statusCode:   401,
            responseBody: `{"errors":[{"status":"401","title":"Unauthorized"}]}`,
            expectRetry:  false,
            expectError:  true,
        },
        {
            name:         "429 Rate Limited",
            statusCode:   429,
            responseBody: `{"errors":[{"status":"429","title":"Too Many Requests"}]}`,
            expectRetry:  true,
            expectError:  true,
        },
        {
            name:         "503 Service Unavailable",
            statusCode:   503,
            responseBody: `{"errors":[{"status":"503","title":"Service Unavailable"}]}`,
            expectRetry:  true,
            expectError:  true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                w.WriteHeader(tt.statusCode)
                w.Write([]byte(tt.responseBody))
            }))
            defer server.Close()

            client := hackerone.NewClient(hackerone.ClientConfig{
                BaseURL: server.URL,
            }, hackerone.NewBasicAuth("test", "test"))

            _, err := client.GetReport(context.Background(), "12345")

            if tt.expectError {
                assert.Error(t, err)

                if apiErr, ok := err.(*hackerone.APIError); ok {
                    assert.Equal(t, tt.expectRetry, apiErr.IsRetryable())
                }
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

## Integration Testing with Sandbox

**HackerOne provides sandbox environment for testing with real API calls.**

### Sandbox Configuration

```go
// test_helpers.go
package hackerone_test

import (
    "os"
    "testing"
)

func GetSandboxClient(t *testing.T) *hackerone.Client {
    tokenID := os.Getenv("HACKERONE_SANDBOX_TOKEN_ID")
    tokenValue := os.Getenv("HACKERONE_SANDBOX_TOKEN_VALUE")

    if tokenID == "" || tokenValue == "" {
        t.Skip("Sandbox credentials not configured")
    }

    return hackerone.NewClient(hackerone.ClientConfig{
        BaseURL: "https://api.sandbox.hackerone.com",
        Timeout: 30 * time.Second,
    }, hackerone.NewBasicAuth(tokenID, tokenValue))
}

func CreateTestReport(t *testing.T, client *hackerone.Client) *hackerone.Report {
    report, err := client.CreateReport(context.Background(), &hackerone.CreateReportRequest{
        ProgramHandle: "test-program",
        Title:         "Test Report - " + time.Now().Format(time.RFC3339),
        Description:   "This is a test report created by integration tests",
        Severity:      "medium",
    })

    if err != nil {
        t.Fatalf("Failed to create test report: %v", err)
    }

    // Cleanup after test
    t.Cleanup(func() {
        client.DeleteReport(context.Background(), report.ID)
    })

    return report
}
```

### Integration Test Examples

```go
func TestIntegration_ReportLifecycle(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping integration test in short mode")
    }

    client := GetSandboxClient(t)

    // Step 1: Create report
    report := CreateTestReport(t, client)
    assert.NotEmpty(t, report.ID)
    assert.Equal(t, "new", report.State)

    // Step 2: Transition to triaged
    err := client.UpdateReportState(context.Background(), report.ID, "triaged", "Confirmed vulnerability")
    assert.NoError(t, err)

    // Step 3: Verify state change
    updated, err := client.GetReport(context.Background(), report.ID)
    assert.NoError(t, err)
    assert.Equal(t, "triaged", updated.State)

    // Step 4: Add comment
    err = client.AddComment(context.Background(), report.ID, "This is a test comment")
    assert.NoError(t, err)

    // Step 5: Resolve report
    err = client.UpdateReportState(context.Background(), report.ID, "resolved", "Fixed in latest release")
    assert.NoError(t, err)

    // Step 6: Verify resolution
    resolved, err := client.GetReport(context.Background(), report.ID)
    assert.NoError(t, err)
    assert.Equal(t, "resolved", resolved.State)
}

func TestIntegration_IncrementalActivities(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping integration test in short mode")
    }

    client := GetSandboxClient(t)

    // Create activity by creating a report
    report := CreateTestReport(t, client)

    // Fetch incremental activities
    activities, err := client.GetIncrementalActivities(
        context.Background(),
        "test-program",
        time.Now().Add(-1*time.Hour), // Last hour
    )

    assert.NoError(t, err)
    assert.NotEmpty(t, activities.Data)

    // Verify our report appears in activities
    found := false
    for _, activity := range activities.Data {
        if activity.Relationships.Report.Data.ID == report.ID {
            found = true
            break
        }
    }

    assert.True(t, found, "Created report should appear in incremental activities")
}

func TestIntegration_Pagination(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping integration test in short mode")
    }

    client := GetSandboxClient(t)

    // Fetch first page
    page1, err := client.ListReports(context.Background(), hackerone.ReportFilter{
        ProgramHandle: "test-program",
        PageSize:      10,
        PageNumber:    1,
    })

    assert.NoError(t, err)
    assert.LessOrEqual(t, len(page1.Data), 10)

    // Fetch second page
    page2, err := client.ListReports(context.Background(), hackerone.ReportFilter{
        ProgramHandle: "test-program",
        PageSize:      10,
        PageNumber:    2,
    })

    assert.NoError(t, err)

    // Verify no overlap
    page1IDs := make(map[string]struct{})
    for _, report := range page1.Data {
        page1IDs[report.ID] = struct{}{}
    }

    for _, report := range page2.Data {
        _, exists := page1IDs[report.ID]
        assert.False(t, exists, "Reports should not appear in multiple pages")
    }
}
```

## E2E Testing

### Full Sync Workflow Test

```go
func TestE2E_FullSyncWorkflow(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping E2E test in short mode")
    }

    // Initialize clients
    hackerOneClient := GetSandboxClient(t)
    chariotClient := getTestChariotClient(t)

    // Setup sync service
    syncService := &SyncService{
        hackerOneClient: hackerOneClient,
        chariotClient:   chariotClient,
        programHandle:   "test-program",
    }

    // Step 1: Create test report in HackerOne
    report := CreateTestReport(t, hackerOneClient)

    // Step 2: Run incremental sync
    syncService.lastSyncTime = time.Now().Add(-1 * time.Hour)
    err := syncService.IncrementalSync(context.Background())
    assert.NoError(t, err)

    // Step 3: Verify report synced to Chariot
    risks, err := chariotClient.ListRisks(context.Background(), chariot.RiskFilter{
        ExternalID: fmt.Sprintf("hackerone:report:%s", report.ID),
    })
    assert.NoError(t, err)
    assert.Len(t, risks, 1)

    chariotRisk := risks[0]
    assert.Equal(t, report.Title, chariotRisk.Name)
    assert.Equal(t, mapState(report.State), chariotRisk.Status)

    // Step 4: Update in Chariot
    chariotRisk.Status = "resolved"
    err = chariotClient.UpdateRisk(context.Background(), chariotRisk)
    assert.NoError(t, err)

    // Step 5: Run bidirectional sync
    err = syncService.WatchChariotUpdates(context.Background())
    assert.NoError(t, err)

    // Step 6: Verify HackerOne updated
    updated, err := hackerOneClient.GetReport(context.Background(), report.ID)
    assert.NoError(t, err)
    assert.Equal(t, "resolved", updated.State)
}
```

## Contract Testing

### API Contract Verification

```go
func TestContract_ReportSchema(t *testing.T) {
    client := GetSandboxClient(t)

    report, err := client.GetReport(context.Background(), "known-report-id")
    assert.NoError(t, err)

    // Verify required fields exist
    assert.NotEmpty(t, report.ID)
    assert.NotEmpty(t, report.Title)
    assert.NotEmpty(t, report.State)
    assert.NotEmpty(t, report.SeverityRating)
    assert.NotNil(t, report.CreatedAt)

    // Verify field types
    assert.IsType(t, "", report.ID)
    assert.IsType(t, "", report.Title)
    assert.IsType(t, time.Time{}, report.CreatedAt)

    // Verify enum values
    validStates := []string{"new", "triaged", "needs_more_info", "resolved", "not_applicable", "informative", "duplicate", "spam"}
    assert.Contains(t, validStates, report.State)

    validSeverities := []string{"none", "low", "medium", "high", "critical"}
    assert.Contains(t, validSeverities, report.SeverityRating)
}

func TestContract_PaginationFormat(t *testing.T) {
    client := GetSandboxClient(t)

    result, err := client.ListReports(context.Background(), hackerone.ReportFilter{
        PageSize:   10,
        PageNumber: 1,
    })
    assert.NoError(t, err)

    // Verify pagination metadata exists
    assert.NotNil(t, result.Links)
    assert.NotEmpty(t, result.Links.First)
    assert.NotEmpty(t, result.Links.Next)

    // Verify data array
    assert.NotNil(t, result.Data)
    assert.LessOrEqual(t, len(result.Data), 10)
}
```

## Performance Testing

### Load Testing with Rate Limiting

```go
func TestPerformance_RateLimiting(t *testing.T) {
    client := GetSandboxClient(t)

    start := time.Now()
    requests := 50

    // Make 50 requests (rate limit: 600/min = 10/sec)
    for i := 0; i < requests; i++ {
        _, err := client.GetReport(context.Background(), "test-report-id")
        if err != nil {
            t.Logf("Request %d failed: %v", i+1, err)
        }
    }

    duration := time.Since(start)
    requestsPerSecond := float64(requests) / duration.Seconds()

    t.Logf("Completed %d requests in %v (%.2f req/s)", requests, duration, requestsPerSecond)

    // Should be rate-limited to ~10 req/s
    assert.Less(t, requestsPerSecond, 11.0, "Client should respect rate limits")
}
```

## Webhook Testing

### Signature Verification Test

```go
func TestWebhook_SignatureVerification(t *testing.T) {
    secret := "test-webhook-secret"
    payload := []byte(`{"event":"report.created","event_id":"evt_123"}`)

    // Generate valid signature
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(payload)
    validSig := "sha256=" + hex.EncodeToString(mac.Sum(nil))

    // Test valid signature
    assert.True(t, VerifyWebhookSignature(payload, validSig, secret))

    // Test invalid signature
    assert.False(t, VerifyWebhookSignature(payload, "sha256=invalid", secret))

    // Test missing prefix
    assert.False(t, VerifyWebhookSignature(payload, hex.EncodeToString(mac.Sum(nil)), secret))
}

func TestWebhook_Idempotency(t *testing.T) {
    cache := NewMemoryCache(5 * time.Minute)
    handler := &WebhookHandler{eventCache: cache}

    webhook := hackerone.WebhookPayload{
        EventID: "evt_123",
        Event:   "report.created",
    }

    // First processing
    err := handler.ProcessWebhook(context.Background(), webhook)
    assert.NoError(t, err)

    // Second processing (duplicate)
    err = handler.ProcessWebhook(context.Background(), webhook)
    assert.NoError(t, err) // Should not error, but skip processing

    // Verify only processed once
    assert.Equal(t, 1, handler.processCount)
}
```

## Test Data Management

### Fixtures

```go
// testdata/fixtures.go
package testdata

func ValidReport() *hackerone.Report {
    return &hackerone.Report{
        ID:             "12345",
        Title:          "XSS in search parameter",
        State:          "triaged",
        SeverityRating: "high",
        CreatedAt:      time.Now().Add(-24 * time.Hour),
        UpdatedAt:      time.Now(),
        Weakness: hackerone.Weakness{
            ID:   "79",
            Name: "Cross-site Scripting (XSS)",
        },
        StructuredScope: &hackerone.StructuredScope{
            AssetType:       "URL",
            AssetIdentifier: "https://example.com/search",
        },
    }
}

func MinimalReport() *hackerone.Report {
    return &hackerone.Report{
        ID:             "67890",
        Title:          "Test Report",
        State:          "new",
        SeverityRating: "low",
    }
}
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Integration Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: "1.21"
      - name: Run unit tests
        run: go test -v -short ./...

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: "1.21"
      - name: Run integration tests
        env:
          HACKERONE_SANDBOX_TOKEN_ID: ${{ secrets.HACKERONE_SANDBOX_TOKEN_ID }}
          HACKERONE_SANDBOX_TOKEN_VALUE: ${{ secrets.HACKERONE_SANDBOX_TOKEN_VALUE }}
        run: go test -v ./...
```

## Test Utilities

### Retry Helper

```go
func RetryWithTimeout(t *testing.T, timeout time.Duration, fn func() bool) {
    deadline := time.Now().Add(timeout)

    for time.Now().Before(deadline) {
        if fn() {
            return
        }
        time.Sleep(500 * time.Millisecond)
    }

    t.Fatal("Condition not met within timeout")
}

// Usage
func TestEventualConsistency(t *testing.T) {
    // Create report
    report := CreateTestReport(t, client)

    // Wait for report to appear in list (eventual consistency)
    RetryWithTimeout(t, 10*time.Second, func() bool {
        reports, _ := client.ListReports(context.Background(), filter)
        for _, r := range reports.Data {
            if r.ID == report.ID {
                return true
            }
        }
        return false
    })
}
```

## Additional Resources

- [HackerOne Sandbox Environment](https://docs.hackerone.com/en/articles/sandbox-testing)
- [Client Implementation](client-implementation.md)
- [Sync Patterns](sync-patterns.md)
- [Webhook Handling](webhook-handling.md)
