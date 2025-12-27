# Burp Suite DAST GraphQL Schema Reference

Complete reference for the Burp Enterprise GraphQL API used by Chariot integration.

## Schema Overview

**Base URL Pattern:** `https://{burp-host}/graphql/v1`

**Authentication:** Bearer token in `Authorization` header

**Transport:** HTTP POST for queries/mutations, WebSocket for subscriptions

## Core Query Operations

### Site Management

#### `site_tree`

Returns complete folder/site hierarchy for navigation and site lookup.

```graphql
query GetSiteTree {
  site_tree {
    sites {
      id
      parent_id
      name
    }
    folders {
      id
      name
    }
  }
}
```

**Response Type:**

```go
type Tree struct {
    SiteTree struct {
        Sites []struct {
            ID       string `json:"id"`
            ParentID string `json:"parent_id"`
            Name     string `json:"name"`
        }
        Folders []struct {
            ID   string `json:"id"`
            Name string `json:"name"`
        } `json:"folders"`
    } `json:"site_tree"`
}
```

**Usage:** Called by `client.Tree()` to populate folder/site cache.

---

#### `site(id: ID!)`

Retrieves detailed site configuration including API definitions.

```graphql
query GetSiteApiDefinitions($site_id: ID!) {
  site(id: $site_id) {
    api_definitions {
      id
    }
  }
}
```

**Usage:** Called by `client.GetSiteAPIDefinition()` to fetch definition IDs.

---

### Scan Configuration

#### `scan_configurations`

Lists available scan configurations (security test profiles).

```graphql
query GetScanConfigurations {
  scan_configurations {
    id
    name
  }
}
```

**Response Type:**

```go
type ScanConfigurations struct {
    ScanConfigurations []ScanConfiguration `json:"scan_configurations"`
}

type ScanConfiguration struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}
```

**Usage:** Validate config IDs before creating schedules.

**Common Configs:**

- `PRAETORIAN_BALANCED_CONFIG = "d8b8e107-ff32-42d8-94c5-ffe4b9800fda"` (default)

---

### Scan Monitoring

#### `scan(id: ID!)`

Retrieves individual scan status and metadata.

```graphql
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
```

**Response Type:**

```go
type ScanSummary struct {
    ID         string `json:"id"`
    ScanTarget struct {
        Name string `json:"name"`
        ID   string `json:"id"`
    } `json:"scan_target"`
    EndTime string `json:"end_time"`
    Status  string `json:"status"`
}
```

**Status Values:**

- `"queued"` - Waiting for agent
- `"running"` - Actively scanning
- `"succeeded"` - Completed successfully
- `"failed"` - Error occurred
- `"cancelled"` - Manually stopped

**Usage:** Poll this query to monitor scan progress.

---

#### `scans`

Lists scans with filtering and pagination.

```graphql
query ListScans($offset: Int!, $limit: Int!) {
  scans(offset: $offset, limit: $limit, sort_column: end, sort_order: desc) {
    id
    scan_target {
      id
      name
    }
    end_time
    status
  }
}
```

**Filters (optional):**

- `schedule_item_id: ID!` - Filter by schedule
- `site_id: ID!` - Filter by site
- `status: [ScanStatus!]` - Filter by status

**Pagination:**

- `offset: Int!` - Skip N results
- `limit: Int!` - Return max N results
- `sort_column: ScanSortColumn!` - Sort field (`start`, `end`, etc.)
- `sort_order: SortOrder!` - `asc` or `desc`

**Usage:** Retrieve scans for a schedule item via `GetScanFromScheduleItem()`.

---

### Result Retrieval

#### `scan.issues`

Returns vulnerability findings for a scan.

```graphql
query GetScanIssues($scanId: ID!) {
  scan(id: $scanId) {
    issues {
      serial_number
      severity
      confidence
    }
  }
}
```

**Usage:** Called by `ListIssues()` to get finding summaries.

---

#### `issue(scan_id: ID!, serial_number: ID!)`

Retrieves detailed information for a specific finding.

```graphql
query GetIssue($scanId: ID!, $serialNumber: ID!) {
  issue(scan_id: $scanId, serial_number: $serialNumber) {
    issue_type {
      name
      references_html
      description_html
      remediation_html
    }
    serial_number
    confidence
    severity
    path
    origin
    remediation_html
    description_html
    evidence {
      title
      description_html
      request_segments {
        data_html
        highlight_html
        snip_length
      }
      response_segments {
        data_html
        highlight_html
        snip_length
      }
    }
  }
}
```

