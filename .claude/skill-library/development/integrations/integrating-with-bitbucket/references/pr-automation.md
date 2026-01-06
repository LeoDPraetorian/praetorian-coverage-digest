# Pull Request Automation

**Automating PR reviews, approvals, status checks, and security scanning with Bitbucket API.**

---

## PR Automation Use Cases

1. **Security Bot** - Scan PRs for secrets/vulnerabilities, post results as comments
2. **Compliance Checker** - Enforce approval policies, branch protection, required reviewers
3. **Status Updater** - Update PR status based on external CI/CD checks
4. **Auto-Merger** - Automatically merge PRs meeting criteria
5. **Notification System** - Alert teams on Slack/email for PR events

---

## PR Security Bot Pattern

### Workflow

1. Receive `pullrequest:created` or `pullrequest:updated` webhook
2. Fetch PR details and diff via API
3. Run security scans (secret scanning, vulnerability detection)
4. Post scan results as PR comment
5. Update PR status (approve/request changes)

### Implementation (Go)

```go
package main

import (
    "fmt"
    "strings"
)

type PRSecurityBot struct {
    client         *BitbucketClient
    secretScanner  *SecretScanner
    vulnScanner    *VulnScanner
}

// HandlePRWebhook processes pullrequest webhook events
func (bot *PRSecurityBot) HandlePRWebhook(payload *WebhookPayload) error {
    pr := payload.PullRequest
    workspace := payload.Repository.Workspace.Slug
    repoSlug := payload.Repository.Slug

    // Fetch PR diff
    diff, err := bot.client.GetPRDiff(workspace, repoSlug, pr.ID)
    if err != nil {
        return fmt.Errorf("fetch diff: %w", err)
    }

    // Run security scans
    secrets := bot.secretScanner.Scan(diff)
    vulns := bot.vulnScanner.Scan(diff)

    // Generate report
    report := bot.generateSecurityReport(secrets, vulns)

    // Post comment to PR
    if err := bot.client.CreatePRComment(workspace, repoSlug, pr.ID, report); err != nil {
        return fmt.Errorf("post comment: %w", err)
    }

    // Update PR status
    if len(secrets) > 0 || len(vulns) > 0 {
        return bot.client.RequestPRChanges(workspace, repoSlug, pr.ID,
            "Security issues found - review required")
    }

    return bot.client.ApprovePR(workspace, repoSlug, pr.ID)
}

func (bot *PRSecurityBot) generateSecurityReport(secrets, vulns []Finding) string {
    var report strings.Builder

    report.WriteString("## 🔒 Security Scan Results\n\n")

    if len(secrets) > 0 {
        report.WriteString(fmt.Sprintf("### ⚠️ Secrets Detected (%d)\n\n", len(secrets)))
        for _, s := range secrets {
            report.WriteString(fmt.Sprintf("- **%s** in `%s:%d`\n", s.Type, s.File, s.Line))
        }
        report.WriteString("\n")
    }

    if len(vulns) > 0 {
        report.WriteString(fmt.Sprintf("### 🐛 Vulnerabilities Found (%d)\n\n", len(vulns)))
        for _, v := range vulns {
            report.WriteString(fmt.Sprintf("- **%s** (Severity: %s) in `%s`\n",
                v.Title, v.Severity, v.File))
        }
        report.WriteString("\n")
    }

    if len(secrets) == 0 && len(vulns) == 0 {
        report.WriteString("### ✅ No Security Issues Found\n\n")
        report.WriteString("All checks passed!\n")
    }

    report.WriteString("\n---\n")
    report.WriteString("*Automated scan by Chariot Security Bot*\n")

    return report.String()
}
```

### PR Comment API

**Create Comment:**

```go
func (c *Client) CreatePRComment(workspace, repoSlug string, prID int, content string) error {
    path := fmt.Sprintf("/repositories/%s/%s/pullrequests/%d/comments",
        workspace, repoSlug, prID)

    payload := map[string]interface{}{
        "content": map[string]string{
            "raw": content,
        },
    }

    resp, err := c.Request("POST", path, payload)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusCreated {
        return fmt.Errorf("unexpected status: %d", resp.StatusCode)
    }

    return nil
}
```

