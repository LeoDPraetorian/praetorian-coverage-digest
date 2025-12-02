# Common Operation Patterns

This document details the five common patterns shared across all operation implementations.

## Pattern A: Type-Safe API Requests

**All operations use generic type parameters** for automatic unmarshaling.

### Generic Request Pattern

```go
// Generic request with type parameter
result, err := web.Request[ResponseType](
    h.Client,    // Authenticated client
    "METHOD",    // HTTP method (GET, POST, PUT, DELETE)
    "/path",     // API endpoint
    body,        // Request payload (nil for GET/DELETE without body)
)

// result.Body is automatically typed as ResponseType
response := result.Body
```

### Examples by Return Type

**Returning slices:**
```go
// Returns []model.Job
result, err := web.Request[[]model.Job](h.Client, "POST", "/job", data)
jobs := result.Body  // Already typed as []model.Job
```

**Returning maps:**
```go
// Returns map[string]string (presigned URLs)
result, err := web.Request[map[string]string](h.Client, "PUT", "/file?name=x", nil)
presignedURL := result.Body["url"]
```

**Returning complex types with helper methods:**
```go
// Returns query.GraphSearch (with typed helper methods)
result, err := web.Request[query.GraphSearch](h.Client, "POST", "/my", query)
assets := result.Body.Assetlikes()  // Extract assets
risks := result.Body.Risks()        // Extract risks
```

**Returning single models:**
```go
// Returns single model
result, err := web.Request[model.Account](h.Client, "POST", "/account/member", body)
account := result.Body  // Already typed as model.Account
```

### Benefits

- **Type safety** - Compile-time type checking
- **No manual unmarshaling** - Automatic JSON parsing
- **IntelliSense support** - IDE autocomplete on result.Body
- **Refactoring safety** - Type changes caught at compile time

---

## Pattern B: Error Context Wrapping

**All operations wrap errors** with contextual information.

### Standard Error Wrapping

```go
result, err := web.Request[T](h.Client, "POST", "/endpoint", body)
if err != nil {
    return nil, fmt.Errorf("failed to perform operation: %w", err)
}
```

### Benefits

- **Error chain preservation** - Original error via `errors.Unwrap()`
- **Contextual messages** - Understand where error occurred
- **Stack traces** - When used with error tracking libraries
- **Test failure clarity** - Know which operation failed

### Example Error Chain

```go
// Operation wraps API error
err := helper.AddAsset(data)
// Error: "failed to create asset: request failed: 401 Unauthorized"

// Can unwrap to get original error
originalErr := errors.Unwrap(err)
```

### Multi-Level Wrapping

```go
func (h *TestHelper) AddAsset(data model.Assetlike) (model.Assetlike, error) {
    // Low-level error from HTTP client
    result, err := web.Request[T](h.Client, "PUT", "/asset", body)
    if err != nil {
        // Wrap with operation context
        return nil, fmt.Errorf("failed to create asset: %w", err)
    }

    // Validation error with additional context
    if len(result.Body) == 0 {
        return nil, fmt.Errorf("asset creation returned empty response")
    }

    return result.Body[0].Model, nil
}
```

---

## Pattern C: Optional Field Handling

**Operations conditionally include optional fields** to avoid API validation errors.

### Standard Optional Field Pattern

```go
func (h *TestHelper) AddRisk(modelData *model.Risk, target model.Target) (*model.Risk, error) {
    // Required fields always included
    body := map[string]any{
        "key":    target.GetKey(),
        "name":   modelData.Name,
        "status": modelData.Status,
    }

    // Optional fields - only include if present
    if modelData.Comment != "" {
        body["comment"] = modelData.Comment
    }

    tags := modelData.Tags
    if len(tags.Tags) > 0 {
        body["tags"] = tags
    }

    // Make request with conditional body
    result, err := web.Request[query.GraphSearch](h.Client, "PUT", "/risk", body)
    // ...
}
```

### Checking Different Field Types

**String fields:**
```go
if modelData.Comment != "" {
    body["comment"] = modelData.Comment
}
```

**Slice fields:**
```go
if len(modelData.Capabilities) > 0 {
    body["capabilities"] = modelData.Capabilities
}
```

**Map fields:**
```go
if len(modelData.Config) > 0 {
    body["config"] = modelData.Config
}
```

**Pointer fields:**
```go
if modelData.OptionalField != nil {
    body["optionalField"] = modelData.OptionalField
}
```

### Why This Matters

- **API compatibility** - Some APIs reject null/empty fields
- **Validation avoidance** - API may validate present fields
- **Cleaner requests** - Only send necessary data
- **Backward compatibility** - New optional fields don't break old tests

---

## Pattern D: Response Validation

**Operations validate API responses** to catch errors early.

### Standard Validation Patterns

**Check for empty results:**
```go
func (h *TestHelper) GetAsset(modelData model.Assetlike) (model.Assetlike, error) {
    // Make request
    result, err := web.Request[query.GraphSearch](h.Client, "POST", "/my", body)
    if err != nil {
        return nil, fmt.Errorf("could not get asset: %w", err)
    }

    // Extract results
    assets := result.Body.Assetlikes()

    // Validate: Check for empty results
    if len(assets) == 0 {
        return nil, fmt.Errorf("asset results are empty")
    }

    // Validate: Check for unexpected multiple results
    if len(assets) > 1 {
        return nil, fmt.Errorf("multiple asset results found")
    }

    return assets[0], nil
}
```

