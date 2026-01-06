# Generics vs Interfaces: When to Use Each

This reference covers the decision framework for choosing between Go generics (`[T any]`) and traditional interfaces, based on Go 1.18+ patterns and production tool analysis.

---

## Decision Matrix

| Use Case                                      | Use Generics `[T any]`         | Use Interfaces            |
| --------------------------------------------- | ------------------------------ | ------------------------- |
| Container data structures                     | ✅ Yes (type-safe collections) | ❌ No                     |
| Algorithm reuse (sort, filter, map)           | ✅ Yes (compile-time type)     | ❌ No                     |
| Multiple unrelated types with common behavior | ✅ Yes with constraints        | Partial                   |
| Behavioral abstraction (polymorphism)         | ❌ No                          | ✅ Yes (method dispatch)  |
| Runtime type selection                        | ❌ No                          | ✅ Yes                    |
| Dependency injection                          | ❌ No                          | ✅ Yes (accept interface) |
| Plugin systems                                | ❌ No                          | ✅ Yes                    |
| Mocking for tests                             | ❌ No                          | ✅ Yes                    |

**Rule of Thumb:**

- **Generics:** "Same operation, different types" (data structure agnostic)
- **Interfaces:** "Different operations, common contract" (behavior polymorphism)

---

## Migration Patterns: interface{} → Generics

### Pattern 1: Generic Collections

**Source:** Research synthesis and Go 1.18+ best practices

**Before (Pre-Go 1.18):**

```go
// ❌ BAD: Type erasure, runtime panics
type Stack struct {
    items []interface{}
}

func (s *Stack) Push(item interface{}) {
    s.items = append(s.items, item)
}

func (s *Stack) Pop() interface{} {
    if len(s.items) == 0 {
        return nil  // Caller must check for nil
    }
    item := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return item  // Caller must type-assert
}

// Usage - unsafe
stack := &Stack{}
stack.Push("hello")
stack.Push(42)  // Mixed types allowed!
val := stack.Pop().(string)  // PANIC: got int
```

**After (Go 1.18+):**

```go
// ✅ GOOD: Type-safe, compile-time checked
type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(item T) {
    s.items = append(s.items, item)
}

func (s *Stack[T]) Pop() (T, bool) {
    var zero T
    if len(s.items) == 0 {
        return zero, false  // Explicit "empty" signal
    }
    item := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return item, true  // No type assertion needed
}

// Usage - compile-time safe
stack := &Stack[string]{}
stack.Push("hello")
stack.Push(42)  // COMPILE ERROR: cannot use int as string
val, ok := stack.Pop()  // val is string, no assertion
```

### Pattern 2: Generic Algorithms

**Before:**

```go
// ❌ BAD: Requires type assertions, limited to interface{}
func Contains(slice []interface{}, target interface{}) bool {
    for _, item := range slice {
        if item == target {
            return true
        }
    }
    return false
}

// Usage
slice := []interface{}{"a", "b", "c"}
found := Contains(slice, "b")  // Works but loses type info
```

**After:**

```go
// ✅ GOOD: Type-safe, works with any comparable type
func Contains[T comparable](slice []T, target T) bool {
    for _, item := range slice {
        if item == target {
            return true
        }
    }
    return false
}

// Usage - preserves types
strings := []string{"a", "b", "c"}
found := Contains(strings, "b")  // T inferred as string

ints := []int{1, 2, 3}
found := Contains(ints, 2)  // T inferred as int
```

### Pattern 3: Generic Pipeline (Trivy Model)

**Source:** Research from `.claude/.output/research/2026-01-01-202322-production-go-streaming-scanners/SYNTHESIS.md`

Trivy (30K stars) uses generic pipelines in `pkg/parallel/pipeline.go`:

```go
// Production pattern from Trivy
type Pipeline[T, U any] struct {
    numWorkers int
    onItem     func(context.Context, T) (U, error)  // Transform T → U
    onResult   func(context.Context, U) error        // Consume U
}

func (p Pipeline[T, U]) Do(ctx context.Context, items []T) error {
    g, ctx := errgroup.WithContext(ctx)

    itemCh := make(chan T, len(items))
    results := make(chan U, p.numWorkers)

    // Feed items
    for _, item := range items {
        itemCh <- item
    }
    close(itemCh)

    // Start workers
    for i := 0; i < p.numWorkers; i++ {
        g.Go(func() error {
            for item := range itemCh {
                result, err := p.onItem(ctx, item)
                if err != nil {
                    return err
                }
                results <- result
            }
            return nil
        })
    }

    // Collect results
    go func() {
        g.Wait()
        close(results)
    }()

    for result := range results {
        if err := p.onResult(ctx, result); err != nil {
            return err
        }
    }

    return g.Wait()
}
```

**Usage:**

```go
// Type-safe workflow → finding pipeline
pipeline := Pipeline[Workflow, []Finding]{
    numWorkers: 10,
    onItem: func(ctx context.Context, wf Workflow) ([]Finding, error) {
        return scanner.ScanWorkflow(ctx, wf)
    },
    onResult: func(ctx context.Context, findings []Finding) error {
        return reporter.Report(findings)
    },
}

pipeline.Do(ctx, workflows)
```

---

## Combining Generics with Interfaces

### Pattern: Interface Constraints

Use interfaces to constrain generic types:

```go
// Interface defines required behavior
type Scanner interface {
    Scan(ctx context.Context) ([]Finding, error)
}

// Generic function accepts any Scanner
func ScanAll[T Scanner](ctx context.Context, scanners []T) ([]Finding, error) {
    var allFindings []Finding
    for _, s := range scanners {
        findings, err := s.Scan(ctx)
        if err != nil {
            return nil, err
        }
        allFindings = append(allFindings, findings...)
    }
    return allFindings, nil
}

// Works with any implementation
httpScanners := []HTTPScanner{...}
findings, _ := ScanAll(ctx, httpScanners)

dnsScanners := []DNSScanner{...}
findings, _ := ScanAll(ctx, dnsScanners)
```

