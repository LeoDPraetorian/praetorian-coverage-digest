# Panorama Error Handling

**Last Updated:** January 2026
**Source:** Research from `.claude/.output/research/2026-01-03-165242-panorama-api-complete/`

## Overview

PAN-OS APIs return errors through HTTP status codes and XML/JSON response bodies with specific error codes. Robust integrations must handle both transient errors (retry) and permanent errors (fail fast) appropriately.

## Quick Reference

### HTTP Status Codes

| Code | Meaning             | Retry? | Action                            |
| ---- | ------------------- | ------ | --------------------------------- |
| 200  | Success             | N/A    | Process response                  |
| 400  | Bad Request         | No     | Fix request syntax                |
| 401  | Unauthorized        | No     | Refresh API key                   |
| 403  | Forbidden           | No     | Check permissions                 |
| 404  | Not Found           | No     | Verify resource exists            |
| 409  | Conflict            | Maybe  | Check for concurrent modification |
| 429  | Too Many Requests   | Yes    | Backoff and retry                 |
| 500  | Internal Error      | Yes    | Retry with backoff                |
| 503  | Service Unavailable | Yes    | Retry with backoff                |

### PAN-OS Response Codes

| Code | Meaning                  | Retryable |
| ---- | ------------------------ | --------- |
| 1    | Unknown command          | No        |
| 2-5  | Internal error           | Yes       |
| 6    | Bad XPath                | No        |
| 7    | Object doesn't exist     | No        |
| 8    | Object not unique        | No        |
| 9    | Internal error           | Yes       |
| 10   | Reference count not zero | No        |
| 11   | Internal error           | Yes       |
| 12   | Invalid object           | No        |
| 13   | Operation failed         | Maybe     |
| 14   | Operation not possible   | No        |
| 15   | Operation denied         | No        |
| 16   | Unauthorized             | No        |
| 17   | Invalid command          | No        |
| 18   | Malformed command        | No        |
| 19   | Success (with warnings)  | N/A       |
| 20   | Success                  | N/A       |
| 21   | Internal error           | Yes       |
| 22   | Session timed out        | No        |

## Error Response Formats

### XML API Error Response

```xml
<response status="error" code="7">
  <result>
    <msg>Object doesn't exist</msg>
  </result>
</response>
```

### REST API Error Response

```json
{
  "@status": "error",
  "@code": "7",
  "msg": "Object doesn't exist"
}
```

## Go Implementation

### Error Types

```go
package panorama

import (
    "errors"
    "fmt"
)

// APIError represents a PAN-OS API error
type APIError struct {
    HTTPStatus int
    Code       string
    Message    string
    Retryable  bool
}

func (e *APIError) Error() string {
    return fmt.Sprintf("panorama API error (code=%s, http=%d): %s",
        e.Code, e.HTTPStatus, e.Message)
}

// IsRetryable returns true if the error should be retried
func (e *APIError) IsRetryable() bool {
    return e.Retryable
}

// Common error codes
var (
    ErrUnauthorized      = errors.New("unauthorized: invalid or expired API key")
    ErrNotFound          = errors.New("resource not found")
    ErrConflict          = errors.New("resource conflict")
    ErrRateLimited       = errors.New("rate limit exceeded")
    ErrInternalError     = errors.New("internal server error")
    ErrBadXPath          = errors.New("invalid XPath expression")
    ErrObjectNotUnique   = errors.New("object name not unique")
    ErrReferenceNotZero  = errors.New("object is still referenced")
    ErrSessionExpired    = errors.New("session timed out")
)

// retryableCodes defines which PAN-OS codes should trigger retry
var retryableCodes = map[string]bool{
    "2":  true,  // Internal error
    "3":  true,  // Internal error
    "4":  true,  // Internal error
    "5":  true,  // Internal error
    "9":  true,  // Internal error
    "11": true,  // Internal error
    "21": true,  // Internal error
}

// ParseAPIError creates an APIError from response data
func ParseAPIError(httpStatus int, code, message string) *APIError {
    return &APIError{
        HTTPStatus: httpStatus,
        Code:       code,
        Message:    message,
        Retryable:  isRetryable(httpStatus, code),
    }
}

func isRetryable(httpStatus int, code string) bool {
    // HTTP-level retryable errors
    if httpStatus == 429 || httpStatus == 500 || httpStatus == 503 {
        return true
    }

    // PAN-OS code-level retryable errors
    return retryableCodes[code]
}
```

