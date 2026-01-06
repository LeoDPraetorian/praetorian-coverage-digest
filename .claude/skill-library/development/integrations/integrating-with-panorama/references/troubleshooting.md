# Panorama Troubleshooting Guide

**Last Updated:** January 2026
**Source:** Research from `.claude/.output/research/2026-01-03-165242-panorama-api-complete/`

## Overview

This guide covers common issues encountered when integrating with Panorama API, diagnostic techniques, and resolution strategies.

## Quick Diagnostic Checklist

```
□ API key valid and not expired?
□ Correct base URL (https, correct port)?
□ TLS certificate verification passing?
□ Network connectivity to Panorama?
□ Admin role has API permissions?
□ XPath syntax correct?
□ Object names exist?
□ Rate limit not exceeded?
```

## Common Issues and Solutions

### Authentication Issues

| Symptom               | Likely Cause             | Solution                       |
| --------------------- | ------------------------ | ------------------------------ |
| 401 Unauthorized      | Invalid API key          | Regenerate API key             |
| 401 after working     | Key expired              | Check key lifetime, regenerate |
| 403 Forbidden         | Insufficient permissions | Check admin role API access    |
| "Invalid credentials" | Wrong username/password  | Verify credentials             |
| SSL handshake failed  | Certificate issues       | Check TLS config               |

**Diagnostic Steps:**

```bash
# Test API key validity
curl -k -X GET \
  "https://<panorama>/api/?type=op&cmd=<show><system><info></info></system></show>&key=YOUR_KEY"

# Expected success response
<response status="success">
  <result>
    <system><hostname>panorama</hostname>...</system>
  </result>
</response>

# If key is invalid
<response status="error" code="403">
  <result><msg>Invalid credentials.</msg></result>
</response>
```

### XPath Errors

| Error Code | Message              | Cause              | Solution                 |
| ---------- | -------------------- | ------------------ | ------------------------ |
| 6          | Bad XPath            | Invalid syntax     | Validate XPath structure |
| 7          | Object doesn't exist | Wrong path or name | Verify object exists     |
| 8          | Object not unique    | Duplicate entry    | Use unique names         |

**XPath Debugging:**

```bash
# Use the API browser to validate XPath
# Navigate to: https://<panorama>/api/

# Interactive XPath testing
curl -k -g "https://<panorama>/api/?type=config&action=get&xpath=/config&key=$KEY"

# Common XPath mistakes:
# ❌ Missing entry[@name='...'] selector
/config/shared/address/myobject

# ✅ Correct format
/config/shared/address/entry[@name='myobject']

# ❌ Wrong device path
/config/device-group/entry[@name='DG1']

# ✅ Correct path includes devices/entry
/config/devices/entry[@name='localhost.localdomain']/device-group/entry[@name='DG1']
```

### Commit Failures

| Issue            | Cause                   | Solution             |
| ---------------- | ----------------------- | -------------------- |
| Commit pending   | Previous commit running | Wait for completion  |
| Validation error | Invalid configuration   | Fix config errors    |
| Lock conflict    | Admin has edit lock     | Release lock or wait |
| Timeout          | Large configuration     | Increase timeout     |

**Commit Diagnostics:**

```bash
# Check for pending changes
curl -k -g "https://<panorama>/api/?type=op&cmd=<check><pending-changes></pending-changes></check>&key=$KEY"

# Check commit lock status
curl -k -g "https://<panorama>/api/?type=op&cmd=<show><commit-locks></commit-locks></show>&key=$KEY"

# View commit job details
curl -k -g "https://<panorama>/api/?type=op&cmd=<show><jobs><id>JOB_ID</id></jobs></show>&key=$KEY"
```

### Network Connectivity

| Symptom               | Likely Cause         | Solution             |
| --------------------- | -------------------- | -------------------- |
| Connection timeout    | Firewall blocking    | Check network ACLs   |
| Connection refused    | Wrong port           | Default is 443       |
| DNS resolution failed | Wrong hostname       | Verify DNS or use IP |
| SSL error             | Certificate mismatch | Update CA certs      |

**Network Diagnostics:**

```bash
# Test basic connectivity
curl -v -k "https://<panorama>/api/"

# Check TLS handshake
openssl s_client -connect <panorama>:443 -showcerts

# Verify DNS resolution
nslookup <panorama-hostname>
dig <panorama-hostname>

# Test from application context
curl -w "DNS: %{time_namelookup}s\nConnect: %{time_connect}s\nTLS: %{time_appconnect}s\nTotal: %{time_total}s\n" \
  -k -o /dev/null -s "https://<panorama>/api/?type=version&key=$KEY"
```

