# Token Estimation

**Accurate token counting patterns for response size optimization.**

## Overview

Token estimation helps APIs return transparent cost information and enables agents to make informed decisions about which endpoints to call.

## Quick Estimation (Good Enough)

**Rule of thumb**: ~1 token ≈ 4 characters

```typescript
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Usage
const response = { items: [...], summary: {...} };
const json = JSON.stringify(response);
console.log(`Estimated tokens: ${estimateTokens(json)}`);
```

**Accuracy**: ±15% for typical JSON responses

## Accurate Estimation (Production)

For production systems, use a tokenizer library:

```typescript
import { encode } from "gpt-tokenizer";

function countTokens(text: string): number {
  return encode(text).length;
}

// For Claude models
import Anthropic from "@anthropic-ai/sdk";
const anthropic = new Anthropic();

async function countTokensAnthropic(text: string): Promise<number> {
  const result = await anthropic.messages.countTokens({
    model: "claude-3-5-sonnet-20241022",
    messages: [{ role: "user", content: text }],
  });
  return result.input_tokens;
}
```

## Response Metadata Pattern

**Include token estimates in all responses**:

```typescript
interface TokenMetadata {
  estimatedTokens: number;
  method: 'quick' | 'accurate';
  breakdown?: {
    items: number;
    metadata: number;
  };
}

function addTokenMeta<T>(data: T, method: 'quick' | 'accurate' = 'quick'): T & { _meta: TokenMetadata } {
  const json = JSON.stringify(data);
  const tokens = method === 'quick'
    ? estimateTokens(json)
    : countTokens(json);

  return {
    ...data,
    _meta: {
      estimatedTokens: tokens,
      method
    }
  };
}

// Usage
return addTokenMeta({
  items: filteredAssets,
  summary: { total: 100, returned: 20 }
});

// Response
{
  items: [...],
  summary: { total: 100, returned: 20 },
  _meta: {
    estimatedTokens: 1250,
    method: 'quick'
  }
}
```

## Token Budget Pattern

**Let agents specify token budgets**:

```typescript
interface QueryOptions {
  maxTokens?: number;
  fields?: string[];
  limit?: number;
}

async function getAssets(options: QueryOptions = {}) {
  const { maxTokens = 2000, fields = ["id", "name"], limit = 20 } = options;

  let assets = await api.getAssets();
  let currentLimit = Math.min(limit, assets.length);

  // Binary search to find max items within budget
  while (currentLimit > 0) {
    const subset = assets
      .slice(0, currentLimit)
      .map((a) => Object.fromEntries(fields.map((f) => [f, a[f]])));

    const tokens = estimateTokens(JSON.stringify(subset));
    if (tokens <= maxTokens) {
      return addTokenMeta({ items: subset, returned: currentLimit, total: assets.length });
    }

    currentLimit = Math.floor(currentLimit * 0.8); // Reduce by 20%
  }

  // Can't fit any items
  return addTokenMeta({ items: [], returned: 0, total: assets.length });
}

// Usage
const response = await getAssets({
  maxTokens: 1500,
  fields: ["id", "name", "status"],
  limit: 50,
});
// Returns as many items as fit in 1500 tokens
```

## Content Type Token Patterns

Different content types have different token densities:

```typescript
const TOKEN_DENSITY = {
  // Characters per token (higher = more efficient)
  json: 4, // {"id": 123}
  markdown: 4.5, // # Title\n\nContent
  code: 3.5, // function foo() { ... }
  prose: 4.8, // Natural language text
  compressed: 2.5, // Minified/compressed content
};

function estimateByType(content: string, type: keyof typeof TOKEN_DENSITY): number {
  return Math.ceil(content.length / TOKEN_DENSITY[type]);
}
```

## Token Breakdown Pattern

**Show token distribution across response sections**:

```typescript
interface TokenBreakdown {
  total: number;
  items: number;
  metadata: number;
  summary: number;
}

function getTokenBreakdown(response: any): TokenBreakdown {
  const itemsTokens = estimateTokens(JSON.stringify(response.items));
  const metadataTokens = estimateTokens(JSON.stringify(response._meta));
  const summaryTokens = estimateTokens(JSON.stringify(response.summary));

  return {
    total: itemsTokens + metadataTokens + summaryTokens,
    items: itemsTokens,
    metadata: metadataTokens,
    summary: summaryTokens
  };
}

// Usage in API response
return {
  items: [...],
  summary: {...},
  _meta: {
    tokens: getTokenBreakdown({ items, summary, _meta: {} })
  }
};
```

## Caching Token Estimates

For frequently-accessed data, cache token counts:

```typescript
const tokenCache = new Map<string, number>();

function getCachedTokens(key: string, data: any): number {
  if (tokenCache.has(key)) {
    return tokenCache.get(key)!;
  }

  const tokens = countTokens(JSON.stringify(data));
  tokenCache.set(key, tokens);
  return tokens;
}

// Clear cache periodically
setInterval(() => tokenCache.clear(), 3600000); // 1 hour
```

## Validation Patterns

**Test token estimates in development**:

```typescript
import { expect } from "vitest";

test("asset list response within token budget", async () => {
  const response = await getAssets({ limit: 20 });

  expect(response._meta.estimatedTokens).toBeLessThan(2000);
  expect(response.items.length).toBeGreaterThan(0);
});

test("summary endpoint minimal tokens", async () => {
  const summary = await getAssetSummary();

  expect(summary._meta.estimatedTokens).toBeLessThan(100);
});
```

## Token Monitoring

**Log token usage in production**:

```typescript
async function monitoredQuery(query: string, options: QueryOptions) {
  const startTime = Date.now();
  const response = await executeQuery(query, options);
  const duration = Date.now() - startTime;

  logger.info("API Query", {
    query,
    tokens: response._meta.estimatedTokens,
    items: response.items?.length,
    duration,
  });

  // Alert if response exceeds threshold
  if (response._meta.estimatedTokens > 5000) {
    logger.warn("Large response detected", {
      query,
      tokens: response._meta.estimatedTokens,
    });
  }

  return response;
}
```

## Best Practices

1. **Always include `_meta.estimatedTokens`** in API responses
2. **Use quick estimation** (char/4) for development and most production use
3. **Use accurate counting** for critical paths or when building token budgets
4. **Cache token counts** for static/frequently-accessed data
5. **Monitor production usage** to catch regressions
6. **Test token budgets** in automated tests

## Checklist

- [ ] All API responses include `_meta.estimatedTokens`
- [ ] Token estimation method documented (quick vs accurate)
- [ ] Token budget parameters available on list endpoints
- [ ] Token breakdown available for debugging
- [ ] Production monitoring alerts on large responses
- [ ] Tests verify responses within token budgets

## Related

- Parent: [optimizing-llm-api-responses](../SKILL.md)
- See also: [Progressive Disclosure Examples](progressive-disclosure-examples.md)