### Common Validation Checks

**Empty results:**
```go
if len(results) == 0 {
    return nil, fmt.Errorf("expected resource not found")
}
```

**Multiple results (should be unique):**
```go
if len(results) > 1 {
    return nil, fmt.Errorf("multiple results found, expected single resource")
}
```

**Missing required fields:**
```go
if result.Body.RequiredField == "" {
    return nil, fmt.Errorf("response missing required field")
}
```

**Invalid status:**
```go
if result.Body.Status != model.Expected {
    return nil, fmt.Errorf("resource in unexpected state: %s", result.Body.Status)
}
```

### Validation vs Error Handling

**Validation** happens AFTER successful API call:
```go
// API call succeeded
result, err := web.Request[T](...)
if err != nil {
    return nil, fmt.Errorf("API call failed: %w", err)
}

// Validate response content
if !result.Body.IsValid() {
    return nil, fmt.Errorf("invalid response from API")
}
```

---

## Pattern E: Field Hydration

**Operations set fields not returned by API** to provide complete test data.

### Standard Hydration Pattern

```go
func (h *TestHelper) AddAsset(modelData model.Assetlike) (model.Assetlike, error) {
    result, err := web.Request[[]registry.Wrapper[model.Assetlike]](
        h.Client, "PUT", "/asset", body)
    if err != nil {
        return nil, fmt.Errorf("failed to create asset: %w", err)
    }

    asset := result.Body[0].Model

    // Username is set at database layer, not returned by API
    // Hydrate it manually for test assertions
    asset.GetBase().Username = h.Username

    return asset, nil
}
```

### Why Hydration Is Needed

**API optimization:**
- API doesn't return redundant fields
- Reduces response payload size
- Improves API performance

**Database-set fields:**
- Some fields set by triggers/defaults
- Created/updated timestamps
- Auto-generated identifiers

**Test assertions:**
- Tests need complete models for validation
- Assertors compare full model state
- Enables deep equality checks

**Consistency:**
- Ensures test data matches actual database state
- Prevents test failures from missing fields

### Common Fields Requiring Hydration

**Username/email:**
```go
model.GetBase().Username = h.Username
```

**Timestamps (if not returned):**
```go
model.Created = time.Now()
model.Updated = time.Now()
```

**Account context:**
```go
model.AccountName = h.User.Email
```

---

## Pattern Integration Example

**All five patterns working together:**

```go
func (h *TestHelper) AddRisk(modelData *model.Risk, target model.Target) (*model.Risk, error) {
    // PATTERN C: Optional field handling
    body := map[string]any{
        "key":    target.GetKey(),
        "name":   modelData.Name,
        "status": modelData.Status,
    }

    if modelData.Comment != "" {
        body["comment"] = modelData.Comment
    }

    // PATTERN A: Type-safe API request
    result, err := web.Request[query.GraphSearch](h.Client, "PUT", "/risk", body)

    // PATTERN B: Error wrapping
    if err != nil {
        return nil, fmt.Errorf("failed to create risk: %w", err)
    }

    risks := result.Body.Risks()

    // PATTERN D: Response validation
    if len(risks) == 0 {
        return nil, fmt.Errorf("risk creation returned empty response")
    }

    risk := risks[0]

    // PATTERN E: Field hydration
    risk.Username = h.Username

    return risk, nil
}
```

---

## Quick Reference Table

| Pattern | Purpose | Example |
|---------|---------|---------|
| **A. Type-Safe Requests** | Automatic unmarshaling | `web.Request[T](...)` |
| **B. Error Wrapping** | Contextual error messages | `fmt.Errorf("...: %w", err)` |
| **C. Optional Fields** | Conditional inclusion | `if field != "" { body["field"] = field }` |
| **D. Response Validation** | Early error detection | `if len(results) == 0 { return error }` |
| **E. Field Hydration** | Complete test data | `model.Username = h.Username` |

## Anti-Patterns to Avoid

**❌ Don't skip validation:**
```go
// Bad - assumes result exists
return result.Body[0], nil

// Good - validates before accessing
if len(result.Body) == 0 {
    return nil, fmt.Errorf("no results")
}
return result.Body[0], nil
```

**❌ Don't ignore errors:**
```go
// Bad
result, _ := web.Request[T](h.Client, "POST", "/endpoint", body)

// Good
result, err := web.Request[T](h.Client, "POST", "/endpoint", body)
if err != nil {
    return nil, fmt.Errorf("operation failed: %w", err)
}
```

**❌ Don't include empty optional fields:**
```go
// Bad - always includes empty string
body["comment"] = modelData.Comment

// Good - conditionally includes
if modelData.Comment != "" {
    body["comment"] = modelData.Comment
}
```

**❌ Don't use manual unmarshaling:**
```go
// Bad - manual unmarshaling
resp, err := h.Client.Post("/asset", body)
var asset model.Asset
json.Unmarshal(resp.Body, &asset)

// Good - type-safe request
result, err := web.Request[model.Asset](h.Client, "POST", "/asset", body)
asset := result.Body  // Already typed
```

**❌ Don't skip error wrapping:**
```go
// Bad - loses context
return err

// Good - adds context
return fmt.Errorf("failed to add asset: %w", err)
```
