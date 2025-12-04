---
name: capabilities-janus-chains
description: Use when building Janus chains - workflow design, tool orchestration, state management
allowed-tools: Read, Write, Bash, Glob, Grep
skill-type: process
---

# Janus Chain Development for Chariot

**You MUST use TodoWrite before starting to track all development steps.**

This skill covers Janus framework chain development for orchestrating security tools within the Chariot platform. Janus chains compose multiple Links into coordinated security workflows.

## Quick Reference

| Pattern | Use Case | Example |
|---------|----------|---------|
| Sequential Chain | Linear workflow | Scan → Parse → Store |
| Parallel MultiChain | Independent tasks | Scan multiple targets |
| Conditional Chain | Branching logic | If vulnerable → exploit |
| Aggregation Chain | Combine results | Merge scanner outputs |
| Recovery Chain | Error handling | Retry on failure |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Janus Chain                            │
│  Orchestrates Links, manages state, handles errors          │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Link A    │────▶│   Link B    │────▶│   Link C    │
│  (Scanner)  │     │  (Parser)   │     │  (Storage)  │
└─────────────┘     └─────────────┘     └─────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    State/Context                            │
│  Shared data passed between Links via channels              │
└─────────────────────────────────────────────────────────────┘
```

## Core Concepts

### Link Interface

Every tool in a chain implements the Link interface:

```go
// Link represents a single step in a chain
type Link interface {
    // Name returns the unique identifier
    Name() string

    // Execute performs the link's operation
    Execute(ctx context.Context, input Input) (Output, error)

    // Validate checks input before execution
    Validate(input Input) error
}

// Input carries data into a link
type Input struct {
    Data      any                // Primary input data
    Options   map[string]any     // Configuration options
    Metadata  map[string]any     // Execution metadata
}

// Output carries data out of a link
type Output struct {
    Data      any                // Primary output data
    Metadata  map[string]any     // Execution metadata
    Duration  time.Duration      // Execution time
}
```

### Chain Interface

Chains compose multiple Links:

```go
// Chain orchestrates Link execution
type Chain interface {
    // Add appends a link to the chain
    Add(link Link) Chain

    // Execute runs all links in sequence
    Execute(ctx context.Context, input Input) (Output, error)

    // WithErrorHandler sets error handling strategy
    WithErrorHandler(handler ErrorHandler) Chain

    // WithMiddleware adds cross-cutting concerns
    WithMiddleware(middleware Middleware) Chain
}
```

## Pattern 1: Sequential Chain

**Use Case**: Linear workflows where each step depends on the previous

```go
package chains

import (
    "context"

    "github.com/praetorian-inc/janus/pkg/chain"
    "github.com/praetorian-inc/janus/pkg/link"
)

// BuildScanChain creates a sequential scan workflow
func BuildScanChain() chain.Chain {
    return chain.New("scan-workflow").
        Add(NewTargetResolverLink()).  // Step 1: Resolve targets
        Add(NewNmapScannerLink()).     // Step 2: Scan ports
        Add(NewServiceParserLink()).   // Step 3: Parse services
        Add(NewResultStorageLink())    // Step 4: Store results
}

func main() {
    c := BuildScanChain()

    ctx := context.Background()
    output, err := c.Execute(ctx, link.Input{
        Data: []string{"example.com", "test.com"},
    })
    if err != nil {
        log.Fatal(err)
    }

    // Output contains aggregated results from all links
    results := output.Data.([]ScanResult)
}
```

### State Passing Between Links

```go
// Link output becomes next link's input automatically
type TargetResolverLink struct{}

func (l *TargetResolverLink) Execute(ctx context.Context, input link.Input) (link.Output, error) {
    domains := input.Data.([]string)

    var resolved []ResolvedTarget
    for _, domain := range domains {
        ips, _ := net.LookupIP(domain)
        resolved = append(resolved, ResolvedTarget{
            Domain: domain,
            IPs:    ips,
        })
    }

    return link.Output{
        Data: resolved,  // This becomes input.Data for next link
        Metadata: map[string]any{
            "resolved_count": len(resolved),
        },
    }, nil
}

