# npm Workspace Pattern for TypeScript Skills

## Core Principle

**Skills are documentation-first. Scripts are optional automation.**

TypeScript projects (package.json, tsconfig.json, src/, dist/) belong in `scripts/` subdirectory, keeping implementation separate from documentation.

> **Note:** Skills and tools share a **unified workspace** at `.claude/package.json`.
> This provides shared devDependencies (tsx, typescript, vitest) and centralized test infrastructure.

## Why Skills and Tools Have Different Structures

**Tools (flat structure):**
```
tools/context7/
├── package.json      ← Code IS the artifact
├── *.ts files        ← Pure implementation
```
- Tools exist ONLY to wrap MCP servers
- No documentation structure needed
- Code IS the primary artifact

**Skills (nested structure):**
```
skills/claude-skill-search/
├── SKILL.md          ← Documentation IS the artifact
├── references/       ← Additional docs (progressive disclosure)
├── examples/         ← Usage examples
└── scripts/          ← Optional automation
    ├── package.json
    └── src/
```
- Skills are **documentation-first**
- SKILL.md is the PRIMARY artifact (always required)
- Scripts are SECONDARY (optional, for automation)
- Nesting separates "what it teaches" from "how it automates"

**This asymmetry is intentional semantic design**, not arbitrary. Anthropic's official docs allow .md files at skill root alongside scripts/ directory.

## Why npm Workspaces?

**Problem:** Without workspaces, skills would install duplicate packages

```
claude-skill-search/scripts/node_modules/
  ├── commander/      # 2.1 MB
  ├── chalk/          # 500 KB
  └── gray-matter/    # 300 KB

claude-skill-audit/scripts/node_modules/
  ├── commander/      # 2.1 MB (DUPLICATE!)
  ├── chalk/          # 500 KB (DUPLICATE!)
  └── gray-matter/    # 300 KB (DUPLICATE!)
```

**Solution:** Unified workspace with shared node_modules

```
.claude/
├── package.json                    # Unified workspace config
├── node_modules/                   # Shared dependencies (installed once)
│   ├── typescript/                 # Shared devDependency
│   ├── tsx/                        # Shared devDependency
│   ├── vitest/                     # Shared devDependency
│   ├── commander/                  # Hoisted from skills
│   ├── chalk/                      # Hoisted from skills
│   └── gray-matter/                # Hoisted from skills
├── tools/                          # MCP tool wrappers
│   ├── context7/
│   └── linear/
└── skills/
    ├── claude-skill-search/scripts/  # No duplicates
    └── claude-skill-audit/scripts/   # No duplicates
```

**Savings:** 70-80% reduction in disk space and install time

## Directory Structure

### Correct Pattern (Unified Workspace)

```
.claude/
├── package.json                    # Unified workspace root
├── vitest.config.ts                # Centralized test config
├── node_modules/                   # ALL shared dependencies hoisted here
│
├── tools/                          # MCP tool wrappers (workspace members)
│   ├── context7/package.json
│   └── linear/package.json
│
├── lib/                            # Shared core utilities (workspace member)
│   ├── package.json
│   ├── find-project-root.ts
│   └── testing/                    # @claude/testing library
│
└── skills/
    │
    ├── claude-skill-search/
    │   ├── SKILL.md                # Only file at root ✅
    │   ├── .local/
    │   ├── references/
    │   ├── examples/
    │   ├── templates/
    │   └── scripts/                # TypeScript project HERE
    │       ├── .gitignore          # Ignore dist/ only
    │       ├── package.json        # NO devDependencies needed!
    │       ├── tsconfig.json
    │       └── src/
    │
    └── claude-skill-audit/
        ├── SKILL.md                # Only file at root ✅
        └── scripts/
            ├── .gitignore
            ├── package.json        # NO devDependencies needed!
            └── src/
```

### Incorrect Pattern (Avoid)

