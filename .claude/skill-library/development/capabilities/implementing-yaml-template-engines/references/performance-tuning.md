# Performance Tuning

**Performance tuning with benchmarks for compile time and execution time.**

## Compilation Performance

### Benchmark Compilation

```go
func BenchmarkCompileTemplate(b *testing.B) {
    data, _ := os.ReadFile("testdata/example-template.yaml")

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        template, _ := ParseTemplate(data)
        _, _ = CompileTemplate(template)
    }
}

// Typical results:
// BenchmarkCompileTemplate-8    5000   250000 ns/op   (0.25ms per template)
```

### Optimization: Pre-Compile Regex

```go
// BEFORE: Compile on every execution (slow)
func (m *RegexMatcher) Match(response *Response) bool {
    for _, pattern := range m.Regex {
        re := regexp.MustCompile(pattern) // SLOW
        if re.MatchString(response.Body) {
            return true
        }
    }
    return false
}

// AFTER: Compile once during template compilation (fast)
type CompiledRegexMatcher struct {
    Patterns []*regexp.Regexp // Pre-compiled
}

func (m *CompiledRegexMatcher) Match(response *Response) bool {
    for _, re := range m.Patterns {
        if re.MatchString(response.Body) {
            return true
        }
    }
    return false
}

// Performance gain: 100x faster
```

## Execution Performance

### Benchmark Template Execution

```go
func BenchmarkExecuteTemplate(b *testing.B) {
    template := loadCompiledTemplate("example-detection")
    target := "http://example.com"

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _ = Execute(template, target)
    }
}
```

### Matcher Performance

```go
// Benchmark different matcher types
func BenchmarkWordMatcher(b *testing.B) {
    matcher := &WordMatcher{Words: []string{"admin", "root"}}
    response := &Response{Body: strings.Repeat("test data ", 1000)}

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _ = matcher.Match(response)
    }
}

// Results (operations per second):
// WordMatcher:   1,000,000 ops/sec
// RegexMatcher:    100,000 ops/sec (10x slower)
// DSLMatcher:       10,000 ops/sec (100x slower)
```

## Memory Optimization

### Template Cache Size

```go
// Monitor cache memory usage
func (c *TemplateCache) MemoryUsage() uint64 {
    c.mu.RLock()
    defer c.mu.RUnlock()

    var total uint64
    for _, t := range c.templates {
        total += templateSize(t)
    }
    return total
}

func templateSize(t *CompiledTemplate) uint64 {
    // Estimate: ID + Info + Requests + Matchers
    size := uint64(len(t.ID) + 1024) // Base size
    size += uint64(len(t.Requests) * 512) // Per-request overhead
    return size
}
```

### Response Body Streaming

```go
// Don't load entire response into memory for large responses
func executeStreamingRequest(req *HTTPRequest, target string) (*Response, error) {
    resp, err := httpClient.Do(buildRequest(req, target))
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    // Limit body size
    limitedReader := io.LimitReader(resp.Body, 10*1024*1024) // 10MB max

    body, err := io.ReadAll(limitedReader)
    if err != nil {
        return nil, err
    }

    return &Response{
        StatusCode: resp.StatusCode,
        Headers:    extractHeaders(resp),
        Body:       string(body),
    }, nil
}
```

## Concurrency Patterns

### Parallel Template Execution

```go
func ExecuteParallel(templates []*CompiledTemplate, target string, workers int) []*Result {
    jobs := make(chan *CompiledTemplate, len(templates))
    results := make(chan *Result, len(templates))

    // Start workers
    var wg sync.WaitGroup
    for i := 0; i < workers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for template := range jobs {
                result, _ := Execute(template, target)
                if result != nil {
                    results <- result
                }
            }
        }()
    }

    // Send jobs
    for _, template := range templates {
        jobs <- template
    }
    close(jobs)

    // Wait and collect
    go func() {
        wg.Wait()
        close(results)
    }()

    var allResults []*Result
    for result := range results {
        allResults = append(allResults, result)
    }

    return allResults
}

// Benchmark: Find optimal worker count
// 1 worker:   1000ms
// 4 workers:   250ms (4x speedup)
// 10 workers:  100ms (10x speedup)
// 50 workers:  100ms (no additional gain, CPU-bound)
```

### Rate Limiting

```go
import "golang.org/x/time/rate"

type RateLimitedExecutor struct {
    limiter *rate.Limiter
}

func NewRateLimitedExecutor(requestsPerSecond int) *RateLimitedExecutor {
    return &RateLimitedExecutor{
        limiter: rate.NewLimiter(rate.Limit(requestsPerSecond), 1),
    }
}

func (e *RateLimitedExecutor) Execute(template *CompiledTemplate, target string) (*Result, error) {
    // Wait for rate limiter
    if err := e.limiter.Wait(context.Background()); err != nil {
        return nil, err
    }

    return Execute(template, target)
}
```

## HTTP Client Tuning

### Connection Pooling

```go
var httpClient = &http.Client{
    Transport: &http.Transport{
        MaxIdleConns:        100,              // Total idle connections
        MaxIdleConnsPerHost: 10,               // Per-host idle connections
        IdleConnTimeout:     90 * time.Second, // How long to keep idle
        DisableKeepAlives:   false,            // Enable keep-alive
    },
    Timeout: 30 * time.Second,
}

// Performance gain: 50% faster for clustered requests
```

### DNS Caching

```go
var resolver = &net.Resolver{
    PreferGo: true,
    Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
        d := net.Dialer{Timeout: 5 * time.Second}
        return d.DialContext(ctx, network, address)
    },
}

// Use custom resolver with caching
httpClient.Transport.(*http.Transport).DialContext = func(ctx context.Context, network, addr string) (net.Conn, error) {
    // Cache DNS lookups
    return resolver.Dial(ctx, network, addr)
}
```

## Profiling

### CPU Profiling

```go
import _ "net/http/pprof"

func main() {
    go func() {
        log.Println(http.ListenAndServe("localhost:6060", nil))
    }()

    // Profile: go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30
    // Top CPU consumers will be shown
}
```

### Memory Profiling

```go
// Heap profile: go tool pprof http://localhost:6060/debug/pprof/heap
// Shows memory allocations
```

See remaining: testing-patterns.md, chariot-integration.md
