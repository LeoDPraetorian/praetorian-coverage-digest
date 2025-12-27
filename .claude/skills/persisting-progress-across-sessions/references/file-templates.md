# Progress File Templates

Ready-to-use templates for different orchestration complexities.

## Minimal Template (3-4 Phases)

Use for simple orchestrations with clear linear flow.

````markdown
# Orchestration: <Feature Name>

## Status: in_progress

## Last Updated: <ISO timestamp>

## Completed

- [x] <Phase 1> - <brief result>
- [x] <Phase 2> - <brief result>

## Current

- [ ] <Phase 3> - <what's happening>

## Pending

- [ ] <Phase 4>

## Context

- Key file: <path>
- API: <endpoint>
- Pattern: <chosen approach>

## Latest Agent Output

```json
{
  "status": "complete",
  "summary": "...",
  "files_created": [...]
}
```
````

````

### Example: Component Implementation

```markdown
# Orchestration: Asset Filter Component

## Status: in_progress
## Last Updated: 2024-01-15T14:30:00Z

## Completed
- [x] Architecture - Tier 2 component, local state only
- [x] Implementation - AssetFilter.tsx with 3 filter types

## Current
- [ ] Testing - Unit tests for filter logic

## Pending
- [ ] Review - Code quality check

## Context
- Component: src/sections/assets/components/AssetFilter.tsx
- API: GET /my?resource=asset&status=A,F&class=ipv4
- State: useState for filter values, TanStack Query for data

## Latest Agent Output
```json
{
  "status": "complete",
  "summary": "Created AssetFilter component with status, severity, and date filters",
  "files_created": [
    "src/sections/assets/components/AssetFilter.tsx",
    "src/sections/assets/hooks/useAssetFilters.ts"
  ]
}
````

````

## Full Template (5+ Phases)

Use for complex orchestrations with multiple agents and coordination needs.

```markdown
# Orchestration: <Feature Name>

## Status: in_progress | complete | blocked
## Started: <ISO timestamp>
## Last Updated: <ISO timestamp>

## Overview

<2-3 sentence description of what this orchestration accomplishes and why it was needed.>

---

## Completed Phases

- [x] **Phase 1: <Name>** - <result summary>
  - Agent: <agent-name>
  - Completed: <timestamp>
  - Key outputs: <list important decisions/files>

- [x] **Phase 2: <Name>** - <result summary>
  - Agent: <agent-name>
  - Completed: <timestamp>
  - Key outputs: <list>

## Current Phase

- [ ] **Phase 3: <Name>** - <what's in progress>
  - Agent: <agent-name> (in progress)
  - Started: <timestamp>
  - Progress: <percentage or description>
  - Notes: <any blockers or context>

## Pending Phases

- [ ] **Phase 4: <Name>** - <planned approach>
- [ ] **Phase 5: <Name>** - <planned approach>
- [ ] **Phase 6: <Name>** - <planned approach>

---

## Context for Resume

### Architecture Decisions
- **Pattern**: <chosen architecture pattern>
- **Database**: <schema/table design choices>
- **API Design**: <endpoint contracts>
- **State Management**: <frontend state approach>

### Key File Paths
| Purpose | Path |
|---------|------|
| Handler | `pkg/handler/handlers/<domain>/<file>.go` |
| Service | `pkg/service/<domain>/service.go` |
| Component | `src/sections/<section>/components/<file>.tsx` |
| Tests | `<test file paths>` |

### API Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/<resource>` | List resources |
| POST | `/api/<resource>` | Create resource |

### Dependencies
- **Depends on**: <upstream services/features that must exist>
- **Blocks**: <downstream work waiting on this>

### Environment
- Branch: `feature/<branch-name>`
- Related PR: <if any>
- Deployment: <environment if deployed>

### Blockers
- [ ] <Blocker 1 description> - Status: <pending/resolved>
- [ ] <Blocker 2 description> - Status: <pending/resolved>

---

## Agent Outputs

### <agent-name> (Phase 1 - completed)
```json
{
  "status": "complete",
  "summary": "<what was accomplished>",
  "decisions": {
    "<decision-1>": "<choice>",
    "<decision-2>": "<choice>"
  },
  "files_created": [
    "<path-1>",
    "<path-2>"
  ],
  "next_steps": ["<recommended follow-up>"]
}
````

### <agent-name> (Phase 2 - completed)

```json
{
  "status": "complete",
  "summary": "<what was accomplished>",
  "files_created": ["<paths>"],
  "tests_passing": true
}
```

### <agent-name> (Phase 3 - in_progress)

```json
{
  "status": "in_progress",
  "started": "<timestamp>",
  "partial_output": "<description of work done so far>",
  "remaining": "<what's left to do>"
}
```

---

## Error Log

### <timestamp> - <Error Category>

- **Phase**: <which phase>
- **Agent**: <which agent>
- **Error**: <exact error message or description>
- **Root Cause**: <why it happened>
- **Resolution**: <how it was fixed, or "pending">
- **Prevention**: <how to avoid in future>

---

## Notes

### User Preferences

- <Any stated preferences about implementation>
- <Style/pattern preferences>

### Constraints Discovered

- <Technical limitations found during implementation>
- <Business rules learned>

### Performance Targets

- <Response time requirements>
- <Scale requirements>

### Future Improvements

- <Ideas for follow-up work>
- <Technical debt to address>

````

### Example: Backend API Implementation

```markdown
# Orchestration: Job Processing Pipeline

