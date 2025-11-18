---
name: acceptance-test-operations
description: This skill provides comprehensive guidance for working with the Chariot acceptance test operations system (`pkg/ops/`) - high-level, business-oriented operations that abstract away technical API details for test ergonomics.
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

## Core Concept: Operations as Business Abstractions

**Operations** represent user actions at a business level (e.g., "Add Asset", "Delete Seed") and hide:
- HTTP endpoints and methods
- Request body formatting
- Response parsing and unmarshaling
- Error handling and wrapping
- Field hydration (setting fields not returned by API)

**Example - What operations hide:**

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

### Structure

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
func NewTestHelper(t *testing.T) (*TestHelper, error) {
    h, err := NewPassiveTestHelper()
    if err != nil {
        return nil, err
    }

    // Start queue monitoring (background goroutines)
    h.QueueAssertor.Start()

    // Register cleanup
    t.Cleanup(func() {
        h.Cleanup()
    })

    return h, nil
}

// 2. NewPassiveTestHelper - No monitoring (for compute tests)
func NewPassiveTestHelper() (*TestHelper, error) {
    // 1. Create unique test user
    user, err := users.CreateUser()

    // 2. Create authenticated API client
    client, err := api.NewClient(user.Email, user.Password)

    // 3. Set proxy if configured (for debugging)
    proxyURL := config.Get("HTTP_PROXY")
    if proxyURL != "" {
        client.SetProxy(proxyURL)
    }

    // 4. Initialize assertors
    tableAssertor, err := table.NewTableAssertor(user.Email)
    filesAssertor, err := files.NewFilesAssertor(user.Email)
    // ... other assertors

    // 5. Create helper
    return &TestHelper{
        User:             user,
        Client:           client,
        ModelDataFactory: data.NewModelDataFactory(user.Email),
        // ... assertors
    }, nil
}
```

**When to use:**
- **NewTestHelper** - Standard API tests (need queue monitoring)
- **NewPassiveTestHelper** - Compute tests (manual queue control)

---

## Operation Patterns

### Pattern 1: CRUD Operations (Standard)

**Most common pattern** - applies to Assets, Seeds, Risks:

```go
// CREATE - Add new resource
func (h *TestHelper) AddAsset(modelData model.Assetlike) (model.Assetlike, error)
func (h *TestHelper) AddSeed(modelData model.Assetlike) (model.Assetlike, error)
func (h *TestHelper) AddRisk(modelData *model.Risk, target model.Target) (*model.Risk, error)

// READ - Retrieve by key
func (h *TestHelper) GetAsset(modelData model.Assetlike) (model.Assetlike, error)
func (h *TestHelper) GetSeed(modelData model.Assetlike) (model.Assetlike, error)
func (h *TestHelper) GetRisk(modelData *model.Risk) (*model.Risk, error)

// UPDATE - Modify existing
func (h *TestHelper) UpdateAsset(modelData model.Assetlike) (model.Assetlike, error)
func (h *TestHelper) UpdateSeed(modelData model.Assetlike) (model.Assetlike, error)
func (h *TestHelper) UpdateRisk(modelData *model.Risk) (*model.Risk, error)

