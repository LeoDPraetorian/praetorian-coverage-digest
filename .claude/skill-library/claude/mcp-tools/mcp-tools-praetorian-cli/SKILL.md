---
name: mcp-tools-praetorian-cli
description: Use when accessing praetorian-cli services - provides 15 tools for aegis-list, assets-get, assets-list, and more. References mcp-tools-registry for Bash + tsx execution patterns. Enables granular agent access control.
allowed-tools: Read, Bash
skills: [mcp-tools-registry]
---

# Praetorian cli MCP Tools

**GRANULAR ACCESS CONTROL:** Include this skill to give agent praetorian-cli access ONLY.

> **Execution patterns:** See mcp-tools-registry for Bash + npx tsx usage
> This skill provides praetorian-cli-specific tool catalog.

## Purpose

Enable granular agent access control for praetorian-cli operations.

**Include this skill when:** Agent needs praetorian-cli access
**Exclude this skill when:** Agent should NOT access praetorian-cli

## Available Tools (Auto-discovered: 15 wrappers)

### aegis-list

- **Purpose:** Praetorian-CLI MCP Wrapper: aegis_list Purpose: List Aegis agents with system specs and tunnel status Token savings: ~80%
- **Import:** `import { aegisList } from './.claude/tools/praetorian-cli/aegis-list.ts'`
- **Token cost:** ~600 tokens

### assets-get

- **Purpose:** Praetorian-CLI MCP Wrapper: assets_get Purpose: Get single asset with optional details filtering Token savings: ~70% when details=true (5,000 tokens → 1,500 tokens)
- **Import:** `import { assetsGet } from './.claude/tools/praetorian-cli/assets-get.ts'`
- **Token cost:** ~70 tokens

**Parameters:**

```typescript
interface AssetsGetInput {
  key: string;
}
```

### assets-list

- **Purpose:** Praetorian-CLI MCP Wrapper: assets_list Purpose: List assets with intelligent filtering to reduce token usage Token savings: ~90% (10,000 assets × 100 tokens → 1,000 tokens summary) Schema Discovery Results (tested with real MCP server):
- **Import:** `import { assetsList } from './.claude/tools/praetorian-cli/assets-list.ts'`
- **Token cost:** ~1000 tokens

**Parameters:**

```typescript
interface AssetsListInput {
  key_prefix?: string;
  asset_type?: string;
}
```

### attributes-get

- **Purpose:** Praetorian-CLI MCP Wrapper: attributes_get Purpose: Get specific attribute with validation Token savings: ~50% (detailed attribute × 200 tokens → 100 tokens filtered)
- **Import:** `import { attributesGet } from './.claude/tools/praetorian-cli/attributes-get.ts'`
- **Token cost:** ~100 tokens

### attributes-list

- **Purpose:** Praetorian-CLI MCP Wrapper: attributes_list Purpose: List attributes with intelligent filtering to reduce token usage Token savings: ~85% (1,000 attributes × 50 tokens → 7,500 tokens summary) Schema Discovery Results (tested with real MCP server):
- **Import:** `import { attributesList } from './.claude/tools/praetorian-cli/attributes-list.ts'`
- **Token cost:** ~750 tokens

**Parameters:**

```typescript
interface AttributesListInput {
  prefix_filter: string;
  source_key?: string;
  offset?: string;
}
```

### capabilities-list

- **Purpose:** Praetorian-CLI MCP Wrapper: capabilities_list Purpose: List security capabilities with filtering by name/target/executor Token savings: ~85% (capabilities × 400 tokens → filtered summary)
- **Import:** `import { capabilitiesList } from './.claude/tools/praetorian-cli/capabilities-list.ts'`
- **Token cost:** ~2000 tokens

**Parameters:**

```typescript
interface CapabilitiesListInput {
  name?: string;
  target?: enum;
}
```

### integrations-list

- **Purpose:** Praetorian-CLI MCP Wrapper: integrations_list Purpose: List integrations (cloud, SCM, scanners) with filtering Token savings: ~85% Schema Discovery Results (tested with real MCP server):
- **Import:** `import { integrationsList } from './.claude/tools/praetorian-cli/integrations-list.ts'`
- **Token cost:** ~800 tokens

**Parameters:**

```typescript
interface IntegrationsListInput {
  name_filter: string;
  offset?: string;
}
```

### jobs-get

- **Purpose:** Praetorian-CLI MCP Wrapper: jobs_get Purpose: Get specific job details with validation Token savings: ~40% (detailed job × 300 tokens → 180 tokens filtered)
- **Import:** `import { jobsGet } from './.claude/tools/praetorian-cli/jobs-get.ts'`
- **Token cost:** ~180 tokens

### jobs-list

- **Purpose:** Praetorian-CLI MCP Wrapper: jobs_list Purpose: List jobs with status filtering and token optimization Token savings: ~90% (10,000 jobs × 150 tokens → 1,500 tokens summary) Schema Discovery Results (tested with real MCP server):
- **Import:** `import { jobsList } from './.claude/tools/praetorian-cli/jobs-list.ts'`
- **Token cost:** ~1500 tokens

**Parameters:**

```typescript
interface JobsListInput {
  prefix_filter: string;
  offset?: string;
}
```

### keys-list

- **Purpose:** Praetorian-CLI MCP Wrapper: keys_list Purpose: List API keys with pagination Token savings: ~75% Schema Discovery Results (tested with real MCP server):
- **Import:** `import { keysList } from './.claude/tools/praetorian-cli/keys-list.ts'`
- **Token cost:** ~500 tokens

**Parameters:**

