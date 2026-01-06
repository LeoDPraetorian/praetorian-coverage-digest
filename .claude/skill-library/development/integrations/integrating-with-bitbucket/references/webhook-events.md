# Webhook Events and Payloads

**Complete reference for Bitbucket Cloud webhook event types, payload structures, and signature verification.**

---

## Webhook Event Types

### Repository Events

| Event                        | Trigger                          | Common Use Case               |
| ---------------------------- | -------------------------------- | ----------------------------- |
| `repo:push`                  | Code pushed to repository        | Trigger CI/CD, security scans |
| `repo:fork`                  | Repository forked                | Track repository usage        |
| `repo:updated`               | Repository settings changed      | Audit configuration changes   |
| `repo:transfer`              | Repository ownership transferred | Update access controls        |
| `repo:commit_status_created` | Commit status created            | Track build/test statuses     |
| `repo:commit_status_updated` | Commit status updated            | Monitor CI/CD pipeline        |

### Pull Request Events

| Event                         | Trigger                                  | Common Use Case                           |
| ----------------------------- | ---------------------------------------- | ----------------------------------------- |
| `pullrequest:created`         | New PR created                           | Auto-assign reviewers, run security scans |
| `pullrequest:updated`         | PR updated (commits, title, description) | Re-run validation checks                  |
| `pullrequest:approved`        | PR approved by reviewer                  | Track compliance, auto-merge              |
| `pullrequest:unapproved`      | PR approval removed                      | Block merge, notify team                  |
| `pullrequest:fulfilled`       | PR merged                                | Update assets, trigger deployments        |
| `pullrequest:rejected`        | PR declined/closed                       | Cleanup resources, notify author          |
| `pullrequest:comment_created` | Comment added to PR                      | Notify mentioned users                    |
| `pullrequest:comment_updated` | PR comment updated                       | Track discussion changes                  |
| `pullrequest:comment_deleted` | PR comment deleted                       | Audit trail                               |

### Issue Events

| Event                   | Trigger                | Common Use Case                 |
| ----------------------- | ---------------------- | ------------------------------- |
| `issue:created`         | New issue created      | Create Jira ticket, notify team |
| `issue:updated`         | Issue updated          | Sync with external systems      |
| `issue:comment_created` | Comment added to issue | Notify watchers                 |

### Build Events

| Event                  | Trigger              | Common Use Case      |
| ---------------------- | -------------------- | -------------------- |
| `build:status_created` | Build status created | Track CI/CD pipeline |
| `build:status_updated` | Build status updated | Update PR status     |

