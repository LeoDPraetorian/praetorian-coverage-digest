---
name: mcp-tools-1password
description: Use when accessing 1password services - provides 4 tools for get-item, list-items, read-secret, and more. References mcp-tools-registry for Bash + tsx execution patterns. Enables granular agent access control.
allowed-tools: Read, Bash
skills: [mcp-tools-registry]
---

# 1password MCP Tools

**GRANULAR ACCESS CONTROL:** Include this skill to give agent 1password access ONLY.

> **Execution patterns:** See mcp-tools-registry for Bash + npx tsx usage
> This skill provides 1password-specific tool catalog.

## Purpose

Enable granular agent access control for 1password operations.

**Include this skill when:** Agent needs 1password access
**Exclude this skill when:** Agent should NOT access 1password

## Available Tools (Auto-discovered: 4 wrappers)

### get-item
- **Purpose:** MCP wrapper for get-item
- **Import:** `import { getItem } from './.claude/tools/1password/get-item.ts'`
- **Token cost:** ~unknown tokens

### list-items
- **Purpose:** MCP wrapper for list-items
- **Import:** `import { listItems } from './.claude/tools/1password/list-items.ts'`
- **Token cost:** ~unknown tokens

### read-secret
- **Purpose:** MCP wrapper for read-secret
- **Import:** `import { readSecret } from './.claude/tools/1password/read-secret.ts'`
- **Token cost:** ~unknown tokens

### run-with-secrets
- **Purpose:** MCP wrapper for run-with-secrets
- **Import:** `import { runWithSecrets } from './.claude/tools/1password/run-with-secrets.ts'`
- **Token cost:** ~unknown tokens


## Quick Examples

See mcp-tools-registry for complete Bash + tsx execution patterns.

**Inline execution:**
```bash
# Note: 2>/dev/null suppresses MCP debug logs
npx tsx -e "(async () => {
  const { getItem } = await import('./.claude/tools/1password/get-item.ts');
  const result = await getItem.execute({ /* params */ });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

## Related Skills

- **mcp-tools-registry** - Execution patterns (REQUIRED - see for Bash + tsx usage)
- **mcp-code-create** - Create new wrappers
- **mcp-code-test** - Test wrappers
