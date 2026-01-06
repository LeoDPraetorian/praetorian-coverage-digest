# Makefile Anti-Patterns

**Common mistakes with concrete fixes.**

## Critical Mistakes (Build Failures)

### 1. Wildcard Misuse

**Problem:** Using bare wildcards that don't expand

```makefile
# ❌ WRONG: Bare wildcard doesn't expand
SOURCES := *.go

# This creates a variable with literal "*.go" string
# If no .go files exist yet, builds fail silently
```

**Fix:**

```makefile
# ✅ CORRECT: Use wildcard function
SOURCES := $(wildcard *.go)

# ✅ BETTER: Use shell find for recursive search
SOURCES := $(shell find . -type f -name '*.go')

# ✅ BEST: Exclude vendor directories
SOURCES := $(shell find . -name '*.go' -not -path './vendor/*')
```

---

### 2. Missing Dependencies

**Problem:** Targets don't rebuild when sources change

```makefile
# ❌ WRONG: No dependencies declared
$(BUILD_DIR)/app:
	go build -o $@ ./cmd/app

# This never rebuilds, even when source code changes
```

**Fix:**

```makefile
# ✅ CORRECT: Declare file dependencies
GO_SOURCES := $(shell find . -name '*.go')

$(BUILD_DIR)/app: $(GO_SOURCES) go.mod go.sum
	mkdir -p $(BUILD_DIR)
	go build -o $@ ./cmd/app

# Now rebuilds whenever any .go file or dependencies change
```

---

### 3. Forgetting .PHONY

**Problem:** Target breaks when file with same name exists

```makefile
# ❌ WRONG: No .PHONY declaration
test:
	go test ./...

# If someone creates a file named "test", make thinks it's up-to-date
# and never runs the tests
```

**Fix:**

```makefile
# ✅ CORRECT: Declare phony targets
.PHONY: test clean build all

test:
	go test ./...

clean:
	rm -rf build/

# Always executes, regardless of file existence
```

---

### 4. Missing .DELETE_ON_ERROR

**Problem:** Partial build artifacts left on failure

```makefile
# ❌ WRONG: No error cleanup
app: main.go
	gcc main.c -o app

# If compilation fails midway, partial "app" file remains
# Next make run thinks "app" is up-to-date
```

**Fix:**

```makefile
# ✅ CORRECT: Delete targets on error
.DELETE_ON_ERROR:

app: main.go
	gcc main.c -o app

# Failed builds leave no artifacts
```

---

### 5. Special Character Handling

**Problem:** Spaces in filenames break the build

```makefile
# ❌ WRONG: Unescaped spaces
FILES := my file.c another file.c
app: $(FILES)
	gcc $(FILES) -o app

# Make sees this as 4 files: "my", "file.c", "another", "file.c"
```

**Fix:**

```makefile
# ✅ CORRECT: Escape spaces or quote properly
FILES := my\ file.c another\ file.c

# ✅ BETTER: Avoid spaces in filenames entirely
FILES := my_file.c another_file.c

# ✅ ALTERNATIVE: Use $(wildcard) with quoted patterns
FILES := $(wildcard "my file.c" "another file.c")
```

---

## Maintenance Problems

### 6. Hardcoded Paths

**Problem:** Breaks portability across environments

```makefile
# ❌ WRONG: Hardcoded absolute paths
install:
	cp app /usr/local/bin/app
	cp config.yaml /etc/myapp/config.yaml

# Breaks on macOS (different paths), Windows, or non-root users
```

**Fix:**

```makefile
# ✅ CORRECT: Use variables and respect PREFIX convention
PREFIX ?= /usr/local
SYSCONFDIR ?= $(PREFIX)/etc

install:
	install -d $(PREFIX)/bin
	install -m 755 app $(PREFIX)/bin/
	install -d $(SYSCONFDIR)/myapp
	install -m 644 config.yaml $(SYSCONFDIR)/myapp/

# User can override: make install PREFIX=$HOME/.local
```

---

### 7. Not Using Pattern Rules

**Problem:** Repetitive, unmaintainable rules

```makefile
# ❌ WRONG: Repeated logic
foo.o: foo.c
	gcc -c foo.c -o foo.o

bar.o: bar.c
	gcc -c bar.c -o bar.o

baz.o: baz.c
	gcc -c baz.c -o baz.o

# Adding new files requires duplicating rules
```

**Fix:**

```makefile
# ✅ CORRECT: Pattern rule handles all cases
%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

# Adding new .c files? No Makefile changes needed
```

---

### 8. Missing Clean Target

**Problem:** Stale artifacts cause confusion

