---
name: integration-chariot-patterns
description: Use when creating Chariot integrations with external APIs (AWS, GitHub, Qualys, CrowdStrike, etc.) - comprehensive reference covering integration architecture, VMFilter, CheckAffiliation, Tabularium models, 4 pagination strategies (token/page/cursor/SDK), errgroup concurrency patterns, batch processing, and anti-patterns to avoid. Includes code examples from 42 real integrations.
allowed-tools: "Read, Bash, WebFetch"
---

# Chariot Integration Development Patterns

Quick reference for building Chariot integrations with external security APIs.

## Integration Architecture Overview

**Two Components Required**:

1. **Frontend Card**: Settings UI in `modules/chariot/ui/src/hooks/useIntegration.tsx`
2. **Backend Integration**: Go capability in `modules/chariot/backend/pkg/tasks/integrations/`

**Naming Alignment (CRITICAL)**:

```typescript
// Frontend: modules/chariot/ui/src/types.ts
export enum Integration {
  crowdstrike = 'crowdstrike',  // ← Must match backend
}

// Backend: modules/chariot/backend/pkg/tasks/integrations/crowdstrike/crowdstrike.go
func (c *CrowdStrike) Name() string {
  return "crowdstrike"  // ← Must match frontend enum
}
```

## File Location Quick Reference

| Component                | File Path                                                                    | Purpose                                 |
| ------------------------ | ---------------------------------------------------------------------------- | --------------------------------------- |
| **Frontend Card**        | `modules/chariot/ui/src/hooks/useIntegration.tsx`                            | User input fields, labels, validation   |
| **Frontend Type**        | `modules/chariot/ui/src/types.ts`                                            | Integration enum definition             |
| **Backend Integration**  | `modules/chariot/backend/pkg/tasks/integrations/<service>/<service>.go`      | Main capability logic                   |
| **Backend Tests**        | `modules/chariot/backend/pkg/tasks/integrations/<service>/<service>_test.go` | Unit tests                              |
| **Tabularium Interface** | `modules/tabularium/pkg/model/model/capability.go`                           | Capability interface definition         |
| **Tabularium Models**    | `modules/tabularium/pkg/model/model/`                                        | Asset, Risk, CloudResource constructors |

## CRITICAL Integration Requirements

**MANDATORY Components** (agents frequently miss these):

1. **VMFilter**: ALWAYS initialize and use for ALL asset/risk emissions
   - `Filter: filter.NewVMFilter(job.Username)` in struct
   - Call `Filter.Asset(&asset)` before `Job.Send(&asset)`
   - Call `Filter.Risk(&risk)` before `Job.Send(&risk)`

2. **CheckAffiliation**: REQUIRED interface method
   - `CheckAffiliation(model.Asset) (bool, error)`
   - Query external API to verify asset ownership
   - See implementation in crowdstrike.go:L432-450

3. **Frontend Card**: Create Settings UI card
   - File: `modules/chariot/ui/src/hooks/useIntegration.tsx`
   - Add enum to `modules/chariot/ui/src/types.ts`
   - Name MUST match backend `Name()` method

**Verification Checklist** (complete BEFORE claiming done):

- [ ] VMFilter initialized in constructor
- [ ] VMFilter.Asset() called before emitting assets
- [ ] VMFilter.Risk() called before emitting risks
- [ ] CheckAffiliation() method implemented
- [ ] Frontend card added to useIntegration.tsx
- [ ] Frontend enum added to types.ts
- [ ] Enum name == backend Name() method
- [ ] Logo placed in icons/dark/ directory
- [ ] Logo placed in icons/light/ directory
- [ ] Logo filename lowercase matching integration name

## Backend Integration Pattern

### Standard Structure

