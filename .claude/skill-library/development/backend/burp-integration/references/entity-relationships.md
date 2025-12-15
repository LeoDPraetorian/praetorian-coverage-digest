# Burp Entity Relationships

Understanding the hierarchy and relationships between Burp entities is critical for correct integration.

## Entity Hierarchy

```
Burp Enterprise
└── Folders (organizational containers)
    └── Sites (scan targets)
        ├── API Definitions (for web services)
        ├── Scope Configuration (for web apps)
        └── Schedule Items (scan configurations)
            └── Scans (execution instances)
                ├── Issues (vulnerability findings)
                └── Scanned Items (discovered endpoints)
```

---

## Folders

**Purpose:** Organize sites by username/account for multi-tenancy.

**Properties:**
```go
type Folder struct {
    ID   string `json:"id"`   // UUID assigned by Burp
    Name string `json:"name"` // Display name
}
```

**Chariot Pattern:**
```go
// One folder per username
folderName := FolderNameFromUsername(username) // e.g., "user-example-com"
```

**Operations:**
- Create: `client.CreateFolder(name)`
- List: `client.Tree()` returns all folders
- No delete operation exposed (orphan sites if deleted)

**Key Relationships:**
- Parent of zero or more sites
- Root folder has ID `"0"`

---

## Sites

**Purpose:** Scan targets (web applications or API services).

**Properties:**
```go
type Site struct {
    ID       string `json:"id"`        // UUID assigned by Burp
    Name     string `json:"name"`      // Display name (e.g., "example.com")
    ParentID string `json:"parent_id"` // Folder ID
}
```

**Chariot Pattern:**
```go
// One site per WebApplication
siteName := SiteNameFromURL(primaryURL) // Extract domain from URL
```

**Configuration Types:**

### Web Application (Scope-based)
```go
input := map[string]any{
    "scope_v2": map[string]any{
        "start_urls":       []string{primaryURL},
        "protocol_options": "USE_HTTP_AND_HTTPS",
    },
}
```

**When to use:** Traditional web applications with HTML/JavaScript.

---

### Web Service (API-based)
```go
input := map[string]any{
    "api_definitions": []map[string]any{
        {
            "file_based": map[string]any{
                "filename":         "openapi.yaml",
                "contents":         specContents,
                "enabled_endpoints": []map[string]string{
                    {"id": "endpoint-id-1"},
                },
            },
        },
    },
}
```

**When to use:** REST/GraphQL APIs with OpenAPI/Swagger specs.

---

**Required Settings:**
```go
// ALWAYS include Chariot headers for attribution
"settings": map[string]any{
    "request_headers": []map[string]any{
        {
            "name":         "Chariot",
            "value":        format.Hash(username), // MD5 hash
            "scope_prefix": "",
        },
        {
            "name":         "User-Agent",
            "value":        format.Useragent(username), // Chariot-branded UA
            "scope_prefix": "",
        },
    },
}
```

**Operations:**
- Create: `client.CreateSiteInFolder()` or `client.EnsureSiteExists()`
- Read: `client.Tree()` returns all sites
- Update: via mutations (not commonly used)
- Delete: `client.DeleteSite(siteID)`

**Key Relationships:**
- Belongs to exactly one folder
- Has zero or more schedule items
- Has zero or more API definitions

---

## Schedule Items

**Purpose:** Define *when* and *how* a site should be scanned.

**Properties:**
```go
type ScheduleItem struct {
    ID    string `json:"id"`              // UUID assigned by Burp
    Sites []Site `json:"sites,omitempty"` // Sites included in schedule
}
```

**Critical Distinction:**
- **Schedule Item = Configuration** (when/how to scan)
- **Scan = Execution Instance** (actual running scan)

**Types:**

### One-Time (On-Demand)
```go
scheduleID, err := client.CreateOnDemandSiteSchedule(siteID, configID)
```

**Characteristics:**
- Runs immediately (within ~5 minutes)
- Single execution
- Uses `ON_DEMAND_POOL = "3"` agent pool

**When to use:** Manual scans, capability-triggered scans.

---

### Recurring (Daily)
```go
scheduleID, err := client.CreateDailySiteSchedule(siteID, configID, labelSuffix)
```

**Characteristics:**
- Runs daily at midnight UTC
- RFC 5545 recurrence rule: `FREQ=DAILY;INTERVAL=1`
- Uses `DEFAULT_POOL = "-1"` agent pool

**When to use:** Seeds (continuous monitoring assets).

---

**Scan Configuration:**
```go
// Praetorian's balanced security test profile
const PRAETORIAN_BALANCED_CONFIG = "d8b8e107-ff32-42d8-94c5-ffe4b9800fda"

// Or fetch available configurations
configs, _ := client.GetScanConfigurations()
```

**Operations:**
- Create: `client.CreateScheduleItem()` or helper methods
- Read: `client.GetScanFromScheduleItem(scheduleID)` to get scans
- Delete: `client.CancelScan(scanID)` (cancels active scan, not schedule)

