---
name: designing-progressive-loading-wrappers
description: Use when architecting MCP wrappers or API SDK wrappers that need token/context optimization - covers progressive loading patterns, response filtering strategies, token reduction techniques for LLM context windows
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# Designing Progressive Loading Wrappers

**Architectural patterns for building token-efficient MCP wrappers and API SDK wrappers that minimize LLM context consumption.**

## The Problem

MCP wrappers and API SDK wrappers can consume massive amounts of context at session startup:

- **71,800+ tokens** documented in real-world MCP wrapper implementations
- Research shows **"token usage alone explains 80% of performance variance"** in agent tasks
- Traditional wrapper patterns load all tool definitions at startup → context bloat
- Unfiltered API responses return 75-99% unnecessary data → token waste
- No standardized patterns for measuring or optimizing token consumption

**Impact:** Sessions start slow, context windows fill quickly, agent performance degrades, costs increase unnecessarily.

## When to Use This Skill

Use this skill when:

- Creating new MCP server wrappers for Claude Code
- Building API SDK wrappers (Linear, GitHub, AWS, etc.)
- Optimizing existing wrappers that consume excessive context
- Architecting tool systems that need to scale to 100+ tools
- Designing systems where token efficiency directly impacts performance

**Related skills:**

- `creating-mcp-wrappers` - TDD workflow for implementing wrappers (use AFTER architectural design)
- `managing-mcp-wrappers` - Lifecycle management for existing wrappers

**You MUST use TodoWrite** before starting to track all architectural decisions and implementation steps when applying these patterns to a new wrapper.

## Quick Reference

| Pattern                     | Token Impact          | When to Apply                            |
| --------------------------- | --------------------- | ---------------------------------------- |
| Progressive Loading         | 99% reduction startup | All wrappers with 5+ tools               |
| Response Filtering          | 75-95% reduction      | Paginated APIs, list operations          |
| Lazy Tool Discovery         | 100% reduction        | Tool systems with 20+ tools              |
| Token Estimation            | Visibility only       | Performance-sensitive wrappers           |
| Summary + Limited Items     | 90% reduction         | Collection endpoints (users, issues)     |
| Field Truncation            | 50-80% reduction      | Large text fields (descriptions, logs)   |
| Nested Resource Suppression | 60-90% reduction      | Graph APIs (relationships, deep nesting) |

**Core principle:** Load nothing at startup, load minimally when invoked, return only what's needed.

## Progressive Loading Architecture

### Zero Tokens at Startup

**Anti-pattern:**

```typescript
// ❌ Loads all tool definitions at session start (46,000 tokens)
import { LinearClient } from "@linear/sdk";
import { createMcpServer } from "@claude/mcp";

const server = createMcpServer({
  tools: {
    getIssue: { ... },      // Tool definition
    listIssues: { ... },    // Tool definition
    createIssue: { ... },   // Tool definition
    // 50+ more tools
  }
});
```

**Progressive loading pattern:**

```typescript
// ✅ Zero tokens at startup - filesystem discovery only
const toolsDir = path.join(__dirname, "tools");
const toolFiles = fs.readdirSync(toolsDir); // Just filenames

server.registerToolLoader(async (toolName: string) => {
  // Load tool code only when invoked
  const toolPath = path.join(toolsDir, `${toolName}.ts`);
  const toolModule = await import(toolPath);
  return toolModule.default;
});
```

**Token Impact:**

- Without progressive loading: **46,000 tokens** at session start
- With progressive loading: **0 tokens** at session start, **600 tokens** when tool invoked
- **Reduction: 99%**

### Lazy Tool Discovery

For wrapper systems with 20+ tools, even listing tool names can consume significant context.

**Pattern:**

```
tools/
  get-issue.ts
  list-issues.ts
  create-issue.ts
  update-issue.ts
  delete-issue.ts
  ...50+ more files
```

```typescript
// Tool discovery on-demand
server.listTools = () => {
  return fs
    .readdirSync(toolsDir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => f.replace(".ts", ""));
};
```

**See:** [references/progressive-loading-examples.md](references/progressive-loading-examples.md) for complete implementation examples.

