---
name: acceptance-test-assertors
description: This skill provides comprehensive guidance for working with the Chariot acceptance test assertors system - specialized validation helpers for different aspects of the platform (SQS queues, DynamoDB, Neo4j, S3, model validation).
---

# Acceptance Test Assertors Skill

## When to Use This Skill

Use this skill when:
- Writing assertions in acceptance tests
- Adding new assertor types
- Understanding how assertors validate system state
- Debugging assertion failures
- Implementing custom conditions for filtering
- Integrating new AWS services into test validation

## Assertor Architecture

### Embedded Composition Pattern

Assertors are **embedded directly into TestHelper** for ergonomic access:

```go
type TestHelper struct {
    User             *lib.User
    Client           *api.Client
    ModelDataFactory data.ModelDataFactory

    // Embedded assertors - methods promoted to TestHelper
    *queue.QueueAssertor       // SQS queue monitoring
    *data2.DataAssertor        // Model validation
    *table.TableAssertor       // DynamoDB assertions
    *files.FilesAssertor       // S3 file assertions
    *api2.APIAssertor          // API endpoint assertions
    *secrets.SecretsAssertor   // Secrets Manager assertions
    *users2.UsersAssertor      // User/Cognito assertions
}
```

**Key benefit:** Tests call `helper.AssertJobsQueuedForTarget(t, asset)` instead of `helper.QueueAssertor.AssertJobsQueuedForTarget(t, asset)`.

**How it works:**
```go
// Embedded fields promote methods to parent struct
helper.AssertJobsQueuedForTarget(t, asset)
// Is actually: helper.QueueAssertor.AssertJobsQueuedForTarget(t, asset)
// But Go promotes embedded methods automatically
```

## Available Assertors

### 1. Queue Assertor (`pkg/assertors/queue/`)

**Purpose:** Monitors SQS queues in real-time to capture and validate async job processing.

**Core functionality:**
- Continuous monitoring of 6 SQS queues (priority/standard/synchronous × static/dynamic)
- Job capture with metadata (queue name, timestamp, content)
- Job filtering by target ID, job type, queue, or custom conditions
- Automatic cleanup on test completion

**Structure:**

```go
type QueueAssertor struct {
    sync.Mutex
    Queues        []string                    // 6 monitored queue URLs
    Done          chan bool                   // Signal to stop monitoring
    Service       *sqs.Client                 // AWS SQS client
    GracePeriod   time.Duration               // Wait time for async ops (5s default)
    Store         store.ItemStore[LoggedJob]  // Job storage (file or memory)
    QueueStatuses *Statuses                   // Track queue activity
}

type LoggedJob struct {
    Job   model.Job  // Captured job content
    Queue string     // Which queue it came from
}
```

**Lifecycle:**

```go
// 1. Automatic start on TestHelper creation
helper, err := ops.NewTestHelper(t)
// -> QueueAssertor.Start() launches background goroutines
// -> Each goroutine continuously polls one queue
// -> Jobs captured and stored as they arrive

// 2. Test performs operation that triggers jobs
asset, err := helper.AddAsset(data)

// 3. Test asserts jobs were queued
helper.AssertJobsQueuedForTarget(t, asset)
// -> Creates dummy job: model.NewJob("", asset)
// -> Checks store for jobs with matching key prefix
// -> Waits up to GracePeriod (5s) for stragglers
// -> Fails with DumpQueues() if not found

// 4. Automatic cleanup on test completion
// -> t.Cleanup() stops goroutines via Done channel
// -> Clears stored jobs
```

**Key assertion methods:**

```go
// Assert jobs exist for target
AssertJobsQueuedForTarget(t util.TBStub, target model.Target, conditions ...QueueCondition)

// Assert NO jobs for target
AssertNoJobsQueuedForTarget(t util.TBStub, target model.Target, conditions ...QueueCondition)

// Debugging: dump all queue contents
DumpQueues(t util.TBStub, conditions ...QueueCondition)

// Manual queue emptying (for compute tests)
EmptyQueue()
```

**How assertions work:**

```go
func (q *QueueAssertor) AssertJobsQueuedForTarget(t util.TBStub, target model.Target, conditions ...QueueCondition) {
    t.Helper()

    stragglerThreshold := time.Now().Add(q.GracePeriod)  // Wait up to 5s

    for {
        if q.assertQueues(target, conditions) {
            return  // Found matching jobs!
        }

        if time.Now().After(stragglerThreshold) {
            break  // Timeout reached
        }
    }

    // Failed - dump queue state for debugging
    q.DumpQueues(t, conditions...)
    t.Logf("expected jobs for target %q, but found none", target.GetKey())
    t.FailNow()
}

func (q *QueueAssertor) assertQueues(target model.Target, conditions []QueueCondition) bool {
    q.Lock()
    defer q.Unlock()

    // Create dummy job to get key prefix
    dummy := model.NewJob("", target)

    // Load all captured jobs
    loggedJobs, err := q.Store.LoadAll()
    if err != nil {
        return false
    }

    // Check for matching jobs
    for _, logged := range loggedJobs {
        hasPrefix := strings.HasPrefix(logged.Job.Key, dummy.Key)
        matchesConditions := q.matchesConditions(logged, conditions)

        if hasPrefix && matchesConditions {
            return true  // Found!
        }
    }

    return false
}
```

