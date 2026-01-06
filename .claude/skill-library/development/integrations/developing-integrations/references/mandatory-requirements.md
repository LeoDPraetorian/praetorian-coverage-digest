# Mandatory Requirements (P0 - BLOCKING)

**Every Chariot integration MUST implement these requirements before PR submission. Violations are blocking issues.**

---

## 1. VMFilter (REQUIRED)

**Purpose**: Filter assets and risks by username to enforce multi-tenancy boundaries.

**Requirements**:

1. Initialize VMFilter in struct:

```go
type IntegrationTask struct {
    Job    model.Job
    Filter filter.VMFilter // REQUIRED
    // ... other fields
}

func (t *IntegrationTask) Init(job model.Job) error {
    t.Job = job
    t.Filter = filter.NewVMFilter(job.Username) // REQUIRED
    return nil
}
```

2. Call `Filter.Asset(&asset)` BEFORE `Job.Send(&asset)`:

```go
// WRONG - sends unfiltered asset
task.Job.Send(&asset)

// RIGHT - filters then sends
task.Filter.Asset(&asset)
task.Job.Send(&asset)
```

3. Call `Filter.Risk(&risk)` BEFORE `Job.Send(&risk)`:

```go
// WRONG - sends unfiltered risk
task.Job.Send(&risk)

// RIGHT - filters then sends
task.Filter.Risk(&risk)
task.Job.Send(&risk)
```

**Violations Found**:

- DigitalOcean integration - missing VMFilter entirely
- GitHub integration - missing VMFilter entirely
- GitLab integration - missing VMFilter entirely
- Cloudflare integration - missing VMFilter entirely

**Why This Matters**: Without VMFilter, users can see assets/risks from other tenants, violating security boundaries.

---

## 2. CheckAffiliation (REQUIRED)

**Purpose**: Verify asset ownership by querying the external API. Prevents false positives and validates integration credentials still have access to assets.

**Requirements**:

```go
func (t *Integration) CheckAffiliation(asset model.Asset) (bool, error) {
    // MUST query external API to verify asset ownership
    // Return (true, nil) if affiliated
    // Return (false, nil) if not affiliated
    // Return (false, err) on error

    resp, err := t.client.GetAsset(asset.DNS) // Query external API
    if err != nil {
        if isNotFoundError(err) {
            return false, nil // Asset no longer exists
        }
        return false, fmt.Errorf("querying API: %w", err)
    }

    return resp.IsOwned, nil
}
```

**ANTI-PATTERN: Stub Implementation**

❌ **WRONG - only 1 of 42 integrations (Wiz) has real implementation**:

```go
func (t *Integration) CheckAffiliation(asset model.Asset) (bool, error) {
    return true, nil // VIOLATION - doesn't query external API
}
```

**ANTI-PATTERN: Full Re-enumeration**

❌ **WRONG - Amazon/Azure/GCP use expensive full re-enumeration**:

```go
func (t *Integration) CheckAffiliation(asset model.Asset) (bool, error) {
    // Re-enumerates ALL assets just to find one
    allAssets, err := t.ListAllAssets() // Expensive
    for _, a := range allAssets {
        if a.ID == asset.Key {
            return true, nil
        }
    }
    return false, nil
}
```

**RIGHT: Query Specific Asset**

✅ See `wiz.go` for the only correct implementation:

```go
func (t *WizTask) CheckAffiliation(asset model.Asset) (bool, error) {
    // Query specific asset by ID
    resp, err := t.client.GetAssetByID(asset.Key)
    if err != nil {
        if isNotFoundError(err) {
            return false, nil
        }
        return false, err
    }
    return true, nil
}
```

**Why This Matters**: Stub implementations always return `true`, causing false positives when assets are deleted or credentials are revoked. Full re-enumeration is prohibitively expensive for cloud providers with thousands of assets.

---

## 3. ValidateCredentials (REQUIRED)

**Purpose**: Verify credentials work BEFORE starting asset enumeration. Fail fast if credentials are invalid.

**Requirements**:

```go
func (t *Integration) ValidateCredentials() error {
    // Make lightweight API call to verify credentials
    _, err := t.client.GetCurrentUser() // Or similar lightweight endpoint
    if err != nil {
        return fmt.Errorf("invalid credentials: %w", err)
    }
    return nil
}

func (t *Integration) Invoke() error {
    // Call ValidateCredentials FIRST
    if err := t.ValidateCredentials(); err != nil {
        return err
    }

    // Proceed with asset enumeration
    // ...
}
```

