---
description: Natural language interface for Currents - just describe what you want, no syntax to memorize!
argument-hint: <describe your operation naturally>
allowed-tools: Bash, Read, Skill
---

# Currents Test Orchestration & Reporting

**Speak naturally!** Just describe what you want after `/currents` - I'll figure it out.

## What You Can Do

- **Get recent runs** - See latest test executions
- **Get run details** - Deep dive into specific run with stats
- **Get failed tests** - Find which tests failed in a run
- **Get test performance** - Analyze slow tests and bottlenecks
- **Get spec performance** - File-level performance metrics
- **List projects** - See all Currents projects

I'll automatically parse your natural language and execute the right tool.

---

## Natural Language Examples

### Getting Recent Runs

```bash
# All of these work:
/currents get recent runs
/currents show me the last 5 runs
/currents list recent test runs
/currents what are the latest runs
```

### Getting Run Details

```bash
# Any of these:
/currents get run details for <runId>
/currents show me run <runId>
/currents what happened in run <runId>
/currents get stats for run <runId>
```

### Getting Failed Tests

```bash
# Multiple ways:
/currents get failed tests from latest run
/currents show me failures in run <runId>
/currents what tests failed in the latest run
/currents get test results for run <runId>
```

### Getting Performance Data

```bash
# Performance queries:
/currents show slow tests
/currents get test performance metrics
/currents which tests are slowest
/currents show spec file performance
```

### Listing Projects

```bash
# Simple queries:
/currents list projects
/currents show all projects
/currents what projects do we have
```

## How It Works

1. **You describe** your intent naturally (no rigid syntax required)
2. **I read** the mcp-tools-currents skill for available operations
3. **I parse** your input to extract operation, parameters, and intent
4. **I execute** the appropriate Currents wrapper with your parameters
5. **I display** clean results back to you

**No memorization needed!** Just tell me what you need in plain language.

## Implementation

When you invoke this command, I will:

### Step 1: Detect Repository Root and Read the Currents Skill

**CRITICAL:** This command works from any directory (including submodules like `modules/chariot/`).

First, detect the super-repo root:

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
```

Then read the skill file:

```bash
Read: $ROOT/.claude/skill-library/claude/mcp-tools/mcp-tools-currents/SKILL.md
```

This gives me context about available tools and execution patterns.

### Step 2: Parse Your Natural Language

I'll analyze your input for:

- **Operation type**: runs, run-details, test-results, performance, projects
- **Parameters**: projectId, runId, limit, cursor, filters
- **Intent**: What you're trying to accomplish

### Step 3: Execute the Appropriate Tool

**All commands use dynamic repository root detection** to work from any directory:

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "..." 2>/dev/null
```

Based on your request, I'll execute one of:

**get-projects** - List all Currents projects

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { getProjects } = await import('$ROOT/.claude/tools/currents/get-projects.ts');
  const result = await getProjects.execute({});
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**get-runs** - Get recent test runs

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { getRuns } = await import('$ROOT/.claude/tools/currents/get-runs.ts');
  const result = await getRuns.execute({
    projectId: '1mwNCW',  // Chariot E2E project
    limit: 10
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**get-run-details** - Get specific run statistics

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { getRunDetails } = await import('$ROOT/.claude/tools/currents/get-run-details.ts');
  const result = await getRunDetails.execute({
    runId: 'abc123'
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**get-test-results** - Get test execution results

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { getTestResults } = await import('$ROOT/.claude/tools/currents/get-test-results.ts');
  const result = await getTestResults.execute({
    signature: 'spec-file.ts:test-name',
    status: 'failed',
    limit: 10
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**get-tests-performance** - Get performance metrics

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { getTestsPerformance } = await import('$ROOT/.claude/tools/currents/get-tests-performance.ts');
  const result = await getTestsPerformance.execute({
    projectId: '1mwNCW',
    limit: 10
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**get-spec-files-performance** - Get file-level performance

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { getSpecFilesPerformance } = await import('$ROOT/.claude/tools/currents/get-spec-files-performance.ts');
  const result = await getSpecFilesPerformance.execute({
    projectId: '1mwNCW'
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**get-spec-instance** - Get spec debugging data

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { getSpecInstance } = await import('$ROOT/.claude/tools/currents/get-spec-instance.ts');
  const result = await getSpecInstance.execute({
    instanceId: 'instance123'
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**get-tests-signatures** - Get test signatures for filtering

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { getTestsSignatures } = await import('$ROOT/.claude/tools/currents/get-tests-signatures.ts');
  const result = await getTestsSignatures.execute({
    projectId: '1mwNCW'
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### Step 4: Format and Display Results

I'll parse the JSON response and display it in a clean, readable format with:

- Summary of key metrics
- Failed test details (if any)
- Performance insights (if requested)
- Links to Currents dashboard

## Default Project ID

For Chariot E2E tests, the default project ID is: **`1mwNCW`**

If you don't specify a project, I'll use this default.

## Authentication

Currents tools use API key authentication configured in `$ROOT/.claude/tools/config/credentials.json`:

```json
{
  "currents": {
    "apiKey": "YOUR_API_KEY_HERE"
  }
}
```

**Get your API key from:** https://app.currents.dev/settings/api-keys

## What You Can Query

### Run Information

- Recent test runs with status and timing
- Specific run details with pass/fail counts
- Run statistics and metadata

### Test Results

- Individual test results from a run
- Failed test details with error messages
- Flaky test identification

### Performance Metrics

- Slowest tests across all runs
- File-level performance data
- Performance trends over time

### Projects

- List all Currents projects
- Project configurations

## Tips for Best Results

- **Use natural language**: "show me failed tests" works just as well as "get test results"
- **Be specific about runs**: Provide run ID if you want details on a specific run
- **Default to latest**: If you don't specify, I'll get the most recent data
- **Ask for what you need**: "show me why the tests failed" and I'll figure out the right tools

---

## Technical Reference

For developers or debugging, here are the underlying wrapper patterns:

### Authentication Setup

API key is read from `$ROOT/.claude/tools/config/credentials.json`:

```json
{
  "currents": {
    "apiKey": "${CURRENTS_API_KEY}"
  }
}
```

Or set via environment variable:

```bash
export CURRENTS_API_KEY="your-api-key"
```

### Error Handling

- Filter out debug output with `2>/dev/null`
- Validate all string inputs against path traversal, command injection, and control chars
- Handle network errors and provide retry guidance
- Display clean JSON results

### Default Chariot Project

- **Project ID**: `1mwNCW`
- **Name**: "E2E Regression Tests"
