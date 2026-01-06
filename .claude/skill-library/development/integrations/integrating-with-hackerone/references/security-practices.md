# HackerOne Integration Security Practices

**Last Updated:** January 3, 2026

## Overview

Comprehensive security checklist and best practices for HackerOne API integration, covering credential management, data privacy, webhook security, audit logging, and compliance.

## Security Checklist

### ✅ Credential Management

| Practice                                               | Priority     | Status |
| ------------------------------------------------------ | ------------ | ------ |
| Store API tokens in AWS Secrets Manager (production)   | **Critical** | [ ]    |
| Rotate tokens every 30-60 days (production)            | **Critical** | [ ]    |
| Use environment variables (development)                | **High**     | [ ]    |
| Never hardcode tokens in source code                   | **Critical** | [ ]    |
| Mask credentials in all logs                           | **Critical** | [ ]    |
| Use separate tokens per environment (dev/staging/prod) | **High**     | [ ]    |
| Implement credential scanning in CI/CD                 | **High**     | [ ]    |
| Configure IP whitelist in HackerOne                    | **Medium**   | [ ]    |
| Monitor authentication failures                        | **Medium**   | [ ]    |
| Document token rotation procedures                     | **Low**      | [ ]    |

### ✅ API Security

| Practice                                        | Priority     | Status |
| ----------------------------------------------- | ------------ | ------ |
| Use HTTPS exclusively (enforced by HackerOne)   | **Critical** | [ ]    |
| Verify SSL/TLS certificates                     | **Critical** | [ ]    |
| Implement request timeout (30s recommended)     | **High**     | [ ]    |
| Validate all API responses before processing    | **High**     | [ ]    |
| Sanitize user inputs before sending to API      | **High**     | [ ]    |
| Implement rate limiting on client side          | **Medium**   | [ ]    |
| Use circuit breaker pattern for fault tolerance | **Medium**   | [ ]    |
| Log all API errors with context                 | **Medium**   | [ ]    |

### ✅ Webhook Security

| Practice                                           | Priority     | Status |
| -------------------------------------------------- | ------------ | ------ |
| Verify HMAC-SHA256 signatures on all webhooks      | **Critical** | [ ]    |
| Use HTTPS endpoints only                           | **Critical** | [ ]    |
| Implement idempotency (track event_id)             | **Critical** | [ ]    |
| Implement replay protection (timestamp validation) | **High**     | [ ]    |
| Reject events >5 minutes old                       | **High**     | [ ]    |
| Store webhook secret securely                      | **Critical** | [ ]    |
| Use async processing (webhook → queue → processor) | **High**     | [ ]    |
| Respond <5 seconds to webhook requests             | **High**     | [ ]    |

### ✅ Data Privacy

