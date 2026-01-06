# GitHub Webhooks Security and Processing

**Source**: GitHub REST API Documentation, Octokit.js Library Documentation (via Context7)
**Research Date**: 2026-01-03
**Context7 Library IDs**: `/websites/github_en_rest`, `/octokit/octokit.js`

---

## Executive Summary

GitHub webhooks provide a mechanism for real-time event notifications from GitHub to external systems. The webhook system includes comprehensive security features centered on HMAC-based signature verification, configurable delivery options, automatic retry logic, and extensive delivery tracking capabilities.

**Key Security Components**:

- **HMAC SHA-256 Signature Verification** via `X-Hub-Signature-256` header (and legacy SHA-1 via `X-Hub-Signature`)
- **Secret-based payload signing** to prevent tampering and verify authenticity
- **SSL/TLS verification** (strongly recommended, configurable via `insecure_ssl`)
- **Delivery tracking and redelivery** mechanisms for reliability

**Implementation Options**:

- **Server-based**: Using Node.js HTTP server with Octokit.js middleware
- **Serverless**: Manual verification using `verifyAndReceive()` method
- **Multiple scopes**: Repository, Organization, and GitHub App level webhooks

---

## Key Findings

### 1. Webhook Configuration and Security Setup

GitHub webhooks require configuration at three possible scopes:

| Scope            | Endpoint Pattern                               | Authentication Required                                                 |
| ---------------- | ---------------------------------------------- | ----------------------------------------------------------------------- |
| **Repository**   | `/repos/{owner}/{repo}/hooks/{hook_id}/config` | Repository admin or fine-grained token with `Webhooks` write permission |
| **Organization** | `/orgs/{org}/hooks/{hook_id}/config`           | Organization owner with `admin:org_hook` scope                          |
| **GitHub App**   | `/app/hook/config`                             | JWT (JSON Web Token)                                                    |

**Configuration Parameters**:

```typescript
interface WebhookConfig {
  url: string; // Required: Delivery endpoint URL
  content_type: string; // Optional: 'json' or 'form' (default: 'form')
  secret: string; // Optional but CRITICAL: HMAC signing key
  insecure_ssl: string | number; // Optional: '0' (verify, default) or '1' (skip verification)
}
```

**Security Best Practice**: Always provide a `secret` and keep `insecure_ssl` set to `'0'` (enabled SSL verification). The GitHub documentation explicitly warns:

> "We strongly recommend not setting this to `1` as you are subject to man-in-the-middle and other attacks."

---

### 2. HMAC Signature Verification Process

**Headers Provided by GitHub**:

```typescript
interface WebhookHeaders {
  "X-GitHub-Delivery": string; // Unique delivery ID (GUID)
  "X-GitHub-Event": string; // Event type (e.g., 'push', 'issues', 'pull_request')
  "X-GitHub-Hook-ID": string; // Hook identifier
  "X-Hub-Signature": string; // HMAC SHA-1 signature (legacy, still sent)
  "X-Hub-Signature-256": string; // HMAC SHA-256 signature (recommended)
  "X-GitHub-Hook-Installation-Target-ID": string; // Installation/repo ID
  "X-GitHub-Hook-Installation-Target-Type": string; // 'repository' or 'organization'
  "Content-Type": string; // Payload content type
  "User-Agent": string; // GitHub-Hookshot/{version}
}
```

**Signature Format**:

- **SHA-1** (legacy): `X-Hub-Signature: sha1={hex_digest}`
- **SHA-256** (recommended): `X-Hub-Signature-256: sha256={hex_digest}`

**HMAC Generation**:

```
HMAC_HEX_DIGEST = HMAC-SHA256(webhook_secret, raw_request_body)
Expected_Header = "sha256=" + HMAC_HEX_DIGEST
```

**Verification Algorithm**:

1. Extract `X-Hub-Signature-256` header from request
2. Read raw request body as bytes (before parsing JSON)
3. Compute HMAC SHA-256 using configured `secret` as key and raw body as message
4. Compare computed signature with header value using **constant-time comparison** to prevent timing attacks
5. Reject request if signatures don't match

