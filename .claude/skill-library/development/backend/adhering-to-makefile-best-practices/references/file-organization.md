# Makefile File Organization

**When and how to split large Makefiles into maintainable modules.**

## When to Split Makefiles

### Size Thresholds

| Line Count | Action             | Reason           |
| ---------- | ------------------ | ---------------- |
| < 200      | Single file OK     | Easy to navigate |
| 200-300    | Consider splitting | Getting complex  |
| 300-500    | Should split       | Hard to maintain |
| > 500      | Must split         | Unmaintainable   |

### Complexity Indicators

Split when you have:

- **3+ distinct domains** (build, test, deploy, docker, etc.)
- **Multiple languages/tools** (Go + Python + Node.js)
- **Platform-specific rules** (Linux, macOS, Windows)
- **Shared logic** across multiple projects
- **Team specialization** (frontend vs backend vs DevOps)

---

## Recommended Structure

### Small Projects (< 200 lines)

```
project/
├── Makefile              # Everything in one file
├── src/
├── build/
└── test/
```

**Makefile structure:**

```makefile
# Variables
GO := go
BUILD_DIR := ./build

# Entry points
.DEFAULT_GOAL := help
.PHONY: all clean test build help

# Build targets
build:
	$(GO) build -o $(BUILD_DIR)/app ./cmd/app

# Test targets
test:
	$(GO) test ./...

# Utility targets
clean:
	rm -rf $(BUILD_DIR)
```

---

### Medium Projects (200-500 lines)

```
project/
├── Makefile              # Entry point with includes
├── make/
│   ├── config.mk        # Variables and configuration
│   ├── build.mk         # Build targets
│   ├── test.mk          # Testing targets
│   └── docker.mk        # Docker targets
├── src/
├── build/
└── test/
```

**Makefile (entry point):**

```makefile
# Makefile - Entry point
.DEFAULT_GOAL := help

# Include modules in dependency order
include make/config.mk
include make/build.mk
include make/test.mk
include make/docker.mk

.PHONY: help
help: ## Display available targets
	@grep -E '^[a-zA-Z_/-]+:.*?## .*$$' $(MAKEFILE_LIST) make/*.mk | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'
```

**make/config.mk:**

```makefile
# Configuration and variables

# Tools
GO ?= go
DOCKER ?= docker
GOCMD := $(GO)

# Directories
BUILD_DIR := ./build
DIST_DIR := ./dist
SRC_DIR := ./cmd

# Build metadata
VERSION := $(shell git describe --tags --always --dirty)
COMMIT := $(shell git rev-parse --short HEAD)
BUILD_TIME := $(shell date -u '+%Y-%m-%d_%H:%M:%S')

# Compiler flags
GO_FLAGS := -v -trimpath
GO_LDFLAGS := -s -w \
	-X main.Version=$(VERSION) \
	-X main.Commit=$(COMMIT) \
	-X main.BuildTime=$(BUILD_TIME)

# Auto-discovered sources
GO_SOURCES := $(shell find . -name '*.go' -not -path './vendor/*')

# Special targets
.DELETE_ON_ERROR:
.SECONDARY:
```

**make/build.mk:**

```makefile
# Build targets

.PHONY: build build/all build/linux build/darwin build/windows

build: $(BUILD_DIR)/app ## Build for current platform

build/all: build/linux build/darwin build/windows ## Build for all platforms

$(BUILD_DIR)/app: $(GO_SOURCES)
	mkdir -p $(BUILD_DIR)
	$(GO) build $(GO_FLAGS) -ldflags "$(GO_LDFLAGS)" -o $@ ./cmd/app

build/linux: ## Build Linux binary
	GOOS=linux GOARCH=amd64 $(GO) build $(GO_FLAGS) -ldflags "$(GO_LDFLAGS)" \
		-o $(BUILD_DIR)/app-linux-amd64 ./cmd/app

build/darwin: ## Build macOS binary
	GOOS=darwin GOARCH=amd64 $(GO) build $(GO_FLAGS) -ldflags "$(GO_LDFLAGS)" \
		-o $(BUILD_DIR)/app-darwin-amd64 ./cmd/app

build/windows: ## Build Windows binary
	GOOS=windows GOARCH=amd64 $(GO) build $(GO_FLAGS) -ldflags "$(GO_LDFLAGS)" \
		-o $(BUILD_DIR)/app-windows-amd64.exe ./cmd/app
```

