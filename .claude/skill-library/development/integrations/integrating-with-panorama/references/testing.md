# Panorama Testing Patterns

> Last Updated: January 2026

Comprehensive testing strategies for Panorama integrations, covering unit tests, integration tests, E2E workflows, and CI/CD integration.

---

## Overview

Testing Panorama integrations requires a multi-layered approach:

| Test Type         | Purpose                                         | Dependencies           | Speed  |
| ----------------- | ----------------------------------------------- | ---------------------- | ------ |
| Unit Tests        | Verify business logic, parsing, transformations | None (mocked)          | Fast   |
| Integration Tests | Verify API interactions                         | Panorama sandbox       | Medium |
| E2E Tests         | Verify full sync workflows                      | Real Panorama instance | Slow   |

### Testing Pyramid for Panorama

```
        /\
       /  \      E2E Tests (few)
      /----\     - Full sync workflows
     /      \    - Real instance validation
    /--------\
   /          \  Integration Tests (some)
  /   Mocked   \ - API operation verification
 /    Panorama  \- Commit workflow testing
/--------------\
|              | Unit Tests (many)
|  Pure Logic  | - XML parsing
|  No Network  | - Data transformations
|______________|  - Error handling
```

---

## Unit Testing

### Mock Client Patterns in Go

Create interfaces to enable mocking:

```go
// pkg/panorama/client.go
package panorama

import "context"

// Client defines the Panorama API interface
type Client interface {
    // Configuration operations
    GetAddressObjects(ctx context.Context, deviceGroup string) ([]AddressObject, error)
    CreateAddressObject(ctx context.Context, deviceGroup string, obj AddressObject) error
    UpdateAddressObject(ctx context.Context, deviceGroup string, obj AddressObject) error
    DeleteAddressObject(ctx context.Context, deviceGroup, name string) error

    // Commit operations
    Commit(ctx context.Context, opts CommitOptions) (string, error)
    GetCommitStatus(ctx context.Context, jobID string) (CommitStatus, error)

    // Device group operations
    GetDeviceGroups(ctx context.Context) ([]DeviceGroup, error)
}

// ClientImpl is the real implementation
type ClientImpl struct {
    baseURL  string
    apiKey   string
    http     *http.Client
}

// Ensure ClientImpl implements Client
var _ Client = (*ClientImpl)(nil)
```

### Mock Implementation with testify/mock

```go
// pkg/panorama/mock_client.go
package panorama

import (
    "context"

    "github.com/stretchr/testify/mock"
)

// MockClient is a mock implementation of Client
type MockClient struct {
    mock.Mock
}

func (m *MockClient) GetAddressObjects(ctx context.Context, deviceGroup string) ([]AddressObject, error) {
    args := m.Called(ctx, deviceGroup)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).([]AddressObject), args.Error(1)
}

func (m *MockClient) CreateAddressObject(ctx context.Context, deviceGroup string, obj AddressObject) error {
    args := m.Called(ctx, deviceGroup, obj)
    return args.Error(0)
}

func (m *MockClient) UpdateAddressObject(ctx context.Context, deviceGroup string, obj AddressObject) error {
    args := m.Called(ctx, deviceGroup, obj)
    return args.Error(0)
}

func (m *MockClient) DeleteAddressObject(ctx context.Context, deviceGroup, name string) error {
    args := m.Called(ctx, deviceGroup, name)
    return args.Error(0)
}

func (m *MockClient) Commit(ctx context.Context, opts CommitOptions) (string, error) {
    args := m.Called(ctx, opts)
    return args.String(0), args.Error(1)
}

func (m *MockClient) GetCommitStatus(ctx context.Context, jobID string) (CommitStatus, error) {
    args := m.Called(ctx, jobID)
    return args.Get(0).(CommitStatus), args.Error(1)
}

func (m *MockClient) GetDeviceGroups(ctx context.Context) ([]DeviceGroup, error) {
    args := m.Called(ctx)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).([]DeviceGroup), args.Error(1)
}
```

### Table-Driven Tests for API Operations

