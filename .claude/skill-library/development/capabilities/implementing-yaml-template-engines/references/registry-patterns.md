# Registry Patterns

**Template registry patterns with concurrent access and hot-reloading.**

## Overview

A template registry manages the lifecycle of templates: loading, compiling, caching, and hot-reloading. It must handle concurrent access safely and support dynamic template updates without downtime.

**Pattern:** Follow `pkg/` structure from fingerprintx/go-cicd projects - `internal/registry/` for registration logic.

## Basic Registry Structure

```go
package registry

import (
    "fmt"
    "sync"
)

type TemplateRegistry struct {
    mu        sync.RWMutex
    templates map[string]*CompiledTemplate
    loader    TemplateLoader
    stats     RegistryStats
}

type RegistryStats struct {
    TotalTemplates   int
    LoadedTemplates  int
    FailedTemplates  int
    LastReloadTime   time.Time
    ReloadCount      int
}

func NewRegistry(loader TemplateLoader) *TemplateRegistry {
    return &TemplateRegistry{
        templates: make(map[string]*CompiledTemplate),
        loader:    loader,
    }
}
```

## Template Loader Interface

```go
type TemplateLoader interface {
    Load(path string) ([]*RawTemplate, error)
    Watch(path string) (<-chan TemplateEvent, error)
}

type TemplateEvent struct {
    Type     EventType // Created, Modified, Deleted
    Template *RawTemplate
}

type EventType int

const (
    EventCreated EventType = iota
    EventModified
    EventDeleted
)
```

## Core Registry Operations

### Load Templates

```go
func (r *TemplateRegistry) LoadFromDirectory(dir string) error {
    rawTemplates, err := r.loader.Load(dir)
    if err != nil {
        return fmt.Errorf("failed to load templates: %w", err)
    }

    var loadErrors []error
    loaded := 0
    failed := 0

    for _, raw := range rawTemplates {
        if err := r.Register(raw); err != nil {
            loadErrors = append(loadErrors, fmt.Errorf(
                "template %s: %w", raw.ID, err))
            failed++
        } else {
            loaded++
        }
    }

    r.mu.Lock()
    r.stats.TotalTemplates = len(rawTemplates)
    r.stats.LoadedTemplates = loaded
    r.stats.FailedTemplates = failed
    r.mu.Unlock()

    if len(loadErrors) > 0 {
        return &LoadError{Errors: loadErrors}
    }

    return nil
}

type LoadError struct {
    Errors []error
}

func (e *LoadError) Error() string {
    return fmt.Sprintf("%d template(s) failed to load", len(e.Errors))
}
```

### Register Template

```go
func (r *TemplateRegistry) Register(raw *RawTemplate) error {
    // Parse YAML
    template, err := ParseTemplate(raw.Data)
    if err != nil {
        return fmt.Errorf("parse error: %w", err)
    }

    // Compile
    compiled, err := CompileTemplate(template)
    if err != nil {
        return fmt.Errorf("compile error: %w", err)
    }

    // Store in registry
    r.mu.Lock()
    defer r.mu.Unlock()

    if existing, ok := r.templates[compiled.ID]; ok {
        log.Warnf("Overwriting existing template: %s", compiled.ID)
        _ = existing // Optional: version tracking
    }

    r.templates[compiled.ID] = compiled
    return nil
}
```

### Get Template

```go
func (r *TemplateRegistry) Get(id string) (*CompiledTemplate, bool) {
    r.mu.RLock()
    defer r.mu.RUnlock()

    template, ok := r.templates[id]
    return template, ok
}

func (r *TemplateRegistry) GetAll() []*CompiledTemplate {
    r.mu.RLock()
    defer r.mu.RUnlock()

    templates := make([]*CompiledTemplate, 0, len(r.templates))
    for _, t := range r.templates {
        templates = append(templates, t)
    }

    return templates
}
```

### Unregister Template

```go
func (r *TemplateRegistry) Unregister(id string) error {
    r.mu.Lock()
    defer r.mu.Unlock()

    if _, ok := r.templates[id]; !ok {
        return fmt.Errorf("template not found: %s", id)
    }

    delete(r.templates, id)
    return nil
}
```

## Hot-Reloading

### File Watcher Integration

