# MCP Progressive Loading - Tools Directory

This directory contains TypeScript wrappers for MCP servers using progressive loading pattern.

## 🚨 CRITICAL: TypeScript Import Pattern for AI Assistants

**All tools in this directory are `.ts` files executed via `tsx` runtime.**

### ✅ CORRECT Import Pattern

```typescript
// Use .ts extension when importing with tsx
import { getIssue } from "./get-issue.ts";
import { assetsList } from "./assets-list.ts";
```

### ❌ WRONG Import Pattern

```typescript
// DO NOT use .js extension - files are .ts
import { getIssue } from "./get-issue.js"; // ❌ Will fail
```

### Execution Pattern

```bash
cd .claude/tools/linear
npx tsx -e "
import { getIssue } from './get-issue.ts';  // Note: .ts extension

(async () => {
  const issue = await getIssue.execute({ id: 'CHARIOT-1561' });
  console.log(issue);
})();
"
```

**Why this matters:** The `tsx` runtime executes TypeScript directly without compilation. Unlike compiled TypeScript projects that use `.js` imports, `tsx` requires actual `.ts` file extensions.

## ✅ **ACTIVE: True Progressive Loading (0 tokens at startup)**

MCP servers removed from context - all tools load on-demand only!

## Current MCP Setup

Your project currently uses these MCP servers:

### Context7 (Already Integrated) ✅

- **Status**: Working via `context7-search-specialist` agent
- **Tools**: `mcp__context7__resolve-library-id`, `mcp__context7__get-library-docs`
- **Token overhead**: ~600 tokens (2 tools only)
- **Agent**: `.claude/agents/research/context7-search-specialist.md`
- **Priority**: LOW (already efficient, only 2 tools)

### Praetorian CLI (HIGH PRIORITY) 🎯

- **Status**: Not yet wrapped
- **Tools**: 30+ tools (assets, risks, jobs, capabilities, etc.)
- **Token overhead**: ~9,000 tokens at startup
- **Priority**: HIGH (biggest token savings opportunity)
- **Expected savings**: 93% (9,000 → 600 tokens)

### Chrome DevTools (MEDIUM PRIORITY)

- **Status**: Not yet wrapped
- **Tools**: 20+ tools
- **Token overhead**: ~6,000 tokens at startup
- **Priority**: MEDIUM (significant savings)
- **Expected savings**: 95% (6,000 → 300 tokens)

## Token Savings Opportunity

**Current overhead at Claude Code startup:**

```
context7:        600 tokens (OK - only 2 tools)
praetorian-cli:  9,000 tokens ⚠️ HIGH PRIORITY
chrome-devtools: 6,000 tokens ⚠️ MEDIUM PRIORITY
─────────────────────────────────────────
Total:          15,600 tokens before any work
```

**With progressive loading:**

```
All MCPs:        0 tokens at startup
Load on-demand:  50-100 tokens per tool used
─────────────────────────────────────────
Savings:        15,600 tokens freed up
                = 15.6K context for actual work!
```

## Directory Structure

```
.claude/tools/
├── README.md            # This file
├── context7/            # POC (demonstrates pattern)
│   └── README.md        # Working example with tests
├── praetorian-cli/      # HIGH PRIORITY: Implement next
└── chrome-devtools/     # MEDIUM PRIORITY: After praetorian
```

## Recommended Implementation Order

### 1. Context7 (POC - Already Done) ✅

- **Why first**: Simple (2 tools), validates pattern
- **Status**: Working POC in `./context7/`
- **Test**: `npx tsx .claude/tools/context7/index.ts`
- **Benefit**: Pattern validation

### 2. Praetorian CLI (Highest ROI) 🎯

- **Why next**: 30+ tools, 9K tokens overhead
- **Tools to wrap**:
  - `assets_list`, `assets_get`
  - `risks_list`, `risks_get`
  - `jobs_list`, `jobs_get`
  - `capabilities_list`
  - 20+ more...
- **Expected benefit**: 93% reduction (9,000 → 600 tokens)
- **Implementation time**: ~2-3 hours for all 30 tools

### 3. Chrome DevTools (Good ROI)

- **Why third**: 20 tools, 6K tokens overhead
- **Expected benefit**: 95% reduction (6,000 → 300 tokens)
- **Implementation time**: ~1-2 hours

## Context7 vs Praetorian CLI

**Why context7 is low priority:**

