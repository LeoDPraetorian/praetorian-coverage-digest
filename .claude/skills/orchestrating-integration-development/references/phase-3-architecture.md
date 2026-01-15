# Phase 3: Architecture

**Purpose**: Design the integration implementation plan with P0 compliance checklist.

## Overview

Phase 3 uses the `integration-lead` agent to create a comprehensive architecture document that serves as the implementation blueprint. The architecture must address all P0 requirements and provide clear guidance for the `integration-developer` agent in Phase 4.

**Agent**: `integration-lead`

## Input Files

| File | Source | Purpose |
|------|--------|---------|
| design.md | Phase 1 | Requirements, auth method, data mapping |
| skill-summary.md | Phase 2 | Vendor-specific API patterns |
| discovery.md | Phase 2 | Codebase patterns and examples |
| file-placement.md | Phase 2 | Target file locations |

## Architecture Components

### 1. Authentication Flow

Document the complete authentication lifecycle:

```markdown
## Authentication Flow

### Credential Retrieval
- Source: Job.Secret
- Fields required: {api_key | client_id, client_secret | token}

### Client Initialization
```go
func (task *Vendor) initClient() error {
    secret, err := task.Job.Secret.Get("api_key")
    if err != nil {
        return fmt.Errorf("getting api key: %w", err)
    }
    task.client = vendor.NewClient(secret)
    return nil
}
```

### Token Refresh (if OAuth2)
- Refresh endpoint: {url}
- Refresh timing: {before expiry | on 401}
- Storage: Job.Secret

### ValidateCredentials Placement
MUST be first statement in Invoke():
```go
func (task *Vendor) Invoke() error {
    if err := task.ValidateCredentials(); err != nil {
        return fmt.Errorf("validating credentials: %w", err)
    }
    // ... enumeration follows
}
```
```

### 2. Pagination Strategy

Document the pagination approach with termination guarantee:

```markdown
## Pagination Strategy

### Pattern Type
{token-based | page-number | cursor}

### Parameters
- Page size: {default, max}
- Pagination field: {nextToken | page | cursor}

### Implementation Pattern
```go
const maxPages = 1000  // Safety limit

for page := 0; page < maxPages; page++ {
    resp, err := task.client.List(ctx, &ListOptions{
        PageToken: nextToken,
        PageSize:  100,
    })
    if err != nil {
        return fmt.Errorf("listing page %d: %w", page, err)
    }

    task.processItems(resp.Items)

    if resp.NextToken == "" {
        break  // Natural termination
    }
    nextToken = resp.NextToken
}

if page >= maxPages {
    slog.Warn("reached max pages limit", "maxPages", maxPages)
}
```

### Termination Conditions
1. Natural: NextToken is empty
2. Safety: maxPages constant reached
3. Error: API returns error
```

### 3. CheckAffiliation Approach

Document how asset ownership is verified:

```markdown
## CheckAffiliation Implementation

### Approach
{API Query | Re-enumerate | CheckAffiliationSimple}

### API Endpoint (if API Query)
- URL: {endpoint}
- Method: {GET | POST}
- Parameters: {asset identifier}

### Implementation
```go
func (task *Vendor) CheckAffiliation(asset model.Asset) (bool, error) {
    // Step 1: Validate credentials (fail fast)
    if err := task.ValidateCredentials(); err != nil {
        return false, fmt.Errorf("validating credentials: %w", err)
    }

    // Step 2: Require identifier
    if asset.{identifier} == "" {
        return false, fmt.Errorf("missing identifier for asset: %s", asset.Key)
    }

    // Step 3: Query external API
    resp, err := task.client.GetAsset(ctx, asset.{identifier})
    if err != nil {
        if isNotFoundError(err) {
            return false, nil  // Asset no longer exists
        }
        return false, fmt.Errorf("checking affiliation: %w", err)
    }

    // Step 4: Verify not deleted
    return resp.ID != "" && resp.DeletedAt == "", nil
}
```

### Known Limitations
- {any edge cases or limitations}
```

### 4. Tabularium Mapping

Document entity transformations:

```markdown
## Tabularium Mapping

### Assets

| Vendor Field | Chariot Field | Transformation |
|--------------|---------------|----------------|
| id | Key | Direct mapping |
| hostname | DNS | Lowercase |
| ip_address | Name | Direct mapping |
| cloud_id | CloudId | Direct mapping |
| tags | Attributes | Key-value pairs |

### Example Transformation
```go
func (task *Vendor) transformAsset(item *VendorAsset) *model.Asset {
    asset := model.NewAsset(item.ID, item.Hostname)
    asset.DNS = strings.ToLower(item.Hostname)
    asset.CloudId = item.CloudID

    for key, value := range item.Tags {
        asset.AddAttribute(key, value)
    }

    return asset
}
```

### Risks (if vulnerability sync)

| Vendor Field | Chariot Field | Transformation |
|--------------|---------------|----------------|
| finding_id | Key | Direct mapping |
| severity | Severity | Map to {critical|high|medium|low|info} |
| cve | CVE | Direct mapping |
| description | Description | Truncate if >4000 chars |
```

### 5. errgroup Concurrency

Document the concurrency strategy:

```markdown
## Concurrency Strategy

### errgroup Configuration
- SetLimit: {10 | 25 | 30 | 100} based on API rate limits
- Rationale: {why this limit}

### Implementation Pattern
```go
group := errgroup.Group{}
group.SetLimit({limit})

for _, item := range items {
    item := item  // CRITICAL: capture loop variable

    group.Go(func() error {
        asset := task.transformAsset(item)

        if task.Filter.Asset(asset) {
            return nil  // Filtered out
        }

        task.Job.Send(asset)
        return nil
    })
}

if err := group.Wait(); err != nil {
    return fmt.Errorf("processing items: %w", err)
}
```

### Why Loop Variable Capture
Without capture, all goroutines reference the same `item` variable, causing race conditions:
```go
// ❌ WRONG - race condition
for _, item := range items {
    group.Go(func() error {
        process(item)  // All goroutines see last item!
    })
}

// ✅ CORRECT - each goroutine has its own copy
for _, item := range items {
    item := item  // Capture
    group.Go(func() error {
        process(item)  // Each goroutine has correct item
    })
}
```
```

### 6. File Size Management

Plan file organization:

```markdown
## File Organization

### Primary File: {vendor}.go
Target: <350 lines
Contains:
- Struct definition
- Invoke() method
- CheckAffiliation() method
- ValidateCredentials() method
- Match() method

### Supporting Files (if needed)

#### {vendor}_types.go
Contains: API response structs, enums
Target: <200 lines

#### {vendor}_client.go
Contains: HTTP client, auth, API methods
Target: <200 lines

#### {vendor}_transform.go
Contains: Data transformation functions
Target: <150 lines

### Split Decision
IF estimated total > 400 lines:
- Split into supporting files
- Keep primary file focused on capability interface
```

### 7. P0 Compliance Checklist

**MANDATORY section in architecture.md:**

```markdown
## P0 Compliance Checklist

| Requirement | Implementation Location | Pattern Reference |
|-------------|------------------------|-------------------|
| VMFilter initialization | {file}:{line range} | crowdstrike.go:45 |
| VMFilter usage before Send | {file}:{line range} | crowdstrike.go:180 |
| CheckAffiliation (not stub) | {file}:{line range} | wiz.go:717 |
| ValidateCredentials first | {file}:{line range} | github.go:73 |
| errgroup SetLimit | {file}:{line range} | crowdstrike.go:162 |
| errgroup loop capture | {file}:{line range} | crowdstrike.go:165 |
| Pagination maxPages | {file}:{line range} | Pattern A |
| Error handling (no _, _) | All files | Verified |
| File size <400 lines | {file}: {estimate} | Split if needed |

### Verification Commands
```bash
# VMFilter
grep -n "Filter.*NewVMFilter\|Filter.*New.*Filter" {file}.go

# CheckAffiliation
grep -A30 "func.*CheckAffiliation" {file}.go | grep -E "http|api|query"

# ValidateCredentials
grep -A5 "func.*Invoke" {file}.go | grep "ValidateCredentials"

# errgroup
grep -A3 "errgroup.Group" {file}.go | grep "SetLimit"

# Error handling
grep -n "_, _.*=" {file}.go  # Should return nothing
```
```

### 8. Frontend Requirements

**MANDATORY section in architecture.md:**

