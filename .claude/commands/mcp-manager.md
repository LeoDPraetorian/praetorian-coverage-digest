---
description: MCP wrapper management - create, update, audit, fix, test MCP tool wrappers with TDD enforcement
argument-hint: <create|update|audit|fix|test> [service] [tool]
model: sonnet
allowed-tools: Skill, AskUserQuestion
skills: managing-mcp-wrappers
---

# MCP Wrapper Management

**ACTION:** Invoke the `managing-mcp-wrappers` skill for ALL operations.

**Arguments:**

- `$1` - Subcommand (create, verify-red, generate-wrapper, verify-green, update, audit, fix, test, generate-skill)
- `$2` - Service name or service/tool (e.g., zen, linear, context7, linear/get-issue)
- `$3` - Tool name or options (e.g., get-document, --all, --dry-run, --phase N)

**Routing Logic:**

```
ALL subcommands → Invoke managing-mcp-wrappers skill with all arguments
                → Skill routes internally:
                    - create → orchestrating-mcp-development (multi-agent workflow)
                    - audit, fix, test, etc. → CLI scripts
```

**Critical Rules:**

1. **SINGLE ENTRY POINT:** ALL operations route to `managing-mcp-wrappers` skill
2. **SKILL HANDLES ROUTING:** `managing-mcp-wrappers` decides internal routing (orchestration vs CLI)
3. **DELEGATE COMPLETELY:** Invoke the skill and display output verbatim
4. **DO NOT BYPASS:** Do not attempt to execute operations yourself

**Note:** The `managing-mcp-wrappers` skill handles all MCP wrapper lifecycle operations - routing `create` to multi-agent orchestration and other operations to CLI scripts.

---