```go
// pkg/panorama/sync_test.go
package panorama

import (
    "context"
    "errors"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    "github.com/stretchr/testify/require"
)

func TestSyncAddressObjects(t *testing.T) {
    tests := []struct {
        name           string
        deviceGroup    string
        chariotAssets  []Asset
        panoramaState  []AddressObject
        setupMock      func(*MockClient)
        expectedCalls  map[string]int
        expectedError  string
    }{
        {
            name:        "creates new objects for new assets",
            deviceGroup: "production",
            chariotAssets: []Asset{
                {IP: "10.0.0.1", Name: "web-server-1"},
                {IP: "10.0.0.2", Name: "web-server-2"},
            },
            panoramaState: []AddressObject{},
            setupMock: func(m *MockClient) {
                m.On("GetAddressObjects", mock.Anything, "production").
                    Return([]AddressObject{}, nil)
                m.On("CreateAddressObject", mock.Anything, "production", mock.AnythingOfType("AddressObject")).
                    Return(nil).Times(2)
            },
            expectedCalls: map[string]int{
                "GetAddressObjects":    1,
                "CreateAddressObject":  2,
                "UpdateAddressObject":  0,
                "DeleteAddressObject":  0,
            },
        },
        {
            name:        "updates modified objects",
            deviceGroup: "production",
            chariotAssets: []Asset{
                {IP: "10.0.0.1", Name: "web-server-1-updated"},
            },
            panoramaState: []AddressObject{
                {Name: "chariot-10.0.0.1", IPNetmask: "10.0.0.1/32", Description: "web-server-1"},
            },
            setupMock: func(m *MockClient) {
                m.On("GetAddressObjects", mock.Anything, "production").
                    Return([]AddressObject{
                        {Name: "chariot-10.0.0.1", IPNetmask: "10.0.0.1/32", Description: "web-server-1"},
                    }, nil)
                m.On("UpdateAddressObject", mock.Anything, "production", mock.AnythingOfType("AddressObject")).
                    Return(nil)
            },
            expectedCalls: map[string]int{
                "GetAddressObjects":   1,
                "UpdateAddressObject": 1,
            },
        },
        {
            name:        "deletes orphaned objects",
            deviceGroup: "production",
            chariotAssets: []Asset{},
            panoramaState: []AddressObject{
                {Name: "chariot-10.0.0.1", IPNetmask: "10.0.0.1/32"},
            },
            setupMock: func(m *MockClient) {
                m.On("GetAddressObjects", mock.Anything, "production").
                    Return([]AddressObject{
                        {Name: "chariot-10.0.0.1", IPNetmask: "10.0.0.1/32"},
                    }, nil)
                m.On("DeleteAddressObject", mock.Anything, "production", "chariot-10.0.0.1").
                    Return(nil)
            },
            expectedCalls: map[string]int{
                "GetAddressObjects":   1,
                "DeleteAddressObject": 1,
            },
        },
        {
            name:        "handles API errors gracefully",
            deviceGroup: "production",
            chariotAssets: []Asset{
                {IP: "10.0.0.1", Name: "web-server-1"},
            },
            setupMock: func(m *MockClient) {
                m.On("GetAddressObjects", mock.Anything, "production").
                    Return(nil, errors.New("connection refused"))
            },
            expectedError: "failed to get existing objects: connection refused",
        },
        {
            name:        "preserves non-chariot objects",
            deviceGroup: "production",
            chariotAssets: []Asset{},
            panoramaState: []AddressObject{
                {Name: "manual-server", IPNetmask: "192.168.1.1/32"},
            },
            setupMock: func(m *MockClient) {
                m.On("GetAddressObjects", mock.Anything, "production").
                    Return([]AddressObject{
                        {Name: "manual-server", IPNetmask: "192.168.1.1/32"},
                    }, nil)
                // No delete call expected for non-chariot objects
            },
            expectedCalls: map[string]int{
                "GetAddressObjects":   1,
                "DeleteAddressObject": 0,
            },
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Setup
            mockClient := new(MockClient)
            tt.setupMock(mockClient)

            syncer := NewSyncer(mockClient)

            // Execute
            err := syncer.SyncAddressObjects(context.Background(), tt.deviceGroup, tt.chariotAssets)

            // Assert
            if tt.expectedError != "" {
                require.Error(t, err)
                assert.Contains(t, err.Error(), tt.expectedError)
                return
            }

            require.NoError(t, err)
            mockClient.AssertExpectations(t)
        })
    }
}
```

### Testing Error Handling

```go
// pkg/panorama/error_handling_test.go
package panorama

import (
    "context"
    "errors"
    "net/http"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestErrorClassification(t *testing.T) {
    tests := []struct {
        name          string
        apiError      error
        isRetryable   bool
        isAuthError   bool
        isRateLimited bool
    }{
        {
            name:        "authentication failure",
            apiError:    &APIError{StatusCode: 401, Message: "Invalid credentials"},
            isAuthError: true,
        },
        {
            name:          "rate limited",
            apiError:      &APIError{StatusCode: 429, Message: "Too many requests"},
            isRateLimited: true,
            isRetryable:   true,
        },
        {
            name:        "server error",
            apiError:    &APIError{StatusCode: 500, Message: "Internal server error"},
            isRetryable: true,
        },
        {
            name:        "bad request",
            apiError:    &APIError{StatusCode: 400, Message: "Invalid object name"},
            isRetryable: false,
        },
        {
            name:        "network timeout",
            apiError:    context.DeadlineExceeded,
            isRetryable: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            assert.Equal(t, tt.isRetryable, IsRetryable(tt.apiError))
            assert.Equal(t, tt.isAuthError, IsAuthError(tt.apiError))
            assert.Equal(t, tt.isRateLimited, IsRateLimited(tt.apiError))
        })
    }
}

func TestRetryBehavior(t *testing.T) {
    tests := []struct {
        name           string
        failCount      int
        maxRetries     int
        expectedCalls  int
        shouldSucceed  bool
    }{
        {
            name:          "succeeds on first try",
            failCount:     0,
            maxRetries:    3,
            expectedCalls: 1,
            shouldSucceed: true,
        },
        {
            name:          "succeeds after retry",
            failCount:     2,
            maxRetries:    3,
            expectedCalls: 3,
            shouldSucceed: true,
        },
        {
            name:          "fails after max retries",
            failCount:     5,
            maxRetries:    3,
            expectedCalls: 4, // initial + 3 retries
            shouldSucceed: false,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            callCount := 0
            operation := func() error {
                callCount++
                if callCount <= tt.failCount {
                    return &APIError{StatusCode: 500, Message: "Server error"}
                }
                return nil
            }

            err := WithRetry(context.Background(), operation, tt.maxRetries)

            assert.Equal(t, tt.expectedCalls, callCount)
            if tt.shouldSucceed {
                require.NoError(t, err)
            } else {
                require.Error(t, err)
            }
        })
    }
}
```

### Example Test File Structure

