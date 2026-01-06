# Production Examples

Real-world GraphQL client implementations demonstrating batch queries, rate limiting, and error handling.

## Gato-X: Batch Workflow Retrieval

Gato-X is a security scanning tool that retrieves GitHub Actions workflows across thousands of repositories. It achieves **3x performance improvement** over REST by batching GraphQL queries.

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
│  Repository     │────▶│  GraphQL Batch   │────▶│  Workflow      │
│  List (5000)    │     │  Query (50/batch)│     │  Processor     │
└─────────────────┘     └──────────────────┘     └────────────────┘
         │                       │                        │
         │              ┌────────▼────────┐              │
         │              │  Rate Limiter   │              │
         │              │  (5000 pts/hr)  │              │
         │              └─────────────────┘              │
         │                                               │
         └───────────────────────────────────────────────┘
                    Feedback loop for cursor state
```

### Implementation

```go
package gatox

import (
    "context"
    "fmt"
    "sync"
    "time"

    "github.com/shurcooL/githubv4"
    "golang.org/x/oauth2"
    "golang.org/x/sync/errgroup"
)

const (
    batchSize        = 50  // Repositories per GraphQL query
    maxConcurrency   = 10  // Parallel workflow processors
    rateLimitBuffer  = 250 // 5% of 5000
)

// WorkflowScanner retrieves GitHub Actions workflows efficiently
type WorkflowScanner struct {
    client      *githubv4.Client
    rateLimiter *RateLimiter
}

// Workflow represents a GitHub Actions workflow file
type Workflow struct {
    RepoOwner string
    RepoName  string
    Path      string
    Content   string
    OID       string
}

// BatchWorkflowQuery queries multiple repositories in one request
type BatchWorkflowQuery struct {
    Nodes []struct {
        NameWithOwner githubv4.String
        Object        struct {
            Tree struct {
                Entries []struct {
                    Name   githubv4.String
                    Oid    githubv4.GitObjectID
                    Object struct {
                        Blob struct {
                            Text githubv4.String
                        } `graphql:"... on Blob"`
                    }
                }
            } `graphql:"... on Tree"`
        } `graphql:"object(expression: \"HEAD:.github/workflows\")"`
    } `graphql:"nodes"`

    RateLimit struct {
        Cost      githubv4.Int
        Remaining githubv4.Int
        ResetAt   githubv4.DateTime
    }
}

// GetWorkflows retrieves all workflows for a list of repositories
func (s *WorkflowScanner) GetWorkflows(ctx context.Context, repos []string) ([]Workflow, error) {
    var allWorkflows []Workflow
    var mu sync.Mutex

    // Process in batches
    for i := 0; i < len(repos); i += batchSize {
        end := i + batchSize
        if end > len(repos) {
            end = len(repos)
        }
        batch := repos[i:end]

        // Check rate limit before batch
        if err := s.rateLimiter.CheckAndWait(ctx, batchSize*2); err != nil {
            return nil, fmt.Errorf("rate limit wait: %w", err)
        }

        // Query batch
        workflows, err := s.queryBatch(ctx, batch)
        if err != nil {
            // Log and continue on partial failure
            fmt.Printf("Batch %d-%d failed: %v\n", i, end, err)
            continue
        }

        mu.Lock()
        allWorkflows = append(allWorkflows, workflows...)
        mu.Unlock()

        // Progress logging
        fmt.Printf("Processed %d/%d repositories\n", end, len(repos))
    }

    return allWorkflows, nil
}

func (s *WorkflowScanner) queryBatch(ctx context.Context, repos []string) ([]Workflow, error) {
    // Build node IDs for batch query
    // GitHub requires specific node ID format for batch lookups
    query := `
        query BatchWorkflows($ids: [ID!]!) {
            nodes(ids: $ids) {
                ... on Repository {
                    nameWithOwner
                    object(expression: "HEAD:.github/workflows") {
                        ... on Tree {
                            entries {
                                name
                                oid
                                object {
                                    ... on Blob {
                                        text
                                    }
                                }
                            }
                        }
                    }
                }
            }
            rateLimit {
                cost
                remaining
                resetAt
            }
        }
    `

    // Execute query
    var result BatchWorkflowQuery
    variables := map[string]interface{}{
        "ids": repoNamesToNodeIDs(repos),
    }

    if err := s.client.Query(ctx, &result, variables); err != nil {
        return nil, err
    }

    // Update rate limiter
    s.rateLimiter.Update(int(result.RateLimit.Remaining), result.RateLimit.ResetAt.Time)

    // Extract workflows
    var workflows []Workflow
    for _, node := range result.Nodes {
        owner, name := parseNameWithOwner(string(node.NameWithOwner))
        for _, entry := range node.Object.Tree.Entries {
            workflows = append(workflows, Workflow{
                RepoOwner: owner,
                RepoName:  name,
                Path:      fmt.Sprintf(".github/workflows/%s", entry.Name),
                Content:   string(entry.Object.Blob.Text),
                OID:       string(entry.Oid),
            })
        }
    }

    return workflows, nil
}

