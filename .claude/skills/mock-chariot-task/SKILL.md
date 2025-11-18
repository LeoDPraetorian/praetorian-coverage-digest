---
name: mock-chariot-task
description: Use when adding tests to Chariot capabilities that make CLI calls, HTTP requests, or DNS lookups - implements MockCollectors method with proper collector pattern instead of generic Go mocking, following nuclei/whois/edgar established patterns
---

# Mock Chariot Task

## Overview

Chariot capabilities use the **collector pattern** for deterministic testing. Collectors abstract external dependencies (CLI, HTTP, DNS) with mock implementations that return canned responses. Never use generic Go mocking - use the established collector system.

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

| Collector | Method | When to Use |
|-----------|--------|-------------|
| CLI | `MustRegisterCommand(regex, output)` | CLI command patterns |
| HTTP | `MustRegisterHTTP(method, url, response)` | Exact URL matching (recommended) |
| HTTP | `MustRegisterHTTPPattern(method, regex, response)` | URL patterns with wildcards |
| DNS | `MustRegisterResolve(domain, ips)` | Domain → IP mappings |
| DNS | `MustRegisterReverseLookup(ip, domains)` | IP → Domain mappings |

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

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using generic Go mocking (testify/mock) | Use collector pattern |
| MockCollectors in wrong file | Add to main capability file between Match/Invoke |
| Mock constructors in test file | Create separate `*_mock.go` file |
| Old mock dates causing empty graphs | Use recent dates (2025+) |
| HTTP pattern without escaping dots | Use `MustRegisterHTTP` for exact URLs |
| Interleaved test creation/assertions | Create all expected objects first, then assert |

## Reference Examples

**Complete implementations:**
- Nuclei: `capabilities/nuclei/nuclei.go:167-171` (MockCollectors), `nuclei_mock.go` (constructors)
- WHOIS: `capabilities/whois/whois.go:74-78`, `whois_mock.go`
- EDGAR: `capabilities/edgar/edgar.go:73-77`, `edgar_mock.go` (HTTP patterns, date filtering)

**Collector interfaces:**
- CLI: `collector/cli/cli.go`
- HTTP: `collector/http/http.go`
- DNS: `collector/dns/dns.go`

**Full documentation:** `modules/chariot/backend/pkg/tasks/collector/CLAUDE.md`
