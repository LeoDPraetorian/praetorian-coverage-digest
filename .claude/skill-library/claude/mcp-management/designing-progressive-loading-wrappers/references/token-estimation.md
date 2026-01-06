# Token Estimation

Techniques for measuring and reporting token consumption in wrapper responses.

## Basic Token Estimation

### Character-Based Estimation

The simplest approach: 1 token ≈ 4 characters (for English text and JSON):

```typescript
function estimateTokens(data: any): number {
  const json = JSON.stringify(data);
  return Math.ceil(json.length / 4);
}

// Usage
const response = await getIssues();
console.log(`Estimated tokens: ${estimateTokens(response)}`);
```

### Tiktoken-Based Estimation

For accurate counts, use OpenAI's tiktoken (works for Claude approximation):

```typescript
import { encoding_for_model } from "tiktoken";

// cl100k_base is close to Claude's tokenizer
const encoder = encoding_for_model("gpt-4");

function countTokens(data: any): number {
  const json = JSON.stringify(data);
  const tokens = encoder.encode(json);
  return tokens.length;
}

// Don't forget to free the encoder when done
// encoder.free();
```

## Token Estimation Response Pattern

Include estimation in every response:

```typescript
interface TokenEstimate {
  // Baseline without any optimization
  withoutCustomTool: number;
  // Tokens at session startup (should be 0 for progressive loading)
  atSessionStart: number;
  // Tokens for this specific response
  thisResponse: number;
  // Percentage reduction achieved
  reduction: string;
}

interface ToolResponse<T> {
  data: T;
  tokenEstimate: TokenEstimate;
}

async function listIssues(args: { limit?: number }): Promise<ToolResponse<any>> {
  const limit = args.limit || 20;

  // Fetch all to calculate baseline
  const allIssues = await linearClient.issues();
  const baselineTokens = estimateTokens(allIssues);

  // Apply filtering
  const filteredIssues = allIssues
    .slice(0, limit)
    .map((issue) => truncateFields(suppressNested(issue)));

  const responseTokens = estimateTokens({
    summary: { total_count: allIssues.length, returned_count: filteredIssues.length },
    items: filteredIssues,
  });

  const reduction = ((1 - responseTokens / baselineTokens) * 100).toFixed(1);

  return {
    data: {
      summary: {
        total_count: allIssues.length,
        returned_count: filteredIssues.length,
        has_more: allIssues.length > limit,
      },
      items: filteredIssues,
    },
    tokenEstimate: {
      withoutCustomTool: baselineTokens,
      atSessionStart: 0, // Progressive loading
      thisResponse: responseTokens,
      reduction: `${reduction}%`,
    },
  };
}
```

## Aggregate Token Tracking

Track tokens across a session:

```typescript
class TokenTracker {
  private history: Array<{
    tool: string;
    timestamp: Date;
    tokens: number;
    baseline: number;
  }> = [];

  record(tool: string, tokens: number, baseline: number) {
    this.history.push({
      tool,
      timestamp: new Date(),
      tokens,
      baseline,
    });
  }

  getSummary() {
    const totalTokens = this.history.reduce((sum, h) => sum + h.tokens, 0);
    const totalBaseline = this.history.reduce((sum, h) => sum + h.baseline, 0);
    const reduction = ((1 - totalTokens / totalBaseline) * 100).toFixed(1);

    return {
      callCount: this.history.length,
      totalTokens,
      totalBaseline,
      reduction: `${reduction}%`,
      averagePerCall: Math.round(totalTokens / this.history.length),
      byTool: this.groupByTool(),
    };
  }

  private groupByTool() {
    const grouped: Record<string, { calls: number; tokens: number }> = {};
    for (const h of this.history) {
      if (!grouped[h.tool]) {
        grouped[h.tool] = { calls: 0, tokens: 0 };
      }
      grouped[h.tool].calls++;
      grouped[h.tool].tokens += h.tokens;
    }
    return grouped;
  }
}

// Global tracker instance
export const tokenTracker = new TokenTracker();
```

## Estimation Accuracy

| Method          | Accuracy | Performance | Use Case                 |
| --------------- | -------- | ----------- | ------------------------ |
| Character/4     | ~80%     | Fast        | Quick estimates, logging |
| Tiktoken        | ~95%     | Moderate    | Precise measurement      |
| API token count | 100%     | Slow        | Billing, auditing        |

### Accuracy Factors

Token estimation varies based on:

1. **Content type**: Code vs prose vs JSON structure
2. **Language**: English ~4 chars/token, other languages vary
3. **Special characters**: Punctuation, whitespace, Unicode
4. **JSON structure**: Keys, brackets, quotes add overhead

**Recommendation**: Use character/4 for inline estimates, tiktoken for reporting.

## Token Budget Patterns

### Budget Enforcement

```typescript
interface TokenBudget {
  maxPerResponse: number;
  maxPerSession: number;
  warningThreshold: number; // Percentage (0.8 = 80%)
}

const DEFAULT_BUDGET: TokenBudget = {
  maxPerResponse: 5000,
  maxPerSession: 50000,
  warningThreshold: 0.8,
};

function enforceTokenBudget<T>(
  data: T,
  budget: TokenBudget = DEFAULT_BUDGET
): { data: T; truncated: boolean; warning?: string } {
  const tokens = estimateTokens(data);

  if (tokens > budget.maxPerResponse) {
    // Truncate response to fit budget
    const truncated = truncateToTokenBudget(data, budget.maxPerResponse);
    return {
      data: truncated,
      truncated: true,
      warning: `Response truncated from ${tokens} to ~${budget.maxPerResponse} tokens`,
    };
  }

  if (tokens > budget.maxPerResponse * budget.warningThreshold) {
    return {
      data,
      truncated: false,
      warning: `Response uses ${tokens} tokens (${Math.round(
        (tokens / budget.maxPerResponse) * 100
      )}% of budget)`,
    };
  }

  return { data, truncated: false };
}
```

### Dynamic Limit Calculation

Calculate optimal limit based on token budget:

```typescript
function calculateOptimalLimit(
  sampleItem: any,
  tokenBudget: number,
  overheadTokens: number = 200
): number {
  const itemTokens = estimateTokens(sampleItem);
  const availableTokens = tokenBudget - overheadTokens;
  return Math.floor(availableTokens / itemTokens);
}

// Usage
async function listIssuesWithBudget(tokenBudget: number = 2000) {
  const issues = await linearClient.issues({ first: 1 });
  const sampleIssue = truncateFields(suppressNested(issues[0]));

  const optimalLimit = calculateOptimalLimit(sampleIssue, tokenBudget);

  return listIssues({ limit: optimalLimit });
}
```

## Reporting Format

Standard format for token estimation in responses:

```json
{
  "data": { ... },
  "meta": {
    "tokenEstimate": {
      "withoutCustomTool": 46000,
      "atSessionStart": 0,
      "thisResponse": 600,
      "reduction": "98.7%"
    },
    "timing": {
      "fetchMs": 234,
      "filterMs": 12
    }
  }
}
```

## Related Patterns

- [Response Filtering Patterns](response-filtering-patterns.md) - Reduce tokens
- [Performance Benchmarks](performance-benchmarks.md) - Real-world data
- [Validation Checklist](validation-checklist.md) - Verify implementation