// Performance comparison
// REST:    3 requests per repo × 5000 repos = 15,000 requests (hits rate limit at 1,666 repos)
// GraphQL: 50 repos per request × 100 requests = 5,000 repos (within rate limit)
// Result:  3x throughput improvement
```

### Performance Results

| Metric            | REST API      | GraphQL Batch  |
| ----------------- | ------------- | -------------- |
| Requests per repo | 3             | 0.02 (1/50)    |
| Rate limit usage  | 3 points/repo | ~2 points/repo |
| Max repos/hour    | 1,666         | 5,000          |
| Throughput        | 1x            | **3x**         |

---

## Wiz Integration: Paginated Entity Fetching

The Wiz integration in Chariot demonstrates clean pagination with concurrent processing.

### Implementation

```go
package wiz

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "net/http"

    "golang.org/x/sync/errgroup"
)

const (
    wizGraphQLEndpoint = "https://api.wiz.io/graphql"
    pageSize           = 50
    maxConcurrency     = 10
)

// WizClient handles Wiz GraphQL API interactions
type WizClient struct {
    httpClient  *http.Client
    accessToken string
}

// Project represents a Wiz project
type Project struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}

// Issue represents a Wiz security issue
type Issue struct {
    ID       string `json:"id"`
    Title    string `json:"title"`
    Severity string `json:"severity"`
}

// FetchAllProjects retrieves all projects with pagination
func (c *WizClient) FetchAllProjects(ctx context.Context) ([]Project, error) {
    var allProjects []Project
    var cursor *string

    query := `
        query GetProjects($first: Int!, $after: String) {
            projects(first: $first, after: $after) {
                nodes {
                    id
                    name
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
    `

    for {
        variables := map[string]interface{}{
            "first": pageSize,
            "after": cursor,
        }

        result, err := c.executeQuery(ctx, query, variables)
        if err != nil {
            return nil, err
        }

        var resp struct {
            Data struct {
                Projects struct {
                    Nodes    []Project `json:"nodes"`
                    PageInfo struct {
                        HasNextPage bool   `json:"hasNextPage"`
                        EndCursor   string `json:"endCursor"`
                    } `json:"pageInfo"`
                } `json:"projects"`
            } `json:"data"`
        }

        if err := json.Unmarshal(result, &resp); err != nil {
            return nil, err
        }

        allProjects = append(allProjects, resp.Data.Projects.Nodes...)

        if !resp.Data.Projects.PageInfo.HasNextPage {
            break
        }
        cursor = &resp.Data.Projects.PageInfo.EndCursor
    }

    return allProjects, nil
}