**Key Relationships:**
- References one or more sites (usually one in Chariot)
- References one or more scan configurations
- Produces zero or more scans (executions)

---

## Scans

**Purpose:** Individual execution instances of a schedule.

**Properties:**
```go
type ScanSummary struct {
    ID         string `json:"id"`
    ScanTarget struct {
        Name string `json:"name"` // Site name
        ID   string `json:"id"`   // Site ID
    } `json:"scan_target"`
    EndTime string `json:"end_time"` // RFC3339 or null if running
    Status  string `json:"status"`   // queued, running, succeeded, failed, cancelled
}
```

**Status Lifecycle:**
```
queued → running → succeeded
                 → failed
                 → cancelled
```

**Polling Pattern:**
```go
// 1. Get scan from schedule
scanResp, _ := client.GetScanFromScheduleItem(scheduleID)
scanID := scanResp.Scans[0].ID

// 2. Poll scan status
for {
    summary, _ := client.GetScanSummary(scanID)

    switch summary.Status {
    case burp.SCAN_SUCCEEDED:
        // Process results
        return processResults(scanID)
    case burp.SCAN_FAILED, burp.SCAN_CANCELLED:
        return fmt.Errorf("scan failed: %s", summary.Status)
    default:
        // Still running, wait 30 seconds
        time.Sleep(30 * time.Second)
    }
}
```

**Operations:**
- Read: `client.GetScanSummary(scanID)` for status
- List: `client.GetScanFromScheduleItem(scheduleID)` or `client.ListScansFromTime(beforeTime)`
- Cancel: `client.CancelScan(scanID)`

**Key Relationships:**
- Created by exactly one schedule item
- Produces zero or more issues (findings)
- Produces zero or more scanned items (discovered endpoints)

---

## Issues (Vulnerability Findings)

**Purpose:** Security vulnerabilities discovered during scan.

**Properties:**
```go
type Issue struct {
    IssueType struct {
        Name        string `json:"name"`           // Vulnerability type
        References  string `json:"references_html"` // External references
        Description string `json:"description_html"`
        Remediation string `json:"remediation_html"`
    } `json:"issue_type"`
    SerialNumber string         `json:"serial_number"` // Unique ID within scan
    Confidence   string         `json:"confidence"`    // certain, firm, tentative
    Severity     string         `json:"severity"`      // high, medium, low, info
    Path         string         `json:"path"`          // URL path where found
    Origin       string         `json:"origin"`        // How discovered
    Evidence     []EvidenceItem `json:"evidence"`      // HTTP request/response
}
```

**Severity Levels:**
- `high` - Critical security issues (e.g., SQL injection, XSS)
- `medium` - Important security issues (e.g., weak crypto)
- `low` - Minor security issues (e.g., info disclosure)
- `info` - Informational findings (not vulnerabilities)

**Confidence Levels:**
- `certain` - Confirmed vulnerability (exploit succeeded)
- `firm` - High confidence (strong indicators)
- `tentative` - Low confidence (potential false positive)

**Operations:**
- List: `client.ListIssues(scanID)` for summaries
- Read: `client.GetIssue(scanID, serialNumber)` for details
- Convert: `client.GetEntities(scanID)` for Tabularium models

**Key Relationships:**
- Belongs to exactly one scan
- Converted to `model.Risk` in Chariot platform

---

## Scanned Items (Discovered Endpoints)

**Purpose:** All URLs/endpoints discovered during crawl and audit phases.

**Union Type:**
```go
type ScannedItem struct {
    AuditItem *AuditItem `json:",omitempty"` // Tested for vulnerabilities
    CrawlItem *CrawlItem `json:",omitempty"` // Discovered but not tested
}

type AuditItem struct {
    Host string `json:"host"` // e.g., "example.com"
    Path string `json:"path"` // e.g., "/api/users"
}

type CrawlItem struct {
    Host   string `json:"host"`
    Path   string `json:"path"`
    Status string `json:"status"` // HTTP status code or error
}
```

**Filtering:**
```go
// Filter out-of-scope items
func FilterScannedItems(items []ScannedItem) []ScannedItem {
    var filtered []ScannedItem
    for _, item := range items {
        if item.CrawlItem != nil {
            // Skip out-of-scope or low-value crawl items
            if item.CrawlItem.Status == burp.OUT_OF_SCOPE ||
               item.CrawlItem.Status == burp.LOW_VALUE ||
               item.CrawlItem.Status == burp.CRAWL_LIMIT {
                continue
            }
        }
        filtered = append(filtered, item)
    }
    return filtered
}
```

**Operations:**
- List: `client.ListScannedItems(scanID)`
- Convert: Included in `client.GetEntities(scanID)` as attributes

**Key Relationships:**
- Belongs to exactly one scan
- Converted to `model.Attribute` in Chariot platform

---

## Chariot Model Mapping

### WebApplication → Site

