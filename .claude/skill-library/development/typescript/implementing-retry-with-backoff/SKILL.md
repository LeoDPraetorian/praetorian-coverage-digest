---
name: implementing-retry-with-backoff
description: Use when implementing API clients, network requests, or any operation that can transiently fail - covers exponential backoff, jitter, timeout handling, and idempotency considerations
allowed-tools: Read, Glob, Grep
---

# Implementing Retry with Backoff

**Resilient network operations through exponential backoff and jitter.**

## When to Use

Use this skill when:

- Implementing API clients that call external services
- Building systems that handle transient network failures
- Working with rate-limited APIs (HTTP 429)
- Dealing with eventual consistency in distributed systems
- Any operation that can fail temporarily

**Common scenarios:**

- HTTP API calls to third-party services
- Database connection retries
- Message queue operations
- Cloud service API calls (AWS, Azure, GCP)
- Microservice-to-microservice communication

## Core Algorithm

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    jitter?: boolean;
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 30000, jitter = true } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries || !isRetryable(error)) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s...
      let delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);

      // Add jitter to prevent thundering herd
      if (jitter) {
        delay *= 0.5 + Math.random() * 0.5; // 50-100% of delay
      }

      await sleep(delay);
    }
  }

  throw new Error("Unreachable");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

**Why exponential backoff:**

- Gives system time to recover
- Reduces load during outages
- More efficient than fixed delays

## Jitter: Critical for Distributed Systems

### The Thundering Herd Problem

```typescript
// ❌ WITHOUT JITTER: Synchronization disaster
// Service fails at 12:00:00
// 1000 clients all retry at:
// - 12:00:01 (all clients hit server simultaneously)
// - 12:00:02 (all clients hit server simultaneously)
// - 12:00:04 (all clients hit server simultaneously)
// Result: Server overwhelmed, cascading failures

// ✅ WITH JITTER: Clients spread out
// Service fails at 12:00:00
// 1000 clients retry spread across:
// - 12:00:00.5 to 12:00:01 (500ms window)
// - 12:00:01 to 12:00:02 (1000ms window)
// - 12:00:02 to 12:00:04 (2000ms window)
// Result: Load spreads out, service recovers gracefully
```

### Jitter Strategies

```typescript
// Full jitter (AWS recommended)
const jitteredDelay = Math.random() * delay;

// Equal jitter (50-100% of delay)
const jitteredDelay = delay * (0.5 + Math.random() * 0.5);

// Decorrelated jitter (AWS advanced)
const jitteredDelay = Math.min(maxDelay, Math.random() * (delay * 3 - baseDelay) + baseDelay);
```

## Retryable vs Non-Retryable Errors

### Retryable Errors

```typescript
function isRetryable(error: unknown): boolean {
  // Network errors (transient)
  if (error instanceof Error) {
    const retryableNetworkErrors = [
      "ECONNRESET", // Connection reset
      "ETIMEDOUT", // Timeout
      "ECONNREFUSED", // Connection refused (service down)
      "ENETUNREACH", // Network unreachable
      "EHOSTUNREACH", // Host unreachable
    ];

    if (retryableNetworkErrors.some((code) => error.message.includes(code))) {
      return true;
    }
  }

  // HTTP status codes
  if (error instanceof HTTPError) {
    const retryableCodes = [
      408, // Request Timeout
      429, // Too Many Requests (rate limit)
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504, // Gateway Timeout
    ];
    return retryableCodes.includes(error.status);
  }

  return false;
}
```

### Non-Retryable Errors

```typescript
// ❌ DO NOT retry these errors
const nonRetryable = [
  400, // Bad Request (client error, won't change)
  401, // Unauthorized (need new credentials)
  403, // Forbidden (no permission)
  404, // Not Found (resource doesn't exist)
  405, // Method Not Allowed
  422, // Unprocessable Entity (validation error)
];
```

## Timeout Handling

### Per-Request Timeout

```typescript
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// Usage
await retryWithBackoff(() => withTimeout(fetch(url), 5000), {
  maxRetries: 3,
  baseDelayMs: 1000,
});
```

### Total Operation Timeout

```typescript
async function retryWithTotalTimeout<T>(
  fn: () => Promise<T>,
  retryOptions: RetryOptions,
  totalTimeoutMs: number
): Promise<T> {
  const startTime = Date.now();

  return retryWithBackoff(async () => {
    const elapsed = Date.now() - startTime;
    if (elapsed >= totalTimeoutMs) {
      throw new Error(`Total timeout exceeded: ${totalTimeoutMs}ms`);
    }

    return fn();
  }, retryOptions);
}
```

## Idempotency Considerations

### The Danger of Non-Idempotent Retries

