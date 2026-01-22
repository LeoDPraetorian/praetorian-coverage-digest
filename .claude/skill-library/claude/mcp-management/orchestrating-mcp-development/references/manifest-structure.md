# MANIFEST Structure

## MANIFEST.yaml Format

**CRITICAL**: This skill uses MANIFEST.yaml per the `persisting-agent-outputs` skill pattern. The MANIFEST contains BOTH tool tracking AND batch state in a single unified file.

Initialize in Phase 1 with:

```yaml
feature_name: "Linear MCP Wrapper"
service: "linear"
status: "in-progress"
current_phase: "implementation"
created: "2025-01-19T10:30:00Z"
updated: "2025-01-19T14:45:00Z"

phases:
  setup: { status: "complete" }
  mcp_setup: { status: "complete" }
  tool_discovery: { status: "complete", tools_discovered: 15 }
  shared_architecture: { status: "complete", human_approved: true }
  tool_selection: { status: "complete", tools_selected: 8 }
  per_tool_architecture: { status: "complete" }
  implementation: { status: "in_progress", current_batch: 2, total_batches: 3 }
  red_gate: { status: "pending" }
  green_gate: { status: "pending" }
  audit: { status: "pending" }
  completion: { status: "pending" }

tools:
  list-issues:
    status: "complete"
    phases:
      red: "complete"
      green: "complete"
      refactor: "complete"
    coverage: { line: 95, branch: 88 }
    wrapper_file: ".claude/tools/linear/list-issues.ts"
    test_file: ".claude/tools/linear/list-issues.test.ts"
    retries: 0

  create-issue:
    status: "in_progress"
    phases:
      red: "complete"
      green: "in_progress"
      refactor: "pending"
    coverage: { line: 0, branch: 0 }
    wrapper_file: ".claude/tools/linear/create-issue.ts"
    test_file: ".claude/tools/linear/create-issue.test.ts"
    retries: 0

  get-issue:
    status: "deferred"
    deferred_reason: "User approved - low priority, implement after core CRUD"
    phases:
      red: "pending"
      green: "pending"
      refactor: "pending"

  update-issue:
    status: "pending"
    phases:
      red: "pending"
      green: "pending"
      refactor: "pending"

agents_contributed:
  - type: "tool-lead"
    phase: "shared_architecture"
    timestamp: "2025-01-19T11:00:00Z"
  - type: "tool-developer"
    phase: "implementation"
    tool: "list-issues"
    timestamp: "2025-01-19T12:00:00Z"
  - type: "tool-reviewer"
    phase: "implementation"
    tool: "list-issues"
    timestamp: "2025-01-19T12:30:00Z"

artifacts:
  - path: ".claude/.output/mcp-wrappers/2025-01-19-103000-linear/schema-discovery.md"
    type: "schema"
    phase: "tool_discovery"
  - path: ".claude/.output/mcp-wrappers/2025-01-19-103000-linear/architecture.md"
    type: "architecture"
    phase: "shared_architecture"
  - path: ".claude/.output/mcp-wrappers/2025-01-19-103000-linear/MANIFEST.yaml"
    type: "manifest"
    phase: "all"
```

## Phase Status Values

- **pending**: Not yet started
- **in_progress**: Currently working
- **complete**: Finished successfully
- **blocked**: Cannot proceed (needs manual intervention)
- **skipped**: Phase skipped (e.g., user declined feature)

## Tool Status Values

- **pending**: Not yet started
- **in_progress**: Currently implementing (RED, GREEN, or REFACTOR phase active)
- **complete**: All TDD phases complete with passing tests and coverage
- **deferred**: Tool postponed per user approval (requires deferred_reason field)
- **blocked**: Cannot proceed (implementation failure, needs manual intervention)

## Special Fields

### Phase-Level

- **human_approved** (shared_architecture phase): Set to `true` after AskUserQuestion approval
- **tools_discovered** (tool_discovery phase): Count of tools found in schema
- **tools_selected** (tool_selection phase): Count of tools selected for implementation
- **current_batch** (implementation phase): Current batch number (1-indexed)
- **total_batches** (implementation phase): Total number of batches

### Tool-Level

- **deferred_reason** (when status = "deferred"): MANDATORY - explanation for deferral
- **retries** (per tool): Count of retry attempts for failed implementations
- **coverage** (per tool): Object with `line` and `branch` coverage percentages
- **wrapper_file** (per tool): Path to wrapper implementation file
- **test_file** (per tool): Path to test file
- **phases** (per tool): TDD phase tracking - `red`, `green`, `refactor` (each "pending", "in_progress", or "complete")

## Batch Tracking

The `implementation` phase tracks batch progress:

- **current_batch**: Which batch is currently being processed (1-indexed)
- **total_batches**: Total number of batches to process
- Tools are assigned to batches based on batch_size (default 3)

Tool status changes:

- Tools in current batch: `status: "in_progress"`
- Tools in completed batches: `status: "complete"`
- Tools in future batches: `status: "pending"`
- Deferred tools: `status: "deferred"` (requires `deferred_reason`)

## agents_contributed Array

Tracks all agents that contributed to the workflow:

```yaml
agents_contributed:
  - type: "tool-lead" # Agent type (from Task subagent_type)
    phase: "shared_architecture" # Phase where agent contributed
    timestamp: "ISO-8601" # When agent completed work
  - type: "tool-developer"
    phase: "implementation"
    tool: "list-issues" # Optional: specific tool worked on
    timestamp: "ISO-8601"
```

## artifacts Array

Tracks all output files created during workflow:

```yaml
artifacts:
  - path: "absolute/or/relative/path" # File path
    type: "schema|architecture|manifest|test|wrapper" # Artifact type
    phase: "tool_discovery|shared_architecture|..." # Phase that created it
```

Common artifact types:

- **schema**: Schema discovery output (tool_discovery phase)
- **architecture**: Architecture plan (shared_architecture phase)
- **manifest**: This MANIFEST.yaml file itself
- **test**: Test files (\*.test.ts)
- **wrapper**: Wrapper implementation files (\*.ts)
