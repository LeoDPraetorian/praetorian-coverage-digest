# FeatureBase Webhooks API Documentation

## Overview

The FeatureBase Webhooks API allows you to receive real-time notifications when events occur in your FeatureBase organization, enabling your backend systems to react instantly to user feedback, status changes, and more. Webhooks support various event types including post votes, changelog publications, and comment activity.

**Base URL**: Webhook payloads are sent to your configured endpoint URL

**Authentication**: Webhook signature verification via HMAC-SHA256

**Webhook Events**: post.voted, post.created, post.updated, post.statusChanged, changelog.published, comment.created, comment.updated, comment.deleted

**Delivery Method**: HTTP POST with JSON payload

---

## Webhook Configuration

Webhooks are configured in the FeatureBase dashboard under Settings > Webhooks.

### Configuration Options

```typescript
interface WebhookConfig {
  url: string;                   // Your endpoint URL (HTTPS required)
  events: WebhookEvent[];        // Events to subscribe to
  secret: string;                // Secret key for signature verification
  enabled: boolean;              // Enable/disable webhook
  description?: string;          // Optional description
}

type WebhookEvent =
  | 'post.voted'
  | 'post.created'
  | 'post.updated'
  | 'post.statusChanged'
  | 'changelog.published'
  | 'comment.created'
  | 'comment.updated'
  | 'comment.deleted';
```

### Setup Steps

1. **Create Endpoint**: Set up an HTTPS endpoint in your backend to receive webhook payloads
2. **Configure in FeatureBase**: Add your endpoint URL in Settings > Webhooks
3. **Select Events**: Choose which events you want to receive
4. **Save Secret**: Store the webhook secret for signature verification
5. **Test**: Use the "Test Webhook" button to verify configuration

---

## Webhook Payload Structure

All webhook payloads follow a consistent structure:

```typescript
interface WebhookPayload<T = any> {
  event: WebhookEvent;           // Event type
  timestamp: string;             // ISO 8601 timestamp
  organizationId: string;        // Your organization ID
  data: T;                       // Event-specific payload
}
```

### Common Headers

All webhook requests include these headers:

```typescript
{
  'Content-Type': 'application/json',
  'X-FeatureBase-Signature': 'sha256=<signature>',
  'X-FeatureBase-Event': '<event-type>',
  'X-FeatureBase-Delivery': '<delivery-uuid>',
  'User-Agent': 'FeatureBase-Webhooks/1.0'
}
```

---

## Post Events

### post.voted

Triggered when a user votes on a post (upvote or downvote).

#### Payload Schema

```typescript
interface PostVotedPayload {
  event: 'post.voted';
  timestamp: string;
  organizationId: string;
  data: {
    action: 'add' | 'remove';    // Vote added or removed
    voteType: 'upvote' | 'downvote';
    post: {
      id: string;
      slug: string;
      title: string;
      status: string;
      upvotes: number;           // Updated upvote count
      downvotes: number;         // Updated downvote count
      score: number;             // Net score
    };
    user: {
      id: string;
      email: string;
      name?: string;
    };
  };
}
```

#### Example Payload

```json
{
  "event": "post.voted",
  "timestamp": "2026-01-17T14:30:00.000Z",
  "organizationId": "org_abc123",
  "data": {
    "action": "add",
    "voteType": "upvote",
    "post": {
      "id": "post_abc123",
      "slug": "dark-mode-support",
      "title": "Dark Mode Support",
      "status": "in-progress",
      "upvotes": 42,
      "downvotes": 2,
      "score": 40
    },
    "user": {
      "id": "user_xyz789",
      "email": "alice@example.com",
      "name": "Alice Johnson"
    }
  }
}
```

#### Handler Example

```typescript
const handlePostVoted = (payload: PostVotedPayload) => {
  const { action, voteType, post, user } = payload.data;

  console.log(`${user.name} ${action}ed ${voteType} on "${post.title}"`);
  console.log(`New score: ${post.score} (${post.upvotes} upvotes, ${post.downvotes} downvotes)`);

  // Update your database
  // Send notifications
  // Update analytics
};
```

