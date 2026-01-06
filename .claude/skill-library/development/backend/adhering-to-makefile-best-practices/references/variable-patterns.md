# Variable Patterns

**Comprehensive guide to variable usage in Makefiles.**

## Variable Assignment Operators

### `=` (Recursive Assignment)

Value is evaluated **every time** the variable is used:

```makefile
# Recursive - evaluated at use time
FILES = $(wildcard *.c)
OBJECTS = $(FILES:.c=.o)

# If you add .c files and re-run make, FILES updates automatically
# But slower because it's re-evaluated each time
```

**Use when:** Value depends on other variables that might change.

---

### `:=` (Simple Assignment)

Value is evaluated **once** at assignment time:

```makefile
# Simple - evaluated once at definition
FILES := $(wildcard *.c)
OBJECTS := $(FILES:.c=.o)

# FILES is set once. Adding .c files won't update FILES
# Faster because no re-evaluation
```

**Use when:** Value is static or performance matters.

---

### `?=` (Conditional Assignment)

Only sets the variable if it's not already defined:

```makefile
# Set default only if not already set
GO ?= go
CC ?= gcc
PREFIX ?= /usr/local

# User can override:
# $ make GO=/custom/path/go
# $ PREFIX=$HOME/.local make install
```

**Use when:** Providing defaults that users/environment can override.

---

### `+=` (Append)

Adds to existing value:

```makefile
CFLAGS := -Wall -Wextra
CFLAGS += -O2
CFLAGS += -g

# CFLAGS = -Wall -Wextra -O2 -g
```

**Use when:** Building up values incrementally.

---

### `::=` (Simply Expanded, POSIX)

Like `:=` but more portable:

```makefile
# POSIX-compatible simple expansion
FILES ::= $(wildcard *.c)
```

**Use when:** Need POSIX compatibility.

---

## Variable Types

### Simple Variables

```makefile
# Tool paths
GO := go
DOCKER := docker
NPM := npm

# Directories
BUILD_DIR := ./build
SRC_DIR := ./src
DIST_DIR := ./dist

# Metadata
VERSION := 1.0.0
AUTHOR := John Doe
```

---

### Computed Variables

```makefile
# Git metadata
VERSION := $(shell git describe --tags --always --dirty)
COMMIT := $(shell git rev-parse --short HEAD)
BRANCH := $(shell git rev-parse --abbrev-ref HEAD)

# Timestamps
BUILD_TIME := $(shell date -u '+%Y-%m-%d_%H:%M:%S')
BUILD_DATE := $(shell date -u '+%Y%m%d')

# Platform detection
UNAME_S := $(shell uname -s)
UNAME_M := $(shell uname -m)

# File lists
GO_SOURCES := $(shell find . -name '*.go' -not -path './vendor/*')
C_SOURCES := $(wildcard src/*.c src/**/*.c)
```

---

### Override Variables

Allow command-line overrides:

```makefile
# Can be overridden from command line
override CFLAGS += -Wall

# Cannot be overridden
CFLAGS := -Wall  # User's CFLAGS ignored
```

**Use `override` sparingly** - usually want users to control flags.

---

## Variable Scope

### Global Variables

```makefile
# Defined at top level, available everywhere
GLOBAL_VAR := value

target:
	echo $(GLOBAL_VAR)
```

---

### Target-Specific Variables

```makefile
# Only applies to this target and its prerequisites
debug: CFLAGS += -g -O0
debug: app

release: CFLAGS += -O2 -DNDEBUG
release: app

app: main.c
	$(CC) $(CFLAGS) $< -o $@
```

---

### Pattern-Specific Variables

```makefile
# Apply to all targets matching pattern
%.o: CFLAGS += -fPIC

foo.o bar.o: %.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@
```

---

### Exported Variables

```makefile
# Export to environment of recipes
export PATH := $(GOPATH)/bin:$(PATH)
export GOFLAGS := -v -trimpath

# Or export all variables
.EXPORT_ALL_VARIABLES:

build:
	# Recipes see exported vars in environment
	go build ./...
```

---

## Variable Naming Conventions

### Tool Variables

```makefile
# Uppercase for tool names (GNU convention)
CC ?= gcc
GO ?= go
DOCKER ?= docker
PYTHON ?= python3
NPM ?= npm
```

---

### Directory Variables

```makefile
# Uppercase with _DIR suffix
BUILD_DIR := ./build
SRC_DIR := ./src
DIST_DIR := ./dist
TEST_DIR := ./test
COVERAGE_DIR := ./coverage
```

---

### Flag Variables

```makefile
# Uppercase with FLAGS suffix
CFLAGS ?= -Wall -Wextra
LDFLAGS ?= -ldl -lpthread
GO_FLAGS ?= -v -trimpath
TEST_FLAGS ?= -race -coverprofile=coverage.out
```

---

### File List Variables

```makefile
# Uppercase with SOURCES/OBJECTS suffix
C_SOURCES := $(wildcard src/*.c)
C_OBJECTS := $(C_SOURCES:.c=.o)
GO_SOURCES := $(shell find . -name '*.go')
```

---

## Variable Organization

### Top-Level Organization

```makefile
# 1. Tool paths
GO ?= go
DOCKER ?= docker

# 2. Directories
BUILD_DIR := ./build
SRC_DIR := ./src

# 3. Build metadata
VERSION := $(shell git describe --tags)
COMMIT := $(shell git rev-parse --short HEAD)

# 4. Compiler flags
GO_FLAGS := -v -trimpath
GO_LDFLAGS := -s -w -X main.Version=$(VERSION)

# 5. File lists
GO_SOURCES := $(shell find . -name '*.go')

# 6. Special targets
.DELETE_ON_ERROR:
.PHONY: all clean build test
```