### Response Parser

```go
package panorama

import (
    "encoding/xml"
    "fmt"
    "io"
    "net/http"
)

// XMLResponse represents a generic PAN-OS XML response
type XMLResponse struct {
    Status string `xml:"status,attr"`
    Code   string `xml:"code,attr"`
    Result struct {
        Msg string `xml:"msg"`
    } `xml:"result"`
}

// ParseResponse parses an HTTP response and returns error if failed
func ParseResponse(resp *http.Response) ([]byte, error) {
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, fmt.Errorf("failed to read response body: %w", err)
    }

    // Check HTTP status first
    if resp.StatusCode >= 400 {
        return nil, handleHTTPError(resp.StatusCode, body)
    }

    // Parse XML to check for API-level errors
    var xmlResp XMLResponse
    if err := xml.Unmarshal(body, &xmlResp); err != nil {
        // Not XML, might be binary or other content
        return body, nil
    }

    if xmlResp.Status == "error" {
        return nil, ParseAPIError(resp.StatusCode, xmlResp.Code, xmlResp.Result.Msg)
    }

    return body, nil
}

func handleHTTPError(status int, body []byte) error {
    switch status {
    case 401:
        return ErrUnauthorized
    case 403:
        return &APIError{HTTPStatus: 403, Message: "forbidden", Retryable: false}
    case 404:
        return ErrNotFound
    case 409:
        return ErrConflict
    case 429:
        return &APIError{HTTPStatus: 429, Message: "rate limited", Retryable: true}
    case 500, 502, 503:
        return &APIError{HTTPStatus: status, Message: "server error", Retryable: true}
    default:
        return &APIError{HTTPStatus: status, Message: string(body), Retryable: false}
    }
}
```

### Retry Logic with Exponential Backoff

```go
package panorama

import (
    "context"
    "math"
    "math/rand"
    "net/http"
    "time"
)

// RetryConfig configures retry behavior
type RetryConfig struct {
    MaxRetries     int
    InitialBackoff time.Duration
    MaxBackoff     time.Duration
    Multiplier     float64
    Jitter         float64
}

// DefaultRetryConfig provides sensible defaults
var DefaultRetryConfig = RetryConfig{
    MaxRetries:     3,
    InitialBackoff: 1 * time.Second,
    MaxBackoff:     30 * time.Second,
    Multiplier:     2.0,
    Jitter:         0.1,
}

// RetryableRequest executes a request with retry logic
func (c *Client) RetryableRequest(ctx context.Context, req *http.Request) (*http.Response, error) {
    config := c.RetryConfig
    if config.MaxRetries == 0 {
        config = DefaultRetryConfig
    }

    var lastErr error
    backoff := config.InitialBackoff

    for attempt := 0; attempt <= config.MaxRetries; attempt++ {
        if attempt > 0 {
            // Apply jitter to backoff
            jitter := backoff * time.Duration(config.Jitter*rand.Float64())
            sleepDuration := backoff + jitter

            select {
            case <-ctx.Done():
                return nil, ctx.Err()
            case <-time.After(sleepDuration):
            }

            // Increase backoff for next attempt
            backoff = time.Duration(float64(backoff) * config.Multiplier)
            if backoff > config.MaxBackoff {
                backoff = config.MaxBackoff
            }
        }

        // Clone request for retry (body may have been consumed)
        reqClone := req.Clone(ctx)

        resp, err := c.httpClient.Do(reqClone)
        if err != nil {
            lastErr = err
            continue
        }

        // Check if response indicates retryable error
        if shouldRetry(resp) {
            resp.Body.Close()
            lastErr = &APIError{
                HTTPStatus: resp.StatusCode,
                Message:    "retryable error",
                Retryable:  true,
            }
            continue
        }

        return resp, nil
    }

    return nil, fmt.Errorf("max retries exceeded: %w", lastErr)
}

func shouldRetry(resp *http.Response) bool {
    return resp.StatusCode == 429 ||
           resp.StatusCode == 500 ||
           resp.StatusCode == 502 ||
           resp.StatusCode == 503
}
```

