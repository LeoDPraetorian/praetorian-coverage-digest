# Rate Limiting Strategies for Bugcrowd API

**Last Updated:** 2026-01-03
**Source:** Research synthesis (1,984 lines combined from Context7 + Perplexity)

---

## Rate Limit Specification

**Hard Limit:** 60 requests per minute per IP address

**Key Characteristics:**

- **Scope:** Per-IP address (NOT per-token or per-user)
- **Window:** 1-minute rolling window
- **Policy:** Hard limit (requests rejected once exceeded)
- **Error Code:** HTTP 429 (Too Many Requests)
- **Burst Behavior:** Unknown (assume no burst allowance for safety)

**Implication:** Multiple services from same IP share quota → requires distributed rate limiter.

---

## Token Bucket Algorithm (Recommended)

### Configuration for Bugcrowd

```typescript
const BUGCROWD_RATE_LIMIT = {
  maxTokens: 60, // Match Bugcrowd's 60 req/min
  refillRatePerSecond: 1, // 60 tokens per 60 seconds
  tokenWeight: 1, // 1 token per request
};
```

### In-Memory Implementation (Single Instance Only)

```typescript
class TokenBucket {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private lastRefillTime: number;

  constructor(maxTokens: number, refillRatePerSecond: number) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRatePerSecond;
    this.tokens = maxTokens;
    this.lastRefillTime = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTime) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  tryConsume(tokensNeeded: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokensNeeded) {
      this.tokens -= tokensNeeded;
      return true;
    }

    return false;
  }

  getWaitTime(): number {
    this.refill();

    if (this.tokens >= 1) {
      return 0;
    }

    return (1 - this.tokens) / this.refillRate;
  }
}
```

---

## Redis-Based Distributed Rate Limiting (Production)

### Lua Script for Atomic Operations

```lua
-- token_bucket.lua
-- KEYS[1]: bucket key
-- ARGV[1]: current timestamp (ms)
-- ARGV[2]: refill rate (tokens/sec)
-- ARGV[3]: max tokens
-- ARGV[4]: tokens to consume

local bucket_key = KEYS[1]
local now = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local max_tokens = tonumber(ARGV[3])
local consume = tonumber(ARGV[4])

local state = redis.call('HMGET', bucket_key, 'tokens', 'last_refill')
local tokens = tonumber(state[1]) or max_tokens
local last_refill = tonumber(state[2]) or now

local elapsed_seconds = (now - last_refill) / 1000
local tokens_to_add = elapsed_seconds * refill_rate
tokens = math.min(max_tokens, tokens + tokens_to_add)

if tokens >= consume then
  tokens = tokens - consume
  redis.call('HMSET', bucket_key, 'tokens', tokens, 'last_refill', now)
  return 1
else
  redis.call('HSET', bucket_key, 'last_refill', now)
  return 0
end
```

### TypeScript Redis Client

```typescript
import Redis from "ioredis";
import * as fs from "fs";

class RedisTokenBucket {
  private redis: Redis;
  private scriptSha: string = "";
  private readonly bucketKey: string;
  private readonly maxTokens: number;
  private readonly refillRate: number;

  constructor(redis: Redis, bucketKey: string, maxTokens: number, refillRate: number) {
    this.redis = redis;
    this.bucketKey = bucketKey;
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
  }

  async initialize(): Promise<void> {
    const script = fs.readFileSync("./token_bucket.lua", "utf-8");
    this.scriptSha = await this.redis.script("LOAD", script);
  }

  async tryConsume(tokensNeeded: number = 1): Promise<{
    allowed: boolean;
    tokensRemaining: number;
    waitTimeSeconds: number;
  }> {
    const now = Date.now();

    const result = (await this.redis.evalsha(
      this.scriptSha,
      1,
      this.bucketKey,
      now.toString(),
      this.refillRate.toString(),
      this.maxTokens.toString(),
      tokensNeeded.toString()
    )) as number;

    if (result === 1) {
      const state = await this.redis.hgetall(this.bucketKey);
      return {
        allowed: true,
        tokensRemaining: parseInt(state.tokens || "0", 10),
        waitTimeSeconds: 0,
      };
    } else {
      const state = await this.redis.hgetall(this.bucketKey);
      const tokens = parseFloat(state.tokens || "0");
      const waitTime = (tokensNeeded - tokens) / this.refillRate;

      return {
        allowed: false,
        tokensRemaining: 0,
        waitTimeSeconds: Math.ceil(waitTime),
      };
    }
  }
}

// Usage
const redis = new Redis({ host: "localhost", port: 6379 });
const limiter = new RedisTokenBucket(redis, "bugcrowd:ratelimit", 60, 1);

await limiter.initialize();

const result = await limiter.tryConsume(1);
if (result.allowed) {
  // Make API call
} else {
  // Wait before retrying
  await sleep(result.waitTimeSeconds * 1000);
}
```

---

## Exponential Backoff for 429 Responses

```typescript
interface BackoffConfig {
  baseDelayMs: number; // 1000 (1 second)
  maxDelayMs: number; // 30000 (30 seconds)
  multiplier: number; // 2 (exponential)
  maxRetries: number; // 5
  jitterFactor: number; // 0.2 (±20%)
}

async function fetchWithBackoff(
  url: string,
  options: RequestInit,
  config: BackoffConfig
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        // Check for Retry-After header (prefer if present)
        const retryAfter = response.headers.get("Retry-After");
        const delayMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : calculateBackoffDelay(attempt, config);

        logger.warn("Rate limited", { attempt, delayMs });
        await sleep(delayMs);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      if (attempt < config.maxRetries - 1) {
        const delayMs = calculateBackoffDelay(attempt, config);
        await sleep(delayMs);
      }
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

function calculateBackoffDelay(attempt: number, config: BackoffConfig): number {
  const exponentialDelay = Math.min(
    config.baseDelayMs * Math.pow(config.multiplier, attempt),
    config.maxDelayMs
  );

  // Add jitter: ±20% randomness
  const jitter = exponentialDelay * config.jitterFactor * (Math.random() - 0.5);

  return exponentialDelay + jitter;
}
```

---

## References

- [Bugcrowd API Getting Started](https://docs.bugcrowd.com/api/getting-started/)
- [Token Bucket Algorithm - Redis](https://redis.io/glossary/rate-limiting/)
- [Exponential Backoff - OpenAI Cookbook](https://cookbook.openai.com/examples/how_to_handle_rate_limits)
- Research: context7-rate-limiting.md (984 lines)
- Research: perplexity-rate-limiting.md (1,214 lines)
