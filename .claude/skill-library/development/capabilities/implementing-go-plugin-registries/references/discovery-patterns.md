# Discovery Patterns

Runtime patterns for enumerating, filtering, and selecting plugins from a registry.

## 1. List All Plugins

Basic enumeration with sorted names for deterministic output:

```go
func ListPlugins() []string {
    mu.RLock()
    defer mu.RUnlock()

    names := make([]string, 0, len(registry))
    for name := range registry {
        names = append(names, name)
    }
    sort.Strings(names)
    return names
}
```

**Usage:** CLI help output, debugging, plugin inventory.

## 2. Get by Name

Direct lookup with explicit error handling:

```go
var ErrPluginNotFound = errors.New("plugin not found")

func GetPlugin(name string) (Plugin, error) {
    mu.RLock()
    defer mu.RUnlock()

    factory, exists := registry[name]
    if !exists {
        return nil, fmt.Errorf("%w: %s", ErrPluginNotFound, name)
    }
    return factory(), nil
}
```

**Pattern:** Return typed errors for caller-side handling with `errors.Is()`.

## 3. Filter by Criteria

Filter plugins matching specific requirements:

```go
type FilterFunc func(Plugin) bool

func FilterPlugins(filter FilterFunc) []Plugin {
    mu.RLock()
    defer mu.RUnlock()

    var result []Plugin
    for _, factory := range registry {
        plugin := factory()
        if filter(plugin) {
            result = append(result, plugin)
        }
    }
    return result
}

// Example filters
func BySeverity(min Severity) FilterFunc {
    return func(p Plugin) bool {
        return p.Severity() >= min
    }
}

func ByCapability(cap string) FilterFunc {
    return func(p Plugin) bool {
        if c, ok := p.(Capable); ok {
            return c.HasCapability(cap)
        }
        return false
    }
}
```

**Usage:** `FilterPlugins(BySeverity(Critical))` returns only critical-severity plugins.

## 4. Wildcard/Glob Matching

Pattern-based plugin selection using `path.Match`:

```go
import "path"

func MatchPlugins(pattern string) ([]Plugin, error) {
    mu.RLock()
    defer mu.RUnlock()

    var result []Plugin
    for name, factory := range registry {
        matched, err := path.Match(pattern, name)
        if err != nil {
            return nil, fmt.Errorf("invalid pattern %q: %w", pattern, err)
        }
        if matched {
            result = append(result, factory())
        }
    }
    return result, nil
}
```

**Examples:**

- `github-*` - All GitHub-related plugins
- `*-injection` - All injection detection plugins
- `azure-*-scanner` - Azure scanners only

## 5. Platform-Specific Discovery

Grouping plugins by platform (go-cicd pattern):

```go
// Registry keyed by platform
var pluginRegistry = make(map[string][]PluginFactory)

func RegisterPlugin(platform, name string, factory PluginFactory) {
    mu.Lock()
    defer mu.Unlock()
    pluginRegistry[platform] = append(pluginRegistry[platform], factory)
}

func GetPlugins(platform string) []Plugin {
    mu.RLock()
    defer mu.RUnlock()

    factories := pluginRegistry[platform]
    plugins := make([]Plugin, 0, len(factories))
    for _, factory := range factories {
        plugins = append(plugins, factory())
    }
    return plugins
}

func ListPlatforms() []string {
    mu.RLock()
    defer mu.RUnlock()

    platforms := make([]string, 0, len(pluginRegistry))
    for platform := range pluginRegistry {
        platforms = append(platforms, platform)
    }
    sort.Strings(platforms)
    return platforms
}
```

**go-cicd usage:** `GetPlugins("github")` returns all GitHub-specific detection plugins.

## 6. Capability Detection

Introspection for plugin capabilities using interface assertions:

```go
type Capable interface {
    Capabilities() []string
}

type Configurable interface {
    Configure(opts map[string]any) error
}

func PluginsWithCapability(cap string) []Plugin {
    mu.RLock()
    defer mu.RUnlock()

    var result []Plugin
    for _, factory := range registry {
        plugin := factory()
        if c, ok := plugin.(Capable); ok {
            for _, pluginCap := range c.Capabilities() {
                if pluginCap == cap {
                    result = append(result, plugin)
                    break
                }
            }
        }
    }
    return result
}

// Check specific capability
func HasCapability(name, cap string) bool {
    plugin, err := GetPlugin(name)
    if err != nil {
        return false
    }
    if c, ok := plugin.(Capable); ok {
        for _, pluginCap := range c.Capabilities() {
            if pluginCap == cap {
                return true
            }
        }
    }
    return false
}
```

**Pattern:** Optional interfaces enable progressive capability enhancement.

## 7. Lazy Discovery

Deferred plugin loading for startup performance:

```go
type LazyRegistry struct {
    mu       sync.RWMutex
    loaders  map[string]func() PluginFactory
    loaded   map[string]PluginFactory
}

func (r *LazyRegistry) Register(name string, loader func() PluginFactory) {
    r.mu.Lock()
    defer r.mu.Unlock()
    r.loaders[name] = loader
}

func (r *LazyRegistry) Get(name string) (Plugin, error) {
    r.mu.RLock()
    factory, exists := r.loaded[name]
    r.mu.RUnlock()

    if exists {
        return factory(), nil
    }

    r.mu.Lock()
    defer r.mu.Unlock()

    // Double-check after acquiring write lock
    if factory, exists = r.loaded[name]; exists {
        return factory(), nil
    }

    loader, exists := r.loaders[name]
    if !exists {
        return nil, ErrPluginNotFound
    }

    factory = loader()
    r.loaded[name] = factory
    delete(r.loaders, name)

    return factory(), nil
}
```

**Use case:** Large plugin sets where initialization is expensive.

## Combining Patterns

Chain discovery patterns for complex queries:

```go
// Get all high-severity GitHub plugins with network capability
plugins := FilterPlugins(func(p Plugin) bool {
    if p.Platform() != "github" {
        return false
    }
    if p.Severity() < High {
        return false
    }
    if c, ok := p.(Capable); ok {
        return slices.Contains(c.Capabilities(), "network")
    }
    return false
})
```

## Related

- [go-cicd-registry-analysis.md](go-cicd-registry-analysis.md) - Platform-specific implementation
- [registry-implementation.md](registry-implementation.md) - Core registry structure
- [factory-vs-singleton.md](factory-vs-singleton.md) - Instance creation patterns
- [init-self-registration.md](init-self-registration.md) - Plugin registration timing
