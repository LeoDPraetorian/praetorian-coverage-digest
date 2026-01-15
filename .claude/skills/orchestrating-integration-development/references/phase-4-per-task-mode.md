# Phase 4: Per-Task Mode

**Purpose**: Detailed workflow for implementing complex integrations with review cycles between tasks.

## Overview

Per-Task Mode is used when Phase 4 has 4+ implementation tasks. Instead of having the agent complete all tasks at once (Batch Mode), Per-Task Mode spawns a fresh agent for each task with review cycles between tasks.

## When to Use Per-Task Mode

| Scenario | Recommendation |
|----------|----------------|
| 1-3 implementation tasks | Batch Mode |
| 4+ implementation tasks | Per-Task Mode |
| High-risk implementation | Per-Task Mode |
| Complex data transformations | Per-Task Mode |
| Learning new patterns | Per-Task Mode |
| Time-constrained session | Batch Mode |

## Per-Task Mode Benefits

| Benefit | Description |
|---------|-------------|
| Incremental validation | Catch issues early, before they compound |
| Context freshness | Each agent starts clean, no context pollution |
| Flexible recovery | Restart single task, not entire implementation |
| Review opportunity | Human can review between tasks |
| Progress visibility | Clear progress tracking |

## Workflow

```
Task 1: Primary Handler
  └─ Agent implements → Review → Approve/Revise
     │
     ▼
Task 2: Types File
  └─ Agent implements → Review → Approve/Revise
     │
     ▼
Task 3: Client File
  └─ Agent implements → Review → Approve/Revise
     │
     ▼
Task 4: Transform File
  └─ Agent implements → Review → Approve/Revise
     │
     ▼
Phase 4 Complete
```

## Task Ordering

Implement tasks in dependency order:

1. **Types file** ({vendor}_types.go) - API response structs
2. **Client file** ({vendor}_client.go) - HTTP client, API methods
3. **Transform file** ({vendor}_transform.go) - Data transformations
4. **Primary handler** ({vendor}.go) - Main capability implementation

**Rationale**: Handler depends on types, client, and transforms. Implementing dependencies first allows the handler to use them.

## Per-Task Agent Prompt Template

Each task gets a dedicated agent spawn:

```markdown
Task: Implement {vendor} integration - Task {N} of {total}: {task_description}

CONTEXT FROM PRIOR TASKS:
{summary of completed tasks and files created}

INPUT FILES:
- architecture.md: Implementation blueprint
- discovery.md: Pattern examples
{if task > 1:}
- Prior implementation files: {list of created files}

THIS TASK:
- File to create: {file_path}
- Purpose: {what this file contains}
- Estimated lines: {from architecture.md}

DEPENDENCIES:
- This file {uses | is used by}: {related files}

P0 REQUIREMENTS FOR THIS FILE:
{subset of P0 requirements relevant to this file}

MANDATORY SKILLS:
- developing-with-tdd
- verifying-before-completion
- gateway-integrations
- persisting-agent-outputs

OUTPUT_DIRECTORY: {from Phase 0}

SUCCESS CRITERIA:
- File compiles: `go build ./...`
- {task-specific criteria}
```

## Task-Specific Prompts

### Task: Types File

```markdown
Task: Implement {vendor} integration - Task 1 of 4: API Types

Create: modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}_types.go

PURPOSE:
Define Go structs for all API responses and requests documented in architecture.md.

REQUIREMENTS:
- JSON struct tags matching API field names
- Pointer types for optional fields
- Documentation comments for each struct
- Enums for status/type fields

EXAMPLE (from Wiz):
```go
type WizAsset struct {
    ID          string            `json:"id"`
    Name        string            `json:"name"`
    CloudID     string            `json:"cloudPlatformId,omitempty"`
    Type        WizAssetType      `json:"type"`
    Status      string            `json:"status"`
    DeletedAt   string            `json:"deletedAt,omitempty"`
    Properties  map[string]any    `json:"properties"`
}

type WizAssetType string

const (
    WizAssetTypeVM       WizAssetType = "VIRTUAL_MACHINE"
    WizAssetTypeContainer WizAssetType = "CONTAINER"
)
```

SUCCESS CRITERIA:
- All API responses from architecture.md have corresponding structs
- Compiles without errors
- <200 lines
```

