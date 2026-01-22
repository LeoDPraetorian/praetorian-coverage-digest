# Chariot P0 Integration Patterns for Jira

This reference documents the **mandatory** Chariot-specific patterns that MUST be implemented in all Jira integrations. These patterns are required by the `developing-integrations` skill and validated by `validating-integrations`.

## Overview

Chariot has **P0 (Priority 0) requirements** that all integrations must implement for:

- **Multi-tenancy**: VMFilter ensures data isolation per customer
- **Ownership verification**: CheckAffiliation validates asset ownership
- **Fail-fast validation**: ValidateCredentials prevents wasted execution
- **Safe concurrency**: errgroup with SetLimit() prevents resource exhaustion

**Compliance**: Failure to implement these patterns will block integration deployment.

---

## 1. VMFilter Pattern (REQUIRED)

### Purpose

VMFilter provides **multi-tenancy isolation** by filtering all assets and risks to only those owned by the job's user. This prevents data leakage between customers.

### Implementation

```go
package main

import (
    "context"
    "github.com/praetorian-inc/chariot/pkg/filter"
    "github.com/praetorian-inc/chariot/pkg/model"
)

type JiraIntegration struct {
    Filter *filter.VMFilter
    Job    *model.Job
    client *jira.Client
}

// Initialize in integration setup
func NewJiraIntegration(job *model.Job) *JiraIntegration {
    return &JiraIntegration{
        Filter: filter.NewVMFilter(job.Username), // REQUIRED - creates filter for this job owner
        Job:    job,
        client: jira.NewClient(job.Credentials),
    }
}

// Before sending ANY asset or risk
func (t *JiraIntegration) processIssue(issue jira.Issue) error {
    asset := t.mapIssueToAsset(issue)

    // REQUIRED - filters by job owner, drops assets not owned by this customer
    t.Filter.Asset(&asset)

    t.Job.Send(&asset)
    return nil
}
```

### Critical Rules

1. **Always initialize**: `Filter = filter.NewVMFilter(job.Username)` in integration constructor
2. **Always filter before Send**: Call `t.Filter.Asset(&asset)` or `t.Filter.Risk(&risk)` BEFORE `t.Job.Send()`
3. **Never skip filtering**: Even for "read-only" operations - filter ALL data
4. **Filter applies to**: Assets, Risks, Attributes - everything sent to Chariot

### Validation

```bash
# P0 compliance check - must find VMFilter initialization
grep -r "filter.NewVMFilter" integration/jira/

# Must find Filter.Asset or Filter.Risk before every Send
grep -B2 "Job.Send" integration/jira/ | grep "Filter.Asset\|Filter.Risk"
```

---

## 2. CheckAffiliation Pattern (REQUIRED)

### Purpose

CheckAffiliation **verifies ownership** before processing assets. This prevents:

- Unauthorized access to other customers' Jira issues
- Processing assets that don't belong to the requesting user
- Data leakage through asset updates

### Implementation

```go
// Pattern A: Direct API query for ownership verification
func (t *JiraIntegration) CheckAffiliation(asset model.Asset) (bool, error) {
    issueKey := asset.CloudId // e.g., 'PROJ-123'

    // Query Jira API to verify issue exists and is accessible
    issue, err := t.client.GetIssue(issueKey)
    if err != nil {
        if isNotFoundError(err) {
            // Issue doesn't exist or user doesn't have access - not affiliated
            return false, nil
        }
        // API error - propagate for debugging
        return false, fmt.Errorf("failed to check affiliation for %s: %w", issueKey, err)
    }

    // Issue exists and accessible - affiliated
    return true, nil
}

// Helper to detect 404 errors
func isNotFoundError(err error) bool {
    if apiErr, ok := err.(*jira.APIError); ok {
        return apiErr.StatusCode == 404
    }
    return false
}
```

### Critical Rules

1. **Always query Jira API**: Don't rely on local caches or assumptions
2. **Return false for 404**: If issue doesn't exist, user doesn't own it
3. **Propagate other errors**: API errors (500, 429) should be returned, not silently treated as "not affiliated"
4. **Called by Chariot**: Framework invokes this automatically during asset lifecycle

### Validation

```bash
# P0 compliance check - must implement CheckAffiliation
grep -A10 "func.*CheckAffiliation" integration/jira/

# Must handle 404 separately from other errors
grep -A5 "CheckAffiliation" integration/jira/ | grep "404\|NotFound"
```

---

## 3. ValidateCredentials Pattern (REQUIRED)

### Purpose

ValidateCredentials implements **fail-fast validation** by testing credentials BEFORE executing the integration. This:

- Prevents wasted execution on invalid credentials
- Provides immediate feedback to users
- Reduces API quota consumption from failed operations

### Implementation

