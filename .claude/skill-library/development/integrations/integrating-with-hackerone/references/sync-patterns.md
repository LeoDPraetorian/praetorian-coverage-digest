# HackerOne Sync Patterns

**Last Updated:** January 3, 2026

## Overview

Bidirectional synchronization strategies for keeping Chariot and HackerOne in sync, including incremental activity fetching, conflict resolution, and production deployment patterns.

## Sync Strategies Comparison

| Strategy                   | Efficiency | Complexity | Use Case                                                       |
| -------------------------- | ---------- | ---------- | -------------------------------------------------------------- |
| **Incremental Activities** | ⭐⭐⭐⭐⭐ | Medium     | **Production (Recommended)** - Fetch only changed reports      |
| **Webhook-Driven**         | ⭐⭐⭐⭐⭐ | High       | **Production (Ideal)** - Real-time sync with Professional tier |
| **Full Poll**              | ⭐         | Low        | **Development Only** - Fetch all reports every sync            |
| **Hybrid**                 | ⭐⭐⭐⭐   | High       | **Production (Best)** - Webhooks + incremental fallback        |

## Incremental Activities Sync (Recommended)

**Use `GET /incremental/activities` instead of polling all reports.**

### Why Incremental Activities?

- **10-100x more efficient** than full polling
- Fetches only reports with activity since last sync
- Returns minimal activity data (fetch full reports separately)
- Works without webhook configuration
- Available on all tiers (unlike webhooks)

### Implementation

```go
type SyncService struct {
    hackerOneClient *hackerone.Client
    chariotClient   *chariot.Client
    lastSyncTime    time.Time
    programHandle   string
}

func (s *SyncService) IncrementalSync(ctx context.Context) error {
    log.Info("Starting incremental sync",
        "program", s.programHandle,
        "last_sync", s.lastSyncTime,
    )

    // Step 1: Fetch incremental activities
    activities, err := s.hackerOneClient.GetIncrementalActivities(
        ctx,
        s.programHandle,
        s.lastSyncTime,
    )
    if err != nil {
        return fmt.Errorf("fetch activities: %w", err)
    }

    log.Info("Fetched activities", "count", len(activities.Data))

    // Step 2: Extract unique report IDs from activities
    reportIDs := extractUniqueReportIDs(activities.Data)

    if len(reportIDs) == 0 {
        log.Info("No reports to sync")
        return nil
    }

    log.Info("Reports to sync", "count", len(reportIDs))

    // Step 3: Fetch full report details (batch)
    reports, err := s.fetchReportsBatch(ctx, reportIDs)
    if err != nil {
        return fmt.Errorf("fetch reports: %w", err)
    }

    // Step 4: Transform and upsert to Chariot
    risks := make([]*chariot.Risk, 0, len(reports))
    for _, report := range reports {
        risk, err := mapReportToRisk(report)
        if err != nil {
            log.Error("Map report failed",
                "report_id", report.ID,
                "error", err,
            )
            continue
        }
        risks = append(risks, risk)
    }

    if err := s.chariotClient.BatchUpsertRisks(ctx, risks); err != nil {
        return fmt.Errorf("upsert risks: %w", err)
    }

    // Step 5: Update last sync timestamp
    s.lastSyncTime = time.Now()
    if err := s.persistSyncTimestamp(ctx, s.lastSyncTime); err != nil {
        log.Error("Failed to persist sync timestamp", "error", err)
    }

    log.Info("Sync completed successfully",
        "reports_synced", len(risks),
        "next_sync_after", s.lastSyncTime,
    )

    return nil
}

func extractUniqueReportIDs(activities []hackerone.Activity) []string {
    seen := make(map[string]struct{})
    var reportIDs []string

    for _, activity := range activities {
        reportID := activity.Relationships.Report.Data.ID
        if _, exists := seen[reportID]; !exists {
            seen[reportID] = struct{}{}
            reportIDs = append(reportIDs, reportID)
        }
    }

    return reportIDs
}

func (s *SyncService) fetchReportsBatch(ctx context.Context, reportIDs []string) ([]*hackerone.Report, error) {
    // Fetch reports in batches of 10 (parallel)
    const batchSize = 10
    var reports []*hackerone.Report
    var mu sync.Mutex

    errGroup, ctx := errgroup.WithContext(ctx)
    errGroup.SetLimit(batchSize) // Max concurrent requests

    for _, reportID := range reportIDs {
        reportID := reportID // Capture for goroutine

        errGroup.Go(func() error {
            report, err := s.hackerOneClient.GetReport(ctx, reportID)
            if err != nil {
                return fmt.Errorf("fetch report %s: %w", reportID, err)
            }

            mu.Lock()
            reports = append(reports, report)
            mu.Unlock()

            return nil
        })
    }

    if err := errGroup.Wait(); err != nil {
        return nil, err
    }

    return reports, nil
}
```

