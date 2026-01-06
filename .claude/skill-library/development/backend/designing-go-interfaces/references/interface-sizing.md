# Interface Sizing Guidelines

This reference provides detailed guidance on interface sizing, with evidence from production Go code (165K+ stars) and authoritative sources.

---

## Ideal Interface Sizes

**Source:** Research from production scanners and Go standard library

| Size            | Assessment           | Examples                                          |
| --------------- | -------------------- | ------------------------------------------------- |
| **1 method**    | ✅ Ideal             | `io.Reader`, `io.Writer`, `http.Handler`, `error` |
| **2 methods**   | ✅ Good              | `io.ReadWriter`, Nuclei `Executor`, gosec `Rule`  |
| **3 methods**   | ✅ Acceptable        | TruffleHog `Detector`                             |
| **4-5 methods** | ⚠️ Approaching limit | Consider splitting                                |
| **6+ methods**  | ❌ Too large         | Split into multiple interfaces                    |

**Production scanner average:** 1.8 methods per interface

---

## Why Small Interfaces Win

### 1. Easier to Implement

```go
// ❌ BAD: 8 methods = high barrier to entry
type FullScanner interface {
    Configure(Config) error
    Validate() error
    Initialize() error
    Scan(Target) ([]Result, error)
    Report([]Result) error
    Cleanup() error
    GetStats() Stats
    Reset() error
}

// ✅ GOOD: 1 method = trivial to implement
type Scanner interface {
    Scan(Target) ([]Result, error)
}
```

### 2. Better Testability

```go
// ❌ BAD: Mock with 8 empty methods
type mockFullScanner struct{}
func (m *mockFullScanner) Configure(Config) error { return nil }
func (m *mockFullScanner) Validate() error { return nil }
func (m *mockFullScanner) Initialize() error { return nil }
func (m *mockFullScanner) Scan(Target) ([]Result, error) { ... }  // Only this matters
func (m *mockFullScanner) Report([]Result) error { return nil }
func (m *mockFullScanner) Cleanup() error { return nil }
func (m *mockFullScanner) GetStats() Stats { return Stats{} }
func (m *mockFullScanner) Reset() error { return nil }

// ✅ GOOD: Mock with 1 method
type mockScanner struct {
    scanFunc func(Target) ([]Result, error)
}
func (m *mockScanner) Scan(t Target) ([]Result, error) {
    return m.scanFunc(t)
}
```

### 3. Higher Composition

```go
// Small interfaces compose beautifully
type Reader interface { Read([]byte) (int, error) }
type Writer interface { Write([]byte) (int, error) }
type Closer interface { Close() error }

// Compose as needed
type ReadWriter interface { Reader; Writer }
type ReadCloser interface { Reader; Closer }
type WriteCloser interface { Writer; Closer }
type ReadWriteCloser interface { Reader; Writer; Closer }
```

### 4. More Implementations Possible

| Interface Size | Typical Implementations | Example                                 |
| -------------- | ----------------------- | --------------------------------------- |
| 1 method       | Many (100+)             | golangci-lint `Linter` has 100+ linters |
| 2-3 methods    | Several (10-50)         | TruffleHog has 800+ detectors           |
| 5+ methods     | Few (2-5)               | Hard to satisfy all requirements        |
| 10+ methods    | Often 1                 | Defeats purpose of interface            |

---

## When to Split Interfaces

### Indicator 1: Not All Implementations Need All Methods

```go
// ❌ BAD: FileStorage doesn't need Replicate()
type Storage interface {
    Read(key string) ([]byte, error)
    Write(key string, data []byte) error
    Delete(key string) error
    Replicate() error  // Only cloud storage needs this
    Sync() error       // Only file storage needs this
}

// ✅ GOOD: Split by capability
type Storage interface {
    Read(key string) ([]byte, error)
    Write(key string, data []byte) error
    Delete(key string) error
}

type Replicatable interface {
    Replicate() error
}

type Syncable interface {
    Sync() error
}

// Check capability at runtime:
if r, ok := storage.(Replicatable); ok {
    r.Replicate()
}
```

### Indicator 2: Methods Serve Different Concerns