type NmapScannerLink struct{}

func (l *NmapScannerLink) Execute(ctx context.Context, input link.Input) (link.Output, error) {
    // Receives resolved targets from previous link
    targets := input.Data.([]ResolvedTarget)

    var results []ScanResult
    for _, target := range targets {
        // Scan each resolved target
        result := l.scan(ctx, target)
        results = append(results, result)
    }

    return link.Output{Data: results}, nil
}
```

## Pattern 2: Parallel MultiChain

**Use Case**: Execute independent tasks concurrently

```go
// MultiChain runs multiple chains in parallel
func BuildParallelScanChain(targets []string) chain.Chain {
    mc := chain.NewMultiChain("parallel-scan")

    // Create a sub-chain for each target
    for _, target := range targets {
        subChain := chain.New(fmt.Sprintf("scan-%s", target)).
            Add(NewNmapScannerLink()).
            Add(NewServiceParserLink())

        mc.Add(subChain, link.Input{Data: target})
    }

    // Aggregate results from all sub-chains
    mc.WithAggregator(func(outputs []link.Output) link.Output {
        var allResults []ScanResult
        for _, out := range outputs {
            results := out.Data.([]ScanResult)
            allResults = append(allResults, results...)
        }
        return link.Output{Data: allResults}
    })

    return mc
}

// Execute parallel chains with worker pool
func ExecuteParallel(ctx context.Context, mc *chain.MultiChain, workers int) (link.Output, error) {
    return mc.ExecuteWithWorkers(ctx, workers)
}
```

### Worker Pool Configuration

```go
type WorkerPoolConfig struct {
    Workers     int           // Number of concurrent workers
    QueueSize   int           // Input queue buffer size
    Timeout     time.Duration // Per-task timeout
    GracePeriod time.Duration // Shutdown grace period
}

func NewWorkerPool(config WorkerPoolConfig) *WorkerPool {
    return &WorkerPool{
        workers:   config.Workers,
        tasks:     make(chan Task, config.QueueSize),
        results:   make(chan Result, config.QueueSize),
        timeout:   config.Timeout,
    }
}
```

## Pattern 3: Conditional Chain

**Use Case**: Branch execution based on results

```go
// ConditionalChain branches based on conditions
func BuildConditionalChain() chain.Chain {
    return chain.New("conditional-workflow").
        Add(NewVulnerabilityScannerLink()).
        AddConditional(
            // Condition: check if vulnerabilities found
            func(output link.Output) bool {
                vulns := output.Data.([]Vulnerability)
                return len(vulns) > 0
            },
            // If true: run exploit chain
            chain.New("exploit-chain").
                Add(NewExploitValidatorLink()).
                Add(NewExploitReporterLink()),
            // If false: run baseline chain
            chain.New("baseline-chain").
                Add(NewBaselineReporterLink()),
        )
}
```

### Switch Chain Pattern

```go
// SwitchChain selects chain based on value
func BuildSwitchChain() chain.Chain {
    return chain.New("switch-workflow").
        Add(NewClassifierLink()).
        AddSwitch(
            // Selector function
            func(output link.Output) string {
                return output.Data.(Classification).Type
            },
            // Case handlers
            map[string]chain.Chain{
                "web":     BuildWebScanChain(),
                "network": BuildNetworkScanChain(),
                "cloud":   BuildCloudScanChain(),
            },
            // Default handler
            BuildGenericScanChain(),
        )
}
```

## Pattern 4: Aggregation Chain

**Use Case**: Combine results from multiple sources

```go
// AggregationChain merges results from multiple chains
func BuildAggregationChain() chain.Chain {
    return chain.NewAggregation("multi-scanner").
        AddSource(BuildNmapChain()).
        AddSource(BuildMasscanChain()).
        AddSource(BuildNucleiChain()).
        WithMerger(func(outputs []link.Output) link.Output {
            merged := MergedResults{
                Ports:   extractPorts(outputs[0], outputs[1]),
                Vulns:   extractVulns(outputs[2]),
                Summary: buildSummary(outputs),
            }
            return link.Output{Data: merged}
        })
}

