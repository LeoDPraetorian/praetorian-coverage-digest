# errgroup Concurrency Patterns

Validated patterns for safe concurrent processing in Chariot integrations.

## Critical Rules

1. **ALWAYS** use `g.SetLimit(n)` - Never spawn unlimited goroutines
2. **ALWAYS** capture loop variables - `item := item` before `g.Go()`
3. **HANDLE** errors properly - Return or accumulate, never ignore

---

## Pattern 1: Standard Concurrent Processing

**Used by**: Xpanse, Wiz, CrowdStrike
**Source**: `xpanse/xpanse.go:388-433`

### Use Case

- Processing independent items concurrently
- Each item can be handled in isolation
- Errors should stop processing

### Implementation

```go
group := errgroup.Group{}
group.SetLimit(10) // REQUIRED - prevents goroutine explosion

for _, website := range websites {
    website := website // CRITICAL - capture loop variable

    group.Go(func() error {
        // Process website independently
        asset := model.NewAsset(website.Host, website.Host)
        task.Job.Send(&asset)
        return nil
    })
}

// Wait for all goroutines to complete
if err := group.Wait(); err != nil {
    return fmt.Errorf("processing websites: %w", err)
}
```

### Key Points

- `SetLimit(10)` limits concurrent goroutines to 10
- Loop variable captured to avoid race conditions
- Errors propagate immediately and stop other goroutines
- Clean, simple pattern for most use cases

---

## Pattern 2: Shared State with Mutex

**Used by**: CrowdStrike, Microsoft Defender
**Source**: `crowdstrike/crowdstrike.go:162-232`

### Use Case

- Multiple goroutines writing to shared data structures
- Need to aggregate results across all goroutines
- Both atomic and non-atomic operations

### Implementation

```go
processedAssets := make(map[string]model.Asset)
var totalDevices atomic.Uint64
var mu sync.Mutex

g := errgroup.Group{}
g.SetLimit(10)

for pageNum := range totalPages {
    batch := deviceIDs[start:end]
    batch := batch // Capture loop variable

    g.Go(func() error {
        for _, deviceID := range batch {
            device, err := task.fetchDeviceDetails(deviceID)
            if err != nil {
                return fmt.Errorf("fetch device %s: %w", deviceID, err)
            }

            // Atomic operation - no lock needed
            totalDevices.Add(1)

            // Map write - REQUIRES lock
            asset := model.NewAsset(device.Hostname, device.LocalIP)
            mu.Lock()
            processedAssets[device.DeviceID] = asset
            mu.Unlock()

            task.Job.Send(&asset)
        }
        return nil
    })
}

if err := g.Wait(); err != nil {
    return fmt.Errorf("processing devices: %w", err)
}

log.Info("processed devices", "total", totalDevices.Load())
```

### Key Points

- `atomic.Uint64` for lock-free counters
- `sync.Mutex` protects map writes (maps are not goroutine-safe)
- Lock held for minimal time (only during map write)
- Error propagation stops all goroutines

### When to Lock

```go
// ✅ NO LOCK NEEDED (atomic types)
atomic.Uint64, atomic.Int32, sync/atomic.*

// ✅ NO LOCK NEEDED (read-only after initialization)
const values
var initialized before goroutines spawn

// ❌ LOCK REQUIRED (non-atomic writes)
map[K]V - ALWAYS lock
slice append - if shared across goroutines
struct field updates - if shared
```

---

## Pattern 3: Loop Variable Capture (Go 1.21 Compatibility)

**Used by**: Microsoft Defender, Okta
**Source**: `microsoft-defender.go:229-274`

### Use Case

- Supporting Go versions < 1.22
- Ensuring correct variable capture in closures
- Avoiding subtle race conditions

### Implementation

```go
g := errgroup.Group{}
g.SetLimit(10)

for _, vuln := range vulnerabilities {
    vuln := vuln // CRITICAL - capture loop variable

    g.Go(func() error {
        return task.processVulnerability(&vuln) // Use captured copy
    })
}

if err := g.Wait(); err != nil {
    return fmt.Errorf("processing vulnerabilities: %w", err)
}
```

### Why This Matters

```go
// ❌ WRONG - Race condition (all goroutines see last value)
for _, vuln := range vulnerabilities {
    g.Go(func() error {
        return task.processVulnerability(&vuln) // BUG: vuln changes
    })
}

// ✅ RIGHT - Each goroutine gets correct value
for _, vuln := range vulnerabilities {
    vuln := vuln // Capture creates new variable per iteration
    g.Go(func() error {
        return task.processVulnerability(&vuln)
    })
}
```

