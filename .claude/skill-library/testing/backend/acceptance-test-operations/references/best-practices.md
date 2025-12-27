# Best Practices for Test Operations

This document provides comprehensive guidance on writing effective, maintainable test operations.

## ✅ Do's - Follow These Practices

### 1. Use Descriptive Operation Names

**Good examples:**

```go
✅ AddAsset       // Clear business action
✅ CreateJobs     // Descriptive intent
✅ UpdateRisk     // Standard CRUD terminology
✅ DeleteSeed     // Explicit action
```

**Bad examples:**

```go
❌ CreateAsset    // Too generic
❌ InsertAsset    // Implementation detail
❌ PostAsset      // Exposes HTTP method
❌ AssetOp        // Unclear abbreviation
```

**Rationale:** Operation names should describe WHAT the operation does at a business level, not HOW it does it technically.

---

### 2. Return Strongly-Typed Models

**Good examples:**

```go
✅ func AddAsset(data model.Assetlike) (model.Assetlike, error)
✅ func GetJobs(filter JobFilter) ([]model.Job, error)
✅ func UpdateRisk(risk *model.Risk) (*model.Risk, error)
```

**Bad examples:**

```go
❌ func AddAsset(data model.Assetlike) (interface{}, error)
❌ func GetJobs(filter JobFilter) ([]interface{}, error)
❌ func UpdateRisk(risk *model.Risk) (any, error)
```

**Edge case:**

```go
⚠️  func AddAsset(data model.Assetlike) (*model.Asset, error)
```

- Use interface when possible for polymorphism
- Only use concrete type if operation is type-specific

---

### 3. Wrap All Errors with Context

**Good examples:**

```go
✅ return fmt.Errorf("failed to add asset: %w", err)
✅ return fmt.Errorf("failed to create jobs for asset %s: %w", assetKey, err)
✅ return fmt.Errorf("validation failed: %w", err)
```

**Bad examples:**

```go
❌ return err                    // No context
❌ return fmt.Errorf("%v", err)  // Breaks error chain
❌ return errors.New("failed")   // Discards original error
```

**Rationale:** Error wrapping with `%w` preserves the error chain for `errors.Unwrap()` and `errors.Is()`, while adding contextual information for debugging.

---

### 4. Validate Responses

**Good example:**

```go
✅ // Good - validates before accessing
if len(results) == 0 {
    return nil, fmt.Errorf("no results returned")
}

if len(results) > 1 {
    return nil, fmt.Errorf("expected single result, got %d", len(results))
}

return results[0], nil
```

**Bad example:**

```go
❌ // Bad - assumes results exist
return results[0], nil
```

**Common validation checks:**

```go
// Empty results
if len(results) == 0 {
    return nil, fmt.Errorf("expected resource not found")
}

// Unexpected multiple results
if len(results) > 1 {
    return nil, fmt.Errorf("multiple results found, expected unique")
}

// Missing required fields
if result.RequiredField == "" {
    return nil, fmt.Errorf("response missing required field")
}

// Invalid status
if result.Status != model.Expected {
    return nil, fmt.Errorf("resource in unexpected state: %s", result.Status)
}
```

---

### 5. Handle Optional Fields Conditionally

**Good example:**

```go
✅ // Good - conditionally includes optional fields
body := map[string]any{
    "required": modelData.Required,
}

if modelData.Comment != "" {
    body["comment"] = modelData.Comment
}

if len(modelData.Tags) > 0 {
    body["tags"] = modelData.Tags
}
```

**Bad example:**

```go
❌ // Bad - always includes empty values
body := map[string]any{
    "required": modelData.Required,
    "comment":  modelData.Comment,  // Empty string sent
    "tags":     modelData.Tags,     // Empty slice sent
}
```

**Rationale:** Some APIs reject or validate empty fields. Conditional inclusion avoids validation errors and produces cleaner requests.

---

### 6. Hydrate Missing Fields

**Good example:**

```go
✅ // Good - hydrates username
asset := result.Body[0].Model
asset.GetBase().Username = h.Username
return asset, nil
```

**Bad example:**

```go
❌ // Bad - leaves username empty
asset := result.Body[0].Model
return asset, nil
```

**Rationale:** APIs optimize responses by omitting redundant fields. Tests need complete models for assertions.

---

### 7. Use web.Request[T] for Type Safety

**Good example:**

```go
✅ // Good - type-safe with automatic unmarshaling
result, err := web.Request[model.Asset](h.Client, "POST", "/asset", body)
asset := result.Body  // Already typed as model.Asset
```

**Bad example:**

```go
❌ // Bad - manual unmarshaling
resp, err := h.Client.Post("/asset", body)
var asset model.Asset
json.Unmarshal(resp.Body, &asset)
```

