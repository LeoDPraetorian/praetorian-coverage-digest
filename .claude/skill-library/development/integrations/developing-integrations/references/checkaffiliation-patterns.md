# CheckAffiliation Reference Implementation

## Acceptable Patterns by API Capability

Choose the right pattern based on your integration's API capabilities:

### Pattern A - Direct Ownership Query (PREFERRED)

**When to use:**

- API has endpoint to verify asset existence/ownership (e.g., GET /asset/{id}, query by identifier)
- Single-asset lookup is supported without full enumeration

**Example integrations:**

- Wiz (GraphQL query for `graphEntityByProviderUniqueId`)
- Any SaaS platform with asset-specific API endpoints

**Implementation approach:**

- Query specific asset by ID/key
- Return `true` if exists and not deleted
- Return `false` if not found or deleted
- Return error only on API failures (not for "not found")

**Code example:**

```go
func (task *Integration) CheckAffiliation(asset model.Asset) (bool, error) {
    resp, err := task.client.GetAsset(asset.CloudId)
    if err != nil {
        if isNotFoundError(err) {
            return false, nil // Asset doesn't exist - not affiliated
        }
        return false, fmt.Errorf("querying asset: %w", err)
    }
    return resp.ID != "" && resp.DeletedAt == "", nil
}
```

### Pattern B - CheckAffiliationSimple (ACCEPTABLE for cloud providers)

**When to use:**

- API requires full enumeration to verify ownership (no single-asset lookup endpoint)
- Cloud provider where assets are scoped to authenticated account (AWS, Azure, GCP)
- Full re-enumeration is the only reliable way to verify ownership

**Example integrations:**

- Amazon AWS (no single-asset query across all services)
- Microsoft Azure (subscription-scoped resources)
- Google Cloud Platform (project-scoped resources)

**Implementation approach:**

- Use `BaseCapability.CheckAffiliationSimple()` which re-runs `Invoke()`
- Less efficient but acceptable when Pattern A is impossible

**Code example:**

```go
func (task *Integration) CheckAffiliation(asset model.Asset) (bool, error) {
    return task.BaseCapability.CheckAffiliationSimple(asset)
}
```

**Note:** This pattern re-enumerates ALL assets to find one specific asset. Only use when the API provides no alternative.

### Pattern C - Seed-Based Affiliation (ACCEPTABLE for seed-scoped integrations)

**When to use:**

- Integration only discovers assets from user-provided seeds (domains, IPs, CIDR ranges)
- Discovery is inherently scoped to what the user explicitly provided
- No external account or organization concept

**Example integrations:**

- Shodan (queries user-provided IPs)
- DNS enumeration tools (user-provided domains)
- Network scanners (user-provided CIDR blocks)

**Implementation approach:**

- Check if asset key/DNS matches any seed in `Job.Seeds`
- Return `true` if asset was discovered from a user-provided seed
- Rationale: User explicitly provided the seed, so affiliation is implied

**Code example:**

```go
func (task *Integration) CheckAffiliation(asset model.Asset) (bool, error) {
    // Check all relevant asset fields against user-provided seeds
    for _, seed := range task.Job.Seeds {
        if strings.Contains(asset.Key, seed.Value) {
            return true, nil
        }
        // For DNS assets, also check the DNS field
        if asset.DNS != "" && strings.Contains(asset.DNS, seed.Value) {
            return true, nil
        }
        // Add other field checks as needed (asset.Name, asset.Value, etc.)
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

---

## The Gold Standard: Wiz Integration

The **Wiz** integration (`wiz/wiz.go:717-783`) demonstrates Pattern A - the preferred implementation.

### Wiz Real Implementation (Pattern A)

```go
// From wiz/wiz.go:717-783 - THE ONLY REAL IMPLEMENTATION
func (task *Wiz) CheckAffiliation(asset model.Asset) (bool, error) {
    if err := task.ValidateCredentials(); err != nil {
        return false, fmt.Errorf("failed to authenticate with Wiz: %w", err)
    }

    if asset.CloudId == "" {
        return false, fmt.Errorf("no cloud ID found for asset: %s", asset.Key)
    }

    affiliationQuery := WizQuery{
        Query: `query SearchForEntity($providerUniqueId: String!) {
            graphEntityByProviderUniqueId(providerUniqueId: $providerUniqueId) {
                id
                deletedAt
            }
        }`,
        Variables: map[string]any{"providerUniqueId": asset.CloudId},
    }

    queryJson, err := json.Marshal(affiliationQuery)
    if err != nil {
        return false, fmt.Errorf("marshal query: %w", err)
    }

    result, err := web.Request[AffiliationResponse](
        task.GetClient(), "POST", task.Asset.Value, queryJson,
        "Authorization", fmt.Sprintf("Bearer %s", task.OAuth.AccessToken),
        "Content-Type", "application/json",
    )
    if err != nil {
        return false, fmt.Errorf("check affiliation: %w", err)
    }

    graphEntity := result.Body.Data.GraphEntityByProviderUniqueId
    affiliated := graphEntity.ID != "" && graphEntity.DeletedAt == ""
    return affiliated, nil
}
```

## Key Implementation Patterns

### 1. Validate Credentials First

```go
if err := task.ValidateCredentials(); err != nil {
    return false, fmt.Errorf("failed to authenticate with Wiz: %w", err)
}
```

Always re-validate credentials before making API calls.

### 2. Check Required Fields

```go
if asset.CloudId == "" {
    return false, fmt.Errorf("no cloud ID found for asset: %s", asset.Key)
}
```

Validate that the asset has the necessary identifiers.

### 3. Query External API

The affiliation check **MUST** query the external API. Use GraphQL, REST, or SDK calls.

### 4. Handle Response Properly

```go
affiliated := graphEntity.ID != "" && graphEntity.DeletedAt == ""
return affiliated, nil
```

Return `true` only if the asset exists and is not deleted.

## Pattern Selection Guide

When implementing a new integration, use the decision flowchart above to select the appropriate pattern:

1. **First choice**: Pattern A (direct query) - Most efficient and secure
2. **Second choice**: Pattern B (CheckAffiliationSimple) - Only for cloud providers
3. **Third choice**: Pattern C (seed-based) - Only for seed-scoped integrations
4. **Last resort**: Consult integration-lead if none of the above apply

## Common Mistakes

### ❌ Always Returning True

```go
func (t *Integration) CheckAffiliation(asset model.Asset) (bool, error) {
    return true, nil // VIOLATION - doesn't query API
}
```

### ❌ Not Handling Errors

```go
func (t *Integration) CheckAffiliation(asset model.Asset) (bool, error) {
    result, _ := t.client.GetAsset(asset.DNS) // VIOLATION - ignores error
    return result != nil, nil
}
```

### ✅ Correct Implementation

```go
func (t *Integration) CheckAffiliation(asset model.Asset) (bool, error) {
    if err := t.ValidateCredentials(); err != nil {
        return false, fmt.Errorf("validate credentials: %w", err)
    }

    result, err := t.client.GetAssetByID(asset.CloudId)
    if err != nil {
        return false, fmt.Errorf("query API: %w", err)
    }

    return result.IsOwned && !result.IsDeleted, nil
}
```
