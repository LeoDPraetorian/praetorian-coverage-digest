# golangci-lint Case Study

Analysis of golangci-lint's (18K+ GitHub stars) plugin registry architecture that orchestrates 100+ linters with parallel execution, caching, and configuration-driven enablement.

**Repository:** https://github.com/golangci/golangci-lint
**Stars:** 18,228 | **License:** GPL-3.0

---

## Overview

golangci-lint is a meta-linter that aggregates 100+ Go linters (errcheck, staticcheck, govet, gosec, etc.) into a single unified tool. Rather than building its own analysis logic, it orchestrates existing linters through a centralized registry with:

- **Parallel linter execution** (fan-out pattern)
- **File-level caching** (skip unchanged files)
- **Configuration-driven enablement** (YAML-based)
- **Result aggregation and deduplication**

This architecture provides a production-validated pattern for orchestrating many independent plugins.

---

## Architecture

### Directory Structure

```
golangci-lint/
├── pkg/golinters/           # One file per linter wrapper (100+ files)
│   ├── errcheck/
│   │   └── errcheck.go      # Wraps github.com/kisielk/errcheck
│   ├── govet/
│   │   └── govet.go         # Wraps go/analysis/passes
│   ├── staticcheck/
│   │   └── staticcheck.go   # Wraps honnef.co/go/tools
│   └── ...
├── pkg/lint/
│   ├── linter/
│   │   └── config.go        # Linter metadata and configuration
│   └── lintersdb/
│       └── manager.go       # Central linter registry
└── pkg/result/
    └── issue.go             # Unified issue format
```

### Core Interface

```go
// pkg/lint/linter/linter.go
type Linter interface {
    // Run executes the linter on the given packages
    Run(ctx context.Context, lintCtx *linter.Context) ([]result.Issue, error)
}

// Context provides packages, settings, and file info to linters
type Context struct {
    Packages        []*packages.Package
    Settings        *config.LintersSettings
    LoadMode        packages.LoadMode
    FileCache       *fsutils.FileCache
}
```

### Linter Configuration Metadata

```go
// pkg/lint/linter/config.go
type Config struct {
    Linter           Linter
    EnabledByDefault bool

    // Metadata for CLI and documentation
    LoadMode         packages.LoadMode
    InPresets        []string           // "bugs", "style", "performance"
    AlternativeNames []string
    OriginalURL      string             // Link to upstream linter
    CanAutoFix       bool
    IsSlow           bool               // Affects default enabled state
    Since            string             // Version introduced

    // Deprecation handling
    Deprecation      *Deprecation
}

type Deprecation struct {
    Since       string
    Message     string
    Replacement string
}
```

---

## Registration Pattern

### Central Registry (Manager)

```go
// pkg/lint/lintersdb/manager.go
type Manager struct {
    nameToLCs map[string][]*linter.Config  // name -> linter configs
    cfg       *config.Config
    log       logutils.Log
}

// GetAllLinterConfigsForPreset returns linters matching a preset
func (m *Manager) GetAllLinterConfigsForPreset(preset string) []*linter.Config {
    var ret []*linter.Config
    for _, lc := range m.GetAllSupportedLinterConfigs() {
        if slices.Contains(lc.InPresets, preset) {
            ret = append(ret, lc)
        }
    }
    return ret
}

// GetEnabledLintersMap returns only enabled linters based on config
func (m *Manager) GetEnabledLintersMap() (map[string]*linter.Config, error) {
    // Merge default enabled + user config enable/disable
    // Returns ready-to-execute linter set
}
```

### Linter Registration

Each linter registers itself via a builder function pattern:

```go
// pkg/golinters/errcheck/errcheck.go
func New(settings *config.ErrcheckSettings) *goanalysis.Linter {
    analyzer := &analysis.Analyzer{
        Name: "errcheck",
        Doc:  "Errcheck is a program for checking for unchecked errors",
        Run:  runErrcheck(settings),
    }

    return goanalysis.NewLinter(
        "errcheck",
        "errcheck checks for unchecked errors in Go code",
        []*analysis.Analyzer{analyzer},
        nil,
    ).WithLoadMode(goanalysis.LoadModeTypesInfo)
}

// Registration in lintersdb/builder_linter.go
func (LinterBuilder) Build(cfg *config.Config) []*linter.Config {
    return []*linter.Config{
        linter.NewConfig(errcheck.New(cfg.LintersSettings.Errcheck)).
            WithPresets(linter.PresetBugs, linter.PresetError).
            WithLoadForGoAnalysis().
            WithURL("https://github.com/kisielk/errcheck"),
        // ... 100+ more linters
    }
}
```

---

## Parallel Execution

### Runner Architecture

