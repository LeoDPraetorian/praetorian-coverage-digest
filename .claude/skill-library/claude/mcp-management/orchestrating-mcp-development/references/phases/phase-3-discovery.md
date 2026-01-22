# Phase 1: MCP Setup

Ensure the MCP is configured before tool discovery.

Before exploring an MCP's schema, verify it is set up in mcp-client.ts. If not configured, the setting-up-mcp-servers skill guides installation.

**Check if MCP is configured:**

```bash
grep -q "'{service}'" .claude/tools/config/lib/mcp-client.ts && echo 'configured' || echo 'not configured'
```

If not configured, invoke the setup skill:

Read the skill at `.claude/skill-library/claude/mcp-management/setting-up-mcp-servers/SKILL.md` and follow its 8-step workflow:

1. Check if MCP already configured
2. Ask user for installation source (search/GitHub/local/skip)
3. Search or locate MCP package
4. Determine command configuration
5. Check credential requirements
6. Add config to mcp-client.ts
7. Verify MCP works
8. Return structured result

Handle setup result:

- `status: 'already_configured'` → Proceed to Phase 2
- `status: 'configured'` → Proceed to Phase 2
- `status: 'skipped'` → Warn user, proceed to Phase 3 (may fail)
- `status: 'failed'` → Stop workflow, report error to user

Update MANIFEST.yaml:

```json
{
  "phases": {
    "mcp_setup": {
      "status": "complete",
      "mcp_configured": true,
      "source": "npm|pypi|github|local|existing"
    }
  }
}
```

After setup completes: The MCP is ready. Phase 3 will discover all available tools.

**Output:** MCP configured in mcp-client.ts
