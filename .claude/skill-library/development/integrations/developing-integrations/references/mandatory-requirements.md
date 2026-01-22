# Mandatory Requirements (P0 - BLOCKING)

**Every Chariot integration MUST implement these requirements before PR submission. Violations are blocking issues.**

---

## Critical Integration Patterns

These 6 patterns are REQUIRED for integrations to work at runtime. Without them, integrations compile successfully but fail during execution:

### 1. BaseCapability Embedding

Every integration struct MUST embed `base.BaseCapability`:

```go
type IntegrationTask struct {
    Job    model.Job
    Asset  model.Integration  // NOTE: model.Integration, NOT model.Asset
    Filter model.Filter
    base.BaseCapability       // REQUIRED - provides GetClient(), AWS, Collectors
}
```

**Why Required**: BaseCapability provides HTTP client, AWS clients, and collector registry. Without embedding, integration has no access to these critical capabilities.

### 2. init() Registration

Every integration file MUST include init() function that registers the capability:

```go
func init() {
    registries.RegisterChariotCapability(&VendorName{}, NewVendorName)
}
```

**Why Required**: Without init() registration, the capability registry never discovers the integration. It compiles but is never executed.

**Common Error**: `capability not found for class 'vendorname'`

### 3. Integration() Method

Every integration MUST implement `Integration()` returning `true`:

```go
func (t *VendorName) Integration() bool { return true }
```

**Why Required**: Distinguishes integrations from regular capabilities. System behavior differs for integrations (credential storage, UI display, scheduling).

### 4. Match() Method

Every integration MUST implement `Match()` to validate asset class:

```go
func (t *VendorName) Match() error {
    if !t.Asset.IsClass("vendorname") {
        return fmt.Errorf("expected class 'vendorname', got '%s'", t.Asset.Class)
    }
    return nil
}
```

**Why Required**: Prevents integration from running on wrong asset types. Without Match(), integration may execute on incompatible assets causing runtime errors.

### 5. Constructor Pattern

Constructor MUST accept `*model.Integration` pointer and use `base.NewBaseCapability`:

```go
func NewVendorName(job model.Job, asset *model.Integration, opts ...base.Option) model.Capability {
    opts = append(opts, base.WithStatic())  // For static IP compliance
    baseCapability := base.NewBaseCapability(job, opts...)
    return &VendorName{
        Job:            job,
        Asset:          *asset,  // NOTE: Dereference pointer
        Filter:         filter.NewVMFilter(baseCapability.AWS, baseCapability.Collectors),
        BaseCapability: baseCapability,
    }
}
```

**Why Required**: Proper initialization of base capability and functional options. Static IP compliance requires `base.WithStatic()` option.

### 6. Type Distinction: model.Integration vs model.Asset

Critical type distinction:

- Constructor parameter: `*model.Integration` (pointer)
- Struct field: `model.Integration` (value, dereferenced in constructor)

```go
// Constructor signature
func NewVendorName(job model.Job, asset *model.Integration, ...) model.Capability

// Struct field
type VendorName struct {
    Asset model.Integration  // NOT model.Asset, NOT *model.Integration
}

// Constructor body
return &VendorName{
    Asset: *asset,  // Dereference the pointer
}
```

**Why Required**: `model.Integration` extends `model.Asset` with integration-specific fields (credentials, configuration). Using `model.Asset` causes compilation errors or missing credential access.

**See [Integration Skeleton](integration-skeleton.md) for complete working template with all 6 patterns.**

---

## 7. VMFilter (REQUIRED)

**Purpose**: Filter assets and risks by username to enforce multi-tenancy boundaries.

**Requirements**:

1. Initialize VMFilter in struct:

```go
type IntegrationTask struct {
    Job    model.Job
    Filter filter.VMFilter // REQUIRED
    // ... other fields
}

func (t *IntegrationTask) Init(job model.Job) error {
    t.Job = job
    t.Filter = filter.NewVMFilter(job.Username) // REQUIRED
    return nil
}
```

2. Call `Filter.Asset(&asset)` BEFORE `Job.Send(&asset)`:

```go
// WRONG - sends unfiltered asset
task.Job.Send(&asset)

// RIGHT - filters then sends
task.Filter.Asset(&asset)
task.Job.Send(&asset)
```

3. Call `Filter.Risk(&risk)` BEFORE `Job.Send(&risk)`:

```go
// WRONG - sends unfiltered risk
task.Job.Send(&risk)

// RIGHT - filters then sends
task.Filter.Risk(&risk)
task.Job.Send(&risk)
```

**Violations Found**:

- DigitalOcean integration - missing VMFilter entirely
- GitHub integration - missing VMFilter entirely
- GitLab integration - missing VMFilter entirely
- Cloudflare integration - missing VMFilter entirely

