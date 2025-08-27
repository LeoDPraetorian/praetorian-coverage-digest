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

## SPARC Commands

### Core Commands
- `npx claude-flow sparc modes` - List available modes
- `npx claude-flow sparc run <mode> "<task>"` - Execute specific mode
- `npx claude-flow sparc tdd "<feature>"` - Run complete TDD workflow
- `npx claude-flow sparc info <mode>` - Get mode details

### Batchtools Commands
- `npx claude-flow sparc batch <modes> "<task>"` - Parallel execution
- `npx claude-flow sparc pipeline "<task>"` - Full pipeline processing
- `npx claude-flow sparc concurrent <mode> "<tasks-file>"` - Multi-task processing

### Build Commands
- `npm run build` - Build project
- `npm run test` - Run tests
- `npm run lint` - Linting
- `npm run typecheck` - Type checking

## SPARC Workflow Phases

1. **Specification** - Requirements analysis (`sparc run spec-pseudocode`)
2. **Pseudocode** - Algorithm design (`sparc run spec-pseudocode`)
3. **Architecture** - System design (`sparc run architect`)
4. **Refinement** - TDD implementation (`sparc tdd`)
5. **Completion** - Integration (`sparc run integration`)

## Code Style & Best Practices

- **Modular Design**: Files under 500 lines
- **Environment Safety**: Never hardcode secrets
- **Test-First**: Write tests before implementation
- **Clean Architecture**: Separate concerns
- **Documentation**: Keep updated

## 🚀 Available Agents (54 Total)

### Core Development
`coder`, `reviewer`, `tester`, `planner`, `researcher`

### Swarm Coordination
`hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`, `collective-intelligence-coordinator`, `swarm-memory-manager`

### Consensus & Distributed
`byzantine-coordinator`, `raft-manager`, `gossip-coordinator`, `consensus-builder`, `crdt-synchronizer`, `quorum-manager`, `security-manager`

### Performance & Optimization
`perf-analyzer`, `performance-benchmarker`, `task-orchestrator`, `memory-coordinator`, `smart-agent`

### GitHub & Repository
`github-modes`, `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`, `workflow-automation`, `project-board-sync`, `repo-architect`, `multi-repo-swarm`

### SPARC Methodology
`sparc-coord`, `sparc-coder`, `specification`, `pseudocode`, `architecture`, `refinement`

### Specialized Development
`backend-dev`, `mobile-dev`, `ml-developer`, `cicd-engineer`, `api-docs`, `system-architect`, `code-analyzer`, `base-template-generator`

### Testing & Validation
`tdd-london-swarm`, `production-validator`

### Migration & Planning
`migration-planner`, `swarm-init`

## 🎯 Claude Code vs MCP Tools

### Claude Code Handles ALL:
- File operations (Read, Write, Edit, MultiEdit, Glob, Grep)
- Code generation and programming
- Bash commands and system operations
- Implementation work
- Project navigation and analysis
- TodoWrite and task management
- Git operations
- Package management
- Testing and debugging

### MCP Tools ONLY:
- Coordination and planning
- Memory management
- Neural features
- Performance tracking
- Swarm orchestration
- GitHub integration

**KEY**: MCP coordinates, Claude Code executes.

## 🚀 Quick Setup

```bash
# Add Claude Flow MCP server
claude mcp add claude-flow npx claude-flow@alpha mcp start
```

## MCP Tool Categories

### Coordination
`swarm_init`, `agent_spawn`, `task_orchestrate`

### Monitoring
`swarm_status`, `agent_list`, `agent_metrics`, `task_status`, `task_results`

### Memory & Neural
`memory_usage`, `neural_status`, `neural_train`, `neural_patterns`

### GitHub Integration
`github_swarm`, `repo_analyze`, `pr_enhance`, `issue_triage`, `code_review`

### System
`benchmark_run`, `features_detect`, `swarm_monitor`

## 📋 Agent Coordination Protocol

### Every Agent MUST:

**1️⃣ BEFORE Work:**
```bash
npx claude-flow@alpha hooks pre-task --description "[task]"
npx claude-flow@alpha hooks session-restore --session-id "swarm-[id]"
```

**2️⃣ DURING Work:**
```bash
npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "swarm/[agent]/[step]"
npx claude-flow@alpha hooks notify --message "[what was done]"
```

**3️⃣ AFTER Work:**
```bash
npx claude-flow@alpha hooks post-task --task-id "[task]"
npx claude-flow@alpha hooks session-end --export-metrics true
```

## 🎯 Concurrent Execution Examples

### ✅ CORRECT (Single Message):
```javascript
[BatchTool]:
  // Initialize swarm
  mcp__claude-flow__swarm_init { topology: "mesh", maxAgents: 6 }
  mcp__claude-flow__agent_spawn { type: "researcher" }
  mcp__claude-flow__agent_spawn { type: "coder" }
  mcp__claude-flow__agent_spawn { type: "tester" }
  
  // Spawn agents with Task tool
  Task("Research agent: Analyze requirements...")
  Task("Coder agent: Implement features...")
  Task("Tester agent: Create test suite...")
  
  // Batch todos
  TodoWrite { todos: [
    {id: "1", content: "Research", status: "in_progress", priority: "high"},
    {id: "2", content: "Design", status: "pending", priority: "high"},
    {id: "3", content: "Implement", status: "pending", priority: "high"},
    {id: "4", content: "Test", status: "pending", priority: "medium"},
    {id: "5", content: "Document", status: "pending", priority: "low"}
  ]}
  
  // File operations
  Bash "mkdir -p app/{src,tests,docs}"
  Write "app/src/index.js"
  Write "app/tests/index.test.js"
  Write "app/docs/README.md"
```

### ❌ WRONG (Multiple Messages):
```javascript
Message 1: mcp__claude-flow__swarm_init
Message 2: Task("agent 1")
Message 3: TodoWrite { todos: [single todo] }
Message 4: Write "file.js"
// This breaks parallel coordination!
```

## Performance Benefits

- **84.8% SWE-Bench solve rate**
- **32.3% token reduction**
- **2.8-4.4x speed improvement**
- **27+ neural models**

## Hooks Integration

### Pre-Operation
- Auto-assign agents by file type
- Validate commands for safety
- Prepare resources automatically
- Optimize topology by complexity
- Cache searches

### Post-Operation
- Auto-format code
- Train neural patterns
- Update memory
- Analyze performance
- Track token usage

### Session Management
- Generate summaries
- Persist state
- Track metrics
- Restore context
- Export workflows

## Advanced Features (v2.0.0)

- 🚀 Automatic Topology Selection
- ⚡ Parallel Execution (2.8-4.4x speed)
- 🧠 Neural Training
- 📊 Bottleneck Analysis
- 🤖 Smart Auto-Spawning
- 🛡️ Self-Healing Workflows
- 💾 Cross-Session Memory
- 🔗 GitHub Integration

## Integration Tips

1. Start with basic swarm init
2. Scale agents gradually
3. Use memory for context
4. Monitor progress regularly
5. Train patterns from success
6. Enable hooks automation
7. Use GitHub tools first

## Support

- Documentation: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues

---

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

