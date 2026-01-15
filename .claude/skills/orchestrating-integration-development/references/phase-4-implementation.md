# Phase 4: Implementation

**Purpose**: Implement the integration following the architecture plan with P0 compliance.

## Overview

Phase 4 uses the `integration-developer` agent to create the Go handler files. The agent works from the architecture.md blueprint and applies TDD methodology with mandatory P0 compliance patterns.

**Agent**: `integration-developer`

## Mode Selection

Phase 4 operates in one of two modes based on task count:

| Task Count | Mode | Description |
|------------|------|-------------|
| 1-3 tasks | Batch | Agent completes all tasks, reports once |
| 4+ tasks | Per-Task | Agent completes one task at a time with review cycles |

**Task count determination:**
Count the implementation sections in architecture.md:
- Primary handler file = 1 task
- Each supporting file = 1 task
- Test file = 1 task (handled in Phase 6)

**Example:**
- Single file integration: 1 task → Batch mode
- Split file integration (handler + types + client): 3 tasks → Batch mode
- Complex integration (handler + types + client + transform): 4 tasks → Per-Task mode

## Batch Mode (1-3 Tasks)

### Agent Prompt Structure

```markdown
Task: Implement {vendor} integration according to architecture plan

INPUT FILES (read ALL before implementing):
- architecture.md: Implementation blueprint with P0 requirements
- discovery.md: Pattern examples from existing integrations
- skill-summary.md: Vendor-specific API patterns
- file-placement.md: Target file locations

IMPLEMENTATION TASKS:
1. Create {vendor}.go with struct, Invoke(), CheckAffiliation(), ValidateCredentials(), Match()
2. Create {vendor}_types.go with API response structs (if split)
3. Create {vendor}_client.go with HTTP client and API methods (if split)

P0 REQUIREMENTS (MANDATORY - all must be satisfied):
1. VMFilter: Initialize in struct, call before every Job.Send()
2. CheckAffiliation: MUST query external API (not stub returning true)
3. ValidateCredentials: MUST be first statement in Invoke()
4. errgroup: Call SetLimit() AND capture loop variables
5. Pagination: Define maxPages constant with break condition
6. Error handling: No `_, _ =` patterns, all errors wrapped with context
7. File size: Each file <400 lines

MANDATORY SKILLS (invoke ALL before completing):
- developing-with-tdd: Write test first, then implementation
- verifying-before-completion: Verify all requirements before claiming done
- gateway-integrations: Integration patterns and P0 requirements
- persisting-agent-outputs: Output file format

OUTPUT_DIRECTORY: {from Phase 0}
OUTPUT FILES:
- Go implementation files (per file-placement.md)
- implementation-log.md (progress tracking)

COMPLIANCE: Document invoked skills in output metadata.

SUCCESS CRITERIA:
- All files compile: `go build ./...`
- P0 checklist satisfied
- implementation-log.md documents all decisions
```

### Batch Mode Output

Agent returns after completing all tasks:

```json
{
  "agent": "integration-developer",
  "status": "complete",
  "skills_invoked": ["developing-with-tdd", "verifying-before-completion", "gateway-integrations"],
  "files_created": [
    "modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go",
    "modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}_types.go"
  ],
  "handoff": {
    "next_agent": null,
    "context": "Implementation complete. Ready for P0 compliance verification."
  }
}
```

## Per-Task Mode (4+ Tasks)

See [phase-4-per-task-mode.md](phase-4-per-task-mode.md) for detailed workflow.

### Key Differences from Batch Mode

| Aspect | Batch Mode | Per-Task Mode |
|--------|------------|---------------|
| Agent spawns | 1 | Multiple (1 per task) |
| Review cycles | None during | After each task |
| Human interaction | End only | After each task |
| Error recovery | Restart all | Restart single task |
| Context | All tasks at once | One task + prior context |

### When to Use Per-Task Mode

- Complex integrations with many files
- High-risk implementations (security-sensitive)
- Learning new patterns (want review feedback)
- Incremental validation preferred

## Implementation Patterns

### Handler File Structure

