# Progress Persistence

Maintain feature development state across sessions for reliable resume capability.

## Purpose

Enable long-running feature development by:
- Saving progress after each phase
- Resuming from last checkpoint
- Tracking artifacts and decisions
- Preventing lost work

## Progress File Schema

**Location**: `.claude/features/{feature-id}/progress.json`

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
      "design_file": ".claude/features/user-dashboard_20241213_103000/design.md",
      "started_at": "2024-12-13T10:30:00Z",
      "completed_at": "2024-12-13T10:45:00Z",
      "duration_minutes": 15
    },

    "planning": {
      "status": "complete",
      "approved": true,
      "plan_file": ".claude/features/user-dashboard_20241213_103000/plan.md",
      "task_count": 8,
      "started_at": "2024-12-13T10:45:00Z",
      "completed_at": "2024-12-13T11:00:00Z",
      "duration_minutes": 15
    },

    "architecture": {
      "status": "complete",
      "architecture_file": ".claude/features/user-dashboard_20241213_103000/architecture.md",
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
    "design": ".claude/features/user-dashboard_20241213_103000/design.md",
    "plan": ".claude/features/user-dashboard_20241213_103000/plan.md",
    "architecture": ".claude/features/user-dashboard_20241213_103000/architecture.md",
    "progress": ".claude/features/user-dashboard_20241213_103000/progress.json"
  },

  "metadata": {
    "total_duration_minutes": 90,
    "agents_spawned": 2,
    "human_checkpoints": 2
  }
}
```

## Writing Progress

### After Each Phase

```bash
# Update progress file
jq '.phases.brainstorming.status = "complete" |
    .phases.brainstorming.completed_at = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" |
    .current_phase = "planning"' \
    .claude/features/{feature-id}/progress.json > /tmp/progress.json && \
    mv /tmp/progress.json .claude/features/{feature-id}/progress.json
```

Or use Node.js/TypeScript:

```typescript
import fs from 'fs';

const progressPath = `.claude/features/${featureId}/progress.json`;
const progress = JSON.parse(fs.readFileSync(progressPath, 'utf-8'));

progress.phases.brainstorming.status = 'complete';
progress.phases.brainstorming.completed_at = new Date().toISOString();
progress.current_phase = 'planning';

fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
```

## Reading Progress (Resume)

### On Session Start

```typescript
// Check if feature ID provided
const featureId = args[0];
const progressPath = `.claude/features/${featureId}/progress.json`;

if (fs.existsSync(progressPath)) {
  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf-8'));

  console.log(`Resuming feature: ${progress.feature_name}`);
  console.log(`Current phase: ${progress.current_phase}`);
  console.log(`Status: ${progress.status}`);

  // Get last completed phase
  const lastCompleted = Object.entries(progress.phases)
    .filter(([_, phase]) => phase.status === 'complete')
    .map(([name, _]) => name)
    .pop();

  console.log(`Last completed: ${lastCompleted}`);

  // Load artifacts
  if (progress.artifacts.design) {
    const design = fs.readFileSync(progress.artifacts.design, 'utf-8');
    // Use design in context
  }

  if (progress.artifacts.plan) {
    const plan = fs.readFileSync(progress.artifacts.plan, 'utf-8');
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
.claude/features/{feature-id}/
├── progress.json           # Progress state (this document)
├── design.md               # Phase 1 output
├── plan.md                 # Phase 2 output
├── architecture.md         # Phase 3 output (or architecture-*.md for full-stack)
└── logs/
    ├── architecture.log    # Agent spawn logs
    ├── implementation.log  # Developer agent logs
    └── testing.log         # Test engineer logs
```

## Phase Status Values

| Status | Meaning |
|--------|---------|
| `pending` | Not started |
| `in_progress` | Currently executing |
| `complete` | Successfully finished |
| `blocked` | Waiting for user input or blocker resolution |
| `failed` | Encountered unrecoverable error |

## Resume Workflow

1. **Detect resume mode**: User provides feature ID instead of description
2. **Load progress file**: Read `.claude/features/{id}/progress.json`
3. **Display status**: Show current phase and last completed
4. **Load artifacts**: Read design, plan, architecture files
5. **Create TodoWrite**: Reconstruct todos based on phase status
6. **Continue execution**: Jump to `current_phase`

## Common Patterns

### Check if Phase Complete

```typescript
function isPhaseComplete(progress: Progress, phase: string): boolean {
  return progress.phases[phase]?.status === 'complete';
}
```

### Get Next Phase

```typescript
const phaseSequence = ['brainstorming', 'planning', 'architecture', 'implementation', 'testing'];

function getNextPhase(currentPhase: string): string {
  const index = phaseSequence.indexOf(currentPhase);
  return phaseSequence[index + 1] || 'complete';
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

## Related References

- [Troubleshooting](troubleshooting.md) - Resume issues
