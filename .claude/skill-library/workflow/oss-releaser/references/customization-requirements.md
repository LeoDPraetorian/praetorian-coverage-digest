# Customization Requirements

**Guidelines for customizing CONTRIBUTING.md templates to match repository-specific needs.**

## Core Principle

**CONTRIBUTING.md is NOT one-size-fits-all.** Every repository has unique:

- Development tools and versions
- Testing frameworks and commands
- Build systems
- Contribution workflows
- Domain-specific processes

**Copying a template without customization creates misleading documentation that wastes contributor time.**

## Detection: Identify Tech Stack

**Before customizing, detect the repository's technology stack:**

```bash
detect_tech_stack() {
  # Go
  if [ -f go.mod ]; then
    echo "Go ($(go version 2>/dev/null | awk '{print $3}'||  echo 'unknown'))"
    return 0
  fi

  # Python
  if [ -f requirements.txt ] || [ -f pyproject.toml ] || [ -f setup.py ]; then
    python_version=$(python3 --version 2>/dev/null | awk '{print $2}' || echo 'unknown')
    echo "Python ($python_version)"
    return 0
  fi

  # Node.js/TypeScript
  if [ -f package.json ]; then
    if grep -q '"react"' package.json; then
      echo "TypeScript + React"
    elif grep -q '"@angular/core"' package.json; then
      echo "TypeScript + Angular"
    elif grep -q '"vue"' package.json; then
      echo "TypeScript + Vue"
    else
      echo "TypeScript/JavaScript"
    fi
    return 0
  fi

  # Rust
  if [ -f Cargo.toml ]; then
    echo "Rust ($(rustc --version 2>/dev/null | awk '{print $2}' || echo 'unknown'))"
    return 0
  fi

  echo "Unknown"
  return 1
}
```

## Customization by Stack

### Go Projects

**Prerequisites section:**
```markdown
### Prerequisites

- Go 1.22 or later
- Docker (for integration tests)
- golangci-lint v1.55+
- Make (optional, for convenience commands)
```

**Development setup:**
```markdown
### Install Dependencies

```bash
go mod download
```

### Verify Setup

```bash
go test -short ./...
golangci-lint run
```
```

**Testing:**
```markdown
### Run Tests

```bash
# All tests
go test ./... -v

# Unit tests only
go test -short ./...

# With coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```
```

### Python Projects

**Prerequisites:**
```markdown
### Prerequisites

- Python 3.11 or later
- pip or poetry
- Docker (for integration tests)
- pytest v7.0+
```

**Development setup:**
```markdown
### Install Dependencies

```bash
# Using pip
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Or using poetry
poetry install
```

### Verify Setup

```bash
pytest tests/ --collect-only
ruff check .
mypy .
```
```

**Testing:**
```markdown
### Run Tests

```bash
# All tests
pytest

# Unit tests only
pytest -m "not integration"

# With coverage
pytest --cov=. --cov-report=html
```
```

### TypeScript/React Projects

**Prerequisites:**
```markdown
### Prerequisites

- Node.js 20.x or later
- npm 10.x or later
- Docker (for E2E tests)
```

**Development setup:**
```markdown
### Install Dependencies

```bash
npm install
```

### Verify Setup

```bash
npm run build
npm run lint
npm run type-check
```
```

**Testing:**
```markdown
### Run Tests

```bash
# Unit tests (Vitest)
npm test

# E2E tests (Playwright)
npx playwright test

# With coverage
npm run test:coverage
```
```

### Rust Projects

**Prerequisites:**
```markdown
### Prerequisites

- Rust 1.75 or later (via rustup)
- cargo-nextest (optional, faster test runner)
- Docker (for integration tests)
```

**Development setup:**
```markdown
### Install Dependencies

```bash
cargo build
```

### Verify Setup

```bash
cargo test --no-run
cargo clippy -- -D warnings
cargo fmt -- --check
```
```

**Testing:**
```markdown
### Run Tests

```bash
# All tests
cargo test

# Unit tests only
cargo test --lib

# With coverage (using tarpaulin)
cargo tarpaulin --out Html
```
```

## Domain-Specific Sections

### Protocol/Authentication Projects (like Brutus)

**Add "Adding a New Protocol" section:**

```markdown
## Adding a New Protocol

### 1. Create Plugin Directory

```bash
mkdir -p internal/plugins/yourprotocol
```

### 2. Implement the Plugin Interface

See `internal/plugins/ssh/ssh.go` for reference implementation.

Required methods:
- `Name() string` - Protocol identifier
- `Test(ctx, target, username, password, timeout) *Result` - Authentication attempt

