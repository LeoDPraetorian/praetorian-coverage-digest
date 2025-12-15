# Scan Lifecycle Management

Complete guide to creating, monitoring, and managing Burp DAST scans.

## Scan Lifecycle Overview

```
[1] Create Schedule Item
    ↓
[2] Scan Queued (agent assignment)
    ↓
[3] Scan Running (crawl + audit phases)
    ↓
[4] Scan Completed (succeeded/failed/cancelled)
    ↓
[5] Process Results (issues + scanned items)
```

---

## Phase 1: Schedule Creation

### On-Demand Scans (One-Time)

**Purpose:** Immediate, single-execution scans triggered manually or by capabilities.

```go
func (c *BurpEnterpriseClient) CreateOnDemandSiteSchedule(
    siteID string,
    configID string,
) (string, error) {
    mutation := `
        mutation CreateScheduleItem($siteId: ID!, $configId: ID!) {
            create_schedule_item(input: {
                site_ids: [$siteId],
                scan_configuration_ids: [$configId],
                agent_pool_id: "3"
            }) {
                schedule_item {
                    id
                }
            }
        }
    `

    variables := map[string]any{
        "siteId":   siteID,
        "configId": configID,
    }

    result, err := graphql.Graphql[CreateScheduleItemResponse](
        c.HTTPClient,
        c.graphqlURL(),
        mutation,
        variables,
        c.headers()...,
    )

    if err != nil {
        return "", fmt.Errorf("failed to create on-demand schedule: %w", err)
    }

    return result.CreateScheduleItem.ScheduleItem.ID, nil
}
```

**Key Parameters:**
- `agent_pool_id: "3"` - On-demand pool for immediate execution
- No schedule/rrule - runs once immediately

**Usage Pattern:**
```go
// 1. Ensure site exists
wa, _ := client.EnsureSite(wa)

// 2. Create on-demand scan
scheduleID, err := client.CreateOnDemandSiteSchedule(
    wa.BurpSiteID,
    burp.PRAETORIAN_BALANCED_CONFIG,
)

// 3. Monitor scan (see Phase 2)
```

---

### Recurring Scans (Daily)

**Purpose:** Continuous monitoring for seeds (baseline assets).

```go
func (c *BurpEnterpriseClient) CreateDailySiteSchedule(
    siteID string,
    configID string,
    labelSuffix string,
) (string, error) {
    // Start 5 minutes from now to avoid immediate execution
    initialRunTime := time.Now().Add(5 * time.Minute).Format(time.RFC3339)

    mutation := `
        mutation CreateScheduleItem($input: CreateScheduleItemInput!) {
            create_schedule_item(input: $input) {
                schedule_item {
                    id
                }
            }
        }
    `

    input := map[string]any{
        "site_ids":                 []string{siteID},
        "scan_configuration_ids":   []string{configID},
        "agent_pool_id":            "-1", // Default pool
        "schedule": map[string]any{
            "initial_run_time": initialRunTime,
            "rrule":            "FREQ=DAILY;INTERVAL=1", // RFC 5545 format
        },
    }

    variables := map[string]any{"input": input}

    result, err := graphql.Graphql[CreateScheduleItemResponse](
        c.HTTPClient,
        c.graphqlURL(),
        mutation,
        variables,
        c.headers()...,
    )

    if err != nil {
        return "", fmt.Errorf("failed to create daily schedule: %w", err)
    }

    return result.CreateScheduleItem.ScheduleItem.ID, nil
}
```

**Key Parameters:**
- `agent_pool_id: "-1"` - Default pool
- `initial_run_time` - First execution time (5 min buffer)
- `rrule: "FREQ=DAILY;INTERVAL=1"` - Run every day at midnight UTC

**Usage Pattern:**
```go
// Only for seeds (continuous monitoring)
if wa.IsSeed() {
    scheduleID, err := client.CreateDailySiteSchedule(
        wa.BurpSiteID,
        burp.PRAETORIAN_BALANCED_CONFIG,
        wa.Username, // appears in Burp UI
    )

    // Cache schedule ID on WebApplication
    wa.BurpScheduleID = scheduleID
}
```

---

### Scan Configuration Selection