```go
package integrations

import (
    "github.com/praetorian-inc/chariot/backend/pkg/tasks/base"
    "github.com/praetorian-inc/chariot/backend/pkg/lib/filter"
    "github.com/praetorian-inc/tabularium/pkg/model/model"
)

type ServiceName struct {
    Job    model.Job
    Asset  model.Integration  // Integration, not Asset!
    client *http.Client
    Filter model.Filter       // REQUIRED: VMFilter for consistency
    base.BaseCapability
}

func NewServiceName(job model.Job, asset *model.Integration, opts ...base.Option) model.Capability {
    opts = append(opts, base.WithStatic())  // Static IPs for compliance
    return &ServiceName{
        Job:            job,
        Asset:          *asset,
        Filter:         filter.NewVMFilter(job.Username),  // CRITICAL pattern
        BaseCapability: base.NewBaseCapability(job, opts...),
    }
}

func (task *ServiceName) Name() string { return "servicename" }
func (task *ServiceName) Integration() bool { return true }  // MUST return true

func (task *ServiceName) Match() error {
    if !task.Asset.IsClass("servicename") {
        return fmt.Errorf("expected class 'servicename', got '%s'", task.Asset.Class)
    }
    return nil
}

func (task *ServiceName) ValidateCredentials() error {
    token := task.Job.Secret["token"]
    if token == "" {
        return fmt.Errorf("missing API token")
    }
    // Test API authentication
    return nil
}

func (task *ServiceName) Invoke() error {
    if err := task.ValidateCredentials(); err != nil {
        return err
    }
    // Fetch data, filter with task.Filter, emit assets/risks
    return nil
}

// REQUIRED for asset ownership verification
// This method is part of the Capability interface and MUST be implemented
func (task *ServiceName) CheckAffiliation(asset model.Asset) (bool, error) {
    // Query external API to verify if asset exists in service
    // Example: GET /api/assets/{asset.Name} -> 200 (exists) or 404 (not found)

    resp, err := task.client.Get(fmt.Sprintf("%s/api/assets/%s",
        task.Asset.Value, asset.Name))
    if err != nil {
        return false, fmt.Errorf("checking affiliation: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode == 404 {
        return false, nil  // Asset not found in this service
    }

    if resp.StatusCode != 200 {
        return false, fmt.Errorf("API error: status %d", resp.StatusCode)
    }

    return true, nil  // Asset found and belongs to this integration
}
```

### VMFilter Pattern (MANDATORY)

**Why**: Provides unified filtering mechanism across ALL integrations.

```go
// Initialize in constructor
Filter: filter.NewVMFilter(job.Username)

// Apply to assets before emission
for _, item := range externalData {
    asset := model.NewAsset(item.DNS, item.IP)

    // CRITICAL: Filter asset
    if !task.Filter.Asset(&asset) {
        continue  // Skip filtered assets
    }

    task.Job.Send(&asset)
}

// Apply to risks before emission
risk := model.NewRisk(&asset, "CVE-2024-1234", "Critical")
if !task.Filter.Risk(&risk) {
    continue  // Skip filtered risks
}
task.Job.Send(&risk)
```

**VMFilter Interface**:

```go
type Filter interface {
    Asset(asset *Asset) bool
    Risk(risk *Risk) bool
}
```

## Tabularium Model Mapping

**Decision Tree**: External API Data → Tabularium Model

```
Is this cloud-managed (VM, bucket, function)?
├─ YES → Use CloudResource
│   ├─ AWS → model.NewAWSResource(arn, account, type, props)
│   ├─ Azure → model.NewAzureResource(id, subscription, type, props)
│   └─ GCP → model.NewGCPResource(name, project, type, props)
│
└─ NO → Is this HTTP/HTTPS accessible?
    ├─ YES → model.NewWebApplication(url, name)
    └─ NO → model.NewAsset(dns, ip)
```

### Code Examples with File Paths

**Asset (Network)**: `modules/tabularium/pkg/model/model/asset.go`

```go
// IP + DNS
asset := model.NewAsset("web01.example.com", "192.0.2.1")

// DNS only
asset := model.NewAsset("example.com", "example.com")

// Add port
port := model.NewPort("tcp", 443, &asset)
```

