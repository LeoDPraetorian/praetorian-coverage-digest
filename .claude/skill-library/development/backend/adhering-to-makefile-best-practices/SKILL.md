---
name: adhering-to-makefile-best-practices
description: Use when creating or maintaining Makefiles - enforces modern patterns (pattern rules, automatic variables), prevents common mistakes (wildcard misuse, missing .PHONY), ensures maintainability (variables, progressive disclosure), and guides structure (namespacing, file organization)
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Adhering to Makefile Best Practices

**Modern Makefile development with proven patterns and anti-pattern prevention.**

## When to Use

Use this skill when:

- Creating a new Makefile from scratch
- Adding targets to an existing Makefile
- Refactoring complex build logic
- Reviewing Makefile changes in PRs
- Debugging build failures or stale dependencies

## Quick Reference

| Category           | Key Practices                                                     |
| ------------------ | ----------------------------------------------------------------- |
| **Variables**      | Use `?=` for defaults, centralize flags, namespace with prefixes  |
| **Targets**        | Declare `.PHONY`, use `/` namespace delimiter                     |
| **Dependencies**   | Explicit file deps, order-only with `\|`, grouped rules with `&:` |
| **Patterns**       | Pattern rules (`%.o: %.c`), automatic variables (`$@`, `$<`)      |
| **Auto-discovery** | `$(shell find ...)` or `$(wildcard)`, not bare wildcards          |
| **Safety**         | Add `.DELETE_ON_ERROR`, avoid hardcoded paths                     |
| **Debugging**      | `make -n` (dry-run), `make -p` (database), `$(info text)`         |

**For detailed patterns and examples, see:** [references/best-practices.md](references/best-practices.md)

## Core Principles

### 1. Progressive Disclosure for Complexity

Break complex Makefiles into digestible layers:

**Layer 1: Entry Points (MUST be obvious)**

```makefile
.PHONY: all clean test deploy help
.DEFAULT_GOAL := help

help: ## Display available targets
	@grep -E '^[a-zA-Z_/-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'
```

**Layer 2: Common Targets (grouped by purpose)**

```makefile
# Build targets
build/docker: ## Build Docker image
build/binary: ## Build Go binary

# Test targets
test/unit: ## Run unit tests
test/integration: ## Run integration tests
```

**Layer 3: Implementation (hidden in included files or at bottom)**

```makefile
include make/config.mk
include make/docker.mk
include make/testing.mk
```

### 2. Variables and Configuration

**Always use `?=` for defaults** - allows environment overrides:

```makefile
# ✅ CORRECT: Respects environment variables
GO ?= go
DOCKER ?= docker
BUILD_DIR ?= ./build

# ❌ WRONG: Forces value, breaks cross-compilation
GO = /usr/local/bin/go
```

**Centralize common values**:

```makefile
# Compiler settings
GO_FLAGS ?= -v -trimpath
GO_LDFLAGS ?= -s -w

# Directory structure
SRC_DIR := ./cmd
BUILD_DIR := ./build
DIST_DIR := ./dist

# Auto-discover sources
GO_SOURCES := $(shell find $(SRC_DIR) -type f -name '*.go')
```

**For complete variable patterns, see:** [references/variable-patterns.md](references/variable-patterns.md)

### 3. Target Management

**Always declare phony targets**:

```makefile
.PHONY: all clean test build deploy help

clean:
	rm -rf $(BUILD_DIR)

test:
	$(GO) test ./...
```

**Use namespace delimiters** (`/` not `:` or `-`):

```makefile
# ✅ CORRECT: Clear hierarchy
build/docker:
build/binary:
test/unit:
test/integration:

# ❌ WRONG: Ambiguous
build-docker:
build-binary:
```

**For complete target patterns, see:** [references/target-patterns.md](references/target-patterns.md)

### 4. Dependency Management

**Explicit file dependencies**:

```makefile
# ✅ CORRECT: Rebuilds when sources change
$(BUILD_DIR)/app: $(GO_SOURCES)
	$(GO) build -o $@ ./cmd/app

# ❌ WRONG: Never rebuilds
$(BUILD_DIR)/app:
	$(GO) build -o $@ ./cmd/app
```