```
❌ WITHOUT WORKSPACES (each skill has isolated node_modules):
   skill-a/scripts/node_modules/commander/    # 2.1 MB
   skill-b/scripts/node_modules/commander/    # 2.1 MB (DUPLICATE!)
   skill-c/scripts/node_modules/commander/    # 2.1 MB (DUPLICATE!)

❌ MIXED STRUCTURE (implementation at root):
   claude-skill-search/
   ├── SKILL.md
   ├── package.json          # Mixed with docs
   ├── src/                  # Mixed with docs
   └── references/           # Confusing structure
```

**Why avoid mixing?** Skills are documentation-first. Keeping scripts nested maintains semantic clarity.

## Setup Process

### Step 1: Unified Workspace Root (Already Exists)

**File:** `.claude/package.json`

```json
{
  "name": "@chariot/claude-infrastructure",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "workspaces": [
    "lib",
    "lib/testing",
    "tools/*",
    "skills/*/scripts",
    "skill-library/lib"
  ],
  "devDependencies": {
    "@types/node": "^20.11.24",
    "@vitest/ui": "^1.3.1",
    "tsx": "^4.20.6",
    "typescript": "^5.3.3",
    "vitest": "^1.3.1"
  },
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "build:skills": "npm run build --workspaces --if-present -- --filter='skills/*'"
  }
}
```

**Key config:**
- `"workspaces"` includes `lib`, `lib/testing`, `tools/*`, `skills/*/scripts`, and `skill-library/lib`
- Shared devDependencies: tsx, typescript, vitest, @types/node
- Skills DON'T need their own devDependencies for these packages

### Step 2: Structure Individual Skills

**For simple bash skills:**
```
skill-name/
├── SKILL.md
└── scripts/
    └── helper.sh           # Simple executable
```

**For TypeScript skills:**
```
skill-name/
├── SKILL.md
└── scripts/
    ├── .gitignore          # Exclude dist/ only
    ├── package.json        # Dependencies only, NO devDependencies
    ├── tsconfig.json
    ├── src/
    └── dist/               # Git-ignored
```

**scripts/.gitignore for TypeScript:**
```gitignore
# Build output (node_modules hoisted to .claude/)
dist/

# Logs
*.log

# Temporary files
*.tmp
.cache/
```

### Step 3: Define Skill Package (No devDependencies!)

**File:** `skill-name/scripts/package.json`

```json
{
  "name": "@chariot/skill-name",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli.ts",
    "search": "tsx src/cli.ts search"
  },
  "dependencies": {
    "commander": "^11.1.0",
    "chalk": "^5.3.0"
  }
}
```

**Important:**
- NO `devDependencies` needed - tsx, typescript, vitest come from root
- NO `"workspaces"` field - only in root package.json
- Only list runtime dependencies the skill actually uses

## Running Commands from Anywhere

### Why Repo-Root Detection is Required

**MANDATORY**: All bash commands MUST use git-based repo-root detection.

**Problem**: Commands like `cd .claude/skills/...` ONLY work from the repository root. They break when:
- Working from a submodule directory (e.g., `modules/chariot/`)
- Working from any nested directory (e.g., `.claude/skills/some-skill/`)
- Different working directory contexts

**Solution**: Always resolve the repo root first using git:

```bash
# MANDATORY pattern for ALL commands
REPO_ROOT=$(git rev-parse --show-superproject-working-tree || git rev-parse --show-toplevel)
cd "$REPO_ROOT/.claude/skills/skill-name/scripts" && npm run dev
```

**Why this works:**
- `--show-superproject-working-tree`: Returns super-repo root when in a submodule
- `--show-toplevel`: Returns repo root for standalone repos
- `||` fallback: Uses whichever succeeds
- Works from ANY directory in the project

---

## Installation & Usage

### First-Time Setup

```bash
# From ANY directory - single install for everything
REPO_ROOT=$(git rev-parse --show-superproject-working-tree || git rev-parse --show-toplevel)
cd "$REPO_ROOT/.claude" && npm install

# This installs ALL dependencies for:
# - MCP tool wrappers (tools/*)
# - Skill scripts (skills/*/scripts)
# - Shared testing library (lib/testing)
```

### Using Skills

