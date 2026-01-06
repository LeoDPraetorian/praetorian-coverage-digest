---
name: using-typescript-satisfies-operator
description: Use when implementing TypeScript objects that need both type validation and literal type preservation - teaches decision criteria for satisfies vs type annotations vs type assertions, with Chariot-specific patterns for routes, configs, and status enums (TypeScript 4.9+) - solves "type widening loses my literals" and "type assertion skips validation" problems with comparison tables showing trade-offs and real Chariot codebase examples (seedTypeConfigs, status codes, asset classes)
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Using TypeScript Satisfies Operator

**Get type validation AND literal type preservation with the `satisfies` operator (TypeScript 4.9+).**

## When to Use

Use this skill when:

- Creating configuration objects that need type checking AND literal type preservation
- Defining routes with type-safe literal path strings
- Building const objects that must conform to interfaces without losing specific values
- Implementing type-safe enums where you need the exact string/number literals
- Working with API endpoint definitions that require both validation and autocomplete
- Any scenario where type annotations lose literals and type assertions skip validation

**Common triggers:**

- "I want type safety but TypeScript widened my literals to `string`"
- "Type assertions let typos slip through"
- "I need both validation and preserved literal types"

## Quick Reference

| Pattern                     | Type Safety | Preserves Literals | Use When                          |
| --------------------------- | ----------- | ------------------ | --------------------------------- |
| `const x: Type = {...}`     | ✅          | ❌                 | Only need validation              |
| `const x = {...} as Type`   | ❌          | ✅                 | Only need literals (not safe!)    |
| `const x = {...} satisfies` | ✅          | ✅                 | Need BOTH validation and literals |

**Syntax:**

```typescript
const value = {
  // ... object definition
} satisfies TypeOrInterface;
```

## Core Problem Solved

TypeScript developers face a dilemma:

**Problem 1: Type Annotations Lose Literal Types**

```typescript
interface Config {
  timeout: number;
  mode: string;
}

const config: Config = {
  timeout: 5000, // Type: number (literal 5000 lost!)
  mode: "dev", // Type: string (literal "dev" lost!)
};

config.mode; // Type: string (no autocomplete for "dev" | "prod" | "test")
```

**Problem 2: Type Assertions Skip Validation**

```typescript
const config = {
  timeout: 5000,
  mmode: "dev", // ❌ TYPO! But TypeScript doesn't catch it
} as Config;

// Compiles fine, fails at runtime
```

**Solution: satisfies Gives Both**

```typescript
const config = {
  timeout: 5000, // Type: 5000 (literal preserved!)
  mode: "dev", // Type: "dev" (literal preserved!)
} satisfies Config; // ✅ Also type-checked against Config

config.mode; // Type: "dev" (exact literal for autocomplete!)
```

## Basic Syntax & Examples

### Example 1: Configuration Objects

```typescript
interface AppConfig {
  environment: string;
  port: number;
  features: Record<string, boolean>;
}

// ❌ Type annotation: loses literals
const config1: AppConfig = {
  environment: "production", // Type: string
  port: 8080, // Type: number
  features: { darkMode: true }, // Type: Record<string, boolean>
};

// ✅ satisfies: validation + literals preserved
const config2 = {
  environment: "production", // Type: "production"
  port: 8080, // Type: 8080
  features: { darkMode: true }, // Type: { darkMode: boolean }
} satisfies AppConfig;

// Now you get autocomplete and type narrowing!
if (config2.environment === "production") {
  // Works with literal!
  console.log(`Running on port ${config2.port}`); // Type: 8080
}
```

### Example 2: Route Definitions

```typescript
interface Route {
  path: string;
  component: string;
}

// ❌ Type annotation: path becomes generic string
const routes1: Route[] = [
  { path: "/dashboard", component: "Dashboard" }, // path: string
  { path: "/settings", component: "Settings" }, // path: string
];

// ✅ satisfies: paths stay as literals
const routes2 = [
  { path: "/dashboard", component: "Dashboard" }, // path: "/dashboard"
  { path: "/settings", component: "Settings" }, // path: "/settings"
] satisfies Route[];

// Type-safe navigation with literal autocomplete
function navigateTo(path: (typeof routes2)[number]["path"]) {
  // path type: "/dashboard" | "/settings" (exact literals!)
}
```

### Example 3: Status Enums