```
pkg/panorama/
├── client.go
├── client_test.go          # Unit tests for HTTP client
├── mock_client.go          # Mock implementation
├── sync.go
├── sync_test.go            # Unit tests for sync logic
├── transform.go
├── transform_test.go       # Unit tests for data transformation
├── errors.go
├── errors_test.go          # Unit tests for error handling
└── testdata/               # Test fixtures
    ├── address_objects.xml
    ├── security_rules.xml
    └── commit_response.xml
```

---

## Integration Testing

### Panorama Sandbox/Lab Environment Setup

```go
// pkg/panorama/integration_test.go
//go:build integration

package panorama

import (
    "context"
    "os"
    "testing"
    "time"

    "github.com/stretchr/testify/require"
    "github.com/stretchr/testify/suite"
)

type PanoramaIntegrationSuite struct {
    suite.Suite
    client      Client
    deviceGroup string
    testPrefix  string
}

func (s *PanoramaIntegrationSuite) SetupSuite() {
    // Require environment variables
    host := os.Getenv("PANORAMA_HOST")
    apiKey := os.Getenv("PANORAMA_API_KEY")
    s.deviceGroup = os.Getenv("PANORAMA_DEVICE_GROUP")

    if host == "" || apiKey == "" || s.deviceGroup == "" {
        s.T().Skip("PANORAMA_HOST, PANORAMA_API_KEY, and PANORAMA_DEVICE_GROUP must be set")
    }

    // Create client
    var err error
    s.client, err = NewClient(host, apiKey)
    require.NoError(s.T(), err)

    // Generate unique prefix for this test run
    s.testPrefix = fmt.Sprintf("test-%d", time.Now().Unix())
}

func (s *PanoramaIntegrationSuite) TearDownSuite() {
    // Clean up all test objects
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
    defer cancel()

    s.cleanupTestObjects(ctx)
}

func (s *PanoramaIntegrationSuite) cleanupTestObjects(ctx context.Context) {
    objects, err := s.client.GetAddressObjects(ctx, s.deviceGroup)
    if err != nil {
        s.T().Logf("Warning: failed to get objects for cleanup: %v", err)
        return
    }

    for _, obj := range objects {
        if strings.HasPrefix(obj.Name, s.testPrefix) {
            if err := s.client.DeleteAddressObject(ctx, s.deviceGroup, obj.Name); err != nil {
                s.T().Logf("Warning: failed to delete test object %s: %v", obj.Name, err)
            }
        }
    }

    // Commit cleanup changes
    _, _ = s.client.Commit(ctx, CommitOptions{
        DeviceGroups: []string{s.deviceGroup},
        Description:  "Test cleanup",
    })
}

func TestPanoramaIntegration(t *testing.T) {
    suite.Run(t, new(PanoramaIntegrationSuite))
}
```

### Test Fixtures and Data Management

```go
// pkg/panorama/fixtures_test.go
//go:build integration

package panorama

import (
    "context"
    "fmt"
)

// TestFixtures manages test data lifecycle
type TestFixtures struct {
    client      Client
    deviceGroup string
    prefix      string
    created     []string
}

func NewTestFixtures(client Client, deviceGroup, prefix string) *TestFixtures {
    return &TestFixtures{
        client:      client,
        deviceGroup: deviceGroup,
        prefix:      prefix,
        created:     make([]string, 0),
    }
}

// CreateAddressObject creates a test address object and tracks it for cleanup
func (f *TestFixtures) CreateAddressObject(ctx context.Context, ip, description string) (*AddressObject, error) {
    name := fmt.Sprintf("%s-%s", f.prefix, sanitizeName(ip))

    obj := AddressObject{
        Name:        name,
        IPNetmask:   fmt.Sprintf("%s/32", ip),
        Description: description,
        Tags:        []string{"chariot-test"},
    }

    if err := f.client.CreateAddressObject(ctx, f.deviceGroup, obj); err != nil {
        return nil, fmt.Errorf("failed to create fixture: %w", err)
    }

    f.created = append(f.created, name)
    return &obj, nil
}

// CreateSecurityRule creates a test security rule
func (f *TestFixtures) CreateSecurityRule(ctx context.Context, rule SecurityRule) error {
    rule.Name = fmt.Sprintf("%s-%s", f.prefix, rule.Name)

    if err := f.client.CreateSecurityRule(ctx, f.deviceGroup, rule); err != nil {
        return err
    }

    f.created = append(f.created, rule.Name)
    return nil
}

// Cleanup removes all created test objects
func (f *TestFixtures) Cleanup(ctx context.Context) error {
    var errs []error

    for _, name := range f.created {
        // Try to delete as address object
        if err := f.client.DeleteAddressObject(ctx, f.deviceGroup, name); err != nil {
            // Try as security rule
            if err := f.client.DeleteSecurityRule(ctx, f.deviceGroup, name); err != nil {
                errs = append(errs, fmt.Errorf("failed to delete %s: %w", name, err))
            }
        }
    }

    if len(errs) > 0 {
        return fmt.Errorf("cleanup errors: %v", errs)
    }

    return nil
}
```

### Testing Commit Workflows