```bash
# Run from ANY directory - uses repo-root detection
REPO_ROOT=$(git rev-parse --show-superproject-working-tree || git rev-parse --show-toplevel)
cd "$REPO_ROOT/.claude/skills/claude-skill-search/scripts" && npm run dev -- search "query"

# Or use workspace command (also from any directory)
REPO_ROOT=$(git rev-parse --show-superproject-working-tree || git rev-parse --show-toplevel)
cd "$REPO_ROOT/.claude" && npm run dev --workspace @chariot/skill-search -- search "query"
```

### Running Tests

```bash
# From ANY directory - runs ALL tests (tools + skills)
REPO_ROOT=$(git rev-parse --show-superproject-working-tree || git rev-parse --show-toplevel)
cd "$REPO_ROOT/.claude" && npm test

# Run specific test file
REPO_ROOT=$(git rev-parse --show-superproject-working-tree || git rev-parse --show-toplevel)
cd "$REPO_ROOT/.claude" && npm test -- skills/*/scripts/**/*.test.ts
```

### Building All TypeScript Skills

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree || git rev-parse --show-toplevel)
cd "$REPO_ROOT/.claude" && npm run build:skills  # Builds all skill workspace packages
```

## Dependency Management

### Adding Dependencies to Specific Skill

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree || git rev-parse --show-toplevel)
cd "$REPO_ROOT/.claude" && npm install commander --workspace @chariot/skill-name
```

Dependency gets hoisted to root if version matches other skills.

### Version Conflicts

If skills need different versions:
```
.claude/skills/
├── node_modules/
│   └── commander@11.1.0       # Shared version
└── skill-special/scripts/
    └── node_modules/
        └── commander@10.0.0   # Different version stays local
```

npm handles this automatically.

## Benefits

### How Hoisting Works (No Duplicate Packages!)

**Common misconception:** "Each skill's package.json means duplicate packages installed."

**Reality:** package.json files are just **metadata** declaring dependencies. npm workspaces:
1. Read all workspace package.json files
2. Install ALL packages to root `.claude/node_modules/`
3. Dedupe identical versions (installed once, shared by all)
4. Only isolate packages with version conflicts

**Proof with `npm ls`:**
```bash
$ npm ls commander
├─┬ @chariot/agent-audit-alignment
│ └── commander@11.1.0
├─┬ @chariot/agent-fix-schema
│ └── commander@12.1.0           # Different version → isolated
├─┬ @chariot/skill-audit
│ └── commander@11.1.0 deduped   # Same version → SHARED
└─┬ @chariot/skill-search
  └── commander@11.1.0 deduped   # Same version → SHARED
```

**"deduped"** = installed once at root, symlinked to all skills needing it.

### Shared Dependencies (Hoisting)

**Before (separate packages):**
- claude-skill-search: 307 packages, 40 MB
- claude-skill-audit: 295 packages, 38 MB
- **Total: 602 packages, 78 MB**

**After (workspace):**
- Shared node_modules: 320 packages, 42 MB
- Skill-specific: ~10 packages per skill
- **Total: ~340 packages, 45 MB**

**Savings: 43% disk space, 44% fewer packages**

### Faster Installation

**First install:** Similar time (downloads once)
**Subsequent installs:** 80% faster (uses cached shared deps)
**Adding new skill:** Only installs unique deps

### Consistent Versions

All skills use same versions of shared packages unless explicitly different.

## Migration Guide

### Migrating Existing TypeScript Skills

**Current structure:**
```
skill-name/
├── SKILL.md
├── package.json         # At root (WRONG)
├── src/
└── node_modules/
```

**Migration steps:**

1. Create scripts/ subdirectory
2. Move package.json, tsconfig.json, src/, dist/ INTO scripts/
3. Create scripts/.gitignore
4. Delete skill-root node_modules/
5. Update SKILL.md commands (add `/scripts` to paths)
6. Run workspace install from .claude/skills/

**Commands:**
```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree || git rev-parse --show-toplevel)
cd "$REPO_ROOT/.claude/skills/skill-name"
mkdir -p scripts
mv package.json package-lock.json tsconfig.json src scripts/
rm -rf node_modules dist

# Create scripts/.gitignore
cat > scripts/.gitignore <<'EOF'
dist/
*.log
EOF

# Update workspace
cd "$REPO_ROOT/.claude" && npm install
```

