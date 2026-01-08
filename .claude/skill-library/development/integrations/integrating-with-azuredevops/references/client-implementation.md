# Azure DevOps Client Implementation

Complete implementation guides for Go and Python Azure DevOps API clients.

---

## Go Implementation

### Official SDK

**Package:** `github.com/microsoft/azure-devops-go-api/azuredevops`
**Version:** v7 (aligned with REST API 7.x)

### Installation

```bash
go get github.com/microsoft/azure-devops-go-api/azuredevops
```

### Basic Client Setup

```go
package main

import (
    "context"
    "fmt"
    "os"

    "github.com/microsoft/azure-devops-go-api/azuredevops"
    "github.com/microsoft/azure-devops-go-api/azuredevops/core"
    "github.com/microsoft/azure-devops-go-api/azuredevops/git"
    "github.com/microsoft/azure-devops-go-api/azuredevops/wit"
)

type AzureDevOpsClient struct {
    connection *azuredevops.Connection
    coreClient core.Client
    gitClient  git.Client
    witClient  wit.Client
}

func NewAzureDevOpsClient(orgURL, pat string) (*AzureDevOpsClient, error) {
    // Create connection with PAT
    connection := azuredevops.NewPatConnection(orgURL, pat)

    // Configure connection
    connection.UserAgent = "Chariot/1.0"

    ctx := context.Background()

    // Initialize service clients
    coreClient, err := core.NewClient(ctx, connection)
    if err != nil {
        return nil, fmt.Errorf("failed to create core client: %w", err)
    }

    gitClient, err := git.NewClient(ctx, connection)
    if err != nil {
        return nil, fmt.Errorf("failed to create git client: %w", err)
    }

    witClient, err := wit.NewClient(ctx, connection)
    if err != nil {
        return nil, fmt.Errorf("failed to create work item client: %w", err)
    }

    return &AzureDevOpsClient{
        connection: connection,
        coreClient: coreClient,
        gitClient:  gitClient,
        witClient:  witClient,
    }, nil
}
```

### Production-Ready Client with Connection Pooling

```go
package azdo

import (
    "crypto/tls"
    "net/http"
    "time"

    "github.com/microsoft/azure-devops-go-api/azuredevops"
)

type ProductionClient struct {
    connection *azuredevops.Connection
    httpClient *http.Client
}

func NewProductionClient(orgURL, pat string) (*ProductionClient, error) {
    // Configure HTTP client with connection pooling
    transport := &http.Transport{
        MaxIdleConns:        100,
        MaxIdleConnsPerHost: 20, // Critical: default is 2!
        IdleConnTimeout:     90 * time.Second,
        TLSClientConfig: &tls.Config{
            MinVersion: tls.VersionTLS12,
            MaxVersion: tls.VersionTLS13,
        },
    }

    httpClient := &http.Client{
        Transport: transport,
        Timeout:   30 * time.Second,
    }

    // Create connection
    connection := azuredevops.NewPatConnection(orgURL, pat)
    connection.UserAgent = "Chariot/1.0"

    // Set custom HTTP client
    connection.HttpClient = httpClient

    return &ProductionClient{
        connection: connection,
        httpClient: httpClient,
    }, nil
}
```

### Repository Operations

```go
func (c *AzureDevOpsClient) ListRepositories(ctx context.Context, projectID string) ([]git.GitRepository, error) {
    args := git.GetRepositoriesArgs{
        Project: &projectID,
    }

    repos, err := c.gitClient.GetRepositories(ctx, args)
    if err != nil {
        return nil, fmt.Errorf("failed to list repositories: %w", err)
    }

    return *repos, nil
}

func (c *AzureDevOpsClient) GetRepository(ctx context.Context, projectID, repoID string) (*git.GitRepository, error) {
    args := git.GetRepositoryArgs{
        Project:      &projectID,
        RepositoryId: &repoID,
    }

    repo, err := c.gitClient.GetRepository(ctx, args)
    if err != nil {
        return nil, fmt.Errorf("failed to get repository: %w", err)
    }

    return repo, nil
}
```

### Pull Request Operations

```go
func (c *AzureDevOpsClient) GetPullRequest(ctx context.Context, projectID, repoID string, prID int) (*git.GitPullRequest, error) {
    args := git.GetPullRequestArgs{
        Project:       &projectID,
        RepositoryId:  &repoID,
        PullRequestId: &prID,
    }

    pr, err := c.gitClient.GetPullRequest(ctx, args)
    if err != nil {
        return nil, fmt.Errorf("failed to get PR: %w", err)
    }

    return pr, nil
}

func (c *AzureDevOpsClient) ListPullRequests(ctx context.Context, projectID, repoID string) ([]git.GitPullRequest, error) {
    args := git.GetPullRequestsArgs{
        Project:      &projectID,
        RepositoryId: &repoID,
    }

    prs, err := c.gitClient.GetPullRequests(ctx, args)
    if err != nil {
        return nil, fmt.Errorf("failed to list PRs: %w", err)
    }

    return *prs, nil
}
```