// DELETE - Remove resource
func (h *TestHelper) DeleteAsset(modelData model.Assetlike) (model.Assetlike, error)
func (h *TestHelper) DeleteSeed(modelData model.Assetlike) (model.Assetlike, error)
func (h *TestHelper) DeleteRisk(modelData *model.Risk) (*model.Risk, error)
```

**Standard CRUD operation structure:**

```go
func (h *TestHelper) AddAsset(modelData model.Assetlike) (model.Assetlike, error) {
    // 1. Extract model type information
    tipe := registry.Name(modelData)

    // 2. Build API request body
    body := map[string]any{
        "type":       strings.ToLower(tipe),
        "group":      modelData.GetBase().Group,
        "identifier": modelData.GetBase().Identifier,
        "status":     modelData.GetStatus(),
    }

    // 3. Make type-safe API request
    result, err := web.Request[[]registry.Wrapper[model.Assetlike]](
        h.Client,     // Authenticated client
        "PUT",        // HTTP method
        "/asset",     // API endpoint
        body,         // Request payload
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create asset: %w", err)
    }

    // 4. Extract model from response
    wrappers := result.Body
    asset := wrappers[0].Model

    // 5. Hydrate fields not returned by API
    asset.GetBase().Username = h.Username

    return asset, nil
}
```

**Key steps:**
1. **Type inference** - Use `registry.Name()` to determine model type
2. **Request building** - Map fields to API format
3. **Type-safe HTTP** - Generic `web.Request[T]()` for automatic unmarshaling
4. **Response extraction** - Unwrap from API wrapper types
5. **Field hydration** - Set fields API doesn't return (e.g., username)

**Usage in tests:**

```go
func Test_AddAsset(t *testing.T) {
    t.Parallel()
    helper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    // Generate test data
    asset := helper.GenerateDomainAssetData()

    // Call operation
    created, err := helper.AddAsset(asset)
    require.NoError(t, err)

    // Validate
    helper.ValidateAsset(t, created, asset)
}
```

---

### Pattern 2: Account Operations

**Account management** for multi-tenant testing:

```go
// Add user to account (collaboration)
func (h *TestHelper) AddAccount(account *model.Account) (*model.Account, error)

// Get accounts for current user
func (h *TestHelper) GetAccount(account *model.Account) (*model.Account, error)

// Remove user from account
func (h *TestHelper) DeleteAccount(account *model.Account) error
```

**Implementation with optional fields:**

```go
func (h *TestHelper) AddAccount(account *model.Account) (*model.Account, error) {
    // Required fields
    body := map[string]any{
        "value": account.Value,
    }

    // Optional fields - conditionally include
    if len(account.Secret) > 0 {
        body["secret"] = account.Secret
    }

    if len(account.Settings) > 0 {
        body["settings"] = account.Settings
    }

    // URL-encoded member in path
    result, err := web.Request[model.Account](
        h.Client,
        "POST",
        fmt.Sprintf("/account/%s", account.Member),
        body,
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create account: %w", err)
    }

    return &result.Body, nil
}
```

**Multi-user test pattern:**

```go
func Test_AddAccount_User(t *testing.T) {
    t.Parallel()

    // Create two independent test users
    ownerHelper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    memberHelper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    // Owner adds member to account
    account := &model.Account{
        Name:     ownerHelper.User.Email,
        Member:   memberHelper.Username,
        Settings: settingsJSON,
        Secret:   credentials,
    }

    created, err := ownerHelper.AddAccount(account)
    require.NoError(t, err)

    // Both users can see the account
    ownerHelper.AssertTableItemInserted(t, created)
    memberHelper.AssertTableItemInserted(t, created)
}
```

---

### Pattern 3: File Operations

**File upload/download** with S3 presigned URLs:

```go
// Simple upload (small files)
func (h *TestHelper) AddFile(file *model.File) error

// Multipart upload (large files, parallel chunks)
func (h *TestHelper) AddFileMultipart(file *model.File) error

// Update file (re-upload)
func (h *TestHelper) UpdateFile(file *model.File) error

// Delete file
func (h *TestHelper) DeleteFile(file *model.File) error

