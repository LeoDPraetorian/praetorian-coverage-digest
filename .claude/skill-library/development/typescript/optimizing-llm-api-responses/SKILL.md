---
name: optimizing-llm-api-responses
description: Use when designing APIs or wrappers that will be consumed by LLMs/agents - covers token reduction strategies, response filtering, field selection, truncation patterns, and structured output design for optimal context window usage
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Optimizing LLM API Responses

**Design token-efficient APIs and wrappers for LLM consumption with response filtering, field selection, and structured output patterns.**

## When to Use

Use this skill when:

- Creating MCP tool wrappers that return API data
- Designing backend APIs that will be consumed by AI agents
- Wrapping third-party APIs for LLM consumption
- Optimizing existing endpoints that cause context window issues
- Building integrations where agents need filtered, not full, responses

**Important:** You MUST use TodoWrite before starting to track all implementation steps.

**Critical question**: "Will an LLM consume this API response?"
→ If yes, optimize for token efficiency from the start.

## Quick Reference

| Strategy               | Token Reduction | Complexity | When to Use                           |
| ---------------------- | --------------- | ---------- | ------------------------------------- |
| Response Filtering     | 80-90%          | Low        | Always - first line of defense        |
| Field Selection        | 50-70%          | Medium     | When callers need different subsets   |
| Truncation             | 60-80%          | Low        | For large text fields                 |
| Structured Output      | 30-50%          | Low        | Replace verbose natural language      |
| Progressive Disclosure | 90-95%          | High       | For hierarchical data (summary first) |

## Why This Matters

Research shows that **"model attention is not uniform across long sequences... performance grows increasingly unreliable as input length grows"** (Chroma Context Rot study).

**Real impact**:

- Unfiltered API response: 10,000 tokens → Context window exhausted in 20 calls
- Filtered response: 1,000 tokens → Context window supports 200 calls
- Result: 10x more operations per session, faster responses, lower costs

## Core Patterns

### 1. Response Filtering (Essential)

**Default pattern for all LLM-consumed APIs:**

```typescript
// ❌ BEFORE: Return entire API response (10,000 tokens)
async function getAssets() {
  return await api.getAssets();
}

// ✅ AFTER: Filter to essential fields (1,000 tokens)
async function getAssets() {
  const assets = await api.getAssets();
  return {
    summary: { total: assets.length, returned: 20 },
    items: assets.slice(0, 20).map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      // Omit: createdAt, updatedAt, metadata, audit trails, internal IDs
    })),
  };
}
```

**Filter out**:

- Audit timestamps (`createdAt`, `updatedAt`, `lastModified`)
- Internal IDs that agents don't need
- Metadata and system fields
- Nested objects beyond 2-3 levels
- Arrays with 50+ items without pagination

### 2. Field Selection (Caller-Driven)

**Let callers specify needed fields:**

```typescript
interface QueryOptions {
  fields?: ("id" | "name" | "status" | "metadata")[];
  limit?: number;
}

async function getAssets(options: QueryOptions = {}) {
  const { fields = ["id", "name", "status"], limit = 20 } = options;

  const assets = await api.getAssets();
  return assets
    .slice(0, limit)
    .map((asset) => Object.fromEntries(fields.map((field) => [field, asset[field]])));
}
```

**Usage**:

```typescript
// Agent needs only IDs and names
await getAssets({ fields: ["id", "name"], limit: 50 });

// Agent needs full detail for 10 items
await getAssets({ fields: ["id", "name", "status", "metadata"], limit: 10 });
```

### 3. Truncation with Indicators

**For large text fields:**

```typescript
const MAX_CHARS = 8000;

function truncateWithIndicator(content: string, maxChars = MAX_CHARS): string {
  if (content.length <= maxChars) {
    return content;
  }
  return content.substring(0, maxChars) + "\n\n... [truncated for token efficiency]";
}

// Usage
return {
  id: doc.id,
  title: doc.title,
  content: truncateWithIndicator(doc.content, 5000),
};
```

**Token estimation**: ~1 token ≈ 4 characters

### 4. Structured Over Verbose

**Use JSON structures instead of natural language:**

```typescript
// ❌ Verbose natural language (100+ tokens)
return "The user John Smith with ID 123 was created on January 1st 2024 and has 5 active assets...";

// ✅ Structured JSON (20 tokens)
return {
  id: "123",
  name: "John Smith",
  created: "2024-01-01",
  activeAssets: 5,
};
```

### 5. Progressive Disclosure

**Return summary first, details on demand:**