### Work Item Operations

```go
func (c *AzureDevOpsClient) GetWorkItem(ctx context.Context, id int) (*wit.WorkItem, error) {
    args := wit.GetWorkItemArgs{
        Id: &id,
    }

    workItem, err := c.witClient.GetWorkItem(ctx, args)
    if err != nil {
        return nil, fmt.Errorf("failed to get work item: %w", err)
    }

    return workItem, nil
}

func (c *AzureDevOpsClient) GetWorkItemsBatch(ctx context.Context, ids []int) (*[]wit.WorkItem, error) {
    args := wit.GetWorkItemsArgs{
        Ids: &ids,
    }

    workItems, err := c.witClient.GetWorkItems(ctx, args)
    if err != nil {
        return nil, fmt.Errorf("failed to get work items: %w", err)
    }

    return workItems, nil
}

func (c *AzureDevOpsClient) CreateWorkItem(ctx context.Context, projectID, workItemType string, fields map[string]interface{}) (*wit.WorkItem, error) {
    // Build JSON Patch document
    var document []webapi.JsonPatchOperation

    for path, value := range fields {
        op := webapi.JsonPatchOperation{
            Op:    &webapi.OperationValues.Add,
            Path:  stringPtr(fmt.Sprintf("/fields/%s", path)),
            Value: value,
        }
        document = append(document, op)
    }

    args := wit.CreateWorkItemArgs{
        Document: &document,
        Project:  &projectID,
        Type:     &workItemType,
    }

    workItem, err := c.witClient.CreateWorkItem(ctx, args)
    if err != nil {
        return nil, fmt.Errorf("failed to create work item: %w", err)
    }

    return workItem, nil
}
```

### WIQL Query

```go
func (c *AzureDevOpsClient) QueryWorkItems(ctx context.Context, projectID, wiql string) ([]int, error) {
    query := wit.Wiql{
        Query: &wiql,
    }

    args := wit.QueryByWiqlArgs{
        Wiql:    &query,
        Project: &projectID,
    }

    result, err := c.witClient.QueryByWiql(ctx, args)
    if err != nil {
        return nil, fmt.Errorf("failed to query work items: %w", err)
    }

    var ids []int
    if result.WorkItems != nil {
        for _, item := range *result.WorkItems {
            if item.Id != nil {
                ids = append(ids, *item.Id)
            }
        }
    }

    return ids, nil
}
```

---

## Python Implementation

### Official SDK

**Package:** `azure-devops`
**Installation:**

```bash
pip install azure-devops
```

### Basic Client Setup

```python
from azure.devops.connection import Connection
from msrest.authentication import BasicAuthentication
import os

class AzureDevOpsClient:
    def __init__(self, org_url: str, pat: str):
        # Create authentication
        credentials = BasicAuthentication('', pat)

        # Create connection
        self.connection = Connection(
            base_url=org_url,
            creds=credentials
        )

        # Initialize clients
        self.core_client = self.connection.clients.get_core_client()
        self.git_client = self.connection.clients.get_git_client()
        self.wit_client = self.connection.clients.get_work_item_tracking_client()
        self.build_client = self.connection.clients.get_build_client()

    def close(self):
        """Close connection"""
        self.connection.close()

# Usage
client = AzureDevOpsClient(
    org_url='https://dev.azure.com/myorg',
    pat=os.getenv('AZURE_DEVOPS_PAT')
)
```

### Context Manager Pattern

```python
from contextlib import contextmanager

@contextmanager
def azure_devops_client(org_url: str, pat: str):
    """Context manager for AzureDevOpsClient"""
    client = AzureDevOpsClient(org_url, pat)
    try:
        yield client
    finally:
        client.close()

# Usage
with azure_devops_client(org_url, pat) as client:
    repos = client.git_client.get_repositories(project_id)
```

### Repository Operations

```python
def list_repositories(self, project_id: str):
    """List all repositories in a project"""
    repos = self.git_client.get_repositories(project_id)
    return repos

def get_repository(self, project_id: str, repo_id: str):
    """Get a single repository"""
    repo = self.git_client.get_repository(
        project=project_id,
        repository_id=repo_id
    )
    return repo

def get_pull_request(self, project_id: str, repo_id: str, pr_id: int):
    """Get pull request details"""
    pr = self.git_client.get_pull_request(
        project=project_id,
        repository_id=repo_id,
        pull_request_id=pr_id
    )
    return pr
```

### Work Item Operations

