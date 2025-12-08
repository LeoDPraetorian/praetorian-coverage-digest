# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Chariot Development Platform** is a comprehensive super-repository that unifies all Chariot security tools and frameworks under a single development environment with integrated AI assistance through Claude-Flow orchestration.

## Repository Architecture

### Super-Repository Structure

This is a **super-repository** containing 16 submodules organized under `/modules/`:

```
chariot-development-platform/                  # Super-repo root
├── modules/                                   # All submodules (16 total)
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
│   ├── praetorian-agent-workflows/            # AI agent workflow orchestration
│   ├── noseyparker/                           # Secret scanning engine (Rust)
│   ├── noseyparkerplusplus/                   # Enhanced secret scanner (Rust)
│   ├── noseyparker-explorer/                  # Web UI for secret scan results
│   └── ai-research/                           # AI security research and experiments
├── Makefile                                   # Super-repo automation
├── docs/CLEAN_CODE.md                         # Summary of 'Clean code' by Robert C. Martin
├── docs/TECH-STACK.md                              # Technology stack reference
├── docs/DESIGN-PATTERNS.md                         # Architecture patterns and guidelines
```

## Initial Repository Setup (First Time Only)

**Critical**: This super-repository requires recursive submodule cloning:

```bash
# Initial clone with all 16 submodules
git clone --recurse-submodules https://github.com/praetorian-inc/chariot-development-platform.git

# Complete setup sequence
make setup                    # Install dependencies and configure environment
make chariot                  # Deploy complete Chariot stack (CloudFormation + React UI)
make user                     # Generate test user with UUID credentials
make claude-setup             # Display Claude Code plugin installation commands

# Credentials are automatically stored in .env:
# PRAETORIAN_CLI_USERNAME={uuid}@praetorian.com
# PRAETORIAN_CLI_PASSWORD={uuid-no-dashes}Aa1!

# UI will be available at https://localhost:3000 with generated credentials
```

**⚠️ IMPORTANT: Verify Git Hooks Are Installed**

After running `make setup`, verify the pre-commit hook is active:

```bash
.githooks/verify-hooks.sh
```

This hook **prevents accidental submodule commits** that cause PR conflicts. If you see a warning, run:

```bash
make install-git-hooks
```

## Claude Code Setup (AI Development Assistant)

**First-time setup for Claude Code users:**

```bash
# Display plugin installation commands
make claude-setup

# Then run the displayed commands in Claude Code:
/plugin marketplace add obra/superpowers
/plugin install superpowers
/plugin marketplace add ./
/plugin install chariot-development-platform

# Restart Claude Code to load plugins
```

**What this provides:**
- **Superpowers** (20 foundation skills): TDD, systematic debugging, verification protocols
- **Chariot Skills** (63 platform skills): Agent creation, React patterns, architecture standards
- **SessionStart Hook**: Automatic skill activation (80%+ vs 20% baseline)
- **MANDATORY FIRST RESPONSE PROTOCOL**: Enforces skill usage before all tasks

**Full documentation:** `docs/CLAUDE_CODE_SETUP.md`

**Verification:** After restart, ask Claude "What skills are available?" - should see 80+ skills.

## Skills Discovery & Usage

This repository uses a **hybrid skill architecture** with 80+ skills organized in two tiers:

### Finding Skills

```bash
# Search for skills across both core and library
cd .claude && npm run -w @chariot/skill-search search -- "query"

# Examples
npm run -w @chariot/skill-search search -- "react testing"
npm run -w @chariot/skill-search search -- "debugging"
npm run -w @chariot/skill-search search -- ""  # List all skills
```

**Output shows access method:**
- `[CORE]` skills → Use with Skill tool: `skill: "skill-name"`
- `[LIB]` skills → Use with Read tool: Read the path shown

### Skill Architecture

- **Core Skills** (~15): High-frequency skills in `.claude/skills/` - auto-discovered
- **Gateway Skills** (6): Domain entry points that route to library skills
  - `gateway-frontend` - React, State, UI, Testing patterns
  - `gateway-backend` - Go, AWS, Infrastructure, Integration
  - `gateway-testing` - API, E2E, Mocking, Performance
  - `gateway-mcp-tools` - External APIs (Linear, CLI, Context7)
  - `gateway-security` - Auth, Secrets, Cryptography, Defense
  - `gateway-integrations` - API research, Chariot patterns
