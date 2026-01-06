# GitHub API Rate Limiting and Throttling Management

**Source**: GitHub REST API Official Documentation (via Context7)
**Research Date**: 2026-01-03
**Context7 Library ID**: `/websites/github_en_rest`

---

## Key Findings

### 1. Two-Tier Rate Limiting System

GitHub implements **primary** and **secondary** rate limits with distinct purposes and handling requirements:

- **Primary Rate Limits**: Fixed hourly/per-minute quotas per resource type (core, search, GraphQL, etc.)
  - Authenticated REST API: 5,000 requests/hour for core endpoints
  - GraphQL API: 5,000 points/hour
  - Search API: 30 requests/minute
  - Code Search: 10 requests/minute

- **Secondary Rate Limits**: Dynamic abuse prevention with multiple triggers:
  - Max 100 concurrent requests (shared between REST and GraphQL)
  - Max 900 points/minute for REST endpoints
  - Max 2,000 points/minute for GraphQL endpoint
  - Max 90 seconds CPU time per 60 seconds real time
  - Max 80 content-generating requests/minute or 500/hour
  - Excessive compute resource consumption triggers

### 2. Point-Based Cost System

GitHub uses a **points system** for secondary rate limit calculations:

| Request Type                              | Points   |
| ----------------------------------------- | -------- |
| REST API `GET`, `HEAD`, `OPTIONS`         | 1 point  |
| REST API `POST`, `PATCH`, `PUT`, `DELETE` | 5 points |
| GraphQL queries (no mutations)            | 1 point  |
| GraphQL mutations                         | 5 points |

**Note**: Some REST endpoints have undisclosed custom point costs.

### 3. Critical Headers for Rate Limit Management

Every API response includes headers for monitoring and handling rate limits:

| Header                  | Purpose                                                 |
| ----------------------- | ------------------------------------------------------- |
| `x-ratelimit-limit`     | Maximum requests allowed per hour                       |
| `x-ratelimit-remaining` | Requests remaining in current window                    |
| `x-ratelimit-used`      | Requests made in current window                         |
| `x-ratelimit-reset`     | UTC epoch seconds when limit resets                     |
| `x-ratelimit-resource`  | Which rate limit resource was counted against           |
| `retry-after`           | Seconds to wait before retrying (secondary limits only) |

### 4. Retry Strategy Requirements

GitHub specifies a **strict decision tree** for retry logic:

**Priority 1**: If `retry-after` header present → Wait specified seconds
**Priority 2**: If `x-ratelimit-remaining` is `0` → Wait until `x-ratelimit-reset` time
**Priority 3**: Otherwise → Wait at least 1 minute
**Priority 4**: For continued failures → Implement exponential backoff and error after N retries

**Critical Warning**: Continuing requests while rate-limited can result in **integration banning**.

### 5. GraphQL-Specific Rate Limiting

GraphQL API has separate rate limiting with distinct characteristics:

- **Separate quota**: Independent from REST API limits
- **Point-based**: 5,000 points per hour (not per request count)
- **Node limits**: Each query has calculated node cost
- **Resource-specific tracking**: Tracked under `graphql` resource in `/rate_limit` response
- **Shared concurrent limit**: 100 concurrent requests shared with REST API

---

## Patterns Observed

### Pattern 1: Proactive Rate Limit Monitoring

**Official recommendation**: Check headers on **every response** rather than calling `/rate_limit` endpoint.

```javascript
// Parse headers from every response
const remaining = parseInt(response.headers["x-ratelimit-remaining"]);
const reset = parseInt(response.headers["x-ratelimit-reset"]);
const limit = parseInt(response.headers["x-ratelimit-limit"]);

// Proactive throttling before hitting limit
if (remaining < limit * 0.1) {
  // Less than 10% remaining
  const waitTime = reset - Math.floor(Date.now() / 1000);
  // Implement throttling or queueing
}
```

**Why**: `/rate_limit` endpoint itself counts against secondary rate limits.

### Pattern 2: Hierarchical Retry Logic

GitHub's official retry strategy follows a **strict hierarchy**:

```typescript
async function retryWithBackoff(fn: () => Promise<Response>, maxRetries = 3) {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const response = await fn();
      return response;
    } catch (error) {
      const status = error.status;
      const headers = error.response?.headers;

      // Priority 1: Check retry-after header (secondary limits)
      if (headers["retry-after"]) {
        const waitSeconds = parseInt(headers["retry-after"]);
        await sleep(waitSeconds * 1000);
        retries++;
        continue;
      }

      // Priority 2: Check if primary limit exceeded
      if (headers["x-ratelimit-remaining"] === "0") {
        const resetTime = parseInt(headers["x-ratelimit-reset"]);
        const currentTime = Math.floor(Date.now() / 1000);
        const waitSeconds = resetTime - currentTime;
        await sleep(waitSeconds * 1000);
        retries++;
        continue;
      }

      // Priority 3: Secondary limit with no retry-after
      if (status === 403 || status === 429) {
        const backoffSeconds = Math.min(60 * Math.pow(2, retries), 3600);
        await sleep(backoffSeconds * 1000);
        retries++;
        continue;
      }

      // Non-rate-limit error
      throw error;
    }
  }

  throw new Error(`Max retries (${maxRetries}) exceeded`);
}
```

