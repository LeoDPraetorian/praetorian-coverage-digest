# Phase 9: Non-TypeScript Script Migration

## What It Checks

- Detects ALL non-TypeScript scripts in skill directories
- Shell scripts (.sh, .bash, .zsh, .fish)
- Python scripts (.py)
- Ruby scripts (.rb)
- Perl scripts (.pl, .pm)
- PHP scripts (.php)
- JavaScript files (.js, .mjs, .cjs)

## Why It Matters

**Three key reasons for TypeScript standardization:**

1. **Cross-platform compatibility**: Shell scripts don't work on Windows without WSL
2. **Testing infrastructure**: vitest/jest set up for TypeScript, not pytest/rspec/etc.
3. **Consistency**: Standardize on TypeScript for all skill tooling

**This is a WARNING-level issue, not INFO.**

## Detection Patterns

### WARNING Issues

**1. Shell Scripts Detected**
```
Shell (2): Not cross-platform (Windows incompatible)
  → scripts/validate.sh
  → scripts/setup.sh
```

**2. Python Scripts Detected**
```
Python (1): No testing infrastructure (use vitest instead of pytest)
  → scripts/analyze.py
```

**3. JavaScript Files Detected**
```
JavaScript (3): Use TypeScript for type safety
  → scripts/helper.js
  → lib/utils.mjs
  → config.cjs
```

**4. Other Scripting Languages**
```
Ruby (1): No testing infrastructure
  → scripts/process.rb

Perl (1): No testing infrastructure
  → scripts/parser.pl

PHP (1): No testing infrastructure
  → scripts/generate.php
```

## Auto-Fix Capability

❌ **NOT auto-fixable** - requires migration planning

**Why**: Translating scripts → TypeScript requires:
- Understanding script purpose
- Choosing appropriate libraries
- Rewriting logic (not 1:1 translation)
- Testing migration

**Solution**: Manual migration following npm-workspace-pattern.

## Script Type Rationale

| Language | Extensions | Issue | Migration Priority |
|----------|------------|-------|-------------------|
| Shell | .sh, .bash, .zsh, .fish | Not cross-platform | HIGH |
| Python | .py | No vitest testing | HIGH |
| JavaScript | .js, .mjs, .cjs | No type safety | MEDIUM |
| Ruby | .rb | No testing infra | HIGH |
| Perl | .pl, .pm | No testing infra | HIGH |
| PHP | .php | No testing infra | HIGH |

## Examples

### Example 1: Python Script → TypeScript

**Before (Python):**
```python
#!/usr/bin/env python3
import json
import sys

with open(sys.argv[1]) as f:
    data = json.load(f)

for item in data['skills']:
    if item['type'] == 'reasoning':
        print(item['name'])
```

**After (TypeScript):**
```typescript
import { readFileSync } from 'fs';

interface SkillData {
  skills: Array<{ name: string; type: string }>;
}

const data: SkillData = JSON.parse(readFileSync(process.argv[2], 'utf-8'));

for (const item of data.skills) {
  if (item.type === 'reasoning') {
    console.log(item.name);
  }
}
```

**Benefits:**
- Type safety (SkillData interface)
- Same testing framework (vitest)
- IDE autocompletion

### Example 2: Shell Script Complexity Analysis

For shell scripts, the audit also analyzes migration effort:

```
Shell (3): Not cross-platform (Windows incompatible)
  → scripts/validate.sh
  → scripts/setup.sh
  → scripts/deploy.sh
Shell migration effort - Simple (1): scripts/validate.sh
Shell migration effort - Moderate (1): scripts/setup.sh
Shell migration effort - Complex (1): scripts/deploy.sh
```

**Complexity criteria:**
- Simple: <30 lines, no pipes
- Moderate: 30-100 lines OR has pipes
- Complex: >100 lines OR uses pipes + git + npm

### Example 3: JavaScript → TypeScript

**Before (JavaScript):**
```javascript
// helper.js
export function validateSkill(skill) {
  return skill.name && skill.description;
}
```

**After (TypeScript):**
```typescript
// helper.ts
interface Skill {
  name: string;
  description: string;
}

export function validateSkill(skill: Skill): boolean {
  return Boolean(skill.name && skill.description);
}
```

## Migration Workflow

1. **Identify scripts**:
   ```bash
   npm run audit -- <skill-name> --verbose | grep "Phase 9"
   ```

2. **Prioritize by type**:
   - Shell scripts first (cross-platform)
   - Python second (testing)
   - JavaScript third (type safety)

3. **Set up TypeScript**:
   - Follow npm-workspace-pattern.md
   - Add package.json, tsconfig.json
   - Configure vitest

4. **Migrate logic**:
   - Translate to TypeScript
   - Add type definitions
   - Replace language-specific libraries with npm equivalents

5. **Test parity**:
   - Same inputs → same outputs
   - Run vitest tests

6. **Delete original scripts**

## Edge Cases

**1. Build/CI Scripts**

Some shell scripts may be required for CI/CD:
```bash
# .github/scripts/deploy.sh - may need to stay as shell
```
Consider wrapping in TypeScript CLI that calls shell when necessary.

**2. One-liner Shell Commands**

Very simple shell commands (<10 lines, no logic) can remain:
```bash
#!/bin/bash
npm run build && npm run test
```
But still flagged as WARNING for awareness.

**3. Generated JavaScript**

Compiled `.js` files in `dist/` are excluded (node_modules, .git, dist, .local skipped).

## Related Phases

- [Phase 8: TypeScript Structure](phase-08-typescript-structure.md) - TypeScript project setup requirements
- npm-workspace-pattern.md - Complete migration guide with Commander.js + tsx

## Quick Reference

| Script Type | Severity | Reason |
|-------------|----------|--------|
| Shell (.sh) | ⚠️ WARNING | Not cross-platform |
| Python (.py) | ⚠️ WARNING | No vitest testing |
| JavaScript (.js) | ⚠️ WARNING | No type safety |
| Ruby (.rb) | ⚠️ WARNING | No testing infra |
| Perl (.pl) | ⚠️ WARNING | No testing infra |
| PHP (.php) | ⚠️ WARNING | No testing infra |
| TypeScript (.ts) | ✅ OK | Standard |
