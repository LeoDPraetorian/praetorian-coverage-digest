# Site Provisioning Workflow

Complete guide to provisioning sites in Burp Enterprise with Chariot patterns.

## Overview

Site provisioning ensures:
1. **Folder exists** for username (multi-tenant organization)
2. **Site exists** in folder with proper configuration
3. **Chariot headers** injected for attribution
4. **Daily schedule** created for seeds only

## The EnsureSite Pattern

**Purpose:** Idempotent site provisioning - safe to call repeatedly.

```go
func (c *BurpEnterpriseClient) EnsureSite(
    wa model.WebApplication,
) (model.WebApplication, error) {
    // 1. Ensure folder exists
    wa, err := c.EnsureFolder(wa)
    if err != nil {
        return wa, err
    }

    // 2. Ensure site exists
    wa, err = c.EnsureSiteExists(wa)
    if err != nil {
        return wa, err
    }

    // 3. Ensure schedule exists (seeds only)
    wa, err = c.EnsureSiteSchedule(wa)
    if err != nil {
        return wa, err
    }

    // 4. Invalidate tree cache
    c.tree = nil

    return wa, nil
}
```

**Workflow:**
```
Input: WebApplication with Username, PrimaryURL
    ↓
Step 1: EnsureFolder (by username)
    ↓
Step 2: EnsureSiteExists (with headers)
    ↓
Step 3: EnsureSiteSchedule (seeds only)
    ↓
Output: WebApplication with BurpFolderID, BurpSiteID, BurpScheduleID populated
```

---

## Step 1: Ensure Folder

### Folder Naming Convention

```go
func FolderNameFromUsername(username string) string {
    // Convert email to folder name
    // "user@example.com" → "user-example-com"
    return strings.ReplaceAll(username, "@", "-")
}
```

**Why:** One folder per username for multi-tenant organization.

---

### Folder Provisioning Logic

```go
func (c *BurpEnterpriseClient) EnsureFolder(
    wa model.WebApplication,
) (model.WebApplication, error) {
    // Fetch site tree (cached)
    _, err := c.Tree()
    if err != nil {
        return wa, fmt.Errorf("failed to get site tree: %w", err)
    }

    folderName := FolderNameFromUsername(wa.Username)

    // Check if folder already cached on model
    for _, folder := range c.tree.SiteTree.Folders {
        if folder.ID == wa.BurpFolderID {
            return wa, nil // Already exists with correct ID
        }
        if folder.Name == folderName {
            wa.BurpFolderID = folder.ID
            return wa, nil // Found by name, cache ID
        }
    }

    // Create folder if not found
    folderResp, err := c.CreateFolder(folderName)
    if err != nil {
        return wa, fmt.Errorf("failed to create folder '%s': %w", folderName, err)
    }

    wa.BurpFolderID = folderResp.CreateFolder.Folder.ID
    return wa, nil
}
```

**Idempotency:**
1. If `wa.BurpFolderID` is set and valid → return immediately
2. If folder exists with matching name → cache ID and return
3. If folder doesn't exist → create and cache ID

---

### Create Folder Mutation

```go
func (c *BurpEnterpriseClient) CreateFolder(name string) (*CreateFolderResponse, error) {
    mutation := `
        mutation CreateFolder($name: String!) {
            create_folder(input: {name: $name, parent_id: "0"}) {
                folder {
                    id
                    name
                }
            }
        }
    `

    variables := map[string]any{
        "name": name,
    }

    result, err := graphql.Graphql[CreateFolderResponse](
        c.HTTPClient,
        c.graphqlURL(),
        mutation,
        variables,
        c.headers()...,
    )

    if err != nil {
        return nil, fmt.Errorf("failed to create folder: %w", err)
    }

    return result, nil
}
```

**Parameters:**
- `name` - Display name (e.g., "user-example-com")
- `parent_id: "0"` - Always create at root level

---

## Step 2: Ensure Site Exists

### Site Naming Convention

```go
func SiteNameFromURL(primaryURL string) (string, error) {
    u, err := url.Parse(primaryURL)
    if err != nil {
        return "", fmt.Errorf("invalid URL: %w", err)
    }

    // Extract domain
    // "https://api.example.com/v1" → "api.example.com"
    return u.Host, nil
}
```

**Why:** Use domain as site name for clarity in Burp UI.

---

### Site Provisioning Logic