```go
// Praetorian's balanced security test profile (recommended)
const PRAETORIAN_BALANCED_CONFIG = "d8b8e107-ff32-42d8-94c5-ffe4b9800fda"

// Or list available configurations
configs, err := client.GetScanConfigurations()
for _, config := range configs.ScanConfigurations {
    fmt.Printf("%s: %s\n", config.ID, config.Name)
}
```

**Configuration Validation:**
```go
func (c *BurpEnterpriseClient) validateScanConfiguration(configID string) (bool, error) {
    configs, err := c.GetScanConfigurations()
    if err != nil {
        return false, fmt.Errorf("failed to get scan configurations: %w", err)
    }

    for _, config := range configs.ScanConfigurations {
        if config.ID == configID {
            return true, nil
        }
    }

    return false, nil
}
```

**Always validate** before creating schedules to fail fast with clear errors.

---

## Phase 2: Scan Monitoring

### Get Scan from Schedule

```go
func (c *BurpEnterpriseClient) GetScanFromScheduleItem(
    scheduleItemID string,
) (*ScansQueryResponse, error) {
    query := `
        query GetScanForScheduleItem($scheduleItemId: ID!) {
            scans(
                schedule_item_id: $scheduleItemId
                sort_column: start
                limit: 1
                sort_order: desc
            ) {
                id
                status
                site_id
                site_name
            }
        }
    `

    variables := map[string]any{
        "scheduleItemId": scheduleItemID,
    }

    result, err := graphql.Graphql[ScansQueryResponse](
        c.HTTPClient,
        c.graphqlURL(),
        query,
        variables,
        c.headers()...,
    )

    if err != nil {
        return nil, err
    }

    return result, nil
}
```

**Usage:**
```go
// Fetch most recent scan for schedule
scanResp, err := client.GetScanFromScheduleItem(scheduleID)
if err != nil {
    return fmt.Errorf("failed to get scan: %w", err)
}

if len(scanResp.Scans) == 0 {
    return fmt.Errorf("no scans found for schedule")
}

scanID := scanResp.Scans[0].ID
```

---

### Poll Scan Status

```go
func (c *BurpEnterpriseClient) GetScanSummary(scanID string) (*ScanSummary, error) {
    query := `
        query GetScanSummary($scanId: ID!) {
            scan(id: $scanId) {
                id
                scan_target {
                    id
                    name
                }
                end_time
                status
            }
        }
    `

    variables := map[string]any{
        "scanId": scanID,
    }

    result, err := graphql.Graphql[ScanSummaryResponse](
        c.HTTPClient,
        c.graphqlURL(),
        query,
        variables,
        c.headers()...,
    )

    if err != nil {
        return nil, fmt.Errorf("failed to get scan summary: %w", err)
    }

    return &result.Scan, nil
}
```

**Status Values:**
- `"queued"` - Waiting for agent assignment
- `"running"` - Actively scanning (crawl/audit phases)
- `"succeeded"` - Completed successfully
- `"failed"` - Error during execution
- `"cancelled"` - Manually stopped

---

### Complete Monitoring Pattern

```go
func MonitorScanCompletion(
    ctx context.Context,
    client *burp.BurpEnterpriseClient,
    scheduleID string,
) (string, error) {
    // 1. Get scan ID from schedule
    scanResp, err := client.GetScanFromScheduleItem(scheduleID)
    if err != nil {
        return "", fmt.Errorf("failed to get scan: %w", err)
    }

    if len(scanResp.Scans) == 0 {
        return "", fmt.Errorf("no scans found for schedule")
    }

    scanID := scanResp.Scans[0].ID

    // 2. Poll until completion
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()

    timeout := time.After(2 * time.Hour) // Max scan duration

    for {
        select {
        case <-ctx.Done():
            return "", ctx.Err()

        case <-timeout:
            return "", fmt.Errorf("scan timeout after 2 hours")

        case <-ticker.C:
            summary, err := client.GetScanSummary(scanID)
            if err != nil {
                return "", fmt.Errorf("failed to get scan status: %w", err)
            }

            switch summary.Status {
            case burp.SCAN_SUCCEEDED:
                return scanID, nil

            case burp.SCAN_FAILED:
                return "", fmt.Errorf("scan failed")

            case burp.SCAN_CANCELLED:
                return "", fmt.Errorf("scan was cancelled")

            case burp.SCAN_QUEUED, burp.SCAN_RUNNING:
                // Continue polling
                slog.InfoContext(ctx, "scan in progress", "status", summary.Status)

            default:
                return "", fmt.Errorf("unknown scan status: %s", summary.Status)
            }
        }
    }
}
```

