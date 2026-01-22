# Phase 6: Per-Tool Work (BATCHED)

For each tool, create tool-specific architecture, test plan, and test implementation.

This phase processes tools in batches of 3-5 to manage parallelism.

**For each batch of tools:**

```typescript
// Example: Batch 1 = ['get-issue', 'list-issues', 'create-issue']

// 4a. Per-tool architecture (parallel within batch)
Task(subagent_type: 'tool-lead', prompt: 'Design tool-specific architecture for get-issue.

SHARED patterns (use these): [attach architecture-shared.md]
Tool schema: [attach tools/get-issue/schema-discovery.md]

Design tool-specific:
- Input schema (Zod) specific to this tool
- Output filtering (which fields to keep for this tool)
- Edge cases specific to this tool

Output: .claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{service}/tools/get-issue/architecture.md')

// Spawn similar for list-issues, create-issue in same message

// 4b. Test planning (after architecture complete)
Task(subagent_type: 'tool-tester', prompt: 'Create test plan for get-issue wrapper.

Shared patterns: [attach architecture-shared.md]
Tool architecture: [attach tools/get-issue/architecture.md]

Requirements: 18 tests across 6 categories per tool.

Output: .claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{service}/tools/get-issue/test-plan.md')

// 4c. Test implementation (after test plan complete)
Task(subagent_type: 'tool-tester', prompt: 'Implement tests for get-issue wrapper.

Test plan: [attach tools/get-issue/test-plan.md]

Output: .claude/tools/{service}/get-issue.unit.test.ts')
```

Update `MANIFEST.yaml` after each batch:

```json
{
  "per_tool": {
    "get-issue": {
      "architecture": "complete",
      "test_planning": "complete",
      "test_implementation": "complete"
    },
    "list-issues": {
      "architecture": "complete",
      "test_planning": "complete",
      "test_implementation": "complete"
    }
  }
}
```

**tool-tester MUST load:**

- .claude/skill-library/testing/testing-with-vitest-mocks/SKILL.md

**Test plan must cover 6 categories:**

| Category           | Min Tests | Examples                                      |
| ------------------ | --------- | --------------------------------------------- |
| Input Validation   | 3         | Required fields, type coercion, refinements   |
| MCP Integration    | 2         | Successful call, error propagation            |
| Response Filtering | 2         | Token reduction, field selection              |
| Security           | 4         | Path traversal, injection, XSS, control chars |
| Edge Cases         | 4         | Null, empty, malformed, large payloads        |
| Error Handling     | 3         | Network timeout, rate limit, auth failure     |

**Output:**

- `tools/{tool}/architecture.md` for each tool
- `tools/{tool}/test-plan.md` for each tool
- `.claude/tools/{service}/{tool}.unit.test.ts` for each tool

For complete tool-tester prompt, see [../agent-prompts.md](../agent-prompts.md#tool-tester).

> **Abort Handling**: If workflow must be aborted mid-batch, see ../troubleshooting.md emergency abort section.