---

## Variable Substitution

### Pattern Substitution

```makefile
# Replace .c with .o
SOURCES := foo.c bar.c baz.c
OBJECTS := $(SOURCES:.c=.o)
# OBJECTS = foo.o bar.o baz.o

# Using patsubst function
OBJECTS := $(patsubst %.c,%.o,$(SOURCES))

# Change directory
SRC_FILES := src/foo.c src/bar.c
BUILD_FILES := $(patsubst src/%.c,build/%.o,$(SRC_FILES))
# BUILD_FILES = build/foo.o build/bar.o
```

---

### Text Functions

```makefile
# Lowercase
LOWER := $(shell echo "HELLO" | tr '[:upper:]' '[:lower:]')

# Uppercase
UPPER := $(shell echo "hello" | tr '[:lower:]' '[:upper:]')

# Strip whitespace
STRIPPED := $(strip   foo   bar   )
# STRIPPED = foo bar

# Add prefix
FILES := foo.c bar.c
PREFIXED := $(addprefix src/,$(FILES))
# PREFIXED = src/foo.c src/bar.c

# Add suffix
SUFFIXED := $(addsuffix .o,foo bar baz)
# SUFFIXED = foo.o bar.o baz.o

# Filter
ALL_FILES := foo.c bar.go baz.c
C_FILES := $(filter %.c,$(ALL_FILES))
# C_FILES = foo.c baz.c

# Filter out
NON_C := $(filter-out %.c,$(ALL_FILES))
# NON_C = bar.go

# Substring
WORD2 := $(word 2,foo bar baz)
# WORD2 = bar

# Word count
COUNT := $(words foo bar baz)
# COUNT = 3
```

---

## Variable Debugging

### Print Variables

```makefile
# Debug target to print any variable
print-%:
	@echo $* = $($*)

# Usage: make print-SOURCES
```

---

### Inline Info

```makefile
$(info SOURCES = $(SOURCES))
$(info OBJECTS = $(OBJECTS))

# Prints during Makefile parsing
```

---

### Warning and Error

```makefile
# Warning doesn't stop execution
ifeq ($(GO),)
$(warning GO is not set, using default)
GO := go
endif

# Error stops execution
ifeq ($(BUILD_DIR),)
$(error BUILD_DIR must be set)
endif
```

---

## Common Patterns

### Platform-Specific Variables

```makefile
UNAME_S := $(shell uname -s)

ifeq ($(UNAME_S),Linux)
    OS := linux
    LDFLAGS += -ldl
else ifeq ($(UNAME_S),Darwin)
    OS := darwin
    LDFLAGS += -framework CoreFoundation
else ifeq ($(UNAME_S),Windows_NT)
    OS := windows
    EXE_SUFFIX := .exe
endif
```

---

### Build Mode Variables

```makefile
# Default to release mode
MODE ?= release

ifeq ($(MODE),debug)
    CFLAGS += -g -O0 -DDEBUG
    GO_FLAGS += -gcflags="all=-N -l"
else ifeq ($(MODE),release)
    CFLAGS += -O2 -DNDEBUG
    GO_FLAGS += -ldflags="-s -w"
endif
```

---

### Multi-Value Variables

```makefile
# Space-separated list
PACKAGES := ./cmd/... ./pkg/... ./internal/...

# Newline-separated (use define)
define HELP_TEXT
Available targets:
  build  - Build the application
  test   - Run tests
  clean  - Remove artifacts
endef
export HELP_TEXT
```

---

## Anti-Patterns

### ❌ WRONG: Hardcoded Values

```makefile
build:
	gcc -Wall -Wextra -O2 main.c -o app
	cp app /usr/local/bin/
```

**✅ FIX: Use variables**

```makefile
CC ?= gcc
CFLAGS ?= -Wall -Wextra -O2
PREFIX ?= /usr/local

build:
	$(CC) $(CFLAGS) main.c -o app

install: build
	install -m 755 app $(PREFIX)/bin/
```

---

### ❌ WRONG: Not Using ?=

```makefile
GO = go  # Forces value, ignores environment
```

**✅ FIX: Allow override**

```makefile
GO ?= go  # Uses environment if set
```

---

### ❌ WRONG: Shell in Variables (Slow)

```makefile
# Runs git describe every time OBJECTS is used
VERSION = $(shell git describe --tags)
OBJECTS = $(patsubst %.c,%.o,$(shell find . -name '*.c'))
```

**✅ FIX: Use := for shell commands**

```makefile
# Runs once at definition
VERSION := $(shell git describe --tags)
SOURCES := $(shell find . -name '*.c')
OBJECTS := $(SOURCES:.c=.o)
```

---

### ❌ WRONG: Unclear Names

```makefile
V := 1.0.0
F := $(wildcard *.c)
O := $(F:.c=.o)
```

**✅ FIX: Descriptive names**

```makefile
VERSION := 1.0.0
C_SOURCES := $(wildcard *.c)
C_OBJECTS := $(C_SOURCES:.c=.o)
```

---

## Related References

- [Best Practices](best-practices.md) - Complete best practices
- [Target Patterns](target-patterns.md) - Target organization
- [Dependency Patterns](dependency-patterns.md) - Dependency management
