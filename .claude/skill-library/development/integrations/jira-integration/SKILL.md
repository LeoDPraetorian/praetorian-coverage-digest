---
name: jira-integration
description: Use when integrating Jira Cloud with Chariot platform - issue tracking, security findings sync, bidirectional updates
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite
---

# Jira Cloud Integration

**Integration patterns for connecting Jira Cloud with the Chariot security platform - synchronizing security findings, managing issues, and coordinating remediation workflows.**

## When to Use

Use this skill when:

- Integrating Jira Cloud as a third-party issue tracking system
- Syncing Chariot security findings to Jira issues
- Implementing bidirectional updates between Chariot and Jira
- Configuring Jira webhooks for real-time updates
- Mapping Chariot risk priorities to Jira issue priorities
- Building custom Jira integration workflows

## Prerequisites

- Jira Cloud instance with API access
- Jira API token (personal access token or OAuth 2.0)
- Chariot platform with integration capabilities
- Understanding of Jira REST API v3
- Webhook endpoint configuration (if bidirectional sync)

## Configuration

### Environment Variables

```bash
# Jira Cloud credentials
JIRA_CLOUD_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token

# Jira project configuration
JIRA_PROJECT_KEY=SEC
JIRA_ISSUE_TYPE=Bug
JIRA_DEFAULT_PRIORITY=High

# Webhook configuration (optional)
JIRA_WEBHOOK_SECRET=your-webhook-secret
CHARIOT_WEBHOOK_URL=https://api.chariot.example.com/webhooks/jira
```

### Authentication Methods

| Method                | Use Case                 | Security | Setup Complexity |
| --------------------- | ------------------------ | -------- | ---------------- |
| API Token             | Automated scripts, CI/CD | Medium   | Low              |
| OAuth 2.0             | User-facing integrations | High     | Medium           |
| Personal Access Token | Development/testing      | Low      | Very Low         |

**Recommendation**: Use OAuth 2.0 for production, API tokens for automation.

## Quick Reference

| Operation      | Endpoint                               | Method | Notes                            |
| -------------- | -------------------------------------- | ------ | -------------------------------- |
| Create Issue   | `/rest/api/3/issue`                    | POST   | Requires project key, issue type |
| Update Issue   | `/rest/api/3/issue/{issueKey}`         | PUT    | Use for status updates           |
| Get Issue      | `/rest/api/3/issue/{issueKey}`         | GET    | Returns full issue details       |
| Search Issues  | `/rest/api/3/search`                   | POST   | Use JQL for filtering            |
| Add Comment    | `/rest/api/3/issue/{issueKey}/comment` | POST   | Link back to Chariot findings    |
| Create Webhook | `/rest/api/3/webhook`                  | POST   | Requires admin permissions       |

## Implementation

### Step 1: Jira API Client Setup

Create a reusable Jira client with authentication:

```typescript
// modules/chariot/backend/pkg/integrations/jira/client.go
package jira

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

type Client struct {
    BaseURL   string
    Email     string
    APIToken  string
    ProjectKey string
    HTTPClient *http.Client
}

func NewClient(baseURL, email, apiToken, projectKey string) *Client {
    return &Client{
        BaseURL:    baseURL,
        Email:      email,
        APIToken:   apiToken,
        ProjectKey: projectKey,
        HTTPClient: &http.Client{Timeout: 30 * time.Second},
    }
}

func (c *Client) Do(method, path string, body interface{}) (*http.Response, error) {
    var bodyReader io.Reader
    if body != nil {
        jsonBody, err := json.Marshal(body)
        if err != nil {
            return nil, err
        }
        bodyReader = bytes.NewBuffer(jsonBody)
    }

    req, err := http.NewRequest(method, c.BaseURL+path, bodyReader)
    if err != nil {
        return nil, err
    }

    req.SetBasicAuth(c.Email, c.APIToken)
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Accept", "application/json")

    return c.HTTPClient.Do(req)
}
```

### Step 2: Map Chariot Findings to Jira Issues

Define mapping logic for risk → issue translation:

```typescript
// Map Chariot risk priority to Jira priority
func mapChariotPriorityToJira(chariotPriority string) string {
    mapping := map[string]string{
        "critical": "Highest",
        "high":     "High",
        "medium":   "Medium",
        "low":      "Low",
        "info":     "Lowest",
    }

    if jiraPriority, ok := mapping[chariotPriority]; ok {
        return jiraPriority
    }
    return "Medium" // Default
}

// Create Jira issue from Chariot risk
func (c *Client) CreateIssueFromRisk(risk *model.Risk) (*JiraIssue, error) {
    payload := map[string]interface{}{
        "fields": map[string]interface{}{
            "project": map[string]string{
                "key": c.ProjectKey,
            },
            "summary": fmt.Sprintf("[Chariot] %s - %s", risk.Title, risk.Asset),
            "description": buildJiraDescription(risk),
            "issuetype": map[string]string{
                "name": "Bug",
            },
            "priority": map[string]string{
                "name": mapChariotPriorityToJira(risk.Priority),
            },
            "labels": []string{
                "chariot",
                "security",
                risk.Category,
            },
        },
    }

    resp, err := c.Do("POST", "/rest/api/3/issue", payload)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result JiraIssue
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    return &result, nil
}

// Build rich Jira description with Chariot context
func buildJiraDescription(risk *model.Risk) string {
    return fmt.Sprintf(`
*Security Finding from Chariot*

h3. Asset
%s

h3. Vulnerability
%s

h3. CVSS Score
%s

h3. Remediation
%s