**make/test.mk:**

```makefile
# Testing targets

.PHONY: test test/unit test/integration test/coverage test/bench

test: test/unit ## Run all tests

test/unit: ## Run unit tests
	$(GO) test -short -race -v ./...

test/integration: ## Run integration tests
	$(GO) test -run Integration -v ./...

test/coverage: ## Generate coverage report
	$(GO) test -coverprofile=coverage.out ./...
	$(GO) tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

test/bench: ## Run benchmarks
	$(GO) test -bench=. -benchmem ./...
```

**make/docker.mk:**

```makefile
# Docker targets

DOCKER_IMAGE := myapp:$(VERSION)
DOCKER_REGISTRY ?= docker.io/myorg

.PHONY: docker/build docker/push docker/run docker/shell

docker/build: ## Build Docker image
	$(DOCKER) build -t $(DOCKER_IMAGE) \
		--build-arg VERSION=$(VERSION) \
		--build-arg COMMIT=$(COMMIT) .

docker/push: docker/build ## Push to registry
	$(DOCKER) tag $(DOCKER_IMAGE) $(DOCKER_REGISTRY)/$(DOCKER_IMAGE)
	$(DOCKER) push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE)

docker/run: docker/build ## Run container
	$(DOCKER) run --rm -it -p 8080:8080 $(DOCKER_IMAGE)

docker/shell: docker/build ## Shell into container
	$(DOCKER) run --rm -it --entrypoint /bin/sh $(DOCKER_IMAGE)
```

---

### Large Projects (> 500 lines)

```
project/
├── Makefile                    # Entry point
├── make/
│   ├── config.mk              # Global configuration
│   ├── functions.mk           # Shared functions
│   ├── platform.mk            # Platform detection
│   ├── frontend/
│   │   ├── build.mk           # Frontend build
│   │   ├── test.mk            # Frontend tests
│   │   └── deploy.mk          # Frontend deployment
│   ├── backend/
│   │   ├── build.mk           # Backend build
│   │   ├── test.mk            # Backend tests
│   │   └── deploy.mk          # Backend deployment
│   ├── infrastructure/
│   │   ├── docker.mk          # Docker operations
│   │   ├── kubernetes.mk      # K8s operations
│   │   └── terraform.mk       # Infrastructure as code
│   └── ci/
│       ├── lint.mk            # Linting rules
│       ├── security.mk        # Security scanning
│       └── release.mk         # Release automation
├── frontend/
├── backend/
└── infrastructure/
```

**Makefile (entry point):**

```makefile
# Makefile - Monorepo entry point
.DEFAULT_GOAL := help

# Core configuration
include make/config.mk
include make/functions.mk
include make/platform.mk

# Component-specific includes
include make/frontend/build.mk
include make/frontend/test.mk
include make/backend/build.mk
include make/backend/test.mk

# Infrastructure includes
include make/infrastructure/docker.mk
include make/infrastructure/kubernetes.mk

# CI/CD includes
include make/ci/lint.mk
include make/ci/security.mk
include make/ci/release.mk

# Aggregate targets
.PHONY: all build test clean deploy

all: build test ## Build and test everything

build: build/frontend build/backend ## Build all components

test: test/frontend test/backend ## Test all components

clean: clean/frontend clean/backend ## Clean all artifacts

deploy: deploy/frontend deploy/backend ## Deploy all components
```