```go
// pkg/panorama/commit_test.go
//go:build integration

package panorama

import (
    "context"
    "time"
)

func (s *PanoramaIntegrationSuite) TestCommitWorkflow() {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
    defer cancel()

    // Create test object
    objName := fmt.Sprintf("%s-commit-test", s.testPrefix)
    obj := AddressObject{
        Name:        objName,
        IPNetmask:   "10.99.99.99/32",
        Description: "Commit test object",
    }

    err := s.client.CreateAddressObject(ctx, s.deviceGroup, obj)
    require.NoError(s.T(), err)

    // Initiate commit
    jobID, err := s.client.Commit(ctx, CommitOptions{
        DeviceGroups: []string{s.deviceGroup},
        Description:  "Integration test commit",
    })
    require.NoError(s.T(), err)
    require.NotEmpty(s.T(), jobID)

    // Wait for commit to complete
    status, err := s.waitForCommit(ctx, jobID, 5*time.Minute)
    require.NoError(s.T(), err)
    assert.Equal(s.T(), CommitStatusCompleted, status.State)
    assert.Equal(s.T(), "OK", status.Result)

    // Verify object exists after commit
    objects, err := s.client.GetAddressObjects(ctx, s.deviceGroup)
    require.NoError(s.T(), err)

    found := false
    for _, o := range objects {
        if o.Name == objName {
            found = true
            break
        }
    }
    assert.True(s.T(), found, "Object should exist after commit")

    // Cleanup
    err = s.client.DeleteAddressObject(ctx, s.deviceGroup, objName)
    require.NoError(s.T(), err)
}

func (s *PanoramaIntegrationSuite) waitForCommit(ctx context.Context, jobID string, timeout time.Duration) (CommitStatus, error) {
    deadline := time.Now().Add(timeout)

    for time.Now().Before(deadline) {
        status, err := s.client.GetCommitStatus(ctx, jobID)
        if err != nil {
            return CommitStatus{}, err
        }

        switch status.State {
        case CommitStatusCompleted, CommitStatusFailed:
            return status, nil
        case CommitStatusPending, CommitStatusRunning:
            time.Sleep(5 * time.Second)
        default:
            return status, fmt.Errorf("unknown commit state: %s", status.State)
        }
    }

    return CommitStatus{}, fmt.Errorf("commit timeout after %v", timeout)
}
```

### Cleanup Strategies

```go
// pkg/panorama/cleanup_test.go
//go:build integration

package panorama

import (
    "context"
    "strings"
    "time"
)

// CleanupStrategy defines how test objects are cleaned up
type CleanupStrategy interface {
    Cleanup(ctx context.Context) error
}

// ImmediateCleanup cleans up objects immediately after each test
type ImmediateCleanup struct {
    fixtures *TestFixtures
}

func (c *ImmediateCleanup) Cleanup(ctx context.Context) error {
    return c.fixtures.Cleanup(ctx)
}

// DeferredCleanup batches cleanup at the end of the test suite
type DeferredCleanup struct {
    client      Client
    deviceGroup string
    prefixes    []string
}

func (c *DeferredCleanup) AddPrefix(prefix string) {
    c.prefixes = append(c.prefixes, prefix)
}

func (c *DeferredCleanup) Cleanup(ctx context.Context) error {
    objects, err := c.client.GetAddressObjects(ctx, c.deviceGroup)
    if err != nil {
        return err
    }

    for _, obj := range objects {
        for _, prefix := range c.prefixes {
            if strings.HasPrefix(obj.Name, prefix) {
                _ = c.client.DeleteAddressObject(ctx, c.deviceGroup, obj.Name)
                break
            }
        }
    }

    // Commit deletions
    _, err = c.client.Commit(ctx, CommitOptions{
        DeviceGroups: []string{c.deviceGroup},
        Description:  "Test cleanup",
    })

    return err
}

// AggressiveCleanup removes all chariot-prefixed objects (use with caution)
type AggressiveCleanup struct {
    client      Client
    deviceGroup string
}

func (c *AggressiveCleanup) Cleanup(ctx context.Context) error {
    objects, err := c.client.GetAddressObjects(ctx, c.deviceGroup)
    if err != nil {
        return err
    }

    for _, obj := range objects {
        if strings.HasPrefix(obj.Name, "chariot-") || strings.HasPrefix(obj.Name, "test-") {
            _ = c.client.DeleteAddressObject(ctx, c.deviceGroup, obj.Name)
        }
    }

    _, err = c.client.Commit(ctx, CommitOptions{
        DeviceGroups: []string{c.deviceGroup},
        Description:  "Aggressive test cleanup",
    })

    return err
}
```

---

## E2E Testing

### Full Sync Workflow Tests

