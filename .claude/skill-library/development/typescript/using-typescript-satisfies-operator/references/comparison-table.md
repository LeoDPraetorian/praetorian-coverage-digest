# Detailed Comparison: satisfies vs Type Annotations vs Type Assertions

## Complete Feature Matrix

| Feature                  | Type Annotation (`: Type`) | Type Assertion (`as Type`) | satisfies Operator     |
| ------------------------ | -------------------------- | -------------------------- | ---------------------- |
| **Type Validation**      | ✅ Full validation         | ❌ No validation           | ✅ Full validation     |
| **Literal Preservation** | ❌ Widens to base type     | ✅ Preserves literals      | ✅ Preserves literals  |
| **Autocomplete**         | ❌ Generic type only       | ✅ Exact literals          | ✅ Exact literals      |
| **Catches Typos**        | ✅ Yes                     | ❌ No                      | ✅ Yes                 |
| **Type Narrowing**       | ✅ Can narrow              | ✅ Can narrow              | ❌ No (validates only) |
| **Type Inference**       | ❌ Overrides inference     | ❌ Overrides inference     | ✅ Preserves inference |
| **Mutable Objects**      | ✅ Works fine              | ✅ Works fine              | ⚠️ Literals may widen  |
| **Functions**            | ✅ Works                   | ✅ Works                   | ❌ Not supported       |
| **TypeScript Version**   | All versions               | All versions               | 4.9+ (Nov 2022)        |
| **Safety Level**         | Safe                       | Unsafe (escape hatch)      | Safe                   |

## When to Use Each

### Use Type Annotation (`: Type`) When:

- ✅ You only need type validation
- ✅ Literal types don't matter for your use case
- ✅ Working with mutable objects
- ✅ Maximum compatibility (all TS versions)
- ✅ Simple data transfer objects (DTOs)

**Example:**

```typescript
const user: User = {
  name: "Alice", // Type: string (fine, don't need literal)
  age: 30, // Type: number (fine, don't need literal)
};
```

### Use Type Assertion (`as Type`) When:

- ✅ You're **narrowing** an existing type (not creating)
- ✅ You have more type information than TypeScript
- ✅ Migrating from untyped code (temporary)
- ⚠️ Last resort when types are provably correct

**Example:**

```typescript
// Narrowing existing value
const value: unknown = getSomeValue();
const str = value as string; // You know it's a string

// DOM elements (TypeScript can't infer)
const element = document.getElementById("app") as HTMLDivElement;
```

**⚠️ Warning:** Type assertions are an **escape hatch**. Overuse indicates design problems.

### Use satisfies When:

- ✅ Creating new object literals
- ✅ Need both validation AND literal preservation
- ✅ Object is immutable (const)
- ✅ TypeScript 4.9+ available
- ✅ Need autocomplete on specific values

**Example:**

```typescript
const config = {
  timeout: 5000, // Type: 5000 (literal preserved!)
  mode: "dev", // Type: "dev"
} satisfies Config; // Also validated against Config
```

## Side-by-Side Examples

### Example 1: Configuration Object

```typescript
interface Config {
  environment: "dev" | "prod" | "test";
  port: number;
  debug: boolean;
}

// ❌ Type annotation: loses literals
const config1: Config = {
  environment: "dev", // Type: "dev" | "prod" | "test" (widened!)
  port: 8080, // Type: number
  debug: true, // Type: boolean
};

// ❌ Type assertion: no validation
const config2 = {
  environment: "dev",
  prt: 8080, // ❌ TYPO! Not caught
  debug: true,
} as Config;

// ✅ satisfies: validation + literals
const config3 = {
  environment: "dev", // Type: "dev" (exact!)
  port: 8080, // Type: 8080 (literal!)
  debug: true, // Type: true (literal!)
} satisfies Config;

// Compare usage:
config1.environment; // Type: "dev" | "prod" | "test"
config3.environment; // Type: "dev" (specific!)
```

### Example 2: Route Definition

```typescript
interface Route {
  path: string;
  component: string;
}

// ❌ Type annotation: path becomes generic string
const route1: Route = {
  path: "/dashboard",
  component: "Dashboard",
};
route1.path; // Type: string

// ✅ satisfies: path stays as literal
const route2 = {
  path: "/dashboard",
  component: "Dashboard",
} satisfies Route;
route2.path; // Type: "/dashboard"

// Benefit: type-safe navigation
function navigate(path: typeof route2.path) {
  // path type is "/dashboard", not string!
}
```

## Performance Comparison

All three approaches have **identical runtime performance** - they only differ at compile time.

| Aspect           | Type Annotation | Type Assertion | satisfies |
| ---------------- | --------------- | -------------- | --------- |
| **Runtime Cost** | Zero            | Zero           | Zero      |
| **Compile Time** | ~Normal         | ~Fast          | ~Normal   |
| **Bundle Size**  | No change       | No change      | No change |

TypeScript types are erased during compilation, so `satisfies` has no runtime overhead.

## Migration Guide

### From Type Annotations to satisfies

**Before:**

```typescript
const colors: Record<string, string> = {
  primary: "#007bff",
  secondary: "#6c757d",
};
```

**After:**

```typescript
const colors = {
  primary: "#007bff",
  secondary: "#6c757d",
} satisfies Record<string, string>;

// Benefit: color values are now literals, not generic string
type PrimaryColor = typeof colors.primary; // "#007bff"
```

### From Type Assertions to satisfies

**Before:**

```typescript
const endpoints = {
  getUser: { method: "GET", path: "/users" },
  createUser: { method: "POST", path: "/users" },
} as Record<string, Endpoint>;
```

**After:**

```typescript
const endpoints = {
  getUser: { method: "GET", path: "/users" },
  createUser: { method: "POST", path: "/users" },
} satisfies Record<string, Endpoint>;

// Benefit: typos now caught at compile time!
```

## Common Confusion

### Q: "Can I use satisfies everywhere instead of type annotations?"

**A: No.** satisfies is for **object literals** where you need **both validation and literal preservation**.

Use type annotations for:

- Function parameters
- Return types
- Variable declarations where literals don't matter
- Mutable objects

### Q: "Why not just use `as const satisfies Type`?"

**A: Sometimes yes, but understand the difference:**

```typescript
// satisfies alone: object mutable, properties immutable
const config1 = {
  timeout: 5000,
} satisfies Config;
config1.timeout = 10000; // ✅ OK, timeout: number

// as const satisfies: everything deeply readonly
const config2 = {
  timeout: 5000,
} as const satisfies Config;
config2.timeout = 10000; // ❌ Error: readonly property
```

Use `as const satisfies` when you want **complete immutability**.

### Q: "Does satisfies work with interfaces?"

**A: Yes!** Works with both interfaces and type aliases.

```typescript
interface Config {
  /* ... */
}
type Settings = {
  /* ... */
};

const config = {
  /* ... */
} satisfies Config; // ✅
const settings = {
  /* ... */
} satisfies Settings; // ✅
```
