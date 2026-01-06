# Auto-Discovery Patterns

**Automatically finding source files without manual listing.**

## Why Auto-Discovery?

**Problem with manual listing:**

```makefile
# ❌ WRONG: Manual maintenance required
SOURCES := foo.c bar.c baz.c qux.c
# Forgot to add new file? Build breaks or misses files
```

**Auto-discovery solution:**

```makefile
# ✅ CORRECT: Automatically finds all .c files
SOURCES := $(wildcard src/*.c)
# Or recursive
SOURCES := $(shell find src -name '*.c')
```

**Benefits:**

- New files automatically included
- No manual maintenance
- Prevents "forgot to add file" bugs

---

## wildcard Function

### Basic Usage

```makefile
# Find all .c files in current directory
C_SOURCES := $(wildcard *.c)

# Find all .go files
GO_SOURCES := $(wildcard *.go)

# Multiple patterns
ALL_SOURCES := $(wildcard *.c *.cpp *.cc)
```

---

### Subdirectory Patterns

```makefile
# One level deep
SOURCES := $(wildcard src/*.c)

# Two levels (with shell support for **)
SOURCES := $(wildcard src/**/*.c)

# Multiple directories
SOURCES := $(wildcard src/*.c lib/*.c vendor/*.c)
```

---

### Limitations

```makefile
# ❌ LIMITATION: ** doesn't work reliably across Make versions
SOURCES := $(wildcard src/**/*.c)  # May not recurse

# ✅ BETTER: Use shell find for recursion
SOURCES := $(shell find src -name '*.c')
```

---

## shell + find Command

### Recursive File Discovery

```makefile
# Find all .go files recursively
GO_SOURCES := $(shell find . -type f -name '*.go')

# Find all .c files in src/
C_SOURCES := $(shell find src -type f -name '*.c')

# Multiple extensions
ALL_SOURCES := $(shell find . -type f \( -name '*.c' -o -name '*.cpp' \))
```

---

### Excluding Directories

```makefile
# Exclude vendor directory
GO_SOURCES := $(shell find . -name '*.go' -not -path './vendor/*')

# Exclude multiple directories
GO_SOURCES := $(shell find . -name '*.go' \
	-not -path './vendor/*' \
	-not -path './test/*' \
	-not -path '*/mocks/*')

# Using grep -v (simpler syntax)
GO_SOURCES := $(shell find . -name '*.go' | grep -v -E '(vendor|test|mocks)')
```

---

### Performance Considerations

```makefile
# ❌ SLOW: Multiple find calls
GO_SOURCES := $(shell find . -name '*.go')
GO_TESTS := $(shell find . -name '*_test.go')
GO_MAINS := $(shell find . -name 'main.go')

# ✅ FAST: Single find call
ALL_GO := $(shell find . -name '*.go')
GO_SOURCES := $(filter-out %_test.go,$(ALL_GO))
GO_TESTS := $(filter %_test.go,$(ALL_GO))
GO_MAINS := $(filter %/main.go,$(ALL_GO))
```

---

## Git-Based Discovery

### Track Only Committed Files

```makefile
# Only include committed .go files
GO_SOURCES := $(shell git ls-files '*.go')

# Exclude deleted files
GO_SOURCES := $(shell git ls-files '*.go' | grep -v deleted)
```

**Advantages:**

- Ignores untracked files
- Respects `.gitignore`
- Fast (uses Git index)

---

### Find Modified Files

```makefile
# Only build changed files
MODIFIED_GO := $(shell git diff --name-only --diff-filter=AM '*.go')

quick-test:
	go test $(MODIFIED_GO)
```

---

## Language-Specific Patterns

### Go Projects

```makefile
# All Go sources excluding vendor and tests
GO_SOURCES := $(shell find . -name '*.go' \
	-not -path './vendor/*' \
	-not -name '*_test.go')

# Test files only
GO_TESTS := $(shell find . -name '*_test.go' -not -path './vendor/*')

# Main packages (binaries)
GO_MAINS := $(shell find ./cmd -name 'main.go')
```

---

### C/C++ Projects

```makefile
# C sources
C_SOURCES := $(shell find src -name '*.c')
C_HEADERS := $(shell find include -name '*.h')

# C++ sources
CPP_SOURCES := $(shell find src -name '*.cpp' -o -name '*.cc' -o -name '*.cxx')
CPP_HEADERS := $(shell find include -name '*.hpp' -o -name '*.hh')

# Objects from sources
C_OBJECTS := $(C_SOURCES:.c=.o)
CPP_OBJECTS := $(CPP_SOURCES:.cpp=.o)
```

---

### Python Projects

```makefile
# All Python modules
PY_SOURCES := $(shell find . -name '*.py' -not -path './venv/*')

# Test files
PY_TESTS := $(shell find tests -name 'test_*.py')
```

---

### JavaScript/TypeScript Projects

```makefile
# TypeScript sources
TS_SOURCES := $(shell find src -name '*.ts' -o -name '*.tsx')

# JavaScript sources
JS_SOURCES := $(shell find src -name '*.js' -o -name '*.jsx')

# Exclude node_modules
ALL_JS := $(shell find . -name '*.js' -not -path './node_modules/*')
```

---

## Directory Discovery

### Find All Subdirectories

