---
name: implementing-go-plugin-registries
description: Use when implementing Go plugin registries (30-100+ plugins), thread-safe init() self-registration
allowed-tools: "Read, Write, Edit, Bash, Grep, Glob"
---

# Go Plugin Registry Implementation

## Overview

Thread-safe plugin registry pattern with init() self-registration for Go plugin systems with 30-100+ plugins. Enables dynamic discovery, concurrent access, and automatic registration.

**Core Principle**: Factory pattern + sync.RWMutex + init() self-registration = scalable, thread-safe plugin architecture.

## Quick Reference

| Component     | Purpose                 | Key Feature               |
| ------------- | ----------------------- | ------------------------- |
| Factory       | New instance per Get()  | Concurrent usage          |
| sync.RWMutex  | Thread-safe registry    | Many readers, few writers |
| init()        | Self-registration       | Automatic on import       |
| sorted List() | Deterministic discovery | Alphabetical order        |
| Reset()       | Testing isolation       | Clean slate per test      |

**For complete registry implementation:** [references/registry-implementation.md](references/registry-implementation.md)

## When to Use

**Use when:**

- Implementing plugin systems with 30-100+ plugins (Tier 3 from `enforcing-go-capability-architecture`)
- Need dynamic discovery (runtime plugin listing without hardcoded imports)
- Multiple teams contributing plugins independently
- Porting Python dict-based plugin registries to Go
- Concurrent plugin execution required

**Symptoms this addresses:**

- "Plugin registration is error-prone and manual"
- "Data races in plugin registry under load"
- "Can't list available plugins at runtime"
- "Singleton pattern prevents concurrent plugin usage"

**MANDATORY: Use TodoWrite before starting** to track implementation phases.

## Thread-Safe Registry Pattern

### Core Implementation

```go
package registry

import (
    "fmt"
    "sort"
    "sync"
)

var (
    mu      sync.RWMutex
    plugins = make(map[string]PluginFactory)
)

type PluginFactory func() Plugin

// Register adds a plugin factory (called from init())
func Register(name string, factory PluginFactory) {
    mu.Lock()
    defer mu.Unlock()
    plugins[name] = factory
}

// Get returns a new plugin instance
func Get(name string) (Plugin, error) {
    mu.RLock()
    defer mu.RUnlock()

    factory, ok := plugins[name]
    if !ok {
        return nil, fmt.Errorf("unknown plugin: %s", name)
    }

    return factory(), nil  // New instance each call
}

// List returns all registered plugin names (sorted)
func List() []string {
    mu.RLock()
    defer mu.RUnlock()

    names := make([]string, 0, len(plugins))
    for name := range plugins {
        names = append(names, name)
    }
    sort.Strings(names)
    return names
}

// Reset clears the registry (testing only)
func Reset() {
    mu.Lock()
    defer mu.Unlock()
    plugins = make(map[string]PluginFactory)
}
```

**Key features:**

- **Factory returns new instances** - NOT singleton (enables concurrent usage)
- **Thread-safe** - sync.RWMutex protects map access (many readers, few writers)
- **Sorted listing** - Deterministic discovery (alphabetical order)
- **Testing support** - Reset() for test isolation

## init() Self-Registration

```go
// In plugin implementation file
package myplugin

import "myapp/internal/registry"

func init() {
    registry.Register("my-plugin", func() Plugin {
        return &MyPlugin{}
    })
}

type MyPlugin struct {}

func (p *MyPlugin) Execute() error {
    // Plugin logic
}
```

**Benefits:**

- **Automatic registration** - No manual calls required
- **Import-driven discovery** - Just import the package
- **Compile-time validation** - Missing plugins caught at build

**For init() best practices and pitfalls:** [references/init-self-registration.md](references/init-self-registration.md)

## Discovery Patterns

### List All Plugins

```go
names := registry.List()
for _, name := range names {
    plugin, _ := registry.Get(name)
    fmt.Printf("Found: %s\n", plugin.Name())
}
```

### Get Specific Plugin

```go
if plugin, err := registry.Get("my-plugin"); err == nil {
    plugin.Execute()
}
```

### Filter by Criteria (Optional)

```go
func Filter(predicate func(Plugin) bool) []Plugin {
    // Return matching plugins
}
```

**For advanced filtering and wildcard discovery:** [references/discovery-patterns.md](references/discovery-patterns.md)

## Why Factory Pattern (Not Singleton)

**Factory pattern (new instance per Get()) enables:**

1. **Concurrent plugin usage** - Each caller gets own instance
2. **Stateful plugins** - Each instance has own state
3. **Testing isolation** - Fresh instance per test

**Anti-pattern (Singleton):**

```go
❌ BAD:
var instance *Plugin  // Shared across all callers

func Get(name string) Plugin {
    return instance  // Race conditions!
}
```

**Correct (Factory):**

```go
✅ GOOD:
func Get(name string) (Plugin, error) {
    factory := plugins[name]
    return factory(), nil  // New instance each call
}
```