```go
func (c *BurpEnterpriseClient) EnsureSiteExists(
    wa model.WebApplication,
) (model.WebApplication, error) {
    siteName, err := SiteNameFromURL(wa.PrimaryURL)
    if err != nil {
        return wa, fmt.Errorf("failed to get site name: %w", err)
    }

    // Fetch site tree
    if _, err := c.Tree(); err != nil {
        return wa, fmt.Errorf("failed to get site tree: %w", err)
    }

    // Check if site already exists
    for _, site := range c.tree.SiteTree.Sites {
        if site.ParentID != wa.BurpFolderID {
            continue // Skip sites in other folders
        }
        if site.ID == wa.BurpSiteID {
            return wa, nil // Already exists with correct ID
        }
        if site.Name == siteName {
            wa.BurpSiteID = site.ID
            return wa, nil // Found by name, cache ID
        }
    }

    // Create site if not found
    mutation := `
        mutation CreateSite($input: CreateSiteInput!) {
            create_site(input: $input) {
                site {
                    id
                    name
                    parent_id
                }
            }
        }
    `

    input := buildSiteInput(wa, siteName)
    variables := map[string]any{"input": input}

    result, err := graphql.Graphql[CreateSiteResponse](
        c.HTTPClient,
        c.graphqlURL(),
        mutation,
        variables,
        c.headers()...,
    )

    if err != nil {
        return wa, fmt.Errorf("failed to create site: %w", err)
    }

    if result.CreateSite.Site.ID == "" {
        return wa, fmt.Errorf("failed to create site (Burp DAST API error)")
    }

    wa.BurpSiteID = result.CreateSite.Site.ID
    return wa, nil
}
```

---

### Site Input Building

```go
func buildSiteInput(wa model.WebApplication, siteName string) map[string]any {
    input := map[string]any{
        "name": siteName,
        "parent_id": func() string {
            if wa.BurpFolderID != "" {
                return wa.BurpFolderID
            }
            return "0" // Root if no folder
        }(),
    }

    // Configure scan scope based on asset type
    if wa.IsWebService() {
        // API service with OpenAPI/Swagger spec
        input["api_definitions"] = wa.ApiDefinitionContent.ToAPIDefinitionArray()
    } else {
        // Traditional web application
        input["scope_v2"] = map[string]any{
            "start_urls":       []string{wa.PrimaryURL},
            "protocol_options": "USE_HTTP_AND_HTTPS",
        }
    }

    // CRITICAL: Add Chariot identification headers
    input["settings"] = map[string]any{
        "request_headers": []map[string]any{
            {
                "name":         "Chariot",
                "value":        format.Hash(wa.Username),
                "scope_prefix": "",
            },
            {
                "name":         "User-Agent",
                "value":        format.Useragent(wa.Username),
                "scope_prefix": "",
            },
        },
    }

    return input
}
```

---

### Chariot Headers (CRITICAL)

**Purpose:** Identify Chariot scans in Burp logs and prevent attribution issues.

```go
// Header 1: Chariot identifier
{
    "name":  "Chariot",
    "value": format.Hash(username), // MD5 hash of username
}

// Header 2: User-Agent branding
{
    "name":  "User-Agent",
    "value": format.Useragent(username), // "Chariot/{hash}"
}
```

**Implementation:**
```go
// format.Hash
func Hash(username string) string {
    hash := md5.Sum([]byte(username))
    return hex.EncodeToString(hash[:])
}

// format.Useragent
func Useragent(username string) string {
    return fmt.Sprintf("Chariot/%s", Hash(username))
}
```

**Why Required:**
1. **Attribution** - Identify which Chariot user initiated scan
2. **Debugging** - Trace scans back to source
3. **Rate Limiting** - Burp can apply per-user limits
4. **Security** - Clear indication of authorized testing

**NEVER** create sites without these headers.

---

## Step 3: Ensure Site Schedule (Seeds Only)

### Schedule Logic

```go
func (c *BurpEnterpriseClient) EnsureSiteSchedule(
    wa model.WebApplication,
) (model.WebApplication, error) {
    // Only create schedules for seeds (continuous monitoring)
    if !wa.IsSeed() || wa.BurpScheduleID != "" {
        return wa, nil
    }

    scheduleID, err := c.CreateDailySiteSchedule(
        wa.BurpSiteID,
        PRAETORIAN_BALANCED_CONFIG,
        wa.Username,
    )

    if err != nil {
        return wa, fmt.Errorf("failed to create daily site schedule: %w", err)
    }

    wa.BurpScheduleID = scheduleID
    return wa, nil
}
```

**Key Points:**
- Only for seeds (`wa.IsSeed()` returns true)
- Skip if schedule already exists (`wa.BurpScheduleID != ""`)
- Uses daily recurring schedule (midnight UTC)

---

## API Definition Handling

### File-Based API Definitions

```go
// Tabularium model
type FileBasedAPIDefinition struct {
    Filename         string             `json:"filename"`
    Contents         string             `json:"contents"` // YAML/JSON spec
    EnabledEndpoints []EnabledEndpoint  `json:"enabled_endpoints"`
}

// Convert to Burp input format
func (apiDef *FileBasedAPIDefinition) ToAPIDefinitionArray() []map[string]any {
    return []map[string]any{
        {
            "file_based": map[string]any{
                "filename":         apiDef.Filename,
                "contents":         apiDef.Contents,
                "enabled_endpoints": apiDef.EnabledEndpoints,
            },
        },
    }
}
```

