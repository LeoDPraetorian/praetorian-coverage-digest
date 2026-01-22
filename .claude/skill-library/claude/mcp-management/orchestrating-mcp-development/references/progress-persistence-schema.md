# Progress Persistence Schema

**Parent document**: [progress-persistence.md](progress-persistence.md)

Complete field descriptions and validation rules for MANIFEST.yaml MCP extensions.

## Tools Manifest Schema

**File**: `tools_manifest.json`

```typescript
interface ToolsManifest {
  tools: Array<{
    name: string; // Tool identifier (kebab-case)
    description: string; // Human-readable description
    input_schema: object; // Zod schema representation
    token_estimate: number; // Estimated response size
  }>;
  total_tools: number; // Total count
  discovery_timestamp: string; // ISO 8601
}
```

### Example

```json
{
  "tools": [
    {
      "name": "get-issue",
      "description": "Get a Linear issue by ID",
      "input_schema": { "type": "object", "properties": { "id": { "type": "string" } } },
      "token_estimate": 150
    }
  ],
  "total_tools": 28,
  "discovery_timestamp": "2025-01-11T10:45:00Z"
}
```

## Per-Tool Status Schema

### Field Descriptions

| Field              | Type     | Required | Values                                            | Description                   |
| ------------------ | -------- | -------- | ------------------------------------------------- | ----------------------------- |
| `phase`            | string   | yes      | pending, in_progress, complete, blocked, deferred | Current phase status          |
| `wrapper_file`     | string   | yes      | File path                                         | Wrapper implementation path   |
| `test_file`        | string   | yes      | File path                                         | Test file path                |
| `coverage_percent` | number   | no       | 0-100                                             | Test coverage percentage      |
| `audit_status`     | string   | no       | pending, passed, failed                           | Audit compliance status       |
| `retries`          | number   | yes      | >= 0                                              | Number of retry attempts      |
| `issues`           | string[] | no       | Array of issue descriptions                       | Encountered issues (optional) |

### Example

```yaml
tools_status:
  get-issue:
    phase: "complete"
    wrapper_file: ".claude/tools/linear/get-issue.ts"
    test_file: ".claude/tools/linear/get-issue.test.ts"
    coverage_percent: 87
    audit_status: "passed"
    retries: 0
    issues: []
```

## Batch-Level Fields

### Implementation Phase Schema

| Field               | Type     | Required | Description                       |
| ------------------- | -------- | -------- | --------------------------------- |
| `status`            | string   | yes      | Phase status (see Phase Statuses) |
| `tools_completed`   | string[] | yes      | Array of completed tool names     |
| `tools_in_progress` | string[] | yes      | Array of in-progress tool names   |
| `tools_remaining`   | string[] | yes      | Array of remaining tool names     |
| `current_batch`     | number   | yes      | Current batch number (1-indexed)  |
| `total_batches`     | number   | yes      | Total number of batches           |
| `batch_size`        | number   | yes      | Tools per batch                   |

### Batch History Schema

```yaml
batch_history:
  - batch_number: 1 # Batch identifier
    tools: ["get-issue", "list-issues", "create-issue"] # Tools in batch
    started_at: "2025-01-11T11:15:00Z" # ISO 8601
    completed_at: "2025-01-11T13:00:00Z" # ISO 8601
    issues_encountered: 1 # Count of issues
    retries: 1 # Total retries in batch
```

### Example

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
    batch_history:
      - batch_number: 1
        tools: ["get-issue", "list-issues", "create-issue"]
        started_at: "2025-01-11T11:15:00Z"
        completed_at: "2025-01-11T13:00:00Z"
        issues_encountered: 1
        retries: 1
```

## Phase Extensions

### Schema Discovery Phase

| Field              | Type   | Required | Description                   |
| ------------------ | ------ | -------- | ----------------------------- |
| `status`           | string | yes      | Phase status                  |
| `tools_discovered` | number | yes      | Count of discovered tools     |
| `schema_file`      | string | yes      | Path to schema discovery file |
| `started_at`       | string | yes      | ISO 8601 timestamp            |
| `completed_at`     | string | yes      | ISO 8601 timestamp            |
| `duration_minutes` | number | yes      | Duration in minutes           |

```yaml
schema_discovery:
  status: "complete"
  tools_discovered: 28
  schema_file: "schema-discovery.md"
  started_at: "2025-01-11T10:30:00Z"
  completed_at: "2025-01-11T10:45:00Z"
  duration_minutes: 15
