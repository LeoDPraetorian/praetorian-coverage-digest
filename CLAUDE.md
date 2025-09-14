# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Chariot Development Platform** is a comprehensive super-repository that unifies all Chariot security tools and frameworks under a single development environment with integrated AI assistance through Claude-Flow orchestration.

## Repository Architecture

### Super-Repository Structure

This is a **super-repository** containing 12 submodules organized under `/modules/`:

```
chariot-development-platform/                  # Super-repo root
├── modules/                                   # All submodules (12 total)
│   ├── chariot/                               # Core platform (backend API + React UI)
│   ├── chariot-ui-components/                 # Shared React component library
│   ├── tabularium/                            # Universal data schema and models
│   ├── janus-framework/                       # Go framework for security tool chains
│   ├── janus/                                 # Tool orchestration system
│   ├── nebula/                                # Multi-cloud security scanning CLI
│   ├── aegiscli/                              # Velociraptor-based security orchestration
│   ├── chariot-aegis-capabilities/            # VQL security capabilities
│   ├── chariot-devops/                        # DevOps and infrastructure automation
│   ├── nuclei-templates/                      # Security vulnerability templates
│   ├── praetorian-cli/                        # Python CLI and SDK
│   └── praetorian-agent-workflows/            # AI agent workflow orchestration
├── Makefile                                   # Super-repo automation
├── docs/TECH-STACK.md                              # Technology stack reference
├── docs/DESIGN-PATTERNS.md                         # Architecture patterns and guidelines
└── docs/CLAUDE-FLOW.md                             # Claude Flow SPARC methodology
```

## Initial Repository Setup (First Time Only)

**Critical**: This super-repository requires recursive submodule cloning:

```bash
# Initial clone with all 12 submodules
git clone --recurse-submodules https://github.com/praetorian-inc/chariot-development-platform.git

# Complete setup sequence
make setup                    # Install dependencies and configure environment
make chariot                  # Deploy complete Chariot stack (CloudFormation + React UI)
make user                     # Generate test user with UUID credentials

# Credentials are automatically stored in .env:
# PRAETORIAN_CLI_USERNAME={uuid}@praetorian.com
# PRAETORIAN_CLI_PASSWORD={uuid-no-dashes}Aa1!

# UI will be available at https://localhost:3000 with generated credentials
```

## Essential Development Commands

### Core Platform Commands

```bash
# Complete platform deployment (REQUIRED for new development)
make chariot                  # Deploy Chariot stack (CloudFormation + React UI)

# User management
make user                     # Generate test user with UUID credentials

# Submodule management
make setup                    # Initial repository setup with all dependencies
make submodule-pull           # Pull latest changes from all submodules
make checkout branch=main     # Checkout branch across all submodules
make create branch=feature-x  # Create branch across all submodules
make create-prs               # Create PRs across all submodules

# Development workflow with Claude Flow
make feature description="update portscan capability for IPv6"
```

### Module-Specific Commands

Navigate to specific modules for targeted development:

```bash
cd modules/chariot            # Main platform development
cd modules/chariot/backend && make dev    # Deploy backend only
cd modules/chariot/ui && npm start       # Frontend development server
cd modules/chariot/e2e && npm test       # Run E2E test suite

cd modules/nebula             # Multi-cloud security scanning
cd modules/janus              # Security tool orchestration
cd modules/tabularium         # Data schema management
```

### Build & Testing Commands

```bash
# Backend (Go modules)
make test                     # Run Go tests across modules
go test ./...                 # Standard Go testing

# Frontend (React/TypeScript)
npm run lint                  # ESLint + Prettier + TypeScript checks
npm run build                 # Production build
npm run test                  # Jest unit tests

# E2E Testing (Playwright)
npm test                      # Full E2E suite (in e2e directories)
npm run test:local-uat        # Test against local UAT backend

# Python CLI
pytest                        # Run Python test suites (in praetorian-cli)
```

## Technology Stack & Patterns

### Backend Architecture

- **Go 1.24.6**: Primary backend language across all modules
- **AWS Serverless**: Lambda functions + API Gateway + DynamoDB + Neo4j
- **Security Focus**: Attack surface management, vulnerability scanning, tool orchestration
- **Pattern**: Repository pattern with interface-based design for extensibility

### Frontend Architecture

- **React 18 + TypeScript**: Main UI framework
- **Tailwind CSS**: Styling with custom design system
- **Vite**: Build system and development server
- **TanStack Query**: Data fetching and caching
- **Pattern**: Feature-based organization with shared component library

### Key Frameworks

- **Janus Framework**: Go library for chaining security tools into workflows
- **Tabularium**: Universal data schema with code generation across languages
- **Velociraptor (VQL)**: Security capability definitions and agent coordination
- **Claude Flow**: SPARC methodology for AI-assisted development

## Development Workflows

### Branch Safety Protocol

🚨 **NEVER WORK ON MAIN BRANCH**

```bash
# 1. Sync with origin (must be in super-repo root)
git fetch origin && git merge origin/main && make submodule-pull

# 2. Create feature branch across all submodules
git checkout -b feature/your-feature-name
git submodule foreach 'git checkout -b feature/your-feature-name'
```

### File Organization Rules

