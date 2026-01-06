---
name: avoiding-barrel-files
description: Use when organizing TypeScript imports, reviewing index.ts files, or investigating bundle size issues - covers barrel file anti-patterns, tree-shaking failures, and import optimization strategies
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Avoiding Barrel Files

**Import optimization patterns for TypeScript projects to maintain tree-shaking and minimize bundle sizes.**

## The Problem

Barrel files (`index.ts` with `export *` re-exports) break tree-shaking and inflate bundle sizes:

- **400KB reduction** documented by removing a single barrel file
- **Tree-shaking fails** - importing one component loads ALL components
- **Bundle bloat** - users download unused code
- **Build times increase** - bundler processes unnecessary modules

**Impact:** Production bundles include dead code, users experience slower page loads, hosting costs increase unnecessarily.

## When to Use This Skill

Use this skill when:

- Organizing TypeScript module exports
- Reviewing `index.ts` files in components, utils, or lib directories
- Investigating why bundle sizes are larger than expected
- Debugging tree-shaking failures in production builds
- Setting up new TypeScript projects or libraries

**You MUST use TodoWrite** before starting if refactoring multiple barrel files across a codebase.

## Quick Reference

| Pattern                       | Bundle Impact        | When to Apply                        |
| ----------------------------- | -------------------- | ------------------------------------ |
| Direct imports                | 0% overhead          | Always (application code)            |
| Granular package.json exports | 0% overhead          | Libraries with multiple entry points |
| sideEffects: false            | Enables tree-shaking | npm packages                         |
| Type-only barrel imports      | 0% overhead          | Type definitions only                |

**Core principle:** Import directly from source files, not from barrel re-exports.

## Anti-Pattern: Barrel Export Files

### What is a Barrel File?

An `index.ts` file that re-exports everything from sibling modules:

```typescript
// ❌ BAD: src/components/index.ts (barrel file)
export * from "./Button";
export * from "./Input";
export * from "./Modal";
export * from "./Dropdown";
export * from "./Table";
// 50+ more components...
```

### Why It's Broken

When you import ONE component through the barrel:

```typescript
// This looks clean...
import { Button } from "./components";
```

**But bundlers see this as:**

```typescript
// Import EVERYTHING, then extract Button
import * as components from "./components";
const Button = components.Button;

// Which means loading:
import { Button } from "./components/Button";
import { Input } from "./components/Input"; // UNUSED
import { Modal } from "./components/Modal"; // UNUSED
import { Dropdown } from "./components/Dropdown"; // UNUSED
import { Table } from "./components/Table"; // UNUSED
// + 45 more unused components
```

**Result:** Your 5KB button component pulls in 400KB of unused components.

## Solution 1: Direct Imports (Recommended)

Import directly from source files, bypassing barrel files entirely:

```typescript
// ✅ GOOD: Import directly from source
import { Button } from "./components/Button";
import { Input } from "./components/Input";

// NOT from barrel:
// ❌ import { Button, Input } from './components';
```

**Advantages:**

- Tree-shaking works perfectly
- No unused code in bundle
- Explicit dependencies
- Clear import sources

**When to use:** Always, for application code.

## Solution 2: Granular package.json Exports

For npm packages, define explicit entry points in `package.json`:

```json
{
  "name": "@mycompany/ui",
  "exports": {
    "./button": "./src/components/Button.ts",
    "./input": "./src/components/Input.ts",
    "./modal": "./src/components/Modal.ts"
  }
}
```

**Usage:**

```typescript
// Consumers import with explicit paths
import { Button } from "@mycompany/ui/button";
import { Input } from "@mycompany/ui/input";
```

**Advantages:**

- Tree-shaking works
- Controlled public API
- Gradual deprecation possible

**See:** [references/package-exports.md](references/package-exports.md) for complete configuration.

## Solution 3: sideEffects Flag

Tell bundlers your package has no side effects:

```json
{
  "name": "@mycompany/ui",
  "sideEffects": false
}
```

Or specify which files have side effects:

```json
{
  "sideEffects": ["**/*.css", "**/*.scss", "./src/polyfills.ts"]
}
```

**What this enables:**

- Bundlers can safely remove unused exports
- Dead code elimination works across module boundaries
- Tree-shaking becomes more aggressive

