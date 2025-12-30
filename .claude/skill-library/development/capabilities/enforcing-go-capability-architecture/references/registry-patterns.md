# Registry Patterns

## Basic Registry

```go
package registry

type Factory func(Config) (Capability, error)

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
    f, ok := factories[name]
    return f, ok
}

func List() []string {
    mu.RLock()
    defer mu.RUnlock()
    names := make([]string, 0, len(factories))
    for name := range factories {
        names = append(names, name)
    }
    return names
}
```

## Self-Registration

```go
// In capability file
func init() {
    registry.Register("probe.Dan", NewDan)
}
```

## Import for Side Effects

```go
// In main.go
import _ "github.com/example/pkg/probes/jailbreak"
```