- **NEVER** save working files to root folder
- **ALWAYS** organize in appropriate `/modules/` subdirectories
- **PREFER** editing existing files over creating new ones

### Deployment Protocol

**🚨 ONLY USE THIS COMMAND:**

```bash
make chariot
```

**NEVER use**: `docker-compose up`, `npm start`, `go run` for full deployment

## Claude Flow Integration

### SPARC Methodology Commands

```bash
# Core SPARC workflow
npx claude-flow sparc run <mode> "<task>"      # Execute specific SPARC phase
npx claude-flow sparc tdd "<feature>"          # Run complete TDD workflow
npx claude-flow sparc batch <modes> "<task>"   # Parallel execution

# Agent orchestration with Claude Code Task tool
# Use Task tool to spawn agents concurrently:
# Task("Backend Developer", "Build REST API...", "backend-dev")
# Task("Frontend Developer", "Create React UI...", "frontend-developer")
# Task("Test Engineer", "Write E2E tests...", "e2e-test-writer-fixer")
```

### Available Specialized Agents (54 total)

Key agents for Chariot development:

- `security-architect` - Security platform design and threat modeling
- `go-api-optimizer` - Go backend performance and concurrency patterns
- `frontend-developer` - React/TypeScript with automatic E2E test generation
- `neo4j-schema-architect` - Graph database schema design for attack surface data
- `e2e-test-writer-fixer` - Comprehensive Playwright test automation
- `unit-test-engineer` - Go and Python test suites with security focus
- `vql-developer` - Velociraptor security capability development
- `code-review-swarm` - Multi-agent code review for security platforms

## Security Platform Context

### Attack Surface Management Core Concepts

```go
// Key entities across the platform
Asset       // External-facing resources (discovered via scanning)
Risk        // Security vulnerabilities and threat assessments
Attribute   // Asset properties and metadata
Seed        // Discovery starting points for asset enumeration
Job         // Async security scan operations
Capability  // Security scanning tools and orchestration
```

### Multi-Cloud Security Architecture

- **AWS/Azure/GCP**: Cloud security assessment and posture management
- **Network Security**: Port scanning, SSL analysis, DNS enumeration
- **Web Application Security**: Nuclei templates, custom vulnerability detection
- **Container Security**: Docker registry scanning, Kubernetes assessment

## Module-Specific Development Guidance

### For Core Platform Development (modules/chariot/)

- Reference: `modules/chariot/CLAUDE.md` - Detailed platform patterns
- Backend: `modules/chariot/backend/CLAUDE.md` - Go serverless architecture
- Frontend: `modules/chariot/ui/CLAUDE.md` - React TypeScript patterns

### For Security Framework Development (janus/nebula/aegiscli)

- Follow Go patterns from `docs/DESIGN-PATTERNS.md`
- Use Janus framework for tool orchestration
- Implement VQL capabilities for security operations

### For Data Schema Work (tabularium)

- Reference: `modules/tabularium/CLAUDE.md` - Schema and code generation
- Universal data models across all languages
- Automated code generation for API consistency

## Testing Strategy

### Automated Test Generation

Frontend changes automatically trigger E2E test generation:

- File patterns: `**/{ui}/**/*.{ts,tsx,js,jsx,css}`
- Tests generate automatically using Playwright fixtures
- NO PERMISSION REQUIRED for test generation

### Security Testing Patterns

- **Unit Tests**: 80%+ coverage for business logic with security focus
- **Integration Tests**: Cloud service mocking and API validation
- **E2E Tests**: Complete user security workflows
- **Capability Tests**: Security tool execution and result validation

## Essential Reference Files

**Architecture & Technology:**

- @docs/TECH-STACK.md - Complete technology stack with versions and dependencies
- @docs/DESIGN-PATTERNS.md - Architectural patterns and security guidelines
- @docs/CLAUDE-FLOW.md - SPARC development methodology with agent orchestration

**Module Documentation:**

- `modules/chariot/CLAUDE.md` - Core platform development workflows
- `modules/tabularium/CLAUDE.md` - Data schema and code generation patterns
- Individual module README files for specific implementation details

## Navigation & Context Commands

### Repository Context Verification

```bash
pwd && git remote get-url origin    # Verify current location and repository

# Navigate to super-repo root from anywhere
cd $(git rev-parse --show-superproject-working-tree || git rev-parse --show-toplevel)

# Navigate to specific module
cd modules/[module-name]            # Must be in super-repo first
```

### Git Worktree Management (Advanced)

```bash
make tree-add NAME=feature-branch   # Create isolated development environment
make tree-list                      # List all active worktrees
make tree-remove NAME=feature-branch # Clean worktree removal
```

## Critical Development Reminders

1. **Deployment**: Only use `make chariot` from super-repo root for full platform
2. **Branch Safety**: Never work directly on main branch - always create feature branches
3. **File Organization**: Never save working files to root - use appropriate `/modules/` subdirectories
4. **Testing**: Frontend changes automatically generate E2E tests with Playwright
5. **Security Focus**: All development must consider attack surface implications and security best practices
6. **Concurrency**: Use Claude Code's Task tool for parallel agent execution, batch all operations in single messages

This super-repository enables unified development of comprehensive security platforms with AI-assisted workflows and automated testing.
