# errgroup Safety Verification

**Purpose**: Verify that integration correctly uses errgroup with concurrency limits and loop variable capture.

## Requirements

1. MUST call `g.SetLimit(10-25)` to limit concurrent goroutines
2. MUST capture loop variable before goroutine: `item := item`
3. MUST use `errgroup.Group` for all concurrent operations
4. MUST call `g.Wait()` and handle errors

## Verification Commands

```bash
# Check for errgroup usage
grep -n "errgroup" modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go

# Verify SetLimit is called
grep -n "SetLimit" modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go

# Check for loop variable capture pattern
grep -B3 "g.Go(func()" modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go | grep ":="

# Find potential violations (g.Go without prior variable capture)
grep -B1 "g.Go(func()" modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go
```

## Correct Usage Pattern

```go
func (task *Integration) processItems(items []Item) error {
    g := errgroup.Group{}
    g.SetLimit(10)  // REQUIRED: Limit concurrency

    for _, item := range items {
        captured := item  // REQUIRED: Capture loop variable

        g.Go(func() error {
            // Use captured, NOT item
            return task.process(captured)
        })
    }

    // REQUIRED: Wait and handle errors
    if err := g.Wait(); err != nil {
        return fmt.Errorf("processing items: %w", err)
    }
    return nil
}
```

## SetLimit Values by Use Case

| Value   | Use Case                         | Examples                             |
| ------- | -------------------------------- | ------------------------------------ |
| **10**  | Default for API-heavy operations | CrowdStrike, Wiz, Tenable, InsightVM |
| **25**  | API rate limit compliance        | GitHub, GitLab                       |
| **30**  | File I/O operations              | Nessus Import, InsightVM Import      |
| **100** | Ultra-lightweight operations     | Okta (pagination), PingOne           |

**Selection Criteria**:

- API reads: 10-25 (respect external rate limits)
- File I/O: 30+ (I/O bound, can parallelize more)
- Lightweight ops: 100+ (list operations, low overhead)

## Loop Variable Capture Patterns

### Correct Pattern 1: Explicit Capture

```go
for _, scan := range scans {
    localScan := scan  // Capture BEFORE g.Go()
    g.Go(func() error {
        return process(localScan)  // Use captured
    })
}
```

### Correct Pattern 2: Pre-slice Capture

```go
for pageNum := range totalPages {
    start := pageNum * pageSize
    end := min(start+pageSize, len(items))

    batch := items[start:end]  // Capture slice before goroutine

    g.Go(func() error {
        for _, item := range batch {  // Safe: batch is captured
            process(item)
        }
        return nil
    })
}
```

### Correct Pattern 3: Loop Index Capture

```go
for page := 1; page < totalPages; page++ {
    page := page  // Capture loop index
    offset := page * pageSize

    g.Go(func() error {
        url := fmt.Sprintf("%s?offset=%d", base, offset)
        return fetch(url)
    })
}
```

### WRONG Pattern: No Capture

```go
// VIOLATION - Race condition
for _, item := range items {
    g.Go(func() error {
        return process(item)  // BUG: item changes in loop!
    })
}
```

## Thread-Safe Patterns with errgroup

### Atomic Counters

```go
counter := atomic.Int32{}

for _, item := range items {
    captured := item
    g.Go(func() error {
        count := process(captured)
        counter.Add(int32(count))  // Thread-safe
        return nil
    })
}

g.Wait()
total := int(counter.Load())
```

### Mutex for Shared Maps

```go
var mu sync.Mutex
results := make(map[string]Asset)

for _, item := range items {
    captured := item
    g.Go(func() error {
        asset := process(captured)
        mu.Lock()
        results[asset.Key] = asset
        mu.Unlock()
        return nil
    })
}
```

## Evidence Format

**PASS Example**:

```
✅ errgroup Safety
Evidence: crowdstrike.go:179 - g := errgroup.Group{}
Evidence: crowdstrike.go:180 - g.SetLimit(10)
Evidence: crowdstrike.go:186 - batch := (deviceIDs)[start:end] (loop capture)
Evidence: crowdstrike.go:188 - g.Go(func() error { ... })
Evidence: crowdstrike.go:225 - if err := g.Wait(); err != nil { return err }
SetLimit: 10 (appropriate for API-heavy operations)
Variable Capture: Correct (batch captured before goroutine)
```

**FAIL Example (Missing SetLimit)**:

```
❌ errgroup Safety
Evidence: vendor.go:100 - g := errgroup.Group{}
Evidence: vendor.go:105 - g.Go(func() error { ... })
Issue: No SetLimit() call - unbounded concurrency
Required: Add g.SetLimit(10) after group creation
```

**FAIL Example (Missing Variable Capture)**:

```
❌ errgroup Safety
Evidence: vendor.go:100 - for _, item := range items {
Evidence: vendor.go:101 - g.Go(func() error { process(item) })
Issue: Loop variable 'item' not captured before goroutine
Required: Add 'captured := item' before g.Go()
```

## Common Safety Checklist

- [ ] errgroup.Group{} used for concurrent operations
- [ ] SetLimit() called with appropriate value (10-100)
- [ ] Loop variable captured before g.Go()
- [ ] g.Wait() called to wait for completion
- [ ] Error from g.Wait() handled and returned
- [ ] Shared state protected (atomic or mutex)

## Known Compliance (from codebase research)

**SetLimit Compliance**: 100% (18/18 errgroup users)

**SetLimit Distribution**:

- SetLimit(10): 11 integrations
- SetLimit(25): 2 integrations
- SetLimit(30): 2 integrations
- SetLimit(100): 2 integrations

**Loop Capture Compliance**: 94% (17/18 correct)

**Minor Issue**: Okta ignores JSON marshal errors in errgroup loop (different P0 requirement)

## Integration Without errgroup

Not all integrations need errgroup. Sequential processing is acceptable when:

- Single API call with no pagination
- Low data volume (< 100 items)
- Order-dependent processing
- External API doesn't support concurrent requests