### post.created

Triggered when a new post is created.

#### Payload Schema

```typescript
interface PostCreatedPayload {
  event: 'post.created';
  timestamp: string;
  organizationId: string;
  data: {
    post: {
      id: string;
      slug: string;
      title: string;
      content: string;
      status: string;
      categoryId: string;
      createdAt: string;
      upvotes: number;
      tags: string[];
    };
    author: {
      id: string;
      email: string;
      name?: string;
    };
  };
}
```

#### Example Payload

```json
{
  "event": "post.created",
  "timestamp": "2026-01-17T14:30:00.000Z",
  "organizationId": "org_abc123",
  "data": {
    "post": {
      "id": "post_new123",
      "slug": "api-rate-limiting",
      "title": "API Rate Limiting",
      "content": "We need configurable rate limits for the API...",
      "status": "under-review",
      "categoryId": "category_features",
      "createdAt": "2026-01-17T14:30:00.000Z",
      "upvotes": 1,
      "tags": ["api", "performance"]
    },
    "author": {
      "id": "user_xyz789",
      "email": "alice@example.com",
      "name": "Alice Johnson"
    }
  }
}
```

### post.statusChanged

Triggered when a post's status is changed (e.g., from "under-review" to "in-progress").

#### Payload Schema

```typescript
interface PostStatusChangedPayload {
  event: 'post.statusChanged';
  timestamp: string;
  organizationId: string;
  data: {
    post: {
      id: string;
      slug: string;
      title: string;
    };
    previousStatus: string;
    newStatus: string;
    changedBy: {
      id: string;
      email: string;
      name?: string;
    };
  };
}
```

#### Example Payload

```json
{
  "event": "post.statusChanged",
  "timestamp": "2026-01-17T15:00:00.000Z",
  "organizationId": "org_abc123",
  "data": {
    "post": {
      "id": "post_abc123",
      "slug": "dark-mode-support",
      "title": "Dark Mode Support"
    },
    "previousStatus": "under-review",
    "newStatus": "in-progress",
    "changedBy": {
      "id": "admin_123",
      "email": "admin@example.com",
      "name": "Admin User"
    }
  }
}
```

---

## Changelog Events

### changelog.published

Triggered when a new changelog entry is published.

#### Payload Schema

```typescript
interface ChangelogPublishedPayload {
  event: 'changelog.published';
  timestamp: string;
  organizationId: string;
  data: {
    changelog: {
      id: string;
      title: string;
      content: string;
      publishedAt: string;
      tags: string[];
    };
    author: {
      id: string;
      email: string;
      name?: string;
    };
  };
}
```

#### Example Payload

```json
{
  "event": "changelog.published",
  "timestamp": "2026-01-17T16:00:00.000Z",
  "organizationId": "org_abc123",
  "data": {
    "changelog": {
      "id": "changelog_xyz789",
      "title": "Version 2.5 Released",
      "content": "We've released version 2.5 with dark mode support and performance improvements...",
      "publishedAt": "2026-01-17T16:00:00.000Z",
      "tags": ["release", "feature", "performance"]
    },
    "author": {
      "id": "admin_123",
      "email": "admin@example.com",
      "name": "Product Team"
    }
  }
}
```

#### Handler Example

