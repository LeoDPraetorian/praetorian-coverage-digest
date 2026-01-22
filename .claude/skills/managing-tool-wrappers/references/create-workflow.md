# Create Workflow

**Wrapper creation uses multi-agent orchestration workflows.**

## Determining Tool Type

First, determine what type of tool you're wrapping by asking the user:

```
AskUserQuestion({
  questions: [{
    header: "Tool Type",
    question: "What type of tool are you wrapping?",
    multiSelect: false,
    options: [
      {
        label: "MCP Server (Recommended)",
        description: "Wrap an existing MCP server like Context7 or Perplexity"
      },
      {
        label: "REST/HTTP API",
        description: "Wrap a REST API directly like Shodan or Linear"
      }
    ]
  }]
})
```

## MCP Server Orchestration

**If MCP Server selected:**

Load the orchestration skill:

```
Read(".claude/skill-library/claude/mcp-management/orchestrating-mcp-development/SKILL.md")
```

The `orchestrating-mcp-development` skill provides:

1. **Phase 0-1**: Setup workspace and configure MCP server
2. **Phase 2**: Tool discovery - find ALL tools in the MCP service
3. **Phase 3**: Shared architecture design (tool-lead + security-lead in PARALLEL)
4. **Phase 4**: Per-tool architecture + test planning (BATCHED, 3-5 tools)
5. **Phase 5**: RED Gate - all tests must fail
6. **Phase 6**: Implementation (tool-developer, BATCHED)
7. **Phase 7**: Code review (tool-reviewer, max 1 retry per tool)
8. **Phase 8**: GREEN Gate - all tests pass with ≥80% coverage
9. **Phase 9**: Audit - all wrappers pass ≥10/11 phases
10. **Phase 10**: Completion - generate service skill

**Why multi-agent orchestration?**

- **100% tool coverage** - wraps ALL tools in an MCP service
- **Shared patterns** - consistent architecture across all wrappers
- **Batched parallel execution** - efficient processing of multiple tools
- **Quality gates** - human checkpoint, code review, coverage enforcement
- **CLI gates still enforce mechanical TDD** (verify-red, verify-green unchanged)

**After creation, verify compliance:**

```bash
npm run audit -- {service}
# Target: ≥10/11 phases pass for ALL wrappers
```

**See**: `orchestrating-mcp-development` skill for complete 11-phase workflow

## REST/HTTP API Orchestration

**If REST/HTTP API selected:**

Load the API orchestration skill:

```
Read(".claude/skill-library/claude/mcp-management/orchestrating-api-tool-development/SKILL.md")
```

The `orchestrating-api-tool-development` skill provides a simpler TDD workflow for REST APIs:

1. **RED Phase**: tool-tester writes failing tests first
2. **GREEN Phase**: tool-developer implements wrapper
3. **REVIEW Phase**: tool-reviewer validates code quality

**Why use API wrapper instead of MCP?**

- Target API has no MCP server available
- Direct HTTP access with token optimization
- Examples: Shodan, VirusTotal, Censys, Linear GraphQL

**After creation, verify compliance:**

```bash
npm run audit -- {service}
# Target: ≥10/11 phases pass for ALL wrappers
```

**See**: `orchestrating-api-tool-development` skill for complete TDD workflow
