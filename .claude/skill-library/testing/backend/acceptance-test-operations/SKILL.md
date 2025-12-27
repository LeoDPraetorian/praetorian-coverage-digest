---
name: acceptance-test-operations
description: Use when writing acceptance tests for Chariot APIs, creating test operations that abstract HTTP details, or understanding the TestHelper pattern for business-level test abstractions in pkg/ops/.
allowed-tools: Read, Bash, Grep, Glob
---

# Acceptance Test Operations Skill

## When to Use This Skill

Use this skill when:

- Writing new test operations for API endpoints
- Adding business-level abstractions for tests
- Understanding existing operation patterns
- Refactoring test code to use operations
- Creating domain-specific test helpers
- Implementing new API endpoint wrappers

> **You MUST use TodoWrite** before starting to track all workflow steps when implementing or adding operations.

## Core Concept: Operations as Business Abstractions

**Operations** represent user actions at a business level (e.g., "Add Asset", "Delete Seed") and hide:

- HTTP endpoints and methods
- Request body formatting
- Response parsing and unmarshaling
- Error handling and wrapping
- Field hydration (setting fields not returned by API)

### Example - What Operations Hide

```go
// ❌ Without operations (raw HTTP details exposed)
body := map[string]any{"type": "asset", "group": "example.com", "identifier": "example.com"}
resp, err := client.Post("/asset", body)
if err != nil { /* handle */ }
var wrappers []registry.Wrapper[model.Assetlike]
json.Unmarshal(resp.Body, &wrappers)
asset := wrappers[0].Model
asset.GetBase().Username = user.Email  // Manual hydration

// ✅ With operations (business-level abstraction)
asset, err := helper.AddAsset(data)
```

---

## TestHelper: Central Operation Hub

### Structure Overview

```go
type TestHelper struct {
    User     users.User              // Cognito test user
    Client   *api.Client             // Authenticated API client
    Plextrac *plextrac.Manager       // PlexTrac integration client

    // Embedded data factory (methods promoted to TestHelper)
    *data.ModelDataFactory

    // Embedded assertors (methods promoted to TestHelper)
    *queue.QueueAssertor
    *data2.DataAssertor
    *table.TableAssertor
    *secrets.SecretsAssertor
    *files.FilesAssertor
    *users2.UsersAssertor
    *api2.APIAssertor
}
```

**Key components:**

1. **User management** - Unique Cognito test user per helper
2. **API client** - Authenticated HTTP client with proxy support
3. **Data factories** - Generate test data (embedded methods)
4. **Assertors** - Validation helpers (embedded methods)
5. **Operations** - Business-level methods (e.g., `AddAsset()`)

### Initialization

**Two helper types:**

```go
// 1. NewTestHelper - Active monitoring (for API tests)
helper, err := ops.NewTestHelper(t)

// 2. NewPassiveTestHelper - No monitoring (for compute tests)
helper, err := ops.NewPassiveTestHelper()
```

**When to use:**

- **NewTestHelper** - Standard API tests (need queue monitoring)
- **NewPassiveTestHelper** - Compute tests (manual queue control)

---

## Operation Patterns Overview

### Pattern 1: CRUD Operations (Standard)

**Most common** - applies to Assets, Seeds, Risks:

```go
// CREATE
helper.AddAsset(modelData)
helper.AddSeed(modelData)
helper.AddRisk(modelData, target)

// READ
helper.GetAsset(modelData)
helper.GetSeed(modelData)
helper.GetRisk(modelData)

// UPDATE
helper.UpdateAsset(modelData)
helper.UpdateSeed(modelData)
helper.UpdateRisk(modelData)

// DELETE
helper.DeleteAsset(modelData)
helper.DeleteSeed(modelData)
helper.DeleteRisk(modelData)
```

**See [references/patterns.md](references/patterns.md) for complete implementations.**

### Pattern 2: Account Operations

**Multi-tenant testing:**

```go
helper.AddAccount(account)    // Add user to account
helper.GetAccount(account)    // Get accounts for user
helper.DeleteAccount(account) // Remove user from account
```

### Pattern 3: File Operations

**File upload/download with S3:**

```go
helper.AddFile(file)              // Simple upload
helper.AddFileMultipart(file)     // Large files (parallel chunks)
helper.UpdateFile(file)           // Re-upload
helper.DeleteFile(file)           // Remove
helper.GetFileDownloadURL(name)   // Get presigned URL
helper.DownloadFile(name)         // Download content
```

### Pattern 4: Job Operations

**Async job management:**

```go
helper.CreateJobs(request)  // Create jobs with optional filter
helper.DeleteJob(jobKey)    // Cancel/delete job
helper.GetJob(jobKey)       // Retrieve job status
```

