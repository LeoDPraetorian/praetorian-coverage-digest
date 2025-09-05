# Claude Code Configuration - SPARC Development Environment

## 🚨 CRITICAL: CONCURRENT EXECUTION & FILE MANAGEMENT

**ABSOLUTE RULES**:
1. ALL operations MUST be concurrent/parallel in a single message
2. **NEVER save working files, text/mds and tests to the root folder**
3. ALWAYS organize files in appropriate subdirectories

### ⚡ GOLDEN RULE: "1 MESSAGE = ALL RELATED OPERATIONS"

**MANDATORY PATTERNS:**
- **TodoWrite**: ALWAYS batch ALL todos in ONE call (5-10+ todos minimum)
- **Task tool**: ALWAYS spawn ALL agents in ONE message with full instructions
- **File operations**: ALWAYS batch ALL reads/writes/edits in ONE message
- **Bash commands**: ALWAYS batch ALL terminal operations in ONE message
- **Memory operations**: ALWAYS batch ALL memory store/retrieve in ONE message

### 📁 File Organization Rules

**NEVER save to root folder. ALL feature development should occur within the modules in /modules**

## 📦 Core Repository Modules

This super-repository contains multiple specialized modules that form the Chariot Development Platform ecosystem. Each module serves a distinct purpose in the security testing and attack surface management workflow:

### 🛡️ Security Platforms & UIs

**`chariot/`** - The core Chariot attack surface management platform
- Comprehensive monorepo containing backend (Go), frontend (React/TypeScript), and E2E tests
- Attack surface discovery, monitoring, and vulnerability management
- Production-ready platform for external-facing asset security

**`chariot-ui-components/`** - Reusable UI component library
- React/TypeScript component library with Storybook documentation
- Shared design system components (LeftNav, Button, Table, Modal, etc.)
- Tailwind CSS integration and Chariot-specific theming
- NPM package for consistent UI across Chariot applications

### 🔧 Agent & Orchestration Systems

**`aegiscli/`** - Velociraptor-based security orchestration middleware
- Docker-containerized API for managing Aegis agents across client environments
- RESTful API with Swagger documentation for endpoint management
- Multi-tenant architecture supporting multiple Velociraptor organizations
- Web interface for intuitive security operations management

**`chariot-aegis-capabilities/`** - VQL-based security capabilities repository
- Offensive security capabilities for Praetorian Aegis Agent (Velociraptor-based)
- Pre-built security assessment tools organized by attack surface (AD, network, web, cloud)
- Capability development workflow with peer review and testing requirements
- S3-based tool management and automated deployment pipeline

### ⚡ Security Testing Frameworks

**`janus-framework/`** - Go library for chaining security tools
- Powerful framework for creating reusable security workflows at scale
- Link-based architecture for connecting disparate security tools
- Configuration system with CLI args, environment variables, and type safety
- Foundation for building complex, testable security automation

**`janus/`** - Security tool orchestration platform
- Framework for chaining security tools into complex workflows
- Uniform interface for connecting tools not designed to work together
- Scale security operations against large environments
- Template-based approach for common security testing scenarios

**`nebula/`** - Multi-cloud security scanning CLI
- Command-line tool built on Janus framework for cloud security testing
- Support for AWS, Azure, GCP, and SaaS platform reconnaissance
- Resource discovery, secret detection, and public exposure analysis
- MCP (Model Context Protocol) server integration for AI assistants

### 🧪 Testing & Templates

**`nuclei-templates/`** - Security vulnerability detection templates
- Internal fork of ProjectDiscovery Nuclei Templates with daily upstream sync
- Custom Praetorian-specific templates in `praetorian/` directory
- Automated vulnerability scanning across web applications and services
- Case-reviewed templates with validation workflow

**`praetorian-cli/`** - Python CLI and SDK for Chariot platform
- Open-source command-line interface for Chariot API access
- Full SDK exposing all Chariot UI APIs for scripting and automation
- Authentication via API keys and keychain file management
- External script integration capability for custom workflows

### 📊 Data & Infrastructure

**`tabularium/`** - Universal data schema and code generation
- Single source of truth for data structures across Chariot systems
- Go struct definitions with automatic OpenAPI schema generation
- Multi-language client library generation (Python, future TypeScript/Java)
- Schema validation and testing infrastructure

**`praetorian-agent-workflows/`** - Agentic workflow orchestration
- Repository for managing orchestration of AI agent workflows
- Coordination system for multi-agent security testing scenarios
- Integration point for advanced automation and intelligent task distribution

## Claude Squad Worktree Setup

**CRITICAL**: When working in a Claude Squad worktree, all git submodules need to be initialized manually.

**MANDATORY SETUP**: After Claude Squad creates a worktree, run:
```bash
./setup-worktree.sh
make submodule-init
```