```go
// Chariot model stores Burp IDs for caching
type WebApplication struct {
    // ... other fields
    BurpFolderID   string `json:"burp_folder_id"`
    BurpSiteID     string `json:"burp_site_id"`
    BurpScheduleID string `json:"burp_schedule_id"`
}

// Provisioning pattern
wa, err := client.EnsureSite(wa)
// Now wa.BurpFolderID, wa.BurpSiteID, wa.BurpScheduleID are populated
```

---

### Issue → Risk

```go
type Risk struct {
    Key         string  // Unique identifier
    Name        string  // Issue type name
    Description string  // HTML description from Burp
    Source      string  // "burp"
    Category    string  // Vulnerability category
    Severity    float64 // 0-10 score
    // ... other fields
}

// Conversion
entities, _ := client.GetEntities(scanID)
for _, risk := range entities.Risks {
    // risk.Source == "burp"
    // risk.Name == issue.IssueType.Name
}
```

---

### ScannedItem → Attribute

```go
type Attribute struct {
    Name  string // "url", "endpoint", etc.
    Value string // Full URL
    // ... other fields
}

// Conversion
entities, _ := client.GetEntities(scanID)
for _, attr := range entities.Attributes {
    // attr.Name == "url"
    // attr.Value == full URL from scanned item
}
```

---

## ID Management Best Practices

### Cache IDs on Models

```go
// ✅ GOOD: Cache IDs to avoid repeated tree lookups
wa.BurpFolderID = folderID
wa.BurpSiteID = siteID
wa.BurpScheduleID = scheduleID
// Persist wa to database
```

```go
// ❌ BAD: Lookup IDs every time
tree, _ := client.Tree()
for _, site := range tree.SiteTree.Sites {
    if site.Name == siteName {
        // Expensive tree traversal on every operation
    }
}
```

---

### Distinguish Schedule vs Scan IDs

```go
// ✅ GOOD: Understand the relationship
scheduleID, _ := client.CreateOnDemandSiteSchedule(siteID, configID)
scanResp, _ := client.GetScanFromScheduleItem(scheduleID)
scanID := scanResp.Scans[0].ID

summary, _ := client.GetScanSummary(scanID)
```

```go
// ❌ BAD: Confuse schedule ID with scan ID
scheduleID, _ := client.CreateOnDemandSiteSchedule(siteID, configID)
summary, _ := client.GetScanSummary(scheduleID) // ERROR: schedule ID is not scan ID
```

---

### Validate IDs Before Use

```go
// ✅ GOOD: Check for empty IDs
if wa.BurpSiteID == "" {
    return fmt.Errorf("site not provisioned")
}

// ✅ GOOD: Verify existence
tree, _ := client.Tree()
siteExists := false
for _, site := range tree.SiteTree.Sites {
    if site.ID == wa.BurpSiteID {
        siteExists = true
        break
    }
}
```

---

## Relationship Diagrams

### Site Provisioning Flow

```
Username
    ↓
Create/Find Folder
    ↓
Create/Find Site (with Chariot headers)
    ↓
[Optional] Create Daily Schedule (for seeds only)
```

### Scan Execution Flow

```
Schedule Item Created
    ↓
Scan Queued (agent assigned)
    ↓
Scan Running (testing site)
    ↓
Scan Succeeded
    ↓
Issues + Scanned Items Generated
```

### Result Processing Flow

```
Scan ID
    ↓
GetScanSummary (status check)
    ↓
GetEntities (convert to Chariot models)
    ↓
Risks (vulnerabilities) + Attributes (endpoints)
```

---

## Common Pitfalls

### ❌ Creating Multiple Folders per User

```go
// Wrong: Creates duplicate folders
CreateFolder(username + "-folder-1")
CreateFolder(username + "-folder-2")
```

**Solution:** Use `EnsureFolder()` for idempotent folder creation.

---

### ❌ Forgetting Chariot Headers

```go
// Wrong: Site created without attribution
input := map[string]any{
    "name": siteName,
    "scope_v2": map[string]any{...},
    // Missing settings.request_headers
}
```

**Solution:** Always use `EnsureSiteExists()` which adds headers automatically.

---

### ❌ Polling with Schedule ID

```go
// Wrong: Schedule ID is not scan ID
scheduleID, _ := client.CreateOnDemandSiteSchedule(siteID, configID)
summary, _ := client.GetScanSummary(scheduleID) // ERROR
```

**Solution:** Fetch scan ID first: `GetScanFromScheduleItem(scheduleID)`.

---

### ❌ Processing Incomplete Scans

```go
// Wrong: Process results while scan is still running
summary, _ := client.GetScanSummary(scanID)
entities, _ := client.GetEntities(scanID) // Partial results
```

**Solution:** Wait for `summary.Status == burp.SCAN_SUCCEEDED` before processing.

---

## Related References

- [GraphQL Schema](graphql-schema.md) - API operations for each entity
- [Site Provisioning Workflow](site-provisioning.md) - Folder/site creation patterns
- [Scan Lifecycle Management](scan-lifecycle.md) - Schedule/scan management
- [Result Processing](result-processing.md) - Issue/scanned item conversion