## Error Handling Patterns

### Pattern 1: Graceful Degradation

```go
func (s *SyncService) SyncWithFallback(ctx context.Context) error {
    // Try primary operation
    err := s.panoramaClient.GetSecurityPolicies(ctx, s.deviceGroup)
    if err != nil {
        var apiErr *panorama.APIError
        if errors.As(err, &apiErr) {
            switch {
            case apiErr.HTTPStatus == 429:
                // Rate limited - use cached data
                s.logger.Warn("rate limited, using cached policies")
                return s.useCachedPolicies()

            case apiErr.HTTPStatus >= 500:
                // Server error - use cached data with warning
                s.logger.Warn("server error, using stale cache", "error", err)
                return s.useCachedPolicies()

            case apiErr.Code == "7":
                // Object not found - this is expected for new setups
                s.logger.Info("no policies found, initializing empty set")
                return nil
            }
        }
        return fmt.Errorf("failed to sync policies: %w", err)
    }
    return nil
}
```

### Pattern 2: Circuit Breaker

```go
package panorama

import (
    "sync"
    "time"
)

type CircuitState int

const (
    CircuitClosed CircuitState = iota
    CircuitOpen
    CircuitHalfOpen
)

type CircuitBreaker struct {
    mu              sync.RWMutex
    state           CircuitState
    failures        int
    successes       int
    lastFailure     time.Time
    threshold       int
    resetTimeout    time.Duration
    halfOpenMaxReqs int
}

func NewCircuitBreaker(threshold int, resetTimeout time.Duration) *CircuitBreaker {
    return &CircuitBreaker{
        state:           CircuitClosed,
        threshold:       threshold,
        resetTimeout:    resetTimeout,
        halfOpenMaxReqs: 3,
    }
}

func (cb *CircuitBreaker) Allow() bool {
    cb.mu.Lock()
    defer cb.mu.Unlock()

    switch cb.state {
    case CircuitClosed:
        return true
    case CircuitOpen:
        if time.Since(cb.lastFailure) > cb.resetTimeout {
            cb.state = CircuitHalfOpen
            cb.successes = 0
            return true
        }
        return false
    case CircuitHalfOpen:
        return cb.successes < cb.halfOpenMaxReqs
    }
    return false
}

func (cb *CircuitBreaker) RecordSuccess() {
    cb.mu.Lock()
    defer cb.mu.Unlock()

    if cb.state == CircuitHalfOpen {
        cb.successes++
        if cb.successes >= cb.halfOpenMaxReqs {
            cb.state = CircuitClosed
            cb.failures = 0
        }
    } else {
        cb.failures = 0
    }
}

func (cb *CircuitBreaker) RecordFailure() {
    cb.mu.Lock()
    defer cb.mu.Unlock()

    cb.failures++
    cb.lastFailure = time.Now()

    if cb.failures >= cb.threshold {
        cb.state = CircuitOpen
    }
}
```

### Pattern 3: Error Aggregation