h3. Chariot Link
[View in Chariot|https://app.chariot.example.com/risks/%s]
`, risk.Asset, risk.Description, risk.CVSS, risk.Remediation, risk.ID)
}
```

### Step 3: Implement Bidirectional Sync

Handle webhook events from Jira:

```typescript
// Webhook handler for Jira events
func HandleJiraWebhook(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    // Verify webhook signature
    if !verifyJiraSignature(req.Headers["X-Hub-Signature"], req.Body) {
        return response.Unauthorized(), nil
    }

    var event JiraWebhookEvent
    if err := json.Unmarshal([]byte(req.Body), &event); err != nil {
        return response.BadRequest("Invalid webhook payload"), nil
    }

    switch event.WebhookEvent {
    case "jira:issue_updated":
        return handleIssueUpdated(ctx, event)
    case "jira:issue_deleted":
        return handleIssueDeleted(ctx, event)
    default:
        return response.OK(map[string]string{"status": "ignored"}), nil
    }
}

// Sync Jira issue status back to Chariot risk
func handleIssueUpdated(ctx context.Context, event JiraWebhookEvent) (events.APIGatewayProxyResponse, error) {
    // Extract Chariot risk ID from Jira issue (stored in custom field or labels)
    chariotRiskID := extractChariotRiskID(event.Issue)
    if chariotRiskID == "" {
        return response.OK(map[string]string{"status": "no_chariot_link"}), nil
    }

    // Map Jira status to Chariot status
    chariotStatus := mapJiraStatusToChariot(event.Issue.Fields.Status.Name)

    // Update Chariot risk
    if err := updateRiskStatus(ctx, chariotRiskID, chariotStatus); err != nil {
        return response.InternalError(), nil
    }

    return response.OK(map[string]string{"status": "synced"}), nil
}
```

### Step 4: Configure Jira Webhook

Programmatically register webhooks:

```typescript
func (c *Client) CreateWebhook(webhookURL, secret string) error {
    payload := map[string]interface{}{
        "name": "Chariot Integration Webhook",
        "url":  webhookURL,
        "events": []string{
            "jira:issue_created",
            "jira:issue_updated",
            "jira:issue_deleted",
        },
        "filters": map[string]interface{}{
            "issue-related-events-section": fmt.Sprintf("project = %s AND labels = chariot", c.ProjectKey),
        },
    }

    resp, err := c.Do("POST", "/rest/api/3/webhook", payload)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusCreated {
        return fmt.Errorf("webhook creation failed: %d", resp.StatusCode)
    }

    return nil
}
```

## Error Handling

| Error            | Cause                                           | Solution                                        |
| ---------------- | ----------------------------------------------- | ----------------------------------------------- |
| 401 Unauthorized | Invalid API token or expired credentials        | Regenerate API token, check email               |
| 404 Not Found    | Invalid project key or issue key                | Verify project exists and is accessible         |
| 400 Bad Request  | Invalid field values or missing required fields | Check Jira field configuration                  |
| 429 Rate Limit   | Too many API calls                              | Implement exponential backoff, batch operations |
| 403 Forbidden    | Insufficient permissions                        | Grant user/app appropriate Jira permissions     |

### Rate Limiting Strategy

```typescript
// Implement exponential backoff
func (c *Client) DoWithRetry(method, path string, body interface{}) (*http.Response, error) {
    maxRetries := 3
    backoff := 1 * time.Second

    for attempt := 0; attempt < maxRetries; attempt++ {
        resp, err := c.Do(method, path, body)

        if err != nil {
            return nil, err
        }

        if resp.StatusCode == 429 {
            // Rate limited - wait and retry
            time.Sleep(backoff)
            backoff *= 2
            continue
        }

        return resp, nil
    }

    return nil, fmt.Errorf("max retries exceeded")
}
```

## Testing Strategy

### Unit Tests

Test mapping logic and client methods:

```go
func TestMapChariotPriorityToJira(t *testing.T) {
    tests := []struct {
        chariotPriority string
        expected        string
    }{
        {"critical", "Highest"},
        {"high", "High"},
        {"medium", "Medium"},
        {"low", "Low"},
        {"unknown", "Medium"}, // Default
    }

    for _, tt := range tests {
        result := mapChariotPriorityToJira(tt.chariotPriority)
        if result != tt.expected {
            t.Errorf("got %s, want %s", result, tt.expected)
        }
    }
}
```

### Integration Tests

Test against Jira Cloud sandbox:

```go
func TestCreateIssueIntegration(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping integration test")
    }

    client := NewClient(
        os.Getenv("JIRA_CLOUD_URL"),
        os.Getenv("JIRA_EMAIL"),
        os.Getenv("JIRA_API_TOKEN"),
        "TEST",
    )

    risk := &model.Risk{
        ID:       "test-123",
        Title:    "SQL Injection",
        Asset:    "api.example.com",
        Priority: "high",
    }

    issue, err := client.CreateIssueFromRisk(risk)
    if err != nil {
        t.Fatalf("failed to create issue: %v", err)
    }

    if issue.Key == "" {
        t.Error("expected issue key, got empty string")
    }

    // Cleanup
    defer client.DeleteIssue(issue.Key)
}
```

## Security Considerations

### Credential Storage

- **Never hardcode credentials** in source code
- Store API tokens in AWS Secrets Manager or SSM Parameter Store
- Use IAM roles for Lambda execution
- Rotate credentials periodically

### Data Privacy

- **Sanitize sensitive data** before sending to Jira
- Implement field-level encryption for PII
- Comply with data residency requirements
- Configure Jira issue visibility (public vs private)

### Webhook Security

- **Verify webhook signatures** using shared secret
- Implement IP allowlisting for webhook endpoints
- Use HTTPS for all webhook URLs
- Log all webhook events for audit

## References

- [references/api-reference.md](references/api-reference.md) - Full Jira REST API v3 documentation
- [references/webhook-events.md](references/webhook-events.md) - Complete webhook event catalog
- [references/field-mapping.md](references/field-mapping.md) - Chariot ↔ Jira field mapping guide
- [examples/basic-sync.md](examples/basic-sync.md) - Simple one-way sync example
- [examples/bidirectional-sync.md](examples/bidirectional-sync.md) - Full bidirectional integration

## External Resources

- [Jira Cloud REST API v3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Jira Webhooks](https://developer.atlassian.com/cloud/jira/platform/webhooks/)
- [OAuth 2.0 for Jira](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/)
