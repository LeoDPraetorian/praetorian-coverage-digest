# MANIFEST.yaml Templates

Ready-to-use templates for different orchestration complexities.

## Minimal Template (Ad-hoc Agent Work)

Use for standalone agent tasks without orchestration.

```yaml
feature_name: "<Feature Name>"
feature_slug: "<kebab-case-slug>"
created_at: "<ISO timestamp>"
created_by: "<agent-name>"
description: |
  Brief description of what this accomplishes.

status: "in-progress" # in-progress | complete | blocked

agents_contributed:
  - agent: "<agent-name>"
    artifact: "<agent-name>-<output-type>.md"
    timestamp: "<ISO timestamp>"
    status: "in_progress"

artifacts:
  - path: "<agent-name>-<output-type>.md"
    type: "<output-type>"
    agent: "<agent-name>"
```

### Example: Quick Bug Fix

```yaml
feature_name: "Auth Token Refresh Fix"
feature_slug: "auth-token-refresh-fix"
created_at: "2026-01-15T14:30:22Z"
created_by: "backend-developer"
description: |
  Fix token refresh race condition in auth middleware.

status: "complete"

agents_contributed:
  - agent: "backend-developer"
    artifact: "backend-developer-implementation.md"
    timestamp: "2026-01-15T14:35:00Z"
    status: "complete"

artifacts:
  - path: "backend-developer-implementation.md"
    type: "implementation"
    agent: "backend-developer"
```

### Example: Component Implementation

```yaml
feature_name: "Asset Filter Component"
feature_slug: "asset-filter"
created_at: "2026-01-15T09:00:00Z"
created_by: "frontend-lead"
description: |
  Implement asset filtering with status, severity, and date filters.
  Uses TanStack Query for data fetching.

status: "in-progress"

agents_contributed:
  - agent: "frontend-lead"
    artifact: "frontend-lead-architecture.md"
    timestamp: "2026-01-15T09:15:00Z"
    status: "complete"
  - agent: "frontend-developer"
    artifact: "frontend-developer-implementation.md"
    timestamp: "2026-01-15T10:30:00Z"
    status: "in_progress"

artifacts:
  - path: "frontend-lead-architecture.md"
    type: "architecture"
    agent: "frontend-lead"
  - path: "frontend-developer-implementation.md"
    type: "implementation"
    agent: "frontend-developer"
```

## Full Template (Orchestrated Workflows)

Use for complex orchestrations with multiple phases and agents.

```yaml
feature_name: "<Feature Name>"
feature_slug: "<kebab-case-slug>"
created_at: "<ISO timestamp>"
created_by: "<orchestration-skill-or-agent>"
description: |
  Detailed feature description.
  Explains what this orchestration accomplishes and why.

status: "in-progress" # in-progress | complete | blocked
current_phase: "<current-phase-name>"

# Phase tracking (orchestrated workflows only)
phases:
  setup:
    status: "complete"
    timestamp: "<ISO timestamp>"
  brainstorming:
    status: "complete"
    timestamp: "<ISO timestamp>"
    approved: true
  architecture:
    status: "complete"
    timestamp: "<ISO timestamp>"
    agent: "<architect-agent>"
  implementation:
    status: "in_progress"
    timestamp: "<ISO timestamp>"
    agent: "<developer-agent>"
  review:
    status: "pending"
    retry_count: 0
  testing:
    status: "pending"

# Verification results (orchestrated workflows only)
verification:
  build: "PASS" # PASS | FAIL | NOT_RUN
  tests: "NOT_RUN" # Free-form test results
  review: "PENDING" # APPROVED | REJECTED | PENDING

agents_contributed:
  - agent: "<agent-1>"
    artifact: "<filename-1>.md"
    timestamp: "<ISO timestamp>"
    status: "complete"
  - agent: "<agent-2>"
    artifact: "<filename-2>.md"
    timestamp: "<ISO timestamp>"
    status: "in_progress"

artifacts:
  - path: "<filename-1>.md"
    type: "<output-type>"
    agent: "<agent-1>"
  - path: "<filename-2>.md"
    type: "<output-type>"
    agent: "<agent-2>"
```

### Example: Backend API Implementation

```yaml
feature_name: "Job Processing Pipeline"
feature_slug: "job-processing-pipeline"
created_at: "2026-01-15T09:00:00Z"
created_by: "orchestrating-feature-development"
description: |
  Implement a job processing pipeline with retry logic,
  dead-letter queue handling, and full test coverage.
  Supports async operations for long-running security scans.

status: "in-progress"
current_phase: "testing"

phases:
  setup:
    status: "complete"
    timestamp: "2026-01-15T09:00:00Z"
  brainstorming:
    status: "complete"
    timestamp: "2026-01-15T09:15:00Z"
    approved: true
  architecture:
    status: "complete"
    timestamp: "2026-01-15T10:30:00Z"
    agent: "backend-lead"
  implementation:
    status: "complete"
    timestamp: "2026-01-15T12:00:00Z"
    agent: "backend-developer"
  review:
    status: "complete"
    timestamp: "2026-01-15T14:00:00Z"
    agent: "backend-reviewer"
  testing:
    status: "in_progress"
    timestamp: "2026-01-15T14:30:00Z"
    agent: "backend-tester"
  security_review:
    status: "pending"

verification:
  build: "PASS"
  tests: "8/15 passed"
  review: "APPROVED"

agents_contributed:
  - agent: "backend-lead"
    artifact: "backend-lead-architecture.md"
    timestamp: "2026-01-15T10:30:00Z"
    status: "complete"
  - agent: "backend-developer"
    artifact: "backend-developer-implementation.md"
    timestamp: "2026-01-15T12:00:00Z"
    status: "complete"
  - agent: "backend-reviewer"
    artifact: "backend-reviewer-code-review.md"
    timestamp: "2026-01-15T14:00:00Z"
    status: "complete"
  - agent: "backend-tester"
    artifact: "backend-tester-test-plan.md"
    timestamp: "2026-01-15T14:30:00Z"
    status: "in_progress"

artifacts:
  - path: "backend-lead-architecture.md"
    type: "architecture"
    agent: "backend-lead"
  - path: "backend-developer-implementation.md"
    type: "implementation"
    agent: "backend-developer"
  - path: "backend-reviewer-code-review.md"
    type: "code-review"
    agent: "backend-reviewer"
  - path: "backend-tester-test-plan.md"
    type: "test-plan"
    agent: "backend-tester"
```

## Choosing a Template

| Scenario                      | Template | Phases | agents_contributed |
| ----------------------------- | -------- | ------ | ------------------ |
| Single agent quick task       | Minimal  | -      | 1                  |
| Ad-hoc multi-agent (no orch)  | Minimal  | -      | 2-4                |
| Orchestrated feature workflow | Full     | 5+     | 4-8                |
| Orchestrated capability       | Full     | 6+     | 3-6                |
| Complex integration           | Full     | 8+     | 5-10               |

**Rule of thumb**: If orchestration skill is coordinating phases (brainstorm → architecture → implement → review → test), use the full template with phases and verification objects.

## Field Reference

See [persisting-agent-outputs/references/manifest-structure.md](../../persisting-agent-outputs/references/manifest-structure.md) for complete field definitions.

## Related

- [Resume Checklist](resume-checklist.md) - How to resume from MANIFEST.yaml
- [Compaction Protocol](compaction-protocol.md) - Context management
- [Lifecycle Flowchart](lifecycle-flowchart.md) - Visual lifecycle
