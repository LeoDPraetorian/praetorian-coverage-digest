# Error Handling Verification

**Purpose**: Verify that integration properly handles all errors without ignoring them.

## Requirements

1. MUST NOT ignore errors with `_, _ =` pattern
2. All errors MUST be wrapped with context using `fmt.Errorf("context: %w", err)`
3. MUST propagate errors to caller appropriately
4. MUST NOT silently continue after errors

## Verification Commands

```bash
# Find ALL ignored error patterns
grep -n "_, _ =" modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go

# Find JSON errors ignored (most common violation)
grep -n ", _ := json\\." modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go

# Find any single underscore for error (ignored)
grep -n ", _ :=" modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go | grep -v "ok :="

# Verify proper error wrapping (%w used)
grep -n "fmt\\.Errorf.*%w" modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go

# Find errors that are just logged (not wrapped)
grep -n "slog\\.Error\\|slog\\.Warn" modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go
```

## Violation Patterns

### JSON Marshal Errors (Most Common)
```go
// VIOLATION - Error ignored
payload, _ := json.Marshal(reqBody)
resp, err := api.Request(url, payload, ...)

// CORRECT - Error checked
payload, err := json.Marshal(reqBody)
if err != nil {
    return fmt.Errorf("marshaling request body: %w", err)
}
resp, err := api.Request(url, payload, ...)
```

### JSON Unmarshal Errors
```go
// VIOLATION - Error ignored
json.Unmarshal(body, &result)
// result may have zero values!

// CORRECT - Error checked
if err := json.Unmarshal(body, &result); err != nil {
    return fmt.Errorf("parsing response: %w", err)
}
```

### Double Underscore Pattern
```go
// VIOLATION - Both return values ignored
appBytes, _ := json.Marshal(app)
json.Unmarshal(appBytes, &appData)  // Unmarshal error also ignored

// CORRECT - Both checked
appBytes, err := json.Marshal(app)
if err != nil {
    return fmt.Errorf("serializing app: %w", err)
}
if err := json.Unmarshal(appBytes, &appData); err != nil {
    return fmt.Errorf("deserializing app data: %w", err)
}
```

### Temp Directory Creation
```go
// VIOLATION - Error ignored
dir, _ := os.MkdirTemp("", "prefix")

// CORRECT - Error checked
dir, err := os.MkdirTemp("", "prefix")
if err != nil {
    return fmt.Errorf("creating temp directory: %w", err)
}
defer os.RemoveAll(dir)
```

## Correct Error Wrapping Patterns

### Pattern 1: Simple Operation
```go
data, err := json.Marshal(payload)
if err != nil {
    return fmt.Errorf("marshaling request payload: %w", err)
}
```

### Pattern 2: Context-Rich Wrapping
```go
items, err := api.ListAssets(pageToken)
if err != nil {
    return fmt.Errorf("listing assets at page %d: %w", page, err)
}
```

### Pattern 3: Type Assertion with Validation
```go
secret, ok := job.Secret["api_token"]
if !ok {
    return fmt.Errorf("required credential 'api_token' not found")
}
```

### Pattern 4: Partial Error Tolerance (Log and Continue)
```go
// Only acceptable when single item failure shouldn't stop processing
var result Response
if err := json.Unmarshal(body, &result); err != nil {
    slog.Warn("response parsing failed, skipping item",
        "error", err,
        "item_id", item.ID)
    continue  // Skip this item, continue with others
}
```

### Pattern 5: Status Code Handling
```go
resp, err := client.Request("GET", url, nil, headers...)
if err != nil {
    return fmt.Errorf("API request failed: %w", err)
}

if resp.StatusCode == 401 || resp.StatusCode == 403 {
    return fmt.Errorf("authentication failed: %s", resp.Status)
}

if resp.StatusCode < 200 || resp.StatusCode >= 300 {
    return fmt.Errorf("API error: %s", resp.Status)
}
```

## Evidence Format

**PASS Example**:
```
✅ Error Handling
Evidence: vendor.go - No "_, _ =" or ", _ :=" patterns found
Evidence: vendor.go:45 - fmt.Errorf("marshaling payload: %w", err)
Evidence: vendor.go:78 - fmt.Errorf("API request page %d: %w", page, err)
Pattern: All errors checked and wrapped with context
```

**FAIL Example**:
```
❌ Error Handling
Evidence: vendor.go:158 - payload, _ := json.Marshal(reqBody)
Evidence: vendor.go:256 - payload, _ := json.Marshal(body)
Issue: 2 JSON marshal errors ignored
Risk: Silent failures, corrupted API requests
Required: Add error checking for all json.Marshal calls
```

## Known Violations (from codebase research)

**Violations by Integration**:
| Integration | File | Count | Type |
|------------|------|-------|------|
| Xpanse | xpanse.go | 4 | json.Marshal ignored |
| Wiz | wiz.go | 4 | json.Marshal ignored |
| Tenable | tenable-vm.go | 2 | json.Marshal ignored |
| Okta | okta.go | 2 | json.Marshal + Unmarshal |
| Azure | azure.go | 1 | os.MkdirTemp ignored |
| GCP | gcp.go | 1 | os.MkdirTemp ignored |

**Total**: 17 instances of ignored errors across 6 integrations

## Why JSON Marshaling Errors Matter

JSON marshaling can fail when:
- Circular references exist
- Unsupported types (channels, functions)
- Numeric overflow
- Invalid UTF-8 in strings

**Risk**: Silently sending empty/corrupted payloads to APIs, resulting in confusing errors that are impossible to trace.

## Error Wrapping Best Practices

### Use `%w` for Error Chains
```go
// RIGHT - Preserves error chain for errors.Unwrap()
return fmt.Errorf("context: %w", err)

// LESS IDEAL - Loses error chain
return fmt.Errorf("context: %v", err)
```

### Include Actionable Context
```go
// GOOD - Tells you what was being done
return fmt.Errorf("fetching page %d of assets: %w", page, err)

// BAD - No context about what failed
return fmt.Errorf("error: %w", err)
```

### Don't Double-Wrap
```go
// WRONG - Redundant wrapping
if err != nil {
    return fmt.Errorf("error: %w", fmt.Errorf("failed: %w", err))
}

// RIGHT - Single wrap with context
if err != nil {
    return fmt.Errorf("fetching assets: %w", err)
}
```

## Compliance Checklist

- [ ] No `_, _ =` or `, _ :=` patterns for errors
- [ ] All json.Marshal/Unmarshal errors handled
- [ ] All API call errors handled
- [ ] All file/temp directory errors handled
- [ ] Errors wrapped with `%w` for chain preservation
- [ ] Error messages include actionable context
- [ ] Type assertions use `ok` pattern and handle missing values
