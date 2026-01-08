# Integration Patterns

Common architectural patterns for Azure DevOps integrations.

---

## Pattern 1: Repository Scanner

**Purpose:** Discover and scan repositories for security issues.

```
Azure DevOps API
    ↓
List Repositories (with pagination)
    ↓
Filter (active, not disabled)
    ↓
Map to Chariot Assets
    ↓
Trigger Security Scans (Nuclei, code analysis)
    ↓
Update Asset Risk Scores
```

### Implementation

```go
func (s *RepositoryScanner) ScanOrganization(ctx context.Context, projectID string) error {
    // 1. List all repositories
    repos, err := s.client.ListRepositories(ctx, projectID)
    if err != nil {
        return err
    }

    // 2. Filter active repositories
    activeRepos := filterActive(repos)

    // 3. Map to assets
    assets := make([]Asset, 0, len(activeRepos))
    for _, repo := range activeRepos {
        asset := MapRepositoryToAsset(repo)
        assets = append(assets, asset)
    }

    // 4. Trigger scans
    for _, asset := range assets {
        if err := s.chariot.TriggerScan(ctx, asset); err != nil {
            log.Printf("Scan failed for %s: %v", asset.DNS, err)
        }
    }

    return nil
}
```

---

## Pattern 2: Pipeline Security Monitor

**Purpose:** Monitor CI/CD pipelines for security issues.

```
Webhook: build.complete
    ↓
Download Build Logs
    ↓
Scan for Secrets (regex patterns)
    ↓
Check Service Connection Security
    ↓
Generate Security Report
    ↓
Alert if Issues Found
```

### Implementation

```go
func (m *PipelineMonitor) OnBuildComplete(ctx context.Context, event WebhookEvent) error {
    buildID := event.Resource.Build.ID

    // 1. Download logs
    logs, err := m.client.GetBuildLogs(ctx, projectID, buildID)
    if err != nil {
        return err
    }

    // 2. Scan for secrets
    secrets := m.secretScanner.ScanLogs(logs)

    // 3. Check service connections
    conns, err := m.client.AuditServiceConnections(ctx, projectID)
    if err != nil {
        return err
    }

    // 4. Generate report
    report := SecurityReport{
        BuildID:              buildID,
        SecretsFound:         len(secrets),
        InsecureConnections:  countInsecure(conns),
    }

    // 5. Alert if issues
    if report.HasIssues() {
        m.alerter.Send(report)
    }

    return nil
}
```

---

## Pattern 3: Work Item Sync

**Purpose:** Bidirectional sync between Chariot risks and Azure DevOps work items.

```
Chariot Risk Created
    ↓
Create Azure DevOps Work Item
    ↓
Tag with CVE, Asset, Severity
    ↓
    ↕ (bidirectional sync)
Webhook: workitem.updated
    ↓
Update Chariot Risk Status
```

### Implementation

```go
func (s *WorkItemSync) SyncRiskToWorkItem(ctx context.Context, risk Risk) error {
    // Check if work item exists
    wiql := fmt.Sprintf(`
        SELECT [System.Id]
        FROM workitems
        WHERE [System.Tags] CONTAINS '%s'
        AND [System.State] <> 'Closed'
    `, risk.CVE)

    ids, err := s.client.QueryWorkItems(ctx, projectID, wiql)
    if err != nil {
        return err
    }

    if len(ids) > 0 {
        // Update existing
        return s.updateWorkItem(ctx, ids[0], risk)
    }

    // Create new
    return s.createWorkItem(ctx, risk)
}

func (s *WorkItemSync) OnWorkItemUpdated(ctx context.Context, event WebhookEvent) error {
    workItemID := event.Resource.ID
    newState := event.Resource.Fields["System.State"]

    // Get CVE from tags
    tags := event.Resource.Fields["System.Tags"]
    cve := extractCVE(tags)

    // Update Chariot risk
    return s.chariot.UpdateRiskStatus(ctx, cve, mapState(newState))
}
```

---

## Pattern 4: Event-Driven Automation

**Purpose:** Webhook-triggered security automation.

```
Azure DevOps Event
    ↓
Webhook Handler
    ↓
Azure Service Bus (async)
    ↓
Worker Function
    ↓
Process Event
    ↓
REST API Callback
```

### Implementation

```go
// Webhook handler
func (h *WebhookHandler) HandleEvent(w http.ResponseWriter, r *http.Request) {
    body, _ := io.ReadAll(r.Body)

    // Immediately respond
    w.WriteHeader(http.StatusOK)

    // Send to queue
    h.queue.Enqueue(body)
}

// Worker
func (w *Worker) ProcessEvents(ctx context.Context) {
    for {
        msg := w.queue.Dequeue()

        var event WebhookEvent
        json.Unmarshal(msg, &event)

        // Process based on type
        switch event.EventType {
        case "git.push":
            w.handleGitPush(ctx, event)
        case "workitem.updated":
            w.handleWorkItemUpdated(ctx, event)
        }
    }
}
```

---

## Best Practices

1. **Use webhooks over polling** for real-time updates
2. **Process webhooks asynchronously** to avoid timeouts
3. **Implement idempotency** for duplicate events
4. **Cache metadata** to reduce API calls
5. **Batch operations** when possible
6. **Monitor rate limits** proactively

---

## Related Resources

- [Webhook Events](webhook-events.md)
- [Client Implementation](client-implementation.md)
- [Rate Limiting](rate-limiting.md)