**Rationale:** Generic `web.Request[T]()` provides compile-time type safety, automatic unmarshaling, and better IDE support.

---

### 8. Organize by Domain

**Good structure:**

```
pkg/ops/
├── assets.go       # All asset operations
├── seeds.go        # All seed operations
├── risks.go        # All risk operations
├── accounts.go     # All account operations
├── files.go        # All file operations
└── jobs.go         # All job operations
```

**Bad structure:**

```
pkg/ops/
├── crud.go         # Mixed CRUD for all types
├── helpers.go      # Random helper functions
└── operations.go   # Everything in one file
```

**Guidelines:**

- Group related operations in same file
- Keep files under 300 lines when possible
- Use clear, domain-specific file names
- Alphabetical ordering of files

---

### 9. Document Complex Operations

**Good example:**

```go
✅ // Good - comprehensive documentation
// AddFileMultipart uploads large files in parallel chunks (100MB each)
// with up to 10 concurrent uploads. Use for files larger than 100MB.
//
// The upload process:
// 1. Initiates multipart upload to get upload ID
// 2. Splits file into 100MB chunks
// 3. Uploads chunks in parallel (max 10 concurrent)
// 4. Completes multipart upload when all chunks finish
//
// Parameters:
//   - file: The file to upload (must have Name and Bytes set)
//
// Returns:
//   - error: Any error encountered during upload process
func (h *TestHelper) AddFileMultipart(file *model.File) error
```

**Bad example:**

```go
❌ // Bad - no documentation
func (h *TestHelper) AddFileMultipart(file *model.File) error
```

**Documentation guidelines:**

- Explain complex behavior
- Document parameters and return values
- Include usage notes (when to use)
- Describe algorithm for non-obvious logic

---

### 10. Keep Operations Atomic

**Good example:**

```go
✅ // Good - atomic operations
asset, err := helper.AddAsset(data)
time.Sleep(5 * time.Second)
helper.AssertJobsQueuedForTarget(t, asset)
```

**Bad example:**

```go
❌ // Bad - mega-operation does too much
func (h *TestHelper) CreateAssetAndWaitForJobsAndValidate(...)
```

**Rationale:**

- One business action per operation
- Compose operations in tests for workflows
- Extract common patterns to reusable helpers

---

## ❌ Don'ts - Avoid These Anti-Patterns

### 1. Don't Expose HTTP Details

**Bad:**

```go
❌ func (h *TestHelper) PostToAssetEndpoint(body map[string]any) (*http.Response, error)
❌ func (h *TestHelper) HTTPRequest(method, url string, body map[string]any) (*http.Response, error)
```

**Good:**

```go
✅ func (h *TestHelper) AddAsset(modelData model.Assetlike) (model.Assetlike, error)
✅ func (h *TestHelper) CreateJobs(request model.Job) ([]model.Job, error)
```

---

### 2. Don't Return Raw HTTP Responses

**Bad:**

```go
❌ func (h *TestHelper) AddAsset(data model.Assetlike) (*http.Response, error)
```

**Good:**

```go
✅ func (h *TestHelper) AddAsset(data model.Assetlike) (model.Assetlike, error)
```

---

### 3. Don't Ignore Errors

**Bad:**

```go
❌ result, _ := web.Request[T](h.Client, "POST", "/endpoint", body)
❌ web.Request[T](h.Client, "POST", "/endpoint", body)  // Not checking error at all
```

**Good:**

```go
✅ result, err := web.Request[T](h.Client, "POST", "/endpoint", body)
   if err != nil {
       return nil, fmt.Errorf("operation failed: %w", err)
   }
```

---

### 4. Don't Mix Concerns

**Bad:**

```go
❌ // Mixes operation with assertion
func (h *TestHelper) AddAssetAndValidate(t *testing.T, data model.Assetlike)

❌ // Mixes multiple unrelated operations
func (h *TestHelper) CreateAssetAndJobsAndFiles(...)
```

**Good:**

```go
✅ // Separate operation and assertion
asset, err := helper.AddAsset(data)
helper.ValidateAsset(t, asset, data)

✅ // Compose operations in tests
asset, err := helper.AddAsset(assetData)
jobs, err := helper.CreateJobs(jobRequest)
err = helper.AddFile(fileData)
```

---

### 5. Don't Hard-Code Values

**Bad:**

```go
❌ func (h *TestHelper) CreateTestAsset() (model.Assetlike, error) {
       asset := &model.Asset{
           Group: "example.com",
           Identifier: "example.com",
           ...
       }
       return h.AddAsset(asset)
   }
```

**Good:**

```go
✅ // Use data factory
asset := helper.GenerateDomainAssetData()
created, err := helper.AddAsset(asset)
```

---

### 6. Don't Skip Response Validation

**Bad:**

