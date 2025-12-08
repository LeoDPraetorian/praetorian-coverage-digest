# HackerOne API Client Setup

**Complete Go client implementation following Chariot integration patterns.**

## Overview

This guide covers creating a production-ready HackerOne API client that follows Chariot's standard integration architecture.

## File Structure

```
modules/chariot/backend/pkg/integration/hackerone/
├── client.go           # Main API client
├── types.go            # HackerOne data models
├── mapper.go           # Report → Risk mapping
├── webhook.go          # Webhook handlers
├── client_test.go      # Unit tests
└── README.md           # Integration documentation
```

## Client Implementation

### Basic Client Structure

```go
package hackerone

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
)

// Client represents a HackerOne API client
type Client struct {
    BaseURL       string
    APIIdentifier string
    APIToken      string
    HTTPClient    *http.Client
    RateLimiter   *RateLimiter
}

// NewClient creates a new HackerOne API client
func NewClient(apiIdentifier, apiToken string) *Client {
    return &Client{
        BaseURL:       "https://api.hackerone.com/v1",
        APIIdentifier: apiIdentifier,
        APIToken:      apiToken,
        HTTPClient: &http.Client{
            Timeout: 30 * time.Second,
        },
        RateLimiter: NewRateLimiter(1000, time.Hour), // 1000/hour
    }
}

// Do executes an HTTP request with authentication
func (c *Client) Do(ctx context.Context, method, path string, body interface{}) (*http.Response, error) {
    // Wait for rate limit token
    if err := c.RateLimiter.Wait(ctx); err != nil {
        return nil, err
    }

    var bodyReader io.Reader
    if body != nil {
        jsonBody, err := json.Marshal(body)
        if err != nil {
            return nil, fmt.Errorf("marshal body: %w", err)
        }
        bodyReader = bytes.NewBuffer(jsonBody)
    }

    req, err := http.NewRequestWithContext(ctx, method, c.BaseURL+path, bodyReader)
    if err != nil {
        return nil, fmt.Errorf("create request: %w", err)
    }

    // Set authentication and headers
    req.SetBasicAuth(c.APIIdentifier, c.APIToken)
    req.Header.Set("Accept", "application/json")
    if body != nil {
        req.Header.Set("Content-Type", "application/json")
    }

    resp, err := c.HTTPClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("execute request: %w", err)
    }

    // Handle rate limiting
    if resp.StatusCode == 429 {
        return nil, fmt.Errorf("rate limit exceeded")
    }

    return resp, nil
}
```

### Rate Limiter Implementation

```go
type RateLimiter struct {
    tokens     int
    maxTokens  int
    refillRate time.Duration
    lastRefill time.Time
    mu         sync.Mutex
}

func NewRateLimiter(requestsPerPeriod int, period time.Duration) *RateLimiter {
    return &RateLimiter{
        tokens:     requestsPerPeriod,
        maxTokens:  requestsPerPeriod,
        refillRate: period / time.Duration(requestsPerPeriod),
        lastRefill: time.Now(),
    }
}

func (rl *RateLimiter) Wait(ctx context.Context) error {
    rl.mu.Lock()
    defer rl.mu.Unlock()

    // Refill tokens based on elapsed time
    now := time.Now()
    elapsed := now.Sub(rl.lastRefill)
    tokensToAdd := int(elapsed / rl.refillRate)

    if tokensToAdd > 0 {
        rl.tokens = min(rl.tokens+tokensToAdd, rl.maxTokens)
        rl.lastRefill = now
    }

    // Wait if no tokens available
    if rl.tokens == 0 {
        waitDuration := rl.refillRate
        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-time.After(waitDuration):
            rl.tokens = 1
        }
    }

    rl.tokens--
    return nil
}
```

### Report Operations

