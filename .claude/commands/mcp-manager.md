---
description: MCP wrapper management - create, update, audit, fix, test MCP tool wrappers with TDD enforcement
argument-hint: <create|verify-red|generate-wrapper|verify-green|update|audit|fix|test|generate-skill> [service] [tool]
model: sonnet
allowed-tools: Skill, AskUserQuestion
skills: mcp-manager
---

# MCP Wrapper Management

**ACTION:**

**For `create` subcommand**: Invoke the `creating-mcp-wrappers` skill.
**For all other subcommands**: Invoke the `mcp-manager` skill.

**Arguments:**

- `$1` - Subcommand (create, verify-red, generate-wrapper, verify-green, update, audit, fix, test, generate-skill)
- `$2` - Service name or service/tool (e.g., zen, linear, context7, linear/get-issue)
- `$3` - Tool name or options (e.g., get-document, --all, --dry-run, --phase N)

**Routing Logic:**

```
If $1 == "create":
  → Invoke creating-mcp-wrappers skill with service name from $2
  → Skill will ask for tool name via AskUserQuestion
  → Automated: install, start MCP, explore, document, cleanup

Else (verify-red, verify-green, audit, fix, etc.):
  → Invoke mcp-manager skill with all arguments
  → CLI scripts handle mechanical operations
```

**Critical Rules:**

1. **CREATE DELEGATES TO SKILL:** `create` operations use instruction-driven `creating-mcp-wrappers` skill
2. **CLI OPS USE MCP-MANAGER:** verify-red, verify-green, audit, etc. use CLI via `mcp-manager` skill
3. **DELEGATE COMPLETELY:** Invoke the skill and display output verbatim
4. **DO NOT SEARCH:** Do not attempt to find wrapper files yourself

**TDD Workflow (hybrid):**

1. `/mcp-manager create zen` - Invokes creating-mcp-wrappers skill (instruction-driven)
   - Auto-downloads MCP server
   - Explores and documents schema
   - Designs and writes tests
   - Hands off to CLI gates for enforcement

2. CLI gates (called by skill):
   - `verify-red` - Mechanical verification (tests fail)
   - `generate-wrapper` - Template generation (blocked until RED)
   - `verify-green` - Mechanical verification (tests pass, ≥80%)

---

## Quick Reference

| Command                                           | Description                    | Handler |
| ------------------------------------------------- | ------------------------------ | ------- |
| `/mcp-manager create <service>`                   | Create wrapper (instruction-driven) | creating-mcp-wrappers skill |
| `/mcp-manager verify-red <service>/<tool>`        | Verify tests fail (mechanical) | CLI via mcp-manager |
| `/mcp-manager generate-wrapper <service>/<tool>`  | Generate wrapper (needs RED) | CLI via mcp-manager |
| `/mcp-manager verify-green <service>/<tool>`      | Verify tests pass (≥80%) | CLI via mcp-manager |
| `/mcp-manager update <service> <tool>`            | Update existing wrapper | CLI via mcp-manager |
| `/mcp-manager audit <service>`                    | Audit all wrappers in service | CLI via mcp-manager |
| `/mcp-manager audit <service>/<tool>`             | Audit specific wrapper | CLI via mcp-manager |
| `/mcp-manager audit --all`                        | Audit all services | CLI via mcp-manager |
| `/mcp-manager fix <service>/<tool> [--dry-run]`   | Fix compliance issues | CLI via mcp-manager |
| `/mcp-manager test <service>/<tool> [--coverage]` | Run wrapper tests | CLI via mcp-manager |
| `/mcp-manager generate-skill <service>`           | Generate mcp-tools-{service} | CLI via mcp-manager |
