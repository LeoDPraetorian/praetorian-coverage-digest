# Claude Code Configuration - SPARC Development Environment

## 🚨 CRITICAL: CONCURRENT EXECUTION & FILE MANAGEMENT

**ABSOLUTE RULES**:

1. ALL operations MUST be concurrent/parallel in a single message
2. **NEVER save working files, text/mds and tests to the root folder**
3. ALWAYS organize files in appropriate subdirectories

**⚡ GOLDEN RULE: "1 MESSAGE = ALL RELATED OPERATIONS"**

ALL operations MUST be concurrent/parallel in a single message:

- **TodoWrite**: Batch ALL todos in ONE call (5-10+ minimum)
- **File operations**: Batch ALL reads/writes/edits together
- **Bash commands**: Execute ALL terminal operations concurrently
- **Memory operations**: Batch ALL store/retrieve operations

### Branch Safety

**🚨 NEVER WORK ON MAIN BRANCH:**

Before ANY file modifications, ALWAYS sync with latest code first:

```bash
# 1. MANDATORY: Sync with origin and update submodules BEFORE branching. must be in super-repo
git fetch origin                                       # Fetch latest changes. must be in super-repo
git merge origin/main                                  # Merge latest main. must be in super-rep
make submodule-pull                                    # Update all submodules to latest. must be in super-repo

# 2. Check current branches
git branch --show-current                              # Super-repo branch
git submodule foreach 'echo "$(basename $PWD): $(git branch --show-current)"'  # All submodule branches

# 3. Create feature branch if needed
git checkout -b feature/your-feature-name             # Super-repo. must be in super-repo
git submodule foreach 'git checkout -b feature/your-feature-name'  # All submodules
```

# must be in super-repo

**CRITICAL WORKFLOW ORDER:**

1. **FIRST**: Sync with `git fetch origin && git merge origin/main && make submodule-pull`
2. **THEN**: Create feature branch
3. **REFUSE** to make changes if on `main` branch - create feature branch first

### File Management

**📁 ABSOLUTE RULES:**

1. **NEVER** save working files to root folder
2. **ALWAYS** organize in `/modules` subdirectories
3. **PREFER** editing existing files over creating new ones
4. **NEVER** create documentation unless explicitly requested

### Deployment Command

**🚨 CRITICAL - ONLY USE THIS COMMAND:**

```bash
make chariot
```

**NEVER** use: `docker-compose up`, `npm start`, `go run`, or any other deployment method.

Monitor for completion indicator:

```bash
✅ Chariot is now running at: http://localhost:3XXX
```

---

## 🏗️ Platform Architecture

### Module Overview

```
chariot-development-platform/                  # SUPER-REPO (this repo)
├── modules/                                   # Submodule container (12 total)
│   ├── aegiscli/                              # Velociraptor-based security orchestration middleware
│   ├── chariot/                               # Core Chariot attack surface management platform
│   ├── chariot-aegis-capabilities/            # VQL-based security capabilities repository
│   ├── chariot-devops/                        # DevOps and infrastructure automation
│   ├── chariot-ui-components/                 # Reusable React/TypeScript UI component library
│   ├── janus/                                 # Security tool orchestration platform
│   ├── janus-framework/                       # Go library for chaining security tools
│   ├── nebula/                                # Multi-cloud security scanning CLI
│   ├── nuclei-templates/                      # Security vulnerability detection templates
│   ├── praetorian-agent-workflows/            # Agentic workflow orchestration
│   ├── praetorian-cli/                        # Python CLI and SDK for Chariot platform
│   └── tabularium/                            # Universal data schema and code generation
└── CLAUDE.md                                  # This file (project instructions)
```

### Repository Structure

**Key Modules:**

- **chariot**: Go backend, React/TypeScript frontend, E2E tests
- **nebula**: Cloud security CLI with MCP server integration
- **janus-framework**: Reusable security workflow automation
- **tabularium**: Universal data schemas with code generation

---

### Navigation & Context

**🧭 ALWAYS check context before operations:**

```bash
pwd && git remote get-url origin    # Check location and repo
```

**Navigation shortcuts:**

```bash
cd $(git rev-parse --show-toplevel)                    # Go to current repo root (submodule or super-repo)
cd $(git rev-parse --show-superproject-working-tree || git rev-parse --show-toplevel)  # Always go to super-repo root
cd modules/[module-name]                               # Navigate to module (must be in super-repo)
git submodule status                                   # List submodules (must be in super-repo)
```

