# HackerOne Webhook Integration

**Last Updated:** January 3, 2026
**Availability:** Professional tier and above (as of January 2025)

## Overview

HackerOne webhooks deliver real-time event notifications to your endpoint when activities occur on reports, programs, or bounties. Webhooks enable event-driven integrations without polling, reducing API call volume and improving response times.

## Webhook Event Types

### Report Events

| Event Type             | Trigger                   | Payload Includes                              |
| ---------------------- | ------------------------- | --------------------------------------------- |
| `report.created`       | New report submitted      | Report ID, title, severity, state, program    |
| `report.state_changed` | Report state transition   | Previous state, new state, actor, timestamp   |
| `report.triaged`       | Report marked as triaged  | Severity rating, priority, assigned user      |
| `report.resolved`      | Report marked as resolved | Resolution type, bounty amount (if awarded)   |
| `report.disclosed`     | Report publicly disclosed | Disclosure type (full, limited), disclosed_at |
| `report.reopened`      | Resolved report reopened  | Reopened reason, actor                        |

### Activity Events

| Event Type                  | Trigger                  | Payload Includes                                   |
| --------------------------- | ------------------------ | -------------------------------------------------- |
| `activity.comment_added`    | Comment posted on report | Comment text, author, visibility (public/internal) |
| `activity.bounty_awarded`   | Bounty awarded to hacker | Bounty amount, currency, bonus flag                |
| `activity.bounty_suggested` | Bounty amount suggested  | Suggested amount, currency                         |
| `activity.swag_awarded`     | Swag awarded to hacker   | Swag type, address (if provided)                   |
| `activity.severity_changed` | Severity rating updated  | Old severity, new severity, CVSS scores            |
| `activity.priority_changed` | Priority level updated   | Old priority, new priority                         |
| `activity.assignee_changed` | Report assigned to user  | Previous assignee, new assignee                    |

### Program Events

| Event Type              | Trigger                  | Payload Includes                            |
| ----------------------- | ------------------------ | ------------------------------------------- |
| `program.updated`       | Program settings changed | Changed fields, previous values, new values |
| `program.scope_added`   | Asset added to scope     | Scope ID, asset identifier, asset type      |
| `program.scope_removed` | Asset removed from scope | Scope ID, asset identifier, removal reason  |

### Bounty Events

| Event Type       | Trigger                  | Payload Includes                             |
| ---------------- | ------------------------ | -------------------------------------------- |
| `bounty.created` | Bounty created           | Amount, currency, report ID                  |
| `bounty.updated` | Bounty amount changed    | Old amount, new amount, reason               |
| `bounty.paid`    | Bounty payment processed | Payment ID, payout status, paid_at timestamp |

## Webhook Payload Structure

All webhook payloads follow this structure:

```json
{
  "event": "report.state_changed",
  "event_id": "evt_abc123def456",
  "timestamp": "2026-01-03T17:00:00.000Z",
  "data": {
    "id": "12345",
    "type": "report",
    "attributes": {
      "title": "SQL Injection in search parameter",
      "state": "triaged",
      "previous_state": "new",
      "severity_rating": "high",
      "weakness": {
        "id": "70",
        "name": "SQL Injection"
      },
      "structured_scope": {
        "asset_type": "URL",
        "asset_identifier": "https://example.com/search"
      }
    },
    "relationships": {
      "program": {
        "data": {
          "id": "456",
          "type": "program",
          "attributes": {
            "handle": "example-program"
          }
        }
      },
      "reporter": {
        "data": {
          "id": "789",
          "type": "user",
          "attributes": {
            "username": "security_researcher"
          }
        }
      }
    }
  }
}
```

### Common Payload Fields

| Field                | Type     | Description                                          |
| -------------------- | -------- | ---------------------------------------------------- |
| `event`              | string   | Event type identifier (e.g., `report.state_changed`) |
| `event_id`           | string   | Unique event identifier for idempotency              |
| `timestamp`          | ISO 8601 | Event occurrence timestamp (UTC)                     |
| `data.id`            | string   | Primary resource ID                                  |
| `data.type`          | string   | Resource type (`report`, `activity`, `program`)      |
| `data.attributes`    | object   | Resource-specific attributes                         |
| `data.relationships` | object   | Related resources (program, reporter, assignee)      |

## Webhook Security

### 1. Signature Verification (REQUIRED)

