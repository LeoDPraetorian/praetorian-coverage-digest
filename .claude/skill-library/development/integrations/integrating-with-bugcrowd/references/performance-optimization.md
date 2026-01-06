# Performance Optimization for Bugcrowd Integration

**Last Updated:** 2026-01-03
**Source:** Research synthesis and caching patterns

---

## Caching Strategy

### Cache TTL Configuration

Based on data volatility and rate limit constraints (60 req/min per IP):

| Resource            | TTL      | Rationale                                  |
| ------------------- | -------- | ------------------------------------------ |
| Programs            | 24 hours | Relatively static, infrequent changes      |
| Targets             | 12 hours | Scope changes are rare                     |
| Researchers         | 1 hour   | Reputation may change, but slowly          |
| Organizations       | 24 hours | Very static metadata                       |
| Submissions (list)  | 1 minute | Frequently updated, critical for real-time |
| Submission (detail) | NEVER    | Real-time critical, use webhooks           |
| Custom Fields       | 6 hours  | Configuration changes are infrequent       |

### Cache Implementation

```typescript
import NodeCache from "node-cache";

const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default
  checkperiod: 60,
});

async function fetchWithCache<T>(endpoint: string, ttl?: number): Promise<T> {
  const cacheKey = `bugcrowd:${endpoint}`;

  // Check cache first
  const cached = cache.get<T>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from API
  const data = await bugcrowdClient.get(endpoint);

  // Store in cache
  cache.set(cacheKey, data, ttl);

  return data;
}

// Usage
const programs = await fetchWithCache("/programs", 24 * 3600); // 24 hour TTL
```

---

## Request Coalescing

Deduplicate identical in-flight requests:

```typescript
class RequestCoalescer {
  private pending = new Map<string, Promise<any>>();

  async fetch(url: string, options?: RequestInit): Promise<any> {
    const key = `${url}:${JSON.stringify(options)}`;

    // Reuse existing request if already in-flight
    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }

    // Create new request
    const promise = fetch(url, options)
      .then((r) => r.json())
      .finally(() => this.pending.delete(key));

    this.pending.set(key, promise);
    return promise;
  }
}

// Usage - multiple calls return same promise
const coalescer = new RequestCoalescer();

// Only 1 API call made, all 3 resolve with same data
const [r1, r2, r3] = await Promise.all([
  coalescer.fetch("https://api.bugcrowd.com/programs/123"),
  coalescer.fetch("https://api.bugcrowd.com/programs/123"),
  coalescer.fetch("https://api.bugcrowd.com/programs/123"),
]);
```

---

## Batch Operations

### Pagination Strategy

```typescript
async function fetchAllSubmissions(): Promise<Submission[]> {
  const results: Submission[] = [];
  let offset = 0;
  const limit = 25; // Bugcrowd default, balance API calls vs payload size
  const MAX_OFFSET = 9900; // Bugcrowd hard limit

  while (offset <= MAX_OFFSET) {
    const response = await fetchWithCache(
      `/submissions?page[limit]=${limit}&page[offset]=${offset}`,
      60 // 1 minute cache for list
    );

    results.push(...response.data);

    if (response.data.length < limit) {
      break; // No more results
    }

    offset += limit;
  }

  return results;
}
```

### Batch Comment Posting

```typescript
async function batchComments(
  comments: Array<{ submissionId: string; text: string }>
): Promise<void> {
  // Queue comments to respect rate limit
  for (const comment of comments) {
    await rateLimiter.waitForToken();

    await bugcrowdClient.post(`/submissions/${comment.submissionId}/comments`, {
      text: comment.text,
    });
  }
}
```

---

## Connection Pooling

### HTTP Agent Configuration

```typescript
import https from "https";

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 30000,
});

const bugcrowdClient = axios.create({
  baseURL: "https://api.bugcrowd.com",
  httpsAgent,
  timeout: 30000,
});
```

---

## Rate Limit Optimization

### Proactive Request Scheduling

```typescript
class RateLimitScheduler {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private readonly requestsPerSecond = 1; // 60 req/min

  async schedule<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.startProcessing();
      }
    });
  }

  private startProcessing(): void {
    this.processing = true;

    const interval = setInterval(async () => {
      if (this.queue.length === 0) {
        clearInterval(interval);
        this.processing = false;
        return;
      }

      const operation = this.queue.shift();
      if (operation) {
        await operation();
      }
    }, 1000 / this.requestsPerSecond);
  }
}
```

---

## References

- [references/rate-limiting-strategies.md](./rate-limiting-strategies.md) - Token bucket, Redis, exponential backoff
- Research: context7-rate-limiting.md (984 lines)
- Research: perplexity-rate-limiting.md (1,214 lines)