**Usage:**
```go
if wa.IsWebService() {
    input["api_definitions"] = wa.ApiDefinitionContent.ToAPIDefinitionArray()
}
```

---

### URL-Based API Definitions

```go
// Tabularium model
type URLBasedAPIDefinition struct {
    URL string `json:"url"` // URL to OpenAPI spec
}

// Convert to Burp input format
func (apiDef *URLBasedAPIDefinition) ToAPIDefinitionArray() []map[string]any {
    return []map[string]any{
        {
            "url_based": map[string]any{
                "url": apiDef.URL,
            },
        },
    }
}
```

**Note:** URL-based definitions are fetched by Burp at scan time.

---

## Complete Usage Example

### Basic Web Application

```go
wa := model.WebApplication{
    Username:   "user@example.com",
    PrimaryURL: "https://example.com",
}

// Provision in Burp
wa, err := client.EnsureSite(wa)
if err != nil {
    return fmt.Errorf("failed to provision site: %w", err)
}

// IDs now populated
fmt.Println("Folder ID:", wa.BurpFolderID)
fmt.Println("Site ID:", wa.BurpSiteID)
fmt.Println("Schedule ID:", wa.BurpScheduleID) // Empty if not seed
```

---

### API Service with OpenAPI Spec

```go
wa := model.WebApplication{
    Username:   "user@example.com",
    PrimaryURL: "https://api.example.com",
    ApiDefinitionContent: &model.FileBasedAPIDefinition{
        Filename: "openapi.yaml",
        Contents: openapiSpec, // Full YAML/JSON content
        EnabledEndpoints: []model.EnabledEndpoint{
            {ID: "get-/users"},
            {ID: "post-/users"},
        },
    },
}

// Provision (will use API definitions instead of scope)
wa, err := client.EnsureSite(wa)
```

---

### Seed with Daily Scanning

```go
wa := model.WebApplication{
    Username:   "user@example.com",
    PrimaryURL: "https://example.com",
    Seed:       true, // Mark as seed
}

// Provision (creates daily schedule)
wa, err := client.EnsureSite(wa)

// Schedule ID populated
fmt.Println("Schedule ID:", wa.BurpScheduleID) // Daily scan configured
```

---

## Error Scenarios

### Folder Already Exists

**Symptom:** Duplicate folder error from Burp API.

**Cause:** Race condition between tree fetch and folder creation.

**Solution:** EnsureFolder checks tree before creating (idempotent).

---

### Site Creation Returns Empty ID

**Symptom:** `result.CreateSite.Site.ID == ""`

**Causes:**
- Invalid scope configuration
- Malformed API definition
- Burp API validation error

**Solution:**
```go
if result.CreateSite.Site.ID == "" {
    return wa, fmt.Errorf("failed to create site (Burp DAST API error)")
}
```

Check Burp Enterprise logs for detailed error.

---

### Tree Cache Stale

**Symptom:** Created folder/site not found in subsequent lookups.

**Cause:** `c.tree` cache not invalidated.

**Solution:** `EnsureSite` invalidates cache at end:
```go
c.tree = nil
```

---

## Best Practices

### ✅ Always Use EnsureSite

```go
// Good: Idempotent, handles all edge cases
wa, err := client.EnsureSite(wa)
```

```go
// Bad: Manual provisioning prone to errors
folderResp, _ := client.CreateFolder(folderName)
siteResp, _ := client.CreateSite(input)
// Missing header injection, schedule creation, error handling
```

---

### ✅ Cache IDs on Model

```go
// Good: Cache IDs to avoid repeated tree lookups
wa.BurpFolderID = folderID
wa.BurpSiteID = siteID
wa.BurpScheduleID = scheduleID
// Persist wa to database
```

---

### ✅ Validate Before Provisioning

```go
// Good: Validate input before expensive operations
if wa.Username == "" {
    return wa, fmt.Errorf("username required")
}

if wa.PrimaryURL == "" {
    return wa, fmt.Errorf("primary URL required")
}

// Parse URL to catch errors early
_, err := url.Parse(wa.PrimaryURL)
if err != nil {
    return wa, fmt.Errorf("invalid URL: %w", err)
}
```

---

## Related References

- [GraphQL Schema](graphql-schema.md) - Site creation mutations
- [Entity Relationships](entity-relationships.md) - Folder/site hierarchy
- [Scan Lifecycle Management](scan-lifecycle.md) - Schedule creation patterns
- [Error Handling](error-handling.md) - Handling provisioning errors