**CloudResource (AWS)**: `modules/tabularium/pkg/model/model/aws_resource.go`

```go
awsResource, err := model.NewAWSResource(
    "arn:aws:s3:::my-bucket",           // ARN
    "123456789012",                      // Account
    model.S3Bucket,                      // Type enum
    map[string]any{
        "tags": map[string]string{"env": "prod"},
    },
)
```

**WebApplication**: `modules/tabularium/pkg/model/model/web_application.go`

```go
webapp := model.NewWebApplication(
    "https://api.example.com",  // Primary URL
    "Example API",              // Name
)
```

**Risk**: `modules/tabularium/pkg/model/model/risk.go`

```go
risk := model.NewRisk(
    &asset,             // Target (Asset, CloudResource, or WebApplication)
    "CVE-2024-1234",    // Name
    "Critical",         // Status
)

// Add definition (human-readable)
definition := model.RiskDefinition{
    Description:    "SQL injection vulnerability",
    Recommendation: "Upgrade to version 2.0",
}
file := risk.Definition(definition)
task.Job.Send(&file)

// Add proof (machine evidence)
proofData := []byte(`{"payload": "' OR 1=1--", "response": "200 OK"}`)
proofFile := risk.Proof(proofData)
task.Job.Send(&proofFile)
```

## CheckAffiliation Pattern

**Purpose**: Verify if asset belongs to this integration's scope.

**Interface** (`modules/tabularium/pkg/model/model/capability.go:L50-52`):

```go
CheckAffiliation(Asset) (bool, error)
```

**Implementation Example** (from `crowdstrike.go`):

```go
func (c *CrowdStrike) CheckAffiliation(asset model.Asset) (bool, error) {
    // Query CrowdStrike API to check if asset exists
    deviceID := asset.Name  // or asset.Value

    resp, err := c.client.Get(fmt.Sprintf("%s/devices/%s", c.base, deviceID))
    if err != nil {
        return false, err
    }

    if resp.StatusCode == 404 {
        return false, nil  // Asset not found in CrowdStrike
    }

    return true, nil  // Asset exists in CrowdStrike
}
```

## Frontend Integration Card

**Location**: `modules/chariot/ui/src/hooks/useIntegration.tsx`

### Logo Requirements (MANDATORY)

**Both Dark and Light Mode Logos Required**:

```
modules/chariot/ui/public/icons/dark/servicename.svg   ← Dark mode logo
modules/chariot/ui/public/icons/light/servicename.svg  ← Light mode logo
```

**Logo Specifications**:

- **Format**: SVG preferred (PNG acceptable)
- **Naming**: Lowercase matching integration name (e.g., `stripe.svg`, `crowdstrike.svg`)
- **Locations**: BOTH `icons/dark/` AND `icons/light/` directories (NOT `logos/`)
- **Reference**: Logo field uses filename only, no path prefix

**Code Example**:

```typescript
export const AllIntegrations: Record<Integration, IntegrationMeta> = {
  servicename: {
    id: Integration.servicename,
    name: "ServiceName",
    logo: "servicename.svg", // References icons/dark/ and icons/light/ automatically
  },
};
```

**Theme Switching**: The UI automatically selects the appropriate logo based on current theme:

- Dark mode → `icons/dark/servicename.svg`
- Light mode → `icons/light/servicename.svg`

### Integration Card Pattern

```typescript
export const AllIntegrations: Record<Integration, IntegrationMeta> = {
  servicename: {
    id: Integration.servicename,
    name: "ServiceName",
    description: "Service description for Settings UI",
    logo: "servicename.svg", // Filename only, no path prefix
    inputs: [
      // Hidden username (webhook pattern)
      {
        name: "username",
        value: Integration.webhook,
        hidden: true,
      },
      // Hidden class value (MUST match backend Name())
      {
        name: "value",
        value: "servicename", // ← MUST match backend
        hidden: true,
      },
      // User-visible API URL input
      {
        label: "API URL",
        value: "",
        placeholder: "https://api.service.com",
        name: "url",
        required: true,
        info: {
          text: "The base URL of your ServiceName instance",
        },
      },
      // API key/token input
      {
        label: "API Key",
        value: "",
        placeholder: "sk_live_...",
        name: "token",
        required: true,
        info: {
          text: "API key from ServiceName dashboard",
        },
      },
    ],
  },
};
```

