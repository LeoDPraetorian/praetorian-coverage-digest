# Mock Collector Patterns

**Chariot-specific mocking patterns using `mock.Collector` for integration testing without real infrastructure.**

## Three-Tier Architecture

Chariot uses a layered mocking system:

1. **Collector Interfaces** (`HTTPCollector`, `CLICollector`, `DNSCollector`)
2. **Mock Implementations** (pre-registered responses, spy pattern)
3. **Test Orchestration** (`Invoker` + `MockAWS` + `assertions`)

## HTTPCollector Mock Pattern

### Creating Mock Collectors

```go
// 1. Create mock collector
c := http.NewMockCollector()

// 2. Register exact URL responses
c.MustRegisterHTTP("GET", "https://api.example.com/users", http.CannedHTTPResponse{
    StatusCode: 200,
    Headers:    http.Header{"Content-Type": {"application/json"}},
    Body:       `[{"id": 1, "name": "Alice"}]`,
})

// 3. Register pattern-based responses (regex)
c.MustRegisterHTTPPattern("POST", `https://api\.example\.com/resources/.*`, http.CannedHTTPResponse{
    StatusCode: 201,
    Body:       `{"id": 123, "status": "created"}`,
})

// 4. Inject into capability
task := NewCapability(job, target, base.WithHTTPCollector(c))
```

### URL Matching: Exact vs Pattern

**Exact Matching** (no regex):
```go
c.MustRegisterHTTP("GET", "https://api.github.com/orgs/my-org", response)
// Matches exactly: GET https://api.github.com/orgs/my-org
// Does NOT match: GET https://api.github.com/orgs/my-org/repos
```

**Pattern Matching** (regex):
```go
c.MustRegisterHTTPPattern("POST", `https://api\.example\.com/users/.*`, response)
// Matches: POST https://api.example.com/users/123
// Matches: POST https://api.example.com/users/456/profile
// Remember to escape dots: `\.` for literal `.`
```

### CannedHTTPResponse Structure

```go
type CannedHTTPResponse struct {
    StatusCode int
    Headers    http.Header
    Body       string
}

// Usage examples
response200 := http.CannedHTTPResponse{
    StatusCode: 200,
    Headers:    http.Header{"Content-Type": {"application/json"}},
    Body:       `{"success": true}`,
}

response404 := http.CannedHTTPResponse{
    StatusCode: 404,
    Body:       `{"error": "not_found"}`,
}

response429 := http.CannedHTTPResponse{
    StatusCode: 429,
    Headers:    http.Header{"Retry-After": {"60"}},
    Body:       `{"error": "rate_limit_exceeded"}`,
}
```

## MockCollectors Method Pattern

Every capability that supports mock testing MUST implement:

```go
func (task *MyCapability) MockCollectors(asset *model.Integration) []base.Option {
    return []base.Option{
        base.WithHTTPCollector(NewMockHTTPCollector(asset)),
        base.WithCLICollector(NewMockCLICollector()),
        base.WithDNSCollector(NewMockDNSCollector()),
    }
}
```

Usage in tests:
```go
task := NewMyCapability(job, target, mock.MockCollectors(target, &MyCapability{})...)
```

## Job.Send() Collection Flow

When capability calls `job.Send(asset)`:

```
Capability ---job.Send(asset)---> Job Internal Queue
                                       |
                                       v
                              job.Stream() channel
                                       |
                                       v
                              Invoker.collectStream()
                                       |
                    +------------------+------------------+
                    |                  |                  |
                    v                  v                  v
            MockGraph.Insert()  MockTable.Insert()  MockQueue.Enqueue()
            
Invoker enforces 1-second timeout (catches unmocked I/O)
```

## Integration Test Pattern

### Basic Integration Test

```go
func TestCapability_BasicDiscovery(t *testing.T) {
    // SECTION 1: Setup
    integration := model.NewIntegration("service", "test.example.com")
    job := model.NewJob("service", &integration)
    job.Secret = map[string]string{
        "api_key": "test-key",
    }

    // SECTION 2: Create mocked capability
    task := NewService(job, &integration, mock.MockCollectors(&integration, &Service{})...)
    
    // SECTION 3: Create mock AWS services
    aws := mock.NewMockAWS("user@example.com")

    // SECTION 4: Execute via Invoker
    inv := invoker.NewInvoker(aws, task)
    err := inv.Invoke()
    require.NoError(t, err)

    // SECTION 5: Assertions
    expectedAsset := model.NewAsset("example.com", "example.com")
    assertions.GraphItemExists(t, aws, &expectedAsset)
}
```

### Custom Mock Configuration

```go
// Define mock data structure
type MockConfig struct {
    Users     []User
    Resources []Resource
}

