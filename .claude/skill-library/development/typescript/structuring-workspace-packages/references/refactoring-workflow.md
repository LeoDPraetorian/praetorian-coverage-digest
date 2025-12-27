# Refactoring Workflow

Step-by-step guide for migrating from relative imports to proper workspace dependencies.

## Prerequisites

- npm workspace monorepo structure
- TypeScript packages with `type: "module"`
- tsx or similar TypeScript runner

## Step 1: Update Provider package.json

Add exports field with all subpath exports:

```json
{
  "name": "@org/provider",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    },
    "./lib/module-name": {
      "types": "./dist/lib/module-name.d.ts",
      "import": "./dist/lib/module-name.js",
      "default": "./dist/lib/module-name.js"
    }
  }
}
```

**Critical**: `types` MUST come first in each export condition.

## Step 2: Create Barrel Export

Create `src/index.ts` in provider package:

```typescript
// Re-export all public APIs
export {
  functionA,
  functionB,
  type TypeA,
  type TypeB,
} from './lib/module-a.js';

export {
  functionC,
  type TypeC,
} from './lib/module-b.js';
```

## Step 3: Add Workspace Dependency

In consumer package.json:

```json
{
  "dependencies": {
    "@org/provider": "*"
  }
}
```

The `*` tells npm to use the local workspace version.

## Step 4: Run npm install

From workspace root:

```bash
cd /path/to/workspace/root
npm install
```

Verify symlink was created:

```bash
ls -la node_modules/@org/
# Should show: provider -> ../../packages/provider
```

## Step 5: Update Consumer Imports

Replace relative paths with package imports:

**Before:**
```typescript
import * as utils from '../../../provider/scripts/src/lib/utils.js';
type MyType = utils.MyType;
utils.doSomething();
```

**After:**
```typescript
import {
  doSomething,
  type MyType,
} from '@org/provider/lib/utils';
```

## Step 6: Update tsconfig Settings

Both packages need `moduleResolution: "bundler"`:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

Provider also needs declaration generation:

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true
  }
}
```

## Step 7: Build Provider Package

```bash
npm run -w @org/provider build
```

Verify dist/ contains:
- `index.js` and `index.d.ts`
- `lib/*.js` and `lib/*.d.ts` for each module

## Step 8: Verify Functionality

Run consumer to verify imports resolve:

```bash
npm run -w @org/consumer start
```

Run tests:

```bash
npm run -w @org/consumer test
```

## Verification Checklist

- [ ] Provider package.json has `exports` field
- [ ] `types` condition is first in each export
- [ ] Barrel export (index.ts) created
- [ ] Consumer has workspace dependency with `*` version
- [ ] Both tsconfigs use `moduleResolution: "bundler"`
- [ ] Provider has `declaration: true`
- [ ] Provider built (dist/ exists)
- [ ] Consumer imports use package names
- [ ] Consumer imports use named exports (not namespace)
- [ ] All tests pass
- [ ] CLI tools work correctly

## Rollback Plan

If migration fails:

1. Revert package.json changes
2. Revert tsconfig.json changes
3. Revert import statements
4. Run `npm install` to restore original state
5. Delete dist/ if created

Keep original files in git until migration is verified.