```go
// ListReports fetches reports with pagination
func (c *Client) ListReports(ctx context.Context, opts ListOptions) (*ReportList, error) {
    query := buildQuery(opts)
    resp, err := c.Do(ctx, "GET", "/reports"+query, nil)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, parseError(resp)
    }

    var result ReportList
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, fmt.Errorf("decode response: %w", err)
    }

    return &result, nil
}

// GetReport fetches a single report by ID
func (c *Client) GetReport(ctx context.Context, reportID string) (*Report, error) {
    resp, err := c.Do(ctx, "GET", fmt.Sprintf("/reports/%s", reportID), nil)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, parseError(resp)
    }

    var result struct {
        Data Report `json:"data"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, fmt.Errorf("decode response: %w", err)
    }

    return &result.Data, nil
}
```

### Error Handling

```go
type APIError struct {
    StatusCode int
    Title      string
    Detail     string
}

func (e *APIError) Error() string {
    return fmt.Sprintf("%d %s: %s", e.StatusCode, e.Title, e.Detail)
}

func parseError(resp *http.Response) error {
    var errResp struct {
        Errors []struct {
            Status string `json:"status"`
            Title  string `json:"title"`
            Detail string `json:"detail"`
        } `json:"errors"`
    }

    if err := json.NewDecoder(resp.Body).Decode(&errResp); err != nil {
        return &APIError{
            StatusCode: resp.StatusCode,
            Title:      "Unknown Error",
            Detail:     "Failed to parse error response",
        }
    }

    if len(errResp.Errors) == 0 {
        return &APIError{
            StatusCode: resp.StatusCode,
            Title:      "Unknown Error",
            Detail:     "No error details provided",
        }
    }

    firstErr := errResp.Errors[0]
    statusCode := resp.StatusCode
    if firstErr.Status != "" {
        fmt.Sscanf(firstErr.Status, "%d", &statusCode)
    }

    return &APIError{
        StatusCode: statusCode,
        Title:      firstErr.Title,
        Detail:     firstErr.Detail,
    }
}
```

## Chariot Integration Patterns

### Credential Management

```go
import (
    "github.com/aws/aws-sdk-go-v2/service/secretsmanager"
)

func LoadHackerOneCredentials(ctx context.Context) (*Credentials, error) {
    // Load from AWS Secrets Manager
    secretsClient := secretsmanager.NewFromConfig(cfg)

    result, err := secretsClient.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
        SecretId: aws.String("prod/hackerone/api-credentials"),
    })
    if err != nil {
        return nil, fmt.Errorf("load secret: %w", err)
    }

    var creds Credentials
    if err := json.Unmarshal([]byte(*result.SecretString), &creds); err != nil {
        return nil, fmt.Errorf("parse credentials: %w", err)
    }

    return &creds, nil
}
```

### Audit Logging

```go
func (c *Client) Do(ctx context.Context, method, path string, body interface{}) (*http.Response, error) {
    start := time.Now()

    // Execute request
    resp, err := c.HTTPClient.Do(req)

    // Log audit event
    audit.Log(ctx, audit.Event{
        Service:    "hackerone",
        Action:     fmt.Sprintf("%s %s", method, path),
        Duration:   time.Since(start),
        StatusCode: resp.StatusCode,
        Error:      err,
    })

    return resp, err
}
```

## Testing

### Unit Tests

```go
func TestClient_GetReport(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Verify authentication
        username, password, ok := r.BasicAuth()
        assert.True(t, ok)
        assert.Equal(t, "test-id", username)
        assert.Equal(t, "test-token", password)

        // Return mock response
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]interface{}{
            "data": map[string]interface{}{
                "id":   "123",
                "type": "report",
                "attributes": map[string]interface{}{
                    "title": "Test Report",
                    "state": "triaged",
                },
            },
        })
    }))
    defer server.Close()

    client := NewClient("test-id", "test-token")
    client.BaseURL = server.URL

    report, err := client.GetReport(context.Background(), "123")
    require.NoError(t, err)
    assert.Equal(t, "Test Report", report.Attributes.Title)
}
```

## Related References

- [API Reference](api-reference.md) - Full HackerOne API documentation
- [Data Mapping](data-mapping.md) - Report → Risk mapping
- [Testing Patterns](testing-patterns.md) - Test strategies
