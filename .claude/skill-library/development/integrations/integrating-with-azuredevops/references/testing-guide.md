# Testing Guide

Testing strategies for Azure DevOps integrations.

---

## Test Pyramid

```
E2E Tests (5%) - Real Azure DevOps API
    ↓
Integration Tests (25%) - Mock HTTP responses
    ↓
Unit Tests (70%) - Pure logic, no external calls
```

---

## Unit Testing

### Mock Azure DevOps Client

```go
type MockAzureDevOpsClient struct {
    Repositories []git.GitRepository
    WorkItems    []wit.WorkItem
    Errors       map[string]error
}

func (m *MockAzureDevOpsClient) ListRepositories(ctx context.Context, projectID string) ([]git.GitRepository, error) {
    if err, ok := m.Errors["ListRepositories"]; ok {
        return nil, err
    }
    return m.Repositories, nil
}

func TestRepositoryScanner(t *testing.T) {
    mock := &MockAzureDevOpsClient{
        Repositories: []git.GitRepository{
            {Name: stringPtr("repo1")},
            {Name: stringPtr("repo2")},
        },
    }

    scanner := NewRepositoryScanner(mock)
    assets, err := scanner.ScanProject(context.Background(), "project1")

    assert.NoError(t, err)
    assert.Len(t, assets, 2)
}
```

---

## Integration Testing

### HTTP Mock Server

```go
func TestHTTPClient(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Verify request
        assert.Equal(t, "/project/_apis/git/repositories", r.URL.Path)
        assert.Equal(t, "7.1", r.URL.Query().Get("api-version"))

        // Mock response
        resp := `{
            "count": 1,
            "value": [
                {"id": "123", "name": "test-repo"}
            ]
        }`

        w.WriteHeader(http.StatusOK)
        w.Write([]byte(resp))
    }))
    defer server.Close()

    client := NewCustomClient(server.URL, "fake-pat")
    repos, err := client.ListRepositories(context.Background(), "project")

    assert.NoError(t, err)
    assert.Len(t, repos, 1)
}
```

---

## E2E Testing

### Real API with Test Data

```go
func TestE2E_CreateAndQueryWorkItem(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping E2E test")
    }

    client := NewAzureDevOpsClient(
        os.Getenv("AZURE_DEVOPS_ORG_URL"),
        os.Getenv("AZURE_DEVOPS_PAT"),
    )

    // Create test work item
    fields := map[string]interface{}{
        "System.Title":       "Test E2E Work Item",
        "System.Description": "Created by automated test",
        "System.Tags":        "test; automated",
    }

    workItem, err := client.CreateWorkItem(context.Background(), "TestProject", "Task", fields)
    require.NoError(t, err)
    require.NotNil(t, workItem)

    // Verify via query
    wiql := `SELECT [System.Id] FROM workitems WHERE [System.Tags] CONTAINS 'test'`
    ids, err := client.QueryWorkItems(context.Background(), "TestProject", wiql)
    require.NoError(t, err)
    assert.Contains(t, ids, *workItem.Id)

    // Cleanup
    err = client.DeleteWorkItem(context.Background(), *workItem.Id)
    require.NoError(t, err)
}
```

---

## Rate Limit Testing

```go
func TestRateLimitHandling(t *testing.T) {
    attempts := 0
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        attempts++

        if attempts < 3 {
            // Simulate rate limit
            w.Header().Set("Retry-After", "1")
            w.WriteHeader(http.StatusTooManyRequests)
            return
        }

        // Success after retries
        w.WriteHeader(http.StatusOK)
        w.Write([]byte(`{"count": 0, "value": []}`))
    }))
    defer server.Close()

    client := NewCustomClient(server.URL, "fake-pat")
    _, err := client.ListRepositories(context.Background(), "project")

    assert.NoError(t, err)
    assert.Equal(t, 3, attempts) // Verify retries occurred
}
```

---

## Webhook Testing

```go
func TestWebhookHandler(t *testing.T) {
    handler := &WebhookHandler{
        client: &MockAzureDevOpsClient{},
    }

    payload := `{
        "eventType": "git.push",
        "resource": {
            "repository": {"name": "test-repo"}
        }
    }`

    req := httptest.NewRequest("POST", "/webhooks", strings.NewReader(payload))
    w := httptest.NewRecorder()

    handler.HandleWebhook(w, req)

    assert.Equal(t, http.StatusOK, w.Code)
}
```

---

## Python Testing

```python
import pytest
from unittest.mock import Mock, patch

def test_list_repositories():
    """Test repository listing with mock"""
    mock_client = Mock()
    mock_client.get_repositories.return_value = [
        Mock(name='repo1'),
        Mock(name='repo2')
    ]

    client = AzureDevOpsClient(mock_client)
    repos = client.list_repositories('project1')

    assert len(repos) == 2
    assert repos[0].name == 'repo1'

@pytest.mark.integration
def test_real_api_call():
    """Integration test with real API"""
    client = AzureDevOpsClient(
        org_url=os.getenv('AZURE_DEVOPS_ORG_URL'),
        pat=os.getenv('AZURE_DEVOPS_PAT')
    )

    repos = client.list_repositories('TestProject')
    assert isinstance(repos, list)
```

---

## Test Data Management

### Test Fixtures

```go
func LoadTestFixture(filename string) []byte {
    data, _ := os.ReadFile(filepath.Join("testdata", filename))
    return data
}

func TestWithFixture(t *testing.T) {
    payload := LoadTestFixture("git_push_event.json")

    var event WebhookEvent
    err := json.Unmarshal(payload, &event)

    assert.NoError(t, err)
    assert.Equal(t, "git.push", event.EventType)
}
```

---

## Coverage Requirements

- **Unit Tests:** 80% minimum
- **Integration Tests:** Key workflows covered
- **E2E Tests:** Critical paths only

---

## Related Resources

- [Client Implementation](client-implementation.md)
- [Error Handling](error-handling.md)