**Polling Best Practices:**
- ✅ Poll every 30 seconds (not faster)
- ✅ Use context for cancellation
- ✅ Set reasonable timeout (1-2 hours)
- ✅ Log progress for debugging
- ❌ Don't poll faster than 30 seconds (unnecessary API load)
- ❌ Don't poll indefinitely without timeout

---

## Phase 3: Scan Cancellation

### Cancel Running Scan

```go
func (c *BurpEnterpriseClient) CancelScan(scanID string) error {
    if scanID == "" {
        return nil // No-op if no scan ID
    }

    mutation := `
        mutation CancelScan($scanId: ID!) {
            cancel_scan(input: { id: $scanId }) {
                id
            }
        }
    `

    variables := map[string]any{
        "scanId": scanID,
    }

    result, err := graphql.Graphql[CancelScanResponse](
        c.HTTPClient,
        c.graphqlURL(),
        mutation,
        variables,
        c.headers()...,
    )

    if err != nil {
        return fmt.Errorf("failed to cancel scan: %w", err)
    }

    if result.CancelScan.ID == "" {
        return fmt.Errorf("failed to cancel scan %s", scanID)
    }

    return nil
}
```

**When to Cancel:**
- User-initiated stop
- Timeout exceeded
- Capability teardown
- Error recovery

**Usage Pattern:**
```go
// Cleanup pattern in capability
defer func() {
    if scanID != "" {
        _ = client.CancelScan(scanID)
    }
}()
```

---

## Phase 4: Result Processing

### Check Scan Completion

```go
summary, err := client.GetScanSummary(scanID)
if err != nil {
    return fmt.Errorf("failed to get scan summary: %w", err)
}

if summary.Status != burp.SCAN_SUCCEEDED {
    return fmt.Errorf("scan not completed: %s", summary.Status)
}
```

---

### Retrieve Entities

```go
entities, err := client.GetEntities(scanID)
if err != nil {
    return fmt.Errorf("failed to get entities: %w", err)
}

// Process risks (vulnerabilities)
for _, risk := range entities.Risks {
    slog.Info("found vulnerability",
        "name", risk.Name,
        "severity", risk.Severity,
        "path", risk.Path,
    )
}

// Process attributes (discovered endpoints)
for _, attr := range entities.Attributes {
    slog.Info("discovered endpoint",
        "url", attr.Value,
    )
}
```

See [Result Processing](result-processing.md) for conversion details.

---

## Advanced Patterns

### Multi-Scan Monitoring

```go
func MonitorMultipleScans(
    ctx context.Context,
    client *burp.BurpEnterpriseClient,
    scheduleIDs []string,
) ([]string, error) {
    results := make([]string, len(scheduleIDs))
    errs := make([]error, len(scheduleIDs))

    var wg sync.WaitGroup
    for i, scheduleID := range scheduleIDs {
        wg.Add(1)
        go func(idx int, schedID string) {
            defer wg.Done()
            scanID, err := MonitorScanCompletion(ctx, client, schedID)
            results[idx] = scanID
            errs[idx] = err
        }(i, scheduleID)
    }

    wg.Wait()

    // Check for errors
    for _, err := range errs {
        if err != nil {
            return nil, err
        }
    }

    return results, nil
}
```

**Use Case:** Scanning multiple sites concurrently.

---

### Scan Progress Estimation

```go
func EstimateScanProgress(summary *burp.ScanSummary) float64 {
    if summary.Status == burp.SCAN_SUCCEEDED {
        return 1.0
    }

    if summary.Status == burp.SCAN_RUNNING {
        // Rough estimate: 50% crawl, 50% audit
        // TODO: Use scan event log for accurate progress
        return 0.5
    }

    return 0.0
}
```

