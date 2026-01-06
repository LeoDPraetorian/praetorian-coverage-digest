# Pattern Rules

**Using pattern rules and automatic variables for concise, maintainable Makefiles.**

## Basic Pattern Rules

### Simple Pattern Rule

```makefile
# Compile any .c file to .o file
%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

# Matches: foo.c → foo.o, bar.c → bar.o, etc.
```

**How it works:**

- `%` is the **stem** (wildcard matching any string)
- For `foo.o`, stem is `foo`
- Make looks for `foo.c` as prerequisite
- `$<` expands to `foo.c` (first prerequisite)
- `$@` expands to `foo.o` (target)

---

### Multiple Extension Pattern

```makefile
# Generate .pb.go from .proto
%.pb.go: %.proto
	protoc --go_out=. $<

# Minify .js to .min.js
%.min.js: %.js
	uglifyjs $< -o $@

# Compress .txt to .txt.gz
%.txt.gz: %.txt
	gzip -c $< > $@
```

---

## Automatic Variables

### Common Automatic Variables

| Variable | Meaning                         | Example                               |
| -------- | ------------------------------- | ------------------------------------- |
| `$@`     | Target name                     | `foo.o` in `foo.o: foo.c`             |
| `$<`     | First prerequisite              | `foo.c` in `foo.o: foo.c`             |
| `$^`     | All prerequisites               | `foo.c bar.h` in `foo.o: foo.c bar.h` |
| `$?`     | Prerequisites newer than target | Modified files only                   |
| `$*`     | Stem (pattern match)            | `foo` in `%.o: %.c` for `foo.o`       |
| `$(@D)`  | Directory of target             | `build/` in `build/foo.o`             |
| `$(@F)`  | Filename of target              | `foo.o` in `build/foo.o`              |
| `$(<D)`  | Directory of first prerequisite | `src/` in `src/foo.c`                 |
| `$(<F)`  | Filename of first prerequisite  | `foo.c` in `src/foo.c`                |

---

### Automatic Variables in Action

```makefile
build/%.o: src/%.c
	@echo "Target: $@"           # build/foo.o
	@echo "Source: $<"           # src/foo.c
	@echo "Stem: $*"             # foo
	@echo "Target dir: $(@D)"    # build
	@echo "Target file: $(@F)"   # foo.o
	$(CC) $(CFLAGS) -c $< -o $@
```

---

## Advanced Pattern Rules

### Multiple Prerequisites

```makefile
# Object depends on .c file AND common header
%.o: %.c common.h
	$(CC) $(CFLAGS) -c $< -o $@

# $< is still first prerequisite (%.c)
# $^ includes both (%.c and common.h)
```

---

### Directory Patterns

```makefile
# Build objects in build/ from sources in src/
build/%.o: src/%.c
	mkdir -p build/
	$(CC) $(CFLAGS) -c $< -o $@

# Matches: src/foo.c → build/foo.o
```

---

### Multiple Pattern Matches

```makefile
# Match nested directories
build/%.o: src/%.c
	mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -c $< -o $@

# Matches: src/foo/bar.c → build/foo/bar.o
# $(dir $@) = build/foo/
```

---

## Static Pattern Rules

### Explicit Target List

```makefile
OBJECTS := foo.o bar.o baz.o

# Apply pattern only to these specific targets
$(OBJECTS): %.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

# Only applies to foo.o, bar.o, baz.o
# Not to any other .o files
```

---

### Different Patterns for Different Targets

```makefile
C_OBJECTS := foo.o bar.o
CPP_OBJECTS := baz.o qux.o

$(C_OBJECTS): %.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

$(CPP_OBJECTS): %.o: %.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@
```

---

## Pattern Rule Examples

### Go Build Pattern

```makefile
# Build Go binaries in build/ from cmd/
build/%: cmd/%/main.go
	go build -o $@ ./cmd/$*
```

---

### Protocol Buffers

```makefile
# Generate .pb.go from .proto
%.pb.go: %.proto
	protoc --go_out=. $<

# With directory structure
gen/%.pb.go: proto/%.proto
	mkdir -p gen/
	protoc --go_out=gen/ $<
```

---

### Asset Pipeline

```makefile
# Minify JavaScript
dist/%.min.js: src/%.js
	mkdir -p dist/
	uglifyjs $< -o $@

# Optimize images
dist/%.opt.png: assets/%.png
	mkdir -p dist/
	optipng $< -out $@

# Compile SCSS
dist/%.css: styles/%.scss
	mkdir -p dist/
	sass $< $@
```

---

### Test Generation

```makefile
# Generate test file from source
%_test.go: %.go
	gotests -w -all $<
```

---

## Pattern Rule Precedence

### Multiple Rules Match

```makefile
# Rule 1: Specific pattern
foo.o: foo.c
	@echo "Using specific rule"
	$(CC) -c $< -o $@

# Rule 2: Generic pattern
%.o: %.c
	@echo "Using pattern rule"
	$(CC) -c $< -o $@

# For foo.o: Rule 1 wins (more specific)
# For bar.o: Rule 2 used (only match)
```

---

### Rule Order

```makefile
# First match wins if equal specificity
%.o: %.c
	@echo "First rule"
	$(CC) -c $< -o $@

%.o: %.c
	@echo "Second rule (never runs)"
	$(CC) -c $< -o $@
```

---

## Pattern-Specific Variables

### Apply Variables to Pattern

```makefile
# All .o files use -fPIC flag
%.o: CFLAGS += -fPIC

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@
```