```markdown
## Frontend Requirements

### Needs UI: {YES | NO}

### Reason: {justification}

### If YES:

#### Enum Name
`IntegrationType.{VENDOR_NAME}`

#### Logo Requirements
- Dark mode: {vendor}-dark.svg
- Light mode: {vendor}-light.svg
- Size: 48x48px

#### Configuration Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| apiKey | password | Yes | Vendor API key |
| organizationId | text | No | Optional org filter |

### If NO:
- Reason: {service account only | seed-based | internal only}
- Configuration: {where/how configured}
```

## Agent Prompt Requirements

When spawning `integration-lead`, include:

```markdown
Task: Design integration architecture for {vendor}

INPUT FILES (read all before designing):
- design.md: Requirements from brainstorming
- skill-summary.md: Vendor-specific API patterns
- discovery.md: Codebase patterns from existing integrations
- file-placement.md: Target file locations

OUTPUT: architecture.md with ALL sections:
1. Authentication Flow
2. Pagination Strategy
3. CheckAffiliation Approach
4. Tabularium Mapping
5. errgroup Concurrency
6. File Size Management
7. P0 Compliance Checklist (MANDATORY)
8. Frontend Requirements (MANDATORY)

MANDATORY SKILLS:
- gateway-integrations: Integration patterns and P0 requirements
- gateway-backend: Go backend patterns
- writing-plans: Implementation plan structure
- persisting-agent-outputs: Output file format

OUTPUT_DIRECTORY: {from Phase 0}

COMPLIANCE: Document invoked skills in output metadata.
```

## Human Checkpoint

**🛑 Gate**: Architecture approval before implementation

Present architecture.md summary to user:

```markdown
Phase 3 Architecture Review:

Integration: {vendor}
Type: {integration_type}
Files to create: {count}

P0 Requirements Addressed:
✅ VMFilter: {approach}
✅ CheckAffiliation: {approach}
✅ ValidateCredentials: First in Invoke()
✅ errgroup: SetLimit({n}) with capture
✅ Pagination: maxPages={n} constant
✅ Error handling: All errors checked
✅ File size: {estimate} lines ({single file | split})

Frontend: {YES (enum, logos, hook) | NO (reason)}

Proceed to Phase 4 (Implementation)?
```

Use AskUserQuestion with options:
- **Approve** - Proceed to Phase 4
- **Revise** - Return to architect with feedback
- **Cancel** - Stop workflow

## Gate Checklist

Phase 3 is complete when:

- [ ] `integration-lead` agent spawned with correct prompt template
- [ ] `architecture.md` created with all 8 required sections
- [ ] P0 Compliance Checklist pre-filled with planned implementation locations
- [ ] Frontend Requirements section completed (YES/NO with justification)
- [ ] Auth flow documented with code examples
- [ ] Pagination strategy documented with maxPages constant
- [ ] CheckAffiliation approach documented (not stub)
- [ ] Tabularium mapping documented with examples
- [ ] errgroup pattern documented with SetLimit value
- [ ] File organization planned (<400 lines per file)
- [ ] Human approved via AskUserQuestion
- [ ] MANIFEST.yaml updated with architecture.md
- [ ] metadata.json phase-3 status updated to 'complete'

## Common Issues

### Issue: Missing API Documentation

**Symptom**: Can't determine pagination or rate limit patterns

**Solution**:
- Document uncertainty in architecture.md
- Use conservative defaults (maxPages=1000, SetLimit=10)
- Note for testing verification in Phase 6

### Issue: No CheckAffiliation Endpoint

**Symptom**: API doesn't support individual asset lookup

**Solution**:
- Document decision to use CheckAffiliationSimple
- Note performance impact (full re-enumeration)
- Consider caching strategy if high volume

### Issue: Complex Data Mapping

**Symptom**: Vendor data doesn't map cleanly to Chariot models

**Solution**:
- Document transformation logic in detail
- Create separate transform file if complex
- Note edge cases for testing

## Related Phases

- **Phase 2 (Discovery)**: Provides input files
- **Phase 4 (Implementation)**: Uses architecture.md as blueprint
- **Phase 4.5 (P0 Validation)**: Validates against P0 Checklist
- **Phase 7 (Frontend)**: Uses Frontend Requirements section

## Related Skills

- `writing-plans` - Implementation plan structure
- `gateway-integrations` - Integration patterns
- `gateway-backend` - Go backend patterns
- `developing-integrations` - P0 requirements definition
