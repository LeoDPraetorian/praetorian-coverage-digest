# Adding New Operations - Step-by-Step Guide

This guide walks through the complete process of adding a new operation to the test operations system.

## Step 1: Choose the Right File

### Decision Tree

```
Does operation fit existing domain?
├─ YES → Add to existing file (assets.go, seeds.go, etc.)
└─ NO → Create new domain file
    Example: mynewdomain.go
```

### Existing Domains

Current domain files in `pkg/ops/`:

- **assets.go** - Asset CRUD operations (99 lines)
- **seeds.go** - Seed CRUD operations (92 lines)
- **risks.go** - Risk CRUD operations (118 lines)
- **accounts.go** - Account/collaboration management (62 lines)
- **files.go** - File upload/download/multipart (227 lines)
- **jobs.go** - Job creation/deletion/status (66 lines)
- **users.go** - User management operations
- **capabilities.go** - Capability operations
- **export.go** - Data export functionality
- **plextrac.go** - PlexTrac integration operations
- **async.go** - Async operation helpers

### File Selection Criteria

**Add to existing file if:**
- Operation logically belongs to domain
- File is under 300 lines
- Related operations already present

**Create new file if:**
- Operation represents new domain
- Existing file would exceed 300 lines
- Operation requires many related helpers

---

## Step 2: Define the Operation

### Complete Operation Template

```go
// pkg/ops/mynewdomain.go (or existing domain file)
package ops

import (
    "fmt"
    "github.com/praetorian-inc/chariot/backend/pkg/lib/web"
    "github.com/praetorian-inc/tabularium/pkg/model/model"
)

// MyOperation performs a specific business operation.
// It abstracts HTTP details and provides business-level interface.
//
// Parameters:
//   - input: The input data for the operation
//
// Returns:
//   - MyReturnType: The created/updated resource
//   - error: Any error encountered during the operation
func (h *TestHelper) MyOperation(input MyInputType) (MyReturnType, error) {
    // 1. Build API request body
    body := map[string]any{
        "requiredField": input.RequiredField,
    }

    // 2. Handle optional fields (Pattern C)
    if input.OptionalField != "" {
        body["optionalField"] = input.OptionalField
    }

    // 3. Make type-safe API request (Pattern A)
    result, err := web.Request[MyResponseType](
        h.Client,
        "POST",           // HTTP method
        "/my/endpoint",   // API endpoint
        body,             // Request payload
    )

    // 4. Wrap errors with context (Pattern B)
    if err != nil {
        return nil, fmt.Errorf("failed to perform my operation: %w", err)
    }

    // 5. Validate response (Pattern D)
    response := result.Body

    if !response.IsValid() {
        return nil, fmt.Errorf("invalid response from API")
    }

    // 6. Hydrate fields if needed (Pattern E)
    response.SomeField = h.User.Email

    // 7. Transform to expected return type (if needed)
    returnValue := transformResponse(response)

    return returnValue, nil
}
```

### Key Components

1. **Descriptive name** - Business-level operation name (not HTTP method)
2. **Input parameter** - Strongly-typed input model
3. **Return type** - Strongly-typed output model + error
4. **Request building** - Map input to API format
5. **Type-safe HTTP** - Use `web.Request[T]()`
6. **Error wrapping** - Contextual error messages
7. **Response validation** - Check for expected results
8. **Field hydration** - Set fields not returned by API

### Naming Conventions

**✅ Good operation names:**
- `AddAsset` - Clear business action
- `CreateJobs` - Descriptive intent
- `UpdateRisk` - Standard CRUD terminology
- `GetFileDownloadURL` - Specific functionality

**❌ Bad operation names:**
- `PostAsset` - Exposes HTTP method
- `AssetOperation` - Too generic
- `DoSomething` - Unclear purpose
- `Helper` - Not descriptive

---

## Step 3: Add Helper Methods (If Needed)

### When to Extract Helpers

Extract logic to private helpers when:
- **Complex transformations** - Multi-step data processing
- **Reusable logic** - Shared between multiple operations
- **Readability** - Breaking down complex operations
- **Testing** - Easier to unit test small helpers

### Helper Method Template

