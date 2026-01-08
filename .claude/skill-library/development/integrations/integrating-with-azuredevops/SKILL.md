---
name: integrating-with-azuredevops
description: Use when integrating Azure DevOps with Chariot platform - covers API patterns, authentication, PR/webhook automation, repository/pipeline/work item management, and asset mapping
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite
---

# Integrating with Azure DevOps

**Comprehensive guidance for integrating Azure DevOps API with Chariot platform, covering authentication, PR automation, webhook handling, repository/pipeline/work item management, and asset mapping.**

## Prerequisites

- Azure DevOps organization access with appropriate permissions
- Personal Access Token (PAT) or OAuth token
- Chariot platform access for asset/risk mapping
- Go 1.24+ or Python 3.x for implementation

## Configuration

### Authentication Methods

| Method                    | Use Case                 | Security                        |
| ------------------------- | ------------------------ | ------------------------------- |
| Personal Access Token     | Service accounts, CI/CD  | ✅ Scoped permissions           |
| OAuth 2.0                 | User-driven integrations | ✅ Short-lived tokens           |
| Service Principal (Azure) | Azure resource access    | ✅ Federated credentials        |

**Environment Variables:**

```bash
AZURE_DEVOPS_ORG_URL=https://dev.azure.com/your-org
AZURE_DEVOPS_PAT=your-personal-access-token
AZURE_DEVOPS_PROJECT=your-project-name
```

See [references/authentication.md](references/authentication.md) for detailed setup.

## Quick Reference

| Operation             | Endpoint Pattern                                                             | Notes                         |
| --------------------- | ---------------------------------------------------------------------------- | ----------------------------- |
| List repositories     | `GET /{org}/{project}/_apis/git/repositories?api-version=7.1`                | Returns all repos in project  |
| Get PR details        | `GET /{org}/{project}/_apis/git/repositories/{repo}/pullrequests/{pr_id}`    | Includes status and reviewers |
| Create webhook        | `POST /{org}/_apis/hooks/subscriptions?api-version=7.1`                      | Supports multiple events      |
| List pipelines        | `GET /{org}/{project}/_apis/pipelines?api-version=7.1`                       | CI/CD pipeline definitions    |
| Get work item         | `GET /{org}/_apis/wit/workitems/{id}?api-version=7.1`                        | Issue/task/epic details       |
| Query work items      | `POST /{org}/{project}/_apis/wit/wiql?api-version=7.1`                       | WIQL query language           |
| List pipeline runs    | `GET /{org}/{project}/_apis/pipelines/{pipeline}/runs?api-version=7.1`       | Execution history             |
| Get pipeline run logs | `GET /{org}/{project}/_apis/build/builds/{buildId}/logs?api-version=7.1`     | Detailed run logs             |

## When to Use

Use this skill when:

- Integrating Azure DevOps repositories with Chariot asset management
- Automating PR reviews, approvals, or status checks
- Setting up webhook handlers for repository, pipeline, or work item events
- Mapping Azure DevOps data to Chariot's security model
- Implementing repository/pipeline discovery and scanning
- Building CI/CD integrations with Azure Pipelines
- Tracking work items (issues, bugs, tasks) in security workflows
- Analyzing pipeline security and detecting secrets in build logs

## Implementation

### Step 1: API Client Setup

**Initialize the Azure DevOps client with authentication:**

```go
// Example Go client setup
type AzureDevOpsClient struct {
    OrgURL      string // https://dev.azure.com/your-org
    Project     string
    PAT         string
    Client      *http.Client
    APIVersion  string // "7.1" (latest)
}

func NewAzureDevOpsClient(orgURL, project, pat string) *AzureDevOpsClient {
    return &AzureDevOpsClient{
        OrgURL:     orgURL,
        Project:    project,
        PAT:        pat,
        Client:     &http.Client{Timeout: 30 * time.Second},
        APIVersion: "7.1",
    }
}

// Request adds authentication headers
func (c *AzureDevOpsClient) Request(method, endpoint string, body io.Reader) (*http.Response, error) {
    url := fmt.Sprintf("%s/%s", c.OrgURL, endpoint)
    req, err := http.NewRequest(method, url, body)
    if err != nil {
        return nil, err
    }

    // PAT authentication uses Basic Auth with empty username
    req.SetBasicAuth("", c.PAT)
    req.Header.Set("Content-Type", "application/json")

    return c.Client.Do(req)
}
```