```go
// pkg/panorama/e2e_test.go
//go:build e2e

package panorama

import (
    "context"
    "testing"
    "time"

    "github.com/stretchr/testify/require"
    "github.com/stretchr/testify/suite"
)

type PanoramaE2ESuite struct {
    suite.Suite
    panoramaClient Client
    chariotClient  *chariot.Client
    syncer         *Syncer
    deviceGroup    string
}

func (s *PanoramaE2ESuite) SetupSuite() {
    // Initialize Panorama client
    panoramaHost := os.Getenv("PANORAMA_HOST")
    panoramaKey := os.Getenv("PANORAMA_API_KEY")
    s.deviceGroup = os.Getenv("PANORAMA_DEVICE_GROUP")

    var err error
    s.panoramaClient, err = NewClient(panoramaHost, panoramaKey)
    require.NoError(s.T(), err)

    // Initialize Chariot client
    chariotAPI := os.Getenv("CHARIOT_API_URL")
    chariotKey := os.Getenv("CHARIOT_API_KEY")

    s.chariotClient, err = chariot.NewClient(chariotAPI, chariotKey)
    require.NoError(s.T(), err)

    // Initialize syncer
    s.syncer = NewSyncer(s.panoramaClient, s.chariotClient)
}

func (s *PanoramaE2ESuite) TestFullSyncWorkflow() {
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
    defer cancel()

    // Step 1: Get initial state
    initialObjects, err := s.panoramaClient.GetAddressObjects(ctx, s.deviceGroup)
    require.NoError(s.T(), err)
    initialCount := len(filterChariotObjects(initialObjects))

    // Step 2: Create test assets in Chariot
    testAssets := []chariot.Asset{
        {DNS: "e2e-test-1.example.com", Name: "E2E Test Server 1"},
        {DNS: "e2e-test-2.example.com", Name: "E2E Test Server 2"},
        {IP: "10.200.200.1", Name: "E2E Test IP 1"},
    }

    for _, asset := range testAssets {
        _, err := s.chariotClient.CreateAsset(ctx, asset)
        require.NoError(s.T(), err)
    }

    // Step 3: Run sync
    result, err := s.syncer.Sync(ctx, SyncOptions{
        DeviceGroup:   s.deviceGroup,
        CommitChanges: true,
        DryRun:        false,
    })
    require.NoError(s.T(), err)

    // Step 4: Verify sync results
    assert.GreaterOrEqual(s.T(), result.Created, 3)
    assert.Equal(s.T(), CommitStatusCompleted, result.CommitStatus)

    // Step 5: Verify objects in Panorama
    finalObjects, err := s.panoramaClient.GetAddressObjects(ctx, s.deviceGroup)
    require.NoError(s.T(), err)

    chariotObjects := filterChariotObjects(finalObjects)
    assert.GreaterOrEqual(s.T(), len(chariotObjects), initialCount+3)

    // Step 6: Verify specific objects
    objectMap := make(map[string]AddressObject)
    for _, obj := range chariotObjects {
        objectMap[obj.Name] = obj
    }

    assert.Contains(s.T(), objectMap, "chariot-e2e-test-1.example.com")
    assert.Contains(s.T(), objectMap, "chariot-e2e-test-2.example.com")
    assert.Contains(s.T(), objectMap, "chariot-10.200.200.1")
}

func (s *PanoramaE2ESuite) TestIncrementalSync() {
    ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
    defer cancel()

    // Initial sync
    _, err := s.syncer.Sync(ctx, SyncOptions{
        DeviceGroup:   s.deviceGroup,
        CommitChanges: true,
    })
    require.NoError(s.T(), err)

    // Add new asset
    _, err = s.chariotClient.CreateAsset(ctx, chariot.Asset{
        IP:   "10.200.200.100",
        Name: "Incremental Test",
    })
    require.NoError(s.T(), err)

    // Run incremental sync
    result, err := s.syncer.Sync(ctx, SyncOptions{
        DeviceGroup:   s.deviceGroup,
        CommitChanges: true,
        Incremental:   true,
    })
    require.NoError(s.T(), err)

    assert.Equal(s.T(), 1, result.Created)
    assert.Equal(s.T(), 0, result.Updated)
    assert.Equal(s.T(), 0, result.Deleted)
}

func filterChariotObjects(objects []AddressObject) []AddressObject {
    var result []AddressObject
    for _, obj := range objects {
        if strings.HasPrefix(obj.Name, "chariot-") {
            result = append(result, obj)
        }
    }
    return result
}

func TestPanoramaE2E(t *testing.T) {
    if os.Getenv("RUN_E2E_TESTS") != "true" {
        t.Skip("E2E tests disabled; set RUN_E2E_TESTS=true to run")
    }
    suite.Run(t, new(PanoramaE2ESuite))
}
```

### Environment Configuration

```go
// pkg/panorama/config_test.go
package panorama

import (
    "os"
)

// TestConfig holds configuration for different test environments
type TestConfig struct {
    PanoramaHost    string
    PanoramaAPIKey  string
    DeviceGroup     string
    ChariotAPI      string
    ChariotAPIKey   string
    TestPrefix      string
}

// LoadTestConfig loads configuration from environment variables
func LoadTestConfig() TestConfig {
    return TestConfig{
        PanoramaHost:   getEnvOrDefault("PANORAMA_HOST", "https://panorama-lab.example.com"),
        PanoramaAPIKey: os.Getenv("PANORAMA_API_KEY"),
        DeviceGroup:    getEnvOrDefault("PANORAMA_DEVICE_GROUP", "test-device-group"),
        ChariotAPI:     getEnvOrDefault("CHARIOT_API_URL", "https://api.chariot.praetorian.com"),
        ChariotAPIKey:  os.Getenv("CHARIOT_API_KEY"),
        TestPrefix:     getEnvOrDefault("TEST_PREFIX", "test"),
    }
}

func getEnvOrDefault(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}
```

---

## Mock Implementations

### Complete Mock Panorama Client

