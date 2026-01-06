# Pub/Sub Integration Patterns

**Source:** Research synthesis (Confidence: 0.91)

## Client Reuse (Critical)

```go
var (
    pubsubClient *pubsub.Client
    clientOnce   sync.Once
    clientErr    error
)

func GetPubSubClient(ctx context.Context, projectID string) (*pubsub.Client, error) {
    clientOnce.Do(func() {
        pubsubClient, clientErr = pubsub.NewClient(ctx, projectID)
    })
    return pubsubClient, clientErr
}
```

---

## Publishing Patterns

### Simple Publish

```go
func publishMessage(ctx context.Context, topicID string, data []byte) error {
    client, err := GetPubSubClient(ctx, "project-id")
    if err != nil {
        return err
    }

    topic := client.Topic(topicID)
    result := topic.Publish(ctx, &pubsub.Message{
        Data: data,
    })

    // Block until message is published
    msgID, err := result.Get(ctx)
    if err != nil {
        return err
    }

    log.Printf("Published message ID: %s", msgID)
    return nil
}
```

### Batch Publishing (Performance)

```go
func publishBatch(ctx context.Context, topicID string, messages [][]byte) error {
    client, err := GetPubSubClient(ctx, "project-id")
    if err != nil {
        return err
    }

    topic := client.Topic(topicID)
    topic.PublishSettings.CountThreshold = 100  // Batch up to 100 messages
    topic.PublishSettings.DelayThreshold = 100 * time.Millisecond

    var results []*pubsub.PublishResult
    for _, data := range messages {
        result := topic.Publish(ctx, &pubsub.Message{Data: data})
        results = append(results, result)
    }

    // Wait for all publishes
    for _, result := range results {
        if _, err := result.Get(ctx); err != nil {
            return err
        }
    }

    return nil
}
```

---

## Subscription Patterns

### Pull Subscription

```go
func pullMessages(ctx context.Context, subscriptionID string) error {
    client, err := GetPubSubClient(ctx, "project-id")
    if err != nil {
        return err
    }

    sub := client.Subscription(subscriptionID)
    sub.ReceiveSettings.MaxOutstandingMessages = 100
    sub.ReceiveSettings.NumGoroutines = 10

    err = sub.Receive(ctx, func(ctx context.Context, msg *pubsub.Message) {
        log.Printf("Message: %s", string(msg.Data))

        // Process message
        if err := processMessage(msg.Data); err != nil {
            msg.Nack() // Retry later
            return
        }

        msg.Ack() // Success
    })

    return err
}
```

### Push Subscription

```bash
# Create push subscription
gcloud pubsub subscriptions create my-push-sub \
  --topic=my-topic \
  --push-endpoint=https://my-service.run.app/pubsub \
  --push-auth-service-account=push-sa@PROJECT_ID.iam.gserviceaccount.com
```

**HTTP Handler:**

```go
func HandlePush(w http.ResponseWriter, r *http.Request) {
    var msg struct {
        Message struct {
            Data []byte `json:"data"`
            ID   string `json:"messageId"`
        } `json:"message"`
    }

    if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
        http.Error(w, "Invalid request", http.StatusBadRequest)
        return
    }

    // Process message
    if err := processMessage(msg.Message.Data); err != nil {
        http.Error(w, "Processing failed", http.StatusInternalServerError)
        return
    }

    w.WriteStatus(http.StatusOK)
}
```

---

## Message Ordering

### Ordered Publishing

```go
func publishOrdered(ctx context.Context, topicID, orderingKey string, data []byte) error {
    client, err := GetPubSubClient(ctx, "project-id")
    if err != nil {
        return err
    }

    topic := client.Topic(topicID)
    topic.EnableMessageOrdering = true

    result := topic.Publish(ctx, &pubsub.Message{
        Data:        data,
        OrderingKey: orderingKey, // Messages with same key are ordered
    })

    _, err = result.Get(ctx)
    return err
}
```

### Ordered Subscription

```bash
# Enable ordering on subscription
gcloud pubsub subscriptions update my-sub \
  --enable-message-ordering
```

---

## Dead Letter Queues

### Configure DLQ

```bash
# Create dead letter topic
gcloud pubsub topics create my-topic-dlq

# Create subscription with DLQ
gcloud pubsub subscriptions create my-sub \
  --topic=my-topic \
  --dead-letter-topic=my-topic-dlq \
  --max-delivery-attempts=5
```

---

## Fan-Out Pattern (One-to-Many)

```
Topic: user-signup
  ├─> Subscription 1: send-welcome-email
  ├─> Subscription 2: create-user-profile
  └─> Subscription 3: notify-sales-team
```

Each subscription processes independently.

---

## Best Practices

- ✅ Reuse client and topic objects (singleton pattern)
- ✅ Enable batching for high-throughput publishing
- ✅ Use message ordering for sequential processing per key
- ✅ Configure dead letter queues for failed messages
- ✅ Implement idempotency (message IDs for deduplication)
- ✅ Set appropriate ack deadline (10-600 seconds)

---

## External Resources

- [Pub/Sub Documentation](https://cloud.google.com/pubsub/docs)
- [Message Ordering](https://cloud.google.com/pubsub/docs/ordering)
- [Dead Letter Queues](https://cloud.google.com/pubsub/docs/dead-letter-topics)