**Conditions pattern:**

```go
// Usage: Filter jobs by creation time
helper.AssertJobsQueuedForTarget(t, asset,
    queue.CreatedSince(time.Now().Add(-10*time.Second)),
)

// Implementation
type QueueCondition struct {
    conditions.TestCondition[LoggedJob]
}

func CreatedSince(since time.Time) QueueCondition {
    since = since.UTC()
    condition := func(logged LoggedJob) bool {
        created := logged.Job.Created
        jobCreatedTime, err := time.Parse(time.RFC3339, created)
        if err != nil {
            slog.Error("error parsing 'created' time", "job", logged.Job.Key)
            return false
        }
        return jobCreatedTime.After(since)
    }

    stringValue := fmt.Sprintf("Job.Created since %s", since.Format(time.RFC3339))

    return QueueCondition{
        TestCondition: conditions.NewTestCondition(condition, stringValue),
    }
}
```

**Storage backends:**

```go
// File-based (default) - writes to temp directory
Store: store.NewFilestore[LoggedJob]()

// Memory-based (testing only) - lost on process exit
Store: store.NewMemoryStore[LoggedJob]()
```

**Debugging with queue dumps:**

```go
// DumpQueues output on assertion failure
func (q *QueueAssertor) DumpQueues(t util.TBStub, conditions ...QueueCondition) {
    conditionMessage := q.StringConditions(conditions)
    if conditionMessage != "" {
        t.Log(conditionMessage)  // Log active conditions
    }

    loggedJobs, _ := q.Store.LoadAll()

    for _, queue := range queues {
        queueName := extractQueueName(queue)
        t.Logf("\nQueue: %q\n", queueName)

        for _, logged := range loggedJobs {
            if logged.Queue != queue {
                continue
            }

            job := logged.Job
            t.Logf("\t - %s\t(%s)\n", job.Key, job.Created)
        }
    }
}
```

**Usage examples:**

```go
// Basic assertion - wait for any jobs
helper.AssertJobsQueuedForTarget(t, asset)

// With time filter - only recent jobs
helper.AssertJobsQueuedForTarget(t, asset,
    queue.CreatedSince(time.Now().Add(-10*time.Second)),
)

// Assert no jobs queued
helper.AssertNoJobsQueuedForTarget(t, asset)

// Empty queue before test (compute tests)
helper.EmptyQueue()
```

---

### 2. Table Assertor (`pkg/assertors/table/`)

**Purpose:** Validates DynamoDB table data directly (bypasses API layer).

**Core functionality:**
- Direct DynamoDB access using backend query library
- Exact key matching for specific items
- Prefix matching for groups of items (e.g., all jobs for asset)
- Condition filtering on query results

**Structure:**

```go
type TableAssertor struct {
    Table      service.Table      // AWS DynamoDB client wrapper
    Conditions []TableCondition   // Filters applied to query results
}
```

**Key assertion methods:**

```go
// Assert specific item exists in table
AssertTableItemInserted(t util.TBStub, item model.TableModel, conditions ...TableCondition)

// Assert specific item does NOT exist
AssertTableItemNotInserted(t util.TBStub, item model.TableModel, conditions ...TableCondition)

// Assert items with prefix exist
AssertTablePrefixInserted(t util.TBStub, prefix string, conditions ...TableCondition)

// Assert NO items with prefix exist
AssertTablePrefixNotInserted(t util.TBStub, prefix string, conditions ...TableCondition)

// Debugging: dump table state
DumpTable(t util.TBStub, key string)
```

**How it works:**

```go
// Query types
func (v *TableAssertor) exactQuery(key string) *query.TableSearch {
    search := query.NewTableExactSearch(key)
    return v.doQuery(search)
}

func (v *TableAssertor) beginsWithQuery(prefix string) *query.TableSearch {
    search := query.NewTableBeginsWithSearch(prefix)
    return v.doQuery(search)
}

// Query execution with condition filtering
func (v *TableAssertor) doQuery(search query.TableSearch) *query.TableSearch {
    results := v.Table.Query(search)  // Execute DynamoDB query
    v.applyConditions(results)         // Filter by conditions
    return results
}

// Condition application
func (v *TableAssertor) applyConditions(results *query.TableSearch) {
    if len(v.Conditions) == 0 {
        return  // No filtering needed
    }

    selectedItems := map[string][]registry.Model{}

    for tipe, items := range results.Items {
        for _, item := range items {
            // Check all conditions
            success := true
            for _, condition := range v.Conditions {
                tableModel := item.(model.TableModel)
                if !condition.Condition(tableModel) {
                    success = false
                    break
                }
            }

            if success {
                selectedItems[tipe] = append(selectedItems[tipe], item)
            }
        }
    }

    results.Items = selectedItems  // Replace with filtered results
}
```

**Assertion implementation:**

```go
func (v *TableAssertor) AssertTableItemInserted(t util.TBStub, item model.TableModel, conditions ...TableCondition) {
    t.Helper()
    v.Conditions = conditions

    results := v.exactQuery(item.GetKey())

    if results.Count == 0 {
        v.DumpTable(t, item.GetKey())
        t.Errorf("expected item with key %q to be inserted in table, but found none", item.GetKey())
    }
}
```

**Conditions pattern:**

