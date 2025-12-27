# Complete Patterns Reference

Complete provider and consumer package patterns for TypeScript npm workspaces.

## Provider Package (being imported)

### package.json

```json
{
  "name": "@org/shared-lib",
  "version": "1.0.0",
  "description": "Shared library for workspace consumers",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    },
    "./lib/schemas": {
      "types": "./dist/lib/schemas.d.ts",
      "import": "./dist/lib/schemas.js",
      "default": "./dist/lib/schemas.js"
    },
    "./lib/table-formatter": {
      "types": "./dist/lib/table-formatter.d.ts",
      "import": "./dist/lib/table-formatter.js",
      "default": "./dist/lib/table-formatter.js"
    },
    "./lib/utils": {
      "types": "./dist/lib/utils.d.ts",
      "import": "./dist/lib/utils.js",
      "default": "./dist/lib/utils.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

**Key points:**
- `type: "module"` for ESM
- `main` and `types` point to dist/
- `exports` field with subpath exports
- `types` MUST come first in each export condition

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Key points:**
- `moduleResolution: "bundler"` for tsx/modern tooling
- `declaration: true` to generate .d.ts files
- `declarationMap: true` for IDE navigation

### src/index.ts (Barrel Export)

```typescript
/**
 * @org/shared-lib
 *
 * Barrel export re-exporting all public APIs.
 */

// Re-export from table-formatter (core types and functions)
export {
  type Severity,
  type Source,
  type Finding,
  type FindingCounts,
  formatFindingsTable,
  formatCompletionMessage,
  countFindings,
} from './lib/table-formatter.js';

// Re-export from schemas (JSON validation and conversion)
export {
  type SemanticCriterion,
  type SemanticFinding,
  type SemanticFindingsJson,
  validateSemanticFindings,
  semanticFindingsToFindings,
} from './lib/schemas.js';

// Re-export from utils
export { findRepoRoot, getClaudeDir } from './lib/utils.js';
```

**Key points:**
- Use `.js` extension in imports (TypeScript resolves to .ts)
- Export types with `type` keyword for clarity
- Re-export everything consumers might need

## Consumer Package (importing)

### package.json

```json
{
  "name": "@org/consumer",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "tsx src/main.ts",
    "build": "tsc"
  },
  "dependencies": {
    "@org/shared-lib": "*"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
```

**Key points:**
- `"@org/shared-lib": "*"` uses local workspace version
- The `*` tells npm to use whatever version is available locally

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Key points:**
- `moduleResolution: "bundler"` must match provider
- `noEmit: true` if only running with tsx (not building)

### src/main.ts (Consumer Code)

```typescript
// Import from barrel (all exports from one place)
import {
  formatFindingsTable,
  countFindings,
  formatCompletionMessage,
  validateSemanticFindings,
  type Finding,
  type SemanticFindingsJson,
} from '@org/shared-lib';

// Or import from subpath (specific module)
import {
  formatFindingsTable,
  type Finding,
} from '@org/shared-lib/lib/table-formatter';

import {
  validateSemanticFindings,
  semanticFindingsToFindings,
  type SemanticFindingsJson,
} from '@org/shared-lib/lib/schemas';

// Usage
const findings: Finding[] = [...];
console.log(formatFindingsTable(findings));
```

**Key points:**
- Named imports, NOT namespace imports
- Can use barrel or subpath imports
- Types imported with `type` keyword

## Root Workspace Configuration

### Root package.json

```json
{
  "name": "@org/monorepo",
  "private": true,
  "type": "module",
  "workspaces": [
    "packages/*",
    "tools/*"
  ],
  "scripts": {
    "build": "npm run build -ws --if-present",
    "build:shared": "npm run build -w @org/shared-lib",
    "test": "npm run test -ws --if-present"
  },
  "devDependencies": {
    "tsx": "^4.20.6",
    "typescript": "^5.3.3"
  }
}
```

**Key points:**
- `workspaces` array defines package locations
- `-w @org/package` runs command in specific workspace
- `-ws` runs command across all workspaces

## Real-World Example: Chariot Skill Library

From today's refactoring of `@chariot/auditing-skills` and `@chariot/formatting-skill-output`:

**Before (anti-pattern):**
```typescript
import * as formatter from '../../../formatting-skill-output/scripts/src/lib/table-formatter.js';
import * as schemas from '../../../formatting-skill-output/scripts/src/lib/schemas.js';
type Finding = formatter.Finding;
```

**After (correct pattern):**
```typescript
import {
  formatFindingsTable,
  countFindings,
  formatCompletionMessage,
  type Finding,
} from '@chariot/formatting-skill-output/lib/table-formatter';

import {
  validateSemanticFindings,
  semanticFindingsToFindings,
  type SemanticFindingsJson,
} from '@chariot/formatting-skill-output/lib/schemas';
```