**Key considerations:**

- Use PATs with minimal required scopes (Code Read, Build Read, Work Items Read)
- Implement retry logic with exponential backoff
- Handle rate limiting (varies by resource type, typically 200-5000 requests per user per hour)
- Use API version 7.1 (latest stable as of 2025)

See [references/client-implementation.md](references/client-implementation.md) for complete examples.

### Step 2: Repository Discovery

**List repositories in a project:**

```go
func (c *AzureDevOpsClient) ListRepositories() ([]Repository, error) {
    endpoint := fmt.Sprintf("%s/_apis/git/repositories?api-version=%s",
        c.Project, c.APIVersion)

    resp, err := c.Request("GET", endpoint, nil)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result struct {
        Value []Repository `json:"value"`
        Count int          `json:"count"`
    }

    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    return result.Value, nil
}
```

**Chariot Asset Mapping:**

Map Azure DevOps repositories to Chariot assets with:

- `dns`: Repository clone URL (HTTPS)
- `class`: "repository"
- `source`: "azuredevops"
- Metadata: Default branch, size, last commit date, project name

See [references/asset-mapping.md](references/asset-mapping.md) for complete data model.

### Step 3: Pull Request Automation

**Retrieve PR details for review automation:**

```go
func (c *AzureDevOpsClient) GetPullRequest(repoID, prID string) (*PullRequest, error) {
    endpoint := fmt.Sprintf("%s/_apis/git/repositories/%s/pullrequests/%s?api-version=%s",
        c.Project, repoID, prID, c.APIVersion)

    resp, err := c.Request("GET", endpoint, nil)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var pr PullRequest
    if err := json.NewDecoder(resp.Body).Decode(&pr); err != nil {
        return nil, err
    }

    return &pr, nil
}
```

**Common automation patterns:**

- Auto-approve PRs from trusted contributors
- Post security scan results as comments
- Update PR status based on external checks
- Trigger Chariot scans on PR completion
- Track PR security review compliance

See [references/pr-automation.md](references/pr-automation.md) for workflows.

### Step 4: Pipeline Integration

**List pipelines and monitor builds:**

```go
func (c *AzureDevOpsClient) ListPipelines() ([]Pipeline, error) {
    endpoint := fmt.Sprintf("%s/_apis/pipelines?api-version=%s",
        c.Project, c.APIVersion)

    resp, err := c.Request("GET", endpoint, nil)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result struct {
        Value []Pipeline `json:"value"`
        Count int        `json:"count"`
    }

    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    return result.Value, nil
}

func (c *AzureDevOpsClient) GetPipelineRuns(pipelineID string) ([]PipelineRun, error) {
    endpoint := fmt.Sprintf("%s/_apis/pipelines/%s/runs?api-version=%s",
        c.Project, pipelineID, c.APIVersion)

    resp, err := c.Request("GET", endpoint, nil)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result struct {
        Value []PipelineRun `json:"value"`
        Count int           `json:"count"`
    }

    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    return result.Value, nil
}
```

**Pipeline security use cases:**

- Detect secrets in build logs
- Monitor pipeline permissions and service connections
- Track deployment approvals and gates
- Analyze pipeline configuration for security issues

See [references/pipeline-integration.md](references/pipeline-integration.md) for patterns.

### Step 5: Work Item Tracking

**Query work items using WIQL (Work Item Query Language):**

