# Common Errors

Error messages, root causes, and solutions for TypeScript workspace package issues.

## Module Resolution Errors

### "does not provide an export named 'X'"

```
SyntaxError: The requested module '@org/package/lib/module' does not provide an export named 'functionName'
```

**Root Cause**: The exports field points to dist/ files, but dist/ doesn't exist (package not built).

**Solution**:
```bash
# Build the provider package first
npm run -w @org/provider build

# Verify dist/ was created
ls -la node_modules/@org/provider/dist/
```

**Prevention**: Always build provider packages before running consumers.

---

### "Cannot find module '@org/package/lib/foo'"

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '@org/package/lib/foo'
```

**Root Cause**: Missing subpath export in provider's package.json exports field.

**Solution**: Add the missing subpath to exports:

```json
{
  "exports": {
    "./lib/foo": {
      "types": "./dist/lib/foo.d.ts",
      "import": "./dist/lib/foo.js",
      "default": "./dist/lib/foo.js"
    }
  }
}
```

**Prevention**: Add exports for every path consumers need to import.

---

### "Cannot find package '@org/package'"

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@org/package'
```

**Root Cause**:
1. Workspace dependency not added to consumer's package.json, OR
2. npm install not run after adding dependency

**Solution**:
```bash
# Add dependency to consumer package.json
# "dependencies": { "@org/package": "*" }

# Run npm install from workspace root
npm install

# Verify symlink exists
ls -la node_modules/@org/
```

---

## TypeScript Type Errors

### "Cannot find type definition file"

```
error TS2688: Cannot find type definition file for '@org/package'
```

**Root Cause**:
1. `types` condition missing or not first in exports, OR
2. `declaration: true` not set in provider tsconfig

**Solution**:

1. Ensure `types` is FIRST in each export condition:
```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",  // MUST be first
      "import": "./dist/index.js"
    }
  }
}
```

2. Ensure provider generates declarations:
```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true
  }
}
```

3. Rebuild provider:
```bash
npm run -w @org/provider build
```

---

### "Module has no exported member 'X'"

```
error TS2305: Module '@org/package' has no exported member 'functionName'
```

**Root Cause**:
1. Function/type not exported from barrel file (index.ts), OR
2. Using namespace import but trying to access named export

**Solution**:

1. Check barrel export includes the member:
```typescript
// src/index.ts
export { functionName } from './lib/module.js';
```

2. If using namespace import, change to named import:
```typescript
// WRONG
import * as pkg from '@org/package';
pkg.functionName();  // May fail

// RIGHT
import { functionName } from '@org/package';
functionName();
```

---

### Types not showing in IDE / IntelliSense not working

**Root Cause**:
1. `types` condition not first in exports
2. Declaration files not generated
3. IDE cache stale

**Solution**:
1. Verify exports field order (types first)
2. Rebuild provider: `npm run -w @org/provider build`
3. Restart TypeScript server: In VS Code, Cmd+Shift+P → "TypeScript: Restart TS Server"

---

## Runtime Errors

### "Unexpected token 'export'"

```
SyntaxError: Unexpected token 'export'
```

**Root Cause**: Running ESM code without proper module configuration.

**Solution**: Ensure both packages have:
```json
{
  "type": "module"
}
```

---

### "require() of ES Module not supported"

```
Error [ERR_REQUIRE_ESM]: require() of ES Module not supported
```

**Root Cause**: Trying to use CommonJS require() on an ESM package.

**Solution**:
1. Use import instead of require
2. Ensure consumer has `"type": "module"`
3. Use tsx or similar ESM-aware runner

---

## Build Errors

### "rootDir expected to contain all source files"

```
error TS6059: File '/path/to/file.ts' is not under 'rootDir'
```

**Root Cause**: TypeScript trying to compile files outside rootDir.

**Solution**: Ensure imports don't reach outside the package:
```json
{
  "compilerOptions": {
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

If you need files from another package, use workspace dependency instead of relative imports.

---

### "Declaration file not generated for imported module"

**Root Cause**: Importing from source files (`.ts`) instead of built output.

**Solution**:
1. Import from package name, not relative path
2. Build provider before building consumer
3. Use `skipLibCheck: true` in consumer tsconfig

---

## Quick Diagnostic Commands

```bash
# Check if package is linked
ls -la node_modules/@org/

# Check exports field
cat node_modules/@org/package/package.json | jq '.exports'

# Check if dist exists
ls node_modules/@org/package/dist/

# Verify TypeScript sees the types
npx tsc --traceResolution 2>&1 | grep '@org/package'

# Clean rebuild
rm -rf node_modules/@org/package/dist
npm run -w @org/package build
```