```typescript
interface StatusMap {
  active: string;
  deleted: string;
  updating: string;
}

// ❌ Type annotation: loses literal values
const statuses1: StatusMap = {
  active: "A", // Type: string
  deleted: "D", // Type: string
  updating: "U", // Type: string
};

// ✅ satisfies: preserves exact literals
const statuses2 = {
  active: "A", // Type: "A"
  deleted: "D", // Type: "D"
  updating: "U", // Type: "U"
} satisfies StatusMap;

// Now you can use the exact literals in discriminated unions
type Status = (typeof statuses2)[keyof typeof statuses2]; // "A" | "D" | "U"
```

### Example 4: API Endpoint Maps

```typescript
interface Endpoint {
  method: string;
  path: string;
}

// ✅ satisfies: validate structure + preserve literal types
const endpoints = {
  getUser: { method: "GET", path: "/api/users/:id" },
  createUser: { method: "POST", path: "/api/users" },
  deleteUser: { method: "DELETE", path: "/api/users/:id" },
} satisfies Record<string, Endpoint>;

// Extract exact types for discriminated unions
type Method = (typeof endpoints)[keyof typeof endpoints]["method"];
// Type: "GET" | "POST" | "DELETE" (not string!)
```

## vs Type Annotations

| Aspect              | Type Annotation (`: Type`) | satisfies               |
| ------------------- | -------------------------- | ----------------------- |
| **Type Validation** | ✅ Validates against type  | ✅ Validates            |
| **Literal Types**   | ❌ Widens to base type     | ✅ Preserves literals   |
| **Autocomplete**    | ❌ Generic type only       | ✅ Exact literals       |
| **Inference**       | ❌ Overrides inference     | ✅ Keeps inference      |
| **Use When**        | Only need validation       | Need validation + types |
| **TypeScript Ver**  | All versions               | 4.9+ (Nov 2022)         |

**See [references/comparison-table.md](references/comparison-table.md) for detailed comparison matrix with migration guide.**

## vs Type Assertions

| Aspect              | Type Assertion (`as Type`)   | satisfies             |
| ------------------- | ---------------------------- | --------------------- |
| **Type Validation** | ❌ Skips validation entirely | ✅ Full validation    |
| **Literal Types**   | ✅ Preserves literals        | ✅ Preserves literals |
| **Catches Typos**   | ❌ No error checking         | ✅ Catches errors     |
| **Safety**          | ❌ Unsafe (escape hatch)     | ✅ Type-safe          |
| **Use When**        | Type narrowing only          | Validation + literals |

**Quick rule:** Use `as` for narrowing existing types, `satisfies` for creating new objects.

## Chariot Patterns

**See [references/chariot-examples.md](references/chariot-examples.md) for 6 complete examples with explanations.**

### Quick Examples from Chariot Codebase

**Pattern 1: Status Codes** (Tabularium)

```typescript
const AssetStatusCodes = {
  active: "A",
  deleted: "D",
  updating: "U",
} satisfies StatusCodeMap;
// Type: "A" | "D" | "U" (exact literals for discriminated unions)
```

**Pattern 2: Asset Classes** (Classification system)

```typescript
const AssetClasses = {
  ipv4: { class: "ipv4", category: "network", scannable: true },
  domain: { class: "domain", category: "dns", scannable: true },
} satisfies Record<string, AssetClassDefinition>;
// Type: "ipv4" | "domain" (literal class names for API filters)
```

**Pattern 3: Route Configs** (`modules/chariot/ui/`)

```typescript
const AppRoutes = {
  dashboard: { path: "/dashboard", component: "Dashboard", requiresAuth: true },
  assets: { path: "/assets", component: "AssetList", requiresAuth: true },
} satisfies Record<string, RouteConfig>;
// Type: "/dashboard" | "/assets" (literal paths for navigation)
```

**Pattern 4: API Endpoints** (`modules/chariot/backend/`)

```typescript
const ChariotEndpoints = {
  listAssets: { method: "GET", path: "/api/assets", handler: "ListAssetsHandler" },
  createAsset: { method: "POST", path: "/api/assets", handler: "CreateAssetHandler" },
} satisfies Record<string, APIEndpoint>;
// Type: "GET" | "POST" (only methods actually used!)
```

## Common Use Cases

**Feature Flags:**

- Validate all boolean values + preserve flag names as literals
- Enables type-safe `isFeatureEnabled(flag)` with autocomplete

**Error Code Mappings:**

- Validate structure (code, message, statusCode) + preserve error literals
- Extract exact codes for discriminated unions

**Theme Configuration:**

- Validate theme structure + preserve CSS values as literals
- Type-safe access with exact spacing/color values

