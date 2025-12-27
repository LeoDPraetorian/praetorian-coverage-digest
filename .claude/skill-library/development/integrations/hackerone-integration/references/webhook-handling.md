# HackerOne Webhook Handling

**Implementation patterns for processing HackerOne webhook events in real-time.**

## Overview

HackerOne webhooks enable real-time synchronization between HackerOne and Chariot. This guide covers webhook registration, event handling, signature verification, and error recovery.

## Webhook Events

HackerOne sends the following event types:

| Event Type               | Trigger                        | Chariot Action       |
| ------------------------ | ------------------------------ | -------------------- |
| `report_created`         | New vulnerability submitted    | Create Risk entity   |
| `report_state_change`    | Report triaged/resolved/closed | Update Risk status   |
| `report_severity_change` | Severity rating updated        | Update Risk priority |
| `report_activity`        | Comment/action added           | Create activity log  |
| `bounty_awarded`         | Bounty paid to researcher      | Update Risk metadata |
| `program_disabled`       | Program temporarily disabled   | Pause sync           |

## Webhook Payload Structure

```json
{
  "id": "webhook-event-123",
  "type": "webhook-event",
  "attributes": {
    "event_type": "report_state_change",
    "created_at": "2025-01-15T10:00:00.000Z",
    "data": {
      "report": {
        "id": "123456",
        "attributes": {
          "title": "SQL Injection",
          "state": "triaged",
          "previous_state": "new"
        }
      }
    }
  }
}
```

## Webhook Handler Implementation

### Lambda Handler Pattern

```go
// modules/chariot/backend/pkg/integration/hackerone/webhook.go
package hackerone

import (
    "context"
    "encoding/json"
    "fmt"

    "github.com/aws/aws-lambda-go/events"
)

// HandleWebhook processes incoming HackerOne webhook events
func HandleWebhook(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    // 1. Verify webhook signature
    if !verifySignature(req.Headers, req.Body) {
        return response.Unauthorized("Invalid signature"), nil
    }

    // 2. Parse webhook payload
    var event WebhookEvent
    if err := json.Unmarshal([]byte(req.Body), &event); err != nil {
        return response.BadRequest("Invalid payload"), nil
    }

    // 3. Route to event-specific handler
    switch event.Attributes.EventType {
    case "report_created":
        return handleReportCreated(ctx, event)
    case "report_state_change":
        return handleReportStateChange(ctx, event)
    case "report_severity_change":
        return handleReportSeverityChange(ctx, event)
    case "report_activity":
        return handleReportActivity(ctx, event)
    default:
        // Unknown event - acknowledge but don't process
        return response.OK(map[string]string{"status": "ignored"}), nil
    }
}
```

### Signature Verification

HackerOne signs webhooks with HMAC-SHA256:

```go
import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
)

func verifySignature(headers map[string]string, body string) bool {
    // Get signature from header
    signature := headers["X-HackerOne-Signature"]
    if signature == "" {
        return false
    }

    // Load webhook secret from environment
    secret := os.Getenv("HACKERONE_WEBHOOK_SECRET")
    if secret == "" {
        log.Error("webhook secret not configured")
        return false
    }

    // Compute expected signature
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write([]byte(body))
    expectedSignature := hex.EncodeToString(mac.Sum(nil))

    // Compare signatures (constant-time)
    return hmac.Equal([]byte(signature), []byte(expectedSignature))
}
```

## Event Handlers

### Report Created

```go
func handleReportCreated(ctx context.Context, event WebhookEvent) (events.APIGatewayProxyResponse, error) {
    report := event.Attributes.Data.Report

    // Map HackerOne report to Chariot Risk
    risk, err := MapReportToRisk(report)
    if err != nil {
        log.Error("failed to map report", "error", err, "report_id", report.ID)
        return response.InternalError(), nil
    }

    // Create Risk entity in Chariot
    if err := riskService.Create(ctx, risk); err != nil {
        log.Error("failed to create risk", "error", err)
        return response.InternalError(), nil
    }

    // Send notification to security team
    if err := notifySecurityTeam(ctx, risk); err != nil {
        log.Warn("failed to send notification", "error", err)
        // Don't fail webhook - notification is non-critical
    }

    return response.OK(map[string]string{
        "status":  "created",
        "risk_id": risk.ID,
    }), nil
}
```

### Report State Change

