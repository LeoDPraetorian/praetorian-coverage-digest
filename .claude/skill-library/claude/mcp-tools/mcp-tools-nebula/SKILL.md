---
name: mcp-tools-nebula
description: Use when accessing nebula services - provides 5 tools for access-key-to-account-id, apollo, public-resources, and more. References mcp-tools-registry for Bash + tsx execution patterns. Enables granular agent access control.
allowed-tools: Read, Bash
skills: [mcp-tools-registry]
---

# Nebula MCP Tools

**GRANULAR ACCESS CONTROL:** Include this skill to give agent nebula access ONLY.

> **Execution patterns:** See mcp-tools-registry for Bash + npx tsx usage
> This skill provides nebula-specific tool catalog.

## Purpose

Enable granular agent access control for nebula operations.

**Include this skill when:** Agent needs nebula access
**Exclude this skill when:** Agent should NOT access nebula

## Available Tools (Auto-discovered: 5 wrappers)

### access-key-to-account-id
- **Purpose:** MCP wrapper for access-key-to-account-id
- **Import:** `import { accessKeyToAccountId } from './.claude/tools/nebula/access-key-to-account-id.ts'`
- **Token cost:** ~unknown tokens

**Returns:**
```typescript
interface AccessKeyToAccountIdOutput {
  access_key_id?: string;
  account_id?: string;
  valid?: boolean;
  results?: array;
  account_id?: string;
  valid?: boolean;
}
```

### apollo
- **Purpose:** MCP wrapper for apollo
- **Import:** `import { apollo } from './.claude/tools/nebula/apollo.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**
```typescript
interface ApolloInput {
  profile: string;
}
```

**Returns:**
```typescript
interface ApolloOutput {
  graph?: object;
  edges?: number;
  clusters?: number;
}
```

### public-resources
- **Purpose:** MCP wrapper for public-resources
- **Import:** `import { publicResources } from './.claude/tools/nebula/public-resources.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**
```typescript
interface PublicResourcesInput {
  profile: string;
}
```

**Returns:**
```typescript
interface PublicResourcesOutput {
  resources?: array;
  name?: string;
  public?: boolean;
  region?: string;
  ip?: string;
}
```

### summary
- **Purpose:** MCP wrapper for summary
- **Import:** `import { summary } from './.claude/tools/nebula/summary.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**
```typescript
interface SummaryInput {
  profile: string;
}
```

**Returns:**
```typescript
interface SummaryOutput {
  account_id?: string;
  regions?: array;
  resources: record;
  costs?: record;
}
```

### whoami
- **Purpose:** MCP wrapper for whoami
- **Import:** `import { whoami } from './.claude/tools/nebula/whoami.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**
```typescript
interface WhoamiInput {
  action: string;
}
```

**Returns:**
```typescript
interface WhoamiOutput {
  identity?: object;
  account?: string;
  user_id?: string;
}
```


## Quick Examples

See mcp-tools-registry for complete Bash + tsx execution patterns.

**Inline execution:**
```bash
# Note: 2>/dev/null suppresses MCP debug logs
npx tsx -e "(async () => {
  const { accessKeyToAccountId } = await import('./.claude/tools/nebula/access-key-to-account-id.ts');
  const result = await accessKeyToAccountId.execute({ /* params */ });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

## Related Skills

- **mcp-tools-registry** - Execution patterns (REQUIRED - see for Bash + tsx usage)
- **mcp-code-create** - Create new wrappers
- **mcp-code-test** - Test wrappers