// Constructor with default data
func NewMockHTTPCollector(asset *model.Integration) http.HTTPCollector {
    return NewMockHTTPCollectorWithConfig(asset, DefaultMockConfig())
}

// Constructor with custom data
func NewMockHTTPCollectorWithConfig(
    asset *model.Integration,
    config MockConfig,
) http.HTTPCollector {
    c := http.NewMockCollector()

    baseURL := fmt.Sprintf("https://api.%s/v1", asset.Value)

    // Register endpoints with generated responses
    c.MustRegisterHTTP("GET", baseURL+"/users", http.CannedHTTPResponse{
        StatusCode: 200,
        Body:       generateUsersResponse(config.Users),
    })

    c.MustRegisterHTTPPattern("POST", baseURL+`/resources/.*`, http.CannedHTTPResponse{
        StatusCode: 200,
        Body:       generateResourcesResponse(config.Resources),
    })

    return c
}

// Use in test
config := MockConfig{
    Users: []User{
        {ID: "1", Name: "Alice"},
        {ID: "2", Name: "Bob"},
    },
}
mockCollector := NewMockHTTPCollectorWithConfig(&integration, config)
task := NewService(job, &integration, base.WithHTTPCollector(mockCollector))
```

## Assertion Patterns

### GraphItemExists

```go
expectedAsset := model.NewAsset("example.com", "example.com")
assertions.GraphItemExists(t, aws, &expectedAsset)
```

### GraphItemNotExists (filtering verification)

```go
filteredAsset := model.NewAsset("filtered.com", "filtered.com")
assertions.GraphItemNotExists(t, aws, &filteredAsset)
```

### GraphItemCondition (custom verification)

```go
assertions.GraphItemCondition(t, aws, assetKey, func(a *model.Asset) {
    require.Contains(t, a.Tags.Tags, "production")
    require.Equal(t, "A", a.Status)  // Active
    require.Greater(t, a.Confidence, 0.8)
    require.NotEmpty(t, a.DNS)
})
```

## CLICollector Mock Pattern

```go
type MockCLICollector struct {
    CapturedCommands [][]string  // Spy on commands executed
    registry         []CommandPattern
}

// Registration
c := cli.NewMockCollector()
c.MustRegisterCommand("nmap -sV 1.2.3.4", nmapOutputXML)
c.MustRegisterCommandPattern(`nmap .* 10\.0\..*`, nmapPrivateIPOutput)

// Execution captures commands
c.Execute(cmd, lineParser)
// lineParser is called for each output line

// Verify commands
require.Contains(t, c.CapturedCommands, []string{"nmap", "-sV", "1.2.3.4"})
```

## Test File Organization

```
integrations/service/
├── service.go               # Main integration code
├── service_test.go          # Unit tests (ValidateCredentials, Match, etc.)
├── service_mock.go          # MockCollectors method + constructors
└── service_mock_test.go     # Integration tests with Invoker
```

## Timeout Enforcement

Invoker enforces 1-second timeout to catch unmocked I/O:

```go
ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
defer cancel()

select {
case <-done:
    // Success
case <-ctx.Done():
    return fmt.Errorf("timeout: capability likely not fully mocked")
}
```

If test times out, you have unmocked external calls (HTTP, CLI, DNS, etc.).

## References

- `modules/chariot/backend/pkg/tasks/collector/http/mock.go` - HTTP mock implementation
- `modules/chariot/backend/pkg/tasks/collector/cli/mock.go` - CLI mock implementation
- `modules/chariot/backend/pkg/testutils/invoker/invoker.go` - Invoker orchestration
- `modules/chariot/backend/pkg/testutils/assertions/graph.go` - Assertion utilities
- `modules/chariot/backend/pkg/tasks/integrations/xpanse/xpanse_mock.go` - Reference implementation
- `modules/chariot/backend/pkg/tasks/integrations/xpanse/xpanse_mock_test.go` - Test examples
