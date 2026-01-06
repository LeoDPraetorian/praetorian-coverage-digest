# Common Mistakes in Go Plugin Registries

Anti-patterns in plugin registry implementation and their fixes.

---

## 1. Singleton Instead of Factory

❌ **BAD**: Returning shared instance

```go
var instance = &MyPlugin{counter: 0}

func init() {
    registry.Register("myplugin", instance)
}
```

**Problem**: All callers share state. One goroutine's modifications affect others, causing race conditions and unpredictable behavior.

✅ **GOOD**: Return factory function

```go
func init() {
    registry.Register("myplugin", func() Plugin {
        return &MyPlugin{counter: 0}
    })
}
```

**Impact**: Data corruption in production, intermittent test failures, security vulnerabilities from state leakage.

---

## 2. No Thread Safety

❌ **BAD**: Unprotected map access

```go
type Registry struct {
    plugins map[string]PluginFactory
}

func (r *Registry) Register(name string, f PluginFactory) {
    r.plugins[name] = f  // Race condition!
}
```

**Problem**: Concurrent map writes cause panic: `fatal error: concurrent map writes`.

✅ **GOOD**: Use sync.RWMutex

```go
type Registry struct {
    mu      sync.RWMutex
    plugins map[string]PluginFactory
}

func (r *Registry) Register(name string, f PluginFactory) {
    r.mu.Lock()
    defer r.mu.Unlock()
    r.plugins[name] = f
}

func (r *Registry) Get(name string) (PluginFactory, bool) {
    r.mu.RLock()
    defer r.mu.RUnlock()
    f, ok := r.plugins[name]
    return f, ok
}
```

**Impact**: Production crashes under concurrent load, especially during initialization.

---

## 3. Manual Registration

❌ **BAD**: Central file listing all plugins

```go
// registry/init.go
func init() {
    Register("pluginA", NewPluginA)
    Register("pluginB", NewPluginB)
    // Must remember to add every new plugin here!
}
```

**Problem**: Forgetting to register new plugins, merge conflicts, tight coupling.

✅ **GOOD**: Self-registration via blank imports

```go
// plugins/pluginA/plugin.go
func init() {
    registry.Register("pluginA", NewPluginA)
}

// cmd/main.go
import (
    _ "myapp/plugins/pluginA"
    _ "myapp/plugins/pluginB"
)
```

**Impact**: Missing features in production, developer friction, onboarding difficulty.

---

## 4. Unsorted Listing

❌ **BAD**: Return map keys directly

```go
func (r *Registry) List() []string {
    names := make([]string, 0, len(r.plugins))
    for name := range r.plugins {
        names = append(names, name)
    }
    return names  // Order varies between runs!
}
```

**Problem**: Non-deterministic output breaks tests, CLI help text, and debugging.

✅ **GOOD**: Sort before returning

```go
func (r *Registry) List() []string {
    r.mu.RLock()
    defer r.mu.RUnlock()
    names := make([]string, 0, len(r.plugins))
    for name := range r.plugins {
        names = append(names, name)
    }
    sort.Strings(names)
    return names
}
```

**Impact**: Flaky tests, inconsistent documentation, confusing user experience.

---

## 5. No Test Reset()

❌ **BAD**: No way to clear registry between tests

```go
var globalRegistry = NewRegistry()

// No Reset() method - tests contaminate each other
```

**Problem**: Test A registers a mock, Test B fails because mock still present.

✅ **GOOD**: Provide Reset() for testing

```go
func (r *Registry) Reset() {
    r.mu.Lock()
    defer r.mu.Unlock()
    r.plugins = make(map[string]PluginFactory)
}

// In test file
func TestPlugin(t *testing.T) {
    t.Cleanup(registry.Reset)
    registry.Register("mock", mockFactory)
    // ...
}
```

**Impact**: Flaky CI, tests pass in isolation but fail together, wasted debugging time.

---

## 6. Import Cycles

❌ **BAD**: Registry imports plugins

```go
// registry/registry.go
import "myapp/plugins/pluginA"  // Cycle!

// plugins/pluginA/plugin.go
import "myapp/registry"
```

**Problem**: Go compiler rejects import cycles: `import cycle not allowed`.

