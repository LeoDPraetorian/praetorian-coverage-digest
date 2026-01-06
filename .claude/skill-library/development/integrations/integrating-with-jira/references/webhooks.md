# Jira Webhooks Reference

**Webhook configuration, event types, payloads, and reliability patterns.**

## Webhook Overview

Webhooks provide real-time notifications when events occur in Jira, reducing API polling by up to 75%.

**Limits**:

- **Connect apps**: 100 webhooks per tenant
- **OAuth apps**: 5 webhooks per user
- **Reliability**: Best-effort delivery (no guaranteed delivery)

## Event Types

### Issue Events

| Event                | Trigger             | Changelog |
| -------------------- | ------------------- | --------- |
| `jira:issue_created` | New issue created   | No        |
| `jira:issue_updated` | Issue field changed | Yes       |
| `jira:issue_deleted` | Issue deleted       | No        |

### Comment Events

| Event             | Trigger         |
| ----------------- | --------------- |
| `comment_created` | Comment added   |
| `comment_updated` | Comment edited  |
| `comment_deleted` | Comment removed |

### Worklog Events

| Event             | Trigger         |
| ----------------- | --------------- |
| `worklog_created` | Time logged     |
| `worklog_updated` | Worklog edited  |
| `worklog_deleted` | Worklog removed |

### Issue Link Events

| Event               | Trigger       |
| ------------------- | ------------- |
| `issuelink_created` | Issues linked |
| `issuelink_deleted` | Link removed  |

### Attachment Events

| Event                | Trigger            |
| -------------------- | ------------------ |
| `attachment_created` | File attached      |
| `attachment_deleted` | Attachment removed |

### Sprint Events (Jira Software)

| Event            | Trigger          |
| ---------------- | ---------------- |
| `sprint_created` | Sprint created   |
| `sprint_updated` | Sprint modified  |
| `sprint_started` | Sprint started   |
| `sprint_closed`  | Sprint completed |
| `sprint_deleted` | Sprint removed   |

### Board Events (Jira Software)

| Event                         | Trigger              |
| ----------------------------- | -------------------- |
| `board_created`               | Board created        |
| `board_updated`               | Board modified       |
| `board_deleted`               | Board removed        |
| `board_configuration_changed` | Board config updated |

### Project Events

| Event              | Trigger            |
| ------------------ | ------------------ |
| `project_created`  | Project created    |
| `project_updated`  | Project modified   |
| `project_deleted`  | Project removed    |
| `project_archived` | Project archived   |
| `project_restored` | Project unarchived |

### User Events

| Event          | Trigger       |
| -------------- | ------------- |
| `user_created` | User added    |
| `user_updated` | User modified |
| `user_deleted` | User removed  |

## Webhook Payload Structure

### Issue Updated Event

```json
{
  "timestamp": 1719936000000,
  "webhookEvent": "jira:issue_updated",
  "issue_event_type_name": "issue_updated",
  "user": {
    "accountId": "5b10a0effa615a0f1234",
    "emailAddress": "user@example.com",
    "displayName": "John Doe",
    "active": true
  },
  "issue": {
    "id": "10001",
    "key": "PROJ-123",
    "self": "https://your-domain.atlassian.net/rest/api/3/issue/10001",
    "fields": {
      "summary": "Issue summary",
      "description": { ... },
      "status": {
        "id": "3",
        "name": "In Progress",
        "statusCategory": { "key": "indeterminate", "name": "In Progress" }
      },
      "priority": { "id": "2", "name": "High" },
      "assignee": { "accountId": "...", "displayName": "Jane Doe" },
      "reporter": { "accountId": "...", "displayName": "John Doe" },
      "created": "2026-01-01T10:00:00.000+0000",
      "updated": "2026-01-04T15:30:00.000+0000",
      "project": { "id": "10000", "key": "PROJ", "name": "Project Name" },
      "issuetype": { "id": "10001", "name": "Bug" }
    }
  },
  "changelog": {
    "id": "10100",
    "items": [
      {
        "field": "status",
        "fieldtype": "jira",
        "fieldId": "status",
        "from": "1",
        "fromString": "Open",
        "to": "3",
        "toString": "In Progress"
      },
      {
        "field": "assignee",
        "fieldtype": "jira",
        "fieldId": "assignee",
        "from": null,
        "fromString": null,
        "to": "5b10a0effa615a0f5678",
        "toString": "Jane Doe"
      }
    ]
  }
}
```

### Issue Created Event

