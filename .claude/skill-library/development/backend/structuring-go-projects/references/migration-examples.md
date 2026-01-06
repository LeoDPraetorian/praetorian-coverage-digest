# Migration Examples

**Real-world before/after examples of Go project restructuring.**

## Example 1: Simple CLI Growing Up

### Before (300 LOC - Flat Structure)

```
mycli/
├── main.go
├── commands.go
├── config.go
├── output.go
└── go.mod
```

**When to stay flat:**

- Project < 500 LOC
- Single maintainer
- Clear, simple purpose

**When to restructure:**

- Growing beyond 500 LOC
- Adding multiple commands/subcommands
- Team members joining

### After (800 LOC - Structured)

```
mycli/
├── cmd/
│   └── mycli/
│       └── main.go
├── internal/
│   ├── command/
│   │   ├── root.go
│   │   ├── run.go
│   │   └── config.go
│   ├── config/
│   │   └── loader.go
│   └── output/
│       └── formatter.go
└── go.mod
```

**Migration steps:**

```bash
# 1. Create structure
mkdir -p cmd/mycli internal/command internal/config internal/output

# 2. Move main
mv main.go cmd/mycli/

# 3. Move and organize code
mv commands.go internal/command/
mv config.go internal/config/
mv output.go internal/output/

# 4. Update imports
# internal/command/root.go
import "mycli/internal/config"
import "mycli/internal/output"

# 5. Update build
go build ./cmd/mycli
```

## Example 2: Monolithic Service Split

### Before (2000 LOC - Single Package)

```
myapi/
├── main.go              (100 LOC)
├── handlers.go          (500 LOC - all HTTP handlers)
├── database.go          (400 LOC)
├── auth.go              (300 LOC)
├── models.go            (400 LOC)
├── utils.go             (300 LOC)
└── go.mod
```

**Problems:**

- `handlers.go` too large
- No clear boundaries
- Testing difficult
- Hard to find code

### After (2000 LOC - Organized)

```
myapi/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── handler/
│   │   ├── user.go
│   │   ├── product.go
│   │   └── order.go
│   ├── middleware/
│   │   └── auth.go
│   ├── model/
│   │   ├── user.go
│   │   ├── product.go
│   │   └── order.go
│   ├── database/
│   │   ├── connection.go
│   │   └── migrations.go
│   └── util/
│       └── validator.go
└── go.mod
```

**Benefits:**

- Clear separation of concerns
- Easier testing (package boundaries)
- Better code navigation
- Team can work in parallel

## Example 3: Adding Multiple Binaries

### Before (Single Binary)

```
project/
├── main.go
├── handler.go
├── worker.go
└── go.mod
```

**Trigger for change:**
Need to add a CLI tool alongside the server

### After (Multiple Binaries)

```
project/
├── cmd/
│   ├── server/
│   │   └── main.go      (HTTP server)
│   ├── worker/
│   │   └── main.go      (Background jobs)
│   └── cli/
│       └── main.go      (Admin CLI)
├── internal/
│   ├── handler/         (shared by server)
│   ├── worker/          (shared by worker/cli)
│   └── common/          (shared by all)
└── go.mod
```

**Migration:**

```bash
# 1. Create cmd structure
mkdir -p cmd/server cmd/worker cmd/cli

# 2. Split main.go logic
# - Server-specific → cmd/server/main.go
# - Worker-specific → cmd/worker/main.go
# - CLI-specific → cmd/cli/main.go

# 3. Move shared code to internal/
mkdir -p internal/handler internal/worker internal/common

# 4. Build each binary
go build -o bin/server ./cmd/server
go build -o bin/worker ./cmd/worker
go build -o bin/cli ./cmd/cli
```

## Example 4: Library with Growing External Usage

### Before (Library Without `internal/`)

```
mylib/
├── client.go            (public API)
├── parser.go            (implementation detail)
├── cache.go             (implementation detail)
└── go.mod
```

