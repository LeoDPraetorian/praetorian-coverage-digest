# HackerOne ↔ Chariot Data Mapping

**Last Updated:** January 3, 2026

## Overview

This document defines bidirectional data mappings between HackerOne entities (Reports, Programs, Vulnerabilities) and Chariot platform entities (Risks, Assets, Attributes). Accurate mapping is critical for sync consistency and conflict resolution.

## Entity Mappings

### HackerOne Report ↔ Chariot Risk

**Primary mapping** for vulnerability data synchronization.

| HackerOne Field                    | Chariot Field                 | Direction           | Transform                        |
| ---------------------------------- | ----------------------------- | ------------------- | -------------------------------- |
| `report.id`                        | `risk.external_id`            | Bidirectional       | Store as `hackerone:report:{id}` |
| `report.title`                     | `risk.name`                   | Bidirectional       | Direct                           |
| `report.vulnerability_information` | `risk.description`            | Bidirectional       | Markdown → Plain text            |
| `report.state`                     | `risk.status`                 | Bidirectional       | See State Machine below          |
| `report.severity_rating`           | `risk.severity`               | Bidirectional       | See Severity Mapping below       |
| `report.cvss_score`                | `risk.risk_score`             | HackerOne → Chariot | Map 0-10 to 0-100 scale          |
| `report.weakness.id`               | `risk.vulnerability_type`     | HackerOne → Chariot | CWE-{id}                         |
| `report.weakness.name`             | `risk.vulnerability_class`    | HackerOne → Chariot | Direct                           |
| `report.created_at`                | `risk.discovered_at`          | HackerOne → Chariot | ISO 8601 timestamp               |
| `report.triaged_at`                | `risk.validated_at`           | HackerOne → Chariot | ISO 8601 timestamp               |
| `report.closed_at`                 | `risk.resolved_at`            | HackerOne → Chariot | ISO 8601 timestamp               |
| `report.disclosed_at`              | `risk.disclosed_at`           | HackerOne → Chariot | ISO 8601 timestamp               |
| `report.bounty_awarded_at`         | `risk.metadata.bounty_date`   | HackerOne → Chariot | ISO 8601 timestamp               |
| `report.bounty_amount`             | `risk.metadata.bounty_amount` | HackerOne → Chariot | Numeric (USD)                    |
| `report.structured_scope`          | `risk.asset_id`               | HackerOne → Chariot | Lookup Asset by identifier       |
| `report.reporter.username`         | `risk.reporter`               | HackerOne → Chariot | Store username                   |
| `report.program.handle`            | `risk.source`                 | HackerOne → Chariot | Store as `hackerone:{handle}`    |

### State Machine Mapping

**HackerOne Report States:**

- `new` - Unreviewed submission
- `pending_program_review` - Pending triage
- `triaged` - Validated vulnerability
- `needs_more_info` - Awaiting clarification
- `resolved` - Fixed and verified
- `not_applicable` - Not a vulnerability
- `informative` - Informational only
- `duplicate` - Duplicate of existing report
- `spam` - Spam submission

**Chariot Risk Status:**

- `open` - Active risk
- `investigating` - Under review
- `validated` - Confirmed vulnerability
- `mitigating` - Fix in progress
- `resolved` - Fixed
- `accepted` - Risk accepted
- `false_positive` - Not a real vulnerability

**Mapping Rules:**

| HackerOne State          | Chariot Status   | Notes                         |
| ------------------------ | ---------------- | ----------------------------- |
| `new`                    | `open`           | Initial state                 |
| `pending_program_review` | `investigating`  | Triage in progress            |
| `triaged`                | `validated`      | Vulnerability confirmed       |
| `needs_more_info`        | `investigating`  | Awaiting details              |
| `resolved`               | `resolved`       | Direct mapping                |
| `not_applicable`         | `false_positive` | Not a vulnerability           |
| `informative`            | `accepted`       | Low priority, accepted as-is  |
| `duplicate`              | `false_positive` | Mark as duplicate in metadata |
| `spam`                   | `false_positive` | Mark as spam in metadata      |

**Bidirectional State Transitions:**

When Chariot status changes, map back to HackerOne:

| Chariot Status Change          | HackerOne Action                    | API Endpoint                    |
| ------------------------------ | ----------------------------------- | ------------------------------- |
| `open` → `investigating`       | Update to `pending_program_review`  | `PUT /reports/{id}`             |
| `investigating` → `validated`  | Update to `triaged`                 | `PUT /reports/{id}`             |
| `validated` → `mitigating`     | Add internal note "Fix in progress" | `POST /reports/{id}/activities` |
| `mitigating` → `resolved`      | Update to `resolved`                | `PUT /reports/{id}`             |
| `validated` → `false_positive` | Update to `not_applicable`          | `PUT /reports/{id}`             |
| `validated` → `accepted`       | Update to `informative`             | `PUT /reports/{id}`             |

