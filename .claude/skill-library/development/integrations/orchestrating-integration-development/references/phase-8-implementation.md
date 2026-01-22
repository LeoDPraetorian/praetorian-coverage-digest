# Phase 8: Implementation

**Execute architecture plan by spawning integration-developer with P0 compliance.**

**This file provides:** Complete phase protocol for integration development.

---

## Overview

Implementation executes the plan by delegating to integration-developer:

1. Read skill manifest from Phase 4
2. Build agent prompt with P0 requirements
3. Execute in batches (from Phase 5 complexity plan)
4. Track progress and handle blockers

**Entry Criteria:** Phase 7 (Architecture Plan) complete with approved design.

**Exit Criteria:** All code implemented, compiles, P0 requirements addressed.

**⛔ COMPACTION GATE 2 FOLLOWS:** Before proceeding to Phase 9, complete [compaction-gates.md](compaction-gates.md) protocol.

---

## Step 1: Mode Selection

Based on task count from Phase 7:

| Task Count | Mode     | Description                                    |
| ---------- | -------- | ---------------------------------------------- |
| 1-3 tasks  | Batch    | Agent completes all tasks, reports once        |
| 4+ tasks   | Per-Task | Agent completes one task at a time with review |

---

## Step 2: Spawn Integration-Developer Agent