**Python Example:**

```python
def create_pr_comment(
    self,
    workspace: str,
    repo_slug: str,
    pr_id: int,
    content: str
) -> Dict[str, Any]:
    """Post a comment to a pull request."""
    path = f"/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/comments"
    payload = {
        "content": {
            "raw": content  # Markdown supported
        }
    }
    response = self._request("POST", path, json=payload)
    return response.json()
```

---

## PR Approval & Status Management

### Approve PR

```go
func (c *Client) ApprovePR(workspace, repoSlug string, prID int) error {
    path := fmt.Sprintf("/repositories/%s/%s/pullrequests/%d/approve",
        workspace, repoSlug, prID)

    resp, err := c.Request("POST", path, nil)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    return nil
}
```

### Request Changes

```go
func (c *Client) RequestPRChanges(workspace, repoSlug string, prID int, reason string) error {
    // Post comment explaining required changes
    if err := c.CreatePRComment(workspace, repoSlug, prID, reason); err != nil {
        return err
    }

    // Unapprove if previously approved
    path := fmt.Sprintf("/repositories/%s/%s/pullrequests/%d/approve",
        workspace, repoSlug, prID)
    resp, _ := c.Request("DELETE", path, nil)
    if resp != nil {
        resp.Body.Close()
    }

    return nil
}
```

### Update PR Build Status

```go
type BuildStatus struct {
    State       string `json:"state"`        // SUCCESSFUL, FAILED, INPROGRESS
    Key         string `json:"key"`          // Unique identifier
    Name        string `json:"name"`         // Display name
    URL         string `json:"url"`          // Link to build
    Description string `json:"description"`  // Status description
}

func (c *Client) UpdatePRBuildStatus(
    workspace, repoSlug, commitHash string,
    status *BuildStatus,
) error {
    path := fmt.Sprintf("/repositories/%s/%s/commit/%s/statuses/build",
        workspace, repoSlug, commitHash)

    resp, err := c.Request("POST", path, status)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    return nil
}
```

**Usage Example:**

```go
// Report security scan status
status := &BuildStatus{
    State:       "SUCCESSFUL",
    Key:         "chariot-security-scan",
    Name:        "Chariot Security Scan",
    URL:         "https://chariot.example.com/scans/123",
    Description: "No vulnerabilities found",
}

err := client.UpdatePRBuildStatus(workspace, repoSlug, commitHash, status)
```

---

## Auto-Merge Pattern

### Conditions for Auto-Merge

1. All required approvals received
2. No requested changes
3. All build statuses passing
4. No merge conflicts
5. Branch up-to-date with target

### Implementation

```go
func (bot *PRAutomation) AutoMergePR(workspace, repoSlug string, prID int) error {
    // Fetch PR details
    pr, err := bot.client.GetPullRequest(workspace, repoSlug, prID)
    if err != nil {
        return err
    }

    // Check conditions
    if !bot.canAutoMerge(pr) {
        return fmt.Errorf("auto-merge conditions not met")
    }

    // Merge PR
    return bot.client.MergePR(workspace, repoSlug, prID, &MergeOptions{
        Message:     fmt.Sprintf("Auto-merged PR #%d", prID),
        CloseSource: true,  // Delete source branch
        MergeStrategy: "merge_commit",  // or "squash", "fast_forward"
    })
}

func (bot *PRAutomation) canAutoMerge(pr *PullRequest) bool {
    // Check state
    if pr.State != "OPEN" {
        return false
    }

    // Check approvals (example: require 2 approvals)
    if len(pr.Participants) < 2 {
        return false
    }

    approvalCount := 0
    for _, p := range pr.Participants {
        if p.Approved {
            approvalCount++
        }
    }

    if approvalCount < 2 {
        return false
    }

    // Check for requested changes
    for _, p := range pr.Participants {
        if p.State == "changes_requested" {
            return false
        }
    }

    // Check build statuses (all must be successful)
    // This requires fetching commit statuses separately

    return true
}
```

### Merge PR API