### Severity Mapping

**HackerOne Severity Ratings:**

- `none` - No security impact
- `low` - Minimal impact
- `medium` - Moderate impact
- `high` - Significant impact
- `critical` - Severe impact

**Chariot Severity:**

- `info` - Informational
- `low` - Low priority
- `medium` - Medium priority
- `high` - High priority
- `critical` - Critical priority

**Direct Mapping:**

| HackerOne  | Chariot    | Risk Score Range |
| ---------- | ---------- | ---------------- |
| `none`     | `info`     | 0-20             |
| `low`      | `low`      | 21-40            |
| `medium`   | `medium`   | 41-60            |
| `high`     | `high`     | 61-80            |
| `critical` | `critical` | 81-100           |

### CVSS Mapping (Added January 2025)

**HackerOne now supports CVSS 4.0 in addition to CVSS 3.1.**

```go
type CVSSScore struct {
    Version string  // "3.1" or "4.0"
    Vector  string  // CVSS vector string
    Score   float64 // 0.0 - 10.0
}

func mapCVSSToRiskScore(cvss CVSSScore) int {
    // Map 0-10 CVSS to 0-100 Chariot risk score
    // Apply 10x multiplier
    return int(cvss.Score * 10)
}
```

**Priority: Use CVSS 4.0 if available, fallback to CVSS 3.1, fallback to severity_rating.**

```go
func getRiskScore(report HackerOneReport) int {
    if report.CVSS40Score != nil {
        return mapCVSSToRiskScore(*report.CVSS40Score)
    }
    if report.CVSS31Score != nil {
        return mapCVSSToRiskScore(*report.CVSS31Score)
    }
    // Fallback to severity rating
    return mapSeverityToRiskScore(report.SeverityRating)
}
```

### HackerOne Structured Scope ↔ Chariot Asset

Map HackerOne scopes to Chariot assets for vulnerability context.

| HackerOne Field                            | Chariot Field                    | Transform                    |
| ------------------------------------------ | -------------------------------- | ---------------------------- |
| `structured_scope.asset_type`              | `asset.class`                    | See Asset Type Mapping below |
| `structured_scope.asset_identifier`        | `asset.dns` or `asset.key`       | Depends on asset type        |
| `structured_scope.eligible_for_bounty`     | `asset.metadata.bounty_eligible` | Boolean                      |
| `structured_scope.eligible_for_submission` | `asset.in_scope`                 | Boolean                      |
| `structured_scope.instruction`             | `asset.description`              | Direct                       |

**Asset Type Mapping:**

| HackerOne Asset Type       | Chariot Asset Class | Identifier Field                  |
| -------------------------- | ------------------- | --------------------------------- |
| `URL`                      | `domain` or `ip`    | `asset.dns` (extract domain)      |
| `WILDCARD`                 | `domain`            | `asset.dns` (store with wildcard) |
| `IP_ADDRESS`               | `ip`                | `asset.key` (IP address)          |
| `CIDR`                     | `ip_range`          | `asset.key` (CIDR notation)       |
| `DOWNLOADABLE_EXECUTABLES` | `software`          | `asset.name`                      |
| `ANDROID_APP_ID`           | `mobile_app`        | `asset.metadata.app_id`           |
| `IOS_APP_ID`               | `mobile_app`        | `asset.metadata.app_id`           |
| `WINDOWS_APP_ID`           | `software`          | `asset.metadata.app_id`           |
| `SOURCE_CODE`              | `repository`        | `asset.metadata.repo_url`         |
| `HARDWARE`                 | `physical`          | `asset.name`                      |
| `OTHER`                    | `other`             | `asset.name`                      |

### HackerOne Program ↔ Chariot Integration

Store program metadata for filtering and enrichment.

| HackerOne Field            | Chariot Storage                       | Usage                           |
| -------------------------- | ------------------------------------- | ------------------------------- |
| `program.handle`           | `integration.external_id`             | Unique identifier               |
| `program.name`             | `integration.name`                    | Display name                    |
| `program.policy`           | `integration.metadata.policy`         | Policy markdown                 |
| `program.bounty_enabled`   | `integration.metadata.bounty_enabled` | Feature flag                    |
| `program.submission_state` | `integration.active`                  | `open` = true, `paused` = false |
| `program.min_bounty`       | `integration.metadata.min_bounty`     | Min bounty amount               |
| `program.max_bounty`       | `integration.metadata.max_bounty`     | Max bounty amount               |

## Enrichment Pipeline

When syncing HackerOne reports to Chariot, enrich with platform-specific context.

### Step-by-Step Enrichment