✅ **GOOD**: Plugins import registry, never reverse

```go
// registry/registry.go - no plugin imports

// plugins/pluginA/plugin.go
import "myapp/registry"

func init() {
    registry.Register("pluginA", New)
}
```

**Impact**: Build failures, forced architecture redesign.

---

## 7. Complex init() Logic

❌ **BAD**: I/O or network in init()

```go
func init() {
    config, err := os.ReadFile("config.json")  // Fails in tests!
    if err != nil {
        log.Fatal(err)
    }
    registry.Register("plugin", NewWithConfig(config))
}
```

**Problem**: Slows startup, fails in different environments, untestable.

✅ **GOOD**: Defer configuration to runtime

```go
func init() {
    registry.Register("plugin", func() Plugin {
        return &Plugin{}  // Configure later via SetConfig()
    })
}
```

**Impact**: Broken tests, environment-specific failures, slow startup.

---

## 8. Hidden Shared State

❌ **BAD**: Closure over global variable

```go
var sharedClient = &http.Client{}

func init() {
    registry.Register("fetcher", func() Plugin {
        return &Fetcher{client: sharedClient}  // Shared!
    })
}
```

**Problem**: All instances share client state despite factory pattern appearance.

✅ **GOOD**: Create dependencies in factory

```go
func init() {
    registry.Register("fetcher", func() Plugin {
        return &Fetcher{client: &http.Client{
            Timeout: 30 * time.Second,
        }}
    })
}
```

**Impact**: Subtle concurrency bugs, state leakage between requests.

---

## 9. No Error Handling

❌ **BAD**: Silent nil return

```go
func (r *Registry) Get(name string) PluginFactory {
    return r.plugins[name]  // Returns nil for unknown
}

// Caller gets nil, panics later
plugin := registry.Get("typo")()  // Panic!
```

**Problem**: Errors surface far from cause, hard to debug.

✅ **GOOD**: Return explicit error or bool

```go
func (r *Registry) Get(name string) (PluginFactory, error) {
    r.mu.RLock()
    defer r.mu.RUnlock()
    f, ok := r.plugins[name]
    if !ok {
        return nil, fmt.Errorf("plugin %q not registered", name)
    }
    return f, nil
}
```

**Impact**: Cryptic nil pointer panics in production, difficult troubleshooting.

---

## 10. Duplicate Registration

❌ **BAD**: Silent overwrite

```go
func (r *Registry) Register(name string, f PluginFactory) {
    r.plugins[name] = f  // Silently replaces existing!
}
```

**Problem**: Typos or copy-paste errors cause one plugin to shadow another.

✅ **GOOD**: Detect and reject duplicates

```go
func (r *Registry) Register(name string, f PluginFactory) error {
    r.mu.Lock()
    defer r.mu.Unlock()
    if _, exists := r.plugins[name]; exists {
        return fmt.Errorf("plugin %q already registered", name)
    }
    r.plugins[name] = f
    return nil
}

// In init() - panic on duplicate (programming error)
func init() {
    if err := registry.Register("plugin", New); err != nil {
        panic(err)
    }
}
```

**Impact**: Missing functionality, silent failures, hours of debugging.

---

## Summary Table

| Mistake                      | Symptom                          | Fix                            |
| ---------------------------- | -------------------------------- | ------------------------------ |
| Singleton Instead of Factory | Race conditions, shared state    | Return factory function        |
| No Thread Safety             | `concurrent map writes` panic    | Use `sync.RWMutex`             |
| Manual Registration          | Missing plugins, merge conflicts | Self-registration via `init()` |
| Unsorted Listing             | Flaky tests, inconsistent output | `sort.Strings()` before return |
| No Test Reset()              | Test contamination               | Add `Reset()` method           |
| Import Cycles                | Build failure                    | Plugins import registry only   |
| Complex init() Logic         | Environment failures             | Defer config to runtime        |
| Hidden Shared State          | Subtle concurrency bugs          | Create deps in factory         |
| No Error Handling            | Nil pointer panics               | Return `(value, error)`        |
| Duplicate Registration       | Silent overwrites                | Detect and reject duplicates   |