// Download operations
func (h *TestHelper) GetFileDownloadURL(fileName string) (string, error)
func (h *TestHelper) DownloadFile(fileName string) ([]byte, error)
```

**Simple upload flow:**

```go
func (h *TestHelper) AddFile(file *model.File) error {
    fileName := url.QueryEscape(file.Name)

    // 1. Get presigned upload URL from API
    result, err := web.Request[map[string]string](
        h.Client,
        "PUT",
        fmt.Sprintf("/file?name=%s", fileName),
        nil,
    )
    if err != nil {
        return fmt.Errorf("failed to get upload URL: %w", err)
    }

    presignedURL := result.Body["url"]

    // 2. Upload directly to S3 using presigned URL
    _, err = h.Client.ExternalRequest(
        "PUT",
        presignedURL,
        bytes.NewReader(file.Bytes),
    )
    if err != nil {
        return fmt.Errorf("failed to upload file: %w", err)
    }

    return nil
}
```

**Multipart upload for large files:**

```go
func (h *TestHelper) AddFileMultipart(file *model.File) error {
    // 1. Start multipart upload (get upload ID)
    uploadID, err := h.startMultipartUpload(file)
    if err != nil {
        return fmt.Errorf("failed to start multipart upload: %w", err)
    }

    // 2. Upload parts in parallel (10 concurrent, 100MB chunks)
    completedParts, err := h.uploadMultipartData(uploadID, file)
    if err != nil {
        return fmt.Errorf("failed to upload multipart data: %w", err)
    }

    // 3. Complete multipart upload
    if err = h.completeMultipartUpload(file.Name, uploadID, completedParts); err != nil {
        return fmt.Errorf("failed to complete multipart upload: %w", err)
    }

    return nil
}

// Parallel upload with semaphore for concurrency control
func (h *TestHelper) uploadMultipartData(uploadID string, file *model.File) ([]MultipartUploadPart, error) {
    const maxConcurrent = 10
    const chunkSize = 100 * 1024 * 1024  // 100MB chunks

    numParts := (len(file.Bytes) + chunkSize - 1) / chunkSize
    completedParts := make([]MultipartUploadPart, numParts)
    semaphore := make(chan struct{}, maxConcurrent)

    var wg sync.WaitGroup
    for partNumber := 1; partNumber <= numParts; partNumber++ {
        wg.Add(1)

        go func(partNum int) {
            defer wg.Done()

            semaphore <- struct{}{}        // Acquire slot
            defer func() { <-semaphore }() // Release slot

            h.uploadPart(partNum, file, completedParts, uploadID)
        }(partNumber)
    }

    wg.Wait()
    return completedParts, nil
}
```

**Usage in tests:**

```go
func Test_FileUpload(t *testing.T) {
    t.Parallel()
    helper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    // Small file - simple upload
    file := &model.File{
        Name:  "test.txt",
        Bytes: []byte("test content"),
    }
    err = helper.AddFile(file)
    require.NoError(t, err)

    // Large file - multipart upload
    largeFile := &model.File{
        Name:  "large.bin",
        Bytes: make([]byte, 500*1024*1024), // 500MB
    }
    err = helper.AddFileMultipart(largeFile)
    require.NoError(t, err)

    // Verify file exists
    helper.AssertFileExists(t, file)
}
```

---

### Pattern 4: Job Operations

**Job creation and management:**

```go
// Create jobs for target with optional capabilities filter
func (h *TestHelper) CreateJobs(request model.Job) ([]model.Job, error)

// Cancel/delete job
func (h *TestHelper) DeleteJob(jobKey string) error

// Retrieve job status
func (h *TestHelper) GetJob(jobKey string) (model.Job, error)
```

**Implementation:**

```go
func (h *TestHelper) CreateJobs(request model.Job) ([]model.Job, error) {
    data := map[string]any{
        "key": request.Key,  // Target key
    }

    // Optional capabilities filter
    if len(request.Capabilities) > 0 {
        data["capabilities"] = request.Capabilities
    }

    // Optional configuration
    if len(request.Config) > 0 {
        data["config"] = request.Config
    }

    result, err := web.Request[[]model.Job](h.Client, "POST", "/job", data)
    if err != nil {
        return nil, fmt.Errorf("failed to create jobs: %w", err)
    }

    return result.Body, nil
}
```

**Usage pattern:**

```go
func Test_CreateJobs(t *testing.T) {
    t.Parallel()
    helper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    // Create asset
    asset := helper.GenerateDomainAssetData()
    created, err := helper.AddAsset(asset)
    require.NoError(t, err)

    // Create jobs for specific capabilities
    jobRequest := model.Job{
        Key:          created.GetKey(),
        Capabilities: []string{"subdomain", "portscan"},
    }

    jobs, err := helper.CreateJobs(jobRequest)
    require.NoError(t, err)
    assert.Len(t, jobs, 2)

    // Wait for processing
    time.Sleep(10 * time.Second)

    // Check job status
    for _, job := range jobs {
        retrieved, err := helper.GetJob(job.Key)
        require.NoError(t, err)
        assert.Equal(t, model.Completed, retrieved.Status)
    }
}
```

---

## Common Operation Patterns

### Pattern A: Type-Safe API Requests

**All operations use generic type parameters** for automatic unmarshaling:

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

**Examples:**

```go
// Returns []model.Job
result, err := web.Request[[]model.Job](h.Client, "POST", "/job", data)
jobs := result.Body  // Already typed as []model.Job

