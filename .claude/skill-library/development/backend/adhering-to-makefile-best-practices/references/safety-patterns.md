# Safety Patterns

**Error prevention and safe Makefile development.**

## Essential Special Targets

### .DELETE_ON_ERROR

**ALWAYS include this at the top of your Makefile:**

```makefile
# Delete targets on error (prevents partial builds)
.DELETE_ON_ERROR:
```

**Why critical:**

```makefile
# Without .DELETE_ON_ERROR
build/app: sources
	gcc sources -o $@  # Compilation fails halfway
	# Partial build/app file remains
	# Next make thinks build/app is up-to-date
	# Mysterious bugs ensue

# With .DELETE_ON_ERROR
.DELETE_ON_ERROR:
build/app: sources
	gcc sources -o $@  # Compilation fails halfway
	# Make automatically deletes build/app
	# Next make correctly rebuilds
```

---

### .PHONY

**Declare all non-file targets:**

```makefile
.PHONY: all clean build test install help

clean:
	rm -rf build/

test:
	go test ./...
```

**Why critical:** If a file named `clean` exists, Make thinks target is up-to-date.

---

### .SECONDARY

**Preserve intermediate files:**

```makefile
# Don't delete intermediate files
.SECONDARY:

# Or specific files
.SECONDARY: $(OBJECTS)
```

**Use when:** Expensive intermediate files (code generation, compilation) that might be reused.

---

### .INTERMEDIATE

**Mark files as intermediate (can be deleted):**

```makefile
.INTERMEDIATE: temp.o

final: temp.o
	$(CC) $< -o $@
```

**Use when:** Temporary files that can be regenerated cheaply.

---

### .NOTPARALLEL

**Disable parallel execution:**

```makefile
# Serialize all targets (rare, usually wrong)
.NOTPARALLEL:

# Better: Serialize specific targets only
.NOTPARALLEL: deploy/staging deploy/prod
```

**Use when:** Targets share resources (database, deployment slots).

---

## Error Handling

### Check Command Existence

```makefile
# Check before using
.PHONY: build
build:
	@command -v go >/dev/null 2>&1 || (echo "Go is required" && exit 1)
	go build -o build/app ./cmd/app

# Or at Makefile parse time
ifeq ($(shell command -v docker 2>/dev/null),)
$(error Docker is required but not installed)
endif
```

---

### Explicit Error Messages

```makefile
# ❌ WRONG: Cryptic error
build:
	gcc main.c -o app

# ✅ CORRECT: Clear error context
build:
	@echo "Building application..."
	gcc main.c -o app || (echo "Build failed: check compiler errors above" && exit 1)
```

---

### Conditional Errors

```makefile
# Error if required variable not set
ifndef BUILD_DIR
$(error BUILD_DIR must be set)
endif

# Warning (doesn't stop execution)
ifndef VERSION
$(warning VERSION not set, using default)
VERSION := dev
endif
```

---

## Safe Path Handling

### Avoid Hardcoded Paths

```makefile
# ❌ WRONG: Hardcoded absolute paths
install:
	cp app /usr/local/bin/
	cp config.yaml /etc/myapp/

# ✅ CORRECT: Configurable with defaults
PREFIX ?= /usr/local
SYSCONFDIR ?= $(PREFIX)/etc

install:
	install -d $(PREFIX)/bin
	install -m 755 app $(PREFIX)/bin/
	install -d $(SYSCONFDIR)/myapp
	install -m 644 config.yaml $(SYSCONFDIR)/myapp/
```

---

### Safe Directory Creation

```makefile
# ✅ CORRECT: Create directory before use
build/app: $(SOURCES)
	mkdir -p $(dir $@)
	go build -o $@ ./cmd/app

# Or use order-only prerequisite
build/app: $(SOURCES) | build/
	go build -o $@ ./cmd/app

build/:
	mkdir -p $@
```

---

### Escaping Special Characters

```makefile
# Files with spaces (rare, but handle gracefully)
FILES := $(wildcard "my file.c" "another file.c")

# Or avoid spaces entirely (better)
FILES := my_file.c another_file.c
```

---

## Safe Shell Usage

### Set Shell Options

```makefile
# Use bash and enable error checking
SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

# -e: Exit on error
# -u: Error on undefined variable
# -o pipefail: Pipe fails if any command fails
```

---

### Check Exit Codes

```makefile
# ❌ WRONG: Ignores errors
test:
	-go test ./...  # - prefix ignores failure

# ✅ CORRECT: Fails on error
test:
	go test ./...  # No - prefix, fails on error
```

---

### Use .ONESHELL

```makefile
# All lines in recipe run in same shell
.ONESHELL:

deploy:
	cd /tmp
	pwd  # Shows /tmp
	cd /var
	pwd  # Shows /var
```

**Without .ONESHELL:** Each line runs in separate shell, `cd` doesn't persist.

---

## Preventing Common Bugs

### Timestamp Normalization

```makefile
# Fix future timestamp issues
generated.go: source.proto
	protoc --go_out=. $<
	touch -r $< $@  # Set generated file timestamp to source timestamp
```

---

### Circular Dependency Detection

```makefile
# Make detects circular dependencies automatically
# a.o: b.o
# b.o: a.o
# Error: Circular dependency

# If you encounter this: Fix your dependencies!
```

---

