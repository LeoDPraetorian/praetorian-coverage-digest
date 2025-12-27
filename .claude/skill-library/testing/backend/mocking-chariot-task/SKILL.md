---
name: mocking-chariot-task
description: Use when adding tests to Chariot capabilities that make CLI calls, HTTP requests, or DNS lookups - implements MockCollectors method with proper collector pattern instead of generic Go mocking, following nuclei/whois/edgar established patterns
allowed-tools: "Read, Write, Edit, Bash, Grep"
---

# Mock Chariot Task

## Overview

Chariot capabilities use the **collector pattern** for deterministic testing. Collectors abstract external dependencies (CLI, HTTP, DNS) with mock implementations that return canned responses. Never use generic Go mocking - use the established collector system.

### Test Doubles Terminology

**Note on terminology**: Per Martin Fowler's test doubles taxonomy, our "mock collectors" are technically **Fakes** - working implementations with shortcuts (canned responses instead of real network calls). This differs from true Mocks (behavior verification with expectations) or Stubs (minimal implementations returning hardcoded values). We use "mock" in filenames (`*_mock.go`) for consistency with existing codebase conventions, but understand that these are **working test implementations** that follow the collector interface contract.

## When to Use

Use when:

- Adding tests to existing Chariot capability
- Capability makes CLI calls (exec.Command)
- Capability makes HTTP requests
- Capability performs DNS lookups (net.LookupAddr)
- Need deterministic tests without external dependencies

Don't use for:

- Pure business logic (no external calls)
- Integration tests requiring real services

## Three-File Pattern

**1. Main capability file** (`capability.go`):

```go
// Add between Match() and Invoke() methods
func (c *YourCapability) MockCollectors(target *model.TargetType) []xyz.XYZOption {
    return []xyz.XYZOption{
        xyz.WithCLICollector(NewMockYourCapabilityCLICollector(target)),
        xyz.WithHTTPCollector(NewMockYourCapabilityHTTPCollector(target)),
        xyz.WithDNSCollector(NewMockYourCapabilityDNSCollector(target)),
    }
}
```

**2. Mock file** (`capability_mock.go`):

```go
// Mock capability constructor
func NewMockYourCapability(job model.Job, target *model.TargetType) model.Capability {
    return NewYourCapability(
        job,
        target,
        xyz.WithCLICollector(NewMockYourCapabilityCLICollector(target)),
        xyz.WithHTTPCollector(NewMockYourCapabilityHTTPCollector(target)),
    )
}

// Mock CLI collector with command registration
func NewMockYourCapabilityCLICollector(target *model.TargetType) cli.CLICollector {
    c := cli.NewMockCLICollector()
    c.MustRegisterCommand(`nmap -sV .*`, generateNmapOutput(target))
    return c
}

// Mock HTTP collector with URL registration
func NewMockYourCapabilityHTTPCollector(target *model.TargetType) http.HTTPCollector {
    c := http.NewMockHTTPCollector()
    // Exact URL (no escaping needed)
    c.MustRegisterHTTP("GET", "https://api.example.com/data", http.CannedHTTPResponse{
        StatusCode: 200,
        Body:       generateAPIResponse(target),
    })
    return c
}

// Helper to generate target-specific mock data
func generateNmapOutput(target *model.TargetType) string {
    return fmt.Sprintf("PORT STATE SERVICE\n22/tcp open ssh\n")
}
```

**3. Test file** (`capability_mock_test.go`):

```go
func TestYourCapability(t *testing.T) {
    asset := model.NewAsset("acceptance.com", "192.168.1.1")
    port := model.NewPort("tcp", 22, &asset)
    job := model.NewJob("your-capability", &port)

    task := NewMockYourCapability(job, &port)
    aws := mock.NewMockAWS("gladiator@praetorian.com")

    invoker := mock.NewInvoker(aws, task)
    err := invoker.Invoke()
    require.NoError(t, err)

    // Create expected objects
    expectedRisk := model.NewRisk(&asset, "vuln-name", model.TriageHigh)

    // Perform assertions
    assertions.GraphItemExists(t, aws, &expectedRisk)
    assertions.GraphSize(t, aws, 1)
}
```

