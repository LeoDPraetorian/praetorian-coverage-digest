---
name: testing-typescript-types
description: Use when testing complex TypeScript types (branded types, mapped types, conditional types, utility type libraries) - teaches type-level testing with modern libraries (tsd, expect-type, vitest expectTypeOf) to prevent type regressions and validate type transformations at compile time
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Testing TypeScript Types

**Compile-time validation for complex type transformations and branded types.**

**You MUST use TodoWrite before starting** to track test implementation steps when adding type tests to existing codebases.

## When to Use

Use type testing when:

- **Complex type transformations** (DeepPartial, DeepReadonly, mapped types)
- **Branded types** (validate brand helpers prevent mixing Asset vs Risk IDs)
- **Utility type libraries** (reusable type utilities need tests like runtime code)
- **Type inference validation** (ensure generic types infer correctly)
- **Preventing type regressions** (refactoring without breaking type relationships)
- **Library development** (publishing type utilities)

**Don't use for:**

- Simple primitive types or basic interfaces
- Types that are obvious from inspection (no transformations)
- One-off types that won't be reused

## Quick Reference

| Library         | Use Case                        | Installation            | Integration     |
| --------------- | ------------------------------- | ----------------------- | --------------- |
| **expect-type** | Standalone, runtime-free        | `npm i -D expect-type`  | Any test runner |
| **vitest**      | Already using Vitest            | Built-in `expectTypeOf` | Vitest tests    |
| **tsd**         | Library .d.ts files, standalone | `npm i -D tsd`          | Separate CLI    |

**Recommendation**: Use `vitest` if already in your stack, otherwise `expect-type` for standalone type testing.

## The Problem: Untested Types Lead to Regressions

### Without Type Tests

```typescript
// Complex type transformation - does it work?
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

type User = {
  id: string;
  profile: {
    name: string;
    age: number;
  };
};

type PartialUser = DeepPartial<User>;
// ❌ Manual inspection - does it work correctly?
// ❌ Runtime tests can't catch type issues
// ❌ Refactoring breaks types silently
```

### With Type Tests

```typescript
import { expectTypeOf } from "expect-type";

// ✅ Compile-time validation
expectTypeOf<DeepPartial<User>>().toEqualTypeOf<{
  id?: string;
  profile?: {
    name?: string;
    age?: number;
  };
}>();

// Type test fails if DeepPartial logic is broken
```

## Type Testing Libraries

### expect-type (Recommended for Most)

**Pros:**

- Runtime-free (pure types)
- Works with any test runner
- Excellent error messages

**Install:**

```bash
npm install --save-dev expect-type
```

**Example:**

```typescript
import { expectTypeOf } from "expect-type";

expectTypeOf<string>().toBeString();
expectTypeOf<{ a: string }>().toHaveProperty("a");
expectTypeOf<string>().not.toBeNumber();
```

### Vitest expectTypeOf (Best for Vitest Users)

**Pros:**

- Built into Vitest (no extra dependency)
- Same API as expect-type
- Integrated with existing tests

**Example:**

```typescript
import { expectTypeOf } from "vitest";

test("type validation", () => {
  expectTypeOf<AssetID>().not.toEqualTypeOf<RiskID>();
});
```

### tsd (Specialized for Libraries)

**Pros:**

- Designed for .d.ts testing
- Separate test files (\*.test-d.ts)
- CLI-based

**Install:**

```bash
npm install --save-dev tsd
```

**Example (my-types.test-d.ts):**

```typescript
import { expectType, expectNotType } from "tsd";
import { Brand } from "./my-types";

type AssetID = Brand<string, "Asset">;
type RiskID = Brand<string, "Risk">;

expectNotType<AssetID>({} as RiskID);
```

## Basic Type Assertions

### Equality Checks

```typescript
import { expectTypeOf } from "expect-type";

// Exact type match
expectTypeOf<string>().toEqualTypeOf<string>();
expectTypeOf<{ a: string }>().toEqualTypeOf<{ a: string }>();

// Not equal
expectTypeOf<string>().not.toEqualTypeOf<number>();
```

### Assignability Checks