## Response Filtering Strategies

### Summary + Limited Items Pattern

**Problem:** Returning full collections consumes massive context.

**Example - Unfiltered response:**

```typescript
// ❌ Returns 500 issues × 200 tokens each = 100,000 tokens
async listIssues() {
  const issues = await linear.issues();
  return issues; // Full dataset
}
```

**Solution - Summary + limited items:**

```typescript
// ✅ Returns summary + 20 items = ~1,000 tokens (99% reduction)
async listIssues(limit: number = 20) {
  const allIssues = await linear.issues();

  return {
    summary: {
      total_count: allIssues.length,
      returned_count: Math.min(limit, allIssues.length),
      has_more: allIssues.length > limit
    },
    items: allIssues.slice(0, limit),
    estimated_tokens: limit * 50  // ~50 tokens per item
  };
}
```

**Token Impact:**

| Approach    | Tokens  | Reduction |
| ----------- | ------- | --------- |
| Unfiltered  | 100,000 | -         |
| Summary+20  | 1,000   | 99%       |
| Summary+50  | 2,500   | 97.5%     |
| Summary+100 | 5,000   | 95%       |

### Field Truncation Pattern

**Problem:** Large text fields (descriptions, bodies, logs) consume disproportionate tokens.

**Solution:**

```typescript
interface TruncationConfig {
  maxLength: number;
  fields: string[];
  suffix: string;
}

function truncateFields(
  obj: any,
  config: TruncationConfig = {
    maxLength: 500,
    fields: ['description', 'body', 'content'],
    suffix: '... [truncated]'
  }
): any {
  const result = { ...obj };

  for (const field of config.fields) {
    if (result[field] && typeof result[field] === 'string') {
      if (result[field].length > config.maxLength) {
        result[field] = result[field].slice(0, config.maxLength) + config.suffix;
        result[`${field}_truncated`] = true;
      }
    }
  }

  return result;
}

// Usage
async getIssue(id: string) {
  const issue = await linear.issue(id);
  return truncateFields(issue, {
    maxLength: 500,
    fields: ['description', 'body'],
    suffix: '... [truncated, use getFullDescription if needed]'
  });
}
```

**Token Impact:** 50-80% reduction for endpoints with large text fields.

### Nested Resource Suppression

**Problem:** Graph APIs return deeply nested relationships that consume excessive tokens.

**Solution:**

```typescript
// ❌ Returns issue + project + team + labels + comments + assignees + ... = 5,000 tokens
async getIssue(id: string) {
  return await linear.issue(id, {
    includeRelated: true  // Fetches everything
  });
}

// ✅ Returns issue only, load relationships on-demand = 200 tokens
async getIssue(id: string, options = { includeRelated: false }) {
  return await linear.issue(id, {
    includeRelated: options.includeRelated
  });
}

// Separate tools for relationships
async getIssueComments(issueId: string) { ... }
async getIssueLabels(issueId: string) { ... }
```

**Token Impact:** 60-90% reduction for graph APIs.

**See:** [references/response-filtering-patterns.md](references/response-filtering-patterns.md) for advanced filtering techniques.

## Token Estimation Pattern

**Purpose:** Measure optimization impact and provide visibility into token consumption.

### Implementation

```typescript
interface TokenEstimate {
  withoutCustomTool: number;  // Baseline (raw MCP server)
  withCustomTool: number;      // At session start
  whenUsed: number;            // When tool invoked
  reduction: string;           // Percentage improvement
}

function estimateTokens(obj: any): number {
  // Rough estimation: 1 token ≈ 4 characters
  const json = JSON.stringify(obj);
  return Math.ceil(json.length / 4);
}

// Include in tool responses
async listIssues(limit: number = 20) {
  const allIssues = await linear.issues();
  const filtered = allIssues.slice(0, limit);

  return {
    summary: { total_count: allIssues.length, returned_count: filtered.length },
    items: filtered,
    tokenEstimate: {
      withoutCustomTool: estimateTokens(allIssues),      // 46,000
      withCustomTool: 0,                                   // Session start
      whenUsed: estimateTokens(filtered),                 // 600
      reduction: '99%'
    }
  };
}
```