### Pattern 3: Resource-Specific Rate Limit Tracking

GitHub categorizes rate limits by **resource type**:

```json
{
  "resources": {
    "core": { "limit": 5000, "remaining": 4999, "reset": 1691591363 },
    "search": { "limit": 30, "remaining": 18, "reset": 1691591091 },
    "graphql": { "limit": 5000, "remaining": 4993, "reset": 1691593228 },
    "code_search": { "limit": 10, "remaining": 10, "reset": 1691591091 },
    "integration_manifest": { "limit": 5000, "remaining": 4999, "reset": 1691594631 },
    "source_import": { "limit": 100, "remaining": 99, "reset": 1691591091 },
    "code_scanning_upload": { "limit": 500, "remaining": 499, "reset": 1691594631 },
    "actions_runner_registration": { "limit": 10000, "remaining": 10000, "reset": 1691594631 },
    "scim": { "limit": 15000, "remaining": 15000, "reset": 1691594631 },
    "dependency_snapshots": { "limit": 100, "remaining": 100, "reset": 1691591091 }
  }
}
```

**Implication**: Integrations using multiple resource types should track limits **per resource**, not globally.

### Pattern 4: Exponential Backoff for Secondary Limits

Official guidance for repeated secondary limit violations:

```typescript
// Exponential backoff with jitter
function calculateBackoff(attempt: number, baseDelay = 60): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const maxDelay = 3600; // 1 hour cap
  const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
}
```

**Why jitter**: Prevents thundering herd when multiple clients reset simultaneously.

### Pattern 5: Concurrent Request Management

GitHub enforces a **100 concurrent request limit** shared across REST and GraphQL:

```typescript
// Semaphore-based concurrency control
class RateLimitedClient {
  private readonly maxConcurrent = 100;
  private currentConcurrent = 0;
  private queue: Array<() => void> = [];

  async request(fn: () => Promise<Response>): Promise<Response> {
    await this.acquireSlot();

    try {
      return await fn();
    } finally {
      this.releaseSlot();
    }
  }

  private async acquireSlot(): Promise<void> {
    if (this.currentConcurrent < this.maxConcurrent) {
      this.currentConcurrent++;
      return;
    }

    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  private releaseSlot(): void {
    this.currentConcurrent--;
    const next = this.queue.shift();
    if (next) {
      this.currentConcurrent++;
      next();
    }
  }
}
```

---

## Conflicts and Trade-offs

### Trade-off 1: Proactive Monitoring vs. Endpoint Overhead

**Conflict**: Calling `/rate_limit` endpoint provides comprehensive status but **counts against secondary rate limits**.

**Resolution**: GitHub recommends parsing response headers from regular API calls instead.

**When to call `/rate_limit`**:

- During initialization to understand current quota state
- After long idle periods before resuming batch operations
- **Never** in hot paths or per-request

### Trade-off 2: GraphQL vs. REST for Batch Operations

**Conflict**: GraphQL reduces round-trips but has complex point calculation making it harder to predict rate limit consumption.

**Resolution**: Use REST for predictable, point-intensive operations (mutations, batch writes) and GraphQL for read-heavy queries.

### Trade-off 3: Aggressive Request Batching vs. Secondary Limits

**Conflict**: Batching requests improves throughput but can trigger secondary limits via:

- Concurrent request limit (100 max)
- Points per minute (900 for REST)
- CPU time limits (90 seconds per minute)

**Resolution**: Implement **adaptive throttling** with request coalescing and debouncing.

---

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Ignoring retry-after Header

```typescript
// WRONG: Always using fixed backoff
catch (error) {
  if (error.status === 429) {
    await sleep(60000); // Always wait 60 seconds
  }
}

// CORRECT: Check retry-after first
catch (error) {
  if (error.status === 429) {
    const retryAfter = error.response.headers['retry-after'];
    if (retryAfter) {
      await sleep(parseInt(retryAfter) * 1000);
    } else {
      await sleep(60000);
    }
  }
}
```

### ❌ Anti-Pattern 2: Aggressive Polling Without Backoff