```makefile
# ❌ WRONG: No way to clean build artifacts
app: main.c
	gcc main.c -o app

# Old object files, outdated binaries accumulate
# Developers waste time debugging stale state
```

**Fix:**

```makefile
# ✅ CORRECT: Comprehensive clean target
.PHONY: clean clean/all

BUILD_DIR := ./build
DIST_DIR := ./dist

clean: ## Remove build artifacts
	rm -rf $(BUILD_DIR)
	find . -name '*.o' -delete
	find . -name '*.d' -delete

clean/all: clean ## Remove all generated files (including dist)
	rm -rf $(DIST_DIR)
```

---

### 9. Overly Complex Rules

**Problem:** Compound commands hard to debug

```makefile
# ❌ WRONG: Complex shell chain
deploy:
	TIMESTAMP=$$(date +%s); \
	BUILD_ID=$$TIMESTAMP-$$(git rev-parse --short HEAD); \
	docker build -t app:$$BUILD_ID . && \
	docker tag app:$$BUILD_ID app:latest && \
	docker push app:$$BUILD_ID && \
	docker push app:latest || \
	(echo "Deploy failed for $$BUILD_ID" && exit 1)

# Hard to debug, error messages unclear
```

**Fix:**

```makefile
# ✅ CORRECT: Separate steps, clear failures
.PHONY: deploy deploy/build deploy/tag deploy/push

TIMESTAMP := $(shell date +%s)
GIT_SHA := $(shell git rev-parse --short HEAD)
BUILD_ID := $(TIMESTAMP)-$(GIT_SHA)
IMAGE := app:$(BUILD_ID)

deploy: deploy/build deploy/tag deploy/push ## Full deployment

deploy/build:
	docker build -t $(IMAGE) .

deploy/tag: deploy/build
	docker tag $(IMAGE) app:latest

deploy/push: deploy/tag
	docker push $(IMAGE)
	docker push app:latest
```

---

### 10. Poor Variable Usage

**Problem:** Compiler flags repeated throughout

```makefile
# ❌ WRONG: Flags hardcoded everywhere
app: main.c util.c
	gcc -Wall -Wextra -O2 -std=c11 main.c util.c -o app

test: test.c util.c
	gcc -Wall -Wextra -O2 -std=c11 test.c util.c -o test

# Changing compiler flags requires editing multiple lines
```

**Fix:**

```makefile
# ✅ CORRECT: Centralized flag management
CC := gcc
CFLAGS := -Wall -Wextra -std=c11
RELEASE_FLAGS := -O2 -DNDEBUG
DEBUG_FLAGS := -g -O0

app: main.c util.c
	$(CC) $(CFLAGS) $(RELEASE_FLAGS) $^ -o $@

test: test.c util.c
	$(CC) $(CFLAGS) $(DEBUG_FLAGS) $^ -o $@

# Single point of control for all flags
```

---

## Build System Anti-Patterns

### 11. Recursive Make Considered Harmful

**Problem:** Slows builds, breaks dependencies

```makefile
# ❌ WRONG: Recursive make calls
build:
	cd frontend && $(MAKE)
	cd backend && $(MAKE)

# Problems:
# - Can't parallelize (make -j broken)
# - Cross-directory dependencies don't work
# - Slower due to multiple make processes
```

**Fix:**

```makefile
# ✅ CORRECT: Include submakefiles
include frontend/module.mk
include backend/module.mk

# Or use non-recursive approach
FRONTEND_SOURCES := $(wildcard frontend/src/*.js)
BACKEND_SOURCES := $(wildcard backend/*.go)

build: build/frontend build/backend

build/frontend: $(FRONTEND_SOURCES)
	cd frontend && npm run build

build/backend: $(BACKEND_SOURCES)
	cd backend && go build -o ../build/backend ./...
```

---

### 12. Silent Failures

**Problem:** Errors hidden from output

```makefile
# ❌ WRONG: Silencing errors
test:
	@-go test ./... 2>/dev/null

# Failures go unnoticed, CI passes incorrectly
```

**Fix:**

```makefile
# ✅ CORRECT: Show all output
test:
	go test -v ./...

# Or silence commands but show errors
test:
	@go test ./... || (echo "Tests failed" && exit 1)
```

---

### 13. Timestamp Issues

**Problem:** Future timestamps cause repeated builds

```makefile
# ❌ PROBLEM: Generated file has future timestamp
proto/gen.pb.go: proto/service.proto
	protoc --go_out=. $<
	# If system clock wrong, gen.pb.go has future timestamp

# Every make run thinks proto needs rebuilding
```

**Fix:**