Every webhook includes an `X-HackerOne-Signature` header containing an HMAC-SHA256 signature of the payload.

#### Signature Format

```
X-HackerOne-Signature: sha256=<hex_signature>
```

#### Verification Algorithm

```go
package hackerone

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "io"
    "net/http"
    "strings"
)

// VerifyWebhookSignature validates the HMAC-SHA256 signature
func VerifyWebhookSignature(payload []byte, signature string, secret string) bool {
    // Extract hex signature from header value
    if !strings.HasPrefix(signature, "sha256=") {
        return false
    }
    receivedSig := strings.TrimPrefix(signature, "sha256=")

    // Compute expected signature
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(payload)
    expectedSig := hex.EncodeToString(mac.Sum(nil))

    // Constant-time comparison to prevent timing attacks
    return hmac.Equal([]byte(receivedSig), []byte(expectedSig))
}

// WebhookHandler handles incoming webhooks
func WebhookHandler(w http.ResponseWriter, r *http.Request) {
    // Read raw body (needed for signature verification)
    body, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "Cannot read body", http.StatusBadRequest)
        return
    }
    defer r.Body.Close()

    // Get signature from header
    signature := r.Header.Get("X-HackerOne-Signature")
    if signature == "" {
        http.Error(w, "Missing signature", http.StatusUnauthorized)
        return
    }

    // Verify signature
    secret := os.Getenv("HACKERONE_WEBHOOK_SECRET")
    if !VerifyWebhookSignature(body, signature, secret) {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }

    // Signature valid - process webhook
    var webhook WebhookPayload
    if err := json.Unmarshal(body, &webhook); err != nil {
        http.Error(w, "Invalid JSON", http.StatusBadRequest)
        return
    }

    // Process event...
    processWebhookEvent(webhook)

    // Return 202 Accepted immediately
    w.WriteHeader(http.StatusAccepted)
}
```

#### Python Implementation

```python
import hmac
import hashlib

def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify HMAC-SHA256 signature of webhook payload."""
    if not signature.startswith("sha256="):
        return False

    received_sig = signature.replace("sha256=", "")

    # Compute expected signature
    mac = hmac.new(secret.encode(), payload, hashlib.sha256)
    expected_sig = mac.hexdigest()

    # Constant-time comparison
    return hmac.compare_digest(received_sig, expected_sig)
```

### 2. Idempotency

Prevent duplicate event processing using the `event_id` field.

#### Implementation Pattern

```go
type EventCache interface {
    Has(eventID string) (bool, error)
    Store(eventID string, ttl time.Duration) error
}

// Redis-backed cache
type RedisEventCache struct {
    client *redis.Client
}

func (c *RedisEventCache) Has(eventID string) (bool, error) {
    exists, err := c.client.Exists(context.Background(), eventID).Result()
    return exists > 0, err
}

func (c *RedisEventCache) Store(eventID string, ttl time.Duration) error {
    return c.client.Set(context.Background(), eventID, "1", ttl).Err()
}

// Idempotency middleware
func processWebhookEvent(webhook WebhookPayload) error {
    cache := getEventCache()

    // Check if already processed
    exists, err := cache.Has(webhook.EventID)
    if err != nil {
        return fmt.Errorf("cache error: %w", err)
    }
    if exists {
        log.Info("Duplicate event ignored", "event_id", webhook.EventID)
        return nil // Already processed
    }

    // Process event
    if err := handleEvent(webhook); err != nil {
        return err
    }

    // Mark as processed (TTL: 7 days)
    return cache.Store(webhook.EventID, 7*24*time.Hour)
}
```

### 3. Replay Protection

Reject events with timestamps >5 minutes old.

```go
func validateTimestamp(timestamp string) error {
    eventTime, err := time.Parse(time.RFC3339, timestamp)
    if err != nil {
        return fmt.Errorf("invalid timestamp: %w", err)
    }

    age := time.Since(eventTime)
    if age > 5*time.Minute {
        return fmt.Errorf("event too old: %v", age)
    }

    if age < -1*time.Minute {
        return fmt.Errorf("event timestamp in future: %v", age)
    }

    return nil
}
```

## Webhook Configuration

### Setup via HackerOne UI

1. Navigate to **Organization Settings > Integrations > Webhooks**
2. Click **Create Webhook**
3. Configure:
   - **Endpoint URL:** Your HTTPS endpoint (must use SSL)
   - **Secret:** Generate a secure random string (min 32 characters)
   - **Events:** Select event types to receive
   - **Active:** Toggle webhook on/off
