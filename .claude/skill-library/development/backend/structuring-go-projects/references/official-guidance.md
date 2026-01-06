# Official Go Guidance

**Source:** go.dev/doc/modules/layout (Official Go documentation)

## Core Principle from Go Team

> "A basic Go package has all its code in the project's root directory. The project consists of a single module, which consists of a single package."

**Start simple. Add complexity only when necessary.**

## Official Recommendations

### 1. Initial Structure (Single Package)

For new projects, start with:

```
myproject/
├── go.mod
├── main.go
└── supporting.go
```

**When to use:**

- Learning Go
- Proof of concepts
- Simple utilities
- Single-purpose tools

### 2. Adding Internal Packages

Quote from go.dev:

> "Initially, it's recommended placing such packages into a directory named `internal`; this prevents other modules from depending on packages we don't necessarily want to expose and support for external uses."

**The `internal` directory:**

- Go compiler enforces: external projects CANNOT import `project/internal/*`
- Use when you want to prevent external dependencies
- No special setup needed - Go recognizes it automatically

### 3. Organic Growth

From go.dev:

> "There's no single 'right' way to structure a Go codebase. The answer to 'how should I structure my codebase?' is almost always 'it depends'."

**Key principle:** Let project complexity drive structure decisions, not the other way around.

## What Go Officially Supports

| Feature               | Status                   | Description                     |
| --------------------- | ------------------------ | ------------------------------- |
| `internal/` directory | **Enforced by compiler** | Prevents external imports       |
| `cmd/` directory      | **Convention**           | Not enforced, widely adopted    |
| `pkg/` directory      | **Not mentioned**        | Community pattern, not official |
| `vendor/` directory   | **Deprecated**           | Use Go modules instead          |

## Official Position on golang-standards/project-layout

**From the golang-standards/project-layout README itself:**

> "This is NOT an official standard defined by the core Go dev team. This is a set of common historical and emerging project layout patterns in the Go ecosystem."

**Go team does not endorse any specific layout beyond basic principles.**

## When Structure Becomes Necessary

Official guidance suggests structure when:

1. **Multiple executables** - Use `cmd/` directory
2. **Private packages** - Use `internal/` directory
3. **Code sharing** - Organize into logical packages

## Go Modules and Structure

Since Go 1.11, modules are the standard:

- One `go.mod` per project (usually at root)
- Import paths based on module path + directory structure
- `vendor/` directory no longer needed

## Anti-Patterns According to Official Docs

Go documentation warns against:

1. **Premature abstraction** - Don't create packages until you need them
2. **Circular dependencies** - Keep package dependencies acyclic
3. **Over-nesting** - Flat structure is more idiomatic Go

## Testing Recommendations

Official testing practices:

- Place tests in `*_test.go` files alongside source
- Use `package foo_test` for black-box testing
- Integration tests can go in separate directory if needed

## Sources

- https://go.dev/doc/modules/layout - Official module layout guide
- https://go.dev/doc/code - Official code organization guide
- https://go.dev/doc/effective_go - Effective Go (official best practices)