```typescript
// A can be assigned to B
expectTypeOf<"foo">().toMatchTypeOf<string>(); // literal extends string
expectTypeOf<1 | 2>().toMatchTypeOf<number>(); // union extends number

// A cannot be assigned to B
expectTypeOf<string>().not.toMatchTypeOf<number>();
```

### Never Type Validation

```typescript
// Validate type is never (unreachable)
expectTypeOf<never>().toBeNever();
expectTypeOf<string & number>().toBeNever(); // impossible intersection
```

## Testing Type Transformations

### Mapped Types

```typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

expectTypeOf<Readonly<{ a: string }>>().toEqualTypeOf<{
  readonly a: string;
}>();
```

### Conditional Types

```typescript
type IsString<T> = T extends string ? true : false;

expectTypeOf<IsString<"hello">>().toEqualTypeOf<true>();
expectTypeOf<IsString<number>>().toEqualTypeOf<false>();
```

### Recursive Types

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

expectTypeOf<DeepReadonly<{ a: { b: string } }>>().toEqualTypeOf<{
  readonly a: {
    readonly b: string;
  };
}>();
```

## Testing Branded Types

For complete branded type patterns, see [implementing-branded-types-typescript skill](../../development/typescript/implementing-branded-types-typescript/SKILL.md).

### Brand Helper Correctness

```typescript
type Brand<K, T> = K & { __brand: T };
type AssetID = Brand<string, "Asset">;
type RiskID = Brand<string, "Risk">;

// Different brands are not equal
expectTypeOf<AssetID>().not.toEqualTypeOf<RiskID>();

// Branded type is not raw string
expectTypeOf<AssetID>().not.toEqualTypeOf<string>();

// Cannot assign between brands
expectTypeOf<RiskID>().not.toBeAssignableTo<AssetID>();
expectTypeOf<AssetID>().not.toBeAssignableTo<RiskID>();
```

### Runtime + Type Validation

```typescript
// Runtime helper with type validation
const assetID = (id: string): AssetID => id as AssetID;

// Type test validates the helper returns correct type
expectTypeOf(assetID("test")).toEqualTypeOf<AssetID>();
expectTypeOf(assetID).returns.not.toEqualTypeOf<string>();
```

## Chariot Patterns

### Testing Tabularium Generated Types

See [Tabularium documentation](../../../../modules/tabularium/README.md) for generated types.

```typescript
// Validate generated entity types
import { Asset, Risk } from "@chariot/tabularium";

expectTypeOf<Asset>().toHaveProperty("key");
expectTypeOf<Asset>().toHaveProperty("class");
expectTypeOf<Asset["status"]>().toEqualTypeOf<"A" | "D" | "F">();

// Risk and Asset are distinct types
expectTypeOf<Risk>().not.toEqualTypeOf<Asset>();
```

### Testing Entity ID Brands

```typescript
// Chariot entity ID system
type AssetID = Brand<string, "Asset">;
type RiskID = Brand<string, "Risk">;
type UserID = Brand<string, "User">;

// Ensure IDs cannot be mixed
expectTypeOf<AssetID>().not.toBeAssignableTo<RiskID>();
expectTypeOf<RiskID>().not.toBeAssignableTo<UserID>();
expectTypeOf<UserID>().not.toBeAssignableTo<AssetID>();

// Validate ID helpers
declare function getAssetByID(id: AssetID): Asset;
expectTypeOf(getAssetByID).parameter(0).toEqualTypeOf<AssetID>();
expectTypeOf(getAssetByID).returns.toEqualTypeOf<Asset>();
```

### Testing API Type Transformations

```typescript
// API request/response type mapping
type CreateAssetRequest = Pick<Asset, "name" | "class" | "dns">;
type CreateAssetResponse = Pick<Asset, "key" | "name" | "status">;

// Validate transformations
expectTypeOf<CreateAssetRequest>().toHaveProperty("name");
expectTypeOf<CreateAssetRequest>().toHaveProperty("class");
expectTypeOf<CreateAssetRequest>().not.toHaveProperty("key"); // Not in request
expectTypeOf<CreateAssetResponse>().toHaveProperty("key"); // In response
```

## Integration with Test Suites

### Standalone Type Test Files

**Pattern:** `*.test-d.ts` files (with tsd) or inline with expect-type

```bash
# Project structure
src/
  types/
    branded-ids.ts
    branded-ids.test-d.ts  # Type tests
