---
name: enforcing-go-capability-architecture
description: Use when designing Go capability/plugin architectures for standalone open-source security tools (scanners, probes, detectors, generators), organizing extensible tool architectures, or porting Python plugin systems to Go - provides file structure standards based on complexity tiers, interface patterns, and registry conventions
allowed-tools: "Read, Write, Edit, Bash, Grep, Glob"
---

# Go Capability Information Architecture

## Overview

Standardized file and directory organization patterns for Go capability/plugin systems. Prevents the "where does this capability go?" problem.

**Core Principle**: In Go, directories create packages - not organization. Create a directory only when you need a new package. Let capability count drive structure decisions.

## Quick Reference

| Tier | Capability Count | Pattern        | Key Feature               |
| ---- | ---------------- | -------------- | ------------------------- |
| 1    | <10              | Single package | Flat structure            |
| 2    | 10-30            | Categorized    | Subdirectories by type    |
| 3    | 30-100           | Registry       | init() self-registration  |
| 4    | 100+             | Multi-package  | Separate capability types |

**For code structure standards:** [Code Structure Standards](references/code-structure-standards.md)

## When to Use

**Use when:**

- Designing a new capability/plugin system in Go
- Porting Python plugin architecture (like garak) to Go
- Refactoring capability directories with 10+ implementations

**Symptoms this addresses:**

- "Registry is becoming monolithic"
- "Can't find capability implementations quickly"
- "Python patterns don't feel right in Go"

**MANDATORY: Use TodoWrite before starting** to track organization decisions.

## Complexity-Based Organization Tiers

### Tier 1: Single Package (<10 capabilities)

```text
pkg/probes/
├── probe.go          # Interface + base + registry
├── blank.go          # Implementation
└── probe_test.go     # Tests
```

**When**: Starting out, simple interfaces
**Details**: [Tier 1 Reference](references/tier-1-single-package.md)

### Tier 2: Categorized Package (10-30 capabilities)

```text
pkg/probes/
├── probe.go          # Interface
├── test/             # Test category
├── jailbreak/        # Category subdirectory
└── injection/        # Category subdirectory
```

**When**: Multiple logical categories emerge
**Details**: [Tier 2 Reference](references/tier-2-categorized.md)

### Tier 3: Registry Pattern (30-100 capabilities)

```text
pkg/probes/
├── probe.go          # Core interface
├── registry/         # Global registry
├── base/             # Shared helpers
├── test/
└── jailbreak/
```

**When**: Need dynamic discovery, self-registration
**Details**: [Tier 3 Reference](references/tier-3-registry.md)

### Tier 4: Multi-Package (100+ capabilities)

```text
pkg/
├── capability/       # Core abstractions
├── registry/         # Central registry
├── probes/           # Prober interface + impls
├── generators/       # Generator interface + impls
└── detectors/        # Detector interface + impls
```

**When**: Multiple capability types
**Details**: [Tier 4 Reference](references/tier-4-multipackage.md)

## Interface Design

**Limits**: 1-3 methods ideal, 5 max. Define consumer-side.

```text
Methods needed?
├─ 1-3 → Ship it ✅
├─ 4-5 → Review ⚠️
└─ 6+  → Split ❌
```

**Details**: [Interface Design](references/interface-design.md)

## Registry Pattern

```go
// Self-registration via init()
func init() {
    registry.Register("dan.Dan_11_0", NewDan110)
}
```

**Details**: [Registry Implementation](references/registry-patterns.md)

## Subdirectory Thresholds

| Subdirectory  | Threshold | Purpose              |
| ------------- | --------- | -------------------- |
| `test/`       | 2+ caps   | Test implementations |
| `{category}/` | 5+ caps   | Logical grouping     |
| `registry/`   | 10+ caps  | Registration infra   |

## Migration Triggers

| Migration | Trigger                                 |
| --------- | --------------------------------------- |
| Tier 1→2  | 10+ capability files                    |
| Tier 2→3  | 30+ files OR need dynamic discovery     |
| Tier 3→4  | 100+ files OR multiple capability types |

**Migration guides**: [1→2](references/tier-1-to-2-migration.md), [2→3](references/tier-2-to-3-migration.md), [3→4](references/tier-3-to-4-migration.md)

