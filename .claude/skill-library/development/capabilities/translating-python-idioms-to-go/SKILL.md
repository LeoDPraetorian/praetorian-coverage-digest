---
name: translating-python-idioms-to-go
description: Use when porting Python code to Go - systematic translation patterns for classes, decorators, generators, exceptions using Go 1.25+ features
allowed-tools: Read
---

# Translating Python Idioms to Go

**Pattern dictionary for converting Python code to idiomatic Go using Go 1.25+ features.**

## When to Use

Use when:

- Porting Python capabilities to Go (garak → venator)
- Converting Python classes, decorators, generators
- Unsure how to translate specific Python pattern
- Want to ensure idiomatic Go (not transliteration)

**This is a reference skill** - load it, find your pattern, implement.

## Go Version Context

**Target**: Go 1.25.3+ (August 2025)
**Key features**: `iter.Seq` stabilized, range over func, improved generics

## Quick Reference

| Python Pattern     | Go Equivalent         | Go Version | See |
| ------------------ | --------------------- | ---------- | --- |
| `yield` generators | `iter.Seq[T]`         | 1.23+      | §1  |
| Class inheritance  | Interface + embedding | Any        | §2  |
| `@decorator`       | Middleware/options    | Any        | §3  |
| `try/except`       | `if err != nil`       | Any        | §4  |
| `async/await`      | Goroutines + errgroup | Any        | §5  |
| `@dataclass`       | Struct + constructor  | Any        | §6  |
| `[x for x...]`     | Loop or Map generic   | 1.18+      | §7  |
| `Optional[T]`      | `*T` pointer          | Any        | §8  |
| `Union[A,B]`       | `A \| B` constraint   | 1.18+      | §8  |

**For detailed examples**, see [references/pattern-catalog.md](references/pattern-catalog.md)

## Pattern 1: Generators → iter.Seq

**Python**: Function with `yield`
**Go 1.25**: Return `iter.Seq[T]` function

```python
def generate(): yield item
```

```go
func Generate() iter.Seq[Item] {
    return func(yield func(Item) bool) {
        if !yield(item) { return }
    }
}
```

**Usage**: `for item := range Generate() { ... }`

## Pattern 2: Classes → Interfaces + Embedding

**Python**: `class Child(Parent)` with `@abstractmethod`
**Go**: Interface for contract, struct embedding for composition

```python
class Base(ABC):
    @abstractmethod
    def method(self): pass

class Child(Base):
    def method(self): ...
```

```go
type Iface interface { Method() error }
type Base struct { field string }
type Child struct { Base }
func (c *Child) Method() error { ... }
```

## Pattern 3: Decorators → Middleware/Options

**Python**: `@decorator` above function
**Go**: Middleware chain OR functional options

**For one-off wrapping**: Middleware
**For configuration**: Functional options (replaces `**kwargs`)

```python
@retry(3)
def call(): ...
```

```go
// Middleware
func call() { return withRetry(3, actualCall) }

// Options (constructor)
NewClient(WithRetry(3), WithTimeout(30*time.Second))
```

## Pattern 4: Exceptions → Error Returns

**Python**: `try/except/finally`
**Go**: `if err != nil` + `defer` + `errors.As`

```python
try: result = op()
except SpecificErr: handle()
finally: cleanup()
```

```go
result, err := op()
defer cleanup()
if err != nil {
    var specific *SpecificErr
    if errors.As(err, &specific) { handle() }
}
```

## Pattern 5: Async → Goroutines

**Python**: `async def` + `await asyncio.gather`
**Go**: Goroutines + `errgroup` (standard pattern)

```python
async def run_all(items):
    results = await asyncio.gather(*[process(i) for i in items])
```

```go
g, ctx := errgroup.WithContext(ctx)
for i, item := range items {
    i, item := i, item
    g.Go(func() error { results[i], err = process(ctx, item); return err })
}
err := g.Wait()
```

## Pattern 6: @dataclass → Structs

**Python**: `@dataclass` with defaults
**Go**: Struct + constructor with defaults

```python
@dataclass
class Config:
    name: str
    timeout: int = 30
```

```go
type Config struct {
    Name    string `json:"name"`
    Timeout int    `json:"timeout"`
}

func NewConfig(name string) *Config {
    return &Config{Name: name, Timeout: 30}
}
```

## Pattern 7: Comprehensions → Loops/Generics

**Python**: `[expr for x in items if cond]`
**Go**: Loop or generic `Map/Filter`

Simple cases: Use loops
Complex/reusable: Generic helpers

## Pattern 8: Type Hints → Native Types

**Python typing → Go**:

- `List[T]` → `[]T`
- `Dict[K,V]` → `map[K]V`
- `Optional[T]` → `*T`
- `Union[A,B]` → `A | B` (type constraint)

## Go-Specific Requirements

### Context (Always First Parameter)

```go
func Method(ctx context.Context, other params...) error
```

### Plugin Registration (Explicit)

```go
func init() {
    plugin.Register("name", &Implementation{})
}
```

## Anti-Patterns

❌ Don't transliterate Python syntax
❌ Don't use `panic` for control flow
❌ Don't use `interface{}` everywhere
❌ Don't ignore `context.Context`

**See**: [references/anti-patterns.md](references/anti-patterns.md)

## Pattern Selection

**Identify Python pattern in source:**

1. Has `yield`? → iter.Seq (§1)
2. Has `class(Base)`? → Interface + embedding (§2)
3. Has `@decorator`? → Middleware or options (§3)
4. Has `try/except`? → Error handling (§4)
5. Has `async def`? → Goroutines (§5)
6. Has `@dataclass`? → Struct + constructor (§6)
7. Has `[x for x...]`? → Loop or generics (§7)
8. Has `Optional/Union`? → Pointers or constraints (§8)

**Then**: Load pattern from catalog, implement in Go

## Garak-Specific Examples

**For concrete garak → venator examples:**

- [references/garak-examples.md](references/garak-examples.md)

Covers:

- Probe.probe() → Prober.Probe()
- Generator.generate() → Generator.Generate()
- Detector.detect() → Detector.Detect()
- Configurable base → Config embedding
- buff() yield → iter.Seq

## Integration

**Phase 2.5** of porting workflow:

1. Architecture Analysis
2. Dependency Mapping
3. **Idiom Translation** ← THIS SKILL
4. Reference Port
5. Systematic Port

## Key Principles

1. **Composition over inheritance**
2. **Explicit over implicit**
3. **Errors are values**
4. **Concurrency is built-in**
5. **Simplicity over cleverness**
6. **Use modern Go features**

## Related Skills

- `mapping-python-dependencies-to-go` - WHAT libraries
- `analyzing-python-for-go-port` - Analyze structure
- `porting-python-capability-to-go` - Full workflow

## Web References

**Go 1.25**: https://leapcell.io/blog/go-1-25-upgrade-guide
**iter.Seq**: https://pkg.go.dev/iter
**Embedding**: https://dev.to/arasosman/understanding-gos-type-system-a-complete-guide-to-interfaces-structs-and-composition-2025-3an
**Options**: https://www.sohamkamani.com/golang/options-pattern/
**Errors**: https://karneliuk.com/2025/02/from-python-to-go-013-handling-errors-and-exceptions/
**Concurrency**: https://peerdh.com/blogs/programming-insights/comparing-gos-goroutines-and-pythons-asyncio