```go
func (t *JiraIntegration) Invoke(ctx context.Context) error {
    // MUST be first action - fail fast on bad credentials
    if err := t.ValidateCredentials(ctx); err != nil {
        return fmt.Errorf("invalid Jira credentials: %w", err)
    }

    // Continue with integration logic...
    return t.discoverIssues(ctx)
}

func (t *JiraIntegration) ValidateCredentials(ctx context.Context) error {
    // Use /rest/api/3/myself endpoint to test token validity
    // This is a lightweight endpoint that requires authentication
    user, err := t.client.GetCurrentUser(ctx)
    if err != nil {
        return fmt.Errorf("credential validation failed: %w", err)
    }

    // Optional: Log successful validation for debugging
    log.Infof("Validated Jira credentials for user: %s", user.EmailAddress)

    return nil
}
```

### Endpoint Selection

| Endpoint                 | Cost | Use Case                            |
| ------------------------ | ---- | ----------------------------------- |
| `/rest/api/3/myself`     | Low  | ✅ Recommended - lightweight, fast  |
| `/rest/api/3/serverInfo` | Low  | Alternative - instance metadata     |
| Issue search             | High | ❌ Avoid - expensive for validation |

### Critical Rules

1. **Always validate first**: `ValidateCredentials()` must be the first call in `Invoke()`
2. **Use lightweight endpoints**: Don't waste quota on heavy queries
3. **Return errors immediately**: Don't continue execution if credentials fail
4. **Test with actual API call**: Don't just check if credentials are non-empty

### Validation

```bash
# P0 compliance check - must call ValidateCredentials first in Invoke
grep -A5 "func.*Invoke" integration/jira/ | grep -A3 "ValidateCredentials"

# Must use /myself or /serverInfo endpoint
grep "myself\|serverInfo" integration/jira/
```

---

## 4. errgroup Pagination Safety (REQUIRED)

### Purpose

errgroup with **SetLimit()** provides safe concurrent pagination by:

- Limiting concurrent Jira API calls to prevent rate limit exhaustion
- Propagating errors from any goroutine to stop execution
- Ensuring pagination completes successfully or fails fast

### Implementation

```go
package main

import (
    "context"
    "fmt"
    "golang.org/x/sync/errgroup"
)

const maxPages = 1000 // Safety limit - prevents infinite loops

func (t *JiraIntegration) searchAllIssues(ctx context.Context, jql string) error {
    g := new(errgroup.Group)
    g.SetLimit(10) // REQUIRED - limit concurrent API calls (adjust based on rate limits)

    startAt := 0
    pageCount := 0
    maxResults := 100

    for pageCount < maxPages {
        currentStart := startAt // Capture for goroutine closure

        g.Go(func() error {
            response, err := t.client.Search(ctx, jql, currentStart, maxResults)
            if err != nil {
                return fmt.Errorf("search failed at offset %d: %w", currentStart, err)
            }

            // Process results
            for _, issue := range response.Issues {
                asset := t.mapIssueToAsset(issue)
                t.Filter.Asset(&asset)  // REQUIRED - VMFilter before Send
                t.Job.Send(&asset)
            }

            return nil
        })

        // Check termination BEFORE incrementing
        // This ensures we don't spawn goroutines for empty pages
        if startAt + maxResults >= response.Total {
            break // Termination guarantee
        }

        startAt += maxResults
        pageCount++
    }

    // Safety check - prevent infinite pagination
    if pageCount >= maxPages {
        return fmt.Errorf("pagination safety limit exceeded: %d pages", maxPages)
    }

    // Wait for all goroutines to complete
    // Returns first error encountered, cancels remaining goroutines
    return g.Wait()
}
```

### Critical Rules

1. **Always use SetLimit()**: Never use unbounded errgroup - set limit based on API rate limits
2. **Always have maxPages**: Prevent infinite loops from pagination bugs
3. **Capture loop variables**: Use `currentStart := startAt` before spawning goroutine
4. **Check termination before incrementing**: Prevents spawning goroutines for empty pages
5. **Return errors immediately**: errgroup.Wait() will cancel remaining goroutines on first error

### Rate Limit Considerations

| Jira Edition | Rate Limit          | Recommended SetLimit() |
| ------------ | ------------------- | ---------------------- |
| Cloud        | 65,000 points/hour  | 10-20                  |
| Server       | Varies by instance  | 5-10                   |
| Data Center  | Configured by admin | 10-20                  |

### Validation

```bash
# P0 compliance check - must use errgroup with SetLimit
grep -A20 "errgroup.Group" integration/jira/ | grep "SetLimit"

# Must have maxPages safety limit
grep "maxPages" integration/jira/

# Must check termination before incrementing
grep -B2 "startAt.*maxResults" integration/jira/ | grep "break"
```

---

## 5. Asset Mapping to Chariot

### Purpose

Map Jira issues to Chariot's Asset model with proper field mapping, metadata storage, and status handling.

### Implementation

