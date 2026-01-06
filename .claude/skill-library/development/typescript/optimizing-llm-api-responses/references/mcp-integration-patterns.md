# MCP Integration Patterns

**Applying token optimization to MCP tool wrappers.**

## Overview

MCP (Model Context Protocol) wrappers are a primary use case for token optimization. This reference covers practical patterns for filtering MCP server responses before returning them to LLM agents.

## Pattern 1: Resource Listing Filter

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
      estimatedTokens: estimateTokens(raw.resources.slice(0, 20)),
    },
  };
}
```

## Pattern 2: Tool Result Filtering

```typescript
async function executeTool(params: ExecuteToolParams) {
  const result = await mcpServer.executeTool(params);

  // Filter based on result type
  if (result.type === "text") {
    return {
      type: "text",
      content: truncateWithIndicator(result.content, 5000),
    };
  }

  if (result.type === "json") {
    return {
      type: "json",
      // Only return essential fields
      data: filterJsonResponse(result.data),
    };
  }
}
```

## Pattern 3: Prompt Template Optimization

```typescript
// MCP prompt templates should guide efficient responses
const promptTemplate = {
  name: "analyze-code",
  description: "Analyze code for patterns",
  arguments: [
    {
      name: "maxResults",
      description: "Maximum results to return (default: 10)",
      default: 10,
    },
  ],
};
```

## Integration with creating-mcp-wrappers

When using the `creating-mcp-wrappers` core skill, apply these patterns in the tool implementation phase.

## Checklist

- [ ] List operations paginated to ≤20 items
- [ ] Tool results truncated for large outputs
- [ ] Prompt templates include maxResults parameter
- [ ] \_meta field includes token estimates
- [ ] Internal MCP metadata filtered out

## Related

- Parent: [optimizing-llm-api-responses](../SKILL.md)
- See also: `creating-mcp-wrappers` (core skill)
