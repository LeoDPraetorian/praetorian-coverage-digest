---
description: Use when querying Chariot assets, jobs, or risks - just describe what you want
argument-hint: <describe your operation naturally>
allowed-tools: Bash, Read
---

# Chariot API Operations

**Speak naturally!** Access Chariot platform data through the Praetorian CLI.

## Natural Language Examples

### List Assets

```bash
# All of these work:
/chariot-api list all assets
/chariot-api show me assets
/chariot-api get all assets with prefix example.com
/chariot-api list assets of type domain
```

### Get Specific Asset

```bash
/chariot-api get asset example.com
/chariot-api show me asset details for example.com
/chariot-api fetch asset example.com
```

### List Risks

```bash
/chariot-api list all risks
/chariot-api show me high priority risks
/chariot-api get risks for asset example.com
```

### List Jobs

```bash
/chariot-api list all jobs
/chariot-api show me recent jobs
/chariot-api get job status for JOB-123
```

### Search Operations

```bash
/chariot-api search for assets matching "production"
/chariot-api find all assets with status active
```

### List Other Resources

```bash
/chariot-api list integrations
/chariot-api show me all seeds
/chariot-api list aegis agents
/chariot-api get capabilities
```

---

## How It Works

1. **You describe** your intent naturally (no rigid syntax required)
2. **I read** the Praetorian CLI skill for context and available operations
3. **I parse** your input to extract operation, resource type, and filters
4. **I execute** the appropriate wrapper with your parameters
5. **I display** clean, summarized results (token-optimized)

**No memorization needed!** Just tell me what you need in plain language.

---

## Implementation

When you invoke this command, I will:

1. Read the Praetorian CLI MCP tools skill for available operations:

```bash
Read: .claude/skill-library/claude/mcp-tools/mcp-tools-praetorian-cli/SKILL.md
```

2. Parse your natural language input to identify:
   - **Resource type**: assets, risks, jobs, seeds, integrations, etc.
   - **Operation**: list, get, search
   - **Filters**: key prefix, asset type, status, etc.

3. Execute the matching wrapper operation from the skill's documentation

4. Format and display token-optimized results with summaries

---

## What You Can Do

Based on the Praetorian CLI MCP (17 tools available):

**Asset Operations:**

- List all assets (paginated, filtered)
- Get specific asset by key
- Filter by asset type or key prefix
- View asset attributes

**Risk Operations:**

- List all risks
- Get specific risk by ID
- Filter by priority or status

**Job Operations:**

- List all jobs
- Get specific job status
- Monitor job progress

**Seed Operations:**

- List discovery seeds
- Get seed details

**Integration Operations:**

- List configured integrations
- View integration status

**Other Operations:**

- Search by query
- List Aegis agents
- List capabilities
- List API keys
- List preseeds

The skill will show me exactly how to execute your request!

---

## Authentication

The Praetorian CLI uses credentials from your environment:

**Credentials location**: `.env` or environment variables

- `PRAETORIAN_CLI_USERNAME`
- `PRAETORIAN_CLI_PASSWORD`

**Setup command** (if needed):

```bash
make user  # Generates test user credentials
```

Credentials are automatically loaded by the MCP wrapper.

---

## Tips for Best Results

- **Be specific**: "list assets with prefix example.com" is better than "show assets"
- **Include filters**: "high priority risks" helps me filter results
- **Use natural language**: I'll parse variations and figure it out
- **Resource types**: assets, risks, jobs, seeds, integrations, aegis, capabilities, keys

---

## Technical Reference

For developers or debugging, here are the underlying wrapper patterns:

### List Assets (Direct Execution)

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { assetsList } = await import('$ROOT/.claude/tools/praetorian-cli/assets-list.ts');
  const result = await assetsList.execute({
    key_prefix: 'example.com',  // Optional: filter by prefix
    asset_type: 'domain',        // Optional: filter by type
    pages: 1                     // Optional: pagination
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### Get Asset (Direct Execution)

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { assetsGet } = await import('$ROOT/.claude/tools/praetorian-cli/assets-get.ts');
  const result = await assetsGet.execute({
    key: 'example.com'  // Asset key
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### List Risks (Direct Execution)

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { risksList } = await import('$ROOT/.claude/tools/praetorian-cli/risks-list.ts');
  const result = await risksList.execute({
    pages: 1  // Optional: pagination
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### Search (Direct Execution)

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { searchByQuery } = await import('$ROOT/.claude/tools/praetorian-cli/search-by-query.ts');
  const result = await searchByQuery.execute({
    query: 'status:active',  // Search query
    limit: 20                 // Optional: result limit
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

---

## Common Workflows

### Inventory All Assets

```bash
/chariot-api list all assets

# I'll execute:
# 1. Call assets-list wrapper
# 2. Return summary: total count, types breakdown, statuses
# 3. Display sample assets with key, name, status
```

### Find High-Risk Issues

```bash
/chariot-api list high priority risks

# I'll execute:
# 1. Call risks-list wrapper
# 2. Filter by priority field
# 3. Display risk ID, CVSS, affected assets
```

### Monitor Job Status

```bash
/chariot-api get job JOB-123

# I'll execute:
# 1. Call jobs-get wrapper with job ID
# 2. Display status, progress, completion time
```

### Search Assets by Query

```bash
/chariot-api search for assets with status active

# I'll execute:
# 1. Parse query → "status:active"
# 2. Call search-by-query wrapper
# 3. Display matching assets
```