```go
func (c *AzureDevOpsClient) QueryWorkItems(query string) ([]int, error) {
    endpoint := fmt.Sprintf("%s/_apis/wit/wiql?api-version=%s",
        c.Project, c.APIVersion)

    body := map[string]string{"query": query}
    jsonBody, _ := json.Marshal(body)

    resp, err := c.Request("POST", endpoint, bytes.NewBuffer(jsonBody))
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result struct {
        WorkItems []struct {
            ID int `json:"id"`
        } `json:"workItems"`
    }

    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    ids := make([]int, len(result.WorkItems))
    for i, wi := range result.WorkItems {
        ids[i] = wi.ID
    }

    return ids, nil
}

func (c *AzureDevOpsClient) GetWorkItem(id int) (*WorkItem, error) {
    endpoint := fmt.Sprintf("_apis/wit/workitems/%d?api-version=%s", id, c.APIVersion)

    resp, err := c.Request("GET", endpoint, nil)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var wi WorkItem
    if err := json.NewDecoder(resp.Body).Decode(&wi); err != nil {
        return nil, err
    }

    return &wi, nil
}
```

**Work item integration patterns:**

- Link security findings to work items (bugs, tasks)
- Track vulnerability remediation progress
- Generate compliance reports from work item queries
- Automate work item creation from scan results

See [references/work-item-integration.md](references/work-item-integration.md) for examples.

### Step 6: Webhook Configuration

**Set up webhooks for repository, pipeline, and work item events:**

```go
type WebhookSubscription struct {
    PublisherID   string                 `json:"publisherId"`
    EventType     string                 `json:"eventType"`
    ResourceVersion string               `json:"resourceVersion"`
    ConsumerID    string                 `json:"consumerId"`
    ConsumerActionID string              `json:"consumerActionId"`
    ConsumerInputs map[string]string     `json:"consumerInputs"`
    PublisherInputs map[string]string    `json:"publisherInputs"`
}

func (c *AzureDevOpsClient) CreateWebhook(subscription WebhookSubscription) error {
    endpoint := fmt.Sprintf("_apis/hooks/subscriptions?api-version=%s", c.APIVersion)

    jsonBody, _ := json.Marshal(subscription)
    resp, err := c.Request("POST", endpoint, bytes.NewBuffer(jsonBody))
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode != 200 {
        return fmt.Errorf("webhook creation failed: %s", resp.Status)
    }

    return nil
}
```

**Supported event types:**

**Git events:**
- `git.push` - Code changes (trigger scans)
- `git.pullrequest.created` - New PR (initiate review)
- `git.pullrequest.updated` - PR changes (re-run checks)
- `git.pullrequest.merged` - PR merged (update assets)

**Build/Pipeline events:**
- `build.complete` - Build finished (analyze logs, detect secrets)
- `ms.vss-pipelines.stage-state-changed` - Pipeline stage events
- `ms.vss-pipelines.run-state-changed` - Pipeline run events

**Work Item events:**
- `workitem.created` - New work item (link to findings)
- `workitem.updated` - Work item changes (track remediation)
- `workitem.commented` - Comments added (collaboration)

See [references/webhook-events.md](references/webhook-events.md) for complete event catalog and payload examples.

## Error Handling

| Error Code            | Cause                       | Solution                                  |
| --------------------- | --------------------------- | ----------------------------------------- |
| 401 Unauthorized      | Invalid PAT or expired      | Regenerate PAT, check scopes              |
| 403 Forbidden         | Insufficient permissions    | Grant required permissions in Azure DevOps|
| 404 Not Found         | Project/repository missing  | Verify org URL, project name              |
| 429 Too Many Requests | Rate limit exceeded         | Implement backoff, cache responses        |
| 400 Bad Request       | Invalid API version/params  | Verify API version (use 7.1)              |

**Rate Limiting Strategy:**

- Rate limits vary by resource type:
  - Git operations: ~5000 requests/hour/user
  - Build API: ~1000 requests/hour/user
  - Work Items: ~200 requests/hour/user
