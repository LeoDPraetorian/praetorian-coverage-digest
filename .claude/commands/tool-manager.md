---
description: Tool wrapper management - create, update, audit, fix, test MCP and REST API wrappers with TDD enforcement
argument-hint: <create|update|audit|fix|test> [service] [tool]
model: sonnet
allowed-tools: Skill, AskUserQuestion
skills: managing-tool-wrappers
---

# Tool Wrapper Management

**ACTION:** Invoke the `managing-tool-wrappers` skill for ALL operations.

**Arguments:**

- `$1` - Subcommand (create, verify-red, generate-wrapper, verify-green, update, audit, fix, test, generate-skill)
- `$2` - Service name or service/tool (e.g., zen, linear, context7, linear/get-issue)
- `$3` - Tool name or options (e.g., get-document, --all, --dry-run, --phase N)

**Routing Logic:**

```
ALL subcommands → Invoke managing-tool-wrappers skill with all arguments
                → Skill routes internally:
                    - create → AskUserQuestion (MCP or API?) then:
                        - MCP Server → orchestrating-mcp-development
                        - REST API → orchestrating-api-tool-development
                    - audit, fix, test, etc. → CLI scripts
```

**Critical Rules:**

1. **SINGLE ENTRY POINT:** ALL operations route to `managing-tool-wrappers` skill
2. **SKILL HANDLES ROUTING:** `managing-tool-wrappers` decides internal routing (orchestration vs CLI)
3. **DELEGATE COMPLETELY:** Invoke the skill and display output verbatim
4. **DO NOT BYPASS:** Do not attempt to execute operations yourself

**Note:** The `managing-tool-wrappers` skill handles all wrapper lifecycle operations (MCP servers like Context7/Perplexity and REST APIs like Shodan/Linear) - routing `create` to the appropriate multi-agent orchestration workflow and other operations to CLI scripts.

---
