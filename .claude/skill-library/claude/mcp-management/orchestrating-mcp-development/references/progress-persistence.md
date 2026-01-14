# Progress Persistence

Maintain MCP wrapper development state across sessions for reliable resume capability.

## Purpose

Enable long-running MCP wrapper workflows by:

- Saving progress after each phase
- Resuming from last checkpoint
- Tracking per-tool status and batch progress
- Preventing lost work in large services (15-30+ tools)

## Progress File Schema

**Location**: `.claude/.output/mcp-wrappers/{mcp-service-name}/progress.json`

```json
{
  "mcp_service_name": "linear",
  "service_display_name": "Linear",
  "created": "2025-01-11T10:30:00Z",
  "updated": "2025-01-11T14:45:00Z",
  "current_phase": "implementation",
  "status": "in_progress",

  "phases": {
    "schema_discovery": {
      "status": "complete",
      "tools_discovered": 28,
      "schema_file": ".claude/.output/mcp-wrappers/linear/schema-discovery.md",
      "started_at": "2025-01-11T10:30:00Z",
      "completed_at": "2025-01-11T10:45:00Z",
      "duration_minutes": 15
    },

    "architecture": {
      "status": "complete",
      "approved": true,
      "architecture_file": ".claude/.output/mcp-wrappers/linear/architecture.md",
      "agent_used": "tool-lead",
      "shared_decisions": [
        "Use response-utils.ts sanitizeResponse() for all MCP calls",
        "Result type pattern for error handling",
        "Token budget: 2000 per wrapper, 10000 service max"
      ],
      "started_at": "2025-01-11T10:45:00Z",
      "completed_at": "2025-01-11T11:15:00Z",
      "duration_minutes": 30
    },

    "implementation": {
      "status": "in_progress",
      "agents_used": ["tool-developer"],
      "tools_completed": ["get-issue", "list-issues", "create-issue"],
      "tools_in_progress": ["update-issue"],
      "tools_remaining": ["search-issues", "list-projects", "get-project"],
      "current_batch": 2,
      "total_batches": 3,
      "batch_size": 3,
      "files_modified": [
        ".claude/tools/linear/get-issue.ts",
        ".claude/tools/linear/list-issues.ts",
        ".claude/tools/linear/create-issue.ts"
      ],
      "verification": {
        "build_passed": true,
        "tests_passed": true,
        "coverage_percent": 85,
        "timestamp": "2025-01-11T14:00:00Z"
      },
      "started_at": "2025-01-11T11:15:00Z"
    }
  },

  "tools_status": {
    "get-issue": {
      "phase": "complete",
      "wrapper_file": ".claude/tools/linear/get-issue.ts",
      "test_file": ".claude/tools/linear/get-issue.test.ts",
      "coverage_percent": 87,
      "audit_status": "passed",
      "retries": 0
    },
    "list-issues": {
      "phase": "complete",
      "wrapper_file": ".claude/tools/linear/list-issues.ts",
      "test_file": ".claude/tools/linear/list-issues.test.ts",
      "coverage_percent": 82,
      "audit_status": "passed",
      "retries": 1,
      "issues": ["Initial token optimization failed, fixed in retry"]
    },
    "update-issue": {
      "phase": "in_progress",
      "wrapper_file": ".claude/tools/linear/update-issue.ts",
      "test_file": ".claude/tools/linear/update-issue.test.ts",
      "coverage_percent": null,
      "audit_status": "pending",
      "retries": 0
    }
  },

  "artifacts": {
    "schema_discovery": ".claude/.output/mcp-wrappers/linear/schema-discovery.md",
    "architecture": ".claude/.output/mcp-wrappers/linear/architecture.md",
    "progress": ".claude/.output/mcp-wrappers/linear/progress.json"
  },

  "metadata": {
    "total_duration_minutes": 255,
    "agents_spawned": 4,
    "human_checkpoints": 2,
    "cumulative_issues": 1,
    "batch_reports_sent": 1
  }
}
```

