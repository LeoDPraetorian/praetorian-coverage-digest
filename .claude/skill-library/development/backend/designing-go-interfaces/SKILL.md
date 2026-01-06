---
name: designing-go-interfaces
description: Use when designing Go interfaces, deciding interface{} vs generics vs concrete types, creating library APIs, or reviewing interface design - applies "accept interfaces, return structs" and caller-defines-interface patterns from Dave Cheney and Uber Go. Handles "god interface", "premature abstraction", "type assertion panic", io.Reader, http.Handler, json.Marshal API patterns
allowed-tools: Read, Grep, Glob, LSP
---

# Designing Go Interfaces

**Apply production-validated Go interface design principles from Dave Cheney, Go team, and Uber Engineering.**

## When to Use

Use this skill when:

- Designing new Go interfaces or APIs
- Deciding between `interface{}`, generics `[T any]`, or concrete types
- Reviewing interface design in code reviews
- Refactoring code to improve interface boundaries
- Creating library APIs for external consumption
- Evaluating whether to accept/return interfaces vs structs

**Important:** You MUST use TodoWrite before starting to track all steps

## Core Principles

### 1. Accept Interfaces, Return Structs

**Dave Cheney's canonical principle:**

```go
// ✅ GOOD: Accept interface, return struct
func NewProcessor(logger Logger) *Processor {
    return &Processor{logger: logger}
}

// ❌ BAD: Return interface
func NewProcessor(logger Logger) Logger {
    return &processor{...}
}
```

**Why:** Returning concrete types preserves flexibility. Callers can still use them via interfaces if needed, but aren't locked into the interface you chose.

### 2. Let Callers Define Interfaces

**Dependency inversion pattern:**

```go
// ✅ GOOD: Caller defines minimal interface
package scanner
type ResultWriter interface {
    Write(result Result) error
}

// ❌ BAD: Library forces large interface
package scanner
type Output interface {
    Write(result Result) error
    Flush() error
    Close() error
    SetFormat(format string)
    // 10+ more methods...
}
```

**Why:** Callers know their exact needs. Let them define interfaces that extract only what they need from your structs.

### 3. Prefer Small Interfaces

**Guideline:** 1-3 methods ideal, 5 maximum.

```go
// ✅ EXCELLENT: Single method
type Detector interface {
    Detect(data []byte) (Result, error)
}

// ✅ GOOD: Two focused methods
type Scanner interface {
    Scan(target string) error
    Results() []Finding
}

// ⚠️ WARNING: Approaching limit
type Executor interface {
    Execute(ctx context.Context) error
    Validate() error
    Cleanup() error
    SetOptions(opts Options)
    GetStatus() Status  // Consider splitting
}
```

**See:** [references/interface-sizing.md](references/interface-sizing.md) for complete sizing guidelines and splitting strategies.

### 4. If in Doubt, Leave It Out

**Rob Pike principle: Minimize exported API surface.**

```go
// ✅ GOOD: Start with concrete types, add interfaces when needed
type Scanner struct {
    client *http.Client
    config Config
}

// Add interface ONLY when multiple implementations emerge
type HTTPClient interface {
    Do(req *http.Request) (*http.Response, error)
}
```

**Why:** Interfaces are contracts. Every exported interface creates coupling. Start concrete, add interfaces when patterns emerge.

## When to Use `interface{}` (Empty Interface)

### ✅ Legitimate Use Cases

Use `interface{}` when types are **truly unpredictable at compile time**:

```go
// ✅ GOOD: JSON marshal handles any type
func json.Marshal(v interface{}) ([]byte, error)

// ✅ GOOD: Logging arbitrary values
func fmt.Printf(format string, args ...interface{})

// ✅ GOOD: Template rendering with dynamic data
func template.Execute(wr io.Writer, data interface{}) error
```

**Pattern:** Standard library APIs where type safety is impossible (serialization, reflection, formatting).

### ❌ Anti-Patterns

**Do NOT use `interface{}` when:**

1. **Type safety is achievable with concrete types:**

```go
// ❌ BAD: Loses type safety
func Process(input interface{}) interface{}

// ✅ GOOD: Type-safe with concrete types
func Process(input Request) Response
```

2. **Generics are available (Go 1.18+):**

```go
// ❌ BAD: Forces type assertions
func Filter(items []interface{}, predicate func(interface{}) bool) []interface{}

// ✅ GOOD: Type-safe with generics
func Filter[T any](items []T, predicate func(T) bool) []T
```

3. **Caller knows the expected type:**

```go
// ❌ BAD: Caller must type-assert
func GetConfig(key string) interface{}

// ✅ GOOD: Return specific type
func GetConfig(key string) *Config
```

**See:** [references/empty-interface-patterns.md](references/empty-interface-patterns.md) for comprehensive anti-pattern catalog.

## Modern Alternative: Generics

**Since Go 1.18, prefer generics for type-safe flexibility:**

```go
// ❌ OLD: Runtime type assertions
func Contains(slice []interface{}, item interface{}) bool {
    for _, v := range slice {
        if v == item {
            return true
        }
    }
    return false
}

// ✅ NEW: Compile-time type safety
func Contains[T comparable](slice []T, item T) bool {
    for _, v := range slice {
        if v == item {
            return true
        }
    }
    return false
}
```

**Benefits:**

- Compile-time type checking
- No runtime type assertions
- Better performance (no interface boxing)
- Clearer intent in API signatures