---

### Different Flags by Pattern

```makefile
# Debug objects get debug flags
debug/%.o: CFLAGS += -g -O0

debug/%.o: src/%.c
	mkdir -p debug/
	$(CC) $(CFLAGS) -c $< -o $@

# Release objects get optimization
release/%.o: CFLAGS += -O2 -DNDEBUG

release/%.o: src/%.c
	mkdir -p release/
	$(CC) $(CFLAGS) -c $< -o $@
```

---

## Advanced Automatic Variables

### D and F Suffixes

```makefile
# Split target into directory and filename
build/subdir/%.o: src/subdir/%.c
	mkdir -p $(@D)  # Create build/subdir/
	$(CC) -c $< -o $@
	@echo "Built $(@F) in $(@D)"
```

---

### All Prerequisites

```makefile
# Link with all object files
app: $(OBJECTS)
	$(CC) $^ -o $@  # $^ = all OBJECTS

# vs first prerequisite only
config: default.yaml user.yaml
	cp $< $@  # $< = default.yaml only
```

---

## Pattern Functions

### Substitution References

```makefile
# Replace .c with .o
SOURCES := foo.c bar.c baz.c
OBJECTS := $(SOURCES:.c=.o)
# OBJECTS = foo.o bar.o baz.o

# Using patsubst
OBJECTS := $(patsubst %.c,%.o,$(SOURCES))
```

---

### Path Substitution

```makefile
# Change directory in paths
SRC_FILES := src/foo.c src/bar.c
BUILD_FILES := $(patsubst src/%.c,build/%.o,$(SRC_FILES))
# BUILD_FILES = build/foo.o build/bar.o
```

---

### Add Prefix/Suffix

```makefile
FILES := foo bar baz

# Add prefix
SRC_FILES := $(addprefix src/,$(FILES))
# SRC_FILES = src/foo src/bar src/baz

# Add suffix
C_FILES := $(addsuffix .c,$(FILES))
# C_FILES = foo.c bar.c baz.c

# Both
SOURCES := $(addsuffix .c,$(addprefix src/,$(FILES)))
# SOURCES = src/foo.c src/bar.c src/baz.c
```

---

## Pattern Rule Anti-Patterns

### ❌ WRONG: Too Broad Pattern

```makefile
# Matches EVERYTHING ending in .o
%: %.c
	$(CC) $< -o $@

# This will try to build anything from a .c file
```

**✅ FIX: Be specific**

```makefile
# Only match .o files
%.o: %.c
	$(CC) -c $< -o $@
```

---

### ❌ WRONG: Missing Directory Creation

```makefile
build/%.o: src/%.c
	$(CC) -c $< -o $@  # Fails if build/ doesn't exist
```

**✅ FIX: Create directory**

```makefile
build/%.o: src/%.c
	mkdir -p $(dir $@)
	$(CC) -c $< -o $@

# Or use order-only prerequisite
build/%.o: src/%.c | build/
	$(CC) -c $< -o $@

build/:
	mkdir -p $@
```

---

### ❌ WRONG: Ambiguous Patterns

```makefile
# Both could match foo.o
%.o: %.c
	gcc -c $< -o $@

%.o: %.cpp
	g++ -c $< -o $@

# If both foo.c and foo.cpp exist, first rule wins
```

**✅ FIX: Use static pattern rules**

```makefile
C_OBJECTS := foo.o bar.o
CPP_OBJECTS := baz.o qux.o

$(C_OBJECTS): %.o: %.c
	gcc -c $< -o $@

$(CPP_OBJECTS): %.o: %.cpp
	g++ -c $< -o $@
```

---

## Pattern Rule Debugging

### Print Automatic Variables

```makefile
%.o: %.c
	@echo "=== Building $@ ==="
	@echo "Target: $@"
	@echo "Source: $<"
	@echo "All prerequisites: $^"
	@echo "Stem: $*"
	@echo "Target directory: $(@D)"
	@echo "Target filename: $(@F)"
	$(CC) $(CFLAGS) -c $< -o $@
```

---

### Test Pattern Matching

```bash
# See which rule would match
make -n foo.o

# Show all implicit rules
make -p | grep "^%"

# Trace rule selection
make --trace foo.o
```

---

## Best Practices

### Use Pattern Rules For

- ✅ Compilation (`.c` → `.o`)
- ✅ Code generation (`.proto` → `.pb.go`)
- ✅ Asset processing (`.scss` → `.css`)
- ✅ Transformation with 1:1 relationship

### Don't Use Pattern Rules For

- ❌ Many-to-one relationships (multiple sources → single binary)
- ❌ One-to-many relationships (single source → multiple outputs, use grouped rules)
- ❌ Operations without clear file mapping

---

## Checklist

- [ ] Patterns are specific enough (not overly broad)
- [ ] Directories created with `mkdir -p $(dir $@)` or order-only prerequisites
- [ ] Ambiguous patterns resolved with static pattern rules
- [ ] Automatic variables used correctly (`$@`, `$<`, `$^`, `$*`)
- [ ] Pattern-specific variables used for flags
- [ ] Tested pattern matching with `make -n`

---

## Related References

- [Best Practices](best-practices.md) - Complete best practices
- [Automatic Variables](variable-patterns.md#automatic-variables) - Variable reference
- [Dependency Patterns](dependency-patterns.md) - Dependency management
- [Debugging](debugging.md) - Troubleshooting patterns
