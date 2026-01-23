# Contributing to [Project Name]

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

**IMPORTANT**: This template MUST be customized for your specific project. Update sections marked with [CUSTOMIZE] based on your tech stack, testing framework, and project-specific workflows.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Style Guide](#style-guide)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

[CUSTOMIZE: List required tools, versions, and dependencies]

Example for Go project:
- Go 1.22 or later
- Git
- Docker (for integration tests)
- Make (optional, for convenience commands)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/[project-name].git
cd [project-name]
```

3. Add upstream remote:

```bash
git remote add upstream https://github.com/praetorian-inc/[project-name].git
```

## Development Setup

### Install Dependencies

[CUSTOMIZE: Add project-specific dependency installation commands]

Examples:
```bash
# Go
go mod download

# Python
pip install -r requirements.txt
pip install -r requirements-dev.txt

# TypeScript/JavaScript
npm install

# Rust
cargo build
```

### Verify Setup

[CUSTOMIZE: Add commands to verify setup works]

Examples:
```bash
# Go
go test -short ./...
golangci-lint run

# Python
pytest tests/ --collect-only
ruff check .

# TypeScript
npm run build
npm run lint
```

## Making Changes

### Create a Branch

Always create a feature branch for your changes:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(auth): add OAuth2 support
fix(api): handle timeout correctly
docs(readme): add installation instructions
test(parser): add edge case tests
```

### Keep Commits Focused

- One logical change per commit
- Keep commits small and reviewable
- Squash WIP commits before submitting PR

## [CUSTOMIZE: Project-Specific Sections]

Add project-specific contribution workflows here. Examples:

### For Protocol/Plugin Projects (like Brutus):

**Adding a New Protocol**

1. Create plugin directory: `internal/plugins/yourprotocol`
2. Implement the Plugin interface
3. Add unit tests
4. Add integration tests
5. Add default credentials wordlist
6. Update documentation

### For API Projects:

**Adding a New Endpoint**

1. Define API schema
2. Implement handler
3. Add validation
4. Add unit tests
5. Add integration tests
6. Update OpenAPI spec

### For UI Projects:

**Adding a New Component**

1. Create component in appropriate directory
2. Add unit tests (Vitest)
3. Add Storybook story
4. Add accessibility tests
5. Update component documentation

## Testing

### Run All Tests

[CUSTOMIZE: Add test commands for your project]

Examples:
```bash
# Go
go test ./... -v

# Python
pytest

# TypeScript
npm test

# Rust
cargo test
```

### Run Unit Tests Only

```bash
# Go
go test -short ./...

# Python
pytest -m "not integration"

# TypeScript
npm run test:unit
```

### Run Integration Tests

[CUSTOMIZE: Add integration test setup and commands]

### Check Coverage

[CUSTOMIZE: Add coverage commands]

Examples:
```bash
# Go
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Python
pytest --cov=. --cov-report=html

# TypeScript
npm run test:coverage
```

### Coverage Requirements

- **Minimum coverage:** 80% for new code
- **Core packages:** 85%+ coverage
- All error paths must be tested

## Pull Request Process

### Before Submitting

1. **Sync with upstream:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all checks:**
   [CUSTOMIZE: Add your project's pre-PR checklist]

3. **Update documentation** if needed

4. **Add tests** for new functionality

### Submitting

1. Push your branch:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Create a Pull Request on GitHub

3. Fill out the PR template:
   - Description of changes
   - Related issues
   - Testing performed
   - Breaking changes (if any)

### PR Review Process

1. **Automated checks** must pass:
   - CI build
   - Lint checks
   - Test suite
   - Coverage threshold

2. **Code review** by maintainer

3. **Address feedback** with additional commits

4. **Squash and merge** when approved

### PR Title Format

Use conventional commit format:
```
feat(scope): add support for XYZ
fix(scope): handle edge case correctly
```

## Style Guide

[CUSTOMIZE: Add project-specific style guidelines]

### Code Formatting

- Use language-specific formatters (gofmt, black, prettier, rustfmt)
- Run linters before committing
- Follow project conventions

### Comments

- Add package-level documentation
- Document exported functions and types
- Use complete sentences
- Explain "why" not "what"

### Naming Conventions

[CUSTOMIZE: Add project-specific naming rules]

## Questions?

- Open an issue for questions
- Join discussions on GitHub
- Review existing PRs and issues for context
- Contact: opensource@praetorian.com

Thank you for contributing!
