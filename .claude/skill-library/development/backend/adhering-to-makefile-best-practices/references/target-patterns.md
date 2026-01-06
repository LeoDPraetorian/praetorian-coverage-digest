# Target Patterns

**Target organization, naming, and management best practices.**

## Target Naming Conventions

### Use Namespacing with `/`

```makefile
# ✅ CORRECT: Clear hierarchy
.PHONY: build/docker build/binary build/all
.PHONY: test/unit test/integration test/e2e
.PHONY: deploy/staging deploy/prod

build/docker:
	docker build -t myapp:latest .

build/binary:
	go build -o build/app ./cmd/app

test/unit:
	go test -short ./...

deploy/staging:
	kubectl apply -f k8s/staging/
```

**Why `/` delimiter:**

- Clear hierarchy (build vs test vs deploy domains)
- Shell tab-completion friendly
- Consistent with file paths

---

### Avoid Ambiguous Delimiters

```makefile
# ❌ WRONG: Ambiguous with : or -
build-docker:   # Unclear if hyphen is separator or part of name
build:docker:   # Confusing with Makefile syntax

# ✅ CORRECT: Clear namespace
build/docker:
```

---

## Phony Targets (MANDATORY)

### Always Declare Non-File Targets

```makefile
# ✅ CORRECT: Declare all phony targets
.PHONY: all clean build test install help

all: build test

clean:
	rm -rf build/

build:
	go build -o build/app ./cmd/app

test:
	go test ./...
```

**Why mandatory:** If a file named "clean" or "test" exists, Make thinks the target is up-to-date and won't run the recipe.

---

### Group Phony Declarations

```makefile
# ✅ CORRECT: Grouped by category
.PHONY: all build clean
.PHONY: test test/unit test/integration test/coverage
.PHONY: docker/build docker/push docker/run
.PHONY: deploy/staging deploy/prod
.PHONY: help
```

---

## Default Target

### Set Explicit Default

```makefile
# ✅ CORRECT: Explicit default
.DEFAULT_GOAL := help

help: ## Display available targets
	@grep -E '^[a-zA-Z_/-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'
```

**Why important:** Makes `make` (with no arguments) do something useful.

---

### Common Default Patterns

```makefile
# Pattern 1: help is default
.DEFAULT_GOAL := help

# Pattern 2: all builds and tests
.DEFAULT_GOAL := all
all: build test

# Pattern 3: build is default
.DEFAULT_GOAL := build
```

---

## Self-Documenting Targets

### Use `##` Comments

```makefile
build: ## Build the application
	go build -o build/app ./cmd/app

test: ## Run all tests
	go test ./...

clean: ## Remove build artifacts
	rm -rf build/ dist/

docker/build: ## Build Docker image
	docker build -t myapp:latest .

# Help target extracts ## comments
help: ## Display this help message
	@grep -E '^[a-zA-Z_/-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
```

**Output:**

```
$ make help
  build                Build the application
  test                 Run all tests
  clean                Remove build artifacts
  docker/build         Build Docker image
  help                 Display this help message
```

---

### Enhanced Help Target

```makefile
.DEFAULT_GOAL := help

help: ## Display available targets
	@echo "Available targets:"
	@echo ""
	@grep -E '^[a-zA-Z_/-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Usage: make <target>"
```

---

## Target Organization

### Aggregate Targets

```makefile
# Top-level aggregate targets
.PHONY: all build test clean deploy

all: build test ## Build and test everything

build: build/frontend build/backend ## Build all components

test: test/frontend test/backend ## Run all tests

clean: clean/frontend clean/backend ## Clean all artifacts

deploy: deploy/frontend deploy/backend ## Deploy all components
```

---

### Component-Specific Targets

```makefile
# Frontend targets
.PHONY: build/frontend test/frontend clean/frontend

build/frontend:
	cd frontend && npm run build

test/frontend:
	cd frontend && npm test

clean/frontend:
	rm -rf frontend/build frontend/dist

# Backend targets
.PHONY: build/backend test/backend clean/backend

build/backend:
	cd backend && go build -o ../build/backend ./...

test/backend:
	cd backend && go test ./...

clean/backend:
	rm -rf backend/build
```

---

## Target Dependencies

### Explicit Dependencies

```makefile
# deploy depends on test passing
deploy: test
	./scripts/deploy.sh

# test depends on build completing
test: build
	go test ./...

# build depends on dependencies being installed
build: deps
	go build -o build/app ./cmd/app

deps:
	go mod download
```

---

### Order-Only Dependencies

```makefile
# Build directory must exist but don't rebuild if it changes
build/app: $(SOURCES) | build/
	go build -o $@ ./cmd/app

build/:
	mkdir -p $@
```

