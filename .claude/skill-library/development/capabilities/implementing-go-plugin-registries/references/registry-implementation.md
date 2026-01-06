# Registry Implementation

Complete production-ready Go plugin registry with thread-safe access, factory pattern, and self-registration.

## Complete Registry Code

```go
// Package registry provides a thread-safe plugin registry with factory pattern.
// This is the core pattern used in production systems like fingerprintx, golangci-lint, and go-cicd.
package registry

import (
    "fmt"
    "sort"
    "sync"
)

// -----------------------------------------------------------------------------
// Plugin Interface - Define what plugins must implement
// -----------------------------------------------------------------------------

// Plugin is the interface that all plugins must implement.
// Extend this with domain-specific methods for your use case.
type Plugin interface {
    // Name returns the unique identifier for this plugin
    Name() string

    // Execute runs the plugin's core functionality
    // Customize the signature based on your domain (e.g., Execute(ctx, target))
    Execute() error
}

// -----------------------------------------------------------------------------
// Factory Type - Returns new instances for concurrent usage
// -----------------------------------------------------------------------------

// PluginFactory is a function that creates new plugin instances.
// This enables concurrent usage - each caller gets their own instance.
type PluginFactory func() Plugin

// -----------------------------------------------------------------------------
// Package-level Registry State - Thread-safe with sync.RWMutex
// -----------------------------------------------------------------------------

var (
    // mu protects concurrent access to the plugins map.
    // RWMutex allows many concurrent readers (Get, List) but exclusive writers (Register).
    mu sync.RWMutex

    // plugins maps plugin names to their factory functions.
    // Factory pattern: we store functions that CREATE plugins, not plugin instances.
    plugins = make(map[string]PluginFactory)
)

// -----------------------------------------------------------------------------
// Core Registry Functions
// -----------------------------------------------------------------------------

// Register adds a plugin factory to the registry.
// Called from init() in each plugin's package for automatic registration.
//
// Example:
//
//     func init() {
//         registry.Register("my-plugin", func() Plugin {
//             return &MyPlugin{}
//         })
//     }
func Register(name string, factory PluginFactory) {
    mu.Lock()
    defer mu.Unlock()

    // Optional: detect duplicate registration (see Customization section)
    if _, exists := plugins[name]; exists {
        // Choice 1: Panic (fail fast, good for development)
        // panic(fmt.Sprintf("plugin already registered: %s", name))

        // Choice 2: Log warning (permissive, good for testing)
        // log.Printf("WARNING: overwriting plugin: %s", name)

        // Choice 3: Silent overwrite (current behavior)
    }

    plugins[name] = factory
}

// Get returns a new instance of the named plugin.
// Returns an error if the plugin is not registered.
//
// Thread-safe: Uses RLock for concurrent read access.
// Factory pattern: Creates NEW instance each call (not singleton).
func Get(name string) (Plugin, error) {
    mu.RLock()
    defer mu.RUnlock()

    factory, ok := plugins[name]
    if !ok {
        return nil, fmt.Errorf("unknown plugin: %s", name)
    }

    // Create and return a new instance
    return factory(), nil
}

// List returns all registered plugin names in sorted order.
// Sorting ensures deterministic discovery (important for testing and CLI output).
//
// Thread-safe: Uses RLock for concurrent read access.
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

// Count returns the number of registered plugins.
// Useful for health checks and metrics.
func Count() int {
    mu.RLock()
    defer mu.RUnlock()
    return len(plugins)
}

// Reset clears all registered plugins.
// USE ONLY IN TESTS - ensures test isolation.
//
// Example:
//
//     func TestMyPlugin(t *testing.T) {
//         registry.Reset()  // Clean slate
//         defer registry.Reset()  // Cleanup after
//         // ... test code
//     }
func Reset() {
    mu.Lock()
    defer mu.Unlock()
    plugins = make(map[string]PluginFactory)
}
```

## Plugin Interface Definition

Extend the base interface for your domain:

```go
// For security scanning (like fingerprintx)
type SecurityPlugin interface {
    Plugin
    Scan(ctx context.Context, target string) ([]Finding, error)
    Severity() string
}

// For CI/CD analysis (like go-cicd)
type AnalysisPlugin interface {
    Plugin
    Detect(ctx context.Context, graph *Graph) ([]Vulnerability, error)
    Platform() string  // "github", "gitlab", "jenkins"
}

// For linting (like golangci-lint)
type LinterPlugin interface {
    Plugin
    Lint(ctx context.Context, files []string) ([]Issue, error)
    Fix() bool  // Whether this linter can auto-fix
}
```

## Usage Example

