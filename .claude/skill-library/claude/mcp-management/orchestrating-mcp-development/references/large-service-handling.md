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

| Size | Tool Count | Batch Size | Estimated Duration | Progress Checkpoints | Persistence |
|------|------------|------------|-------------------|---------------------|-------------|
| **Small** | 5-10 | 5 | 45-90 min | Phase 10 only | Optional |
| **Medium** | 11-15 | 4 | 90-135 min | Phase 7 + Phase 10 | Recommended |
| **Large** | 16-25 | 3-4 | 2-4 hours | Every 8-12 tools | **Required** |
| **Extra Large** | 26-40+ | 3 | 4-8 hours | Every 6-9 tools | **Required** |

## Batch Sizing Recommendations

### Dynamic Batch Size Calculation

```typescript
function calculateBatchSize(tool_count: number, avg_complexity: 'simple' | 'medium' | 'complex'): number {
  // Base batch size
  let batch_size = 5

  // Adjust for tool count
  if (tool_count >= 21) batch_size = 3
  else if (tool_count >= 11) batch_size = 4

  // Adjust for complexity
  if (avg_complexity === 'complex') {
    batch_size = Math.max(2, batch_size - 1)
  }

  return batch_size
}
```

### Complexity Indicators

Assess tool complexity during Phase 2 (Schema Discovery):

| Indicator | Simple | Medium | Complex |
|-----------|--------|--------|---------|
| Input fields | <5 | 5-10 | >10 |
| Response token count | <1000 | 1000-5000 | >5000 |
| Nested structures | None | 1 level | 2+ levels |
| Error scenarios | <3 | 3-5 | >5 |
| Security validation | Basic | Moderate | Extensive |

**Example calculation:**

```
Service: GitHub MCP
Tool count: 28
Average complexity: Medium (5-8 input fields, 2000-3000 token responses)

Batch size: 3 (due to tool count ≥21)
```

### Batch Size Override

Allow manual override via AskUserQuestion after Phase 2:

```typescript
AskUserQuestion({
  questions: [{
    header: "Batch Size Configuration",
    question: `Discovered {N} tools with {complexity} average complexity.\n\n**Recommended batch size:** {recommended}\n\n**Estimated time:** {duration}\n\nAdjust batch size?`,
    multiSelect: false,
    options: [
      {
        label: `Use recommended (${recommended})`,
        description: `Process ${recommended} tools per batch`
      },
      {
        label: "Smaller batches",
        description: "More frequent checkpoints, slower overall"
      },
      {
        label: "Larger batches",
        description: "Fewer checkpoints, faster but higher risk"
      }
    ]
  }]
})
```

## Session Timeout Prevention

### Timeout Risk Factors

| Factor | Risk Level | Mitigation |
|--------|-----------|------------|
| Tool count >20 | High | Required: Progress persistence |
| Complex schema (>5000 tokens) | Medium | Reduce batch size to 3 |
| >2 hour estimated duration | High | Required: Progress persistence + checkpoints |
| Context window >150k tokens | High | Batch size ≤3, frequent saves |

### Token Budget Management

Monitor token usage throughout workflow:

```typescript
// Track cumulative token usage
const token_tracker = {
  phase_3_architecture: 0,
  phase_4_per_tool: {},
  phase_6_implementation: {},
  phase_7_review: {},
  cumulative: 0
}

// After each batch
function updateTokenBudget(batch: string[], phase: number) {
  const batch_tokens = calculateBatchTokens(batch, phase)
  token_tracker.cumulative += batch_tokens

  // Warning threshold: 150k tokens
  if (token_tracker.cumulative > 150000) {
    console.warn('⚠️ Token budget >150k - recommend checkpoint and session refresh')
  }
}
```

### Checkpoint Frequency for Large Services

| Tool Count | Checkpoint Every | Rationale |
|------------|------------------|-----------|
| 16-20 | 8 tools (2 batches of 4) | ~90 min intervals |
| 21-30 | 6 tools (2 batches of 3) | ~60 min intervals |
| 31-40+ | 9 tools (3 batches of 3) | ~90 min intervals |

More frequent checkpoints for extra large services balance progress visibility with overhead.

## Progress Persistence Integration

### When to Invoke persisting-progress-across-sessions

Invoke the skill at Phase 0 if:

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

### Progress File Structure

The skill will guide creation of:

```json
{
  "workflow": "mcp-development",
  "service": "{service}",
  "created_at": "2025-01-11T10:00:00Z",
  "last_updated": "2025-01-11T12:30:00Z",
  "session_count": 2,
  "status": "in_progress",
  "current_phase": 6,
  "current_batch": 4,
  "total_tools": 28,
  "completed_tools": 12,
  "phases": {
    "0_setup": { "status": "complete", "completed_at": "2025-01-11T10:05:00Z" },
    "1_mcp_setup": { "status": "complete", "completed_at": "2025-01-11T10:10:00Z" },
    "2_tool_discovery": { "status": "complete", "completed_at": "2025-01-11T10:30:00Z" },
    "3_shared_architecture": { "status": "complete", "completed_at": "2025-01-11T11:00:00Z" },
    "4_per_tool": {
      "status": "in_progress",
      "batches_complete": 3,
      "batches_total": 10
    },
    "5_red_gate": { "status": "complete", "completed_at": "2025-01-11T11:45:00Z" },
    "6_implementation": {
      "status": "in_progress",
      "batches_complete": 4,
      "batches_total": 10
    }
  },
  "batches": {
    "batch_1": { "tools": ["get-issue", "list-issues", "create-issue"], "status": "complete" },
    "batch_2": { "tools": ["update-issue", "delete-issue", "find-issue"], "status": "complete" },
    "batch_3": { "tools": ["comment-issue", "assign-issue", "label-issue"], "status": "complete" },
    "batch_4": { "tools": ["search-issues", "filter-issues", "sort-issues"], "status": "in_progress" }
  },
  "next_action": "Complete Phase 6 Batch 4 implementation",
  "resume_instructions": "Resume with Phase 6 Batch 4: tools [search-issues, filter-issues, sort-issues]"
}
```

### Save Triggers

Save progress.json after:

1. **Each batch completion** (Phases 4, 6, 7)
2. **Each gate pass** (Phases 5, 8, 9)
3. **Each human checkpoint** (Phase 3, progress reports)
4. **Any escalation** (retry limit, issue threshold)
5. **User-initiated pause** (via "Pause" option in checkpoint)

### Resume Protocol

When user resumes workflow:

```typescript
// 1. Detect existing progress file
const progress_file = findProgressFile(service)

if (progress_file) {
  // 2. Load and validate
  const progress = loadProgress(progress_file)

  // 3. Display resume summary
  console.log(`
## Resume MCP Development: ${progress.service}

**Status:** ${progress.status}
**Progress:** ${progress.completed_tools}/${progress.total_tools} tools (${Math.round(progress.completed_tools / progress.total_tools * 100)}%)
**Last session:** ${progress.last_updated}

**Current phase:** Phase ${progress.current_phase} - ${progress.phases[progress.current_phase].name}
**Current batch:** Batch ${progress.current_batch} of ${progress.batches_total}

**Next action:** ${progress.next_action}
  `)

  // 4. Ask user to confirm resume
  AskUserQuestion({
    questions: [{
      header: "Resume MCP Development",
      question: "[Resume summary above]\n\nResume from this checkpoint?",
      multiSelect: false,
      options: [
        {
          label: "Resume",
          description: `Continue from ${progress.next_action}`
        },
        {
          label: "Start over",
          description: "Discard progress and restart workflow"
        },
        {
          label: "Show details",
          description: "View complete progress file"
        }
      ]
    }]
  })

  // 5. Continue workflow from checkpoint
  if (user_choice === 'Resume') {
    resumeWorkflow(progress)
  }
}
```

## Timing Estimates

### Per-Tool Time Estimates

Based on historical data, average time per tool per phase:

| Phase | Time per Tool | Notes |
|-------|--------------|-------|
| 2. Schema Discovery | 2-3 min | Manual testing + documentation |
| 4. Architecture | 1-2 min | tool-lead per tool |
| 4. Test Planning | 2-3 min | tool-tester per tool |
| 4. Test Implementation | 3-5 min | tool-tester writes 18 tests |
| 5. RED Gate | <1 min | CLI execution |
| 6. Implementation | 4-6 min | tool-developer per tool |
| 7. Code Review | 2-3 min | tool-reviewer per tool |
| 8. GREEN Gate | 1-2 min | CLI execution with coverage |
| 9. Audit | <1 min | CLI execution per tool |

**Total per tool:** ~15-25 minutes (varies by complexity)

### Service-Level Time Estimates

| Tool Count | Batch Size | Batches | Est. Duration | With Checkpoints |
|------------|------------|---------|---------------|------------------|
| 5 | 5 | 1 | 75-125 min | 90-140 min |
| 10 | 5 | 2 | 150-250 min | 165-275 min |
| 15 | 4 | 4 | 225-375 min | 255-420 min |
| 20 | 4 | 5 | 300-500 min | 345-570 min |
| 25 | 3 | 9 | 375-625 min | 450-750 min |
| 30 | 3 | 10 | 450-750 min | 540-900 min |

**Note:** Checkpoints add ~10-15 minutes each for human review and approval.

## Example Workflows

### Example 1: 18-Tool Service (Large)