## Writing Progress

### After Each Phase

```bash
# Update progress file
jq '.phases.schema_discovery.status = "complete" |
    .phases.schema_discovery.completed_at = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" |
    .current_phase = "architecture"' \
    .claude/.output/mcp-wrappers/{mcp-service}/progress.json > /tmp/progress.json && \
    mv /tmp/progress.json .claude/.output/mcp-wrappers/{mcp-service}/progress.json
```

Or use Node.js/TypeScript:

```typescript
import fs from "fs";

const progressPath = `.claude/.output/mcp-wrappers/${mcpService}/progress.json`;
const progress = JSON.parse(fs.readFileSync(progressPath, "utf-8"));

progress.phases.schema_discovery.status = "complete";
progress.phases.schema_discovery.completed_at = new Date().toISOString();
progress.current_phase = "architecture";

fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
```

### After Each Tool Completion

```typescript
import fs from "fs";

const progressPath = `.claude/.output/mcp-wrappers/${mcpService}/progress.json`;
const progress = JSON.parse(fs.readFileSync(progressPath, "utf-8"));

// Update tool status
progress.tools_status["get-issue"] = {
  phase: "complete",
  wrapper_file: ".claude/tools/linear/get-issue.ts",
  test_file: ".claude/tools/linear/get-issue.test.ts",
  coverage_percent: 87,
  audit_status: "passed",
  retries: 0,
};

// Update phase arrays
progress.phases.implementation.tools_completed.push("get-issue");
progress.phases.implementation.tools_in_progress =
  progress.phases.implementation.tools_in_progress.filter((t) => t !== "get-issue");

fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
```

## Reading Progress (Resume)

### On Session Start

```typescript
// Check if MCP service ID provided
const mcpService = args[0];
const progressPath = `.claude/.output/mcp-wrappers/${mcpService}/progress.json`;

if (fs.existsSync(progressPath)) {
  const progress = JSON.parse(fs.readFileSync(progressPath, "utf-8"));

  console.log(`Resuming MCP wrapper development: ${progress.service_display_name}`);
  console.log(`Current phase: ${progress.current_phase}`);
  console.log(`Status: ${progress.status}`);
  console.log(`Tools completed: ${progress.phases.implementation?.tools_completed?.length || 0}`);

  // Get last completed phase
  const lastCompleted = Object.entries(progress.phases)
    .filter(([_, phase]) => phase.status === "complete")
    .map(([name, _]) => name)
    .pop();

  console.log(`Last completed: ${lastCompleted}`);

  // Load artifacts
  if (progress.artifacts.schema_discovery) {
    const schema = fs.readFileSync(progress.artifacts.schema_discovery, "utf-8");
    // Use schema in context
  }

  if (progress.artifacts.architecture) {
    const architecture = fs.readFileSync(progress.artifacts.architecture, "utf-8");
    // Use architecture in context
  }

  // Check if in batch mode
  if (progress.current_phase === "implementation" && progress.phases.implementation.current_batch) {
    console.log(
      `Batch ${progress.phases.implementation.current_batch} of ${progress.phases.implementation.total_batches}`
    );
    console.log(`Tools remaining in batch: ${progress.phases.implementation.tools_in_progress.length}`);
  }

  // Continue from current_phase
  continueFromPhase(progress.current_phase);
}
```

## Service ID Format

```
{mcp-service-name}

Examples:
linear
context7
praetorian-cli
chrome
currents
```

Service names match the MCP server name from configuration.

## Workspace Directory Structure

```
.claude/.output/mcp-wrappers/{mcp-service-name}/
├── progress.json                    # Progress state (this document)
├── schema-discovery.md              # Phase 1 output
├── architecture.md                  # Phase 3 output
├── metadata/
│   ├── get-issue.json               # Per-tool metadata from agents
│   ├── list-issues.json
│   └── create-issue.json
└── logs/
    ├── schema-discovery.log         # Phase logs
    ├── architecture.log
    ├── implementation-batch-1.log   # Batch logs
    └── implementation-batch-2.log
```