**See [references/patterns.md](references/patterns.md) for detailed implementations of all patterns.**

---

## Common Operation Patterns

All operations follow five shared patterns:

| Pattern                    | Purpose                   | Example                                    |
| -------------------------- | ------------------------- | ------------------------------------------ |
| **A. Type-Safe Requests**  | Automatic unmarshaling    | `web.Request[T](...)`                      |
| **B. Error Wrapping**      | Contextual error messages | `fmt.Errorf("...: %w", err)`               |
| **C. Optional Fields**     | Conditional inclusion     | `if field != "" { body["field"] = field }` |
| **D. Response Validation** | Early error detection     | `if len(results) == 0 { return error }`    |
| **E. Field Hydration**     | Complete test data        | `model.Username = h.Username`              |

### Pattern A: Type-Safe API Requests

```go
// Generic request with automatic unmarshaling
result, err := web.Request[ResponseType](
    h.Client,    // Authenticated client
    "METHOD",    // HTTP method
    "/path",     // API endpoint
    body,        // Request payload
)

response := result.Body  // Already typed as ResponseType
```

### Pattern B: Error Context Wrapping

```go
result, err := web.Request[T](h.Client, "POST", "/endpoint", body)
if err != nil {
    return nil, fmt.Errorf("failed to perform operation: %w", err)
}
```

### Pattern C: Optional Field Handling

```go
body := map[string]any{
    "required": modelData.Required,
}

// Conditionally include optional fields
if modelData.Comment != "" {
    body["comment"] = modelData.Comment
}
```

### Pattern D: Response Validation

```go
assets := result.Body.Assetlikes()

// Validate before returning
if len(assets) == 0 {
    return nil, fmt.Errorf("asset results are empty")
}

if len(assets) > 1 {
    return nil, fmt.Errorf("multiple asset results found")
}

return assets[0], nil
```

### Pattern E: Field Hydration

```go
asset := result.Body[0].Model

// Set fields not returned by API
asset.GetBase().Username = h.Username

return asset, nil
```

**See [references/common-patterns.md](references/common-patterns.md) for complete pattern details and examples.**

---

## File Organization

Operations are **organized by domain** in `pkg/ops/`:

```
pkg/ops/
├── helper.go        # TestHelper struct, initialization
├── assets.go        # Asset CRUD operations
├── seeds.go         # Seed CRUD operations
├── risks.go         # Risk CRUD operations
├── accounts.go      # Account management
├── files.go         # File upload/download
├── jobs.go          # Job creation/management
├── users.go         # User operations
├── capabilities.go  # Capability operations
├── export.go        # Data export
├── plextrac.go      # PlexTrac integration
└── async.go         # Async helpers
```

**Organization principles:**

- **Domain grouping** - Related operations in same file
- **Alphabetical order** - Predictable file ordering
- **Size balance** - Files under 300 lines when possible
- **Clear naming** - File name matches domain

**See [references/organization.md](references/organization.md) for complete structure details.**

---

## Adding New Operations

### Quick Decision Tree

```
Does operation fit existing domain?
├─ YES → Add to existing file (assets.go, seeds.go, etc.)
└─ NO → Create new domain file (mynewdomain.go)
```

### Operation Template

```go
func (h *TestHelper) MyOperation(input MyInputType) (MyReturnType, error) {
    // 1. Build request body
    body := map[string]any{
        "requiredField": input.RequiredField,
    }

    // 2. Handle optional fields (Pattern C)
    if input.OptionalField != "" {
        body["optionalField"] = input.OptionalField
    }

    // 3. Make type-safe request (Pattern A)
    result, err := web.Request[MyResponseType](
        h.Client, "POST", "/my/endpoint", body)

    // 4. Wrap errors (Pattern B)
    if err != nil {
        return nil, fmt.Errorf("failed to perform operation: %w", err)
    }

    // 5. Validate response (Pattern D)
    response := result.Body
    if !response.IsValid() {
        return nil, fmt.Errorf("invalid response from API")
    }

    // 6. Hydrate fields (Pattern E)
    response.SomeField = h.User.Email

    return response, nil
}
```

### Usage in Tests

```go
func Test_MyOperation(t *testing.T) {
    t.Parallel()

    // Initialize helper
    helper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    // Generate test data
    input := MyInputType{RequiredField: "value"}

    // Call operation
    result, err := helper.MyOperation(input)
    require.NoError(t, err)

    // Validate
    assert.NotNil(t, result)
    helper.AssertTableItemInserted(t, result)
}
```

**See [references/adding-operations.md](references/adding-operations.md) for complete step-by-step guide.**

---

## Operation Lifecycle in Tests

### Standard Test Flow