**⚡ PRE-SPAWN CHECK:** Before EACH agent spawn, run intra-phase compaction protocol from [compaction-gates.md](compaction-gates.md#intra-phase-compaction-heavy-phases).

**Agent prompt template:**

```markdown
Task: Implement {vendor} integration according to architecture plan

INPUT FILES (read ALL before implementing):

- architecture-plan.md: Implementation blueprint with P0 requirements
- discovery.md: Pattern examples from existing integrations
- skill-manifest.yaml: Vendor-specific and domain skills

IMPLEMENTATION TASKS:
[List from Phase 7 architecture-plan.md]

P0 REQUIREMENTS (MANDATORY - all must be satisfied):

1. VMFilter: Initialize in struct, call before every Job.Send()
2. CheckAffiliation: MUST query external API (not stub returning true)
3. ValidateCredentials: MUST be first statement in Invoke()
4. errgroup: Call SetLimit() AND capture loop variables
5. Pagination: Define maxPages constant with break condition
6. Error handling: No `_, _ =` patterns, all errors wrapped with context
7. File size: Each file <400 lines

MANDATORY SKILLS (invoke ALL before completing):

- integrating-with-{vendor}: Vendor API patterns, auth, rate limits
- developing-integrations: P0 requirements and implementation patterns
- developing-with-tdd: Write test first, then implementation
- verifying-before-completion: Verify all requirements before claiming done
- gateway-integrations: Integration patterns and P0 requirements
- persisting-agent-outputs: Output file format

OUTPUT_DIRECTORY: {from Phase 1}
OUTPUT FILES:

- Go implementation files (per architecture plan)
- implementation.md (progress tracking)

SUCCESS CRITERIA:

- All files compile: `go build ./...`
- P0 checklist satisfied (see architecture-plan.md)
- implementation.md documents all decisions
```

---

## Step 3: P0 Implementation Patterns

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

const maxPages = 1000  // P0 #5: Pagination safety

type Vendor struct {
    capability.BaseCapability
    Filter  *filter.VMFilter  // P0 #1: VMFilter
    client  *vendorClient
}

func (task *Vendor) Match(job model.Job) bool {
    return job.Type == "{vendor}"
}

func (task *Vendor) Invoke() error {
    // P0 #3: ValidateCredentials FIRST
    if err := task.ValidateCredentials(); err != nil {
        return fmt.Errorf("validating credentials: %w", err)
    }
    return task.enumerate()
}

func (task *Vendor) CheckAffiliation(asset model.Asset) (bool, error) {
    // P0 #2: MUST query external API
    resp, err := task.client.GetAsset(context.Background(), asset.CloudId)
    if err != nil {
        if isNotFoundError(err) {
            return false, nil
        }
        return false, fmt.Errorf("checking affiliation: %w", err)
    }
    return resp.ID != "", nil
}

func (task *Vendor) enumerate() error {
    group := errgroup.Group{}
    group.SetLimit(10)  // P0 #4: errgroup SetLimit

    nextToken := ""
    for page := 0; page < maxPages; page++ {  // P0 #5: maxPages
        resp, err := task.client.ListAssets(context.Background(), nextToken)
        if err != nil {
            return fmt.Errorf("listing page %d: %w", page, err)  // P0 #6: Error handling
        }

        for _, item := range resp.Items {
            item := item  // P0 #4: Capture loop variable

            group.Go(func() error {
                asset := task.transformAsset(item)

                // P0 #1: VMFilter before Send
                if task.Filter.Asset(asset) {
                    return nil
                }

                task.Job.Send(asset)
                return nil
            })
        }

        if resp.NextToken == "" {
            break
        }
        nextToken = resp.NextToken
    }

    return group.Wait()
}
```

---

## Step 4: Execute Implementation in Batches

Use batch plan from Phase 5:

**Batch Mode (1-3 tasks):**

```
Task(subagent_type: "integration-developer", prompt: {full_prompt})
```

**Per-Task Mode (4+ tasks):**

```
for each task:
    Task(subagent_type: "integration-developer", prompt: {task_prompt})
    Review output
    Handle blockers
```

---

## Step 5: Validate Agent Returns

When agent returns:

1. **Check status:** `complete` | `blocked` | `needs_review`
2. **Read output file** (don't just trust summary)
3. **Verify skills_invoked array**
4. **Check files were written:**

```bash
go build ./pkg/tasks/integrations/{vendor}/...
```

**If compilation fails:** Re-spawn with error details.

---

## Step 6: Update MANIFEST.yaml

```yaml
phases:
  8_implementation:
    status: "complete"
    completed_at: "{timestamp}"
    developer_agents: ["integration-developer"]

implementation:
  mode: "batch"
  tasks_completed: 3
  files_created:
    - "modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go"
    - "modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}_types.go"

  p0_implementation:
    vmfilter: "{vendor}.go:25"
    checkaffiliation: "{vendor}.go:65"
    validatecredentials: "{vendor}.go:45"
    errgroup: "{vendor}.go:85"
    pagination: "{vendor}.go:15"
    error_handling: "all errors wrapped"
    file_size: "285 lines"

  build_status: "SUCCESS"
  skills_invoked:
    - developing-with-tdd
    - verifying-before-completion
    - gateway-integrations
```

---

## Step 7: Report Results

```markdown
## Implementation Complete

**Tasks Completed:** 3 of 3
**Files Created:** 2
**Build Status:** SUCCESS

**P0 Implementation Locations:**

- VMFilter: {vendor}.go:25 (init), :98 (use)
- CheckAffiliation: {vendor}.go:65 (real API query)
- ValidateCredentials: {vendor}.go:45 (first in Invoke)
- errgroup: {vendor}.go:85 (SetLimit=10)
- maxPages: {vendor}.go:15 (1000)

⛔ **COMPACTION GATE 2:** Execute compaction before Phase 9.

→ After compaction, proceeding to Phase 9: Design Verification
```

---

## Error Recovery

### Compile Errors

1. Read error message
2. Fix in place (if simple)
3. Re-run build
4. If persistent, spawn fresh agent with error context

### Agent Blocked

1. Read blocked_reason from agent output
2. Route per blocked status table
3. Address blocker
4. Resume implementation

### P0 Violations Found Later

If Phase 10 (Domain Compliance) finds violations:

1. Agent returns to fix specific violations
2. Re-run P0 validation
3. Continue to Phase 11 only when all pass

---

## Gate Checklist

Phase 8 is complete when:

- [ ] `integration-developer` agent spawned with correct prompt
- [ ] Mode selected (batch for 1-3 tasks, per-task for 4+)
- [ ] All Go handler files created per architecture plan
- [ ] Handler registered in integrations.go
- [ ] `implementation.md` created with task tracking
- [ ] Code compiles: `go build ./...` succeeds
- [ ] P0 implementation locations documented
- [ ] MANIFEST.yaml updated
- [ ] Phase 8 status updated to 'complete'
- [ ] Ready for compaction gate

---

## Related References

- [compaction-gates.md](compaction-gates.md) - Gate 2 follows this phase
- [phase-9-design-verification.md](phase-9-design-verification.md) - Next phase
