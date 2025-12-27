---
name: mcp-tools-registry
description: Use when calling any external API or service (Linear, Praetorian CLI, GitHub, Playwright) - provides registry of MCP tool wrappers in .claude/tools/ with TRUE progressive loading achieving 0 tokens at session start (was 71.8k tokens). REQUIRED before implementing API calls. Tools load ONLY when imported.
allowed-tools: "Read, Bash, Grep"
---

# MCP Tools Registry

**USAGE skill - for using existing wrappers**

> 💡 **Need to CREATE a new wrapper?** See `mcp-code-create` skill instead.
> This skill is for USING wrappers that already exist in `.claude/tools/`.

**TRUE Progressive Loading: 0 tokens at session start (was 71.8k tokens)**

Registry of TypeScript wrappers that connect to MCP servers on-demand, eliminating all session-start token overhead.

## Core Principle

**MANDATORY: Before calling external APIs, ALWAYS check `.claude/tools/` for available wrappers.**

**Architecture Achieved (November 2024):**

- ❌ MCP servers removed from `.mcp.json` (no longer loaded at startup)
- ✅ TypeScript wrappers in `.claude/tools/` spawn MCP connections on-demand
- ✅ **0 tokens at session start** (down from 71.8k tokens)
- ✅ Tools load only when imported (~50-100 tokens each)

**When using this skill:** Announce "Checking .claude/tools/ registry for {service}..."

## Agent Requirements

**To use MCP wrappers, agents MUST have:**

```yaml
# Agent frontmatter
skills:
  - mcp-tools-registry # This skill (teaches discovery + usage)

tools:
  - Bash # REQUIRED: Execute TypeScript (npx tsx)
  - Read # REQUIRED: Discover available tools
  - Write # Optional: For complex multi-tool scripts
```

**Why Bash is required:** Wrappers are TypeScript files. Agents execute them via:

```bash
npx tsx -e "import { tool } from './.claude/tools/...'; ..."
```

**Without Bash tool, agents cannot execute wrappers!**

---

## Discovery Workflow (REQUIRED)

### Step 1: Discover Available Tools

```bash
# Quick discovery - list all categories
ls .claude/tools/

# Or use discovery tool for detailed info
npx tsx .claude/tools/discover.ts

# Search for specific tools
npx tsx .claude/tools/discover.ts praetorian-cli asset
```

**Discovery tool output:**

```
Found 18 tools:

📦 praetorian-cli/assets-list
   Purpose: List assets with intelligent filtering
   Import: .claude/tools/praetorian-cli/assets-list.ts

📦 praetorian-cli/risks-get
   Purpose: Get single risk with details
   Import: .claude/tools/praetorian-cli/risks-get.ts
```

### Step 2: Execute TypeScript Wrapper (Using Bash Tool)

**CRITICAL: Agents must use Bash tool with `npx tsx` to execute TypeScript wrappers!**

**Pattern A: Inline Execution (Simple, One Tool)**

```bash
# Use Bash tool to execute TypeScript inline
# Note: 2>/dev/null suppresses MCP debug logs
npx tsx -e "(async () => {
  const { assetsList } = await import('./.claude/tools/praetorian-cli/assets-list.ts');

  const result = await assetsList.execute({
    key_prefix: '#asset#example.com',
    pages: 1
  });

  console.log('Found:', result.summary.total_count, 'assets');
  console.log('Token usage:', result.estimated_tokens, 'tokens');
  console.log('First 5:', result.assets.slice(0, 5).map(a => a.name).join(', '));
})();" 2>/dev/null
```

**Pattern B: Script File (Complex, Multiple Tools)**

```bash
# Step 1: Write TypeScript file using Write tool
# File: .claude/tools/scripts/analyze-risks.ts

import { assetsList } from '../praetorian-cli/assets-list.js';
import { risksList } from '../praetorian-cli/risks-list.js';
import { createIssue } from '../linear/create-issue.js';

async function analyzeRisks() {
  // Get active assets
  const assets = await assetsList.execute({ pages: 1 });
  const active = assets.assets.filter(a => a.status === 'A');

  // Get high-priority risks
  const risks = await risksList.execute({ pages: 1 });
  const critical = risks.risks.filter(r => r.priority <= 10);

  // Create tracking issue
  if (critical.length > 0) {
    await createIssue.execute({
      title: `Security Review: ${critical.length} critical risks`,
      team: 'Security',
      description: `Found ${critical.length} critical risks across ${active.length} assets`
    });
  }

  return { active: active.length, critical: critical.length };
}

analyzeRisks().then(result => {
  console.log(JSON.stringify(result, null, 2));
});

# Step 2: Execute using Bash tool
npx tsx .claude/tools/scripts/analyze-risks.ts
```

