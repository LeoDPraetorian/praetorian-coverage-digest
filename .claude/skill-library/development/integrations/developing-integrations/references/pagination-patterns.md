# Pagination Patterns

Four distinct pagination patterns used across Chariot integrations, with validated production code.

## Pattern 1: Token-Based Pagination

**Used by**: Okta, AWS, Azure
**Source**: `okta/okta.go:154-201`

### Characteristics

- API returns opaque continuation token
- Token passed to next request
- No page numbers, no offset/limit arithmetic

### Implementation

```go
after := ""
limit := int32(200)

for {
    req := task.client.ApplicationAPI.ListApplications(ctx).Limit(limit)
    if after != "" {
        req = req.After(after)
    }

    apps, resp, err := req.Execute()
    if err != nil {
        return 0, fmt.Errorf("fetch applications: %w", err)
    }

    // Process apps...
    for _, app := range apps {
        // Handle each application
    }

    // Check for more pages
    if !resp.HasNextPage() {
        break
    }

    after, err = extractAfterParam(resp.NextPage())
    if err != nil {
        slog.Warn("pagination failed", "error", err)
        break
    }
}
```

### Safety Features

- `HasNextPage()` check prevents infinite loops
- Graceful degradation if token extraction fails
- Error logging for debugging

---

## Pattern 2: Page-Based Pagination

**Used by**: GitHub, GitLab
**Source**: `github/github.go:132-174`

### Characteristics

- API returns total page count
- Numeric page parameter (1-indexed)
- Parallel fetching possible after page 1

### Implementation

```go
// Fetch page 1 to get total pages
repos, resp, err := task.get(1)
if err != nil {
    return fmt.Errorf("fetch first page: %w", err)
}
processRepos(repos)

// Parallel fetch remaining pages
g := errgroup.Group{}
g.SetLimit(25) // REQUIRED

for i := 2; i <= resp.LastPage; i++ {
    page := i // CRITICAL: Capture loop variable
    g.Go(func() error {
        repos, _, err := task.get(page)
        if err != nil {
            return err
        }
        processRepos(repos)
        return nil
    })
}

if err := g.Wait(); err != nil {
    return fmt.Errorf("parallel fetch: %w", err)
}
```

### Safety Features

- `SetLimit(25)` prevents goroutine explosion
- Loop variable capture (`page := i`) prevents race conditions
- Error propagation from parallel fetches
- First page fetched sequentially to get metadata

### Performance Benefits

- Parallel fetching reduces total time
- SetLimit prevents overwhelming API
- Suitable for APIs with stable pagination

---

## Pattern 3: Cursor-Based Pagination

**Used by**: Xpanse, Qualys
**Source**: `xpanse/xpanse.go:459-488`

### Characteristics

- API returns cursor/token for next set
- Retry logic for transient failures
- Generic helper function

### Implementation

```go
func paginate(getPage func(string) (any, string, error), processItems func(any) error) error {
    pageToken := ""
    retries := 0
    maxRetries := 5

    for {
        items, nextToken, err := getPage(pageToken)
        if err != nil {
            if retries < maxRetries {
                retries++
                time.Sleep(time.Second * 10 * time.Duration(retries))
                continue
            }
            return err
        }

        retries = 0 // Reset on success

        if err := processItems(items); err != nil {
            return err
        }

        if nextToken == "" {
            break // No more pages
        }

        pageToken = nextToken
    }
    return nil
}

// Usage example
err := paginate(
    func(token string) (any, string, error) {
        resp, err := api.ListAssets(token)
        if err != nil {
            return nil, "", err
        }
        return resp.Assets, resp.NextToken, nil
    },
    func(items any) error {
        assets := items.([]Asset)
        for _, asset := range assets {
            // Process asset
        }
        return nil
    },
)
```

### Safety Features

- Exponential backoff retry (10s, 20s, 30s, 40s, 50s)
- Reset retry counter on successful page fetch
- Max 5 retries prevents infinite loops
- Empty token detection for termination

