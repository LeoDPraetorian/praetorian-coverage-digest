# Webhook Events (Service Hooks)

Complete reference for Azure DevOps webhook events and payloads.

---

## Event Types

### Git Events

| Event ID                  | Description               | Use Case               |
| ------------------------- | ------------------------- | ---------------------- |
| `git.push`                | Code pushed to repository | Trigger security scans |
| `git.pullrequest.created` | New PR created            | Initiate PR review     |
| `git.pullrequest.updated` | PR updated                | Re-run checks          |
| `git.pullrequest.merged`  | PR merged                 | Update assets          |

### Build/Pipeline Events

| Event ID                               | Description            | Use Case                 |
| -------------------------------------- | ---------------------- | ------------------------ |
| `build.complete`                       | Build finished         | Analyze logs for secrets |
| `ms.vss-pipelines.stage-state-changed` | Pipeline stage changed | Monitor deployments      |
| `ms.vss-pipelines.run-state-changed`   | Pipeline run changed   | Track execution          |

### Work Item Events

| Event ID             | Description       | Use Case                    |
| -------------------- | ----------------- | --------------------------- |
| `workitem.created`   | Work item created | Link to security findings   |
| `workitem.updated`   | Work item updated | Track remediation progress  |
| `workitem.commented` | Comment added     | Collaboration notifications |

---

## Webhook Configuration

### Create Subscription (Go)

```go
type WebhookSubscription struct {
    PublisherID       string                 `json:"publisherId"`
    EventType         string                 `json:"eventType"`
    ResourceVersion   string                 `json:"resourceVersion"`
    ConsumerID        string                 `json:"consumerId"`
    ConsumerActionID  string                 `json:"consumerActionId"`
    ConsumerInputs    map[string]string      `json:"consumerInputs"`
    PublisherInputs   map[string]string      `json:"publisherInputs"`
}

func (c *Client) CreateWebhook(ctx context.Context, subscription WebhookSubscription) error {
    endpoint := fmt.Sprintf("_apis/hooks/subscriptions?api-version=7.1")

    jsonBody, _ := json.Marshal(subscription)
    resp, err := c.Request("POST", endpoint, bytes.NewBuffer(jsonBody))
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode != 200 {
        return fmt.Errorf("webhook creation failed: %s", resp.Status)
    }

    return nil
}
```

### Example: git.push Webhook

```json
{
  "publisherId": "tfs",
  "eventType": "git.push",
  "resourceVersion": "1.0",
  "consumerId": "webHooks",
  "consumerActionId": "httpRequest",
  "publisherInputs": {
    "repository": "repo-id",
    "branch": "refs/heads/main"
  },
  "consumerInputs": {
    "url": "https://chariot.example.com/webhooks/azuredevops"
  }
}
```

---

## Webhook Payloads

### git.push Event

```json
{
  "subscriptionId": "...",
  "notificationId": 1,
  "id": "...",
  "eventType": "git.push",
  "publisherId": "tfs",
  "message": {
    "text": "user pushed updates to repo:branch",
    "html": "...",
    "markdown": "..."
  },
  "resource": {
    "commits": [
      {
        "commitId": "abc123",
        "author": {
          "name": "User Name",
          "email": "user@example.com",
          "date": "2025-01-06T12:00:00Z"
        },
        "comment": "Fix security vulnerability",
        "url": "..."
      }
    ],
    "repository": {
      "id": "...",
      "name": "my-repo",
      "url": "...",
      "project": {
        "id": "...",
        "name": "MyProject"
      }
    },
    "pushedBy": {
      "displayName": "User Name",
      "uniqueName": "user@example.com"
    }
  }
}
```

### workitem.updated Event

```json
{
  "eventType": "workitem.updated",
  "resource": {
    "id": 123,
    "rev": 2,
    "fields": {
      "System.Title": "Security Vulnerability",
      "System.State": "Active",
      "System.Tags": "security; cve-2025-1234"
    },
    "url": "..."
  }
}
```

---

## Webhook Handler (Go)

```go
type WebhookHandler struct {
    client *AzureDevOpsClient
}

func (h *WebhookHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
    body, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "Bad request", http.StatusBadRequest)
        return
    }

    var event WebhookEvent
    if err := json.Unmarshal(body, &event); err != nil {
        http.Error(w, "Invalid JSON", http.StatusBadRequest)
        return
    }

    // Route by event type
    switch event.EventType {
    case "git.push":
        h.handleGitPush(event)
    case "git.pullrequest.created":
        h.handlePRCreated(event)
    case "build.complete":
        h.handleBuildComplete(event)
    case "workitem.updated":
        h.handleWorkItemUpdated(event)
    default:
        log.Printf("Unknown event type: %s", event.EventType)
    }

    w.WriteHeader(http.StatusOK)
}
```

---

## Asynchronous Processing

```go
func (h *WebhookHandler) HandleWebhookAsync(w http.ResponseWriter, r *http.Request) {
    body, _ := io.ReadAll(r.Body)

    // Immediately return 200
    w.WriteHeader(http.StatusOK)

    // Process asynchronously
    go func() {
        var event WebhookEvent
        json.Unmarshal(body, &event)

        // Process event (may take time)
        h.processEvent(event)
    }()
}
```

---

## Python Webhook Handler

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhooks/azuredevops', methods=['POST'])
def handle_webhook():
    event = request.json

    event_type = event.get('eventType')

    if event_type == 'git.push':
        handle_git_push(event)
    elif event_type == 'workitem.updated':
        handle_workitem_updated(event)

    return jsonify({'status': 'received'}), 200
```

---

## Related Resources

- [Service Hooks Overview](https://learn.microsoft.com/en-us/azure/devops/service-hooks/overview)
- [Service Hook Events](https://learn.microsoft.com/en-us/azure/devops/service-hooks/events)
- [Integration Patterns](integration-patterns.md)
