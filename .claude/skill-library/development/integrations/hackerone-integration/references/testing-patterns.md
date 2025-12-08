# HackerOne Integration - Testing Patterns

**Comprehensive testing strategies for HackerOne integration following Chariot testing standards.**

## Overview

Testing HackerOne integration requires multiple layers:
1. **Unit tests** - API client methods, data mapping, webhook parsing
2. **Integration tests** - Real HackerOne API calls (sandbox environment)
3. **Webhook tests** - Mock webhook payloads and event handling
4. **E2E tests** - Full report ingestion workflow

## Unit Tests

### API Client Tests

Test client methods with HTTP mocks:

```go
func TestClient_ListReports(t *testing.T) {
    // Create mock HTTP server
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Verify request
        assert.Equal(t, "GET", r.Method)
        assert.Equal(t, "/v1/reports", r.URL.Path)

        // Verify authentication
        username, password, ok := r.BasicAuth()
        assert.True(t, ok)
        assert.Equal(t, "test-id", username)
        assert.Equal(t, "test-token", password)

        // Return mock response
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]interface{}{
            "data": []map[string]interface{}{
                {
                    "id":   "123",
                    "type": "report",
                    "attributes": map[string]interface{}{
                        "title": "Test Report",
                        "state": "triaged",
                    },
                },
            },
        })
    }))
    defer server.Close()

    // Create client pointing to mock server
    client := NewClient("test-id", "test-token")
    client.BaseURL = server.URL + "/v1"

    // Execute and verify
    reports, err := client.ListReports(context.Background(), ListOptions{})
    require.NoError(t, err)
    assert.Len(t, reports.Data, 1)
    assert.Equal(t, "Test Report", reports.Data[0].Attributes.Title)
}
```

### Data Mapping Tests

Test all mapping functions with edge cases:

```go
func TestMapSeverityToPriority(t *testing.T) {
    tests := []struct {
        severity string
        expected int
    }{
        {"critical", 0},
        {"high", 1},
        {"medium", 2},
        {"low", 3},
        {"none", 4},
        {"unknown", 2}, // Default to medium
    }

    for _, tt := range tests {
        t.Run(tt.severity, func(t *testing.T) {
            result := MapSeverityToPriority(tt.severity)
            assert.Equal(t, tt.expected, result)
        })
    }
}

func TestMapStateToStatus(t *testing.T) {
    tests := []struct {
        state    string
        expected string
    }{
        {"new", "open"},
        {"triaged", "confirmed"},
        {"needs-more-info", "pending"},
        {"resolved", "resolved"},
        {"not-applicable", "rejected"},
        {"duplicate", "duplicate"},
    }

    for _, tt := range tests {
        t.Run(tt.state, func(t *testing.T) {
            result := MapStateToStatus(tt.state)
            assert.Equal(t, tt.expected, result)
        })
    }
}

func TestMapReportToRisk(t *testing.T) {
    report := &Report{
        ID:   "123456",
        Type: "report",
        Attributes: ReportAttributes{
            Title: "SQL Injection in login",
            State: "triaged",
            Severity: Severity{
                Rating: "high",
                Score:  8.5,
            },
            CreatedAt: "2025-01-15T10:00:00.000Z",
        },
    }

    risk, err := MapReportToRisk(report)
    require.NoError(t, err)

    assert.Equal(t, "123456", risk.ExternalID)
    assert.Equal(t, "hackerone", risk.Source)
    assert.Equal(t, "[HackerOne] SQL Injection in login", risk.Title)
    assert.Equal(t, 1, risk.Priority) // High = P1
    assert.Equal(t, "confirmed", risk.Status)
    assert.Equal(t, 8.5, risk.CVSS)
}
```

### Rate Limiter Tests

```go
func TestRateLimiter_Wait(t *testing.T) {
    rl := NewRateLimiter(10, time.Second)

    // Should not block for first 10 calls
    for i := 0; i < 10; i++ {
        start := time.Now()
        err := rl.Wait(context.Background())
        require.NoError(t, err)
        assert.Less(t, time.Since(start), 10*time.Millisecond)
    }

    // 11th call should block
    start := time.Now()
    err := rl.Wait(context.Background())
    require.NoError(t, err)
    assert.GreaterOrEqual(t, time.Since(start), 90*time.Millisecond)
}
```

## Integration Tests

Test against real HackerOne sandbox API:

```go
func TestIntegration_CreateAndFetchReport(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping integration test")
    }

    // Load sandbox credentials
    client := NewClient(
        os.Getenv("HACKERONE_SANDBOX_API_ID"),
        os.Getenv("HACKERONE_SANDBOX_API_TOKEN"),
    )

    ctx := context.Background()

    // Fetch existing reports
    reports, err := client.ListReports(ctx, ListOptions{
        State: []string{"triaged"},
        Limit: 10,
    })
    require.NoError(t, err)
    assert.NotEmpty(t, reports.Data)

    // Fetch specific report
    reportID := reports.Data[0].ID
    report, err := client.GetReport(ctx, reportID)
    require.NoError(t, err)
    assert.Equal(t, reportID, report.ID)
    assert.NotEmpty(t, report.Attributes.Title)
}

func TestIntegration_RateLimiting(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping integration test")
    }

    client := NewClient(
        os.Getenv("HACKERONE_SANDBOX_API_ID"),
        os.Getenv("HACKERONE_SANDBOX_API_TOKEN"),
    )

    ctx := context.Background()

    // Make 15 requests rapidly
    for i := 0; i < 15; i++ {
        _, err := client.ListReports(ctx, ListOptions{Limit: 1})
        require.NoError(t, err)
    }

    // Rate limiter should have prevented 429 errors
}
```

