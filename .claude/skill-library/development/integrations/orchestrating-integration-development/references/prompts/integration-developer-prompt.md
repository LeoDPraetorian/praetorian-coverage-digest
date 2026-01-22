# Integration Developer Prompt Template

**Phase 8 prompt for integration-developer agent implementing integration code.**

---

## Integration Developer Prompt

````markdown
Task(
subagent_type: "integration-developer",
description: "Implement {vendor} integration",
prompt: "

## Task: Implement {vendor} Integration

### Implementation Tasks

{Tasks from Phase 7 architecture-plan.md}

### Architecture Reference

{From .claude/.output/integrations/{workflow-id}/architecture-plan.md}

### MANDATORY SKILLS TO READ FIRST

You MUST read these skills before coding:

- developing-with-tdd
- verifying-before-completion
- gateway-integrations (routes to integration skills)
- developing-integrations (LIBRARY): Read('.claude/skill-library/development/integrations/developing-integrations/SKILL.md')
- integrating-with-{vendor} (LIBRARY): Read('.claude/skill-library/development/integrations/integrating-with-{vendor}/SKILL.md')

### P0 MANDATORY CHECKLIST

ALL of these MUST be implemented. Do NOT claim completion without verification.

- [ ] **VMFilter**: Initialize Filter field, call FilterAssets() before Job.Send()
- [ ] **CheckAffiliation**: Implement REAL API query (not stub that returns true)
- [ ] **ValidateCredentials**: First call in Invoke(), fail fast on invalid creds
- [ ] **errgroup Safety**: SetLimit(N) called, loop variables captured with `item := item`
- [ ] **Pagination Safety**: maxPages constant OR check API-provided LastPage
- [ ] **Error Handling**: No `_, _ =` patterns, all errors wrapped with `%w`
- [ ] **File Size**: Each file under 400 lines (split if needed)

### Files to Create

{Specific file paths from architecture plan}

Standard structure:

- `modules/chariot/backend/pkg/integrations/{vendor}/client.go` - API client
- `modules/chariot/backend/pkg/integrations/{vendor}/collector.go` - Asset collection
- `modules/chariot/backend/pkg/integrations/{vendor}/{vendor}.go` - Main integration
- `modules/chariot/backend/pkg/integrations/{vendor}/types.go` - Type definitions
- `modules/chariot/backend/pkg/integrations/{vendor}/*_test.go` - Unit tests

### Implementation Patterns

**VMFilter Pattern:**

```go
type Capability struct {
    Filter *vmfilter.VMFilter
    // ...
}

func (c *Capability) Invoke(ctx context.Context) error {
    // ... get assets ...
    filteredAssets := c.Filter.FilterAssets(assets)
    for _, asset := range filteredAssets {
        // process only filtered assets
    }
}
```
````

**CheckAffiliation Pattern (REAL, not stub):**

```go
func (c *Capability) CheckAffiliation(ctx context.Context, asset string) bool {
    resp, err := c.client.GetAsset(ctx, asset)
    if err != nil {
        return false
    }
    return resp.BelongsToOrg(c.orgID)
}
```

**errgroup Pattern:**

```go
g, ctx := errgroup.WithContext(ctx)
g.SetLimit(10)  // MUST set limit

for _, item := range items {
    item := item  // MUST capture loop variable
    g.Go(func() error {
        return c.processItem(ctx, item)
    })
}
```

### Constraints

- Follow existing patterns from {reference_integration}
- Use existing credential patterns from pkg/secrets
- Proper error wrapping with context
- Structured logging with request IDs
- Write tests alongside implementation

### TDD Requirement

For each function:

1. Write test first (RED)
2. Implement until test passes (GREEN)
3. Refactor if needed (REFACTOR)

### Output Format

{
'status': 'complete',
'tasks_completed': ['T001', 'T002', 'T003'],
'files_modified': [],
'files_created': [
'modules/chariot/backend/pkg/integrations/{vendor}/client.go',
'modules/chariot/backend/pkg/integrations/{vendor}/collector.go',
'modules/chariot/backend/pkg/integrations/{vendor}/{vendor}.go',
'modules/chariot/backend/pkg/integrations/{vendor}/types.go',
'modules/chariot/backend/pkg/integrations/{vendor}/{vendor}_test.go'
],
'p0_compliance': {
'VMFilter': 'IMPLEMENTED - {vendor}.go:45',
'CheckAffiliation': 'IMPLEMENTED - {vendor}.go:78 (queries /api/assets/{id})',
'ValidateCredentials': 'IMPLEMENTED - {vendor}.go:32 (first in Invoke)',
'errgroup': 'IMPLEMENTED - collector.go:56 (SetLimit(10), vars captured)',
'pagination': 'IMPLEMENTED - client.go:89 (maxPages=100)',
'error_handling': 'IMPLEMENTED - all errors wrapped',
'file_size': 'COMPLIANT - all files under 400 lines'
},
'tests_written': {count},
'skills_invoked': ['developing-with-tdd', 'developing-integrations', 'integrating-with-{vendor}', ...]
}

### Verification Before Returning

Run and confirm:

- go build ./... (passes)
- go vet ./... (no issues)
- go test ./... (all pass)

DO NOT claim completion without running verification commands.
"
)

```

---

## Related References

- [Phase 8: Implementation](../phase-8-implementation.md) - Phase context
- [Agent Matrix](../agent-matrix.md) - Agent selection
- [P0 Compliance](../p0-compliance.md) - P0 requirements detail
- [File Scope Boundaries](../file-scope-boundaries.md) - Conflict prevention
```
