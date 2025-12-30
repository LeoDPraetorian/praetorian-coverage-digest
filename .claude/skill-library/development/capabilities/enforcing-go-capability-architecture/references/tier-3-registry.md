# Tier 3: Registry Pattern

**When to use**: 30-100 capabilities, need dynamic discovery.

## Structure

```go
pkg/probes/
├── probe.go          # Core interface
├── registry/
│   ├── registry.go   # Global registry
│   └── loader.go     # Dynamic loading
├── base/
│   └── base.go       # Base implementation
├── test/
├── jailbreak/
└── injection/
```

## Registry Implementation

```go
package registry

var (
    mu        sync.RWMutex
    factories = make(map[string]Factory)
)

func Register(name string, factory Factory) {
    mu.Lock()
    defer mu.Unlock()
    factories[name] = factory
}

func Get(name string) (Factory, bool) {
    mu.RLock()
    defer mu.RUnlock()
    return factories[name]
}
```

## Self-Registration via init()

```go
func init() {
    registry.Register("dan.Dan_11_0", NewDan110)
}
```