```go
type MergeOptions struct {
    Message       string `json:"message"`
    CloseSource   bool   `json:"close_source_branch"`
    MergeStrategy string `json:"merge_strategy"`  // "merge_commit", "squash", "fast_forward"
}

func (c *Client) MergePR(workspace, repoSlug string, prID int, opts *MergeOptions) error {
    path := fmt.Sprintf("/repositories/%s/%s/pullrequests/%d/merge",
        workspace, repoSlug, prID)

    resp, err := c.Request("POST", path, opts)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return fmt.Errorf("merge failed: status %d", resp.StatusCode)
    }

    return nil
}
```

---

## Compliance Enforcement

### Required Reviewers Check

```go
func (bot *PRCompliance) EnforceRequiredReviewers(pr *PullRequest) error {
    requiredReviewers := []string{"security-team", "tech-lead"}

    for _, required := range requiredReviewers {
        found := false
        for _, participant := range pr.Participants {
            if participant.User.DisplayName == required && participant.Approved {
                found = true
                break
            }
        }

        if !found {
            comment := fmt.Sprintf("⚠️ **Compliance Check Failed**\n\n"+
                "This PR requires approval from: %s\n\n"+
                "Please request review from the required team.",
                strings.Join(requiredReviewers, ", "))

            return bot.client.CreatePRComment(
                pr.Workspace, pr.RepoSlug, pr.ID, comment)
        }
    }

    return nil
}
```

### Branch Protection

```go
func (bot *PRCompliance) CheckBranchProtection(pr *PullRequest) error {
    // Enforce: PRs to main must come from feature/* branches
    if pr.Destination.Branch.Name == "main" {
        if !strings.HasPrefix(pr.Source.Branch.Name, "feature/") &&
            !strings.HasPrefix(pr.Source.Branch.Name, "fix/") {
            comment := "🚫 **Branch Policy Violation**\n\n" +
                "PRs to `main` must come from `feature/*` or `fix/*` branches.\n\n" +
                "Current source: `" + pr.Source.Branch.Name + "`"

            return bot.client.CreatePRComment(
                pr.Workspace, pr.RepoSlug, pr.ID, comment)
        }
    }

    return nil
}
```

---

## Notification System

### Slack Integration

```go
func (bot *PRNotifier) NotifySlack(pr *PullRequest, event string) error {
    message := bot.formatSlackMessage(pr, event)

    payload := map[string]interface{}{
        "channel": "#engineering",
        "text":    message,
        "attachments": []map[string]interface{}{
            {
                "color": bot.getColorForEvent(event),
                "title": fmt.Sprintf("PR #%d: %s", pr.ID, pr.Title),
                "title_link": pr.Links.HTML.Href,
                "fields": []map[string]interface{}{
                    {"title": "Author", "value": pr.Author.DisplayName, "short": true},
                    {"title": "Repository", "value": pr.Repository.FullName, "short": true},
                    {"title": "Source", "value": pr.Source.Branch.Name, "short": true},
                    {"title": "Destination", "value": pr.Destination.Branch.Name, "short": true},
                },
            },
        },
    }

    return bot.slackClient.PostMessage(payload)
}

func (bot *PRNotifier) formatSlackMessage(pr *PullRequest, event string) string {
    switch event {
    case "pullrequest:created":
        return fmt.Sprintf("🆕 New PR by %s", pr.Author.DisplayName)
    case "pullrequest:approved":
        return fmt.Sprintf("✅ PR approved")
    case "pullrequest:fulfilled":
        return fmt.Sprintf("🎉 PR merged!")
    default:
        return fmt.Sprintf("PR updated: %s", event)
    }
}
```

---

## Best Practices

1. **Idempotency** - Handle duplicate webhook events gracefully
2. **Async Processing** - Process webhooks asynchronously to avoid timeouts
3. **Rate Limiting** - Respect API rate limits when batch-processing PRs
4. **Error Handling** - Retry failed operations with exponential backoff
5. **Audit Logs** - Log all automated actions for compliance
6. **User Notifications** - Always explain automated decisions in PR comments

---

## Related Documentation

- [webhook-events.md](webhook-events.md) - Webhook event types and payloads
- [client-implementation.md](client-implementation.md) - API client examples
- [error-handling.md](error-handling.md) - Error recovery strategies