```go
// Filter by job status
func JobIsStatus(status string) TableCondition {
    condition := func(item model.TableModel) bool {
        job, ok := item.(*model.Job)
        if !ok {
            return false
        }
        return job.Is(status)
    }

    stringValue := fmt.Sprintf("Job.Status == %s", status)

    return TableCondition{
        TestCondition: conditions.NewTestCondition(condition, stringValue),
    }
}

// Filter by creation time
func CreatedSince(since time.Time) TableCondition {
    since = since.UTC()
    condition := func(item model.TableModel) bool {
        job, ok := item.(*model.Job)
        if !ok {
            return false
        }

        jobCreatedTime, err := time.Parse(time.RFC3339, job.Created)
        if err != nil {
            slog.Error("error parsing 'created' time", "job", job.Key)
            return false
        }

        return jobCreatedTime.After(since)
    }

    stringValue := fmt.Sprintf("Job.Created since %s", since.Format(time.RFC3339))

    return TableCondition{
        TestCondition: conditions.NewTestCondition(condition, stringValue),
    }
}
```

**Usage examples:**

```go
// Verify job was written to table
helper.AssertTablePrefixInserted(t, job.EmptyJob(asset).Key,
    table.JobIsStatus(model.Queued),
    table.CreatedSince(time.Now().Add(-10*time.Second)),
)

// Verify account was created
helper.AssertTableItemInserted(t, account)

// Verify account was NOT created
helper.AssertTableItemNotInserted(t, account)

// Verify no jobs with prefix exist
helper.AssertTablePrefixNotInserted(t, job.EmptyJob(asset).Key)
```

---

### 3. API Assertor (`pkg/assertors/api/`)

**Purpose:** Validates data existence through API endpoints (for compute tests).

**Core functionality:**
- Eventual consistency handling with automatic retries
- Graph model validation (Neo4j via API)
- Table model validation (DynamoDB via API)
- Configurable retry timeouts and intervals

**Structure:**

```go
type APIAssertor struct {
    Client         *api.Client
    assertDeadline time.Duration  // 90 seconds default
    assertInterval time.Duration  // 1 second default
}
```

**Key assertion methods:**

```go
// Assert graph model exists in Neo4j (via API)
AssertAPIGraphItemExists(t *testing.T, item model.GraphModel)

// Assert table model exists in DynamoDB (via API)
AssertAPITableItemExists(t *testing.T, item model.TableModel)

// Custom graph query assertion
AssertAPIGraphQuery(t *testing.T, q query.Query)
```

**How it works:**

```go
func (a *APIAssertor) AssertAPIGraphItemExists(t *testing.T, item model.GraphModel) {
    // Build query for this specific item
    name := registry.Name(item)
    label := model.GetLabel(name)

    q := query.Query{
        Node: query.Node{
            Labels: []string{label},
            Filters: []filters.Filter{
                filters.NewFilter("key", filters.OperatorEqual, item.GetKey()),
            },
        },
    }

    a.AssertAPIGraphQuery(t, q)
}

func (a *APIAssertor) AssertAPIGraphQuery(t *testing.T, q query.Query) {
    found, retries, err := checkIfExists(a, "POST", "/my", q)

    require.NoError(t, err)
    require.True(t, found, "query did not return any results after %d retries", retries)
}

// Retry logic with exponential backoff
func checkIfExists(a *APIAssertor, method, url string, body any) (bool, int, error) {
    deadline := time.Now().UTC().Add(a.assertDeadline)  // 90 seconds

    var results web.TypedHTTPResponse[collection.Collection]
    var err error
    var found bool
    var retries = 0

    for time.Now().Before(deadline) {
        results, err = web.Request[collection.Collection](a.Client, method, url, body)
        if err != nil {
            return false, 0, err
        }

        found = results.Body.Count > 0
        retries++

        if found {
            break
        }

        time.Sleep(a.assertInterval)  // Wait 1 second before retry
    }

    return found, retries, nil
}
```

**Usage in compute tests:**

```go
// Compute test validates capability outputs
func CapabilityResults(t *testing.T, helper *ops.TestHelper, capability model.Capability) {
    // Collect expected outputs
    c := expected2.NewCapabilityCollector(helper.User.Email)
    collected, err := c.Collect(capability, expected2.WithFull())
    require.NoError(t, err)

    // Validate graph models exist (Neo4j via API)
    for _, m := range collected.GraphModels {
        helper.AssertAPIGraphItemExists(t, m)
        if t.Failed() {
            t.Errorf("expected graph model %q for %s", m.GetKey(), capability.Name())
            t.FailNow()
        }
    }

    // Validate table models exist (DynamoDB via API)
    for _, m := range collected.TableModels {
        helper.AssertAPITableItemExists(t, m)
        if t.Failed() {
            t.Errorf("expected table model %q for %s", m.GetKey(), capability.Name())
            t.FailNow()
        }
    }

    // Validate files exist (S3 via API)
    for _, f := range collected.Files {
        helper.AssertFileExists(t, &f)
        if t.Failed() {
            t.Errorf("expected file %q for %s", f.GetKey(), capability.Name())
            t.FailNow()
        }
    }
}
```

**Why use API assertions:**
- **Compute tests** validate end-to-end flow including API layer
- **Eventual consistency** - retries handle Neo4j propagation delays
- **Isolation** - tests don't need direct database access
- **Realistic validation** - tests what users actually see