```

### Architecture Phase

| Field               | Type     | Required | Description                     |
| ------------------- | -------- | -------- | ------------------------------- |
| `status`            | string   | yes      | Phase status                    |
| `approved`          | boolean  | yes      | Human approval received         |
| `architecture_file` | string   | yes      | Path to architecture file       |
| `agent_used`        | string   | yes      | Agent that created architecture |
| `shared_decisions`  | string[] | yes      | Array of architecture decisions |
| `started_at`        | string   | yes      | ISO 8601 timestamp              |
| `completed_at`      | string   | yes      | ISO 8601 timestamp              |
| `duration_minutes`  | number   | yes      | Duration in minutes             |

```yaml
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

### Implementation Phase

| Field            | Type     | Required | Description                      |
| ---------------- | -------- | -------- | -------------------------------- |
| `status`         | string   | yes      | Phase status                     |
| `agents_used`    | string[] | yes      | Array of agent types used        |
| `files_modified` | string[] | yes      | Array of modified file paths     |
| `verification`   | object   | yes      | Verification results (see below) |
| `started_at`     | string   | yes      | ISO 8601 timestamp               |

#### Verification Object Schema

| Field              | Type    | Required | Description              |
| ------------------ | ------- | -------- | ------------------------ |
| `build_passed`     | boolean | yes      | Build success status     |
| `tests_passed`     | boolean | yes      | Test success status      |
| `coverage_percent` | number  | yes      | Test coverage percentage |
| `timestamp`        | string  | yes      | ISO 8601 timestamp       |

```yaml
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

## Complete Example

```yaml
# Base schema fields (from persisting-agent-outputs)
feature_name: "Linear MCP Wrappers"
feature_slug: "linear"
created_at: "2025-01-11T10:30:00Z"
description: |
  MCP wrapper development for Linear project management service.
  Wrapping 28 discovered tools with token optimization and error handling.
status: "in_progress"
# MCP extensions
mcp_service_name: "linear"
service_display_name: "Linear"
updated: "2025-01-11T14:45:00Z"
current_phase: "implementation"

phases:
  schema_discovery:
    status: "complete"
    tools_discovered: 28
    schema_file: "schema-discovery.md"
    started_at: "2025-01-11T10:30:00Z"
    completed_at: "2025-01-11T10:45:00Z"
    duration_minutes: 15

  architecture:
    status: "complete"
    approved: true
    architecture_file: "architecture.md"
    agent_used: "tool-lead"
    shared_decisions:
      - "Use response-utils.ts sanitizeResponse() for all MCP calls"
      - "Result type pattern for error handling"
    started_at: "2025-01-11T10:45:00Z"
    completed_at: "2025-01-11T11:15:00Z"
    duration_minutes: 30

  implementation:
    status: "in_progress"
    agents_used: ["tool-developer"]
    tools_completed: ["get-issue", "list-issues", "create-issue"]
    tools_in_progress: ["update-issue"]
    tools_remaining: ["search-issues", "list-projects", "get-project"]
    current_batch: 2
    total_batches: 3
    batch_size: 3
    started_at: "2025-01-11T11:15:00Z"

tools_status:
  get-issue:
    phase: "complete"
    wrapper_file: ".claude/tools/linear/get-issue.ts"
    test_file: ".claude/tools/linear/get-issue.test.ts"
    coverage_percent: 87
    audit_status: "passed"
    retries: 0

agents_contributed:
  - agent: "tool-lead"
    artifact: "schema-discovery.md"
    timestamp: "2025-01-11T10:45:00Z"
    status: "complete"
  - agent: "tool-lead"
    artifact: "architecture.md"
    timestamp: "2025-01-11T11:15:00Z"
    status: "complete"
  - agent: "tool-developer"
    artifact: "get-issue.ts"
    timestamp: "2025-01-11T12:00:00Z"
    status: "complete"

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

## Schema Validation Rules

### Required Fields

Every MANIFEST.yaml MUST include:

- Base fields (from `persisting-agent-outputs`)
- `mcp_service_name`
- `service_display_name`
- `current_phase`
- At least one phase in `phases`
- At least one tool in `tools_status`

### Timestamp Format

All timestamps MUST be ISO 8601 format: `YYYY-MM-DDTHH:MM:SSZ`

### Status Values

**Phase Status** (see [progress-persistence.md](progress-persistence.md#phase-status-values))

**Tool Phase** (see [progress-persistence.md](progress-persistence.md#tool-status-values))

### Array Constraints

- `tools_completed` + `tools_in_progress` + `tools_remaining` MUST equal total tools from tools_manifest.json
- `batch_number` in `batch_history` MUST be sequential (1, 2, 3, ...)
- `current_batch` MUST be ≤ `total_batches`

## Related References

- [Progress Persistence](progress-persistence.md) - Overview and workflow
- [Progress Persistence Examples](progress-persistence-examples.md) - TypeScript code examples