// FetchIssuesForProjects fetches issues concurrently with bounded parallelism
func (c *WizClient) FetchIssuesForProjects(ctx context.Context, projects []Project) (map[string][]Issue, error) {
    results := make(map[string][]Issue)
    var mu sync.Mutex

    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(maxConcurrency) // Bounded concurrency

    for _, project := range projects {
        project := project // Capture for goroutine
        g.Go(func() error {
            issues, err := c.fetchProjectIssues(ctx, project.ID)
            if err != nil {
                // Log error but continue processing other projects
                fmt.Printf("Failed to fetch issues for %s: %v\n", project.Name, err)
                return nil // Don't fail entire batch
            }

            mu.Lock()
            results[project.ID] = issues
            mu.Unlock()
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }

    return results, nil
}

func (c *WizClient) fetchProjectIssues(ctx context.Context, projectID string) ([]Issue, error) {
    var allIssues []Issue
    var cursor *string

    query := `
        query GetIssues($projectId: ID!, $first: Int!, $after: String) {
            issues(filterBy: { project: [$projectId] }, first: $first, after: $after) {
                nodes {
                    id
                    title
                    severity
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
    `

    for {
        variables := map[string]interface{}{
            "projectId": projectID,
            "first":     20, // Smaller page for nested queries
            "after":     cursor,
        }

        result, err := c.executeQuery(ctx, query, variables)
        if err != nil {
            return nil, err
        }

        var resp struct {
            Data struct {
                Issues struct {
                    Nodes    []Issue `json:"nodes"`
                    PageInfo struct {
                        HasNextPage bool   `json:"hasNextPage"`
                        EndCursor   string `json:"endCursor"`
                    } `json:"pageInfo"`
                } `json:"issues"`
            } `json:"data"`
        }

        if err := json.Unmarshal(result, &resp); err != nil {
            return nil, err
        }

        allIssues = append(allIssues, resp.Data.Issues.Nodes...)

        if !resp.Data.Issues.PageInfo.HasNextPage {
            break
        }
        cursor = &resp.Data.Issues.PageInfo.EndCursor
    }

    return allIssues, nil
}

func (c *WizClient) executeQuery(ctx context.Context, query string, variables map[string]interface{}) (json.RawMessage, error) {
    reqBody := map[string]interface{}{
        "query":     query,
        "variables": variables,
    }

    body, _ := json.Marshal(reqBody)
    req, _ := http.NewRequestWithContext(ctx, "POST", wizGraphQLEndpoint, bytes.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+c.accessToken)

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result json.RawMessage
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    return result, nil
}
```

### Key Patterns Demonstrated

1. **Clean pagination loop** with explicit `hasNextPage` check
2. **Bounded concurrency** using `errgroup.SetLimit()`
3. **Partial failure handling** (log and continue)
4. **Smaller page sizes** for nested queries (20 vs 50)
5. **Mutex-protected** result aggregation

---

## Generic Batch Query Builder

A reusable pattern for dynamic batch queries:

```go
package graphql

import (
    "fmt"
    "strings"
)

// BatchQueryBuilder constructs aliased queries dynamically
type BatchQueryBuilder struct {
    queries []string
    aliases map[string]string
}

// NewBatchQueryBuilder creates a new builder
func NewBatchQueryBuilder() *BatchQueryBuilder {
    return &BatchQueryBuilder{
        aliases: make(map[string]string),
    }
}

// AddRepository adds a repository query with auto-generated alias
func (b *BatchQueryBuilder) AddRepository(owner, name string) string {
    alias := fmt.Sprintf("repo_%d", len(b.queries))
    query := fmt.Sprintf(`%s: repository(owner: "%s", name: "%s") {
        nameWithOwner
        object(expression: "HEAD:.github/workflows") {
            ... on Tree {
                entries { name, oid }
            }
        }
    }`, alias, owner, name)

    b.queries = append(b.queries, query)
    b.aliases[alias] = fmt.Sprintf("%s/%s", owner, name)
    return alias
}

// Build constructs the final query
func (b *BatchQueryBuilder) Build() string {
    return fmt.Sprintf(`query BatchQuery {
    %s
    rateLimit { cost, remaining, resetAt }
}`, strings.Join(b.queries, "\n    "))
}

// GetAliasMapping returns alias -> repository name mapping
func (b *BatchQueryBuilder) GetAliasMapping() map[string]string {
    return b.aliases
}

// Usage
func example() {
    builder := NewBatchQueryBuilder()

    repos := []struct{ owner, name string }{
        {"org1", "repo1"},
        {"org1", "repo2"},
        {"org2", "repo3"},
    }

    for _, r := range repos {
        builder.AddRepository(r.owner, r.name)
    }

    query := builder.Build()
    // Execute query...

    // Parse response using alias mapping
    mapping := builder.GetAliasMapping()
    // mapping["repo_0"] = "org1/repo1"
}
```

## Production Checklist

Before deploying GraphQL batch queries:

- [ ] **Batch size tuning**: Start with 50, adjust based on rate limit costs
- [ ] **Rate limit monitoring**: Include `rateLimit` in every query
- [ ] **Concurrency limits**: Use `errgroup.SetLimit()` or semaphores
- [ ] **Partial failure handling**: Continue on individual failures
- [ ] **Progress logging**: Report processed count periodically
- [ ] **Cursor state persistence**: Save cursors for resumability
- [ ] **Error classification**: Distinguish retryable vs fatal errors
- [ ] **Metrics collection**: Track latency, error rate, throughput

## References

- [Gato-X Repository](https://github.com/praetorian-inc/gato-x) - Security scanning tool
- Chariot Wiz Integration: `modules/chariot/backend/pkg/tasks/integrations/wiz/wiz.go`
