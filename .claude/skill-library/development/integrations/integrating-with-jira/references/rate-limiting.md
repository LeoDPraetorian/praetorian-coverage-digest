# Jira Rate Limiting Reference

**Rate limiting strategies with February 2026 points-based system migration.**

## Critical: February 2, 2026 Migration

Jira Cloud is transitioning from simple request limits to a **points-based consumption model**:

### Old Model (Pre-Feb 2026)

- Free tier: 100 requests/minute per app/user
- Enterprise: 3,000+ requests/minute
- Simple counting, easy to predict

### New Model (Feb 2026+)

- **Default quota**: 65,000 points/hour (shared across tenant)
- **Point costs**: Vary by operation complexity and data volume
- **Per-issue write limits**: 20 operations/2 seconds OR 100 operations/30 seconds
- **Bulk operations**: Exempted from per-issue limits

**Point Cost Examples** (estimates):

| Operation                  | Estimated Points |
| -------------------------- | ---------------- |
| Simple GET (`/myself`)     | 1-5              |
| Issue GET (`/issue/{key}`) | 5-10             |
| Search (100 results)       | 50-100           |
| Search (1000 results)      | 200-500          |
| Issue create               | 10-20            |
| Issue update               | 5-10             |
| Bulk edit (1000 issues)    | 100-500          |

**Note**: Atlassian hasn't published exact point costs. Monitor actual consumption after Feb 2026.

## Rate Limit Headers

Monitor these headers in **every** response:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1719936000  (Unix timestamp)
X-RateLimit-Resource: core
```

**Implementation**:

```typescript
interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  resource: string;
}

function parseRateLimitHeaders(response: Response): RateLimitInfo {
  return {
    limit: parseInt(response.headers.get("X-RateLimit-Limit") || "0", 10),
    remaining: parseInt(response.headers.get("X-RateLimit-Remaining") || "0", 10),
    resetTime: new Date(parseInt(response.headers.get("X-RateLimit-Reset") || "0", 10) * 1000),
    resource: response.headers.get("X-RateLimit-Resource") || "unknown",
  };
}
```

## Exponential Backoff with Jitter

**Required for 429 responses**:

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 5
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      // Use Retry-After header if present
      const retryAfter = parseInt(response.headers.get("Retry-After") || "60", 10);

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s...
      const baseDelay = Math.min(retryAfter * 1000, 2 ** attempt * 1000);

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 1000;
      const delay = baseDelay + jitter;

      console.warn(
        `Rate limited (attempt ${attempt + 1}/${maxRetries}), retrying after ${delay}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    return response;
  }

  throw new Error(`Max retries (${maxRetries}) exceeded`);
}
```

## Proactive Rate Limit Management

Don't wait for 429 errors. Monitor and throttle proactively:

```typescript
class RateLimitTracker {
  private remaining: number = Infinity;
  private resetTime: number = 0;
  private readonly SAFETY_MARGIN = 0.2; // Keep 20% buffer

  updateFromResponse(response: Response) {
    const info = parseRateLimitHeaders(response);
    this.remaining = info.remaining;
    this.resetTime = info.resetTime.getTime();
  }