**Why This Matters**: Without VMFilter, users can see assets/risks from other tenants, violating security boundaries.

---

## 2. CheckAffiliation (REQUIRED)

**Purpose**: Verify asset ownership using one of the approved patterns. Prevents false positives and validates integration credentials still have access to assets.

**Requirements**:

You **MUST** verify asset affiliation using one of the approved patterns (Pattern A/B/C). Stub implementations returning `true` without verification are **NOT acceptable**.

See [checkaffiliation-patterns.md](checkaffiliation-patterns.md) for the complete decision tree, but here's a quick summary:

### Pattern A - Direct Ownership Query (PREFERRED)

For SaaS integrations with single-asset lookup endpoints:

```go
func (t *Integration) CheckAffiliation(asset model.Asset) (bool, error) {
    resp, err := t.client.GetAsset(asset.CloudId)
    if err != nil {
        if isNotFoundError(err) {
            return false, nil // Asset doesn't exist
        }
        return false, fmt.Errorf("querying asset: %w", err)
    }
    return resp.ID != "" && resp.DeletedAt == "", nil
}
```

### Pattern B - CheckAffiliationSimple (ACCEPTABLE for cloud providers)

For AWS/Azure/GCP where full enumeration is required:

```go
func (t *Integration) CheckAffiliation(asset model.Asset) (bool, error) {
    return t.BaseCapability.CheckAffiliationSimple(asset)
}
```

### Pattern C - Seed-Based Affiliation (ACCEPTABLE for seed-scoped integrations)

For integrations that only discover from user-provided seeds (Shodan, DNS tools):

```go
func (t *Integration) CheckAffiliation(asset model.Asset) (bool, error) {
    // Check all relevant asset fields against user-provided seeds
    for _, seed := range t.Job.Seeds {
        if strings.Contains(asset.Key, seed.Value) {
            return true, nil
        }
        if asset.DNS != "" && strings.Contains(asset.DNS, seed.Value) {
            return true, nil
        }
    }
    return false, nil
}
```

### Decision Flowchart

```
Does the vendor API have a single-asset lookup endpoint?
├── YES → Implement Pattern A (direct query)
└── NO → Is this a cloud provider integration (AWS/Azure/GCP)?
    ├── YES → Use Pattern B (CheckAffiliationSimple)
    └── NO → Is integration seed-scoped (only discovers from user seeds)?
        ├── YES → Implement Pattern C (seed-based)
        └── NO → Consult with integration-lead for custom approach
```

**ANTI-PATTERN: Stub Implementation**

❌ **WRONG - This is a compliance violation**:

```go
func (t *Integration) CheckAffiliation(asset model.Asset) (bool, error) {
    return true, nil // VIOLATION - doesn't use any approved pattern
}
```

**Why This Matters**: Stub implementations always return `true`, causing false positives when assets are deleted or credentials are revoked. Use Pattern A/B/C based on your API's capabilities.

---

## 3. ValidateCredentials (REQUIRED)

**Purpose**: Verify credentials work BEFORE starting asset enumeration. Fail fast if credentials are invalid.

**Requirements**:

```go
func (t *Integration) ValidateCredentials() error {
    // Make lightweight API call to verify credentials
    _, err := t.client.GetCurrentUser() // Or similar lightweight endpoint
    if err != nil {
        return fmt.Errorf("invalid credentials: %w", err)
    }
    return nil
}

func (t *Integration) Invoke() error {
    // Call ValidateCredentials FIRST
    if err := t.ValidateCredentials(); err != nil {
        return err
    }

    // Proceed with asset enumeration
    // ...
}
```

**Violation Found**:

- DigitalOcean integration - skips ValidateCredentials entirely, starts enumeration with bad credentials

**Why This Matters**: Without credential validation, the integration wastes time enumerating with invalid credentials, generating confusing error logs.

---

## 4. Concurrency Safety (errgroup)

**Purpose**: Prevent race conditions and resource exhaustion when processing assets concurrently.

**Requirements**:

1. **ALWAYS call `g.SetLimit(10)`** (or appropriate limit):

```go
g, ctx := errgroup.WithContext(ctx)
g.SetLimit(10) // REQUIRED - prevents spawning unlimited goroutines
```

2. **ALWAYS capture loop variables** before `g.Go()`:

```go
for _, item := range items {
    item := item // REQUIRED - capture loop variable
    g.Go(func() error {
        return process(item)
    })
}
```

3. **ALWAYS check error** from `g.Wait()`:

```go
if err := g.Wait(); err != nil {
    return fmt.Errorf("processing batch: %w", err)
}
```