4. Test webhook with "Send Test Event" button
5. Monitor delivery logs for failures

### Testing Webhooks

HackerOne provides a test event generator:

```json
{
  "event": "webhook.test",
  "event_id": "test_evt_123",
  "timestamp": "2026-01-03T17:00:00.000Z",
  "data": {
    "message": "Webhook endpoint is configured correctly"
  }
}
```

Always verify signature on test events to ensure your implementation is correct.

## Async Processing Pattern

Webhooks must respond <5 seconds. Use async processing via message queue.

### Architecture: Webhook → SQS → Lambda

```
[HackerOne] → [API Gateway + Lambda Handler] → [SQS Queue] → [Lambda Processor] → [Chariot Backend]
                        ↓ (validate + 202)              ↓ (async processing)
                    <5 seconds                        Variable time
```

#### Step 1: Webhook Receiver (Fast Response)

```go
func WebhookHandler(w http.ResponseWriter, r *http.Request) {
    body, _ := io.ReadAll(r.Body)
    signature := r.Header.Get("X-HackerOne-Signature")

    // Validate signature (fast)
    if !VerifyWebhookSignature(body, signature, secret) {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }

    // Push to SQS (fast - <100ms)
    sqsClient := getSQSClient()
    _, err := sqsClient.SendMessage(context.Background(), &sqs.SendMessageInput{
        QueueUrl:    aws.String(queueURL),
        MessageBody: aws.String(string(body)),
    })
    if err != nil {
        http.Error(w, "Queue error", http.StatusInternalServerError)
        return
    }

    // Return immediately
    w.WriteHeader(http.StatusAccepted)
    w.Write([]byte(`{"status":"accepted"}`))
}
```

#### Step 2: SQS Consumer (Async Processing)

```go
func ProcessSQSMessages() {
    sqsClient := getSQSClient()

    for {
        result, err := sqsClient.ReceiveMessage(context.Background(), &sqs.ReceiveMessageInput{
            QueueUrl:            aws.String(queueURL),
            MaxNumberOfMessages: 10,
            WaitTimeSeconds:     20, // Long polling
        })
        if err != nil {
            log.Error("SQS receive error", "error", err)
            continue
        }

        for _, msg := range result.Messages {
            if err := processWebhookMessage(msg); err != nil {
                log.Error("Process error", "error", err, "message_id", *msg.MessageId)
                // Message returns to queue for retry
                continue
            }

            // Delete message after successful processing
            sqsClient.DeleteMessage(context.Background(), &sqs.DeleteMessageInput{
                QueueUrl:      aws.String(queueURL),
                ReceiptHandle: msg.ReceiptHandle,
            })
        }
    }
}

func processWebhookMessage(msg types.Message) error {
    var webhook WebhookPayload
    if err := json.Unmarshal([]byte(*msg.Body), &webhook); err != nil {
        return err
    }

    // Idempotency check
    if isDuplicate(webhook.EventID) {
        return nil
    }

    // Process based on event type
    switch webhook.Event {
    case "report.state_changed":
        return handleReportStateChange(webhook)
    case "activity.comment_added":
        return handleCommentAdded(webhook)
    // ... other event types
    }

    return nil
}
```

## Event Handling Patterns

### Report State Changes

```go
func handleReportStateChange(webhook WebhookPayload) error {
    reportID := webhook.Data.ID
    newState := webhook.Data.Attributes["state"].(string)
    prevState := webhook.Data.Attributes["previous_state"].(string)

    log.Info("Report state changed",
        "report_id", reportID,
        "prev_state", prevState,
        "new_state", newState,
    )

    // Fetch full report details (webhooks contain minimal data)
    report, err := hackerOneClient.GetReport(reportID)
    if err != nil {
        return fmt.Errorf("fetch report: %w", err)
    }

    // Map to Chariot Risk entity
    risk := mapReportToRisk(report)

    // Upsert to Chariot backend
    return chariotClient.UpsertRisk(risk)
}
```

### Bounty Awards

```go
func handleBountyAwarded(webhook WebhookPayload) error {
    reportID := webhook.Data.Attributes["report_id"].(string)
    amount := webhook.Data.Attributes["bounty_amount"].(float64)
    currency := webhook.Data.Attributes["currency"].(string)

    log.Info("Bounty awarded",
        "report_id", reportID,
        "amount", amount,
        "currency", currency,
    )

    // Update Chariot Risk with bounty metadata
    return chariotClient.UpdateRiskBounty(reportID, amount, currency)
}
```

