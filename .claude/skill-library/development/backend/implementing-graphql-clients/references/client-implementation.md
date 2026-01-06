# Client Implementation

Complete GraphQL client architecture with rate limiting, error handling, and production patterns.

## Basic Client Structure

```go
package graphql

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "sync"
    "time"
)

// Client represents a GraphQL API client with integrated rate limiting
type Client struct {
    httpClient  *http.Client
    endpoint    string
    token       string
    rateLimiter *RateLimiter
}

// Response represents a standard GraphQL response
type Response struct {
    Data   json.RawMessage `json:"data"`
    Errors []GraphQLError  `json:"errors,omitempty"`
}

// GraphQLError represents a GraphQL error
type GraphQLError struct {
    Message   string                 `json:"message"`
    Type      string                 `json:"type,omitempty"`
    Path      []interface{}          `json:"path,omitempty"`
    Locations []ErrorLocation        `json:"locations,omitempty"`
    Extensions map[string]interface{} `json:"extensions,omitempty"`
}

type ErrorLocation struct {
    Line   int `json:"line"`
    Column int `json:"column"`
}

// NewClient creates a new GraphQL client
func NewClient(endpoint, token string) *Client {
    return &Client{
        httpClient: &http.Client{
            Timeout: 30 * time.Second,
        },
        endpoint: endpoint,
        token:    token,
        rateLimiter: &RateLimiter{
            remaining:    5000,
            minRemaining: 250, // 5% threshold
        },
    }
}
```

## Query Method with Full Error Handling

```go
// Query executes a GraphQL query with rate limiting and error handling
func (c *Client) Query(ctx context.Context, query string, variables map[string]interface{}) (*Response, error) {
    // Check rate limit before sending
    queryCost := estimateQueryCost(query)
    if err := c.rateLimiter.CheckAndWait(ctx, queryCost); err != nil {
        return nil, fmt.Errorf("rate limit check failed: %w", err)
    }

    // Build request body
    reqBody := map[string]interface{}{
        "query":     query,
        "variables": variables,
    }

    body, err := json.Marshal(reqBody)
    if err != nil {
        return nil, fmt.Errorf("failed to marshal request: %w", err)
    }

    // Create HTTP request with context
    req, err := http.NewRequestWithContext(ctx, "POST", c.endpoint, bytes.NewReader(body))
    if err != nil {
        return nil, fmt.Errorf("failed to create request: %w", err)
    }

    // Set headers
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+c.token)
    req.Header.Set("User-Agent", "GraphQL-Go-Client/1.0")

    // Execute request
    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("request failed: %w", err)
    }
    defer resp.Body.Close()

    // Update rate limiter from response headers
    c.rateLimiter.UpdateFromHeaders(resp.Header)

    // Check HTTP status
    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
    }

    // Parse response
    var result Response
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, fmt.Errorf("failed to decode response: %w", err)
    }

    // Check for GraphQL errors
    if len(result.Errors) > 0 {
        return &result, fmt.Errorf("GraphQL errors: %v", formatErrors(result.Errors))
    }

    return &result, nil
}

func formatErrors(errors []GraphQLError) string {
    var msgs []string
    for _, e := range errors {
        msgs = append(msgs, e.Message)
    }
    return strings.Join(msgs, "; ")
}
```

## Rate Limiter Integration

```go
// RateLimiter tracks API rate limits with proactive throttling
type RateLimiter struct {
    mu           sync.Mutex
    remaining    int
    resetAt      time.Time
    minRemaining int
}

// CheckAndWait blocks if rate limit is low
func (r *RateLimiter) CheckAndWait(ctx context.Context, queryCost int) error {
    r.mu.Lock()
    defer r.mu.Unlock()

    r.remaining -= queryCost

    // Proactive throttle at threshold (default 5% = 250/5000)
    if r.remaining < r.minRemaining {
        waitDuration := time.Until(r.resetAt)
        if waitDuration > 0 {
            select {
            case <-time.After(waitDuration):
                r.remaining = 5000 // Reset after wait
            case <-ctx.Done():
                return ctx.Err()
            }
        }
    }

    return nil
}

// UpdateFromHeaders updates rate limit state from response headers
func (r *RateLimiter) UpdateFromHeaders(headers http.Header) {
    r.mu.Lock()
    defer r.mu.Unlock()

    if remaining := headers.Get("X-RateLimit-Remaining"); remaining != "" {
        if val, err := strconv.Atoi(remaining); err == nil {
            r.remaining = val
        }
    }

    if reset := headers.Get("X-RateLimit-Reset"); reset != "" {
        if timestamp, err := strconv.ParseInt(reset, 10, 64); err == nil {
            r.resetAt = time.Unix(timestamp, 0)
        }
    }
}

// estimateQueryCost provides rough cost estimation
func estimateQueryCost(query string) int {
    // Simple heuristic: count "first:" arguments and multiply
    // Real implementation should parse GraphQL and calculate properly
    cost := 1
    if strings.Contains(query, "first:") {
        cost = 100 // Assume pagination query
    }
    return cost
}
```

## Type-Safe Client with shurcooL/graphql