## Mock Registration Quick Reference

| Collector | Method                                             | When to Use                      |
| --------- | -------------------------------------------------- | -------------------------------- |
| CLI       | `MustRegisterCommand(regex, output)`               | CLI command patterns             |
| HTTP      | `MustRegisterHTTP(method, url, response)`          | Exact URL matching (recommended) |
| HTTP      | `MustRegisterHTTPPattern(method, regex, response)` | URL patterns with wildcards      |
| DNS       | `MustRegisterResolve(domain, ips)`                 | Domain → IP mappings             |
| DNS       | `MustRegisterReverseLookup(ip, domains)`           | IP → Domain mappings             |

## HTTP URL Matching: Exact vs Pattern

**Prefer exact matching** (no escaping):

```go
// ✅ RECOMMENDED - Exact URL
c.MustRegisterHTTP("GET", "https://api.example.com/data", response)

// ❌ AVOID - Pattern when exact works
c.MustRegisterHTTPPattern("GET", `https://api\.example\.com/data`, response)
```

**Use patterns only when needed**:

```go
// ✅ CORRECT - Dynamic segments
c.MustRegisterHTTPPattern("GET", `https://api\.example\.com/users/.*`, response)
c.MustRegisterHTTPPattern("GET", `https://api\.example\.com/search\?q=.*`, response)
```

## HTTP Collector Quick Reference

**Exact URL matching** (preferred when possible):

```go
c.MustRegisterHTTP("GET", "https://api.example.com/data", response)
```

**Pattern matching** (for dynamic URLs):

```go
c.MustRegisterHTTPPattern("GET", `https://api\.example\.com/users/.*`, response)
```

**Common patterns:**

```go
// Query parameters
c.MustRegisterHTTPPattern("GET", `https://api\.example\.com/.*\?id=\d+`, response)

// Path segments
c.MustRegisterHTTPPattern("GET", `https://api\.example\.com/.*/details`, response)
```

**Multiple entity types with correct JSON fields:**

```go
// Entity types and their JSON reference field names (deterministic order)
entities := []struct {
    name    string
    refName string
}{
    {"orgs", "orgRef"},
    {"customers", "customerRef"},
    {"asns", "asnRef"},
    {"nets", "netRef"},
}

for _, entity := range entities {
    // Use pattern for dynamic org name
    pattern := fmt.Sprintf(`https://api\.example\.com/%s;name=.*`, entity.name)

    // JSON response uses correct field name for each entity type
    body := fmt.Sprintf(`{
        "%s": {
            "%s": [
                {"@handle": "MOCK-%s-1", "@name": "Example Org 1"},
                {"@handle": "MOCK-%s-2", "@name": "Example Org 2"}
            ]
        }
    }`, entity.name, entity.refName, entity.name, entity.name)

    c.MustRegisterHTTPPattern("GET", pattern, http.CannedHTTPResponse{
        StatusCode: 200,
        Body:       body,
    })
}
```

## Testing Failure Modes

Mock collectors should test both success and failure scenarios to ensure proper error handling:

### HTTP Error Responses

```go
// Test 500 Internal Server Error
c.MustRegisterHTTP("GET", "https://api.example.com/data", http.CannedHTTPResponse{
    StatusCode: 500,
    Body:       `{"error": "internal server error"}`,
})

// Test 404 Not Found
c.MustRegisterHTTP("GET", "https://api.example.com/missing", http.CannedHTTPResponse{
    StatusCode: 404,
    Body:       `{"error": "not found"}`,
})

// Test 429 Rate Limit
c.MustRegisterHTTP("GET", "https://api.example.com/throttled", http.CannedHTTPResponse{
    StatusCode: 429,
    Body:       `{"error": "rate limit exceeded"}`,
})
```

### Timeout Handling

```go
// Test timeout scenario (capability should handle gracefully)
// Mock collector returns response, but capability may have timeout logic
c.MustRegisterHTTP("GET", "https://api.example.com/slow", http.CannedHTTPResponse{
    StatusCode: 200,
    Body:       `{"data": "response"}`,
    // Note: Actual timeout testing may require capability-level context cancellation
})
```

### Empty and Malformed Responses

```go
// Empty response body
c.MustRegisterHTTP("GET", "https://api.example.com/empty", http.CannedHTTPResponse{
    StatusCode: 200,
    Body:       "",
})