```typescript
interface KeysListInput {
  offset?: string;
}
```

### preseeds-list

- **Purpose:** Praetorian-CLI MCP Wrapper: preseeds_list Purpose: List discovery preseeds with filtering Token savings: ~85% Schema Discovery Results (tested with real MCP server):
- **Import:** `import { preseedsList } from './.claude/tools/praetorian-cli/preseeds-list.ts'`
- **Token cost:** ~900 tokens

**Parameters:**

```typescript
interface PreseedsListInput {
  prefix_filter: string;
  offset?: string;
}
```

### risks-get

- **Purpose:** Praetorian-CLI MCP Wrapper: risks_get Purpose: Get single risk with optional details filtering Token savings: ~75% when details=true (4,000 tokens → 1,000 tokens)
- **Import:** `import { risksGet } from './.claude/tools/praetorian-cli/risks-get.ts'`
- **Token cost:** ~75 tokens

**Parameters:**

```typescript
interface RisksGetInput {
  key: string;
}
```

### risks-list

- **Purpose:** Praetorian-CLI MCP Wrapper: risks_list Purpose: List risks with intelligent filtering and prioritization Token savings: ~90% (5,000 risks × 200 tokens → 5,000 tokens summary) Schema Discovery Results (tested with real MCP server):
- **Import:** `import { risksList } from './.claude/tools/praetorian-cli/risks-list.ts'`
- **Token cost:** ~5000 tokens

**Parameters:**

```typescript
interface RisksListInput {
  contains_filter: string;
  offset: string;
}
```

### search-by-query

- **Purpose:** Praetorian-CLI MCP Wrapper: search_by_query Purpose: Execute graph queries with intelligent result filtering Token savings: ~95% (50,000 tokens → 2,500 tokens for complex queries) Schema Discovery Results (tested with real MCP server):
- **Import:** `import { searchByQuery } from './.claude/tools/praetorian-cli/search-by-query.ts'`
- **Token cost:** ~2500 tokens

**Parameters:**

```typescript
interface SearchByQueryInput {
  query: string;
}
```

### seeds-list

- **Purpose:** Praetorian-CLI MCP Wrapper: seeds_list Purpose: List asset seeds with filtering Token savings: ~85% Schema Discovery Results (tested with real MCP server):
- **Import:** `import { seedsList } from './.claude/tools/praetorian-cli/seeds-list.ts'`
- **Token cost:** ~850 tokens

**Parameters:**

```typescript
interface SeedsListInput {
  seed_type?: string;
  key_prefix: string;
}
```

## Common Operations with Parameters

### List Assets

```bash
npx tsx -e "(async () => {
  const { assetsList } = await import('./.claude/tools/praetorian-cli/assets-list.ts');
  const result = await assetsList.execute({
    key_prefix: 'example.com',  // Optional: filter by key prefix
    asset_type: 'domain',        // Optional: filter by type (domain, ipv4, etc.)
    pages: 1                     // Optional: pagination (default 1)
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Key parameters:**

- `key_prefix` (optional) - Filter assets starting with this prefix
- `asset_type` (optional) - Filter by type: domain, ipv4, ipv6, etc.
- `pages` (optional) - Number of pages to retrieve (default 1)

**Returns:** Summary with total count, asset types breakdown, statuses, sample assets

### Get Asset

```bash
npx tsx -e "(async () => {
  const { assetsGet } = await import('./.claude/tools/praetorian-cli/assets-get.ts');
  const result = await assetsGet.execute({
    key: 'example.com'  // Asset key (required)
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### List Risks

```bash
npx tsx -e "(async () => {
  const { risksList } = await import('./.claude/tools/praetorian-cli/risks-list.ts');
  const result = await risksList.execute({
    pages: 1  // Optional: pagination (default 1)
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Returns:** Summary with total risks, severity breakdown, sample high-priority risks

### Get Risk

```bash
npx tsx -e "(async () => {
  const { risksGet } = await import('./.claude/tools/praetorian-cli/risks-get.ts');
  const result = await risksGet.execute({
    key: 'RISK-123'  // Risk key (required)
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### List Jobs

```bash
npx tsx -e "(async () => {
  const { jobsList } = await import('./.claude/tools/praetorian-cli/jobs-list.ts');
  const result = await jobsList.execute({
    pages: 1  // Optional: pagination (default 1)
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### Get Job

```bash
npx tsx -e "(async () => {
  const { jobsGet } = await import('./.claude/tools/praetorian-cli/jobs-get.ts');
  const result = await jobsGet.execute({
    key: 'JOB-456'  // Job key (required)
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### Search by Query

```bash
npx tsx -e "(async () => {
  const { searchByQuery } = await import('./.claude/tools/praetorian-cli/search-by-query.ts');
  const result = await searchByQuery.execute({
    query: 'status:active',  // Search query string
    limit: 20                 // Optional: result limit (default 20)
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Query syntax examples:**

- `status:active` - Assets with active status
- `type:domain` - Domain assets
- `class:ipv4` - IPv4 assets
- `name:production` - Assets with "production" in name

## Quick Reference

See mcp-tools-registry for complete Bash + tsx execution patterns.

**Generic inline execution:**

```bash
# Note: 2>/dev/null suppresses MCP debug logs
npx tsx -e "(async () => {
  const { toolName } = await import('./.claude/tools/praetorian-cli/tool-name.ts');
  const result = await toolName.execute({ /* params */ });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

## Related Skills

- **mcp-tools-registry** - Execution patterns (REQUIRED - see for Bash + tsx usage)
- **mcp-code-create** - Create new wrappers
- **mcp-code-test** - Test wrappers
