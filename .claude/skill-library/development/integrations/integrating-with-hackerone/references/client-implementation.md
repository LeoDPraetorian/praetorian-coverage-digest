# HackerOne Go Client Implementation

**Last Updated:** January 3, 2026

## Overview

Production-ready Go client design patterns for HackerOne API integration with Chariot platform conventions, including interface-based authentication, rate limiting, retry logic, and circuit breakers.

## Client Architecture

### Core Client Structure

```go
package hackerone

import (
    "context"
    "net/http"
    "time"

    "golang.org/x/time/rate"
)

// Client is the main HackerOne API client
type Client struct {
    httpClient  *http.Client
    baseURL     string
    rateLimiter *rate.Limiter
    auth        AuthProvider
    cb          *CircuitBreaker
    cache       Cache
    logger      Logger
}

// ClientConfig holds client configuration
type ClientConfig struct {
    BaseURL           string
    Timeout           time.Duration
    RateLimitPerMin   int
    EnableCaching     bool
    EnableCircuitBreaker bool
}

// DefaultConfig returns production-ready defaults
func DefaultConfig() ClientConfig {
    return ClientConfig{
        BaseURL:           "https://api.hackerone.com",
        Timeout:           30 * time.Second,
        RateLimitPerMin:   600, // Read operations limit
        EnableCaching:     true,
        EnableCircuitBreaker: true,
    }
}

// NewClient creates a new HackerOne API client
func NewClient(config ClientConfig, auth AuthProvider) *Client {
    // Rate limiter: 600 requests/minute = 10 requests/second
    limiter := rate.NewLimiter(rate.Limit(config.RateLimitPerMin/60.0), config.RateLimitPerMin/60)

    client := &Client{
        httpClient: &http.Client{
            Timeout: config.Timeout,
            Transport: &http.Transport{
                MaxIdleConns:        100,
                MaxIdleConnsPerHost: 10,
                IdleConnTimeout:     90 * time.Second,
            },
        },
        baseURL:     config.BaseURL,
        rateLimiter: limiter,
        auth:        auth,
    }

    if config.EnableCircuitBreaker {
        client.cb = NewCircuitBreaker()
    }

    if config.EnableCaching {
        client.cache = NewMemoryCache(10 * time.Minute)
    }

    return client
}
```

## Authentication Interface

### AuthProvider Interface

```go
// AuthProvider abstracts authentication mechanisms
type AuthProvider interface {
    // GetHeaders returns authentication headers for request
    GetHeaders(ctx context.Context) (map[string]string, error)

    // RefreshIfNeeded checks if credentials need refresh
    RefreshIfNeeded(ctx context.Context) error
}

// BasicAuthProvider implements HTTP Basic Auth with API tokens
type BasicAuthProvider struct {
    tokenID    string
    tokenValue string
}

func NewBasicAuth(tokenID, tokenValue string) *BasicAuthProvider {
    return &BasicAuthProvider{
        tokenID:    tokenID,
        tokenValue: tokenValue,
    }
}

func (p *BasicAuthProvider) GetHeaders(ctx context.Context) (map[string]string, error) {
    if p.tokenID == "" || p.tokenValue == "" {
        return nil, ErrMissingCredentials
    }

    // HTTP Basic Auth format
    auth := base64.StdEncoding.EncodeToString(
        []byte(fmt.Sprintf("%s:%s", p.tokenID, p.tokenValue)),
    )

    return map[string]string{
        "Authorization": fmt.Sprintf("Basic %s", auth),
        "Accept":        "application/json",
        "Content-Type":  "application/json",
    }, nil
}

func (p *BasicAuthProvider) RefreshIfNeeded(ctx context.Context) error {
    // HackerOne tokens don't expire, no refresh needed
    return nil
}

// SecretsManagerAuthProvider fetches credentials from AWS Secrets Manager
type SecretsManagerAuthProvider struct {
    secretsClient *secretsmanager.Client
    secretID      string
    cache         *tokenCache
}

func NewSecretsManagerAuth(secretID string) *SecretsManagerAuthProvider {
    cfg, _ := awsconfig.LoadDefaultConfig(context.Background())
    return &SecretsManagerAuthProvider{
        secretsClient: secretsmanager.NewFromConfig(cfg),
        secretID:      secretID,
        cache:         newTokenCache(5 * time.Minute),
    }
}

func (p *SecretsManagerAuthProvider) GetHeaders(ctx context.Context) (map[string]string, error) {
    // Check cache first
    if creds := p.cache.Get(); creds != nil {
        return buildAuthHeaders(creds.TokenID, creds.TokenValue), nil
    }

    // Fetch from Secrets Manager
    result, err := p.secretsClient.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
        SecretId: aws.String(p.secretID),
    })
    if err != nil {
        return nil, fmt.Errorf("fetch secret: %w", err)
    }

    var creds struct {
        TokenID    string `json:"token_id"`
        TokenValue string `json:"token_value"`
    }
    if err := json.Unmarshal([]byte(*result.SecretString), &creds); err != nil {
        return nil, fmt.Errorf("parse secret: %w", err)
    }

    // Cache for 5 minutes
    p.cache.Set(creds.TokenID, creds.TokenValue)

    return buildAuthHeaders(creds.TokenID, creds.TokenValue), nil
}
```