// Malformed JSON
c.MustRegisterHTTP("GET", "https://api.example.com/malformed", http.CannedHTTPResponse{
    StatusCode: 200,
    Body:       `{"incomplete": "json"`,  // Missing closing brace
})

// Unexpected data structure
c.MustRegisterHTTP("GET", "https://api.example.com/unexpected", http.CannedHTTPResponse{
    StatusCode: 200,
    Body:       `{"wrong": "schema", "missing": "expected_field"}`,
})
```

### CLI Command Failures

```go
// Command exits with error
c.MustRegisterCommand(`failing-command.*`, "Error: command failed\nexit status 1")

// Empty output
c.MustRegisterCommand(`empty-command.*`, "")

// Malformed output
c.MustRegisterCommand(`malformed-command.*`, "Not the expected format")
```

### Test Assertions for Failures

```go
// Verify capability handles errors gracefully
func TestCapabilityHTTPError(t *testing.T) {
    asset := model.NewAsset("test.com", "192.168.1.1")
    job := model.NewJob("capability-name", &asset)

    // Create mock with error response
    mockHTTP := http.NewMockHTTPCollector()
    mockHTTP.MustRegisterHTTP("GET", "https://api.example.com/data", http.CannedHTTPResponse{
        StatusCode: 500,
        Body:       `{"error": "server error"}`,
    })

    task := NewYourCapability(job, &asset, xyz.WithHTTPCollector(mockHTTP))
    aws := mock.NewMockAWS("test@praetorian.com")

    invoker := mock.NewInvoker(aws, task)
    err := invoker.Invoke()

    // Verify error is handled (not propagated as panic)
    require.NoError(t, err)

    // Verify no spurious graph items created
    assertions.GraphSize(t, aws, 0)
}
```

## Common Mistakes

| Mistake                                 | Fix                                              |
| --------------------------------------- | ------------------------------------------------ |
| Using generic Go mocking (testify/mock) | Use collector pattern                            |
| MockCollectors in wrong file            | Add to main capability file between Match/Invoke |
| Mock constructors in test file          | Create separate `*_mock.go` file                 |
| Old mock dates causing empty graphs     | Use recent dates (2025+)                         |
| HTTP pattern without escaping dots      | Use `MustRegisterHTTP` for exact URLs            |
| Interleaved test creation/assertions    | Create all expected objects first, then assert   |

## Reference Examples

**Complete implementations:**

- Nuclei: `capabilities/nuclei/nuclei.go` - `func (n *Nuclei) MockCollectors(port *model.Port)`, `nuclei_mock.go` (constructors)
- WHOIS: `capabilities/whois/whois.go` - `func (task *Whois) MockCollectors(asset *model.Asset)`, `whois_mock.go`
- EDGAR: `capabilities/edgar/edgar.go` - `func (task *EDGAR) MockCollectors(preseed *model.Preseed)`, `edgar_mock.go` (HTTP patterns, date filtering)

**Collector interfaces:**

- CLI: `collector/cli/cli.go`
- HTTP: `collector/http/http.go`
- DNS: `collector/dns/dns.go`

**Full documentation:** `modules/chariot/backend/pkg/tasks/collector/CLAUDE.md`

---

## Maintenance Note: Why No Line Numbers?

**This skill uses method signatures instead of static line numbers for code references.**

**Rationale:**
- Line numbers drift with every code change (inserts, deletions, refactors)
- Creates maintenance debt to keep skills synchronized
- Method signatures are stable across refactors
- Grep-friendly: `rg "func.*MockCollectors"` finds the method instantly

**Pattern for references:**
```markdown
✅ GOOD: file.go - func (c *Capability) MethodName(...)
✅ GOOD: file.go (between Match() and Invoke() methods)
❌ AVOID: file.go:123-127 (will become outdated)
```

**When updating this skill:** Preserve method-based references, avoid adding line numbers
