# Burp Enterprise Client Architecture

## Client Structure

```go
type BurpEnterpriseClient struct {
    Token      string           // Bearer token for API authentication
    BaseURL    string           // Burp Enterprise base URL (e.g., "https://burp.example.com")
    tree       *Tree            // Cached folder/site hierarchy
    HTTPClient *web.HTTPClient  // Shared HTTP client with connection pooling
}
```

**Key Design Principles:**
- **Stateless operations** - No hidden state beyond caching
- **Thin wrapper** - Business logic belongs in capabilities, not client
- **Idempotent helpers** - Safe to call repeatedly
- **Mock-friendly** - All operations testable without real Burp connectivity

---

## Initialization Patterns

### Production Pattern (AWS Credential Broker)

```go
func NewBurpEnterpriseClientFromAWS(aws *cloud.AWS) (*BurpEnterpriseClient, error) {
    // Fetch credentials from AWS Systems Manager via broker
    credRequest := model.CredentialRequest{
        Username:     aws.Username,
        CredentialID: string(model.BurpSuiteInternalCredential),
        Category:     model.CategoryInternal,
        Type:         model.BurpSuiteInternalCredential,
        Format:       []model.CredentialFormat{model.CredentialFormatToken},
        Operation:    model.CredentialOperationGet,
    }

    credResponse, err := aws.Broker.Invoke(credRequest)
    if err != nil {
        return nil, fmt.Errorf("failed to retrieve Burp credentials: %w", err)
    }

    // Parse JSON credential value
    var burpCreds model.BurpDastCredentials
    json.Unmarshal([]byte(credResponse.CredentialValue[...]), &burpCreds)

    // Initialize client with retrieved credentials
    httpClient := web.NewHTTPClient(nil)
    return NewBurpEnterpriseClient(httpClient, burpCreds.Token, burpCreds.BurpURL), nil
}
```

**Credential Model:**
```go
type BurpDastCredentials struct {
    Token   string `json:"token"`   // Bearer token
    BurpURL string `json:"burpURL"` // Base URL
}
```

**Usage:** Always use this pattern in production Lambda functions.

**Why:** Credentials stored securely in AWS Systems Manager, not hardcoded.

---

### Direct Initialization (Testing/Development)

```go
func NewBurpEnterpriseClient(
    client *web.HTTPClient,
    token string,
    baseURL string,
) *BurpEnterpriseClient {
    if client == nil {
        client = web.NewHTTPClient(nil)
    }
    return &BurpEnterpriseClient{
        Token:      token,
        BaseURL:    strings.TrimSuffix(baseURL, "/"),
        HTTPClient: client,
    }
}
```

**Usage:** Testing, local development, or when credentials already available.

---

## URL Generation

### GraphQL Endpoint

```go
func (c *BurpEnterpriseClient) graphqlURL() string {
    return c.BaseURL + "/graphql/v1"
}
```

**Format:** `https://{burp-host}/graphql/v1`

**Transport:** HTTP POST with JSON body

---

### WebSocket Endpoint

```go
func (c *BurpEnterpriseClient) websocketURL() string {
    wsURL := strings.Replace(c.BaseURL, "https://", "wss://", 1)
    wsURL = strings.Replace(wsURL, "http://", "ws://", 1)
    return wsURL + "/graphql/v1/subscriptions"
}
```

**Format:** `wss://{burp-host}/graphql/v1/subscriptions`

**Transport:** WebSocket for GraphQL subscriptions

**Usage:** Long-running operations like `ParseAPIDefinitionFromURL()`

---

## Header Management

```go
func (c *BurpEnterpriseClient) headers() []string {
    return []string{
        "Authorization", fmt.Sprintf("Bearer %s", c.Token),
        "Content-Type", "application/json",
    }
}
```

**Pattern:** Variadic string slice (alternating key/value pairs)

**Usage:** Passed to `graphql.Graphql[T]()` helper as `headers...`

---

## GraphQL Execution Pattern

All GraphQL operations follow this structure:

```go
// 1. Define query/mutation
query := `
    query OperationName($varName: Type!) {
        field(arg: $varName) {
            nested_field
        }
    }
`

// 2. Build variables map
variables := map[string]any{
    "varName": value,
}

// 3. Execute with typed response
result, err := graphql.Graphql[ResponseType](
    c.HTTPClient,
    c.graphqlURL(),
    query,
    variables,
    c.headers()...,
)

// 4. Error handling
if err != nil {
    return nil, fmt.Errorf("operation failed: %w", err)
}

// 5. Validate response
if result.Field.ID == "" {
    return nil, fmt.Errorf("empty ID (Burp DAST API error)")
}

return result, nil
```