### Task: Client File

```markdown
Task: Implement {vendor} integration - Task 2 of 4: HTTP Client

Create: modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}_client.go

PRIOR WORK:
- {vendor}_types.go created (use these types in responses)

PURPOSE:
HTTP client with authentication, rate limiting, and API methods.

REQUIREMENTS:
- Client struct with http.Client and auth credentials
- NewClient constructor
- API methods returning typed responses (from types file)
- Error handling with context wrapping
- Rate limit header checking (if applicable)

EXAMPLE STRUCTURE:
```go
type vendorClient struct {
    httpClient *http.Client
    baseURL    string
    apiKey     string
}

func newVendorClient(apiKey string) *vendorClient {
    return &vendorClient{
        httpClient: &http.Client{Timeout: 30 * time.Second},
        baseURL:    "https://api.vendor.com/v1",
        apiKey:     apiKey,
    }
}

func (c *vendorClient) ListAssets(ctx context.Context, token string) (*ListAssetsResponse, error) {
    // Implementation
}

func (c *vendorClient) GetAsset(ctx context.Context, id string) (*Asset, error) {
    // Implementation
}
```

SUCCESS CRITERIA:
- Uses types from {vendor}_types.go
- All API methods from architecture.md implemented
- Error handling includes context
- Compiles without errors
- <200 lines
```

### Task: Transform File

```markdown
Task: Implement {vendor} integration - Task 3 of 4: Data Transformations

Create: modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}_transform.go

PRIOR WORK:
- {vendor}_types.go: API response types
- {vendor}_client.go: API client methods

PURPOSE:
Transform vendor API responses to Chariot model entities.

REQUIREMENTS:
- Transform functions for each entity type (Asset, Risk if applicable)
- Follow Tabularium mapping from architecture.md
- Handle optional/nil fields gracefully
- Add logging for transformation decisions

EXAMPLE:
```go
func transformAsset(item *VendorAsset) *model.Asset {
    asset := model.NewAsset(item.ID, item.Name)

    if item.Hostname != "" {
        asset.DNS = strings.ToLower(item.Hostname)
    }

    if item.CloudID != "" {
        asset.CloudId = item.CloudID
    }

    // Transform tags to attributes
    for key, value := range item.Tags {
        asset.AddAttribute(key, fmt.Sprintf("%v", value))
    }

    return asset
}

func transformRisk(finding *VendorFinding, asset *model.Asset) *model.Risk {
    risk := model.NewRisk(finding.ID, asset)
    risk.Severity = mapSeverity(finding.Severity)
    risk.Description = truncate(finding.Description, 4000)
    // ...
    return risk
}

func mapSeverity(vendorSeverity string) string {
    switch strings.ToLower(vendorSeverity) {
    case "critical":
        return "critical"
    case "high":
        return "high"
    // ...
    }
}
```

SUCCESS CRITERIA:
- Transforms match Tabularium mapping in architecture.md
- Uses types from {vendor}_types.go
- Handles nil/empty fields
- Compiles without errors
- <150 lines
```

### Task: Primary Handler

```markdown
Task: Implement {vendor} integration - Task 4 of 4: Primary Handler

Create: modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go

PRIOR WORK:
- {vendor}_types.go: API response types
- {vendor}_client.go: API client methods
- {vendor}_transform.go: Data transformation functions

PURPOSE:
Main capability implementation with P0 compliance.

P0 REQUIREMENTS (ALL MANDATORY):
1. VMFilter: Initialize in struct, call before every Job.Send()
2. CheckAffiliation: Query vendor API (use client.GetAsset)
3. ValidateCredentials: First statement in Invoke()
4. errgroup: SetLimit({n}) and capture loop variables
5. Pagination: maxPages constant with break condition
6. Error handling: No `_, _ =`, all errors wrapped

IMPORTS TO USE:
- Types: "./{vendor}_types"
- Client: uses {vendor}_client.go functions
- Transform: uses {vendor}_transform.go functions

STRUCTURE:
1. Package declaration and imports
2. maxPages constant
3. Vendor struct with VMFilter
4. Match() method
5. Invoke() method (ValidateCredentials first!)
6. ValidateCredentials() method
7. CheckAffiliation() method (query API!)
8. enumerate() method with errgroup and VMFilter

SUCCESS CRITERIA:
- All P0 requirements satisfied
- Uses client from {vendor}_client.go
- Uses transforms from {vendor}_transform.go
- Compiles: `go build ./...`
- <350 lines
```

