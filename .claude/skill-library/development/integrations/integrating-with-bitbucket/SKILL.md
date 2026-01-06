---
name: integrating-with-bitbucket
description: Use when integrating Bitbucket with Chariot platform - covers API patterns, authentication, PR/webhook automation, repository management, and asset mapping
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite
---

# Integrating with Bitbucket

**Comprehensive guidance for integrating Bitbucket API with Chariot platform, covering authentication, PR automation, webhook handling, and asset mapping.**

## Prerequisites

- Bitbucket workspace access with appropriate permissions
- API credentials (App Password or OAuth token)
- Chariot platform access for asset/risk mapping
- Go 1.24+ or Python 3.x for implementation

## Configuration

### Authentication Methods

| Method                | Use Case                 | Security                        |
| --------------------- | ------------------------ | ------------------------------- |
| App Password          | Service accounts, CI/CD  | ✅ Scoped permissions           |
| OAuth 2.0             | User-driven integrations | ✅ Short-lived tokens           |
| Personal Access Token | Development/testing      | ⚠️ Long-lived, rotate regularly |

**Environment Variables:**

```bash
BITBUCKET_USERNAME=your-username
BITBUCKET_APP_PASSWORD=your-app-password
BITBUCKET_WORKSPACE=your-workspace
```

See [references/authentication.md](references/authentication.md) for detailed setup.

## Quick Reference

| Operation         | Endpoint Pattern                                                | Notes                       |
| ----------------- | --------------------------------------------------------------- | --------------------------- |
| List repositories | `GET /2.0/repositories/{workspace}`                             | Paginated results           |
| Get PR details    | `GET /2.0/repositories/{workspace}/{repo}/pullrequests/{pr_id}` | Includes diffs and metadata |
| Create webhook    | `POST /2.0/repositories/{workspace}/{repo}/hooks`               | Supports multiple events    |
| Search code       | `GET /2.0/repositories/{workspace}/{repo}/src/{commit}/{path}`  | File content retrieval      |

## When to Use

Use this skill when:

- Integrating Bitbucket repositories with Chariot asset management
- Automating PR reviews, approvals, or status checks
- Setting up webhook handlers for repository events
- Mapping Bitbucket data to Chariot's security model
- Implementing repository discovery and scanning
- Building CI/CD integrations with Bitbucket Pipelines

## Implementation

### Step 1: API Client Setup

**Initialize the Bitbucket client with authentication:**

```go
// Example Go client setup
type BitbucketClient struct {
    BaseURL  string
    Username string
    Password string // App Password
    Client   *http.Client
}

func NewBitbucketClient(username, password string) *BitbucketClient {
    return &BitbucketClient{
        BaseURL:  "https://api.bitbucket.org/2.0",
        Username: username,
        Password: password,
        Client:   &http.Client{Timeout: 30 * time.Second},
    }
}
```

**Key considerations:**

- Use App Passwords with minimal required scopes
- Implement retry logic with exponential backoff
- Handle rate limiting (API limit: 1000 requests/hour/user)

See [references/client-implementation.md](references/client-implementation.md) for complete examples.

### Step 2: Repository Discovery

**List repositories in a workspace:**

```go
func (c *BitbucketClient) ListRepositories(workspace string) ([]Repository, error) {
    url := fmt.Sprintf("%s/repositories/%s", c.BaseURL, workspace)
    // Paginated request handling
    // See references/pagination-patterns.md
}
```

**Chariot Asset Mapping:**

Map Bitbucket repositories to Chariot assets with:

- `dns`: Repository clone URL (HTTPS)
- `class`: "repository"
- `source`: "bitbucket"
- Metadata: Last commit date, visibility, description

See [references/asset-mapping.md](references/asset-mapping.md) for complete data model.

### Step 3: Pull Request Automation

**Retrieve PR details for review automation:**

```go
func (c *BitbucketClient) GetPullRequest(workspace, repo, prID string) (*PullRequest, error) {
    url := fmt.Sprintf("%s/repositories/%s/%s/pullrequests/%s",
        c.BaseURL, workspace, repo, prID)
    // GET request with authentication
}
```

**Common automation patterns:**

- Auto-approve PRs from trusted contributors
- Post security scan results as comments
- Update PR status based on external checks
- Trigger Chariot scans on PR merge

See [references/pr-automation.md](references/pr-automation.md) for workflows.