```go
package {vendor}

import (
    "context"
    "fmt"

    "golang.org/x/sync/errgroup"
    "github.com/praetorian-inc/chariot/backend/pkg/capability"
    "github.com/praetorian-inc/chariot/backend/pkg/filter"
    "github.com/praetorian-inc/chariot/backend/pkg/model"
)

const maxPages = 1000  // Pagination safety limit

type Vendor struct {
    capability.BaseCapability
    Filter  *filter.VMFilter  // P0: VMFilter initialization
    client  *vendorClient     // API client
}

func (task *Vendor) Match(job model.Job) bool {
    return job.Type == "{vendor}"
}

func (task *Vendor) Invoke() error {
    // P0: ValidateCredentials FIRST
    if err := task.ValidateCredentials(); err != nil {
        return fmt.Errorf("validating credentials: %w", err)
    }

    return task.enumerate()
}

func (task *Vendor) ValidateCredentials() error {
    // Initialize and test API credentials
    secret, err := task.Job.Secret.Get("api_key")
    if err != nil {
        return fmt.Errorf("getting api key: %w", err)
    }

    task.client = newVendorClient(secret)

    // Lightweight API call to verify credentials
    _, err = task.client.GetCurrentUser(context.Background())
    if err != nil {
        return fmt.Errorf("authentication failed: %w", err)
    }

    return nil
}

func (task *Vendor) CheckAffiliation(asset model.Asset) (bool, error) {
    // P0: MUST query external API, not stub
    if err := task.ValidateCredentials(); err != nil {
        return false, fmt.Errorf("validating credentials: %w", err)
    }

    if asset.CloudId == "" {
        return false, fmt.Errorf("missing cloud id for asset: %s", asset.Key)
    }

    resp, err := task.client.GetAsset(context.Background(), asset.CloudId)
    if err != nil {
        if isNotFoundError(err) {
            return false, nil  // Asset no longer exists
        }
        return false, fmt.Errorf("checking affiliation: %w", err)
    }

    return resp.ID != "" && resp.DeletedAt == "", nil
}

func (task *Vendor) enumerate() error {
    group := errgroup.Group{}
    group.SetLimit(10)  // P0: errgroup SetLimit

    nextToken := ""
    for page := 0; page < maxPages; page++ {
        resp, err := task.client.ListAssets(context.Background(), nextToken)
        if err != nil {
            return fmt.Errorf("listing assets page %d: %w", page, err)
        }

        for _, item := range resp.Items {
            item := item  // P0: capture loop variable

            group.Go(func() error {
                asset := task.transformAsset(item)

                // P0: VMFilter check before Send
                if task.Filter.Asset(asset) {
                    return nil  // Filtered out
                }

                task.Job.Send(asset)
                return nil
            })
        }

        if resp.NextToken == "" {
            break  // Natural termination
        }
        nextToken = resp.NextToken
    }

    return group.Wait()
}

func (task *Vendor) transformAsset(item *VendorAsset) *model.Asset {
    asset := model.NewAsset(item.ID, item.Name)
    asset.DNS = item.Hostname
    asset.CloudId = item.CloudID
    return asset
}
```

### Registration

Add to `modules/chariot/backend/pkg/tasks/integrations/integrations.go`:

```go
import (
    // ... existing imports
    "{vendor}" "github.com/praetorian-inc/chariot/backend/pkg/tasks/integrations/{vendor}"
)

func init() {
    // ... existing registrations
    capability.Register(&{vendor}.Vendor{})
}
```

## Error Recovery

### Compile Errors

**Symptom**: `go build ./...` fails

**Recovery**:
1. Read error message
2. Fix in place (if simple syntax error)
3. Re-run build
4. If persistent, spawn fresh agent with error context

### P0 Violations

**Symptom**: Phase 4.5 validation fails

**Recovery**:
1. Read violation details from p0-compliance-review.md
2. Spawn fresh `integration-developer` with specific fix instructions
3. Re-run P0 validation

### Agent Blocked

**Symptom**: Agent returns blocked status

**Recovery**:
1. Read blocked_reason from agent output
2. Route per [Blocked Status Handling](../SKILL.md#blocked-status-handling) table
3. Address blocker
4. Resume implementation

## implementation-log.md Structure

```markdown
# Implementation Log: {vendor}

## Session Info
- Started: {timestamp}
- Agent: integration-developer
- Mode: {batch | per-task}

## Tasks Completed

### Task 1: Primary Handler ({vendor}.go)
- Status: Complete
- Lines: 285
- P0 Requirements:
  - [x] VMFilter initialized at line 25
  - [x] VMFilter used at line 98
  - [x] CheckAffiliation queries API at line 65
  - [x] ValidateCredentials first in Invoke() at line 45
  - [x] errgroup SetLimit(10) at line 85
  - [x] Loop variable captured at line 92
  - [x] maxPages = 1000 at line 15
  - [x] All errors checked and wrapped

### Task 2: Types File ({vendor}_types.go)
- Status: Complete
- Lines: 120
- Contains: API response structs, enums

## Decisions Made
1. {decision and rationale}
2. {decision and rationale}

## Build Verification
```bash
go build ./pkg/tasks/integrations/{vendor}/...
# Result: SUCCESS
```

## Next Phase
Ready for Phase 4.5 (P0 Compliance Verification)
```

## Gate Checklist

Phase 4 is complete when:

- [ ] `integration-developer` agent spawned with correct prompt template
- [ ] Mode selected (batch for 1-3 tasks, per-task for 4+)
- [ ] All Go handler files created per file-placement.md
- [ ] Handler registered in integrations.go
- [ ] `implementation-log.md` created with task tracking
- [ ] `developing-with-tdd` skill required in agent prompt
- [ ] `verifying-before-completion` skill required in agent prompt
- [ ] Code compiles: `go build ./...` succeeds
- [ ] MANIFEST.yaml updated with implementation files
- [ ] metadata.json phase-4 status updated to 'complete'

## Common Issues

### Issue: Import Cycle

**Symptom**: `import cycle not allowed`

**Solution**:
- Check import paths
- Move shared types to separate package
- Use interfaces to break cycles

### Issue: Missing Dependencies

**Symptom**: `cannot find package`

**Solution**:
```bash
cd modules/chariot/backend
go mod tidy
```

### Issue: VMFilter Not Available

**Symptom**: `undefined: filter.NewVMFilter`

**Solution**:
- Check import path: `"github.com/praetorian-inc/chariot/backend/pkg/filter"`
- Verify filter package exists

## Related Phases

- **Phase 3 (Architecture)**: Provides architecture.md blueprint
- **Phase 4.5 (P0 Validation)**: Validates implementation against P0 requirements
- **Phase 5 (Review)**: Reviews implementation quality
- **Phase 6 (Testing)**: Creates tests for implementation

## Related Skills

- `developing-with-tdd` - Test-driven development methodology
- `verifying-before-completion` - Exit criteria verification
- `gateway-integrations` - Integration patterns
- `gateway-backend` - Go backend patterns
