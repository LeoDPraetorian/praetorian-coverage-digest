# Tier 2 to Tier 3 Migration Guide

Step-by-step migration from switch-based plugin dispatch (Tier 2) to registry pattern with self-registration (Tier 3).

**Reference**: See `enforcing-go-capability-architecture` skill for tier definitions.

---

## 1. Identify Migration Trigger

Migrate when ANY of these conditions exist:

- Plugin count exceeds 30
- Need dynamic plugin discovery at runtime
- External plugins must register without modifying core code
- Switch statements exceed 50+ lines

---

## 2. Before: Tier 2 Switch-Based Pattern

```go
// pkg/plugins/plugins.go - Tier 2 pattern
package plugins

func GetPlugin(name string) (Plugin, error) {
    switch name {
    case "nuclei":
        return NewNucleiPlugin(), nil
    case "nmap":
        return NewNmapPlugin(), nil
    case "zap":
        return NewZapPlugin(), nil
    // ... 30+ more cases
    default:
        return nil, fmt.Errorf("unknown plugin: %s", name)
    }
}

func ListPlugins() []string {
    return []string{"nuclei", "nmap", "zap", /* ... */}
}
```

---

## 3. Extract Registry Package

Create `internal/registry/registry.go`:

```go
package registry

import (
    "fmt"
    "sort"
    "sync"
)

// Plugin defines the interface all plugins must implement
type Plugin interface {
    Name() string
    Execute(ctx context.Context, config map[string]any) error
}

// PluginFactory creates new plugin instances
type PluginFactory func() Plugin

var (
    mu        sync.RWMutex
    factories = make(map[string]PluginFactory)
)

// Register adds a plugin factory (called from init())
func Register(name string, factory PluginFactory) {
    mu.Lock()
    defer mu.Unlock()

    if _, exists := factories[name]; exists {
        panic(fmt.Sprintf("plugin already registered: %s", name))
    }
    factories[name] = factory
}

// Get returns a new plugin instance
func Get(name string) (Plugin, error) {
    mu.RLock()
    defer mu.RUnlock()

    factory, exists := factories[name]
    if !exists {
        return nil, fmt.Errorf("unknown plugin: %s", name)
    }
    return factory(), nil
}

// List returns sorted plugin names (deterministic)
func List() []string {
    mu.RLock()
    defer mu.RUnlock()

    names := make([]string, 0, len(factories))
    for name := range factories {
        names = append(names, name)
    }
    sort.Strings(names)
    return names
}

// Reset clears registry (testing only)
func Reset() {
    mu.Lock()
    defer mu.Unlock()
    factories = make(map[string]PluginFactory)
}
```

---

## 4. Convert Plugins to Self-Register

Transform each plugin to use `init()`:

```go
// pkg/plugins/nuclei/nuclei.go
package nuclei

import "myproject/internal/registry"

func init() {
    registry.Register("nuclei", func() registry.Plugin {
        return &NucleiPlugin{}
    })
}

type NucleiPlugin struct{}

func (p *NucleiPlugin) Name() string { return "nuclei" }

func (p *NucleiPlugin) Execute(ctx context.Context, config map[string]any) error {
    // Implementation unchanged
}
```

---

## 5. Create Blank Import File

Create `pkg/plugins/all/all.go` to trigger all `init()` functions:

```go
// pkg/plugins/all/all.go
// Import this package to register all plugins via init()
package all

import (
    _ "myproject/pkg/plugins/nuclei"
    _ "myproject/pkg/plugins/nmap"
    _ "myproject/pkg/plugins/zap"
    // Add new plugins here (alphabetical order)
)
```

---

## 6. Update Main Entry Point

```go
// cmd/scanner/main.go
package main

import (
    "myproject/internal/registry"
    _ "myproject/pkg/plugins/all"  // Triggers all init() registrations
)

func main() {
    plugin, err := registry.Get("nuclei")
    if err != nil {
        log.Fatal(err)
    }
    plugin.Execute(ctx, config)
}
```

---

## 7. Add Testing Support

```go
// internal/registry/registry_test.go
package registry

import (
    "testing"
)

func TestRegisterAndGet(t *testing.T) {
    Reset() // Clean state

    Register("test-plugin", func() Plugin {
        return &mockPlugin{}
    })

    plugin, err := Get("test-plugin")
    if err != nil {
        t.Fatalf("expected plugin, got error: %v", err)
    }
    if plugin.Name() != "test-plugin" {
        t.Errorf("expected 'test-plugin', got '%s'", plugin.Name())
    }
}

func TestListIsSorted(t *testing.T) {
    Reset()

    Register("zap", func() Plugin { return &mockPlugin{name: "zap"} })
    Register("nmap", func() Plugin { return &mockPlugin{name: "nmap"} })
    Register("nuclei", func() Plugin { return &mockPlugin{name: "nuclei"} })

    names := List()
    expected := []string{"nmap", "nuclei", "zap"}

    for i, name := range names {
        if name != expected[i] {
            t.Errorf("expected %s at index %d, got %s", expected[i], i, name)
        }
    }
}

type mockPlugin struct{ name string }
func (m *mockPlugin) Name() string { return m.name }
func (m *mockPlugin) Execute(ctx context.Context, config map[string]any) error { return nil }
```

---

## 8. Migration Checklist

| Step | Action                                 | Verify                         |
| ---- | -------------------------------------- | ------------------------------ |
| 1    | Create `internal/registry/registry.go` | `go build ./internal/registry` |
| 2    | Add `sync.RWMutex` protection          | Race detector passes           |
| 3    | Define `Plugin` interface              | All plugins implement it       |
| 4    | Add `init()` to each plugin            | `registry.List()` returns all  |
| 5    | Create `pkg/plugins/all/all.go`        | Single import registers all    |
| 6    | Delete old switch-based `GetPlugin()`  | No compilation errors          |
| 7    | Add `Reset()` for testing              | Tests run in isolation         |
| 8    | Sort `List()` output                   | Deterministic ordering         |

---

## Common Pitfalls

**Circular imports**: Keep registry in `internal/` separate from plugins in `pkg/`.

**Missing blank imports**: New plugins must be added to `all.go` or they will not register.

**Test pollution**: Always call `Reset()` at the start of registry tests.

**Duplicate registration**: The `Register()` function panics on duplicates - this is intentional to catch configuration errors early.
