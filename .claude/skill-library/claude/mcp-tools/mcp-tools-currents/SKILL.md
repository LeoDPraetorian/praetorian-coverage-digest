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

**TodoWrite Mandate:** You MUST use TodoWrite before starting to track all workflow steps when using these tools for multi-step operations (e.g., debugging failed tests across multiple runs).

## Available Tools (Auto-discovered: 8 wrappers)

### get-projects

- **Purpose:** MCP wrapper for get-projects
- **Import:** `import { getProjects } from '$ROOT/.claude/tools/currents/get-projects.ts'`
- **Token cost:** ~unknown tokens

### get-run-details

- **Purpose:** Get detailed information about a specific test run (status, test counts, duration)
- **Required parameter:** `runId` (string) - The run identifier
- **Import:** `import { getRunDetails } from '$ROOT/.claude/tools/currents/get-run-details.ts'`
- **Token cost:** ~unknown tokens
- **Use when:** You have a run ID and want to see its overall statistics

### get-runs

- **Purpose:** MCP wrapper for get-runs
- **Import:** `import { getRuns } from '$ROOT/.claude/tools/currents/get-runs.ts'`
- **Token cost:** ~unknown tokens

### get-spec-files-performance

- **Purpose:** MCP wrapper for get-spec-files-performance
- **Import:** `import { getSpecFilesPerformance } from '$ROOT/.claude/tools/currents/get-spec-files-performance.ts'`
- **Token cost:** ~unknown tokens

### get-spec-instance

- **Purpose:** MCP wrapper for get-spec-instance
- **Import:** `import { getSpecInstance } from '$ROOT/.claude/tools/currents/get-spec-instance.ts'`
- **Token cost:** ~unknown tokens

### get-test-results

- **Purpose:** Get test execution results for a specific test signature (for debugging failed tests)
- **Required parameter:** `signature` (string) - Test identifier from get-tests-signatures
- **Optional parameters:** `status`, `authors`, `branches`, `tags`, `cursor`, `limit`
- **Import:** `import { getTestResults } from '$ROOT/.claude/tools/currents/get-test-results.ts'`
- **Token cost:** ~unknown tokens
- **Use when:** You have a test signature and want to see its execution history

### get-tests-performance

- **Purpose:** MCP wrapper for get-tests-performance
- **Import:** `import { getTestsPerformance } from '$ROOT/.claude/tools/currents/get-tests-performance.ts'`
- **Token cost:** ~unknown tokens

### get-tests-signatures

- **Purpose:** MCP wrapper for get-tests-signatures
- **Import:** `import { getTestsSignatures } from '$ROOT/.claude/tools/currents/get-tests-signatures.ts'`
- **Token cost:** ~unknown tokens

## Tool Mapping Guide

**CRITICAL:** Choose the correct tool for your use case:

| Your Goal              | Tool to Use                  | Required Parameter | Example Value              |
| ---------------------- | ---------------------------- | ------------------ | -------------------------- |
| Get all projects       | `get-projects`               | none               | -                          |
| Get details for run X  | `get-run-details`            | `runId`            | `"run-abc123"`             |
| Get results for test Y | `get-test-results`           | `signature`        | `"spec-file.ts:test-name"` |
| Get latest runs        | `get-runs`                   | `projectId`        | `"proj-456"`               |
| Get test signatures    | `get-tests-signatures`       | `projectId`        | `"proj-456"`               |
| Get test performance   | `get-tests-performance`      | `projectId`        | `"proj-456"`               |
| Get spec performance   | `get-spec-files-performance` | `projectId`        | `"proj-456"`               |
| Get spec instance      | `get-spec-instance`          | `instanceId`       | `"inst-789"`               |

**Common confusion:**

- ❌ WRONG: "Get test results for run X" → `get-test-results` with `runId`
- ✅ CORRECT: "Get test results for run X" → `get-run-details` with `runId`
- ✅ CORRECT: "Get results for test Y" → `get-test-results` with `signature`

## Quick Examples

See mcp-tools-registry for complete Bash + tsx execution patterns.

**CRITICAL: Dynamic repository root detection**

All tool executions MUST use dynamic root detection to work from any subdirectory:

```bash
# ✅ CORRECT: Works from any subdirectory including submodules
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { getProjects } = await import('$ROOT/.claude/tools/currents/get-projects.ts');
  const result = await getProjects.execute({});
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Why this works:**
- `--show-superproject-working-tree --show-toplevel` returns super-repo root from submodules
- `| head -1` picks first non-empty result
- `$ROOT` expands in double-quoted string before tsx sees it
- No `cd` needed = no "Shell cwd was reset" messages

## Comprehensive Code Examples

### Example 1: Get Run Details (runId parameter)

```bash
# Get details for a specific run
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { getRunDetails } = await import('$ROOT/.claude/tools/currents/get-run-details.ts');
  const result = await getRunDetails.execute({ runId: 'run-abc123' });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### Example 2: Get Test Results (signature parameter)

```bash
# Get execution history for a specific test
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { getTestResults } = await import('$ROOT/.claude/tools/currents/get-test-results.ts');
  const result = await getTestResults.execute({
    signature: 'spec-file.ts:test-name',
    status: 'failed',
    limit: 5
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### Example 3: Complete Workflow

```bash
# 1. Get projects
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { getProjects } = await import('$ROOT/.claude/tools/currents/get-projects.ts');
  const projects = await getProjects.execute({});
  console.log('Projects:', projects.projects.map(p => p.id));
})();" 2>/dev/null

# 2. Get latest runs for project
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { getRuns } = await import('$ROOT/.claude/tools/currents/get-runs.ts');
  const runs = await getRuns.execute({ projectId: 'proj-456' });
  console.log('Latest runs:', runs.runs.map(r => r.id));
})();" 2>/dev/null

# 3. Get run details
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { getRunDetails } = await import('$ROOT/.claude/tools/currents/get-run-details.ts');
  const details = await getRunDetails.execute({ runId: 'run-abc123' });
  console.log('Run stats:', details.run);
})();" 2>/dev/null
```

## Related Skills

- **mcp-tools-registry** - Execution patterns (REQUIRED - see for Bash + tsx usage)
- **mcp-code-create** - Create new wrappers
- **mcp-code-test** - Test wrappers