### When to Use

- APIs with transient failures
- Large datasets that benefit from retry logic
- Cursor/token-based APIs

---

## Pattern 4: SDK-Based Pagination

**Used by**: DigitalOcean, Linode
**Source**: `digitalocean/digitalocean.go:202-226`

### Characteristics

- SDK handles pagination internally
- Links-based navigation
- No manual token management

### Implementation

```go
func (task *DigitalOcean) paginate(get func(*godo.ListOptions) (*godo.Response, error)) error {
    opt := &godo.ListOptions{PerPage: 200}

    for {
        resp, err := get(opt)
        if err != nil {
            return err
        }

        // Check if this is the last page
        if resp.Links == nil || resp.Links.IsLastPage() {
            break
        }

        // Get next page number
        page, err := resp.Links.CurrentPage()
        if err != nil {
            return fmt.Errorf("get current page: %w", err)
        }
        opt.Page = page + 1
    }
    return nil
}

// Usage example
err := task.paginate(func(opt *godo.ListOptions) (*godo.Response, error) {
    droplets, resp, err := task.client.Droplets.List(context.Background(), opt)
    if err != nil {
        return nil, err
    }

    for _, droplet := range droplets {
        // Process droplet
    }

    return resp, nil
})
```

### Safety Features

- SDK-provided termination checks
- Nil-safe link checking
- Page number arithmetic handled by SDK
- Fixed page size (200) prevents memory issues

### When to Use

- Vendor SDK available
- Links/HATEOAS-style pagination
- SDK handles edge cases internally

---

## Pagination Safety Guarantee

All pagination implementations MUST provide a termination guarantee to prevent infinite loops. Two approaches are acceptable, depending on API reliability.

### Approach A: Hardcoded maxPages Constant (Defensive)

**When to Use:**
- API doesn't provide reliable termination signals
- API has known pagination bugs or infinite loop history
- Documentation unclear about pagination termination
- Safety-critical integrations where truncation is acceptable

**Implementation:**

```go
const maxPages = 1000 // Safety net

func (task *Integration) enumerate() error {
    var nextToken string
    for page := 0; page < maxPages; page++ {
        resp, err := task.client.List(nextToken)
        if err != nil {
            return fmt.Errorf("listing page %d: %w", page, err)
        }

        task.processItems(resp.Items)

        // Check if we're done
        if resp.NextToken == "" {
            break
        }
        nextToken = resp.NextToken
    }

    // Warn if we hit the safety limit
    if page >= maxPages {
        slog.Warn("reached maxPages safety limit", "maxPages", maxPages)
    }
    return nil
}
```

**Pros:**
- Guaranteed termination regardless of API bugs
- Explicit safety contract in code
- Easy to audit and understand

**Cons:**
- May truncate legitimate large datasets
- Arbitrary limit requires justification

---

### Approach B: API-Provided Limits (Standard)

**When to Use:**
- API is well-documented with reliable pagination
- API provides authoritative termination signals
- All data must be retrieved (no truncation acceptable)
- Vendor SDK handles pagination internally

**Termination Signals:**
- `resp.LastPage` - Total pages known upfront
- `resp.HasMore` - Boolean continuation flag
- `resp.TotalCount` - Item count for verification
- `resp.NextToken == ""` - Empty token indicates end
- `resp.Links.IsLastPage()` - HATEOAS-style navigation

**Implementation Examples:**

Token-based (see Pattern 1):
```go
if !resp.HasNextPage() {
    break
}
```

Page-based (see Pattern 2):
```go
for i := 2; i <= resp.LastPage; i++ {
    // Process pages
}
```

Cursor-based (see Pattern 3):
```go
if nextToken == "" {
    break
}
```

**Pros:**
- Gets all data, no arbitrary truncation
- Respects API's pagination design
- Most common pattern in production (44/44 Chariot integrations)

**Cons:**
- Relies on API correctness
- Vulnerable to API bugs (infinite loops)