```go
// pkg/panorama/testutil/mock_server.go
package testutil

import (
    "encoding/xml"
    "net/http"
    "net/http/httptest"
    "sync"
)

// MockPanoramaServer provides a fake Panorama API for testing
type MockPanoramaServer struct {
    Server        *httptest.Server
    mu            sync.RWMutex
    addressObjs   map[string]map[string]AddressObject // deviceGroup -> name -> object
    securityRules map[string][]SecurityRule
    commits       map[string]CommitStatus
    nextJobID     int
}

func NewMockPanoramaServer() *MockPanoramaServer {
    m := &MockPanoramaServer{
        addressObjs:   make(map[string]map[string]AddressObject),
        securityRules: make(map[string][]SecurityRule),
        commits:       make(map[string]CommitStatus),
        nextJobID:     1000,
    }

    mux := http.NewServeMux()
    mux.HandleFunc("/api/", m.handleAPI)

    m.Server = httptest.NewServer(mux)
    return m
}

func (m *MockPanoramaServer) handleAPI(w http.ResponseWriter, r *http.Request) {
    apiType := r.URL.Query().Get("type")
    action := r.URL.Query().Get("action")

    switch {
    case apiType == "config" && action == "get":
        m.handleConfigGet(w, r)
    case apiType == "config" && action == "set":
        m.handleConfigSet(w, r)
    case apiType == "config" && action == "delete":
        m.handleConfigDelete(w, r)
    case apiType == "commit":
        m.handleCommit(w, r)
    case apiType == "op" && r.URL.Query().Get("cmd") != "":
        m.handleOperational(w, r)
    default:
        http.Error(w, "Unknown API call", http.StatusBadRequest)
    }
}

func (m *MockPanoramaServer) handleConfigGet(w http.ResponseWriter, r *http.Request) {
    xpath := r.URL.Query().Get("xpath")
    deviceGroup := extractDeviceGroup(xpath)

    m.mu.RLock()
    defer m.mu.RUnlock()

    if strings.Contains(xpath, "address") {
        objects := m.addressObjs[deviceGroup]
        response := buildAddressObjectResponse(objects)
        w.Header().Set("Content-Type", "application/xml")
        xml.NewEncoder(w).Encode(response)
        return
    }

    http.Error(w, "Unknown xpath", http.StatusBadRequest)
}

func (m *MockPanoramaServer) handleConfigSet(w http.ResponseWriter, r *http.Request) {
    xpath := r.URL.Query().Get("xpath")
    element := r.URL.Query().Get("element")
    deviceGroup := extractDeviceGroup(xpath)

    m.mu.Lock()
    defer m.mu.Unlock()

    if m.addressObjs[deviceGroup] == nil {
        m.addressObjs[deviceGroup] = make(map[string]AddressObject)
    }

    obj, err := parseAddressObject(element)
    if err != nil {
        writeErrorResponse(w, "Invalid element")
        return
    }

    m.addressObjs[deviceGroup][obj.Name] = obj
    writeSuccessResponse(w)
}

func (m *MockPanoramaServer) handleCommit(w http.ResponseWriter, r *http.Request) {
    m.mu.Lock()
    jobID := fmt.Sprintf("%d", m.nextJobID)
    m.nextJobID++

    // Simulate async commit - starts pending, completes after retrieval
    m.commits[jobID] = CommitStatus{
        JobID: jobID,
        State: CommitStatusPending,
    }
    m.mu.Unlock()

    // Simulate commit completing in background
    go func() {
        time.Sleep(100 * time.Millisecond)
        m.mu.Lock()
        m.commits[jobID] = CommitStatus{
            JobID:  jobID,
            State:  CommitStatusCompleted,
            Result: "OK",
        }
        m.mu.Unlock()
    }()

    writeCommitResponse(w, jobID)
}

func (m *MockPanoramaServer) Close() {
    m.Server.Close()
}

// URL returns the mock server URL
func (m *MockPanoramaServer) URL() string {
    return m.Server.URL
}

// SetAddressObjects pre-populates address objects for a device group
func (m *MockPanoramaServer) SetAddressObjects(deviceGroup string, objects []AddressObject) {
    m.mu.Lock()
    defer m.mu.Unlock()

    m.addressObjs[deviceGroup] = make(map[string]AddressObject)
    for _, obj := range objects {
        m.addressObjs[deviceGroup][obj.Name] = obj
    }
}
```

### Response Fixtures

```go
// pkg/panorama/testutil/fixtures.go
package testutil

// XML response fixtures
var (
    AddressObjectsResponseXML = `<?xml version="1.0"?>
<response status="success">
  <result>
    <entry name="chariot-10.0.0.1">
      <ip-netmask>10.0.0.1/32</ip-netmask>
      <description>Web Server 1</description>
      <tag>
        <member>chariot-managed</member>
      </tag>
    </entry>
    <entry name="chariot-10.0.0.2">
      <ip-netmask>10.0.0.2/32</ip-netmask>
      <description>Database Server</description>
      <tag>
        <member>chariot-managed</member>
      </tag>
    </entry>
  </result>
</response>`

    CommitSuccessResponseXML = `<?xml version="1.0"?>
<response status="success">
  <result>
    <job>12345</job>
  </result>
</response>`

    CommitStatusCompleteXML = `<?xml version="1.0"?>
<response status="success">
  <result>
    <job>
      <id>12345</id>
      <status>FIN</status>
      <result>OK</result>
      <progress>100</progress>
    </job>
  </result>
</response>`

    ErrorResponseXML = `<?xml version="1.0"?>
<response status="error">
  <msg>
    <line>Invalid object name</line>
  </msg>
</response>`
)

// FixtureAddressObjects returns test address objects
func FixtureAddressObjects() []AddressObject {
    return []AddressObject{
        {
            Name:        "chariot-10.0.0.1",
            IPNetmask:   "10.0.0.1/32",
            Description: "Web Server 1",
            Tags:        []string{"chariot-managed"},
        },
        {
            Name:        "chariot-10.0.0.2",
            IPNetmask:   "10.0.0.2/32",
            Description: "Database Server",
            Tags:        []string{"chariot-managed"},
        },
        {
            Name:        "manual-server",
            IPNetmask:   "192.168.1.100/32",
            Description: "Manually managed",
            Tags:        []string{"manual"},
        },
    }
}
```

### Error Simulation

