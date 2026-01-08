# Pull Request Automation

Patterns for automating Azure DevOps pull request workflows.

---

## Common Automation Patterns

### 1. Auto-Approve from Trusted Contributors

```go
func (c *Client) AutoApprovePR(ctx context.Context, projectID, repoID string, prID int) error {
    // Get PR details
    pr, err := c.GetPullRequest(ctx, projectID, repoID, prID)
    if err != nil {
        return err
    }

    // Check if author is trusted
    if !c.isTrustedContributor(pr.CreatedBy) {
        return nil // Skip auto-approve
    }

    // Approve PR
    vote := git.IdentityRefWithVote{
        Vote: intPtr(10), // 10 = approved, 5 = approved with suggestions, 0 = no vote, -5 = wait, -10 = rejected
    }

    args := git.CreatePullRequestReviewerArgs{
        Project:       &projectID,
        RepositoryId:  &repoID,
        PullRequestId: &prID,
        ReviewerId:    &c.currentUserID,
        Reviewer:      &vote,
    }

    _, err = c.gitClient.CreatePullRequestReviewer(ctx, args)
    return err
}
```

### 2. Post Security Scan Results as Comments

```go
func (c *Client) PostScanResults(ctx context.Context, projectID, repoID string, prID int, results ScanResults) error {
    comment := formatScanResults(results)

    thread := git.GitPullRequestCommentThread{
        Comments: &[]git.Comment{
            {
                Content: &comment,
            },
        },
        Status: &git.CommentThreadStatusValues.Active,
    }

    args := git.CreateThreadArgs{
        CommentThread: &thread,
        Project:       &projectID,
        RepositoryId:  &repoID,
        PullRequestId: &prID,
    }

    _, err := c.gitClient.CreateThread(ctx, args)
    return err
}

func formatScanResults(results ScanResults) string {
    return fmt.Sprintf(`## Security Scan Results

**Status:** %s
**Critical Issues:** %d
**High Issues:** %d
**Medium Issues:** %d

### Critical Findings
%s

[View Full Report](%s)
`, results.Status, results.Critical, results.High, results.Medium, results.CriticalDetails, results.ReportURL)
}
```

### 3. Update PR Status Based on External Checks

```go
func (c *Client) UpdatePRStatus(ctx context.Context, projectID, repoID, commitID string, status CheckStatus) error {
    gitStatus := git.GitStatus{
        State:       &status.State,       // succeeded, failed, pending
        Description: &status.Description,
        Context: &git.GitStatusContext{
            Name:  stringPtr("chariot-security-scan"),
            Genre: stringPtr("continuous-integration"),
        },
        TargetUrl: &status.ReportURL,
    }

    args := git.CreateCommitStatusArgs{
        GitCommitStatusToCreate: &gitStatus,
        Project:                 &projectID,
        RepositoryId:            &repoID,
        CommitId:                &commitID,
    }

    _, err := c.gitClient.CreateCommitStatus(ctx, args)
    return err
}
```

### 4. Trigger Chariot Scans on PR Merge

```go
func (c *Client) OnPRCompleted(ctx context.Context, event WebhookEvent) error {
    pr := event.Resource.PullRequest

    // Check if PR was completed (merged)
    if pr.Status != "completed" || pr.MergeStatus != "succeeded" {
        return nil
    }

    // Trigger Chariot asset scan
    asset := Asset{
        DNS:    pr.Repository.RemoteURL,
        Class:  "repository",
        Source: "azuredevops",
        Metadata: map[string]interface{}{
            "project":    pr.Repository.Project.Name,
            "repository": pr.Repository.Name,
            "branch":     pr.TargetRefName,
            "mergedBy":   pr.ClosedBy.UniqueName,
            "mergedAt":   pr.ClosedDate,
        },
    }

    return c.chariotClient.TriggerAssetScan(ctx, asset)
}
```

---

## Python Example

```python
def auto_approve_trusted_pr(self, project_id: str, repo_id: str, pr_id: int):
    """Auto-approve PR from trusted contributors"""
    # Get PR
    pr = self.git_client.get_pull_request(
        project=project_id,
        repository_id=repo_id,
        pull_request_id=pr_id
    )

    # Check trust
    if not self.is_trusted(pr.created_by):
        return

    # Approve
    from azure.devops.v7_1.git.models import IdentityRefWithVote
    vote = IdentityRefWithVote(vote=10)  # 10 = approved

    self.git_client.create_pull_request_reviewer(
        reviewer=vote,
        project=project_id,
        repository_id=repo_id,
        pull_request_id=pr_id,
        reviewer_id=self.current_user_id
    )
```

---

## Best Practices

1. **Verify PR state** before automation
2. **Use status checks** for external validation
3. **Post detailed comments** with actionable feedback
4. **Respect branch policies** - don't bypass required checks
5. **Track automation** in metadata/tags

---

## Related Resources

- [Webhook Events](webhook-events.md)
- [Client Implementation](client-implementation.md)
- [Integration Patterns](integration-patterns.md)