## Webhook Tests

### Mock Webhook Payloads

```go
func TestWebhook_ReportCreated(t *testing.T) {
    payload := `{
        "id": "event-123",
        "type": "webhook-event",
        "attributes": {
            "event_type": "report_created",
            "created_at": "2025-01-15T10:00:00.000Z",
            "data": {
                "report": {
                    "id": "123456",
                    "type": "report",
                    "attributes": {
                        "title": "SQL Injection",
                        "state": "new",
                        "severity": {
                            "rating": "high",
                            "score": 8.5
                        }
                    }
                }
            }
        }
    }`

    // Compute HMAC signature
    secret := "test-secret"
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write([]byte(payload))
    signature := hex.EncodeToString(mac.Sum(nil))

    // Create API Gateway request
    req := events.APIGatewayProxyRequest{
        Body: payload,
        Headers: map[string]string{
            "X-HackerOne-Signature": signature,
        },
    }

    // Handle webhook
    resp, err := HandleWebhook(context.Background(), req)
    require.NoError(t, err)
    assert.Equal(t, 200, resp.StatusCode)

    // Verify Risk created in database
    var result map[string]string
    json.Unmarshal([]byte(resp.Body), &result)
    assert.Equal(t, "created", result["status"])
    assert.NotEmpty(t, result["risk_id"])
}

func TestWebhook_InvalidSignature(t *testing.T) {
    payload := `{"id": "event-123"}`

    req := events.APIGatewayProxyRequest{
        Body: payload,
        Headers: map[string]string{
            "X-HackerOne-Signature": "invalid-signature",
        },
    }

    resp, err := HandleWebhook(context.Background(), req)
    require.NoError(t, err)
    assert.Equal(t, 401, resp.StatusCode)
}

func TestWebhook_Idempotency(t *testing.T) {
    payload := `{
        "id": "event-123",
        "type": "webhook-event",
        "attributes": {
            "event_type": "report_created",
            "data": {"report": {"id": "123456"}}
        }
    }`

    signature := computeSignature(payload, "test-secret")
    req := events.APIGatewayProxyRequest{
        Body:    payload,
        Headers: map[string]string{"X-HackerOne-Signature": signature},
    }

    // First call - should create Risk
    resp1, err := HandleWebhook(context.Background(), req)
    require.NoError(t, err)
    assert.Equal(t, 200, resp1.StatusCode)

    // Second call with same event ID - should be idempotent
    resp2, err := HandleWebhook(context.Background(), req)
    require.NoError(t, err)
    assert.Equal(t, 200, resp2.StatusCode)

    var result map[string]string
    json.Unmarshal([]byte(resp2.Body), &result)
    assert.Equal(t, "duplicate", result["status"])
}
```

## E2E Tests

Full workflow from HackerOne report to Chariot Risk:

```go
func TestE2E_ReportIngestion(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping E2E test")
    }

    ctx := context.Background()

    // 1. Fetch report from HackerOne
    h1Client := NewHackerOneClient(
        os.Getenv("HACKERONE_API_ID"),
        os.Getenv("HACKERONE_API_TOKEN"),
    )

    reports, err := h1Client.ListReports(ctx, ListOptions{
        State: []string{"triaged"},
        Limit: 1,
    })
    require.NoError(t, err)
    require.NotEmpty(t, reports.Data)

    report := reports.Data[0]

    // 2. Map to Chariot Risk
    risk, err := MapReportToRisk(&report)
    require.NoError(t, err)

    // 3. Create Risk in Chariot
    chariotClient := chariot.NewClient(os.Getenv("CHARIOT_API_KEY"))
    createdRisk, err := chariotClient.CreateRisk(ctx, risk)
    require.NoError(t, err)

    // 4. Verify Risk created correctly
    assert.Equal(t, report.ID, createdRisk.ExternalID)
    assert.Equal(t, "hackerone", createdRisk.Source)

    // Cleanup
    defer chariotClient.DeleteRisk(ctx, createdRisk.ID)
}
```

## Test Coverage Requirements

Follow Chariot testing standards:
- ✅ Unit test coverage: **≥ 80%**
- ✅ Critical path coverage: **100%** (authentication, data mapping, webhook handling)
- ✅ Error handling: Test all error paths
- ✅ Edge cases: Null values, missing fields, invalid data

## Mock Data Helpers

```go
// test/mocks/hackerone.go
package mocks

func MockReport(id string, state string, severity string) *Report {
    return &Report{
        ID:   id,
        Type: "report",
        Attributes: ReportAttributes{
            Title: fmt.Sprintf("Test Report %s", id),
            State: state,
            Severity: Severity{
                Rating: severity,
                Score:  mapSeverityToScore(severity),
            },
            CreatedAt: time.Now().Format(time.RFC3339),
        },
    }
}

func MockWebhookEvent(eventType string, report *Report) *WebhookEvent {
    return &WebhookEvent{
        ID:   fmt.Sprintf("event-%s", uuid.New().String()),
        Type: "webhook-event",
        Attributes: WebhookEventAttributes{
            EventType: eventType,
            CreatedAt: time.Now().Format(time.RFC3339),
            Data: WebhookData{
                Report: report,
            },
        },
    }
}
```

## Related References

- [Client Setup](client-setup.md) - API client for testing
- [Data Mapping](data-mapping.md) - Mapping test cases
- [Webhook Handling](webhook-handling.md) - Webhook test patterns
