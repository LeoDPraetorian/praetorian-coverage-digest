# Mock Server Patterns (httptest)

**HTTP mocking patterns for Go integration tests using `net/http/httptest` package.**

## Three Primary Approaches

### 1. Handler Testing (`httptest.NewRecorder()`)

**Purpose**: Fast, isolated unit tests of HTTP handlers without network overhead.

**When to use**: Testing handler logic directly (request validation, status code generation, response formatting).

**Example**:

```go
func TestHandler_Success(t *testing.T) {
    req := httptest.NewRequest("GET", "/users/123", nil)
    req.Header.Set("Authorization", "Bearer test-token")

    rec := httptest.NewRecorder()

    handler := http.HandlerFunc(GetUserHandler)
    handler.ServeHTTP(rec, req)

    // Assert status code
    assert.Equal(t, http.StatusOK, rec.Code)

    // Assert response body
    var user User
    json.NewDecoder(rec.Body).Decode(&user)
    assert.Equal(t, "123", user.ID)
}
```

### 2. Server Testing (`httptest.NewServer()`)

**Purpose**: Integration testing of HTTP clients against mock backends.

**When to use**: Testing client code, OAuth flows, credential validation, API integration tests.

**Example**:

```go
func TestClient_ValidateCredentials(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Verify Authorization header
        authHeader := r.Header.Get("Authorization")
        if authHeader == "Bearer valid-token" {
            w.WriteHeader(http.StatusOK)
            json.NewEncoder(w).Encode(map[string]string{"status": "authenticated"})
            return
        }

        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{"error": "invalid_token"})
    }))
    defer server.Close()

    // Test with client pointing to mock server
    client := NewAPIClient(server.URL)
    err := client.ValidateCredentials("valid-token")
    assert.NoError(t, err)
}
```

### 3. RoundTripper Pattern (Custom Transport)

**Purpose**: Ultra-fast client testing without server overhead (decorator pattern).

**When to use**: Pure speed, deterministic responses, testing transport-layer logic.

