# Quality Indicators for Package Selection

## Overview

When `resolve-library-id` returns multiple packages, apply quality indicators to identify the correct package for documentation fetch.

---

## Quality Indicator Levels

| Indicator   | Symbol | Criteria                                     | Action               |
| ----------- | ------ | -------------------------------------------- | -------------------- |
| Recommended | ✅     | Main package, stable version, not deprecated | Select by default    |
| Caution     | ⚠️     | Internal/-core package, pre-release version  | Ask user to confirm  |
| Deprecated  | ❌     | Contains 'deprecated' in name or description | Skip unless explicit |

---

## Recommended (✅)

**Select these packages by default without user confirmation.**

### Criteria

1. **Main package** (not -core, -internal, -dev, -types)
2. **Stable version** (no alpha, beta, rc, next, canary suffixes)
3. **Not deprecated** (no "deprecated" in name or description)
4. **Matches search intent** (package name closely matches libraryName)

### Examples

| Search Query            | Recommended Package          | Reason                       |
| ----------------------- | ---------------------------- | ---------------------------- |
| `@tanstack/react-query` | `/npm/@tanstack/react-query` | Main package, stable version |
| `zustand`               | `/npm/zustand`               | Main package, stable version |
| `zod`                   | `/npm/zod`                   | Main package, stable version |
| `react-hook-form`       | `/npm/react-hook-form`       | Main package, stable version |

### Selection Logic

```typescript
function isRecommended(library: Library): boolean {
  const name = library.name;
  const description = library.description.toLowerCase();
  const version = library.version;

  // Check for deprecated
  if (
    name.includes("deprecated") ||
    description.includes("deprecated") ||
    description.includes("unmaintained")
  ) {
    return false;
  }

  // Check for internal packages
  if (name.endsWith("-core") || name.endsWith("-internal") || name.includes("/internal/")) {
    return false;
  }

  // Check for pre-release versions
  if (
    version.includes("alpha") ||
    version.includes("beta") ||
    version.includes("rc") ||
    version.includes("next") ||
    version.includes("canary")
  ) {
    return false;
  }

  // Check for dev/types packages
  if (name.endsWith("-types") || name.endsWith("-dev") || name.endsWith("-devtools")) {
    return false;
  }

  return true;
}
```

---

## Caution (⚠️)

**Ask user to confirm before fetching these packages.**

### Criteria

1. **Internal packages** (-core, -internal suffixes)
2. **Pre-release versions** (alpha, beta, rc, next, canary)
3. **Development tools** (-devtools, -dev)
4. **Type definitions** (-types, @types/\*)

### Examples

| Package                                    | Issue                   | When to Use                          |
| ------------------------------------------ | ----------------------- | ------------------------------------ |
| `/npm/@tanstack/react-query-core`          | Internal implementation | Only if explicitly building on core  |
| `/npm/@tanstack/react-query@6.0.0-alpha.1` | Pre-release version     | Only if testing next version         |
| `/npm/@tanstack/react-query-devtools`      | Development tooling     | Only if documenting devtools         |
| `/npm/@types/react`                        | Type definitions        | Only if documenting TypeScript types |

### User Confirmation Pattern

When multiple packages found with ⚠️ Caution indicators:

```
I found multiple packages for your search:

1. @tanstack/react-query (v5.28.0) - Main package ✅ Recommended
2. @tanstack/react-query-devtools (v5.28.0) - Developer tools ⚠️ Caution
3. @tanstack/react-query-core (v5.28.0) - Internal core package ⚠️ Caution

Which package should I fetch documentation for?

Options:
- Option 1: Main package (Recommended)
- Option 2: Developer tools (Use only if documenting devtools specifically)
- Option 3: Internal core package (Use only if building on core implementation)
```

**Default selection**: Always recommend Option 1 (✅ Recommended).

---

## Deprecated (❌)

**Skip these packages unless user explicitly requests them.**

### Criteria

1. **Contains "deprecated"** in name or description
2. **Contains "unmaintained"** in description
3. **Contains "archived"** in description
4. **Known superseded packages** (e.g., `react-query` → `@tanstack/react-query`)

### Examples

| Deprecated Package | Superseded By                   | Reason                            |
| ------------------ | ------------------------------- | --------------------------------- |
| `/npm/react-query` | `/npm/@tanstack/react-query`    | Rebranded to TanStack             |
| `/npm/redux-saga`  | N/A (use Redux Toolkit)         | Superseded by modern alternatives |
| `/npm/enzyme`      | N/A (use React Testing Library) | Superseded by modern alternatives |