```go
type MultiError struct {
    Errors []error
}

func (m *MultiError) Error() string {
    if len(m.Errors) == 1 {
        return m.Errors[0].Error()
    }
    return fmt.Sprintf("%d errors occurred", len(m.Errors))
}

func (m *MultiError) Add(err error) {
    if err != nil {
        m.Errors = append(m.Errors, err)
    }
}

func (m *MultiError) ErrorOrNil() error {
    if len(m.Errors) == 0 {
        return nil
    }
    return m
}

// Usage in batch operations
func (c *Client) BulkCreateAddresses(ctx context.Context, addresses []*Address) error {
    var multiErr MultiError

    for _, addr := range addresses {
        if err := c.CreateAddress(ctx, addr); err != nil {
            multiErr.Add(fmt.Errorf("failed to create %s: %w", addr.Name, err))
        }
    }

    return multiErr.ErrorOrNil()
}
```

## Common Error Scenarios

### Scenario 1: Object Already Exists

```go
func (c *Client) CreateOrUpdateAddress(ctx context.Context, addr *Address) error {
    err := c.CreateAddress(ctx, addr)
    if err != nil {
        var apiErr *APIError
        if errors.As(err, &apiErr) && apiErr.Code == "8" {
            // Object exists, update instead
            return c.UpdateAddress(ctx, addr)
        }
        return err
    }
    return nil
}
```

### Scenario 2: Reference Constraint

```go
func (c *Client) SafeDeleteAddress(ctx context.Context, name string) error {
    err := c.DeleteAddress(ctx, name)
    if err != nil {
        var apiErr *APIError
        if errors.As(err, &apiErr) && apiErr.Code == "10" {
            // Object still referenced - find and report references
            refs, _ := c.FindReferences(ctx, name)
            return fmt.Errorf("cannot delete %s: still referenced by %v", name, refs)
        }
        return err
    }
    return nil
}
```

### Scenario 3: Session Timeout

```go
func (c *Client) withSessionRefresh(ctx context.Context, fn func() error) error {
    err := fn()
    if err != nil {
        var apiErr *APIError
        if errors.As(err, &apiErr) && apiErr.Code == "22" {
            // Session expired, refresh and retry
            if refreshErr := c.RefreshSession(ctx); refreshErr != nil {
                return fmt.Errorf("session refresh failed: %w", refreshErr)
            }
            return fn()
        }
        return err
    }
    return nil
}
```

## Logging Best Practices

```go
func (c *Client) logError(operation string, err error) {
    var apiErr *APIError
    if errors.As(err, &apiErr) {
        c.logger.Error("panorama API error",
            "operation", operation,
            "http_status", apiErr.HTTPStatus,
            "code", apiErr.Code,
            "message", apiErr.Message,
            "retryable", apiErr.Retryable,
        )
    } else {
        c.logger.Error("panorama error",
            "operation", operation,
            "error", err.Error(),
        )
    }
}
```

## Troubleshooting Guide

| Error                     | Diagnosis                 | Resolution                                    |
| ------------------------- | ------------------------- | --------------------------------------------- |
| Code 6 (Bad XPath)        | Invalid XPath syntax      | Use API browser at `/api/` to validate XPath  |
| Code 7 (Not Found)        | Object/path doesn't exist | Verify object name and location parameters    |
| Code 8 (Not Unique)       | Duplicate name            | Use unique names or check-then-create pattern |
| Code 10 (Ref Not Zero)    | Object in use             | Find and remove references first              |
| Code 16 (Unauthorized)    | Permission denied         | Check API key role and permissions            |
| Code 22 (Session Timeout) | API key expired           | Generate new API key                          |
| HTTP 429                  | Rate limited              | Implement backoff, reduce request frequency   |
| HTTP 500                  | Server error              | Retry, check Panorama health                  |

## Related References

- [Authentication](authentication.md) - API key management
- [Rate Limiting](rate-limiting.md) - Avoiding 429 errors
- [Commit Operations](commit-operations.md) - Commit error handling
- [Troubleshooting](troubleshooting.md) - Debugging techniques