```go
package main

import (
    "fmt"
    "log"

    "myapp/internal/registry"

    // Import plugins - triggers init() registration
    _ "myapp/internal/plugins/http"
    _ "myapp/internal/plugins/ssh"
    _ "myapp/internal/plugins/mongodb"
)

func main() {
    // List all registered plugins
    fmt.Println("Available plugins:")
    for _, name := range registry.List() {
        fmt.Printf("  - %s\n", name)
    }

    // Get and execute a specific plugin
    plugin, err := registry.Get("http")
    if err != nil {
        log.Fatalf("Plugin not found: %v", err)
    }

    if err := plugin.Execute(); err != nil {
        log.Fatalf("Plugin failed: %v", err)
    }

    // Concurrent execution of all plugins
    var wg sync.WaitGroup
    for _, name := range registry.List() {
        wg.Add(1)
        go func(pluginName string) {
            defer wg.Done()

            // Each goroutine gets its OWN instance (factory pattern)
            p, _ := registry.Get(pluginName)
            _ = p.Execute()
        }(name)
    }
    wg.Wait()
}
```

## Customization Points

### 1. Adding Metadata to Registration

```go
// Extended factory with metadata
type PluginInfo struct {
    Factory     PluginFactory
    Description string
    Version     string
    Tags        []string
}

var plugins = make(map[string]PluginInfo)

func Register(name string, info PluginInfo) {
    mu.Lock()
    defer mu.Unlock()
    plugins[name] = info
}

// Filter by tag
func ListByTag(tag string) []string {
    mu.RLock()
    defer mu.RUnlock()

    var names []string
    for name, info := range plugins {
        for _, t := range info.Tags {
            if t == tag {
                names = append(names, name)
                break
            }
        }
    }
    sort.Strings(names)
    return names
}
```

### 2. Platform-Specific Registries (like go-cicd)

```go
// Dual registry: platforms and plugins per platform
var (
    mu        sync.RWMutex
    platforms = make(map[string]PlatformFactory)
    plugins   = make(map[string]map[string]PluginFactory) // platform -> plugin name -> factory
)

func RegisterPlatform(name string, factory PlatformFactory) {
    mu.Lock()
    defer mu.Unlock()
    platforms[name] = factory
    plugins[name] = make(map[string]PluginFactory)
}

func RegisterPlugin(platform, name string, factory PluginFactory) {
    mu.Lock()
    defer mu.Unlock()
    if plugins[platform] == nil {
        plugins[platform] = make(map[string]PluginFactory)
    }
    plugins[platform][name] = factory
}

func GetPlugins(platform string) []Plugin {
    mu.RLock()
    defer mu.RUnlock()

    var result []Plugin
    for _, factory := range plugins[platform] {
        result = append(result, factory())
    }
    return result
}
```

### 3. Duplicate Detection (Fail Fast)

```go
func Register(name string, factory PluginFactory) error {
    mu.Lock()
    defer mu.Unlock()

    if _, exists := plugins[name]; exists {
        return fmt.Errorf("duplicate plugin registration: %s", name)
    }

    plugins[name] = factory
    return nil
}

// In init() - panic on duplicate (catches bugs early)
func init() {
    if err := registry.Register("my-plugin", newMyPlugin); err != nil {
        panic(err)
    }
}
```

### 4. Registration Hooks (Logging, Metrics)

```go
type RegistrationHook func(name string)

var hooks []RegistrationHook

func OnRegister(hook RegistrationHook) {
    mu.Lock()
    defer mu.Unlock()
    hooks = append(hooks, hook)
}

func Register(name string, factory PluginFactory) {
    mu.Lock()
    defer mu.Unlock()

    plugins[name] = factory

    // Notify all hooks
    for _, hook := range hooks {
        hook(name)
    }
}

// Usage: metrics collection
func init() {
    registry.OnRegister(func(name string) {
        metrics.PluginsRegistered.Inc()
        log.Printf("Plugin registered: %s", name)
    })
}
```

## Thread Safety Guarantees

| Operation | Lock Type        | Concurrent Safe               |
| --------- | ---------------- | ----------------------------- |
| Register  | Lock (exclusive) | Yes - serializes writes       |
| Get       | RLock (shared)   | Yes - many concurrent readers |
| List      | RLock (shared)   | Yes - many concurrent readers |
| Count     | RLock (shared)   | Yes - many concurrent readers |
| Reset     | Lock (exclusive) | Yes - testing only            |

## Key Design Decisions

1. **Factory over Singleton**: `Get()` returns `factory()` not a cached instance
2. **RWMutex over Mutex**: Optimized for read-heavy workloads (common in registries)
3. **Sorted List()**: Deterministic output for testing and user-facing display
4. **Reset() for Testing**: Ensures test isolation without global state leakage
5. **Error over Panic**: `Get()` returns error for missing plugins (caller decides handling)