**Source:** [Event payloads | Bitbucket Cloud](https://support.atlassian.com/bitbucket-cloud/docs/event-payloads/)

---

## Payload Structures

### Common Headers

All webhook requests include:

```http
POST /your-webhook-endpoint HTTP/1.1
Host: yourapp.com
Content-Type: application/json
X-Event-Key: pullrequest:created
X-Request-UUID: 123e4567-e89b-12d3-a456-426614174000
X-Hook-UUID: 987fcdeb-51a2-43f7-b123-456789abcdef
X-Hub-Signature: sha256=abcdef1234567890...
User-Agent: Bitbucket-Webhooks/2.0
```

**Key Headers:**

- `X-Event-Key`: Event type (e.g., "pullrequest:created")
- `X-Hook-UUID`: Unique webhook identifier
- `X-Hub-Signature`: HMAC signature for verification

### repo:push Payload

```json
{
  "push": {
    "changes": [
      {
        "new": {
          "type": "branch",
          "name": "main",
          "target": {
            "hash": "abc123",
            "message": "Commit message",
            "date": "2026-01-04T10:30:00+00:00",
            "author": {
              "raw": "John Doe <john@example.com>"
            }
          }
        },
        "old": {
          "type": "branch",
          "name": "main",
          "target": {
            "hash": "def456"
          }
        },
        "created": false,
        "forced": false,
        "closed": false
      }
    ]
  },
  "repository": {
    "full_name": "workspace/repo",
    "name": "repo",
    "is_private": true
  },
  "actor": {
    "display_name": "John Doe",
    "uuid": "{user-uuid}"
  }
}
```

### pullrequest:created Payload

```json
{
  "pullrequest": {
    "id": 123,
    "title": "Fix authentication bug",
    "description": "This PR fixes the auth bug reported in #456",
    "state": "OPEN",
    "created_on": "2026-01-04T10:30:00.123456+00:00",
    "updated_on": "2026-01-04T10:30:00.123456+00:00",
    "source": {
      "branch": {
        "name": "feature/auth-fix"
      },
      "commit": {
        "hash": "abc123"
      },
      "repository": {
        "full_name": "workspace/repo"
      }
    },
    "destination": {
      "branch": {
        "name": "main"
      }
    },
    "author": {
      "display_name": "John Doe",
      "uuid": "{user-uuid}",
      "account_id": "123456:abcdef"
    },
    "participants": [],
    "reviewers": [],
    "links": {
      "html": {
        "href": "https://bitbucket.org/workspace/repo/pull-requests/123"
      }
    }
  },
  "repository": {
    "full_name": "workspace/repo",
    "name": "repo"
  },
  "actor": {
    "display_name": "John Doe"
  }
}
```

### pullrequest:fulfilled (Merged) Payload

```json
{
  "pullrequest": {
    "id": 123,
    "title": "Fix authentication bug",
    "state": "MERGED",
    "merge_commit": {
      "hash": "merged-commit-hash"
    },
    "closed_by": {
      "display_name": "Tech Lead",
      "uuid": "{user-uuid}"
    },
    "closed_on": "2026-01-04T12:00:00.123456+00:00"
  }
}
```

---

## Signature Verification

### HMAC SHA256 Verification

Bitbucket signs webhook payloads using HMAC SHA256 with your webhook secret.

**Header:** `X-Hub-Signature: sha256={hex_digest}`

### Go Implementation

```go
import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "io"
    "net/http"
)

func verifyWebhookSignature(r *http.Request, secret string) ([]byte, error) {
    // Read body
    body, err := io.ReadAll(r.Body)
    if err != nil {
        return nil, err
    }

    // Get signature from header
    signature := r.Header.Get("X-Hub-Signature")
    if signature == "" {
        return nil, fmt.Errorf("missing X-Hub-Signature header")
    }

    // Extract hex digest (remove "sha256=" prefix)
    if !strings.HasPrefix(signature, "sha256=") {
        return nil, fmt.Errorf("invalid signature format")
    }
    expectedMAC := signature[7:]  // Remove "sha256=" prefix

    // Compute HMAC
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(body)
    computedMAC := hex.EncodeToString(mac.Sum(nil))

    // Compare
    if !hmac.Equal([]byte(computedMAC), []byte(expectedMAC)) {
        return nil, fmt.Errorf("signature verification failed")
    }

    return body, nil
}
```

### Python Implementation

```python
import hmac
import hashlib

def verify_webhook_signature(request, secret: str) -> bytes:
    """
    Verify Bitbucket webhook signature.

    Args:
        request: Flask/Django/FastAPI request object
        secret: Webhook secret key

    Returns:
        Request body bytes if signature valid

    Raises:
        ValueError: If signature invalid or missing
    """
    # Get signature from header
    signature = request.headers.get('X-Hub-Signature', '')
    if not signature:
        raise ValueError("Missing X-Hub-Signature header")

    # Extract hex digest
    if not signature.startswith('sha256='):
        raise ValueError("Invalid signature format")

    expected_mac = signature[7:]  # Remove "sha256=" prefix

    # Get raw body (CRITICAL: use raw bytes, not parsed JSON)
    body = request.get_data()

    # Compute HMAC
    computed_mac = hmac.new(
        secret.encode(),
        body,
        hashlib.sha256
    ).hexdigest()

    # Compare (timing-safe)
    if not hmac.compare_digest(computed_mac, expected_mac):
        raise ValueError("Signature verification failed")

    return body
```

**⚠️ CRITICAL:** Always use raw request body (bytes) for signature verification, not parsed JSON. Parsing changes whitespace/formatting and breaks signature validation.

---

## Webhook Handler Pattern

### Go Handler

```go
type WebhookHandler struct {
    secret string
    client *BitbucketClient
}

func (h *WebhookHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // Verify signature
    body, err := verifyWebhookSignature(r, h.secret)
    if err != nil {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }

    // Get event type
    eventKey := r.Header.Get("X-Event-Key")

    // Parse payload
    var payload map[string]interface{}
    if err := json.Unmarshal(body, &payload); err != nil {
        http.Error(w, "Invalid JSON", http.StatusBadRequest)
        return
    }

    // Route to handler
    switch eventKey {
    case "pullrequest:created":
        h.handlePRCreated(payload)
    case "pullrequest:updated":
        h.handlePRUpdated(payload)
    case "pullrequest:fulfilled":
        h.handlePRMerged(payload)
    case "repo:push":
        h.handleRepoPush(payload)
    default:
        log.Printf("Unhandled event: %s", eventKey)
    }

    // Always respond 200 OK to acknowledge receipt
    w.WriteHeader(http.StatusOK)
}

func (h *WebhookHandler) handlePRCreated(payload map[string]interface{}) {
    // Extract PR data
    pr := payload["pullrequest"].(map[string]interface{})
    prID := int(pr["id"].(float64))
    title := pr["title"].(string)

    log.Printf("New PR #%d: %s", prID, title)

    // Trigger security scan
    go h.runSecurityScan(prID)
}
```

### Python Handler (Flask)

```python
from flask import Flask, request, jsonify
import json

app = Flask(__name__)
webhook_secret = os.environ["BITBUCKET_WEBHOOK_SECRET"]

@app.route('/webhooks/bitbucket', methods=['POST'])
def handle_webhook():
    try:
        # Verify signature
        body = verify_webhook_signature(request, webhook_secret)

        # Get event type
        event_key = request.headers.get('X-Event-Key', '')

        # Parse payload
        payload = json.loads(body)

        # Route to handler
        if event_key == 'pullrequest:created':
            handle_pr_created(payload)
        elif event_key == 'pullrequest:updated':
            handle_pr_updated(payload)
        elif event_key == 'pullrequest:fulfilled':
            handle_pr_merged(payload)
        elif event_key == 'repo:push':
            handle_repo_push(payload)
        else:
            app.logger.info(f"Unhandled event: {event_key}")

        return jsonify({"status": "ok"}), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 401
    except Exception as e:
        app.logger.error(f"Webhook error: {e}")
        return jsonify({"error": "Internal error"}), 500

def handle_pr_created(payload):
    pr = payload['pullrequest']
    pr_id = pr['id']
    title = pr['title']

    app.logger.info(f"New PR #{pr_id}: {title}")

    # Trigger security scan (async)
    from tasks import run_security_scan
    run_security_scan.delay(pr_id)
```

---

## Idempotency Handling

Webhooks may be delivered multiple times. Implement idempotency:

```go
type WebhookLog struct {
    UUID      string
    EventKey  string
    Processed bool
    CreatedAt time.Time
}

func (h *WebhookHandler) isProcessed(hookUUID string) bool {
    var count int
    h.db.QueryRow("SELECT COUNT(*) FROM webhook_logs WHERE uuid = $1 AND processed = true",
        hookUUID).Scan(&count)
    return count > 0
}

func (h *WebhookHandler) markProcessed(hookUUID, eventKey string) error {
    _, err := h.db.Exec(
        "INSERT INTO webhook_logs (uuid, event_key, processed) VALUES ($1, $2, true)",
        hookUUID, eventKey)
    return err
}

func (h *WebhookHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    hookUUID := r.Header.Get("X-Hook-UUID")

    // Check if already processed
    if h.isProcessed(hookUUID) {
        w.WriteHeader(http.StatusOK)
        return
    }

    // Process webhook...

    // Mark as processed
    h.markProcessed(hookUUID, r.Header.Get("X-Event-Key"))

    w.WriteHeader(http.StatusOK)
}
```

---

## Best Practices

1. **Always verify signatures** - Reject unauthenticated requests
2. **Respond quickly** - Return 200 OK within 10 seconds, process asynchronously
3. **Implement idempotency** - Handle duplicate webhook deliveries
4. **Log all events** - Audit trail for debugging
5. **Handle all event types** - Unknown events should log, not error
6. **Retry failed processing** - Queue for retry if processing fails
7. **Monitor webhook health** - Alert on delivery failures

---

## Related Documentation

- [pr-automation.md](pr-automation.md) - PR automation patterns using webhooks
- [authentication.md](authentication.md) - API authentication for webhook-triggered actions
- [integration-patterns.md](integration-patterns.md) - Complete integration architectures