**CRITICAL**: The `value` input with `name: 'value'` MUST match backend `Name()` method.

## Testing Patterns

**Unit Test Structure** (`<service>_test.go`):

```go
func TestServiceName_Match(t *testing.T) {
    tests := []struct {
        name      string
        asset     model.Integration
        wantMatch bool
    }{
        {
            name:      "matches correct class",
            asset:     model.Integration{Class: "servicename"},
            wantMatch: true,
        },
        {
            name:      "rejects wrong class",
            asset:     model.Integration{Class: "other"},
            wantMatch: false,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            integration := &ServiceName{Asset: tt.asset}
            err := integration.Match()
            if tt.wantMatch {
                require.NoError(t, err)
            } else {
                require.Error(t, err)
            }
        })
    }
}
```

## Common Integration Types

| External Service           | Attack Surface | Credential Type       | Example                                 |
| -------------------------- | -------------- | --------------------- | --------------------------------------- |
| **Cloud Providers**        | `Cloud`        | `AWS`, `Azure`, `GCP` | AWS Security Hub, Azure Security Center |
| **Vulnerability Scanners** | `External`     | `Token`               | Qualys, Tenable, CrowdStrike            |
| **SCM Platforms**          | `SCM`          | `GitHub`, `OAuth`     | GitHub, GitLab, Bitbucket               |
| **SIEM/SOAR**              | `External`     | `Token`               | Splunk, Sentinel, Cortex                |

## Constraints and Requirements

**MANDATORY Implementation (agents frequently forget)**:

1. **VMFilter Initialization** (CRITICAL):

   ```go
   Filter: filter.NewVMFilter(job.Username)  // In struct initialization

   // Before EVERY asset emission:
   if !task.Filter.Asset(&asset) {
       continue  // Skip filtered asset
   }
   task.Job.Send(&asset)

   // Before EVERY risk emission:
   if !task.Filter.Risk(&risk) {
       continue  // Skip filtered risk
   }
   task.Job.Send(&risk)
   ```

2. **CheckAffiliation Implementation** (REQUIRED):
   - MUST implement `CheckAffiliation(model.Asset) (bool, error)` from Capability interface
   - Query external API to verify asset ownership
   - Return (true, nil) if asset belongs to this integration
   - Return (false, nil) if asset not found
   - Return (false, error) for API errors

3. **Frontend Integration Card** (REQUIRED for full integration):
   - Add to `modules/chariot/ui/src/hooks/useIntegration.tsx`
   - Add enum to `modules/chariot/ui/src/types.ts`
   - Ensure `name: 'value'` input matches backend `Name()` method

**File Organization**:

- Keep backend integration files < 400 lines
- Split large integrations: `<service>_client.go`, `<service>_types.go`, `<service>_transform.go`

**Naming**:

- Frontend enum name = Backend `Name()` = Integration class
- Use lowercase for all three

**Required Interface Methods**:

- `Integration() bool` returning `true`
- `ValidateCredentials() error`
- `CheckAffiliation(Asset) (bool, error)` ← MANDATORY, frequently forgotten
- `Match() error`
- `Invoke() error`

## Reference Files

**Capability Interface**: `modules/tabularium/pkg/model/model/capability.go:L19-77`

**Example Integrations**:

- **CrowdStrike**: `modules/chariot/backend/pkg/tasks/integrations/crowdstrike/crowdstrike.go` - Complex with pagination, VMFilter, CheckAffiliation
- **GitHub**: `modules/chariot/backend/pkg/tasks/integrations/github/` - OAuth flow, repository scanning
- **Qualys**: `modules/chariot/backend/pkg/tasks/integrations/qualys/qualys.go` - File import, risk creation