**Example Verification (Node.js)**:

```javascript
import crypto from "crypto";

function verifyWebhookSignature(secret, body, signature) {
  const expectedSignature =
    "sha256=" + crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");

  // Use timingSafeEqual to prevent timing attacks
  const expectedBuffer = Buffer.from(expectedSignature);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}
```

---

### 3. Webhook Event Types and Payloads

**Event Structure**:

```typescript
interface WebhookDelivery {
  id: number; // Delivery ID
  guid: string; // Unique GUID for tracking
  delivered_at: string; // ISO 8601 timestamp
  redelivery: boolean; // True if manually redelivered
  duration: number; // Delivery time in seconds
  status: string; // 'OK', 'failed', etc.
  status_code: number; // HTTP response code from endpoint
  event: string; // Event type (e.g., 'issues', 'push')
  action?: string; // Event action (e.g., 'opened', 'closed')
  installation_id?: number; // GitHub App installation ID
  repository_id?: number; // Repository ID
}
```

**Common Event Types**:

- `push` - Code pushed to repository
- `issues` - Issue created, edited, closed, reopened, etc.
- `pull_request` - PR opened, closed, merged, synchronized
- `pull_request_review` - PR review submitted
- `release` - Release published
- `deployment` - Deployment created
- `workflow_run` - GitHub Actions workflow completed

**Event-Specific Actions**:
Each event type includes an `action` field that specifies the specific trigger:

```typescript
// Example: issues event
interface IssuesEvent {
  action:
    | "opened"
    | "edited"
    | "deleted"
    | "closed"
    | "reopened"
    | "assigned"
    | "unassigned"
    | "labeled"
    | "unlabeled";
  issue: Issue;
  repository: Repository;
  sender: User;
}
```

---

### 4. Event Processing Patterns

### Pattern A: Server-Based Processing with Octokit.js

**Full Stack Implementation**:

```javascript
import { createServer } from "node:http";
import { App, createNodeMiddleware } from "octokit";

const app = new App({
  appId: process.env.GITHUB_APP_ID,
  privateKey: process.env.GITHUB_PRIVATE_KEY,
  webhooks: {
    secret: process.env.WEBHOOK_SECRET,
  },
});

// Register event handlers
app.webhooks.on("issues.opened", async ({ octokit, payload }) => {
  console.log(`New issue #${payload.issue.number} in ${payload.repository.full_name}`);

  await octokit.rest.issues.createComment({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.issue.number,
    body: "Thanks for opening this issue! We'll review it shortly.",
  });
});

app.webhooks.on("pull_request.opened", async ({ octokit, payload }) => {
  console.log(`New PR #${payload.pull_request.number}`);

  await octokit.rest.issues.addLabels({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.pull_request.number,
    labels: ["needs-review"],
  });
});

// Create HTTP server with automatic signature verification
createServer(createNodeMiddleware(app)).listen(3000, () => {
  console.log("Webhook endpoint: http://localhost:3000/api/github/webhooks");
});
```

**Key Benefits**:

- **Automatic signature verification** via `createNodeMiddleware()`
- **Type-safe event handlers** with TypeScript support
- **Built-in GitHub API client** (`octokit`) for responding to events
- **Event routing** based on event type and action

---

### Pattern B: Serverless/Lambda Processing

**Manual Verification for AWS Lambda, Cloudflare Workers, etc.**:

```javascript
import { App } from "octokit";

const app = new App({
  appId: process.env.GITHUB_APP_ID,
  privateKey: process.env.GITHUB_PRIVATE_KEY,
  webhooks: {
    secret: process.env.WEBHOOK_SECRET,
  },
});