```typescript
// Initial call: Summary only
async function getVulnerabilitySummary() {
  const vulns = await api.getVulnerabilities();
  return {
    summary: {
      total: vulns.length,
      critical: vulns.filter((v) => v.severity === "critical").length,
      high: vulns.filter((v) => v.severity === "high").length,
      medium: vulns.filter((v) => v.severity === "medium").length,
    },
  };
}

// Follow-up call: Details for specific severity
async function getVulnerabilityDetails(severity: string) {
  const vulns = await api.getVulnerabilities();
  return vulns
    .filter((v) => v.severity === severity)
    .slice(0, 20)
    .map((v) => ({ id: v.id, title: v.title, cve: v.cve }));
}
```

**Agent workflow**:

1. Call `getVulnerabilitySummary()` → 50 tokens
2. See "5 critical vulnerabilities"
3. Call `getVulnerabilityDetails('critical')` → 500 tokens
4. Total: 550 tokens vs 15,000 for full dump

## Token Transparency

**Include token estimates in responses:**

```typescript
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function addTokenMeta<T>(data: T): T & { _meta: { estimatedTokens: number } } {
  const json = JSON.stringify(data);
  return {
    ...data,
    _meta: { estimatedTokens: estimateTokens(json) }
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
  _meta: { estimatedTokens: 1250 }
}
```

**Why**: Helps agents make informed decisions about which APIs to call.

## Anti-Patterns

**Never include in LLM responses**:

- ❌ Audit logs and full change history
- ❌ Base64 encoded images/files
- ❌ Nested objects 5+ levels deep
- ❌ Arrays with 100+ unfiltered items
- ❌ Internal database IDs that have no meaning to agents
- ❌ Full stack traces (truncate to last 10 frames)
- ❌ Verbose error messages (use error codes + brief description)

## Integration with Existing Patterns

### MCP Tool Wrappers

When wrapping MCP servers, apply filtering at the wrapper layer:

```typescript
// In mcp-wrapper/tools/resource-operations.ts
async function listResources(params: ListResourcesParams) {
  const raw = await mcpServer.listResources(params);

  // Filter for LLM consumption
  return {
    resources: raw.resources.slice(0, 20).map((r) => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
      // Omit: mimeType, annotations, internal metadata
    })),
    _meta: {
      total: raw.resources.length,
      returned: Math.min(20, raw.resources.length),
    },
  };
}
```

**See**: [MCP Tool Wrapper Patterns](references/mcp-integration-patterns.md)

### GraphQL APIs

Use GraphQL's field selection to query only needed data:

```typescript
// Let caller specify fields
const query = `
  query GetAssets($fields: [String!]!) {
    assets(limit: 20) {
      ...on Asset {
        ${fields.join("\n        ")}
      }
    }
  }
`;
```

**See**: [GraphQL Optimization Patterns](references/graphql-patterns.md)

## Validation Checklist

Before deploying an LLM-consumed API:

- [ ] Response size < 2,000 tokens for typical queries
- [ ] Pagination implemented (default limit ≤ 20 items)
- [ ] Field selection available for callers
- [ ] Audit fields removed (created/updated timestamps)
- [ ] Large text fields truncated with indicators
- [ ] Token estimate included in `_meta` field
- [ ] Progressive disclosure for hierarchical data
- [ ] Structured JSON (not verbose natural language)

## Related Skills

| Skill                                     | Purpose                                      |
| ----------------------------------------- | -------------------------------------------- |
| `orchestrating-mcp-development` (LIBRARY) | Complete MCP wrapper creation workflow       |
| `designing-progressive-loading-wrappers`  | Two-tier loading for context efficiency      |
| `implementing-graphql-clients`            | GraphQL client patterns with field selection |
| `implementing-result-either-pattern`      | Error handling without verbose messages      |

## Deep Dives

**For detailed implementation patterns, see**:

- [MCP Integration Patterns](references/mcp-integration-patterns.md) - Applying token optimization to MCP wrappers
- [GraphQL Patterns](references/graphql-patterns.md) - Field selection and query optimization
- [Progressive Disclosure Examples](references/progressive-disclosure-examples.md) - Real-world hierarchical response patterns
- [Token Estimation](references/token-estimation.md) - Accurate token counting across different content types
- [Benchmarks](references/benchmarks.md) - Before/after comparisons showing token reduction impact

## Research Sources

This skill synthesizes patterns from:

- Chroma Context Rot study (model attention degradation)
- Anthropic Context Engineering Guide
- Token Efficiency Techniques (medium.com/@anicomanesh)
- Context Window Management (getmaxim.ai)
- Internal Chariot MCP wrapper implementations

## Changelog

See `.history/CHANGELOG` for version history.