**make/functions.mk:**

```makefile
# Shared Make functions

# Function to check if command exists
# Usage: $(call check-command,docker)
define check-command
	@command -v $(1) >/dev/null 2>&1 || \
		(echo "Error: $(1) is required but not installed" && exit 1)
endef

# Function to print colored messages
# Usage: $(call info-msg,Building application)
define info-msg
	@echo "\033[36m==> $(1)\033[0m"
endef

define success-msg
	@echo "\033[32m✓ $(1)\033[0m"
endef

define error-msg
	@echo "\033[31m✗ $(1)\033[0m" && exit 1
endef

# Function to calculate elapsed time
# Usage: START := $(shell date +%s)
#        $(call elapsed,$(START))
define elapsed
	@echo "Completed in $$(($$(date +%s) - $(1)))s"
endef
```

**make/platform.mk:**

```makefile
# Platform detection

# Detect OS
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Linux)
    OS := linux
    NPROC := $(shell nproc)
else ifeq ($(UNAME_S),Darwin)
    OS := darwin
    NPROC := $(shell sysctl -n hw.ncpu)
else ifeq ($(UNAME_S),Windows_NT)
    OS := windows
    NPROC := $(NUMBER_OF_PROCESSORS)
else
    OS := unknown
    NPROC := 1
endif

# Detect architecture
UNAME_M := $(shell uname -m)
ifeq ($(UNAME_M),x86_64)
    ARCH := amd64
else ifeq ($(UNAME_M),aarch64)
    ARCH := arm64
else ifeq ($(UNAME_M),arm64)
    ARCH := arm64
else
    ARCH := $(UNAME_M)
endif

# Platform-specific settings
ifeq ($(OS),darwin)
    SED_INPLACE := sed -i ''
    OPEN := open
else
    SED_INPLACE := sed -i
    OPEN := xdg-open
endif

$(info Platform: $(OS)/$(ARCH) with $(NPROC) cores)
```

---

## Include Patterns

### Optional Includes

```makefile
# Won't error if file doesn't exist
-include config.local.mk
-include .env
```

### Conditional Includes

```makefile
ifdef DOCKER_ENABLED
include make/docker.mk
endif

ifeq ($(USE_K8S),true)
include make/kubernetes.mk
endif
```

### Include Order

```makefile
# 1. Configuration first (sets variables)
include make/config.mk

# 2. Functions (may use config variables)
include make/functions.mk

# 3. Platform detection (may use functions)
include make/platform.mk

# 4. Component modules (use everything above)
include make/frontend.mk
include make/backend.mk

# 5. Overrides last (user customization)
-include config.local.mk
```

---

## Makefile Boundaries

### What Goes in Main Makefile

- `.DEFAULT_GOAL` and help target
- Include statements
- Aggregate targets (`all`, `build`, `test`, `clean`)
- Project-wide phony declarations

### What Goes in Module Files

- Domain-specific targets
- Domain-specific variables (namespaced)
- Pattern rules specific to that domain
- Implementation details

### What Goes in config.mk

- Tool paths (`GO`, `DOCKER`, `NPM`)
- Directory structure (`BUILD_DIR`, `SRC_DIR`)
- Build metadata (`VERSION`, `COMMIT`)
- Global compiler flags
- Auto-discovered file lists

---

## Anti-Patterns in File Organization

### ❌ WRONG: Circular Includes

```makefile
# Makefile
include make/build.mk

# make/build.mk
include ../Makefile  # ❌ Creates loop
```

### ❌ WRONG: Duplicate Includes

```makefile
# Makefile
include make/config.mk
include make/build.mk

# make/build.mk
include config.mk  # ❌ Included twice
```

### ❌ WRONG: Hidden Dependencies

```makefile
# Makefile
include make/build.mk  # Uses SOURCES

# make/build.mk
build: $(SOURCES)
	# ❌ SOURCES not defined in this file
```