**Example** (Chariot's HTTPCollector pattern):

```go
type mockTransport struct {
    responses map[string]*http.Response
}

func (m *mockTransport) RoundTrip(req *http.Request) (*http.Response, error) {
    key := fmt.Sprintf("%s:%s", req.Method, req.URL.String())
    if resp, ok := m.responses[key]; ok {
        return resp, nil
    }
    return &http.Response{StatusCode: 404, Body: io.NopCloser(strings.NewReader("Not Found"))}, nil
}

// Usage
client := &http.Client{
    Transport: &mockTransport{
        responses: map[string]*http.Response{
            "GET:https://api.example.com/users": {
                StatusCode: 200,
                Body: io.NopCloser(strings.NewReader(`[{"id": "1"}]`)),
            },
        },
    },
}
```

## Status Code Testing

### Pattern: Test All Error Paths

```go
func TestAPI_StatusCodes(t *testing.T) {
    tests := []struct {
        name           string
        authToken      string
        expectedStatus int
        expectedError  string
    }{
        {
            name:           "success - 200 OK",
            authToken:      "valid-token",
            expectedStatus: http.StatusOK,
        },
        {
            name:           "unauthorized - 401",
            authToken:      "invalid-token",
            expectedStatus: http.StatusUnauthorized,
            expectedError:  "invalid_token",
        },
        {
            name:           "forbidden - 403",
            authToken:      "expired-token",
            expectedStatus: http.StatusForbidden,
            expectedError:  "token_expired",
        },
        {
            name:           "not found - 404",
            authToken:      "valid-token",
            expectedStatus: http.StatusNotFound,
            expectedError:  "resource_not_found",
        },
        {
            name:           "rate limited - 429",
            authToken:      "valid-token",
            expectedStatus: http.StatusTooManyRequests,
            expectedError:  "rate_limit_exceeded",
        },
        {
            name:           "server error - 500",
            authToken:      "valid-token",
            expectedStatus: http.StatusInternalServerError,
            expectedError:  "internal_error",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                // Simulate different status codes based on token
                switch tt.authToken {
                case "valid-token":
                    if tt.expectedStatus == http.StatusOK {
                        w.WriteHeader(http.StatusOK)
                        json.NewEncoder(w).Encode(map[string]string{"status": "success"})
                    } else {
                        w.WriteHeader(tt.expectedStatus)
                        json.NewEncoder(w).Encode(map[string]string{"error": tt.expectedError})
                    }
                default:
                    w.WriteHeader(tt.expectedStatus)
                    json.NewEncoder(w).Encode(map[string]string{"error": tt.expectedError})
                }
            }))
            defer server.Close()

            client := NewAPIClient(server.URL)
            resp, err := client.MakeRequest(tt.authToken)

            if tt.expectedStatus == http.StatusOK {
                assert.NoError(t, err)
                assert.Equal(t, "success", resp.Status)
            } else {
                assert.Error(t, err)
                assert.Contains(t, err.Error(), tt.expectedError)
            }
        })
    }
}
```

## Header Verification

### Request Header Verification

```go
func TestClient_RequestHeaders(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Verify Authorization header
        authHeader := r.Header.Get("Authorization")
        assert.Equal(t, "Bearer test-token", authHeader)

        // Verify Content-Type
        contentType := r.Header.Get("Content-Type")
        assert.Equal(t, "application/json", contentType)

        // Verify Accept
        accept := r.Header.Get("Accept")
        assert.Contains(t, accept, "application/json")

        // Verify custom headers
        apiVersion := r.Header.Get("X-API-Version")
        assert.Equal(t, "v1", apiVersion)

        w.WriteHeader(http.StatusOK)
    }))
    defer server.Close()

    client := NewAPIClient(server.URL)
    err := client.MakeRequest("test-token")
    assert.NoError(t, err)
}
```

### Response Header Setting

```go
func TestHandler_ResponseHeaders(t *testing.T) {
    req := httptest.NewRequest("GET", "/data", nil)
    rec := httptest.NewRecorder()

    handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Set Content-Type
        w.Header().Set("Content-Type", "application/json")

        // Set Cache-Control
        w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")

        // Set custom headers
        w.Header().Set("X-RateLimit-Remaining", "99")

        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]string{"data": "value"})
    })

    handler.ServeHTTP(rec, req)

    // Verify response headers
    assert.Equal(t, "application/json", rec.Header().Get("Content-Type"))
    assert.Equal(t, "no-cache, no-store, must-revalidate", rec.Header().Get("Cache-Control"))
    assert.Equal(t, "99", rec.Header().Get("X-RateLimit-Remaining"))
}
```

## OAuth Flow Testing

### Pattern: Form Parsing and Token Exchange

```go
func TestOAuth_TokenExchange(t *testing.T) {
    authServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Verify endpoint
        if !strings.Contains(r.URL.Path, "/oauth/token") {
            w.WriteHeader(http.StatusNotFound)
            return
        }

        // Verify method
        if r.Method != "POST" {
            w.WriteHeader(http.StatusMethodNotAllowed)
            return
        }

        // Parse form data
        if err := r.ParseForm(); err != nil {
            w.WriteHeader(http.StatusBadRequest)
            json.NewEncoder(w).Encode(map[string]string{"error": "invalid_request"})
            return
        }

        // Validate OAuth parameters
        grantType := r.Form.Get("grant_type")
        clientID := r.Form.Get("client_id")
        clientSecret := r.Form.Get("client_secret")

        if grantType == "client_credentials" && clientID == "test-client" && clientSecret == "test-secret" {
            w.Header().Set("Content-Type", "application/json")
            w.WriteHeader(http.StatusOK)
            json.NewEncoder(w).Encode(map[string]interface{}{
                "access_token": "test-access-token",
                "token_type":   "Bearer",
                "expires_in":   3600,
                "scope":        "read write",
            })
            return
        }

        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{"error": "invalid_client"})
    }))
    defer authServer.Close()

    // Test OAuth client
    client := NewOAuthClient(authServer.URL)
    token, err := client.GetAccessToken("test-client", "test-secret")
    require.NoError(t, err)
    assert.Equal(t, "test-access-token", token.AccessToken)
    assert.Equal(t, 3600, token.ExpiresIn)
}
```

## Stateful Mock Servers

### Pattern: Progressive Failure Scenarios

```go
func TestClient_RetryLogic(t *testing.T) {
    attemptCount := 0

    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        attemptCount++

        // Fail first 2 attempts
        if attemptCount < 3 {
            w.WriteHeader(http.StatusServiceUnavailable)
            json.NewEncoder(w).Encode(map[string]string{
                "error": "service_temporarily_unavailable",
            })
            return
        }

        // Succeed on 3rd attempt
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]string{
            "status": "success",
        })
    }))
    defer server.Close()

    client := NewRetryableClient(server.URL, 3) // Max 3 retries
    resp, err := client.FetchData()

    require.NoError(t, err)
    assert.Equal(t, "success", resp.Status)
    assert.Equal(t, 3, attemptCount) // Verify retry count
}
```

## Best Practices

### 1. Always `defer server.Close()`

```go
server := httptest.NewServer(handler)
defer server.Close()  // Guaranteed cleanup
```

### 2. Use Configuration Injection

```go
// ✅ GOOD: Configurable URL
type Client struct {
    BaseURL string
}

func NewClient(baseURL string) *Client {
    return &Client{BaseURL: baseURL}
}

// Test
server := httptest.NewServer(handler)
defer server.Close()
client := NewClient(server.URL)  // Easy to mock

// ❌ BAD: Hardcoded URL
type Client struct{}

func (c *Client) GetData() error {
    resp, err := http.Get("https://api.production.com/data")  // Can't mock
    // ...
}
```

### 3. Test Concurrent Safety

```go
func TestServer_Concurrent(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
    }))
    defer server.Close()

    var wg sync.WaitGroup
    for i := 0; i < 100; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            resp, err := http.Get(server.URL)
            require.NoError(t, err)
            require.Equal(t, http.StatusOK, resp.StatusCode)
            resp.Body.Close()
        }()
    }
    wg.Wait()
}
```

### 4. Test Both Success and Failure Paths

Always test:
- ✅ Success case (200 OK)
- ✅ Client errors (400, 401, 403, 404)
- ✅ Server errors (500, 503)
- ✅ Network timeouts
- ✅ Invalid response formats

## References

- Official Go httptest documentation: https://pkg.go.dev/net/http/httptest
- Chariot codebase examples:
  - `modules/chariot/backend/pkg/tasks/integrations/entraid/entraid_test.go`
  - `modules/chariot/backend/pkg/tasks/integrations/pingone/pingone_test.go`
  - `modules/chariot/backend/pkg/tasks/integrations/fastly/fastly_test.go`