**Response Type:**

```go
type Issue struct {
    IssueType struct {
        Name        string `json:"name"`
        References  string `json:"references_html"`
        Description string `json:"description_html"`
        Remediation string `json:"remediation_html"`
    } `json:"issue_type"`
    SerialNumber string         `json:"serial_number"`
    Confidence   string         `json:"confidence"`
    Severity     string         `json:"severity"`
    Path         string         `json:"path"`
    Origin       string         `json:"origin"`
    Remediation  string         `json:"remediation_html"`
    Description  string         `json:"description_html"`
    Evidence     []EvidenceItem `json:"evidence"`
}
```

**Usage:** Called by `GetIssue()` for risk conversion to Chariot models.

---

#### `scan.scanned_items`

Returns all URLs/endpoints discovered during scan.

```graphql
query GetScannedItems($scanId: ID!) {
  scan(id: $scanId) {
    scanned_items {
      ... on AuditItem {
        id
        host
        path
        method
        __typename
      }
      ... on CrawlItem {
        id
        host
        path
        status
        __typename
      }
    }
  }
}
```

**Union Type:** `ScannedItem` = `AuditItem | CrawlItem`

**Response Type:**

```go
type ScannedItem struct {
    AuditItem *AuditItem `json:",omitempty"`
    CrawlItem *CrawlItem `json:",omitempty"`
}

type AuditItem struct {
    Host string `json:"host"`
    Path string `json:"path"`
}

type CrawlItem struct {
    Host   string `json:"host"`
    Path   string `json:"path"`
    Status string `json:"status"`
}
```

**Custom Unmarshaler:** Uses `__typename` field to determine union type.

**Usage:** Asset attribute generation from discovered endpoints.

---

## Core Mutation Operations

### Folder Management

#### `create_folder`

Creates a new organizational folder.

```graphql
mutation CreateFolder($name: String!) {
  create_folder(input: { name: $name, parent_id: "0" }) {
    folder {
      id
      name
    }
  }
}
```

**Input:**

- `name: String!` - Folder display name
- `parent_id: String!` - Parent folder ID (`"0"` = root)

**Usage:** Called by `CreateFolder()` to organize sites by username.

---

### Site Management

#### `create_site`

Creates a new scan target with configuration.

```graphql
mutation CreateSite($input: CreateSiteInput!) {
  create_site(input: $input) {
    site {
      id
      name
      parent_id
    }
  }
}
```

**Input Type:**

```go
input := map[string]any{
    "name":      siteName,
    "parent_id": folderID,

    // For web applications (scope-based)
    "scope_v2": map[string]any{
        "start_urls":       []string{primaryURL},
        "protocol_options": "USE_HTTP_AND_HTTPS",
    },

    // OR for web services (API-based)
    "api_definitions": []map[string]any{
        {
            "file_based": map[string]any{
                "filename": "openapi.yaml",
                "contents": specContents,
                "enabled_endpoints": []map[string]string{
                    {"id": "endpoint-id-1"},
                },
            },
        },
    },

    // Required: Chariot identification headers
    "settings": map[string]any{
        "request_headers": []map[string]any{
            {
                "name":         "Chariot",
                "value":        format.Hash(username),
                "scope_prefix": "",
            },
            {
                "name":         "User-Agent",
                "value":        format.Useragent(username),
                "scope_prefix": "",
            },
        },
    },
}
```

**Critical:** Always include Chariot headers for attribution.

**Usage:** Called by `EnsureSiteExists()` with automatic header injection.

---

### Schedule Management

#### `create_schedule_item`

Creates a scan schedule (one-time or recurring).

```graphql
mutation CreateScheduleItem($siteId: ID!, $configId: ID!) {
  create_schedule_item(input: { site_ids: [$siteId], scan_configuration_ids: [$configId] }) {
    schedule_item {
      id
    }
  }
}
```

**Input:**

- `site_ids: [ID!]!` - List of sites to scan (usually one)
- `scan_configuration_ids: [ID!]!` - Scan configs to apply

**For recurring schedules, add:**

```go
input := map[string]any{
    "site_ids":                 []string{siteID},
    "scan_configuration_ids":   []string{configID},
    "schedule": map[string]any{
        "initial_run_time": time.Now().Add(5 * time.Minute).Format(time.RFC3339),
        "rrule":            "FREQ=DAILY;INTERVAL=1", // RFC 5545 format
    },
}
```

**Usage:**

- `CreateOnDemandSiteSchedule()` - immediate one-time scan
- `CreateDailySiteSchedule()` - recurring midnight scan

