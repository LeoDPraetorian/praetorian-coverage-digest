# Progress Persistence

Maintain MCP wrapper development state across sessions for reliable resume capability.

## Inherits From

This document extends the base persistence schema with MCP-specific additions:

- **`persisting-agent-outputs`** skill - MANIFEST.yaml base schema, directory discovery, two-layer state (`.claude/skills/persisting-agent-outputs/SKILL.md`)
- **`orchestrating-multi-agent-workflows/references/progress-file-format.md`** - Progress tracking patterns for multi-phase workflows

## Purpose

Enable long-running MCP wrapper workflows by:

- Saving progress after each phase
- Resuming from last checkpoint
- Tracking per-tool status and batch progress
- Preventing lost work in large services (15-30+ tools)

## Base Schema

**Location**: `.claude/.output/mcp-wrappers/{mcp-service-name}/MANIFEST.yaml`

**Format**: YAML (aligned with `persisting-agent-outputs` base schema)

The MANIFEST.yaml file uses the standard base schema defined in `persisting-agent-outputs`:

- `feature_name` - MCP service display name (e.g., "Linear")
- `feature_slug` - MCP service name (e.g., "linear")
- `created_at` - ISO 8601 timestamp
- `description` - Service description
- `status` - Workflow status (in-progress | complete | blocked)
- `agents_contributed` - Array tracking all agents that have contributed
- `artifacts` - Array of output files produced

**See**: `.claude/skills/persisting-agent-outputs/references/manifest-structure.md` for complete base schema documentation.

## MCP Extensions

MCP wrapper development adds these extensions to the base MANIFEST.yaml schema.

**For complete field descriptions and validation rules:** See [progress-persistence-schema.md](progress-persistence-schema.md)

**For TypeScript code examples and workflow patterns:** See [progress-persistence-examples.md](progress-persistence-examples.md)

### 1. Service Identification

```yaml
mcp_service_name: "linear" # Technical identifier
service_display_name: "Linear" # Human-readable name
```

### 2. Tools Manifest Integration

**File**: `.claude/.output/mcp-wrappers/{mcp-service-name}/tools_manifest.json`

Separate JSON file tracking discovered tools and their schemas (see [schema reference](progress-persistence-schema.md#tools-manifest-schema)).

### 3. Per-Tool Status Tracking

```yaml
tools_status:
  get-issue:
    phase: "complete" # pending | in_progress | complete | blocked | deferred
    wrapper_file: ".claude/tools/linear/get-issue.ts"
    test_file: ".claude/tools/linear/get-issue.test.ts"
    coverage_percent: 87
    audit_status: "passed" # pending | passed | failed
    retries: 0
    issues: [] # Optional: Array of issues encountered
```

### 4. Batch-Level Progress

For services with 10+ tools, track batch execution:

```yaml
phases:
  implementation:
    status: "in_progress"
    tools_completed: ["get-issue", "list-issues", "create-issue"]
    tools_in_progress: ["update-issue"]
    tools_remaining: ["search-issues", "list-projects", "get-project"]
    current_batch: 2
    total_batches: 3
    batch_size: 3
```

See [progress-persistence-schema.md](progress-persistence-schema.md#batch-level-fields) for complete batch tracking schema.

### 5. MCP-Specific Artifacts

```yaml
artifacts:
  - path: "schema-discovery.md"
    type: "schema-discovery"
    agent: "tool-lead"
  - path: "architecture.md"
    type: "architecture"
    agent: "tool-lead"
  - path: "tools_manifest.json"
    type: "tools-manifest"
    agent: "tool-lead"
```

### 6. Phase-Specific Extensions

Each phase in `phases:` can include MCP-specific metadata.

See [progress-persistence-schema.md](progress-persistence-schema.md#phase-extensions) for schema documentation.

See [progress-persistence-examples.md](progress-persistence-examples.md#phase-metadata) for code examples.

## Format Rationale

**Base uses YAML, MCP uses YAML:**

- Aligned format for consistency
- YAML supports comments and multi-line strings
- Better human readability for progress tracking
- Easier merging of base + extension fields
- `tools_manifest.json` uses JSON for schema compatibility with TypeScript tooling

## Resume Workflow

1. **Detect resume mode**: User provides MCP service name
2. **Load progress file**: Read `.claude/.output/mcp-wrappers/{service}/MANIFEST.yaml`
3. **Display status**: Show current phase, batch progress, tools completed
4. **Load artifacts**: Read schema-discovery.md, architecture.md
5. **Create TodoWrite**: Reconstruct todos based on phase status and batch progress
6. **Continue execution**: Jump to `current_phase` with batch context

## Checkpoint Triggers

Save progress at these checkpoints:

1. **After each phase completion** - Phase status changes
2. **After each tool completion** - Tool status changes
3. **After each batch** - Batch progress update
4. **Before human checkpoints** - Before AskUserQuestion
5. **On blocker** - When agent returns blocked status

## Workspace Directory Structure

```
.claude/.output/mcp-wrappers/{mcp-service-name}/
├── MANIFEST.yaml                    # Progress state (this document)
├── schema-discovery.md              # Phase 1 output
├── architecture.md                  # Phase 5 output
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

## Related References

- [Progress Persistence Schema](progress-persistence-schema.md) - Complete field descriptions and validation rules
- [Progress Persistence Examples](progress-persistence-examples.md) - TypeScript code examples and workflow patterns
- [Troubleshooting](troubleshooting.md) - Resume issues
- [Large Service Handling](large-service-handling.md) - Batch sizing
- [Checkpoint Configuration](checkpoint-configuration.md) - When to checkpoint