### Persistence of Sync Cursor

```go
// Store last sync timestamp in DynamoDB
func (s *SyncService) persistSyncTimestamp(ctx context.Context, timestamp time.Time) error {
    _, err := s.dynamoClient.PutItem(ctx, &dynamodb.PutItemInput{
        TableName: aws.String("hackerone_sync_state"),
        Item: map[string]types.AttributeValue{
            "program_handle": &types.AttributeValueMemberS{Value: s.programHandle},
            "last_sync_time": &types.AttributeValueMemberS{Value: timestamp.Format(time.RFC3339)},
            "updated_at":     &types.AttributeValueMemberS{Value: time.Now().Format(time.RFC3339)},
        },
    })
    return err
}

func (s *SyncService) loadSyncTimestamp(ctx context.Context) (time.Time, error) {
    result, err := s.dynamoClient.GetItem(ctx, &dynamodb.GetItemInput{
        TableName: aws.String("hackerone_sync_state"),
        Key: map[string]types.AttributeValue{
            "program_handle": &types.AttributeValueMemberS{Value: s.programHandle},
        },
    })
    if err != nil {
        return time.Time{}, err
    }

    if result.Item == nil {
        // First sync - return 7 days ago
        return time.Now().Add(-7 * 24 * time.Hour), nil
    }

    timestampStr := result.Item["last_sync_time"].(*types.AttributeValueMemberS).Value
    return time.Parse(time.RFC3339, timestampStr)
}
```

## Webhook-Driven Sync (Ideal)

**Real-time sync with immediate updates. Requires Professional tier.**

### Architecture

```
[HackerOne] → [API Gateway] → [Lambda Handler] → [SQS] → [Lambda Processor] → [Chariot]
                                    ↓                           ↓
                            202 Accepted (<5s)         Fetch full report
                            Validate signature          Map to Chariot
                            Push to queue              Upsert to DB
```

### Implementation

See [webhook-handling.md](webhook-handling.md) for complete webhook implementation.

## Hybrid Sync (Production Best Practice)

**Combines webhooks (real-time) with incremental activities (fallback).**

### Strategy

1. **Webhooks (Primary):** Real-time updates for most events
2. **Incremental Activities (Fallback):** Catch missed webhooks every 15 minutes
3. **Full Poll (Rare):** Weekly reconciliation to catch any gaps

```go
type HybridSyncService struct {
    syncService     *SyncService
    webhookReceived time.Time
    mu              sync.RWMutex
}

func (h *HybridSyncService) Start(ctx context.Context) {
    // Periodic incremental sync (every 15 minutes)
    ticker := time.NewTicker(15 * time.Minute)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            // Only run incremental if no recent webhook
            h.mu.RLock()
            timeSinceWebhook := time.Since(h.webhookReceived)
            h.mu.RUnlock()

            if timeSinceWebhook > 10*time.Minute {
                log.Info("Running incremental sync (no recent webhooks)")
                if err := h.syncService.IncrementalSync(ctx); err != nil {
                    log.Error("Incremental sync failed", "error", err)
                }
            } else {
                log.Debug("Skipping incremental sync (recent webhook activity)")
            }

        case <-ctx.Done():
            return
        }
    }
}

func (h *HybridSyncService) OnWebhookReceived(webhook hackerone.WebhookPayload) {
    h.mu.Lock()
    h.webhookReceived = time.Now()
    h.mu.Unlock()

    // Process webhook immediately
    if err := h.processWebhook(webhook); err != nil {
        log.Error("Webhook processing failed", "error", err)
    }
}
```

## Bidirectional Sync

**Sync changes from Chariot back to HackerOne.**

### Chariot → HackerOne

