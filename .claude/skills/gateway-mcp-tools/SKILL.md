---
name: gateway-mcp-tools
description: Use when calling external APIs (Linear, Praetorian CLI, Context7, Chrome DevTools, Currents, Nebula, Chariot). Routes to 8 MCP wrapper skills with 0 tokens at startup. Two-tier gateway system for progressive loading.
allowed-tools: Read, Bash
---

# MCP Tools Gateway

## Understanding This Gateway

This gateway uses Chariot's **two-tier skill system**:

- **Tier 1 (Core)**: This gateway skill in `.claude/skills/` - lightweight routing directory
- **Tier 2 (Library)**: Service skills in `.claude/skill-library/claude/mcp-tools/` - detailed implementation patterns

The gateway provides 0 tokens at session start (was 71.8k with native MCPs) by loading wrapper skills only when needed.

## How to Use

This skill serves as a master directory for all MCP tool wrapper skills. When you need to call external APIs:

1. **Identify the service skill** from the list below
2. **Use the Read tool** with the provided path to load the service skill
3. **Follow the service skill's patterns** for execution

<IMPORTANT>
Library skills are NOT automatically loaded. You MUST:

1. Invoke this gateway: `skill: "gateway-mcp-tools"`
2. Read the service skill path from Service Skills section below
3. Follow service patterns for wrapper execution via `npx tsx`

Example: For Linear API calls, use `Read(".claude/skill-library/claude/mcp-tools/mcp-tools-linear/SKILL.md")`

❌ WRONG: Calling MCP tools directly without loading service skill
✅ RIGHT: Read service skill first, then follow its execution patterns
</IMPORTANT>

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

### Nebula (Multi-Cloud Security)

**Skill**: `.claude/skill-library/claude/mcp-tools/mcp-tools-nebula/SKILL.md`

Use for: Multi-cloud security scanning, access key operations, public resource discovery.

### MCP Registry (Tool Discovery)

**Skill**: `.claude/skill-library/claude/mcp-tools/mcp-tools-registry/SKILL.md`

Use for: Registry of all MCP tool wrappers, progressive loading patterns, tool discovery.

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

| Need                      | Read This Skill Path                                                        |
| ------------------------- | --------------------------------------------------------------------------- |
| Chariot assets/risks/jobs | `.claude/skill-library/claude/mcp-tools/mcp-tools-praetorian-cli/SKILL.md`  |
| Linear issues/projects    | `.claude/skill-library/claude/mcp-tools/mcp-tools-linear/SKILL.md`          |
| Library documentation     | `.claude/skill-library/claude/mcp-tools/mcp-tools-context7/SKILL.md`        |
| Browser automation        | `.claude/skill-library/claude/mcp-tools/mcp-tools-chrome-devtools/SKILL.md` |
| CI test metrics           | `.claude/skill-library/claude/mcp-tools/mcp-tools-currents/SKILL.md`        |

## Agent Requirements

Agents using MCP wrappers MUST have:

```yaml
tools:
  - Bash # REQUIRED: Execute TypeScript (npx tsx)
  - Read # REQUIRED: Load service skills and discover tools
```

**MANDATORY**: You MUST use TodoWrite before starting to track all workflow steps when working with multiple MCP wrapper calls or complex API integrations.

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

## Creating MCP Wrappers

**When**: Creating new MCP wrappers

**Skill**: [creating-mcp-wrappers](../creating-mcp-wrappers/SKILL.md)

**What it provides**:

- Schema discovery (Claude explores MCP interactively)
- Test design (Claude reasons about test cases - ≥18 tests across 6 categories)
- Implementation guidance (Claude implements from schema discovery docs)
- CLI gates (verify-red, verify-green enforce TDD mechanically)

**Use this for**: End-to-end wrapper creation with hybrid approach (instruction-based discovery/design + CLI enforcement).

**Time**: ~20-30 minutes (vs ~45 minutes manual workflow)

## Related

- **managing-mcp-wrappers**: Wrapper lifecycle management - update/audit/fix existing wrappers (use `/mcp-manager` command)
- **creating-mcp-wrappers**: Create new wrappers with instruction-driven workflow (use skill above)
- **Full architecture**: `docs/MCP-TOOLS-ARCHITECTURE.md`