### Rate Limiting

| Symptom               | Cause               | Solution            |
| --------------------- | ------------------- | ------------------- |
| 429 Too Many Requests | Exceeded rate limit | Implement backoff   |
| Sporadic 429s         | Burst traffic       | Add request spacing |
| Consistent 429s       | Rate too aggressive | Reduce request rate |

**Rate Limit Diagnostics:**

```go
// Log rate limit responses
func (c *Client) diagnoseRateLimit(resp *http.Response) {
    if resp.StatusCode == 429 {
        log.Warn("Rate limited",
            "retry_after", resp.Header.Get("Retry-After"),
            "limit", resp.Header.Get("X-RateLimit-Limit"),
            "remaining", resp.Header.Get("X-RateLimit-Remaining"),
        )
    }
}
```

### Performance Issues

| Symptom        | Cause             | Solution            |
| -------------- | ----------------- | ------------------- |
| Slow responses | Large result set  | Use pagination      |
| Timeouts       | Complex query     | Narrow XPath scope  |
| Memory issues  | Unbounded results | Limit response size |

**Performance Diagnostics:**

```go
// Add timing to requests
func (c *Client) timedRequest(ctx context.Context, params url.Values) ([]byte, time.Duration, error) {
    start := time.Now()
    resp, err := c.makeRequest(ctx, params)
    duration := time.Since(start)

    if duration > 5*time.Second {
        log.Warn("Slow API request",
            "duration", duration,
            "xpath", params.Get("xpath"),
        )
    }

    return resp, duration, err
}
```

## Debugging Techniques

### Enable Verbose Logging

```go
package panorama

import (
    "log/slog"
    "net/http"
    "net/http/httputil"
)

type DebugTransport struct {
    Transport http.RoundTripper
    Logger    *slog.Logger
}

func (t *DebugTransport) RoundTrip(req *http.Request) (*http.Response, error) {
    // Log request
    if dump, err := httputil.DumpRequestOut(req, false); err == nil {
        t.Logger.Debug("API Request",
            "method", req.Method,
            "url", req.URL.String(),
            "headers", string(dump),
        )
    }

    resp, err := t.Transport.RoundTrip(req)
    if err != nil {
        t.Logger.Error("API Error", "error", err)
        return nil, err
    }

    // Log response
    t.Logger.Debug("API Response",
        "status", resp.StatusCode,
        "headers", resp.Header,
    )

    return resp, nil
}

// Usage
client := &http.Client{
    Transport: &DebugTransport{
        Transport: http.DefaultTransport,
        Logger:    slog.Default(),
    },
}
```

### Panorama Debug Commands

```bash
# Enable API debug logging on Panorama CLI
debug software api-rest-request all

# View API logs
tail follow yes mp-log api-rest-request.log

# Show management plane load
show system resources

# Check management services
show system software status

# View active sessions
show session all filter application panorama-api
```

### Request/Response Capture

```go
// Capture full request/response for debugging
type CapturingClient struct {
    *Client
    captures []RequestCapture
    mu       sync.Mutex
}

type RequestCapture struct {
    Timestamp time.Time
    Method    string
    URL       string
    Request   string
    Response  string
    Duration  time.Duration
    Error     error
}

func (c *CapturingClient) makeRequest(ctx context.Context, params url.Values) ([]byte, error) {
    capture := RequestCapture{
        Timestamp: time.Now(),
        Method:    "GET",
        URL:       c.baseURL + "/api/?" + params.Encode(),
        Request:   params.Encode(),
    }

    start := time.Now()
    resp, err := c.Client.makeRequest(ctx, params)
    capture.Duration = time.Since(start)
    capture.Error = err

    if resp != nil {
        capture.Response = string(resp)
    }

    c.mu.Lock()
    c.captures = append(c.captures, capture)
    c.mu.Unlock()

    return resp, err
}

func (c *CapturingClient) DumpCaptures() []RequestCapture {
    c.mu.Lock()
    defer c.mu.Unlock()
    return append([]RequestCapture{}, c.captures...)
}
```

## Error Recovery Patterns

### Automatic Retry with Diagnostics