**Critical Rules:**
- ✅ Always use Go generics for type safety (`Graphql[T]()`)
- ✅ Always use GraphQL variables (never string interpolation)
- ✅ Always check for empty IDs in responses
- ✅ Always wrap errors with context

---

## Caching Strategy

### Site Tree Caching

```go
func (c *BurpEnterpriseClient) Tree() (Tree, error) {
    // Return cached tree if available
    if c.tree != nil {
        return *c.tree, nil
    }

    // Fetch from API
    query := `
        query GetSiteTree {
            site_tree {
                sites { id parent_id name }
                folders { id name }
            }
        }
    `

    result, err := graphql.Graphql[Tree](c.HTTPClient, c.graphqlURL(), query, nil, c.headers()...)
    if err != nil {
        return Tree{}, err
    }

    // Cache for future calls
    c.tree = result
    return *result, nil
}
```

**Cache Lifetime:** Entire client instance lifetime

**Cache Invalidation:**
```go
// Explicit invalidation after tree modifications
c.tree = nil
```

**When to Invalidate:**
- After `CreateFolder()`
- After `CreateSite()`
- After `DeleteSite()`

**Why Cache:** Site tree query is expensive, called frequently during provisioning.

---

## File Organization

### Module Structure

```
burp/
├── burp.go                  # Client type, initialization, tree/folder/site CRUD
├── schedule.go              # Schedule creation, cancellation
├── scans.go                 # Scan querying, monitoring
├── issues.go                # Issue retrieval, filtering
├── convert.go               # Burp → Tabularium model conversion
├── site.go                  # Pool assignment helpers
├── api_definitions.go       # API spec parsing
├── authentication.go        # Credential handling (future)
├── util.go                  # Shared utilities
├── burp_test.go             # Unit tests
└── burp_client_test.go      # Mock transport for integration tests
```

**Design Philosophy:**
- **Functional grouping** - Related operations in same file
- **Small files** - Burp.go is largest at ~550 lines
- **No orchestration** - Client provides building blocks, not workflows

---

## Testing Architecture

### Mock Transport Pattern

```go
type mockRoundTripper struct {
    t *testing.T
}

func (m *mockRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
    // Parse GraphQL query from request body
    var reqBody struct {
        Query     string         `json:"query"`
        Variables map[string]any `json:"variables"`
    }
    json.NewDecoder(req.Body).Decode(&reqBody)

    // Route based on operation name
    switch {
    case strings.Contains(reqBody.Query, "CreateFolder"):
        return mockCreateFolderResponse(reqBody.Variables), nil
    case strings.Contains(reqBody.Query, "CreateSite"):
        return mockCreateSiteResponse(reqBody.Variables), nil
    // ... more cases
    }

    return nil, fmt.Errorf("unhandled query")
}
```

**Mock Response Helper:**
```go
func mockCreateFolderResponse(vars map[string]any) *http.Response {
    response := map[string]any{
        "data": map[string]any{
            "create_folder": map[string]any{
                "folder": map[string]any{
                    "id":   "mock-folder-id",
                    "name": vars["name"],
                },
            },
        },
    }

    body, _ := json.Marshal(response)
    return &http.Response{
        StatusCode: 200,
        Body:       io.NopCloser(bytes.NewReader(body)),
    }
}
```

**Test Pattern:**
```go
func TestCreateFolder(t *testing.T) {
    // Setup mock transport
    httpClient := &web.HTTPClient{
        Client: &http.Client{
            Transport: &mockRoundTripper{t: t},
        },
    }

    // Initialize client with mock
    client := NewBurpEnterpriseClient(httpClient, "mock-token", "https://burp.test")

    // Test operation
    result, err := client.CreateFolder("test-folder")
    assert.NoError(t, err)
    assert.Equal(t, "mock-folder-id", result.CreateFolder.Folder.ID)
}
```

**Coverage:** All GraphQL mutations have corresponding mock responses.

**Benefits:**
- ✅ Test without real Burp instance
- ✅ Fast test execution
- ✅ Deterministic responses
- ✅ Easy to test error paths

---

## Error Handling Patterns

### Wrapped Errors

```go
// Always wrap with context
if err != nil {
    return nil, fmt.Errorf("failed to create folder: %w", err)
}
```

**Why:** Error chains provide debugging context while preserving original error.

---

### Empty ID Validation

```go
// All create operations return IDs
if result.CreateFolder.Folder.ID == "" {
    return nil, fmt.Errorf("failed to create folder (Burp DAST API error)")
}
```

**Why:** Burp API returns 200 OK even on validation errors, with empty IDs in response.