```go
func Test_AssetWorkflow(t *testing.T) {
    t.Parallel()

    // 1. Initialize helper
    helper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    // 2. Generate test data
    asset := helper.GenerateDomainAssetData()

    // 3. CREATE
    created, err := helper.AddAsset(asset)
    require.NoError(t, err)

    // 4. Validate creation
    helper.ValidateAsset(t, created, asset)

    // 5. READ
    queried, err := helper.GetAsset(created)
    require.NoError(t, err)

    // 6. UPDATE
    queried.SetStatus(model.Frozen)
    updated, err := helper.UpdateAsset(queried)
    require.NoError(t, err)

    // 7. Assert async effects
    helper.AssertJobsQueuedForTarget(t, updated)

    // 8. DELETE
    deleted, err := helper.DeleteAsset(updated)
    require.NoError(t, err)

    // 9. Automatic cleanup via t.Cleanup
}
```

---

## Best Practices Summary

### ✅ Do's (Top 5)

1. **Use descriptive names** - `AddAsset` (clear) vs `CreateAsset` (generic)
2. **Return strong types** - `(model.Asset, error)` vs `(interface{}, error)`
3. **Wrap all errors** - `fmt.Errorf("failed: %w", err)` preserves chain
4. **Validate responses** - Check for empty/multiple results before returning
5. **Organize by domain** - Group related operations in same file

### ❌ Don'ts (Top 5)

1. **Don't expose HTTP details** - Use business names, not endpoints
2. **Don't return raw responses** - Return typed models, not `*http.Response`
3. **Don't ignore errors** - Always check and wrap with context
4. **Don't mix concerns** - Separate operations from assertions
5. **Don't skip validation** - Check results exist before accessing

**See [references/best-practices.md](references/best-practices.md) for complete guide with examples.**

---

## Quick Reference

### Pattern Usage

| Need                | Pattern             | Example                                           |
| ------------------- | ------------------- | ------------------------------------------------- |
| API call            | Type-Safe Request   | `web.Request[T](h.Client, "POST", "/path", body)` |
| Error handling      | Error Wrapping      | `fmt.Errorf("failed to add: %w", err)`            |
| Non-required fields | Optional Fields     | `if field != "" { body["field"] = field }`        |
| Check API response  | Response Validation | `if len(results) == 0 { return error }`           |
| Missing API fields  | Field Hydration     | `model.Username = h.Username`                     |

### Common Operations

| Resource | CREATE       | READ           | UPDATE        | DELETE        |
| -------- | ------------ | -------------- | ------------- | ------------- |
| Assets   | `AddAsset`   | `GetAsset`     | `UpdateAsset` | `DeleteAsset` |
| Seeds    | `AddSeed`    | `GetSeed`      | `UpdateSeed`  | `DeleteSeed`  |
| Risks    | `AddRisk`    | `GetRisk`      | `UpdateRisk`  | `DeleteRisk`  |
| Files    | `AddFile`    | `DownloadFile` | `UpdateFile`  | `DeleteFile`  |
| Jobs     | `CreateJobs` | `GetJob`       | -             | `DeleteJob`   |

---

## Summary

**Operations Package Purpose:**

- **Business abstraction layer** - Hide technical API details
- **Type-safe operations** - Strongly-typed inputs and outputs
- **Test ergonomics** - Simple, descriptive operation names
- **Error handling** - Consistent error wrapping and context

**Key Patterns:**

1. **CRUD operations** - Standard Create/Read/Update/Delete
2. **Type-safe HTTP** - Generic `web.Request[T]()`
3. **Error wrapping** - Contextual messages with `%w`
4. **Response validation** - Check before returning
5. **Field hydration** - Set fields not returned by API

**Integration:**

- Operations are **methods on TestHelper**
- Called directly: `helper.AddAsset(data)`
- Combined with **data factories** for generation
- Combined with **assertors** for validation
- Automatic **cleanup** via TestHelper lifecycle

---

## Reference Documentation

**Detailed guides:**

- [patterns.md](references/patterns.md) - Four main operation patterns with complete implementations
- [common-patterns.md](references/common-patterns.md) - Five shared patterns across all operations
- [adding-operations.md](references/adding-operations.md) - Step-by-step guide for creating new operations
- [best-practices.md](references/best-practices.md) - Comprehensive do's and don'ts with examples
- [organization.md](references/organization.md) - File structure and domain organization

**Quick links:**

- [Operation patterns](references/patterns.md) - CRUD, Account, File, Job patterns
- [Common patterns](references/common-patterns.md) - Type-safe requests, error wrapping, validation
- [Adding operations](references/adding-operations.md) - Complete workflow for new operations
- [Best practices](references/best-practices.md) - What to do and what to avoid
- [File organization](references/organization.md) - How operations are structured