---

### Approach C: Combined (Recommended for Critical Paths)

**When to Use:**
- Uncertain about API reliability
- First-time integration with new API
- Production incidents related to pagination

**Implementation:**

```go
const maxPages = 1000 // Safety net

func (task *Integration) enumerate() error {
    var nextToken string
    for page := 0; page < maxPages; page++ {
        resp, err := task.client.List(nextToken)
        if err != nil {
            return fmt.Errorf("listing page %d: %w", page, err)
        }

        task.processItems(resp.Items)

        // Primary termination: API signal
        if resp.NextToken == "" {
            break
        }
        nextToken = resp.NextToken
    }

    // Log if we hit safety limit (indicates potential issue)
    if page >= maxPages {
        slog.Warn("reached maxPages safety limit", "maxPages", maxPages)
    }
    return nil
}
```

**Benefits:**
- API signal as primary termination (gets all data)
- maxPages as safety net (prevents infinite loops)
- Logging alerts to potential API issues
- Best of both approaches

---

### Decision Criteria

| Scenario | Recommended Approach |
|----------|---------------------|
| API has known pagination bugs | **Approach A** (Defensive) |
| API well-documented, stable | **Approach B** (Standard) |
| First integration, uncertain | **Approach C** (Combined) |
| Large datasets (>1000 pages) | **Approach B** with monitoring |
| Safety-critical path | **Approach C** (Combined) |

**Document your choice** in `architecture.md` with justification:

```markdown
## Pagination Safety

**Approach**: API-Provided Limits (Approach B)

**Justification**: GitHub API provides reliable `LastPage` field in all list responses.
No known pagination bugs. API has been stable for 10+ years.

**Termination Signal**: `resp.LastPage` comparison in for loop
```

---

## Anti-Patterns to Avoid

### ❌ No Maximum Page Limit

```go
for pageToken != "" {
    // Infinite loop if API bugs out
    resp, _ := api.List(pageToken)
    pageToken = resp.NextToken
}
```

**Fix**: Add `maxPages` constant:

```go
const maxPages = 1000
page := 0

for pageToken != "" {
    if page >= maxPages {
        log.Warn("reached maxPages limit")
        break
    }
    resp, err := api.List(pageToken)
    if err != nil {
        return err
    }
    pageToken = resp.NextToken
    page++
}
```

### ❌ Ignoring Pagination Errors

```go
for {
    items, _ := api.List(token) // Ignores errors
    processItems(items)
}
```

**Fix**: Always handle errors:

```go
for {
    items, err := api.List(token)
    if err != nil {
        return fmt.Errorf("fetch page: %w", err)
    }
    processItems(items)
}
```

### ❌ Parallel Fetching Without Limits

```go
g := errgroup.Group{}
for i := 1; i <= totalPages; i++ {
    g.Go(func() error {
        // Spawns unlimited goroutines
        return fetchPage(i)
    })
}
```

**Fix**: Use `SetLimit`:

```go
g := errgroup.Group{}
g.SetLimit(25) // REQUIRED

for i := 1; i <= totalPages; i++ {
    page := i // Capture loop variable
    g.Go(func() error {
        return fetchPage(page)
    })
}
```

---

## Choosing the Right Pattern

| API Type             | Pattern      | Example              |
| -------------------- | ------------ | -------------------- |
| Opaque token         | Token-Based  | Okta, AWS            |
| Page numbers + total | Page-Based   | GitHub, GitLab       |
| Cursor + retry needs | Cursor-Based | Xpanse, Qualys       |
| Vendor SDK available | SDK-Based    | DigitalOcean, Linode |

## Safety Checklist

- [ ] `maxPages` constant defined
- [ ] Break condition exists
- [ ] Errors not ignored
- [ ] errgroup has `SetLimit()`
- [ ] Loop variables captured
- [ ] Empty/nil checks for tokens
- [ ] Retry logic for transient failures (if needed)
