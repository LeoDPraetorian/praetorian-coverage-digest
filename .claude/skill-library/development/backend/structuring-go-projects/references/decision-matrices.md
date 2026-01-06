# Decision Matrices

**When to use each directory structure based on project characteristics.**

## Project Complexity Matrix

| LOC Range | Binaries | Recommended Structure                                    | Rationale                               |
| --------- | -------- | -------------------------------------------------------- | --------------------------------------- |
| 0-500     | 1        | Root only                                                | Simplicity, learning, PoC               |
| 500-2000  | 1        | `cmd/` + `internal/`                                     | Organization without over-engineering   |
| 2000-5000 | 1-2      | `cmd/` + `internal/` + optional `pkg/`                   | Clear separation, manageable complexity |
| 5000+     | 2+       | Full structure with `cmd/`, `internal/`, consider `pkg/` | Multiple concerns, team collaboration   |

## Directory Decision Tree

### Should I use `cmd/`?

| Condition                       | Use `cmd/`  | Keep in root |
| ------------------------------- | ----------- | ------------ |
| Single small binary (<500 LOC)  | Optional    | ✅           |
| Single medium binary (500+ LOC) | ✅          | Optional     |
| Multiple binaries               | ✅ Required | ❌           |
| Library project (no binaries)   | ❌ N/A      | -            |

**Example when NOT to use `cmd/`:**

```
# Simple CLI tool, 300 lines
myproject/
├── main.go       ← Totally fine here
├── handler.go
└── go.mod
```

**Example when TO use `cmd/`:**

```
# Multiple tools
myproject/
├── cmd/
│   ├── server/main.go
│   └── cli/main.go
├── internal/
└── go.mod
```

### Should I use `internal/`?

| Scenario                                    | Use `internal/` | Keep in root/pkg |
| ------------------------------------------- | --------------- | ---------------- |
| Private implementation details              | ✅              | ❌               |
| Shared between your binaries only           | ✅              | ❌               |
| Want to prevent external imports            | ✅              | ❌               |
| Explicitly public API for external projects | ❌              | ✅ (or root)     |
| Simple project, no external concerns        | Optional        | ✅               |

**Key decision factor:** Do you want the Go compiler to prevent external imports?

- YES → `internal/`
- NO → root or `pkg/`

### Should I use `pkg/`?

| Scenario                              | Use `pkg/` | Use root/internal |
| ------------------------------------- | ---------- | ----------------- |
| Multi-project shared library          | ✅         | ❌                |
| Team standardizes on `pkg/`           | ✅         | ❌                |
| Following golang-standards explicitly | ✅         | ❌                |
| Simple application                    | ❌         | ✅                |
| Prefer idiomatic flat structure       | ❌         | ✅                |
| Want minimal nesting                  | ❌         | ✅                |

**Controversial decision - both approaches valid.**

## Project Type Recommendations

### CLI Tool (Single Binary)

**Simple (< 500 LOC):**

```
mycli/
├── main.go
├── command.go
└── go.mod
```

**Medium (500-2000 LOC):**

```
mycli/
├── cmd/mycli/main.go
├── internal/
│   ├── command/
│   └── config/
└── go.mod
```

### REST API Service

**Typical structure:**

```
myapi/
├── cmd/server/main.go
├── internal/
│   ├── handler/
│   ├── middleware/
│   ├── model/
│   └── database/
├── api/
│   └── openapi.yaml
└── go.mod
```

### Shared Library

**Without `pkg/` (flat):**

```
mylib/
├── client.go       ← Public API
├── options.go      ← Public API
├── internal/       ← Private implementation
│   └── parser/
└── go.mod
```

**With `pkg/` (nested):**

```
mylib/
├── pkg/
│   └── client/     ← Public API
├── internal/       ← Private implementation
└── go.mod
```

### Microservices Project

**Multiple services:**

```
project/
├── cmd/
│   ├── service-a/
│   ├── service-b/
│   └── gateway/
├── internal/
│   ├── common/     ← Shared internal code
│   ├── service-a/
│   └── service-b/
├── pkg/            ← If services share public code
└── go.mod
```

## Migration Decision Matrix

| Current State          | Target State         | When to Migrate                    |
| ---------------------- | -------------------- | ---------------------------------- |
| Root only              | `cmd/` + structure   | >500 LOC, complexity growing       |
| Flat structure         | `internal/` added    | Need to hide implementation        |
| `cmd/` + root packages | `cmd/` + `internal/` | External import concerns           |
| No `internal/`         | Add `internal/`      | Unwanted external dependencies     |
| Has `pkg/`             | Remove `pkg/`        | Simplifying, no external consumers |

## Team Size Considerations

| Team Size       | Structure Recommendation                        |
| --------------- | ----------------------------------------------- |
| 1-2 developers  | Keep it simple, flat structure acceptable       |
| 3-5 developers  | Use `cmd/` + `internal/`, clear boundaries help |
| 6-10 developers | Full structure, consider `pkg/` for shared code |
| 10+ developers  | Strict organization, well-defined public APIs   |

## Red Flags in Decision-Making

**Bad reasons to add structure:**

- "Because golang-standards says so"
- "To look professional"
- "Other projects do it"

**Good reasons to add structure:**

- "We have multiple binaries"
- "External projects are importing our internals"
- "Team is confused about code organization"
- "Project complexity demands it"

## Quick Decision Flowchart

```
START
  ↓
Is project < 500 LOC?
  YES → Keep root only
  NO → Continue
  ↓
Multiple executables?
  YES → Use cmd/
  NO → Consider cmd/ if >1000 LOC
  ↓
Need to prevent external imports?
  YES → Use internal/
  NO → Consider internal/ anyway for organization
  ↓
Building shared library for multiple projects?
  YES → Consider pkg/ (or use flat with internal/)
  NO → Skip pkg/
  ↓
DONE - Keep structure minimal, grow as needed
```
