---
description: MCP wrapper management - create, update, audit, fix, test MCP tool wrappers with TDD enforcement
argument-hint: <create|verify-red|generate-wrapper|verify-green|update|audit|fix|test|generate-skill> [service] [tool]
model: sonnet
allowed-tools: Skill, AskUserQuestion
skills: managing-mcp-wrappers, creating-mcp-wrappers
---

# MCP Wrapper Management

**ACTION:**

**For `create` subcommand**: Invoke the `creating-mcp-wrappers` skill.
**For all other subcommands**: Invoke the `managing-mcp-wrappers` skill.

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
  → Invoke managing-mcp-wrappers skill with all arguments
  → CLI scripts handle mechanical operations
```

**Critical Rules:**

1. **CREATE DELEGATES TO SKILL:** `create` operations use instruction-driven `creating-mcp-wrappers` skill
2. **CLI OPS USE MANAGING-MCP-WRAPPERS:** verify-red, verify-green, audit, etc. use CLI via `managing-mcp-wrappers` skill
3. **DELEGATE COMPLETELY:** Invoke the skill and display output verbatim
4. **DO NOT BYPASS:** Do not attempt to execute operations yourself

**Note:** The `managing-mcp-wrappers` skill handles all CLI-based MCP wrapper lifecycle operations with mandatory TDD enforcement.

---