// Deduplication during merge
func extractPorts(nmap, masscan link.Output) []Port {
    seen := make(map[string]Port)

    for _, port := range nmap.Data.([]Port) {
        key := fmt.Sprintf("%s:%d", port.IP, port.Number)
        seen[key] = port
    }

    for _, port := range masscan.Data.([]Port) {
        key := fmt.Sprintf("%s:%d", port.IP, port.Number)
        if _, exists := seen[key]; !exists {
            seen[key] = port
        }
    }

    return maps.Values(seen)
}
```

## Pattern 5: Recovery Chain

**Use Case**: Handle errors with retry or fallback

```go
// Error handling strategies
type ErrorStrategy int

const (
    StrictMode   ErrorStrategy = iota // Fail on any error
    ModerateMode                      // Retry transient errors
    LaxMode                           // Continue on errors
)

func BuildRecoveryChain() chain.Chain {
    return chain.New("recovery-workflow").
        Add(NewPrimaryScannerLink()).
        WithErrorHandler(chain.ErrorHandler{
            Strategy: ModerateMode,
            MaxRetries: 3,
            RetryDelay: time.Second,
            OnError: func(err error, attempt int) chain.Action {
                if isTransient(err) && attempt < 3 {
                    return chain.Retry
                }
                return chain.Fallback
            },
            Fallback: NewBackupScannerLink(),
        })
}

// Retry with exponential backoff
func (h *ErrorHandler) handleWithRetry(ctx context.Context, link Link, input Input) (Output, error) {
    var lastErr error

    for attempt := 0; attempt <= h.MaxRetries; attempt++ {
        output, err := link.Execute(ctx, input)
        if err == nil {
            return output, nil
        }

        lastErr = err
        action := h.OnError(err, attempt)

        switch action {
        case chain.Retry:
            delay := h.RetryDelay * time.Duration(1<<attempt)
            time.Sleep(delay)
            continue
        case chain.Fallback:
            if h.Fallback != nil {
                return h.Fallback.Execute(ctx, input)
            }
            return Output{}, lastErr
        case chain.Skip:
            return Output{}, nil
        case chain.Abort:
            return Output{}, lastErr
        }
    }

    return Output{}, lastErr
}
```

## Configuration System

### YAML Configuration

```yaml
# chain-config.yaml
name: security-scan-workflow
version: "1.0"

links:
  - name: resolver
    type: target-resolver
    config:
      timeout: 30s
      dns_servers:
        - 8.8.8.8
        - 1.1.1.1

  - name: scanner
    type: nmap
    config:
      ports: "1-1000"
      rate_limit: 1000
      timeout: 5m
      arguments:
        - "-sV"
        - "-sC"

  - name: parser
    type: service-parser
    config:
      include_banners: true

  - name: storage
    type: dynamodb
    config:
      table: scan-results
      region: us-east-1

chain:
  type: sequential
  links:
    - resolver
    - scanner
    - parser
    - storage

error_handling:
  strategy: moderate
  max_retries: 3
  retry_delay: 1s
```

### Loading Configuration

```go
type ChainConfig struct {
    Name    string                 `yaml:"name"`
    Version string                 `yaml:"version"`
    Links   []LinkConfig           `yaml:"links"`
    Chain   ChainDefinition        `yaml:"chain"`
    ErrorHandling ErrorConfig      `yaml:"error_handling"`
}

func LoadChainFromConfig(path string) (chain.Chain, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("read config: %w", err)
    }

    var config ChainConfig
    if err := yaml.Unmarshal(data, &config); err != nil {
        return nil, fmt.Errorf("parse config: %w", err)
    }

    // Build chain from config
    c := chain.New(config.Name)

    for _, linkDef := range config.Chain.Links {
        linkConfig := findLinkConfig(config.Links, linkDef)
        link, err := createLink(linkConfig)
        if err != nil {
            return nil, fmt.Errorf("create link %s: %w", linkDef, err)
        }
        c.Add(link)
    }

    // Apply error handling
    c.WithErrorHandler(buildErrorHandler(config.ErrorHandling))

    return c, nil
}
```

## Middleware Pattern

### Logging Middleware

```go
type LoggingMiddleware struct {
    Logger *slog.Logger
}