## File Organization Rules

### At Skill Root ✅

**ONLY these:**
- SKILL.md (required file)
- Directories: .local/, references/, examples/, templates/, scripts/

### In scripts/ Subdirectory ✅

**TypeScript projects:**
- package.json
- package-lock.json (committed for reproducibility)
- tsconfig.json
- src/ (TypeScript source)
- dist/ (compiled output, git-ignored)
- .gitignore (excludes dist/)

**Simple scripts:**
- helper.sh
- validate.py
- generate.js

### Never at Skill Root ❌

- package.json
- tsconfig.json
- node_modules/
- dist/
- src/
- Any build configuration files

## Common Patterns

### Pattern 1: CLI Tool Skill

```
skill-name/
├── SKILL.md                 # Describes when/how to use CLI
└── scripts/
    ├── .gitignore
    ├── package.json         # CLI dependencies
    ├── tsconfig.json
    ├── src/
    │   ├── cli.ts           # Commander CLI
    │   ├── core-logic.ts
    │   └── types.ts
    └── dist/                # Git-ignored
```

**Usage in SKILL.md (Claude Code execution syntax):**
```bash
# The ! prefix tells Claude Code to execute this command
!REPO_ROOT=$(git rev-parse --show-superproject-working-tree || git rev-parse --show-toplevel) && cd "$REPO_ROOT/.claude/skills/skill-name/scripts" && npm run command -- "args"
```

### Pattern 2: Mixed Bash + TypeScript

```
skill-name/
├── SKILL.md
└── scripts/
    ├── quick-helper.sh      # Simple bash for quick tasks
    ├── package.json         # TypeScript for complex tasks
    ├── tsconfig.json
    └── src/
        └── complex-tool.ts
```

Use bash for simple operations, TypeScript for complex logic.

### Pattern 3: Pure Bash (No TypeScript)

```
skill-name/
├── SKILL.md
└── scripts/
    ├── helper.sh
    └── validator.sh
```

No package.json needed - just executable scripts.

## Troubleshooting

### Issue: "Cannot find module"

**Cause:** Dependencies not hoisted properly

**Solution:**
```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree || git rev-parse --show-toplevel)
cd "$REPO_ROOT/.claude" && rm -rf node_modules skills/*/scripts/node_modules && npm install
```

### Issue: "npm ERR! workspace not found"

**Cause:** Workspace not configured in root package.json

**Solution:** Verify `.claude/package.json` has:
```json
{
  "workspaces": ["skills/*/scripts"]
}
```

### Issue: Different TypeScript versions needed

npm workspaces handle this - install specific version in that skill:
```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree || git rev-parse --show-toplevel)
cd "$REPO_ROOT/.claude" && npm install typescript@5.0.0 --workspace @chariot/skill-name
```

## Best Practices

### Do ✅

- Put ALL TypeScript project files in scripts/ subdirectory
- Use shared dependencies via workspace hoisting
- Commit package-lock.json for reproducibility
- Create scripts/.gitignore to exclude build artifacts
- Keep SKILL.md as only file at skill root

### Don't ❌

- Put package.json at skill root
- Install dependencies separately per skill
- Commit node_modules/ or dist/ directories
- Mix TypeScript files with SKILL.md at root level
- Forget to update root workspace config when adding new TypeScript skill

## Path Resolution Pattern

### CRITICAL: Always Use Git for Path Resolution

**All TypeScript skills MUST use this function to find the repository root:**

```typescript
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Find repository root using git
 * Handles submodules by checking for superproject first
 * Falls back to filesystem search if git is not available
 */
function findRepoRoot(): string {
  try {
    // MANDATORY: Handle submodules with --show-superproject-working-tree
    const gitRoot = execSync(
      'git rev-parse --show-superproject-working-tree || git rev-parse --show-toplevel',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim();
    if (gitRoot) return gitRoot;
  } catch {}

  // Fallback: search upward for .claude directory
  let current = process.cwd();
  while (current !== dirname(current)) {
    if (existsSync(join(current, '.claude'))) {
      return current;
    }
    current = dirname(current);
  }
  throw new Error('Could not find project root');
}

// Usage in your code
const repoRoot = findRepoRoot();
const skillsDir = join(repoRoot, '.claude/skills');
const agentsDir = join(repoRoot, '.claude/agents');
```

