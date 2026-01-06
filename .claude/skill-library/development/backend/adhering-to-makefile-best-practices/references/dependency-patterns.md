# Dependency Patterns

**Managing prerequisites and rebuild triggers effectively.**

## Explicit File Dependencies

### Basic Pattern

```makefile
# Target depends on source files - rebuilds when any source changes
GO_SOURCES := $(shell find . -name '*.go')

build/app: $(GO_SOURCES)
	go build -o $@ ./cmd/app
```

**Why explicit:** Make compares timestamps. If any prerequisite is newer than target, target rebuilds.

---

### Multiple File Types

```makefile
# Application depends on Go sources AND config files
GO_SOURCES := $(shell find . -name '*.go')
CONFIG_FILES := config.yaml secrets.yaml

build/app: $(GO_SOURCES) $(CONFIG_FILES)
	go build -o $@ ./cmd/app
```

---

### Module Dependencies

```makefile
# Go modules trigger rebuild
GO_SOURCES := $(shell find . -name '*.go')

build/app: $(GO_SOURCES) go.mod go.sum
	go build -o $@ ./cmd/app
```

---

## Order-Only Prerequisites

### Directory Creation

Use `|` for prerequisites that should exist but don't trigger rebuilds:

```makefile
# Create directory once, but don't rebuild if directory timestamp changes
build/app: $(GO_SOURCES) | build/
	go build -o $@ ./cmd/app

build/:
	mkdir -p $@
```

**Why order-only:** Creating/touching the directory shouldn't trigger app rebuild.

---

### Multiple Directories

```makefile
# Ensure all directories exist
$(BUILD_DIR)/frontend/app.js: $(FE_SOURCES) | $(BUILD_DIR)/ $(BUILD_DIR)/frontend/
	npm run build

$(BUILD_DIR)/:
	mkdir -p $@

$(BUILD_DIR)/frontend/:
	mkdir -p $@
```

---

## Grouped Rules

### Multiple Outputs from Single Command

```makefile
# ✅ CORRECT: Use &: for grouped targets
proto/gen.pb.go proto/gen_grpc.pb.go &: proto/service.proto
	protoc --go_out=. --go-grpc_out=. $<

# Only runs protoc once when either output is out of date
```

**Compare to wrong approach:**

```makefile
# ❌ WRONG: Runs protoc twice
proto/gen.pb.go: proto/service.proto
	protoc --go_out=. --go-grpc_out=. $<

proto/gen_grpc.pb.go: proto/service.proto
	protoc --go_out=. --go-grpc_out=. $<
```

---

### Code Generation Example

```makefile
# Generate multiple Go files from single OpenAPI spec
api/client.go api/server.go api/types.go &: api/openapi.yaml
	openapi-generator generate -i $< -g go -o api/
```

---

## Dependency Files (Advanced)

### Automatic Dependency Generation

For C/C++ projects, generate `.d` files:

```makefile
# Generate dependency files during compilation
%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@ -MMD -MF $*.d

# Include generated dependency files
-include $(OBJECTS:.o=.d)
```

**How it works:**

1. `-MMD -MF $*.d` generates `foo.d` when compiling `foo.c`
2. `foo.d` contains all header dependencies
3. `-include` loads these dependencies (minus suppresses error if not found)
4. Make now knows `foo.o` depends on headers used by `foo.c`

---

### Go Module Dependencies

```makefile
# Track Go module changes
go.sum: go.mod
	go mod download
	go mod tidy

# Rebuild when modules change
build/app: $(GO_SOURCES) go.sum
	go build -o $@ ./cmd/app
```

---

## Chain Dependencies

### Sequential Builds

```makefile
# Each stage depends on previous
.PHONY: all build test deploy

all: deploy

deploy: test
	./scripts/deploy.sh

test: build
	go test ./...

build: deps
	go build -o build/app ./cmd/app

deps:
	go mod download
```

**Make ensures order:** deps → build → test → deploy

---

### Parallel-Safe Dependencies

```makefile
# These can run in parallel (no dependencies)
.PHONY: build/frontend build/backend

build: build/frontend build/backend

build/frontend:
	cd frontend && npm run build

build/backend:
	cd backend && go build ./...

# make -j2 runs both simultaneously
```

---

## Pattern-Based Dependencies

### Static Pattern Rules

```makefile
OBJECTS := foo.o bar.o baz.o

# All objects depend on their corresponding .c file
$(OBJECTS): %.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@
```

---

### Multiple Prerequisites

```makefile
# All objects also depend on common header
$(OBJECTS): common.h

# Specific objects depend on specific headers
foo.o: foo.h
bar.o: bar.h
baz.o: baz.h utils.h
```

---

## Dependency Discovery

### Find All Imports

```makefile
# Python: Find all imported modules
PYTHON_SOURCES := $(shell find . -name '*.py')
PYTHON_DEPS := $(shell grep -h '^import\|^from' $(PYTHON_SOURCES) | sort -u)

build/app.pex: $(PYTHON_SOURCES)
	@echo "Dependencies: $(PYTHON_DEPS)"
	pex -o $@ .
```