---

#### `cancel_scan`

Stops a running scan.

```graphql
mutation CancelScan($scanId: ID!) {
  cancel_scan(input: { id: $scanId }) {
    id
  }
}
```

**Usage:** Called by `CancelScan()` for cleanup/teardown operations.

---

### Tag Management

#### `create_tag`

Creates a new tag and returns its ID for use in `add_tags_to_nodes`.

```graphql
mutation CreateTag($name: String!, $color: TagColor!) {
  create_tag(input: { name: $name, color: $color }) {
    tag {
      id
      name
    }
  }
}
```

**Input:**

- `name: String!` - Human-readable tag name (e.g., "user@example.com")
- `color: TagColor!` - Tag color (use `DARK_BLUE`)

**Response:** Returns tag ID for use in `add_tags_to_nodes`

**CRITICAL:** Tags must be created before they can be added to folders/sites.

---

#### `add_tags_to_nodes`

Adds existing tags (by ID) to folders or sites.

```graphql
mutation AddTagsToNodes($node_ids: [ID!]!, $tag_ids: [ID!]!) {
  add_tags_to_nodes(input: { node_ids: $node_ids, tag_ids: $tag_ids }) {
    successful
  }
}
```

**Input:**

- `node_ids: [ID!]!` - List of folder/site IDs to tag
- `tag_ids: [ID!]!` - List of tag IDs (from `create_tag`)

**CRITICAL:** Must use tag IDs (not tag names). Create tags first with `create_tag`.

**Usage:**

```go
// Step 1: Create tag
tagID, _ := client.CreateTag("user@example.com")

// Step 2: Add to folder
client.AddTagsToFolder(folderID, []string{tagID})
```

---

### API Definition Management

#### `parse_api_definition`

Parses API specification (OpenAPI, SOAP) for endpoint extraction.

```graphql
query ParseApiDefinition($api_definition_contents: String) {
  parse_api_definition(api_definition_contents: $api_definition_contents) {
    ... on ParsedOpenApiDefinition {
      endpoints {
        id
        host
        path
        method
        content_type
        __typename
      }
      authentication_schemes {
        ... on ApiBasicAuthenticationWithoutCredentials {
          type
          label
          __typename
        }
        ... on ApiKeyAuthenticationWithoutCredentials {
          type
          label
          api_key_destination
          parameter_name
          __typename
        }
        ... on ApiBearerTokenAuthenticationWithoutCredentials {
          type
          label
          __typename
        }
        __typename
      }
      __typename
    }
    ... on ParsedSoapDefinition {
      endpoints {
        id
        host
        path
        name
        content_type
        __typename
      }
      __typename
    }
  }
}
```

**Union Type:** `ParsedApiDefinition` = `ParsedOpenApiDefinition | ParsedSoapDefinition`

**Usage:** Called by `ParseAPIDefinition()` for file-based specs.

---

## Subscription Operations

### Async API Definition Fetching

#### `fetch_and_parse_api_definition_url`

Fetches and parses API specification from URL (async via WebSocket).

```graphql
subscription FetchAndParseApiDefinitionUrl($input: FetchAndParseApiDefinitionUrlInput!) {
  fetch_and_parse_api_definition_url(input: $input) {
    message
    status_code
    parsed_api_definition {
      ... on ParsedOpenApiDefinition {
        endpoints {
          id
          host
          path
          method
          content_type
          __typename
        }
        __typename
      }
    }
  }
}
```

**Input:**

```go
inputMap := map[string]any{
    "url":                defURL,
    "agent_pool_id":      "-1", // Default pool
    "additional_headers": []any{},
    "proxy":              nil,
}
```

**Transport:** WebSocket (`wss://{burp-host}/graphql/v1/subscriptions`)

**Usage:** Called by `ParseAPIDefinitionFromURL()` for URL-based specs.

**Why WebSocket?** Long-running operation that streams progress updates.

---

## Type Reference

### Enumerations

```go
// Scan status values
const (
    SCAN_QUEUED    = "queued"
    SCAN_RUNNING   = "running"
    SCAN_SUCCEEDED = "succeeded"
    SCAN_FAILED    = "failed"
    SCAN_CANCELLED = "cancelled"
)

// Issue severity levels
type Severity string
const (
    SeverityHigh      Severity = "high"
    SeverityMedium    Severity = "medium"
    SeverityLow       Severity = "low"
    SeverityInfo      Severity = "info"
)

// Issue confidence levels
type Confidence string
const (
    ConfidenceCertain Confidence = "certain"
    ConfidenceFirm    Confidence = "firm"
    ConfidenceTentative Confidence = "tentative"
)

// Agent pool assignment
const (
    ON_DEMAND_POOL = "3"  // For on-demand scans
    DEFAULT_POOL   = "-1" // Standard pool
)
```