```go
// pkg/panorama/testutil/error_simulation.go
package testutil

import (
    "net/http"
    "sync/atomic"
)

// ErrorSimulator allows controlled error injection
type ErrorSimulator struct {
    failNextN      int32
    failWithCode   int
    failWithMsg    string
    delayMs        int
}

func NewErrorSimulator() *ErrorSimulator {
    return &ErrorSimulator{}
}

// FailNext configures the next N requests to fail
func (e *ErrorSimulator) FailNext(n int, statusCode int, message string) {
    atomic.StoreInt32(&e.failNextN, int32(n))
    e.failWithCode = statusCode
    e.failWithMsg = message
}

// SetDelay adds artificial latency
func (e *ErrorSimulator) SetDelay(ms int) {
    e.delayMs = ms
}

// ShouldFail checks and decrements the failure counter
func (e *ErrorSimulator) ShouldFail() (bool, int, string) {
    if atomic.LoadInt32(&e.failNextN) > 0 {
        atomic.AddInt32(&e.failNextN, -1)
        return true, e.failWithCode, e.failWithMsg
    }
    return false, 0, ""
}

// Middleware creates an HTTP middleware for error simulation
func (e *ErrorSimulator) Middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if e.delayMs > 0 {
            time.Sleep(time.Duration(e.delayMs) * time.Millisecond)
        }

        if shouldFail, code, msg := e.ShouldFail(); shouldFail {
            http.Error(w, msg, code)
            return
        }

        next.ServeHTTP(w, r)
    })
}
```

---

## Test Utilities

### Helper Functions for Test Setup

```go
// pkg/panorama/testutil/helpers.go
package testutil

import (
    "context"
    "testing"
    "time"

    "github.com/stretchr/testify/require"
)

// SetupTestClient creates a client connected to the mock server
func SetupTestClient(t *testing.T) (*MockPanoramaServer, Client) {
    t.Helper()

    server := NewMockPanoramaServer()
    t.Cleanup(server.Close)

    client, err := NewClient(server.URL(), "test-api-key")
    require.NoError(t, err)

    return server, client
}

// SetupTestContext creates a context with timeout for tests
func SetupTestContext(t *testing.T, timeout time.Duration) (context.Context, context.CancelFunc) {
    t.Helper()
    return context.WithTimeout(context.Background(), timeout)
}

// RequireEventually retries an assertion until it passes or times out
func RequireEventually(t *testing.T, condition func() bool, timeout, interval time.Duration, msg string) {
    t.Helper()

    deadline := time.Now().Add(timeout)
    for time.Now().Before(deadline) {
        if condition() {
            return
        }
        time.Sleep(interval)
    }

    t.Fatalf("Condition not met within %v: %s", timeout, msg)
}

// SkipIfNoIntegration skips the test if integration tests are not enabled
func SkipIfNoIntegration(t *testing.T) {
    t.Helper()

    if os.Getenv("RUN_INTEGRATION_TESTS") != "true" {
        t.Skip("Integration tests disabled; set RUN_INTEGRATION_TESTS=true")
    }
}
```

### Assertion Helpers

```go
// pkg/panorama/testutil/assertions.go
package testutil

import (
    "testing"

    "github.com/stretchr/testify/assert"
)

// AssertAddressObjectEqual compares two address objects
func AssertAddressObjectEqual(t *testing.T, expected, actual AddressObject) {
    t.Helper()

    assert.Equal(t, expected.Name, actual.Name, "Name mismatch")
    assert.Equal(t, expected.IPNetmask, actual.IPNetmask, "IP-Netmask mismatch")
    assert.Equal(t, expected.FQDN, actual.FQDN, "FQDN mismatch")
    assert.Equal(t, expected.Description, actual.Description, "Description mismatch")
    assert.ElementsMatch(t, expected.Tags, actual.Tags, "Tags mismatch")
}

// AssertContainsObject verifies an object exists in a slice
func AssertContainsObject(t *testing.T, objects []AddressObject, name string) {
    t.Helper()

    for _, obj := range objects {
        if obj.Name == name {
            return
        }
    }

    t.Errorf("Object %q not found in slice", name)
}

// AssertSyncResult validates sync operation results
func AssertSyncResult(t *testing.T, result SyncResult, expectedCreated, expectedUpdated, expectedDeleted int) {
    t.Helper()

    assert.Equal(t, expectedCreated, result.Created, "Created count mismatch")
    assert.Equal(t, expectedUpdated, result.Updated, "Updated count mismatch")
    assert.Equal(t, expectedDeleted, result.Deleted, "Deleted count mismatch")
}
```

### Retry Helpers for Async Operations

