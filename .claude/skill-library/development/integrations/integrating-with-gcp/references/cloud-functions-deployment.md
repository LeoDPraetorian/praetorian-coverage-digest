# Cloud Functions Deployment Patterns

**Source:** Research synthesis (Confidence: 0.91)

## Trigger Types

| Trigger Type      | Use Case            | Invocation                                      |
| ----------------- | ------------------- | ----------------------------------------------- |
| **HTTP**          | REST APIs, webhooks | Synchronous (direct response)                   |
| **Pub/Sub**       | Event processing    | Asynchronous (at-least-once delivery)           |
| **Cloud Storage** | File processing     | Asynchronous (on object finalize/delete)        |
| **Firestore**     | Database triggers   | Asynchronous (on document create/update/delete) |

---

## HTTP Functions

### Basic HTTP Function

```go
package hellohttp

import (
    "encoding/json"
    "net/http"
)

type Request struct {
    Name string `json:"name"`
}

type Response struct {
    Message string `json:"message"`
}

func HelloHTTP(w http.ResponseWriter, r *http.Request) {
    var req Request
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request", http.StatusBadRequest)
        return
    }

    res := Response{Message: "Hello, " + req.Name}
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(res)
}
```

### Deploy

```bash
gcloud functions deploy hello-http \
  --runtime=go121 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=HelloHTTP \
  --region=us-central1 \
  --service-account=my-function-sa@PROJECT_ID.iam.gserviceaccount.com
```

---

## Pub/Sub Functions (Event-Driven)

### PubSub Message Handler

```go
package hellopubsub

import (
    "context"
    "log"
)

type PubSubMessage struct {
    Data []byte `json:"data"`
}

func HelloPubSub(ctx context.Context, m PubSubMessage) error {
    log.Printf("Message received: %s", string(m.Data))

    // Process message
    // If error is returned, function will be retried

    return nil // Success - no retry
}
```

### Deploy with Pub/Sub Trigger

```bash
gcloud functions deploy hello-pubsub \
  --runtime=go121 \
  --trigger-topic=my-topic \
  --entry-point=HelloPubSub \
  --region=us-central1 \
  --service-account=my-function-sa@PROJECT_ID.iam.gserviceaccount.com \
  --retry  # Enable automatic retries on failure
```

---

## Cloud Storage Functions

### Storage Event Handler

```go
package hellostorage

import (
    "context"
    "log"
)

type StorageEvent struct {
    Bucket         string `json:"bucket"`
    Name           string `json:"name"`
    Metageneration int64  `json:"metageneration"`
    TimeCreated    string `json:"timeCreated"`
}

func HelloStorage(ctx context.Context, e StorageEvent) error {
    log.Printf("File uploaded: gs://%s/%s", e.Bucket, e.Name)

    // Process file (e.g., generate thumbnail, extract metadata)

    return nil
}
```

### Deploy with Storage Trigger

```bash
gcloud functions deploy hello-storage \
  --runtime=go121 \
  --trigger-resource=my-bucket \
  --trigger-event=google.storage.object.finalize \
  --entry-point=HelloStorage \
  --region=us-central1 \
  --service-account=my-function-sa@PROJECT_ID.iam.gserviceaccount.com
```

---

## Retry Configuration

### Automatic Retries (Event-Driven Functions)

```bash
# Enable retries (recommended for Pub/Sub, Storage triggers)
gcloud functions deploy my-function \
  --runtime=go121 \
  --trigger-topic=my-topic \
  --retry

# Disable retries
gcloud functions deploy my-function \
  --runtime=go121 \
  --trigger-topic=my-topic \
  --no-retry
```

**Retry behavior:**

- Initial delay: 10 seconds
- Max delay: 600 seconds (10 minutes)
- Retry period: Up to 7 days
- Exponential backoff with jitter

### Idempotency (Critical for Retries)

```go
import (
    "cloud.google.com/go/firestore"
)

func ProcessEventIdempotent(ctx context.Context, m PubSubMessage) error {
    // Extract event ID
    eventID := string(m.Data)

    client, err := firestore.NewClient(ctx, "project-id")
    if err != nil {
        return err
    }
    defer client.Close()

    // Check if already processed
    doc := client.Collection("processed_events").Doc(eventID)
    _, err = doc.Get(ctx)
    if err == nil {
        // Already processed
        return nil
    }

    // Process event
    if err := doWork(eventID); err != nil {
        return err // Retryable
    }

    // Mark as processed
    _, err = doc.Set(ctx, map[string]interface{}{
        "processed_at": firestore.ServerTimestamp,
    })
    return err
}
```

---

## Best Practices

### Performance

- ✅ Use 2nd gen Cloud Functions (higher concurrency, longer timeout)
- ✅ Reuse client connections (global variables)
- ✅ Set minimum instances for latency-sensitive functions
- ✅ Use larger memory allocation for CPU-intensive tasks

### Security

- ✅ Use dedicated service account per function (least privilege)
- ✅ Require authentication for HTTP functions (unless public API)
- ✅ Validate input data (prevent injection attacks)
- ✅ Use Secret Manager for API keys (not environment variables)

### Reliability

- ✅ Implement idempotency for event-driven functions
- ✅ Enable retries for transient failures
- ✅ Set appropriate timeout (default: 60s, max: 540s)
- ✅ Monitor error rates with Cloud Monitoring

---

## External Resources

- [Cloud Functions Documentation](https://cloud.google.com/functions/docs)
- [Event-Driven Functions](https://cloud.google.com/functions/docs/calling)
- [Retry Behavior](https://cloud.google.com/functions/docs/bestpractices/retries)
