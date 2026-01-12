# Context Management

## Fresh Subagent Per Task

Each Task dispatch creates a **NEW agent instance**. This is intentional:

- **No context pollution**: Previous tool details don't confuse current tool
- **Clean slate**: Each agent starts with only the context you provide
- **Parallel safe**: Multiple agents can work on different tools without interference
- **Batch boundaries**: Each batch gets fresh agents with updated shared context

## DO NOT

- Manually fix agent work (pollutes orchestrator context)
- Ask agent to "continue" previous tool work (context lost)
- Reuse agent instance across tools (context accumulates and causes bleeding)
- Manually implement wrappers yourself (bypasses TDD gates and quality checks)

## If Agent Fails

Dispatch **NEW fix agent** with specific instructions:

```
Task(
  subagent_type: "mcp-tool-developer",
  description: "Fix issue in get-issue wrapper",
  prompt: "
    Previous implementation had this issue: [specific issue from review]

    Fix ONLY this issue. Do not refactor other wrappers.

    CONTEXT:
    - Architecture decision: [paste from architecture.md]
    - Shared patterns: [paste from shared-infrastructure.md]
    - Original task: [paste from implementation-checklist.md]

    OUTPUT_DIRECTORY: .claude/.output/mcp-wrappers/linear/
  "
)
```

Do NOT try to guide the failed agent through fixes.

## Fresh Context Per Batch

When implementing tools in batches (Phase 6):

1. **Load shared context** from architecture.md and shared-infrastructure.md
2. **Spawn fresh agents** for batch tools (3-5 tools per batch)
3. **Review batch results** together
4. **Update shared context** if patterns discovered
5. **Spawn fresh agents** for next batch with updated context

```typescript
// ✅ CORRECT: Fresh agents per batch with updated context
for (const batch of batches) {
  // Load current shared context
  const sharedContext = loadSharedContext();

  // Spawn fresh agents for this batch
  const batchResults = await Promise.all(
    batch.tools.map((tool) =>
      Task({
        subagent_type: "mcp-tool-developer",
        description: `Implement ${tool} wrapper`,
        prompt: buildPromptWithSharedContext(tool, sharedContext),
      })
    )
  );

  // Review results
  const patterns = extractPatterns(batchResults);

  // Update shared context for next batch
  updateSharedContext(patterns);
}
```

```typescript
// ❌ WRONG: Asking same agent to continue
Task({
  description: "Continue with next tool",
  prompt: "Now implement list-issues using the same patterns",
});
// Agent has no context from previous tool
```

## Agent Context Isolation

Each agent receives:

1. **Task-specific context** - Only information about current tool
2. **Shared architecture** - Architecture decisions that apply to all tools
3. **Shared infrastructure** - Common utilities and patterns
4. **No tool bleeding** - No details from other tools' implementations

```markdown
## Agent Prompt Structure

### ✅ CORRECT: Isolated context

You are implementing the **get-issue** wrapper for Linear MCP.

TOOL SCHEMA:

```json
{
  "name": "get-issue",
  "description": "Get issue by ID",
  "inputSchema": {...}
}
```

SHARED ARCHITECTURE:
[Paste architecture decisions]

SHARED INFRASTRUCTURE:
[Paste common utilities]

DO NOT reference other tools. Focus only on get-issue.
```

### ❌ WRONG: Context bleeding

You are implementing Linear wrappers.

Tools:

- get-issue
- list-issues
- create-issue

Implement all three following the same pattern.
// Agent will be confused about which tool to focus on
```

## Orchestrator Context Management

The orchestrator maintains:

1. **Progress state** - Current phase, batch, tools completed
2. **Shared decisions** - Architecture decisions from Phase 3
3. **Issue tracking** - Cumulative issues across all tools
4. **No implementation details** - Only metadata, not code

```typescript
// ✅ CORRECT: Orchestrator tracks metadata only
orchestratorState = {
  currentPhase: "implementation",
  currentBatch: 2,
  toolsCompleted: ["get-issue", "list-issues", "create-issue"],
  cumulativeIssues: 2,
  sharedDecisions: [
    "Use Result type for error handling",
    "Token budget: 2000 per wrapper",
  ],
};
```

```typescript
// ❌ WRONG: Orchestrator stores implementation details
orchestratorState = {
  getIssueImplementation: "export function getIssue...", // NO
  listIssuesCode: "...", // NO
};
// This pollutes orchestrator context and prevents parallel work
```

## Why This Matters

### Problem: Context Pollution

```
Orchestrator: "Implement get-issue wrapper"
Agent: [Implements get-issue, includes patterns A, B, C]

Orchestrator: "Now implement list-issues"
[Orchestrator has get-issue code in context]
Agent: [Assumes list-issues should follow exact same structure]
// Agent doesn't think independently, just copies patterns
```

### Solution: Fresh Context

```
Orchestrator: "Implement get-issue wrapper"
Agent 1: [Implements get-issue independently]

Orchestrator: "Implement list-issues wrapper"
Agent 2: [Fresh agent, no knowledge of get-issue]
// Agent thinks independently about list-issues requirements
```

## Related References

- [Phase 5: Schema Discovery](../SKILL.md#phase-5-red-gate-failing-tests) - Schema per tool
- [Phase 6: Implementation](../SKILL.md#phase-6-green-gate-implementation) - Batch isolation
- [Agent Prompts](agent-prompts.md) - Context boundaries
- [Troubleshooting](troubleshooting.md) - Context loss recovery