```go
❌ // Assumes result exists
return result.Body[0], nil
```

**Good:**

```go
✅ // Validates before accessing
if len(result.Body) == 0 {
    return nil, fmt.Errorf("no results")
}
return result.Body[0], nil
```

---

### 7. Don't Create Mega-Operations

**Bad:**

```go
❌ func (h *TestHelper) CreateAssetAndWaitForJobsAndValidateAndExport(
       t *testing.T,
       asset model.Assetlike,
       timeout time.Duration,
   ) (model.Asset, []model.Job, []byte, error)
```

**Good:**

```go
✅ // Atomic operations
asset, err := helper.AddAsset(data)
time.Sleep(5 * time.Second)
jobs, err := helper.GetJobsForTarget(asset)
exportData, err := helper.ExportAsset(asset)
```

---

### 8. Don't Duplicate Code

**Bad:**

```go
❌ // Duplicated logic in multiple operations
func (h *TestHelper) AddAsset1(...) {
    // Same implementation
}

func (h *TestHelper) AddAsset2(...) {
    // Same implementation
}
```

**Good:**

```go
✅ // Extract common pattern to helper
func (h *TestHelper) addAssetHelper(body map[string]any) (model.Assetlike, error) {
    // Shared implementation
}

func (h *TestHelper) AddAsset(data model.Assetlike) (model.Assetlike, error) {
    body := buildBody(data)
    return h.addAssetHelper(body)
}
```

---

### 9. Don't Use Ambiguous Names

**Bad:**

```go
❌ func (h *TestHelper) Do(...) error
❌ func (h *TestHelper) Process(...) error
❌ func (h *TestHelper) Handle(...) error
❌ func (h *TestHelper) Execute(...) error
```

**Good:**

```go
✅ func (h *TestHelper) AddAsset(...) (model.Assetlike, error)
✅ func (h *TestHelper) CreateJobs(...) ([]model.Job, error)
✅ func (h *TestHelper) DeleteRisk(...) error
```

---

### 10. Don't Skip Field Hydration

**Bad:**

```go
❌ // Skips hydration - username will be empty
asset := result.Body[0].Model
return asset, nil
```

**Good:**

```go
✅ // Hydrates username for test assertions
asset := result.Body[0].Model
asset.GetBase().Username = h.Username
return asset, nil
```

---

## Code Review Checklist

Use this checklist when reviewing operation code:

### Implementation Review

- [ ] Operation name is descriptive and business-level
- [ ] Returns strongly-typed models (not `interface{}`)
- [ ] Uses `web.Request[T]()` for type safety
- [ ] Wraps errors with context using `%w`
- [ ] Validates responses before returning
- [ ] Handles optional fields conditionally
- [ ] Hydrates fields not returned by API
- [ ] Helper methods are private (lowercase)
- [ ] No HTTP details exposed in function signature
- [ ] No hard-coded test data

### Organization Review

- [ ] Operation in appropriate domain file
- [ ] File under 300 lines (or justified)
- [ ] Related operations grouped together
- [ ] Complex operations documented
- [ ] Consistent naming with existing operations

### Testing Review

- [ ] Test file exists (`domain_test.go`)
- [ ] Test function named `Test_OperationName`
- [ ] Test uses `t.Parallel()`
- [ ] Helper initialized properly
- [ ] Assertions validate all expected behavior
- [ ] Side effects verified
- [ ] Error cases tested (if applicable)

---

## Quick Reference

### Pattern Usage Summary

| Pattern             | When to Use             | Example                                    |
| ------------------- | ----------------------- | ------------------------------------------ |
| Type-Safe Request   | All API calls           | `web.Request[T](...)`                      |
| Error Wrapping      | All error returns       | `fmt.Errorf("...: %w", err)`               |
| Optional Fields     | Non-required parameters | `if field != "" { body["field"] = field }` |
| Response Validation | All API responses       | `if len(results) == 0 { return error }`    |
| Field Hydration     | API omits fields        | `model.Username = h.Username`              |

### Naming Conventions

| Type              | Convention           | Example                                |
| ----------------- | -------------------- | -------------------------------------- |
| Public operations | PascalCase           | `AddAsset`, `CreateJobs`               |
| Private helpers   | camelCase            | `buildRequestBody`, `validateResponse` |
| Domain files      | lowercase            | `assets.go`, `seeds.go`                |
| Test files        | domain + `_test.go`  | `assets_test.go`                       |
| Test functions    | `Test_OperationName` | `Test_AddAsset`                        |

---

## Additional Resources

- [patterns.md](patterns.md) - Four main operation patterns
- [common-patterns.md](common-patterns.md) - Five shared implementation patterns
- [adding-operations.md](adding-operations.md) - Step-by-step guide for new operations
- [organization.md](organization.md) - File structure and domain organization