```typescript
// WRONG: Fixed interval polling
setInterval(async () => {
  await checkForUpdates();
}, 5000); // Can quickly exhaust rate limits

// CORRECT: Adaptive polling with backoff
class AdaptivePoller {
  private interval = 5000;
  private readonly maxInterval = 300000; // 5 minutes

  async poll(fn: () => Promise<boolean>): Promise<void> {
    try {
      const hasUpdates = await fn();
      if (hasUpdates) {
        this.interval = 5000; // Reset to fast polling
      } else {
        this.interval = Math.min(this.interval * 1.5, this.maxInterval);
      }
    } catch (error) {
      if (this.isRateLimitError(error)) {
        this.interval = this.maxInterval; // Back off significantly
      }
    }

    setTimeout(() => this.poll(fn), this.interval);
  }
}
```

### ❌ Anti-Pattern 3: Not Tracking Per-Resource Limits

```typescript
// WRONG: Global remaining count
let globalRemaining = 5000;

// CORRECT: Per-resource tracking
class ResourceTracker {
  private resources = new Map<string, number>();

  async makeRequest(endpoint: string) {
    const resource = this.getResourceType(endpoint);
    const remaining = this.resources.get(resource) || 0;

    if (remaining < 10) {
      throw new Error(`Approaching rate limit for ${resource}`);
    }

    const response = await fetch(endpoint);
    this.updateResource(resource, response.headers);
    return response;
  }
}
```

### ❌ Anti-Pattern 4: Synchronous Batch Processing

```typescript
// WRONG: Synchronous processing exhausts rate limits quickly
async function processBatch(items: any[]) {
  for (const item of items) {
    await createIssue(item); // 5 points each, 900 point/min limit = 180 requests/min max
  }
}

// CORRECT: Chunked processing with rate limit awareness
async function processBatchSafely(items: any[], pointsPerRequest = 5) {
  const maxPointsPerMinute = 900;
  const chunkSize = Math.floor((maxPointsPerMinute / pointsPerRequest) * 0.8);

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await Promise.all(chunk.map((item) => createIssue(item)));

    if (i + chunkSize < items.length) {
      await sleep(60000); // Wait for next minute window
    }
  }
}
```

---

## Recommendations

### 1. Multi-Layer Rate Limit Strategy

Implement **defense in depth** with multiple protection layers:

```typescript
// Layer 1: Client-side request scheduler (prevents exceeding limits)
const scheduler = new AdaptiveThrottler();

// Layer 2: Circuit breaker (stops cascading failures)
const circuitBreaker = new CircuitBreaker();

// Layer 3: Retry with backoff (handles transient errors)
const retryPolicy = new ExponentialBackoff();

// Layer 4: Request coalescing (reduces redundant requests)
const coalescer = new RequestCoalescer();
```

### 2. Monitoring and Observability

```typescript
interface RateLimitMetrics {
  timestamp: number;
  resource: string;
  endpoint: string;
  remaining: number;
  limit: number;
  percentUsed: number;
}

class RateLimitMonitor {
  recordRequest(endpoint: string, headers: Headers): void {
    const remaining = parseInt(headers.get("x-ratelimit-remaining"));
    const limit = parseInt(headers.get("x-ratelimit-limit"));
    const percentRemaining = (remaining / limit) * 100;

    if (percentRemaining < 10) {
      this.emitAlert(resource, remaining, resetIn);
    }
  }
}
```

### 3. Graceful Degradation

Design integrations to **gracefully degrade** under rate limit pressure:

```typescript
class GracefulAPIClient {
  async fetchData(
    endpoint: string,
    options: {
      required?: boolean;
      fallback?: any;
      skipIfLimited?: boolean;
    } = {}
  ): Promise<any> {
    const status = await this.checkRateLimit();

    if (options.required) {
      return await this.executeWithRetry(endpoint);
    }

    if (options.skipIfLimited && status.remaining < status.limit * 0.2) {
      console.log(`Skipping non-critical request due to rate limit pressure`);
      return options.fallback || null;
    }

    return await this.executeWithRetry(endpoint);
  }
}
```

---

## Sources

All information sourced from official GitHub REST API documentation:

1. **Rate Limit Errors - Troubleshooting**
   https://docs.github.com/rest/overview/troubleshooting

2. **Handling Exceeded Rate Limits**
   https://docs.github.com/rest/using-the-rest-api/rate-limits-for-the-rest-api

3. **Secondary Rate Limits and Point Calculation**
   https://docs.github.com/rest/overview/rate-limits-for-the-rest-api

4. **GET /rate_limit Endpoint**
   https://docs.github.com/rest/rate-limit/rate-limit

5. **Retry GitHub API Requests (JavaScript)**
   https://docs.github.com/rest/guides/scripting-with-the-rest-api-and-javascript

6. **Best Practices for Using the REST API**
   https://docs.github.com/rest/guides/best-practices-for-using-the-rest-api