### Handling Deprecated Packages

**If only deprecated package found**:

```
⚠️ Warning: The package '@deprecated/library' appears to be deprecated.

The official documentation recommends using '@new/library' instead.

Would you like to:
1. Search for '@new/library' (Recommended)
2. Continue with deprecated package (Not recommended)
```

**Default**: Option 1 (search for replacement).

---

## Multi-Package Selection Strategy

### Scenario 1: One ✅ Recommended

**Action**: Select automatically, no user confirmation needed.

```
Found: @tanstack/react-query (v5.28.0) ✅ Recommended
Fetching documentation...
```

### Scenario 2: Multiple ✅ Recommended

**Action**: Ask user to choose.

```
Found multiple recommended packages:

1. @tanstack/react-query (v5.28.0) - Main package ✅
2. @tanstack/vue-query (v5.28.0) - Vue integration ✅

Which package should I fetch?
```

### Scenario 3: Only ⚠️ Caution Packages

**Action**: Present all options with warnings, recommend searching for main package.

```
⚠️ Only internal/dev packages found:

1. @tanstack/react-query-core (v5.28.0) - Internal core ⚠️
2. @tanstack/react-query-devtools (v5.28.0) - Dev tools ⚠️

These are not the main package. Try searching for '@tanstack/react-query' instead?

Options:
- Search for main package (Recommended)
- Use internal core package
- Use dev tools package
```

### Scenario 4: Mix of ✅ and ⚠️

**Action**: Recommend ✅, show ⚠️ as alternatives.

```
Found packages:

1. @tanstack/react-query (v5.28.0) - Main package ✅ Recommended
2. @tanstack/react-query-core (v5.28.0) - Internal core ⚠️

Which package should I fetch?
- Option 1: Main package (Recommended)
- Option 2: Internal core (Advanced use only)
```

---

## Package Naming Patterns

### Main Packages

- `library-name` (e.g., `zustand`, `zod`, `axios`)
- `@scope/library-name` (e.g., `@tanstack/react-query`, `@radix-ui/react-dialog`)

### Internal Packages (⚠️)

- `library-name-core` (e.g., `@tanstack/react-query-core`)
- `library-name-internal` (e.g., `@company/internal-utils`)
- `@scope/library-name-core`

### Development Packages (⚠️)

- `library-name-devtools` (e.g., `@tanstack/react-query-devtools`)
- `library-name-dev` (e.g., `webpack-dev-server`)

### Type Packages (⚠️)

- `@types/library-name` (e.g., `@types/react`, `@types/node`)
- `library-name-types` (e.g., `typescript-types`)

### Deprecated Patterns (❌)

- Contains "deprecated" in name
- Old naming before rebrand (e.g., `react-query` before TanStack rebrand)

---

## Version Selection

### Stable Versions (✅)

- Semantic versioning: `X.Y.Z` (e.g., `5.28.0`, `1.2.3`)
- No suffix or pre-release tags

### Pre-Release Versions (⚠️)

- Alpha: `X.Y.Z-alpha.N` (e.g., `6.0.0-alpha.1`)
- Beta: `X.Y.Z-beta.N` (e.g., `6.0.0-beta.3`)
- Release Candidate: `X.Y.Z-rc.N` (e.g., `6.0.0-rc.2`)
- Next: `X.Y.Z-next.N` (e.g., `5.29.0-next.1`)
- Canary: `X.Y.Z-canary.N` (e.g., `5.28.0-canary.4`)

**When to use pre-release**:

- User explicitly requests next version
- Creating skill for upcoming breaking changes
- Testing migration paths before stable release

---

## Summary Decision Tree

```
Multiple packages found?
    ↓
    Yes → Apply quality indicators
    ↓
    Any ✅ Recommended?
        ↓
        Yes → One ✅? → Select automatically
        ↓
        Yes → Multiple ✅? → Ask user to choose
        ↓
        No → Only ⚠️/❌? → Warn and recommend searching for main package
    ↓
    No → Single package found
    ↓
    Is it ✅ Recommended? → Select automatically
    ↓
    Is it ⚠️ Caution? → Ask user to confirm
    ↓
    Is it ❌ Deprecated? → Warn and suggest replacement
```