**Tabularium Models**:

- **Asset**: `modules/tabularium/pkg/model/model/asset.go:L17-50`
- **AWS**: `modules/tabularium/pkg/model/model/aws_resource.go:L29-59`
- **Azure**: `modules/tabularium/pkg/model/model/azure_resource.go:L23-53`
- **GCP**: `modules/tabularium/pkg/model/model/gcp_resource.go:L23-53`
- **WebApp**: `modules/tabularium/pkg/model/model/web_application.go:L19-30`
- **Risk**: `modules/tabularium/pkg/model/model/risk.go:L30-60`

## Pagination Patterns

External APIs use different pagination strategies. Chariot integrations implement 4 distinct patterns:

### Pattern 1: Token-Based Pagination (Next URL)

Used by: **Qualys**, **Xpanse**

The API returns a "next" URL or token in the response body. Continue fetching until no next token.

```go
type TokenPaginator struct {
    Base    string
    Next    string   // Populated from response
    Params  string
    Headers []string
}

func (p *TokenPaginator) page(client *web.HTTPClient, route string) (Response, error) {
    // Use Next URL if available, otherwise construct from base
    target := fmt.Sprintf("%s/%s?%s", p.Base, route, p.Params)
    if p.Next != "" {
        target = p.Next
    }

    resp, err := web.Request[Response](client, "GET", target, nil, p.Headers...)
    if err != nil {
        return Response{}, err
    }

    // Reset and check for next page in response
    p.Next = ""
    if resp.Body.NextURL != "" {
        p.Next = resp.Body.NextURL
    }

    return resp.Body, nil
}

// Usage
func (task *Integration) fetchAll() error {
    paginator := TokenPaginator{Base: task.base, Params: "limit=100", Headers: task.headers}

    for {
        response, err := paginator.page(task.GetClient(), "assets")
        if err != nil {
            return err
        }

        for _, item := range response.Items {
            task.processItem(item)
        }

        // Exit when no more pages
        if paginator.Next == "" {
            break
        }
    }
    return nil
}
```

**Qualys-Specific Pattern** (XML with Warning code):

```go
// Qualys uses Warning.Code == "1980" to indicate more data
resp, err := web.RequestXML[QualysResponse](client, "GET", target, nil, headers...)
p.Next = ""
if resp.Body.Warning.Code == "1980" {
    p.Next = resp.Body.Warning.URL
}
```

### Pattern 2: Page-Based Pagination (Offset + Limit)

Used by: **InsightVM**, **Nessus**, **Tenable**, **Burp Suite**

The API accepts `page` and `size` (or `limit`) parameters. Increment page until total pages reached.

```go
type PagePaginator[T any] struct {
    Base    string
    Headers []string
    Size    int  // Items per page (typically 100-500)
}

type PagedResponse[T any] struct {
    Resources []T `json:"resources"`
    Page      struct {
        Number int `json:"number"`
        Size   int `json:"size"`
        Total  int `json:"totalPages"`
    } `json:"page"`
}

func (p *PagePaginator[T]) foreach(client *web.HTTPClient, route string, fn func(T)) error {
    page := 0

    for {
        target := fmt.Sprintf("%s/%s?page=%d&size=%d", p.Base, route, page, p.Size)
        result, err := web.Request[PagedResponse[T]](client, "GET", target, nil, p.Headers...)
        if err != nil {
            return err
        }

        for _, item := range result.Body.Resources {
            fn(item)
        }

        page++
        if page >= result.Body.Page.Total {
            break
        }
    }
    return nil
}

// Usage
paginator := PagePaginator[Asset]{Base: task.base, Headers: task.headers, Size: 500}
err := paginator.foreach(task.GetClient(), "assets", func(asset Asset) {
    task.processAsset(asset)
})
```

### Pattern 3: Cursor-Based Pagination (After Token)

