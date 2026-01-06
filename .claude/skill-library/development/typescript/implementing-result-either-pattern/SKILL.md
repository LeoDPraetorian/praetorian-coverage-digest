---
name: implementing-result-either-pattern
description: Use when designing TypeScript APIs that need explicit error handling without exceptions - covers Result/Either monad patterns, monadic composition, and type-safe error handling
allowed-tools: Read, Glob, Grep
---

# Implementing Result/Either Pattern

**Type-safe error handling through functional programming patterns.**

## When to Use

Use this skill when:

- Designing APIs where errors should be explicit in function signatures
- Building validation pipelines with composable error handling
- Working with operations that can fail (file I/O, network, parsing)
- Need to chain operations that may fail without nested try-catch blocks

**Not for:**

- Internal code where throwing exceptions is acceptable
- Quick prototypes where robustness isn't critical
- Code where errors are truly exceptional (programmer errors, not expected failures)

## Why Result/Either

**Problem with traditional error handling:**

```typescript
// ❌ Errors are implicit - caller doesn't know this can fail
function parseJSON<T>(json: string): T {
  return JSON.parse(json); // Throws, but type signature doesn't show it
}

// ❌ Try-catch proliferation
try {
  const user = parseJSON(input);
  try {
    const validated = validateUser(user);
    try {
      const transformed = transformUser(validated);
      return transformed;
    } catch (e) {
      // handle transform error
    }
  } catch (e) {
    // handle validation error
  }
} catch (e) {
  // handle parse error
}
```

**Solution with Result/Either:**

```typescript
// ✅ Errors are explicit in signature
function parseJSON<T>(json: string): Result<T, SyntaxError> {
  try {
    return Ok(JSON.parse(json));
  } catch (e) {
    return Err(e as SyntaxError);
  }
}

// ✅ Composable error handling - once failed, stays failed
const result = parseJSON(input).andThen(validateUser).andThen(transformUser);

if (result.ok) {
  console.log(result.value);
} else {
  console.error(result.error);
}
```

## Core Concepts

### Result Type

The Result type represents an operation that can succeed with a value or fail with an error:

```typescript
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };
```

### Constructors

```typescript
const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });
```

### Basic Usage

```typescript
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return Err("Division by zero");
  }
  return Ok(a / b);
}

const result = divide(10, 2);
if (result.ok) {
  console.log(`Result: ${result.value}`); // 5
} else {
  console.error(`Error: ${result.error}`);
}
```

## Monadic Operations

### map - Transform Success Value

```typescript
function map<T, U, E>(result: Result<T, E>, fn: (t: T) => U): Result<U, E> {
  return result.ok ? Ok(fn(result.value)) : result;
}

// Usage
const doubled = map(divide(10, 2), (n) => n * 2); // Ok(10)
const failed = map(divide(10, 0), (n) => n * 2); // Err("Division by zero")
```

### flatMap (andThen, chain) - Chain Operations That Return Result

```typescript
function flatMap<T, U, E>(result: Result<T, E>, fn: (t: T) => Result<U, E>): Result<U, E> {
  return result.ok ? fn(result.value) : result;
}

// Usage: chain multiple operations
const pipeline = flatMap(parseJSON(input), (data) =>
  flatMap(validate(data), (validated) => transform(validated))
);
```

### mapErr - Transform Error Value

```typescript
function mapErr<T, E, F>(result: Result<T, E>, fn: (e: E) => F): Result<T, F> {
  return result.ok ? result : Err(fn(result.error));
}

// Usage: convert error types
const httpError = mapErr(divide(10, 0), (msg) => ({
  status: 400,
  message: msg,
}));
```

## Common Patterns

### API Request Handling

```typescript
type ApiError = { status: number; message: string };

async function fetchUser(id: string): Promise<Result<User, ApiError>> {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      return Err({ status: response.status, message: await response.text() });
    }
    const data = await response.json();
    return Ok(data);
  } catch (e) {
    return Err({ status: 500, message: String(e) });
  }
}

// Usage
const userResult = await fetchUser("123");
if (userResult.ok) {
  displayUser(userResult.value);
} else {
  showError(userResult.error.message);
}
```

### Validation Pipeline

```typescript
type ValidationError = { field: string; message: string };

function validateEmail(email: string): Result<string, ValidationError> {
  if (!email.includes("@")) {
    return Err({ field: "email", message: "Invalid email format" });
  }
  return Ok(email);
}

function validateAge(age: number): Result<number, ValidationError> {
  if (age < 18) {
    return Err({ field: "age", message: "Must be 18 or older" });
  }
  return Ok(age);
}

// Combine validations
const validatedUser = flatMap(validateEmail(user.email), (email) =>
  flatMap(validateAge(user.age), (age) => Ok({ email, age }))
);
```

### File Operations

```typescript
function readFile(path: string): Result<string, Error> {
  try {
    return Ok(fs.readFileSync(path, "utf-8"));
  } catch (e) {
    return Err(e as Error);
  }
}

function parseConfig(content: string): Result<Config, SyntaxError> {
  try {
    return Ok(JSON.parse(content));
  } catch (e) {
    return Err(e as SyntaxError);
  }
}

// Chain file read and parse
const configResult = flatMap(readFile("./config.json"), parseConfig);
```

## Using Libraries

While you can implement Result manually, libraries provide ergonomic APIs.

### neverthrow

```typescript
import { ok, err, Result } from "neverthrow";

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return err("Division by zero");
  }
  return ok(a / b);
}

// Chainable API
const result = divide(10, 2)
  .map((n) => n * 2)
  .andThen((n) => divide(n, 5));
```

### fp-ts

```typescript
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";

const result = pipe(
  E.right(10),
  E.map((n) => n * 2),
  E.chain((n) => (n > 15 ? E.right(n) : E.left("Too small")))
);
```

## When NOT to Use

Avoid Result/Either for:

- **Programmer errors** - Use assertions or throw for bugs (null pointer, index out of bounds)
- **Internal implementation** - Overkill for private functions where exceptions are fine
- **Performance-critical paths** - Result allocations have overhead
- **Simple scripts** - Not worth the ceremony for quick automation

## References

For implementation details and advanced patterns:

- [Library Comparison](references/library-comparison.md) - neverthrow vs fp-ts vs purify
- [Advanced Patterns](references/advanced-patterns.md) - Combining multiple Results, early returns, async operations
- [Migration Guide](references/migration-guide.md) - Converting try-catch code to Result pattern

## External Resources

- [Either Monad for Error Handling (blog.logrocket.com)](https://blog.logrocket.com)
- [neverthrow Documentation](https://github.com/supermacro/neverthrow)
- [fp-ts Either](https://gcanti.github.io/fp-ts/modules/Either.ts.html)