// Returns map[string]string (presigned URLs)
result, err := web.Request[map[string]string](h.Client, "PUT", "/file?name=x", nil)
presignedURL := result.Body["url"]

// Returns query.GraphSearch (with typed helper methods)
result, err := web.Request[query.GraphSearch](h.Client, "POST", "/my", query)
assets := result.Body.Assetlikes()  // Extract assets
risks := result.Body.Risks()        // Extract risks

// Returns single model
result, err := web.Request[model.Account](h.Client, "POST", "/account/member", body)
account := result.Body  // Already typed as model.Account
```

**Benefits:**
- **Type safety** - Compile-time type checking
- **No manual unmarshaling** - Automatic JSON parsing
- **IntelliSense support** - IDE autocomplete on result.Body
- **Refactoring safety** - Type changes caught at compile time

### Pattern B: Error Context Wrapping

**All operations wrap errors** with contextual information:

```go
result, err := web.Request[T](h.Client, "POST", "/endpoint", body)
if err != nil {
    return nil, fmt.Errorf("failed to perform operation: %w", err)
}
```

**Error wrapping benefits:**
- **Error chain preservation** - Original error via `errors.Unwrap()`
- **Contextual messages** - Understand where error occurred
- **Stack traces** - When used with error tracking libraries
- **Test failure clarity** - Know which operation failed

**Example error chain:**

```go
// Operation wraps API error
err := helper.AddAsset(data)
// Error: "failed to create asset: request failed: 401 Unauthorized"

// Can unwrap to get original error
originalErr := errors.Unwrap(err)
```

### Pattern C: Optional Field Handling

**Operations conditionally include optional fields:**

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

**Why this matters:**
- **API compatibility** - Some APIs reject null/empty fields
- **Validation avoidance** - API may validate present fields
- **Cleaner requests** - Only send necessary data
- **Backward compatibility** - New optional fields don't break old tests

### Pattern D: Response Validation

**Operations validate API responses** to catch errors early:

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

**Common validations:**
- **Empty results** - Expected item not found
- **Multiple results** - Unexpected duplicates (should be unique)
- **Missing required fields** - Response missing expected data
- **Invalid status** - Resource in unexpected state

### Pattern E: Field Hydration

**Operations set fields not returned by API:**

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

**Why hydration is needed:**
- **API optimization** - API doesn't return redundant fields
- **Database-set fields** - Some fields set by triggers/defaults
- **Test assertions** - Tests need complete models for validation
- **Consistency** - Ensures test data matches actual database state

---

## File Organization

Operations are **organized by domain** in separate files:

```
pkg/ops/
├── helper.go        # TestHelper struct, initialization, cleanup (126 lines)
├── assets.go        # Asset CRUD operations (99 lines)
├── seeds.go         # Seed CRUD operations (92 lines)
├── risks.go         # Risk CRUD operations (118 lines)
├── accounts.go      # Account management operations (62 lines)
├── files.go         # File upload/download operations (227 lines)
├── jobs.go          # Job creation/management operations (66 lines)
├── users.go         # User management operations
├── capabilities.go  # Capability-related operations
├── export.go        # Data export operations
├── plextrac.go      # PlexTrac integration operations
└── async.go         # Async operation helpers

