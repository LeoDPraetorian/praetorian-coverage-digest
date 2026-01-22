# Progress Persistence Examples

**Parent document**: [progress-persistence.md](progress-persistence.md)

TypeScript code examples and workflow patterns for reading/writing progress.

## Writing Progress

### After Each Phase

Use `yq` (YAML processor) or write YAML directly:

```bash
# Update phase status using yq
yq eval '.phases.schema_discovery.status = "complete" |
         .phases.schema_discovery.completed_at = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" |
         .current_phase = "architecture"' \
  -i .claude/.output/mcp-wrappers/{mcp-service}/MANIFEST.yaml
```

Or use Node.js/TypeScript with `js-yaml`:

```typescript
import fs from "fs";
import yaml from "js-yaml";

const progressPath = `.claude/.output/mcp-wrappers/${mcpService}/MANIFEST.yaml`;
const progress = yaml.load(fs.readFileSync(progressPath, "utf-8"));

progress.phases.schema_discovery.status = "complete";
progress.phases.schema_discovery.completed_at = new Date().toISOString();
progress.current_phase = "architecture";

fs.writeFileSync(progressPath, yaml.dump(progress, { indent: 2 }));
```

### After Each Tool Completion

```typescript
import fs from "fs";
import yaml from "js-yaml";

const progressPath = `.claude/.output/mcp-wrappers/${mcpService}/MANIFEST.yaml`;
const progress = yaml.load(fs.readFileSync(progressPath, "utf-8"));

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

fs.writeFileSync(progressPath, yaml.dump(progress, { indent: 2 }));
```

## Reading Progress (Resume)

### On Session Start

```typescript
import fs from "fs";
import yaml from "js-yaml";

// Check if MCP service ID provided
const mcpService = args[0];
const progressPath = `.claude/.output/mcp-wrappers/${mcpService}/MANIFEST.yaml`;

if (fs.existsSync(progressPath)) {
  const progress = yaml.load(fs.readFileSync(progressPath, "utf-8"));

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

  // Load artifacts from artifacts array
  const schemaArtifact = progress.artifacts.find((a) => a.type === "schema-discovery");
  if (schemaArtifact) {
    const schemaPath = `.claude/.output/mcp-wrappers/${mcpService}/${schemaArtifact.path}`;
    const schema = fs.readFileSync(schemaPath, "utf-8");
    // Use schema in context
  }

  const archArtifact = progress.artifacts.find((a) => a.type === "architecture");
  if (archArtifact) {
    const archPath = `.claude/.output/mcp-wrappers/${mcpService}/${archArtifact.path}`;
    const architecture = fs.readFileSync(archPath, "utf-8");
    // Use architecture in context
  }

  // Check if in batch mode
  if (progress.current_phase === "implementation" && progress.phases.implementation.current_batch) {
    console.log(
      `Batch ${progress.phases.implementation.current_batch} of ${progress.phases.implementation.total_batches}`
    );
    console.log(
      `Tools remaining in batch: ${progress.phases.implementation.tools_in_progress.length}`
    );
  }

  // Continue from current_phase
  continueFromPhase(progress.current_phase);
}
```

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

For services with many tools, track batch-level progress in the implementation phase:

```yaml
phases:
  implementation:
    current_batch: 2
    total_batches: 6
    batch_size: 3
    batch_history:
      - batch_number: 1
        tools: ["get-issue", "list-issues", "create-issue"]
        started_at: "2025-01-11T11:15:00Z"
        completed_at: "2025-01-11T13:00:00Z"
        issues_encountered: 1
        retries: 1
```

## Phase Metadata

### Schema Discovery Phase Example

```yaml
phases:
  schema_discovery:
    status: "complete"
    tools_discovered: 28
    schema_file: "schema-discovery.md"
    started_at: "2025-01-11T10:30:00Z"
    completed_at: "2025-01-11T10:45:00Z"
    duration_minutes: 15
```

### Architecture Phase Example

```yaml
phases:
  architecture:
    status: "complete"
    approved: true
    architecture_file: "architecture.md"
    agent_used: "tool-lead"
    shared_decisions:
      - "Use response-utils.ts sanitizeResponse() for all MCP calls"
      - "Result type pattern for error handling"
      - "Token budget: 2000 per wrapper, 10000 service max"
    started_at: "2025-01-11T10:45:00Z"
    completed_at: "2025-01-11T11:15:00Z"
    duration_minutes: 30
```

### Implementation Phase Example

```yaml
phases:
  implementation:
    status: "in_progress"
    agents_used: ["tool-developer"]
    files_modified:
      - ".claude/tools/linear/get-issue.ts"
      - ".claude/tools/linear/list-issues.ts"
      - ".claude/tools/linear/create-issue.ts"
    verification:
      build_passed: true
      tests_passed: true
      coverage_percent: 85
      timestamp: "2025-01-11T14:00:00Z"
    started_at: "2025-01-11T11:15:00Z"
```

## Related References

- [Progress Persistence](progress-persistence.md) - Overview and workflow
- [Progress Persistence Schema](progress-persistence-schema.md) - Complete field descriptions
