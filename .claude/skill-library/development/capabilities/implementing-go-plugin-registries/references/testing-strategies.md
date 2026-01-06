# Testing Strategies

Comprehensive patterns for testing Go plugin registries, covering unit tests, concurrency validation, and test isolation.

## Registry Testing Patterns

### Testing Register() Function

```go
func TestRegister(t *testing.T) {
    defer registry.Reset()

    // Test successful registration
    registry.Register("test-plugin", func() plugins.Plugin {
        return &mockPlugin{name: "test-plugin"}
    })

    plugin := registry.Get("test-plugin")
    require.NotNil(t, plugin)
    require.Equal(t, "test-plugin", plugin.Name())
}

func TestRegister_Duplicate(t *testing.T) {
    defer registry.Reset()

    registry.Register("duplicate", func() plugins.Plugin {
        return &mockPlugin{name: "v1"}
    })

    // Second registration overwrites (or panics, depending on design)
    registry.Register("duplicate", func() plugins.Plugin {
        return &mockPlugin{name: "v2"}
    })

    plugin := registry.Get("duplicate")
    require.Equal(t, "v2", plugin.Name())
}
```

### Testing Get() with Valid/Invalid Names

```go
func TestGet_ValidName(t *testing.T) {
    defer registry.Reset()

    registry.Register("github", func() plugins.Plugin {
        return &mockPlugin{name: "github"}
    })

    plugin := registry.Get("github")
    require.NotNil(t, plugin)
    require.Equal(t, "github", plugin.Name())
}

func TestGet_InvalidName(t *testing.T) {
    defer registry.Reset()

    plugin := registry.Get("nonexistent")
    require.Nil(t, plugin, "Get() should return nil for unknown plugins")
}

func TestGet_EmptyName(t *testing.T) {
    defer registry.Reset()

    plugin := registry.Get("")
    require.Nil(t, plugin)
}
```

### Testing List() Returns Sorted Names

```go
func TestList_Sorted(t *testing.T) {
    defer registry.Reset()

    // Register in random order
    registry.Register("zebra", mockFactory("zebra"))
    registry.Register("alpha", mockFactory("alpha"))
    registry.Register("middle", mockFactory("middle"))

    names := registry.List()

    require.Len(t, names, 3)
    require.True(t, sort.StringsAreSorted(names),
        "List() should return sorted names, got: %v", names)
    require.Equal(t, []string{"alpha", "middle", "zebra"}, names)
}
```

### Testing Reset() Clears Registry

```go
func TestReset(t *testing.T) {
    registry.Register("temp", mockFactory("temp"))
    require.NotNil(t, registry.Get("temp"))

    registry.Reset()

    require.Nil(t, registry.Get("temp"), "Reset() should clear all registrations")
    require.Empty(t, registry.List())
}
```

## Plugin Testing Patterns

### Unit Testing Individual Plugins

```go
func TestInjectionPlugin_Detect(t *testing.T) {
    plugin := injection.New()

    // Create test graph with vulnerable workflow
    g := graph.New()
    g.AddNode(graph.Node{
        Type: "workflow",
        Data: map[string]interface{}{
            "uses": "${{ github.event.issue.title }}",
        },
    })

    findings, err := plugin.Detect(context.Background(), g)

    require.NoError(t, err)
    require.Len(t, findings, 1)
    require.Equal(t, plugins.SeverityHigh, findings[0].Severity)
}
```

### Testing Plugin Interface Compliance

```go
func TestPluginImplementsInterface(t *testing.T) {
    plugins := []plugins.Plugin{
        injection.New(),
        pwnrequest.New(),
        runner.New(),
    }

    for _, p := range plugins {
        t.Run(p.Name(), func(t *testing.T) {
            // Verify all interface methods work
            require.NotEmpty(t, p.Name())
            require.NotEmpty(t, p.Platform())
            require.NotZero(t, p.Severity())

            // Detect should handle empty graph gracefully
            findings, err := p.Detect(context.Background(), graph.New())
            require.NoError(t, err)
            require.NotNil(t, findings) // May be empty, but not nil
        })
    }
}
```

### Mocking Plugin Dependencies

```go
type mockPlugin struct {
    name     string
    platform string
    severity plugins.Severity
    findings []plugins.Finding
    err      error
}

func (m *mockPlugin) Name() string                   { return m.name }
func (m *mockPlugin) Platform() string               { return m.platform }
func (m *mockPlugin) Severity() plugins.Severity     { return m.severity }
func (m *mockPlugin) Detect(ctx context.Context, g *graph.Graph) ([]plugins.Finding, error) {
    return m.findings, m.err
}

func mockFactory(name string) func() plugins.Plugin {
    return func() plugins.Plugin {
        return &mockPlugin{name: name, platform: "test"}
    }
}
```