Total: ~1,100 lines of operation code
```

**Organization principles:**
- **Domain grouping** - Related operations in same file
- **Alphabetical order** - Files sorted alphabetically
- **Size balance** - Files kept under 300 lines when possible
- **Clear naming** - File name matches domain (assets.go, seeds.go, etc.)

---

## Adding New Operations

### Step 1: Choose the Right File

**Decision tree:**

```
Does operation fit existing domain?
├─ YES → Add to existing file (assets.go, seeds.go, etc.)
└─ NO → Create new domain file
    Example: mynewdomain.go
```

**Existing domains:**
- **assets.go** - Asset CRUD operations
- **seeds.go** - Seed CRUD operations
- **risks.go** - Risk CRUD operations
- **accounts.go** - Account/collaboration management
- **files.go** - File upload/download/multipart
- **jobs.go** - Job creation/deletion/status
- **users.go** - User management
- **capabilities.go** - Capability operations
- **export.go** - Data export functionality
- **plextrac.go** - PlexTrac integration

### Step 2: Define the Operation

**Template for new operation:**

```go
// pkg/ops/mynewdomain.go (or existing domain file)
package ops

import (
    "fmt"
    "github.com/praetorian-inc/chariot/backend/pkg/lib/web"
    "github.com/praetorian-inc/tabularium/pkg/model/model"
)

// MyOperation performs a specific business operation
// Returns the created/updated resource and any error
func (h *TestHelper) MyOperation(input MyInputType) (MyReturnType, error) {
    // 1. Build API request body
    body := map[string]any{
        "requiredField": input.RequiredField,
    }

    // 2. Handle optional fields
    if input.OptionalField != "" {
        body["optionalField"] = input.OptionalField
    }

    // 3. Make type-safe API request
    result, err := web.Request[MyResponseType](
        h.Client,
        "POST",           // HTTP method
        "/my/endpoint",   // API endpoint
        body,             // Request payload
    )
    if err != nil {
        return nil, fmt.Errorf("failed to perform my operation: %w", err)
    }

    // 4. Extract and validate response
    response := result.Body

    if !response.IsValid() {
        return nil, fmt.Errorf("invalid response from API")
    }

    // 5. Hydrate fields if needed
    response.SomeField = h.User.Email

    // 6. Transform to expected return type (if needed)
    returnValue := transformResponse(response)

    return returnValue, nil
}
```

**Key components:**
1. **Descriptive name** - Business-level operation name
2. **Input parameter** - Strongly-typed input model
3. **Return type** - Strongly-typed output model + error
4. **Request building** - Map input to API format
5. **Type-safe HTTP** - Use `web.Request[T]()`
6. **Error wrapping** - Contextual error messages
7. **Response validation** - Check for expected results
8. **Field hydration** - Set fields not returned by API

### Step 3: Add Helper Methods (if needed)

**For complex operations**, extract logic to private helpers:

```go
// Private helper for complex logic
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
    // Pre-process input
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

**When to use helpers:**
- **Complex transformations** - Multi-step data processing
- **Reusable logic** - Shared between multiple operations
- **Readability** - Breaking down complex operations
- **Testing** - Easier to unit test small helpers

### Step 4: Use in Tests

**Standard test usage:**

```go
func Test_MyOperation(t *testing.T) {
    t.Parallel()

    // Initialize helper
    helper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    // Generate test data (if using data factory)
    input := MyInputType{
        RequiredField: "value",
        OptionalField: "optional",
    }

    // Or use factory method
    // input := helper.GenerateMyInputData()

    // Call operation
    result, err := helper.MyOperation(input)
    require.NoError(t, err)

    // Validate result
    assert.NotNil(t, result)
    assert.Equal(t, "expected", result.SomeField)

    // Validate side effects (jobs, table, etc.)
    helper.AssertJobsQueuedForTarget(t, result)
    helper.AssertTableItemInserted(t, result)
}
```

---

## Operation Lifecycle in Tests

### Standard Test Flow