- **Library Skills** (~120): Specialized skills in `.claude/skill-library/` - load on-demand

**Full architecture details:** `docs/SKILLS-ARCHITECTURE.md`

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

# MCP Server Management (Claude Code)
make mcp-manager              # Select MCPs, sync to project settings, launch Claude Code (RECOMMENDED)
make mcp-manager-install      # Install MCP server manager tool
mcp-manager mcp               # Interactive toggle for Claude Code MCP servers (standalone)
make mcp-manager-uninstall    # Uninstall MCP manager completely

# 🎯 Why use 'make mcp-manager'?
# MCP servers consume 10,000-20,000+ tokens EACH at session start
# Disabling MCPs mid-session does NOT free context window space
# Select only needed MCPs BEFORE launching to maximize available context

# AI Developer Instructions
Before writing any code, review the summary of [Clean Code by Robert C. Martin](docs/CLEAN_CODE.md).
Follow its principles to ensure your work is consistent with the cleanliness, readability, and maintainability standards of our existing codebase.
```

### Module-Specific Commands

Navigate to specific modules for targeted development:

```bash
cd modules/chariot            # Main platform development
cd modules/chariot/backend && make deploy    # Deploy backend only
cd modules/chariot/ui && npm start           # Frontend development server
cd modules/chariot/e2e && npm test           # Run E2E test suite

cd modules/nebula             # Multi-cloud security scanning
cd modules/janus              # Security tool orchestration
cd modules/tabularium         # Data schema management
```

### Build & Testing Commands

```bash
# Backend (Go modules)
make test                     # Run Go tests across modules
go test ./...                 # Standard Go testing

# Frontend (React/TypeScript: modules/chariot/ui)
npm run build                 # Production build

# E2E Testing (Playwright: modules/chariot/e2e)
npx ts-node script/setup-test.ts --env=local-uat
npx playwright test

# Python CLI
pytest                        # Run Python test suites (in praetorian-cli)
```

### MCP Tools (Model Context Protocol)

This repository uses **TypeScript wrappers** for MCP tools to achieve **0 tokens at session start** (vs 71.8k tokens with native MCPs).

**Available MCP Services:**
- `praetorian-cli` - Chariot API access (17 tools)
- `linear` - Issue tracking (23 tools)
- `context7` - Documentation lookup (2 tools)

**Access via Gateway:**
```bash
# Agents access via gateway-mcp-tools skill
# Executes wrappers with: npx tsx .claude/tools/{service}/{tool}.ts
```

**Create New Wrapper:**
```bash
cd .claude/skills/mcp-manager/scripts
npm run create -- <service> <tool>           # TDD workflow
npm run verify-red -- <service>/<tool>
npm run generate-wrapper -- <service>/<tool>
npm run verify-green -- <service>/<tool>
```

**Full architecture details:** `docs/MCP-TOOLS-ARCHITECTURE.md`

## Technology Stack & Patterns

### Backend Architecture

- **Go 1.24.6**: Primary backend language across all modules
- **AWS Serverless**: Lambda functions + API Gateway + DynamoDB + Neo4j
- **Security Focus**: Attack surface management, vulnerability scanning, tool orchestration
- **Pattern**: Repository pattern with interface-based design for extensibility

### Frontend Architecture

- **React 19 + TypeScript**: Main UI framework
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

### Submodule Commit Prevention

🚨 **CRITICAL: Never commit submodule changes in the super-repo**

Submodule changes should ONLY be committed in their respective submodule repositories, not in the super-repo.

**Git Hook Protection (Automatic):**

```bash
# Git hooks are automatically installed during setup
make setup                    # Installs pre-commit hook automatically