---

### 4. Data Assertor (`pkg/assertors/data/`)

**Purpose:** Validates model data structure and field values.

**Core functionality:**
- Model validity checks (required fields, correct types)
- Asset validation (labels, timestamps, source, origin)
- Risk validation (DNS, name, timestamps, status codes)
- History record validation (correct format and statuses)

**Structure:**

```go
type DataAssertor struct {
    Capabilities map[string]model.AgoraCapability  // For origin validation
}

func NewDataAssertor() *DataAssertor {
    return &DataAssertor{
        Capabilities: registries.New().GetCapabilities(),
    }
}
```

**Key assertion methods:**

```go
// Validate asset structure
ValidateAsset(t *testing.T, asset model.Assetlike, modelData model.Assetlike)

// Validate seed structure
ValidateSeed(t *testing.T, seed model.Assetlike, modelData model.Assetlike)

// Validate risk structure
ValidateRisk(t *testing.T, risk *model.Risk, modelData *model.Risk)

// Validate asset history records
ValidateAssetHistory(t *testing.T, history model.History, modelData model.Assetlike)

// Validate risk history records
ValidateRiskHistory(t *testing.T, history model.History, modelData *model.Risk)
```

**What it validates:**

```go
func (v *DataAssertor) ValidateAsset(t *testing.T, asset model.Assetlike, modelData model.Assetlike) {
    t.Helper()

    // 1. Core validity
    assert.True(t, asset.Valid())

    // 2. Required fields present
    assert.NotEmpty(t, asset.GetBase().Created, "asset.Created is empty")
    assert.NotEmpty(t, asset.GetBase().Visited, "asset.Visited is empty")
    assert.NotEmpty(t, asset.Group())
    assert.NotEmpty(t, asset.Identifier())

    // 3. Correct labels
    assert.Contains(t, asset.GetLabels(), model.AssetLabel)
    assert.Contains(t, asset.GetLabels(), model.TTLLabel)

    // 4. Valid source
    assert.Contains(t, []string{
        model.SeedSource,
        model.ProvidedSource,
        model.SelfSource,
        model.AccountSource,
    }, asset.GetSource())

    // 5. Valid origin (capability or username)
    origin := asset.GetBase().Origin
    isCapability := v.isCapability(origin)
    isUser := origin == modelData.GetBase().Username
    isEmpty := origin == ""
    assert.True(t, isCapability || isUser || isEmpty,
        "Asset origin is neither username nor capability: %q", origin)

    // 6. Fields match expected data
    assert.Equal(t, modelData.GetBase().Group, asset.Group())
    assert.Equal(t, modelData.GetBase().Identifier, asset.Identifier())
    assert.Equal(t, modelData.GetLabels(), asset.GetLabels())

    // 7. Validate history records
    v.ValidateAssetHistory(t, asset.GetBase().History, modelData)
}

func (v *DataAssertor) ValidateSeed(t *testing.T, seed model.Assetlike, modelData model.Assetlike) {
    t.Helper()

    assert.True(t, seed.Valid())

    // Seeds have specific source
    assert.Equal(t, model.SeedSource, seed.GetSource())

    // Seeds have specific labels
    assert.Contains(t, seed.GetLabels(), model.SeedLabel)
    assert.Contains(t, seed.GetLabels(), model.TTLLabel)

    // Delegate to asset validation
    modelData.SetSource(model.SeedSource)
    v.ValidateAsset(t, seed, modelData)
    v.ValidateAssetHistory(t, seed.GetBase().History, modelData)
}

func (v *DataAssertor) ValidateAssetHistory(t *testing.T, history model.History, modelData model.Assetlike) {
    t.Helper()

    for _, record := range history.History {
        byCapability := v.isCapability(record.By)
        byUser := record.By == modelData.GetBase().Username

        statuses := []string{"", model.Deleted, model.Active, model.Pending, model.Frozen, model.FrozenRejected}
        validFrom := slices.Contains(statuses, record.From)
        validTo := slices.Contains(statuses, record.To)

        assert.True(t, byUser || byCapability,
            "History record.By is neither capability nor username: %q", record.By)
        assert.True(t, validFrom, "History record.From invalid: %q", record.From)
        assert.True(t, validTo, "History record.To invalid: %q", record.To)
    }
}

func (v *DataAssertor) isCapability(value string) bool {
    _, byCapability := v.Capabilities[value]
    return byCapability
}
```

**Usage pattern:**

```go
// After creating asset via API
created, err := helper.AddAsset(data)
require.NoError(t, err)

// Validate structure is correct
helper.ValidateAsset(t, created, data)

// After querying back
queried, err := helper.GetAsset(data)
require.NoError(t, err)
assert.Equal(t, created, queried)
```

---

### 5. Files Assertor (`pkg/assertors/files/`)

**Purpose:** Validates S3 file operations.