- Monitor `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers
- Implement exponential backoff (1s, 2s, 4s, 8s)
- Cache repository and pipeline metadata (TTL: 5 minutes)
- Use continuation tokens for paginated results

See [references/error-handling.md](references/error-handling.md) for detailed strategies.

## Integration Patterns

### Pattern 1: Repository Scanner

**Discover and scan Azure DevOps repositories:**

1. List all repositories in project
2. Filter by activity and size
3. Map to Chariot assets with metadata
4. Trigger security scans (Nuclei, code analysis)
5. Update asset status and risk scores

### Pattern 2: Pipeline Security Monitor

**Monitor CI/CD pipelines for security issues:**

1. List all pipelines in project
2. Monitor pipeline runs for failures
3. Analyze build logs for secrets (API keys, passwords)
4. Check service connection permissions
5. Alert on suspicious pipeline changes

### Pattern 3: Work Item Sync

**Synchronize security findings with work items:**

1. Query work items tagged as "security" or "vulnerability"
2. Link Chariot risks to Azure DevOps work items
3. Track remediation progress via work item state
4. Generate compliance reports from work item data
5. Automate work item creation from scan results

See [references/integration-patterns.md](references/integration-patterns.md) for complete implementations.

## Testing

**Recommended test coverage:**

- Unit tests for API client methods (mock HTTP responses)
- Integration tests with Azure DevOps test organization
- Webhook handler tests (simulate event payloads)
- Rate limiting tests (verify backoff logic)
- Error handling tests (network failures, auth failures)
- WIQL query tests (validate work item queries)

See [references/testing-guide.md](references/testing-guide.md) for test patterns.

## Integration

### Called By

- Gateway skill: `gateway-integrations`
- Commands: `/integrate azuredevops`
- Agents: `integration-developer`

### Requires (invoke before starting)

| Skill                    | When  | Purpose                              |
| ------------------------ | ----- | ------------------------------------ |
| `using-skills`           | Start | Skill discovery and invocation       |
| `adhering-to-dry`        | Start | Prevent code duplication             |
| `discovering-reusable-code` | Start | Check for existing Azure DevOps code |

### Calls (during execution)

| Skill                              | Phase/Step | Purpose                        |
| ---------------------------------- | ---------- | ------------------------------ |
| `implementing-graphql-clients`     | Step 1     | If using GraphQL instead of REST |
| `developing-with-tdd`              | Testing    | Test-driven development        |
| `verifying-before-completion`      | Completion | Verify integration works       |

### Pairs With (conditional)

| Skill                            | Trigger                      | Purpose                         |
| -------------------------------- | ---------------------------- | ------------------------------- |
| `integrating-with-azure`         | Azure resource access needed | Azure service principal auth    |
| `implementing-go-plugin-registries` | Go implementation          | Plugin registry patterns        |

## References

- [references/api-reference.md](references/api-reference.md) - Complete Azure DevOps API documentation
- [references/authentication.md](references/authentication.md) - PAT, OAuth, Service Principal setup
- [references/client-implementation.md](references/client-implementation.md) - Go and Python client examples
- [references/pagination-patterns.md](references/pagination-patterns.md) - Handling continuation tokens
- [references/pr-automation.md](references/pr-automation.md) - Pull request workflows
- [references/pipeline-integration.md](references/pipeline-integration.md) - CI/CD pipeline patterns
- [references/work-item-integration.md](references/work-item-integration.md) - WIQL queries and work item tracking
- [references/webhook-events.md](references/webhook-events.md) - Event types and payloads
- [references/asset-mapping.md](references/asset-mapping.md) - Chariot data model integration
- [references/error-handling.md](references/error-handling.md) - Error recovery strategies
- [references/integration-patterns.md](references/integration-patterns.md) - Common integration architectures
- [references/testing-guide.md](references/testing-guide.md) - Test patterns and examples

## Related Resources

### Official Documentation

- **Azure DevOps REST API**: https://learn.microsoft.com/en-us/rest/api/azure/devops/
- **Git API**: https://learn.microsoft.com/en-us/rest/api/azure/devops/git/
- **Pipelines API**: https://learn.microsoft.com/en-us/rest/api/azure/devops/pipelines/
- **Work Items API**: https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/
- **Service Hooks (Webhooks)**: https://learn.microsoft.com/en-us/azure/devops/service-hooks/
- **Authentication**: https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/
- **PAT Management**: https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate
- **Rate Limits**: https://learn.microsoft.com/en-us/azure/devops/integrate/concepts/rate-limits
