# Error Handling and Resilience Patterns

**Last Updated:** 2026-01-03
**Source:** Research synthesis (1,077 lines combined from Context7 + Perplexity)

---

## HTTP Error Codes

### Bugcrowd-Specific Error Handling

| Status                        | Meaning                            | Retry? | Action                             |
| ----------------------------- | ---------------------------------- | ------ | ---------------------------------- |
| **400 Bad Request**           | Invalid parameters, offset > 9,900 | ❌     | Fix request, fail fast             |
| **401 Unauthorized**          | Invalid/missing token              | ❌     | Check credentials, fail fast       |
| **403 Forbidden**             | IP not allowlisted                 | ❌     | Verify IP configuration, fail fast |
| **404 Not Found**             | Resource not found                 | ❌     | Verify resource ID, fail fast      |
| **408 Request Timeout**       | Timeout                            | ✅     | Retry with exponential backoff     |
| **429 Too Many Requests**     | Rate limit exceeded                | ✅     | Always retry with backoff          |
| **500 Internal Server Error** | Server error                       | ✅     | Retry with exponential backoff     |
| **502/503/504**               | Gateway/service unavailable        | ✅     | Retry with exponential backoff     |

---

## Circuit Breaker Pattern

### Three-State Model

```
CLOSED (Normal Operation)
  ├─ Requests flow normally
  ├─ Monitor error rate in rolling window
  └─ Threshold exceeded → OPEN

OPEN (Service Degraded)
  ├─ Immediately reject requests
  ├─ Return cached/fallback responses
  ├─ Wait timeout period (30s)
  └─ Timeout elapsed → HALF-OPEN

HALF-OPEN (Testing Recovery)
  ├─ Allow limited canary requests
  ├─ If success → CLOSED
  └─ If failure → OPEN
```

### Configuration

```typescript
const circuitBreakerConfig = {
  failureThreshold: 5, // Open after 5 consecutive failures
  resetTimeout: 30000, // 30 seconds in open state
  successThreshold: 2, // 2 successes to close from half-open
  monitoringWindow: 10, // Track last 10 requests
};
```

### Implementation

```typescript
class CircuitBreaker {
  private state: "CLOSED" | "OPEN" | "HALF-OPEN" = "CLOSED";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime! > 30000) {
        this.state = "HALF-OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await operation();

      // Success handling
      if (this.state === "HALF-OPEN") {
        this.successCount++;
        if (this.successCount >= 2) {
          this.state = "CLOSED";
          this.failureCount = 0;
          this.successCount = 0;
        }
      } else if (this.state === "CLOSED") {
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= 5) {
        this.state = "OPEN";
      }

      throw error;
    }
  }
}
```

---

## Exponential Backoff with Jitter

### Configuration

```typescript
interface BackoffConfig {
  baseDelayMs: 1000; // 1 second initial
  maxDelayMs: 30000; // 30 second cap
  multiplier: 2; // Exponential growth
  maxRetries: 5; // Total attempts
  jitterFactor: 0.2; // ±20% randomness
}
```

### Retry Sequence

| Attempt | Base Delay | With Jitter (±20%) |
| ------- | ---------- | ------------------ |
| 1       | 1s         | 0.8-1.2s           |
| 2       | 2s         | 1.6-2.4s           |
| 3       | 4s         | 3.2-4.8s           |
| 4       | 8s         | 6.4-9.6s           |
| 5       | 16s        | 12.8-19.2s         |
| 6       | 32s        | Capped at 30s      |

### Implementation

```typescript
async function fetchWithBackoff(url: string, config: BackoffConfig): Promise<Response> {
  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      const response = await fetch(url);

      // Don't retry 4xx errors (except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new Error(`Client error: ${response.status}`);
      }

      if (response.status === 429 || response.status >= 500) {
        if (attempt < config.maxRetries - 1) {
          const delay = calculateBackoffDelay(attempt, config);
          await sleep(delay);
          continue;
        }
      }

      return response;
    } catch (error) {
      if (attempt === config.maxRetries - 1) {
        throw error;
      }

      const delay = calculateBackoffDelay(attempt, config);
      await sleep(delay);
    }
  }

  throw new Error("Max retries exceeded");
}

function calculateBackoffDelay(attempt: number, config: BackoffConfig): number {
  const exponentialDelay = Math.min(
    config.baseDelayMs * Math.pow(config.multiplier, attempt),
    config.maxDelayMs
  );

  // Add jitter
  const jitter = exponentialDelay * config.jitterFactor * (Math.random() - 0.5);

  return exponentialDelay + jitter;
}
```