**See:** [references/side-effects.md](references/side-effects.md) for details.

## When Barrel Files Are Acceptable

Barrel files don't always cause problems. They're acceptable when:

### 1. Application Code (You Own the Graph)

```typescript
// Acceptable: Internal app barrels
// src/app/features/user/index.ts
export { UserProfile } from "./UserProfile";
export { UserSettings } from "./UserSettings";
```

**Why it's OK:** You control the entire dependency graph. If the app imports UserProfile, it probably needs UserSettings too.

### 2. Type-Only Exports

```typescript
// Acceptable: Type-only barrel
// src/types/index.ts
export type { User } from "./User";
export type { Post } from "./Post";
export type { Comment } from "./Comment";
```

**Why it's OK:** Types are erased at runtime, no bundle impact.

### 3. Internal Packages (Tree-shaking Doesn't Matter)

```typescript
// Acceptable: Internal tool that isn't published
// packages/test-utils/index.ts
export * from "./mocks";
export * from "./fixtures";
```

**Why it's OK:** Not shipped to production, bundle size irrelevant.

## Detection and Refactoring

### Find Barrel Files

```bash
# Find all index.ts files with wildcard exports
find . -name 'index.ts' -exec grep -l 'export \*' {} \;

# Check specific directory
grep -r "export \*" src/components/
```

### Refactoring Strategy

1. **Identify barrel files** - Use detection commands above
2. **Find usages** - Search for imports from barrel directories
3. **Replace imports** - Update to direct imports
4. **Remove barrel** - Delete index.ts files
5. **Verify build** - Ensure bundle size decreased

**See:** [references/refactoring-barrels.md](references/refactoring-barrels.md) for step-by-step guide.

## Bundle Size Impact

Real-world measurements from production refactors:

| Project Type      | Before (barrel) | After (direct) | Reduction |
| ----------------- | --------------- | -------------- | --------- |
| Component library | 485 KB          | 85 KB          | 82%       |
| Utility package   | 120 KB          | 12 KB          | 90%       |
| React application | 2.4 MB          | 2.0 MB         | 17%       |

**Key finding:** Libraries see the biggest impact because they're imported partially.

## Common Misconceptions

| Misconception                       | Reality                                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| "Barrels make imports cleaner"      | Bundle size > import aesthetics. Direct imports are more explicit anyway.                             |
| "Tree-shaking will handle it"       | Tree-shaking CAN'T eliminate barrel imports because bundlers can't prove exports are side-effect-free |
| "It's only a problem for libraries" | Applications suffer too - slower builds, larger bundles, worse performance                            |
| "Named exports avoid the problem"   | `export { A, B, C }` from barrels still breaks tree-shaking                                           |
| "I'll optimize later"               | Barrel patterns spread quickly. Fix early before they multiply.                                       |

## Progressive Disclosure

**This file (<500 lines)** provides core patterns and decision-making guidance.

**For detailed implementation:**

- [references/package-exports.md](references/package-exports.md) - package.json configuration
- [references/side-effects.md](references/side-effects.md) - sideEffects flag usage
- [references/refactoring-barrels.md](references/refactoring-barrels.md) - Step-by-step refactoring
- [references/vite-rollup-config.md](references/vite-rollup-config.md) - Bundler configuration
- [examples/component-library-refactor.md](examples/component-library-refactor.md) - Real case study

## Related Skills

| Skill                            | Access Method                                                             | Purpose                                  |
| -------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------- |
| **optimizing-react-performance** | `Read(".claude/skill-library/.../optimizing-react-performance/SKILL.md")` | General bundle optimization strategies   |
| **using-eslint**                 | `Read(".claude/skill-library/.../using-eslint/SKILL.md")`                 | Configure lint rules for import patterns |
| **frontend-architecture**        | `Read(".claude/skill-library/.../frontend-architecture/SKILL.md")`        | Module organization and structure        |

## References

- **Burn the Barrel** - uglow.medium.com/burn-the-barrel-files-2955e6fd32e9
- **A Practical Guide Against Barrel Files** - dev.to/thepassle/a-practical-guide-against-barrel-files-3gid
- **Next.js Bundle Size Improvements** - catchmetrics.io/blog/nextjs-bundle-size-improvements

## Changelog

For historical changes, see [`.history/CHANGELOG`](.history/CHANGELOG).
