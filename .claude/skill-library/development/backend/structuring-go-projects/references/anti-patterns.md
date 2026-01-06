# Anti-Patterns and Common Mistakes

**Recognize and fix problematic Go project structures.**

## Anti-Pattern 1: Premature Optimization

### The Mistake

```
# 150 lines of code, single developer, learning project
myproject/
├── cmd/
│   └── myproject/
│       └── main.go      (30 lines)
├── pkg/
│   └── api/
│       └── handler.go   (40 lines)
├── internal/
│   ├── config/
│   │   └── config.go    (20 lines)
│   └── model/
│       └── user.go      (30 lines)
└── docs/
    └── architecture.md  (describing the "microservices-ready" structure)
```

**Why it's wrong:**

- Massive overhead for tiny project
- More directories than code
- Harder to navigate than flat structure
- Wastes development time

### The Fix

```
myproject/
├── main.go
├── handler.go
├── user.go
└── go.mod
```

**Rule:** Don't create structure until you feel the pain of not having it.

## Anti-Pattern 2: `main.go` in Root of Complex Project

### The Mistake

```
myproject/  (5000 LOC, team of 5)
├── main.go              ← Wrong location
├── pkg/
│   ├── handler/
│   ├── database/
│   └── cache/
├── internal/
│   └── worker/
└── go.mod
```

**Why it's wrong:**

- Inconsistent with `pkg/` and `internal/` organization
- Harder to have multiple binaries later
- Doesn't follow common conventions

### The Fix

```
myproject/
├── cmd/
│   └── server/
│       └── main.go      ← Organized
├── pkg/
├── internal/
└── go.mod
```

## Anti-Pattern 3: Misusing `/pkg`

### Mistake A: Private Code in `/pkg`

```
myproject/
├── cmd/myapp/
├── pkg/
│   ├── database/        ← Only used by myapp, should be internal/
│   └── worker/          ← Only used by myapp, should be internal/
└── go.mod
```

**Problem:** `/pkg` signals "public API" but this code is private

### Mistake B: Empty `/pkg` Directory

```
myproject/
├── cmd/myapp/
├── pkg/                 ← Empty, created "just in case"
├── internal/
└── go.mod
```

**Problem:** Adds no value, creates confusion

### The Fix

**Use `/pkg` ONLY IF:**

- Code is explicitly designed for external consumption
- You have external projects importing it
- You want to signal "public API" clearly

**Otherwise use:**

- `internal/` for private code
- Root for simple public APIs

## Anti-Pattern 4: God Packages

### The Mistake

```
myapi/
├── cmd/server/
├── internal/
│   ├── api/
│   │   └── handlers.go  (2000 lines - all HTTP handlers)
│   ├── models/
│   │   └── models.go    (1500 lines - all models)
│   └── utils/
│       └── utils.go     (1000 lines - everything else)
└── go.mod
```

**Why it's wrong:**

- Files too large to navigate
- "utils" and "models" are junk drawers
- Hard to test in isolation
- Merge conflicts on large teams

### The Fix

```
myapi/
├── cmd/server/
├── internal/
│   ├── handler/
│   │   ├── user.go      (user handlers)
│   │   ├── product.go   (product handlers)
│   │   └── order.go     (order handlers)
│   ├── model/
│   │   ├── user.go
│   │   ├── product.go
│   │   └── order.go
│   └── validator/       (not "utils")
│       └── validator.go
└── go.mod
```

**Rules:**

- No "utils" or "helpers" packages
- Split large files by domain/responsibility
- Name packages by what they provide

## Anti-Pattern 5: Over-Nesting

### The Mistake

```
myproject/
├── cmd/
├── internal/
│   └── pkg/
│       └── api/
│           └── v1/
│               └── handler/
│                   └── user/
│                       └── create/
│                           └── handler.go
└── go.mod
```

**Why it's wrong:**

- Import paths: `myproject/internal/pkg/api/v1/handler/user/create` is absurd
- Nested directories don't add clarity
- Go prefers flat structures

### The Fix

```
myproject/
├── cmd/
├── internal/
│   └── handler/
│       ├── user_create.go
│       ├── user_update.go
│       └── user_delete.go
└── go.mod
```

**Rule:** If you need more than 3 levels of nesting, reconsider.

## Anti-Pattern 6: Circular Dependencies

### The Mistake

