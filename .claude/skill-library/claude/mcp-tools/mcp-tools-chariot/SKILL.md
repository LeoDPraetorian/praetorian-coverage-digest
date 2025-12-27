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

## Common Operations with Parameters

### Query Assets by Status

```bash
npx tsx -e "(async () => {
  const { query } = await import('./.claude/tools/chariot/query.ts');
  const queryStructure = {
    node: {
      labels: ['Asset'],
      filters: [
        { field: 'status', operator: '=', value: 'A' }
      ]
    },
    limit: 100
  };
  const result = await query.execute({
    query: JSON.stringify(queryStructure),
    stack: process.env.CHARIOT_STACK || 'default',
    username: process.env.PRAETORIAN_CLI_USERNAME || 'user',
    tree: false
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Key parameters:**

- `query` (required) - JSON string of query structure (see below)
- `stack` (required) - Chariot stack name (from env: `CHARIOT_STACK`)
- `username` (required) - Username (from env: `PRAETORIAN_CLI_USERNAME`)
- `tree` (optional) - Return tree structure (default false)

**Query structure:**

```typescript
{
  node: {
    labels: ['Asset', 'Risk', 'Account'],     // Entity types
    filters: [
      { field: 'status', operator: '=', value: 'A' },
      { field: 'cvss', operator: '>', value: 7.0 }
    ],
    relationships: [...]  // Optional: traverse relationships
  },
  limit: 100,            // Max results
  orderBy: 'created',    // Sort field
  descending: true       // Sort direction
}
```

### Query Assets with Vulnerabilities

```bash
npx tsx -e "(async () => {
  const { query } = await import('./.claude/tools/chariot/query.ts');
  const queryStructure = {
    node: {
      labels: ['Asset'],
      relationships: [
        {
          label: 'HAS_VULNERABILITY',
          target: {
            labels: ['Risk'],
            filters: [
              { field: 'cvss', operator: '>=', value: 7.0 }
            ]
          }
        }
      ]
    },
    limit: 50
  };
  const result = await query.execute({
    query: JSON.stringify(queryStructure),
    stack: process.env.CHARIOT_STACK || 'default',
    username: process.env.PRAETORIAN_CLI_USERNAME || 'user',
    tree: true  // Include relationship tree
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### Get Schema Information

```bash
npx tsx -e "(async () => {
  const { schema } = await import('./.claude/tools/chariot/schema.ts');
  const result = await schema.execute({
    stack: process.env.CHARIOT_STACK || 'default',
    username: process.env.PRAETORIAN_CLI_USERNAME || 'user'
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Returns:** Entity types, property count, relationships, key properties

## Queryable Fields (allowedColumns)

**CRITICAL**: Graph queries MUST only use fields from `allowedColumns` (see CLAUDE.md for complete list).

**Common queryable fields:**

- **Identity**: `key`, `identifier`, `name`, `dns`, `value`
- **Status**: `status`, `class`, `type`, `source`, `origin`
- **Dates**: `created`, `updated`, `visited`
- **Security**: `cvss`, `epss`, `kev`, `exploit`, `priority`
- **Network**: `asname`, `asnumber`, `private`
- **Cloud**: `cloudService`, `cloudId`, `cloudAccount`, `cloudRoot`
- **Other**: `group`, `category`, `title`, `registrar`, `registrant`

**Common relationship labels:**

- `HAS_VULNERABILITY`
- `BELONGS_TO`
- `DISCOVERED_BY`
- `CONTAINS`
- `DEPENDS_ON`

## Quick Reference

See mcp-tools-registry for complete Bash + tsx execution patterns.

**Generic inline execution:**

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
