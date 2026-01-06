---
name: pattern-matching-typescript
description: Use when handling complex discriminated unions (4+ variants), state machines, or nested data structures - teaches ts-pattern library for exhaustive pattern matching with compile-time safety over verbose switch statements
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Pattern Matching with ts-pattern

**Type-safe exhaustive pattern matching for TypeScript discriminated unions and complex state machines.**

**You MUST use TodoWrite before starting** to track implementation steps when refactoring existing switch statements to pattern matching.

## When to Use

Use `ts-pattern` when:

- **Complex discriminated unions** (4+ variants)
- **State machines** (job states, scan status, integration results)
- **API response handling** (loading/error/success patterns)
- **Nested pattern matching** (complex data structures)
- **Exhaustiveness checking is critical** (prevent runtime bugs from missing cases)
- **Alternative to deeply nested if/else or switch statements**

**Don't use when:**

- Simple 2-3 case switches (discriminated union + switch is fine)
- Performance is critical and every millisecond counts
- Bundle size is extremely constrained
- Team unfamiliar with pattern matching (training overhead)

## Quick Reference

| Pattern         | Use Case                  | Example                                      |
| --------------- | ------------------------- | -------------------------------------------- |
| `.with()`       | Match specific value      | `.with({ status: 'idle' }, ...)`             |
| `.exhaustive()` | Require all cases covered | `.exhaustive()` (compile error if missing)   |
| Destructuring   | Extract matched values    | `.with({ status: 'success' }, ({ data })`    |
| `P.when()`      | Guard conditions          | `.with({ age: P.when(x => x >= 18) }, ...)`  |
| `P.select()`    | Extract nested values     | `.with({ user: { name: P.select() } }, ...)` |
| `P.optional()`  | Match optional properties | `.with({ data: P.optional(...) }, ...)`      |
| Nested patterns | Match nested structures   | `.with({ result: { status: 'ok' } }, ...)`   |
| Array patterns  | Match array elements      | `.with([1, 2, P._], ...)`                    |
| `.otherwise()`  | Fallback (non-exhaustive) | `.otherwise(() => 'default')`                |

## Installation & Setup

```bash
npm install ts-pattern
```

```typescript
import { match, P } from "ts-pattern";
```

**Bundle size:** ~10KB minified (minimal overhead)

## The Problem: Verbose Switch Statements

### Before: Traditional Switch (No Exhaustiveness)

```typescript
// Discriminated union
type QueryState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

// Switch: NO compile error if case missing
function handleState<T>(state: QueryState<T>): string {
  switch (state.status) {
    case "idle":
      return "Idle";
    case "loading":
      return "Loading";
    case "success":
      return `Data: ${state.data}`;
    // Forgot 'error' case! Runtime bug!
  }
  // TypeScript doesn't catch this
}
```

**Problems:**

- ❌ No compile-time exhaustiveness checking
- ❌ Verbose property access (`state.status`, `state.data`)
- ❌ Easy to forget cases
- ❌ Poor ergonomics for nested structures

### After: ts-pattern (Exhaustive + Better Ergonomics)

```typescript
import { match } from "ts-pattern";

const result = match(state)
  .with({ status: "idle" }, () => "Idle")
  .with({ status: "loading" }, () => "Loading")
  .with({ status: "success" }, ({ data }) => `Data: ${data}`)
  .with({ status: "error" }, ({ error }) => `Error: ${error.message}`)
  .exhaustive(); // ✅ Compile error if case missing!
```

**Benefits:**

- ✅ Compile-time exhaustiveness checking
- ✅ Cleaner syntax with destructuring
- ✅ Type-safe pattern extraction
- ✅ Better ergonomics for complex patterns

## Basic Pattern Matching

### Simple Discriminated Union

```typescript
type Result<T> = { success: true; data: T } | { success: false; error: string };

const getMessage = <T>(result: Result<T>) =>
  match(result)
    .with({ success: true }, ({ data }) => `Success: ${data}`)
    .with({ success: false }, ({ error }) => `Error: ${error}`)
    .exhaustive();
```

### Exhaustiveness Checking

The `.exhaustive()` method ensures all cases are covered at compile time:

```typescript
type Status = "pending" | "approved" | "rejected";

// ❌ Compile error: missing 'rejected' case
const getColor = (status: Status) =>
  match(status)
    .with("pending", () => "yellow")
    .with("approved", () => "green")
    // .with('rejected', () => 'red')  // Missing!
    .exhaustive(); // TypeScript error here
```

### Pattern Extraction (Destructuring)

Extract values directly in the pattern:

```typescript
type User = {
  type: "admin" | "user";
  name: string;
  permissions?: string[];
};

const greet = (user: User) =>
  match(user)
    .with({ type: "admin", name: P.select() }, (name) => `Admin ${name}`)
    .with({ type: "user" }, ({ name }) => `User ${name}`)
    .exhaustive();
```

## Advanced Patterns

