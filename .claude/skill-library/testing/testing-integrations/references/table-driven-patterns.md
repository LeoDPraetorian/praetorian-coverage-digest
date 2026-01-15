# Table-Driven Test Patterns

**Idiomatic Go testing patterns using table-driven tests.**

## Basic Structure

```go
func TestFunction(t *testing.T) {
    tests := []struct {
        name    string
        input   InputType
        want    OutputType
        wantErr bool
    }{
        {
            name:    "test case 1",
            input:   InputType{...},
            want:    OutputType{...},
            wantErr: false,
        },
        {
            name:    "test case 2",
            input:   InputType{...},
            want:    OutputType{...},
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := Function(tt.input)

            if tt.wantErr {
                require.Error(t, err)
                return
            }

            require.NoError(t, err)
            assert.Equal(t, tt.want, got)
        })
    }
}
```

## Integration Test Pattern

```go
func TestIntegration_Discover(t *testing.T) {
    tests := []struct {
        name         string
        mockResponse string
        mockStatus   int
        wantAssets   int
        wantErr      bool
        errContains  string
    }{
        {
            name:         "success with assets",
            mockResponse: `{"assets": [{"id": "1"}, {"id": "2"}]}`,
            mockStatus:   http.StatusOK,
            wantAssets:   2,
            wantErr:      false,
        },
        {
            name:         "empty response",
            mockResponse: `{"assets": []}`,
            mockStatus:   http.StatusOK,
            wantAssets:   0,
            wantErr:      false,
        },
        {
            name:         "unauthorized",
            mockResponse: `{"error": "invalid_token"}`,
            mockStatus:   http.StatusUnauthorized,
            wantAssets:   0,
            wantErr:      true,
            errContains:  "authentication failed",
        },
        {
            name:         "server error",
            mockResponse: `{"error": "internal_error"}`,
            mockStatus:   http.StatusInternalServerError,
            wantAssets:   0,
            wantErr:      true,
            errContains:  "server error",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                w.WriteHeader(tt.mockStatus)
                w.Write([]byte(tt.mockResponse))
            }))
            defer server.Close()

            integration := model.NewIntegration("test", server.URL)
            job := model.NewJob("test", &integration)

            task := NewIntegration(job, &integration, base.WithHTTPBaseURL(server.URL))
            aws := mock.NewMockAWS("test@example.com")

            inv := invoker.NewInvoker(aws, task)
            err := inv.Invoke()

            if tt.wantErr {
                require.Error(t, err)
                if tt.errContains != "" {
                    require.Contains(t, err.Error(), tt.errContains)
                }
            } else {
                require.NoError(t, err)
                assert.Equal(t, tt.wantAssets, len(aws.Graph.Nodes))
            }
        })
    }
}
```

## Parallel Execution

```go
func TestFunction_Parallel(t *testing.T) {
    tests := []struct {
        name  string
        input int
        want  int
    }{
        {"case 1", 1, 2},
        {"case 2", 2, 4},
        {"case 3", 3, 6},
    }

    for _, tt := range tests {
        tt := tt  // Capture loop variable
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()  // Run tests in parallel

            got := Function(tt.input)
            assert.Equal(t, tt.want, got)
        })
    }
}
```

## Status Code Pattern

```go
func TestAPI_StatusCodes(t *testing.T) {
    tests := []struct {
        name         string
        apiKey       string
        mockStatus   int
        mockResponse string
        wantErr      bool
        errContains  string
    }{
        {
            name:         "200 OK",
            apiKey:       "valid-key",
            mockStatus:   http.StatusOK,
            mockResponse: `{"status": "success"}`,
            wantErr:      false,
        },
        {
            name:         "401 Unauthorized",
            apiKey:       "invalid-key",
            mockStatus:   http.StatusUnauthorized,
            mockResponse: `{"error": "invalid_api_key"}`,
            wantErr:      true,
            errContains:  "authentication failed",
        },
        {
            name:         "403 Forbidden",
            apiKey:       "valid-key",
            mockStatus:   http.StatusForbidden,
            mockResponse: `{"error": "insufficient_permissions"}`,
            wantErr:      true,
            errContains:  "permission denied",
        },
        {
            name:         "404 Not Found",
            apiKey:       "valid-key",
            mockStatus:   http.StatusNotFound,
            mockResponse: `{"error": "resource_not_found"}`,
            wantErr:      true,
            errContains:  "not found",
        },
        {
            name:         "429 Rate Limited",
            apiKey:       "valid-key",
            mockStatus:   http.StatusTooManyRequests,
            mockResponse: `{"error": "rate_limit_exceeded"}`,
            wantErr:      true,
            errContains:  "rate limit",
        },
        {
            name:         "500 Internal Server Error",
            apiKey:       "valid-key",
            mockStatus:   http.StatusInternalServerError,
            mockResponse: `{"error": "internal_error"}`,
            wantErr:      true,
            errContains:  "server error",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                w.WriteHeader(tt.mockStatus)
                w.Write([]byte(tt.mockResponse))
            }))
            defer server.Close()

            client := NewAPIClient(server.URL)
            _, err := client.MakeRequest(tt.apiKey)

            if tt.wantErr {
                require.Error(t, err)
                if tt.errContains != "" {
                    require.Contains(t, err.Error(), tt.errContains)
                }
            } else {
                require.NoError(t, err)
            }
        })
    }
}
```

## Best Practices

1. ✅ Use descriptive test names
2. ✅ Test both success and error paths
3. ✅ Use `t.Run()` for subtests
4. ✅ Verify error messages with `errContains`
5. ✅ Use `t.Parallel()` for independent tests
6. ✅ Capture loop variables: `tt := tt`
7. ✅ Keep test data at top of function

## References

- Official Go testing documentation: https://go.dev/blog/table-driven-tests
- Chariot integration test examples: `modules/chariot/backend/pkg/tasks/integrations/*/`
