# Violation Examples (What NOT to Do)

**Common integration violations with corrected examples.**

## ❌ Missing VMFilter (DigitalOcean, GitHub, GitLab, Cloudflare)

```go
// WRONG - emits assets without filtering
task.Job.Send(&asset)
```

```go
// RIGHT - filter before emission
task.Filter.Asset(&asset)
task.Job.Send(&asset)
```

## ❌ Stub CheckAffiliation - Use Approved Patterns Instead

```go
// WRONG - stub implementation without verification
func (t *Integration) CheckAffiliation(asset model.Asset) (bool, error) {
    return true, nil // VIOLATION - doesn't use any approved pattern
}
```

**RIGHT - Choose the appropriate pattern based on API capability:**

**Decision Flowchart:**

```
Does the vendor API have a single-asset lookup endpoint?
├── YES → Implement Pattern A (direct query)
└── NO → Is this a cloud provider integration (AWS/Azure/GCP)?
    ├── YES → Use Pattern B (CheckAffiliationSimple)
    └── NO → Is integration seed-scoped (only discovers from user seeds)?
        ├── YES → Implement Pattern C (seed-based)
        └── NO → Consult with integration-lead for custom approach
```

**Pattern A Example (PREFERRED):**

```go
func (t *Integration) CheckAffiliation(asset model.Asset) (bool, error) {
    resp, err := t.client.GetAsset(asset.CloudId)
    if err != nil {
        if isNotFoundError(err) {
            return false, nil
        }
        return false, fmt.Errorf("querying asset: %w", err)
    }
    return resp.ID != "" && resp.DeletedAt == "", nil
}
```

**Pattern B Example (cloud providers):**

```go
func (t *Integration) CheckAffiliation(asset model.Asset) (bool, error) {
    return t.BaseCapability.CheckAffiliationSimple(asset)
}
```

**Pattern C Example (seed-scoped):**

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

See [checkaffiliation-patterns.md](checkaffiliation-patterns.md) for complete implementation guidance.

## ❌ Missing errgroup Limits (wiz.go, github.go, tenable-vm.go)

```go
// WRONG - unlimited goroutines
g, ctx := errgroup.WithContext(ctx)
for _, item := range items {
    g.Go(func() error { // RACE: captures wrong item
        return process(item)
    })
}
```

```go
// RIGHT - limit goroutines and capture loop variable
g, ctx := errgroup.WithContext(ctx)
g.SetLimit(10) // REQUIRED
for _, item := range items {
    item := item // REQUIRED - capture loop variable
    g.Go(func() error {
        return process(item)
    })
}
```

## ❌ Ignored Errors (wiz, okta, xpanse, tenable_vm)

```go
// WRONG - ignores marshal error
data, _ := json.Marshal(obj) // VIOLATION
```

```go
// RIGHT - handle all errors
data, err := json.Marshal(obj)
if err != nil {
    return fmt.Errorf("marshaling object: %w", err)
}
```

## ❌ Infinite Pagination (MS Defender, EntraID, CrowdStrike, Xpanse, InsightVM, GitLab)

```go
// WRONG - no safety limit
for pageToken != "" {
    resp, err := api.ListAssets(pageToken)
    // ... infinite loop if API bugs out
    pageToken = resp.NextToken
}
```

```go
// RIGHT - enforce maxPages limit
const maxPages = 1000
page := 0
for pageToken != "" {
    if page >= maxPages {
        log.Warn("reached maxPages limit, stopping pagination")
        break
    }
    resp, err := api.ListAssets(pageToken)
    // ...
    pageToken = resp.NextToken
    page++
}
```