**Problem:**
External projects importing `parser.go` and `cache.go` directly, breaking on internal changes.

### After (With `internal/`)

```
mylib/
├── client.go            (public API only)
├── options.go           (public API only)
├── internal/
│   ├── parser/
│   │   └── parser.go    (hidden)
│   └── cache/
│       └── cache.go     (hidden)
└── go.mod
```

**Result:**

- External projects can only import root-level packages
- Safe to refactor internal implementation
- Go compiler enforces this automatically

## Example 5: Removing Unnecessary `/pkg`

### Before (Over-structured)

```
myapp/
├── cmd/
│   └── myapp/
│       └── main.go
├── pkg/
│   ├── handler/         (only used by this app)
│   ├── database/        (only used by this app)
│   └── config/          (only used by this app)
└── go.mod
```

**Problem:**
No external consumers, `/pkg` adds unnecessary nesting.

### After (Simplified)

```
myapp/
├── cmd/
│   └── myapp/
│       └── main.go
├── internal/
│   ├── handler/
│   ├── database/
│   └── config/
└── go.mod
```

**Benefits:**

- Clearer intent: "this is internal"
- Shorter import paths
- More idiomatic Go

## Example 6: Real-World: Nero, Augustus, Diocletian, Trajan

### Current State Analysis

**Nero** (scanner tool):

```
modules/nero/
├── cmd/scanner/
├── pkg/                 (input, reporter, plugins, checker, adapter, executor, credentials)
├── scanner/             (unclear purpose - duplicate?)
└── go.mod
```

**Issues:**

- `scanner/` directory purpose unclear
- Should `pkg/` be `internal/` if only used by nero?

**Diocletian** (cloud security scanner):

```
modules/diocletian/
├── main.go              ← Should be in cmd/
├── cmd/
├── pkg/
├── internal/
└── go.mod
```

**Issues:**

- `main.go` in root should move to `cmd/diocletian/`
- Otherwise structure is good

### Recommended Fixes

**Nero restructure:**

```bash
# If pkg/ code is only for nero (not external):
mv modules/nero/pkg modules/nero/internal

# Clarify or remove scanner/ directory:
ls modules/nero/scanner  # Determine if needed
```

**Diocletian fix:**

```bash
# Move main.go
mkdir -p modules/diocletian/cmd/diocletian
mv modules/diocletian/main.go modules/diocletian/cmd/diocletian/

# Update build command
go build -o diocletian ./cmd/diocletian
```

## Migration Checklist

When restructuring a Go project:

- [ ] **Backup**: Commit current state or create branch
- [ ] **Create directories**: `mkdir -p` all new structure
- [ ] **Move files**: Use `git mv` to preserve history
- [ ] **Update imports**: Search/replace import paths across all files
- [ ] **Update go.mod**: Usually no changes needed (paths relative to module root)
- [ ] **Update build scripts**: CI/CD, Makefiles, etc.
- [ ] **Test thoroughly**: Run all tests after migration
- [ ] **Update documentation**: README, build instructions, etc.
- [ ] **Run `go mod tidy`**: Clean up dependencies

## Common Migration Pitfalls

1. **Forgetting to update imports**
   - Use editor's "Find in Files" or `gofmt -r` for automated refactoring

2. **Breaking CI/CD**
   - Update `go build` paths in all automation

3. **Losing git history**
   - Use `git mv` instead of `mv` when moving files

4. **Incomplete migration**
   - Don't leave half-migrated: finish or rollback

5. **Over-migrating**
   - Don't add structure you don't need yet

## Automation Tools

**Find all imports to update:**

```bash
grep -r "oldpath" --include="*.go" .
```

**Update imports automatically (example):**

```bash
gofmt -w -r 'oldpkg -> newpkg' .
```

**Verify build after migration:**

```bash
go build ./...
go test ./...
go mod tidy
go mod verify
```