### Why This Matters

**❌ WRONG approaches that will break:**
```typescript
// WRONG: Hardcoded relative paths
const skillsDir = join(process.cwd(), '../../');

// WRONG: Incomplete traversal (only goes up 3 levels)
const repoRoot = join(__dirname, '../../..');

// WRONG: Assumes specific cwd
const repoRoot = cwd.includes('.claude/skills')
  ? join(cwd, '../../..')
  : cwd;
```

**Common bug:** Going up 3 levels from `scripts/` lands at `.claude`, not repo root, causing doubled paths like `.claude/.claude/agents`.

**✅ CORRECT: Use git as single source of truth**
- Works from any directory
- No manual path counting
- Robust across environments
- Has fallback for non-git contexts

### Template for New TypeScript Skills

When creating a new TypeScript skill, **USE THE SHARED UTILITY** (recommended):

```typescript
#!/usr/bin/env tsx

import { join } from 'path';
import { findProjectRoot } from '../../../lib/find-project-root.js';

// Auto-detects project root from ANY directory (handles submodules!)
const PROJECT_ROOT = findProjectRoot();

// Now you can safely build paths
const SKILLS_DIR = join(PROJECT_ROOT, '.claude/skills');
const AGENTS_DIR = join(PROJECT_ROOT, '.claude/agents');
const TOOLS_DIR = join(PROJECT_ROOT, '.claude/tools');
```

**Or include the pattern directly** (if shared utility unavailable):

```typescript
#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Find project root using git + filesystem fallback
 * Handles submodules and non-git contexts
 */
function findProjectRoot(): string {
  try {
    // For submodules: get super-repo root, else get repo root
    const gitRoot = execSync(
      'git rev-parse --show-superproject-working-tree || git rev-parse --show-toplevel',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim();
    if (gitRoot) return gitRoot;
  } catch {}

  // Fallback: search upward for .claude directory
  let current = process.cwd();
  while (current !== dirname(current)) {
    if (existsSync(join(current, '.claude'))) {
      return current;
    }
    current = dirname(current);
  }
  throw new Error('Could not find project root');
}

// Now you can safely build paths
const PROJECT_ROOT = findProjectRoot();
const SKILLS_DIR = join(PROJECT_ROOT, '.claude/skills');
const AGENTS_DIR = join(PROJECT_ROOT, '.claude/agents');
```

**Why this matters:**
- ✅ Works from ANY directory (project root, submodules, .claude/, scripts/)
- ✅ Handles submodules correctly (super-repo root)
- ✅ Robust fallback (filesystem search)
- ✅ No hardcoded path depths

## Summary

**Unified workspace at `.claude/` =**
- ✅ Single `npm install` for tools AND skills
- ✅ Shared devDependencies (tsx, typescript, vitest)
- ✅ No devDependencies in skill package.json files
- ✅ Shared dependencies hoisted (70-80% disk reduction)
- ✅ Centralized test infrastructure (vitest.config.ts)
- ✅ Clean skill root (only SKILL.md + directories)
- ✅ Robust path resolution with `findProjectRoot()`

**Commands to remember (use from ANY directory):**
```bash
# MANDATORY: Always use repo-root detection
REPO_ROOT=$(git rev-parse --show-superproject-working-tree || git rev-parse --show-toplevel)

# Setup workspace (first time)
cd "$REPO_ROOT/.claude" && npm install

# Run any TypeScript skill
cd "$REPO_ROOT/.claude/skills/skill-name/scripts" && npm run dev -- "args"

# Run all tests (tools + skills)
cd "$REPO_ROOT/.claude" && npm test

# Build all TypeScript skills
cd "$REPO_ROOT/.claude" && npm run build:skills
```

Follow this pattern for all TypeScript-based skills.