```go
// pkg/panorama/testutil/retry.go
package testutil

import (
    "context"
    "time"
)

// RetryConfig configures retry behavior
type RetryConfig struct {
    MaxAttempts int
    InitialWait time.Duration
    MaxWait     time.Duration
    Multiplier  float64
}

// DefaultRetryConfig returns sensible defaults for tests
func DefaultRetryConfig() RetryConfig {
    return RetryConfig{
        MaxAttempts: 5,
        InitialWait: 100 * time.Millisecond,
        MaxWait:     5 * time.Second,
        Multiplier:  2.0,
    }
}

// RetryUntilSuccess retries an operation until it succeeds or exhausts attempts
func RetryUntilSuccess(ctx context.Context, cfg RetryConfig, operation func() error) error {
    var lastErr error
    wait := cfg.InitialWait

    for attempt := 1; attempt <= cfg.MaxAttempts; attempt++ {
        if err := operation(); err == nil {
            return nil
        } else {
            lastErr = err
        }

        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-time.After(wait):
        }

        wait = time.Duration(float64(wait) * cfg.Multiplier)
        if wait > cfg.MaxWait {
            wait = cfg.MaxWait
        }
    }

    return fmt.Errorf("operation failed after %d attempts: %w", cfg.MaxAttempts, lastErr)
}

// WaitForCondition polls until a condition is true
func WaitForCondition(ctx context.Context, interval time.Duration, condition func() (bool, error)) error {
    ticker := time.NewTicker(interval)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-ticker.C:
            met, err := condition()
            if err != nil {
                return err
            }
            if met {
                return nil
            }
        }
    }
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/panorama-tests.yml
name: Panorama Integration Tests

on:
  push:
    branches: [main]
    paths:
      - "pkg/panorama/**"
      - "internal/integrations/panorama/**"
  pull_request:
    branches: [main]
    paths:
      - "pkg/panorama/**"
      - "internal/integrations/panorama/**"
  workflow_dispatch:
    inputs:
      run_e2e:
        description: "Run E2E tests against real Panorama"
        required: false
        default: "false"

env:
  GO_VERSION: "1.24"

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}

      - name: Run unit tests
        run: |
          go test -v -race -coverprofile=coverage.out ./pkg/panorama/...

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: coverage.out
          flags: panorama-unit

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: unit-tests
    environment: panorama-lab
    steps:
      - uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}

      - name: Run integration tests
        env:
          PANORAMA_HOST: ${{ secrets.PANORAMA_LAB_HOST }}
          PANORAMA_API_KEY: ${{ secrets.PANORAMA_LAB_API_KEY }}
          PANORAMA_DEVICE_GROUP: ${{ secrets.PANORAMA_LAB_DEVICE_GROUP }}
          RUN_INTEGRATION_TESTS: "true"
        run: |
          go test -v -tags=integration -timeout=30m ./pkg/panorama/...

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: integration-tests
    if: github.event.inputs.run_e2e == 'true' || github.ref == 'refs/heads/main'
    environment: panorama-production
    concurrency:
      group: panorama-e2e
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}

      - name: Run E2E tests
        env:
          PANORAMA_HOST: ${{ secrets.PANORAMA_PROD_HOST }}
          PANORAMA_API_KEY: ${{ secrets.PANORAMA_PROD_API_KEY }}
          PANORAMA_DEVICE_GROUP: ${{ secrets.PANORAMA_PROD_DEVICE_GROUP }}
          CHARIOT_API_URL: ${{ secrets.CHARIOT_API_URL }}
          CHARIOT_API_KEY: ${{ secrets.CHARIOT_API_KEY }}
          RUN_E2E_TESTS: "true"
        run: |
          go test -v -tags=e2e -timeout=60m ./pkg/panorama/...
```

### Test Environment Secrets Configuration

```yaml
# GitHub repository secrets required:
#
# For panorama-lab environment:
#   PANORAMA_LAB_HOST: https://panorama-lab.example.com
#   PANORAMA_LAB_API_KEY: <api-key>
#   PANORAMA_LAB_DEVICE_GROUP: integration-tests
#
# For panorama-production environment:
#   PANORAMA_PROD_HOST: https://panorama.example.com
#   PANORAMA_PROD_API_KEY: <api-key>
#   PANORAMA_PROD_DEVICE_GROUP: chariot-sync
#   CHARIOT_API_URL: https://api.chariot.praetorian.com
#   CHARIOT_API_KEY: <chariot-api-key>
```

### Running Integration Tests Safely

```bash
#!/bin/bash
# scripts/run-panorama-tests.sh

set -euo pipefail

TEST_TYPE="${1:-unit}"

case "$TEST_TYPE" in
  unit)
    echo "Running unit tests..."
    go test -v -race ./pkg/panorama/...
    ;;

  integration)
    echo "Running integration tests..."

    # Verify required environment variables
    : "${PANORAMA_HOST:?PANORAMA_HOST must be set}"
    : "${PANORAMA_API_KEY:?PANORAMA_API_KEY must be set}"
    : "${PANORAMA_DEVICE_GROUP:?PANORAMA_DEVICE_GROUP must be set}"

    # Run with integration tag
    RUN_INTEGRATION_TESTS=true go test -v -tags=integration -timeout=30m ./pkg/panorama/...
    ;;

  e2e)
    echo "Running E2E tests..."

    # Verify all required environment variables
    : "${PANORAMA_HOST:?PANORAMA_HOST must be set}"
    : "${PANORAMA_API_KEY:?PANORAMA_API_KEY must be set}"
    : "${PANORAMA_DEVICE_GROUP:?PANORAMA_DEVICE_GROUP must be set}"
    : "${CHARIOT_API_URL:?CHARIOT_API_URL must be set}"
    : "${CHARIOT_API_KEY:?CHARIOT_API_KEY must be set}"

    # Run with e2e tag
    RUN_E2E_TESTS=true go test -v -tags=e2e -timeout=60m ./pkg/panorama/...
    ;;

  all)
    "$0" unit
    "$0" integration
    "$0" e2e
    ;;

  *)
    echo "Usage: $0 {unit|integration|e2e|all}"
    exit 1
    ;;
esac
```

---

## Cross-References

- **SKILL.md** - Main skill documentation with implementation overview
- **references/api.md** - Panorama XML API details for building mock responses
- **references/architecture.md** - Integration architecture influencing test design
- **references/security.md** - Security considerations for test credentials
- **examples/sync-implementation.md** - Real implementations to test against

---

## Best Practices Summary

1. **Test Isolation**: Each test should create and clean up its own data
2. **Prefix Convention**: Use unique prefixes (`test-{timestamp}`) for test objects
3. **Parallel Safety**: Use mutex or separate device groups for concurrent tests
4. **Credential Security**: Never commit credentials; use environment variables
5. **Timeout Handling**: Always use context with timeout for API calls
6. **Commit Testing**: Test commit workflows in isolation due to global impact
7. **Cleanup Priority**: Implement robust cleanup even on test failure
8. **Mock Fidelity**: Keep mock responses aligned with real Panorama behavior