This initializes all git submodules for full repository access. Without this step, all module directories in `/modules` will appear empty.

**What the script does**:
- Runs `git submodule update --init --recursive`
- Populates all submodule directories with their respective codebases
- Creates feature branches for all submodules to avoid working on main
- Provides confirmation and context awareness helpers

## 🧭 NAVIGATION & CONTEXT AWARENESS

**CRITICAL**: Multi-repository navigation requires constant context awareness to avoid confusion.

### Repository Structure Overview
```
chariot-development-platform/                    # SUPER-REPO (this repo)
├── modules/                                    # Submodule container (13 total)
│   ├── aegiscli/                              # Velociraptor-based security orchestration middleware
│   ├── chariot/                               # Core Chariot attack surface management platform
│   ├── chariot-aegis-capabilities/            # VQL-based security capabilities repository
│   ├── chariot-devops/                        # DevOps and infrastructure automation
│   ├── chariot-ui-components/                 # Reusable React/TypeScript UI component library
│   ├── claude-flow/                           # AI workflow orchestration and agent coordination
│   ├── janus/                                 # Security tool orchestration platform
│   ├── janus-framework/                       # Go library for chaining security tools
│   ├── nebula/                                # Multi-cloud security scanning CLI
│   ├── nuclei-templates/                      # Security vulnerability detection templates
│   ├── praetorian-agent-workflows/            # Agentic workflow orchestration
│   ├── praetorian-cli/                        # Python CLI and SDK for Chariot platform
│   └── tabularium/                            # Universal data schema and code generation
├── setup-worktree.sh                         # Worktree initialization with branch management
├── where-am-i.sh                             # Context checker and navigation helper
└── CLAUDE.md                                 # This file (project instructions)
```

### Context Awareness Commands

**ALWAYS run these when unsure of location:**

1. **Ultimate context checker:**
   ```bash
   ./where-am-i.sh
   ```
   
2. **Quick context check:**
   ```bash
   pwd && git remote get-url origin && git branch --show-current
   ```

3. **Repository type detection:**
   ```bash
   if [ -f .gitmodules ]; then echo "SUPER-REPO"; else echo "SUBMODULE"; fi
   ```

### Navigation Best Practices

**🚨 CRITICAL RULES:**

1. **Before ANY git operation, check context:**
   ```bash
   ./where-am-i.sh
   ```

2. **Repository identification patterns:**
   - **SUPER-REPO**: URL contains `chariot-development-platform`
   - **SUBMODULE**: URL contains individual repo names (`chariot`, `nebula`, etc.)
   - **Has .gitmodules**: You're in the super-repo
   - **Path contains `/modules/`**: You're likely in a submodule

3. **Safe navigation commands:**
   ```bash
   # Go to super-repo root from anywhere in worktree
   cd $(git rev-parse --show-superproject-working-tree || git rev-parse --show-toplevel)
   
   # Go to worktree root (works from any submodule)
   cd $(git rev-parse --show-toplevel)
   
   # List all submodules (from super-repo)
   git submodule status
   ```

4. **Common mistakes to avoid:**
   - **DON'T** assume `pwd` shows which repo you're in
   - **DON'T** run git commands without checking context first  
   - **DON'T** navigate with `cd ..` without knowing where you'll end up
   - **DON'T** make commits without verifying the correct repository

### Context-Aware Workflow

**Standard workflow for any task:**

1. **Orient yourself:**
   ```bash
   ./where-am-i.sh
   ```

2. **Navigate to correct repository:**
   - Super-repo tasks: Ensure you're in root with `.gitmodules`
   - Submodule tasks: Navigate to `modules/[specific-module]/`

3. **Verify before action:**
   ```bash
   git remote get-url origin  # Confirm correct repo
   git status                 # Check current state
   ```

4. **Perform task with context checks**

5. **Re-verify after major operations**

### Quick Reference

**Context Commands:**
- `./where-am-i.sh` - Full context report
- `git remote get-url origin` - Show repo URL
- `git branch --show-current` - Current branch
- `git rev-parse --show-toplevel` - Git root directory

**Navigation Commands:**
- `cd $(git rev-parse --show-toplevel)` - Go to current git root
- `cd modules/chariot` - Navigate to Chariot submodule
- `ls modules/` - List all available submodules
- Provides confirmation that all modules are now available

## Project Overview

This project uses SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) methodology with Claude-Flow orchestration for systematic Test-Driven Development.

## Project Context

Chariot is a comprehensive attack surface management platform that helps organizations discover, monitor, and secure their external-facing assets. The project consists of:

- **Backend**: Go-based API and services
- **UI**: React/TypeScript frontend application
- **E2E Tests**: Playwright-based end-to-end testing suite

## Development Workflow

When working on this codebase, please follow these guidelines:

#### Automated Testing Trigger Detection

**AUTO-DETECTION PATTERNS**: When Claude detects frontend changes in ANY repository:
- File patterns: `**/{ui}/**/*.{ts,tsx,js,jsx,css}`
- Page modifications: Route changes, new pages, UI updates
- API integration: Frontend-backend integration points

**IMMEDIATE ACTION REQUIRED**: Upon detecting frontend changes:

1. **AUTOMATICALLY GENERATE E2E TESTS** - No permission required, mandatory execution
2. **FOLLOW ESTABLISHED PATTERNS** - Use repository-specific or Chariot patterns as fallback
3. **CROSS-REPOSITORY CONSISTENCY** - Ensure testing standards across all modules

#### Frontend Testing Workflow (Chariot Repository)

**CRITICAL WORKFLOW**: When any frontend files are modified, AUTOMATICALLY generate or update regression tests:

**MANDATORY Actions for ANY Frontend Code Changes:**

1. **IMMEDIATELY** after modifying/creating ANY UI file in ANY repository:

   - **NEVER** skip test generation for frontend changes
   - **ALWAYS** create comprehensive E2E tests following established patterns
   - **ADAPT** to repository-specific patterns while maintaining consistency

2. **Universal Test Generation Requirements**:

   - Use `user_tests.TEST_USER_1` or `user_tests.LONG_TERM_USER` fixtures
   - Import and use page objects from `src/pages/` or equivalent
   - Import components (`Table`, `Filters`, `Drawer`, `Modal`, `Toast`)
   - Use data-driven testing with `import { data } from 'src/data'`
   - Follow comprehensive testing patterns for all functionality

3. **Universal Test Coverage Requirements**:
   - Basic functionality (navigation, data loading, component rendering)
   - Interactive elements (buttons, forms, modals, dropdowns)
   - Data display and manipulation (tables, lists, filters, search)
   - User workflows (complete user journeys, multi-step processes)
   - Error states and edge cases (network failures, validation errors)
   - Responsive behavior and accessibility compliance
   - Integration points (API calls, external services)

**Cross-Repository Frontend Engineer Mindset**: You are an experienced frontend engineer who believes in thorough, reliable, and maintainable tests that mirror real user workflows. Every code change MUST have corresponding test coverage, regardless of the repository or framework used.

### Code Quality Standards

- Run linting and a build before committing changes
- Follow existing code conventions and patterns
- Use the established page object model for E2E tests
- Maintain comprehensive test coverage for new features

### Testing Commands

- E2E Tests: `npm run test` (in e2e directory)
- UI Tests: Check package.json for available test scripts
- Backend Tests: `make test` (in backend directory)


**REPOSITORY PATTERN DETECTION**: Before generating tests, Claude analyzes:
1. Existing test file structure and naming conventions
2. Import patterns and fixture usage
3. Page object models and helper utilities
4. Data management and test data patterns
5. Custom commands and reusable components

### Required Test Structure Templates

**Primary pattern for Chariot ecosystem repositories:**

```typescript
import { expect } from '@playwright/test';
import { user_tests } from 'src/fixtures';
import { waitForAllLoader } from 'src/helpers/loader';
import { [PageClass] } from 'src/pages/[page].page';
import { Table } from 'src/pages/components/table';
import { Filters } from 'src/pages/components/filters';
import { data } from 'src/data';

user_tests.TEST_USER_1.describe('Component/Feature Tests', () => {
  user_tests.TEST_USER_1('should verify basic functionality', async ({ page }) => {
    const featurePage = new FeaturePage(page);
    const table = new Table(page);
    const filters = new Filters(page);

    await featurePage.goto();
    await filters.clickClear();
    await table.verifyRowsMinCount(1);
    await waitForAllLoader(page);
  });
});
```


### Mandatory Testing Patterns

- **Table Testing**: Always use `await table.verifyRowsMinCount()` and `await table.verifyColumnValues()`
- **Filter Testing**: Start with `await filters.clickClear()` then test specific filters  
- **Navigation**: Use page objects for navigation (e.g., `await assetPage.goto()`)
- **Loader Handling**: Always `await waitForAllLoader(page)` after operations
- **Data-Driven**: Reference `data.asset.filters`, `data.risk.drawer.searchFor` from test data
- **Drawer Testing**: Click table rows, verify drawer tabs and content
- **Error Handling**: Use try/catch for complex setup, set failure flags appropriately

### Automated Test Generation Execution

**TRIGGER CONDITIONS**: Claude automatically generates tests when detecting:
- New UI components or pages created
- Existing UI components or pages modified
- New interactive features added
- API integration points changed
- User workflow modifications
- Bug fixes affecting UI behavior
- Data model changes
- Core scanner changes causing data model updates