### Comment Notifications

```go
func handleCommentAdded(webhook WebhookPayload) error {
    reportID := webhook.Data.Attributes["report_id"].(string)
    comment := webhook.Data.Attributes["comment"].(string)
    visibility := webhook.Data.Attributes["visibility"].(string)
    author := webhook.Data.Relationships["author"]["username"].(string)

    // Only process public comments (ignore internal notes)
    if visibility != "public" {
        return nil
    }

    log.Info("New comment",
        "report_id", reportID,
        "author", author,
    )

    // Notify Chariot users watching this risk
    return notificationService.NotifyRiskWatchers(reportID, comment, author)
}
```

## Error Handling

### Delivery Failures

HackerOne retries failed webhook deliveries with exponential backoff:

- **Initial retry:** 1 minute
- **Subsequent retries:** 2min, 4min, 8min, 16min, 32min
- **Max retries:** 10 attempts over ~17 hours
- **After max retries:** Webhook marked as failed, manual retry required

**Best Practice:** Always return 2xx status codes for valid webhooks, even if processing fails. Handle errors in async consumer with DLQ.

### Dead Letter Queue (DLQ)

```go
// SQS with DLQ configuration
sqsClient.CreateQueue(context.Background(), &sqs.CreateQueueInput{
    QueueName: aws.String("hackerone-webhooks"),
    Attributes: map[string]string{
        "RedrivePolicy": `{
            "deadLetterTargetArn": "arn:aws:sqs:us-east-1:123456789:hackerone-webhooks-dlq",
            "maxReceiveCount": "3"
        }`,
    },
})
```

After 3 failed processing attempts, message moves to DLQ for manual inspection.

## Monitoring and Alerting

### Metrics to Track

```go
type WebhookMetrics struct {
    TotalReceived      int64 // Total webhooks received
    SignatureFailures  int64 // Invalid signatures
    DuplicateEvents    int64 // Duplicate event_ids
    ProcessingErrors   int64 // Processing failures
    AvgProcessingTime  time.Duration
}
```

### Alert Thresholds

| Metric              | Threshold    | Action                       |
| ------------------- | ------------ | ---------------------------- |
| Signature failures  | >5 in 1 hour | Verify webhook secret        |
| Processing errors   | >10%         | Investigate consumer logic   |
| DLQ depth           | >50 messages | Manual intervention required |
| Avg processing time | >30 seconds  | Scale consumers              |

## Testing Strategies

### Unit Tests

```go
func TestVerifyWebhookSignature(t *testing.T) {
    payload := []byte(`{"event":"report.created"}`)
    secret := "test-secret"

    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(payload)
    validSig := "sha256=" + hex.EncodeToString(mac.Sum(nil))

    assert.True(t, VerifyWebhookSignature(payload, validSig, secret))
    assert.False(t, VerifyWebhookSignature(payload, "sha256=invalid", secret))
}
```

### Integration Tests (Sandbox)

Use HackerOne sandbox environment to trigger real webhooks:

1. Configure webhook pointing to test endpoint
2. Create test report in sandbox program
3. Transition report state to trigger webhooks
4. Verify webhook received and processed correctly

## Common Pitfalls

| Pitfall                  | Impact                      | Prevention                      |
| ------------------------ | --------------------------- | ------------------------------- |
| Not verifying signatures | Security vulnerability      | Always verify before processing |
| Synchronous processing   | Timeouts, 5xx errors        | Use async queue pattern         |
| Missing idempotency      | Duplicate processing        | Cache event_ids                 |
| No replay protection     | Old event processing        | Validate timestamps             |
| Hardcoded secrets        | Secret exposure             | Use env vars / secrets manager  |
| Ignoring test events     | Misconfiguration undetected | Test signature on test payloads |

## Professional Tier Requirement

**As of January 2025:** Webhooks are available to **Professional tier customers and above**.

**Free/Community tiers:** Must use polling via API (GET /incremental/activities recommended).

## Additional Resources

- **Official Webhook Docs:** https://docs.hackerone.com/en/articles/8588351-webhooks
- **Event Payload Examples:** Contact HackerOne support for comprehensive examples
- **Webhook Testing Tools:** https://webhook.site for testing signatures