**Race Condition Bugs Found**:

- `wiz.go:314` - missing loop variable capture
- `github.go:154` - missing loop variable capture
- `tenable-vm.go` - missing SetLimit
- `insightvm_import.go:92` - missing loop variable capture
- `nessus_import.go:92` - missing loop variable capture

**Why This Matters**: Without `SetLimit()`, integration spawns unlimited goroutines and crashes. Without loop variable capture, all goroutines process the LAST item in the loop (race condition).

---

## 5. Error Handling

**Purpose**: Never silently ignore errors. All errors must be handled or propagated with context.

**Requirements**:

1. **NEVER use `_` for error returns**:

```go
// WRONG - ignores error
data, _ := json.Marshal(obj) // VIOLATION

// RIGHT - handle error
data, err := json.Marshal(obj)
if err != nil {
    return fmt.Errorf("marshaling object: %w", err)
}
```

2. **ALWAYS wrap errors with context**:

```go
// WRONG - loses context
return err

// RIGHT - adds context
return fmt.Errorf("fetching assets from page %d: %w", page, err)
```

**Violations Found**:

- 11 instances of ignored `json.Marshal()` errors in: wiz, okta, xpanse, tenable_vm

**Why This Matters**: Ignored errors cause silent failures that are impossible to debug. Error wrapping provides context for diagnosing issues.

---

## 6. Pagination Safety

**Purpose**: Prevent infinite loops if external API has buggy pagination (e.g., always returns `nextToken` even on last page).

**Requirements**:

You **MUST** provide a pagination termination guarantee using **ONE** of the following approaches:

### Approach A: Hardcoded maxPages Constant

Use when API doesn't provide reliable termination signals:

```go
const maxPages = 1000 // Safety net

page := 0
pageToken := ""

for {
    if page >= maxPages {
        log.Warn("reached maxPages limit, stopping pagination")
        break
    }

    resp, err := api.ListAssets(pageToken)
    if err != nil {
        return fmt.Errorf("listing assets at page %d: %w", page, err)
    }

    // Process resp.Assets...

    if resp.NextToken == "" {
        break
    }

    pageToken = resp.NextToken
    page++
}
```

### Approach B: API-Provided Pagination Signal

Use when API provides reliable termination signals:

```go
pageToken := ""

for {
    resp, err := api.ListAssets(pageToken)
    if err != nil {
        return fmt.Errorf("listing assets: %w", err)
    }

    // Process resp.Assets...

    // API-provided termination signals (use appropriate one for your API):
    if resp.NextToken == "" {        // Empty token
        break
    }
    if !resp.HasMore {                // Boolean flag
        break
    }
    if page >= resp.LastPage {        // Total page count
        break
    }
    if resp.Links.IsLastPage() {      // HATEOAS navigation
        break
    }

    pageToken = resp.NextToken
}
```

### Approach C: Combined (Recommended)

Use both approaches for maximum safety:

```go
const maxPages = 1000 // Safety net

page := 0
pageToken := ""

for page < maxPages {
    resp, err := api.ListAssets(pageToken)
    if err != nil {
        return fmt.Errorf("listing assets at page %d: %w", page, err)
    }

    // Process resp.Assets...

    // Primary termination: API signal
    if resp.NextToken == "" {
        break
    }

    pageToken = resp.NextToken
    page++
}

// Warn if we hit safety limit
if page >= maxPages {
    log.Warn("reached maxPages safety limit", "maxPages", maxPages)
}
```

**Document Your Choice**: Add to `architecture.md`:

```markdown
## Pagination Safety

**Approach**: API-Provided Limits (Approach B)

**Justification**: GitHub API provides reliable `LastPage` field.

**Termination Signal**: `resp.LastPage` comparison
```

**Why This Matters**: Production analysis shows 44/44 integrations use API-provided signals (Approach B), but APIs can have bugs. Choose the approach that matches your API's reliability, and document the decision in architecture.md.

---

## Verification Checklist

Before submitting PR, verify:

- [ ] VMFilter initialized in struct with `filter.NewVMFilter(job.Username)`
- [ ] `Filter.Asset(&asset)` called before every `Job.Send(&asset)`
- [ ] `Filter.Risk(&risk)` called before every `Job.Send(&risk)`
- [ ] CheckAffiliation uses one of the approved patterns (Pattern A/B/C) - not stub returning `true`
- [ ] ValidateCredentials implemented and called in `Invoke()`
- [ ] All errgroup usage has `g.SetLimit()` and loop variable capture
- [ ] No ignored errors (no `_, _ = ...`)
- [ ] Pagination has termination guarantee (maxPages OR API signal), documented in architecture.md

**ALL items must be checked before PR approval.**
