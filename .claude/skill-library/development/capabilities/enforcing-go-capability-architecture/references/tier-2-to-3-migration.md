# Tier 2 → Tier 3 Migration

**Trigger**: Need dynamic discovery OR 30+ implementations

## Steps

1. **Create registry package** - `pkg/probes/registry/`
2. **Implement Register/Get/List** - Thread-safe map with mutex
3. **Add init() registration** - To each capability
4. **Update main** - Import for side effects

## Registry Template

```go
// pkg/probes/registry/registry.go
package registry

var factories = make(map[string]Factory)

func Register(name string, f Factory) { factories[name] = f }
func Get(name string) (Factory, bool) { return factories[name] }
```

## Self-Registration

```go
// pkg/probes/jailbreak/dan.go
func init() {
    registry.Register("jailbreak.Dan", NewDan)
}
```