```go
// Private helper for complex logic
// Note: lowercase first letter = unexported (private)
func (h *TestHelper) myOperationHelper(data ComplexData) (ProcessedData, error) {
    // Complex processing logic
    processed := ProcessedData{
        Field1: transform(data.RawField1),
        Field2: validate(data.RawField2),
    }

    if !processed.IsValid() {
        return ProcessedData{}, fmt.Errorf("invalid processed data")
    }

    return processed, nil
}

// Public operation uses helper
func (h *TestHelper) MyComplexOperation(input Input) (Output, error) {
    // Pre-process input using helper
    processed, err := h.myOperationHelper(input.Data)
    if err != nil {
        return nil, fmt.Errorf("preprocessing failed: %w", err)
    }

    // Use processed data in API call
    result, err := web.Request[Output](h.Client, "POST", "/endpoint", processed)
    if err != nil {
        return nil, fmt.Errorf("API request failed: %w", err)
    }

    return result.Body, nil
}
```

### Helper Naming Conventions

**Private helpers:**
```go
func (h *TestHelper) buildRequestBody(...) map[string]any
func (h *TestHelper) validateResponse(...) error
func (h *TestHelper) transformResult(...) TransformedType
func (h *TestHelper) uploadPart(...) error  // For multipart uploads
```

**Public operations:**
```go
func (h *TestHelper) AddAsset(...) (model.Assetlike, error)
func (h *TestHelper) CreateJobs(...) ([]model.Job, error)
```

---

## Step 4: Use in Tests

### Standard Test Usage Pattern

```go
func Test_MyOperation(t *testing.T) {
    t.Parallel()

    // 1. Initialize helper
    helper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    // 2. Generate test data
    input := MyInputType{
        RequiredField: "value",
        OptionalField: "optional",
    }

    // Or use factory method if available
    // input := helper.GenerateMyInputData()

    // 3. Call operation
    result, err := helper.MyOperation(input)
    require.NoError(t, err)

    // 4. Validate result
    assert.NotNil(t, result)
    assert.Equal(t, "expected", result.SomeField)

    // 5. Validate side effects (jobs, table, etc.)
    helper.AssertJobsQueuedForTarget(t, result)
    helper.AssertTableItemInserted(t, result)
}
```

### Test Variations

**Testing with error scenarios:**
```go
func Test_MyOperation_Error(t *testing.T) {
    t.Parallel()
    helper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    // Invalid input
    input := MyInputType{
        RequiredField: "",  // Empty required field
    }

    // Should return error
    _, err = helper.MyOperation(input)
    require.Error(t, err)
    assert.Contains(t, err.Error(), "required field")
}
```

**Testing with multiple operations:**
```go
func Test_MyWorkflow(t *testing.T) {
    t.Parallel()
    helper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    // Step 1: Create resource
    created, err := helper.CreateResource(data)
    require.NoError(t, err)

    // Step 2: Use new operation
    result, err := helper.MyOperation(created)
    require.NoError(t, err)

    // Step 3: Verify workflow
    assert.Equal(t, created.ID, result.ParentID)
}
```

---

## Complete Example: Adding GetAssetMetadata Operation

### Step 1: Choose File

Operation retrieves asset metadata → fits `assets.go` domain.

### Step 2: Define Operation

```go
// pkg/ops/assets.go
package ops

import (
    "fmt"
    "github.com/praetorian-inc/chariot/backend/pkg/lib/web"
    "github.com/praetorian-inc/tabularium/pkg/model/model"
)

// GetAssetMetadata retrieves metadata for a specific asset.
//
// Parameters:
//   - asset: The asset to retrieve metadata for (must have Key set)
//
// Returns:
//   - *model.AssetMetadata: The asset's metadata
//   - error: Any error encountered
func (h *TestHelper) GetAssetMetadata(asset model.Assetlike) (*model.AssetMetadata, error) {
    // Build query body
    body := map[string]any{
        "key": asset.GetKey(),
    }

    // Make type-safe request
    result, err := web.Request[model.AssetMetadata](
        h.Client,
        "POST",
        "/asset/metadata",
        body,
    )
    if err != nil {
        return nil, fmt.Errorf("failed to get asset metadata: %w", err)
    }

    metadata := result.Body

    // Validate required fields
    if metadata.AssetKey == "" {
        return nil, fmt.Errorf("metadata missing asset key")
    }

    // Hydrate username
    metadata.Username = h.Username

    return &metadata, nil
}
```

