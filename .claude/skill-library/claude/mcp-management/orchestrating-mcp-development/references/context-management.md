# Context Management

## Inherits From

- `orchestrating-multi-agent-workflows/references/context-monitoring.md` (token thresholds, JSONL analysis, compaction triggers)

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
  subagent_type: "tool-developer",
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

When implementing tools in batches (Phase 8):

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
        subagent_type: "tool-developer",
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

````markdown
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
````

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
  sharedDecisions: ["Use Result type for error handling", "Token budget: 2000 per wrapper"],
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

## Token Monitoring

For services with >10 tools, monitor context usage per orchestrating-multi-agent-workflows:

- **70% (140k tokens)**: Warning, consider batch size reduction
- **85% (170k tokens)**: Mandatory compaction before next batch
- **95% (190k tokens)**: Emergency checkpoint, persist progress

> See `orchestrating-multi-agent-workflows/references/context-monitoring.md` for JSONL parsing script and implementation details.

### MCP-Specific Token Guidance

**Per-Batch Budget Recommendation:**

- **Small services (3-5 tools):** ~15k tokens per batch
- **Medium services (6-10 tools):** ~12k tokens per batch
- **Large services (>10 tools):** ~10k tokens per batch

**Cross-Session Persistence Triggers:**

Use `persisting-progress-across-sessions` skill when:

- Service has **>15 tools** (will exceed single session capacity)
- Estimated duration **>2 hours** (risk of interruption)
- Token usage reaches **85%** mid-workflow (mandatory checkpoint)

**Budget Calculation Example:**

```typescript
// Service with 18 tools
const TOOLS_COUNT = 18;
const TOKEN_BUDGET = 200_000; // Total session budget
const SAFETY_MARGIN = 0.15; // Reserve 15% for overhead
const USABLE_BUDGET = TOKEN_BUDGET * (1 - SAFETY_MARGIN); // 170k tokens

const BATCH_SIZE = 3;
const BATCHES = Math.ceil(TOOLS_COUNT / BATCH_SIZE); // 6 batches
const TOKEN_PER_BATCH = USABLE_BUDGET / BATCHES; // ~28k per batch

// Monitor: If any batch exceeds 28k, reduce BATCH_SIZE to 2
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

- [Phase 7: Schema Discovery](../SKILL.md#phase-5-red-gate-failing-tests) - Schema per tool
- [Phase 8: Implementation](../SKILL.md#phase-6-green-gate-implementation) - Batch isolation
- [Agent Prompts](agent-prompts.md) - Context boundaries
- [Troubleshooting](troubleshooting.md) - Context loss recovery
