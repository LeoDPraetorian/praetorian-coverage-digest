# Batch Mode Guide - All Tools

**When to use**: User wants to wrap ALL tools from a service

## Workflow

1. Start MCP server ONCE
2. Call `tools/list` to enumerate all tools
3. **For EACH tool** in the list:
   - Phase 1: Explore and document (3+ test cases)
   - Phase 2: Generate tests (18+ tests)
   - Phase 3: RED Verification (vitest fails)
   - Phase 4: Generate wrapper scaffold
   - Phase 5: Implement wrapper
   - Phase 6: GREEN Verification (vitest passes, coverage ≥80%)
   - Phase 7: Structural Audit
4. Phase 8: Create service skill ONCE (includes all tools)
5. Stop MCP server ONCE

## Efficiency Benefits

- One MCP start/stop for N tools
- Parallel-ready (could process tools concurrently)
- Single service skill generation at end

## Example

```
User: Create wrappers for zen MCP
Skill: Which tools to wrap?
User: All tools

Skill discovers 8 tools from zen MCP:
1. get-document ✅ (2 min)
2. search-docs ✅ (2 min)
3. create-doc ✅ (2 min)
4. update-doc ✅ (2 min)
5. delete-doc ✅ (2 min)
6. list-docs ✅ (2 min)
7. get-metadata ✅ (2 min)
8. search-metadata ✅ (2 min)

Total: 16 minutes for 8 wrappers
Service skill: mcp-tools-zen with 8 tools documented
```

## Verification (Batch Mode)

- [ ] MCP server auto-started once
- [ ] All tools enumerated from `tools/list`
- [ ] Discovery doc exists for EACH tool
- [ ] Tests generated for EACH tool
- [ ] All wrappers pass GREEN verification
- [ ] MCP server stopped after all tools processed

## Critical Rules in Batch Mode

**Run gates for EACH tool (cannot skip any)**

Not acceptable:

- ❌ Skipping a tool because "it looks similar to another"
- ❌ Reusing tests from another tool without modification
- ❌ Skipping RED/GREEN verification for "simple" tools

Each tool gets its own complete TDD cycle.