---

### Validation Before API Calls

```go
func (c *BurpEnterpriseClient) CreateScheduleItem(siteID, configID string) (*CreateScheduleItemResponse, error) {
    // Validate inputs before GraphQL call
    if siteID == "" || configID == "" {
        return nil, fmt.Errorf("site id and config id are required")
    }

    // Validate scan configuration exists
    valid, err := c.validateScanConfiguration(configID)
    if err != nil {
        return nil, fmt.Errorf("failed to validate scan configuration: %w", err)
    }
    if !valid {
        return nil, fmt.Errorf("invalid scan configuration: %s", configID)
    }

    // Proceed with mutation
    // ...
}
```

**Why:** Fail fast with clear error messages rather than cryptic Burp errors.

---

## Performance Considerations

### Connection Pooling

```go
// HTTPClient reuses connections via http.Transport
client := web.NewHTTPClient(nil)
burpClient := NewBurpEnterpriseClient(client, token, baseURL)
```

**Why:** Avoid TLS handshake overhead on every request.

---

### Pagination Pattern

```go
func (c *BurpEnterpriseClient) ListScansFromTime(beforeTime time.Time) (*ScanResponse, error) {
    offset := 0
    limit := 100
    done := false
    var response ScanResponse

    for !done {
        // Fetch page
        vars := map[string]any{
            "offset": offset,
            "limit":  limit,
        }

        result, err := graphql.Graphql[ScanResponse](c.HTTPClient, c.graphqlURL(), query, vars, c.headers()...)
        if err != nil {
            return nil, err
        }

        // Process results
        for _, scan := range result.Scans {
            if beforeTime.Before(parsedEndTime) {
                response.Scans = append(response.Scans, scan)
            } else {
                done = true
                break
            }
        }

        offset += limit
    }

    return &response, nil
}
```

**Pattern:** Fetch 100 results per page, break early when time threshold reached.

---

### Caching Trade-offs

**Cached:**
- Site tree (expensive, changes rarely)

**Not Cached:**
- Scan summaries (changes frequently)
- Issues (large datasets)
- Scan configurations (small, validated once)

**Why:** Only cache expensive, stable data. Let capabilities manage scan state.

---

## Integration Points

### Tabularium Models

```go
// Input models
import "github.com/praetorian-inc/tabularium/pkg/model/model"

func (c *BurpEnterpriseClient) EnsureSite(wa model.WebApplication) (model.WebApplication, error)
```

**Key Models:**
- `model.WebApplication` - Site provisioning input/output
- `model.Risk` - Converted from Burp issues
- `model.Asset` - Converted from scanned items
- `model.BurpDastCredentials` - Credential format

---

### AWS Cloud Package

```go
import "github.com/praetorian-inc/chariot/backend/pkg/cloud"

func NewBurpEnterpriseClientFromAWS(aws *cloud.AWS) (*BurpEnterpriseClient, error)
```

**Usage:** Access credential broker for secure token retrieval.

---

### GraphQL Helper

```go
import "github.com/praetorian-inc/chariot/backend/pkg/lib/graphql"

result, err := graphql.Graphql[T](httpClient, url, query, variables, headers...)
```

**Why:** Shared helper ensures consistent error handling and type safety.

---

## Extension Guidelines

### Adding New Operations

1. **Determine file placement:**
   - Site CRUD → `burp.go`
   - Scheduling → `schedule.go`
   - Monitoring → `scans.go`
   - Results → `issues.go` or `convert.go`

2. **Follow GraphQL pattern:**
   ```go
   func (c *BurpEnterpriseClient) NewOperation(params) (*ResponseType, error) {
       query := `query/mutation string`
       variables := map[string]any{...}
       result, err := graphql.Graphql[ResponseType](c.HTTPClient, c.graphqlURL(), query, variables, c.headers()...)
       if err != nil {
           return nil, fmt.Errorf("operation failed: %w", err)
       }
       return result, nil
   }
   ```

3. **Add mock to test file:**
   ```go
   case strings.Contains(reqBody.Query, "NewOperation"):
       return mockNewOperationResponse(reqBody.Variables), nil
   ```

4. **Write unit test:**
   ```go
   func TestNewOperation(t *testing.T) {
       client := setupMockClient(t)
       result, err := client.NewOperation(params)
       assert.NoError(t, err)
       assert.NotEmpty(t, result.ID)
   }
   ```

---

## Related References

- [GraphQL Schema](graphql-schema.md) - Complete API reference
- [Entity Relationships](entity-relationships.md) - Understanding site/scan/issue relationships
- [Testing Patterns](testing.md) - Mock transport and test strategies