```go
// ❌ BAD: Mixed concerns (CRUD + lifecycle + metrics)
type Service interface {
    // CRUD
    Create(entity Entity) error
    Read(id string) (Entity, error)
    Update(entity Entity) error
    Delete(id string) error

    // Lifecycle
    Start() error
    Stop() error

    // Metrics
    GetStats() Stats
    ResetStats()
}

// ✅ GOOD: Separated by concern
type Repository interface {
    Create(entity Entity) error
    Read(id string) (Entity, error)
    Update(entity Entity) error
    Delete(id string) error
}

type Lifecycle interface {
    Start() error
    Stop() error
}

type Metrics interface {
    GetStats() Stats
    ResetStats()
}
```

### Indicator 3: Testing Requires Mocking Unused Methods

If your test file has many `func (m *mock) UnusedMethod() error { panic("not implemented") }`, the interface is too large.

```go
// ❌ BAD: Test only uses Scan() but must mock 5 methods
func TestProcessor(t *testing.T) {
    mock := &mockFullService{
        scanFunc: func() {}  // Only this is tested
    }
    // Other 4 methods have panic implementations
}

// ✅ GOOD: Define test-local interface
type scanner interface {
    Scan(Target) ([]Result, error)
}

// Real service satisfies this automatically
var _ scanner = (*FullService)(nil)
```

---

## Interface Segregation Strategies

### Strategy 1: Separate Read/Write Operations

```go
// Combined (before)
type Storage interface {
    Read(key string) ([]byte, error)
    Write(key string, data []byte) error
    Delete(key string) error
    List() ([]string, error)
    Exists(key string) bool
}

// Segregated (after)
type Reader interface {
    Read(key string) ([]byte, error)
    Exists(key string) bool
}

type Writer interface {
    Write(key string, data []byte) error
    Delete(key string) error
}

type Lister interface {
    List() ([]string, error)
}

// Compose as needed
type ReadWriter interface {
    Reader
    Writer
}
```

### Strategy 2: Separate Configuration from Operation

```go
// Combined (before)
type Scanner interface {
    Configure(opts Options) error
    Validate() error
    Scan(target Target) ([]Result, error)
    GetConfig() Options
}

// Segregated (after)
type Scanner interface {
    Scan(target Target) ([]Result, error)
}

type Configurable interface {
    Configure(opts Options) error
    GetConfig() Options
}

type Validatable interface {
    Validate() error
}
```

### Strategy 3: Composition for Complex Needs

```go
// Define minimal interfaces
type Detector interface {
    Detect(ctx context.Context, data []byte) ([]Finding, error)
}

type Verifier interface {
    Verify(ctx context.Context, finding Finding) (bool, error)
}

type Reporter interface {
    Report(ctx context.Context, findings []Finding) error
}

// Compose for specific use cases
type FullDetector interface {
    Detector
    Verifier
}

type DetectorWithReporting interface {
    Detector
    Reporter
}
```

---

## Standard Library Examples

### Single-Method Interfaces (Ideal)

| Interface  | Method                                | Package    | Usage                  |
| ---------- | ------------------------------------- | ---------- | ---------------------- |
| `Reader`   | `Read([]byte) (int, error)`           | `io`       | File, network, buffers |
| `Writer`   | `Write([]byte) (int, error)`          | `io`       | File, network, buffers |
| `Closer`   | `Close() error`                       | `io`       | Resources              |
| `Handler`  | `ServeHTTP(ResponseWriter, *Request)` | `net/http` | Web handlers           |
| `error`    | `Error() string`                      | builtin    | All errors             |
| `Stringer` | `String() string`                     | `fmt`      | Display                |

### Two-Method Interfaces (Good)

| Interface     | Methods           | Package |
| ------------- | ----------------- | ------- |
| `ReadWriter`  | `Read` + `Write`  | `io`    |
| `ReadCloser`  | `Read` + `Close`  | `io`    |
| `WriteCloser` | `Write` + `Close` | `io`    |

### Why They Work

1. **Each method is essential** - No optional methods
2. **Cohesive purpose** - All methods serve same goal
3. **Same abstraction level** - No mixing high/low level
4. **Composable** - Combine to form larger interfaces

---

## Production Scanner Interface Sizes

**Source:** Research from `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/github.md`