```go
func (t *JiraIntegration) mapIssueToAsset(issue jira.Issue) model.Asset {
    return model.Asset{
        // DNS field is used as unique identifier in Chariot
        DNS:     fmt.Sprintf("jira:%s", issue.Key), // e.g., "jira:PROJ-123"

        // Human-readable name
        Name:    issue.Fields.Summary,

        // Asset classification
        Class:   "issue",
        Source:  "jira",

        // CloudId stores the Jira issue key for CheckAffiliation
        CloudId: issue.Key,

        // Status mapping
        Status:  model.AssetStatusActive,

        // Store additional Jira fields in metadata
        Metadata: map[string]string{
            "project":    issue.Fields.Project.Key,
            "issueType":  issue.Fields.IssueType.Name,
            "status":     issue.Fields.Status.Name,
            "priority":   issue.Fields.Priority.Name,
            "created":    issue.Fields.Created,
            "updated":    issue.Fields.Updated,
            "assignee":   getAssigneeName(issue.Fields.Assignee),
            "reporter":   getReporterName(issue.Fields.Reporter),
        },
    }
}

// Helper to safely extract user names
func getAssigneeName(user *jira.User) string {
    if user == nil {
        return ""
    }
    return user.DisplayName
}

func getReporterName(user *jira.User) string {
    if user == nil {
        return ""
    }
    return user.DisplayName
}
```

### Field Mapping

| Chariot Field | Jira Source            | Purpose                              |
| ------------- | ---------------------- | ------------------------------------ |
| DNS           | `jira:{issue.Key}`     | Unique identifier (REQUIRED)         |
| Name          | `issue.Fields.Summary` | Human-readable name                  |
| Class         | `"issue"`              | Asset type classification            |
| Source        | `"jira"`               | Integration source                   |
| CloudId       | `issue.Key`            | Used by CheckAffiliation (REQUIRED)  |
| Status        | `AssetStatusActive`    | Asset lifecycle state                |
| Metadata      | Various Jira fields    | Additional context (JSON serialized) |

### Critical Rules

1. **DNS must be unique**: Use `jira:{issue.Key}` format to prevent collisions
2. **CloudId must match issue key**: CheckAffiliation queries by CloudId
3. **Metadata is JSON-serialized**: Only string values allowed
4. **Handle nil pointers**: Jira fields (assignee, reporter) can be nil
5. **Status mapping**: Map Jira status to Chariot lifecycle states

### Validation

```bash
# P0 compliance check - must set DNS with jira: prefix
grep "DNS.*jira:" integration/jira/

# Must set CloudId to issue.Key
grep "CloudId.*issue.Key" integration/jira/

# Must handle nil user fields
grep "getAssigneeName\|getReporterName" integration/jira/
```

---

## Compliance Verification

### Manual Checklist

Before deploying a Jira integration, verify:

- [ ] VMFilter initialized with `filter.NewVMFilter(job.Username)`
- [ ] `Filter.Asset()` called before every `Job.Send()`
- [ ] CheckAffiliation queries Jira API and handles 404 separately
- [ ] ValidateCredentials called first in Invoke()
- [ ] ValidateCredentials uses `/rest/api/3/myself` endpoint
- [ ] errgroup uses `SetLimit()` with appropriate concurrency
- [ ] Pagination has maxPages safety limit
- [ ] Asset.DNS uses `jira:{issue.Key}` format
- [ ] Asset.CloudId set to issue.Key for CheckAffiliation
- [ ] Metadata handles nil Jira fields safely

### Automated Validation

Run the `validating-integrations` skill:

```bash
# Validates all P0 requirements
Read(".claude/skill-library/development/integrations/validating-integrations/SKILL.md")
```

### Common Failures

| Error                              | Cause                     | Fix                                |
| ---------------------------------- | ------------------------- | ---------------------------------- |
| "VMFilter not initialized"         | Missing NewVMFilter()     | Add to integration constructor     |
| "Assets sent without filtering"    | Missing Filter.Asset()    | Call before Job.Send()             |
| "CheckAffiliation not implemented" | Method missing            | Add CheckAffiliation(asset) method |
| "ValidateCredentials not called"   | Missing from Invoke()     | Add as first call in Invoke()      |
| "errgroup without SetLimit"        | Missing concurrency limit | Add g.SetLimit(10)                 |
| "Pagination without maxPages"      | Missing safety limit      | Add maxPages constant and check    |
| "Invalid Asset.DNS format"         | Wrong format              | Use `jira:{issue.Key}` format      |
| "Asset.CloudId not set"            | Missing field             | Set to issue.Key                   |

---

## Related Skills

| Skill                     | Purpose                               | Access Method                                                                                       |
| ------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `developing-integrations` | P0 requirements and patterns (SOURCE) | `Read(".claude/skill-library/development/integrations/developing-integrations/SKILL.md")` (LIBRARY) |
| `validating-integrations` | P0 compliance verification            | `Read(".claude/skill-library/development/integrations/validating-integrations/SKILL.md")` (LIBRARY) |
| `testing-integrations`    | Mock patterns and test coverage       | `Read(".claude/skill-library/development/integrations/testing-integrations/SKILL.md")` (LIBRARY)    |
| `integrating-with-jira`   | Jira API patterns (THIS SKILL)        | `Read(".claude/skill-library/development/integrations/integrating-with-jira/SKILL.md")` (LIBRARY)   |

---

## Changelog

**2026-01-19**: Initial creation - Chariot P0 integration patterns for Jira (VMFilter, CheckAffiliation, ValidateCredentials, errgroup, Asset Mapping)