Used by: **CrowdStrike**, **Microsoft Defender**

The API returns a cursor/marker. Pass it as `after` parameter for next page.

```go
type CursorPaginator struct {
    Base    string
    After   string  // Cursor for next page
    Headers []string
    Limit   int
}

type CursorResponse struct {
    Resources []string `json:"resources"`
    Meta      struct {
        Pagination struct {
            After string `json:"after"`
            Total int    `json:"total"`
        } `json:"pagination"`
    } `json:"meta"`
}

func (p *CursorPaginator) fetch(client *web.HTTPClient, route string) ([]string, error) {
    target := fmt.Sprintf("%s/%s?limit=%d", p.Base, route, p.Limit)
    if p.After != "" {
        target = fmt.Sprintf("%s&after=%s", target, p.After)
    }

    resp, err := web.Request[CursorResponse](client, "GET", target, nil, p.Headers...)
    if err != nil {
        return nil, err
    }

    // Update cursor for next iteration
    p.After = resp.Body.Meta.Pagination.After

    return resp.Body.Resources, nil
}

// Usage
func (task *CrowdStrike) fetchDeviceIDs() ([]string, error) {
    var allIDs []string
    paginator := CursorPaginator{Base: task.base, Headers: task.headers, Limit: 5000}

    for {
        ids, err := paginator.fetch(task.GetClient(), "devices/queries/devices/v1")
        if err != nil {
            return nil, err
        }

        allIDs = append(allIDs, ids...)

        // Exit when cursor is empty
        if paginator.After == "" {
            break
        }
    }
    return allIDs, nil
}
```

### Pattern 4: SDK-Based Pagination (Library Handles It)

Used by: **GitHub**, **GitLab**, **Okta**

When using official SDKs, leverage their built-in pagination.

```go
// GitHub SDK (go-github)
func (task *GitHub) fetchRepos(org string) ([]*github.Repository, error) {
    var allRepos []*github.Repository
    opts := &github.RepositoryListByOrgOptions{
        ListOptions: github.ListOptions{PerPage: 100},
    }

    for {
        repos, resp, err := task.client.Repositories.ListByOrg(ctx, org, opts)
        if err != nil {
            return nil, err
        }

        allRepos = append(allRepos, repos...)

        if resp.NextPage == 0 {
            break
        }
        opts.Page = resp.NextPage
    }
    return allRepos, nil
}

// Okta SDK
func (task *Okta) fetchApps() ([]okta.Application, error) {
    var allApps []okta.Application
    apps, resp, err := task.client.ApplicationAPI.ListApplications(ctx).Execute()
    if err != nil {
        return nil, err
    }

    allApps = append(allApps, apps...)

    for resp.HasNextPage() {
        var nextApps []okta.Application
        resp, err = resp.Next(&nextApps)
        if err != nil {
            break
        }
        allApps = append(allApps, nextApps...)
    }
    return allApps, nil
}
```

### Pagination Selection Guide

| API Type                   | Pattern      | Example                  |
| -------------------------- | ------------ | ------------------------ |
| Returns `next_url` in body | Token-based  | Qualys, Xpanse           |
| Returns `page.total` count | Page-based   | InsightVM, Nessus        |
| Returns `after` cursor     | Cursor-based | CrowdStrike, MS Defender |
| Official SDK available     | SDK-based    | GitHub, GitLab, Okta     |

## Concurrency with errgroup

13+ integrations use `errgroup` for parallel processing. This pattern processes items concurrently with a configurable limit.

### Standard errgroup Pattern

```go
import "golang.org/x/sync/errgroup"

func (task *Integration) processItems(items []Item) error {
    g := errgroup.Group{}
    g.SetLimit(10)  // Max 10 concurrent goroutines

    for _, item := range items {
        item := item  // CRITICAL: Capture loop variable
        g.Go(func() error {
            return task.processItem(item)
        })
    }

    return g.Wait()  // Blocks until all complete, returns first error
}
```

### errgroup with Shared State (Thread-Safe)