```json
{
  "timestamp": 1719936000000,
  "webhookEvent": "jira:issue_created",
  "issue_event_type_name": "issue_created",
  "user": { ... },
  "issue": { ... }
}
```

**Note**: `changelog` is not present for created events.

### Comment Created Event

```json
{
  "timestamp": 1719936000000,
  "webhookEvent": "comment_created",
  "comment": {
    "id": "10001",
    "self": "https://your-domain.atlassian.net/rest/api/3/issue/10001/comment/10001",
    "author": { "accountId": "...", "displayName": "John Doe" },
    "body": { "type": "doc", "version": 1, "content": [...] },
    "created": "2026-01-04T15:30:00.000+0000",
    "updated": "2026-01-04T15:30:00.000+0000"
  },
  "issue": { "id": "10001", "key": "PROJ-123" }
}
```

## Registering Webhooks

### Via REST API

```typescript
const webhook = await fetch(`${baseUrl}/rest/api/3/webhook`, {
  method: "POST",
  headers: {
    Authorization: auth,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "My Webhook",
    url: "https://your-app.com/webhook",
    events: ["jira:issue_created", "jira:issue_updated"],
    filters: {
      "issue-related-events-section": "project = PROJ",
    },
    excludeBody: false,
  }),
});
```

### Listing Webhooks

```typescript
const response = await fetch(`${baseUrl}/rest/api/3/webhook`, {
  headers: { Authorization: auth },
});

const webhooks = await response.json();
```

### Deleting Webhook

```typescript
await fetch(`${baseUrl}/rest/api/3/webhook/${webhookId}`, {
  method: "DELETE",
  headers: { Authorization: auth },
});
```

## Webhook Handler Implementation

### Express.js Handler

```typescript
import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json());

app.post("/webhook", (req, res) => {
  const event = req.body;

  // Acknowledge receipt immediately
  res.status(200).send("OK");

  // Process asynchronously
  processWebhook(event).catch(console.error);
});

async function processWebhook(event: any): Promise<void> {
  switch (event.webhookEvent) {
    case "jira:issue_created":
      await handleIssueCreated(event);
      break;
    case "jira:issue_updated":
      await handleIssueUpdated(event);
      break;
    case "comment_created":
      await handleCommentCreated(event);
      break;
    default:
      console.log("Unknown event:", event.webhookEvent);
  }
}

async function handleIssueUpdated(event: any): Promise<void> {
  const { issue, changelog, user } = event;

  // Check what changed
  const statusChange = changelog?.items?.find((item) => item.field === "status");
  if (statusChange) {
    console.log(
      `${issue.key} moved from ${statusChange.fromString} to ${statusChange.toString} by ${user.displayName}`
    );
  }
}
```

### Idempotent Processing

Webhooks may be delivered multiple times. Ensure idempotent handling:

```typescript
const processedEvents = new Set<string>();

async function processWebhook(event: any): Promise<void> {
  // Create unique event ID
  const eventId = `${event.webhookEvent}-${event.issue?.key}-${event.timestamp}`;

  if (processedEvents.has(eventId)) {
    console.log("Duplicate event, skipping:", eventId);
    return;
  }

  processedEvents.add(eventId);

  // Clean up old entries periodically
  if (processedEvents.size > 10000) {
    processedEvents.clear();
  }

  // Process event
  await handleEvent(event);
}
```

### Database-Based Deduplication

```typescript
async function processWebhook(event: any): Promise<void> {
  const eventId = `${event.webhookEvent}-${event.issue?.key}-${event.timestamp}`;

  // Try to insert event record
  try {
    await db.query("INSERT INTO processed_webhooks (event_id, processed_at) VALUES ($1, NOW())", [
      eventId,
    ]);
  } catch (error) {
    if (error.code === "23505") {
      // Unique violation
      console.log("Duplicate event:", eventId);
      return;
    }
    throw error;
  }

  await handleEvent(event);
}
```

## JQL Filtering

Filter which issues trigger webhooks using JQL:

```typescript
const webhook = await createWebhook({
  url: "https://your-app.com/webhook",
  events: ["jira:issue_updated"],
  filters: {
    "issue-related-events-section": "project = PROJ AND issuetype = Bug",
  },
});
```

**Common Filters**:

```jql
-- Only specific project
project = "PROJ"

-- Only bugs and tasks
issuetype IN ("Bug", "Task")

-- Only high priority
priority IN ("Highest", "High")

-- Exclude certain labels
labels NOT IN ("automated", "test")

-- Specific assignee
assignee = "user@example.com"

-- Multiple conditions
project = "PROJ" AND issuetype = "Bug" AND priority = "High"
```