```go
func Test_AssetWorkflow(t *testing.T) {
    t.Parallel()

    // 1. Initialize helper (creates user, client, assertors)
    helper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    // 2. Generate test data
    asset := helper.GenerateDomainAssetData()

    // 3. CREATE - Add resource
    created, err := helper.AddAsset(asset)
    require.NoError(t, err)

    // 4. Validate creation
    helper.ValidateAsset(t, created, asset)

    // 5. READ - Query back to verify persistence
    asset.GetBase().Key = created.GetKey()
    queried, err := helper.GetAsset(asset)
    require.NoError(t, err)
    assert.Equal(t, created, queried)

    // 6. UPDATE - Modify resource
    queried.SetStatus(model.Frozen)
    updated, err := helper.UpdateAsset(queried)
    require.NoError(t, err)
    assert.Equal(t, model.Frozen, updated.GetStatus())

    // 7. Assert async effects (jobs queued)
    helper.AssertJobsQueuedForTarget(t, updated)

    // 8. DELETE - Remove resource
    deleted, err := helper.DeleteAsset(updated)
    require.NoError(t, err)
    assert.Equal(t, model.Deleted, deleted.GetStatus())

    // 9. Verify deletion effects
    helper.AssertNoJobsQueuedForTarget(t, deleted)

    // 10. Automatic cleanup (via t.Cleanup)
}
```

---

## Best Practices

### ✅ Do's

1. **Use descriptive operation names**
   - `AddAsset` ✅ (clear, business-level)
   - `CreateAsset` ❌ (too generic)
   - `InsertAsset` ❌ (implementation detail)

2. **Return strongly-typed models**
   - `(model.Asset, error)` ✅
   - `(interface{}, error)` ❌
   - `(*model.Asset, error)` ⚠️ (use interface when possible)

3. **Wrap all errors with context**
   - `fmt.Errorf("failed to add asset: %w", err)` ✅
   - `return err` ❌

4. **Validate responses**
   ```go
   // ✅ Good
   if len(results) == 0 {
       return nil, fmt.Errorf("no results returned")
   }

   // ❌ Bad - assumes results exist
   return results[0], nil
   ```

5. **Handle optional fields conditionally**
   ```go
   // ✅ Good
   if modelData.Comment != "" {
       body["comment"] = modelData.Comment
   }

   // ❌ Bad - always includes empty string
   body["comment"] = modelData.Comment
   ```

6. **Hydrate missing fields**
   ```go
   // ✅ Good
   asset.GetBase().Username = h.Username

   // ❌ Bad - leaves username empty
   return asset, nil
   ```

7. **Use web.Request[T] for type safety**
   ```go
   // ✅ Good
   result, err := web.Request[model.Asset](h.Client, "POST", "/asset", body)
   asset := result.Body  // Already typed

   // ❌ Bad - manual unmarshaling
   resp, err := h.Client.Post("/asset", body)
   var asset model.Asset
   json.Unmarshal(resp.Body, &asset)
   ```

8. **Organize by domain**
   - Group related operations in same file
   - Keep files under 300 lines when possible
   - Use clear, domain-specific file names

9. **Document complex operations**
   ```go
   // ✅ Good
   // AddFileMultipart uploads large files in parallel chunks (100MB each)
   // with up to 10 concurrent uploads. Use for files larger than 100MB.
   func (h *TestHelper) AddFileMultipart(file *model.File) error

   // ❌ Bad - no documentation
   func (h *TestHelper) AddFileMultipart(file *model.File) error
   ```

10. **Keep operations atomic**
    - One business action per operation
    - Don't combine unrelated operations
    - Extract common patterns to helpers

### ❌ Don'ts

1. **Don't expose HTTP details**
   ```go
   // ❌ Bad - exposes HTTP method and endpoint
   func (h *TestHelper) PostToAssetEndpoint(body map[string]any)

   // ✅ Good - business-level abstraction
   func (h *TestHelper) AddAsset(modelData model.Assetlike)
   ```

