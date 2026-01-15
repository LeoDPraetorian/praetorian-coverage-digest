# Phase 4.5: P0 Compliance Verification

**Purpose**: Verify ALL P0 requirements before code review to prevent rework.

**When**: After Phase 4 (Implementation) completes, before Phase 5 (Review) begins.

**Duration**: 5-10 minutes (automated verification + human review if violations)

## Overview

Phase 4.5 is UNIQUE to integration development orchestration. It acts as a **blocking gate** that validates 7 mandatory P0 requirements before code enters review. This prevents:
- Wasted reviewer time on non-compliant code
- Multiple review cycles fixing the same P0 violations
- Late-stage architectural rework

**Blocking Behavior**:
- ✅ **PASS**: All 7 requirements verified → proceed to Phase 5 (Review)
- ❌ **FAIL**: Any requirement fails → 🛑 **Human Checkpoint** → must fix violations before proceeding

## The 7 P0 Requirements

### 1. VMFilter Initialization and Usage

**Requirement**: VMFilter must be initialized in struct and called before Job.Send()

**Verification**:
```bash
# Check initialization
grep -n "Filter:.*NewVMFilter\|Filter:.*NewCloudModuleFilter\|Filter:.*NewWizFilter" {integration-file}.go

# Check usage before Job.Send()
grep -B5 "Job.Send" {integration-file}.go | grep -A5 "Filter.Asset"
```

**Gold Standard** (CrowdStrike):
```go
// Initialization
Filter: filter.NewVMFilter(baseCapability.AWS, baseCapability.Collectors)

// Usage
if task.Filter.Asset(&asset) {
    continue  // Skip if filtered OUT
}
task.Job.Send(&asset)  // Only send if accepted
```

**Critical Semantics**: `Filter.Asset()` returns `true` to REJECT (filter out), `false` to ACCEPT.

**Compliance Check**:
- ✅ PASS: VMFilter initialized AND used before every Job.Send()
- ❌ FAIL: Missing initialization OR assets sent without filter check
- N/A: Integration doesn't discover VM assets (acceptable for SCM integrations)

### 2. CheckAffiliation Implementation

**Requirement**: CheckAffiliation MUST query external API to verify asset ownership (not stub)

**Verification**:
```bash
# Check if CheckAffiliation is overridden
grep -n "func.*CheckAffiliation" {integration-file}.go

# If overridden, verify it makes API call (not returning true, nil)
grep -A30 "func.*CheckAffiliation" {integration-file}.go | grep -E "http|graphql|api|query"
```

**Gold Standard** (Wiz - wiz.go:717-783):
```go
func (task *Wiz) CheckAffiliation(asset model.Asset) (bool, error) {
    // Step 1: Validate credentials
    if err := task.ValidateCredentials(); err != nil {
        return false, fmt.Errorf("failed to authenticate: %w", err)
    }

    // Step 2: Require asset identifier
    if asset.CloudId == "" {
        return false, fmt.Errorf("no cloud ID found for asset: %s", asset.Key)
    }

    // Step 3: Query external API (GraphQL)
    affiliationQuery := WizQuery{
        Query: `query SearchForEntity($providerUniqueId: String!) {
            graphEntityByProviderUniqueId(providerUniqueId: $providerUniqueId) {
                id
                deletedAt
            }
        }`,
        Variables: map[string]any{"providerUniqueId": asset.CloudId},
    }

    // Make actual API call
    resp, err := task.request(affiliationQuery)
    if err != nil {
        return false, fmt.Errorf("querying affiliation: %w", err)
    }

    // Step 4: Check existence and not deleted
    affiliated := graphEntity.ID != "" && graphEntity.DeletedAt == ""
    return affiliated, nil
}
```

**Compliance Check**:
- ✅ PASS: CheckAffiliation makes external API call to verify asset
- ⚠️ ACCEPTABLE: Uses BaseCapability.CheckAffiliationSimple (re-enumerates, not optimal but acceptable)
- ❌ **CRITICAL FAIL**: Stub returning `true, nil` without API query
- ❌ **CRITICAL FAIL**: No override (uses base class default returning error)

