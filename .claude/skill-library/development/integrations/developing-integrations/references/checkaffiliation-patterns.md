# CheckAffiliation Reference Implementation

## The Gold Standard: Wiz Integration

The **ONLY** real CheckAffiliation implementation is in **Wiz** (`wiz/wiz.go:717-783`). All other integrations use stub patterns.

### Wiz Real Implementation

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

## Stub Pattern (Acceptable for Cloud Providers Only)

Amazon/Azure/GCP use `CheckAffiliationSimple` which re-runs full `Invoke()` - expensive but acceptable for cloud providers where full enumeration is the only reliable affiliation check.

### When to Use Stub Pattern

**ONLY** for cloud providers where:

- Full asset enumeration is required anyway
- No efficient single-asset query API exists
- Re-running Invoke() is acceptable overhead

### When NOT to Use Stub Pattern

For SaaS integrations (Wiz, CrowdStrike, Qualys, GitHub, etc.):

- These APIs support single-asset queries
- Full enumeration is expensive and unnecessary
- Implement real CheckAffiliation like Wiz

## Migration Path

If you're implementing a new integration:

1. **Check if the API supports single-asset lookup** (GET /asset/:id, query by identifier, etc.)
2. **YES**: Implement real CheckAffiliation (use Wiz as template)
3. **NO**: Only then use CheckAffiliationSimple stub

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
