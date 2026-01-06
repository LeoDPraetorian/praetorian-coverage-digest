# Anti-Patterns to Block

**Common mistakes found in existing Chariot integrations that MUST be avoided.**

---

## 1. Silent Batch Failures

**Problem**: Goroutines return `nil` instead of propagating errors, causing silent failures in batch processing.

**Example**:

```go
// WRONG - error is lost
g.Go(func() error {
    if err := processAsset(asset); err != nil {
        log.Error("failed to process asset", "error", err)
        return nil // VIOLATION - swallows error
    }
    return nil
})

if err := g.Wait(); err != nil {
    // This will never trigger because goroutines always return nil
}
```

**Fix**:

```go
// RIGHT - propagate error
g.Go(func() error {
    if err := processAsset(asset); err != nil {
        return fmt.Errorf("processing asset %s: %w", asset.ID, err)
    }
    return nil
})

if err := g.Wait(); err != nil {
    return fmt.Errorf("batch processing failed: %w", err)
}
```

**Why This Matters**: Silent failures make debugging impossible. If 10 assets fail silently, the integration appears to succeed but produces incomplete results.

---

## 2. Missing HTTP Client Timeouts

**Problem**: HTTP clients without timeouts can hang indefinitely if external API is unresponsive.

**Example**:

```go
// WRONG - no timeout
client := &http.Client{}

// WRONG - timeout too short (1 second)
client := &http.Client{Timeout: 1 * time.Second}
```

**Fix**:

```go
// RIGHT - 30 second minimum timeout
client := &http.Client{
    Timeout: 30 * time.Second,
}

// RIGHT - configurable timeout with sensible default
timeout := 30 * time.Second
if t.config.HTTPTimeout > 0 {
    timeout = t.config.HTTPTimeout
}
client := &http.Client{Timeout: timeout}
```

**Why This Matters**: Without timeouts, Lambda functions can hang for 15 minutes (max Lambda timeout) waiting for unresponsive APIs. With too-short timeouts, legitimate requests fail on slow networks.

---

## 3. No Rate Limiting in Tight Loops

**Problem**: Tight loops without rate limiting can trigger API rate limit blocks, causing all requests to fail.

**Example**:

```go
// WRONG - no rate limiting
for _, asset := range assets {
    resp, err := api.EnrichAsset(asset.ID) // 1000 requests/second
    // ...
}
```

**Fix**:

```go
import "golang.org/x/time/rate"

// RIGHT - rate limiter
limiter := rate.NewLimiter(rate.Limit(10), 1) // 10 req/sec

for _, asset := range assets {
    if err := limiter.Wait(ctx); err != nil {
        return fmt.Errorf("rate limiter: %w", err)
    }
    resp, err := api.EnrichAsset(asset.ID)
    // ...
}
```

**Why This Matters**: APIs enforce rate limits (e.g., 100 req/min). Without client-side rate limiting, the integration hits rate limits and ALL subsequent requests fail for minutes/hours.

---

## 4. Hardcoded Magic Numbers

**Problem**: Magic numbers scattered throughout code make it hard to adjust configuration.

**Example**:

```go
// WRONG - magic numbers
for page := 0; page < 500; page++ { // Why 500?
    resp, err := api.ListAssets(page, 100) // Why 100?
    time.Sleep(200 * time.Millisecond) // Why 200ms?
    // ...
}
```

**Fix**:

```go
// RIGHT - named constants
const (
    maxPages        = 500                // Safety limit for pagination
    pageSize        = 100                // API default page size
    rateLimitDelay  = 200 * time.Millisecond // API rate limit: 5 req/sec
)

for page := 0; page < maxPages; page++ {
    resp, err := api.ListAssets(page, pageSize)
    time.Sleep(rateLimitDelay)
    // ...
}
```

**Why This Matters**: Named constants document intent and make tuning easier. If rate limit changes from 5 req/sec to 10 req/sec, change one constant instead of hunting through code.

---

## 5. Error URL Leakage in Logs

**Problem**: Logging raw URLs exposes credentials in query parameters or URL-encoded credentials.

**Example**:

```go
// WRONG - logs URL with API key
url := "https://api.vendor.com/assets?apiKey=secret123"
resp, err := http.Get(url)
if err != nil {
    log.Error("HTTP request failed", "url", url) // VIOLATION - leaks apiKey
}
```

**Fix**:

```go
// RIGHT - sanitize URL before logging
url := "https://api.vendor.com/assets?apiKey=secret123"
resp, err := http.Get(url)
if err != nil {
    sanitized := sanitizeURL(url) // Remove query params
    log.Error("HTTP request failed", "url", sanitized)
}

func sanitizeURL(rawURL string) string {
    parsed, err := url.Parse(rawURL)
    if err != nil {
        return "[invalid URL]"
    }
    parsed.RawQuery = "" // Remove query parameters
    parsed.User = nil    // Remove user:pass from URL
    return parsed.String()
}
```

**Why This Matters**: Leaked credentials in logs expose API keys to anyone with CloudWatch access. Credentials can be rotated, but leaked credentials in historical logs remain exploitable.

---

## 6. Command Injection via exec.Command

**Problem**: Passing user input to `exec.Command` without validation enables command injection attacks.

**Example (AWS/Azure/GCP CLIs)**:

```go
// WRONG - command injection vulnerability
accountID := asset.Key // User-controlled value
cmd := exec.Command("aws", "sts", "assume-role", "--role-arn", "arn:aws:iam::"+accountID+":role/OrganizationAccountAccessRole")
```

**Attack**:

```
accountID = "123456789012; rm -rf /"
Executes: aws sts assume-role --role-arn arn:aws:iam::123456789012; rm -rf /:role/OrganizationAccountAccessRole
```

**Fix**:

```go
// RIGHT - validate input before using in command
accountID := asset.Key

// Validate accountID is numeric and 12 digits
if !regexp.MustCompile(`^\d{12}$`).MatchString(accountID) {
    return fmt.Errorf("invalid AWS account ID: %s", accountID)
}

cmd := exec.Command("aws", "sts", "assume-role", "--role-arn", "arn:aws:iam::"+accountID+":role/OrganizationAccountAccessRole")
```

**Better: Use AWS SDK Instead of CLI**

```go
// BEST - use AWS SDK, no command execution
import "github.com/aws/aws-sdk-go/service/sts"

svc := sts.New(session)
resp, err := svc.AssumeRole(&sts.AssumeRoleInput{
    RoleArn: aws.String(fmt.Sprintf("arn:aws:iam::%s:role/OrganizationAccountAccessRole", accountID)),
})
```

**Why This Matters**: AWS/Azure/GCP integrations execute CLI commands with user-controlled values (account IDs, subscription IDs). Without validation, attackers can inject arbitrary commands.

---

## Detection Checklist

Before submitting PR, search codebase for these anti-patterns:

```bash
# Silent failures
rg "return nil.*log\.(Error|Warn)" --type go

# Missing timeouts
rg "http\.Client\{\}" --type go

# Magic numbers in loops
rg "for.*range.*\d{2,}" --type go

# URL logging without sanitization
rg "log\..*\"url\"" --type go

# exec.Command with string concatenation
rg "exec\.Command.*\+" --type go
```

**If any pattern found**: Fix before PR submission.
