# Large Service Handling

Strategies for orchestrating MCP wrappers for services with 15-30+ tools.

## Overview

Large MCP services (15+ tools) require specialized orchestration strategies to:

1. **Prevent session timeouts** - Long-running workflows exceed context window limits
2. **Manage agent parallelism** - Too many concurrent agents overwhelm execution
3. **Maintain progress visibility** - Users need status updates for multi-hour workflows
4. **Enable resumability** - Workflows should survive interruptions

This reference defines batch sizing, checkpoint triggers, progress persistence, and timing estimates for large services.

## Service Size Classification

| Size            | Tool Count | Batch Size | Estimated Duration | Progress Checkpoints | Persistence  |
| --------------- | ---------- | ---------- | ------------------ | -------------------- | ------------ |
| **Small**       | 5-10       | 5          | 45-90 min          | Phase 12 only        | Optional     |
| **Medium**      | 11-15      | 4          | 90-135 min         | Phase 9 + Phase 12   | Recommended  |
| **Large**       | 16-25      | 3-4        | 2-4 hours          | Every 8-12 tools     | **Required** |
| **Extra Large** | 26-40+     | 3          | 4-8 hours          | Every 6-9 tools      | **Required** |

## Batch Sizing Recommendations

### Dynamic Batch Size Calculation

```typescript
function calculateBatchSize(
  tool_count: number,
  avg_complexity: "simple" | "medium" | "complex"
): number {
  // Base batch size
  let batch_size = 5;

  // Adjust for tool count
  if (tool_count >= 21) batch_size = 3;
  else if (tool_count >= 11) batch_size = 4;

  // Adjust for complexity
  if (avg_complexity === "complex") {
    batch_size = Math.max(2, batch_size - 1);
  }

  return batch_size;
}
```

### Complexity Indicators

Assess tool complexity during Phase 3 (Schema Discovery):

| Indicator            | Simple | Medium    | Complex   |
| -------------------- | ------ | --------- | --------- |
| Input fields         | <5     | 5-10      | >10       |
| Response token count | <1000  | 1000-5000 | >5000     |
| Nested structures    | None   | 1 level   | 2+ levels |
| Error scenarios      | <3     | 3-5       | >5        |
| Security validation  | Basic  | Moderate  | Extensive |

**Example calculation:**

```
Service: GitHub MCP
Tool count: 28
Average complexity: Medium (5-8 input fields, 2000-3000 token responses)

Batch size: 3 (due to tool count ≥21)
```

### Batch Size Override

Allow manual override via AskUserQuestion after Phase 3:

```typescript
AskUserQuestion({
  questions: [
    {
      header: "Batch Size Configuration",
      question: `Discovered {N} tools with {complexity} average complexity.\n\n**Recommended batch size:** {recommended}\n\n**Estimated time:** {duration}\n\nAdjust batch size?`,
      multiSelect: false,
      options: [
        {
          label: `Use recommended (${recommended})`,
          description: `Process ${recommended} tools per batch`,
        },
        {
          label: "Smaller batches",
          description: "More frequent checkpoints, slower overall",
        },
        {
          label: "Larger batches",
          description: "Fewer checkpoints, faster but higher risk",
        },
      ],
    },
  ],
});
```

## Session Timeout Prevention

### Timeout Risk Factors

| Factor                        | Risk Level | Mitigation                                   |
| ----------------------------- | ---------- | -------------------------------------------- |
| Tool count >20                | High       | Required: Progress persistence               |
| Complex schema (>5000 tokens) | Medium     | Reduce batch size to 3                       |
| >2 hour estimated duration    | High       | Required: Progress persistence + checkpoints |
| Context window >150k tokens   | High       | Batch size ≤3, frequent saves                |

### Token Budget Management

Monitor token usage throughout workflow:

```typescript
// Track cumulative token usage
const token_tracker = {
  phase_3_architecture: 0,
  phase_4_per_tool: {},
  phase_6_implementation: {},
  phase_7_review: {},
  cumulative: 0,
};

// After each batch
function updateTokenBudget(batch: string[], phase: number) {
  const batch_tokens = calculateBatchTokens(batch, phase);
  token_tracker.cumulative += batch_tokens;

  // Warning threshold: 150k tokens
  if (token_tracker.cumulative > 150000) {
    console.warn("⚠️ Token budget >150k - recommend checkpoint and session refresh");
  }
}
```

### Checkpoint Frequency for Large Services

| Tool Count | Checkpoint Every         | Rationale         |
| ---------- | ------------------------ | ----------------- |
| 16-20      | 8 tools (2 batches of 4) | ~90 min intervals |
| 21-30      | 6 tools (2 batches of 3) | ~60 min intervals |
| 31-40+     | 9 tools (3 batches of 3) | ~90 min intervals |