## Concurrency Testing

### Testing Thread-Safety with -race Flag

Always run with race detector:

```bash
go test -race ./internal/registry/...
```

### Parallel Registration Tests

```go
func TestConcurrentRegister(t *testing.T) {
    defer registry.Reset()

    var wg sync.WaitGroup
    for i := 0; i < 100; i++ {
        wg.Add(1)
        go func(n int) {
            defer wg.Done()
            name := fmt.Sprintf("plugin-%d", n)
            registry.Register(name, mockFactory(name))
        }(i)
    }
    wg.Wait()

    // All registrations should succeed
    require.Len(t, registry.List(), 100)
}
```

### Concurrent Get() Tests

```go
func TestConcurrentGet(t *testing.T) {
    defer registry.Reset()

    registry.Register("shared", mockFactory("shared"))

    var wg sync.WaitGroup
    for i := 0; i < 100; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            plugin := registry.Get("shared")
            require.NotNil(t, plugin)
            require.Equal(t, "shared", plugin.Name())
        }()
    }
    wg.Wait()
}
```

## Test Isolation

### Using Reset() Between Tests

```go
func TestIsolation_First(t *testing.T) {
    defer registry.Reset() // Always cleanup

    registry.Register("isolated", mockFactory("isolated"))
    require.NotNil(t, registry.Get("isolated"))
}

func TestIsolation_Second(t *testing.T) {
    defer registry.Reset()

    // Should not see "isolated" from previous test
    require.Nil(t, registry.Get("isolated"))
}
```

### t.Parallel() Considerations

Parallel tests require careful isolation:

```go
func TestParallel_Group(t *testing.T) {
    // Subtest with isolated registry per test
    t.Run("test1", func(t *testing.T) {
        t.Parallel()
        r := registry.NewRegistry() // Use instance, not global
        r.Register("local", mockFactory("local"))
        require.NotNil(t, r.Get("local"))
    })

    t.Run("test2", func(t *testing.T) {
        t.Parallel()
        r := registry.NewRegistry() // Separate instance
        require.Nil(t, r.Get("local")) // Isolated
    })
}
```

### TestMain Setup/Teardown

```go
func TestMain(m *testing.M) {
    // Global setup
    registry.Reset()

    code := m.Run()

    // Global teardown
    registry.Reset()

    os.Exit(code)
}
```

## Integration Testing

### Testing Full Plugin Lifecycle

```go
func TestPluginLifecycle(t *testing.T) {
    defer registry.Reset()

    // 1. Register
    registry.Register("lifecycle", func() plugins.Plugin {
        return injection.New()
    })

    // 2. Discover via List
    names := registry.List()
    require.Contains(t, names, "lifecycle")

    // 3. Get instance
    plugin := registry.Get("lifecycle")
    require.NotNil(t, plugin)

    // 4. Execute
    findings, err := plugin.Detect(context.Background(), graph.New())
    require.NoError(t, err)
    require.NotNil(t, findings)
}
```

### Testing Plugin Discovery via Blank Imports

```go
// internal/registry/discovery_test.go
package registry_test

import (
    "testing"

    "github.com/praetorian-inc/go-cicd/internal/registry"
    _ "github.com/praetorian-inc/go-cicd/pkg/plugins/all" // Triggers init()
    "github.com/stretchr/testify/require"
)

func TestBlankImportRegistersPlugins(t *testing.T) {
    // After importing all, plugins should be registered
    names := registry.List()

    require.Contains(t, names, "actions-injection")
    require.Contains(t, names, "pwn-request")
    require.Contains(t, names, "self-hosted-runner")

    // Verify each is functional
    for _, name := range names {
        plugin := registry.Get(name)
        require.NotNil(t, plugin, "Plugin %s should be retrievable", name)
    }
}
```

## Factory Fresh Instance Verification

```go
func TestFactoryReturnsNewInstance(t *testing.T) {
    defer registry.Reset()

    callCount := 0
    registry.Register("factory-test", func() plugins.Plugin {
        callCount++
        return &mockPlugin{name: fmt.Sprintf("instance-%d", callCount)}
    })

    p1 := registry.Get("factory-test")
    p2 := registry.Get("factory-test")

    require.NotSame(t, p1, p2, "Factory should return new instance each call")
    require.Equal(t, "instance-1", p1.Name())
    require.Equal(t, "instance-2", p2.Name())
}
```

## Related

- [go-cicd-registry-analysis.md](./go-cicd-registry-analysis.md) - Registry implementation patterns
- [registry-implementation.md](./registry-implementation.md) - Core registry code structure
- [common-mistakes.md](./common-mistakes.md) - Anti-patterns to avoid in tests
- [factory-vs-singleton.md](./factory-vs-singleton.md) - Why factory pattern enables testability
