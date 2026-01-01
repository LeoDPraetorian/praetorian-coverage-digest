# Convention Analysis

How to identify and document naming conventions, directory structures, and patterns.

## Naming Convention Analysis

### File Naming Conventions

**Discovery method:**

```bash
# List files and look for patterns
ls -1 {TARGET_PATH}/pkg/ | head -20
ls -1 {TARGET_PATH}/src/components/ | head -20
```

**Common patterns:**

| Convention   | Examples                               | Typical Usage        |
| ------------ | -------------------------------------- | -------------------- |
| kebab-case   | `asset-service.go`, `user-profile.tsx` | Go packages, React   |
| snake_case   | `asset_service.py`, `test_utils.py`    | Python               |
| PascalCase   | `AssetService.cs`, `UserProfile.tsx`   | C#, React components |
| camelCase    | `assetService.ts`, `userProfile.ts`    | TypeScript           |
| dot-notation | `asset.service.ts`, `user.model.ts`    | Angular, NestJS      |

**Documentation example:**

```markdown
### File Naming Conventions

- **Go packages:** snake_case (e.g., `asset_repository.go`)
- **React components:** PascalCase (e.g., `AssetList.tsx`)
- **Test files:** `*_test.go`, `*.test.tsx`
- **Utilities:** kebab-case (e.g., `format-date.ts`)
```

### Function/Method Naming

**Discovery method:**

```bash
# Go functions
grep -rn '^func [A-Z]' {TARGET_PATH} --include='*.go' | head -20

# JavaScript/TypeScript functions
grep -rn 'export function' {TARGET_PATH} --include='*.ts' | head -20

# Python functions
grep -rn '^def ' {TARGET_PATH} --include='*.py' | head -20
```

**Common patterns:**

| Convention         | Examples                              | Typical Usage         |
| ------------------ | ------------------------------------- | --------------------- |
| camelCase          | `getAssets()`, `createUser()`         | JavaScript/TypeScript |
| PascalCase         | `GetAssets()`, `CreateUser()`         | Go (exported)         |
| lowercase          | `getAssets()`, `createUser()`         | Go (unexported)       |
| snake_case         | `get_assets()`, `create_user()`       | Python                |
| Verb + Noun        | `fetchAssets()`, `updateUser()`       | Most languages        |
| Handler suffix     | `AssetHandler()`, `GetAssetHandler()` | Go HTTP/Lambda        |
| Service suffix     | `AssetService()`, `UserService()`     | Service layer         |
| use + PascalCase   | `useAssets()`, `useAuth()`            | React hooks           |
| with + PascalCase  | `withAuth()`, `withLogging()`         | HOCs, middleware      |
| is/has + Adjective | `isLoading`, `hasError`, `canEdit`    | Boolean functions     |

**Documentation example:**

```markdown
### Function Naming Conventions

- **Exported functions:** PascalCase (e.g., `GetAssets()`, `CreateUser()`)
- **Internal functions:** camelCase (e.g., `parseRequest()`, `validateInput()`)
- **Handlers:** `{Entity}Handler` (e.g., `AssetHandler`, `UserHandler`)
- **React hooks:** `use{Purpose}` (e.g., `useAssets`, `useAuth`)
- **Pattern:** Verb + Noun (e.g., `fetchAssets`, `updateUser`)
```

### Type/Interface Naming

**Discovery method:**

```bash
# Go types
grep -rn '^type [A-Z].*struct\|^type [A-Z].*interface' {TARGET_PATH} --include='*.go' | head -20

# TypeScript interfaces
grep -rn '^interface\|^type.*=' {TARGET_PATH} --include='*.ts' | head -20

# Python classes
grep -rn '^class [A-Z]' {TARGET_PATH} --include='*.py' | head -20
```

**Common patterns:**

| Convention        | Examples                                | Typical Usage         |
| ----------------- | --------------------------------------- | --------------------- |
| PascalCase        | `Asset`, `User`, `ScanJob`              | Most languages        |
| Interface prefix  | `IAsset`, `IRepository`                 | C#, older TypeScript  |
| Props suffix      | `AssetListProps`, `UserCardProps`       | React component props |
| State suffix      | `AssetState`, `AuthState`               | State types           |
| Repository suffix | `AssetRepository`, `UserRepo`           | Data access layer     |
| Service suffix    | `AssetService`, `ScanService`           | Service layer         |
| Error suffix      | `AssetNotFoundError`, `AuthError`       | Custom errors         |
| Request/Response  | `CreateAssetRequest`, `GetUserResponse` | API types             |
| Config suffix     | `AssetConfig`, `DatabaseConfig`         | Configuration types   |

