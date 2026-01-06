---
name: using-typescript-const-assertions
description: Use when deriving union types from runtime values or preserving literal types in objects and arrays - teaches as const assertions (TypeScript 3.4+) for type-safe constants, route definitions, status codes, and constant mappings - alternative to enums with better ergonomics - shows typeof patterns to extract exact literal unions from values with Chariot examples (routes, statuses, icon mappings)
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Using TypeScript Const Assertions

**Preserve literal types and derive unions from values with `as const`.**

## When to Use

Use this skill when:

- Deriving union types from runtime values (routes, statuses)
- Creating readonly constant objects/arrays
- Type-safe constant mappings (status → color, class → icon)
- Alternative to string enums with better ergonomics
- Mock data with exact literal types for tests

**Common triggers:**

- "TypeScript widened my string literals to `string`"
- "How do I get union type from object values?"
- "Should I use enum or const object?"

## Quick Reference

| Pattern                  | Without `as const`  | With `as const`           | Use When                  |
| ------------------------ | ------------------- | ------------------------- | ------------------------- |
| Object                   | `{ x: string }`     | `{ readonly x: "value" }` | Constant configs          |
| Array                    | `string[]`          | `readonly ["a", "b"]`     | Fixed value lists         |
| Type from object values  | `string` (too wide) | `"a" \| "b"` (exact!)     | Deriving unions           |
| Type from array elements | `string` (too wide) | `"a" \| "b"` (exact!)     | Status/class enumerations |

## The Problem: Type Widening

TypeScript widens literals to primitives by default:

```typescript
// Without as const: widened to primitives
const ROUTES = {
  home: "/",
  assets: "/assets",
  risks: "/risks",
};
// Type: { home: string; assets: string; risks: string }

type Route = (typeof ROUTES)[keyof typeof ROUTES];
// Type: string (accepts ANY string - not type-safe!)

function navigate(route: Route) {
  // Accepts "/wrong" even though it's not a valid route
}

// Array example
const STATUSES = ["A", "D", "U"];
// Type: string[] (not readonly, not literal!)

type Status = (typeof STATUSES)[number];
// Type: string (too wide!)
```

## Basic Patterns

### Object as const

```typescript
const ROUTES = {
  home: "/",
  assets: "/assets",
  risks: "/risks",
} as const;
// Type: { readonly home: '/'; readonly assets: '/assets'; readonly risks: '/risks' }

// Now readonly - can't modify
ROUTES.home = "/new"; // ❌ Error: Cannot assign to 'home' because it is read-only

// Extract exact union type
type Route = (typeof ROUTES)[keyof typeof ROUTES];
// Type: '/' | '/assets' | '/risks' (exact literals!)

function navigate(route: Route) {
  // Only accepts exact route strings
}

navigate("/"); // ✅ Valid
navigate("/assets"); // ✅ Valid
navigate("/wrong"); // ❌ Type error!
```

### Array as const

```typescript
const STATUSES = ["A", "D", "U"] as const;
// Type: readonly ['A', 'D', 'U']

// Extract literal union from array
type Status = (typeof STATUSES)[number];
// Type: 'A' | 'D' | 'U' (exact literals!)

function filterByStatus(status: Status) {
  // Type-safe status filtering
}

filterByStatus("A"); // ✅ Valid
filterByStatus("X"); // ❌ Type error!

// Readonly - can't modify
STATUSES.push("X"); // ❌ Error: Property 'push' does not exist on readonly array
STATUSES[0] = "X"; // ❌ Error: Cannot assign to read-only index
```

### Nested Structures as const

```typescript
const CONFIG = {
  routes: {
    api: "/api",
    graphql: "/graphql",
  },
  timeouts: {
    request: 5000,
    retry: 2000,
  },
} as const;
// Deeply readonly: all nested properties are literals

type APIRoute = (typeof CONFIG.routes)[keyof typeof CONFIG.routes];
// Type: '/api' | '/graphql'

type Timeout = (typeof CONFIG.timeouts)[keyof typeof CONFIG.timeouts];
// Type: 5000 | 2000
```

## Chariot Patterns

### Pattern 1: Asset Status Codes

**Current Chariot usage:**

```typescript
// Tabularium status codes
const STATUS_ACTIVE = "A";
const STATUS_DELETED = "D";
const STATUS_UPDATING = "U";

// Better with as const
const ASSET_STATUSES = ["A", "D", "U"] as const;
type AssetStatus = (typeof ASSET_STATUSES)[number];
// Type: 'A' | 'D' | 'U'

function filterAssets(status: AssetStatus) {
  // Type-safe filtering
}
```

### Pattern 2: Icon/Color Mappings

```typescript
// Status to color mapping
const STATUS_COLORS = {
  A: "green",
  D: "red",
  U: "yellow",
} as const;

type StatusColor = (typeof STATUS_COLORS)[keyof typeof STATUS_COLORS];
// Type: 'green' | 'red' | 'yellow'

// Asset class to icon mapping
const CLASS_ICONS = {
  ipv4: "network",
  domain: "globe",
  certificate: "lock",
} as const;

type AssetClass = keyof typeof CLASS_ICONS;
// Type: 'ipv4' | 'domain' | 'certificate'
```

### Pattern 3: Route Definitions

```typescript
// Chariot UI routes
const APP_ROUTES = {
  dashboard: "/dashboard",
  assets: "/assets",
  risks: "/risks",
  settings: "/settings",
} as const;

type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];
// Type: '/dashboard' | '/assets' | '/risks' | '/settings'

// Type-safe navigation
function navigateTo(route: AppRoute) {
  history.push(route);
}
```

## vs Enums