## Request Execution

### Core HTTP Request Method

```go
// Do executes an HTTP request with authentication, rate limiting, and retry logic
func (c *Client) Do(ctx context.Context, req *http.Request) (*http.Response, error) {
    // Apply rate limiting
    if err := c.rateLimiter.Wait(ctx); err != nil {
        return nil, fmt.Errorf("rate limit wait: %w", err)
    }

    // Add authentication headers
    authHeaders, err := c.auth.GetHeaders(ctx)
    if err != nil {
        return nil, fmt.Errorf("auth headers: %w", err)
    }

    for k, v := range authHeaders {
        req.Header.Set(k, v)
    }

    // Execute with circuit breaker (if enabled)
    if c.cb != nil {
        var resp *http.Response
        var respErr error

        cbErr := c.cb.Execute(func() error {
            resp, respErr = c.httpClient.Do(req)
            if respErr != nil {
                return respErr
            }

            // Treat 5xx as circuit breaker failures
            if resp.StatusCode >= 500 {
                return fmt.Errorf("server error: %d", resp.StatusCode)
            }

            return nil
        })

        if cbErr != nil {
            return nil, cbErr
        }

        return resp, respErr
    }

    // Execute without circuit breaker
    return c.httpClient.Do(req)
}
```

### Typed Resource Methods

```go
// GetReport retrieves a specific report
func (c *Client) GetReport(ctx context.Context, reportID string) (*Report, error) {
    // Check cache first
    if c.cache != nil {
        if cached, ok := c.cache.Get(fmt.Sprintf("report:%s", reportID)).(*Report); ok {
            c.logger.Debug("Cache hit", "report_id", reportID)
            return cached, nil
        }
    }

    // Build request
    url := fmt.Sprintf("%s/v1/reports/%s", c.baseURL, reportID)
    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, fmt.Errorf("create request: %w", err)
    }

    // Execute with retry
    resp, err := c.ExecuteWithRetry(ctx, req, DefaultRetryConfig)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    // Parse response
    var result struct {
        Data Report `json:"data"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, fmt.Errorf("decode response: %w", err)
    }

    // Cache result
    if c.cache != nil {
        c.cache.Set(fmt.Sprintf("report:%s", reportID), &result.Data, 5*time.Minute)
    }

    return &result.Data, nil
}