```
myproject/
├── internal/
│   ├── user/
│   │   └── user.go      (imports "myproject/internal/auth")
│   └── auth/
│       └── auth.go      (imports "myproject/internal/user")
└── go.mod
```

**Error:** `import cycle not allowed`

**Why it happens:**

- Poor package boundaries
- Shared types not extracted
- Business logic mixed with infrastructure

### The Fix

```
myproject/
├── internal/
│   ├── model/           ← Shared types
│   │   ├── user.go
│   │   └── auth.go
│   ├── user/            ← User business logic
│   │   └── service.go   (imports model)
│   └── auth/            ← Auth business logic
│       └── service.go   (imports model)
└── go.mod
```

**Rule:** Dependencies should form a DAG (directed acyclic graph)

## Anti-Pattern 7: Binary Outputs in Source Tree

### The Mistake

```
myproject/
├── cmd/myapp/
├── myapp                ← Binary committed to git
├── myapp.exe            ← Windows binary committed
├── internal/
└── go.mod
```

**Why it's wrong:**

- Binary files in source control
- Cross-platform conflicts
- Bloats repository size

### The Fix

**.gitignore:**

```
# Binaries
/myapp
/myapp.exe
*.exe
/bin/
```

**Build to separate directory:**

```bash
mkdir -p bin
go build -o bin/myapp ./cmd/myapp
```

## Anti-Pattern 8: Vendor Directory (Modern Go)

### The Mistake

```
myproject/
├── vendor/              ← Deprecated approach
│   └── github.com/
├── go.mod
└── go.sum
```

**Why it's wrong (since Go 1.11):**

- Go modules replaced vendoring
- Adds bloat to repository
- Dependencies managed by `go.mod` and `go.sum`

### The Fix

```bash
# Remove vendor
rm -rf vendor

# Let Go modules handle it
go mod tidy
go mod verify
```

**Only vendor if:**

- Corporate policy requires it
- Air-gapped environments
- Explicit `go mod vendor` for deployment

## Anti-Pattern 9: Test Directories vs Test Files

### The Mistake

```
myproject/
├── internal/
│   └── handler/
│       ├── handler.go
│       └── test/        ← Separate test directory
│           └── handler_test.go
└── go.mod
```

**Why it's wrong:**

- Go convention: tests alongside source
- `go test ./...` still works
- Easier to find tests for specific code

### The Fix

```
myproject/
├── internal/
│   └── handler/
│       ├── handler.go
│       └── handler_test.go   ← Next to source
└── go.mod
```

**Exception:** Integration/E2E tests

```
myproject/
├── internal/
│   └── handler/
│       ├── handler.go
│       └── handler_test.go   (unit tests)
└── test/
    └── integration/           (integration tests)
        └── api_test.go
```

## Anti-Pattern 10: Inconsistent Structure

### The Mistake

```
myproject/
├── cmd/server/          ← Some binaries in cmd/
├── worker-main.go       ← Other binaries in root
├── cli.go               ← More binaries in root
├── internal/
├── pkg/
└── go.mod
```

**Why it's wrong:**

- No clear pattern
- New developers confused
- Hard to maintain

### The Fix

**Be consistent:**

```
myproject/
├── cmd/
│   ├── server/
│   ├── worker/
│   └── cli/
├── internal/
└── go.mod
```

**Rule:** Pick a pattern and stick to it across the entire project.

## Red Flag Checklist

Your project likely has anti-patterns if:

- [ ] Directory structure deeper than 3-4 levels
- [ ] Packages named "utils", "helpers", "common"
- [ ] Files over 500 lines
- [ ] Empty directories
- [ ] Binary files in git
- [ ] `vendor/` directory (without specific need)
- [ ] `main.go` in root of complex project
- [ ] `/pkg` with only internal code
- [ ] Tests in separate directory trees
- [ ] Inconsistent organization patterns

## Fixing Anti-Patterns: Process

1. **Identify the pain point**
   - What's actually causing problems?
   - Don't fix structure that's working

2. **Plan the fix**
   - Sketch target structure
   - Identify import changes needed

3. **Migrate incrementally**
   - One anti-pattern at a time
   - Keep tests passing

4. **Update tooling**
   - CI/CD, Makefiles, scripts
   - Documentation

5. **Communicate changes**
   - Team alignment
   - Update onboarding docs

## Prevention

**Best practices:**

- Start simple, add complexity only when needed
- Follow official Go guidance first
- Be consistent within your project
- Code review for structure changes
- Ask "does this add clarity or just directories?"