```makefile
# All directories under src/
SRC_DIRS := $(shell find src -type d)

# Exclude hidden directories
SRC_DIRS := $(shell find src -type d -not -path '*/\.*')

# Create corresponding build directories
BUILD_DIRS := $(patsubst src/%,build/%,$(SRC_DIRS))

$(BUILD_DIRS):
	mkdir -p $@
```

---

### Module Discovery

```makefile
# Find all Go modules (directories with go.mod)
GO_MODULES := $(dir $(shell find . -name 'go.mod'))

# Build each module
.PHONY: build-modules
build-modules:
	@for mod in $(GO_MODULES); do \
		echo "Building $$mod"; \
		cd $$mod && go build ./...; \
	done
```

---

## Filtering and Transformation

### Filter by Pattern

```makefile
# All Go files
ALL_GO := $(shell find . -name '*.go')

# Filter out test files
GO_SOURCES := $(filter-out %_test.go,$(ALL_GO))

# Filter only test files
GO_TESTS := $(filter %_test.go,$(ALL_GO))

# Filter by directory
CMD_GO := $(filter ./cmd/%,$(ALL_GO))
```

---

### Path Transformation

```makefile
# Transform src/*.c to build/*.o
C_SOURCES := $(shell find src -name '*.c')
C_OBJECTS := $(patsubst src/%.c,build/%.o,$(C_SOURCES))

# Strip directory prefix
BASENAMES := $(notdir $(C_SOURCES))

# Extract directories
SRC_DIRS := $(sort $(dir $(C_SOURCES)))
```

---

## Caching Discovery Results

### Avoid Repeated Calls

```makefile
# ❌ SLOW: find called 3 times during Makefile parsing
SOURCES := $(shell find . -name '*.go')
OBJECTS := $(shell find . -name '*.go' | sed 's/.go/.o/')
COUNT := $(shell find . -name '*.go' | wc -l)

# ✅ FAST: find called once
SOURCES := $(shell find . -name '*.go')
OBJECTS := $(SOURCES:.go=.o)
COUNT := $(words $(SOURCES))
```

---

### Cache to File

```makefile
# Generate source list once
.sources.mk: $(shell find . -name '*.go')
	@echo "GO_SOURCES := \\" > $@
	@find . -name '*.go' | sed 's/$$/ \\/' >> $@

-include .sources.mk

# Regenerate when directory structure changes
```

---

## Dynamic Target Generation

### Generate Targets from Discovered Files

```makefile
# Find all cmd/*/main.go
BINS := $(shell find cmd -name 'main.go' | sed 's|cmd/\(.*\)/main.go|\1|')

# Generate build targets
BUILD_TARGETS := $(addprefix build/,$(BINS))

.PHONY: all $(BUILD_TARGETS)
all: $(BUILD_TARGETS)

build/%:
	go build -o $@ ./cmd/$*
```

---

### Test Discovery

```makefile
# Find all test directories (containing *_test.go)
TEST_DIRS := $(shell find . -name '*_test.go' | xargs -n1 dirname | sort -u)

.PHONY: test
test:
	@for dir in $(TEST_DIRS); do \
		go test $$dir || exit 1; \
	done
```

---

## Anti-Patterns

### ❌ WRONG: Bare Wildcard

```makefile
# Doesn't expand properly
SOURCES := *.c
# This creates variable with literal "*.c" string
```

**✅ FIX:**

```makefile
SOURCES := $(wildcard *.c)
```

---

### ❌ WRONG: Not Excluding Vendor/Generated

```makefile
# Includes vendor and generated code
GO_SOURCES := $(shell find . -name '*.go')
```

**✅ FIX:**

```makefile
GO_SOURCES := $(shell find . -name '*.go' \
	-not -path './vendor/*' \
	-not -path './gen/*' \
	-not -path '*/mocks/*')
```

---

### ❌ WRONG: Repeated Shell Calls

```makefile
# find runs multiple times
build: $(shell find . -name '*.go')
	go build ./...

test: $(shell find . -name '*.go')
	go test ./...
```

**✅ FIX:**

```makefile
# find runs once
GO_SOURCES := $(shell find . -name '*.go')

build: $(GO_SOURCES)
	go build ./...

test: $(GO_SOURCES)
	go test ./...
```

---

## Best Practices

### Discovery Checklist

- [ ] Use `$(wildcard)` for simple cases
- [ ] Use `$(shell find)` for recursive discovery
- [ ] Exclude vendor/node_modules/test directories
- [ ] Cache discovery results in variables
- [ ] Use Git-based discovery when appropriate
- [ ] Filter irrelevant files (tests, generated code)
- [ ] Transform paths for build artifacts
- [ ] Avoid repeated shell invocations

---

### When to Use Each Method

| Method         | Use When                          | Example                        |
| -------------- | --------------------------------- | ------------------------------ |
| `wildcard`     | Single directory, simple patterns | `$(wildcard *.c)`              |
| `shell find`   | Recursive search, complex filters | `$(shell find . -name '*.go')` |
| `git ls-files` | Only committed files matter       | `$(shell git ls-files '*.go')` |
| Manual list    | Very small, stable file set       | `SOURCES := main.c utils.c`    |

---

## Related References

- [Best Practices](best-practices.md) - Complete best practices
- [Variable Patterns](variable-patterns.md) - Variable usage
- [Dependency Patterns](dependency-patterns.md) - Using discovered files