```go
func EnrichHackerOneReport(report HackerOneReport) (*ChariotRisk, error) {
    risk := &ChariotRisk{
        ExternalID: fmt.Sprintf("hackerone:report:%s", report.ID),
        Name:       report.Title,
        Description: report.VulnerabilityInformation,
        Status:     mapState(report.State),
        Severity:   mapSeverity(report.SeverityRating),
        RiskScore:  getRiskScore(report),
    }

    // Step 1: Lookup Chariot Asset from structured scope
    if report.StructuredScope != nil {
        asset, err := findChariotAsset(report.StructuredScope)
        if err != nil {
            log.Warn("Asset not found", "scope", report.StructuredScope.AssetIdentifier)
        } else {
            risk.AssetID = asset.ID

            // Enrich with asset metadata
            risk.CloudProvider = asset.CloudProvider
            risk.Tags = asset.Tags
            risk.Owner = asset.Owner
        }
    }

    // Step 2: Add HackerOne-specific metadata
    risk.Metadata = map[string]interface{}{
        "hackerone_report_id": report.ID,
        "hackerone_program":   report.Program.Handle,
        "reporter_username":   report.Reporter.Username,
        "weakness_cwe":        fmt.Sprintf("CWE-%s", report.Weakness.ID),
        "bounty_amount":       report.BountyAmount,
        "disclosed":           report.DiscloseAt != nil,
    }

    // Step 3: Calculate Chariot-specific risk score
    risk.RiskScore = calculateChariotRiskScore(risk, asset)

    return risk, nil
}
```

### Asset Discovery

If structured scope asset doesn't exist in Chariot, create it:

```go
func findOrCreateChariotAsset(scope HackerOneStructuredScope) (*ChariotAsset, error) {
    // Try to find existing asset
    asset, err := chariotClient.FindAsset(scope.AssetIdentifier)
    if err == nil {
        return asset, nil
    }

    // Create new asset
    newAsset := &ChariotAsset{
        Class:       mapAssetType(scope.AssetType),
        DNS:         extractDNS(scope.AssetIdentifier),
        Key:         scope.AssetIdentifier,
        Description: scope.Instruction,
        InScope:     scope.EligibleForSubmission,
        Source:      "hackerone",
        Metadata: map[string]interface{}{
            "bounty_eligible": scope.EligibleForBounty,
            "hackerone_scope_id": scope.ID,
        },
    }

    return chariotClient.CreateAsset(newAsset)
}
```

## Conflict Resolution

Handle conflicts when both Chariot and HackerOne modify the same report.

### Last-Write-Wins Strategy

```go
type ConflictResolver struct {
    cache map[string]time.Time // report_id -> last_sync_time
}

func (r *ConflictResolver) Resolve(chariotRisk ChariotRisk, hackerOneReport HackerOneReport) (ChariotRisk, error) {
    lastSync, exists := r.cache[hackerOneReport.ID]

    // First sync - no conflict
    if !exists {
        r.cache[hackerOneReport.ID] = time.Now()
        return mapReportToRisk(hackerOneReport), nil
    }

    // Check for conflict (both updated since last sync)
    chariotUpdated := chariotRisk.UpdatedAt.After(lastSync)
    hackerOneUpdated := hackerOneReport.UpdatedAt.After(lastSync)

    if chariotUpdated && hackerOneUpdated {
        // CONFLICT: Both updated since last sync
        log.Warn("Sync conflict detected",
            "report_id", hackerOneReport.ID,
            "chariot_updated_at", chariotRisk.UpdatedAt,
            "hackerone_updated_at", hackerOneReport.UpdatedAt,
        )

        // Last-write-wins: Choose newer timestamp
        if hackerOneReport.UpdatedAt.After(chariotRisk.UpdatedAt) {
            log.Info("Resolving conflict: HackerOne wins (newer)")
            return mapReportToRisk(hackerOneReport), nil
        } else {
            log.Info("Resolving conflict: Chariot wins (newer)")
            // Push Chariot changes to HackerOne
            if err := updateHackerOneReport(hackerOneReport.ID, chariotRisk); err != nil {
                return chariotRisk, fmt.Errorf("push to hackerone failed: %w", err)
            }
            return chariotRisk, nil
        }
    }

    // No conflict - apply changes
    if hackerOneUpdated {
        return mapReportToRisk(hackerOneReport), nil
    }

    return chariotRisk, nil
}
```

### Conflict Notification

```go
func notifyConflict(reportID string, chariotUpdated, hackerOneUpdated time.Time) {
    notification := Notification{
        Type:    "sync_conflict",
        Severity: "warning",
        Title:   fmt.Sprintf("Sync conflict on Report #%s", reportID),
        Message: fmt.Sprintf(
            "Report was modified in both Chariot (%s) and HackerOne (%s). Applied last-write-wins resolution.",
            chariotUpdated.Format(time.RFC3339),
            hackerOneUpdated.Format(time.RFC3339),
        ),
        Actions: []Action{
            {Label: "View Report", URL: fmt.Sprintf("/risks/%s", reportID)},
            {Label: "View HackerOne", URL: fmt.Sprintf("https://hackerone.com/reports/%s", reportID)},
        },
    }

    notificationService.Send(notification)
}
```