```

### Integration with Vitest

```typescript
// src/types/__tests__/branded-ids.test.ts
import { describe, it, expectTypeOf } from "vitest";
import { AssetID, RiskID } from "../branded-ids";

describe("Branded ID types", () => {
  it("should not allow mixing Asset and Risk IDs", () => {
    expectTypeOf<AssetID>().not.toBeAssignableTo<RiskID>();
  });

  it("should not be assignable to plain string", () => {
    expectTypeOf<AssetID>().not.toEqualTypeOf<string>();
  });
});
```

### CI/CD Integration

```json
// package.json
{
  "scripts": {
    "test:types": "vitest --typecheck",
    "test:types:tsd": "tsd"
  }
}
```

```yaml
# .github/workflows/ci.yml
- name: Run type tests
  run: npm run test:types
```

## Advanced Patterns

### Generic Type Testing

```typescript
// Test generic constraints work correctly
declare function identity<T>(arg: T): T;

expectTypeOf(identity<string>)
  .parameter(0)
  .toBeString();
expectTypeOf(identity<number>).returns.toBeNumber();
expectTypeOf(identity<boolean>)
  .parameter(0)
  .toEqualTypeOf(identity<boolean>).returns;
```

### Negative Testing (Should NOT Compile)

```typescript
// @ts-expect-error - This should cause a type error
const invalid: AssetID = "raw-string";

// Validate type guard narrows correctly
function isAsset(x: Asset | Risk): x is Asset {
  return x.__typename === "Asset";
}

expectTypeOf(isAsset).guards.toEqualTypeOf<Asset>();
```

## Legacy Pattern: Manual Type Assertion Helpers

**Extracted from deleted typescript-advanced skill (lines 667-681), now obsolete with modern libraries:**

```typescript
// ❌ OLD: Manual helpers (before expect-type existed)
type AssertEqual<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;

type Test1 = AssertEqual<string, string>; // true
type Test2 = AssertEqual<string, number>; // false

// ExpectError helper
type ExpectError<T extends never> = T;

// ✅ MODERN: Use expect-type or vitest instead
import { expectTypeOf } from "expect-type";

expectTypeOf<string>().toEqualTypeOf<string>();
expectTypeOf<string>().not.toEqualTypeOf<number>();
```

**Migration:** Replace manual `AssertEqual<T, U>` with `expectTypeOf<T>().toEqualTypeOf<U>()`.

## Best Practices

### When to Write Type Tests

**Always test:**

- Branded type helpers (prevent ID mixing)
- Complex mapped types (DeepPartial, DeepReadonly)
- Conditional type logic (type inference)
- Utility type libraries (reusable utilities)

**Skip testing:**

- Simple interfaces with no transformations
- One-off types that won't be reused
- Types that are obvious from inspection

### Organizing Type Test Files

**Option 1: Colocated** (Recommended for Vitest)

```
src/types/
  branded-ids.ts
  __tests__/
    branded-ids.test.ts  # Runtime + type tests together
```

**Option 2: Separate** (Recommended for tsd)

```
src/types/
  branded-ids.ts
  branded-ids.test-d.ts  # Type-only tests
```

### Testing Strategy

1. **Test complex transformations** - DeepPartial, mapped types, conditional types
2. **Test brand correctness** - Non-assignability between brands
3. **Test inference** - Generics infer correctly
4. **Test negative cases** - Invalid operations fail at compile time

## Related Skills

- `implementing-branded-types-typescript` - Branded type patterns this skill validates
- `using-typescript-satisfies-operator` - Type-safe literals with exhaustive checking
- `implementing-result-either-pattern` - Result types that benefit from type testing
- `testing-with-vitest-mocks` - Runtime testing patterns (complements type testing)

## Resources

- [expect-type GitHub](https://github.com/mmkal/expect-type)
- [tsd GitHub](https://github.com/SamVerschueren/tsd)
- [Vitest Type Testing](https://vitest.dev/guide/testing-types.html)