## Status: in_progress
## Started: 2024-01-15T09:00:00Z
## Last Updated: 2024-01-15T16:45:00Z

## Overview

Implement a job processing pipeline with retry logic, dead-letter queue handling, and full test coverage. This supports async operations for long-running security scans.

---

## Completed Phases

- [x] **Phase 1: Architecture** - Designed SQS-based pipeline with DLQ
  - Agent: backend-architect
  - Completed: 2024-01-15T10:30:00Z
  - Key outputs: Queue design, retry strategy (exponential backoff 1s/2s/4s/8s)

- [x] **Phase 2: Infrastructure** - CloudFormation deployed
  - Agent: aws-infrastructure-specialist
  - Completed: 2024-01-15T12:00:00Z
  - Key outputs: job-processing-queue, job-processing-dlq created

- [x] **Phase 3: Implementation** - Handler and service complete
  - Agent: backend-developer
  - Completed: 2024-01-15T14:30:00Z
  - Key outputs: pkg/jobs/processor.go with retry logic

## Current Phase

- [ ] **Phase 4: Testing** - Unit and integration tests
  - Agent: backend-tester (in progress)
  - Started: 2024-01-15T14:45:00Z
  - Progress: 8/15 tests complete
  - Notes: Mock setup for DynamoDB took longer than expected

## Pending Phases

- [ ] **Phase 5: Acceptance Tests** - E2E with real queues
- [ ] **Phase 6: Code Review** - Quality and patterns
- [ ] **Phase 7: Security Review** - Input validation, error handling

---

## Context for Resume

### Architecture Decisions
- **Pattern**: SQS consumer with Lambda trigger
- **Database**: DynamoDB job status table with GSI on status
- **Retry**: Exponential backoff (1s, 2s, 4s, 8s), max 3 retries
- **DLQ**: After 3 failures, move to dead-letter queue for manual review

### Key File Paths
| Purpose | Path |
|---------|------|
| Processor | `pkg/jobs/processor.go` |
| Handler | `pkg/handler/handlers/job/process.go` |
| Service | `pkg/service/job/service.go` |
| Unit Tests | `pkg/jobs/processor_test.go` |
| CloudFormation | `infrastructure/job-processing.yaml` |

### API Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/jobs` | Create new job |
| GET | `/api/jobs/:id` | Get job status |
| POST | `/api/jobs/:id/retry` | Manually retry failed job |

### Dependencies
- **Depends on**: SQS queues (deployed), DynamoDB table (exists)
- **Blocks**: Frontend job status UI, webhook notifications

### Blockers
- None currently

---

## Agent Outputs

### backend-architect (Phase 1 - completed)
```json
{
  "status": "complete",
  "summary": "Designed job processing architecture with SQS and DLQ",
  "decisions": {
    "queue_type": "SQS Standard",
    "retry_strategy": "exponential_backoff",
    "max_retries": 3,
    "dlq_retention": "14 days"
  }
}
````

### backend-developer (Phase 3 - completed)

```json
{
  "status": "complete",
  "summary": "Implemented job processor with retry logic and DLQ routing",
  "files_created": [
    "pkg/jobs/processor.go",
    "pkg/jobs/retry.go",
    "pkg/handler/handlers/job/process.go"
  ],
  "tests_passing": true
}
```

### backend-tester (Phase 4 - in_progress)

```json
{
  "status": "in_progress",
  "started": "2024-01-15T14:45:00Z",
  "partial_output": "Created 8/15 tests. Happy path and basic error cases done.",
  "remaining": "DLQ routing tests, concurrent processing tests, edge cases"
}
```

---

## Error Log

### 2024-01-15T11:30:00Z - Infrastructure Deployment

- **Phase**: Infrastructure
- **Agent**: aws-infrastructure-specialist
- **Error**: CloudFormation stack creation failed - IAM role missing
- **Root Cause**: Lambda execution role not included in template
- **Resolution**: Added LambdaExecutionRole resource to template
- **Prevention**: Use infrastructure checklist before deployment

---

## Notes

### User Preferences

- Prefers detailed logging over minimal output
- Wants comprehensive error messages for debugging

### Constraints Discovered

- SQS message visibility timeout must be longer than expected processing time
- DynamoDB strongly consistent reads needed for job status checks

### Performance Targets

- Job processing: <30 seconds per job
- Throughput: 100 jobs/minute sustained

```

## Choosing a Template

| Orchestration Type | Template | Phases | Agents |
|--------------------|----------|--------|--------|
| Simple component | Minimal | 3-4 | 2-3 |
| Feature implementation | Minimal | 4-5 | 3-4 |
| Complex backend system | Full | 5-7 | 4-6 |
| Full-stack feature | Full | 6-8 | 5-8 |
| Major refactoring | Full | 5-10 | 4-8 |

**Rule of thumb**: If you need to track architecture decisions, dependencies, or coordinate 4+ agents, use the full template.
```
