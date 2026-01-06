# Webhook Handling for Bugcrowd Integration

**Last Updated:** 2026-01-03
**Source:** Research synthesis from Bugcrowd documentation and industry patterns

---

## Webhook Event Types

Bugcrowd webhooks emit events for three resource categories:

### Submission Events

- `submission.submitted` - New vulnerability submission received
- `submission.accepted` - Submission accepted by program
- `submission.rejected` - Submission rejected
- `submission.comment_added` - New comment on submission
- `submission.state_changed` - State transition (e.g., submitted → duplicate)

### Reward Events

- `reward.offered` - Reward offered to researcher
- `reward.paid` - Bounty payment processed
- `reward.adjusted` - Reward amount adjusted

### Program Events

- `program.created` - New bug bounty program launched
- `program.updated` - Program settings changed
- `program.submission_threshold` - Submission limit reached

---

## Webhook Payload Structure

```json
{
  "id": "webhook_event_123abc",
  "timestamp": "2026-01-03T15:30:45.123Z",
  "event_type": "submission.accepted",
  "data": {
    "submission_id": "sub_456def",
    "program_id": "pgm_789ghi",
    "researcher_id": "res_012jkl",
    "severity": "critical",
    "title": "SQL Injection in Login Form",
    "status": "accepted"
  },
  "retry_count": 0,
  "sequence_number": 42
}
```

---

## HMAC Signature Validation

**⚠️ CONFLICT DETECTED:** Two signature formats found in research. Implement both as fallback.

### Format 1: X-Bugcrowd-Digest (With Timestamp)

```
Header: X-Bugcrowd-Digest
Format: timestamp={unix_timestamp};sha256={hash}
Payload: raw_body + "." + timestamp
```

**Implementation:**

```typescript
function verifyDigestSignature(rawBody: string, digestHeader: string, secret: string): boolean {
  const [timestampPart, hashPart] = digestHeader.split(";");
  const [, timestamp] = timestampPart.split("=");
  const [, providedHash] = hashPart.split("=");

  // Reconstruct signed payload
  const payload = rawBody + "." + timestamp;

  // Compute expected hash
  const expectedHash = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  // Constant-time comparison
  return crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(providedHash));
}
```

### Format 2: X-Bugcrowd-Signature (Standard HMAC)

```
Header: X-Bugcrowd-Signature
Format: sha256={hex_encoded_signature}
Payload: raw_body
```

**Implementation:**

```typescript
function verifyStandardSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  const [algorithm, providedSignature] = signatureHeader.split("=");

  if (algorithm !== "sha256") {
    throw new Error("Unsupported signature algorithm");
  }

  const expectedSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  // Constant-time comparison
  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(providedSignature));
}
```

### Universal Verification (Supports Both Formats)

```typescript
function verifyBugcrowdWebhook(
  rawBody: string,
  headers: Record<string, string>,
  secret: string
): { isValid: boolean; format?: string } {
  // Try X-Bugcrowd-Digest format first
  if (headers["x-bugcrowd-digest"]) {
    const isValid = verifyDigestSignature(rawBody, headers["x-bugcrowd-digest"], secret);
    return { isValid, format: "digest" };
  }

  // Fallback to X-Bugcrowd-Signature format
  if (headers["x-bugcrowd-signature"]) {
    const isValid = verifyStandardSignature(rawBody, headers["x-bugcrowd-signature"], secret);
    return { isValid, format: "signature" };
  }

  return { isValid: false };
}
```

---

## Delivery Guarantees

### At-Least-Once Delivery

Bugcrowd webhooks use **at-least-once delivery**, meaning:

- Same event may be delivered multiple times
- Duplicates occur due to network issues, timeout, system crashes

**Idempotency Required:** Your webhook handler MUST be idempotent.

### Ordering Guarantees

Events for the same resource maintain order via `sequence_number`:

```
submission:sub_123 events:
  sequence_number: 1 (submission.created)
  sequence_number: 2 (submission.updated)
  sequence_number: 3 (submission.accepted)
```

**Out-of-order detection:**

```typescript
async function validateSequence(resourceKey: string, newSequenceNumber: number): Promise<boolean> {
  const lastSequence = await db.getLastSequence(resourceKey);

  if (lastSequence !== null && newSequenceNumber <= lastSequence) {
    logger.warn("Out-of-order event received", {
      resourceKey,
      expected: `> ${lastSequence}`,
      received: newSequenceNumber,
    });
    return false; // Reject out-of-order event
  }

  return true;
}
```

---

## Idempotency Implementation

### Event ID Tracking

```typescript
interface IdempotencyStore {
  hasBeenProcessed(eventId: string): Promise<boolean>;
  recordProcessed(eventId: string, timestamp: string): Promise<void>;
  getLastSequence(resourceKey: string): Promise<number | null>;
  updateSequence(resourceKey: string, sequence: number): Promise<void>;
}

// DynamoDB implementation (recommended for Chariot/AWS)
class DynamoDBIdempotencyStore implements IdempotencyStore {
  private tableName = "bugcrowd-webhook-events";

  async hasBeenProcessed(eventId: string): Promise<boolean> {
    const result = await dynamodb.getItem({
      TableName: this.tableName,
      Key: { event_id: { S: eventId } },
    });
    return !!result.Item;
  }

  async recordProcessed(eventId: string, timestamp: string): Promise<void> {
    await dynamodb.putItem({
      TableName: this.tableName,
      Item: {
        event_id: { S: eventId },
        processed_at: { S: timestamp },
        ttl: { N: String(Math.floor(Date.now() / 1000) + 48 * 3600) }, // 48-hour TTL
      },
    });
  }

  // ... sequence tracking methods
}
```

---

## Replay Attack Prevention

### Timestamp Validation

```typescript
const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000; // 5 minutes
const CLOCK_SKEW_MS = 30 * 1000; // 30 seconds tolerance

function validateTimestamp(webhookTimestamp: string): {
  isValid: boolean;
  reason?: string;
} {
  const eventTime = new Date(webhookTimestamp).getTime();
  const now = Date.now();
  const age = now - eventTime;

  if (age > MAX_WEBHOOK_AGE_MS + CLOCK_SKEW_MS) {
    return {
      isValid: false,
      reason: `Webhook too old: ${age}ms > ${MAX_WEBHOOK_AGE_MS}ms`,
    };
  }

  if (age < -CLOCK_SKEW_MS) {
    return {
      isValid: false,
      reason: "Webhook timestamp in future (clock skew exceeded)",
    };
  }

  return { isValid: true };
}
```

---

## Async Processing Pattern (Recommended)

**Problem:** Webhook processing may take >30 seconds (Bugcrowd timeout)

**Solution:** Accept immediately, process asynchronously

```typescript
import { Queue } from "bullmq";

const webhookQueue = new Queue("bugcrowd-webhooks", {
  connection: { host: "localhost", port: 6379 },
});

// Express webhook endpoint
app.post("/webhooks/bugcrowd", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    // 1. Verify signature (FAST)
    const verification = verifyBugcrowdWebhook(
      req.body.toString(),
      req.headers,
      process.env.WEBHOOK_SECRET!
    );

    if (!verification.isValid) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    // 2. Parse and validate (FAST)
    const event = JSON.parse(req.body.toString());
    const timestampValidation = validateTimestamp(event.timestamp);

    if (!timestampValidation.isValid) {
      return res.status(400).json({ error: "Invalid timestamp" });
    }

    // 3. Enqueue for async processing (FAST)
    await webhookQueue.add(event.event_type, event, {
      jobId: event.id, // Idempotency at queue level
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
    });

    // 4. Acknowledge immediately (within 30s timeout)
    return res.status(202).json({
      received: true,
      eventId: event.id,
      retryCount: event.retry_count,
    });
  } catch (error) {
    logger.error("Webhook processing error", { error });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Worker processes queue
webhookQueue.process(async (job) => {
  const event = job.data;

  // Check idempotency
  const isProcessed = await idempotencyStore.hasBeenProcessed(event.id);
  if (isProcessed) {
    return { cached: true };
  }

  // Process event (can take minutes)
  await handleBugcrowdEvent(event);

  // Record processing
  await idempotencyStore.recordProcessed(event.id, event.timestamp);

  return { processed: true };
});
```