// Lambda/serverless handler
export async function handler(event) {
  const { headers, body } = event;

  try {
    await app.webhooks.verifyAndReceive({
      id: headers["x-github-delivery"],
      name: headers["x-github-event"],
      signature: headers["x-hub-signature-256"],
      payload: body,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Webhook processed" }),
    };
  } catch (error) {
    console.error("Webhook processing error:", error);

    if (error.message.includes("signature")) {
      return { statusCode: 401, body: "Invalid signature" };
    }

    return { statusCode: 500, body: "Internal error" };
  }
}
```

**Key Considerations for Serverless**:

- **Raw body required**: Must access raw request body before parsing
- **Cold start optimization**: Initialize `App` outside handler when possible
- **Async event processing**: Consider queuing events for async processing if handler has timeout limits
- **Error handling**: Return appropriate HTTP status codes for GitHub's retry logic

---

### 5. Idempotency and Replay Attack Prevention

**Idempotency Key**: `X-GitHub-Delivery` header provides a unique GUID for each delivery attempt:

```typescript
interface IdempotencyTracker {
  processWebhook(deliveryId: string, payload: object): Promise<void> {
    if (await this.isProcessed(deliveryId)) {
      console.log(`Duplicate delivery detected: ${deliveryId}`);
      return; // Idempotent: return success without reprocessing
    }

    await this.handleEvent(payload);
    await this.markProcessed(deliveryId);
  }
}
```

**Best Practices**:

1. **Store processed delivery IDs** in fast key-value store (Redis, DynamoDB)
2. **Set TTL** on stored IDs (GitHub retries for up to 3 days, store for 7 days for safety margin)
3. **Return 200 OK** for duplicate deliveries to prevent further retries
4. **Log duplicate deliveries** for monitoring and debugging

**Replay Attack Prevention**:

- **Signature verification** prevents payload tampering
- **HTTPS requirement** prevents man-in-the-middle attacks
- **Short-lived replay window**: Store delivery IDs for limited time
- **Timestamp validation** (optional): Reject deliveries with timestamps too far in past/future

---

### 6. Delivery Reliability and Retry Mechanisms

**Automatic Retry Behavior**:

GitHub automatically retries failed webhook deliveries:

| Response Code        | Retry Behavior                            |
| -------------------- | ----------------------------------------- |
| **2xx**              | Success, no retry                         |
| **3xx**              | Treated as failure, will retry            |
| **4xx** (except 410) | Will retry (treats as temporary failure)  |
| **410 Gone**         | Permanent failure, webhook may be deleted |
| **5xx**              | Will retry (server error)                 |
| **Timeout**          | Will retry                                |

**Retry Schedule**:

- Initial delivery attempt
- Retries over approximately **3 days**
- Exponential backoff between attempts
- Up to **several hundred attempts** for persistent failures

**Monitoring Delivery Status**:

```bash
# List recent deliveries
GET /repos/{owner}/{repo}/hooks/{hook_id}/deliveries?per_page=30

# Get specific delivery details
GET /repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}

# Manual redelivery
POST /repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}/attempts
```

**Best Practices for Reliability**:

1. **Respond quickly**: Return 2xx within 10 seconds to avoid timeout
2. **Queue long-running tasks**: Accept webhook, queue for async processing, return 2xx immediately
3. **Monitor delivery failures**: Set up alerts for repeated failures
4. **Handle retries idempotently**: Use delivery ID to prevent duplicate processing
5. **Log all deliveries**: Include delivery ID, event type, processing status

---

## Conflicts and Trade-offs

### 1. Synchronous vs Asynchronous Processing

**Conflict**: GitHub expects 2xx response quickly (within 10 seconds), but processing may take longer.

**Trade-off Options**:

| Approach          | Pros                       | Cons                                  |
| ----------------- | -------------------------- | ------------------------------------- |
| **Synchronous**   | Simple, immediate feedback | Timeout risk, blocks webhook delivery |
| **Queue + Async** | Fast response, scalable    | Complex, eventual consistency         |
| **Hybrid**        | Quick validation + queue   | Best of both, but more complexity     |

**Recommendation**: Use **queue + async** for production systems.

### 2. Secret Rotation

**Conflict**: Rotating webhook secrets requires updating both GitHub config and application config simultaneously.

**Recommended Pattern**:

```javascript
const WEBHOOK_SECRETS = [
  process.env.WEBHOOK_SECRET_CURRENT,
  process.env.WEBHOOK_SECRET_PREVIOUS, // Support old secret during rotation
];

