# CheckAffiliation Verification

**Purpose**: Verify that integration correctly checks asset ownership through external API queries.

## Requirements

1. CheckAffiliation MUST query external API to verify organization owns the asset
2. MUST NOT be a stub returning `true, nil` or relying on base class default
3. Cloud providers MAY use `CheckAffiliationSimple` (acceptable pattern)

## Verification Commands

The verification must identify which of the three acceptable patterns (A/B/C) is used, or detect violations (stub implementations).

### Step 1: Check if CheckAffiliation is Overridden

```bash
grep -n "func.*CheckAffiliation" modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go
```

If no override found → **FAIL** (using base class default "not implemented")

### Step 2: Check for Pattern A - Direct Ownership Query

Look for HTTP/API calls within the CheckAffiliation function:

```bash
grep -A30 'func.*CheckAffiliation' {file} | grep -E 'http|graphql|client\.|api\.'
```

If found → **PASS** (Pattern A - Direct API query)

### Step 3: Check for Pattern B - CheckAffiliationSimple

Look for delegation to CheckAffiliationSimple:

```bash
grep -A5 'func.*CheckAffiliation' {file} | grep 'CheckAffiliationSimple'
```

If found → **PASS** (Pattern B - Acceptable for cloud providers)

### Step 4: Check for Pattern C - Seed-Based Affiliation

Look for seed checks within the function:

```bash
grep -A10 'func.*CheckAffiliation' {file} | grep -E 'Seeds|seed'
```

If found → **PASS** (Pattern C - Acceptable for seed-scoped integrations)

### Step 5: Detect Stub Violations

If none of the above patterns found, check for stub:

```bash
grep -A5 'func.*CheckAffiliation' {file} | grep -E 'return true, nil|return false, nil'
```

If found WITHOUT any Pattern A/B/C → **FAIL** (Stub implementation)

### Verdict Logic

- If Pattern A, B, or C detected → **PASS**
- If `return true, nil` found without any pattern → **FAIL** (stub)
- If no override found → **FAIL** (using base class default)

## Base Class Default (VIOLATION if not overridden)

```go
// modules/chariot/backend/pkg/tasks/base/base.go
func (base *BaseCapability) CheckAffiliation(asset model.Asset) (bool, error) {
    return false, fmt.Errorf("not implemented")
}
```

**If integration does NOT override CheckAffiliation**, it returns this error, making the integration affiliation capability non-functional.

## Real Implementation Pattern (Gold Standard - Wiz)

```go
func (task *Wiz) CheckAffiliation(asset model.Asset) (bool, error) {
    // Step 1: Validate credentials first
    if err := task.ValidateCredentials(); err != nil {
        return false, fmt.Errorf("failed to authenticate with Wiz: %w", err)
    }

    // Step 2: Require asset identifier
    if asset.CloudId == "" {
        return false, fmt.Errorf("no cloud ID found for asset: %s", asset.Key)
    }

    // Step 3: Query external API (GraphQL in Wiz's case)
    affiliationQuery := WizQuery{
        Query: `query SearchForEntity($providerUniqueId: String!) {
            graphEntityByProviderUniqueId(providerUniqueId: $providerUniqueId) {
                id
                firstSeen
                lastSeen
                deletedAt
            }
        }`,
        Variables: map[string]any{"providerUniqueId": asset.CloudId},
    }

    queryJson, _ := json.Marshal(affiliationQuery)
    result, err := web.Request[AffiliationResponse](
        task.GetClient(), "POST", task.Asset.Value, queryJson,
        "Authorization", fmt.Sprintf("Bearer %s", task.OAuth.AccessToken),
        "Content-Type", "application/json",
    )

    if err != nil {
        return false, fmt.Errorf("failed to check asset affiliation: %v", err)
    }

    // Step 4: Check existence and not deleted
    graphEntity := resp.Data.GraphEntityByProviderUniqueId
    affiliated := graphEntity.ID != "" && graphEntity.DeletedAt == ""
    return affiliated, nil
}
```

**Key Characteristics**:
- Validates credentials first
- Requires asset identifier (CloudId, DNS, etc.)
- Makes actual API call (GraphQL query)
- Checks for deletion/existence
- Proper error propagation

## Acceptable Pattern: CheckAffiliationSimple (Cloud Providers Only)

```go
// AWS, Azure, GCP pattern
func (a *Amazon) CheckAffiliation(asset model.Asset) (bool, error) {
    return a.BaseCapability.CheckAffiliationSimple(asset, &a.Job, a.Invoke)
}
```

**Implementation in Base Class**:
```go
func (base *BaseCapability) CheckAffiliationSimple(asset model.Asset, job *model.Job, invoke func() error) (bool, error) {
    job.Open()
    stream := job.Stream()

    go func() {
        invoke()  // Re-runs full enumeration
        job.Close()
    }()

    for {
        select {
        case items, ok := <-stream:
            if !ok {
                return false, nil  // Asset not found
            }
            for _, item := range items {
                if discoveredAsset, ok := item.(*model.Asset); ok {
                    if discoveredAsset.Key == asset.Key {
                        return true, nil  // Asset found
                    }
                }
            }
        }
    }
}
```

**When CheckAffiliationSimple Is Acceptable**:
- Cloud provider integrations (AWS, Azure, GCP)
- No efficient single-asset query API available
- Full enumeration is required for accurate affiliation

## Evidence Format

**PASS Example (Real Implementation)**:
```
✅ CheckAffiliation
Evidence: wiz.go:717 - func (task *Wiz) CheckAffiliation(asset model.Asset) (bool, error)
Evidence: wiz.go:745 - web.Request[AffiliationResponse](task.GetClient(), "POST", ...)
Pattern: Real API query (GraphQL) to verify asset ownership
```

**PASS Example (CheckAffiliationSimple)**:
```
✅ CheckAffiliation (CheckAffiliationSimple)
Evidence: amazon.go:475 - return a.BaseCapability.CheckAffiliationSimple(asset, &a.Job, a.Invoke)
Pattern: Cloud provider using full re-enumeration (acceptable)
```

**FAIL Example (Stub/Not Overridden)**:
```
❌ CheckAffiliation
Evidence: vendor.go - No CheckAffiliation override found
Issue: Relies on base class default returning "not implemented" error
Required: Override with real API query or use CheckAffiliationSimple
```

## Known Violation Rate

**Current Codebase Status (from research)**:
- Real implementation: 1 (Wiz)
- Acceptable (CheckAffiliationSimple): 3 (AWS, Azure, GCP)
- Violations (stub/not overridden): 41 integrations

**98% of integrations have non-functional CheckAffiliation.**

## Remediation Strategy

**For SaaS integrations with single-asset query API**:
1. Check vendor API for GET /asset/:id or equivalent endpoint
2. Follow Wiz pattern: validate credentials → require identifier → query API → check result
3. Return true if asset exists and belongs to organization

**For integrations without single-asset query**:
1. Use CheckAffiliationSimple pattern
2. Accept performance cost of full re-enumeration

**For file-based imports**:
1. CheckAffiliation may not be applicable
2. Document as N/A with justification

## Compliance Checklist

- [ ] CheckAffiliation method is overridden (not using base class default)
- [ ] Implementation makes actual API call (not just `return true, nil`)
- [ ] Validates credentials before API call
- [ ] Requires asset identifier (CloudId, DNS, Key, etc.)
- [ ] Returns accurate affiliation status based on API response
- [ ] Proper error handling and wrapping