---

## Event Handler Registry Pattern

```typescript
type EventHandler<T = unknown> = (data: T) => Promise<void>;

class BugcrowdEventRegistry {
  private handlers = new Map<string, EventHandler[]>();
  private errorHandlers: EventHandler[] = [];

  on(eventType: string, handler: EventHandler): this {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
    return this;
  }

  onError(handler: EventHandler): this {
    this.errorHandlers.push(handler);
    return this;
  }

  async emit(eventType: string, data: unknown): Promise<void> {
    const handlers = this.handlers.get(eventType) || [];

    for (const handler of handlers) {
      try {
        await handler(data);
      } catch (error) {
        // Execute error handlers
        for (const errorHandler of this.errorHandlers) {
          await errorHandler({ eventType, data, error });
        }
        throw error; // Re-throw for job queue retry
      }
    }
  }
}

// Register handlers for Bugcrowd events
const registry = new BugcrowdEventRegistry();

registry.on("submission.accepted", async (data: any) => {
  await chariotService.createRiskFromSubmission(data);
});

registry.on("submission.rejected", async (data: any) => {
  await chariotService.updateRiskStatus(data.submission_id, "rejected");
});

registry.on("reward.paid", async (data: any) => {
  await analyticsService.recordReward(data.researcher_id, data.amount);
});

registry.onError(async (errorContext: any) => {
  await monitoringService.logError({
    service: "bugcrowd-webhooks",
    eventType: errorContext.eventType,
    error: errorContext.error.message,
  });
});
```

---

## Testing Webhook Security

```typescript
describe("Bugcrowd Webhook Security", () => {
  it("should verify valid HMAC-SHA256 signature", () => {
    const secret = "test-secret";
    const body = JSON.stringify({ test: "data" });
    const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");

    const result = verifyStandardSignature(body, `sha256=${signature}`, secret);
    expect(result).toBe(true);
  });

  it("should reject tampered payloads", () => {
    const result = verifyStandardSignature(
      '{"test":"data"}',
      "sha256=invalid_signature",
      "test-secret"
    );
    expect(result).toBe(false);
  });

  it("should use constant-time comparison", () => {
    // Verify implementation uses crypto.timingSafeEqual
    const source = verifyStandardSignature.toString();
    expect(source).toContain("timingSafeEqual");
  });

  it("should reject old webhooks (replay protection)", () => {
    const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const result = validateTimestamp(oldTimestamp);
    expect(result.isValid).toBe(false);
  });
});
```

---

## Deployment Checklist

- [ ] Webhook endpoint deployed with HTTPS
- [ ] Webhook secret stored in secrets manager
- [ ] Signature verification implemented with constant-time comparison
- [ ] Timestamp validation enabled (±5 minute window)
- [ ] Idempotency store configured (DynamoDB/Redis)
- [ ] Async processing queue deployed (SQS/BullMQ)
- [ ] Event handlers registered for all event types
- [ ] Error handlers configured
- [ ] Monitoring and alerting set up
- [ ] Webhook endpoint registered in Bugcrowd console

---

## References

- [Bugcrowd API Webhooks Documentation](https://docs.bugcrowd.com/api/webhooks/)
- Research: context7-webhooks.md (983 lines)
- Research: perplexity-webhooks.md (318 lines)