When collecting results, use channels or mutexes:

```go
func (task *Integration) fetchDetails(ids []string) ([]Detail, error) {
    g := errgroup.Group{}
    g.SetLimit(10)

    // Thread-safe collection via channel
    results := make(chan Detail, len(ids))

    for _, id := range ids {
        id := id  // Capture loop variable
        g.Go(func() error {
            detail, err := task.fetchDetail(id)
            if err != nil {
                return err  // Or log and continue: slog.Warn(...); return nil
            }
            results <- detail
            return nil
        })
    }

    // Wait for completion, then close channel
    err := g.Wait()
    close(results)

    // Collect results
    var details []Detail
    for detail := range results {
        details = append(details, detail)
    }

    return details, err
}
```

### errgroup with Continue-on-Error

For non-critical items, log errors but continue processing:

```go
func (task *Integration) processAllAssets(assets []Asset) error {
    g := errgroup.Group{}
    g.SetLimit(10)

    var processedCount int64

    for _, asset := range assets {
        asset := asset
        g.Go(func() error {
            if err := task.processAsset(asset); err != nil {
                // Log but don't fail the batch
                slog.Warn("failed to process asset",
                    "asset", asset.Name,
                    "error", err,
                )
                return nil  // Continue with other assets
            }
            atomic.AddInt64(&processedCount, 1)
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return err
    }

    slog.Info("processing complete", "processed", processedCount, "total", len(assets))
    return nil
}
```

### Concurrency Limits by Integration Type

| Integration Type                            | Recommended Limit | Rationale           |
| ------------------------------------------- | ----------------- | ------------------- |
| **High-volume APIs** (CrowdStrike, Tenable) | 10                | API rate limits     |
| **Cloud Providers** (AWS, Azure, GCP)       | 10-20             | Regional throttling |
| **SCM Platforms** (GitHub, GitLab)          | 10                | API rate limits     |
| **Identity Providers** (Okta)               | 100               | Higher rate limits  |
| **File Processing** (Nessus Import)         | 10                | I/O bound           |

### CRITICAL: Loop Variable Capture

**Always capture loop variables** when using goroutines:

```go
// WRONG - All goroutines see final value of `item`
for _, item := range items {
    g.Go(func() error {
        return process(item)  // BUG: item is shared!
    })
}

// CORRECT - Each goroutine gets its own copy
for _, item := range items {
    item := item  // Shadow the variable
    g.Go(func() error {
        return process(item)  // Safe: item is captured
    })
}
```

## Batch Processing Pattern

8 integrations batch IDs when APIs have limits on query size.

### Standard Batch Pattern

```go
// Generic batch function
func batch[T any](items []T, size int) [][]T {
    batches := make([][]T, 0, (len(items)+size-1)/size)

    for size < len(items) {
        items, batches = items[size:], append(batches, items[:size:size])
    }
    batches = append(batches, items)

    return batches
}

// Usage: Qualys batches host IDs (max 100 per request)
func (task *Qualys) fetchAssets(hostIDs []string) error {
    batches := batch(hostIDs, 100)

    for _, batch := range batches {
        params := fmt.Sprintf("ids=%s", strings.Join(batch, ","))
        // Fetch this batch
        if err := task.fetchBatch(params); err != nil {
            return err
        }
    }
    return nil
}
```

### Batch with Concurrent Processing

Combine batching with errgroup for parallel batch processing:

```go
func (task *CrowdStrike) fetchDeviceDetails(deviceIDs []string) error {
    batches := batch(deviceIDs, 100)  // CrowdStrike accepts 100 IDs per request

    g := errgroup.Group{}
    g.SetLimit(5)  // Process 5 batches concurrently

    for _, batch := range batches {
        batch := batch
        g.Go(func() error {
            return task.fetchBatchDetails(batch)
        })
    }

    return g.Wait()
}
```

## Integration Anti-Patterns

Avoid these common mistakes found across 42 integrations:

### Anti-Pattern 1: Ignored JSON Errors