**Why .js in imports when files are .ts?**

- TypeScript source files: `.ts` (what you write)
- Import paths: `.js` (ESM convention with `"type": "module"`)
- tsx transpiles on-the-fly: `.ts` → `.js` automatically

### Step 3: Process Results

**Wrappers return pre-filtered data:**

```typescript
// Result structure (already filtered!)
{
  summary: {
    total_count: 156,      // Total available
    returned_count: 20,    // Returned (limited)
    statuses: { A: 100, F: 30, D: 26 }
  },
  assets: [...],           // Only first 20
  estimated_tokens: 850    // Actual token cost
}
```

**Process in your code:**

```bash
npx tsx -e "(async () => {
  const { assetsList } = await import('./.claude/tools/praetorian-cli/assets-list.ts');

  const result = await assetsList.execute({ pages: 1 });

  // Summary already calculated
  console.log('Total:', result.summary.total_count);
  console.log('Returned:', result.summary.returned_count);

  // Iterate over limited dataset (not all!)
  for (const asset of result.assets) {
    console.log(\`- \${asset.name} (\${asset.status})\`);
  }
})();" 2>/dev/null
```

## Available Tool Categories

**ALWAYS use `discover.ts` to get the current list of available tools:**

```bash
# List ALL available services and tools
npx tsx .claude/tools/discover.ts

# List tools for a specific service
npx tsx .claude/tools/discover.ts linear

# Search for tools by name
npx tsx .claude/tools/discover.ts praetorian-cli asset
```

**Why dynamic discovery?**

- Tool lists stay current as wrappers are added/removed
- No stale documentation
- Single source of truth: the actual `.claude/tools/` directory

### Service-Specific Skills

For detailed tool catalogs with import paths and examples, use the service-specific skills:

| Service        | Skill                      | Location                                                           |
| -------------- | -------------------------- | ------------------------------------------------------------------ |
| Linear         | `mcp-tools-linear`         | `.claude/skill-library/claude/mcp-tools/mcp-tools-linear/`         |
| Praetorian CLI | `mcp-tools-praetorian-cli` | `.claude/skill-library/claude/mcp-tools/mcp-tools-praetorian-cli/` |
| Context7       | `mcp-tools-context7`       | `.claude/skill-library/claude/mcp-tools/mcp-tools-context7/`       |
| Currents       | `mcp-tools-currents`       | `.claude/skill-library/claude/mcp-tools/mcp-tools-currents/`       |

These skills are auto-generated by `npm run generate-skill -- <service>` and contain:

- Complete tool catalog with descriptions
- Import paths for each wrapper
- Service-specific examples

### Quick Category Overview

| Category           | Location                         | Purpose                           |
| ------------------ | -------------------------------- | --------------------------------- |
| `praetorian-cli/`  | `.claude/tools/praetorian-cli/`  | Chariot API (assets, risks, jobs) |
| `linear/`          | `.claude/tools/linear/`          | Linear issues, projects, teams    |
| `context7/`        | `.claude/tools/context7/`        | Library documentation lookup      |
| `currents/`        | `.claude/tools/currents/`        | CI test performance metrics       |
| `chrome-devtools/` | `.claude/tools/chrome-devtools/` | Browser automation (Playwright)   |

**Token savings**: 71.8k tokens freed at session start (was loaded immediately, now 0)

**When tools used**: ~50-100 tokens per imported tool (only what you need)

## How Wrappers Work

### Architecture

```
┌─────────────┐
│ Your Code   │ import { tool } from '.claude/tools/praetorian-cli/tool'
└──────┬──────┘
       │ (0 tokens at startup, ~50 tokens when imported)
       ▼
┌─────────────────┐
│ TypeScript      │ tool.execute({ params })
│ Wrapper         │ • Validates with Zod
│ (.claude/tools) │ • Calls MCP via SDK
│                 │ • Filters/summarizes results
└──────┬──────────┘
       │ Spawns on-demand
       ▼
┌─────────────────┐
│ MCP Server      │ Independent process
│ (not in Claude  │ • praetorian CLI
│  Code context)  │ • Linear API
│                 │ • Playwright
└─────────────────┘
```

### Key Benefits

1. **0 tokens at startup** - No MCP definitions loaded
2. **On-demand connections** - MCP servers spawn only when called
3. **Pre-filtered results** - Summaries + limited data returned
4. **Type safety** - Zod validation on inputs/outputs
5. **Reusable** - No rewriting TypeScript each time
6. **Format normalization** - Handles variable MCP response formats automatically

