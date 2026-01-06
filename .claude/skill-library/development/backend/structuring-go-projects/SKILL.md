---
name: structuring-go-projects
description: Use when evaluating or designing Go project structure - provides systematic framework for assessing compliance with official Go guidance and community patterns, decision trees for directory organization, and criteria for appropriate structure based on project complexity
allowed-tools: Read, Bash, Grep, Glob
---

# Structuring Go Projects

**Systematic framework for evaluating and designing Go project information architecture.**

## When to Use

Use this skill when:

- Evaluating if a Go project follows proper structure
- Designing directory layout for a new Go project
- Reviewing project organization during code review
- Migrating from flat structure to organized layout
- Deciding between `/internal`, `/pkg`, `/cmd` directories
- User asks "does this follow golang standards?"

## Core Principle

**Simplicity First, Complexity When Necessary**

Go embraces flexibility over rigid frameworks. Start simple and add structure only when project complexity demands it.

## Critical Distinction

⚠️ **golang-standards/project-layout is NOT official**

There are TWO sources of guidance:

| Source                              | Status            | Authority                    |
| ----------------------------------- | ----------------- | ---------------------------- |
| **go.dev/doc/modules/layout**       | Official          | Go core team                 |
| **golang-standards/project-layout** | Community pattern | Historical/emerging patterns |

**Never present golang-standards/project-layout as official Go guidance.** It's widely used but not endorsed by the Go team.

## Quick Reference

| Directory       | Purpose                  | When to Use                                                                  |
| --------------- | ------------------------ | ---------------------------------------------------------------------------- |
| **`cmd/`**      | Application entry points | Multiple executables OR single binary in organized project                   |
| **`internal/`** | Private packages         | Code you don't want external projects to import (Go enforces this)           |
| **`pkg/`**      | Public library code      | **Controversial** - code intended for external use (see `/pkg` debate below) |
| (root)          | Single package           | Simple projects, learning, PoCs                                              |

## Evaluation Framework

### Step 1: Assess Project Complexity

**Simple (0-500 LOC):**

```
myproject/
├── go.mod
├── main.go
└── handler.go
```

✅ Root-level files acceptable

**Medium (500-5000 LOC):**

```
myproject/
├── cmd/myapp/main.go
├── internal/handler/
├── internal/storage/
└── go.mod
```

✅ Use `cmd/` and `internal/`

**Complex (5000+ LOC, multiple binaries):**

```
myproject/
├── cmd/server/
├── cmd/cli/
├── pkg/api/        (optional - see debate)
├── internal/db/
└── go.mod
```

✅ Full structure with multiple binaries

### Step 2: Check Official Requirements

**Go compiler enforces:**

- `internal/` - External projects CANNOT import `project/internal/*` packages
- Everything else is convention

**Official guidance (go.dev/doc/modules/layout):**

1. Start with single package in root
2. Add `internal/` when hiding implementation details
3. Grow organically as complexity demands

### Step 3: Validate Directory Usage

**For each directory, check:**

| Directory   | Valid If                                        | Invalid If                                 |
| ----------- | ----------------------------------------------- | ------------------------------------------ |
| `cmd/`      | Contains `main` packages, one per subdirectory  | Empty subdirectories, non-main packages    |
| `internal/` | Contains packages not intended for external use | Empty or could be in root                  |
| `pkg/`      | Explicitly public API for external projects     | Private code, or flat structure would work |
| `bin/`      | Build output (.gitignored)                      | Source code                                |
| `test/`     | Integration/E2E tests separate from unit tests  | All tests (prefer `_test.go` files)        |

### Step 4: Common Anti-Patterns

❌ **Over-engineering simple projects**

```
# 200 lines of code doesn't need:
cmd/myapp/main.go
internal/handler/handler.go
pkg/models/models.go
```

❌ **`main.go` in root of complex project**

```
# Should be in cmd/
main.go  # ← Move to cmd/myapp/main.go
pkg/
internal/
```

❌ **Using `/pkg` for internal code**

```
pkg/database/  # If not intended for external use → internal/database/
```

❌ **Empty or single-file directories**

```
internal/utils/utils.go  # Just use root or combine with related code
```

## The `/pkg` Debate

**Community is divided on `/pkg` directory:**

**Pro-`/pkg` side:**

- Clear signal: "this is public API"
- Matches golang-standards/project-layout
- Many large projects use it (Kubernetes, etc.)

**Anti-`/pkg` side:**

