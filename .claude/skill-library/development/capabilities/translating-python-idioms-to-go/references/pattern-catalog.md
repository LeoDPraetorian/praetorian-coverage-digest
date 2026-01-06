# Pattern Catalog

**Complete dictionary of Python→Go idiom translations with detailed examples.**

## 1. Generators (yield) → iter.Seq

### Python Pattern

```python
def buff(self, attempts):
    """Generator that transforms attempts."""
    for attempt in attempts:
        transformed = self.transform(attempt)
        yield transformed

# Usage
for attempt in buff(attempts):
    process(attempt)
```

### Go 1.25 Pattern

```go
import "iter"

func (b *Buff) Buff(attempts []Attempt) iter.Seq[Attempt] {
    return func(yield func(Attempt) bool) {
        for _, attempt := range attempts {
            transformed := b.Transform(attempt)
            if !yield(transformed) {
                return  // Consumer broke loop
            }
        }
    }
}

// Usage
for attempt := range buff.Buff(attempts) {
    process(attempt)
}
```

### iter.Seq Variants

**Single value** (`iter.Seq[V]`):

```go
func Generate() iter.Seq[string] {
    return func(yield func(string) bool) {
        for i := 0; i < 10; i++ {
            if !yield(fmt.Sprintf("item-%d", i)) {
                return
            }
        }
    }
}
```

**Key-value pairs** (`iter.Seq2[K,V]`):

```go
func Enumerate[V any](slice []V) iter.Seq2[int, V] {
    return func(yield func(int, V) bool) {
        for i, v := range slice {
            if !yield(i, v) {
                return
            }
        }
    }
}

// Usage (like Python enumerate)
for i, item := range Enumerate(items) {
    fmt.Printf("%d: %v\n", i, item)
}
```

**Pull iterators** (advanced):

```go
import "iter"

func consumeIterator() {
    next, stop := iter.Pull(generateItems())
    defer stop()

    for {
        item, ok := next()
        if !ok {
            break
        }
        process(item)
    }
}
```

## 2. Class Inheritance → Interface + Struct Embedding

### Python Pattern (ABC)

```python
from abc import ABC, abstractmethod

class BaseProbe(Configurable, ABC):
    """Base class for all probes."""

    @abstractmethod
    def probe(self, generator) -> List[Attempt]:
        """Must be implemented by subclasses."""
        pass

    def get_name(self) -> str:
        return self.name

class DanProbe(BaseProbe):
    name = "dan"

    def probe(self, generator):
        attempts = []
        for prompt in self.prompts:
            output = generator.generate(prompt)
            attempts.append(Attempt(prompt, output))
        return attempts
```

### Go Pattern

```go
// Interface = contract (abstract methods)
type Prober interface {
    Probe(ctx context.Context, gen Generator) ([]Attempt, error)
    GetName() string
}

// Base struct = shared functionality
type BaseProbe struct {
    config Config
    name   string
}

func (b *BaseProbe) GetName() string {
    return b.name
}

// Concrete probe
type DanProbe struct {
    BaseProbe  // Embedding
    prompts []string
}

// Interface implementation
func (p *DanProbe) Probe(ctx context.Context, gen Generator) ([]Attempt, error) {
    attempts := make([]Attempt, 0, len(p.prompts))
    for _, prompt := range p.prompts {
        output, err := gen.Generate(ctx, prompt)
        if err != nil {
            return nil, err
        }
        attempts = append(attempts, NewAttempt(prompt, output))
    }
    return attempts, nil
}
```

### Multiple Interface Implementation

**Python (multiple inheritance)**:

```python
class ConcreteProbe(BaseProbe, Serializable, Configurable):
    pass
```

**Go (interface composition)**:

```go
type ConcreteProbe interface {
    Prober
    Serializable
    Configurable
}

// Struct implements all
type DanProbe struct {
    BaseProbe
    // implements all three interfaces
}
```

## 3. Decorators → Middleware/Functional Options

### Middleware Pattern (Function Wrapping)

**Python**:

```python
@retry(max_attempts=3)
@timeout(seconds=30)
@log_calls
def call_api(endpoint, data):
    return requests.post(endpoint, json=data)
```

**Go**:

```go
type Handler func(string, interface{}) (interface{}, error)

func withRetry(max int, h Handler) Handler {
    return func(endpoint string, data interface{}) (interface{}, error) {
        var lastErr error
        for i := 0; i < max; i++ {
            result, err := h(endpoint, data)
            if err == nil {
                return result, nil
            }
            lastErr = err
        }
        return nil, lastErr
    }
}

func withTimeout(d time.Duration, h Handler) Handler {
    return func(endpoint string, data interface{}) (interface{}, error) {
        ctx, cancel := context.WithTimeout(context.Background(), d)
        defer cancel()
        // execute with context
        return h(endpoint, data)
    }
}

// Compose
handler := withRetry(3, withTimeout(30*time.Second, callAPI))
```

### Functional Options Pattern (Constructor Configuration)

**Python (**kwargs)\*\*:

```python
class Generator:
    def __init__(self, model, **kwargs):
        self.model = model
        self.temperature = kwargs.get('temperature', 0.7)
        self.max_tokens = kwargs.get('max_tokens', 100)
        self.timeout = kwargs.get('timeout', 30)

gen = Generator("gpt-4", temperature=0.9, timeout=60)
```

**Go**:

```go
type Generator struct {
    model       string
    temperature float64
    maxTokens   int
    timeout     time.Duration
}

type Option func(*Generator)

func WithTemperature(t float64) Option {
    return func(g *Generator) { g.temperature = t }
}

func WithMaxTokens(n int) Option {
    return func(g *Generator) { g.maxTokens = n }
}

func WithTimeout(d time.Duration) Option {
    return func(g *Generator) { g.timeout = d }
}

func NewGenerator(model string, opts ...Option) *Generator {
    g := &Generator{
        model:       model,
        temperature: 0.7,   // defaults
        maxTokens:   100,
        timeout:     30 * time.Second,
    }
    for _, opt := range opts {
        opt(g)
    }
    return g
}

// Usage
gen := NewGenerator("gpt-4", WithTemperature(0.9), WithTimeout(60*time.Second))
```

## 4. Exception Handling → Error Returns

### Basic Pattern

```python
try:
    result = operation()
except Exception as e:
    handle_error(e)
```

```go
result, err := operation()
if err != nil {
    handleError(err)
}
```

### Specific Exception Types

```python
try:
    result = api.call()
except RateLimitError as e:
    # handle rate limit
except TimeoutError as e:
    # handle timeout
except Exception as e:
    # handle general
```

```go
result, err := api.Call(ctx)
if err != nil {
    var rateLimitErr *RateLimitError
    if errors.As(err, &rateLimitErr) {
        // handle rate limit
        return handleRateLimit(rateLimitErr)
    }

    var timeoutErr *TimeoutError
    if errors.As(err, &timeoutErr) {
        // handle timeout
        return handleTimeout(timeoutErr)
    }

    // handle general
    return handleGeneral(err)
}
```

### Error Wrapping

```python
try:
    data = load_file()
except IOError as e:
    raise ConfigError(f"failed to load config: {e}") from e
```

```go
data, err := loadFile()
if err != nil {
    return fmt.Errorf("failed to load config: %w", err)
}
```

## 5. Async/Await → Goroutines

### Simple Async

```python
async def fetch(url):
    response = await http.get(url)
    return response.text

result = await fetch("https://api.example.com")
```

```go
func fetch(ctx context.Context, url string) (string, error) {
    resp, err := http.Get(url)
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    return string(body), err
}

// No await needed - just call
result, err := fetch(ctx, "https://api.example.com")
```

### Concurrent Operations (asyncio.gather)

```python
async def fetch_all(urls):
    tasks = [fetch(url) for url in urls]
    results = await asyncio.gather(*tasks)
    return results
```

```go
import "golang.org/x/sync/errgroup"

func fetchAll(ctx context.Context, urls []string) ([]string, error) {
    g, ctx := errgroup.WithContext(ctx)
    results := make([]string, len(urls))

    for i, url := range urls {
        i, url := i, url  // Go 1.22+ capture
        g.Go(func() error {
            result, err := fetch(ctx, url)
            if err != nil {
                return err
            }
            results[i] = result
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }
    return results, nil
}
```

### Async Context Managers

```python
async with session.get(url) as response:
    data = await response.json()
```

```go
resp, err := session.Get(ctx, url)
if err != nil {
    return err
}
defer resp.Close()  // Like __aexit__

data, err := resp.JSON()
```

## Additional Patterns

See [pattern-catalog-extended.md](pattern-catalog-extended.md) for:

- Property decorators → Getters/Setters
- Multiple return values
- Named returns
- Variadic functions
- Method chaining
- Context managers → defer
- With statements → defer