```go
// Watch for Chariot risk updates and sync to HackerOne
func (s *SyncService) WatchChariotUpdates(ctx context.Context) {
    // Poll Chariot for updated risks (or use Chariot webhooks if available)
    ticker := time.NewTicker(5 * time.Minute)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            risks, err := s.chariotClient.GetUpdatedRisks(ctx, s.lastChariotSync)
            if err != nil {
                log.Error("Fetch Chariot risks failed", "error", err)
                continue
            }

            for _, risk := range risks {
                // Only sync HackerOne-sourced risks
                if !strings.HasPrefix(risk.ExternalID, "hackerone:") {
                    continue
                }

                if err := s.syncRiskToHackerOne(ctx, risk); err != nil {
                    log.Error("Sync to HackerOne failed",
                        "risk_id", risk.ID,
                        "error", err,
                    )
                }
            }

            s.lastChariotSync = time.Now()

        case <-ctx.Done():
            return
        }
    }
}

func (s *SyncService) syncRiskToHackerOne(ctx context.Context, risk *chariot.Risk) error {
    // Extract HackerOne report ID from external_id
    reportID := strings.TrimPrefix(risk.ExternalID, "hackerone:report:")

    // Map Chariot status to HackerOne state
    newState := mapChariotStatusToHackerOneState(risk.Status)

    // Update report state in HackerOne
    return s.hackerOneClient.UpdateReportState(ctx, reportID, newState, "Updated from Chariot")
}
```

## Conflict Resolution

**Handle concurrent updates in Chariot and HackerOne.**

### Last-Write-Wins Strategy

```go
type ConflictResolver struct {
    cache map[string]SyncMetadata
    mu    sync.RWMutex
}

type SyncMetadata struct {
    LastSyncTime      time.Time
    ChariotUpdatedAt  time.Time
    HackerOneUpdatedAt time.Time
}

func (r *ConflictResolver) Resolve(
    chariotRisk *chariot.Risk,
    hackerOneReport *hackerone.Report,
) (*chariot.Risk, error) {
    r.mu.RLock()
    meta, exists := r.cache[hackerOneReport.ID]
    r.mu.RUnlock()

    // First sync - no conflict
    if !exists {
        r.updateCache(hackerOneReport.ID, chariotRisk.UpdatedAt, hackerOneReport.UpdatedAt)
        return mapReportToRisk(hackerOneReport), nil
    }

    // Check for conflict
    chariotModified := chariotRisk.UpdatedAt.After(meta.LastSyncTime)
    hackerOneModified := hackerOneReport.UpdatedAt.After(meta.LastSyncTime)

    // No conflict
    if !chariotModified || !hackerOneModified {
        if hackerOneModified {
            r.updateCache(hackerOneReport.ID, chariotRisk.UpdatedAt, hackerOneReport.UpdatedAt)
            return mapReportToRisk(hackerOneReport), nil
        }
        return chariotRisk, nil
    }

    // CONFLICT: Both modified since last sync
    log.Warn("Sync conflict detected",
        "report_id", hackerOneReport.ID,
        "chariot_updated_at", chariotRisk.UpdatedAt,
        "hackerone_updated_at", hackerOneReport.UpdatedAt,
        "last_sync", meta.LastSyncTime,
    )

    // Last-write-wins
    if hackerOneReport.UpdatedAt.After(chariotRisk.UpdatedAt) {
        log.Info("Conflict resolution: HackerOne wins",
            "time_diff", hackerOneReport.UpdatedAt.Sub(chariotRisk.UpdatedAt),
        )
        r.updateCache(hackerOneReport.ID, chariotRisk.UpdatedAt, hackerOneReport.UpdatedAt)
        return mapReportToRisk(hackerOneReport), nil
    }

    log.Info("Conflict resolution: Chariot wins",
        "time_diff", chariotRisk.UpdatedAt.Sub(hackerOneReport.UpdatedAt),
    )

    // Push Chariot changes to HackerOne
    if err := syncRiskToHackerOne(hackerOneReport.ID, chariotRisk); err != nil {
        return nil, fmt.Errorf("push to hackerone: %w", err)
    }

    r.updateCache(hackerOneReport.ID, chariotRisk.UpdatedAt, hackerOneReport.UpdatedAt)
    return chariotRisk, nil
}
```

## Full Reconciliation

**Weekly full sync to catch any gaps.**