**Order-only prerequisites** (run once, don't trigger rebuilds):

```makefile
$(BUILD_DIR)/app: $(GO_SOURCES) | $(BUILD_DIR)
	$(GO) build -o $@ ./cmd/app

$(BUILD_DIR):
	mkdir -p $@
```

**Grouped rules** (multiple outputs from single invocation):

```makefile
# ✅ CORRECT: Outputs generated together
protoc/gen.pb.go protoc/gen_grpc.pb.go &: protoc/service.proto
	protoc --go_out=. --go-grpc_out=. $<

# ❌ WRONG: Runs protoc twice
protoc/gen.pb.go: protoc/service.proto
	protoc --go_out=. --go-grpc_out=. $<
protoc/gen_grpc.pb.go: protoc/service.proto
	protoc --go_out=. --go-grpc_out=. $<
```

**For complete dependency patterns, see:** [references/dependency-patterns.md](references/dependency-patterns.md)

### 5. Pattern Rules and Automatic Variables

**Use pattern rules to reduce repetition**:

```makefile
# ✅ CORRECT: Generic rule for all .c files
%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

# ❌ WRONG: Repeating the same logic
foo.o: foo.c
	$(CC) $(CFLAGS) -c foo.c -o foo.o
bar.o: bar.c
	$(CC) $(CFLAGS) -c bar.c -o bar.o
```

**Common automatic variables**:

| Variable | Meaning                         | Example                     |
| -------- | ------------------------------- | --------------------------- |
| `$@`     | Target name                     | `build/app` in `build/app:` |
| `$<`     | First prerequisite              | `main.go` in first dep      |
| `$^`     | All prerequisites               | `main.go util.go config.go` |
| `$?`     | Prerequisites newer than target | Files modified since build  |
| `$*`     | Stem (pattern match)            | `foo` from `%.o: %.c`       |

**For complete pattern examples, see:** [references/pattern-rules.md](references/pattern-rules.md)

### 6. Auto-Discovery

**Use `$(shell find)` or `$(wildcard)`, NEVER bare wildcards**:

```makefile
# ✅ CORRECT: Shell expansion
GO_SOURCES := $(shell find ./cmd -type f -name '*.go')
C_SOURCES := $(wildcard src/*.c src/**/*.c)

# ❌ WRONG: Bare wildcard (doesn't expand)
GO_SOURCES := ./cmd/*.go
```

**For recursive discovery patterns, see:** [references/auto-discovery.md](references/auto-discovery.md)

### 7. Safety and Error Handling

**Always include special targets**:

```makefile
# Delete partial outputs on error
.DELETE_ON_ERROR:

# Mark non-file targets
.PHONY: all clean test build

# Don't delete intermediate files
.SECONDARY:
```

**Avoid hardcoded paths**:

```makefile
# ✅ CORRECT: Uses variables and respects environment
GO ?= go
INSTALL_DIR ?= /usr/local/bin

install: $(BUILD_DIR)/app
	install -m 755 $< $(INSTALL_DIR)/

# ❌ WRONG: Hardcoded paths
install:
	install -m 755 ./build/app /usr/local/bin/app
```

**For complete safety patterns, see:** [references/safety-patterns.md](references/safety-patterns.md)

## Command Simplicity (Chariot-Specific)

**The Chariot CLAUDE.md explicitly requires simple, separate Bash commands instead of complex compound statements.**

```makefile
# ✅ CORRECT: Separate, debuggable commands
setup:
	mkdir -p $(BUILD_DIR)
	$(GO) mod download
	$(GO) generate ./...

# ❌ WRONG: Complex compound (parsing issues in Claude Code)
setup:
	REPO_ROOT=$$(git rev-parse --show-toplevel); \
	mkdir -p $$REPO_ROOT/build && \
	cd $$REPO_ROOT && $(GO) mod download && $(GO) generate ./...
```

**Why:** Easier debugging, avoids parser edge cases, better progress visibility.

**See CLAUDE.md:** [Bash Command Simplicity](../../../../CLAUDE.md#bash-command-simplicity)

## Debugging Makefiles

| Command          | Purpose                                    |
| ---------------- | ------------------------------------------ |
| `make -n`        | Dry-run (shows commands without executing) |
| `make -p`        | Print internal database (all rules)        |
| `make -d`        | Debug mode (shows why targets rebuilt)     |
| `$(info text)`   | Print debug message during parse           |
| `$(warning msg)` | Print warning message                      |
| `$(error msg)`   | Print error and stop                       |

**For complete debugging strategies, see:** [references/debugging.md](references/debugging.md)

## Common Mistakes and Anti-Patterns

### Critical Mistakes (Build Failures)

1. **Wildcard misuse** - Use `$(wildcard *.c)` or `$(shell find)`, not bare `*`
2. **Missing dependencies** - Leads to stale builds when files change
3. **Forgetting `.PHONY`** - Breaks when file with target name exists
4. **Missing `.DELETE_ON_ERROR`** - Leaves partial artifacts on failure
5. **Special character handling** - Escape spaces in filenames properly

### Maintenance Problems

6. **Hardcoded paths** - Breaks portability across environments
7. **Not using pattern rules** - Causes unnecessary repetition
8. **Missing clean target** - Leaves stale artifacts
9. **Overly complex rules** - Hard to debug and maintain
10. **Poor variable usage** - Compiler flags repeated throughout

**For complete anti-pattern catalog with fixes, see:** [references/anti-patterns.md](references/anti-patterns.md)

## File Organization

**When to split Makefiles:**

- Main Makefile > 300 lines
- 3+ distinct domains (build, test, deploy, docker, etc.)
- Shared logic across multiple projects

**Recommended structure:**

```
Makefile                  # Entry point with includes
make/
  config.mk              # Variables and configuration
  build.mk               # Build targets
  test.mk                # Testing targets
  docker.mk              # Docker targets
  deploy.mk              # Deployment targets
```

**Include pattern:**

```makefile
# Makefile (entry point)
include make/config.mk
include make/build.mk
include make/test.mk
```

**For complete organization patterns, see:** [references/file-organization.md](references/file-organization.md)

## Integration with Chariot Platform

The Chariot Development Platform has extensive Makefile usage:

**Root Makefile** (`chariot-development-platform2/Makefile`):

- Super-repository automation (`make chariot`, `make setup`)
- Submodule management (`make submodule-pull`)
- User/credential generation (`make user`)

**Module Makefiles** (e.g., `modules/chariot/backend/Makefile`):

- Module-specific builds and deployments
- SAM/CloudFormation operations
- Test execution

When working with these Makefiles, apply all patterns from this skill, especially:

- Variable-based configuration (never hardcode AWS regions, account IDs)
- Progressive disclosure (entry points obvious, complexity hidden)
- Command simplicity (separate commands, not compound chains)

## Progressive Disclosure Checklist

When creating or reviewing a Makefile, verify:

- [ ] Entry points obvious (help target, .DEFAULT_GOAL)
- [ ] Common tasks well-documented (## comments)
- [ ] Complex logic in separate included files
- [ ] Variables at top, sorted by purpose
- [ ] Pattern rules used to reduce repetition
- [ ] Auto-discovery for source files
- [ ] `.PHONY` and `.DELETE_ON_ERROR` present
- [ ] No hardcoded paths or values
- [ ] Commands are simple and debuggable
- [ ] Testing/deployment separated from build

## Related Skills

| Skill                      | Purpose                               |
| -------------------------- | ------------------------------------- |
| `adhering-to-dry`          | Reducing duplication in build logic   |
| `adhering-to-yagni`        | Avoiding unnecessary build complexity |
| `debugging-systematically` | When builds fail unexpectedly         |
| `structuring-go-projects`  | Go-specific Makefile patterns         |

## Validation

Before completing Makefile work, verify:

1. ✅ All phony targets declared with `.PHONY`
2. ✅ `.DELETE_ON_ERROR` included
3. ✅ No bare wildcards (use `$(wildcard)` or `$(shell find)`)
4. ✅ Variables use `?=` for environment override support
5. ✅ Dependencies correctly declared (files trigger rebuilds)
6. ✅ No hardcoded paths (use variables)
7. ✅ Help target with self-documenting `##` comments
8. ✅ Commands are simple (not complex compound chains)
9. ✅ Pattern rules used where applicable
10. ✅ File organization appropriate (split if > 300 lines)

**Cannot claim Makefile complete until all validations pass** ✅

## Changelog

See `.history/CHANGELOG` for historical changes and TDD documentation.