```go
package github

import (
    "context"
    "github.com/shurcooL/githubv4"
    "golang.org/x/oauth2"
)

// GitHubClient wraps githubv4 with rate limiting
type GitHubClient struct {
    client      *githubv4.Client
    rateLimiter *RateLimiter
}

// NewGitHubClient creates a type-safe GitHub GraphQL client
func NewGitHubClient(token string) *GitHubClient {
    src := oauth2.StaticTokenSource(
        &oauth2.Token{AccessToken: token},
    )
    httpClient := oauth2.NewClient(context.Background(), src)

    return &GitHubClient{
        client: githubv4.NewClient(httpClient),
        rateLimiter: &RateLimiter{
            remaining:    5000,
            minRemaining: 250,
        },
    }
}

// Query executes a type-safe query
func (c *GitHubClient) Query(ctx context.Context, q interface{}, variables map[string]interface{}) error {
    if err := c.rateLimiter.CheckAndWait(ctx, 100); err != nil {
        return err
    }
    return c.client.Query(ctx, q, variables)
}

// Example query structure
type RepositoryQuery struct {
    Repository struct {
        Name        githubv4.String
        Description githubv4.String
        Issues      struct {
            TotalCount githubv4.Int
            Nodes      []struct {
                Title     githubv4.String
                State     githubv4.IssueState
                CreatedAt githubv4.DateTime
            }
            PageInfo struct {
                HasNextPage githubv4.Boolean
                EndCursor   githubv4.String
            }
        } `graphql:"issues(first: $first, after: $after, states: $states)"`
    } `graphql:"repository(owner: $owner, name: $name)"`

    RateLimit struct {
        Cost      githubv4.Int
        Remaining githubv4.Int
        ResetAt   githubv4.DateTime
    }
}
```

## Retry Logic with Exponential Backoff

```go
// QueryWithRetry executes a query with automatic retry on transient errors
func (c *Client) QueryWithRetry(ctx context.Context, query string, variables map[string]interface{}) (*Response, error) {
    maxRetries := 5
    baseDelay := time.Second

    var lastErr error
    for attempt := 0; attempt < maxRetries; attempt++ {
        resp, err := c.Query(ctx, query, variables)
        if err == nil {
            return resp, nil
        }

        lastErr = err

        // Check if error is retryable
        if !isRetryableError(err) {
            return nil, err
        }

        // Calculate backoff with jitter
        backoff := time.Duration(1<<uint(attempt)) * baseDelay
        jitter := time.Duration(rand.Int63n(int64(backoff / 4)))
        delay := backoff + jitter

        select {
        case <-time.After(delay):
            // Continue to next attempt
        case <-ctx.Done():
            return nil, ctx.Err()
        }
    }

    return nil, fmt.Errorf("max retries exceeded: %w", lastErr)
}

func isRetryableError(err error) bool {
    errStr := err.Error()
    return strings.Contains(errStr, "rate limit") ||
           strings.Contains(errStr, "429") ||
           strings.Contains(errStr, "502") ||
           strings.Contains(errStr, "503") ||
           strings.Contains(errStr, "timeout")
}
```

## Connection Pooling and Timeouts

```go
// NewClientWithOptions creates a client with customizable HTTP settings
func NewClientWithOptions(endpoint, token string, opts ClientOptions) *Client {
    transport := &http.Transport{
        MaxIdleConns:        opts.MaxIdleConns,        // Default: 100
        MaxIdleConnsPerHost: opts.MaxIdleConnsPerHost, // Default: 10
        IdleConnTimeout:     opts.IdleConnTimeout,     // Default: 90s
    }

    return &Client{
        httpClient: &http.Client{
            Timeout:   opts.Timeout, // Default: 30s
            Transport: transport,
        },
        endpoint: endpoint,
        token:    token,
        rateLimiter: &RateLimiter{
            remaining:    opts.RateLimitBudget,    // Default: 5000
            minRemaining: opts.RateLimitThreshold, // Default: 250
        },
    }
}

type ClientOptions struct {
    Timeout             time.Duration
    MaxIdleConns        int
    MaxIdleConnsPerHost int
    IdleConnTimeout     time.Duration
    RateLimitBudget     int
    RateLimitThreshold  int
}

// DefaultClientOptions returns sensible defaults
func DefaultClientOptions() ClientOptions {
    return ClientOptions{
        Timeout:             30 * time.Second,
        MaxIdleConns:        100,
        MaxIdleConnsPerHost: 10,
        IdleConnTimeout:     90 * time.Second,
        RateLimitBudget:     5000,
        RateLimitThreshold:  250,
    }
}
```

## Production Checklist

Before deploying a GraphQL client to production:

- [ ] **Context propagation**: All methods accept `context.Context` for cancellation
- [ ] **Rate limiting**: Proactive throttling before hitting limits
- [ ] **Retry logic**: Exponential backoff with jitter for transient errors
- [ ] **Error handling**: Check both HTTP status and GraphQL errors array
- [ ] **Timeouts**: Request timeout, connection timeout, idle timeout configured
- [ ] **Connection pooling**: HTTP transport configured for connection reuse
- [ ] **Logging**: Structured logging with request IDs, latency, costs
- [ ] **Metrics**: Track query count, error rate, latency percentiles
- [ ] **Authentication**: Secure token storage and rotation support

## References

- [shurcooL/githubv4](https://github.com/shurcooL/githubv4) - Type-safe GitHub v4 client
- [machinebox/graphql](https://github.com/machinebox/graphql) - Simple GraphQL client
- [hasura/go-graphql-client](https://github.com/hasura/go-graphql-client) - Enhanced fork with subscriptions
