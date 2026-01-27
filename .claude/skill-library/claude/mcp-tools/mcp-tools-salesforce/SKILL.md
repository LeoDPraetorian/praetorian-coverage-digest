---
name: mcp-tools-salesforce
description: Use when accessing salesforce services - provides 12 tools for create-scratch-org, delete-org, deploy-metadata, and more. References mcp-tools-registry for Bash + tsx execution patterns. Enables granular agent access control.
allowed-tools: Read, Bash
skills: [mcp-tools-registry]
---

# Salesforce MCP Tools

**GRANULAR ACCESS CONTROL:** Include this skill to give agent salesforce access ONLY.

> **Execution patterns:** See mcp-tools-registry for Bash + npx tsx usage
> This skill provides salesforce-specific tool catalog.

<CRITICAL-RULES>

## ❌ FORBIDDEN: Direct MCP Tool Calls

**YOU MUST NEVER call native MCP tools directly.** This includes:

```typescript
// ❌ FORBIDDEN - DO NOT DO THIS
mcp__salesforce__run_soql_query({ query: "..." })
mcp__salesforce__deploy_metadata({ ... })
mcp__salesforce__list_all_orgs({ ... })
// ... ANY mcp__salesforce__* tool
```

**Why this is forbidden:**

1. **Bypasses knowledge layer** - No pattern caching, glossary, or schema resolution
2. **Wastes tokens** - 5,000-10,000 tokens per call vs 150 tokens with wrappers
3. **No learning** - Patterns never persist for future queries
4. **Breaks routing** - Circumvents gateway's skill loading and context management

**✅ REQUIRED: Always use TypeScript wrappers**

```bash
# ✅ CORRECT - Use TypeScript wrapper with npx tsx
npx tsx -e "(async () => {
  const { runSoqlQueryEnhanced } = await import('./.claude/tools/salesforce/run-soql-query-enhanced.ts');
  const result = await runSoqlQueryEnhanced.execute({
    naturalLanguage: 'total bookings year to date'
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**If you see a direct MCP call in examples or documentation:**
- Do NOT copy it
- Report it as incorrect
- Use the TypeScript wrapper equivalent instead

</CRITICAL-RULES>

## Access Protocol

**This is a LIBRARY skill accessed via gateway routing.**

When users ask Salesforce-related questions:
1. **Gateway routes here:** `gateway-mcp-tools` detects triggers (Salesforce, SOQL, Apex, scratch org, org)
2. **Gateway loads this skill:** Via `Read(".claude/skill-library/claude/mcp-tools/mcp-tools-salesforce/SKILL.md")`
3. **You follow this skill's guidance:** Use TypeScript wrappers via `npx tsx` (see CRITICAL-RULES above)

**⚠️ ENFORCEMENT: Direct MCP calls are VIOLATIONS**

If you see or are tempted to use `mcp__salesforce__*` tools:
- **STOP IMMEDIATELY** - This violates the wrapper protocol
- **Use TypeScript wrapper instead** - Every MCP tool has a wrapper in `.claude/tools/salesforce/`
- **Report the violation** - If documentation suggests direct MCP calls, flag it

**Why gateway routing matters:**
- ✅ Proper skill loading and context
- ✅ Token-optimized wrappers (150 tokens vs 5,000-10,000)
- ✅ Knowledge layer resolution (patterns, glossary, schema)
- ✅ Pattern learning for future queries
- ✅ Consistent error handling and validation

**If you arrived here without being routed by the gateway**, stop and invoke `gateway-mcp-tools` skill first.

## Purpose

Enable granular agent access control for salesforce operations.

**Include this skill when:** Agent needs salesforce access
**Exclude this skill when:** Agent should NOT access salesforce

## Natural Language Query Support (Knowledge Layer)

**For natural language queries about Salesforce data, use `run-soql-query-enhanced`:**

```
User: "total bookings year to date"
                │
                ▼
┌─────────────────────────────────────────┐
│    run-soql-query-enhanced              │
│                                         │
│  1. naturalLanguage: "total bookings..."│
│  2. Knowledge Layer Resolution:         │
│     - Pattern Cache (95% confidence)    │
│     - Glossary Terms (85% confidence)   │
│     - Schema Lookup (50% confidence)    │
│  3. Auto-generates SOQL                 │
│  4. Executes query                      │
│  5. Auto-learns successful patterns     │
└─────────────────────────────────────────┘
                │
                ▼
          Results returned