```go
func handleReportStateChange(ctx context.Context, event WebhookEvent) (events.APIGatewayProxyResponse, error) {
    report := event.Attributes.Data.Report

    // Find existing Risk by HackerOne report ID
    risk, err := riskService.GetByExternalID(ctx, "hackerone", report.ID)
    if err != nil {
        log.Error("risk not found", "report_id", report.ID)
        return response.NotFound(), nil
    }

    // Map new state to Chariot status
    newStatus := MapStateToStatus(report.Attributes.State)

    // Update Risk status
    risk.Status = newStatus
    risk.UpdatedAt = time.Now()

    if err := riskService.Update(ctx, risk); err != nil {
        log.Error("failed to update risk", "error", err)
        return response.InternalError(), nil
    }

    // Create audit log
    audit.Log(ctx, audit.Event{
        Action:     "risk_status_updated",
        ResourceID: risk.ID,
        Source:     "hackerone_webhook",
        Details: map[string]interface{}{
            "old_status": report.Attributes.PreviousState,
            "new_status": report.Attributes.State,
        },
    })

    return response.OK(map[string]string{
        "status":  "updated",
        "risk_id": risk.ID,
    }), nil
}
```

### Report Severity Change

```go
func handleReportSeverityChange(ctx context.Context, event WebhookEvent) (events.APIGatewayProxyResponse, error) {
    report := event.Attributes.Data.Report

    // Find existing Risk
    risk, err := riskService.GetByExternalID(ctx, "hackerone", report.ID)
    if err != nil {
        return response.NotFound(), nil
    }

    // Map new severity to priority
    newPriority := MapSeverityToPriority(report.Attributes.Severity.Rating)

    // Update Risk priority
    risk.Priority = newPriority
    risk.CVSS = report.Attributes.Severity.Score

    if err := riskService.Update(ctx, risk); err != nil {
        return response.InternalError(), nil
    }

    // Notify if priority increased
    if newPriority < risk.Priority {
        notifyPriorityIncrease(ctx, risk)
    }

    return response.OK(map[string]string{
        "status":  "updated",
        "risk_id": risk.ID,
    }), nil
}
```

## Webhook Registration

### Programmatic Registration

```go
func RegisterWebhook(ctx context.Context, client *Client, webhookURL, secret string) error {
    payload := map[string]interface{}{
        "data": map[string]interface{}{
            "type": "webhook",
            "attributes": map[string]interface{}{
                "url": webhookURL,
                "events": []string{
                    "report_created",
                    "report_state_change",
                    "report_severity_change",
                    "report_activity",
                },
            },
        },
    }

    resp, err := client.Do(ctx, "POST", "/webhooks", payload)
    if err != nil {
        return fmt.Errorf("register webhook: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusCreated {
        return fmt.Errorf("webhook registration failed: %d", resp.StatusCode)
    }

    log.Info("webhook registered successfully", "url", webhookURL)
    return nil
}
```

### Manual Registration

1. Log in to HackerOne
2. Navigate to Program Settings → Webhooks
3. Click "Create Webhook"
4. Enter webhook URL: `https://api.chariot.example.com/webhooks/hackerone`
5. Generate shared secret
6. Select events to subscribe to
7. Save configuration

## Error Handling

### Retry Strategy

HackerOne retries failed webhooks with exponential backoff:

- 1st retry: 1 minute
- 2nd retry: 5 minutes
- 3rd retry: 30 minutes
- 4th retry: 2 hours
- Final retry: 6 hours

**Handler should be idempotent** to handle duplicate events.

### Idempotency Implementation

```go
type WebhookEventStore interface {
    HasProcessed(ctx context.Context, eventID string) (bool, error)
    MarkProcessed(ctx context.Context, eventID string) error
}

func HandleWebhook(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    var event WebhookEvent
    json.Unmarshal([]byte(req.Body), &event)

    // Check if already processed
    processed, err := eventStore.HasProcessed(ctx, event.ID)
    if err != nil {
        return response.InternalError(), nil
    }

    if processed {
        log.Info("webhook event already processed", "event_id", event.ID)
        return response.OK(map[string]string{"status": "duplicate"}), nil
    }

    // Process event
    result, err := processEvent(ctx, event)
    if err != nil {
        return response.InternalError(), nil
    }

    // Mark as processed
    if err := eventStore.MarkProcessed(ctx, event.ID); err != nil {
        log.Error("failed to mark event as processed", "error", err)
    }

    return result, nil
}
```

## Testing

### Mock Webhook Payloads

```go
func TestHandleReportCreated(t *testing.T) {
    payload := `{
        "id": "event-123",
        "type": "webhook-event",
        "attributes": {
            "event_type": "report_created",
            "data": {
                "report": {
                    "id": "123456",
                    "attributes": {
                        "title": "Test Report",
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

    req := events.APIGatewayProxyRequest{
        Body: payload,
        Headers: map[string]string{
            "X-HackerOne-Signature": computeSignature(payload),
        },
    }

    resp, err := HandleWebhook(context.Background(), req)
    require.NoError(t, err)
    assert.Equal(t, 200, resp.StatusCode)
}
```

## Related References

- [Client Setup](client-setup.md) - API client implementation
- [Data Mapping](data-mapping.md) - Field mapping guide
- [Testing Patterns](testing-patterns.md) - Webhook testing strategies