---

## Timeout Configuration

| Timeout Type | Recommended | Purpose                      |
| ------------ | ----------- | ---------------------------- |
| Connection   | 10 seconds  | TCP connection establishment |
| Request      | 30 seconds  | Complete request + response  |
| Read         | 20 seconds  | Receiving response data      |
| Write        | 5 seconds   | Sending request body         |

```typescript
const axiosConfig = {
  timeout: 30000, // 30 second total
  httpsAgent: new https.Agent({
    timeout: 10000, // 10 second connection
    keepAlive: true,
  }),
};
```

---

## Graceful Degradation

### Fallback Order

1. **Cached Data:** Serve stale data if available
2. **Default Values:** Return sensible defaults
3. **Partial Responses:** Return available data with warning
4. **Queuing:** Queue requests for later processing
5. **Error Response:** Clear error message

### Cache Configuration

```typescript
const CACHE_TTLS = {
  assets: 3600, // 1 hour (relatively static)
  risks: 300, // 5 minutes (medium volatility)
  submissions: 60, // 1 minute (frequently updated)
  users: 7200, // 2 hours (stable)
};
```

---

## Monitoring & Alerting

### Key Metrics

- **Request Latency:** p50/p95/p99
- **Error Rate:** % of failed requests
- **Rate Limit Hits:** Count of 429 responses
- **Circuit Breaker State:** CLOSED/OPEN/HALF-OPEN
- **Retry Count:** % of requests requiring retries
- **Timeout Rate:** % of requests timing out

### Alert Thresholds

```typescript
const ALERT_THRESHOLDS = {
  ERROR_RATE: 0.05, // Alert if >5% errors
  RATE_LIMIT_HITS_PER_HOUR: 10, // Alert if >10 429s/hour
  CIRCUIT_BREAKER_OPEN: true, // Alert on any OPEN state
  P95_LATENCY_MS: 5000, // Alert if p95 > 5s
  RETRY_RATE: 0.2, // Alert if >20% requests retry
};
```

---

## Complete Resilience Pattern

```typescript
class ResilientBugcrowdClient {
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RedisTokenBucket;
  private cache: Cache;

  async request<T>(endpoint: string): Promise<T> {
    // 1. Check cache first
    const cached = await this.cache.get(endpoint);
    if (cached && this.circuitBreaker.state === "OPEN") {
      return cached; // Graceful degradation
    }

    // 2. Circuit breaker check
    return this.circuitBreaker.execute(async () => {
      // 3. Rate limit check
      const limitResult = await this.rateLimiter.tryConsume(1);
      if (!limitResult.allowed) {
        await sleep(limitResult.waitTimeSeconds * 1000);
      }

      // 4. Make request with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(`https://api.bugcrowd.com${endpoint}`, {
          signal: controller.signal,
          headers: await this.getAuthHeaders(),
        });

        clearTimeout(timeout);

        // 5. Handle 429 with exponential backoff
        if (response.status === 429) {
          throw new RateLimitError("Rate limit exceeded");
        }

        // 6. Cache successful response
        const data = await response.json();
        await this.cache.set(endpoint, data, CACHE_TTLS[getResourceType(endpoint)]);

        return data;
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    });
  }
}
```

---

## References

- [Circuit Breaker Pattern - Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/implement-resilient-applications/implement-circuit-breaker-pattern)
- [Exponential Backoff - OpenAI Cookbook](https://cookbook.openai.com/examples/how_to_handle_rate_limits)
- Research: context7-error-handling.md (808 lines)
- Research: perplexity-error-handling.md (269 lines)