For complete advanced pattern documentation, see:

- [Advanced Patterns Reference](references/advanced-patterns.md)
- [Guard Functions](references/advanced-patterns.md#guard-functions)
- [Select Patterns](references/advanced-patterns.md#select-patterns)
- [Nested Patterns](references/advanced-patterns.md#nested-patterns)

### Nested Patterns

Match on nested structures:

```typescript
type ApiResponse = {
  result: { status: "ok"; data: any } | { status: "error"; code: number };
};

const handle = (response: ApiResponse) =>
  match(response)
    .with({ result: { status: "ok" } }, ({ result }) => result.data)
    .with({ result: { status: "error", code: 404 } }, () => "Not found")
    .with({ result: { status: "error" } }, ({ result }) => `Error ${result.code}`)
    .exhaustive();
```

### Guard Functions (P.when)

Add runtime conditions:

```typescript
type User = { age: number; name: string };

const classify = (user: User) =>
  match(user)
    .with({ age: P.when((age) => age >= 18) }, ({ name }) => `Adult: ${name}`)
    .with({ age: P.when((age) => age < 18) }, ({ name }) => `Minor: ${name}`)
    .exhaustive();
```

### Select Patterns (P.select)

Extract nested values:

```typescript
const result = match({ user: { profile: { name: "Alice" } } })
  .with({ user: { profile: { name: P.select() } } }, (name) => name)
  .otherwise(() => "Unknown");
// result === 'Alice'
```

## Chariot Patterns

For complete Chariot integration examples, see [Chariot Integration Patterns](references/chariot-patterns.md).

### TanStack Query State Handling

**Before (verbose conditionals):**

```typescript
function AssetList() {
  const query = useQuery({ queryKey: ['assets'], queryFn: fetchAssets });

  if (query.isLoading) return <Spinner />;
  if (query.isError) return <Error error={query.error} />;
  if (query.isSuccess) return <Table data={query.data} />;
  return null; // Forgot idle state!
}
```

**After (exhaustive pattern matching):**

```typescript
import { match } from 'ts-pattern';

function AssetList() {
  const query = useQuery({ queryKey: ['assets'], queryFn: fetchAssets });

  return match(query)
    .with({ status: 'pending' }, () => <Spinner />)
    .with({ status: 'error' }, ({ error }) => <Error error={error} />)
    .with({ status: 'success' }, ({ data }) => <Table data={data} />)
    .exhaustive(); // Compile error if case missing
}
```

### Job Execution Result Handling

**Before (nested switch statements):**

```typescript
function handleJobResult(job: Job) {
  switch (job.status) {
    case "pending":
      return "Waiting...";
    case "running":
      return "In progress...";
    case "completed":
      switch (job.result.type) {
        case "success":
          return `Found ${job.result.findings.length} issues`;
        case "failure":
          return `Failed: ${job.result.error}`;
      }
    case "cancelled":
      return "Cancelled";
  }
}
```

**After (flat pattern matching):**

```typescript
const handleJobResult = (job: Job) =>
  match(job)
    .with({ status: "pending" }, () => "Waiting...")
    .with({ status: "running" }, () => "In progress...")
    .with(
      { status: "completed", result: { type: "success" } },
      ({ result }) => `Found ${result.findings.length} issues`
    )
    .with(
      { status: "completed", result: { type: "failure" } },
      ({ result }) => `Failed: ${result.error}`
    )
    .with({ status: "cancelled" }, () => "Cancelled")
    .exhaustive();
```

### Integration Response Parsing

**Before (verbose type guards):**

```typescript
function parseJiraResponse(response: JiraResponse) {
  if ("error" in response && response.error.code === 401) {
    return { type: "auth_error" as const };
  }
  if ("error" in response) {
    return { type: "api_error" as const, message: response.error.message };
  }
  if ("data" in response && response.data.issues) {
    return { type: "success" as const, issues: response.data.issues };
  }
  return { type: "unknown" as const };
}
```

**After (pattern matching):**

```typescript
const parseJiraResponse = (response: JiraResponse) =>
  match(response)
    .with({ error: { code: 401 } }, () => ({ type: "auth_error" as const }))
    .with({ error: P.select() }, (error) => ({
      type: "api_error" as const,
      message: error.message,
    }))
    .with({ data: { issues: P.select() } }, (issues) => ({
      type: "success" as const,
      issues,
    }))
    .otherwise(() => ({ type: "unknown" as const }));
```

### Asset Type-Specific Rendering

See [Chariot Patterns - Asset Rendering](references/chariot-patterns.md#asset-type-specific-rendering) for complete examples.

## vs Discriminated Unions

| Scenario                      | Discriminated Union + Switch | ts-pattern           |
| ----------------------------- | ---------------------------- | -------------------- |
| 2-3 simple cases              | ✅ Simpler                   | ⚠️ Overkill          |
| 4+ complex cases              | ⚠️ Verbose                   | ✅ Better ergonomics |
| Nested structures             | ❌ Deeply nested             | ✅ Flat patterns     |
| Exhaustiveness required       | ⚠️ Manual `default` case     | ✅ `.exhaustive()`   |
| Runtime guards needed         | ⚠️ Manual if/else            | ✅ `P.when()`        |
| Extracting nested values      | ❌ Verbose destructuring     | ✅ `P.select()`      |
| Team unfamiliar with patterns | ✅ Standard TypeScript       | ⚠️ Training overhead |
| Bundle size critical          | ✅ Zero overhead             | ⚠️ +10KB             |

**Rule of thumb:**

- Use switch for ≤3 simple cases
- Use ts-pattern for 4+ cases or complex patterns
- Always use `.exhaustive()` when all cases must be handled

## Integration Patterns

### React Components

```typescript
function StatusBadge({ status }: { status: Status }) {
  const { color, label } = match(status)
    .with('pending', () => ({ color: 'yellow', label: 'Pending' }))
    .with('approved', () => ({ color: 'green', label: 'Approved' }))
    .with('rejected', () => ({ color: 'red', label: 'Rejected' }))
    .exhaustive();

  return <Badge color={color}>{label}</Badge>;
}
```

### API Response Handlers

```typescript
const fetchData = async () => {
  const response = await fetch("/api/data");

  return match(response)
    .with({ ok: true }, async (res) => ({ type: "success" as const, data: await res.json() }))
    .with({ status: 401 }, () => ({ type: "unauthorized" as const }))
    .with({ status: 404 }, () => ({ type: "not_found" as const }))
    .otherwise((res) => ({ type: "error" as const, status: res.status }));
};
```

### Error Handling

```typescript
type AppError =
  | { type: "network"; message: string }
  | { type: "validation"; fields: string[] }
  | { type: "auth"; redirectUrl: string }
  | { type: "unknown"; error: Error };

const handleError = (error: AppError) =>
  match(error)
    .with({ type: "network" }, ({ message }) => toast.error(`Network: ${message}`))
    .with({ type: "validation" }, ({ fields }) => showValidationErrors(fields))
    .with({ type: "auth" }, ({ redirectUrl }) => (window.location.href = redirectUrl))
    .with({ type: "unknown" }, ({ error }) => console.error(error))
    .exhaustive();
```

## Performance Considerations

### Runtime Overhead

- **Pattern matching:** ~1-2μs per match (negligible for UI logic)
- **Switch statement:** ~0.5μs per match
- **Overhead:** ~2x slower, but irrelevant for typical use cases

### Bundle Size Impact

- **ts-pattern:** ~10KB minified (~3KB gzipped)
- **Tree-shaking:** Only imports used patterns
- **Impact:** Minimal for modern apps (total bundle usually 100KB-1MB)

### When Overhead Matters

**Use switch instead of ts-pattern when:**

- Hot path with millions of iterations per second
- Embedded systems with 50KB bundle limit
- Performance profiler shows pattern matching bottleneck

**For typical Chariot use cases (UI rendering, API responses, job state), overhead is negligible.**

## Anti-patterns

### ❌ Don't Use for Simple Cases

```typescript
// ❌ OVERKILL: 2-case switch doesn't need pattern matching
const result = match(value)
  .with(true, () => "yes")
  .with(false, () => "no")
  .exhaustive();

// ✅ BETTER: Simple ternary
const result = value ? "yes" : "no";
```

### ❌ Don't Skip .exhaustive()

```typescript
// ❌ BAD: Non-exhaustive (defeats the purpose)
const result = match(status)
  .with("pending", () => "yellow")
  .with("approved", () => "green")
  .otherwise(() => "gray"); // Missing 'rejected' case not caught

// ✅ GOOD: Exhaustive
const result = match(status)
  .with("pending", () => "yellow")
  .with("approved", () => "green")
  .with("rejected", () => "red")
  .exhaustive(); // Compile error if case missing
```

### ❌ Don't Overuse (Bundle Bloat)

```typescript
// ❌ BAD: Simple value lookup doesn't need pattern matching
const colorMap = match(status)
  .with("pending", () => "yellow")
  .with("approved", () => "green")
  .with("rejected", () => "red")
  .exhaustive();

// ✅ BETTER: Object literal for simple mappings
const colorMap: Record<Status, string> = {
  pending: "yellow",
  approved: "green",
  rejected: "red",
};
```

## Related Skills

- `validating-with-zod-schemas` - Use Zod for runtime validation before pattern matching
- `implementing-result-either-pattern` - Combine with Result types for error handling
- `using-typescript-satisfies-operator` - Type-safe object literals with exhaustive checking

## Resources

- [ts-pattern GitHub](https://github.com/gvergnaud/ts-pattern) - Official repository
- [ts-pattern Playground](https://www.typescriptlang.org/play?ts=5.3.3#code/...) - Interactive examples
- [TypeScript Handbook - Discriminated Unions](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-func.html#discriminated-unions)