## Review Cycle Between Tasks

After each task completes:

### Step 1: Agent Returns Output

```json
{
  "agent": "integration-developer",
  "status": "complete",
  "task": "Task 2 of 4: Client File",
  "file_created": "{vendor}_client.go",
  "lines": 185,
  "handoff": {
    "next_task": "Task 3 of 4: Transform File"
  }
}
```

### Step 2: Orchestrator Validates

```bash
# Verify file was created
ls modules/chariot/backend/pkg/tasks/integrations/{vendor}/

# Verify it compiles
cd modules/chariot/backend && go build ./pkg/tasks/integrations/{vendor}/...
```

### Step 3: Checkpoint (Optional)

For high-risk tasks, use AskUserQuestion:

```markdown
Task 2 of 4 Complete: {vendor}_client.go

Created: modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}_client.go
Lines: 185
Build: SUCCESS

Quick review:
- API methods: ListAssets, GetAsset, GetCurrentUser
- Rate limiting: Checks X-RateLimit-Remaining header
- Error handling: All errors wrapped with context

Continue to Task 3 (Transform File)?
```

Options:
- **Continue** - Proceed to next task
- **Review first** - Show file contents before continuing
- **Revise** - Re-run Task 2 with feedback

### Step 4: Spawn Next Task

Pass context from completed tasks:

```markdown
CONTEXT FROM PRIOR TASKS:
- Task 1: {vendor}_types.go (completed, 120 lines)
- Task 2: {vendor}_client.go (completed, 185 lines)

These files are available at:
modules/chariot/backend/pkg/tasks/integrations/{vendor}/
```

## Error Recovery in Per-Task Mode

### Task Fails

**Symptom**: Agent returns error or blocked status

**Recovery**:
1. Do NOT restart from Task 1
2. Address the specific failure
3. Re-spawn agent for ONLY the failed task
4. Continue from where you left off

### Build Fails After Task

**Symptom**: `go build` fails after task completion

**Recovery**:
1. Identify which file caused the failure
2. Re-spawn agent for that specific task with error context
3. Prior completed tasks remain valid

### P0 Violation Detected Mid-Implementation

**Symptom**: Reviewer notes P0 issue in completed task

**Recovery**:
1. Complete remaining tasks (violation may be addressed in later task)
2. Run Phase 4.5 P0 Validation
3. Address all violations together

## Progress Tracking

### implementation-log.md Updates

After each task, append to implementation-log.md:

```markdown
## Task 2: Client File ({vendor}_client.go)
- Status: Complete
- Started: 2026-01-14T15:30:00Z
- Completed: 2026-01-14T15:45:00Z
- Duration: 15 minutes
- Lines: 185
- Build: SUCCESS
- Agent: integration-developer (task-2)
- Skills invoked: developing-with-tdd, verifying-before-completion

### Files Created
- modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}_client.go

### API Methods Implemented
- NewClient(apiKey string) *vendorClient
- ListAssets(ctx, token) (*ListResponse, error)
- GetAsset(ctx, id) (*Asset, error)
- GetCurrentUser(ctx) (*User, error)

### Review Notes
- Rate limiting headers checked
- All errors wrapped with context
- 30 second timeout configured
```

## Gate Checklist

Per-Task Mode Phase 4 is complete when:

- [ ] All tasks identified from architecture.md
- [ ] Tasks ordered by dependency
- [ ] Each task spawned with fresh agent
- [ ] Each task includes context from prior tasks
- [ ] Each task validated (compile check)
- [ ] implementation-log.md updated after each task
- [ ] All files created per file-placement.md
- [ ] Handler registered in integrations.go
- [ ] Final build succeeds: `go build ./...`

## Related References

- [Phase 4 Implementation](phase-4-implementation.md) - Main Phase 4 documentation
- [Error Recovery](error-recovery.md) - Recovery procedures
- [Agent Handoffs](agent-handoffs.md) - Handoff JSON format