---

### Go Module Graph

```makefile
# Visualize Go dependencies
.PHONY: deps/graph
deps/graph:
	go mod graph | dot -Tpng -o deps.png
	open deps.png
```

---

## Conditional Dependencies

### Platform-Specific Dependencies

```makefile
UNAME_S := $(shell uname -s)

# Base dependencies
SOURCES := main.c utils.c

# Add platform-specific files
ifeq ($(UNAME_S),Linux)
SOURCES += linux_specific.c
else ifeq ($(UNAME_S),Darwin)
SOURCES += darwin_specific.c
endif

app: $(SOURCES)
	$(CC) $^ -o $@
```

---

### Mode-Specific Dependencies

```makefile
MODE ?= release

# Debug builds include debug symbols
ifeq ($(MODE),debug)
build/app: $(GO_SOURCES) debug.go
	go build -tags debug -o $@ ./cmd/app
else
build/app: $(GO_SOURCES)
	go build -o $@ ./cmd/app
endif
```

---

## Timestamp Issues

### Future Timestamps

**Problem:** File has future timestamp, Make rebuilds repeatedly

```makefile
# ✅ FIX: Normalize timestamp to source file
generated.go: source.proto
	protoc --go_out=. $<
	touch -r $< $@  # Set generated.go timestamp to match source.proto
```

---

### Intermediate Files

```makefile
# Mark as intermediate - Make can delete after use
.INTERMEDIATE: temp.o

final: temp.o
	$(CC) $< -o $@

temp.o: temp.c
	$(CC) -c $< -o $@
```

---

## Dependency Anti-Patterns

### ❌ WRONG: No Dependencies

```makefile
# Never rebuilds even when sources change
build/app:
	go build -o $@ ./cmd/app
```

**✅ FIX:**

```makefile
GO_SOURCES := $(shell find . -name '*.go')
build/app: $(GO_SOURCES)
	go build -o $@ ./cmd/app
```

---

### ❌ WRONG: Overly Broad Dependencies

```makefile
# Rebuilds when ANY file changes (including test files, docs, etc.)
build/app: $(shell find . -type f)
	go build -o $@ ./cmd/app
```

**✅ FIX:**

```makefile
# Only rebuild when relevant files change
GO_SOURCES := $(shell find ./cmd ./pkg -name '*.go')
build/app: $(GO_SOURCES) go.mod go.sum
	go build -o $@ ./cmd/app
```

---

### ❌ WRONG: Circular Dependencies

```makefile
# A depends on B, B depends on A - infinite loop
a.o: b.o
	$(CC) -c a.c -o $@

b.o: a.o
	$(CC) -c b.c -o $@
```

**✅ FIX:**

```makefile
# Remove circular dependency
a.o: a.c common.h
	$(CC) -c $< -o $@

b.o: b.c common.h
	$(CC) -c $< -o $@
```

---

### ❌ WRONG: Directory as Dependency

```makefile
# Rebuilds whenever any file in src/ changes timestamp
build/app: src/
	go build -o $@ ./cmd/app
```

**✅ FIX:**

```makefile
# List specific files
GO_SOURCES := $(shell find src/ -name '*.go')
build/app: $(GO_SOURCES)
	go build -o $@ ./cmd/app
```

---

## Debugging Dependencies

### Why Did Target Rebuild?

```bash
# Show detailed rebuild reasoning
make -d build 2>&1 | grep -A5 "Considering target"

# Simpler output
make -d build 2>&1 | grep "newer than"
```

---

### Print Dependencies

```makefile
# Show what target depends on
print-deps-%:
	@echo Dependencies for $*:
	@make -p | awk '/^$\*:/{print; getline; while($$0 ~ /^[ \t]/) {print; getline}}'

# Usage: make print-deps-build/app
```

---

### Dependency Graph

```bash
# Visualize dependency tree
make -Bnd build | make2graph | dot -Tpng -o deps.png
```

---

## Best Practices Summary

### Essential Patterns

1. **Always declare file dependencies** - Triggers correct rebuilds
2. **Use order-only for directories** - Avoid spurious rebuilds
3. **Use grouped rules for multi-output** - Avoid duplicate work
4. **Generate .d files for C/C++** - Automatic header tracking
5. **Exclude irrelevant files** - Narrow dependencies to relevant sources

---

### Checklist

- [ ] All targets have explicit dependencies
- [ ] No circular dependencies
- [ ] Directories use order-only prerequisites (`|`)
- [ ] Multi-output commands use grouped rules (`&:`)
- [ ] Dependencies exclude irrelevant files (tests, docs, vendor)
- [ ] Dependencies include all relevant files (sources, configs, modules)
- [ ] Timestamps normalized for generated files
- [ ] Tested rebuild behavior with `make -d`

---

## Related References

- [Best Practices](best-practices.md) - Complete best practices
- [Target Patterns](target-patterns.md) - Target organization
- [Pattern Rules](pattern-rules.md) - Pattern-based compilation
- [Debugging](debugging.md) - Troubleshooting dependencies