```typescript
// ⚠️ DANGER: Retrying POST /orders may create duplicate orders
async function createOrder(order: Order) {
  return retryWithBackoff(() =>
    fetch("/api/orders", { method: "POST", body: JSON.stringify(order) })
  );
}

// Customer clicks "Buy" once
// Network glitches, request times out
// System retries → creates second order
// Customer charged twice!
```

### Solution: Idempotency Keys

```typescript
// ✅ CORRECT: Use idempotency key
import { v4 as uuid } from "uuid";

async function createOrder(order: Order) {
  const idempotencyKey = uuid(); // Generate once per operation

  return retryWithBackoff(() =>
    fetch("/api/orders", {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(order),
    })
  );
}

// Server de-duplicates requests with same key
// Multiple retries = single order created
```

### Idempotent vs Non-Idempotent Operations

| Operation | Idempotent? | Safe to Retry? | Notes                             |
| --------- | ----------- | -------------- | --------------------------------- |
| GET       | ✅ Yes      | ✅ Yes         | Read-only                         |
| PUT       | ✅ Yes      | ✅ Yes         | Replace (same result if repeated) |
| DELETE    | ✅ Yes      | ✅ Yes         | Already deleted = still deleted   |
| POST      | ❌ No       | ⚠️ With key    | Creates new resource              |
| PATCH     | ⚠️ Depends  | ⚠️ With key    | Depends on implementation         |

## Rate Limiting and 429 Handling

### Respect Retry-After Header

```typescript
async function retryWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  return retryWithBackoff(
    async () => {
      try {
        return await fn();
      } catch (error) {
        if (error instanceof HTTPError && error.status === 429) {
          // Check Retry-After header
          const retryAfter = error.response.headers.get("Retry-After");
          if (retryAfter) {
            const delayMs = parseInt(retryAfter) * 1000;
            await sleep(delayMs);
            return fn(); // Retry after specified delay
          }
        }
        throw error;
      }
    },
    { maxRetries: 5, baseDelayMs: 1000 }
  );
}
```

## Circuit Breaker Pattern

For persistent failures, stop retrying:

```typescript
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  constructor(
    private threshold = 5,
    private resetTimeMs = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.resetTimeMs) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = "OPEN";
    }
  }
}
```

## Using Libraries

### p-retry

```typescript
import pRetry from "p-retry";

const result = await pRetry(
  async () => {
    const response = await fetch("https://api.example.com/data");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  },
  {
    retries: 3,
    factor: 2, // Exponential factor
    minTimeout: 1000,
    maxTimeout: 30000,
    randomize: true, // Add jitter
  }
);
```

### axios-retry

```typescript
import axios from "axios";
import axiosRetry from "axios-retry";

axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
  },
});

// Now axios automatically retries
const response = await axios.get("https://api.example.com/data");
```

### exponential-backoff

```typescript
import { backOff } from "exponential-backoff";

const result = await backOff(() => fetch("https://api.example.com/data"), {
  numOfAttempts: 5,
  startingDelay: 1000,
  timeMultiple: 2,
  maxDelay: 30000,
  jitter: "full",
});
```

## Testing Retry Logic

### Mock Transient Failures

```typescript
test("retries on transient failure", async () => {
  let attempts = 0;
  const fn = vi.fn(async () => {
    attempts++;
    if (attempts < 3) {
      throw new Error("ECONNRESET");
    }
    return "success";
  });

  const result = await retryWithBackoff(fn, { maxRetries: 3, baseDelayMs: 10 });

  expect(result).toBe("success");
  expect(fn).toHaveBeenCalledTimes(3);
});
```

### Test Timeout

```typescript
test("respects timeout", async () => {
  const slowFn = async () => {
    await sleep(10000);
    return "too slow";
  };

  await expect(withTimeout(slowFn(), 100)).rejects.toThrow("Timeout");
});
```

## Common Pitfalls

### Missing Jitter

```typescript
// ❌ WRONG: No jitter = thundering herd
delay = baseDelay * Math.pow(2, attempt);

// ✅ CORRECT: Add jitter
delay = baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
```

### Retrying Non-Idempotent Operations Without Keys

```typescript
// ❌ WRONG: Retrying POST without idempotency key
retryWithBackoff(() => fetch('/api/orders', { method: 'POST', ... }));

// ✅ CORRECT: Add idempotency key
retryWithBackoff(() => fetch('/api/orders', {
  method: 'POST',
  headers: { 'Idempotency-Key': uuid() },
  ...
}));
```

### No Max Delay Cap

```typescript
// ❌ WRONG: Delay grows forever (1s, 2s, 4s, 8s, 16s, 32s, 64s...)
delay = baseDelay * Math.pow(2, attempt);

// ✅ CORRECT: Cap max delay
delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
```

## External Resources

- [AWS Architecture Blog: Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [p-retry Documentation](https://github.com/sindresorhus/p-retry)
- [axios-retry Documentation](https://github.com/softonic/axios-retry)