---

## Parallel-Safe Targets

### Declare Order When Needed

```makefile
# These can run in parallel (no dependencies)
.PHONY: build/frontend build/backend
build/frontend:
	cd frontend && npm run build

build/backend:
	cd backend && go build ./...

# make -j2 can run both simultaneously
```

---

### Serialize When Required

```makefile
# Must run serially (share resources)
.NOTPARALLEL: deploy/staging deploy/prod

deploy/staging:
	kubectl apply -f k8s/staging/

deploy/prod:
	kubectl apply -f k8s/prod/
```

---

## Conditional Targets

### Platform-Specific Targets

```makefile
UNAME_S := $(shell uname -s)

.PHONY: install

ifeq ($(UNAME_S),Darwin)
install: install/macos
else ifeq ($(UNAME_S),Linux)
install: install/linux
endif

install/macos:
	brew install myapp

install/linux:
	apt-get install myapp
```

---

### Mode-Specific Targets

```makefile
MODE ?= release

ifeq ($(MODE),debug)
build: build/debug
else
build: build/release
endif

build/debug: CFLAGS += -g -O0
build/debug: app

build/release: CFLAGS += -O2 -DNDEBUG
build/release: app
```

---

## Multi-Target Rules

### Same Recipe for Multiple Targets

```makefile
# Both targets run the same recipe
build/linux build/darwin:
	GOOS=$(subst build/,,$@) go build -o $@ ./cmd/app
```

---

### Grouped Targets (Multiple Outputs)

```makefile
# Both files generated by single command
proto/gen.pb.go proto/gen_grpc.pb.go &: proto/service.proto
	protoc --go_out=. --go-grpc_out=. $<
```

---

## Target Hooks

### Pre/Post Hooks

```makefile
.PHONY: build pre-build post-build

build: pre-build do-build post-build

pre-build:
	@echo "Preparing build..."
	mkdir -p build/

do-build:
	go build -o build/app ./cmd/app

post-build:
	@echo "Build complete!"
	@ls -lh build/app
```

---

## Common Target Patterns

### Standard Target Names

```makefile
# Standard GNU Makefile targets
.PHONY: all install uninstall clean distclean check

all: build test

install: build
	install -m 755 build/app $(PREFIX)/bin/

uninstall:
	rm -f $(PREFIX)/bin/app

clean:
	rm -rf build/

distclean: clean
	rm -rf dist/ *.tar.gz

check: test
```

---

### Development Workflow Targets

```makefile
.PHONY: dev watch run

dev: build ## Development build
	./build/app --dev

watch: ## Watch for changes and rebuild
	find . -name '*.go' | entr -r make dev

run: build ## Build and run
	./build/app
```

---

### CI/CD Targets

```makefile
.PHONY: ci ci/lint ci/test ci/build ci/security

ci: ci/lint ci/test ci/build ci/security ## Full CI pipeline

ci/lint:
	golangci-lint run ./...

ci/test:
	go test -race -coverprofile=coverage.out ./...

ci/build:
	go build -v ./...

ci/security:
	gosec ./...
```

---

## Anti-Patterns

### ❌ WRONG: Missing .PHONY

```makefile
# If file named "clean" exists, this won't run
clean:
	rm -rf build/
```

**✅ FIX:**

```makefile
.PHONY: clean
clean:
	rm -rf build/
```

---

### ❌ WRONG: Unclear Names

```makefile
b:
	go build ./...

t:
	go test ./...
```

**✅ FIX:**

```makefile
build:
	go build ./...

test:
	go test ./...
```

---

### ❌ WRONG: No Help Target

```makefile
# User runs `make` and nothing happens
build:
	go build ./...
```

**✅ FIX:**

```makefile
.DEFAULT_GOAL := help

help: ## Display available targets
	@grep -E '^[a-zA-Z_/-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

build: ## Build the application
	go build ./...
```

---

### ❌ WRONG: Inconsistent Naming

```makefile
build-docker:
build_binary:
buildLocal:
```

**✅ FIX:**

```makefile
build/docker:
build/binary:
build/local:
```

---

## Target Testing

### Dry-Run Testing

```bash
# See what would execute without running
make -n build

# Trace execution
make --trace build
```

---

### Dependency Testing

```bash
# Show why target was rebuilt
make -d build 2>&1 | grep "Considering target"

# Print internal database
make -p | grep "^build:"
```

---

## Related References

- [Best Practices](best-practices.md) - Complete best practices
- [Variable Patterns](variable-patterns.md) - Variable organization
- [Dependency Patterns](dependency-patterns.md) - Dependency management