```go
func (s *SyncService) FullReconciliation(ctx context.Context) error {
    log.Info("Starting full reconciliation")

    // Fetch all reports from HackerOne (paginated)
    var allReports []*hackerone.Report
    pageNum := 1

    for {
        reports, err := s.hackerOneClient.ListReports(ctx, hackerone.ReportFilter{
            ProgramHandle: s.programHandle,
            PageSize:      100,
            PageNumber:    pageNum,
        })
        if err != nil {
            return fmt.Errorf("fetch reports page %d: %w", pageNum, err)
        }

        allReports = append(allReports, reports.Data...)

        if len(reports.Data) < 100 {
            break // Last page
        }

        pageNum++
    }

    log.Info("Fetched all reports from HackerOne", "count", len(allReports))

    // Fetch all risks from Chariot with HackerOne source
    chariotRisks, err := s.chariotClient.ListRisks(ctx, chariot.RiskFilter{
        Source: "hackerone:" + s.programHandle,
    })
    if err != nil {
        return fmt.Errorf("fetch chariot risks: %w", err)
    }

    log.Info("Fetched all risks from Chariot", "count", len(chariotRisks))

    // Build maps for comparison
    hackerOneMap := make(map[string]*hackerone.Report)
    for _, report := range allReports {
        hackerOneMap[report.ID] = report
    }

    chariotMap := make(map[string]*chariot.Risk)
    for _, risk := range chariotRisks {
        reportID := strings.TrimPrefix(risk.ExternalID, "hackerone:report:")
        chariotMap[reportID] = risk
    }

    // Find discrepancies
    var toCreate, toUpdate, toDelete []string

    // Reports in HackerOne but not in Chariot
    for reportID := range hackerOneMap {
        if _, exists := chariotMap[reportID]; !exists {
            toCreate = append(toCreate, reportID)
        }
    }

    // Reports in Chariot but not in HackerOne (deleted)
    for reportID := range chariotMap {
        if _, exists := hackerOneMap[reportID]; !exists {
            toDelete = append(toDelete, reportID)
        }
    }

    log.Info("Reconciliation analysis",
        "to_create", len(toCreate),
        "to_delete", len(toDelete),
    )

    // Apply changes...
    return nil
}
```

## Production Deployment

### Lambda Function (Scheduled)

```go
// Lambda handler for periodic sync
func Handler(ctx context.Context) error {
    // Load configuration
    programHandle := os.Getenv("HACKERONE_PROGRAM_HANDLE")

    // Initialize clients
    hackerOneClient, err := hackerone.ProductionClient()
    if err != nil {
        return err
    }

    chariotClient, err := chariot.NewClient(os.Getenv("CHARIOT_API_URL"))
    if err != nil {
        return err
    }

    // Create sync service
    syncService := &SyncService{
        hackerOneClient: hackerOneClient,
        chariotClient:   chariotClient,
        programHandle:   programHandle,
    }

    // Load last sync timestamp
    lastSync, err := syncService.loadSyncTimestamp(ctx)
    if err != nil {
        return err
    }
    syncService.lastSyncTime = lastSync

    // Execute incremental sync
    return syncService.IncrementalSync(ctx)
}
```

### EventBridge Schedule

```yaml
Resources:
  SyncSchedule:
    Type: AWS::Events::Rule
    Properties:
      Name: hackerone-incremental-sync
      Description: Incremental sync every 15 minutes
      ScheduleExpression: rate(15 minutes)
      State: ENABLED
      Targets:
        - Arn: !GetAtt SyncFunction.Arn
          Id: SyncFunctionTarget

  ReconciliationSchedule:
    Type: AWS::Events::Rule
    Properties:
      Name: hackerone-full-reconciliation
      Description: Full reconciliation weekly
      ScheduleExpression: cron(0 2 ? * SUN *) # 2 AM every Sunday
      State: ENABLED
      Targets:
        - Arn: !GetAtt ReconciliationFunction.Arn
          Id: ReconciliationTarget
```

## Performance Optimization

### Concurrent Report Fetching

Use `errgroup` for concurrent API calls:

```go
import "golang.org/x/sync/errgroup"

func (s *SyncService) fetchReportsConcurrent(ctx context.Context, reportIDs []string) ([]*hackerone.Report, error) {
    reports := make([]*hackerone.Report, len(reportIDs))

    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(10) // Max 10 concurrent requests

    for i, reportID := range reportIDs {
        i, reportID := i, reportID

        g.Go(func() error {
            report, err := s.hackerOneClient.GetReport(ctx, reportID)
            if err != nil {
                return err
            }
            reports[i] = report
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }

    return reports, nil
}
```

## Additional Resources

- [HackerOne API Reference](api-reference.md)
- [Webhook Handling](webhook-handling.md)
- [Data Mapping](data-mapping.md)
- [Error Handling](error-handling.md)