**Core functionality:**
- File existence checks (verify files exist/don't exist)
- Content validation (compare file contents)
- Content retrieval (get file data for inspection)
- Debugging dumps (log file contents)

**Structure:**

```go
type FilesAssertor struct {
    Files service.Files  // AWS S3 client wrapper
}

func NewFilesAssertor(username string) (*FilesAssertor, error) {
    if config.Get("CHARIOT_TABLE") == "" {
        return nil, fmt.Errorf("CHARIOT_TABLE environment variable is not set")
    }

    aws := cloud.NewAWS(username)

    return &FilesAssertor{
        Files: aws.Files,
    }, nil
}
```

**Key assertion methods:**

```go
// Assert file exists in S3
AssertFileExists(t util.TBStub, fileData *model.File)

// Assert file does NOT exist
AssertFileNotExists(t util.TBStub, fileData *model.File)

// Assert file content matches expected
AssertFileContent(t util.TBStub, fileData *model.File)

// Debugging: dump file contents to test log
DumpFile(t util.TBStub, name string)

// Get file content for manual inspection
GetFileContent(name string) ([]byte, error)
```

**Implementation:**

```go
func (f *FilesAssertor) AssertFileExists(t util.TBStub, fileData *model.File) {
    t.Helper()

    name := fileData.Name
    require.NotEmpty(t, name, "file name is empty")

    exists, err := f.Files.Exists(name)
    if err != nil {
        t.Errorf("expected file %q to exist in S3, but got error: %v", name, err)
        return
    }

    if !exists {
        t.Errorf("expected file %q to exist in S3, but file was not found", name)
    }
}

func (f *FilesAssertor) AssertFileContent(t util.TBStub, fileData *model.File) {
    t.Helper()

    name := fileData.Name
    require.NotEmpty(t, name, "file name is empty")

    content, err := f.Files.Get(name)
    if err != nil {
        t.Errorf("expected file %q to exist in S3, but got error: %v", name, err)
        return
    }

    expectedContent := fileData.Bytes
    if !bytes.Equal(content, expectedContent) {
        t.Errorf("expected file %q to have content %q, but got %q",
            name, string(expectedContent), string(content))
    }
}
```

**Usage examples:**

```go
// Compute test validates file outputs
for _, f := range collected.Files {
    helper.AssertFileExists(t, &f)
}

// Validate file content matches
fileData := &model.File{
    Name:  "report.json",
    Bytes: []byte(`{"status": "complete"}`),
}
helper.AssertFileContent(t, fileData)

// Debug file contents
helper.DumpFile(t, "report.json")

// Get content for custom validation
content, err := helper.GetFileContent("report.json")
require.NoError(t, err)
var report Report
json.Unmarshal(content, &report)
assert.Equal(t, "complete", report.Status)
```

---

### 6. Secrets Assertor (`pkg/assertors/secrets/`)

**Purpose:** Validates AWS Secrets Manager operations.

**Usage:** Verify secrets are stored/retrieved correctly during integration tests.

### 7. Users Assertor (`pkg/assertors/users/`)

**Purpose:** Validates Cognito user operations.

**Usage:** Verify user creation, authentication, and permissions in acceptance tests.

---

## Condition System

All assertors support **reusable condition filters** via a generic interface.

### Generic Condition Interface

```go
// Base interface for all conditions
type TestCondition[T any] interface {
    Condition(T) bool  // Returns true if item matches
    String() string    // Human-readable description for debugging
}

// Implementation struct
type TestConditionImpl[T any] struct {
    ConditionFunc func(T) bool
    StringValue   string
}

func (c TestConditionImpl[T]) Condition(item T) bool {
    return c.ConditionFunc(item)
}

func (c TestConditionImpl[T]) String() string {
    return c.StringValue
}

// Constructor
func NewTestCondition[T any](conditionFunc func(T) bool, stringValue string) TestCondition[T] {
    return TestConditionImpl[T]{
        ConditionFunc: conditionFunc,
        StringValue:   stringValue,
    }
}
```

### Queue Conditions

```go
type QueueCondition struct {
    conditions.TestCondition[LoggedJob]
}

// Example: Filter by creation time
func CreatedSince(since time.Time) QueueCondition {
    since = since.UTC()

    condition := func(logged LoggedJob) bool {
        jobTime, err := time.Parse(time.RFC3339, logged.Job.Created)
        if err != nil {
            slog.Error("error parsing job time", "job", logged.Job.Key)
            return false
        }
        return jobTime.After(since)
    }

    stringValue := fmt.Sprintf("Job.Created since %s", since.Format(time.RFC3339))

    return QueueCondition{
        TestCondition: conditions.NewTestCondition(condition, stringValue),
    }
}
```

### Table Conditions

```go
type TableCondition struct {
    conditions.TestCondition[model.TableModel]
}

// Example: Filter by job status
func JobIsStatus(status string) TableCondition {
    condition := func(item model.TableModel) bool {
        job, ok := item.(*model.Job)
        return ok && job.Is(status)
    }

    stringValue := fmt.Sprintf("Job.Status == %s", status)

    return TableCondition{
        TestCondition: conditions.NewTestCondition(condition, stringValue),
    }
}

// Example: Filter by creation time
func CreatedSince(since time.Time) TableCondition {
    since = since.UTC()

    condition := func(item model.TableModel) bool {
        job, ok := item.(*model.Job)
        if !ok {
            return false
        }

        jobCreatedTime, err := time.Parse(time.RFC3339, job.Created)
        if err != nil {
            return false
        }

        return jobCreatedTime.After(since)
    }

    stringValue := fmt.Sprintf("Job.Created since %s", since.Format(time.RFC3339))

    return TableCondition{
        TestCondition: conditions.NewTestCondition(condition, stringValue),
    }
}
```

### Combining Conditions

```go
// Multiple conditions are AND'd together
helper.AssertTablePrefixInserted(t, jobKeyPrefix,
    table.JobIsStatus(model.Queued),          // AND
    table.CreatedSince(time.Now().Add(-10*time.Second)),  // AND
)

// All conditions must pass for item to match
func (v *TableAssertor) applyConditions(results *query.TableSearch) {
    for tipe, items := range results.Items {
        for _, item := range items {
            success := true
            for _, condition := range v.Conditions {
                tableModel := item.(model.TableModel)
                if !condition.Condition(tableModel) {
                    success = false  // Any condition fails = exclude item
                    break
                }
            }

            if success {
                selectedItems[tipe] = append(selectedItems[tipe], item)
            }
        }
    }
}
```

---

## Integration with TestHelper

### Initialization

```go
func NewTestHelper(t *testing.T) (*TestHelper, error) {
    // 1. Create user and API client
    user, err := lib.NewUser()
    if err != nil {
        return nil, fmt.Errorf("failed to create user: %w", err)
    }

    client, err := api.NewClient(user.AccessToken, user.Email)
    if err != nil {
        return nil, fmt.Errorf("failed to create client: %w", err)
    }

    // 2. Initialize assertors that need dependencies
    tableAssertor, err := table.NewTableAssertor(user.Email)
    if err != nil {
        return nil, fmt.Errorf("failed to create table assertor: %w", err)
    }

    filesAssertor, err := files.NewFilesAssertor(user.Email)
    if err != nil {
        return nil, fmt.Errorf("failed to create files assertor: %w", err)
    }

    secretsAssertor, err := secrets.NewSecretsAssertor(user.Email)
    if err != nil {
        return nil, fmt.Errorf("failed to create secrets assertor: %w", err)
    }

    usersAssertor, err := users2.NewUsersAssertor(user.Email)
    if err != nil {
        return nil, fmt.Errorf("failed to create users assertor: %w", err)
    }

    // 3. Create helper with embedded assertors
    h := &TestHelper{
        User:             user,
        Client:           client,
        ModelDataFactory: data.NewModelDataFactory(user.Email),

        // Embedded assertors - methods promoted to TestHelper
        DataAssertor:     data2.NewDataAssertor(),
        QueueAssertor:    queue.NewQueueAssertor(),
        APIAssertor:      api2.NewAPIAssertor(client),
        TableAssertor:    tableAssertor,
        SecretsAssertor:  secretsAssertor,
        FilesAssertor:    filesAssertor,
        UsersAssertor:    usersAssertor,
    }

    // 4. Start background monitoring
    h.QueueAssertor.Start()

    // 5. Register cleanup
    t.Cleanup(func() {
        h.Cleanup()
    })

    return h, nil
}
```

### Cleanup

```go
func (h *TestHelper) Cleanup() {
    h.QueueAssertor.Cleanup()  // Stop goroutines, clear store
    // Other assertors don't need explicit cleanup
}
```

---

## Invocation from Tests

### Direct Embedded Access

```go
func Test_AddAsset(t *testing.T) {
    t.Parallel()
    helper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    // Generate test data
    asset := helper.GenerateDomainAssetData()

    // Perform API operation
    created, err := helper.AddAsset(asset)
    require.NoError(t, err)

    // Use assertor methods directly on helper
    helper.ValidateAsset(t, created, asset)           // DataAssertor method
    helper.AssertJobsQueuedForTarget(t, created)       // QueueAssertor method
    helper.AssertTableItemInserted(t, created)         // TableAssertor method

    // With conditions
    helper.AssertTablePrefixInserted(t, job.EmptyJob(created).Key,
        table.JobIsStatus(model.Queued),
        table.CreatedSince(time.Now().Add(-10*time.Second)),
    )
}
```

**How embedding works:**

```go
// TestHelper embeds assertors anonymously
type TestHelper struct {
    *queue.QueueAssertor    // Methods promoted to TestHelper
    *data2.DataAssertor     // Methods promoted to TestHelper
    *table.TableAssertor    // Methods promoted to TestHelper
    // ...
}

// These are equivalent:
helper.AssertJobsQueuedForTarget(t, asset)
helper.QueueAssertor.AssertJobsQueuedForTarget(t, asset)

// Go automatically promotes embedded struct methods
```

---

## Adding New Assertors

### Step 1: Create Assertor Package

```go
// pkg/assertors/mynew/base.go
package mynew

import (
    "fmt"
    "github.com/praetorian-inc/chariot/backend/pkg/cloud"
    "github.com/praetorian-inc/chariot/backend/pkg/lib/config"
)

type MyAssertor struct {
    Service *myservice.Client
    // Add other dependencies
}

func NewMyAssertor(username string) (*MyAssertor, error) {
    // Validate environment
    if config.Get("MY_SERVICE_CONFIG") == "" {
        return nil, fmt.Errorf("MY_SERVICE_CONFIG not set")
    }

    // Initialize AWS or other clients
    aws := cloud.NewAWS(username)

    return &MyAssertor{
        Service: myservice.NewClient(aws.Config),
    }, nil
}
```

### Step 2: Add Assertion Methods

```go
// pkg/assertors/mynew/assertions.go
package mynew

import (
    "github.com/praetorian-inc/chariot/backend/pkg/testutils/util"
)

func (m *MyAssertor) AssertMyThingExists(t util.TBStub, data MyData) {
    t.Helper()

    // Perform validation
    result, err := m.Service.Query(data.Key)

    if err != nil || result == nil {
        m.DumpState(t, data.Key)
        t.Errorf("expected my thing %q to exist, but found none", data.Key)
    }
}

func (m *MyAssertor) AssertMyThingNotExists(t util.TBStub, data MyData) {
    t.Helper()

    result, err := m.Service.Query(data.Key)

    if err == nil && result != nil {
        m.DumpState(t, data.Key)
        t.Errorf("expected my thing %q to NOT exist, but found it", data.Key)
    }
}

func (m *MyAssertor) DumpState(t util.TBStub, key string) {
    t.Helper()

    // Query service for debugging info
    items, err := m.Service.ListAll()
    if err != nil {
        t.Logf("DumpState: Failed to list items: %v", err)
        return
    }

    t.Logf("\nMy Service State for key %q:\n", key)
    if len(items) == 0 {
        t.Log("\t(no items found)")
    } else {
        t.Logf("\tFound %d item(s)", len(items))
        for _, item := range items {
            t.Logf("\t - %s", item.Key)
        }
    }
}
```

### Step 3: Add Conditions (Optional)

```go
// pkg/assertors/mynew/conditions.go
package mynew

import (
    "fmt"
    "github.com/praetorian-inc/chariot/acceptance/pkg/assertors/conditions"
)

type MyCondition struct {
    conditions.TestCondition[MyType]
}

func MyStatusIs(status string) MyCondition {
    condition := func(item MyType) bool {
        return item.Status == status
    }

    stringValue := fmt.Sprintf("MyStatus == %s", status)

    return MyCondition{
        TestCondition: conditions.NewTestCondition(condition, stringValue),
    }
}

func MyCreatedSince(since time.Time) MyCondition {
    since = since.UTC()

    condition := func(item MyType) bool {
        itemTime, err := time.Parse(time.RFC3339, item.Created)
        if err != nil {
            return false
        }
        return itemTime.After(since)
    }

    stringValue := fmt.Sprintf("MyCreated since %s", since.Format(time.RFC3339))

    return MyCondition{
        TestCondition: conditions.NewTestCondition(condition, stringValue),
    }
}
```

### Step 4: Integrate into TestHelper

```go
// pkg/ops/helper.go

// 1. Add to TestHelper struct
type TestHelper struct {
    User             *lib.User
    Client           *api.Client
    ModelDataFactory data.ModelDataFactory

    // Existing assertors
    *queue.QueueAssertor
    *data2.DataAssertor
    *table.TableAssertor
    *files.FilesAssertor
    *api2.APIAssertor
    *secrets.SecretsAssertor
    *users2.UsersAssertor

    // Add your new assertor
    *mynew.MyAssertor
}

// 2. Initialize in NewTestHelper
func NewTestHelper(t *testing.T) (*TestHelper, error) {
    // ... existing setup ...

    // Initialize your assertor
    myAssertor, err := mynew.NewMyAssertor(user.Email)
    if err != nil {
        return nil, fmt.Errorf("failed to create my assertor: %w", err)
    }

    h := &TestHelper{
        // ... existing assertors ...
        MyAssertor: myAssertor,
    }

    return h, nil
}

// 3. Add cleanup if needed
func (h *TestHelper) Cleanup() {
    h.QueueAssertor.Cleanup()

    // Add cleanup for your assertor if needed
    if h.MyAssertor != nil {
        h.MyAssertor.Cleanup()
    }
}
```

### Step 5: Use in Tests

```go
func Test_MyFeature(t *testing.T) {
    t.Parallel()
    helper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    // Generate test data
    data := MyData{Key: "test-key", Status: "active"}

    // Perform operation
    result, err := helper.DoSomething(data)
    require.NoError(t, err)

    // Use your new assertor
    helper.AssertMyThingExists(t, result)

    // With conditions
    helper.AssertMyThingExists(t, result,
        mynew.MyStatusIs("active"),
        mynew.MyCreatedSince(time.Now().Add(-10*time.Second)),
    )
}
```

---

## Best Practices

### ✅ Do's

1. **Use `t.Helper()`** in all assertion methods
   - Ensures test failure location points to test code, not assertor code

2. **Provide debugging dumps** when assertions fail
   - `DumpQueues()`, `DumpTable()`, `DumpFile()` etc.
   - Log all relevant state for debugging

3. **Use conditions for flexible filtering**
   - Don't create `AssertJobQueuedWithStatusX()` variants
   - Use `AssertJobQueued(t, target, JobIsStatus("X"))` instead

4. **Handle eventual consistency**
   - Use retries and grace periods for async operations
   - QueueAssertor: 5s grace period
   - APIAssertor: 90s timeout with 1s intervals

5. **Clean up resources**
   - Implement `Cleanup()` for assertors with background tasks
   - Stop goroutines properly
   - Clear storage between tests

6. **Use generic conditions**
   - Leverage `TestCondition[T]` interface for reusability
   - Provide descriptive `String()` for debugging

7. **Embed into TestHelper**
   - Makes assertions ergonomic: `helper.AssertX()` instead of `helper.XAssertor.AssertX()`

8. **Fail with context**
   - Include key details in error messages
   - Example: `"expected jobs for target %q, but found none", target.GetKey()`

### ❌ Don'ts

1. **Don't skip `t.Helper()`**
   - Makes debugging much harder
   - Test failures point to wrong line

2. **Don't hard-code timeouts**
   - Use configurable grace periods
   - Allow tests to adjust timeouts if needed

3. **Don't silently fail**
   - Always log state on assertion failure
   - Provide actionable debugging information

4. **Don't create assertors in tests**
   - Use TestHelper initialization
   - Ensures proper setup and cleanup

5. **Don't forget cleanup**
   - Leaking goroutines causes flaky tests
   - Leaking storage causes memory issues

6. **Don't assume immediate consistency**
   - Use retries for async operations
   - Wait for SQS/DynamoDB/Neo4j propagation

7. **Don't create many assertion variants**
   - Use conditions instead of method proliferation
   - `AssertJobQueued(conditions...)` not `AssertJobQueuedWithStatusX()`

8. **Don't access assertors directly in tests**
   - Bad: `helper.QueueAssertor.AssertJobsQueuedForTarget()`
   - Good: `helper.AssertJobsQueuedForTarget()` (embedded method)

---

## Common Patterns

### Pattern 1: Queue Assertions with Conditions

```go
// Basic assertion - any jobs for target
helper.AssertJobsQueuedForTarget(t, asset)

// With time filter - only recent jobs
helper.AssertJobsQueuedForTarget(t, asset,
    queue.CreatedSince(time.Now().Add(-10*time.Second)),
)

// Assert no jobs
helper.AssertNoJobsQueuedForTarget(t, asset)
```

### Pattern 2: Table Assertions with Conditions

```go
// Verify job in table with status
helper.AssertTablePrefixInserted(t, job.EmptyJob(asset).Key,
    table.JobIsStatus(model.Queued),
    table.CreatedSince(time.Now().Add(-10*time.Second)),
)

// Verify item exists
helper.AssertTableItemInserted(t, account)

// Verify item doesn't exist
helper.AssertTableItemNotInserted(t, account)
```

### Pattern 3: Data Validation

```go
// After API operation
created, err := helper.AddAsset(data)
require.NoError(t, err)

// Validate structure
helper.ValidateAsset(t, created, data)

// Query back and verify
queried, err := helper.GetAsset(data)
require.NoError(t, err)
assert.Equal(t, created, queried)
```

### Pattern 4: Compute Test Assertions

```go
// Collect expected outputs
collected, err := c.Collect(capability)
require.NoError(t, err)

// Validate graph models (Neo4j via API)
for _, m := range collected.GraphModels {
    helper.AssertAPIGraphItemExists(t, m)
}

// Validate table models (DynamoDB via API)
for _, m := range collected.TableModels {
    helper.AssertAPITableItemExists(t, m)
}

// Validate files (S3 via API)
for _, f := range collected.Files {
    helper.AssertFileExists(t, &f)
}
```

---

## Debugging Assertions

### Queue Debugging

```go
// Assertion fails - DumpQueues called automatically
helper.AssertJobsQueuedForTarget(t, asset)

// Output:
// Conditions:
//   Job.Created since 2025-01-18T10:30:00Z
//
// Queue: "chariot-dev-queue-priority"
//   - #job#asset#example.com#subdomain  (2025-01-18T10:30:15Z)
//   - #job#asset#example.com#portscan   (2025-01-18T10:30:20Z)
//
// Queue: "chariot-dev-queue-standard"
//   (no jobs queued)
```

### Table Debugging

```go
// Assertion fails - DumpTable called automatically
helper.AssertTableItemInserted(t, account)

// Output:
// Conditions:
//   Job.Status == queued
//
// Table State for key pattern "#account#user@example.com":
//   Found 2 item(s)
//   - #account#user@example.com#member1
//   - #account#user@example.com#member2
```

### File Debugging

```go
// Manually dump file contents
helper.DumpFile(t, "report.json")

// Output:
// DumpFile: File "report.json" content:
// {"status": "complete", "findings": 42}
```

---

## Summary

**Assertor Types:**
1. **Queue Assertor** - Real-time SQS monitoring with job capture (background goroutines)
2. **Table Assertor** - Direct DynamoDB validation with condition filtering
3. **API Assertor** - Eventual consistency handling via API (for compute tests)
4. **Data Assertor** - Model structure validation (required fields, valid values)
5. **Files Assertor** - S3 file existence and content validation

**Core Patterns:**
- **Embedded composition** in TestHelper for ergonomic access
- **Reusable conditions** via generic `TestCondition[T]` interface
- **Automatic cleanup** via `t.Cleanup()`
- **Debug dumps** on assertion failures
- **Retry logic** for eventual consistency
- **Grace periods** for async operations

**When to add new assertors:**
- New storage backend (Redis, ElastiCache, etc.)
- New AWS service validation (Lambda, Step Functions, etc.)
- Complex domain-specific validation logic
- Reusable assertion patterns across multiple tests

**Integration:**
- Assertors embedded in TestHelper
- Initialized in `NewTestHelper()`
- Cleaned up in `Cleanup()`
- Used directly in tests: `helper.AssertX()`