## Webhook + Polling Hybrid

Combine webhooks for real-time updates with periodic polling for reliability:

```typescript
class JiraSync {
  private lastSync: Date = new Date();

  // Handle real-time webhook events
  async handleWebhook(event: any): Promise<void> {
    await this.processIssue(event.issue);
  }

  // Periodic reconciliation (every 15 minutes)
  async reconcile(): Promise<void> {
    const jql = `updated >= "${this.lastSync.toISOString()}"`;
    const issues = await searchIssues(jql);

    for (const issue of issues) {
      await this.processIssue(issue);
    }

    this.lastSync = new Date();
  }

  private async processIssue(issue: any): Promise<void> {
    // Sync issue to local database
    await db.upsert("issues", {
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status.name,
      updated: issue.fields.updated,
    });
  }
}

// Setup
const sync = new JiraSync();

// Webhook handler
app.post("/webhook", async (req, res) => {
  res.status(200).send("OK");
  await sync.handleWebhook(req.body);
});

// Periodic reconciliation
setInterval(() => sync.reconcile(), 15 * 60 * 1000);
```

## Reliability Considerations

### No Guaranteed Delivery

Jira webhooks are **best-effort**. Events can be lost due to:

- Network issues
- Your endpoint being unavailable
- Jira service disruptions

**Mitigation**: Always implement reconciliation polling.

### No Ordering Guarantees

Events may arrive out of order, especially during high activity.

**Mitigation**: Use timestamps to detect out-of-order events:

```typescript
const lastEventTimestamps = new Map<string, number>();

async function processEvent(event: any): Promise<void> {
  const issueKey = event.issue?.key;
  const timestamp = event.timestamp;

  if (issueKey) {
    const lastTimestamp = lastEventTimestamps.get(issueKey) || 0;

    if (timestamp < lastTimestamp) {
      console.log(`Out-of-order event for ${issueKey}, fetching fresh data`);
      const freshIssue = await getIssue(issueKey);
      await processIssue(freshIssue);
      return;
    }

    lastEventTimestamps.set(issueKey, timestamp);
  }

  await handleEvent(event);
}
```

### Webhook Disabling

Jira may disable webhooks if your endpoint consistently fails:

- Returns non-2xx status
- Times out (30 seconds)
- Connection refused

**Mitigation**:

- Monitor webhook health in Jira admin
- Return 200 immediately, process asynchronously
- Implement circuit breaker on your side

```typescript
// Quick acknowledgment
app.post("/webhook", (req, res) => {
  res.status(200).send("OK"); // Respond immediately

  // Queue for async processing
  eventQueue.push(req.body);
});

// Process queue
async function processQueue(): Promise<void> {
  while (eventQueue.length > 0) {
    const event = eventQueue.shift();
    try {
      await handleEvent(event);
    } catch (error) {
      console.error("Failed to process event:", error);
      // Optionally re-queue with backoff
    }
  }
}
```

## Security

### Validate Webhook Source

Verify webhooks come from Jira:

```typescript
function isValidJiraWebhook(req: Request): boolean {
  // Check User-Agent
  const userAgent = req.headers["user-agent"] || "";
  if (!userAgent.includes("Atlassian")) {
    return false;
  }

  // Check source IP (if known)
  const sourceIp = req.ip;
  const jiraIps = ["..."]; // Atlassian IP ranges
  if (!jiraIps.includes(sourceIp)) {
    return false;
  }

  return true;
}
```

### HMAC Signature Verification (Connect Apps)

Connect apps receive signed webhooks:

```typescript
function verifyWebhookSignature(req: Request, secret: string): boolean {
  const signature = req.headers["x-hub-signature-256"];
  if (!signature) return false;

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(JSON.stringify(req.body));
  const expectedSignature = `sha256=${hmac.digest("hex")}`;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
```

## Common Pitfalls

| Pitfall              | Cause                   | Solution                         |
| -------------------- | ----------------------- | -------------------------------- |
| Missing events       | No reconciliation       | Implement polling backup         |
| Duplicate processing | Webhook delivered twice | Track processed event IDs        |
| Timeout errors       | Synchronous processing  | Acknowledge, process async       |
| Webhook disabled     | Consistent failures     | Quick response, async processing |
| Wrong data           | Out-of-order events     | Check timestamps, fetch fresh    |