- Only 2 tools (minimal overhead)
- Already works well through agent
- 600 tokens is acceptable
- Progressive loading saves only ~400 tokens

**Why praetorian-cli is high priority:**

- 30+ tools (massive overhead)
- 9,000 tokens consumed at startup
- That's **15x more tokens** than context7
- Progressive loading saves ~8,400 tokens
- **Frees up context for actual development work**

## Creating Praetorian CLI Wrapper

### Quick Start

```bash
# 1. Create directory
mkdir -p .claude/tools/praetorian-cli

# 2. Get list of all praetorian tools
grep "mcp__praetorian-cli__" .claude/agents/**/*.md | \
  sed 's/.*mcp__praetorian-cli__//' | \
  sed 's/[,"].*$//' | \
  sort -u

# 3. For each tool, copy template
cp .claude/skills/mcp-progressive-loading-implementation/templates/tool-wrapper.ts.tmpl \
   .claude/tools/praetorian-cli/assets-list.ts

# 4. Customize for each tool
# - Update Zod schemas to match tool inputs/outputs
# - Add filtering logic
# - Test wrapper
```

### Example: assets-list Wrapper

See `.claude/skills/mcp-progressive-loading-implementation/` for:

- Tool wrapper template
- Orchestration patterns
- Filtering examples

## Understanding Context7

**What context7 does:**

- Provides library/API documentation catalog
- Example: "How do I use CrowdStrike Falcon API?"
- Context7 returns: API docs, integration guides, code examples

**Current usage:**

- Agent: `context7-search-specialist`
- Tools: 2 MCP tools for search and retrieval
- Overhead: Minimal (600 tokens)

**Progressive loading benefit: LOW**

- Only saves ~400 tokens
- Not worth the implementation effort
- Agent already works well

## Next Steps

**Immediate (Highest Impact):**

1. List all praetorian-cli MCP tools
2. Create wrappers for top 10 most-used tools
3. Measure token reduction
4. Expand to all 30 tools

**Commands to start:**

```bash
# Find all praetorian-cli tools in agent definitions
grep -r "mcp__praetorian-cli__" .claude/agents/ | \
  sed 's/.*mcp__praetorian-cli__//' | \
  sed 's/[,"].*$//' | \
  sort -u > praetorian-tools.txt

# Count them
wc -l praetorian-tools.txt

# Start with most common
head -5 praetorian-tools.txt
```

## How Agents Use These Tools

### **Discovery Pattern** (Find available tools)

```typescript
import { discoverTools } from ".claude/tools/discover";

// Find all praetorian-cli tools
const tools = await discoverTools("praetorian-cli");
console.log(`Found ${tools.length} tools`);

// Search across all categories
const assetTools = await discoverTools(undefined, "asset");
```

### **Usage Pattern** (Import and execute)

```typescript
// Import specific wrapper (note .ts extension)
import { assetsList } from "./.claude/tools/praetorian-cli/assets-list.ts";

// Execute with parameters
const result = await assetsList.execute({
  key_prefix: "#asset#example.com",
  pages: 1,
});

console.log(`Found ${result.summary.total_count} assets`);
console.log(`Token usage: ${result.estimated_tokens}`);
```

### **Example: Complete Workflow**

```typescript
// 1. Discover what's available
const tools = await discoverTools("praetorian-cli", "assets");

// 2. Import needed tool (note .ts extension)
const { assetsList } = await import("./.claude/tools/praetorian-cli/assets-list.ts");

// 3. Execute
const assets = await assetsList.execute({ pages: 1 });

// 4. Process results (already filtered by wrapper!)
for (const asset of assets.assets) {
  console.log(`${asset.name} - ${asset.status}`);
}
```

## Benefits Achieved

- ✅ **0 tokens at startup** (was 71.8k tokens)
- ✅ **On-demand loading** (only load tools you use)
- ✅ **Pre-filtered results** (wrappers return summaries)
- ✅ **Reusable code** (no rewriting TypeScript each time)
- ✅ **Independent MCP connections** (no Claude Code dependency)

## Getting Help

- **Discovery tool**: `.claude/tools/discover.ts`
- **Example wrappers**: `.claude/tools/praetorian-cli/`
- **MCP client**: `.claude/tools/config/lib/mcp-client.ts`

## Summary

**Token savings**: 71.8k tokens freed (7.2% of context window)
**Available categories**: praetorian-cli, linear, context7, currents, playwright
**Total wrappers**: 17+ tools ready to use