```typescript
const handleChangelogPublished = async (payload: ChangelogPublishedPayload) => {
  const { changelog, author } = payload.data;

  console.log(`New changelog published: ${changelog.title}`);

  // Send email notifications to subscribers
  await sendChangelogEmail(changelog);

  // Post to Slack
  await postToSlack({
    channel: '#product-updates',
    text: `📢 New changelog: ${changelog.title}`,
    url: `https://feedback.yourapp.com/changelog/${changelog.id}`
  });

  // Update RSS feed
  await updateRSSFeed(changelog);
};
```

---

## Comment Events

### comment.created

Triggered when a new comment is created on a post or changelog.

#### Payload Schema

```typescript
interface CommentCreatedPayload {
  event: 'comment.created';
  timestamp: string;
  organizationId: string;
  data: {
    comment: {
      id: string;
      content: string;
      submissionId?: string;     // If comment on post
      changelogId?: string;      // If comment on changelog
      parentCommentId?: string;  // If reply to another comment
      isPrivate: boolean;
      createdAt: string;
    };
    author: {
      id: string;
      email: string;
      name?: string;
    };
    post?: {                     // Included if comment on post
      id: string;
      slug: string;
      title: string;
    };
    changelog?: {                // Included if comment on changelog
      id: string;
      title: string;
    };
  };
}
```

#### Example Payload - Post Comment

```json
{
  "event": "comment.created",
  "timestamp": "2026-01-17T17:00:00.000Z",
  "organizationId": "org_abc123",
  "data": {
    "comment": {
      "id": "comment_abc123",
      "content": "Great feature! When will this be available?",
      "submissionId": "post_abc123",
      "parentCommentId": null,
      "isPrivate": false,
      "createdAt": "2026-01-17T17:00:00.000Z"
    },
    "author": {
      "id": "user_xyz789",
      "email": "alice@example.com",
      "name": "Alice Johnson"
    },
    "post": {
      "id": "post_abc123",
      "slug": "dark-mode-support",
      "title": "Dark Mode Support"
    }
  }
}
```

#### Example Payload - Reply Comment

```json
{
  "event": "comment.created",
  "timestamp": "2026-01-17T17:05:00.000Z",
  "organizationId": "org_abc123",
  "data": {
    "comment": {
      "id": "comment_def456",
      "content": "Coming in Q1 2026!",
      "submissionId": "post_abc123",
      "parentCommentId": "comment_abc123",
      "isPrivate": false,
      "createdAt": "2026-01-17T17:05:00.000Z"
    },
    "author": {
      "id": "admin_123",
      "email": "admin@example.com",
      "name": "Product Team"
    },
    "post": {
      "id": "post_abc123",
      "slug": "dark-mode-support",
      "title": "Dark Mode Support"
    }
  }
}
```

### comment.updated

Triggered when a comment is updated (content changed, pinned, etc.).

#### Payload Schema

```typescript
interface CommentUpdatedPayload {
  event: 'comment.updated';
  timestamp: string;
  organizationId: string;
  data: {
    comment: {
      id: string;
      content: string;
      isPinned: boolean;
      isPrivate: boolean;
      updatedAt: string;
    };
    changes: {
      content?: boolean;         // True if content changed
      pinned?: boolean;          // True if pin status changed
      privacy?: boolean;         // True if privacy changed
    };
    updatedBy: {
      id: string;
      email: string;
      name?: string;
    };
  };
}
```

#### Example Payload

```json
{
  "event": "comment.updated",
  "timestamp": "2026-01-17T17:10:00.000Z",
  "organizationId": "org_abc123",
  "data": {
    "comment": {
      "id": "comment_abc123",
      "content": "Great feature! When will this be available? (Updated)",
      "isPinned": true,
      "isPrivate": false,
      "updatedAt": "2026-01-17T17:10:00.000Z"
    },
    "changes": {
      "content": true,
      "pinned": true,
      "privacy": false
    },
    "updatedBy": {
      "id": "admin_123",
      "email": "admin@example.com",
      "name": "Admin User"
    }
  }
}
```

### comment.deleted

Triggered when a comment is deleted.

#### Payload Schema

```typescript
interface CommentDeletedPayload {
  event: 'comment.deleted';
  timestamp: string;
  organizationId: string;
  data: {
    comment: {
      id: string;
      submissionId?: string;
      changelogId?: string;
      parentCommentId?: string;
    };
    deletionType: 'soft' | 'hard';  // Soft if has replies, hard if not
    deletedBy: {
      id: string;
      email: string;
      name?: string;
    };
  };
}
```

#### Example Payload

```json
{
  "event": "comment.deleted",
  "timestamp": "2026-01-17T17:15:00.000Z",
  "organizationId": "org_abc123",
  "data": {
    "comment": {
      "id": "comment_abc123",
      "submissionId": "post_abc123",
      "parentCommentId": null
    },
    "deletionType": "soft",
    "deletedBy": {
      "id": "admin_123",
      "email": "admin@example.com",
      "name": "Admin User"
    }
  }
}
```

---

## Security & Verification

### Webhook Signature Verification

All webhook requests include an `X-FeatureBase-Signature` header containing an HMAC-SHA256 signature of the payload. **Always verify this signature** to ensure the webhook came from FeatureBase.

#### Signature Algorithm

```
signature = HMAC-SHA256(payload_body, webhook_secret)
header_value = "sha256=" + hex(signature)
```

#### Verification Example (Node.js)

```typescript
import crypto from 'crypto';

