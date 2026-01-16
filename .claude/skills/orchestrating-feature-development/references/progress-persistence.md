# Progress Persistence

Maintain feature development state across sessions for reliable resume capability.

## Purpose

Enable long-running feature development by:

- Saving progress after each phase
- Resuming from last checkpoint
- Tracking artifacts and decisions
- Preventing lost work

## Progress File Schema

**Location**: `.claude/.output/features/{feature-id}/progress.json`

```json
{
  "feature_id": "user-dashboard_20241213_103000",
  "feature_name": "User Dashboard with Metrics",
  "created": "2024-12-13T10:30:00Z",
  "updated": "2024-12-13T12:30:00Z",
  "current_phase": "testing",
  "status": "in_progress",

  "phases": {
    "brainstorming": {
      "status": "complete",
      "approved": true,
      "design_file": ".claude/.output/features/user-dashboard_20241213_103000/design.md",
      "started_at": "2024-12-13T10:30:00Z",
      "completed_at": "2024-12-13T10:45:00Z",
      "duration_minutes": 15
    },

    "planning": {
      "status": "complete",
      "approved": true,
      "plan_file": ".claude/.output/features/user-dashboard_20241213_103000/plan.md",
      "task_count": 8,
      "started_at": "2024-12-13T10:45:00Z",
      "completed_at": "2024-12-13T11:00:00Z",
      "duration_minutes": 15
    },

    "architecture": {
      "status": "complete",
      "architecture_file": ".claude/.output/features/user-dashboard_20241213_103000/architecture.md",
      "agent_used": "frontend-architect",
      "decisions": [
        "Compound component pattern for dashboard widgets",
        "Zustand for local state management",
        "TanStack Query for API data fetching"
      ],
      "started_at": "2024-12-13T11:00:00Z",
      "completed_at": "2024-12-13T11:30:00Z",
      "duration_minutes": 30
    },

    "implementation": {
      "status": "complete",
      "agents_used": ["frontend-developer"],
      "files_modified": [
        "modules/chariot/ui/src/sections/dashboard/index.tsx",
        "modules/chariot/ui/src/sections/dashboard/MetricsWidget.tsx",
        "modules/chariot/ui/src/hooks/useDashboardMetrics.ts"
      ],
      "verification": {
        "build_passed": true,
        "lint_passed": true,
        "timestamp": "2024-12-13T12:00:00Z"
      },
      "started_at": "2024-12-13T11:30:00Z",
      "completed_at": "2024-12-13T12:00:00Z",
      "duration_minutes": 30
    },

    "testing": {
      "status": "in_progress",
      "agents_used": ["frontend-unit-test-engineer"],
      "started_at": "2024-12-13T12:00:00Z"
    }
  },

  "artifacts": {
    "design": ".claude/.output/features/user-dashboard_20241213_103000/design.md",
    "plan": ".claude/.output/features/user-dashboard_20241213_103000/plan.md",
    "architecture": ".claude/.output/features/user-dashboard_20241213_103000/architecture.md",
    "progress": ".claude/.output/features/user-dashboard_20241213_103000/progress.json"
  },

  "worktree": {
    "path": ".worktrees/user-dashboard",
    "pre_feature_commit": "a1b2c3d4e5f6",
    "created_at": "2024-12-13T10:30:00Z"
  },

  "metadata": {
    "total_duration_minutes": 90,
    "agents_spawned": 2,
    "human_checkpoints": 2
  },

  "abort_info": {
    "aborted": false,
    "abort_reason": null,
    "abort_phase": null,
    "abort_timestamp": null,
    "cleanup_choice": null,
    "cleanup_performed": false,
    "can_resume": false,
    "pre_abort_commit": null
  },

  "feedback_loop": {
    "enabled": true,
    "current_iteration": 2,
    "max_iterations": 5,
    "status": "in_progress | IMPLEMENTATION_VERIFIED | escalated",
    "consecutive_review_failures": 0,
    "consecutive_test_failures": 1,
    "iterations": [
      {
        "number": 1,
        "implementation": "Created FilterDropdown component",
        "review_result": "PASS",
        "test_result": "FAIL",
        "test_failures": ["FilterDropdown.test.tsx:45 - missing mock"]
      },
      {
        "number": 2,
        "implementation": "Fixed test mock issue",
        "review_result": "PASS",
        "test_result": "PASS",
        "status": "IMPLEMENTATION_VERIFIED"
      }
    ]
  },

  "metrics": {
    "orchestration": {
      "total_agents_spawned": 7,
      "parallel_executions": 3,
      "sequential_executions": 4
    },
    "validation_loops": {
      "spec_compliance_iterations": 2,
      "code_quality_iterations": 1,
      "test_validation_iterations": 1
    },
    "escalations": {
      "to_user": 1,
      "reasons": ["code_review_failed_after_retry"]
    },
    "conflicts": {
      "detected": 0,
      "resolved": 0,
      "unresolved": 0
    },
    "tokens": {
      "estimated_input_tokens": 125000,
      "estimated_output_tokens": 45000,
      "estimated_total_tokens": 170000,
      "by_phase": {
        "brainstorming": 8000,
        "discovery": 25000,
        "planning": 12000,
        "architecture": 35000,
        "implementation": 50000,
        "code_review": 20000,
        "test_planning": 8000,
        "testing": 25000,
        "test_validation": 7000
      }
    },
    "cost": {
      "estimated_cost_usd": 2.85,
      "model_breakdown": {
        "claude-sonnet-4": {
          "input_tokens": 125000,
          "output_tokens": 45000,
          "cost_usd": 2.85
        }
      },
      "note": "Estimates based on $3/1M input, $15/1M output for Sonnet"
    }
  }
}
```