**See:** [references/token-estimation.md](references/token-estimation.md) for accurate estimation techniques.

## Architecture Decision Tree

Use this decision tree when architecting a new wrapper:

```
Is this a wrapper for an MCP server or API SDK?
├─ Yes → Continue
└─ No → Not applicable (use other skills)

How many tools/endpoints will the wrapper expose?
├─ < 5 tools → Progressive loading optional (minimal impact)
├─ 5-20 tools → Progressive loading RECOMMENDED
└─ > 20 tools → Progressive loading + Lazy discovery MANDATORY

Do tools return collections (lists, paginated data)?
├─ Yes → Implement Summary + Limited Items pattern
└─ No → Skip collection filtering

Do responses include large text fields (>500 chars)?
├─ Yes → Implement Field Truncation pattern
└─ No → Skip truncation

Do responses include nested relationships (graph APIs)?
├─ Yes → Implement Nested Resource Suppression
└─ No → Skip suppression

Is token efficiency critical for performance?
├─ Yes → Implement Token Estimation + all patterns above
└─ No → Implement only patterns that apply
```

**See:** [references/architecture-decision-tree.md](references/architecture-decision-tree.md) for detailed decision criteria.

## Anti-Patterns

### 1. Loading All Tool Definitions at Startup

**Problem:** Consuming 40,000-70,000 tokens before any tool is used.

**Why it happens:** Default MCP server patterns load tools eagerly.

**Fix:** Implement progressive loading (filesystem discovery).

### 2. Returning Unfiltered API Responses

**Problem:** Returning 500-item collections when user needs 20.

**Why it happens:** "Let Claude decide what's relevant" or "Easier to return everything."

**Fix:** Implement Summary + Limited Items pattern with configurable limits.

### 3. Not Truncating Large Text Fields

**Problem:** 10,000-character descriptions consuming 2,500 tokens per item.

**Why it happens:** "What if Claude needs the full text?"

**Fix:** Truncate to 500 chars with explicit `getFullField` tool if needed.

### 4. Loading Nested Resources by Default

**Problem:** Graph APIs returning 10 levels deep consuming 5,000+ tokens per item.

**Why it happens:** "Convenience - everything in one response."

**Fix:** Separate tools for relationships, load on-demand.

### 5. No Token Visibility

**Problem:** No way to measure if optimization is working.

**Why it happens:** "Token estimation is too complex" or "Not worth the effort."

**Fix:** Add simple token estimation (1 token ≈ 4 chars) to responses.

**See:** [references/anti-patterns.md](references/anti-patterns.md) for detailed anti-pattern analysis.

## Common Rationalizations (And Why They're Wrong)

Pressure testing revealed these bypass patterns. If you catch yourself thinking these thoughts, reconsider:

| Rationalization                   | Reality                                                                                                               |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| "Ship first, optimize later"      | "Later" rarely comes. Retrofitting progressive loading is 3x harder than building it right. Technical debt compounds. |
| "Need usage data first"           | You already know: 50+ tools = 40k+ tokens = problems. The data is the math.                                           |
| "It's just an optimization"       | 80% context consumed at startup isn't optimization - it's functionality. Agents fail when context is exhausted.       |
| "YAGNI - users might not need it" | Users will hit context limits. The question is when, not if. 20+ tools makes this inevitable.                         |
| "We can always refactor"          | Refactoring 50+ tool files takes 2-3 days. Building progressive loading upfront takes 2-3 hours.                      |
| "Deadline is more important"      | A wrapper that degrades agent performance isn't meeting the deadline - it's shipping a problem.                       |

**When these rationalizations are actually valid:**

- < 5 tools: Progressive loading overhead isn't worth it
- Prototype/POC: Ship fast, throw away later (not production)
- Known short sessions: Context limits won't be hit

**When they're NOT valid (and you must resist):**

- 20+ tools: Progressive loading is **mandatory**, not optional
- Production wrapper: Users depend on it working well
- Long-running sessions: Context exhaustion is certain

## Validation Checklist

Before deploying a wrapper, verify:

- [ ] **Progressive loading implemented** - Zero tokens at session start
- [ ] **Response filtering applied** - Collections limited to 20-50 items with summary
- [ ] **Text fields truncated** - Large fields (>500 chars) truncated with suffix
- [ ] **Nested resources suppressed** - Graph relationships loaded on-demand
- [ ] **Token estimation included** - Visibility into optimization impact
- [ ] **Documentation updated** - Users understand filtering behavior
- [ ] **Tests verify filtering** - Unit tests confirm token reduction patterns work

**See:** [references/validation-checklist.md](references/validation-checklist.md) for complete validation criteria.

## Real-World Example: Linear MCP Wrapper

**Before optimization:**

- Session start: **46,000 tokens** (50 tool definitions loaded)
- `listIssues`: **100,000 tokens** (500 issues × 200 tokens each)
- Total: **146,000 tokens** before any meaningful work

**After optimization:**

- Session start: **0 tokens** (filesystem discovery only)
- `listIssues`: **1,000 tokens** (summary + 20 issues)
- Total: **1,000 tokens** (99.3% reduction)

**Patterns applied:**

1. Progressive loading → 46,000 → 0 tokens at startup
2. Summary + Limited Items → 100,000 → 1,000 tokens per call
3. Field truncation → 200 → 50 tokens per issue
4. Nested resource suppression → Removed project/team/labels from default response

**See:** [examples/linear-wrapper-optimization.md](examples/linear-wrapper-optimization.md) for complete implementation.

## Performance Impact

Research from production wrapper deployments:

| Metric                 | Before | After | Impact               |
| ---------------------- | ------ | ----- | -------------------- |
| Session startup tokens | 46,000 | 0     | 99% reduction        |
| Avg tokens per call    | 50,000 | 600   | 98.8% reduction      |
| Context window usage   | 80%    | 8%    | 10x more headroom    |
| Agent task performance | 65%    | 92%   | +27% success rate    |
| Cost per 1000 calls    | $23.00 | $0.30 | 98.7% cost reduction |

**Key finding:** "Token usage alone explains 80% of performance variance in agent tasks."

**Sources:**

- LLM Context Window Management (getmaxim.ai)
- Token Optimization Strategies (glukhov.org)
- MCP Implementation Tips (nearform.com)

**See:** [references/performance-benchmarks.md](references/performance-benchmarks.md) for detailed performance data.

## Progressive Disclosure

**This file (<500 lines)** provides core patterns and decision-making guidance.

**For detailed implementation:**

- [references/progressive-loading-examples.md](references/progressive-loading-examples.md) - Complete code examples
- [references/response-filtering-patterns.md](references/response-filtering-patterns.md) - Advanced filtering techniques
- [references/token-estimation.md](references/token-estimation.md) - Accurate token counting
- [references/architecture-decision-tree.md](references/architecture-decision-tree.md) - Detailed decision criteria
- [references/anti-patterns.md](references/anti-patterns.md) - Common mistakes and fixes
- [references/validation-checklist.md](references/validation-checklist.md) - Complete validation criteria
- [references/performance-benchmarks.md](references/performance-benchmarks.md) - Production performance data
- [examples/linear-wrapper-optimization.md](examples/linear-wrapper-optimization.md) - Real-world case study

## Related Skills

| Skill                     | Access Method                                                                                  | Purpose                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **creating-mcp-wrappers** | `Read(".claude/skill-library/claude/mcp-management/creating-mcp-wrappers/SKILL.md")` (LIBRARY) | TDD workflow for implementing MCP wrappers |
| **managing-mcp-wrappers** | `Read(".claude/skill-library/.../managing-mcp-wrappers/SKILL.md")` (LIBRARY)                   | Lifecycle management for existing wrappers |
| **gateway-mcp-tools**     | `skill: "gateway-mcp-tools"` (CORE)                                                            | Router for MCP tool discovery              |
| **developing-with-tdd**   | `skill: "developing-with-tdd"` (CORE)                                                          | TDD methodology for implementation         |

## Changelog

For historical changes, see [`.history/CHANGELOG`](.history/CHANGELOG).