**See [references/comparison-table.md](references/comparison-table.md#side-by-side-examples) for complete use case examples.**

## Limitations & Trade-offs

### TypeScript Version Requirement

**Limitation:** Requires TypeScript 4.9+ (November 2022)

```typescript
// If your project uses TypeScript < 4.9, satisfies won't work
// Check your tsconfig.json or package.json for TypeScript version
```

**Workaround for older versions:**

- Use type assertions (`as`) with manual validation
- Consider upgrading TypeScript (4.9 is 2+ years old as of 2025)

### Doesn't Work with Functions

**Limitation:** `satisfies` is for values, not function signatures

```typescript
interface Handler {
  (req: Request): Response;
}

// ❌ Can't use satisfies with function expressions
const handler = (req: Request): Response => {
  return { status: 200 };
} satisfies Handler; // Type error!

// ✅ Use function type annotation instead
const handler: Handler = (req) => {
  return { status: 200 };
};
```

### Doesn't Narrow Existing Types

**Limitation:** Use for validation, not type narrowing

```typescript
let value: string | number = getSomeValue();

// ❌ Can't narrow with satisfies
value satisfies string; // Syntax error!

// ✅ Use type guards or assertions for narrowing
if (typeof value === "string") {
  // value is string here
}
```

### Mutable Objects Lose Literal Types

**Limitation:** Only works well with `const` or readonly objects

```typescript
interface Config {
  mode: string;
}

// ❌ let: literals can change, so TypeScript widens types
let config1 = {
  mode: "dev", // Type: string (widened because mutable)
} satisfies Config;

// ✅ const: object reference immutable, preserves literals
const config2 = {
  mode: "dev", // Type: "dev" (literal preserved)
} satisfies Config;
```

**Workaround:** Use `as const` for deeply immutable objects:

```typescript
const config = {
  mode: "dev",
  nested: { value: 123 },
} as const satisfies Config;
// All properties deeply readonly + literal types preserved
```

## Anti-patterns

### Anti-pattern 1: Using satisfies with Mutable Objects

```typescript
// ❌ BAD: let + satisfies = literals get widened anyway
let config = {
  timeout: 5000, // Type: number (not 5000!)
} satisfies Config;

config.timeout = 10000; // Allowed because type is number

// ✅ GOOD: Use const for immutability
const config = {
  timeout: 5000, // Type: 5000 (literal preserved)
} satisfies Config;
```

### Anti-pattern 2: Using satisfies When You Don't Need Literals

```typescript
interface User {
  name: string;
  age: number;
}

// ❌ OVERKILL: If you don't need literal preservation, use type annotation
const user = {
  name: "Alice",
  age: 30,
} satisfies User;

// ✅ SIMPLER: Type annotation is clearer when literals don't matter
const user: User = {
  name: "Alice",
  age: 30,
};
```

**When NOT to use satisfies:**

- You don't need autocomplete/narrowing on specific literal values
- The object is mutable and literals will change
- Working with simple data transfer objects (DTOs)

### Anti-pattern 3: Using Type Assertion When You Need Validation

```typescript
interface Config {
  timeout: number;
  retries: number;
}

// ❌ BAD: Type assertion skips validation
const config = {
  timeout: 5000,
  retrie: 3, // Typo not caught!
} as Config;

// ✅ GOOD: satisfies catches errors
const config = {
  timeout: 5000,
  retries: 3,
} satisfies Config;
```

## Decision Tree

**When creating an object literal, ask:**

1. **Do I need type validation?**
   - No → No type annotation needed
   - Yes → Continue to #2

2. **Do I need to preserve literal types?**
   - No → Use type annotation (`: Type`)
   - Yes → Continue to #3

3. **Is the object immutable (`const`)?**
   - No → Use type annotation + `as const` if needed
   - Yes → **Use `satisfies`**

4. **Is this TypeScript 4.9+?**
   - No → Use type annotation or upgrade TypeScript
   - Yes → **Use `satisfies`** ✅

## Related Patterns

- **`as const` assertion**: Makes object deeply readonly, preserves all literals
  - Combine with `satisfies` for immutable + validated objects
- **Template literal types**: TypeScript 4.1+ feature for string literal manipulation
- **Discriminated unions**: Use preserved literals as discriminators
- **Branded types**: Use with `satisfies` for nominal typing

## References

- [TypeScript 4.9 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator)
- [TypeScript Handbook: satisfies](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)
- See `references/comparison-table.md` for detailed comparison matrix
- See `references/chariot-examples.md` for complete Chariot codebase examples

## Changelog

See `.history/CHANGELOG` for version history and updates.