// ListReports retrieves paginated list of reports
func (c *Client) ListReports(ctx context.Context, filter ReportFilter) (*ReportList, error) {
    url := fmt.Sprintf("%s/v1/reports", c.baseURL)

    // Build query parameters
    params := url.Values{}
    if filter.ProgramHandle != "" {
        params.Set("filter[program]", filter.ProgramHandle)
    }
    if filter.State != "" {
        params.Set("filter[state]", filter.State)
    }
    params.Set("page[size]", strconv.Itoa(filter.PageSize))
    params.Set("page[number]", strconv.Itoa(filter.PageNumber))

    fullURL := fmt.Sprintf("%s?%s", url, params.Encode())
    req, err := http.NewRequestWithContext(ctx, "GET", fullURL, nil)
    if err != nil {
        return nil, fmt.Errorf("create request: %w", err)
    }

    resp, err := c.ExecuteWithRetry(ctx, req, DefaultRetryConfig)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result ReportList
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, fmt.Errorf("decode response: %w", err)
    }

    return &result, nil
}

// GetIncrementalActivities fetches activities updated after timestamp
// CRITICAL for efficient sync - use this instead of polling all reports
func (c *Client) GetIncrementalActivities(
    ctx context.Context,
    programHandle string,
    updatedAfter time.Time,
) (*ActivityList, error) {
    url := fmt.Sprintf("%s/v1/incremental/activities", c.baseURL)

    params := url.Values{}
    params.Set("handle", programHandle)
    params.Set("updated_at_after", updatedAfter.Format(time.RFC3339))

    fullURL := fmt.Sprintf("%s?%s", url, params.Encode())
    req, err := http.NewRequestWithContext(ctx, "GET", fullURL, nil)
    if err != nil {
        return nil, fmt.Errorf("create request: %w", err)
    }

    resp, err := c.ExecuteWithRetry(ctx, req, DefaultRetryConfig)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result ActivityList
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, fmt.Errorf("decode response: %w", err)
    }

    return &result, nil
}

// UpdateReportState transitions report to new state
func (c *Client) UpdateReportState(
    ctx context.Context,
    reportID string,
    newState string,
    message string,
) error {
    url := fmt.Sprintf("%s/v1/reports/%s", c.baseURL, reportID)

    body := map[string]interface{}{
        "data": map[string]interface{}{
            "type": "report",
            "id":   reportID,
            "attributes": map[string]interface{}{
                "state":   newState,
                "message": message,
            },
        },
    }

    bodyJSON, err := json.Marshal(body)
    if err != nil {
        return fmt.Errorf("marshal body: %w", err)
    }

    req, err := http.NewRequestWithContext(ctx, "PUT", url, bytes.NewReader(bodyJSON))
    if err != nil {
        return fmt.Errorf("create request: %w", err)
    }

    resp, err := c.ExecuteWithRetry(ctx, req, DefaultRetryConfig)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return parseAPIError(resp)
    }

    // Invalidate cache
    if c.cache != nil {
        c.cache.Delete(fmt.Sprintf("report:%s", reportID))
    }

    return nil
}
```

## Pagination Helpers

```go
// PageIterator handles automatic pagination
type PageIterator struct {
    client   *Client
    endpoint string
    filter   interface{}
    current  int
    hasMore  bool
}

func (c *Client) NewReportIterator(filter ReportFilter) *PageIterator {
    return &PageIterator{
        client:   c,
        endpoint: "/v1/reports",
        filter:   filter,
        current:  1,
        hasMore:  true,
    }
}

func (it *PageIterator) Next(ctx context.Context) (*ReportList, error) {
    if !it.hasMore {
        return nil, io.EOF
    }

    filter := it.filter.(ReportFilter)
    filter.PageNumber = it.current

    reports, err := it.client.ListReports(ctx, filter)
    if err != nil {
        return nil, err
    }

    // Check if more pages exist
    it.hasMore = len(reports.Data) == filter.PageSize
    it.current++

    return reports, nil
}