```go
// WRONG - Silent failure
appBytes, _ := json.Marshal(app)  // Error ignored!

// CORRECT - Handle marshaling errors
appBytes, err := json.Marshal(app)
if err != nil {
    return fmt.Errorf("failed to marshal app: %w", err)
}
```

### Anti-Pattern 2: No Pagination Limit

```go
// WRONG - Potential infinite loop
for {
    resp, _ := fetchPage(page)
    page++
    if resp.Next == "" {
        break
    }
}

// CORRECT - Add safety limit
const maxPages = 1000
for page := 0; page < maxPages; page++ {
    resp, err := fetchPage(page)
    if err != nil {
        return err
    }
    if resp.Next == "" {
        break
    }
}
if page >= maxPages {
    slog.Warn("pagination limit reached", "maxPages", maxPages)
}
```

### Anti-Pattern 3: Missing Timeouts

```go
// WRONG - No timeout, can hang forever
client := &http.Client{}

// CORRECT - Always set timeouts
client := &http.Client{
    Timeout: 30 * time.Second,
}

// Or use context with timeout
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()
req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
```

### Anti-Pattern 4: Silent Batch Failures

```go
// WRONG - Errors logged but batch continues silently
for _, item := range items {
    if err := process(item); err != nil {
        slog.Error("failed", "error", err)
        continue  // No tracking of failures!
    }
}

// CORRECT - Track failure count
var failCount int
for _, item := range items {
    if err := process(item); err != nil {
        slog.Error("failed", "item", item.ID, "error", err)
        failCount++
        continue
    }
}
if failCount > 0 {
    slog.Warn("batch completed with errors", "failed", failCount, "total", len(items))
}
```

### Anti-Pattern 5: Oversized Files

```go
// WRONG - 900+ line integration file
// wiz.go: 913 lines - too large to maintain

// CORRECT - Split by concern
// wiz.go: Main integration logic (~200 lines)
// wiz_client.go: API client and auth (~150 lines)
// wiz_types.go: Response types and models (~100 lines)
// wiz_transform.go: Data transformation (~150 lines)
```

**File Size Guidelines:**

- Integration files: < 400 lines
- Split when > 400 lines into: `_client.go`, `_types.go`, `_transform.go`

### Anti-Pattern 6: Hardcoded Limits

```go
// WRONG - Hardcoded, not configurable
g.SetLimit(10)
pageSize := 100

// BETTER - Use constants at package level
const (
    DefaultConcurrency = 10
    DefaultPageSize    = 100
)

// BEST - Configurable via options
type IntegrationOptions struct {
    Concurrency int
    PageSize    int
}

func WithConcurrency(n int) Option {
    return func(o *IntegrationOptions) {
        o.Concurrency = n
    }
}
```

### Anti-Pattern 7: No Rate Limiting

```go
// WRONG - Hammers API with no throttling
for _, id := range ids {
    resp, _ := client.Get(fmt.Sprintf("/api/%s", id))
}

// CORRECT - Add rate limiting
import "golang.org/x/time/rate"

limiter := rate.NewLimiter(rate.Limit(10), 1)  // 10 requests/second

for _, id := range ids {
    if err := limiter.Wait(ctx); err != nil {
        return err
    }
    resp, _ := client.Get(fmt.Sprintf("/api/%s", id))
}
```

### Integration Quality Checklist

Before submitting an integration PR, verify:

- [ ] **Pagination**: Implemented with safety limit (max pages)
- [ ] **Concurrency**: errgroup with appropriate SetLimit (typically 10)
- [ ] **Loop Variables**: All goroutine loop variables captured
- [ ] **Timeouts**: HTTP client has timeout configured
- [ ] **Error Handling**: JSON/XML parsing errors handled, not ignored
- [ ] **Batch Tracking**: Failure counts tracked and logged
- [ ] **File Size**: Main file < 400 lines, split if larger
- [ ] **Rate Limiting**: Implemented if API has rate limits
