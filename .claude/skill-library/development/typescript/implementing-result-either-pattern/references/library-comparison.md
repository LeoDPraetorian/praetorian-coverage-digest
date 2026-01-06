# Library Comparison: neverthrow vs fp-ts vs purify

## Quick Comparison

| Feature            | neverthrow        | fp-ts            | purify          |
| ------------------ | ----------------- | ---------------- | --------------- |
| **Bundle Size**    | ~3KB              | ~15KB            | ~8KB            |
| **Learning Curve** | Low               | High             | Medium          |
| **Type Safety**    | Excellent         | Excellent        | Good            |
| **API Style**      | Method chaining   | Pipe composition | Method chaining |
| **Async Support**  | ResultAsync built | Task monad       | EitherAsync     |
| **Ecosystem**      | Focused           | Comprehensive FP | Balanced        |

## neverthrow

**Best for:** Teams new to functional programming, TypeScript-first projects

```typescript
import { ok, err, Result } from "neverthrow";

function divide(a: number, b: number): Result<number, string> {
  return b === 0 ? err("Division by zero") : ok(a / b);
}

// Method chaining style
const result = divide(10, 2)
  .map((n) => n * 2)
  .andThen((n) => divide(n, 5))
  .mapErr((e) => `Error: ${e}`);

// Pattern matching
result.match(
  (value) => console.log(`Success: ${value}`),
  (error) => console.error(error)
);
```

**Pros:**

- Focused on Result/Either pattern
- TypeScript-first design
- Excellent documentation
- Small bundle size
- Intuitive API for JS developers

**Cons:**

- Limited to Result type (no other FP patterns)
- Less mature than fp-ts

## fp-ts

**Best for:** Teams comfortable with functional programming, comprehensive FP needs

```typescript
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";

const divide = (a: number, b: number): E.Either<string, number> =>
  b === 0 ? E.left("Division by zero") : E.right(a / b);

// Pipe composition style
const result = pipe(
  divide(10, 2),
  E.map((n) => n * 2),
  E.chain((n) => divide(n, 5)),
  E.mapLeft((e) => `Error: ${e}`)
);

// Pattern matching
pipe(
  result,
  E.fold(
    (error) => console.error(error),
    (value) => console.log(`Success: ${value}`)
  )
);
```

**Pros:**

- Battle-tested and mature
- Complete FP toolkit (Option, Task, Reader, etc.)
- Strong mathematical foundations
- Extensive ecosystem

**Cons:**

- Steep learning curve
- Larger bundle size
- Terminology can be intimidating (fold, chain, traverse)

## purify

**Best for:** Teams wanting FP patterns with pragmatic API

```typescript
import { Either, Left, Right } from "purify-ts";

const divide = (a: number, b: number): Either<string, number> =>
  b === 0 ? Left("Division by zero") : Right(a / b);

// Method chaining style
const result = divide(10, 2)
  .map((n) => n * 2)
  .chain((n) => divide(n, 5))
  .mapLeft((e) => `Error: ${e}`);

// Pattern matching
result.caseOf({
  Left: (error) => console.error(error),
  Right: (value) => console.log(`Success: ${value}`),
});
```

**Pros:**

- Balance between neverthrow simplicity and fp-ts power
- Multiple FP patterns (Maybe, Either, EitherAsync, Codec)
- Reasonable bundle size
- Good documentation

**Cons:**

- Smaller community than fp-ts
- Not as feature-complete as fp-ts

## Async Operations

### neverthrow

```typescript
import { ResultAsync, okAsync, errAsync } from "neverthrow";

const fetchUser = (id: string): ResultAsync<User, Error> =>
  ResultAsync.fromPromise(
    fetch(`/api/users/${id}`).then((r) => r.json()),
    (e) => e as Error
  );

// Chain async operations
const result = await fetchUser("123")
  .andThen((user) => validateUser(user))
  .andThen((user) => saveUser(user));
```

### fp-ts

```typescript
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";

const fetchUser = (id: string): TE.TaskEither<Error, User> =>
  TE.tryCatch(
    () => fetch(`/api/users/${id}`).then((r) => r.json()),
    (e) => e as Error
  );

// Chain async operations
const result = await pipe(fetchUser("123"), TE.chain(validateUser), TE.chain(saveUser))();
```

## Recommendation

**Choose neverthrow if:**

- Team is new to functional programming
- You only need Result/Either pattern
- Bundle size matters
- You prefer method chaining

**Choose fp-ts if:**

- Team is experienced with FP
- You need comprehensive FP toolkit
- You're building large, complex applications
- You prefer pipe composition

**Choose purify if:**

- You want middle ground
- You need some FP patterns beyond Result
- Bundle size is somewhat important
- Team has mixed FP experience
