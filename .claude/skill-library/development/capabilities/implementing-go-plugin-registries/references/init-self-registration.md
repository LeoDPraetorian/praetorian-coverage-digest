# init() Self-Registration

Best practices and pitfalls for automatic plugin registration using Go's init() function.

## Core Pattern

```go
// In plugin implementation file
package myplugin

import "myapp/internal/registry"

func init() {
    registry.Register("my-plugin", func() Plugin {
        return &MyPlugin{}
    })
}
```

## Why init() Registration?

| Benefit                   | Explanation                                                          |
| ------------------------- | -------------------------------------------------------------------- |
| **Automatic**             | No manual registration calls required                                |
| **Import-driven**         | Just import the package, plugin registers itself                     |
| **Compile-time**          | Missing plugins caught at build time (import errors)                 |
| **Decoupled**             | Plugin code doesn't need to know about main() or application startup |
| **Open-Closed Principle** | Add plugins without modifying existing registry or application code  |

## Best Practices

### 1. Minimize init() Logic

```go
✅ GOOD: Minimal init()
func init() {
    registry.Register("plugin", func() Plugin { return &MyPlugin{} })
}

❌ BAD: Complex init()
func init() {
    config := loadConfig()  // I/O in init()
    db := connectDB()       // Network in init()
    registry.Register("plugin", func() Plugin {
        return &MyPlugin{config, db}  // Closure over init() state
    })
}
```

**Why:** init() runs at package initialization (before main). Complex logic makes debugging hard and can cause import cycles or initialization order issues.

**Correct approach:** Defer I/O and state to plugin construction:

```go
func init() {
    registry.Register("plugin", func() Plugin {
        config := loadConfig()  // Lazy load during Get()
        return &MyPlugin{config}
    })
}
```

### 2. Use Factory Functions, Not Singletons

```go
✅ GOOD: Factory returns new instance
func init() {
    registry.Register("plugin", func() Plugin {
        return &MyPlugin{}  // Fresh instance each call
    })
}

❌ BAD: Closure over singleton
var instance = &MyPlugin{}  // Shared state

func init() {
    registry.Register("plugin", func() Plugin {
        return instance  // Same instance every call
    })
}
```

**Why:** Singleton pattern prevents concurrent plugin usage and makes testing difficult (shared state across tests).

### 3. One Plugin Per File

```go
// pkg/plugins/mongodb/mongodb.go
func init() {
    registry.Register("mongodb", func() Plugin { return &MongoDBPlugin{} })
}

// pkg/plugins/postgres/postgres.go
func init() {
    registry.Register("postgres", func() Plugin { return &PostgresPlugin{} })
}
```

**Why:** Clear ownership, easier to find/remove plugins, avoids init() execution order issues.

### 4. Use Blank Imports for Discovery

```go
// pkg/plugins/all/all.go - Centralizes plugin imports
package all

import (
    _ "myapp/pkg/plugins/mongodb"
    _ "myapp/pkg/plugins/postgres"
    _ "myapp/pkg/plugins/redis"
)
```

```go
// main.go - Single import activates all plugins
package main

import _ "myapp/pkg/plugins/all"

func main() {
    // All plugins registered automatically
    plugins := registry.List()
}
```

**Why:** Explicit list of active plugins, easy to enable/disable by commenting import.

## Common Pitfalls

### Pitfall 1: Import Cycles

```go
❌ BAD:
// registry/registry.go
import "myapp/plugins"  // Registry imports plugins

// plugins/mongodb.go
import "myapp/registry"  // Plugin imports registry

// Result: import cycle not allowed
```

**Solution:** Registry should NOT import plugins. Plugins import registry.

```go
✅ GOOD:
// registry/registry.go - No plugin imports

// plugins/mongodb.go - Imports registry
import "myapp/registry"
```

### Pitfall 2: Init() Order Dependency

```go
❌ BAD: Assuming order
// plugins/base.go
var baseConfig Config

func init() {
    baseConfig = loadBaseConfig()  // Runs first?
}

// plugins/derived.go
func init() {
    registry.Register("derived", func() Plugin {
        return &DerivedPlugin{baseConfig}  // Depends on base.go init()
    })
}
```

**Why:** Go does not guarantee init() execution order across packages.

**Solution:** Avoid cross-package init() dependencies. Use lazy initialization:

```go
✅ GOOD: Lazy loading
func init() {
    registry.Register("derived", func() Plugin {
        config := getBaseConfig()  // Load when needed
        return &DerivedPlugin{config}
    })
}
```

### Pitfall 3: Side Effects in init()

```go
❌ BAD: Global state modification
var httpClient *http.Client

func init() {
    httpClient = &http.Client{Timeout: 30 * time.Second}  // Global mutable state
    registry.Register("api", func() Plugin {
        return &APIPlugin{httpClient}  // Shared client
    })
}
```

**Why:** Shared mutable state across plugin instances causes race conditions.

**Solution:** Create resources per-instance:

```go
✅ GOOD: Per-instance resources
func init() {
    registry.Register("api", func() Plugin {
        client := &http.Client{Timeout: 30 * time.Second}  // Fresh client
        return &APIPlugin{client}
    })
}
```

### Pitfall 4: Testing Difficulty

```go
❌ BAD: Can't isolate tests
func init() {
    registry.Register("plugin", func() Plugin { return &MyPlugin{} })
}

// Tests pollute global registry
func TestPlugin(t *testing.T) {
    // Plugin already registered from init()
    // Can't test in isolation
}
```

**Solution:** Provide Reset() for testing:

```go
// registry.go
func Reset() {
    mu.Lock()
    defer mu.Unlock()
    plugins = make(map[string]PluginFactory)
}

// plugin_test.go
func TestPlugin(t *testing.T) {
    registry.Reset()  // Clean slate
    // Now test in isolation
}
```

## Production Examples

### go-cicd (Praetorian)

```go
// pkg/plugins/github/injection/injection.go
func init() {
    registry.RegisterPlugin("github", "actions-injection", func() plugins.Plugin {
        return New()  // Factory function
    })
}
```

**Pattern:** Platform-specific registration with descriptive names.

### fingerprintx (Praetorian)

```go
// pkg/plugins/mongodb/mongodb.go
func init() {
    plugins.Register("mongodb", &MongoDBPlugin{})  // Singleton (acceptable for stateless)
}
```

**Pattern:** Simple registration for stateless plugins.

### golangci-lint (18K Stars)

```go
// pkg/golinters/revive.go
func init() {
    linter.Register("revive", linter.Config{
        Linter: goanalysis.NewLinter("revive", ...),
    })
}
```

**Pattern:** Structured config passed to registry.

## When NOT to Use init()

| Scenario                        | Why Avoid init()                       | Alternative                     |
| ------------------------------- | -------------------------------------- | ------------------------------- |
| Plugin requires configuration   | init() runs before config is available | Register in main() after config |
| Conditional registration        | init() always runs, can't skip         | Explicit registration with if   |
| Dynamic plugin loading          | init() is compile-time, not runtime    | Use plugin.Open() for .so files |
| Need registration order control | init() order is undefined              | Manual registration in main()   |

## Related

- [Registry Implementation](registry-implementation.md) - Full registry code
- [Testing Strategies](testing-strategies.md) - Test patterns with Reset()
- [Factory vs Singleton](factory-vs-singleton.md) - Instance creation patterns
- [go-cicd Registry Analysis](go-cicd-registry-analysis.md) - Production example