```go
// pkg/lint/runner.go
type Runner struct {
    Log           logutils.Log
    Processors    []processors.Processor
    lintCtx       *linter.Context
}

func (r *Runner) Run(ctx context.Context, linters []*linter.Config) ([]result.Issue, error) {
    // Fan-out: run all linters concurrently
    g, ctx := errgroup.WithContext(ctx)
    issuesChan := make(chan []result.Issue, len(linters))

    for _, lc := range linters {
        lc := lc // capture loop variable
        g.Go(func() error {
            issues, err := lc.Linter.Run(ctx, r.lintCtx)
            if err != nil {
                return fmt.Errorf("linter %s failed: %w", lc.Name(), err)
            }
            issuesChan <- issues
            return nil
        })
    }

    // Wait for all linters to complete
    if err := g.Wait(); err != nil {
        return nil, err
    }
    close(issuesChan)

    // Fan-in: collect all issues
    var allIssues []result.Issue
    for issues := range issuesChan {
        allIssues = append(allIssues, issues...)
    }

    // Post-process: deduplicate, filter, format
    return r.processIssues(allIssues)
}
```

### Result Aggregation

```go
// pkg/result/issue.go
type Issue struct {
    FromLinter           string
    Text                 string
    Severity             string
    SourceLines          []string
    Replacement          *Replacement  // For auto-fix
    Pos                  token.Position
    ExpectNoLint         bool
    ExpectedNoLintLinter string
}

// Processors filter and transform issues after collection
type Processor interface {
    Process(issues []result.Issue) ([]result.Issue, error)
    Name() string
}
```

---

## Caching Strategy

### File-Level Cache

```go
// pkg/fsutils/filecache.go
type FileCache struct {
    files     sync.Map  // path -> *File
    checksums sync.Map  // path -> checksum
}

func (fc *FileCache) GetFileBytes(path string) ([]byte, error) {
    // Check if file changed since last run
    currentChecksum := fc.computeChecksum(path)
    if cached, ok := fc.checksums.Load(path); ok {
        if cached == currentChecksum {
            // File unchanged, skip analysis
            return fc.getCachedResult(path)
        }
    }

    // File changed, read and cache
    content, err := os.ReadFile(path)
    fc.checksums.Store(path, currentChecksum)
    return content, err
}
```

### Analysis Cache

```go
// pkg/lint/cache/cache.go
type Cache struct {
    dir string
}

// Key includes: linter version, file checksums, config hash
func (c *Cache) Get(key string) ([]result.Issue, bool) {
    // Retrieve cached linter results if inputs unchanged
}

func (c *Cache) Put(key string, issues []result.Issue) error {
    // Store results for future runs
}
```

---

## Configuration-Driven Enablement

### YAML Configuration

```yaml
# .golangci.yml
linters:
  enable:
    - errcheck
    - gosec
    - staticcheck
  disable:
    - typecheck
  presets:
    - bugs
    - performance

linters-settings:
  errcheck:
    check-type-assertions: true
    check-blank: true
  gosec:
    excludes:
      - G104 # Audit errors not checked
```

### Dynamic Enablement

```go
// Configuration resolution order:
// 1. Built-in defaults (EnabledByDefault in Config)
// 2. Preset expansion (bugs, style, performance)
// 3. User enable/disable overrides
// 4. Command-line flags

func (m *Manager) resolveEnabledLinters() []*linter.Config {
    enabled := m.getDefaultEnabled()
    enabled = m.applyPresets(enabled)
    enabled = m.applyUserConfig(enabled)
    return enabled
}
```

---

## Key Takeaways for Our Registry

### 1. Metadata-Rich Registration

```go
// Include metadata at registration time, not discovery time
type PluginConfig struct {
    Plugin           Plugin
    EnabledByDefault bool
    Category         string      // For filtering
    Dependencies     []string    // For ordering
    IsSlow           bool        // For parallel grouping
}
```

### 2. Parallel-Safe Execution

```go
// Use errgroup for coordinated parallel execution
g, ctx := errgroup.WithContext(ctx)
for _, plugin := range plugins {
    plugin := plugin
    g.Go(func() error {
        return plugin.Run(ctx)
    })
}
return g.Wait()
```

### 3. Configuration-Driven Enablement

```go
// Separate registration from enablement
type Registry struct {
    all     map[string]*PluginConfig  // All registered
    enabled map[string]*PluginConfig  // User-enabled subset
}

func (r *Registry) ApplyConfig(cfg Config) {
    r.enabled = r.resolveEnabled(cfg.Enable, cfg.Disable, cfg.Presets)
}
```

### 4. Caching for Incremental Analysis

```go
// Cache based on input checksums
type CacheKey struct {
    PluginVersion string
    InputChecksum string
    ConfigHash    string
}
```

### 5. Unified Result Format

```go
// All plugins emit same issue type for consistent handling
type Finding struct {
    PluginName  string
    Severity    string
    Message     string
    Location    Location
    Suggestion  *Suggestion  // Optional fix
}
```

---

## Performance Characteristics

| Metric          | Value                  | Notes                 |
| --------------- | ---------------------- | --------------------- |
| Linter count    | 100+                   | All run concurrently  |
| Throughput      | Thousands of files/min | On typical CI servers |
| Cache hit rate  | 80-95%                 | On incremental runs   |
| Memory overhead | ~500MB                 | For large codebases   |

**Key Insight:** golangci-lint achieves high throughput by:

1. Running linters in parallel (not sequentially)
2. Skipping unchanged files via caching
3. Using efficient result aggregation (fan-in pattern)

This pattern scales well because linter execution dominates runtime, not the orchestration overhead.