### 3. Register Plugin

Add to `internal/plugins/all.go`:
```go
import _ "github.com/praetorian-inc/brutus/internal/plugins/yourprotocol"
```

### 4. Add Tests

- Unit tests: `yourprotocol_test.go`
- Integration tests with real server

### 5. Add Documentation

- Update `docs/PROTOCOLS.md`
- Add default credentials to `wordlists/yourprotocol_defaults.txt`
```

### API/Backend Projects

**Add "Adding a New Endpoint" section:**

```markdown
## Adding a New Endpoint

### 1. Define API Schema

```go
// pkg/api/schemas.go
type CreateUserRequest struct {
  Email    string `json:"email" binding:"required,email"`
  Name     string `json:"name" binding:"required"`
}
```

### 2. Implement Handler

```go
// internal/handlers/users.go
func (h *Handler) CreateUser(c *gin.Context) {
  // Validate, process, respond
}
```

### 3. Add Route

```go
// internal/routes/routes.go
router.POST("/users", handlers.CreateUser)
```

### 4. Write Tests

- Unit tests for handler logic
- Integration tests for full request/response cycle

### 5. Update OpenAPI Spec

```yaml
# openapi.yaml
paths:
  /users:
    post:
      summary: Create new user
      ...
```
```

### UI Component Projects

**Add "Adding a New Component" section:**

```markdown
## Adding a New Component

### 1. Create Component

```bash
# src/components/Button/Button.tsx
export const Button = ({ children, onClick }: ButtonProps) => {
  return <button onClick={onClick}>{children}</button>
}
```

### 2. Add Unit Tests

```typescript
// Button.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

test('renders button with text', () => {
  render(<Button>Click me</Button>)
  expect(screen.getByText('Click me')).toBeInTheDocument()
})
```

### 3. Add Storybook Story

```typescript
// Button.stories.tsx
export default {
  title: 'Components/Button',
  component: Button,
}

export const Primary = () => <Button>Primary</Button>
```

### 4. Add Accessibility Tests

```typescript
import { axe } from 'jest-axe'

test('has no accessibility violations', async () => {
  const { container } = render(<Button>Click</Button>)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```
```

## Ask Before Generating

**Before generating CONTRIBUTING.md, ask the user:**

```
I've detected this repository uses [detected stack].

CONTRIBUTING.md needs customization for:

**Prerequisites:**
- Which versions are required? (Go 1.22+, Python 3.11+, Node 20+)
- Any additional tools? (Docker, specific CLI tools)

**Testing:**
- Test framework used? (pytest, Vitest, go test, cargo test)
- Integration test requirements? (Docker services, API keys)
- Coverage threshold? (80%, 85%, 90%)

**Domain-Specific Sections:**
- Does this project need special contribution workflows?
  Examples:
  - "Adding a Protocol" (for authentication tools)
  - "Adding an Endpoint" (for API projects)
  - "Adding a Component" (for UI libraries)

Should I generate a customized CONTRIBUTING.md with these considerations?
```

## Anti-Patterns to Avoid

### ❌ Generic Copy-Paste

```markdown
## Getting Started

Follow these steps to get started.

1. Clone the repository
2. Install dependencies
3. Run tests
```

**Problem:** No actual commands. Useless to contributors.

### ✅ Specific Instructions

```markdown
## Getting Started

### Prerequisites

- Go 1.22+
- Docker 24.0+

### Install Dependencies

```bash
go mod download
```

### Verify Setup

```bash
# Run unit tests
go test -short ./...

# Start integration test services
docker compose up -d

# Run full test suite
go test ./... -v
```
```

### ❌ Wrong Tech Stack References

```markdown
# Contributing to React UI Library

## Testing

Run tests with pytest:
```bash
pytest tests/
```
```

**Problem:** Mentions pytest in a React project. Copy-paste error.

### ✅ Correct Stack References

```markdown
# Contributing to React UI Library

## Testing

Run tests with Vitest:
```bash
npm test
```

Run E2E tests with Playwright:
```bash
npx playwright test
```
```

## Validation Checklist

Before finalizing CONTRIBUTING.md, verify:

- [ ] **Prerequisites match actual requirements** (check package.json, go.mod, Cargo.toml)
- [ ] **Commands actually work** (test each command in a clean environment)
- [ ] **Test framework matches project** (don't say "pytest" for Go projects)
- [ ] **Domain-specific sections present** (if applicable)
- [ ] **Version requirements are current** (not outdated)
- [ ] **Links point to correct files** (CODE_OF_CONDUCT.md, SECURITY.md exist)
- [ ] **Examples use project's actual code patterns** (not generic examples)
