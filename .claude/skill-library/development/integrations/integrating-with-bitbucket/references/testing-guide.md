# Testing Guide

**Testing strategies for Bitbucket API integrations.**

---

## Unit Tests

### Mock HTTP Client (Go)

```go
type MockHTTPClient struct {
    ResponseStatus int
    ResponseBody   string
}

func (m *MockHTTPClient) Do(req *http.Request) (*http.Response, error) {
    return &http.Response{
        StatusCode: m.ResponseStatus,
        Body:       io.NopCloser(strings.NewReader(m.ResponseBody)),
    }, nil
}

func TestListRepositories(t *testing.T) {
    mockClient := &MockHTTPClient{
        ResponseStatus: 200,
        ResponseBody: `{
            "values": [
                {"full_name": "workspace/repo1"},
                {"full_name": "workspace/repo2"}
            ],
            "next": ""
        }`,
    }

    client := &BitbucketClient{HTTPClient: mockClient}
    repos, err := client.ListRepositories("workspace")

    assert.NoError(t, err)
    assert.Len(t, repos, 2)
}
```

### Python Unit Tests (pytest)

```python
import pytest
from unittest.mock import Mock, patch

def test_list_repositories(bitbucket_client):
    # Mock response
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "values": [
            {"full_name": "workspace/repo1"},
            {"full_name": "workspace/repo2"}
        ],
        "next": ""
    }

    with patch.object(bitbucket_client.session, 'request', return_value=mock_response):
        repos = bitbucket_client.list_repositories("workspace")

    assert len(repos) == 2
    assert repos[0]["full_name"] == "workspace/repo1"
```

---

## Integration Tests

### Test Against Bitbucket Test Workspace

```go
func TestIntegration_ListRepositories(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping integration test")
    }

    client := NewClient(
        os.Getenv("BITBUCKET_TEST_EMAIL"),
        os.Getenv("BITBUCKET_TEST_API_TOKEN"),
    )

    repos, err := client.ListRepositories("test-workspace")
    assert.NoError(t, err)
    assert.Greater(t, len(repos), 0)
}
```

---

## Webhook Tests

### Test Signature Verification

```go
func TestWebhookSignatureVerification(t *testing.T) {
    secret := "test-secret"
    body := `{"test": "payload"}`

    // Compute expected signature
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write([]byte(body))
    expectedSig := "sha256=" + hex.EncodeToString(mac.Sum(nil))

    // Create request
    req := httptest.NewRequest("POST", "/webhooks", strings.NewReader(body))
    req.Header.Set("X-Hub-Signature", expectedSig)

    // Verify
    verified, err := verifyWebhookSignature(req, secret)
    assert.NoError(t, err)
    assert.Equal(t, body, string(verified))
}
```

---

## Test Coverage Targets

- Unit tests: 80%+ coverage
- Integration tests: All critical API endpoints
- Webhook tests: All event types, signature verification
- Error handling tests: Network failures, rate limits, timeouts

---

## Related Documentation

- [client-implementation.md](client-implementation.md) - Client code to test
- [webhook-events.md](webhook-events.md) - Webhook testing patterns
