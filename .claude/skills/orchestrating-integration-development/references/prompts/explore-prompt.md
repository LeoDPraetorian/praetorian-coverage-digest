# Explore Agent Prompt Template (Phase 2)

**Agent**: Explore (native, very thorough mode)
**Phase**: 2 (Skill Check + Discovery)
**Purpose**: Find existing integration patterns in codebase

## Prompt Template

```markdown
Task: Discover integration patterns for {vendor} integration development

You are in Phase 2 of integration development. Your goal is to find existing integration implementations that serve as patterns for VMFilter, CheckAffiliation, ValidateCredentials, errgroup, pagination, and error handling.

## Research Focus

Search for patterns in existing integrations at:
`modules/chariot/backend/pkg/tasks/integrations/*/`

## Patterns to Find

### 1. VMFilter Patterns
- How VMFilter is initialized in struct
- Where Filter.Asset() is called
- Pattern: `Filter: filter.NewVMFilter(...)`
- Example integrations to check: CrowdStrike, Wiz, Tenable

### 2. CheckAffiliation Implementations
- PRIORITY: Find non-stub implementations
- Pattern: Queries external API to verify asset ownership
- Anti-pattern: `return true, nil` without API call
- Gold standard: Wiz (wiz.go), GitHub (github.go)

### 3. ValidateCredentials Placement
- Pattern: First statement in Invoke() method
- Verifies credentials work before enumeration
- Example: GitHub (github.go:73-107)

### 4. errgroup Concurrency
- Pattern: `group.SetLimit()` called
- Pattern: Loop variable capture with `item := item`
- SetLimit values by use case (10, 25, 30, 100)

### 5. Pagination Patterns
- Token-based: `for nextToken != ""`
- Page-based: `for page <= resp.LastPage`
- Safety: maxPages constant (rarely implemented, but look for it)

### 6. Error Handling
- Pattern: All errors checked (no `_, _ =`)
- Pattern: Errors wrapped with context using `%w`

### 7. File Organization
- Single file vs. split files
- When integrations split into types, client, transform
- File size distribution

## Output Format

Create discovery.md with this structure:

# Codebase Discovery: Integration Patterns

## VMFilter Patterns

### Pattern: CrowdStrike
File: modules/chariot/backend/pkg/tasks/integrations/crowdstrike/crowdstrike.go
Initialization: `Filter: filter.NewVMFilter(baseCapability.AWS, baseCapability.Collectors)`
Usage: Line ~180, called before Job.Send()

## CheckAffiliation Implementations

### Gold Standard: Wiz
File: modules/chariot/backend/pkg/tasks/integrations/wiz/wiz.go:717-783
- Validates credentials first
- Queries GraphQL API
- Checks deletedAt field
- Returns affiliated only if exists and not deleted

### Simple: GitHub
Uses BaseCapability.CheckAffiliationSimple (re-enumerates)

## Pagination Patterns

{findings for each pattern type}

## File Size Distribution

| Integration | Lines | Split? |
|-------------|-------|--------|
| GitHub | 380 | No |
| Wiz | 914 | Should split |
| CrowdStrike | 569 | Should split |

## Recommended Patterns for {vendor}

Based on similarities to {most similar integration}:
- Use {pattern} for VMFilter
- Use {pattern} for CheckAffiliation
- Use {pattern} for pagination

MANDATORY SKILLS (invoke before completing):
- discovering-reusable-code: Pattern search methodology
- persisting-agent-outputs: Output file format

OUTPUT_DIRECTORY: {provided by orchestrator}

OUTPUT FILE: discovery.md

Also create file-placement.md with:
- Target path for handler file
- Supporting file paths (if split needed)
- Registration file location

COMPLIANCE: Document invoked skills in output metadata.
```