function verifyWithMultipleSecrets(body, signature) {
  for (const secret of WEBHOOK_SECRETS) {
    if (verifyWebhookSignature(secret, body, signature)) {
      return true;
    }
  }
  return false;
}
```

### 3. Delivery ID Storage Duration

**Conflict**: Storing delivery IDs forever causes unbounded growth; storing too short risks replays.

**Recommendation**: **7 days** storage with TTL provides good balance:

- GitHub retries for ~3 days
- 2x safety margin for edge cases
- Automatic cleanup via TTL

---

## Anti-Patterns to Avoid

### ❌ Skipping Signature Verification

```javascript
// WRONG: Trust all incoming webhooks
app.post("/webhook", (req, res) => {
  processEvent(req.body); // NEVER DO THIS
  res.sendStatus(200);
});
```

**Impact**: Allows attackers to forge webhooks and trigger malicious actions.

---

### ❌ Using String Comparison for Signatures

```javascript
// WRONG: Vulnerable to timing attacks
if (computedSignature === headerSignature) {
  // Process webhook
}
```

**Impact**: Timing attacks can leak signature information byte-by-byte.

**Correct**:

```javascript
// RIGHT: Constant-time comparison
if (crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(headerSignature))) {
  // Process webhook
}
```

---

### ❌ Disabling SSL Verification

```json
{
  "url": "http://example.com/webhook",
  "insecure_ssl": "1"
}
```

**Impact**: Vulnerable to man-in-the-middle attacks.

---

### ❌ Not Implementing Idempotency

```javascript
// WRONG: Process every delivery without checking
app.webhooks.on("issues.opened", async ({ payload }) => {
  await createTicket(payload.issue); // May create duplicates on retry
});
```

**Impact**: GitHub's retry logic will cause duplicate processing.

---

### ❌ Blocking on Long-Running Tasks

```javascript
// WRONG: Synchronous long-running task
app.webhooks.on("push", async ({ payload }) => {
  await runTests(payload); // Takes 5 minutes
  await buildDocker(payload); // Takes 10 minutes
  res.sendStatus(200); // Timeout after 30 seconds!
});
```

**Impact**: GitHub times out, marks delivery as failed, retries indefinitely.

---

## Implementation Checklist

- [ ] Configure webhook with HTTPS endpoint URL
- [ ] Generate and configure webhook secret
- [ ] Implement HMAC SHA-256 signature verification with constant-time comparison
- [ ] Verify `insecure_ssl` is set to `'0'` (enabled)
- [ ] Extract `X-GitHub-Delivery` header for idempotency tracking
- [ ] Store processed delivery IDs with 7-day TTL
- [ ] Return 200 OK within 10 seconds for all valid webhooks
- [ ] Queue long-running tasks for async processing
- [ ] Log all webhook deliveries (success and failure)
- [ ] Validate payload schema for expected events
- [ ] Implement monitoring and alerting for delivery failures
- [ ] Set up secret rotation procedure with multi-secret support
- [ ] Document webhook event types and handlers for team
- [ ] Create runbook for webhook troubleshooting

---

## Sources

### Primary Sources

1. **GitHub REST API - Webhooks Documentation**
   - Context7 ID: `/websites/github_en_rest`
   - URL: https://docs.github.com/en/rest/webhooks

2. **Octokit.js - GitHub SDK**
   - Context7 ID: `/octokit/octokit.js`
   - GitHub: https://github.com/octokit/octokit.js

### Key Documentation Sections

- **Webhook Configuration**: `/repos/{owner}/{repo}/hooks/{hook_id}/config`
- **Signature Verification**: HMAC SHA-256 via `X-Hub-Signature-256` header
- **Delivery Management**: `/hooks/{hook_id}/deliveries`
- **Event Handling**: `app.webhooks.on(event, handler)`