| Project       | Stars | Interface  | Methods | Purpose                        |
| ------------- | ----- | ---------- | ------- | ------------------------------ |
| TruffleHog    | 24K   | `Detector` | 3       | `FromData`, `Keywords`, `Type` |
| Trivy         | 31K   | `Scanner`  | 1       | `Scan`                         |
| Nuclei        | 26K   | `Executor` | 2       | `Compile`, `Execute`           |
| golangci-lint | 18K   | `Linter`   | 1       | `Run`                          |
| gosec         | 8K    | `Rule`     | 2       | `ID`, `Match`                  |

**Average:** 1.8 methods
**Maximum:** 3 methods
**Minimum:** 1 method

### Why These Sizes Work

**TruffleHog (3 methods):**

- `FromData()` - Core detection
- `Keywords()` - Pre-filtering optimization
- `Type()` - Result categorization
- All directly related to detection

**golangci-lint (1 method):**

- `Run()` - Only thing needed
- Configuration via YAML, not interface
- Enables 100+ diverse linters

---

## Decision Framework

### Question 1: How Many Methods?

```
Does caller need all methods together?
├─ Yes → Keep together (cohesive)
└─ No → Split by usage pattern
```

### Question 2: Are Methods Related?

```
Do all methods serve the same high-level goal?
├─ Yes → Keep together
└─ No → Split by concern
```

### Question 3: Same Abstraction Level?

```
Are all methods at same level (e.g., all I/O or all business logic)?
├─ Yes → Keep together
└─ No → Split by layer
```

### Question 4: Testing Impact?

```
Do tests need to mock methods they don't use?
├─ Yes → Interface too large, split
└─ No → Size is appropriate
```

---

## Migration: Large Interface → Small Interfaces

### Step 1: Identify Usage Patterns

```bash
# Find all implementations
grep -rn "func.*implements.*YourInterface" --include="*.go"

# Find all consumers
grep -rn "YourInterface" --include="*.go" | grep -v "type\|func"
```

### Step 2: Group Methods by Consumer

| Consumer  | Methods Used      |
| --------- | ----------------- |
| Handler A | `Read`, `Write`   |
| Handler B | `Read` only       |
| Handler C | `Write`, `Delete` |

### Step 3: Extract Minimal Interfaces

```go
// Before: One large interface
type Storage interface {
    Read(key string) ([]byte, error)
    Write(key string, data []byte) error
    Delete(key string) error
    List() ([]string, error)
}

// After: Multiple small interfaces
type Reader interface {
    Read(key string) ([]byte, error)
}

type Writer interface {
    Write(key string, data []byte) error
}

type Deleter interface {
    Delete(key string) error
}

// Existing implementations still satisfy all interfaces
// Consumers can now accept minimal interface they need
```

### Step 4: Update Consumers

```go
// Before: Accept full interface
func processData(s Storage) error {
    data, _ := s.Read("key")  // Only uses Read
    // ...
}

// After: Accept minimal interface
func processData(r Reader) error {
    data, _ := r.Read("key")
    // ...
}
```

---

## Summary

### Golden Rules

1. **Default to 1-2 methods** - Production average is 1.8
2. **Never exceed 5 methods** - If approaching, split
3. **All methods must be cohesive** - Same goal, same level
4. **Let consumers define** - They know what they need
5. **Compose, don't bloat** - Small interfaces combine

### Quick Size Guide

| Methods | Decision                       |
| ------- | ------------------------------ |
| 1       | ✅ Ideal                       |
| 2       | ✅ Good                        |
| 3       | ✅ Acceptable                  |
| 4       | ⚠️ Review necessity            |
| 5       | ⚠️ Strong justification needed |
| 6+      | ❌ Split required              |

---

## References

1. [Go Blog - Organizing Go Code](https://go.dev/blog/organizing-go-code) - "If in doubt, leave it out!"
2. [Dave Cheney - Practical Go](https://dave.cheney.net/practical-go/presentations/gophercon-israel.html) - "Prefer small interfaces"
3. [Effective Go - Interfaces](https://go.dev/doc/effective_go#interfaces) - Interface design philosophy
4. Research: Production scanner analysis (165K+ stars) - Average 1.8 methods
5. Go standard library - `io.Reader`, `io.Writer`, `http.Handler` patterns