### Abort Info Fields

When feature development is aborted, the `abort_info` object captures the abort context:

| Field | Type | Description | Values |
|-------|------|-------------|--------|
| `aborted` | boolean | Whether feature was aborted | `true` / `false` |
| `abort_reason` | string \| null | Why abort was triggered | `user_request`, `repeated_escalations`, `critical_security`, `unrecoverable_error`, `cost_exceeded` |
| `abort_phase` | string \| null | Which phase was in progress | Phase name (e.g., `"implementation"`) |
| `abort_timestamp` | string \| null | When abort occurred | ISO 8601 timestamp |
| `cleanup_choice` | string \| null | User's cleanup decision | `keep_everything`, `keep_artifacts`, `rollback`, `full_cleanup` |
| `cleanup_performed` | boolean | Whether cleanup executed | `true` / `false` |
| `can_resume` | boolean | Whether feature can be resumed | `true` / `false` |
| `pre_abort_commit` | string \| null | Git commit before abort (for rollback) | Git SHA hash |

**Example (aborted feature):**

```json
{
  "status": "aborted",
  "abort_info": {
    "aborted": true,
    "abort_reason": "repeated_escalations",
    "abort_phase": "implementation",
    "abort_timestamp": "2026-01-16T15:30:00Z",
    "cleanup_choice": "keep_everything",
    "cleanup_performed": true,
    "can_resume": true,
    "pre_abort_commit": "a1b2c3d4e5f6"
  }
}
```

See [Emergency Abort Protocol](emergency-abort.md) for complete abort workflow details.

## Writing Progress

### After Each Phase

```bash
# Update progress file
jq '.phases.brainstorming.status = "complete" |
    .phases.brainstorming.completed_at = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" |
    .current_phase = "planning"' \
    .claude/.output/features/{feature-id}/progress.json > /tmp/progress.json && \
    mv /tmp/progress.json .claude/.output/features/{feature-id}/progress.json
```

Or use Node.js/TypeScript:

```typescript
import fs from "fs";

const progressPath = `.claude/.output/features/${featureId}/progress.json`;
const progress = JSON.parse(fs.readFileSync(progressPath, "utf-8"));

progress.phases.brainstorming.status = "complete";
progress.phases.brainstorming.completed_at = new Date().toISOString();
progress.current_phase = "planning";

fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
```

## Reading Progress (Resume)

### On Session Start

```typescript
// Check if feature ID provided
const featureId = args[0];
const progressPath = `.claude/.output/features/${featureId}/progress.json`;

if (fs.existsSync(progressPath)) {
  const progress = JSON.parse(fs.readFileSync(progressPath, "utf-8"));

  console.log(`Resuming feature: ${progress.feature_name}`);
  console.log(`Current phase: ${progress.current_phase}`);
  console.log(`Status: ${progress.status}`);

  // Get last completed phase
  const lastCompleted = Object.entries(progress.phases)
    .filter(([_, phase]) => phase.status === "complete")
    .map(([name, _]) => name)
    .pop();

  console.log(`Last completed: ${lastCompleted}`);

  // Load artifacts
  if (progress.artifacts.design) {
    const design = fs.readFileSync(progress.artifacts.design, "utf-8");
    // Use design in context
  }

  if (progress.artifacts.plan) {
    const plan = fs.readFileSync(progress.artifacts.plan, "utf-8");
    // Use plan in context
  }

  // Continue from current_phase
  continueFromPhase(progress.current_phase);
}
```