const verifyWebhookSignature = (
  payload: string,
  signature: string,
  secret: string
): boolean => {
  // Extract signature from header (format: "sha256=<hex>")
  const signatureHash = signature.replace('sha256=', '');

  // Compute expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signatureHash),
    Buffer.from(expectedSignature)
  );
};

// Usage in webhook handler
app.post('/webhooks/featurebase', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-featurebase-signature'] as string;
  const payload = req.body.toString('utf8');
  const secret = process.env.FEATUREBASE_WEBHOOK_SECRET!;

  if (!verifyWebhookSignature(payload, signature, secret)) {
    console.error('Invalid webhook signature');
    return res.status(401).send('Invalid signature');
  }

  // Signature verified - process webhook
  const event = JSON.parse(payload);
  handleWebhook(event);

  res.status(200).send('OK');
});
```

#### Verification Example (Python)

```python
import hmac
import hashlib

def verify_webhook_signature(payload: str, signature: str, secret: str) -> bool:
    # Extract signature from header (format: "sha256=<hex>")
    signature_hash = signature.replace('sha256=', '')

    # Compute expected signature
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    # Constant-time comparison
    return hmac.compare_digest(signature_hash, expected_signature)

# Usage in Flask webhook handler
@app.route('/webhooks/featurebase', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-FeatureBase-Signature')
    payload = request.get_data(as_text=True)
    secret = os.environ['FEATUREBASE_WEBHOOK_SECRET']

    if not verify_webhook_signature(payload, signature, secret):
        return 'Invalid signature', 401

    # Signature verified - process webhook
    event = json.loads(payload)
    handle_webhook_event(event)

    return 'OK', 200
```

### Security Best Practices

1. **Always Verify Signatures**: Never process webhooks without verifying the signature
2. **Use HTTPS Only**: FeatureBase only delivers to HTTPS endpoints
3. **Validate Event Types**: Check that the event type is expected
4. **Idempotency**: Handle duplicate webhook deliveries (use `X-FeatureBase-Delivery` ID)
5. **Rate Limiting**: Implement rate limiting on your webhook endpoint
6. **Secret Rotation**: Rotate webhook secrets periodically

---

## Webhook Handler Implementation

### Complete Express.js Example

```typescript
import express from 'express';
import crypto from 'crypto';

const app = express();

// Webhook endpoint (use raw body for signature verification)
app.post(
  '/webhooks/featurebase',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      // 1. Verify signature
      const signature = req.headers['x-featurebase-signature'] as string;
      const payload = req.body.toString('utf8');
      const secret = process.env.FEATUREBASE_WEBHOOK_SECRET!;

      if (!verifyWebhookSignature(payload, signature, secret)) {
        console.error('Invalid webhook signature');
        return res.status(401).send('Invalid signature');
      }

      // 2. Parse event
      const event = JSON.parse(payload) as WebhookPayload;
      const deliveryId = req.headers['x-featurebase-delivery'] as string;

      // 3. Check idempotency (prevent duplicate processing)
      if (await isWebhookProcessed(deliveryId)) {
        console.log(`Webhook ${deliveryId} already processed`);
        return res.status(200).send('OK');
      }

      // 4. Route to appropriate handler
      await routeWebhook(event);

      // 5. Mark as processed
      await markWebhookProcessed(deliveryId);

      // 6. Respond quickly (process async if needed)
      res.status(200).send('OK');
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).send('Internal server error');
    }
  }
);

