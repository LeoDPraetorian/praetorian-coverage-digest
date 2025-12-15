# Testing Patterns

Testing strategies for Burp integration code.

## Mock Transport Pattern

```go
type mockRoundTripper struct {
    t *testing.T
}

func (m *mockRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
    var reqBody struct {
        Query     string         `json:"query"`
        Variables map[string]any `json:"variables"`
    }
    json.NewDecoder(req.Body).Decode(&reqBody)

    // Route based on query content
    switch {
    case strings.Contains(reqBody.Query, "CreateFolder"):
        return mockCreateFolderResponse(reqBody.Variables), nil
    case strings.Contains(reqBody.Query, "CreateSite"):
        return mockCreateSiteResponse(reqBody.Variables), nil
    }

    return nil, fmt.Errorf("unhandled query")
}
```

## Test Setup

```go
func TestCreateFolder(t *testing.T) {
    httpClient := &web.HTTPClient{
        Client: &http.Client{
            Transport: &mockRoundTripper{t: t},
        },
    }

    client := NewBurpEnterpriseClient(httpClient, "mock-token", "https://burp.test")

    result, err := client.CreateFolder("test-folder")
    assert.NoError(t, err)
    assert.Equal(t, "mock-folder-id", result.CreateFolder.Folder.ID)
}
```

## Coverage Strategy

- All GraphQL mutations have mock responses in `burp_client_test.go`
- Test happy paths and error scenarios
- Validate response structure and error wrapping

## Related References

- [Client Architecture](client-architecture.md) - Mock transport implementation