**Documentation example:**

```markdown
### Type/Interface Naming Conventions

- **Entities:** PascalCase noun (e.g., `Asset`, `User`, `Risk`)
- **Props:** `{Component}Props` (e.g., `AssetListProps`)
- **State:** `{Domain}State` (e.g., `AssetState`, `AuthState`)
- **Repositories:** `{Entity}Repository` (e.g., `AssetRepository`)
- **Services:** `{Entity}Service` (e.g., `AssetService`)
- **Errors:** `{Entity}{Condition}Error` (e.g., `AssetNotFoundError`)
```

## Directory Structure Analysis

### Common Go Project Structure

```
{TARGET_PATH}/
├── cmd/                    # Entry points (binaries)
│   ├── server/
│   └── cli/
├── pkg/                    # Public packages (importable)
│   ├── asset/
│   ├── auth/
│   └── util/
├── internal/               # Private packages (not importable)
│   ├── handler/
│   ├── service/
│   └── repository/
├── api/                    # API definitions (proto, OpenAPI)
├── deployments/            # Deployment configs (SAM, Terraform)
├── scripts/                # Build and deployment scripts
├── tests/                  # Integration/acceptance tests
└── go.mod
```

**Key observations:**

- `cmd/` → Executables (each subdir is a binary)
- `pkg/` → Reusable packages (can be imported by other projects)
- `internal/` → Private implementation (cannot be imported externally)
- Layered architecture: `handler/ → service/ → repository/`

### Common React/TypeScript Project Structure

```
{TARGET_PATH}/
├── src/
│   ├── components/         # Reusable components
│   │   ├── asset/
│   │   ├── ui/
│   │   └── layout/
│   ├── pages/              # Route components
│   ├── hooks/              # Custom React hooks
│   ├── stores/             # State management (Zustand)
│   ├── api/                # API client functions
│   ├── types/              # TypeScript types
│   ├── utils/              # Utility functions
│   └── App.tsx
├── public/                 # Static assets
├── tests/                  # Unit tests (colocated or separate)
├── e2e/                    # End-to-end tests (Playwright)
├── package.json
└── tsconfig.json
```

**Key observations:**

- Feature-based organization: `components/asset/`, `components/user/`
- Clear separation: components vs pages vs hooks
- State management centralized in `stores/`
- API layer isolated in `api/`

### Common Python Project Structure

```
{TARGET_PATH}/
├── src/
│   ├── {package_name}/
│   │   ├── __init__.py
│   │   ├── handlers/       # Lambda handlers
│   │   ├── services/       # Business logic
│   │   ├── repositories/   # Data access
│   │   ├── models/         # Data models
│   │   └── utils/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── requirements.txt
├── setup.py
└── pyproject.toml
```

**Key observations:**

- Package structure with `__init__.py`
- Layered architecture: handlers → services → repositories
- Test organization: unit vs integration
- Configuration: `requirements.txt` or `pyproject.toml`

### Documenting Directory Structure

**Template:**

```markdown
### Directory Structure

\`\`\`
{TARGET_PATH}/
├── {dir1}/ # {purpose}
│ ├── {subdir1}/ # {purpose}
│ └── {subdir2}/ # {purpose}
├── {dir2}/ # {purpose}
└── {file}
\`\`\`

**Key conventions:**

- **{dir1}/**: {description and usage}
- **{dir2}/**: {description and usage}
- **Pattern**: {organizational pattern used}
```

## Import/Dependency Pattern Analysis

### Go Import Patterns

**Discovery method:**

```bash
grep -rn '^import' {TARGET_PATH} --include='*.go' | head -20
```

**Common patterns:**

- **Standard library first:** `import "fmt"`, `import "context"`
- **Third-party second:** `import "github.com/aws/aws-sdk-go/..."`
- **Internal last:** `import "github.com/org/project/internal/..."`
- **Grouped imports:** Blank lines between groups
- **No relative imports:** Always absolute from module root

