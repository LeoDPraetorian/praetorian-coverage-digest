---
name: burp-integration
description: Integrates Chariot with Burp Suite DAST via GraphQL API. Use when implementing Burp scan workflows, processing scan results, or managing site provisioning.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Burp DAST Integration

## When to Use This Skill

Use this skill when:

- Implementing features that interact with Burp Suite DAST
- Creating or managing security scan workflows
- Processing Burp scan results and findings
- Provisioning sites, folders, or schedules in Burp Enterprise
- Debugging Burp GraphQL API integration issues
- Converting Burp issues to Chariot risk models

**Symptoms this skill addresses:**

- Incorrect GraphQL query/mutation structure for Burp API
- Missing Chariot headers or authentication patterns
- Confusion between site IDs, schedule IDs, and scan IDs
- Improper async scan monitoring patterns
- Inconsistent error handling in Burp operations

## Quick Start

```go
// Initialize client from AWS credentials
client, err := burp.NewBurpEnterpriseClientFromAWS(aws)

// Provision a site with Chariot headers
wa, err := client.EnsureSite(model.WebApplication{
    Username:   "user@example.com",
    PrimaryURL: "https://example.com",
})

// Create on-demand scan
scheduleID, err := client.CreateOnDemandSiteSchedule(
    wa.BurpSiteID,
    burp.PRAETORIAN_BALANCED_CONFIG,
)

// Monitor scan progress
scanResp, err := client.GetScanFromScheduleItem(scheduleID)
summary, err := client.GetScanSummary(scanResp.Scans[0].ID)

// Process results when complete
if summary.Status == burp.SCAN_SUCCEEDED {
    entities, err := client.GetEntities(summary.ID)
}
```

## Table of Contents

This skill is organized into detailed reference documents. Read them as needed:

### Core Concepts

- **[Burp GraphQL Schema](references/graphql-schema.md)** - Complete schema with queries, mutations, types
- **[Client Architecture](references/client-architecture.md)** - BurpEnterpriseClient structure and patterns
- **[Entity Relationships](references/entity-relationships.md)** - Folders, sites, schedules, scans, issues

### Integration Patterns

- **[Site Provisioning Workflow](references/site-provisioning.md)** - EnsureSite pattern, headers, configurations
- **[Scan Lifecycle Management](references/scan-lifecycle.md)** - Schedule types, monitoring, cancellation
- **[Result Processing](references/result-processing.md)** - Issue conversion, scanned items, Tabularium models

### Advanced Topics

- **[Error Handling](references/error-handling.md)** - GraphQL errors, validation, retry patterns
- **[Testing Patterns](references/testing.md)** - Mock transport, unit testing GraphQL operations
- **[Performance Optimization](references/performance.md)** - Caching, pagination, batch operations

## Core Workflow

### 1. Client Initialization

```go
// From AWS credential broker (production pattern)
client, err := burp.NewBurpEnterpriseClientFromAWS(aws)

// Direct initialization (testing/development)
client := burp.NewBurpEnterpriseClient(httpClient, token, baseURL)
```

See [Client Architecture](references/client-architecture.md) for initialization patterns.

### 2. Site Provisioning

The `EnsureSite` helper orchestrates folder/site/schedule creation:

```go
wa, err := client.EnsureSite(model.WebApplication{
    Username:   user.Email,
    PrimaryURL: "https://example.com",
    // Optionally set BurpFolderID, BurpSiteID, BurpScheduleID
    // if you already have them cached
})
```

**What EnsureSite does:**

1. Creates folder for username if needed (idempotent)
2. Creates site in folder if needed (adds Chariot headers automatically)
3. Creates daily schedule for seeds (recurring midnight scans)

See [Site Provisioning Workflow](references/site-provisioning.md) for detailed patterns.

### 3. Scan Execution

```go
// One-time on-demand scan
scheduleID, err := client.CreateOnDemandSiteSchedule(
    wa.BurpSiteID,
    configID, // e.g., burp.PRAETORIAN_BALANCED_CONFIG
)

// Recurring daily scan (for seeds)
scheduleID, err := client.CreateDailySiteSchedule(
    wa.BurpSiteID,
    configID,
    labelSuffix, // appears in Burp UI
)
```

See [Scan Lifecycle Management](references/scan-lifecycle.md) for monitoring patterns.

### 4. Result Processing

```go
// Get scan summary
summary, err := client.GetScanSummary(scanID)

// Check completion
if summary.Status == burp.SCAN_SUCCEEDED {
    // Convert Burp entities to Tabularium models
    entities, err := client.GetEntities(scanID)

    // entities.Risks contains model.Risk objects
    // entities.Attributes contains Asset metadata
}
```

See [Result Processing](references/result-processing.md) for conversion patterns.

## Best Practices

**Site Management:**

- ✅ Use `EnsureSite` for idempotent provisioning
- ✅ Cache `BurpFolderID`, `BurpSiteID`, `BurpScheduleID` on `WebApplication` model
- ✅ Include Chariot headers automatically (handled by client)
- ❌ Don't create sites manually - use helper methods

**Scan Lifecycle:**

