# Go-Specific YAGNI Anti-Patterns

**Common "best practices" in Go that violate YAGNI when not explicitly requested.**

These patterns are often added automatically because they appear in popular projects or blog posts. However, they add complexity without explicit need.

---

## Anti-Pattern 1: Compile-Time Interface Compliance Checks

**Pattern added without asking:**

```go
// Compile-time check that TableWriter implements OutputWriter
var _ types.OutputWriter = (*TableWriter)(nil)
```

**Why it violates YAGNI:**

- The compiler ALREADY checks interface compliance when you use the type
- This extra line adds noise and maintenance burden
- If you're worried about compliance, return the interface from the constructor

**What to do instead:**

```go
// ❌ WRONG: Unnecessary compile-time check
var _ types.OutputWriter = (*TableWriter)(nil)

func NewTableWriter(w io.Writer) *TableWriter {
    return &TableWriter{w: w}
}

// ✅ RIGHT: Constructor returns interface (compliance checked automatically)
func NewTableWriter(w io.Writer) types.OutputWriter {
    return &TableWriter{w: w}
}
```

**When IS it appropriate?** Only when:

- You explicitly need to document interface compliance in a library
- User specifically requests compile-time checks
- You're building a plugin system where types must satisfy interfaces but aren't used directly

---

## Anti-Pattern 2: Version Package Scaffolding

**Pattern added without asking:**

```go
// version/version.go
package version

var (
    Version   = "dev"
    Commit    = "none"
    BuildTime = "unknown"
)

func FullVersion() string {
    return fmt.Sprintf("%s, build %s, built at %s", Version, Commit, BuildTime)
}
```

**Why it violates YAGNI:**

- Simple CLIs don't need version tracking
- Adds a whole package for 10 lines of code
- Requires build flags to be useful (`-ldflags`)
- Most users won't use `--version`

**What to do instead:**

```go
// ❌ WRONG: Full version package for simple CLI
version/version.go       // 20 lines
version/version_test.go  // 15 lines
cmd/main.go             // imports version, sets up --version flag

// ✅ RIGHT: No version unless requested
cmd/main.go             // Simple main, no version

// ✅ ALSO RIGHT: Inline if specifically requested
const version = "0.1.0"  // Single line in main.go
```

**When IS it appropriate?** Only when:

- User explicitly requests version tracking
- Building a tool that will be distributed/installed
- CI/CD pipeline already has version injection

---

## Anti-Pattern 3: Useless Function Comments

**Pattern added without asking:**

```go
// NewScanner creates a new Scanner
func NewScanner() *Scanner {
    return &Scanner{}
}

// SetTimeout sets the timeout
func (s *Scanner) SetTimeout(t time.Duration) {
    s.timeout = t
}

// Close closes the scanner
func (s *Scanner) Close() error {
    return s.conn.Close()
}
```

**Why it violates YAGNI:**

- Comments repeat what the code already says
- Adds maintenance burden (comments become stale)
- Violates "self-documenting code" principle
- User didn't ask for documentation

**What to do instead:**

```go
// ❌ WRONG: Useless comments
// NewScanner creates a new Scanner
func NewScanner() *Scanner { ... }

// ✅ RIGHT: No comment needed - function name is self-documenting
func NewScanner() *Scanner { ... }

// ✅ RIGHT: Comment explains WHY (non-obvious behavior)
// NewScanner creates a scanner with 30s default timeout.
// Use SetTimeout to override for slow networks.
func NewScanner() *Scanner { ... }
```

**The rule:** Only comment when explaining:

- Non-obvious behavior ("why", not "what")
- External constraints ("API rate limits require 100ms delay")
- Complex algorithms that need context

---

## Anti-Pattern 4: Empty Interface Placeholder Types

**Pattern added without asking:**

```go
// Options holds configuration options
type Options struct {
    // TODO: Add options
}

// Result holds scan results
type Result struct {
    // Will be populated later
}
```

**Why it violates YAGNI:**

- Empty types add noise
- "TODO" comments are technical debt
- Build what you need NOW, add fields when needed

**What to do instead:**

```go
// ❌ WRONG: Placeholder types
type Options struct{}  // Empty, "will add later"

// ✅ RIGHT: Don't create until needed
// (No Options type - add when you have actual options)
```

---

## Anti-Pattern 5: Overly Generic Error Types

**Pattern added without asking:**

```go
// ScanError represents an error during scanning
type ScanError struct {
    Op      string
    Target  string
    Err     error
    Code    int
    Retry   bool
    Context map[string]interface{}
}

func (e *ScanError) Error() string { ... }
func (e *ScanError) Unwrap() error { ... }
```

**Why it violates YAGNI:**

- Standard `error` and `fmt.Errorf` usually suffice
- Custom error types add complexity
- User might not need all those fields

**What to do instead:**

```go
// ❌ WRONG: Over-engineered error type
type ScanError struct { /* 10 fields */ }

// ✅ RIGHT: Simple error wrapping
return fmt.Errorf("scanning %s: %w", target, err)

// ✅ ALSO RIGHT: Sentinel errors if needed
var ErrTimeout = errors.New("scan timeout")
```

---

## Anti-Pattern 6: Premature Interface Extraction

**Pattern added without asking:**

```go
// Scanner defines the scanning interface
type Scanner interface {
    Scan(ctx context.Context, target string) (*Result, error)
    Close() error
}

// DefaultScanner implements Scanner
type DefaultScanner struct { ... }
```

**Why it violates YAGNI:**

- You only have ONE implementation
- Interface adds indirection without benefit
- "Accept interfaces, return structs" doesn't mean create interfaces prematurely

**What to do instead:**

```go
// ❌ WRONG: Interface with single implementation
type Scanner interface { ... }
type DefaultScanner struct { ... }

// ✅ RIGHT: Just the struct until you need polymorphism
type Scanner struct { ... }
```

**The Go proverb:** "The bigger the interface, the weaker the abstraction."

---

## Anti-Pattern 7: Config Structs Before Needed

**Pattern added without asking:**

```go
type Config struct {
    Timeout     time.Duration
    Retries     int
    Concurrency int
    UserAgent   string
    SkipVerify  bool
    // 20 more fields...
}

func NewScannerWithConfig(cfg Config) *Scanner { ... }
```

**Why it violates YAGNI:**

- Most fields have sensible defaults
- User probably only needs 1-2 options
- Config explosion is a maintenance burden

**What to do instead:**

```go
// ❌ WRONG: Giant config struct upfront
type Config struct { /* 20 fields */ }

// ✅ RIGHT: Functional options when needed
func NewScanner(opts ...Option) *Scanner { ... }

// ✅ ALSO RIGHT: Simple parameters for MVP
func NewScanner(timeout time.Duration) *Scanner { ... }
```

---

## Summary Checklist

Before adding ANY of these patterns, ask:

- [ ] Did the user explicitly request this?
- [ ] Does the code work without it?
- [ ] Is this solving a problem that exists NOW?
- [ ] Or am I adding it "just in case" / "for completeness"?

**If you're about to add:**

| Pattern | Ask First |
|---------|-----------|
| `var _ Interface = (*Type)(nil)` | "Should I add compile-time interface checks?" |
| `version/version.go` | "Do you need version tracking?" |
| Comments on every function | "Should I add documentation?" |
| Empty placeholder types | Don't create - wait until needed |
| Custom error types | "Is standard error handling sufficient?" |
| Interfaces with one impl | "Do you need interface abstraction?" |
| Large config structs | "What configuration options do you need?" |