# Manual installation if needed
make install-git-hooks       # Install git hooks manually
```

The pre-commit hook will **block any commits** that include changes to `modules/*`, preventing accidental submodule commits.

**Working with Submodules:**

```bash
# ✅ CORRECT: Work in submodule directory
cd modules/chariot
git checkout -b feature/my-feature
# Make changes, commit, push
git commit -m "feat: add new feature"
git push origin feature/my-feature
# Create PR in chariot repository

# ❌ WRONG: Committing submodule pointer in super-repo
git add modules/chariot
git commit -m "update chariot"  # This will be BLOCKED by pre-commit hook
```

**If You Accidentally Committed Submodule Changes:**

```bash
# Unstage submodule changes
git restore --staged modules/*

# If already committed, use filter-branch to remove from history
# (Contact team lead for assistance with this)
```

**Why This Matters:**
- Submodule pointer changes clutter the super-repo history
- They create merge conflicts across team members
- They make PRs harder to review
- Each submodule has its own independent workflow and PR process

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

### Agent Architecture

55 specialized agents organized across 8 categories:

| Category | Count | Examples |
|----------|-------|----------|
| `architecture` | 7 | go-architect, react-architect, security-architect |
| `development` | 16 | react-developer, go-developer, typescript-developer |
| `testing` | 8 | frontend-browser-test-engineer, backend-unit-test-engineer |
| `quality` | 5 | go-code-reviewer, react-code-reviewer |
| `analysis` | 6 | security-risk-assessor, complexity-assessor |
| `research` | 3 | web-research-specialist, code-pattern-analyzer |
| `orchestrator` | 8 | universal-coordinator, hierarchical-coordinator |
| `mcp-tools` | 2 | praetorian-cli-expert, chromatic-test-engineer |

**Key Agents for Chariot Development:**
- `security-architect` - Security platform design and threat modeling
- `react-developer` - React/TypeScript with automatic E2E test generation
- `go-developer` - Go backend development with concurrency patterns
- `frontend-browser-test-engineer` - Comprehensive Playwright test automation
- `backend-unit-test-engineer` - Go and Python test suites with security focus
- `vql-developer` - Velociraptor security capability development

**Agent Design Principle**: Lean prompts (<300 lines) that delegate detailed patterns to skills

**Full architecture details:** `docs/AGENT-ARCHITECTURE.md`

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

## Graph Query Requirements

### allowedColumns Field Validation

When making queries to the Chariot graph database (Neo4j), **ALWAYS check the `allowedColumns` field** to verify which fields are available for querying. This field is defined in `./modules/chariot/backend/build/pkg/query/read.go:41-85` and contains the complete list of queryable fields.

**Critical Rule**: All graph queries MUST only use fields that are present in the `allowedColumns` map for filters. Using invalid field names will result in query validation errors.

**Available Graph Query Fields** (as of current implementation):
```go
allowedColumns := map[string]bool{
    "key", "identifier", "group", "dns", "name", "value", "status", 
    "source", "origin", "created", "registrar", "registrant", "email", 
    "country", "priority", "class", "type", "title", "visited", "updated", 
    "vendor", "product", "version", "cpe", "surface", "asname", "asnumber", 
    "cvss", "epss", "kev", "exploit", "private", "id", "writeupId", 
    "category", "attackSurface", "capability", "cloudService", "cloudId", 
    "cloudRoot", "cloudAccount", "plextracid", "beta"
}
```

**Graph Query Validation Process**:
- **Filter Validation**: All filter fields in query nodes are checked against `allowedColumns`
- **Runtime Validation**: Query builder validates all field references before execution

**Example Valid Graph Query**:
```json
{
  "node": {
    "labels": ["Asset"],
    "filters": [
      {"field": "status", "operator": "=", "value": "A"},
      {"field": "class", "operator": "=", "value": "ipv4"}
    ]
  },
  "limit": 100
}
```

## Essential Reference Files

**Architecture & Technology:**

- @docs/TECH-STACK.md - Complete technology stack with versions and dependencies
- @docs/DESIGN-PATTERNS.md - Architectural patterns and security guidelines
- @docs/SKILLS-ARCHITECTURE.md - Hybrid skill system: Core, Gateway, Library tiers
- @docs/AGENT-ARCHITECTURE.md - Lean agent pattern with skill delegation
- @docs/MCP-TOOLS-ARCHITECTURE.md - TypeScript MCP wrappers for progressive loading

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
7. **Skills & Architecture**: Use skill-search CLI to discover capabilities before implementing
8. **Context Engineering**: Architecture optimized for token efficiency - use gateways for progressive loading

This super-repository enables unified development of comprehensive security platforms with AI-assisted workflows and automated testing.