- ✅ Use `CreateOnDemandSiteSchedule` for ad-hoc scans
- ✅ Use `CreateDailySiteSchedule` only for seeds (recurring)
- ✅ Poll with `GetScanFromScheduleItem` → `GetScanSummary`
- ❌ Don't confuse schedule IDs with scan IDs
- ❌ Don't poll scan status faster than every 30 seconds

**Error Handling:**

- ✅ Wrap all errors with context: `fmt.Errorf("operation failed: %w", err)`
- ✅ Check for empty IDs in GraphQL responses
- ✅ Validate scan configurations before creating schedules
- ❌ Don't ignore validation errors
- ❌ Don't retry indefinitely without backoff

**Testing:**

- ✅ Use `burp_client_test.go` mock transport pattern
- ✅ Test GraphQL mutations without real Burp connectivity
- ✅ Verify all error paths
- ❌ Don't test against production Burp instances

## Critical Rules

### 1. Schedule vs Scan ID Management

**Schedule items are NOT scans** - they represent the configuration:

```go
// Creating a schedule item returns a schedule ID
scheduleID, _ := client.CreateOnDemandSiteSchedule(siteID, configID)

// You must fetch the scan ID from the schedule
scanResp, _ := client.GetScanFromScheduleItem(scheduleID)
scanID := scanResp.Scans[0].ID

// Now you can get scan details
summary, _ := client.GetScanSummary(scanID)
```

### 2. Chariot Header Injection

All sites created by Chariot **must** include these headers:

```go
// Automatically added by EnsureSite / CreateSiteInFolder
{
    "name":  "Chariot",
    "value": format.Hash(username), // MD5 hash identifier
},
{
    "name":  "User-Agent",
    "value": format.Useragent(username), // Chariot-branded UA
}
```

**Why:** These headers identify Chariot scans in Burp logs and prevent attribution issues.

### 3. GraphQL Query Structure

All GraphQL operations follow this pattern:

```go
query := `
    query OperationName($varName: Type!) {
        field_name(arg: $varName) {
            nested_field
        }
    }
`

variables := map[string]any{
    "varName": value,
}

result, err := graphql.Graphql[ResponseType](
    client.HTTPClient,
    client.graphqlURL(),
    query,
    variables,
    client.headers()...,
)
```

**Never** build queries with string interpolation - always use GraphQL variables.

### 4. API Definition Handling

For web services (API endpoints), use API definitions instead of start URLs:

```go
if wa.IsWebService() {
    input["api_definitions"] = wa.ApiDefinitionContent.ToAPIDefinitionArray()
} else {
    input["scope_v2"] = map[string]any{
        "start_urls": []string{wa.PrimaryURL},
    }
}
```

See [Site Provisioning Workflow](references/site-provisioning.md) for API definition patterns.

## Troubleshooting

### "Failed to create site (Burp DAST API error)"

**Cause:** GraphQL mutation returned empty ID in response.

**Solution:**

1. Check GraphQL query syntax (variables, types)
2. Verify API token has correct permissions
3. Check Burp Enterprise logs for validation errors
4. Ensure site doesn't already exist in different folder

### "Failed to validate scan configuration"

**Cause:** Config ID doesn't exist in Burp Enterprise.

**Solution:**

```go
configs, _ := client.GetScanConfigurations()
// Find your config in the list, use its ID
```

Use `burp.PRAETORIAN_BALANCED_CONFIG` constant for default config.

### "Scan ID not found"

**Cause:** Using schedule ID instead of scan ID.

**Solution:**

```go
// Get scan ID from schedule first
scanResp, _ := client.GetScanFromScheduleItem(scheduleID)
scanID := scanResp.Scans[0].ID
```

### "Context deadline exceeded"

**Cause:** Long-running GraphQL operation (e.g., parsing large API definitions).

**Solution:** Use websocket subscriptions for async operations:

```go
// api_definitions.go uses websockets for fetch-and-parse
result, err := client.ParseAPIDefinitionFromURL(ctx, url)
```

## Related Skills

- **[go-errgroup-concurrency](./../go-errgroup-concurrency/SKILL.md)** - Parallel scan processing
- **[aws-cognito](./../aws-cognito/SKILL.md)** - Credential management patterns
- **[backend-tester](./../../testing/integration/SKILL.md)** - Testing Burp integration

## Architecture Context

**File organization in `modules/chariot/backend/pkg/lib/burp/`:**

- `burp.go` - Client initialization, tree/folder/site CRUD
- `schedule.go` - Schedule creation, cancellation
- `scans.go` - Scan querying and monitoring
- `issues.go`, `convert.go` - Result processing and model conversion
- `api_definitions.go` - API specification parsing
- `authentication.go` - Credential handling (future feature)
- `burp_client_test.go` - Mock transport for unit testing

**Integration points:**

- Tabularium models: `model.WebApplication`, `model.Risk`, `model.Asset`
- AWS credential broker: `model.BurpSuiteInternalCredential`
- GraphQL helper: `github.com/praetorian-inc/chariot/backend/pkg/lib/graphql`

**Design philosophy:**

- Thin client wrapper - business logic lives in capabilities
- Small, composable functions - no orchestration in library
- Idempotent operations - safe to call repeatedly
- Mock-friendly - test without Burp connectivity