func (m *LoggingMiddleware) Wrap(link Link) Link {
    return &loggedLink{
        inner:  link,
        logger: m.Logger,
    }
}

type loggedLink struct {
    inner  Link
    logger *slog.Logger
}

func (l *loggedLink) Execute(ctx context.Context, input Input) (Output, error) {
    start := time.Now()
    l.logger.Info("link started",
        "link", l.inner.Name(),
        "input_size", len(input.Data),
    )

    output, err := l.inner.Execute(ctx, input)

    l.logger.Info("link completed",
        "link", l.inner.Name(),
        "duration", time.Since(start),
        "error", err,
    )

    return output, err
}
```

### Metrics Middleware

```go
type MetricsMiddleware struct {
    Registry *prometheus.Registry
}

func (m *MetricsMiddleware) Wrap(link Link) Link {
    histogram := prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "link_execution_duration_seconds",
            Help: "Link execution duration",
        },
        []string{"link_name", "status"},
    )
    m.Registry.MustRegister(histogram)

    return &metricLink{
        inner:     link,
        histogram: histogram,
    }
}
```

### Tracing Middleware

```go
type TracingMiddleware struct {
    Tracer trace.Tracer
}

func (m *TracingMiddleware) Wrap(link Link) Link {
    return &tracedLink{
        inner:  link,
        tracer: m.Tracer,
    }
}

func (l *tracedLink) Execute(ctx context.Context, input Input) (Output, error) {
    ctx, span := l.tracer.Start(ctx, l.inner.Name())
    defer span.End()

    span.SetAttributes(
        attribute.String("link.name", l.inner.Name()),
    )

    output, err := l.inner.Execute(ctx, input)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
    }

    return output, err
}
```

## Testing Chains

```go
func TestScanChain(t *testing.T) {
    // Create mock links
    mockResolver := &MockLink{
        name: "resolver",
        output: link.Output{
            Data: []ResolvedTarget{{Domain: "test.com", IPs: []net.IP{}}},
        },
    }

    mockScanner := &MockLink{
        name: "scanner",
        output: link.Output{
            Data: []ScanResult{{Port: 80, Service: "http"}},
        },
    }

    // Build test chain
    c := chain.New("test-chain").
        Add(mockResolver).
        Add(mockScanner)

    // Execute
    ctx := context.Background()
    output, err := c.Execute(ctx, link.Input{
        Data: []string{"test.com"},
    })

    // Assert
    require.NoError(t, err)
    results := output.Data.([]ScanResult)
    assert.Len(t, results, 1)
    assert.Equal(t, 80, results[0].Port)
}

func TestParallelChain_Timeout(t *testing.T) {
    // Test timeout handling
    slowLink := &MockLink{
        name: "slow",
        delay: 10 * time.Second,
    }

    mc := chain.NewMultiChain("timeout-test").
        Add(chain.New("sub").Add(slowLink), link.Input{})

    ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
    defer cancel()

    _, err := mc.Execute(ctx)

    assert.ErrorIs(t, err, context.DeadlineExceeded)
}
```

## Development Checklist

Before deploying a new chain:

- [ ] All Links implement the Link interface
- [ ] State passing between Links is type-safe
- [ ] Error handling strategy defined (Strict/Moderate/Lax)
- [ ] Timeouts configured for all external calls
- [ ] Parallel chains have worker limits
- [ ] Configuration can be loaded from YAML
- [ ] Middleware applied for logging/metrics
- [ ] Unit tests for individual Links
- [ ] Integration tests for full chain
- [ ] Performance tested with realistic data volumes

## References

- [modules/janus-framework/](../../../../modules/janus-framework/) - Framework source
- [modules/nebula/](../../../../modules/nebula/) - Link implementations
- [Janus Framework Documentation](../../../../modules/janus-framework/README.md) - Full API reference
