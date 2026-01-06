# Plugin Architecture

**Complete interface design and registry patterns for detection plugins.**

## Interface Design

### Core Plugin Interface

```go
type DetectionPlugin interface {
    Name() string
    Category() VulnerabilityCategory
    Severity() Severity
    Detect(ctx context.Context, target *Target, response *Response) ([]Finding, error)
    Payloads() []Payload
}
```

**Interface Responsibilities:**

- `Name()` - Unique plugin identifier (e.g., "xss-reflected", "sqli-time-based")
- `Category()` - Vulnerability classification (VulnXSS, VulnSQLi, VulnSSRF)
- `Severity()` - Default severity level (Critical, High, Medium, Low)
- `Detect()` - Main detection logic with context and cancellation support
- `Payloads()` - Attack payloads specific to this plugin

### Supporting Types

```go
type Target struct {
    URL        string
    Parameters map[string]string
    Headers    map[string]string
    Body       string
    Method     string
}

type Response struct {
    StatusCode int
    Headers    map[string]string
    Body       string
    Time       time.Duration
}

type Payload struct {
    Input      string  // Payload to inject
    Reflection string  // Expected reflection in response
    Encoding   string  // Encoding context (html, js, url)
}

type Finding struct {
    Type        string
    Severity    Severity
    Confidence  float64
    URL         string
    Parameter   string
    Payload     string
    Evidence    string
    Remediation string
    CWE         string
}
```

## Registry Pattern

### Init-Based Self-Registration

Following fingerprintx and go-cicd patterns:

```go
// internal/registry/registry.go
package registry

type PluginFactory func() DetectionPlugin

var plugins = make(map[string]PluginFactory)

func RegisterPlugin(name string, factory PluginFactory) {
    if _, exists := plugins[name]; exists {
        panic(fmt.Sprintf("plugin %s already registered", name))
    }
    plugins[name] = factory
}

func GetPlugin(name string) (DetectionPlugin, error) {
    factory, exists := plugins[name]
    if !exists {
        return nil, fmt.Errorf("plugin %s not found", name)
    }
    return factory(), nil
}

func ListPlugins() []string {
    names := make([]string, 0, len(plugins))
    for name := range plugins {
        names = append(names, name)
    }
    sort.Strings(names)
    return names
}
```

### Plugin Self-Registration

```go
// plugins/xss/reflected.go
package xss

import "your/project/internal/registry"

func init() {
    registry.RegisterPlugin("xss-reflected", func() DetectionPlugin {
        return &ReflectedXSSPlugin{
            config: DefaultConfig(),
        }
    })
}

type ReflectedXSSPlugin struct {
    config *Config
}

func (p *ReflectedXSSPlugin) Name() string { return "xss-reflected" }
func (p *ReflectedXSSPlugin) Category() VulnerabilityCategory { return VulnXSS }
func (p *ReflectedXSSPlugin) Severity() Severity { return High }
// ... implement Detect() and Payloads()
```

## Discovery Pattern

### Automatic Discovery via Blank Imports

```go
// main.go or cmd/scanner/main.go
package main

import (
    _ "your/project/plugins/xss"    // Triggers init() for all XSS plugins
    _ "your/project/plugins/sqli"   // Triggers init() for all SQLi plugins
    _ "your/project/plugins/ssrf"   // Triggers init() for all SSRF plugins
)
```

### Category-Based Loading

```go
// Load only specific categories
func LoadCategory(category VulnerabilityCategory) []DetectionPlugin {
    var plugins []DetectionPlugin
    for _, name := range registry.ListPlugins() {
        plugin, _ := registry.GetPlugin(name)
        if plugin.Category() == category {
            plugins = append(plugins, plugin)
        }
    }
    return plugins
}
```

## Configuration Pattern

### Plugin-Specific Configuration

```go
type Config struct {
    Timeout        time.Duration
    MaxPayloads    int
    RateLimit      time.Duration
    EnableOOB      bool
    InteractshURL  string
}

type ConfigurablePlugin interface {
    DetectionPlugin
    Configure(*Config) error
}
```

## Best Practices

1. **Singleton vs Factory**: Use factory pattern for plugins that need per-request state
2. **Thread Safety**: Ensure plugins are safe for concurrent use
3. **Resource Cleanup**: Use context for cancellation and timeout handling
4. **Error Handling**: Return errors for detection failures, not absence of vulnerabilities
5. **Logging**: Structured logging with plugin name and target context
