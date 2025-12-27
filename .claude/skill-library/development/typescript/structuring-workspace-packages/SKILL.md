---
name: structuring-workspace-packages
description: Use when creating or refactoring TypeScript packages in npm workspaces - enforces proper exports, workspace dependencies, named imports, and bundler moduleResolution to prevent runtime failures
allowed-tools: Read, Edit, Write, Bash, Grep, Glob, TodoWrite
---

# Structuring TypeScript Workspace Packages

Enforce correct patterns for cross-package imports in npm workspace monorepos to prevent runtime module resolution failures.

## Quick Reference

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Relative path imports | Breaks when files move | Workspace dependencies |
| Namespace imports | CJS interop issues | Named imports |
| Missing exports field | Can't use subpath imports | Add exports to package.json |
| moduleResolution: "node" | Doesn't understand exports | Use "bundler" for tsx |

**For complete patterns and examples, see [references/complete-patterns.md](references/complete-patterns.md)**

## When to Use This Skill

Use this skill when:

- Creating new TypeScript packages in an npm workspace
- Refactoring packages to use proper workspace dependencies
- Debugging "does not provide an export" errors
- Setting up cross-package imports
- Converting relative imports to package imports

**You MUST use TodoWrite before starting to track all refactoring steps.**

## Critical Rules

1. **Provider packages MUST have exports field** with subpath exports
2. **Types MUST come first** in each export condition
3. **Build provider before run** - dist/ files must exist
4. **Use named imports**, never namespace imports
5. **moduleResolution: "bundler"** for tsx/modern tooling

## Common Anti-Patterns

### ❌ Relative Path Imports

```typescript
// WRONG: Fragile, breaks when files move
import * as formatter from '../../../other-package/scripts/src/lib/formatter.js';

// RIGHT: Uses workspace dependency
import { formatTable } from '@org/other-package/lib/formatter';
```

### ❌ Namespace Imports

```typescript
// WRONG: CJS interop issues, poor tree-shaking
import * as schemas from '@org/package/lib/schemas';
schemas.validate(data);

// RIGHT: Named imports
import { validate } from '@org/package/lib/schemas';
validate(data);
```

### ❌ Missing Package Exports

```json
// WRONG: No subpath exports
{
  "name": "@org/package",
  "main": "./dist/index.js"
}

// RIGHT: Explicit subpath exports
{
  "name": "@org/package",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./lib/schemas": {
      "types": "./dist/lib/schemas.d.ts",
      "import": "./dist/lib/schemas.js"
    }
  }
}
```

## Refactoring Checklist

**You MUST use TodoWrite to track all steps.**

When fixing existing code with anti-patterns:

1. **Update provider package.json**
   - Add `exports` field with all subpath exports
   - Ensure `types` comes FIRST in each export condition
   - Update `main` and `types` to point to dist/

2. **Create barrel export** (provider)
   - Create `src/index.ts` re-exporting all public APIs
   - Use `export { name } from './path.js'` syntax

3. **Add workspace dependency** (consumer)
   - In consumer package.json: `"@org/provider": "*"`
   - The `*` tells npm to use local workspace version

4. **Run npm install**
   - Creates symlinks in root node_modules
   - Verify: `ls -la node_modules/@org/`

5. **Update imports in consumer**
   - Replace relative paths with package imports
   - Replace namespace imports with named imports
   - Remove type aliases (import types directly)

6. **Align tsconfig settings**
   - Both packages: `"moduleResolution": "bundler"`
   - Provider: `"declaration": true`

7. **Build provider package**
   - Run `npm run build` in provider
   - Verify dist/ contains .js and .d.ts files

8. **Verify functionality**
   - Run consumer CLI/tests
   - Check for runtime import errors

**For complete step-by-step workflow, see [references/refactoring-workflow.md](references/refactoring-workflow.md)**

## Common Errors

### "does not provide an export named 'X'"

**Cause**: Exports field points to dist/ but dist/ doesn't exist.

**Solution**: Build the provider package first:
```bash
npm run -w @org/provider build
```

### "Cannot find module '@org/package/lib/foo'"

**Cause**: Missing subpath export in package.json exports field.

**Solution**: Add the subpath to exports:
```json
{
  "exports": {
    "./lib/foo": {
      "types": "./dist/lib/foo.d.ts",
      "import": "./dist/lib/foo.js"
    }
  }
}
```

### Types not resolving in IDE

**Cause**: `types` condition not first in exports, or declaration files not generated.

**Solution**:
1. Ensure `"types"` is FIRST in each export condition
2. Ensure `"declaration": true` in provider tsconfig
3. Rebuild: `npm run build`

**For complete error catalog, see [references/common-errors.md](references/common-errors.md)**

## Key Principles

1. **Types first**: In exports conditions, `types` must come before `import`
2. **Build before run**: Provider must be built for dist/ exports to resolve
3. **Named over namespace**: Always prefer `import { x }` over `import * as`
4. **Explicit exports**: Every importable path needs an exports entry
5. **Bundler resolution**: Use `moduleResolution: "bundler"` for modern tooling

## Related Skills

- **developing-with-tdd**: Test-first development methodology
- **debugging-systematically**: When imports fail at runtime
- **verifying-before-completion**: Verify builds and tests pass

## References

- [Complete Patterns Reference](references/complete-patterns.md) - Full provider/consumer patterns with code examples
- [Refactoring Workflow](references/refactoring-workflow.md) - Step-by-step migration guide
- [Common Errors](references/common-errors.md) - Error messages and solutions
- [Package Structure](references/package-structure.md) - Directory layout and file organization