// Example usage
func fetchAllReports(ctx context.Context, client *Client, programHandle string) ([]*Report, error) {
    var allReports []*Report

    iterator := client.NewReportIterator(ReportFilter{
        ProgramHandle: programHandle,
        PageSize:      100,
    })

    for {
        page, err := iterator.Next(ctx)
        if err == io.EOF {
            break
        }
        if err != nil {
            return nil, err
        }

        allReports = append(allReports, page.Data...)
    }

    return allReports, nil
}
```

## Caching Strategy

```go
// Cache interface for abstraction
type Cache interface {
    Get(key string) interface{}
    Set(key string, value interface{}, ttl time.Duration)
    Delete(key string)
}

// MemoryCache implements in-memory caching with TTL
type MemoryCache struct {
    items sync.Map
    ttl   time.Duration
}

type cacheItem struct {
    value      interface{}
    expiration time.Time
}

func NewMemoryCache(ttl time.Duration) *MemoryCache {
    cache := &MemoryCache{ttl: ttl}

    // Cleanup goroutine
    go func() {
        ticker := time.NewTicker(ttl)
        defer ticker.Stop()

        for range ticker.C {
            cache.cleanup()
        }
    }()

    return cache
}

func (c *MemoryCache) Get(key string) interface{} {
    val, ok := c.items.Load(key)
    if !ok {
        return nil
    }

    item := val.(cacheItem)
    if time.Now().After(item.expiration) {
        c.items.Delete(key)
        return nil
    }

    return item.value
}

func (c *MemoryCache) Set(key string, value interface{}, ttl time.Duration) {
    c.items.Store(key, cacheItem{
        value:      value,
        expiration: time.Now().Add(ttl),
    })
}

func (c *MemoryCache) Delete(key string) {
    c.items.Delete(key)
}

func (c *MemoryCache) cleanup() {
    now := time.Now()
    c.items.Range(func(key, val interface{}) bool {
        item := val.(cacheItem)
        if now.After(item.expiration) {
            c.items.Delete(key)
        }
        return true
    })
}
```

## Testing Support

### Mock Client for Tests

```go
// MockClient implements Client interface for testing
type MockClient struct {
    GetReportFunc             func(ctx context.Context, reportID string) (*Report, error)
    ListReportsFunc           func(ctx context.Context, filter ReportFilter) (*ReportList, error)
    GetIncrementalActivitiesFunc func(ctx context.Context, programHandle string, updatedAfter time.Time) (*ActivityList, error)
}

func (m *MockClient) GetReport(ctx context.Context, reportID string) (*Report, error) {
    if m.GetReportFunc != nil {
        return m.GetReportFunc(ctx, reportID)
    }
    return nil, errors.New("not implemented")
}

// Example test
func TestSyncService(t *testing.T) {
    mockClient := &MockClient{
        GetReportFunc: func(ctx context.Context, reportID string) (*Report, error) {
            return &Report{
                ID:    reportID,
                Title: "Test Report",
                State: "triaged",
            }, nil
        },
    }

    service := NewSyncService(mockClient)
    err := service.SyncReport(context.Background(), "12345")

    assert.NoError(t, err)
}
```

## Production Configuration

```go
// ProductionClient creates production-ready client
func ProductionClient() (*Client, error) {
    config := ClientConfig{
        BaseURL:           os.Getenv("HACKERONE_BASE_URL"),
        Timeout:           30 * time.Second,
        RateLimitPerMin:   600,
        EnableCaching:     true,
        EnableCircuitBreaker: true,
    }

    // Use AWS Secrets Manager for production
    auth := NewSecretsManagerAuth("hackerone/api-token")

    client := NewClient(config, auth)

    // Configure structured logger
    client.logger = slog.New(slog.NewJSONHandler(os.Stdout, nil))

    return client, nil
}
```

## Additional Resources

- [HackerOne API Reference](api-reference.md)
- [Error Handling Patterns](error-handling.md)
- [Rate Limiting Strategies](rate-limiting.md)
- [Authentication Patterns](authentication.md)