- Not in official Go guidance
- Flat structure is more idiomatic Go
- `/internal` is sufficient (everything else is public by default)
- Adds unnecessary nesting

**Recommendation:**

- Don't use `/pkg` for new projects unless you have multi-project shared libraries
- If codebase already uses `/pkg` consistently, keep it for consistency
- Prefer flat structure or just use `/internal`

## Decision Tree

```
START: Structuring Go project
│
├─ Is it < 500 LOC or a learning project?
│  └─ YES → Use root directory only (main.go + supporting files)
│
├─ Does it have multiple executables?
│  └─ YES → Create cmd/{app1}/, cmd/{app2}/
│
├─ Does it have code that should NOT be importable externally?
│  └─ YES → Use internal/ (Go enforces this)
│
├─ Is this a library intended for multiple external projects?
│  └─ YES → Consider pkg/ (controversial) OR flat structure
│
└─ Default: Keep it simple, add structure as needed
```

## Evaluation Checklist

Use this when assessing if a project follows proper structure:

**□ Complexity-appropriate structure**

- [ ] Simple projects (<500 LOC) don't have unnecessary directories
- [ ] Complex projects use `cmd/` for multiple binaries
- [ ] Structure matches actual complexity

**□ Official patterns followed**

- [ ] `internal/` used for private packages (if any)
- [ ] `main` packages in `cmd/` subdirectories (or root for simple)
- [ ] Build outputs not in source directories

**□ Consistency**

- [ ] Similar functionality organized similarly
- [ ] Test files use `_test.go` suffix (or separate `test/` for integration)
- [ ] No empty or nearly-empty directories

**□ Clear purpose**

- [ ] Each directory has clear responsibility
- [ ] Package names match directory names
- [ ] No "utils" or "helpers" catch-all directories

## Code Reference Pattern (MANDATORY)

When referencing code structure in analysis:

❌ **NEVER**: `main.go:123-127` (line numbers drift)
✅ **USE**: `main.go in root (should be cmd/myapp/main.go)`
✅ **USE**: `pkg/scanner/ (between pkg/ and internal/ purposes overlap)`

## Red Flags

**Structure issues to watch for:**

1. **Binary outputs in source tree** - `myapp` binary in root (should be in `bin/` or `.gitignored`)
2. **`main.go` in root of complex project** - Move to `cmd/`
3. **Confusing `/pkg` usage** - Code in `/pkg` that's actually private
4. **Over-nesting** - `internal/pkg/models/api/v1/` is too deep
5. **Inconsistent patterns** - Some binaries in root, others in `cmd/`

## Migration Guidance

**Moving from flat to structured:**

1. **Add `cmd/` for binaries**

   ```bash
   mkdir -p cmd/myapp
   mv main.go cmd/myapp/
   ```

2. **Add `internal/` for private code**

   ```bash
   mkdir -p internal/handler
   mv handler.go internal/handler/
   # Update import paths
   ```

3. **Update `go.mod` import paths**
   - All imports need to reflect new paths
   - Run `go mod tidy` after changes

4. **Update CI/CD build paths**
   - Change `go build` to `go build ./cmd/myapp`

## Common Questions

**Q: When should I create `internal/`?**
A: When you have packages that external projects should not import. Go enforces this - external imports will fail.

**Q: Should I use `/pkg` for my library?**
A: Controversial. Many Go projects don't use it. Consider flat structure unless you have strong reasons (multi-project shared libraries).

**Q: Where do tests go?**
A: Prefer `*_test.go` files alongside source. Use separate `test/` directory only for integration/E2E tests that need fixtures.

**Q: What about `vendor/`?**
A: Deprecated since Go 1.11 modules. Don't create it unless you have specific vendoring requirements.

**Q: Can I have `main.go` in root?**
A: Yes for simple projects (<500 LOC). For complex projects, move to `cmd/`.

## Related Skills

- `enforcing-go-capability-architecture` - Chariot-specific Go capability patterns
- `implementing-go-plugin-registries` - Plugin architecture patterns
- `go-errgroup-concurrency` - Go concurrency patterns

## References

For detailed patterns and examples, see:

- [references/official-guidance.md](references/official-guidance.md) - Official Go team recommendations
- [references/community-patterns.md](references/community-patterns.md) - golang-standards analysis
- [references/decision-matrices.md](references/decision-matrices.md) - When to use each directory
- [references/migration-examples.md](references/migration-examples.md) - Before/after restructuring examples
- [references/anti-patterns.md](references/anti-patterns.md) - Common mistakes and fixes
