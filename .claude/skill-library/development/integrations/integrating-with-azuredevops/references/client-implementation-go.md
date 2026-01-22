# Azure DevOps Go Client Implementation

Complete Go implementation guide for Azure DevOps API integration.

**Related files:**

- [Python Implementation](client-implementation-python.md)
- [Common Patterns & Best Practices](client-implementation-common.md)

---

## Official SDK

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

---

## Repository Operations

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

---

## Pull Request Operations

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

---

## Work Item Operations

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

---

## WIQL Query

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

## Related Resources

- [azure-devops-go-api GitHub](https://github.com/microsoft/azure-devops-go-api)
- [API Reference](api-reference.md)
- [Authentication Guide](authentication.md)
