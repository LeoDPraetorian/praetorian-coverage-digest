# Phase 8: TypeScript Project Structure

## What It Checks

- scripts/package.json exists (for npm workspace)
- scripts/tsconfig.json exists (for TypeScript compilation)
- ESM compliance (no require() calls)
- findProjectRoot imported from shared lib (NOT inline)
- Proper import statements (not require)
- **Unit tests pass (scoped to skill being audited)**

## Test Scoping Behavior

Phase 8 intelligently scopes test execution based on audit mode:

### Single-Skill Audit (`npm run audit -- skill-name`)
- **Runs only tests for the specific skill being audited**
- Command: `npx vitest run skills/skill-name/scripts`
- Fast execution (~23 tests for skill-manager)
- Prevents false negatives from unrelated test failures

### All-Skills Audit (`npm run audit`)
- **Runs all tests across the entire workspace**
- Command: `npm run test:unit` (102+ test files)
- Comprehensive validation
- Detects issues affecting multiple skills

## Why It Matters

**npm workspaces**: Requires package.json at `skills/*/scripts/` path

**TypeScript**: Needs tsconfig.json for compilation settings

**ESM mode**: All Claude Code TypeScript runs in ESM - require() silently fails

**Path resolution**: 43+ scripts broke when run from different directories - shared lib solves this

**Test scoping**: Before v1.1.0, Phase 8 ran ALL workspace tests (102+ files) even when auditing a single skill, causing false negatives from unrelated test failures. Now tests are scoped to the skill being audited.

### Example: Before Fix (v1.0.0)
```bash
npm run audit -- skill-manager
# Ran 102 test files (all MCP tools, all skills)
# Failed due to 3 unrelated currents tool test failures
# ❌ False negative: skill-manager tests were actually passing
```

### Example: After Fix (v1.1.0)
```bash
npm run audit -- skill-manager
# Runs only 23 skill-manager tests
# ✅ Accurate result: only tests relevant to skill-manager
```

## Detection Patterns

### CRITICAL Issues

**1. Missing package.json**
```
my-skill/scripts/
├── src/
│   └── cli.ts
# Missing package.json - npm workspace won't recognize
```

**2. Missing tsconfig.json**
```
my-skill/scripts/
├── package.json
└── src/
    └── cli.ts
# Missing tsconfig - compilation settings undefined
```

**3. require() in TypeScript**
```typescript
const fs = require('fs');  // ❌ CRITICAL - silently fails in ESM!
```

**4. Inline findProjectRoot**
```typescript
function findProjectRoot() {  // ❌ Should use shared lib
  return execSync('git rev-parse --show-toplevel').trim();
}
```

### WARNING Issues

**1. Wrong Import Paths**
```typescript
import { findProjectRoot } from '../../../../../lib/find-project-root.js';
// ❌ Wrong depth for core skills (should be 4 levels: ../../../../lib/)
```

**2. Missing ESM Type**
```json
{
  "name": "@chariot/my-skill",
  // Missing: "type": "module"
}
```

## Auto-Fix Capability

⚠️ **PARTIALLY auto-fixable** - uses specialized CLI

**Delegates to**: claude-skill-audit-script-paths CLI

**What it fixes:**
- ✅ Creates package.json template
- ✅ Creates tsconfig.json template
- ✅ Replaces inline findProjectRoot with shared lib import
- ✅ Converts require() to import statements
- ❌ Cannot fix complex logic issues

## Examples

### Example 1: Add TypeScript Config

**Before:**
```
scripts/
└── src/
    └── cli.ts
```

**After:**
```
scripts/
├── package.json
├── tsconfig.json
├── .gitignore
└── src/
    └── cli.ts
```

**Generated package.json:**
```json
{
  "name": "@chariot/skill-name",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx src/cli.ts",
    "build": "tsc"
  },
  "dependencies": {
    "chalk": "^5.3.0",
    "commander": "^11.1.0"
  }
}
```

### Example 2: Fix Inline findProjectRoot

**Before:**
```typescript
function findProjectRoot(): string {
  return execSync('git rev-parse --show-toplevel').trim();
}

const PROJECT_ROOT = findProjectRoot();
```

**After:**
```typescript
import { findProjectRoot } from '../../../../lib/find-project-root.js';

const PROJECT_ROOT = findProjectRoot();
```

### Example 3: Convert require() to import

**Before:**
```typescript
const { readFileSync } = require('fs');
const path = require('path');
```

**After:**
```typescript
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
```

## Edge Cases

**1. Mixed CJS/ESM**

Some dependencies might not be ESM-ready:
```typescript
// Use dynamic import for CJS modules
const cjsModule = await import('legacy-package');
```

**2. __dirname in ESM**

Not available in ESM, use alternative:
```typescript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

**3. Workspace Nesting**

Core skills: 4 levels to lib
Library skills: 5 levels to skill-library/lib (re-exports from main lib)

## Manual Remediation

**For specialized CLI tool (phase 8):**

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null); REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT/.claude/skill-library/claude/skills/claude-skill-audit-script-paths/scripts"

# Scan for issues
npm run dev -- audit --dir /path/to/skills

# Fix automatically
npm run dev -- fix --all --phase 8
```

**Manual fixes:**

1. **Create package.json**: Copy template from npm-workspace-pattern.md
2. **Create tsconfig.json**: Use standard ESM config
3. **Fix imports**: Replace all require() with import
4. **Use shared lib**: Import findProjectRoot, never define inline

## Shared Lib Import Paths

**Core skills** (.claude/skills/my-skill/scripts/src/):
```typescript
import { findProjectRoot } from '../../../../lib/find-project-root.js';
// 4 levels: src → scripts → my-skill → skills → .claude
```

**Library skills** (.claude/skill-library/claude/skills/my-skill/scripts/src/):
```typescript
import { findProjectRoot } from '../../../../../lib/find-project-root.js';
// 5 levels to skill-library/lib (which re-exports from .claude/lib)
```

## Related Phases

- [Phase 6: Script Organization](phase-06-script-organization.md) - Where scripts go
- npm-workspace-pattern (claude-skill-write) - Complete TypeScript setup guide

## Quick Reference

| Issue | Auto-Fix | Tool |
|-------|----------|------|
| Missing package.json | ✅ | script-paths CLI |
| Missing tsconfig | ✅ | script-paths CLI |
| Inline findProjectRoot | ✅ | script-paths CLI |
| require() calls | ✅ | script-paths CLI |
| Wrong import depth | ✅ | script-paths CLI |
