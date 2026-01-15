# Credential Mocking

**Testing without real secrets - in-memory credential patterns for integration tests.**

## Never Use Real Credentials in Tests

❌ **NEVER DO THIS**:
```go
job.Secret = map[string]string{
    "api_key": "sk-prod-abc123xyz",  // Real production key!
}
```

✅ **DO THIS**:
```go
job.Secret = map[string]string{
    "api_key": "test-api-key",  // Fake test key
}
```

## In-Memory Secret Pattern

```go
func TestIntegration_ValidateCredentials(t *testing.T) {
    integration := model.NewIntegration("service", "test.example.com")
    job := model.NewJob("service", &integration)
    
    // Set test credentials (never real secrets)
    job.Secret = map[string]string{
        "client_id":     "test-client-id",
        "client_secret": "test-client-secret",
        "api_key":       "test-api-key",
    }

    // Mock server expects these test credentials
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        apiKey := r.Header.Get("X-API-Key")
        if apiKey == "test-api-key" {
            w.WriteHeader(http.StatusOK)
            return
        }
        w.WriteHeader(http.StatusUnauthorized)
    }))
    defer server.Close()

    task := NewIntegration(job, &integration, base.WithHTTPBaseURL(server.URL))
    err := task.ValidateCredentials()
    require.NoError(t, err)
}
```

## OAuth Credential Mocking

```go
func TestOAuth_TokenExchange(t *testing.T) {
    // Test OAuth credentials (fake)
    clientID := "test-client"
    clientSecret := "test-secret"

    authServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        r.ParseForm()
        
        // Verify test credentials
        if r.Form.Get("client_id") == clientID && 
           r.Form.Get("client_secret") == clientSecret {
            w.WriteHeader(http.StatusOK)
            json.NewEncoder(w).Encode(map[string]interface{}{
                "access_token": "test-access-token",
                "token_type":   "Bearer",
                "expires_in":   3600,
            })
            return
        }

        w.WriteHeader(http.StatusUnauthorized)
    }))
    defer authServer.Close()

    client := NewOAuthClient(authServer.URL)
    token, err := client.GetAccessToken(clientID, clientSecret)
    require.NoError(t, err)
    assert.Equal(t, "test-access-token", token.AccessToken)
}
```

## API Key Patterns

### Header-Based API Keys

```go
func TestAPI_HeaderAuthentication(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        apiKey := r.Header.Get("Authorization")
        
        if apiKey == "Bearer test-token" {
            w.WriteHeader(http.StatusOK)
            json.NewEncoder(w).Encode(map[string]string{"status": "authenticated"})
            return
        }

        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{"error": "invalid_api_key"})
    }))
    defer server.Close()

    client := NewAPIClient(server.URL, "test-token")
    err := client.FetchData()
    assert.NoError(t, err)
}
```

### Query Parameter API Keys

```go
func TestAPI_QueryParamAuthentication(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        apiKey := r.URL.Query().Get("api_key")
        
        if apiKey == "test-api-key" {
            w.WriteHeader(http.StatusOK)
            return
        }

        w.WriteHeader(http.StatusForbidden)
    }))
    defer server.Close()

    client := NewAPIClient(server.URL)
    err := client.FetchData("test-api-key")
    assert.NoError(t, err)
}
```

## Multi-Credential Scenarios

```go
func TestIntegration_MultipleSecrets(t *testing.T) {
    integration := model.NewIntegration("aws", "test-account")
    job := model.NewJob("aws", &integration)
    
    // Multiple test credentials
    job.Secret = map[string]string{
        "access_key_id":     "AKIATEST123456",
        "secret_access_key": "test-secret-key",
        "session_token":     "test-session-token",
        "region":            "us-east-1",
    }

    task := NewAWS(job, &integration, mock.MockCollectors(&integration, &AWS{})...)
    aws := mock.NewMockAWS("test@example.com")

    inv := invoker.NewInvoker(aws, task)
    err := inv.Invoke()
    require.NoError(t, err)
}
```

## Credential Expiration Testing

```go
func TestAPI_ExpiredToken(t *testing.T) {
    tests := []struct {
        name      string
        token     string
        wantError bool
        errorMsg  string
    }{
        {
            name:      "valid token",
            token:     "valid-token",
            wantError: false,
        },
        {
            name:      "expired token",
            token:     "expired-token",
            wantError: true,
            errorMsg:  "token expired",
        },
        {
            name:      "revoked token",
            token:     "revoked-token",
            wantError: true,
            errorMsg:  "token revoked",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                token := r.Header.Get("Authorization")
                
                switch token {
                case "Bearer valid-token":
                    w.WriteHeader(http.StatusOK)
                case "Bearer expired-token":
                    w.WriteHeader(http.StatusUnauthorized)
                    json.NewEncoder(w).Encode(map[string]string{"error": "token expired"})
                case "Bearer revoked-token":
                    w.WriteHeader(http.StatusForbidden)
                    json.NewEncoder(w).Encode(map[string]string{"error": "token revoked"})
                default:
                    w.WriteHeader(http.StatusUnauthorized)
                }
            }))
            defer server.Close()

            client := NewAPIClient(server.URL)
            err := client.ValidateToken(tt.token)

            if tt.wantError {
                require.Error(t, err)
                require.Contains(t, err.Error(), tt.errorMsg)
            } else {
                require.NoError(t, err)
            }
        })
    }
}
```

## Best Practices

1. ✅ **Use obvious test values**: `"test-api-key"`, `"test-token"`, `"AKIATEST123456"`
2. ✅ **Never commit real secrets** to test files
3. ✅ **Mock all credential validation** logic
4. ✅ **Test both valid and invalid credentials**
5. ✅ **Test expired/revoked scenarios**
6. ❌ **Never use production credentials** in tests
7. ❌ **Never use .env files with real secrets** in tests

## References

- `modules/chariot/backend/pkg/tasks/integrations/entraid/entraid_test.go` - OAuth credential mocking
- `modules/chariot/backend/pkg/tasks/integrations/pingone/pingone_test.go` - Client credentials flow
- `modules/chariot/backend/pkg/tasks/integrations/fastly/fastly_test.go` - API key validation