**For complete singleton vs factory comparison:** [references/factory-vs-singleton.md](references/factory-vs-singleton.md)

## Production Examples

### fingerprintx (Praetorian, 50+ Plugins)

**Source:** `modules/fingerprintx/pkg/plugins/plugin.go` (if exists)

- Service detection plugins self-register via init()
- Factory pattern: `func() Plugin { return &MongoDBPlugin{} }`
- Used in production for network scanning
- Thread-safe concurrent execution

### golangci-lint (18K Stars, 100+ Linters)

**Source:** `https://github.com/golangci/golangci-lint`

- Each linter registers via init() in separate file
- Central registry orchestrates parallel execution
- Scales to 100+ plugins without performance degradation
- Pattern: `/pkg/golinters/{linter_name}.go` with init()

**For golangci-lint case study:** [references/golangci-lint-case-study.md](references/golangci-lint-case-study.md)

### go-cicd (Our Implementation)

**Source:** `go-gato/go-cicd/internal/registry/registry.go`

- Dual registry: platforms AND plugins
- Thread-safe with sync.RWMutex
- Factory pattern for both types
- Discovery: `List()`, `Get()`, `GetPlugins(platform)`
- Plugin interface: `Plugin.Detect(ctx, graph)` for vulnerability detection

**For go-cicd registry analysis:** [references/go-cicd-registry-analysis.md](references/go-cicd-registry-analysis.md)

## Testing Pattern

```go
func TestRegistry(t *testing.T) {
    // Clean slate for each test
    registry.Reset()

    // Register test plugin
    registry.Register("test", func() Plugin {
        return &TestPlugin{}
    })

    // Verify registration
    plugin, err := registry.Get("test")
    require.NoError(t, err)
    assert.Equal(t, "test", plugin.Name())
}
```

**Key principles:**

- **Reset() before each test** - Prevents cross-test contamination
- **Factory verification** - Test that Get() returns NEW instances
- **Concurrent access tests** - Verify thread safety under load

**For comprehensive testing strategies:** [references/testing-strategies.md](references/testing-strategies.md)

## Key Principles

1. **Factory returns new instances** - NOT singleton (enables concurrent usage)
2. **Thread-safe with RWMutex** - Many readers (Get, List), few writers (Register)
3. **Registration in init()** - Automatic when package imported (no manual setup)
4. **Sorted listing** - Deterministic discovery (alphabetical order)
5. **Testing support** - Reset() for test isolation

## Relation to Tier 3 Pattern

From `enforcing-go-capability-architecture` skill:

- **Tier 3**: 30-100 capabilities need registry pattern
- **Self-registration** via init() for dynamic discovery
- **go-cicd** targets 18-24 plugins (3 platforms × 6-8 plugins) = Tier 3

**Cross-reference:** `.claude/skill-library/development/capabilities/enforcing-go-capability-architecture/SKILL.md` (Tier 3 Registry Pattern section)

## Common Mistakes

1. **Singleton pattern** - Use factory (new instance per Get())
2. **No thread safety** - Always use sync.RWMutex
3. **Manual registration** - Use init() self-registration
4. **Unordered listing** - Sort plugin names before returning
5. **No test Reset()** - Causes cross-test contamination

**For complete anti-patterns and fixes:** [references/common-mistakes.md](references/common-mistakes.md)

## Migration from Tier 2 → Tier 3

**Trigger:** 30+ plugins OR need dynamic discovery

**Steps:**

1. Extract registry to separate package
2. Convert manual registration to init()
3. Add thread safety (sync.RWMutex)
4. Implement factory pattern
5. Add sorted listing

**For detailed migration guide:** [references/tier-2-to-3-migration.md](references/tier-2-to-3-migration.md)

## Additional References

- [Registry Implementation](references/registry-implementation.md) - Complete code
- [init() Self-Registration](references/init-self-registration.md) - Best practices
- [Discovery Patterns](references/discovery-patterns.md) - Advanced filtering
- [Factory vs Singleton](references/factory-vs-singleton.md) - Pattern comparison
- [Testing Strategies](references/testing-strategies.md) - Comprehensive tests
- [golangci-lint Case Study](references/golangci-lint-case-study.md) - 100+ linters
- [go-cicd Registry Analysis](references/go-cicd-registry-analysis.md) - Dual registry
- [Common Mistakes](references/common-mistakes.md) - Anti-patterns
- [Tier 2→3 Migration](references/tier-2-to-3-migration.md) - Migration guide

## Key Sources

- fingerprintx: `modules/fingerprintx/pkg/plugins/` (if exists)
- golangci-lint: https://github.com/golangci/golangci-lint
- go-cicd registry: `go-gato/go-cicd/internal/registry/registry.go`
- enforcing-go-capability-architecture: `.claude/skill-library/development/capabilities/enforcing-go-capability-architecture/SKILL.md`
- Research: `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/github.md`
