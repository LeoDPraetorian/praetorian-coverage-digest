# go-cicd Registry Analysis

Analysis of go-cicd's dual registry implementation (platforms + plugins) with thread safety and factory pattern.

## Registry Location

**Source:** `modules/go-gato/go-cicd/internal/registry/registry.go`

## Architecture

### Dual Registry Pattern

go-cicd implements two separate registries:

1. **Platform Registry** - Adapters for different CI/CD platforms
   - GitHub, GitLab, Azure DevOps
   - `RegisterPlatform(name, factory)`
   - `GetPlatform(name)`

2. **Plugin Registry** - Detection plugins per platform
   - Injection, Pwn Request, Self-Hosted Runner
   - `RegisterPlugin(platform, name, factory)`
   - `GetPlugins(platform)`

### Thread Safety

```go
var (
    mu              sync.RWMutex
    platformRegistry = make(map[string]platforms.PlatformFactory)
    pluginRegistry   = make(map[string][]plugins.PluginFactory)
)
```

- **sync.RWMutex** protects both registries
- Many readers (Get, List), few writers (Register)
- Registration happens at init() time (single-threaded)

### Factory Pattern

```go
type PluginFactory func() plugins.Plugin

func RegisterPlugin(platform, name string, factory PluginFactory) {
    mu.Lock()
    defer mu.Unlock()
    pluginRegistry[platform] = append(pluginRegistry[platform], factory)
}

func GetPlugins(platform string) []plugins.Plugin {
    mu.RLock()
    defer mu.RUnlock()

    factories := pluginRegistry[platform]
    plugins := make([]plugins.Plugin, 0, len(factories))
    for _, factory := range factories {
        plugins = append(plugins, factory())  // New instance per call
    }
    return plugins
}
```

## Plugin Interface

```go
// pkg/plugins/plugin.go
type Plugin interface {
    Name() string
    Platform() string
    Severity() Severity
    Detect(ctx context.Context, g *graph.Graph) ([]Finding, error)
}
```

## Self-Registration Pattern

Each plugin registers itself via init():

```go
// pkg/plugins/github/injection/injection.go
func init() {
    registry.RegisterPlugin("github", "actions-injection", func() plugins.Plugin {
        return New()
    })
}
```

## Plugin Discovery

Plugins are activated via blank imports:

```go
// pkg/plugins/all/all.go
import (
    _ "github.com/praetorian-inc/go-cicd/pkg/plugins/github/injection"
    _ "github.com/praetorian-inc/go-cicd/pkg/plugins/github/pwnrequest"
    _ "github.com/praetorian-inc/go-cicd/pkg/plugins/github/runner"
)
```

## Key Patterns

| Pattern           | Implementation                    | Purpose                       |
| ----------------- | --------------------------------- | ----------------------------- |
| Factory           | `PluginFactory func() Plugin`     | New instance per scan         |
| Self-registration | `init()` calls `RegisterPlugin()` | Automatic on import           |
| Platform grouping | `map[string][]PluginFactory`      | Plugins organized by platform |
| Thread safety     | `sync.RWMutex`                    | Concurrent access             |

## Extensibility

Adding a new plugin:

1. Create `pkg/plugins/{platform}/{plugin}/` directory
2. Implement Plugin interface with `Detect()` method
3. Add `init()` function calling `RegisterPlugin()`
4. Add blank import to `pkg/plugins/all/all.go`

**No changes to existing code required** - true Open-Closed Principle.

## Related

- Main skill: [implementing-go-plugin-registries](../SKILL.md)
- Capability architecture: `.claude/skill-library/development/capabilities/enforcing-go-capability-architecture/SKILL.md`
- fingerprintx comparison: Similar pattern, different domain (network vs CI/CD)
