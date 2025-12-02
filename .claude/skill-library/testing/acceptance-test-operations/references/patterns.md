# Operation Patterns - Detailed Implementation Guide

This document provides complete implementation details for the four main operation patterns used in Chariot acceptance tests.

## Pattern 1: CRUD Operations (Standard)

**Most common pattern** - applies to Assets, Seeds, Risks.

### Complete Method Signatures

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

### Standard CRUD Operation Structure

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

### Key Implementation Steps

1. **Type inference** - Use `registry.Name()` to determine model type
2. **Request building** - Map fields to API format
3. **Type-safe HTTP** - Generic `web.Request[T]()` for automatic unmarshaling
4. **Response extraction** - Unwrap from API wrapper types
5. **Field hydration** - Set fields API doesn't return (e.g., username)

### Usage in Tests

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

## Pattern 2: Account Operations

**Account management** for multi-tenant testing scenarios.

### Method Signatures

```go
// Add user to account (collaboration)
func (h *TestHelper) AddAccount(account *model.Account) (*model.Account, error)

// Get accounts for current user
func (h *TestHelper) GetAccount(account *model.Account) (*model.Account, error)

// Remove user from account
func (h *TestHelper) DeleteAccount(account *model.Account) error
```

### Implementation with Optional Fields

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

### Multi-User Test Pattern

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

## Pattern 3: File Operations

**File upload/download** with S3 presigned URLs.

### Method Signatures

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

### Simple Upload Flow

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

### Multipart Upload for Large Files

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

### Usage in Tests

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

## Pattern 4: Job Operations

**Job creation and management** for asynchronous operations.

### Method Signatures

```go
// Create jobs for target with optional capabilities filter
func (h *TestHelper) CreateJobs(request model.Job) ([]model.Job, error)

// Cancel/delete job
func (h *TestHelper) DeleteJob(jobKey string) error

// Retrieve job status
func (h *TestHelper) GetJob(jobKey string) (model.Job, error)
```

### Implementation

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

### Usage Pattern

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

## Pattern Selection Guide

| Use Case | Pattern | Example |
|----------|---------|---------|
| Asset/Seed/Risk management | CRUD Operations | `helper.AddAsset(asset)` |
| Multi-tenant scenarios | Account Operations | `helper.AddAccount(account)` |
| File uploads/downloads | File Operations | `helper.AddFile(file)` |
| Async job management | Job Operations | `helper.CreateJobs(request)` |

## Common Elements Across All Patterns

1. **Type-safe HTTP requests** - Generic `web.Request[T]()`
2. **Error wrapping** - Contextual error messages
3. **Optional field handling** - Conditional inclusion in request body
4. **Response validation** - Check for expected results before returning
5. **Field hydration** - Set fields not returned by API

See [common-patterns.md](common-patterns.md) for implementation details of these shared elements.