```

### When to Use Which Tool

**YOU MUST use `run-soql-query-enhanced` for ALL queries unless explicitly bypassing knowledge layer.**

| User Request | Tool to Use | Why |
|--------------|-------------|-----|
| Natural language: "show bookings", "open opportunities for John" | `run-soql-query-enhanced` with `naturalLanguage` param | REQUIRED - uses knowledge layer |
| Direct SOQL: "SELECT Id FROM Account" | `run-soql-query-enhanced` with `query` param | REQUIRED - still benefits from pattern learning |
| Explicit bypass (rare): exact SOQL, no learning needed | `run-soql-query` with `query` param | Exception - must justify bypassing knowledge layer |

### Natural Language Example

```bash
npx tsx -e "(async () => {
  const { runSoqlQueryEnhanced } = await import('./.claude/tools/salesforce/run-soql-query-enhanced.ts');
  const result = await runSoqlQueryEnhanced.execute({
    naturalLanguage: 'total bookings year to date',
    useKnowledge: true,
    learnPattern: true
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Response includes:**
- `resolution.source`: Where the query was resolved (pattern_cache, glossary, schema, tooling_api)
- `resolution.confidence`: How confident the resolution is (0-1)
- `resolution.matchedTerms`: Which glossary terms were matched
- `resolution.generatedSoql`: The SOQL that was generated

### Pre-defined Business Terms (glossary.yaml)

| Term | Condition | Objects |
|------|-----------|---------|
| bookings | `StageName = 'Closed Won'` | Opportunity |
| pipeline | `IsClosed = false` | Opportunity |
| enterprise | `Type = 'Enterprise'` | Account, Opportunity |
| open | `IsClosed = false` | Opportunity |
| closed | `IsClosed = true` | Opportunity |

### Knowledge Layer Management

```bash
# Teach a new business term
npx tsx .claude/tools/salesforce/scripts/teach.ts add --term "bookings" --condition "StageName = 'Closed Won'"

# View glossary
npx tsx .claude/tools/salesforce/scripts/teach.ts list

# Sync schema from describe files
npx tsx .claude/tools/salesforce/scripts/sync-schema.ts --from-files

# Prune low-confidence patterns
npx tsx .claude/tools/salesforce/scripts/prune-patterns.ts --threshold 0.3

# Run test queries
npx tsx .claude/tools/salesforce/scripts/run-query-tests.ts --verbose
```

## Available Tools (Auto-discovered: 12 wrappers)

### run-soql-query-enhanced ⚠️ REQUIRED
- **Purpose:** Natural language to SOQL with knowledge layer (patterns, glossary, schema)
- **Import:** `import { runSoqlQueryEnhanced } from './.claude/tools/salesforce/run-soql-query-enhanced.ts'`
- **Token cost:** ~0 tokens (vs ~5,000-10,000 without knowledge layer)
- **Use when:** ALL SOQL queries (unless you have exact SOQL and explicitly bypass knowledge layer)

### run-soql-query
- **Purpose:** Direct SOQL execution (bypasses knowledge layer)
- **Import:** `import { runSoqlQuery } from './.claude/tools/salesforce/run-soql-query.ts'`
- **Token cost:** ~unknown tokens
- **Use when:** ONLY when you have exact SOQL AND explicitly want to bypass knowledge layer (rare)

### create-scratch-org
- **Purpose:** MCP wrapper for create-scratch-org
- **Import:** `import { createScratchOrg } from './.claude/tools/salesforce/create-scratch-org.ts'`
- **Token cost:** ~unknown tokens

### delete-org
- **Purpose:** MCP wrapper for delete-org
- **Import:** `import { deleteOrg } from './.claude/tools/salesforce/delete-org.ts'`
- **Token cost:** ~unknown tokens

### deploy-metadata
- **Purpose:** MCP wrapper for deploy-metadata
- **Import:** `import { deployMetadata } from './.claude/tools/salesforce/deploy-metadata.ts'`
- **Token cost:** ~unknown tokens

### get-username
- **Purpose:** MCP wrapper for get-username
- **Import:** `import { getUsername } from './.claude/tools/salesforce/get-username.ts'`
- **Token cost:** ~unknown tokens

### list-all-orgs
- **Purpose:** MCP wrapper for list-all-orgs
- **Import:** `import { listAllOrgs } from './.claude/tools/salesforce/list-all-orgs.ts'`
- **Token cost:** ~unknown tokens

### org-open
- **Purpose:** MCP wrapper for org-open
- **Import:** `import { orgOpen } from './.claude/tools/salesforce/org-open.ts'`
- **Token cost:** ~unknown tokens

### resume-tool-operation
- **Purpose:** MCP wrapper for resume-tool-operation
- **Import:** `import { resumeToolOperation } from './.claude/tools/salesforce/resume-tool-operation.ts'`
- **Token cost:** ~unknown tokens

### retrieve-metadata
- **Purpose:** MCP wrapper for retrieve-metadata
- **Import:** `import { retrieveMetadata } from './.claude/tools/salesforce/retrieve-metadata.ts'`
- **Token cost:** ~unknown tokens

### run-agent-test
- **Purpose:** MCP wrapper for run-agent-test
- **Import:** `import { runAgentTest } from './.claude/tools/salesforce/run-agent-test.ts'`
- **Token cost:** ~unknown tokens

### run-apex-test
- **Purpose:** MCP wrapper for run-apex-test
- **Import:** `import { runApexTest } from './.claude/tools/salesforce/run-apex-test.ts'`
- **Token cost:** ~unknown tokens


## Quick Examples

See mcp-tools-registry for complete Bash + tsx execution patterns.

**Inline execution:**
```bash
# Note: 2>/dev/null suppresses MCP debug logs
npx tsx -e "(async () => {
  const { createScratchOrg } = await import('./.claude/tools/salesforce/create-scratch-org.ts');
  const result = await createScratchOrg.execute({ /* params */ });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

## Related Skills

- **mcp-tools-registry** - Execution patterns (REQUIRED - see for Bash + tsx usage)
- **mcp-code-create** - Create new wrappers
- **mcp-code-test** - Test wrappers