### Step 3: No Helper Methods Needed

Operation is straightforward - no helpers required.

### Step 4: Write Test

```go
// pkg/ops/assets_test.go
func Test_GetAssetMetadata(t *testing.T) {
    t.Parallel()

    helper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    // Create asset
    asset := helper.GenerateDomainAssetData()
    created, err := helper.AddAsset(asset)
    require.NoError(t, err)

    // Get metadata
    metadata, err := helper.GetAssetMetadata(created)
    require.NoError(t, err)

    // Validate
    assert.Equal(t, created.GetKey(), metadata.AssetKey)
    assert.Equal(t, helper.Username, metadata.Username)
    assert.NotZero(t, metadata.CreatedAt)
}
```

---

## Checklist for New Operations

### Implementation Checklist

- [ ] Choose appropriate domain file
- [ ] Name follows business-level conventions (not HTTP methods)
- [ ] Function signature has descriptive comment
- [ ] Input parameter is strongly-typed
- [ ] Return type is strongly-typed (model + error)
- [ ] Uses `web.Request[T]()` for type safety (Pattern A)
- [ ] Wraps errors with context (Pattern B)
- [ ] Handles optional fields conditionally (Pattern C)
- [ ] Validates response before returning (Pattern D)
- [ ] Hydrates fields not returned by API (Pattern E)
- [ ] Helper methods extracted if needed
- [ ] Helper methods are private (lowercase)

### Testing Checklist

- [ ] Test file exists (`domain_test.go`)
- [ ] Test function follows naming: `Test_OperationName`
- [ ] Test uses `t.Parallel()`
- [ ] Helper initialized with `ops.NewTestHelper(t)`
- [ ] Operation called with valid test data
- [ ] Result validated with assertions
- [ ] Side effects verified (jobs, table, etc.)
- [ ] Error cases tested (if applicable)
- [ ] Test passes locally
- [ ] Test passes in CI

---

## Common Pitfalls

### ❌ Pitfall 1: Exposing HTTP Details

```go
// Bad - exposes HTTP method
func (h *TestHelper) PostToAssetEndpoint(body map[string]any) (*http.Response, error)

// Good - business-level abstraction
func (h *TestHelper) AddAsset(modelData model.Assetlike) (model.Assetlike, error)
```

### ❌ Pitfall 2: Returning Raw HTTP Response

```go
// Bad - returns HTTP response
func (h *TestHelper) AddAsset(data model.Assetlike) (*http.Response, error)

// Good - returns typed model
func (h *TestHelper) AddAsset(data model.Assetlike) (model.Assetlike, error)
```

### ❌ Pitfall 3: Skipping Validation

```go
// Bad - assumes result exists
return result.Body[0], nil

// Good - validates before accessing
if len(result.Body) == 0 {
    return nil, fmt.Errorf("no results")
}
return result.Body[0], nil
```

### ❌ Pitfall 4: Mixing Concerns

```go
// Bad - mixes operation with assertion
func (h *TestHelper) AddAssetAndValidate(t *testing.T, data model.Assetlike)

// Good - separate operation and assertion
asset, err := helper.AddAsset(data)
helper.ValidateAsset(t, asset, data)
```

### ❌ Pitfall 5: Hard-Coding Values

```go
// Bad - hard-coded test data
func (h *TestHelper) CreateTestAsset() (model.Assetlike, error) {
    asset := &model.Asset{Group: "example.com", ...}

// Good - use data factory
asset := helper.GenerateDomainAssetData()
```

---

## Next Steps

After implementing your operation:

1. **Test locally** - Verify operation works as expected
2. **Run full test suite** - Ensure no regressions
3. **Review code** - Self-review for patterns and best practices
4. **Update documentation** - If needed, update this guide
5. **Submit PR** - Follow standard code review process

For more details on patterns used in operations, see:
- [patterns.md](patterns.md) - Four main operation patterns
- [common-patterns.md](common-patterns.md) - Five shared patterns
- [best-practices.md](best-practices.md) - Do's and don'ts