**✅ FIX:**

```makefile
# make/build.mk
ifndef SOURCES
$(error SOURCES must be defined before including build.mk)
endif

build: $(SOURCES)
	...
```

---

## Monorepo Patterns

### Component Isolation

```makefile
# make/frontend/build.mk
FE_BUILD_DIR := ./frontend/build
FE_SOURCES := $(shell find frontend/src -name '*.ts')

.PHONY: build/frontend
build/frontend: $(FE_SOURCES)
	cd frontend && npm run build
```

### Shared Infrastructure

```makefile
# make/infrastructure/docker.mk
DOCKER_REGISTRY ?= registry.example.com

# Generic docker build function
define docker-build
	docker build -t $(DOCKER_REGISTRY)/$(1):$(VERSION) $(2)
endef

# Frontend docker
docker/frontend:
	$(call docker-build,frontend,./frontend)

# Backend docker
docker/backend:
	$(call docker-build,backend,./backend)
```

---

## Documentation Patterns

### Inline Documentation

```makefile
# make/test.mk

# Test suite configuration
TEST_TIMEOUT ?= 30s
TEST_FLAGS := -v -race

# Run unit tests with coverage
# Requires: go test, go tool cover
# Outputs: coverage.out, coverage.html
.PHONY: test/unit
test/unit:
	$(GO) test -short -timeout $(TEST_TIMEOUT) $(TEST_FLAGS) \
		-coverprofile=coverage.out ./...
	$(GO) tool cover -html=coverage.out -o coverage.html
```

### Header Comments

```makefile
# make/docker.mk
#
# Docker build and deployment targets
#
# Variables:
#   DOCKER_IMAGE    - Image name (default: myapp:${VERSION})
#   DOCKER_REGISTRY - Registry URL (default: docker.io)
#
# Targets:
#   docker/build - Build image
#   docker/push  - Push to registry
#   docker/run   - Run locally
#

DOCKER_IMAGE ?= myapp:$(VERSION)
DOCKER_REGISTRY ?= docker.io
...
```

---

## Chariot Platform Example

The Chariot Development Platform demonstrates good organization:

**Root Makefile:**

- Entry point for super-repository
- Submodule management (`make submodule-pull`)
- User/credential generation (`make user`)
- Delegates to module Makefiles

**Module Makefiles:**

- `modules/chariot/backend/Makefile` - Backend builds
- `modules/chariot/ui/Makefile` - Frontend builds
- Self-contained, no cross-dependencies

**Key Principles:**

1. Progressive disclosure (help target shows high-level commands)
2. Domain separation (backend vs UI vs infrastructure)
3. Variable-based configuration (AWS regions, account IDs)
4. Command simplicity (separate commands, not compound chains)

---

## Migration Strategy

### Step 1: Extract Configuration

```makefile
# Before: Everything in Makefile
GO := go
BUILD_DIR := ./build
...
build:
	$(GO) build -o $(BUILD_DIR)/app ./cmd/app

# After: Configuration in make/config.mk
# Makefile
include make/config.mk
include make/build.mk
```

### Step 2: Group Related Targets

```makefile
# Identify groups
# - Build targets (build, build/linux, build/darwin)
# - Test targets (test, test/unit, test/integration)
# - Docker targets (docker/build, docker/push)

# Create make/*.mk files per group
```

### Step 3: Update References

```bash
# Find all files that include Makefile
grep -r "include.*Makefile" .

# Update to use module includes
# include ../Makefile → include ../make/config.mk
```

### Step 4: Test Incrementally

```bash
# Verify each extraction
make clean && make build

# Check help target still works
make help

# Verify variables unchanged
make print-GO print-BUILD_DIR
```

---

## Related References

- [Best Practices](best-practices.md) - Complete best practices
- [Variable Patterns](variable-patterns.md) - Variable organization
- [Target Patterns](target-patterns.md) - Target organization