```python
from azure.devops.v7_1.work_item_tracking.models import JsonPatchOperation

def get_work_item(self, work_item_id: int):
    """Get a single work item"""
    work_item = self.wit_client.get_work_item(work_item_id)
    return work_item

def get_work_items_batch(self, work_item_ids: list[int]):
    """Get multiple work items (up to 200)"""
    work_items = self.wit_client.get_work_items(ids=work_item_ids)
    return work_items

def create_work_item(self, project_id: str, work_item_type: str, fields: dict):
    """Create a work item using JSON Patch"""
    document = []

    for field_path, value in fields.items():
        document.append(
            JsonPatchOperation(
                op='add',
                path=f'/fields/{field_path}',
                value=value
            )
        )

    work_item = self.wit_client.create_work_item(
        document=document,
        project=project_id,
        type=work_item_type
    )

    return work_item

def update_work_item(self, work_item_id: int, fields: dict):
    """Update a work item using JSON Patch"""
    document = []

    for field_path, value in fields.items():
        document.append(
            JsonPatchOperation(
                op='replace',
                path=f'/fields/{field_path}',
                value=value
            )
        )

    work_item = self.wit_client.update_work_item(
        document=document,
        id=work_item_id
    )

    return work_item
```

### WIQL Query

```python
from azure.devops.v7_1.work_item_tracking.models import Wiql

def query_work_items(self, project_id: str, wiql_query: str):
    """Execute WIQL query"""
    wiql = Wiql(query=wiql_query)

    result = self.wit_client.query_by_wiql(
        wiql=wiql,
        project=project_id
    )

    # Extract work item IDs
    if result.work_items:
        ids = [item.id for item in result.work_items]

        # Fetch full work items (batch)
        if ids:
            work_items = self.get_work_items_batch(ids)
            return work_items

    return []
```

### Error Handling

```python
from azure.devops.exceptions import AzureDevOpsServiceError

def safe_get_work_item(self, work_item_id: int):
    """Get work item with error handling"""
    try:
        return self.wit_client.get_work_item(work_item_id)
    except AzureDevOpsServiceError as e:
        if e.status_code == 404:
            print(f"Work item {work_item_id} not found")
            return None
        elif e.status_code == 401:
            print("Authentication failed - check PAT")
            raise
        elif e.status_code == 429:
            print("Rate limited - backing off")
            raise
        else:
            print(f"Error: {e.message}")
            raise
```

---

## Custom HTTP Client (Alternative)

### When to Use Custom Client

Use custom HTTP client when:
- Need very specific behavior not in SDK
- Working with unsupported languages
- Minimizing dependencies

### Go Custom HTTP Client

```go
package azdo

import (
    "bytes"
    "context"
    "encoding/base64"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
)

type CustomClient struct {
    orgURL     string
    pat        string
    httpClient *http.Client
}

func NewCustomClient(orgURL, pat string) *CustomClient {
    return &CustomClient{
        orgURL: orgURL,
        pat:    pat,
        httpClient: &http.Client{
            Timeout: 30 * time.Second,
        },
    }
}

func (c *CustomClient) request(ctx context.Context, method, path string, body interface{}) ([]byte, error) {
    var bodyReader io.Reader
    if body != nil {
        jsonBody, err := json.Marshal(body)
        if err != nil {
            return nil, err
        }
        bodyReader = bytes.NewBuffer(jsonBody)
    }

    url := fmt.Sprintf("%s/_apis/%s?api-version=7.1", c.orgURL, path)
    req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
    if err != nil {
        return nil, err
    }

    // PAT authentication: Base64 encode ":{PAT}"
    auth := base64.StdEncoding.EncodeToString([]byte(":" + c.pat))
    req.Header.Set("Authorization", "Basic "+auth)
    req.Header.Set("Content-Type", "application/json")

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    respBody, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, err
    }

    if resp.StatusCode >= 400 {
        return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(respBody))
    }

    return respBody, nil
}
```

---

## Best Practices

### 1. Connection Reuse

**✅ DO:**
```go
// Reuse single client instance
client := NewAzureDevOpsClient(orgURL, pat)
defer client.Close()

// Use for multiple operations
repos := client.ListRepositories(ctx, projectID)
prs := client.ListPullRequests(ctx, projectID, repoID)
```

**❌ DON'T:**
```go
// Creating new client per request
for _, repo := range repos {
    client := NewAzureDevOpsClient(orgURL, pat) // BAD!
    prs := client.ListPullRequests(ctx, projectID, repo.ID)
}
```

### 2. Context Usage

**✅ DO:**
```go
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()

workItem, err := client.GetWorkItem(ctx, 123)
```

### 3. Batch Operations

**✅ DO:**
```go
// Batch get (1 API call)
ids := []int{1, 2, 3, 4, 5}
workItems, err := client.GetWorkItemsBatch(ctx, ids)
```

**❌ DON'T:**
```go
// Individual gets (5 API calls)
for _, id := range ids {
    workItem, err := client.GetWorkItem(ctx, id)
}
```

---

## Related Resources

- [azure-devops-go-api GitHub](https://github.com/microsoft/azure-devops-go-api)
- [azure-devops-python-api GitHub](https://github.com/microsoft/azure-devops-python-api)
- [API Reference](api-reference.md)
- [Authentication Guide](authentication.md)