| Practice                                                     | Priority     | Status |
| ------------------------------------------------------------ | ------------ | ------ |
| Apply PII data retention policies                            | **Critical** | [ ]    |
| Redact sensitive information in logs                         | **Critical** | [ ]    |
| Respect disclosure timelines (don't expose unreleased vulns) | **Critical** | [ ]    |
| Encrypt data at rest                                         | **High**     | [ ]    |
| Encrypt data in transit (TLS 1.2+)                           | **High**     | [ ]    |
| Limit data access to authorized personnel                    | **High**     | [ ]    |
| Implement data access auditing                               | **Medium**   | [ ]    |
| Document data retention policies                             | **Low**      | [ ]    |

### ✅ Audit Logging

| Practice                                        | Priority   | Status |
| ----------------------------------------------- | ---------- | ------ |
| Log all state transitions (Chariot → HackerOne) | **High**   | [ ]    |
| Track sync errors and retry attempts            | **High**   | [ ]    |
| Monitor rate limit consumption                  | **Medium** | [ ]    |
| Log webhook receipt and processing              | **High**   | [ ]    |
| Implement structured logging (JSON)             | **Medium** | [ ]    |
| Configure log retention (90 days minimum)       | **Medium** | [ ]    |
| Enable CloudWatch Logs Insights                 | **Low**    | [ ]    |

## Credential Management

### Token Storage - AWS Secrets Manager

```go
// ✅ CORRECT: Production pattern
func getHackerOneCredentials(ctx context.Context) (*Credentials, error) {
    cfg, err := awsconfig.LoadDefaultConfig(ctx)
    if err != nil {
        return nil, err
    }

    client := secretsmanager.NewFromConfig(cfg)
    result, err := client.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
        SecretId: aws.String("prod/hackerone/api-token"),
    })
    if err != nil {
        return nil, err
    }

    var creds Credentials
    if err := json.Unmarshal([]byte(*result.SecretString), &creds); err != nil {
        return nil, err
    }

    return &creds, nil
}

// ❌ WRONG: Hardcoded credentials
func getHackerOneCredentials() (*Credentials, error) {
    return &Credentials{
        TokenID:    "my-token-id",      // NEVER DO THIS
        TokenValue: "my-token-value",   // NEVER DO THIS
    }, nil
}
```

### Token Rotation Procedure

**Schedule:** Every 30-60 days for production

```bash
#!/bin/bash
# rotate-hackerone-token.sh

set -e

echo "=== HackerOne Token Rotation ==="

# Step 1: Generate new token manually in HackerOne UI
echo "1. Generate new API token in HackerOne:"
echo "   - Go to Organization Settings > API Tokens"
echo "   - Click 'Create API Token'"
echo "   - Copy token_id and token_value"
echo ""
read -p "Enter new TOKEN_ID: " NEW_TOKEN_ID
read -sp "Enter new TOKEN_VALUE: " NEW_TOKEN_VALUE
echo ""

# Step 2: Update AWS Secrets Manager
echo "2. Updating AWS Secrets Manager..."
aws secretsmanager update-secret \
  --secret-id prod/hackerone/api-token \
  --secret-string "{\"token_id\":\"$NEW_TOKEN_ID\",\"token_value\":\"$NEW_TOKEN_VALUE\"}"

echo "✅ Secret updated in AWS"

# Step 3: Verify new token works
echo "3. Verifying new token..."
curl -u "$NEW_TOKEN_ID:$NEW_TOKEN_VALUE" \
  https://api.hackerone.com/v1/me

if [ $? -eq 0 ]; then
  echo "✅ New token verified"
else
  echo "❌ New token verification failed - DO NOT PROCEED"
  exit 1
fi

# Step 4: Restart services to pick up new token
echo "4. Restarting services..."
kubectl rollout restart deployment/hackerone-sync -n prod

echo "5. Waiting for rollout..."
kubectl rollout status deployment/hackerone-sync -n prod --timeout=5m

# Step 6: Revoke old token in HackerOne UI
echo "6. MANUAL STEP: Revoke old token in HackerOne UI"
echo "   - Go to Organization Settings > API Tokens"
echo "   - Find old token and click 'Revoke'"
echo ""
echo "=== Rotation Complete ==="
```

### Credential Masking in Logs

```go
// ✅ CORRECT: Mask credentials
func logRequest(req *http.Request) {
    auth := req.Header.Get("Authorization")
    if strings.HasPrefix(auth, "Basic ") {
        auth = "Basic [REDACTED]"
    }

    log.Info("API request",
        "method", req.Method,
        "url", req.URL.Path,
        "auth", auth,  // Masked
    )
}

// ❌ WRONG: Log full auth header
func logRequest(req *http.Request) {
    log.Info("API request",
        "method", req.Method,
        "url", req.URL.Path,
        "auth", req.Header.Get("Authorization"),  // EXPOSES TOKEN!
    )
}
```

## Data Privacy

### PII Handling

**HackerOne reports may contain:**

- Researcher names and usernames
- Email addresses
- Report descriptions (may contain customer data)
- Internal notes and comments

```go
// PII redaction for logs
func redactPII(report *hackerone.Report) *hackerone.Report {
    redacted := *report

    // Redact researcher info
    if redacted.Reporter != nil {
        redacted.Reporter.Email = "[REDACTED]"
        redacted.Reporter.Name = "[REDACTED]"
    }

    // Truncate descriptions for logging
    if len(redacted.VulnerabilityInformation) > 200 {
        redacted.VulnerabilityInformation = redacted.VulnerabilityInformation[:200] + "... [TRUNCATED]"
    }

    return &redacted
}
```

### Disclosure Timeline Respect

```go
// Check if report can be publicly disclosed
func canDisclose(report *hackerone.Report) bool {
    // Only disclose if HackerOne marks it as disclosed
    if report.DisclosedAt == nil {
        return false
    }

    // Respect disclosure date
    return time.Now().After(*report.DisclosedAt)
}

// Filter disclosed reports for public display
func getPublicReports(reports []*hackerone.Report) []*hackerone.Report {
    var public []*hackerone.Report

    for _, report := range reports {
        if canDisclose(report) {
            public = append(public, report)
        }
    }

    return public
}
```

### Data Retention

```go
// DynamoDB TTL for automatic cleanup
type RiskRecord struct {
    RiskID        string    `dynamodbav:"risk_id"`
    ExternalID    string    `dynamodbav:"external_id"`
    Data          string    `dynamodbav:"data"`
    CreatedAt     time.Time `dynamodbav:"created_at"`
    ExpirationTTL int64     `dynamodbav:"ttl"` // Unix timestamp for DynamoDB TTL
}

func createRiskRecord(risk *chariot.Risk) *RiskRecord {
    // Retain for 2 years
    ttl := time.Now().Add(2 * 365 * 24 * time.Hour).Unix()

    return &RiskRecord{
        RiskID:        risk.ID,
        ExternalID:    risk.ExternalID,
        Data:          marshalRisk(risk),
        CreatedAt:     time.Now(),
        ExpirationTTL: ttl,
    }
}
```

## Webhook Security

### Signature Verification (REQUIRED)

```go
// ✅ CORRECT: Always verify signatures
func WebhookHandler(w http.ResponseWriter, r *http.Request) {
    body, _ := io.ReadAll(r.Body)
    signature := r.Header.Get("X-HackerOne-Signature")

    // CRITICAL: Verify before processing
    if !VerifyWebhookSignature(body, signature, webhookSecret) {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }

    // Process webhook...
}

// ❌ WRONG: Skip signature verification
func WebhookHandler(w http.ResponseWriter, r *http.Request) {
    var webhook WebhookPayload
    json.NewDecoder(r.Body).Decode(&webhook)

    // DANGEROUS: No signature verification!
    processWebhook(webhook)
}
```

### Replay Protection

```go
func validateWebhookTimestamp(timestamp string) error {
    eventTime, err := time.Parse(time.RFC3339, timestamp)
    if err != nil {
        return fmt.Errorf("invalid timestamp: %w", err)
    }

    age := time.Since(eventTime)

    // Reject events >5 minutes old
    if age > 5*time.Minute {
        return fmt.Errorf("event too old: %v", age)
    }

    // Reject events with future timestamps (clock skew tolerance: 1 min)
    if age < -1*time.Minute {
        return fmt.Errorf("event timestamp in future: %v", age)
    }

    return nil
}
```

## Audit Logging

### Structured Logging Pattern

```go
// Use structured logging (slog, zap, or logrus)
import "log/slog"

func logSyncEvent(event string, reportID string, details map[string]interface{}) {
    logger := slog.Default()

    attrs := []slog.Attr{
        slog.String("event", event),
        slog.String("report_id", reportID),
        slog.Time("timestamp", time.Now()),
    }

    for k, v := range details {
        attrs = append(attrs, slog.Any(k, v))
    }

    logger.LogAttrs(context.Background(), slog.LevelInfo, "Sync event", attrs...)
}

// Usage
logSyncEvent("report_synced", "12345", map[string]interface{}{
    "program": "example-program",
    "state":   "triaged",
    "severity": "high",
})
```

### CloudWatch Logs Insights Queries

```
# Find all authentication failures
fields @timestamp, @message
| filter @message like /401 Unauthorized/
| sort @timestamp desc
| limit 100

# Monitor rate limit consumption
fields @timestamp, rate_limit_remaining
| filter rate_limit_remaining < 100
| sort @timestamp desc

# Track sync errors
fields @timestamp, error, report_id
| filter event = "sync_error"
| stats count() by error
```

## Compliance Considerations

### SOC 2 Requirements

| Control           | Implementation                         | Evidence          |
| ----------------- | -------------------------------------- | ----------------- |
| Access Control    | API tokens per environment, IAM roles  | CloudTrail logs   |
| Encryption        | TLS 1.2+ in transit, KMS at rest       | AWS Config        |
| Audit Logging     | CloudWatch Logs, 90-day retention      | Log exports       |
| Incident Response | Alerting on auth failures, rate limits | CloudWatch Alarms |
| Change Management | Token rotation procedures, runbooks    | Documentation     |

### GDPR Compliance

- **Right to be Forgotten**: Implement data deletion endpoints
- **Data Portability**: Export risk data in machine-readable format
- **Access Logs**: Track who accesses PII data
- **Data Minimization**: Only sync necessary fields
- **Consent Management**: Track user consent for data processing

```go
// GDPR: Right to be Forgotten
func deleteUserData(ctx context.Context, userID string) error {
    // Delete from Chariot
    if err := chariotClient.DeleteUserRisks(ctx, userID); err != nil {
        return err
    }

    // Request deletion from HackerOne (if applicable)
    // Note: HackerOne may have separate data retention policies

    // Log deletion for audit trail
    log.Info("User data deleted (GDPR)",
        "user_id", userID,
        "timestamp", time.Now(),
        "initiator", getCurrentUser(ctx),
    )

    return nil
}
```

## Incident Response

### Token Compromise Procedure

```
1. IMMEDIATE (< 5 minutes):
   - Revoke compromised token via HackerOne UI
   - Generate new token
   - Update AWS Secrets Manager
   - Restart services

2. INVESTIGATION (< 1 hour):
   - Review CloudTrail logs for unauthorized access
   - Check HackerOne audit logs for suspicious activity
   - Identify which reports/data were accessed
   - Document timeline of compromise

3. REMEDIATION (< 24 hours):
   - Rotate all related credentials (if compromise is widespread)
   - Update IP whitelist to restrict access
   - Implement additional monitoring
   - Notify affected stakeholders

4. POST-INCIDENT (< 1 week):
   - Document incident in runbook
   - Update rotation procedures
   - Implement automated credential scanning
   - Conduct team review
```

### Security Alerts

```go
// Monitor for security events
type SecurityAlert struct {
    Severity    string
    Type        string
    Description string
    Timestamp   time.Time
}

func monitorSecurityEvents() {
    ticker := time.NewTicker(1 * time.Minute)
    defer ticker.Stop()

    for range ticker.C {
        // Check for auth failures
        if authFailures := getAuthFailures(time.Now().Add(-1 * time.Minute)); len(authFailures) > 5 {
            sendAlert(SecurityAlert{
                Severity:    "CRITICAL",
                Type:        "auth_failure_spike",
                Description: fmt.Sprintf("%d auth failures in last minute", len(authFailures)),
                Timestamp:   time.Now(),
            })
        }

        // Check for rate limit pressure
        if rateLimitRemaining() < 50 {
            sendAlert(SecurityAlert{
                Severity:    "WARNING",
                Type:        "rate_limit_pressure",
                Description: fmt.Sprintf("Rate limit remaining: %d", rateLimitRemaining()),
                Timestamp:   time.Now(),
            })
        }

        // Check for circuit breaker trips
        if circuitBreakerState() == "OPEN" {
            sendAlert(SecurityAlert{
                Severity:    "HIGH",
                Type:        "circuit_breaker_open",
                Description: "Circuit breaker tripped - service degraded",
                Timestamp:   time.Now(),
            })
        }
    }
}
```

## Security Scanning

### Automated Credential Scanning

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0 # Full history for secret scanning

      - name: Run Trufflehog
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD

      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Dependency Scanning

```bash
# Scan Go dependencies for vulnerabilities
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck ./...

# Scan npm dependencies (if using TypeScript client)
npm audit
npm audit fix
```

## Additional Resources

- [HackerOne Security Best Practices](https://docs.hackerone.com/en/articles/security-best-practices)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [SOC 2 Compliance Guide](https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/aicpasoc2report.html)