**Documentation example:**

```markdown
### Import Conventions

Go imports follow standard grouping:

1. Standard library
2. Third-party packages
3. Internal packages (from this project)

Example:

\`\`\`go
import (
"context"
"fmt"

    "github.com/aws/aws-sdk-go-v2/service/dynamodb"

    "github.com/praetorian-inc/chariot/internal/handler"
    "github.com/praetorian-inc/chariot/pkg/asset"

)
\`\`\`
```

### TypeScript Import Patterns

**Discovery method:**

```bash
grep -rn "^import" {TARGET_PATH} --include='*.ts' --include='*.tsx' | head -20
```

**Common patterns:**

- **Barrel exports:** `export * from './components'`
- **Absolute imports:** `import { Asset } from '@/types/asset'`
- **Type-only imports:** `import type { Asset } from '@/types'`
- **Default vs named:** `import React from 'react'` vs `import { useState } from 'react'`

**Documentation example:**

```markdown
### Import Conventions

TypeScript imports use path aliases:

\`\`\`typescript
// Absolute imports with @ alias
import { AssetList } from '@/components/asset/AssetList'
import { useAssets } from '@/hooks/useAssets'

// Type-only imports (no runtime)
import type { Asset } from '@/types'

// External dependencies
import { useQuery } from '@tanstack/react-query'
\`\`\`
```

## Error Handling Convention Analysis

### Go Error Handling

**Discovery method:**

```bash
# Sentinel errors
grep -rn 'var Err[A-Z]' {TARGET_PATH} --include='*.go' | head -20

# Error wrapping
grep -rn 'fmt.Errorf.*%w' {TARGET_PATH} --include='*.go' | head -20

# Custom error types
grep -rn 'type.*Error struct' {TARGET_PATH} --include='*.go' | head -20
```

**Common patterns:**

| Pattern         | Example                                        | Usage             |
| --------------- | ---------------------------------------------- | ----------------- |
| Sentinel errors | `var ErrNotFound = errors.New("not found")`    | Comparable errors |
| Error wrapping  | `fmt.Errorf("failed: %w", err)`                | Add context       |
| Custom types    | `type ValidationError struct { Field string }` | Rich error data   |
| Error checking  | `if err != nil { return nil, err }`            | Explicit handling |

### TypeScript Error Handling

**Discovery method:**

```bash
# try-catch blocks
grep -rn 'try.*{' {TARGET_PATH} --include='*.ts' | head -20

# Error classes
grep -rn 'class.*Error extends' {TARGET_PATH} --include='*.ts' | head -20
```

**Common patterns:**

| Pattern       | Example                                 | Usage               |
| ------------- | --------------------------------------- | ------------------- |
| Try-catch     | `try { ... } catch (error) { ... }`     | Synchronous errors  |
| Promise catch | `.catch((error) => { ... })`            | Async errors        |
| Custom errors | `class ValidationError extends Error`   | Typed error classes |
| Error guards  | `if (error instanceof ValidationError)` | Type narrowing      |

## Complete Convention Documentation Template

```markdown
## Codebase Conventions: {TARGET_PATH}

### File Naming

- **{Language 1}:** {convention} (examples)
- **{Language 2}:** {convention} (examples)
- **Test files:** {pattern}

### Function Naming

- **Exported functions:** {convention}
- **Internal functions:** {convention}
- **Handlers:** {pattern}
- **Hooks (if React):** {pattern}

### Type/Interface Naming

- **Entities:** {convention}
- **Props (if React):** {pattern}
- **State:** {pattern}
- **Services/Repositories:** {pattern}
- **Errors:** {pattern}

### Directory Structure

\`\`\`
{structure with comments}
\`\`\`

**Organizational pattern:** {feature-based | layered | domain-driven}

### Import Patterns

- **Grouping:** {how imports are organized}
- **Path aliases:** {if used, what format}
- **Relative vs absolute:** {convention}

### Error Handling

- **{Language}:** {pattern description}
- **Custom errors:** {how they're defined}
- **Error propagation:** {convention}

### Anti-Patterns Observed

- **{Anti-pattern 1}:** {description} - {why to avoid}
- **{Anti-pattern 2}:** {description} - {why to avoid}
```

This systematic convention analysis ensures skills document accurate, current patterns from the codebase.