| Feature          | `as const`          | `enum`                | Winner     |
| ---------------- | ------------------- | --------------------- | ---------- |
| Syntax           | Simple object/array | Special syntax        | `as const` |
| Reverse mapping  | ❌ Not built-in     | ✅ Automatic          | `enum`     |
| Type safety      | ✅ Compile-time     | ✅ Compile-time       | Tie        |
| Tree shaking     | ✅ Better           | ⚠️ Can be problematic | `as const` |
| Inlining         | ✅ Inlined          | ⚠️ May not inline     | `as const` |
| Namespace        | ❌ Use object       | ✅ Built-in           | `enum`     |
| String unions    | ✅ Natural          | ⚠️ Verbose            | `as const` |
| Iterating values | ✅ Array methods    | ⚠️ Manual             | `as const` |

**Use `as const` when:**

- Simple value lists or mappings
- Want better tree shaking
- Prefer plain JavaScript objects
- Need to iterate values easily

**Use `enum` when:**

- Need reverse mapping (value → key)
- Want namespace isolation
- Team prefers explicit enum syntax

## Deriving Union Types

### From Object Values

```typescript
const ENDPOINTS = {
  assets: "/api/assets",
  risks: "/api/risks",
  seeds: "/api/seeds",
} as const;

// Extract union of values
type Endpoint = (typeof ENDPOINTS)[keyof typeof ENDPOINTS];
// Type: '/api/assets' | '/api/risks' | '/api/seeds'

// Extract union of keys
type EndpointKey = keyof typeof ENDPOINTS;
// Type: 'assets' | 'risks' | 'seeds'
```

### From Array Elements

```typescript
const ASSET_CLASSES = ["ipv4", "domain", "certificate", "s3_bucket"] as const;

type AssetClass = (typeof ASSET_CLASSES)[number];
// Type: 'ipv4' | 'domain' | 'certificate' | 's3_bucket'

// Use in function signatures
function scanAsset(assetClass: AssetClass) {
  // Type-safe scanning
}
```

### From Nested Structures

```typescript
const INTEGRATIONS = {
  jira: { name: "Jira", icon: "jira", color: "blue" },
  defender: { name: "Defender", icon: "shield", color: "red" },
  hackerone: { name: "HackerOne", icon: "bug", color: "green" },
} as const;

type IntegrationKey = keyof typeof INTEGRATIONS;
// Type: 'jira' | 'defender' | 'hackerone'

type IntegrationIcon = (typeof INTEGRATIONS)[IntegrationKey]["icon"];
// Type: 'jira' | 'shield' | 'bug'

type IntegrationColor = (typeof INTEGRATIONS)[IntegrationKey]["color"];
// Type: 'blue' | 'red' | 'green'
```

## Integration Patterns

### React Component Props

```typescript
const BUTTON_VARIANTS = ["primary", "secondary", "danger"] as const;
type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

interface ButtonProps {
  variant: ButtonVariant; // Type: 'primary' | 'secondary' | 'danger'
  onClick: () => void;
}

function Button({ variant, onClick }: ButtonProps) {
  // Type-safe variant handling
}
```

### TanStack Router Routes

```typescript
const ROUTE_PATHS = {
  home: "/",
  assets: "/u/:userId/assets",
  risks: "/u/:userId/risks",
} as const;

type RoutePath = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];

// Use in router configuration
const routes = [
  { path: ROUTE_PATHS.home, component: Home },
  { path: ROUTE_PATHS.assets, component: Assets },
];
```

## Common Patterns

### Lookup Tables

```typescript
const HTTP_STATUS_MESSAGES = {
  200: "OK",
  404: "Not Found",
  500: "Internal Server Error",
} as const;

type HTTPStatus = keyof typeof HTTP_STATUS_MESSAGES;
// Type: 200 | 404 | 500

function getStatusMessage(status: HTTPStatus) {
  return HTTP_STATUS_MESSAGES[status];
}
```

### Test Fixtures

```typescript
const MOCK_ASSET = {
  key: "asset#123",
  name: "example.com",
  status: "A",
} as const;
// All properties are exact literals for precise test assertions

expect(result.status).toBe(MOCK_ASSET.status); // Type: 'A'
```

## Anti-patterns

### Anti-pattern 1: Using with Mutable Data

```typescript
// ❌ BAD: as const on data that needs to change
let config = {
  debug: true,
} as const;

config.debug = false; // ❌ Error: readonly property

// ✅ GOOD: Only use as const for true constants
const CONSTANTS = {
  MAX_RETRIES: 3,
} as const;
```

### Anti-pattern 2: Overusing for Everything

```typescript
// ❌ OVERKILL: Not every object needs as const
const tempData = {
  count: 0, // This will change, don't use as const
} as const;

// ✅ GOOD: Use for actual constants only
const DEFAULTS = {
  PAGE_SIZE: 25,
} as const;
```

### Anti-pattern 3: Forgetting `as const`

```typescript
// ❌ MISSING: Forgot as const
const STATUSES = ["A", "D", "U"];
type Status = (typeof STATUSES)[number]; // Type: string (too wide!)

// ✅ CORRECT: With as const
const STATUSES = ["A", "D", "U"] as const;
type Status = (typeof STATUSES)[number]; // Type: 'A' | 'D' | 'U'
```

## Related Patterns

- **`satisfies` operator** (TypeScript 4.9+): Validate shape while preserving literals
  - Combine: `value satisfies Type as const` for validation + deep readonly
- **Branded types**: Use with `as const` for nominal typing
- **Template literal types**: Extract literal string patterns

## References

- TypeScript 3.4 Release Notes (const assertions introduction)
- See `using-typescript-satisfies-operator` skill for complementary pattern
- See `implementing-branded-types-typescript` skill for nominal typing

## Changelog

See `.history/CHANGELOG` for version history and updates.