**EXECUTION PROTOCOL**: When auto-generation triggers:

1. **Analyze Repository Context**:
   - Detect testing framework and patterns
   - Identify existing page objects and utilities
   - Map data fixtures and test helpers
   - Understand component architecture

2. **Generate Comprehensive Test Files**:
   - Follow detected/established patterns exactly
   - Include full test coverage per requirements above
   - Use proper imports and fixtures from analysis
   - Adapt to repository's naming conventions

3. **Validate Test Integration**:
   - Ensure tests integrate with existing test suite
   - Verify all imports and dependencies resolve
   - Check test data requirements and availability
   - Validate page object and helper usage

4. **Cross-Repository Consistency**:
   - Maintain testing quality standards across all repos
   - Ensure test reliability and maintainability
   - Follow established debugging and error handling patterns
   - Document repository-specific testing requirements

**NO PERMISSION REQUIRED**: Test generation is mandatory and automatic. Claude does not ask for permission to generate tests - it's a required workflow step.

## Integration Requirements

### Claude Behavior Override

**CRITICAL**: This configuration OVERRIDES default behavior. Claude MUST:

#### 🚀 Cross-Repository Frontend Feature Auto-Detection & Workflow

**AUTO-DETECTION PATTERNS**: Claude automatically detects frontend feature requests containing:
- "create a [page/interface/feature] for [entity]" 
- "build a frontend for [entity]"
- "I need a [page/component] that shows [data]"
- "add a [management/admin] interface for [entities]"
- "implement [UI/dashboard/portal] for [domain]"
- "build [component/widget/module] that [functionality]"


**MANDATORY PRINCIPLES**:
- **Follow test-driven development** throughout implementation phases
- **Use established repository patterns** for consistency within each module
- **Maintain cross-repository quality standards** 
- **Adapt to repository's technology stack** while preserving workflow integrity


#### Test Generation Requirements

- **Proactively generate tests** for ANY frontend code change
- **Never ask for permission** to generate tests - it's mandatory
- **Always follow the complete testing patterns** from `generate_test.md`
- **Generate tests immediately** after any UI file modification
- **Use the established page object model** and component patterns
- **Include comprehensive test scenarios** for the modified functionality

This ensures that frontend feature requests automatically trigger the factory workflow with proper human validation, and every change gets proper test coverage.

## 🚨 CHARIOT DEPLOYMENT - CRITICAL REQUIREMENT

**⚠️ MANDATORY DEPLOYMENT COMMAND:**

```bash
make chariot
```

**🚨 NEVER USE ANY OTHER DEPLOYMENT COMMANDS:**
- ❌ DO NOT use `docker-compose up`
- ❌ DO NOT use `npm start`
- ❌ DO NOT use `go run`
- ❌ DO NOT use any manual deployment scripts
- ❌ DO NOT use any other make targets for deployment

**✅ ONLY USE: `make chariot`**

This is the ONLY supported way to deploy the Chariot platform. Any other deployment method will cause system failures, configuration issues, and security vulnerabilities.
ALWAYS run `make chariot` in the background, and monitor for completion regularly. 

**🎯 DEPLOYMENT COMPLETION INDICATOR:**

When you see the localhost:3XXX prompt appear in your terminal, the deployment is COMPLETE and ready for interaction:

```bash
✅ Chariot is now running at: http://localhost:3XXX
```

**Once this message appears, you can:**
- ✅ Open http://localhost:3XXX in your browser
- ✅ Begin using the Chariot platform
- ✅ The deployment process is fully finished
- ✅ All services are running and ready

Remember: **Claude Flow coordinates, Claude Code creates!**

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
Never save working files, text/mds and tests to the root folder.

## CODE REVIEW PROCEDURE

### Types of code changes

IMPORTANT: Do not read previous PR comments to help with the review. Evaluate the code changes independently.

Review this PR and determine:

1. Does it contain Go (\*.go) or TypeScript (\*.ts) changes?
2. Does it contain significant code changes?
3. Does it include corresponding automated tests?

For backend changes, (Go files), look for changes in \*\_test.go files in this PR.
For frontend changes (JS/TS files), look for changes in \*.spec.ts files in this PR.

Output format:
Has Go or TypeScript Changes: Yes/No
Has Significant Changes: Yes/No
Has Automated Tests: Yes/No

### Tool to use

- Use the local `gh` command to access PR's
- Use the local `gh` command to retrieve the diffs and write PR comments.

### In the final review comment to the user, format it as follows

- **Format**: Use **ONLY** "Findings" and "Recommendations" sections
- **Length**: Maximum 10 bullet points total across both sections
- **Focus**: Critical issues and actionable improvements only
- **Style**: Direct bullet points, no explanatory paragraphs
- **Remove**: Any "Todo:", "Security Assessment", or "Quality Assessment" sections