**Note:** Accurate progress requires `scan_event_log` query (future enhancement).

---

### Retry Logic

```go
func CreateScanWithRetry(
    ctx context.Context,
    client *burp.BurpEnterpriseClient,
    siteID string,
    configID string,
    maxRetries int,
) (string, error) {
    var lastErr error

    for attempt := 1; attempt <= maxRetries; attempt++ {
        scheduleID, err := client.CreateOnDemandSiteSchedule(siteID, configID)
        if err == nil {
            return scheduleID, nil
        }

        lastErr = err
        slog.WarnContext(ctx, "failed to create scan, retrying",
            "attempt", attempt,
            "max_retries", maxRetries,
            "error", err,
        )

        // Exponential backoff
        backoff := time.Duration(attempt*attempt) * time.Second
        select {
        case <-ctx.Done():
            return "", ctx.Err()
        case <-time.After(backoff):
            // Continue to next attempt
        }
    }

    return "", fmt.Errorf("failed after %d attempts: %w", maxRetries, lastErr)
}
```

**When to Retry:**
- Network errors
- Burp API rate limits
- Temporary service unavailability

**Don't Retry:**
- Invalid configuration IDs
- Authentication failures
- Invalid site IDs

---

## Error Scenarios & Handling

### Scan Queued Too Long

**Symptom:** Scan stuck in "queued" status for >30 minutes.

**Possible Causes:**
- No available agents in pool
- Agent pool misconfiguration
- Burp Enterprise agent offline

**Solution:**
```go
if summary.Status == burp.SCAN_QUEUED {
    queuedDuration := time.Since(startTime)
    if queuedDuration > 30*time.Minute {
        return fmt.Errorf("scan queued for too long: %v", queuedDuration)
    }
}
```

---

### Scan Failed

**Symptom:** `summary.Status == burp.SCAN_FAILED`

**Possible Causes:**
- Network connectivity issues
- Invalid site configuration
- Agent crash

**Solution:**
1. Check scan event log (future feature)
2. Verify site configuration
3. Retry with backoff

---

### Empty Scan Results

**Symptom:** `len(scanResp.Scans) == 0`

**Possible Causes:**
- Schedule not yet executed
- Schedule item deleted
- Query filters too restrictive

**Solution:**
```go
if len(scanResp.Scans) == 0 {
    // Wait for first execution
    time.Sleep(5 * time.Minute)
    scanResp, err = client.GetScanFromScheduleItem(scheduleID)
}
```

---

## Performance Optimization

### Batch Schedule Creation

```go
func CreateMultipleSchedules(
    ctx context.Context,
    client *burp.BurpEnterpriseClient,
    sites []string,
    configID string,
) ([]string, error) {
    scheduleIDs := make([]string, len(sites))
    errs := make([]error, len(sites))

    // Use errgroup for parallel creation with error handling
    g, ctx := errgroup.WithContext(ctx)

    for i, siteID := range sites {
        i, siteID := i, siteID // Capture loop variables
        g.Go(func() error {
            scheduleID, err := client.CreateOnDemandSiteSchedule(siteID, configID)
            if err != nil {
                return err
            }
            scheduleIDs[i] = scheduleID
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }

    return scheduleIDs, nil
}
```

**Benefits:**
- Parallel creation reduces latency
- errgroup handles errors elegantly

---

### Polling Interval Tuning

```go
// Adaptive polling based on scan status
func getPollingInterval(status string) time.Duration {
    switch status {
    case burp.SCAN_QUEUED:
        return 60 * time.Second // Queue status changes slowly
    case burp.SCAN_RUNNING:
        return 30 * time.Second // Standard polling
    default:
        return 5 * time.Second  // Shouldn't reach here
    }
}
```

---

## Related References

- [GraphQL Schema](graphql-schema.md) - Scan-related queries and mutations
- [Entity Relationships](entity-relationships.md) - Schedule vs scan distinction
- [Site Provisioning Workflow](site-provisioning.md) - Creating sites before scanning
- [Result Processing](result-processing.md) - Converting issues to risks
- [Error Handling](error-handling.md) - Handling GraphQL errors
