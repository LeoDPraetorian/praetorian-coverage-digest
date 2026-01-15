# Phase 2: Skill Check + Codebase Discovery

**Purpose**: Check for existing vendor-specific skill and discover codebase patterns for implementation guidance.

## Overview

Phase 2 is a two-step process that ensures developers have both vendor-specific API knowledge (via skills) and codebase pattern examples (via discovery) before designing architecture.

**Two-step process:**
1. **Skill Check**: Verify or create `integrating-with-{vendor}` skill
2. **Codebase Discovery**: Find existing integration patterns using `discovering-codebases-for-planning`

## Step 1: Skill Check

### Check for Existing Skill

**Location to check:**
```
.claude/skill-library/development/integrations/integrating-with-{vendor}/
```

**Search pattern:**
```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
ls -la "$ROOT/.claude/skill-library/development/integrations/" | grep -i "{vendor}"
```

### IF Skill EXISTS

1. Read SKILL.md and all references/
2. Extract key patterns:
   - Authentication flow and initialization
   - Rate limit headers and backoff strategy
   - Pagination parameter names and loop pattern
   - Data mapping examples
   - Known gotchas and edge cases
3. Create `skill-summary.md` with extracted patterns

**skill-summary.md structure:**

```markdown
# Skill Summary: integrating-with-{vendor}

## Source
Skill location: .claude/skill-library/development/integrations/integrating-with-{vendor}/

## Authentication
- Method: {from skill}
- Initialization pattern: {code example from skill}
- Token refresh: {if applicable}

## Rate Limiting
- Limits: {from skill}
- Headers to check: {X-RateLimit-*, Retry-After}
- Backoff strategy: {exponential, fixed}

## Pagination
- Type: {token | page | cursor}
- Parameters: {from skill}
- Termination condition: {from skill}

## Data Mapping
| Vendor Entity | Chariot Model | Notes |
|---------------|---------------|-------|
| {from skill} | | |

## Known Issues
- {from skill references/}

## Code Examples
{extract key code snippets from skill}
```

### IF Skill DOES NOT EXIST

**🛑 Human Checkpoint**: Confirm skill creation

```markdown
No existing skill found for {vendor}.

Create new `integrating-with-{vendor}` skill?
- This will invoke skill-manager to create the skill
- Skill will be populated with information from Phase 1 design.md
- Estimated time: 5-10 minutes
```

Use AskUserQuestion with options:
- **Yes, create skill** (Recommended) - Invoke skill-manager
- **No, proceed without** - Continue with discovery only (not recommended)

**IF approved:**

1. Read vendor skill template:
   ```
   Read("references/vendor-skill-template.md")
   ```

2. Fill template with Phase 1 information:
   - Vendor name and API URL from design.md
   - Auth method from design.md
   - Rate limits (if known) from design.md
   - Pagination pattern from design.md

3. Invoke skill-manager:
   ```
   Skill('skill-manager', args='create integrating-with-{vendor}')
   ```

4. Wait for skill creation to complete

5. Read newly created skill and create `skill-summary.md`

## Step 2: Codebase Discovery

**REQUIRED SUB-SKILL**: `discovering-codebases-for-planning`

### Purpose

Find existing integration implementations to serve as patterns for:
- VMFilter initialization and usage
- CheckAffiliation implementation approaches
- ValidateCredentials placement
- errgroup concurrency patterns
- Pagination loop structures
- Error handling patterns
- File organization (single vs split files)

### Discovery Targets

| Pattern | Search Location | What to Find |
|---------|-----------------|--------------|
| VMFilter | `modules/chariot/backend/pkg/tasks/integrations/` | Filter initialization patterns |
| CheckAffiliation | Same | Non-stub implementations |
| Pagination | Same | Loop structures, break conditions |
| errgroup | Same | SetLimit values, loop capture |
| File structure | Same | Split vs monolithic files |

### Invoke Discovery Skill

```
Read(".claude/skill-library/discovery/discovering-codebases-for-planning/SKILL.md")
```

The skill spawns 1-10 Explore agents based on feature scope. For integration development:
- Scope: Medium (backend integration patterns)
- Expected agents: 2-4 Explore agents

### Discovery Outputs

**discovery.md** - Pattern analysis results:

```markdown
# Codebase Discovery: Integration Patterns

## VMFilter Patterns Found

### Pattern 1: CrowdStrike (crowdstrike.go)
```go
Filter: filter.NewVMFilter(baseCapability.AWS, baseCapability.Collectors)
```
Usage: Called before every Job.Send()

### Pattern 2: Wiz (wiz.go)
```go
Filter: filter.NewWizFilter(baseCapability.AWS, baseCapability.Collectors)
```
Custom filter for Wiz-specific logic.

## CheckAffiliation Implementations

### Gold Standard: Wiz (wiz.go:717-783)
- Validates credentials first
- Queries GraphQL API for entity
- Checks deletedAt field
- Returns affiliated=true only if entity exists and not deleted

### Simple Pattern: GitHub (github.go)
- Uses BaseCapability.CheckAffiliationSimple
- Re-enumerates all assets
- Checks if asset in returned set

## Pagination Patterns

### Token-based (most common)
```go
for resp.NextToken != "" {
    // fetch next page
}
```

### Page-number (GitHub)
```go
for i := 2; i <= resp.LastPage; i++ {
    // parallel page fetching
}
```

## errgroup Patterns

### Standard Pattern
```go
group := errgroup.Group{}
group.SetLimit(10)

for _, item := range items {
    item := item  // capture loop variable
    group.Go(func() error {
        // process item
        return nil
    })
}

if err := group.Wait(); err != nil {
    return fmt.Errorf("processing items: %w", err)
}
```

## File Size Reference

| Integration | Lines | Structure |
|-------------|-------|-----------|
| GitHub | 380 | Single file |
| Wiz | 914 | Should split |
| CrowdStrike | 569 | Should split |
| Okta | 285 | Single file |

Recommendation: Target <400 lines per file
```

**file-placement.md** - Where to create new files:

```markdown
# File Placement Guide: {vendor} Integration

## Primary Handler File
Location: `modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go`

## Supporting Files (if needed)
- `{vendor}_types.go` - API response structs
- `{vendor}_client.go` - HTTP client, auth methods
- `{vendor}_transform.go` - Data transformation functions

## Test Files
- `{vendor}_test.go` - Unit tests
- `match_test.go` - Match() method tests

## Registration
File: `modules/chariot/backend/pkg/tasks/integrations/integrations.go`
Add: Import and register handler

## Frontend (if Phase 7 needed)
- Enum: `modules/chariot/ui/src/types.ts`
- Logos: `modules/chariot/ui/public/integrations/{vendor}-{dark|light}.svg`
- Hook: `modules/chariot/ui/src/hooks/useIntegration.tsx`
```

**discovery-summary.json** - Structured results:

```json
{
  "discovery_timestamp": "2026-01-14T15:30:00Z",
  "patterns_found": {
    "vmfilter": ["crowdstrike", "wiz", "tenable"],
    "checkaffiliation_real": ["wiz", "github"],
    "checkaffiliation_stub": ["okta", "azure"],
    "pagination_token": ["crowdstrike", "tenable"],
    "pagination_page": ["github"],
    "errgroup_patterns": 12
  },
  "recommended_patterns": {
    "vmfilter": "crowdstrike.go:45-52",
    "checkaffiliation": "wiz.go:717-783",
    "pagination": "github.go:180-220",
    "errgroup": "crowdstrike.go:162-232"
  },
  "file_placement": {
    "handler": "modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go",
    "registration": "modules/chariot/backend/pkg/tasks/integrations/integrations.go"
  }
}
```

## Gate Checklist

Phase 2 is complete when:

- [ ] Checked for `integrating-with-{vendor}` skill existence
- [ ] IF skill exists: `skill-summary.md` created with extracted patterns
- [ ] IF skill missing: Human checkpoint completed
- [ ] IF skill missing + approved: skill-manager invoked and skill created
- [ ] IF skill missing + approved: `skill-summary.md` created from new skill
- [ ] `discovering-codebases-for-planning` skill invoked
- [ ] `discovery.md` created with pattern analysis
- [ ] `file-placement.md` created with target paths
- [ ] `discovery-summary.json` created with structured results
- [ ] MANIFEST.yaml updated with all new files
- [ ] metadata.json phase-2 status updated to 'complete'

## Common Issues

### Issue: Skill Creation Times Out

**Symptom**: skill-manager takes >10 minutes

**Solution**:
1. Check if skill was partially created
2. If partial: complete manually or re-run
3. If failed: proceed without skill, document in discovery.md

### Issue: No Similar Integrations Found

**Symptom**: Discovery returns few patterns

**Solution**:
- Expand search to all integrations (not just similar vendors)
- Focus on P0 pattern compliance over vendor similarity
- Use CrowdStrike and Wiz as gold standard references regardless of vendor type

### Issue: Conflicting Patterns

**Symptom**: Different integrations use different approaches

**Solution**:
- Document all variants in discovery.md
- Note which is most recent (prefer newer patterns)
- Flag for architecture decision in Phase 3

## Related Phases

- **Phase 1 (Brainstorming)**: Provides design.md input
- **Phase 3 (Architecture)**: Consumes skill-summary.md and discovery.md
- **Phase 4 (Implementation)**: Uses file-placement.md for file creation

## Related Skills

- `discovering-codebases-for-planning` - Parallel codebase discovery
- `skill-manager` - Skill creation workflow
- `discovering-reusable-code` - Pattern search methodology
