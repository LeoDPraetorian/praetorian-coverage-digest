# MANIFEST.yaml Structure

**Complete YAML format and field definitions.**

## Example

```yaml
feature_name: "TanStack Ecosystem Migration"
feature_slug: "tanstack-migration"
created_at: "2025-12-30T14:30:22Z"
created_by: "frontend-lead"
description: |
  Migration from React Router v7 to TanStack Router,
  standardizing tables with TanStack Table, and
  removing PII from URL paths.

status: "in-progress"

agents_contributed:
  - agent: "frontend-lead"
    artifact: "frontend-lead-architecture-review.md"
    timestamp: "2025-12-30T14:30:22Z"
    status: "complete"
  - agent: "frontend-developer"
    artifact: "frontend-developer-implementation.md"
    timestamp: "2025-12-30T15:45:00Z"
    status: "in-progress"

artifacts:
  - path: "frontend-lead-architecture-review.md"
    type: "architecture-review"
    agent: "frontend-lead"
  - path: "frontend-developer-implementation.md"
    type: "implementation"
    agent: "frontend-developer"
```

## Field Definitions

### Top-Level Fields

| Field                | Type             | Required | Description                                               |
| -------------------- | ---------------- | -------- | --------------------------------------------------------- |
| `feature_name`       | string           | Yes      | Human-readable feature name                               |
| `feature_slug`       | string           | Yes      | Kebab-case identifier matching directory                  |
| `created_at`         | ISO 8601         | Yes      | Timestamp of directory creation                           |
| `created_by`         | string           | Yes      | Name of agent that created directory                      |
| `description`        | multiline string | Yes      | Detailed feature description (used for semantic matching) |
| `status`             | enum             | Yes      | One of: `in-progress`, `complete`, `blocked`              |
| `agents_contributed` | array            | Yes      | List of agents and their artifacts (chronological)        |
| `artifacts`          | array            | Yes      | List of all output files                                  |

### agents_contributed Entry

```yaml
- agent: "frontend-lead" # Agent name (from agent definition)
  artifact: "frontend-lead-*.md" # Filename of output
  timestamp: "2025-12-30T14:30:22Z" # When agent completed work
  status: "complete" # complete | in-progress | blocked
```

### artifacts Entry

```yaml
- path: "frontend-lead-architecture-review.md" # Relative filename
  type: "architecture-review" # Output type
  agent: "frontend-lead" # Who created it
```

## Update Protocol

**When an agent writes an artifact:**

1. Read existing MANIFEST.yaml
2. Add entry to `agents_contributed`
3. Add entry to `artifacts`
4. Update `status` if needed
5. Write MANIFEST.yaml

## Status Values

| Status        | Meaning                             |
| ------------- | ----------------------------------- |
| `in-progress` | Feature work is ongoing             |
| `complete`    | All agents finished, feature ready  |
| `blocked`     | Work stopped, requires intervention |

## Examples by Scenario

### Single Agent

```yaml
feature_name: "Quick Bug Fix"
feature_slug: "auth-token-refresh-fix"
created_at: "2025-12-30T14:30:22Z"
created_by: "backend-developer"
description: |
  Fix token refresh race condition in auth middleware.

status: "complete"

agents_contributed:
  - agent: "backend-developer"
    artifact: "backend-developer-implementation.md"
    timestamp: "2025-12-30T14:35:00Z"
    status: "complete"

artifacts:
  - path: "backend-developer-implementation.md"
    type: "implementation"
    agent: "backend-developer"
```

### Multi-Agent Workflow

```yaml
feature_name: "Asset Table Virtualization"
feature_slug: "asset-table-virtualization"
created_at: "2025-12-30T09:00:00Z"
created_by: "frontend-lead"
description: |
  Implement TanStack Virtual for asset table with 10k+ rows.
  Performance target: <100ms render time.

status: "in-progress"

agents_contributed:
  - agent: "frontend-lead"
    artifact: "frontend-lead-architecture-plan.md"
    timestamp: "2025-12-30T09:15:00Z"
    status: "complete"
  - agent: "frontend-developer"
    artifact: "frontend-developer-implementation.md"
    timestamp: "2025-12-30T10:30:00Z"
    status: "complete"
  - agent: "frontend-tester"
    artifact: "frontend-tester-test-plan.md"
    timestamp: "2025-12-30T11:00:00Z"
    status: "in-progress"

artifacts:
  - path: "frontend-lead-architecture-plan.md"
    type: "architecture-plan"
    agent: "frontend-lead"
  - path: "frontend-developer-implementation.md"
    type: "implementation"
    agent: "frontend-developer"
  - path: "frontend-tester-test-plan.md"
    type: "test-plan"
    agent: "frontend-tester"
```

## Related

- [Discovery Protocol](discovery-protocol.md) - How agents find MANIFEST.yaml
- [Metadata Format](metadata-format.md) - JSON block in each artifact
- [Workflow Examples](workflow-examples.md) - Complete scenarios