**See:** [references/generics-vs-interfaces.md](references/generics-vs-interfaces.md) for migration patterns.

## Production Validation

**Analysis of 5 major Go security scanners (24K-30K stars):**

| Project       | Stars | Core Interface Pattern    | Uses `interface{}`? |
| ------------- | ----- | ------------------------- | ------------------- |
| TruffleHog    | 24K   | `type Detector interface` | ❌ No               |
| Trivy         | 30K   | `type Scanner interface`  | ❌ No               |
| Nuclei        | 26K   | `type Executor interface` | ❌ No               |
| golangci-lint | 18K   | `type Linter interface`   | ❌ No               |
| gosec         | 8K    | `type Rule interface`     | ❌ No               |

**Finding:** 0/5 production scanners use `interface{}` in their core interfaces. All use concrete types with small, focused interfaces.

**See:** [references/production-case-studies.md](references/production-case-studies.md) for detailed analysis.

## Performance Impact

**Benchmark data** (interface dispatch vs concrete types):

```text
BenchmarkConcrete-8    1000000    1250 ns/op
BenchmarkInterface-8    500000    3000 ns/op  (2.4x slower)
```

**Why interfaces are slower:**

1. **Indirect dispatch:** Method calls go through vtable lookup
2. **Heap allocation:** Interface values may cause escape-to-heap
3. **No inlining:** Compiler cannot inline interface method calls

**Trade-off:** Use interfaces for decoupling, not performance. Accept the cost when abstraction value exceeds performance cost.

**See:** [references/performance-benchmarks.md](references/performance-benchmarks.md) for detailed benchmarks.

## Quick Decision Tree

```text
Need abstraction?
├─ No → Use concrete types
└─ Yes → Who defines interface?
    ├─ Caller → Let them define it
    └─ Library → Is it truly unpredictable?
        ├─ Yes (json.Marshal, fmt.Print) → interface{}
        └─ No → Generics or concrete types
```

## Interface Design Workflow

### Step 1: Start with Concrete Types

```go
// Start here
type Scanner struct {
    client *http.Client
    config Config
}

func (s *Scanner) Scan(target string) ([]Result, error) {
    // Implementation
}
```

### Step 2: Identify Abstraction Needs

**Wait for real duplication:**

- Second implementation emerges
- Testing requires mocking
- Caller needs to substitute behavior

### Step 3: Extract Minimal Interface

```go
// Extract only what's needed
type TargetScanner interface {
    Scan(target string) ([]Result, error)
}
```

### Step 4: Keep Implementation Concrete

```go
// Implementation stays concrete
type Scanner struct {
    client *http.Client
    config Config
}

// Concrete type satisfies interface implicitly
var _ TargetScanner = (*Scanner)(nil)
```

**See:** [references/workflow-patterns.md](references/workflow-patterns.md) for complete workflow examples.

## Common Anti-Patterns

### 1. Premature Interface Extraction

```go
// ❌ BAD: Interface before second implementation
type UserService interface {
    CreateUser(User) error
    GetUser(id string) (User, error)
    UpdateUser(User) error
    DeleteUser(id string) error
}

// ✅ GOOD: Wait until you need abstraction
type UserService struct {
    db *Database
}
```

### 2. God Interfaces

```go
// ❌ BAD: 15+ methods
type CloudProvider interface {
    CreateVM(...) error
    DeleteVM(...) error
    ListVMs(...) ([]VM, error)
    CreateStorage(...) error
    DeleteStorage(...) error
    // ... 10 more methods
}

// ✅ GOOD: Segregated interfaces
type VMManager interface {
    CreateVM(...) error
    DeleteVM(...) error
}

type StorageManager interface {
    CreateStorage(...) error
    DeleteStorage(...) error
}
```

### 3. Interface{} Overuse

```go
// ❌ BAD: Loses all type safety
func ProcessData(input interface{}) interface{} {
    // Type assertions everywhere
}

// ✅ GOOD: Use generics
func ProcessData[T any](input T) T {
    // Type-safe operations
}
```

**See:** [references/anti-patterns.md](references/anti-patterns.md) for comprehensive catalog.

## Code Review Checklist

**When reviewing interfaces, ask:**

- [ ] Does interface have >5 methods? (Consider splitting)
- [ ] Could caller define this interface instead?
- [ ] Is `interface{}` used when generics would work?
- [ ] Are we returning interfaces instead of structs?
- [ ] Does interface exist before second implementation?
- [ ] Can concrete types be used instead?

**See:** [references/review-checklist.md](references/review-checklist.md) for complete review guide.

## References

**Official Go resources:**

- [Go Blog - Interface Values](https://go.dev/blog/laws-of-reflection)
- [Effective Go - Interfaces](https://go.dev/doc/effective_go#interfaces)
- [Go Blog - Organizing Code](https://go.dev/blog/organizing-go-code)

**Industry best practices:**

- [Dave Cheney - Practical Go](https://dave.cheney.net/practical-go/presentations/gophercon-israel.html)
- [Uber Go Style Guide](https://github.com/uber-go/guide/blob/master/style.md)
- [Boot.dev - Interface Best Practices](https://blog.boot.dev/golang/golang-interfaces/)

**Research:**

- `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/web.md`

## Related Skills

- `adhering-to-dry` - DRY principles for avoiding premature abstraction
- `adhering-to-yagni` - YAGNI principles for minimal interface design
- `debugging-systematically` - Debug interface design issues
- `gateway-backend` - Go backend patterns and architectures