**Repository identification:**

- **SUPER-REPO**: Contains `.gitmodules` file
- **SUBMODULE**: Path includes `/modules/`

### Testing Automation

**🤖 AUTO-TRIGGER PATTERNS:**

Frontend changes automatically trigger E2E test generation:

- File patterns: `**/{ui}/**/*.{ts,tsx,js,jsx,css}`
- **NO PERMISSION REQUIRED** - Tests generate automatically

**Test Structure Template:**

```typescript
import { expect } from '@playwright/test';
import { user_tests } from 'src/fixtures';
import { [PageClass] } from 'src/pages/[page].page';

user_tests.TEST_USER_1.describe('Feature Tests', () => {
  user_tests.TEST_USER_1('should verify functionality', async ({ page }) => {
    const featurePage = new FeaturePage(page);
    await featurePage.goto();
    // Test implementation
  });
});
```

**Coverage Requirements:**

- Navigation and data loading
- Interactive elements (forms, modals)
- Data manipulation (tables, filters)
- Error states and edge cases
- Integration points

### Code Review Process

**PR Review Format:**

```
Has Go or TypeScript Changes: Yes/No
Has Significant Changes: Yes/No
Has Automated Tests: Yes/No
```

**Review Sections:**

- **Findings**: Critical issues only
- **Recommendations**: Actionable improvements
- Maximum 10 bullet points total

---

## 📖 Quick Reference

### Essential Commands

**🎯 Most Used Commands:**

```bash
# Deployment
make chariot                         # Deploy platform

# Navigation
cd modules/chariot                  # Go to module (must be in super-repo)
cd $(git rev-parse --show-toplevel) # Go to root

# Testing
npm run test                        # E2E tests (in e2e dir)
make test                          # Backend tests
```

### Testing Patterns

**Required Imports:**

```typescript
import { user_tests } from "src/fixtures";
import { Table, Filters, Drawer } from "src/pages/components";
import { waitForAllLoader } from "src/helpers/loader";
import { data } from "src/data";
```

**Key Patterns:**

- `await filters.clickClear()` - Reset filters
- `await table.verifyRowsMinCount(1)` - Verify data
- `await waitForAllLoader(page)` - Wait for loading
- Use page objects for navigation
- Reference `data.*` for test data

### Troubleshooting

**Common Issues:**

| Issue                | Solution                                                                |
| -------------------- | ----------------------------------------------------------------------- |
| Deployment fails     | Only use `make chariot` from the chariot-development-platform directory |
| Tests not generating | Check file patterns match trigger                                       |
| Navigation confusion | Use absolute paths with `cd $(git rev-parse --show-toplevel)`           |

**Context Verification:**

```bash
# Am I in super-repo or submodule?
if [ -f .gitmodules ]; then echo "SUPER-REPO"; else echo "SUBMODULE"; fi

# Which repository am I in?
git remote get-url origin

# What's my current branch?
git branch --show-current
```

---

## 🔒 Critical Reminders

1. **NEVER** create files unless absolutely necessary
2. **ALWAYS** batch operations in single messages
3. **ONLY** use `make chariot` for deployment (must be in super-repo)
4. **AUTOMATICALLY** generate tests for frontend changes

---

## 📚 Key Reference Files

**Key Files:**

- `TECH-STACK.md` - Technology versions, frameworks, dependencies (reference when selecting libraries/versions)
- `DESIGN-PATTERNS.md` - Architectural patterns, code templates, security guidelines (reference when coding)
- `modules/chariot/CLAUDE.md` - Frontend workflows, E2E test automation (reference for UI development)
- `modules/chariot/backend/CLAUDE.md` - Go patterns, AWS Lambda, observability (reference for backend work)
- `modules/chariot/ui/CLAUDE.md` - React, TypeScript, Tailwind patterns (reference for frontend components)
- `modules/tabularium/CLAUDE.md` - Data schema and code generation (reference for data models)
- `modules/chariot-ui-components/CLAUDE.md` - React component library development (reference for shared UI)
- `modules/janus-framework/CLAUDE.md` - Security tool orchestration patterns (reference for security workflows)

**Integration Workflow:**

1. **Start here** for platform overview and navigation
2. **Reference Key Files** based on your development context
3. **Follow established patterns** from DESIGN-PATTERNS.md
4. **Use correct tech stack** from TECH-STACK.md