**Violation Found**:

- DigitalOcean integration - skips ValidateCredentials entirely, starts enumeration with bad credentials

**Why This Matters**: Without credential validation, the integration wastes time enumerating with invalid credentials, generating confusing error logs.

---

## 4. Concurrency Safety (errgroup)

**Purpose**: Prevent race conditions and resource exhaustion when processing assets concurrently.

**Requirements**:

1. **ALWAYS call `g.SetLimit(10)`** (or appropriate limit):

```go
g, ctx := errgroup.WithContext(ctx)
g.SetLimit(10) // REQUIRED - prevents spawning unlimited goroutines
```

2. **ALWAYS capture loop variables** before `g.Go()`:

```go
for _, item := range items {
    item := item // REQUIRED - capture loop variable
    g.Go(func() error {
        return process(item)
    })
}
```

3. **ALWAYS check error** from `g.Wait()`:

```go
if err := g.Wait(); err != nil {
    return fmt.Errorf("processing batch: %w", err)
}
```

**Race Condition Bugs Found**:

- `wiz.go:314` - missing loop variable capture
- `github.go:154` - missing loop variable capture
- `tenable-vm.go` - missing SetLimit
- `insightvm_import.go:92` - missing loop variable capture
- `nessus_import.go:92` - missing loop variable capture

**Why This Matters**: Without `SetLimit()`, integration spawns unlimited goroutines and crashes. Without loop variable capture, all goroutines process the LAST item in the loop (race condition).

---

## 5. Error Handling

**Purpose**: Never silently ignore errors. All errors must be handled or propagated with context.

**Requirements**:

1. **NEVER use `_` for error returns**:

```go
// WRONG - ignores error
data, _ := json.Marshal(obj) // VIOLATION

// RIGHT - handle error
data, err := json.Marshal(obj)
if err != nil {
    return fmt.Errorf("marshaling object: %w", err)
}
```

2. **ALWAYS wrap errors with context**:

```go
// WRONG - loses context
return err

// RIGHT - adds context
return fmt.Errorf("fetching assets from page %d: %w", page, err)
```

**Violations Found**:

- 11 instances of ignored `json.Marshal()` errors in: wiz, okta, xpanse, tenable_vm

**Why This Matters**: Ignored errors cause silent failures that are impossible to debug. Error wrapping provides context for diagnosing issues.

---

## 6. Pagination Safety

**Purpose**: Prevent infinite loops if external API has buggy pagination (e.g., always returns `nextToken` even on last page).

**Requirements**:

```go
const maxPages = 1000 // REQUIRED - safety limit

page := 0
pageToken := ""

for {
    if page >= maxPages {
        log.Warn("reached maxPages limit, stopping pagination")
        break
    }

    resp, err := api.ListAssets(pageToken)
    if err != nil {
        return fmt.Errorf("listing assets at page %d: %w", page, err)
    }

    // Process resp.Assets...

    if resp.NextToken == "" {
        break
    }

    pageToken = resp.NextToken
    page++
}
```

**Infinite Loop Risk Found**:

- MS Defender integration - no maxPages limit
- EntraID integration - no maxPages limit
- CrowdStrike Spotlight integration - no maxPages limit
- Xpanse integration - no maxPages limit
- InsightVM integration - no maxPages limit
- GitLab integration - no maxPages limit

**Why This Matters**: Buggy APIs can return `nextToken` infinitely. Without `maxPages`, integration runs forever, exhausting memory and causing Lambda timeouts.

---

## Verification Checklist

Before submitting PR, verify:

- [ ] VMFilter initialized in struct with `filter.NewVMFilter(job.Username)`
- [ ] `Filter.Asset(&asset)` called before every `Job.Send(&asset)`
- [ ] `Filter.Risk(&risk)` called before every `Job.Send(&risk)`
- [ ] CheckAffiliation queries external API (not stub returning `true`)
- [ ] ValidateCredentials implemented and called in `Invoke()`
- [ ] All errgroup usage has `g.SetLimit()` and loop variable capture
- [ ] No ignored errors (no `_, _ = ...`)
- [ ] All pagination loops have `maxPages` constant with break condition

**ALL items must be checked before PR approval.**