```
Phase 0: Setup
- Initialize workspace
- Check if persistence needed: YES (18 tools)
- Invoke persisting-progress-across-sessions
- Save progress.json (Session 1)

Phase 1: MCP Setup
- Verify MCP configured
- Save progress.json

Phase 2: Tool Discovery
- Discover 18 tools
- Schema discovery per tool (2-3 min each = 36-54 min)
- Save progress.json

Phase 3: Shared Architecture
- Spawn tool-lead + security-lead (parallel)
- Human checkpoint ✅
- Save progress.json

Phase 4: Per-Tool Work (Batch size: 4)
- Batch 1: Tools 1-4 (architecture + tests)
- Batch 2: Tools 5-8
- → Progress checkpoint (8/18 = 44%) ✅
- Save progress.json
- Batch 3: Tools 9-12
- Batch 4: Tools 13-16
- → Progress checkpoint (16/18 = 89%) ✅
- Save progress.json
- Batch 5: Tools 17-18
- Save progress.json

Phase 5: RED Gate
- Run tests (should all fail)
- Save progress.json

Phase 6: Implementation (Batch size: 4)
- Batch 1-5 (same groupings as Phase 4)
- Progress checkpoints at Batch 2, 4
- Save after each batch

Phase 7: Code Review (Batch size: 4)
- Batch 1-5 (same groupings)
- Save after each batch

Phase 8: GREEN Gate
- Run tests with coverage
- Save progress.json

Phase 9: Audit
- Run audit on all tools
- Save progress.json

Phase 10: Completion
- Generate service skill
- Final verification
- Mark progress as "complete"

**Total estimated time:** 4.5-7.5 hours
**Checkpoints:** 4 (1 architecture + 2 progress + 1 completion)
**Progress saves:** 15+
```

### Example 2: 28-Tool Service (Extra Large)

```
Phase 0: Setup
- Initialize workspace
- Persistence: REQUIRED (28 tools)
- Batch size: 3 (recommended for 28 tools)
- Estimated duration: 7-11.5 hours
- Save progress.json (Session 1)

Phase 2: Tool Discovery
- 28 tools discovered
- Complexity assessment: Medium
- Confirm batch size: 3 ✅
- Save progress.json

Phase 3: Shared Architecture
- Human checkpoint ✅
- Save progress.json

Phase 4-7: Batched Work (10 batches × 3 tools, except last batch = 1 tool)

Batch 1: Tools 1-3
Batch 2: Tools 4-6
Batch 3: Tools 7-9
→ Progress checkpoint (9/28 = 32%) ✅
→ Save progress.json

Batch 4: Tools 10-12
Batch 5: Tools 13-15
Batch 6: Tools 16-18
→ Progress checkpoint (18/28 = 64%) ✅
→ Save progress.json

Batch 7: Tools 19-21
Batch 8: Tools 22-24
Batch 9: Tools 25-27
→ Progress checkpoint (27/28 = 96%) ✅
→ Save progress.json

Batch 10: Tool 28
→ Completion checkpoint ✅

**Total estimated time:** 7-11.5 hours (likely 2-3 sessions)
**Checkpoints:** 5 (1 architecture + 3 progress + 1 completion)
**Progress saves:** 25+
**Recommended:** Schedule across 2-3 work sessions with resume protocol
```

### Example 3: 40-Tool Service (Extra Large with Complexity)

```
Phase 0: Setup
- Persistence: REQUIRED
- Batch size: 3
- Complexity: Complex (10+ input fields, 5000+ token responses)
- Adjust batch size: 2-3 (stay at 3 with caution)
- Estimated duration: 10-16.5 hours
- Recommend: Multi-session workflow over 2-3 days

Phase 2: Tool Discovery
- 40 tools discovered
- High complexity detected
- User decision: Defer 5 low-priority tools → 35 tools to wrap

Phase 4-7: Batched Work (12 batches × 3 tools, except last batch = 2 tools)

Batch 1-3: Tools 1-9
→ Checkpoint (9/35 = 26%) ✅ - END SESSION 1

--- Resume Session 2 ---

Batch 4-6: Tools 10-18
→ Checkpoint (18/35 = 51%) ✅

Batch 7-9: Tools 19-27
→ Checkpoint (27/35 = 77%) ✅ - END SESSION 2

--- Resume Session 3 ---

Batch 10-12: Tools 28-35
→ Completion checkpoint ✅

**Total estimated time:** 8.75-14.5 hours (3 sessions)
**Checkpoints:** 5 (1 architecture + 3 progress + 1 completion)
**Progress saves:** 35+
**Strategy:** 3-4 hour sessions with resume protocol
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
Phase 6: Implementation - Batch 3 of 10

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
// Phase 4: Per-Tool Work - Batch 1
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
4. **Batch consolidation** - Update metadata.json once per batch, not per tool

## Related References

- [Checkpoint Configuration](checkpoint-configuration.md) - Checkpoint triggers and formats
- [Progress Persistence](progress-persistence.md) - Session management details
- [Rationalization Table](rationalization-table.md) - Large service rationalizations
- [Metadata Structure](metadata-structure.md) - Batch tracking in metadata.json