### Race Condition Prevention

```makefile
# ❌ WRONG: Race condition in parallel make
build/app build/config.yaml: sources
	build-tool --output build/

# ✅ CORRECT: Grouped targets
build/app build/config.yaml &: sources
	build-tool --output build/
```

---

## Safe Cleanup

### Careful rm Commands

```makefile
# ❌ DANGEROUS: Could delete wrong files
clean:
	rm -rf *

# ✅ SAFE: Specific targets
clean:
	rm -rf build/ dist/

# ✅ SAFER: With safety check
clean:
	@test "$(BUILD_DIR)" != "" || (echo "BUILD_DIR not set" && exit 1)
	rm -rf $(BUILD_DIR)
```

---

### Multiple Clean Targets

```makefile
.PHONY: clean clean/build clean/cache clean/all

clean: clean/build ## Remove build artifacts

clean/build:
	rm -rf build/ *.o

clean/cache:
	rm -rf .cache/ .pytest_cache/

clean/all: clean/build clean/cache ## Nuclear clean
	rm -rf dist/ vendor/
```

---

## Safe Variable Usage

### Check Before Using

```makefile
# Check variable is set
deploy:
ifndef ENV
	$(error ENV must be set: make deploy ENV=staging)
endif
	./scripts/deploy.sh $(ENV)
```

---

### Provide Defaults

```makefile
# Safe defaults
GO ?= go
BUILD_DIR ?= ./build
PREFIX ?= /usr/local

# Environment-specific with safe default
ENV ?= dev
ifeq ($(ENV),prod)
$(error Cannot deploy to prod from Makefile - use CI/CD)
endif
```

---

### Avoid Recursive Assignment Issues

```makefile
# ❌ WRONG: Infinite recursion
X = $(Y)
Y = $(X)
# Make hangs

# ✅ CORRECT: Use :=
X := $(Y)
Y := value
```

---

## Cross-Platform Safety

### Portable Commands

```makefile
# ✅ PORTABLE: Works everywhere
clean:
	rm -rf build/

# ❌ NON-PORTABLE: Linux-specific
clean:
	find . -name '*.o' -exec rm {} \;  # Works differently on BSD
```

---

### Platform Detection

```makefile
UNAME_S := $(shell uname -s)

ifeq ($(UNAME_S),Darwin)
    SED := sed -i ''
else
    SED := sed -i
endif

# Use $(SED) instead of hardcoding sed -i
```

---

## Dry-Run Safety

### Test Before Executing

```bash
# Always test with -n first
make -n deploy  # Show what would execute

# Check for syntax errors
make -p > /dev/null

# Trace execution
make --trace build
```

---

## Safe Defaults

### Template for Safe Makefiles

```makefile
# Safe shell settings
SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

# Essential special targets
.DELETE_ON_ERROR:
.PHONY: all clean build test help
.DEFAULT_GOAL := help

# Tool paths with safe defaults
GO ?= go
DOCKER ?= docker

# Directories with safe defaults
BUILD_DIR ?= ./build
DIST_DIR ?= ./dist

# Check required tools
.PHONY: check-tools
check-tools:
	@command -v $(GO) >/dev/null || (echo "Go not found" && exit 1)

# Self-documenting help
help: ## Display available targets
	@grep -E '^[a-zA-Z_/-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

# Safe clean
clean: ## Remove build artifacts
	@test "$(BUILD_DIR)" != "" || (echo "BUILD_DIR not set" && exit 1)
	rm -rf $(BUILD_DIR)
```

---

## Security Considerations

### Avoid Secret Leakage

```makefile
# ❌ WRONG: Secrets in Makefile
DB_PASSWORD := supersecret

# ✅ CORRECT: Read from environment
DB_PASSWORD := $(shell cat .env | grep DB_PASSWORD | cut -d'=' -f2)

# ✅ BETTER: Require from environment
ifndef DB_PASSWORD
$(error DB_PASSWORD must be set in environment)
endif
```

---

### Safe External Commands

```makefile
# Validate input before using
deploy:
	@echo "$(ENV)" | grep -qE '^(dev|staging|prod)$$' || \
		(echo "Invalid ENV: $(ENV)" && exit 1)
	./scripts/deploy.sh $(ENV)
```

---

## Validation Checklist

Before running make in production:

- [ ] `.DELETE_ON_ERROR` present
- [ ] All non-file targets in `.PHONY`
- [ ] No hardcoded absolute paths
- [ ] Safe defaults for all variables
- [ ] Error messages are clear
- [ ] Tested with `make -n` first
- [ ] Clean target is safe (specific paths only)
- [ ] Required tools checked before use
- [ ] No secrets in Makefile
- [ ] Cross-platform compatible commands

---

## Emergency Recovery

### If Make Hangs

```bash
# Kill all make processes
pkill -9 make

# Find hung processes
ps aux | grep make

# Check for circular dependencies
make -p | grep -A5 "Circular"
```

---

### If Make Deletes Wrong Files

```bash
# Always test destructive operations first
make -n clean  # Dry-run shows what would be deleted

# Use git to recover
git checkout -- deleted-files
```

---

## Related References

- [Best Practices](best-practices.md) - Complete best practices
- [Anti-Patterns](anti-patterns.md) - What to avoid
- [Debugging](debugging.md) - Troubleshooting issues
