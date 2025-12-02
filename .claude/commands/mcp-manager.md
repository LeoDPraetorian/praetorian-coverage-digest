---
description: MCP wrapper management - create, update, audit, fix, test MCP tool wrappers with TDD enforcement
argument-hint: <create|verify-red|generate-wrapper|verify-green|update|audit|fix|test|generate-skill> [service] [tool]
model: sonnet
allowed-tools: Skill, AskUserQuestion
skills: mcp-manager
---

# MCP Wrapper Management

**ACTION:** Invoke the `mcp-manager` skill immediately.

**Arguments:**

- `$1` - Subcommand (create, verify-red, generate-wrapper, verify-green, update, audit, fix, test, generate-skill)
- `$2` - Service name or service/tool (e.g., linear, context7, linear/get-issue)
- `$3` - Tool name or options (e.g., get-issue, --all, --dry-run, --phase N)

**Critical Rules:**

1. **TDD ENFORCED:** `generate-wrapper` blocks until `verify-red` passes.
2. **DELEGATE COMPLETELY:** Invoke the skill and display output verbatim.
3. **DO NOT SEARCH:** Do not attempt to find wrapper files yourself.
4. **Output:** Display the CLI output verbatim.

**TDD Workflow (enforced order):**

1. `create <service> <tool>` - Generate test file ONLY
2. `verify-red <service>/<tool>` - Confirm tests fail
3. `generate-wrapper <service>/<tool>` - Create wrapper (blocked until RED)
4. `verify-green <service>/<tool>` - Confirm tests pass (≥80%)

---

## Quick Reference

| Command                                           | Description                    |
| ------------------------------------------------- | ------------------------------ |
| `/mcp-manager create <service> <tool>`            | Generate test file (RED phase) |
| `/mcp-manager verify-red <service>/<tool>`        | Verify tests fail              |
| `/mcp-manager generate-wrapper <service>/<tool>`  | Generate wrapper (needs RED)   |
| `/mcp-manager verify-green <service>/<tool>`      | Verify tests pass (≥80%)       |
| `/mcp-manager update <service> <tool>`            | Update existing wrapper        |
| `/mcp-manager audit <service>`                    | Audit all wrappers in service  |
| `/mcp-manager audit <service>/<tool>`             | Audit specific wrapper         |
| `/mcp-manager audit --all`                        | Audit all services             |
| `/mcp-manager fix <service>/<tool> [--dry-run]`   | Fix compliance issues          |
| `/mcp-manager test <service>/<tool> [--coverage]` | Run wrapper tests              |
| `/mcp-manager generate-skill <service>`           | Generate mcp-tools-{service}   |