```makefile
# ✅ CORRECT: Use touch to normalize timestamps
proto/gen.pb.go: proto/service.proto
	protoc --go_out=. $<
	touch -r $< $@

# Or use .INTERMEDIATE to mark as intermediate file
.INTERMEDIATE: proto/gen.pb.go
```

---

### 14. Platform-Specific Commands

**Problem:** Makefile only works on one OS

```makefile
# ❌ WRONG: Linux-specific commands
clean:
	find . -name '*.o' -exec rm {} \;
	sed -i 's/foo/bar/' config.txt

# sed -i works differently on macOS
```

**Fix:**

```makefile
# ✅ CORRECT: Portable commands
UNAME_S := $(shell uname -s)

clean:
	find . -name '*.o' -delete  # Portable

# Platform-specific sed
ifeq ($(UNAME_S),Darwin)
	sed -i '' 's/foo/bar/' config.txt
else
	sed -i 's/foo/bar/' config.txt
endif
```

---

### 15. No Default Target

**Problem:** Running `make` does nothing useful

```makefile
# ❌ WRONG: No default, unclear entry point
clean:
	rm -rf build/

test:
	go test ./...

build:
	go build ./...

# User runs "make", nothing happens (first target is clean)
```

**Fix:**

```makefile
# ✅ CORRECT: Explicit default with help
.DEFAULT_GOAL := help

.PHONY: help
help: ## Display available targets
	@grep -E '^[a-zA-Z_/-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

build: ## Build the application
	go build ./...

test: ## Run tests
	go test ./...
```

---

## Advanced Pitfalls

### 16. Order-Dependent Targets

**Problem:** Targets must run in specific order but Make doesn't know

```makefile
# ❌ WRONG: Implicit ordering assumption
test: clean build
	go test ./...

# If "build" is up-to-date, "clean" still runs and deletes it
```

**Fix:**

```makefile
# ✅ CORRECT: Explicit dependencies
build: $(SOURCES)
	go build -o app ./...

test: build
	go test ./...

# "clean" is separate, doesn't affect test
.PHONY: clean
clean:
	rm -rf build/
```

---

### 17. Shell Variable Confusion

**Problem:** Make variables vs shell variables

```makefile
# ❌ WRONG: Mixing Make and shell syntax
deploy:
	VERSION=1.0
	docker build -t app:$(VERSION) .

# $(VERSION) is empty (Make variable), not shell variable
```

**Fix:**

```makefile
# ✅ CORRECT: Use Make variables
VERSION := 1.0

deploy:
	docker build -t app:$(VERSION) .

# Or use shell variables with $$
deploy:
	VERSION=1.0; \
	docker build -t app:$$VERSION .
```

---

### 18. Include File Not Found

**Problem:** Missing includes break Makefile

```makefile
# ❌ WRONG: Required include
include config.mk  # Error if config.mk doesn't exist
```

**Fix:**

```makefile
# ✅ CORRECT: Optional include
-include config.mk  # Silently ignores if missing

# Or provide default
include config.mk
config.mk:
	echo "# Default config" > $@
	echo "PREFIX := /usr/local" >> $@
```

---

### 19. VPATH Misuse

**Problem:** VPATH searches all directories, finds wrong files

```makefile
# ❌ WRONG: Overly broad VPATH
VPATH := src:lib:vendor

%.o: %.c
	gcc -c $< -o $@

# Finds wrong files when names collide
```

**Fix:**

```makefile
# ✅ CORRECT: Specific rules with explicit paths
SRC_OBJECTS := $(patsubst src/%.c,build/%.o,$(wildcard src/*.c))
LIB_OBJECTS := $(patsubst lib/%.c,build/%.o,$(wildcard lib/*.c))

build/%.o: src/%.c
	gcc -c $< -o $@

build/%.o: lib/%.c
	gcc -c $< -o $@
```

---

### 20. Multiple Pattern Rules

**Problem:** Multiple rules match, Make picks first

```makefile
# ❌ WRONG: Ambiguous patterns
%.o: %.c
	gcc -c $< -o $@

%.o: %.cpp
	g++ -c $< -o $@

# For "foo.o", which rule applies if both foo.c and foo.cpp exist?
```

**Fix:**

```makefile
# ✅ CORRECT: Non-overlapping patterns or static pattern rules
C_OBJECTS := foo.o bar.o
CPP_OBJECTS := baz.o qux.o

$(C_OBJECTS): %.o: %.c
	gcc -c $< -o $@

$(CPP_OBJECTS): %.o: %.cpp
	g++ -c $< -o $@
```

---

## Related References

- [Best Practices](best-practices.md) - Correct patterns
- [Debugging](debugging.md) - Troubleshooting strategies
- [Safety Patterns](safety-patterns.md) - Error prevention