### Pattern: Union Type Constraints

**Go 1.18+ union types for specific type sets:**

```go
// Accept only specific types
type Number interface {
    int | int32 | int64 | float32 | float64
}

func Sum[T Number](values []T) T {
    var total T
    for _, v := range values {
        total += v
    }
    return total
}

// Usage
ints := []int{1, 2, 3}
sum := Sum(ints)  // T = int

floats := []float64{1.1, 2.2, 3.3}
sum := Sum(floats)  // T = float64

// Compile error for unsupported types
strings := []string{"a", "b"}
Sum(strings)  // ERROR: string does not satisfy Number
```

### Pattern: Method Constraint

**Require specific methods without interface:**

```go
// Constraint: must have String() method
type Stringer interface {
    String() string
}

func PrintAll[T Stringer](items []T) {
    for _, item := range items {
        fmt.Println(item.String())
    }
}

// Any type with String() works
type User struct { Name string }
func (u User) String() string { return u.Name }

users := []User{{Name: "Alice"}, {Name: "Bob"}}
PrintAll(users)  // Works - User has String()
```

---

## When NOT to Use Generics

### 1. Runtime Polymorphism Required

```go
// ❌ Generics can't do runtime type selection
func ProcessUnknown[T any](data T) {
    // Can't switch on T at runtime effectively
}

// ✅ Use interface for runtime polymorphism
type Processor interface {
    Process() error
}

func ProcessAny(p Processor) error {
    return p.Process()  // Runtime dispatch to correct impl
}
```

### 2. Plugin/Extension Systems

```go
// ❌ Generics don't work for plugin registration
var plugins []Plugin[???]  // What's the type?

// ✅ Use interface for plugin systems
type Plugin interface {
    Name() string
    Execute(ctx context.Context) error
}

var plugins []Plugin  // Any Plugin impl works
```

### 3. Dependency Injection

```go
// ❌ Generics over-complicate DI
type Service[T Repository] struct {
    repo T
}

// ✅ Interface for clean DI
type Service struct {
    repo Repository  // Interface field
}

func NewService(repo Repository) *Service {
    return &Service{repo: repo}
}
```

---

## Performance Comparison

**Source:** Research synthesis - benchmarks and production analysis

| Approach       | Compilation               | Runtime                 | Type Safety |
| -------------- | ------------------------- | ----------------------- | ----------- |
| Concrete types | Fast                      | Fastest (no dispatch)   | ✅ Full     |
| Generics       | Slower (monomorphization) | Fast (specialized code) | ✅ Full     |
| Interfaces     | Fast                      | Slower (vtable lookup)  | ✅ Full     |
| interface{}    | Fast                      | Slow (type assertions)  | ❌ None     |

**Benchmark guidance:**

- Generics: ~1-5% slower compile, equal or faster runtime than interface
- Interfaces: ~2.4x slower than concrete types in hot paths
- interface{}: Same as interfaces + type assertion overhead (~200ns)

---

## Migration Checklist

When converting interface{} to generics:

### 1. Identify the Pattern

```bash
# Find interface{} usage
grep -rn "interface{}" --include="*.go" .
```

### 2. Classify Usage

- [ ] Collection/container → **Migrate to generics**
- [ ] Algorithm (sort, filter, map) → **Migrate to generics**
- [ ] Serialization (JSON, YAML) → **Keep interface{}**
- [ ] Plugin system → **Keep/use interfaces**
- [ ] Dependency injection → **Use interfaces**

### 3. Apply Pattern

```go
// Before
func Process(items []interface{}) []interface{}

// After - if items are homogeneous
func Process[T any](items []T) []T

// After - if items need specific behavior
func Process[T Processable](items []T) []T

// After - if truly heterogeneous (rare)
// Keep interface{} or reconsider design
```

### 4. Update Tests

```go
// Before
func TestProcess(t *testing.T) {
    result := Process([]interface{}{"a", "b"})
    assert.Equal(t, "a", result[0].(string))  // Type assertion
}

// After
func TestProcess(t *testing.T) {
    result := Process([]string{"a", "b"})
    assert.Equal(t, "a", result[0])  // Direct comparison
}
```

---

## Summary: Decision Framework

```
Do I need type polymorphism?
├─ Same operation on different types (data-agnostic)?
│   └─ ✅ Use GENERICS
│       Examples: Stack[T], Contains[T], Pipeline[T,U]
│
├─ Different operations with common contract?
│   └─ ✅ Use INTERFACES
│       Examples: Scanner, Plugin, Repository
│
├─ Both? (same algorithm, behavior polymorphism)
│   └─ ✅ COMBINE: Generic with interface constraint
│       Example: func ScanAll[T Scanner](scanners []T)
│
└─ Truly unknown type? (serialization, reflection)
    └─ ✅ Use interface{} (the legitimate case)
        Examples: json.Marshal, reflect.TypeOf
```

---

## References

1. [Go Blog - Generic Interfaces](https://go.dev/blog/generic-interfaces) - Go 1.18+ patterns
2. [Go Blog - Type Parameters Proposal](https://go.dev/blog/go1.18) - Generics introduction
3. Research: `.claude/.output/research/2026-01-01-202322-production-go-streaming-scanners/SYNTHESIS.md` - Trivy Pipeline[T,U]
4. Research: `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/web.md` - Interface vs generics guidance
5. [Trivy pkg/parallel/pipeline.go](https://github.com/aquasecurity/trivy/blob/main/pkg/parallel/pipeline.go) - Production generic pipeline
