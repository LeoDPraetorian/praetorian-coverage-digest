---
name: mcp-tools-chariot
description: Use when accessing chariot services - provides 2 tools for query, schema. References mcp-tools-registry for Bash + tsx execution patterns. Enables granular agent access control.
allowed-tools: Read, Bash
skills: [mcp-tools-registry]
---

# Chariot MCP Tools

**GRANULAR ACCESS CONTROL:** Include this skill to give agent chariot access ONLY.

> **Execution patterns:** See mcp-tools-registry for Bash + npx tsx usage
> This skill provides chariot-specific tool catalog.

## Purpose

Enable granular agent access control for chariot operations.

**Include this skill when:** Agent needs chariot access
**Exclude this skill when:** Agent should NOT access chariot

## Available Tools (Auto-discovered: 2 wrappers)

### query
- **Purpose:** MCP wrapper for query
- **Import:** `import { query } from './.claude/tools/chariot/query.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**
```typescript
interface QueryInput {
  query: string;
  tree?: boolean;
}
```

**Returns:**
```typescript
interface QueryOutput {
  results: array;
  totalCount: number;
  page?: number;
  hasMore?: boolean;
  estimatedTokens: number;
}
```

### schema
- **Purpose:** MCP wrapper for schema
- **Import:** `import { schema } from './.claude/tools/chariot/schema.ts'`
- **Token cost:** ~unknown tokens

**Returns:**
```typescript
interface SchemaOutput {
  entityTypes: array;
  propertyCount: number;
  relationshipCount: number;
  keyProperties: array;
}
```


## Quick Examples

See mcp-tools-registry for complete Bash + tsx execution patterns.

**Inline execution:**
```bash
# Note: 2>/dev/null suppresses MCP debug logs
npx tsx -e "(async () => {
  const { query } = await import('./.claude/tools/chariot/query.ts');
  const result = await query.execute({ /* params */ });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

## Related Skills

- **mcp-tools-registry** - Execution patterns (REQUIRED - see for Bash + tsx usage)
- **mcp-code-create** - Create new wrappers
- **mcp-code-test** - Test wrappers