## Data Validation Rules

Enforce validation before syncing to prevent data corruption.

### Required Fields

**Chariot Risk → HackerOne Report:**

- `risk.name` → `report.title` (min 10 chars, max 255 chars)
- `risk.description` → `report.vulnerability_information` (min 50 chars)
- `risk.severity` → `report.severity_rating` (must be valid enum value)
- `risk.asset_id` → `report.structured_scope_id` (must reference valid scope)

**HackerOne Report → Chariot Risk:**

- `report.id` (must be unique in Chariot)
- `report.title` (required for display)
- `report.state` (must map to valid Chariot status)

### Field Constraints

```go
func validateReportForSync(report HackerOneReport) error {
    if len(report.Title) < 10 {
        return fmt.Errorf("title too short: %d chars (min 10)", len(report.Title))
    }
    if len(report.Title) > 255 {
        return fmt.Errorf("title too long: %d chars (max 255)", len(report.Title))
    }
    if len(report.VulnerabilityInformation) < 50 {
        return fmt.Errorf("vulnerability_information too short: %d chars (min 50)", len(report.VulnerabilityInformation))
    }
    if !isValidSeverity(report.SeverityRating) {
        return fmt.Errorf("invalid severity_rating: %s", report.SeverityRating)
    }
    return nil
}
```

## Performance Optimization

### Batch Upserts

Process multiple reports in single transaction:

```go
func BatchUpsertRisks(reports []HackerOneReport) error {
    risks := make([]*ChariotRisk, len(reports))
    for i, report := range reports {
        enriched, err := EnrichHackerOneReport(report)
        if err != nil {
            log.Error("Enrichment failed", "report_id", report.ID, "error", err)
            continue
        }
        risks[i] = enriched
    }

    // Single database transaction for all upserts
    return chariotClient.BatchUpsertRisks(risks)
}
```

### Incremental Sync

Use `GET /incremental/activities` to fetch only changed reports:

```go
func IncrementalSync(programHandle string, lastSyncTime time.Time) error {
    activities, err := hackerOneClient.GetIncrementalActivities(
        programHandle,
        lastSyncTime,
    )
    if err != nil {
        return err
    }

    // Extract unique report IDs from activities
    reportIDs := extractReportIDs(activities)

    // Fetch full report details for changed reports only
    reports, err := hackerOneClient.GetReports(reportIDs)
    if err != nil {
        return err
    }

    // Batch upsert
    return BatchUpsertRisks(reports)
}
```

## Testing Data Mappings

### Unit Test Template

```go
func TestMapReportToRisk(t *testing.T) {
    report := HackerOneReport{
        ID:                      "12345",
        Title:                   "XSS in search parameter",
        VulnerabilityInformation: "Detailed description...",
        State:                   "triaged",
        SeverityRating:          "high",
        CVSS31Score:             &CVSSScore{Version: "3.1", Score: 7.5},
        Weakness:                Weakness{ID: "79", Name: "Cross-site Scripting (XSS)"},
        CreatedAt:               time.Now().Add(-24 * time.Hour),
    }

    risk := mapReportToRisk(report)

    assert.Equal(t, "hackerone:report:12345", risk.ExternalID)
    assert.Equal(t, "XSS in search parameter", risk.Name)
    assert.Equal(t, "validated", risk.Status)
    assert.Equal(t, "high", risk.Severity)
    assert.Equal(t, 75, risk.RiskScore) // 7.5 * 10
    assert.Equal(t, "CWE-79", risk.VulnerabilityType)
}
```

### Integration Test

```go
func TestBidirectionalSync(t *testing.T) {
    // Step 1: Sync HackerOne report to Chariot
    report := fetchHackerOneReport("12345")
    risk := mapReportToRisk(report)
    err := chariotClient.UpsertRisk(risk)
    assert.NoError(t, err)

    // Step 2: Modify in Chariot
    risk.Status = "resolved"
    err = chariotClient.UpdateRisk(risk)
    assert.NoError(t, err)

    // Step 3: Sync Chariot changes back to HackerOne
    err = updateHackerOneReport("12345", risk)
    assert.NoError(t, err)

    // Step 4: Verify HackerOne updated
    updatedReport := fetchHackerOneReport("12345")
    assert.Equal(t, "resolved", updatedReport.State)
}
```

## Additional Resources

- [HackerOne API Reference](api-reference.md)
- [Chariot Data Models](../../../../tabularium/)
- [Sync Patterns](sync-patterns.md)
