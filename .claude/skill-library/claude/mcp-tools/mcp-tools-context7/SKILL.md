---
name: mcp-tools-context7
description: Use when accessing context7 services - provides 2 tools for get-library-docs, resolve-library-id. References mcp-tools-registry for Bash + tsx execution patterns. Enables granular agent access control.
allowed-tools: Read, Bash
skills: [mcp-tools-registry]
---

# Context7 MCP Tools

**GRANULAR ACCESS CONTROL:** Include this skill to give agent context7 access ONLY.

> **Execution patterns:** See mcp-tools-registry for Bash + npx tsx usage
> This skill provides context7-specific tool catalog.

## Purpose

Enable granular agent access control for context7 operations.

**Include this skill when:** Agent needs context7 access
**Exclude this skill when:** Agent should NOT access context7

## Available Tools (Auto-discovered: 2 wrappers)

### get-library-docs

- **Purpose:** Wrapper for context7 get-library-docs tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { getLibraryDocs } from './.claude/tools/context7/get-library-docs.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**

```typescript
interface GetLibraryDocsInput {
  context7CompatibleLibraryID: string;
}
```

**Returns:**

```typescript
interface GetLibraryDocsOutput {
  libraryName: string; // Library name derived from libraryId
  libraryId: string; // Context7 library ID
  content: string; // Documentation content (rawDocs)
  fetchedAt: string; // ISO timestamp when docs were fetched
  version?: string; // Library version if detected
  mode: enum; // Documentation mode used
  topic?: string; // Topic filter applied
  page: number; // Page number
  estimatedTokens: number; // Estimated token count
}
```

### resolve-library-id

- **Purpose:** Wrapper for context7 resolve-library-id tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { resolveLibraryId } from './.claude/tools/context7/resolve-library-id.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**

```typescript
interface ResolveLibraryIdInput {
  libraryName: string;
}
```

**Returns:**

```typescript
interface ResolveLibraryIdOutput {
  libraries: array;
  name: string;
  description?: string;
  codeSnippets?: number;
  sourceReputation?: enum;
  benchmarkScore?: number;
}
```

## Quick Examples

See mcp-tools-registry for complete Bash + tsx execution patterns.

**Inline execution:**

```bash
# Note: 2>/dev/null suppresses MCP debug logs
npx tsx -e "(async () => {
  const { getLibraryDocs } = await import('./.claude/tools/context7/get-library-docs.ts');
  const result = await getLibraryDocs.execute({ /* params */ });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

## Related Skills

- **mcp-tools-registry** - Execution patterns (REQUIRED - see for Bash + tsx usage)
- **mcp-code-create** - Create new wrappers
- **mcp-code-test** - Test wrappers