### Response Format Handling

Wrappers normalize variable MCP response formats automatically. Output is always consistent - arrays are iterable, pagination extracted.

**Don't call MCP servers directly** - use wrappers. See [references/troubleshooting.md](references/troubleshooting.md) if you encounter format issues.

## Import Patterns (With Bash Execution)

**All patterns use Bash tool to execute TypeScript via `npx tsx`**

**Important: File Extensions**

- Source files: `.ts` (TypeScript)
- Import paths: `.js` (ESM convention with `"type": "module"`)
- Why: TypeScript compiles `.ts` → `.js`, imports reference output
- tsx handles: Finds `.ts` files, transpiles on-the-fly

**All wrappers are TypeScript - no mixed .js/.sh files!**

### Pattern 1: Single Tool (Inline)

```bash
# Bash tool command with stderr suppression
npx tsx -e "(async () => {
  const { assetsList } = await import('./.claude/tools/praetorian-cli/assets-list.ts');

  const assets = await assetsList.execute({
    key_prefix: '#asset#example.com',
    pages: 1
  });

  console.log(JSON.stringify(assets.summary, null, 2));
})();" 2>/dev/null
```

### Pattern 2: Multiple Tools from Same Category (Inline)

```bash
# Bash tool command with stderr suppression
npx tsx -e "(async () => {
  const { assetsList, risksGet } = await import('./.claude/tools/praetorian-cli/index.ts');

  const assets = await assetsList.execute({ pages: 1 });
  console.log('Assets:', assets.summary.total_count);

  const risk = await risksGet.execute({
    key: '#risk#example.com#sql-injection',
    details: true
  });
  console.log('Risk:', risk.name, '-', risk.status);
})();" 2>/dev/null
```

### Pattern 3: Tools from Multiple Categories (Script File)

```bash
# Step 1: Write script using Write tool
# File: .claude/tools/scripts/cross-service.ts
```

```typescript
import { assetsList } from "../praetorian-cli/assets-list.js";
import { createIssue } from "../linear/create-issue.js";

async function main() {
  // Get critical assets
  const assets = await assetsList.execute({ pages: 1 });
  const critical = assets.assets.filter((a) => a.status === "A");

  // Create tracking issue
  for (const asset of critical) {
    await createIssue.execute({
      title: `Review: ${asset.name}`,
      team: "Security",
    });
  }

  console.log(`Created ${critical.length} tracking issues`);
}

main();
```

```bash
# Step 2: Execute using Bash tool
npx tsx .claude/tools/scripts/cross-service.ts
```

### Pattern 4: Dynamic Discovery (Inline)

```bash
# Bash tool command with stderr suppression
npx tsx -e "(async () => {
  const { discoverTools } = await import('./.claude/tools/discover.ts');

  const tools = await discoverTools('praetorian-cli', 'asset');

  console.log(\`Found \${tools.length} asset tools:\`);
  for (const tool of tools) {
    console.log(\`- \${tool.name}: \${tool.summary}\`);
  }

  // Dynamically import and use first tool
  const { assetsList } = await import(tools[0].importPath.replace('.ts', '.js'));
  const result = await assetsList.execute({ pages: 1 });
  console.log('Result:', result.summary.total_count, 'assets');
})();" 2>/dev/null
```

## Common Workflows

### Workflow 1: Asset Discovery (Inline)

```bash
# Use Bash tool with stderr suppression
npx tsx -e "(async () => {
  const { assetsList } = await import('./.claude/tools/praetorian-cli/assets-list.ts');

  const result = await assetsList.execute({
    key_prefix: '#asset#example.com',
    pages: 1
  });

  console.log(\`Found \${result.summary.total_count} assets\`);
  console.log(\`Statuses:\`, JSON.stringify(result.summary.statuses));
  console.log(\`First 20:\`, result.assets.map(a => a.name).join(', '));
})();" 2>/dev/null
```

**Token usage**: ~800 tokens (vs 10k+ without wrapper)

---

### Workflow 2: Risk Analysis (Script File)

```bash
# Step 1: Write using Write tool (.claude/tools/scripts/risk-analysis.ts)
```

```typescript
import { risksList, risksGet } from "../praetorian-cli/index.js";

async function analyzeRisks() {
  const risks = await risksList.execute({
    prefix_filter: "#risk#example.com",
    pages: 1,
  });

  const critical = risks.risks.filter((r) => r.priority <= 10);

  for (const risk of critical) {
    const details = await risksGet.execute({
      key: risk.key,
      details: true,
    });
    console.log(`${risk.name}: ${details.affected_assets_summary?.total_count} assets`);
  }

  return { total: risks.summary.total_count, critical: critical.length };
}

analyzeRisks().then((result) => console.log(JSON.stringify(result)));
```