**Known Issue**: 98% of integrations (41/42) fail this requirement. This is the MOST COMMON P0 violation.

### 3. ValidateCredentials Placement

**Requirement**: ValidateCredentials MUST be called as FIRST statement in Invoke() before enumeration

**Verification**:
```bash
# Find Invoke() method
grep -n "func.*Invoke" {integration-file}.go

# Check first statement is ValidateCredentials
grep -A5 "func.*Invoke" {integration-file}.go | grep "ValidateCredentials"
```

**Gold Standard** (GitHub - github.go:73-107):
```go
func (task *Github) Invoke() error {
    // MUST be first statement (fail fast)
    if err := task.ValidateCredentials(); err != nil {
        return fmt.Errorf("failed to validate credentials: %w", err)
    }

    // Enumeration begins AFTER validation
    return task.enumerate()
}

func (task *Github) ValidateCredentials() error {
    token, err := githublib.Token(task.Job)
    if err != nil {
        return err
    }

    task.client = github.NewClient(base).WithAuthToken(token)

    // Lightweight API call to test credentials
    _, resp, err := task.client.Organizations.Get(context.Background(), task.name)
    if err != nil {
        if resp != nil && resp.StatusCode == 404 {
            return fmt.Errorf("organization '%s' not found", task.name)
        }
        return fmt.Errorf("authentication failed")
    }
    return nil
}
```

**Compliance Check**:
- ✅ PASS: ValidateCredentials called as first statement in Invoke()
- ❌ FAIL: ValidateCredentials called mid-enumeration or not at all
- ❌ FAIL: Credentials validated inline without dedicated method

### 4. errgroup Safety

**Requirement**: All errgroup usage must call SetLimit() and capture loop variables

**Verification**:
```bash
# Check SetLimit() called
grep -A3 "errgroup.Group" {integration-file}.go | grep "SetLimit"

# Check loop variable capture
grep -B2 -A10 "group.Go\|g.Go" {integration-file}.go | grep -E "^\s+\w+ := \w+\s+//.*capture"
```

**Gold Standard** (CrowdStrike - crowdstrike.go:162-232):
```go
group := errgroup.Group{}
group.SetLimit(10)  // REQUIRED - prevents goroutine explosion

for _, website := range websites {
    website := website  // CRITICAL - capture loop variable

    group.Go(func() error {
        asset := model.NewAsset(website.Host, website.Host)
        task.Job.Send(&asset)
        return nil
    })
}

if err := group.Wait(); err != nil {
    return fmt.Errorf("processing websites: %w", err)
}
```

**SetLimit Values by Use Case**:
- API-heavy integrations (CrowdStrike, Wiz, Tenable): `SetLimit(10)`
- Rate-limited APIs (GitHub, GitLab): `SetLimit(25)`
- File I/O (Nessus, InsightVM): `SetLimit(30)`
- Lightweight operations (Okta, PingOne): `SetLimit(100)`

**Compliance Check**:
- ✅ PASS: SetLimit() called AND loop variables captured
- ❌ FAIL: Missing SetLimit() (unbounded concurrency)
- ❌ FAIL: Loop variable NOT captured (race condition)

### 5. Pagination Safety

**Requirement**: Paginated endpoints MUST have termination guarantee (maxPages constant OR API-provided limit)

**Verification**:
```bash
# Check for hardcoded maxPages constant
grep -n "const maxPages" {integration-file}.go

# Check for pagination loops with break conditions
grep -A10 "for.*page\|for.*offset" {integration-file}.go | grep -E "break|LastPage|hasMore"
```

**Pattern A: Hardcoded maxPages** (RECOMMENDED but rarely implemented):
```go
const maxPages = 1000

func (task *Integration) enumerate() error {
    for page := 0; page < maxPages; page++ {
        resp, err := task.client.List(page)
        if err != nil {
            return fmt.Errorf("listing page %d: %w", page, err)
        }

        task.processItems(resp.Items)

        if resp.NextToken == "" {
            break  // Natural termination
        }
    }

    if page >= maxPages {
        slog.Warn("reached max pages limit", "maxPages", maxPages)
    }

    return nil
}
```

