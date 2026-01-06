# Factory vs Singleton

Pattern comparison for plugin instance management - when to use factory (new instance) vs singleton (shared instance).

## TL;DR

**Factory Pattern (Recommended):** Return new instance per Get() call

- ✅ Concurrent plugin usage (each caller gets own instance)
- ✅ Stateful plugins (each instance has own state)
- ✅ Test isolation (fresh instance per test)

**Singleton Pattern (Use Sparingly):** Return same instance every Get() call

- ⚠️ Only for truly stateless plugins
- ⚠️ No concurrent usage if plugin has mutable state
- ⚠️ Test pollution (shared state across tests)

## Factory Pattern

```go
// Registry stores factory functions
type PluginFactory func() Plugin

func Register(name string, factory PluginFactory) {
    plugins[name] = factory
}

func Get(name string) (Plugin, error) {
    factory := plugins[name]
    return factory(), nil  // NEW INSTANCE each call
}

// Plugin registration
func init() {
    Register("my-plugin", func() Plugin {
        return &MyPlugin{}  // Fresh instance
    })
}
```

**Benefits:**

- Each caller gets isolated instance
- Plugins can maintain per-request state
- No race conditions on instance fields
- Tests get clean instances

**Use when:**

- Plugin has mutable state
- Concurrent execution needed
- Per-request configuration
- Testing isolation required

## Singleton Pattern

```go
// Create single instance at init time
var instance = &MyPlugin{}

func init() {
    Register("my-plugin", func() Plugin {
        return instance  // SAME INSTANCE every call
    })
}
```

**Risks:**

- ❌ Race conditions if instance has mutable fields
- ❌ Tests contaminate each other
- ❌ Cannot configure per-request
- ❌ Debugging harder (shared state)

**ONLY use when:**

- Plugin is 100% stateless (no fields, or only immutable config)
- Performance critical (avoid allocations)
- Explicitly documented as singleton

## Production Examples

### fingerprintx (50+ Plugins, Factory)

```go
func Get(name string) (Plugin, error) {
    factory := plugins[name]
    return factory(), nil  // New instance
}
```

**Why:** Each scan needs isolated plugin state.

### golangci-lint (100+ Linters, Hybrid)

```go
// Linter metadata is singleton (immutable)
var linterConfig = Config{Name: "revive", ...}

// But execution uses factory for per-run state
func Run() Executor {
    return &executor{config: linterConfig}  // New executor
}
```

**Pattern:** Singleton config, factory execution.

## Common Mistakes

### Mistake 1: Hidden Singleton

```go
❌ BAD: Looks like factory, actually singleton
var cache = make(map[string]interface{})  // Shared!

func init() {
    Register("plugin", func() Plugin {
        return &MyPlugin{cache: cache}  // All instances share cache
    })
}
```

**Fix:** Create cache per-instance or use sync.Map for safe sharing.

### Mistake 2: Singleton for Stateful Plugin

```go
❌ BAD: Counter is shared
type CounterPlugin struct {
    count int  // Race condition!
}

var instance = &CounterPlugin{}
```

**Fix:** Use factory pattern or protect with mutex.

### Mistake 3: No Reset() for Singleton Tests

```go
❌ BAD: Tests pollute singleton
var instance = &Plugin{results: []Result{}}

func TestA(t *testing.T) {
    instance.results = append(instance.results, resultA)  // Pollutes
}

func TestB(t *testing.T) {
    // instance.results still has resultA from TestA!
}
```

**Fix:** Provide Reset() method or use factory pattern.

## Decision Matrix

| Characteristic   | Factory              | Singleton             |
| ---------------- | -------------------- | --------------------- |
| Mutable state    | ✅ Safe              | ❌ Race conditions    |
| Concurrent usage | ✅ Isolated          | ❌ Shared state       |
| Test isolation   | ✅ Clean             | ❌ Pollution          |
| Memory usage     | ⚠️ More allocations  | ✅ One instance       |
| Performance      | ⚠️ Slower (allocate) | ✅ Fast (no allocate) |
| Debugging        | ✅ Clear ownership   | ❌ Shared state       |

**Default choice: Factory.** Only use singleton with strong justification.

## Related

- [init() Self-Registration](init-self-registration.md) - How to register
- [Testing Strategies](testing-strategies.md) - Test patterns
- [Common Mistakes](common-mistakes.md) - Anti-patterns