More frequent checkpoints for extra large services balance progress visibility with overhead.

## Progress Persistence Integration

### When to Invoke persisting-progress-across-sessions

Invoke the skill at Phase 1 if:

```typescript
const should_persist = (
  tools_selected >= 15 ||
  estimated_duration_hours >= 2 ||
  user_requested_pausable
)

if (should_persist) {
  Skill(skill: 'persisting-progress-across-sessions', args: 'initialize')
}
```

### Save Triggers

Save MANIFEST.yaml after:

1. **Each batch completion** (Phases 4, 6, 7)
2. **Each gate pass** (Phases 5, 8, 9)
3. **Each human checkpoint** (Phase 3, progress reports)
4. **Any escalation** (retry limit, issue threshold)
5. **User-initiated pause** (via "Pause" option in checkpoint)

### Resume Protocol

When user resumes workflow:

```typescript
// 1. Detect existing progress file
const progress_file = findProgressFile(service);

if (progress_file) {
  // 2. Load and validate
  const progress = loadProgress(progress_file);

  // 3. Display resume summary
  console.log(`
## Resume MCP Development: ${progress.service}

**Status:** ${progress.status}
**Progress:** ${progress.completed_tools}/${progress.total_tools} tools (${Math.round((progress.completed_tools / progress.total_tools) * 100)}%)
**Last session:** ${progress.last_updated}

**Current phase:** Phase ${progress.current_phase} - ${progress.phases[progress.current_phase].name}
**Current batch:** Batch ${progress.current_batch} of ${progress.batches_total}

**Next action:** ${progress.next_action}
  `);

  // 4. Ask user to confirm resume
  AskUserQuestion({
    questions: [
      {
        header: "Resume MCP Development",
        question: "[Resume summary above]\n\nResume from this checkpoint?",
        multiSelect: false,
        options: [
          {
            label: "Resume",
            description: `Continue from ${progress.next_action}`,
          },
          {
            label: "Start over",
            description: "Discard progress and restart workflow",
          },
          {
            label: "Show details",
            description: "View complete progress file",
          },
        ],
      },
    ],
  });

  // 5. Continue workflow from checkpoint
  if (user_choice === "Resume") {
    resumeWorkflow(progress);
  }
}
```

## Batch Progress Tracking

### Metadata Updates Per Batch

After each batch completes all phases (4, 6, 7):

```json
{
  "batches": {
    "batch_1": {
      "tools": ["get-issue", "list-issues", "create-issue"],
      "status": "complete",
      "phases": {
        "architecture": { "completed_at": "2025-01-11T10:30:00Z" },
        "test_planning": { "completed_at": "2025-01-11T10:45:00Z" },
        "test_implementation": { "completed_at": "2025-01-11T11:00:00Z" },
        "implementation": { "completed_at": "2025-01-11T11:30:00Z" },
        "review": { "completed_at": "2025-01-11T12:00:00Z" }
      },
      "retry_count": 1,
      "issues_encountered": 1
    }
  }
}
```

### Real-Time Progress Display

For long-running batches, show progress:

```
Phase 8: Implementation - Batch 3 of 10

Tools in batch: [search-issues, filter-issues, sort-issues]

✓ search-issues (4 min)
⏳ filter-issues (in progress)
⏸ sort-issues (pending)

Batch progress: 33%
Overall progress: 21/28 tools (75%)
```

## Performance Optimization

### Parallel Agent Spawning

Within each batch, spawn agents in parallel:

```typescript
// Phase 6: Per-Tool Work - Batch 1
const batch = ['get-issue', 'list-issues', 'create-issue']

// Architecture (parallel)
Task(subagent_type: 'tool-lead', prompt: 'Design get-issue', run_in_background: true)
Task(subagent_type: 'tool-lead', prompt: 'Design list-issues', run_in_background: true)
Task(subagent_type: 'tool-lead', prompt: 'Design create-issue', run_in_background: true)

// Wait for all to complete before proceeding to test planning
```

### Token Budget Optimization

For extra large services, optimize token usage:

1. **Shared context references** - Don't repeat architecture-shared.md in every prompt
2. **Summary attachments** - Attach 1-2 sentence summaries instead of full files
3. **Progressive loading** - Load library skills only when needed
4. **Batch consolidation** - Update MANIFEST.yaml once per batch, not per tool

## Related References

- [Large Service Timing](large-service-timing.md) - Per-tool and service-level timing estimates
- [Large Service Examples](large-service-examples.md) - Complete workflow examples for 18, 28, and 40 tool services
- [Checkpoint Configuration](checkpoint-configuration.md) - Checkpoint triggers and formats
- [Progress Persistence](progress-persistence.md) - Session management details
- [Rationalization Table](rationalization-table.md) - Large service rationalizations
