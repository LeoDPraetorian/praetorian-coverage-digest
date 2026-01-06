# Advanced Result/Either Patterns

## Combining Multiple Results

### Parallel Validation

Validate multiple fields and collect all errors:

```typescript
type ValidationError = { field: string; message: string };

function combineResults<T extends readonly unknown[], E>(results: {
  [K in keyof T]: Result<T[K], E>;
}): Result<T, E[]> {
  const errors: E[] = [];
  const values: unknown[] = [];

  for (const result of results) {
    if (result.ok) {
      values.push(result.value);
    } else {
      errors.push(result.error);
    }
  }

  return errors.length > 0 ? Err(errors) : Ok(values as T);
}

// Usage
const result = combineResults([
  validateEmail(user.email),
  validateAge(user.age),
  validateName(user.name),
]);

if (result.ok) {
  const [email, age, name] = result.value;
} else {
  // Show all validation errors at once
  result.error.forEach((err) => console.error(err.message));
}
```

### With neverthrow

```typescript
import { combine } from "neverthrow";

const result = combine([validateEmail(user.email), validateAge(user.age), validateName(user.name)]);
```

## Early Return Pattern

Convert imperative code with early returns to Result chains:

```typescript
// ❌ Before: imperative with early returns
function processOrder(order: Order): string {
  if (!order.items.length) {
    throw new Error("Order has no items");
  }

  const total = calculateTotal(order);
  if (total > MAX_AMOUNT) {
    throw new Error("Order exceeds maximum");
  }

  const discount = applyDiscount(order);
  if (!discount.valid) {
    throw new Error("Invalid discount code");
  }

  return `Order processed: ${total - discount.amount}`;
}

// ✅ After: functional with Result
function processOrder(order: Order): Result<string, string> {
  if (!order.items.length) {
    return Err("Order has no items");
  }

  const total = calculateTotal(order);
  if (total > MAX_AMOUNT) {
    return Err("Order exceeds maximum");
  }

  return applyDiscount(order).andThen((discount) =>
    Ok(`Order processed: ${total - discount.amount}`)
  );
}
```

## Result with Option/Maybe

Combine Result for errors and Option for missing values:

```typescript
type Option<T> = T | null;

function findUser(id: string): Result<Option<User>, Error> {
  try {
    const user = db.users.find(id);
    return Ok(user || null); // Found or not found (both success)
  } catch (e) {
    return Err(e as Error); // Database error (failure)
  }
}

// Usage
const result = findUser("123");
if (result.ok) {
  if (result.value !== null) {
    console.log("User found:", result.value);
  } else {
    console.log("User not found (not an error)");
  }
} else {
  console.error("Database error:", result.error);
}
```

## Async Pipeline

Chain multiple async operations that return Result:

```typescript
async function processUserData(userId: string): Promise<Result<ProcessedData, Error>> {
  const userResult = await fetchUser(userId);
  if (!userResult.ok) return userResult;

  const validatedResult = await validateUser(userResult.value);
  if (!validatedResult.ok) return validatedResult;

  const enrichedResult = await enrichUser(validatedResult.value);
  if (!enrichedResult.ok) return enrichedResult;

  return transformUser(enrichedResult.value);
}
```

### With neverthrow ResultAsync

```typescript
import { ResultAsync } from "neverthrow";

function processUserData(userId: string): ResultAsync<ProcessedData, Error> {
  return fetchUser(userId).andThen(validateUser).andThen(enrichUser).andThen(transformUser);
}
```

## Converting Promises to Result

Wrap Promise-based code:

```typescript
async function safeAsync<T, E = Error>(
  promise: Promise<T>,
  errorHandler?: (e: unknown) => E
): Promise<Result<T, E>> {
  try {
    const value = await promise;
    return Ok(value);
  } catch (e) {
    const error = errorHandler ? errorHandler(e) : (e as E);
    return Err(error);
  }
}

// Usage
const result = await safeAsync(
  fetch("/api/data").then((r) => r.json()),
  (e) => new Error(`Fetch failed: ${e}`)
);
```

## Recovering from Errors

Provide fallback values when Result is Err:

```typescript
function getOrElse<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.ok ? result.value : defaultValue;
}

// Usage
const config = getOrElse(loadConfig(), DEFAULT_CONFIG);
```

## Result as Validation Accumulator

Collect validation errors as you go:

```typescript
type ValidationResult<T> = Result<T, string[]>;

function validateUser(data: unknown): ValidationResult<User> {
  const errors: string[] = [];

  if (typeof data !== "object" || data === null) {
    return Err(["Input must be an object"]);
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.email !== "string" || !obj.email.includes("@")) {
    errors.push("Invalid email");
  }

  if (typeof obj.age !== "number" || obj.age < 18) {
    errors.push("Invalid age");
  }

  if (typeof obj.name !== "string" || obj.name.length < 2) {
    errors.push("Invalid name");
  }

  if (errors.length > 0) {
    return Err(errors);
  }

  return Ok({ email: obj.email, age: obj.age, name: obj.name } as User);
}
```

## Railway-Oriented Programming

Visualize success/error paths as parallel railway tracks:

```typescript
// Success track stays on success, error track stays on error
const result = parseInput(input) // Ok | Err
  .andThen(validate) // If Ok, try validate. If Err, skip.
  .andThen(transform) // If Ok, try transform. If Err, skip.
  .andThen(save); // If Ok, try save. If Err, skip.

// Once on error track, stays on error track until handled
```

This pattern prevents error handling code from cluttering business logic.