2. **Don't return raw HTTP responses**
   ```go
   // ❌ Bad
   func (h *TestHelper) AddAsset(data model.Assetlike) (*http.Response, error)

   // ✅ Good
   func (h *TestHelper) AddAsset(data model.Assetlike) (model.Assetlike, error)
   ```

3. **Don't ignore errors**
   ```go
   // ❌ Bad
   result, _ := web.Request[T](h.Client, "POST", "/endpoint", body)

   // ✅ Good
   result, err := web.Request[T](h.Client, "POST", "/endpoint", body)
   if err != nil {
       return nil, fmt.Errorf("operation failed: %w", err)
   }
   ```

4. **Don't mix concerns**
   ```go
   // ❌ Bad - mixes operation with assertion
   func (h *TestHelper) AddAssetAndValidate(t *testing.T, data model.Assetlike)

   // ✅ Good - separate operation and assertion
   asset, err := helper.AddAsset(data)
   helper.ValidateAsset(t, asset, data)
   ```

5. **Don't hard-code values**
   ```go
   // ❌ Bad
   func (h *TestHelper) CreateTestAsset() (model.Assetlike, error) {
       asset := &model.Asset{Group: "example.com", ...}

   // ✅ Good - use data factory
   asset := helper.GenerateDomainAssetData()
   ```

6. **Don't skip response validation**
   ```go
   // ❌ Bad - assumes result exists
   return result.Body[0], nil

   // ✅ Good - validates before accessing
   if len(result.Body) == 0 {
       return nil, fmt.Errorf("no results")
   }
   return result.Body[0], nil
   ```

7. **Don't create mega-operations**
   ```go
   // ❌ Bad - does too much
   func (h *TestHelper) CreateAssetAndWaitForJobsAndValidate(...)

   // ✅ Good - atomic operations
   asset := helper.AddAsset(data)
   time.Sleep(5 * time.Second)
   helper.AssertJobsQueuedForTarget(t, asset)
   ```

8. **Don't duplicate code**
   ```go
   // ❌ Bad - duplicated logic
   func (h *TestHelper) AddAsset1(...) { /* same logic */ }
   func (h *TestHelper) AddAsset2(...) { /* same logic */ }

   // ✅ Good - extract common pattern
   func (h *TestHelper) addAssetHelper(body map[string]any) (model.Assetlike, error)
   func (h *TestHelper) AddAsset(data model.Assetlike) (model.Assetlike, error) {
       body := buildBody(data)
       return h.addAssetHelper(body)
   }
   ```

---

## Summary

**Operations Package Purpose:**
- **Business abstraction layer** - Hide technical API details
- **Type-safe operations** - Strongly-typed inputs and outputs
- **Test ergonomics** - Simple, descriptive operation names
- **Error handling** - Consistent error wrapping and context

**Key Patterns:**
1. **CRUD operations** - Standard Create/Read/Update/Delete for resources
2. **Type-safe HTTP** - Generic `web.Request[T]()` for automatic unmarshaling
3. **Error wrapping** - Contextual error messages with `fmt.Errorf("...: %w", err)`
4. **Response validation** - Check for empty/multiple results before returning
5. **Field hydration** - Set fields not returned by API (e.g., username)
6. **Optional fields** - Conditionally include in request body
7. **Domain organization** - Group related operations in same file

**Adding Operations:**
1. Choose domain-specific file (or create new)
2. Define operation with type-safe signature
3. Build request body with required/optional fields
4. Make API call with `web.Request[T]()`
5. Validate and transform response
6. Hydrate missing fields
7. Return strongly-typed result with error

**Integration:**
- Operations are **methods on TestHelper**
- Called directly in tests: `helper.AddAsset(data)`
- Combined with **data factories** for test data generation
- Combined with **assertors** for validation after operations
- Automatic **user creation and cleanup** via TestHelper lifecycle

**File Organization:**
- ~1,100 lines across 13 domain files
- Each file under 300 lines for readability
- Clear naming convention (domain.go)
- Related operations grouped together