```bash
# Step 2: Execute using Bash tool
npx tsx .claude/tools/scripts/risk-analysis.ts
```

**Token usage**: ~1.5k tokens (vs 50k+ without wrapper)

---

### Workflow 3: Linear Issue Tracking (Inline)

```bash
# Use Bash tool with stderr suppression
npx tsx -e "(async () => {
  const { listIssues, createIssue } = await import('./.claude/tools/linear/index.ts');

  const bugs = await listIssues.execute({
    team: 'Engineering',
    state: 'Backlog',
    label: 'bug'
  });

  console.log(\`Found \${bugs.issues.length} open bugs\`);

  if (bugs.issues.length > 10) {
    await createIssue.execute({
      title: 'Bug Triage: High backlog count',
      team: 'Engineering',
      priority: 2,
      description: \`Found \${bugs.issues.length} bugs in backlog\`
    });
    console.log('Created tracking issue');
  }
})();" 2>/dev/null
```

**Token usage**: ~1k tokens (vs 15k+ without wrapper)

## Verification Checklist

Before using external APIs:

- [ ] **Check registry**: `ls .claude/tools/`
- [ ] **Discover tools**: `npx tsx .claude/tools/discover.ts {category}`
- [ ] **Review README**: `.claude/tools/{category}/README.md`
- [ ] **Import wrapper**: Use TypeScript import
- [ ] **No mcp\_\_ tools**: Don't reference mcp\_\_ prefixed tools (don't exist!)

## Red Flags

**Warning signs you're doing it wrong:**

- ❌ "Let me use mcp**praetorian-cli** tools" (don't exist in context!)
- ❌ "I'll call the MCP server directly" (no progressive loading)
- ❌ "I'll import the TypeScript directly" (need Bash + npx tsx!)
- ❌ "Don't know if wrapper exists" (CHECK with ls/discover!)
- ❌ "Can't find .js file for .ts import" (.js is correct - ESM convention!)

**Reality:**

- ✅ All MCP tools removed from context (71.8k tokens saved)
- ✅ Wrappers are the ONLY way to use MCPs now
- ✅ Must execute via Bash tool: `npx tsx -e "import..."`
- ✅ Source is .ts, imports use .js (ESM + "type": "module")
- ✅ Discovery takes 5 seconds: `ls .claude/tools/`

## Quick Reference

**List categories:**

```bash
# Bash tool:
ls .claude/tools/
```

**Discover tools in category:**

```bash
# Bash tool:
npx tsx .claude/tools/discover.ts praetorian-cli
```

**Execute wrapper (inline):**

```bash
# Bash tool with stderr suppression:
npx tsx -e "(async () => {
  const { toolName } = await import('./.claude/tools/category/tool-name.ts');
  const result = await toolName.execute({ params });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Execute wrapper (script file):**

```bash
# Step 1: Write tool (Write tool) → .claude/tools/scripts/my-script.ts
# Step 2: Execute (Bash tool) → npx tsx .claude/tools/scripts/my-script.ts
```

**Required agent tools:**

- `Bash` - Execute TypeScript (npx tsx)
- `Read` - Discover available tools
- `Write` - Optional (for script files)

**Token cost:**

- Session start: **0 tokens**
- Per import: **~50-100 tokens**
- Per execution: **varies by tool** (see result.estimated_tokens)

## Troubleshooting

See [references/troubleshooting.md](references/troubleshooting.md) for common issues:

- "forEach is not a function" errors
- Missing `next_offset` for pagination
- Empty results debugging
- Import path issues

## Related Skills

- **mcp-code-create** - How to CREATE new wrappers (templates, patterns)
- **mcp-code-test** - How to TEST wrappers (validation, benchmarks)
- **mcp-code-guide** - Why progressive loading works (educational)

## Further Reading

- **Registry overview**: `.claude/tools/README.md`
- **Discovery tool**: `.claude/tools/discover.ts`
- **Example wrappers**: `.claude/tools/praetorian-cli/`
- **MCP client**: `.claude/tools/config/lib/mcp-client.ts`

## Migration Notes (Historical)

**Before (October 2024):**

- MCPs defined in `.mcp.json`
- Loaded at session start: 71.8k tokens
- Direct mcp\_\_ tool calls

**After (November 2024):**

- MCPs removed from `.mcp.json`
- Session start: 0 tokens
- Import-based usage only
- 71.8k tokens freed (7.2% of context window)

**This architecture is now PERMANENT.**
