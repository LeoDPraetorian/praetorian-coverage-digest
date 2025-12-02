---
name: gateway-mcp-tools
description: Use when calling external APIs (Linear, Praetorian CLI, Context7, Playwright) - routes to MCP wrapper skills with 0 tokens at startup.
allowed-tools: Read, Bash
---

# MCP Tools Gateway

## How to Use

This skill serves as a master directory for all MCP tool wrapper skills. When you need to call external APIs:

1. **Identify the service skill** from the list below
2. **Use the Read tool** with the provided path to load the service skill
3. **Follow the service skill's patterns** for execution

## Service Skills

### Praetorian CLI (Chariot API)

**Skill**: `.claude/skill-library/claude/mcp-tools/mcp-tools-praetorian-cli/SKILL.md`

Use for: Assets, risks, jobs, seeds, integrations, capabilities, and all Chariot platform operations.

### Linear (Issue Tracking)

**Skill**: `.claude/skill-library/claude/mcp-tools/mcp-tools-linear/SKILL.md`

Use for: Issues, projects, teams, comments, and Linear workflow automation.

### Context7 (Library Documentation)

**Skill**: `.claude/skill-library/claude/mcp-tools/mcp-tools-context7/SKILL.md`

Use for: Looking up library documentation, API references, and package docs.

### Chrome DevTools (Browser Automation)

**Skill**: `.claude/skill-library/claude/mcp-tools/mcp-tools-chrome-devtools/SKILL.md`

Use for: Playwright browser automation, screenshots, page interactions.

### Currents (CI Test Metrics)

**Skill**: `.claude/skill-library/claude/mcp-tools/mcp-tools-currents/SKILL.md`

Use for: CI test performance metrics, flaky test detection, test analytics.

### Chariot (Platform)

**Skill**: `.claude/skill-library/claude/mcp-tools/mcp-tools-chariot/SKILL.md`

Use for: Chariot-specific platform operations and integrations.

## Dynamic Discovery

For the latest available tools, use the discovery script:

```bash
# List all services and tools
npx tsx .claude/tools/discover.ts

# List tools for a specific service
npx tsx .claude/tools/discover.ts praetorian-cli

# Search for tools by name
npx tsx .claude/tools/discover.ts linear issue
```

## Quick Reference

| Need | Read This Skill |
|------|-----------------|
| Chariot assets/risks/jobs | mcp-tools-praetorian-cli |
| Linear issues/projects | mcp-tools-linear |
| Library documentation | mcp-tools-context7 |
| Browser automation | mcp-tools-chrome-devtools |
| CI test metrics | mcp-tools-currents |

## Agent Requirements

Agents using MCP wrappers MUST have:

```yaml
tools:
  - Bash   # REQUIRED: Execute TypeScript (npx tsx)
  - Read   # REQUIRED: Load service skills and discover tools
```

## Execution Pattern

All wrappers execute via Bash with `npx tsx`:

```bash
npx tsx -e "(async () => {
  const { toolName } = await import('./.claude/tools/service/tool-name.ts');
  const result = await toolName.execute({ params });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

## Token Savings

- **Session start**: 0 tokens (was 71.8k)
- **Per import**: ~50-100 tokens
- **On-demand only**: Tools load when used

## When to Use This Gateway

Use this gateway when:
- Starting work that requires external API calls
- Unsure which MCP service skill to use
- Need overview of available MCP wrapper capabilities

For specific implementations, load the individual service skill.

## Related

- **mcp-manager**: Create/update/audit MCP wrappers (use `/mcp-manager` command)
- **Full architecture**: `docs/MCP-TOOLS-ARCHITECTURE.md`

## MCP Tools

**Mcp Tools Chariot**: `.claude/skill-library/claude/mcp-tools/mcp-tools-chariot/SKILL.md`
- Use when accessing chariot services - provides 2 tools for query, schema. References mcp-tools-registry for Bash + tsx execution patterns. Enables granular agent access control.


**Mcp Tools Chrome Devtools**: `.claude/skill-library/claude/mcp-tools/mcp-tools-chrome-devtools/SKILL.md`
- Use when accessing chrome-devtools services - provides 26 tools for click, close-page, drag, and more. References mcp-tools-registry for Bash + tsx execution patterns. Enables granular agent access control.

**Mcp Tools Context7**: `.claude/skill-library/claude/mcp-tools/mcp-tools-context7/SKILL.md`
- Use when accessing context7 services - provides 2 tools for get-library-docs, resolve-library-id. References mcp-tools-registry for Bash + tsx execution patterns. Enables granular agent access control.

**Mcp Tools Currents**: `.claude/skill-library/claude/mcp-tools/mcp-tools-currents/SKILL.md`
- Use when accessing currents services - provides 8 tools for get-projects, get-run-details, get-runs, and more. References mcp-tools-registry for Bash + tsx execution patterns. Enables granular agent access control.

**Mcp Tools Linear**: `.claude/skill-library/claude/mcp-tools/mcp-tools-linear/SKILL.md`
- Use when accessing linear services - provides 19 tools for create-bug, create-comment, create-issue, and more. References mcp-tools-registry for Bash + tsx execution patterns. Enables granular agent access control.

**Mcp Tools Nebula**: `.claude/skill-library/claude/mcp-tools/mcp-tools-nebula/SKILL.md`
- Use when accessing nebula services - provides 5 tools for access-key-to-account-id, apollo, public-resources, and more. References mcp-tools-registry for Bash + tsx execution patterns. Enables granular agent access control.

**Mcp Tools Praetorian Cli**: `.claude/skill-library/claude/mcp-tools/mcp-tools-praetorian-cli/SKILL.md`
- Use when accessing praetorian-cli services - provides 15 tools for aegis-list, assets-get, assets-list, and more. References mcp-tools-registry for Bash + tsx execution patterns. Enables granular agent access control.

**Mcp Tools Registry**: `.claude/skill-library/claude/mcp-tools/mcp-tools-registry/SKILL.md`
- Use when calling any external API or service (Linear, Praetorian CLI, GitHub, Playwright) - provides registry of MCP tool wrappers in .claude/tools/ with TRUE progressive loading achieving 0 tokens at session start (was 71.8k tokens). REQUIRED before implementing API calls. Tools load ONLY when imported.