**Pattern B: API-Provided Total Pages** (ACTUAL pattern in use):
```go
// GitHub pattern - API provides authoritative count
repos, resp, err := task.client.Repositories.List(ctx, org, opts)
if err != nil {
    return err
}

// resp.LastPage provided by API
for i := 2; i <= resp.LastPage; i++ {
    page := i  // Capture loop variable
    g.Go(func() error {
        return task.fetchPage(page)
    })
}
```

**Pattern C: Explicit hasMore Flag**:
```go
const limit = 100

for offset := 0; ; offset += limit {
    entities, hasMore, err := task.Client.GetIssueEntities(offset, limit)
    if err != nil {
        return err
    }

    task.processEntities(entities)

    if !hasMore {
        break  // Explicit API signal
    }
}
```

**Compliance Check**:
- ✅ PASS: Hardcoded maxPages constant with break condition
- ✅ ACCEPTABLE: API-provided limit (resp.LastPage, hasMore flag)
- ❌ FAIL: Infinite loop (`for currentURL != ""` without maxPages safeguard)

**Documentation-Practice Gap**: P0 requirement specifies maxPages constant, but 0/44 integrations implement it. All use API-provided limits.

### 6. Error Handling

**Requirement**: No errors silently ignored (no `_, _ =` patterns), all errors wrapped with context

**Verification**:
```bash
# Find ignored errors
grep -n "_, _.*=" {integration-file}.go

# Check error wrapping uses %w
grep -n "fmt.Errorf" {integration-file}.go | grep -v "%w"
```

**Common Violations**:

```go
// ❌ VIOLATION - Error ignored
payload, _ := json.Marshal(reqBody)
resp, err := api.Request(url, payload, ...)

// ✅ CORRECT - Error checked
payload, err := json.Marshal(reqBody)
if err != nil {
    return fmt.Errorf("marshaling request body: %w", err)
}
resp, err := api.Request(url, payload, ...)
```

**Error Wrapping**:
```go
// ❌ WRONG - Loses error chain
return err

// ✅ RIGHT - Preserves chain and adds context
return fmt.Errorf("fetching assets from page %d: %w", page, err)
```

**Compliance Check**:
- ✅ PASS: All errors checked, all errors wrapped with %w
- ❌ FAIL: Any `_, _ =` patterns found
- ❌ FAIL: Errors returned without context wrapping

**Known Violations**: 17 instances across 6 integrations (Wiz, Okta, Xpanse, Tenable, Azure, GCP) - mostly json.Marshal errors.

### 7. File Size

**Requirement**: Integration files MUST be under 400 lines OR split into multiple files

**Verification**:
```bash
wc -l {integration-file}.go
```

**400-Line Limit Rule**:
- Under 350 lines: ✅ Safe, no action needed
- 350-400 lines: ⚠️ Caution, consider splitting
- 400-500 lines: ❌ Warning, should split
- 500+ lines: 🚨 CRITICAL, must split immediately

**Split File Pattern**:
```
vendor/
├── vendor.go              (~250 lines) - Main struct, Invoke(), CheckAffiliation()
├── vendor_types.go        (~200 lines) - API response structs, enums
├── vendor_client.go       (~150 lines) - HTTP client, auth, API methods
├── vendor_transform.go    (~100 lines) - Asset/Risk transformations
├── vendor_test.go         - Tests
└── match_test.go          - Match() tests
```

**Compliance Check**:
- ✅ PASS: Under 400 lines
- ✅ ACCEPTABLE: Over 400 lines but split into multiple files with clear responsibilities
- ❌ FAIL: Single file over 400 lines without splitting

**Top Violations**: Wiz (914 lines), Bitbucket (610 lines), CrowdStrike (569 lines)

## Verification Process

### Step 1: Invoke validating-integrations Skill