## Feature ID Format

```
{feature-slug}_{date}_{time}

Examples:
user-dashboard_20241213_103000
api-authentication_20241214_140530
payment-integration_20241215_092145
```

**Generation**:

```bash
FEATURE_SLUG=$(echo "$FEATURE_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g')
TIMESTAMP=$(date -u +%Y%m%d_%H%M%S)
FEATURE_ID="${FEATURE_SLUG}_${TIMESTAMP}"
```

## Workspace Directory Structure

```
.claude/.output/features/{feature-id}/
├── progress.json           # Progress state (this document)
├── design.md               # Phase 10 output
├── frontend-discovery.md   # Phase 10 output
├── backend-discovery.md    # Phase 10 output
├── plan.md                 # Phase 10 output
├── architecture.md         # Phase 10 output (or architecture-*.md for full-stack)
└── logs/
    ├── architecture.log    # Agent spawn logs
    ├── implementation.log  # Developer agent logs
    └── testing.log         # Test engineer logs
```

## Phase Status Values

| Status        | Meaning                                      |
| ------------- | -------------------------------------------- |
| `pending`     | Not started                                  |
| `in_progress` | Currently executing                          |
| `complete`    | Successfully finished                        |
| `blocked`     | Waiting for user input or blocker resolution |
| `failed`      | Encountered unrecoverable error              |
| `aborted`     | User or system triggered abort protocol      |

## Resume Workflow

1. **Detect resume mode**: User provides feature ID instead of description
2. **Load progress file**: Read `.claude/.output/features/{id}/progress.json`
3. **Display status**: Show current phase and last completed
4. **Load artifacts**: Read design, plan, architecture files
5. **Create TodoWrite**: Reconstruct todos based on phase status
6. **Continue execution**: Jump to `current_phase`

## Common Patterns

### Check if Phase Complete

```typescript
function isPhaseComplete(progress: Progress, phase: string): boolean {
  return progress.phases[phase]?.status === "complete";
}
```

### Get Next Phase

```typescript
const phaseSequence = ["brainstorming", "planning", "architecture", "implementation", "testing"];

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

## Metrics Tracking

### Token Estimation

Since exact token counts are not available during orchestration, use these estimates:

| Content Type | Estimated Tokens |
|--------------|------------------|
| Agent prompt (with context) | 2,000-4,000 |
| Agent response (typical) | 1,500-3,000 |
| Skill invocation overhead | 500-1,500 |
| File read (per 100 lines) | ~400 |

### Estimating Phase Tokens

```typescript
function estimatePhaseTokens(phase: string, agentCount: number): number {
  const baseTokens = {
    brainstorming: 8000,
    discovery: 5000,
    planning: 12000,
    architecture: 8000,
    implementation: 10000,
    code_review: 5000,
    test_planning: 8000,
    testing: 6000,
    test_validation: 7000
  };
  return baseTokens[phase] * agentCount;
}
```

### Cost Calculation

Use current Anthropic pricing (update as needed):

| Model | Input (per 1M) | Output (per 1M) |
|-------|----------------|-----------------|
| Claude Sonnet 4 | $3.00 | $15.00 |
| Claude Opus 4 | $15.00 | $75.00 |
| Claude Haiku 4 | $0.25 | $1.25 |

### Updating Metrics During Orchestration

After each phase completion, update the metrics in progress.json:
- Increment agents_spawned after spawning agents
- Increment parallel_executions or sequential_executions based on execution type
- Update validation_loops when retries occur
- Add to escalations when user intervention required
- Update tokens.by_phase with estimates after each phase

### Metrics Summary at Completion

At Phase 12, generate a metrics summary showing:
- Total Duration
- Agents Spawned
- Parallel vs Sequential Executions
- Validation Retries
- User Escalations
- Estimated Tokens
- Estimated Cost
- Token Distribution by Phase

## Related References

- [Troubleshooting](troubleshooting.md) - Resume issues