const routeWebhook = async (event: WebhookPayload) => {
  console.log(`Processing webhook: ${event.event}`);

  switch (event.event) {
    case 'post.voted':
      await handlePostVoted(event as PostVotedPayload);
      break;

    case 'post.created':
      await handlePostCreated(event as PostCreatedPayload);
      break;

    case 'post.statusChanged':
      await handlePostStatusChanged(event as PostStatusChangedPayload);
      break;

    case 'changelog.published':
      await handleChangelogPublished(event as ChangelogPublishedPayload);
      break;

    case 'comment.created':
      await handleCommentCreated(event as CommentCreatedPayload);
      break;

    case 'comment.updated':
      await handleCommentUpdated(event as CommentUpdatedPayload);
      break;

    case 'comment.deleted':
      await handleCommentDeleted(event as CommentDeletedPayload);
      break;

    default:
      console.warn(`Unhandled webhook event: ${event.event}`);
  }
};

// Idempotency helpers
const processedWebhooks = new Set<string>();

const isWebhookProcessed = async (deliveryId: string): Promise<boolean> => {
  // In production, check database or Redis
  return processedWebhooks.has(deliveryId);
};

const markWebhookProcessed = async (deliveryId: string): Promise<void> => {
  // In production, store in database or Redis with TTL (24-48 hours)
  processedWebhooks.add(deliveryId);
};

app.listen(3000, () => {
  console.log('Webhook server listening on port 3000');
});
```

### Complete Flask Example (Python)

```python
from flask import Flask, request, jsonify
import hmac
import hashlib
import json
import os

app = Flask(__name__)

# In-memory store (use Redis in production)
processed_webhooks = set()

def verify_signature(payload: str, signature: str, secret: str) -> bool:
    signature_hash = signature.replace('sha256=', '')
    expected = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature_hash, expected)

@app.route('/webhooks/featurebase', methods=['POST'])
def handle_webhook():
    try:
        # 1. Verify signature
        signature = request.headers.get('X-FeatureBase-Signature')
        payload = request.get_data(as_text=True)
        secret = os.environ['FEATUREBASE_WEBHOOK_SECRET']

        if not verify_signature(payload, signature, secret):
            return 'Invalid signature', 401

        # 2. Parse event
        event = json.loads(payload)
        delivery_id = request.headers.get('X-FeatureBase-Delivery')

        # 3. Check idempotency
        if delivery_id in processed_webhooks:
            return 'OK', 200

        # 4. Route webhook
        route_webhook(event)

        # 5. Mark processed
        processed_webhooks.add(delivery_id)

        return 'OK', 200

    except Exception as e:
        print(f'Webhook error: {e}')
        return 'Internal server error', 500

def route_webhook(event):
    event_type = event['event']
    print(f'Processing webhook: {event_type}')

    if event_type == 'post.voted':
        handle_post_voted(event)
    elif event_type == 'changelog.published':
        handle_changelog_published(event)
    elif event_type == 'comment.created':
        handle_comment_created(event)
    # ... other handlers

def handle_post_voted(event):
    data = event['data']
    print(f"Vote {data['action']}: {data['post']['title']}")
    # Your logic here

if __name__ == '__main__':
    app.run(port=3000)
```

---

## Retry & Delivery Behavior

### Delivery Mechanism

- **Timeout**: 30 seconds per delivery attempt
- **Retries**: Up to 3 attempts with exponential backoff
- **Retry Schedule**: 1 minute, 5 minutes, 15 minutes
- **Failure Threshold**: Webhook disabled after 10 consecutive failures

### Expected Response

Your webhook endpoint should:
- Respond with **200 OK** on success
- Respond within **30 seconds**
- Process webhooks asynchronously if needed (respond immediately, process later)

### Handling Failures

```typescript
// Bad - slow processing blocks response
app.post('/webhooks', async (req, res) => {
  await processWebhook(req.body);  // Takes 5 minutes
  res.send('OK');  // Timeout!
});