  async waitIfNeeded() {
    const now = Date.now();

    // If we've used 80%+ of quota, wait until reset
    if (this.remaining < 20 && this.resetTime > now) {
      const waitTime = this.resetTime - now + 1000; // +1s buffer
      console.log(`Approaching rate limit, waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  canMakeRequest(estimatedPoints: number = 10): boolean {
    return this.remaining > estimatedPoints;
  }
}
```

## Rate Limit Optimization Strategies

### 1. Field Limiting (70-90% payload reduction)

Request only needed fields to reduce point costs:

```typescript
// Heavy request (high points)
const heavy = await fetch(`${baseUrl}/rest/api/3/search?jql=${jql}`);

// Optimized request (lower points)
const optimized = await fetch(
  `${baseUrl}/rest/api/3/search?` +
    `jql=${encodeURIComponent(jql)}&` +
    `fields=key,summary,status&` +
    `maxResults=1000`
);
```

### 2. Use Bulk APIs (Exempt from per-issue limits)

```typescript
// Individual updates: 20 ops/2s limit applies
for (const key of issueKeys) {
  await updateIssue(key, fields); // Limited
}

// Bulk update: NO per-issue limit
await fetch(`${baseUrl}/rest/api/3/issue/bulk`, {
  method: "PUT",
  body: JSON.stringify({
    issueUpdates: issueKeys.map((key) => ({ key, fields })),
  }),
});
```

### 3. Webhooks Instead of Polling (75% API call reduction)

```typescript
// Bad: Polling every 30 seconds
setInterval(async () => {
  const issues = await search("updated >= -30s");
  process(issues);
}, 30000);

// Good: Webhook-driven
app.post("/webhook", (req, res) => {
  process(req.body.issue);
  res.status(200).send("OK");
});
```

### 4. Caching for Stable Resources

```typescript
class JiraCache {
  private cache = new Map<string, { data: any; expires: number }>();

  // Cache project metadata for 1 hour
  async getProjects(): Promise<Project[]> {
    return this.getOrFetch("projects", () => fetchProjects(), 3600000);
  }

  // Cache custom fields for 24 hours
  async getFields(): Promise<Field[]> {
    return this.getOrFetch("fields", () => fetchFields(), 86400000);
  }

  private async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const data = await fetcher();
    this.cache.set(key, { data, expires: Date.now() + ttl });
    return data;
  }
}
```

### 5. Request Batching

Combine multiple requests where possible:

```typescript
// Bad: 10 separate requests
const issues = await Promise.all(issueKeys.map((key) => getIssue(key)));

// Good: Single request with JQL
const issues = await search(`key IN (${issueKeys.join(",")})`);
```

## Rate Limits by Edition

| Edition                   | Request Limit | Point Quota (Feb 2026) |
| ------------------------- | ------------- | ---------------------- |
| **Jira Cloud Free**       | 100 req/min   | 65,000 pts/hour        |
| **Jira Cloud Standard**   | 1,000 req/min | 100,000 pts/hour       |
| **Jira Cloud Premium**    | 3,000 req/min | 250,000+ pts/hour      |
| **Jira Cloud Enterprise** | Custom        | Custom                 |
| **Jira Server**           | Configurable  | N/A                    |
| **Jira Data Center**      | Configurable  | N/A                    |

## Monitoring and Alerting

```typescript
class RateLimitMonitor {
  private history: RateLimitInfo[] = [];

  record(info: RateLimitInfo) {
    this.history.push(info);
    this.checkThresholds(info);
  }

  private checkThresholds(info: RateLimitInfo) {
    const usagePercent = ((info.limit - info.remaining) / info.limit) * 100;

    if (usagePercent >= 80) {
      console.error(`CRITICAL: Rate limit at ${usagePercent}%`);
      // Alert operations team
    } else if (usagePercent >= 60) {
      console.warn(`WARNING: Rate limit at ${usagePercent}%`);
    }
  }

  getStats() {
    return {
      requestsLast5Min: this.history.filter((h) => Date.now() - h.resetTime.getTime() < 300000)
        .length,
      averageRemaining: this.history.reduce((a, b) => a + b.remaining, 0) / this.history.length,
    };
  }
}
```

## Common Pitfalls

| Pitfall                | Cause                       | Solution                     |
| ---------------------- | --------------------------- | ---------------------------- |
| Thundering herd        | All retries at same time    | Add random jitter to backoff |
| Quota exhaustion       | Not tracking remaining      | Monitor headers proactively  |
| Per-issue limit hit    | Too many individual updates | Use bulk APIs                |
| Unexpected 429s        | Shared tenant quota         | Coordinate with other apps   |
| Point estimation wrong | Unknown point costs         | Monitor actual consumption   |