```markdown
Invoke the validating-integrations library skill to perform automated verification.

Read(".claude/skill-library/development/integrations/validating-integrations/SKILL.md")
```

### Step 2: Generate P0 Compliance Report

The skill produces a structured report:

```markdown
# P0 Compliance Report: {vendor-name}

**Status**: COMPLIANT | NON-COMPLIANT
**Violations**: {count}

## Requirements Summary

| Requirement | Status | Evidence |
|------------|--------|----------|
| VMFilter | ✅ | vendor.go:45 (initialized), vendor.go:123 (used before Job.Send()) |
| CheckAffiliation | ❌ | vendor.go:234 (stub returning true, nil without API call) **CRITICAL** |
| ValidateCredentials | ✅ | vendor.go:89 (first statement in Invoke()) |
| errgroup Safety | ✅ | vendor.go:156 (SetLimit(10)), vendor.go:160 (loop variable captured) |
| Error Handling | ❌ | vendor.go:267 (json.Marshal error ignored with _, _) |
| Pagination Safety | ✅ | vendor.go:189 (uses API-provided resp.LastPage) |
| File Size | ⚠️ | 478 lines (exceeds 400 line limit, recommend splitting) |

## Violations Details

### CRITICAL: CheckAffiliation Stub (vendor.go:234)

Current implementation returns true without querying external API:
\`\`\`go
func (task *Vendor) CheckAffiliation(asset model.Asset) (bool, error) {
    return true, nil  // STUB - does not verify ownership
}
\`\`\`

**Required Fix**: Implement real API query following Wiz pattern (wiz.go:717-783).

### Error Handling (vendor.go:267)

JSON marshaling error silently ignored:
\`\`\`go
payload, _ := json.Marshal(reqBody)  // ERROR IGNORED
\`\`\`

**Required Fix**: Check error and wrap with context.
```

### Step 3: Human Checkpoint Decision

**IF violations found**:
- Output: `p0-compliance-review.md`
- 🛑 **Human Checkpoint**: Use AskUserQuestion

```markdown
P0 Compliance Verification found {count} violations.

**Critical**: CheckAffiliation stub (does not query external API)
**Error**: JSON marshaling error ignored at vendor.go:267
**Warning**: File size 478 lines (exceeds 400 line limit)

Options:
1. Fix violations now (Recommended) - I will guide you through fixes
2. Proceed anyway with violations documented - Code review will likely reject
3. Review violations and decide - Show me details of each violation
```

**IF no violations**:
- Mark Phase 4.5 complete
- Proceed automatically to Phase 5 (Review)
- No human checkpoint needed

## Output

**File**: `p0-compliance-review.md`

**Location**: `.claude/.output/integrations/{timestamp}-{vendor}/p0-compliance-review.md`

**Content**:
- Compliance status (COMPLIANT/NON-COMPLIANT)
- Requirements summary table
- Violation details with file locations and fix recommendations
- Evidence for passing requirements

## Integration with Review Phase

Phase 5 (Review) receives the P0 compliance report:
- **backend-reviewer** validates implementation against architecture AND P0 requirements
- P0 violations are BLOCKING issues (not suggestions)
- If P0 report shows violations, reviewer knows to expect fixes

## Common Rationalizations

**"CheckAffiliation stub is fine, we'll implement it later"**
→ WRONG. Stub causes false positives in production (shows assets that don't exist or were deleted). Must implement real API query before PR.

**"File is 478 lines but splitting would be premature"**
→ WRONG. 400-line limit prevents monolithic files. Split now using vendor_{types,client,transform}.go pattern.

**"maxPages constant isn't needed, API provides LastPage"**
→ ACCEPTABLE. API-provided limits are acceptable alternatives to hardcoded maxPages. Document which pattern is used.

**"JSON marshaling never fails, safe to ignore"**
→ WRONG. json.Marshal CAN fail (cyclic references, invalid types). Must check error.

## Related Skills

- `validating-integrations` - Automated P0 verification (library skill)
- `developing-integrations` - P0 requirements definition
- `testing-integrations` - P0 requirement testing patterns
