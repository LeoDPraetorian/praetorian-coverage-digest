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

| Field                | Type             | Required | Description                                                          |
| -------------------- | ---------------- | -------- | -------------------------------------------------------------------- |
| `feature_name`       | string           | Yes      | Human-readable feature name                                          |
| `feature_slug`       | string           | Yes      | Kebab-case identifier matching directory                             |
| `created_at`         | ISO 8601         | Yes      | Timestamp of directory creation                                      |
| `created_by`         | string           | Yes      | Name of agent that created directory                                 |
| `description`        | multiline string | Yes      | Detailed feature description (used for semantic matching)            |
| `status`             | enum             | Yes      | One of: `in-progress`, `complete`, `blocked`                         |
| `agents_contributed` | array            | Yes      | List of agents and their artifacts (chronological)                   |
| `artifacts`          | array            | Yes      | List of all output files                                             |
| `current_phase`      | string           | Optional | Currently active phase name (orchestrated workflows only)            |
| `phases`             | object           | Optional | Phase tracking with status/timestamp per phase (orchestrated only)   |
| `verification`       | object           | Optional | Build/test/review verification results (orchestrated workflows only) |

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

### Optional Orchestration Fields

**Only populated by orchestration skills** (orchestrating-feature-development, orchestrating-capability-development, etc.). When agents run without orchestration, these fields are omitted.

#### phases Object

Tracks workflow phases with status, timestamp, and phase-specific metadata:

```yaml
phases:
  setup:
    status: "complete"
    timestamp: "2025-12-30T14:30:22Z"
  brainstorming:
    status: "complete"
    timestamp: "2025-12-30T14:45:00Z"
    approved: true
  implementation:
    status: "in_progress"
    agent: "frontend-developer"
    timestamp: "2025-12-30T15:00:00Z"
  review:
    status: "pending"
    retry_count: 0
```

**Phase status values:** `pending`, `in_progress`, `complete`, `blocked`

**Phase-specific fields** (examples):

- `approved: boolean` - User approval checkpoints
- `agent: string` - Agent currently executing phase
- `retry_count: number` - Number of retry attempts
- Custom fields as needed by specific orchestration workflows

#### current_phase Field

Indicates which phase is currently active:

```yaml
current_phase: "implementation"
```

Must match one of the phase names in the `phases` object.

#### verification Object

Tracks verification results across the workflow:

```yaml
verification:
  build: "PASS" # PASS | FAIL | NOT_RUN
  tests: "11 passed" # Free-form test results summary
  review: "APPROVED" # APPROVED | REJECTED | PENDING
```

**Verification field conventions:**

- `build`: Build system exit status
- `tests`: Test suite results summary
- `review`: Code review status
- Additional domain-specific fields as needed

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

### Pattern 1: Ad-Hoc Agent Call (Minimal MANIFEST.yaml)

When agents run without orchestration, MANIFEST.yaml contains only core fields:

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

### Pattern 2: Orchestrated Workflow (Full MANIFEST.yaml with Phases)

When orchestration skills coordinate workflows, MANIFEST.yaml includes optional orchestration fields:

```yaml
feature_name: "User Authentication Refactor"
feature_slug: "user-auth-refactor"
created_at: "2025-12-30T09:00:00Z"
created_by: "orchestrating-feature-development"
description: |
  Refactor authentication system to use JWT tokens
  with refresh token rotation and secure cookie storage.

status: "in-progress"
current_phase: "implementation"

# OPTIONAL - Only for orchestrated workflows
phases:
  setup:
    status: "complete"
    timestamp: "2025-12-30T09:00:00Z"
  brainstorming:
    status: "complete"
    timestamp: "2025-12-30T09:15:00Z"
    approved: true
  architecture:
    status: "complete"
    timestamp: "2025-12-30T09:45:00Z"
    agent: "backend-lead"
  implementation:
    status: "in_progress"
    timestamp: "2025-12-30T10:00:00Z"
    agent: "backend-developer"
  review:
    status: "pending"
    retry_count: 0
  testing:
    status: "pending"

# OPTIONAL - Only for orchestrated workflows
verification:
  build: "PASS"
  tests: "NOT_RUN"
  review: "PENDING"

agents_contributed:
  - agent: "backend-lead"
    artifact: "backend-lead-architecture-plan.md"
    timestamp: "2025-12-30T09:45:00Z"
    status: "complete"
  - agent: "backend-developer"
    artifact: "backend-developer-implementation.md"
    timestamp: "2025-12-30T10:00:00Z"
    status: "in_progress"

artifacts:
  - path: "backend-lead-architecture-plan.md"
    type: "architecture-plan"
    agent: "backend-lead"
  - path: "backend-developer-implementation.md"
    type: "implementation"
    agent: "backend-developer"
```

**Key differences:**

- Ad-hoc: Core fields only (feature_name, status, agents_contributed, artifacts)
- Orchestrated: Core fields + optional orchestration fields (current_phase, phases, verification)

**Single source of truth:**
When orchestration skills are active, MANIFEST.yaml contains ALL workflow state. Orchestrators MUST NOT create separate metadata.json or progress.json files.

## Related

- [Discovery Protocol](discovery-protocol.md) - How agents find MANIFEST.yaml
- [Metadata Format](metadata-format.md) - JSON block in each artifact
- [Workflow Examples](workflow-examples.md) - Complete scenarios
