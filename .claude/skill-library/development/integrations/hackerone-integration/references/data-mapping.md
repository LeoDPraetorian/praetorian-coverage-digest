# HackerOne → Chariot Data Mapping

**Field-by-field mapping guide for converting HackerOne reports to Chariot Risk entities.**

## Overview

This document defines the canonical mapping between HackerOne report fields and Chariot Risk entity fields. Following these mappings ensures consistent data representation across the platform.

## Core Field Mappings

### Identity Fields

| HackerOne Field | Chariot Field | Transformation | Notes |
|----------------|---------------|----------------|-------|
| `report.id` | `Risk.ExternalID` | String | Store as-is |
| `report.type` | `Risk.Source` | Constant | Always "hackerone" |
| `report.attributes.created_at` | `Risk.CreatedAt` | ISO8601 → Time | Parse timestamp |
| `report.attributes.updated_at` | `Risk.UpdatedAt` | ISO8601 → Time | Parse timestamp |

### Content Fields

| HackerOne Field | Chariot Field | Transformation | Notes |
|----------------|---------------|----------------|-------|
| `report.attributes.title` | `Risk.Title` | String | Prefix with "[HackerOne]" |
| `report.attributes.vulnerability_information` | `Risk.Description` | Markdown → Plain | Strip markdown formatting |
| `report.attributes.weakness.name` | `Risk.Category` | CWE → Category | See CWE mapping below |

### Severity Mapping

| HackerOne Severity | CVSS Score | Chariot Priority | Chariot Numeric |
|-------------------|------------|------------------|-----------------|
| `critical` | 9.0 - 10.0 | P0 | 0 |
| `high` | 7.0 - 8.9 | P1 | 1 |
| `medium` | 4.0 - 6.9 | P2 | 2 |
| `low` | 0.1 - 3.9 | P3 | 3 |
| `none` | 0.0 | P4 | 4 |

**Implementation:**
```go
func MapSeverityToPriority(severity string) int {
    mapping := map[string]int{
        "critical": 0,
        "high":     1,
        "medium":   2,
        "low":      3,
        "none":     4,
    }

    if priority, ok := mapping[severity]; ok {
        return priority
    }
    return 2 // Default to medium
}
```

### State Mapping

| HackerOne State | Chariot Status | Description |
|----------------|----------------|-------------|
| `new` | `open` | Newly submitted report |
| `triaged` | `confirmed` | Validated by security team |
| `needs-more-info` | `pending` | Waiting for researcher response |
| `resolved` | `resolved` | Fixed and verified |
| `not-applicable` | `rejected` | Out of scope or invalid |
| `informative` | `info` | Informational only |
| `duplicate` | `duplicate` | Already reported |
| `spam` | `rejected` | Invalid submission |

### Asset Mapping

HackerOne reports include structured scope information that maps to Chariot Assets:

```go
// Extract asset from HackerOne structured scope
func MapReportToAsset(report *Report) (*model.Asset, error) {
    scope := report.Relationships.StructuredScope.Data

    return &model.Asset{
        Identifier:  scope.Attributes.AssetIdentifier,
        Type:        mapAssetType(scope.Attributes.AssetType),
        Source:      "hackerone",
        ExternalID:  scope.ID,
        Environment: scope.Attributes.Environment, // production/staging/development
    }, nil
}

func mapAssetType(h1Type string) string {
    mapping := map[string]string{
        "URL":         "web_application",
        "DOMAIN":      "domain",
        "IP_ADDRESS":  "ipv4",
        "CIDR":        "network",
        "APPLE_STORE_APP_ID": "mobile_app",
        "GOOGLE_PLAY_APP_ID": "mobile_app",
        "SOURCE_CODE": "repository",
        "DOWNLOADABLE_EXECUTABLES": "binary",
        "OTHER":       "other",
    }

    if assetType, ok := mapping[h1Type]; ok {
        return assetType
    }
    return "other"
}
```

## CWE to Chariot Category Mapping

HackerOne uses CWE (Common Weakness Enumeration) IDs. Map to Chariot categories:

| CWE ID | CWE Name | Chariot Category |
|--------|----------|------------------|
| 79 | Cross-Site Scripting | XSS |
| 89 | SQL Injection | SQL_INJECTION |
| 287 | Improper Authentication | AUTH_BYPASS |
| 352 | Cross-Site Request Forgery | CSRF |
| 20 | Improper Input Validation | INPUT_VALIDATION |
| 22 | Path Traversal | PATH_TRAVERSAL |
| 78 | OS Command Injection | COMMAND_INJECTION |
| 200 | Information Exposure | INFO_DISCLOSURE |
| 434 | Unrestricted File Upload | FILE_UPLOAD |
| 502 | Deserialization of Untrusted Data | DESERIALIZATION |

**Implementation:**
```go
var cweMapping = map[string]string{
    "79":  "XSS",
    "89":  "SQL_INJECTION",
    "287": "AUTH_BYPASS",
    "352": "CSRF",
    "20":  "INPUT_VALIDATION",
    "22":  "PATH_TRAVERSAL",
    "78":  "COMMAND_INJECTION",
    "200": "INFO_DISCLOSURE",
    "434": "FILE_UPLOAD",
    "502": "DESERIALIZATION",
}

func MapCWEToCategory(cweID string) string {
    if category, ok := cweMapping[cweID]; ok {
        return category
    }
    return "OTHER_VULNERABILITY"
}
```

## Reporter Information

Store researcher information in Risk metadata:

```go
type RiskMetadata struct {
    HackerOneReporter struct {
        Username  string `json:"username"`
        Reputation int   `json:"reputation"`
        Signal     int   `json:"signal"`
        Impact     int   `json:"impact"`
    } `json:"hackerone_reporter"`
}

func MapReporterMetadata(report *Report) RiskMetadata {
    reporter := report.Relationships.Reporter.Data

    return RiskMetadata{
        HackerOneReporter: struct {
            Username   string `json:"username"`
            Reputation int    `json:"reputation"`
            Signal     int    `json:"signal"`
            Impact     int    `json:"impact"`
        }{
            Username:   reporter.Attributes.Username,
            Reputation: reporter.Attributes.Reputation,
            Signal:     reporter.Attributes.Signal,
            Impact:     reporter.Attributes.Impact,
        },
    }
}
```

## Complete Mapping Function

```go
func MapReportToRisk(report *Report) (*model.Risk, error) {
    // Extract asset from structured scope
    asset, err := MapReportToAsset(report)
    if err != nil {
        return nil, fmt.Errorf("map asset: %w", err)
    }

    // Map severity to priority
    priority := MapSeverityToPriority(report.Attributes.Severity.Rating)

    // Map state to status
    status := MapStateToStatus(report.Attributes.State)

    // Map CWE to category
    cweID := extractCWEID(report.Attributes.Weakness.ID)
    category := MapCWEToCategory(cweID)

    // Build risk entity
    risk := &model.Risk{
        ExternalID:  report.ID,
        Source:      "hackerone",
        Title:       fmt.Sprintf("[HackerOne] %s", report.Attributes.Title),
        Description: sanitizeMarkdown(report.Attributes.VulnerabilityInformation),
        Priority:    priority,
        Status:      status,
        Category:    category,
        AssetID:     asset.ID,
        CVSS:        report.Attributes.Severity.Score,
        CreatedAt:   parseTime(report.Attributes.CreatedAt),
        UpdatedAt:   parseTime(report.Attributes.UpdatedAt),
        Metadata:    MapReporterMetadata(report),
    }

    return risk, nil
}
```

## Validation Rules

### Required Fields

Before creating a Risk entity, validate:
- ✅ Report has title (non-empty)
- ✅ Report has severity rating
- ✅ Report has valid state
- ✅ Report has structured scope (asset identifier)
- ✅ Report has weakness/CWE

### Data Sanitization

```go
func sanitizeMarkdown(md string) string {
    // Remove markdown formatting for plain text description
    md = strings.ReplaceAll(md, "**", "")
    md = strings.ReplaceAll(md, "__", "")
    md = strings.ReplaceAll(md, "*", "")
    md = strings.ReplaceAll(md, "_", "")

    // Remove code blocks
    md = regexp.MustCompile("```[\\s\\S]*?```").ReplaceAllString(md, "[code block]")

    // Remove links but keep text
    md = regexp.MustCompile("\\[([^\\]]+)\\]\\([^)]+\\)").ReplaceAllString(md, "$1")

    return strings.TrimSpace(md)
}
```

## Related References

- [Client Setup](client-setup.md) - API client implementation
- [API Reference](api-reference.md) - HackerOne API documentation
- [Testing Patterns](testing-patterns.md) - Mapping test strategies