### Step 4: Webhook Configuration

**Set up webhooks for repository events:**

```go
type WebhookConfig struct {
    Description string   `json:"description"`
    URL         string   `json:"url"`
    Active      bool     `json:"active"`
    Events      []string `json:"events"` // repo:push, pullrequest:created, etc.
}

func (c *BitbucketClient) CreateWebhook(workspace, repo string, config WebhookConfig) error {
    url := fmt.Sprintf("%s/repositories/%s/%s/hooks", c.BaseURL, workspace, repo)
    // POST webhook configuration
}
```

**Supported events:**

- `repo:push` - Code changes (trigger scans)
- `pullrequest:created` - New PR (initiate review)
- `pullrequest:updated` - PR changes (re-run checks)
- `pullrequest:approved` - PR approval (track compliance)
- `pullrequest:fulfilled` - PR merged (update assets)

See [references/webhook-events.md](references/webhook-events.md) for complete event catalog.

## Error Handling

| Error Code            | Cause                       | Solution                           |
| --------------------- | --------------------------- | ---------------------------------- |
| 401 Unauthorized      | Invalid credentials         | Verify App Password, check scopes  |
| 403 Forbidden         | Insufficient permissions    | Request workspace admin access     |
| 404 Not Found         | Repository/resource missing | Verify workspace and repo names    |
| 429 Too Many Requests | Rate limit exceeded         | Implement backoff, cache responses |

**Rate Limiting Strategy:**

- Monitor `X-RateLimit-Remaining` header
- Implement exponential backoff (1s, 2s, 4s, 8s)
- Cache repository metadata (TTL: 5 minutes)
- Use pagination cursors efficiently

See [references/error-handling.md](references/error-handling.md) for detailed strategies.

## Integration Patterns

### Pattern 1: Repository Scanner

**Discover and scan Bitbucket repositories:**

1. List all repositories in workspace (with pagination)
2. Filter by visibility (public/private) and activity
3. Map to Chariot assets with metadata
4. Trigger security scans (Nuclei, code analysis)
5. Update asset status and risk scores

### Pattern 2: PR Review Bot

**Automate PR security checks:**

1. Receive webhook on `pullrequest:created`
2. Fetch PR diff and changed files
3. Run security scans (secrets, vulnerabilities)
4. Post results as PR comment
5. Update PR status (approve/request changes)

### Pattern 3: Asset Sync

**Keep Chariot assets synchronized with Bitbucket:**

1. Poll repositories every 5 minutes (or use webhooks)
2. Compare last commit timestamps
3. Update Chariot asset metadata
4. Archive deleted repositories
5. Trigger scans on changes

See [references/integration-patterns.md](references/integration-patterns.md) for complete implementations.

## Testing

**Recommended test coverage:**

- Unit tests for API client methods (mock HTTP responses)
- Integration tests with Bitbucket test workspace
- Webhook handler tests (simulate event payloads)
- Rate limiting tests (verify backoff logic)
- Error handling tests (network failures, timeouts)

See [references/testing-guide.md](references/testing-guide.md) for test patterns.

## References

- [references/api-reference.md](references/api-reference.md) - Complete Bitbucket API documentation
- [references/authentication.md](references/authentication.md) - OAuth and App Password setup
- [references/client-implementation.md](references/client-implementation.md) - Go and Python client examples
- [references/pagination-patterns.md](references/pagination-patterns.md) - Handling paginated responses
- [references/pr-automation.md](references/pr-automation.md) - Pull request workflows
- [references/webhook-events.md](references/webhook-events.md) - Event types and payloads
- [references/asset-mapping.md](references/asset-mapping.md) - Chariot data model integration
- [references/error-handling.md](references/error-handling.md) - Error recovery strategies
- [references/integration-patterns.md](references/integration-patterns.md) - Common integration architectures
- [references/testing-guide.md](references/testing-guide.md) - Test patterns and examples

## Related Resources

### Official Documentation

- **Bitbucket API 2.0**: https://developer.atlassian.com/cloud/bitbucket/rest/intro/
- **Authentication**: https://developer.atlassian.com/cloud/bitbucket/rest/intro/#authentication
- **Webhooks**: https://support.atlassian.com/bitbucket-cloud/docs/manage-webhooks/
- **Rate Limits**: https://developer.atlassian.com/cloud/bitbucket/rest/intro/#rate-limits
- **App Passwords**: https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/