### Go 1.22+ Note

Go 1.22 changed loop variable scoping, but **ALWAYS capture anyway** for:

- Backward compatibility
- Code clarity
- Explicit intent

---

## Pattern 4: Continue-on-Error (Batch Processing)

**Used by**: Cloudflare WAF, GitHub
**Source**: `cloudflare-waf.go:130-160`

### Use Case

- Want to process all items even if some fail
- Collect all errors instead of stopping on first failure
- Batch operations where partial success is acceptable

### Implementation

```go
errs := error(nil)
el := sync.Mutex{}
group := errgroup.Group{}
group.SetLimit(10)

for _, zone := range zones {
    zone := zone // Capture loop variable

    group.Go(func() error {
        if err := task.processZone(zone); err != nil {
            // Accumulate error instead of returning
            el.Lock()
            errs = errors.Join(errs, err)
            el.Unlock()
        }
        return nil // Always return nil to continue batch
    })
}

group.Wait() // Note: ignoring error since we return nil above
return errs  // Return accumulated errors
```

### Key Points

- `errors.Join()` combines multiple errors
- Mutex protects error accumulation
- **Return `nil` from goroutine** to continue processing
- Check `errs` after `group.Wait()` for any failures

### When to Use

**Use continue-on-error when:**

- Processing independent resources (zones, repos, assets)
- Partial failures are acceptable
- Want to see ALL errors, not just first one

**DON'T use when:**

- Errors are cascading (failure affects subsequent operations)
- Need to stop immediately on critical errors
- Processing order matters

---

## Anti-Patterns to Avoid

### ❌ No SetLimit

```go
g := errgroup.Group{}
for i := 0; i < 10000; i++ { // Spawns 10,000 goroutines!
    g.Go(func() error {
        return process(i)
    })
}
```

**Fix**: Always set limit:

```go
g := errgroup.Group{}
g.SetLimit(10) // REQUIRED
for i := 0; i < 10000; i++ {
    i := i
    g.Go(func() error {
        return process(i)
    })
}
```

### ❌ Not Capturing Loop Variable

```go
for _, item := range items {
    g.Go(func() error {
        return process(item) // BUG: item changes
    })
}
```

**Fix**: Capture variable:

```go
for _, item := range items {
    item := item // REQUIRED
    g.Go(func() error {
        return process(item)
    })
}
```

### ❌ Ignoring errgroup.Wait() Error

```go
g.Go(func() error {
    return errors.New("failed")
})
g.Wait() // Ignores error!
```

**Fix**: Check error:

```go
if err := g.Wait(); err != nil {
    return fmt.Errorf("goroutines failed: %w", err)
}
```

### ❌ Unprotected Map Writes

```go
results := make(map[string]string)
for _, item := range items {
    item := item
    g.Go(func() error {
        results[item.ID] = item.Name // RACE CONDITION
        return nil
    })
}
```

**Fix**: Use mutex:

```go
results := make(map[string]string)
var mu sync.Mutex

for _, item := range items {
    item := item
    g.Go(func() error {
        mu.Lock()
        results[item.ID] = item.Name
        mu.Unlock()
        return nil
    })
}
```

---

## SetLimit Guidelines

| Use Case             | Recommended Limit | Reasoning                        |
| -------------------- | ----------------- | -------------------------------- |
| API calls (external) | 10-25             | Avoid overwhelming external APIs |
| Database queries     | 10-20             | Respect connection pool limits   |
| CPU-bound tasks      | runtime.NumCPU()  | Match available CPU cores        |
| I/O-bound tasks      | 50-100            | Higher concurrency acceptable    |

## Testing with -race

**ALWAYS** run tests with race detector:

```bash
go test -race ./pkg/tasks/integrations/...
```

Common race conditions caught:

- Unprotected map access
- Loop variable capture issues
- Shared slice/struct mutations
- Missing mutex locks

---

## Checklist

- [ ] `g.SetLimit(n)` called before any `g.Go()`
- [ ] Loop variables captured: `item := item`
- [ ] Maps protected with `sync.Mutex`
- [ ] Atomic types used for counters
- [ ] `g.Wait()` error checked
- [ ] Tests run with `-race` flag
- [ ] SetLimit value appropriate for use case
