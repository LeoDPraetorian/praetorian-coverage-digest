---
name: mcp-tools-currents
description: Use when accessing currents services - provides 8 tools for get-projects, get-run-details, get-runs, and more. References mcp-tools-registry for Bash + tsx execution patterns. Enables granular agent access control.
allowed-tools: Read, Bash
skills: [mcp-tools-registry]
---

# Currents MCP Tools

**GRANULAR ACCESS CONTROL:** Include this skill to give agent currents access ONLY.

> **Execution patterns:** See mcp-tools-registry for Bash + npx tsx usage
> This skill provides currents-specific tool catalog.

## Purpose

Enable granular agent access control for currents operations.

**Include this skill when:** Agent needs currents access
**Exclude this skill when:** Agent should NOT access currents

## Available Tools (Auto-discovered: 8 wrappers)

### get-projects
- **Purpose:** MCP wrapper for get-projects
- **Import:** `import { getProjects } from './.claude/tools/currents/get-projects.ts'`
- **Token cost:** ~unknown tokens

### get-run-details
- **Purpose:** MCP wrapper for get-run-details
- **Import:** `import { getRunDetails } from './.claude/tools/currents/get-run-details.ts'`
- **Token cost:** ~unknown tokens

### get-runs
- **Purpose:** MCP wrapper for get-runs
- **Import:** `import { getRuns } from './.claude/tools/currents/get-runs.ts'`
- **Token cost:** ~unknown tokens

### get-spec-files-performance
- **Purpose:** MCP wrapper for get-spec-files-performance
- **Import:** `import { getSpecFilesPerformance } from './.claude/tools/currents/get-spec-files-performance.ts'`
- **Token cost:** ~unknown tokens

### get-spec-instance
- **Purpose:** MCP wrapper for get-spec-instance
- **Import:** `import { getSpecInstance } from './.claude/tools/currents/get-spec-instance.ts'`
- **Token cost:** ~unknown tokens

### get-test-results
- **Purpose:** MCP wrapper for get-test-results
- **Import:** `import { getTestResults } from './.claude/tools/currents/get-test-results.ts'`
- **Token cost:** ~unknown tokens

### get-tests-performance
- **Purpose:** MCP wrapper for get-tests-performance
- **Import:** `import { getTestsPerformance } from './.claude/tools/currents/get-tests-performance.ts'`
- **Token cost:** ~unknown tokens

### get-tests-signatures
- **Purpose:** MCP wrapper for get-tests-signatures
- **Import:** `import { getTestsSignatures } from './.claude/tools/currents/get-tests-signatures.ts'`
- **Token cost:** ~unknown tokens


## Quick Examples

See mcp-tools-registry for complete Bash + tsx execution patterns.

**Inline execution:**
```bash
# Note: 2>/dev/null suppresses MCP debug logs
npx tsx -e "(async () => {
  const { getProjects } = await import('./.claude/tools/currents/get-projects.ts');
  const result = await getProjects.execute({ /* params */ });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

## Related Skills

- **mcp-tools-registry** - Execution patterns (REQUIRED - see for Bash + tsx usage)
- **mcp-code-create** - Create new wrappers
- **mcp-code-test** - Test wrappers