// Good - respond immediately, process async
app.post('/webhooks', async (req, res) => {
  const event = req.body;
  res.send('OK');  // Respond immediately

  // Process asynchronously
  setImmediate(() => processWebhook(event));
});
```

---

## Testing Webhooks

### Using FeatureBase Dashboard

1. Go to Settings > Webhooks
2. Click "Test Webhook" button
3. Select event type to test
4. Review delivery logs

### Local Development with ngrok

```bash
# Start ngrok tunnel
ngrok http 3000

# Copy HTTPS URL (e.g., https://abc123.ngrok.io)
# Add to FeatureBase webhook settings: https://abc123.ngrok.io/webhooks/featurebase

# Start your local server
npm start
```

### Manual Testing with curl

```bash
# Generate signature
SECRET="your-webhook-secret"
PAYLOAD='{"event":"post.voted","timestamp":"2026-01-17T14:30:00Z","organizationId":"org_test","data":{"action":"add","voteType":"upvote","post":{"id":"post_123","title":"Test"},"user":{"id":"user_123","email":"test@example.com"}}}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')

# Send test webhook
curl -X POST http://localhost:3000/webhooks/featurebase \
  -H "Content-Type: application/json" \
  -H "X-FeatureBase-Signature: sha256=$SIGNATURE" \
  -H "X-FeatureBase-Event: post.voted" \
  -H "X-FeatureBase-Delivery: test-delivery-123" \
  -d "$PAYLOAD"
```

---

## Best Practices

### 1. Respond Quickly

```typescript
// Process async, respond immediately
app.post('/webhooks', (req, res) => {
  res.send('OK');
  queue.add('process-webhook', req.body);  // Use job queue
});
```

### 2. Implement Idempotency

```typescript
// Store delivery IDs to prevent duplicate processing
const processed = await redis.get(`webhook:${deliveryId}`);
if (processed) return;

await processWebhook(event);
await redis.setex(`webhook:${deliveryId}`, 86400, 'true');  // 24h TTL
```

### 3. Log Everything

```typescript
console.log({
  event: event.event,
  deliveryId: req.headers['x-featurebase-delivery'],
  timestamp: event.timestamp,
  processed: true
});
```

### 4. Monitor Webhook Health

- Track delivery success rate
- Alert on consecutive failures
- Monitor processing time
- Log signature verification failures

### 5. Handle Errors Gracefully

```typescript
try {
  await processWebhook(event);
} catch (error) {
  console.error('Webhook processing error:', error);
  // Log to error tracking (Sentry, etc.)
  // Don't throw - still return 200 to prevent retries
}
```

---

## Summary

The FeatureBase Webhooks API provides:

**Event Types**:
- **Posts**: voted, created, updated, statusChanged
- **Changelog**: published
- **Comments**: created, updated, deleted

**Key Features**:
- Real-time event delivery via HTTP POST
- HMAC-SHA256 signature verification
- Automatic retries with exponential backoff
- Idempotency via delivery IDs
- Comprehensive event payloads

**Security**:
- HTTPS-only endpoints
- HMAC-SHA256 signature verification
- Secret rotation support
- Rate limiting recommendations

**Best Practices**:
- Always verify signatures
- Respond within 30 seconds
- Implement idempotency
- Process webhooks asynchronously
- Log all deliveries and errors
- Monitor webhook health

**Common Use Cases**:
- Send notifications (email, Slack, SMS)
- Update external databases
- Trigger automation workflows
- Sync data to other systems
- Track analytics and metrics
- Generate reports

**Sources**:
- [FeatureBase Webhooks Documentation](https://docs.featurebase.app/webhooks)
- [FeatureBase API Reference](https://docs.featurebase.app/)
