# Developer Agent Prompt Template (Phase 4)

**Agent**: integration-developer
**Phase**: 4 (Implementation)
**Purpose**: Implement Go integration handler with P0 compliance

## Prompt Template

```markdown
Task: Implement {vendor} integration according to architecture plan

You are in Phase 4 of integration development. Your goal is to implement the Go integration handler following the architecture.md blueprint with strict P0 compliance.

## Input Files (READ ALL BEFORE IMPLEMENTING)

1. **architecture.md** (Phase 3): Complete implementation blueprint with P0 checklist
2. **discovery.md** (Phase 2): Codebase pattern examples
3. **skill-summary.md** (Phase 2): Vendor-specific API patterns
4. **file-placement.md** (Phase 2): Target file locations

Read each file completely to understand requirements.

## Implementation Tasks

{IF Batch Mode (1-3 tasks):}
Complete ALL tasks in this session:

1. Create {vendor}.go with struct, Invoke(), CheckAffiliation(), ValidateCredentials(), Match()
2. Create {vendor}_types.go with API response structs (if split)
3. Create {vendor}_client.go with HTTP client (if split)

{IF Per-Task Mode (4+ tasks):}
This is Task {N} of {total}: {task_description}

CONTEXT FROM PRIOR TASKS:
{summary of completed tasks}

THIS TASK:
- File: {file_path}
- Purpose: {what this file contains}
- Estimated lines: {from architecture}

## P0 REQUIREMENTS (ALL MANDATORY)

These requirements are NON-NEGOTIABLE. Every integration MUST satisfy all 7:

### 1. VMFilter Initialization and Usage
- **Initialize** in struct: `Filter: filter.NewVMFilter(baseCapability.AWS, baseCapability.Collectors)`
- **Use** before every Job.Send(): `if task.Filter.Asset(asset) { continue }`
- **Semantics**: Filter.Asset() returns `true` to REJECT (filter out)
- **Pattern**: See discovery.md CrowdStrike example

### 2. CheckAffiliation - NOT STUB
- **MUST** query external vendor API to verify asset ownership
- **CANNOT** be `return true, nil` without API call
- **Pattern**: See discovery.md Wiz example (wiz.go:717-783)
- **Steps**:
  1. Validate credentials first
  2. Require asset identifier (CloudId, etc.)
  3. Query vendor API for asset
  4. Check if exists and not deleted
  5. Return affiliated status
- **IF** no individual lookup endpoint: Use BaseCapability.CheckAffiliationSimple

### 3. ValidateCredentials Placement
- **MUST** be first statement in Invoke() method
- **Purpose**: Fail fast if credentials invalid
- **Pattern**:
  ```go
  func (task *Vendor) Invoke() error {
      if err := task.ValidateCredentials(); err != nil {
          return fmt.Errorf("validating credentials: %w", err)
      }
      return task.enumerate()
  }
  ```

### 4. errgroup Safety
- **MUST** call SetLimit() before Go() calls
- **MUST** capture loop variables with `item := item`
- **SetLimit values** (choose based on API):
  - API-heavy: 10
  - Rate-limited: 25
  - File I/O: 30
  - Lightweight: 100
- **Pattern**:
  ```go
  group := errgroup.Group{}
  group.SetLimit(10)

  for _, item := range items {
      item := item  // CRITICAL: capture

      group.Go(func() error {
          // process item
          return nil
      })
  }

  return group.Wait()
  ```

### 5. Pagination with maxPages
- **Define** maxPages constant: `const maxPages = 1000`
- **Use** in loop condition: `for page := 0; page < maxPages; page++`
- **Check** natural termination: `if resp.NextToken == "" { break }`
- **Log** if limit reached: `slog.Warn("reached max pages")`

### 6. Error Handling
- **NO** ignored errors: `_, _ =` patterns FORBIDDEN
- **ALL** errors must be checked and wrapped
- **Wrapping**: Use `%w` to preserve error chain
- **Context**: Add context about what failed
- **Pattern**:
  ```go
  payload, err := json.Marshal(req)  // ✅ Check error
  if err != nil {
      return fmt.Errorf("marshaling request: %w", err)
  }
  ```

### 7. File Size
- **Target**: <400 lines per file
- **IF** exceeds: Split into types, client, transform files
- **Split pattern**: See discovery.md for examples

## Implementation Template

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

const maxPages = 1000  // P0: Pagination safety

type Vendor struct {
    capability.BaseCapability
    Filter  *filter.VMFilter  // P0: VMFilter
    client  *vendorClient
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
    // Implementation from architecture.md
}

func (task *Vendor) CheckAffiliation(asset model.Asset) (bool, error) {
    // P0: MUST query external API
    // Follow pattern from architecture.md
}

func (task *Vendor) enumerate() error {
    // P0: errgroup with SetLimit
    group := errgroup.Group{}
    group.SetLimit(10)

    // P0: Pagination with maxPages
    nextToken := ""
    for page := 0; page < maxPages; page++ {
        resp, err := task.client.ListAssets(context.Background(), nextToken)
        if err != nil {
            return fmt.Errorf("listing page %d: %w", page, err)
        }

        for _, item := range resp.Items {
            item := item  // P0: capture loop variable

            group.Go(func() error {
                asset := task.transformAsset(item)

                // P0: VMFilter before Send
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
```

## Registration

Add to `modules/chariot/backend/pkg/tasks/integrations/integrations.go`:

```go
import (
    "{vendor}" "github.com/praetorian-inc/chariot/backend/pkg/tasks/integrations/{vendor}"
)

func init() {
    capability.Register(&{vendor}.Vendor{})
}
```

## Build Verification

After implementation, verify it compiles:

```bash
cd modules/chariot/backend
go build ./pkg/tasks/integrations/{vendor}/...
```

## MANDATORY SKILLS (invoke ALL before completing)

- using-skills: Skill discovery workflow
- discovering-reusable-code: Find reusable patterns
- semantic-code-operations: Semantic code search and editing
- developing-with-tdd: Test-driven development
- enforcing-evidence-based-analysis: Verify source file claims
- persisting-agent-outputs: Output file format
- verifying-before-completion: Exit criteria verification
- gateway-integrations: Integration patterns
- gateway-backend: Go backend patterns

OUTPUT_DIRECTORY: {provided by orchestrator}

OUTPUT FILES:
- Go implementation files (per file-placement.md)
- implementation-log.md (document decisions, P0 checklist status, build results)

COMPLIANCE: Document invoked skills in output metadata JSON block at end of implementation-log.md.

## Success Criteria

Implementation is complete when:
- [ ] All files from architecture.md created
- [ ] Handler registered in integrations.go
- [ ] Code compiles: `go build ./...`
- [ ] All P0 requirements addressed (self-verify against checklist)
- [ ] implementation-log.md documents all decisions
- [ ] Output metadata includes skills_invoked array
```