### Complex Types

#### API Definition Input

```go
// File-based API definition
type FileBasedAPIDefinition struct {
    Filename         string             `json:"filename"`
    Contents         string             `json:"contents"`
    EnabledEndpoints []EnabledEndpoint  `json:"enabled_endpoints"`
}

type EnabledEndpoint struct {
    ID string `json:"id"`
}

// URL-based API definition
type URLBasedAPIDefinition struct {
    URL string `json:"url"`
}

// Model from Tabularium
type APIDefinitionResult struct {
    FileBasedDefinition *FileBasedAPIDefinition `json:"file_based,omitempty"`
    URLBasedDefinition  *URLBasedAPIDefinition  `json:"url_based,omitempty"`
    PrimaryURL          string                  `json:"primary_url"`
}
```

#### Authentication Schemes

```go
type ApiAuthenticationInput struct {
    BasicAuthentication       *ApiBasicAuthenticationInput       `json:"basic_authentication,omitempty"`
    APIKeyAuthentication      *ApiKeyAuthenticationInput         `json:"api_key_authentication,omitempty"`
    BearerTokenAuthentication *ApiBearerTokenAuthenticationInput `json:"bearer_token_authentication,omitempty"`
}

type ApiBasicAuthenticationInput struct {
    Label    string `json:"label"`
    Username string `json:"username,omitempty"`
    Password string `json:"password,omitempty"`
}

type ApiKeyAuthenticationInput struct {
    Label              string                                    `json:"label"`
    APIKeyDestination  model.BurpAPIDestination                  `json:"api_key_destination"`
    ParameterName      string                                    `json:"parameter_name"`
    Key                string                                    `json:"key,omitempty"`
    DynamicTokenConfig *ApiDynamicAuthenticationTokenConfigInput `json:"dynamic_token_config,omitempty"`
}

type ApiBearerTokenAuthenticationInput struct {
    Label              string                                    `json:"label"`
    Token              string                                    `json:"token,omitempty"`
    DynamicTokenConfig *ApiDynamicAuthenticationTokenConfigInput `json:"dynamic_token_config,omitempty"`
}
```

---

## GraphQL Client Pattern

All operations use the shared `graphql.Graphql[T]()` helper:

```go
result, err := graphql.Graphql[ResponseType](
    httpClient,     // *web.HTTPClient
    graphqlURL,     // "https://burp-host/graphql/v1"
    query,          // GraphQL query/mutation string
    variables,      // map[string]any for variables
    headers...,     // Authorization, Content-Type
)
```

**Error Handling:**

```go
if err != nil {
    return nil, fmt.Errorf("failed to {operation}: %w", err)
}

if result.Field.ID == "" {
    return nil, fmt.Errorf("operation returned empty ID (Burp DAST API error)")
}
```

**Header Pattern:**

```go
func (c *BurpEnterpriseClient) headers() []string {
    return []string{
        "Authorization", fmt.Sprintf("Bearer %s", c.Token),
        "Content-Type", "application/json",
    }
}
```

---

## Schema Version Notes

**Current Version:** GraphQL v1 (as of 2024)

**Breaking Changes to Watch:**

- Field name changes (e.g., `site_tree` → `siteTree`)
- Type renames (e.g., `ParsedOpenApiDefinition` → `OpenApiDefinition`)
- Union type modifications

**Compatibility Strategy:**

- All GraphQL queries embedded in client code
- Update all queries simultaneously when schema changes
- Mock transport in `burp_client_test.go` catches breakages early

---

## Official Documentation

**Full GraphQL Schema:** https://portswigger.net/burp/extensibility/dast/graphql-api/

**Query Reference:** https://portswigger.net/burp/extensibility/dast/graphql-api/queries.html

**Mutation Reference:** https://portswigger.net/burp/extensibility/dast/graphql-api/mutations.html

**Subscription Reference:** https://portswigger.net/burp/extensibility/dast/graphql-api/subscriptions.html

---

## Related References

- [Client Architecture](client-architecture.md) - How queries/mutations are executed
- [Entity Relationships](entity-relationships.md) - Understanding folders/sites/scans/issues
- [Error Handling](error-handling.md) - Handling GraphQL errors
