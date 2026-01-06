# Empty Interface Patterns: When interface{} IS and ISN'T Appropriate

This reference documents legitimate uses of `interface{}` (aliased as `any` in Go 1.18+) versus anti-patterns, based on research of production Go code and authoritative sources.

---

## Legitimate Uses of `interface{}`

**Source:** [Calhoun.io - How do interfaces work in Go](https://www.calhoun.io/how-do-interfaces-work-in-go/)

> "The empty interface is useful in situations where you need to accept and work with unpredictable or user-defined types. You'll see it used in a number of places throughout the standard library for that exact reason."

### 1. Serialization/Deserialization

**Type is genuinely unknown at compile time:**

```go
// ✅ OK: json.Marshal handles any user-defined struct
func json.Marshal(v interface{}) ([]byte, error)
func json.Unmarshal(data []byte, v interface{}) error

// Usage - user defines struct, library doesn't know it
type MyCustomStruct struct {
    Name  string `json:"name"`
    Count int    `json:"count"`
}

data, _ := json.Marshal(MyCustomStruct{Name: "test", Count: 42})
```

**Why it's OK:** The JSON library truly cannot predict what types users will serialize. The library must accept anything.

**Other legitimate serialization functions:**

- `gob.Encode(interface{})`
- `yaml.Marshal(interface{})`
- `xml.Marshal(interface{})`

### 2. Formatted Output

**Display any type for debugging/logging:**

```go
// ✅ OK: fmt.Print needs to display any type
func fmt.Printf(format string, args ...interface{})
func fmt.Sprintf(format string, args ...interface{})
func log.Printf(format string, args ...interface{})

// Usage - mix types freely
fmt.Printf("User %s has %d items: %v\n", name, count, items)
```

**Why it's OK:** Formatting functions display values; they don't need to operate on them type-safely.

### 3. Template Rendering

**Dynamic data structures controlled by user:**

```go
// ✅ OK: template.Execute works with user-defined data
func (t *Template) Execute(wr io.Writer, data interface{}) error

// Usage - user decides data shape
data := map[string]interface{}{
    "title":  "Welcome",
    "user":   currentUser,
    "items":  []Item{{Name: "A"}, {Name: "B"}},
}
tmpl.Execute(w, data)
```

**Why it's OK:** Templates operate on user-defined data structures. The template library cannot know the shape ahead of time.

### 4. Reflection-Based Operations

**Deep inspection of arbitrary types:**

```go
// ✅ OK: Equality check across unknown types
func reflect.DeepEqual(x, y interface{}) bool

// ✅ OK: Type inspection
func reflect.TypeOf(i interface{}) reflect.Type
func reflect.ValueOf(i interface{}) reflect.Value

// Usage
if reflect.DeepEqual(expected, actual) {
    // Test passed
}
```

**Why it's OK:** Reflection inherently works with unknown types - that's its purpose.

### 5. Context Values (Scoped, Type-Safe Pattern)

```go
// ✅ OK: Context values use interface{} by design
func context.WithValue(parent Context, key, val interface{}) Context
func (c Context) Value(key interface{}) interface{}

// But enforce type safety via typed keys:
type contextKey string
const userKey contextKey = "user"

// Set
ctx := context.WithValue(ctx, userKey, currentUser)

// Get with type assertion
user, ok := ctx.Value(userKey).(User)
```

**Why it's OK:** Context is a general-purpose request-scoped storage. The typed key pattern provides type safety.

---

## Anti-Pattern Catalog

### Anti-Pattern 1: Map Replacement for Structs

**Source:** Research synthesis - "Type safety lost" pattern

```go
// ❌ BAD: Type-unsafe map - runtime panics
type Config map[string]interface{}

func (c Config) GetString(key string) string {
    if v, ok := c[key]; ok {
        return v.(string) // PANIC if not string!
    }
    return ""
}

// Usage - errors only at runtime
config := Config{
    "host": "localhost",
    "port": 8080,  // Oops, int not string
}
host := config.GetString("port")  // PANIC!
```

**Fix: Use typed struct**

```go
// ✅ GOOD: Type-safe struct - compile-time errors
type Config struct {
    Host     string
    Port     int
    Timeout  time.Duration
    Features FeatureFlags
}

// Usage - errors at compile time
config := Config{
    Host: "localhost",
    Port: 8080,
}
host := config.Host  // Type-safe access
```

### Anti-Pattern 2: Generic Container (Pre-Go 1.18)

**Source:** Research synthesis - "Type erasure" pattern

```go
// ❌ BAD: Type erasure - no compile-time safety
type Container struct {
    items []interface{}
}

func (c *Container) Add(item interface{}) {
    c.items = append(c.items, item)
}

func (c *Container) Get(index int) interface{} {
    return c.items[index]  // Caller must type-assert
}

// Usage - runtime panics
container := &Container{}
container.Add("hello")
container.Add(42)  // Mixed types allowed!
item := container.Get(0).(int)  // PANIC: string not int
```

**Fix: Use generics (Go 1.18+)**

```go
// ✅ GOOD: Type-safe with generics
type Container[T any] struct {
    items []T
}

func (c *Container[T]) Add(item T) {
    c.items = append(c.items, item)
}

func (c *Container[T]) Get(index int) T {
    return c.items[index]  // No type assertion needed
}

// Usage - compile-time type safety
container := &Container[string]{}
container.Add("hello")
container.Add(42)  // COMPILE ERROR: cannot use int as string
```

### Anti-Pattern 3: Lazy Return Type

**Source:** Research synthesis - "Caller burden" pattern

```go
// ❌ BAD: Caller forced to type-assert
func GetValue(key string) interface{} {
    return cache[key]
}

// Usage - unsafe, panic-prone
val := GetValue("user").(User)  // PANIC if wrong type or nil!
```

**Fix: Return specific type with error**

```go
// ✅ GOOD: Type-safe with proper error handling
func GetUser(key string) (User, error) {
    val, ok := cache[key]
    if !ok {
        return User{}, ErrNotFound
    }
    user, ok := val.(User)
    if !ok {
        return User{}, fmt.Errorf("expected User, got %T", val)
    }
    return user, nil
}

// Usage - explicit error handling
user, err := GetUser("user")
if err != nil {
    // Handle error properly
}
```

### Anti-Pattern 4: API Parameter "Flexibility"

**Source:** [Uber Go Style Guide](https://github.com/uber-go/guide/blob/master/style.md) - "Tool of last resort"

```go
// ❌ BAD: Unclear contract, hidden type requirements
func Process(input interface{}) error {
    switch v := input.(type) {
    case string:
        return processString(v)
    case []byte:
        return processBytes(v)
    case io.Reader:
        return processReader(v)
    default:
        return fmt.Errorf("unsupported type: %T", v)  // Runtime error!
    }
}

// Caller doesn't know what's supported without reading impl
Process(42)  // Compiles but fails at runtime
```

**Fix: Explicit function overloads or generics**

```go
// ✅ GOOD Option 1: Explicit overloads (clear API)
func ProcessString(input string) error { ... }
func ProcessBytes(input []byte) error { ... }
func ProcessReader(input io.Reader) error { ... }

// ✅ GOOD Option 2: Generics with constraints (Go 1.18+)
type Processable interface {
    string | []byte
}

func Process[T Processable](input T) error {
    // Type-safe, compiler enforces constraint
}
```

### Anti-Pattern 5: Visitor Pattern with interface{}

**Source:** Research from `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/SYNTHESIS.md`

```go
// ❌ BAD: From go-cicd original implementation
type Visitor interface {
    Visit(ctx context.Context, graph interface{}) ([]Finding, error)
}

// Every implementation needs type assertion boilerplate:
func (v *SecurityVisitor) Visit(ctx context.Context, g interface{}) ([]Finding, error) {
    wg, ok := g.(*graph.Graph)
    if !ok {
        return nil, fmt.Errorf("expected *graph.Graph, got %T", g)
    }
    // Actual logic buried below error handling
}
```

**Fix: Use concrete types**

```go
// ✅ GOOD: Production pattern from Trivy, TruffleHog, Nuclei
type Visitor interface {
    Visit(ctx context.Context, g *graph.Graph) ([]Finding, error)
}

// Direct use, no assertions:
func (v *SecurityVisitor) Visit(ctx context.Context, g *graph.Graph) ([]Finding, error) {
    // Immediate access to typed methods
    workflows := g.GetNodesByType(graph.NodeTypeWorkflow)
}
```

**Evidence:** Zero of 5 production scanners (165K+ stars) use `interface{}` in visitor patterns.

---

## Decision Matrix: When to Use interface{}

| Scenario                | Use interface{}?         | Alternative                    |
| ----------------------- | ------------------------ | ------------------------------ |
| JSON/YAML serialization | ✅ Yes                   | N/A - truly unknown types      |
| Printf/logging          | ✅ Yes                   | N/A - display-only             |
| Template data           | ✅ Yes                   | N/A - user-defined shapes      |
| Reflection              | ✅ Yes                   | N/A - inspect unknown types    |
| Context values          | ✅ Yes (with typed keys) | N/A - request-scoped storage   |
| Config maps             | ❌ No                    | Use typed structs              |
| Generic containers      | ❌ No                    | Use generics [T any]           |
| Function parameters     | ❌ No                    | Use concrete types or generics |
| Return values           | ❌ No                    | Return concrete types          |
| Plugin APIs             | ❌ No                    | Use typed interfaces           |

---

## Migration Guide: interface{} → Type-Safe Alternatives

### Step 1: Identify Usage Pattern

```bash
# Find all interface{} usage in codebase
grep -rn "interface{}" --include="*.go" .
grep -rn "\bany\b" --include="*.go" .  # Go 1.18+ alias
```

### Step 2: Classify Each Usage

For each occurrence, ask:

1. Is the type truly unpredictable? (serialization, templates) → **Keep interface{}**
2. Is it a container/collection? → **Migrate to generics**
3. Is it a function parameter? → **Use concrete types or generics**
4. Is it a return value? → **Return concrete types**

### Step 3: Migrate Pattern by Pattern

**Container migration:**

```go
// Before
type Cache struct {
    data map[string]interface{}
}

// After
type Cache[V any] struct {
    data map[string]V
}

// Or with constraints
type Cache[V Cacheable] struct {
    data map[string]V
}
```

**Function parameter migration:**

```go
// Before
func Process(data interface{}) error

// After - Option 1: Concrete type
func Process(data MyData) error

// After - Option 2: Generic
func Process[T any](data T) error

// After - Option 3: Interface constraint
func Process[T Processable](data T) error
```

---

## Summary: The interface{} Decision Tree

```
Is the type truly unknown at compile time?
├─ Yes: Is it one of these standard patterns?
│   ├─ Serialization (json, yaml, gob) → ✅ interface{} OK
│   ├─ Formatting (fmt, log) → ✅ interface{} OK
│   ├─ Templates (html/template) → ✅ interface{} OK
│   ├─ Reflection (reflect pkg) → ✅ interface{} OK
│   └─ Context values (with typed keys) → ✅ interface{} OK
│
└─ No: Type IS known at compile time
    ├─ Container/collection? → ❌ Use generics [T any]
    ├─ Function parameter? → ❌ Use concrete type or generic
    ├─ Return value? → ❌ Return concrete type
    └─ Configuration? → ❌ Use typed struct
```

---

## References

1. [Calhoun.io - How do interfaces work in Go](https://www.calhoun.io/how-do-interfaces-work-in-go/) - Legitimate interface{} uses
2. [Uber Go Style Guide](https://github.com/uber-go/guide/blob/master/style.md) - "Tool of last resort"
3. [Boot.dev - Best Practices for Interfaces in Go](https://blog.boot.dev/golang/golang-interfaces/) - Type safety importance
4. [Go Blog - Generic Interfaces](https://go.dev/blog/generic-interfaces) - Go 1.18+ alternatives
5. Research: `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/SYNTHESIS.md` - Production validation
6. Research: `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/github.md` - 5 scanner analysis (165K+ stars)