```go
func (c *Client) ExecuteWithDiagnostics(ctx context.Context, fn func() error) error {
    var lastErr error

    for attempt := 0; attempt < 3; attempt++ {
        err := fn()
        if err == nil {
            return nil
        }

        lastErr = err
        diagnosis := c.diagnoseError(err)

        log.Warn("Operation failed",
            "attempt", attempt+1,
            "error", err,
            "diagnosis", diagnosis,
            "recoverable", diagnosis.Recoverable,
        )

        if !diagnosis.Recoverable {
            return err
        }

        time.Sleep(diagnosis.SuggestedWait)
    }

    return fmt.Errorf("max retries exceeded: %w", lastErr)
}

type ErrorDiagnosis struct {
    Category      string
    Recoverable   bool
    SuggestedWait time.Duration
    Suggestion    string
}

func (c *Client) diagnoseError(err error) ErrorDiagnosis {
    var apiErr *APIError
    if errors.As(err, &apiErr) {
        switch apiErr.Code {
        case "6":
            return ErrorDiagnosis{
                Category:    "XPath",
                Recoverable: false,
                Suggestion:  "Validate XPath syntax using API browser",
            }
        case "7":
            return ErrorDiagnosis{
                Category:    "NotFound",
                Recoverable: false,
                Suggestion:  "Verify object exists before operation",
            }
        case "22":
            return ErrorDiagnosis{
                Category:    "Session",
                Recoverable: true,
                SuggestedWait: 0,
                Suggestion:  "Refresh API key",
            }
        }

        if apiErr.HTTPStatus == 429 {
            return ErrorDiagnosis{
                Category:    "RateLimit",
                Recoverable: true,
                SuggestedWait: 30 * time.Second,
                Suggestion:  "Reduce request rate",
            }
        }

        if apiErr.HTTPStatus >= 500 {
            return ErrorDiagnosis{
                Category:    "ServerError",
                Recoverable: true,
                SuggestedWait: 5 * time.Second,
                Suggestion:  "Server may be overloaded, retry",
            }
        }
    }

    if errors.Is(err, context.DeadlineExceeded) {
        return ErrorDiagnosis{
            Category:    "Timeout",
            Recoverable: true,
            SuggestedWait: 1 * time.Second,
            Suggestion:  "Increase timeout or narrow query scope",
        }
    }

    return ErrorDiagnosis{
        Category:    "Unknown",
        Recoverable: false,
        Suggestion:  "Check logs for details",
    }
}
```

### Health Check Endpoint

```go
// HealthCheck verifies API connectivity
func (c *Client) HealthCheck(ctx context.Context) (*HealthStatus, error) {
    status := &HealthStatus{
        Timestamp: time.Now(),
    }

    // Test API connectivity
    start := time.Now()
    params := url.Values{
        "type": {"op"},
        "cmd":  {"<show><system><info></info></system></show>"},
        "key":  {c.credentials.APIKey},
    }

    resp, err := c.makeRequest(ctx, params)
    status.ResponseTime = time.Since(start)

    if err != nil {
        status.Status = "unhealthy"
        status.Error = err.Error()
        return status, err
    }

    // Parse system info
    status.Status = "healthy"
    status.Version = extractVersion(resp)
    status.Hostname = extractHostname(resp)

    return status, nil
}

type HealthStatus struct {
    Status       string
    Timestamp    time.Time
    ResponseTime time.Duration
    Version      string
    Hostname     string
    Error        string
}
```

## Log Analysis

### Common Log Patterns

```bash
# Authentication failures (grep CloudWatch/file logs)
grep -E "401|403|Invalid credentials" api.log

# Rate limiting
grep "429" api.log | wc -l

# Slow requests
grep -E "duration.*[0-9]{4,}ms" api.log

# Commit failures
grep -E "commit.*failed|FAIL" api.log
```

### Structured Log Queries (CloudWatch Insights)

```
# Find all errors by type
fields @timestamp, @message
| filter @message like /error/
| parse @message '"code":"*"' as error_code
| stats count() by error_code
| sort count desc

# Slow request analysis
fields @timestamp, duration_ms, xpath
| filter duration_ms > 5000
| sort duration_ms desc
| limit 50

# Rate limit frequency
fields @timestamp, @message
| filter @message like /429/
| stats count() as rate_limit_count by bin(5m)
```

## Escalation Checklist

If issues persist after troubleshooting:

1. **Collect diagnostics:**
   - Request/response captures
   - Error logs with timestamps
   - Network traces (tcpdump/Wireshark)
   - Panorama system logs

2. **Verify environment:**
   - Panorama version
   - API key creation date
   - Admin role permissions
   - Network path to Panorama

3. **Check Palo Alto resources:**
   - [Live Community](https://live.paloaltonetworks.com/)
   - [Knowledge Base](https://knowledgebase.paloaltonetworks.com/)
   - Support ticket (with Tech Support File)

## Related References

- [Error Handling](error-handling.md) - Error code reference
- [Authentication](authentication.md) - Credential issues
- [Rate Limiting](rate-limiting.md) - 429 handling
- [Commit Operations](commit-operations.md) - Commit troubleshooting
