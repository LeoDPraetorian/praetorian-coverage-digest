# Pagination Safety Verification

**Purpose**: Verify that integration has proper pagination limits to prevent infinite loops.

## Requirements

You **MUST** provide a pagination termination guarantee using **ONE** of the following approaches:

**Approach A: Hardcoded maxPages Constant (Defensive)**
- Use when API doesn't provide reliable termination signals
- Guarantees termination regardless of API bugs
- Typical value: 1000 pages

**Approach B: API-Provided Termination Signal (Standard)**
- Use when API provides reliable pagination metadata
- Examples: `LastPage`, `HasMore`, `NextToken == ""`, `IsLastPage()`
- Most common in production (44/44 Chariot integrations)
- Requires well-documented, stable API

**Approach C: Combined (Recommended for Critical Paths)**
- Use both maxPages AND API signals
- Primary termination via API signal
- maxPages as safety net

## Verification Commands

### Step 1: Check for maxPages Constant (Approach A)

```bash
grep -n 'const maxPages\|const MaxPages' {file}
```

If found → **PASS** (Approach A or C)

### Step 2: Check for API-Provided Termination (Approach B)

Look for common pagination termination signals:

```bash
grep -n 'LastPage\|HasMore\|NextToken.*==""\|nextToken.*==""' {file}
```

If found → **PASS** (Approach B or C)

### Verdict Logic

- If **maxPages constant** found → **PASS** (Approach A or C)
- If **API termination signal** found → **PASS** (Approach B or C)
- If **neither** found → **FAIL** (No termination guarantee)

### Additional Verification (Optional)

Find pagination loops to understand implementation:

```bash
# Find pagination loops
grep -n "for.*{" {file} | grep -E "apiURL|pageToken|currentURL|offset|page"

# Check for page counters
grep -n "page.*:=.*0\|page++\|page +=" {file}

# Find break conditions
grep -B 2 -A 3 "break" {file}
```

## Safe Pagination Patterns

### Pattern A: Hardcoded maxPages (Recommended)
```go
const maxPages = 1000

func (task *Integration) enumerate() error {
    for page := 0; page < maxPages; page++ {
        resp, err := task.client.List(page)
        if err != nil {
            return fmt.Errorf("listing page %d: %w", page, err)
        }

        task.processItems(resp.Items)

        if resp.NextToken == "" {
            break  // Natural termination
        }
    }

    if page >= maxPages {
        slog.Warn("reached max pages limit", "maxPages", maxPages)
    }

    return nil
}
```

### Pattern B: API-Provided Total Pages (Safe)
```go
// GitHub pattern - API provides authoritative count
repos, resp, err := task.client.Repositories.List(ctx, org, opts)
if err != nil {
    return err
}

// resp.LastPage is provided by API
for i := 2; i <= resp.LastPage; i++ {
    page := i  // Capture loop variable
    g.Go(func() error {
        return task.fetchPage(page)
    })
}
```

### Pattern C: Explicit hasMore Flag (Safe)
```go
// Burp Enterprise pattern
const limit = 100

for offset := 0; ; offset += limit {
    entities, hasMore, err := task.Client.GetIssueEntities(offset, limit)
    if err != nil {
        return err
    }

    task.processEntities(entities)

    if !hasMore {
        break  // Explicit API signal
    }
}
```

### Pattern D: Calculated Chunks (Safe)
```go
// CrowdStrike pattern - pre-calculate pages
totalPages := calculateChunks(len(items), pageSize)

for page := 0; page < totalPages; page++ {
    start := page * pageSize
    end := min(start+pageSize, len(items))
    batch := items[start:end]

    task.processBatch(batch)
}
```

## Risky Patterns (Violations)

### Pattern E: Pure API-Dependency (RISKY)
```go
// VIOLATION - No maxPages safeguard
// MS Defender, EntraID pattern
for currentURL != "" {
    result, err := web.Request[Response](task.client, currentURL)
    if err != nil {
        return err
    }

    task.processItems(result.Items)

    currentURL = result.OdataNextLink  // Could be buggy forever!
}
```

**Risk**: If API has bug and returns NextLink repeatedly, infinite loop.

**Fix**:
```go
const maxPages = 1000

for page := 0; currentURL != "" && page < maxPages; page++ {
    result, err := web.Request[Response](task.client, currentURL)
    if err != nil {
        return err
    }

    task.processItems(result.Items)
    currentURL = result.OdataNextLink
}

if currentURL != "" {
    slog.Warn("reached max pages, more data available", "maxPages", maxPages)
}
```

## Evidence Format

**PASS Example (maxPages constant)**:
```
✅ Pagination Safety
Evidence: vendor.go:25 - const maxPages = 1000
Evidence: vendor.go:100 - for page := 0; page < maxPages; page++ {
Evidence: vendor.go:115 - if resp.NextToken == "" { break }
Pattern: Hardcoded maxPages constant + natural break
```

**PASS Example (API-provided total)**:
```
✅ Pagination Safety
Evidence: github.go:145 - for i := 2; i <= resp.LastPage; i++ {
Pattern: API provides authoritative page count (resp.LastPage)
Source: GitHub API returns LastPage header
```

**PASS Example (hasMore flag)**:
```
✅ Pagination Safety
Evidence: burp.go:105 - if !hasMore { break }
Pattern: Explicit API signal terminates loop
```

**FAIL Example**:
```
❌ Pagination Safety
Evidence: vendor.go:98 - for currentURL != "" {
Issue: No maxPages constant, relies solely on API NextLink
Risk: Infinite loop if API returns buggy NextLink
Required: Add page counter and maxPages limit (e.g., 1000)
```

## Known Violations (from codebase research)

**CRITICAL Violations (no maxPages, API-dependent)**:
- **Microsoft Defender**: `for currentURL != ""` without page limit
- **EntraID**: `for apiURL != ""` without page limit

**Documentation-Practice Gap**:
- P0 requirement says "MUST have maxPages constant (typically 1000)"
- **0 integrations** have hardcoded maxPages constant
- All rely on API-provided metadata or break conditions

## Recommended maxPages Values

| Data Type | maxPages | Rationale |
|-----------|----------|-----------|
| Assets | 1000 | Typical asset count < 1M |
| Vulnerabilities | 5000 | High-vuln environments may have more |
| Users/Members | 500 | Org typically < 50K users |
| Repositories | 1000 | Large orgs may have many repos |

## Compliance Checklist

- [ ] maxPages constant defined OR API provides total
- [ ] Page counter incremented in loop
- [ ] Break condition on maxPages OR API signal
- [ ] Warning logged when maxPages reached
- [ ] Not purely dependent on external API NextLink
- [ ] Pagination loop tested with large datasets