## Phase Status Values

| Status        | Meaning                                      |
| ------------- | -------------------------------------------- |
| `pending`     | Not started                                  |
| `in_progress` | Currently executing                          |
| `complete`    | Successfully finished                        |
| `blocked`     | Waiting for user input or blocker resolution |
| `failed`      | Encountered unrecoverable error              |

## Tool Status Values

| Phase         | Meaning                             |
| ------------- | ----------------------------------- |
| `pending`     | Not started                         |
| `in_progress` | Currently being implemented         |
| `complete`    | Wrapper + tests complete and passed |
| `blocked`     | Waiting for resolution              |
| `deferred`    | User approved skipping this tool    |

## Resume Workflow

1. **Detect resume mode**: User provides MCP service name
2. **Load progress file**: Read `.claude/.output/mcp-wrappers/{service}/progress.json`
3. **Display status**: Show current phase, batch progress, tools completed
4. **Load artifacts**: Read schema-discovery.md, architecture.md
5. **Create TodoWrite**: Reconstruct todos based on phase status and batch progress
6. **Continue execution**: Jump to `current_phase` with batch context

## Common Patterns

### Check if Phase Complete

```typescript
function isPhaseComplete(progress: Progress, phase: string): boolean {
  return progress.phases[phase]?.status === "complete";
}
```

### Get Next Phase

```typescript
const phaseSequence = [
  "schema_discovery",
  "architecture",
  "implementation",
  "review",
  "audit",
  "completion",
];

function getNextPhase(currentPhase: string): string {
  const index = phaseSequence.indexOf(currentPhase);
  return phaseSequence[index + 1] || "complete";
}
```

### Calculate Duration

```typescript
function calculateDuration(phase: PhaseProgress): number {
  if (!phase.started_at || !phase.completed_at) return 0;

  const start = new Date(phase.started_at);
  const end = new Date(phase.completed_at);
  return (end.getTime() - start.getTime()) / 60000; // minutes
}
```

### Get Batch Progress

```typescript
function getBatchProgress(progress: Progress): {
  current: number;
  total: number;
  toolsCompleted: number;
  toolsInProgress: number;
  toolsRemaining: number;
} {
  const impl = progress.phases.implementation;
  return {
    current: impl.current_batch || 1,
    total: impl.total_batches || 1,
    toolsCompleted: impl.tools_completed?.length || 0,
    toolsInProgress: impl.tools_in_progress?.length || 0,
    toolsRemaining: impl.tools_remaining?.length || 0,
  };
}
```

### Calculate Batch Size Recommendation

```typescript
function recommendBatchSize(toolCount: number): number {
  if (toolCount <= 10) return 5; // Standard batch
  if (toolCount <= 20) return 4; // Medium service
  return 3; // Large service (15-30+ tools)
}
```

## Batch-Level Progress Tracking

For services with many tools, track batch-level progress:

```json
{
  "current_batch": 2,
  "total_batches": 6,
  "batch_size": 3,
  "batch_history": [
    {
      "batch_number": 1,
      "tools": ["get-issue", "list-issues", "create-issue"],
      "started_at": "2025-01-11T11:15:00Z",
      "completed_at": "2025-01-11T13:00:00Z",
      "issues_encountered": 1,
      "retries": 1
    }
  ]
}
```

## Checkpoint Triggers

Save progress at these checkpoints:

1. **After each phase completion** - Phase status changes
2. **After each tool completion** - Tool status changes
3. **After each batch** - Batch progress update
4. **Before human checkpoints** - Before AskUserQuestion
5. **On blocker** - When agent returns blocked status

## Related References

- [Troubleshooting](troubleshooting.md) - Resume issues
- [Large Service Handling](large-service-handling.md) - Batch sizing
- [Checkpoint Configuration](checkpoint-configuration.md) - When to checkpoint