## Naming Conventions

**Directories**: Plural, lowercase (`probes/`, `openai/`)
**Files**: Lowercase, snake_case (`probe.go`, `string_detector.go`)

**Details**: [Naming Patterns](references/naming-patterns.md)

## HTTP Client Standards

**Core Principle**: Use stdlib `net/http` with thin wrapper + functional options. NO external HTTP libraries.

### The Pattern

```go
// Client wraps http.Client with convenience methods
type Client struct {
    Client  *http.Client
    BaseURL string
    Headers map[string]string
}

// Functional options for configuration
type Option func(*Client)

func NewClient(opts ...Option) *Client {
    c := &Client{
        Client:  &http.Client{},
        Headers: make(map[string]string),
    }
    for _, opt := range opts {
        opt(c)
    }
    return c
}
```

### Reference Implementations

**Chariot Backend**: `modules/chariot/backend/pkg/lib/web/http.go`

- HTTPClient wrapping `*http.Client`
- `Request()` with automatic body handling (io.Reader, []byte, string, JSON)
- Generic typed responses `Request[T]()`
- Options: `WithTransport`, `WithClientOverwriteDisabled`

**Venator**: `venator/pkg/lib/http/client.go`

- Client with BaseURL, Headers, Timeout
- Options: `WithBaseURL`, `WithBearerToken`, `WithTimeout`, `WithHeader`
- Methods: `Get`, `Post`, `Put`, `Delete`, `Do`
- `Response.JSON()` for unmarshaling

### Requirements Checklist

- [ ] Use project's shared HTTP client (or create following this pattern)
- [ ] Functional options for configuration
- [ ] Context-aware methods (accept `context.Context`)
- [ ] Generic JSON response handling
- [ ] DO NOT add external HTTP libraries (go-resty, retryablehttp, etc.)
- [ ] DO NOT create per-capability HTTP clients

### Why Not External Libraries?

1. **Dependency sprawl** - Each capability adding different libraries
2. **Inconsistent patterns** - Different error handling across codebase
3. **Harder to mock** - External types harder to test
4. **Proven at scale** - Chariot backend has 66+ files using stdlib pattern

### Testing Pattern

Use `net/http/httptest` for mocking:

```go
func TestCapability(t *testing.T) {
    // Create test server
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte(`{"status": "ok"}`))
    }))
    defer server.Close()

    // Use test server URL
    client := NewClient(WithBaseURL(server.URL))
    resp, err := client.Get(context.Background(), "/endpoint")

    assert.NoError(t, err)
    assert.Equal(t, 200, resp.StatusCode)
}
```

### Example Usage

```go
// In capability package
type APICapability struct {
    client *http.Client
}

func NewAPICapability() *APICapability {
    return &APICapability{
        client: http.NewClient(
            http.WithBaseURL("https://api.example.com"),
            http.WithTimeout(30 * time.Second),
            http.WithBearerToken(os.Getenv("API_TOKEN")),
        ),
    }
}

func (c *APICapability) Execute(ctx context.Context, target string) (*Result, error) {
    resp, err := c.client.Get(ctx, fmt.Sprintf("/scan/%s", target))
    if err != nil {
        return nil, fmt.Errorf("API request failed: %w", err)
    }

    var result Result
    if err := resp.JSON(&result); err != nil {
        return nil, fmt.Errorf("decoding response: %w", err)
    }

    return &result, nil
}
```

## Common Mistakes

1. **Fat interfaces** - Split into composed small interfaces
2. **Interface in implementation package** - Define consumer-side
3. **Directories for organization** - Use files if not a real package

**Details**: [Common Mistakes](references/common-mistakes.md)

## Gold Standard: Venator

331 capabilities organized as Tier 4 multi-package architecture.

**Details**: [Venator Architecture](references/venator-architecture.md)

## Additional References

- [Embedded Resources](references/embedded-resources.md)
- [Testing Organization](references/testing-patterns.md)
- [Code Structure Standards](references/code-structure-standards.md)

## Key Sources

- [HashiCorp go-plugin](https://github.com/hashicorp/go-plugin)
- [Go Interface Segregation](https://dave.cheney.net/2016/08/20/solid-go-design)
- [Go Project Structure](https://go.dev/doc/modules/layout)
