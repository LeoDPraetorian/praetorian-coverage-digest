---
name: mcp-tools-perplexity
description: Use when accessing perplexity services - provides 4 tools for perplexity_ask, perplexity_reason, perplexity_research, and more. References mcp-tools-registry for Bash + tsx execution patterns. Enables granular agent access control.
allowed-tools: Read, Bash
skills: [mcp-tools-registry]
---

# Perplexity MCP Tools

**GRANULAR ACCESS CONTROL:** Include this skill to give agent perplexity access ONLY.

> **Execution patterns:** See mcp-tools-registry for Bash + npx tsx usage
> This skill provides perplexity-specific tool catalog.

## Purpose

Enable granular agent access control for perplexity operations.

**Include this skill when:** Agent needs perplexity access
**Exclude this skill when:** Agent should NOT access perplexity

## Available Tools (Auto-discovered: 4 wrappers)

### perplexity_ask

- **Purpose:** MCP wrapper for perplexity_ask
- **Import:** `import { perplexity_ask } from '$ROOT/.claude/tools/perplexity/perplexity_ask.ts'`
- **Token cost:** ~unknown tokens

### perplexity_reason

- **Purpose:** MCP wrapper for perplexity_reason
- **Import:** `import { perplexity_reason } from '$ROOT/.claude/tools/perplexity/perplexity_reason.ts'`
- **Token cost:** ~unknown tokens

### perplexity_research

- **Purpose:** MCP wrapper for perplexity_research
- **Import:** `import { perplexity_research } from '$ROOT/.claude/tools/perplexity/perplexity_research.ts'`
- **Token cost:** ~unknown tokens

### perplexity_search

- **Purpose:** MCP wrapper for perplexity_search
- **Import:** `import { perplexity_search } from '$ROOT/.claude/tools/perplexity/perplexity_search.ts'`
- **Token cost:** ~unknown tokens

## Quick Examples

See mcp-tools-registry for complete Bash + tsx execution patterns.

**Inline execution:**

```bash
# Note: 2>/dev/null suppresses MCP debug logs
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { perplexity_ask } = await import('$ROOT/.claude/tools/perplexity/perplexity_ask.ts');
  const result = await perplexity_ask.execute({ /* params */ });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

## Related Skills

- **mcp-tools-registry** - Execution patterns (REQUIRED - see for Bash + tsx usage)
- **mcp-code-create** - Create new wrappers
- **mcp-code-test** - Test wrappers
