# VMFilter Verification

**Purpose**: Verify that integration correctly filters virtual machine assets to prevent duplicate ingestion.

## Requirements

1. VMFilter MUST be initialized in the integration constructor
2. MUST call `filter.Asset(&asset)` before every `Job.Send()` call
3. MUST skip sending if filter returns true (asset is filtered out)

## Verification Commands

```bash
# Check for VMFilter initialization
grep -n "NewVMFilter\|NewCloudModuleFilter" modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go

# Check for ShouldSend/filter.Asset usage before Job.Send
grep -B5 "\.Job\.Send" modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go | grep -E "Filter|ShouldSend"

# Verify both patterns present
grep -c "NewVMFilter\|filter\.Asset" modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go
# Expected: 2 or more matches
```

## Correct Usage Pattern

```go
// In integration struct (constructor or Invoke initialization)
type Integration struct {
    // ...
    Filter: filter.NewVMFilter(baseCapability.AWS, baseCapability.Collectors)
}

// In enumeration loop - BEFORE sending
for _, asset := range discoveredAssets {
    // Check filter FIRST
    if task.Filter.Asset(&asset) {
        continue  // Skip filtered assets (returns true = filter out)
    }

    // Only send if filter allows
    task.Job.Send(&asset)
}
```

## Filter Semantics (CRITICAL)

**Understanding the boolean return:**

```go
filter.Asset(&asset) == true   // Asset is FILTERED OUT - skip it
filter.Asset(&asset) == false  // Asset is ACCEPTED - send it
```

**Common Mistake**:

```go
// WRONG - Inverted logic
if !task.Filter.Asset(&asset) {
    continue  // This skips ACCEPTED assets!
}
task.Job.Send(&asset)

// RIGHT
if task.Filter.Asset(&asset) {
    continue  // Skip filtered (true = filter out)
}
task.Job.Send(&asset)
```

## Filter Architecture

The VMFilter combines multiple filter types:

| Filter Type      | Purpose                                                   |
| ---------------- | --------------------------------------------------------- |
| `InternalFilter` | Filters unreachable/internal IPs (via DNS/ping)           |
| `CloudFilter`    | Filters cloud provider IPs (AWS, Azure, GCP ranges)       |
| `OrFilter`       | Combines filters with OR logic (filter if EITHER matches) |

**Initialization Pattern**:

```go
// Standard VM integration
Filter: filter.NewVMFilter(baseCapability.AWS, baseCapability.Collectors)

// Cloud provider integration (AWS, Azure, GCP)
Filter: filter.NewCloudModuleFilter(baseCapability)
```

## Evidence Format

**PASS Example**:

```
✅ VMFilter
Evidence: aws.go:45 - Filter: filter.NewVMFilter(baseCapability.AWS, baseCapability.Collectors)
Evidence: aws.go:123 - if task.Filter.Asset(&asset) { continue }
Evidence: aws.go:125 - task.Job.Send(&asset)
```

**FAIL Example**:

```
❌ VMFilter
Evidence: vendor.go - No NewVMFilter or NewCloudModuleFilter found
Issue: Assets sent directly to Job.Send without filter check
Required: Initialize VMFilter and gate all Job.Send calls
```

## Applicability

| Integration Type          | VMFilter Required?      | Notes                                    |
| ------------------------- | ----------------------- | ---------------------------------------- |
| VM/Vulnerability scanners | YES                     | Nessus, Qualys, InsightVM, Tenable, etc. |
| Cloud providers           | YES (CloudModuleFilter) | AWS, Azure, GCP                          |
| SCM integrations          | NO                      | GitHub, Bitbucket, GitLab (no IP assets) |
| File imports              | DEPENDS                 | If importing IP/host assets, YES         |

## Known Violations (from codebase research)

**Critical Violation**:

- **Axonius**: Sends device/IP assets directly without filter checks
  - Risk: Could ingest internal IPs, cloud infrastructure, or duplicates
  - Fix: Add VMFilter initialization and gating logic

**Acceptable N/A**:

- **GitHub, Bitbucket**: SCM integrations discovering repositories (not IPs)
  - Assessment: VMFilter not needed for repository assets

## Compliance Checklist

- [ ] VMFilter initialized (NewVMFilter or NewCloudModuleFilter)
- [ ] filter.Asset() called before every Job.Send()
- [ ] Correct boolean logic (true = skip, false = send)
- [ ] No direct Job.Send() calls without filter check