```go
import "github.com/fsnotify/fsnotify"

func (r *TemplateRegistry) EnableHotReload(dir string) error {
    watcher, err := fsnotify.NewWatcher()
    if err != nil {
        return fmt.Errorf("failed to create watcher: %w", err)
    }

    if err := watcher.Add(dir); err != nil {
        return fmt.Errorf("failed to watch directory: %w", err)
    }

    go r.watchLoop(watcher)
    return nil
}

func (r *TemplateRegistry) watchLoop(watcher *fsnotify.Watcher) {
    defer watcher.Close()

    for {
        select {
        case event, ok := <-watcher.Events:
            if !ok {
                return
            }

            if !strings.HasSuffix(event.Name, ".yaml") {
                continue
            }

            r.handleFileEvent(event)

        case err, ok := <-watcher.Errors:
            if !ok {
                return
            }
            log.Errorf("Watcher error: %v", err)
        }
    }
}

func (r *TemplateRegistry) handleFileEvent(event fsnotify.Event) {
    switch {
    case event.Op&fsnotify.Write == fsnotify.Write:
        r.reloadTemplate(event.Name)

    case event.Op&fsnotify.Create == fsnotify.Create:
        r.loadNewTemplate(event.Name)

    case event.Op&fsnotify.Remove == fsnotify.Remove:
        r.removeTemplate(event.Name)
    }
}

func (r *TemplateRegistry) reloadTemplate(path string) {
    data, err := os.ReadFile(path)
    if err != nil {
        log.Errorf("Failed to read %s: %v", path, err)
        return
    }

    raw := &RawTemplate{Path: path, Data: data}
    if err := r.Register(raw); err != nil {
        log.Errorf("Failed to reload %s: %v", path, err)
    } else {
        log.Infof("Reloaded template: %s", path)
        r.mu.Lock()
        r.stats.ReloadCount++
        r.stats.LastReloadTime = time.Now()
        r.mu.Unlock()
    }
}
```

## Concurrent Access Patterns

### Read-Heavy Workload

```go
// Optimize for many readers, few writers
type ReadOptimizedRegistry struct {
    templates atomic.Value // map[string]*CompiledTemplate
    mu        sync.Mutex   // Only for writes
}

func (r *ReadOptimizedRegistry) Get(id string) (*CompiledTemplate, bool) {
    templates := r.templates.Load().(map[string]*CompiledTemplate)
    template, ok := templates[id]
    return template, ok
}

func (r *ReadOptimizedRegistry) Register(raw *RawTemplate) error {
    compiled, err := CompileTemplate(ParseTemplate(raw.Data))
    if err != nil {
        return err
    }

    r.mu.Lock()
    defer r.mu.Unlock()

    // Copy-on-write
    oldMap := r.templates.Load().(map[string]*CompiledTemplate)
    newMap := make(map[string]*CompiledTemplate, len(oldMap)+1)

    for k, v := range oldMap {
        newMap[k] = v
    }
    newMap[compiled.ID] = compiled

    r.templates.Store(newMap)
    return nil
}
```

### Sharded Registry

For high-concurrency workloads:

```go
type ShardedRegistry struct {
    shards []*RegistryShard
    count  int
}

type RegistryShard struct {
    mu        sync.RWMutex
    templates map[string]*CompiledTemplate
}

func NewShardedRegistry(shardCount int) *ShardedRegistry {
    shards := make([]*RegistryShard, shardCount)
    for i := range shards {
        shards[i] = &RegistryShard{
            templates: make(map[string]*CompiledTemplate),
        }
    }

    return &ShardedRegistry{
        shards: shards,
        count:  shardCount,
    }
}

func (r *ShardedRegistry) getShard(id string) *RegistryShard {
    hash := fnv.New32a()
    hash.Write([]byte(id))
    index := int(hash.Sum32()) % r.count
    return r.shards[index]
}

func (r *ShardedRegistry) Get(id string) (*CompiledTemplate, bool) {
    shard := r.getShard(id)
    shard.mu.RLock()
    defer shard.mu.RUnlock()

    template, ok := shard.templates[id]
    return template, ok
}

func (r *ShardedRegistry) Register(compiled *CompiledTemplate) {
    shard := r.getShard(compiled.ID)
    shard.mu.Lock()
    defer shard.mu.Unlock()

    shard.templates[compiled.ID] = compiled
}
```

## Self-Registration Pattern

**Recommended for Chariot integration** - templates register themselves:

```go
// internal/registry/registry.go
var globalRegistry = NewRegistry()

func Register(id string, template *CompiledTemplate) {
    globalRegistry.Register(template)
}

func Get(id string) (*CompiledTemplate, bool) {
    return globalRegistry.Get(id)
}

// In template package
func init() {
    // Self-register on package import
    template := &CompiledTemplate{
        ID: "example-detection",
        // ... template definition
    }
    registry.Register("example-detection", template)
}
```

**Study fingerprintx and go-cicd for this pattern:**

```go
// modules/go-cicd/internal/registry/registry.go
// modules/fingerprintx/pkg/plugins/registry.go
```

## Version Management

### Track Template Versions

```go
type VersionedTemplate struct {
    Current  *CompiledTemplate
    Previous *CompiledTemplate
    Version  int
    Updated  time.Time
}

type VersionedRegistry struct {
    mu        sync.RWMutex
    templates map[string]*VersionedTemplate
}

func (r *VersionedRegistry) Register(compiled *CompiledTemplate) {
    r.mu.Lock()
    defer r.mu.Unlock()

    if existing, ok := r.templates[compiled.ID]; ok {
        existing.Previous = existing.Current
        existing.Current = compiled
        existing.Version++
        existing.Updated = time.Now()
    } else {
        r.templates[compiled.ID] = &VersionedTemplate{
            Current: compiled,
            Version: 1,
            Updated: time.Now(),
        }
    }
}

func (r *VersionedRegistry) Rollback(id string) error {
    r.mu.Lock()
    defer r.mu.Unlock()

    vt, ok := r.templates[id]
    if !ok {
        return fmt.Errorf("template not found: %s", id)
    }

    if vt.Previous == nil {
        return fmt.Errorf("no previous version for: %s", id)
    }

    vt.Current = vt.Previous
    vt.Previous = nil
    return nil
}
```

## Registry Statistics

```go
func (r *TemplateRegistry) Stats() RegistryStats {
    r.mu.RLock()
    defer r.mu.RUnlock()

    return RegistryStats{
        TotalTemplates:  len(r.templates),
        LoadedTemplates: r.stats.LoadedTemplates,
        FailedTemplates: r.stats.FailedTemplates,
        LastReloadTime:  r.stats.LastReloadTime,
        ReloadCount:     r.stats.ReloadCount,
    }
}

func (r *TemplateRegistry) TemplateIDs() []string {
    r.mu.RLock()
    defer r.mu.RUnlock()

    ids := make([]string, 0, len(r.templates))
    for id := range r.templates {
        ids = append(ids, id)
    }
    sort.Strings(ids)
    return ids
}
```

## Integration with Chariot

### Janus Framework Registration

```go
// Register template executor as Janus tool
package registry

import "github.com/praetorian-inc/janus"

func init() {
    janus.RegisterTool("template-executor", &TemplateExecutor{
        registry: globalRegistry,
    })
}

type TemplateExecutor struct {
    registry *TemplateRegistry
}

func (e *TemplateExecutor) Execute(ctx context.Context, input *janus.Input) (*janus.Output, error) {
    templateID := input.Params["template_id"].(string)
    target := input.Params["target"].(string)

    template, ok := e.registry.Get(templateID)
    if !ok {
        return nil, fmt.Errorf("template not found: %s", templateID)
    }

    // Execute template against target
    results := executeTemplate(template, target)

    return &janus.Output{Data: results}, nil
}
```

## Best Practices

1. **Thread Safety**: Always use RWMutex for concurrent access
2. **Lazy Loading**: Don't load all templates at startup if you have thousands
3. **Error Isolation**: One bad template shouldn't break the registry
4. **Metrics**: Track load times, cache hits, reload counts
5. **Graceful Degradation**: Continue with old version if reload fails
6. **Atomic Updates**: Use copy-on-write for zero-downtime reloads

## Study These Implementations

**Nuclei registry patterns:**

- How templates are discovered and loaded
- Template ID namespace management
- Concurrent access handling

**Fingerprintx registry:**

- `modules/fingerprintx/pkg/plugins/registry.go` - Plugin self-registration
- Hot-reloading disabled for plugins (compiled in)

**Go-cicd registry:**

- `modules/go-cicd/internal/registry/registry.go` - Platform plugin registration
- Factory pattern for creating platform instances
