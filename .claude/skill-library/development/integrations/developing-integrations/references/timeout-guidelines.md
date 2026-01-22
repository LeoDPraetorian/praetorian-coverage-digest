# Timeout Guidelines

**Integration timeout values based on workload characteristics.**

## Timeout Decision Matrix

| Integration Type       | Timeout | Rationale                                                         | Examples                                                               |
| ---------------------- | ------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Lightweight APIs**   | 30s     | Single API call, small response payloads, no pagination           | GitHub repo metadata, Okta user lookups, Single-asset queries          |
| **Standard VMs**       | 60s     | Standard pagination (<100 pages), moderate processing             | InsightVM, Qualys VM scan results, Tenable.io assets                   |
| **Large-scale**        | 120s    | Heavy pagination (>100 pages), large datasets                     | Qualys full scope enumeration, Large AWS accounts                      |
| **Complex multi-step** | 180s    | Multiple sequential API calls, portal discovery, nested resources | Okta with application portal discovery, Multi-region cloud enumeration |

## Implementation Pattern

```go
func (t *Integration) Timeout() time.Duration {
    return 60 * time.Second  // Standard VMs
}
```

## Decision Tree

```
How many API calls does the integration make?
├── 1-5 calls → 30s (Lightweight)
└── >5 calls → How many resources does it enumerate?
    ├── <1000 resources → 60s (Standard)
    └── >1000 resources → Does it require multi-step processing?
        ├── No → 120s (Large-scale)
        └── Yes → 180s (Complex multi-step)
```

## Common Patterns

### Lightweight APIs (30s)

**Characteristics:**

- Single or few API calls
- No pagination or <10 pages
- Small response payloads (<1MB total)
- Simple data transformation

**Examples:**

- GitHub: Fetch repository details
- Okta: List users (small tenant)
- Shodan: Host lookup
- Single-asset verification queries

```go
func (t *GitHub) Timeout() time.Duration {
    return 30 * time.Second
}
```

### Standard VMs (60s)

**Characteristics:**

- Standard pagination (10-100 pages)
- Moderate dataset sizes (100-1000 items)
- Standard errgroup concurrency
- Common vulnerability scanner integrations

**Examples:**

- InsightVM vulnerability scans
- Tenable.io asset enumeration
- Qualys VM scans (normal scope)
- Standard cloud resource enumeration

```go
func (t *InsightVM) Timeout() time.Duration {
    return 60 * time.Second
}
```

### Large-scale (120s)

**Characteristics:**

- Heavy pagination (>100 pages)
- Large datasets (>1000 items)
- Multiple concurrent workers
- Comprehensive cloud account enumeration

**Examples:**

- Qualys: Full scope with thousands of assets
- AWS: Large accounts with many regions
- Azure: Enterprise subscriptions
- Large Okta tenants

```go
func (t *Qualys) Timeout() time.Duration {
    return 120 * time.Second
}
```

### Complex Multi-step (180s)

**Characteristics:**

- Sequential multi-phase discovery
- Portal or nested resource enumeration
- Complex affiliation checks
- Multiple API endpoint coordination

**Examples:**

- Okta: Application portal discovery (apps → portals → assets)
- Multi-region cloud enumeration with cross-region dependencies
- Integrations requiring asset relationship resolution
- Nested resource hierarchies (org → project → resource)

```go
func (t *Okta) Timeout() time.Duration {
    return 180 * time.Second
}
```

## Anti-Patterns

### ❌ Too Short (Risk of False Failures)

```go
// WRONG - 15s is too short for any paginated integration
func (t *Integration) Timeout() time.Duration {
    return 15 * time.Second
}
```

**Problem**: Legitimate large accounts will timeout, causing false negatives.

### ❌ Too Long (Resource Waste)

```go
// WRONG - 300s (5 min) is excessive for most integrations
func (t *Integration) Timeout() time.Duration {
    return 300 * time.Second
}
```

**Problem**: Hung integrations consume Lambda execution time unnecessarily.

### ❌ No Timeout

```go
// WRONG - missing Timeout() method
```

**Problem**: Uses default system timeout (may be too short or too long).

## Timeout vs Pagination Safety

**Timeouts and pagination limits serve different purposes:**

| Mechanism   | Purpose                    | When Triggered                       |
| ----------- | -------------------------- | ------------------------------------ |
| `Timeout()` | Limit total execution time | After N seconds regardless of state  |
| `maxPages`  | Prevent infinite loops     | After N API calls regardless of time |

**Both are required.** Timeout is a safety backstop, maxPages prevents specific pagination bugs.

```go
// REQUIRED: Both timeout and pagination safety
func (t *Integration) Timeout() time.Duration {
    return 60 * time.Second  // Total execution limit
}

func (t *Integration) discoverAssets(ctx context.Context) error {
    const maxPages = 1000  // Pagination loop limit
    // ...
}
```

## Testing Timeout Values

When choosing timeout, test with:

1. **Small tenant**: Minimal resources (should complete in <50% of timeout)
2. **Large tenant**: Thousands of resources (should complete in <90% of timeout)
3. **Slow API**: Simulated network delays (should hit timeout gracefully)

**Example validation:**

```bash
# Small tenant: 500 assets
# Measured: 18s execution
# Timeout: 60s
# Safety margin: 70% ✅

# Large tenant: 5000 assets
# Measured: 52s execution
# Timeout: 60s
# Safety margin: 13% ⚠️ Consider increasing to 120s
```

## Surface-Specific Recommendations

| Surface    | Typical Timeout | Rationale                       |
| ---------- | --------------- | ------------------------------- |
| `External` | 60s             | Public-facing asset discovery   |
| `Cloud`    | 120s            | Large resource enumerations     |
| `SCM`      | 30s             | Lightweight repository metadata |

## References

See production integrations for real-world examples:

- `modules/chariot/backend/pkg/tasks/integrations/github.go` - 30s (lightweight)
- `modules/chariot/backend/pkg/tasks/integrations/tenable-vm.go` - 60s (standard)
- `modules/chariot/backend/pkg/tasks/integrations/qualys.go` - 120s (large-scale)
- `modules/chariot/backend/pkg/tasks/integrations/okta.go` - 180s (complex multi-step)
