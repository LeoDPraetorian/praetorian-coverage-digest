# Advanced Pattern Matching Patterns

**Deep dive into ts-pattern's advanced features for complex use cases.**

## Guard Functions (P.when)

Use `P.when()` for runtime conditions that can't be expressed as static patterns.

### Basic Guard

```typescript
import { match, P } from "ts-pattern";

type User = { age: number; name: string; verified: boolean };

const classify = (user: User) =>
  match(user)
    .with(
      { age: P.when((age) => age >= 18), verified: true },
      ({ name }) => `Verified adult: ${name}`
    )
    .with({ age: P.when((age) => age >= 18) }, ({ name }) => `Adult: ${name}`)
    .with({ age: P.when((age) => age < 18) }, ({ name }) => `Minor: ${name}`)
    .exhaustive();
```

### Complex Guards

```typescript
type Asset = {
  class: string;
  risk_score?: number;
  status: "active" | "inactive";
};

const getRiskLevel = (asset: Asset) =>
  match(asset)
    .with(
      {
        status: "active",
        risk_score: P.when((score) => score !== undefined && score >= 8),
      },
      () => "critical"
    )
    .with(
      {
        status: "active",
        risk_score: P.when((score) => score !== undefined && score >= 5),
      },
      () => "high"
    )
    .with({ status: "active" }, () => "low")
    .with({ status: "inactive" }, () => "none")
    .exhaustive();
```

### Guards with Type Narrowing

```typescript
type Result<T> = { success: true; data: T } | { success: false; error: Error };

const processResult = <T>(result: Result<T>) =>
  match(result)
    .with(
      { success: true, data: P.when((data) => Array.isArray(data)) },
      ({ data }) => `Array with ${data.length} items`
    )
    .with({ success: true }, ({ data }) => `Single value: ${data}`)
    .with({ success: false }, ({ error }) => `Error: ${error.message}`)
    .exhaustive();
```

## Select Patterns (P.select)

Extract nested values for use in the handler.

### Basic Selection

```typescript
const result = match({ user: { profile: { name: "Alice", age: 30 } } })
  .with({ user: { profile: { name: P.select() } } }, (name) => `Name: ${name}`)
  .otherwise(() => "Unknown");
// result === 'Name: Alice'
```

### Multiple Selections

```typescript
const result = match({ user: { name: "Alice", age: 30 } })
  .with(
    { user: { name: P.select("name"), age: P.select("age") } },
    ({ name, age }) => `${name} is ${age} years old`
  )
  .otherwise(() => "Unknown");
// result === 'Alice is 30 years old'
```

### Conditional Selection

```typescript
type ApiResponse = {
  result: { status: "ok"; data: any } | { status: "error"; code: number; message: string };
};

const handle = (response: ApiResponse) =>
  match(response)
    .with({ result: { status: "ok", data: P.select() } }, (data) => data)
    .with({ result: { status: "error", message: P.select() } }, (message) => `Error: ${message}`)
    .exhaustive();
```

## Nested Patterns

Match deeply nested structures without verbose destructuring.

### Nested Object Patterns

```typescript
type Job = {
  id: string;
  execution: {
    status: "pending" | "running" | "completed";
    result?: {
      type: "success" | "failure";
      findings?: any[];
      error?: string;
    };
  };
};

const getJobSummary = (job: Job) =>
  match(job)
    .with({ execution: { status: "pending" } }, () => "Waiting to start")
    .with({ execution: { status: "running" } }, () => "In progress")
    .with(
      { execution: { status: "completed", result: { type: "success", findings: P.select() } } },
      (findings) => `Found ${findings.length} issues`
    )
    .with(
      { execution: { status: "completed", result: { type: "failure", error: P.select() } } },
      (error) => `Failed: ${error}`
    )
    .exhaustive();
```

### Array Patterns

```typescript
import { match, P } from "ts-pattern";

// Match specific array lengths
const result = match([1, 2, 3])
  .with([], () => "empty")
  .with([P._], () => "single element")
  .with([P._, P._], () => "two elements")
  .otherwise((arr) => `${arr.length} elements`);

// Match array elements with conditions
const classify = (numbers: number[]) =>
  match(numbers)
    .with([P.when((n) => n > 0), ...P.array()], () => "starts with positive")
    .with([0, ...P.array()], () => "starts with zero")
    .otherwise(() => "other");
```

### Combined Nested + Guard

```typescript
type Integration = {
  provider: "jira" | "defender" | "hackerone";
  response: {
    status: number;
    data?: any;
    error?: string;
  };
};

const handleIntegration = (integration: Integration) =>
  match(integration)
    .with(
      {
        provider: "jira",
        response: { status: P.when((s) => s >= 200 && s < 300), data: P.select() },
      },
      (data) => ({ type: "success" as const, issues: data.issues })
    )
    .with({ response: { status: 401 } }, () => ({ type: "auth_error" as const }))
    .with({ response: { status: P.when((s) => s >= 500), error: P.select() } }, (error) => ({
      type: "server_error" as const,
      message: error,
    }))
    .otherwise(() => ({ type: "unknown_error" as const }));
```

## Optional Patterns (P.optional)

Match properties that may or may not exist.

```typescript
type Asset = {
  name: string;
  dns?: { name: string; records: string[] };
  risk_score?: number;
};

const describe = (asset: Asset) =>
  match(asset)
    .with(
      { dns: P.optional({ name: P.select() }), risk_score: P.optional(P.select()) },
      ({ dns, risk_score }) => {
        const dnsInfo = dns ? ` (${dns})` : "";
        const riskInfo = risk_score ? ` [Risk: ${risk_score}]` : "";
        return `${asset.name}${dnsInfo}${riskInfo}`;
      }
    )
    .exhaustive();
```

## Wildcard Patterns (P.\_)

Match any value without extracting it.

```typescript
const classify = (value: unknown) =>
  match(value)
    .with({ type: "user", id: P._ }, () => "user object")
    .with({ type: P._, id: P._ }, () => "object with type and id")
    .with(P._, () => "other");
```

## Union Type Patterns

Match against union types with type narrowing.

```typescript
type Event =
  | { type: "click"; x: number; y: number }
  | { type: "keypress"; key: string }
  | { type: "scroll"; delta: number };

const handleEvent = (event: Event) =>
  match(event)
    .with({ type: "click" }, ({ x, y }) => `Clicked at (${x}, ${y})`)
    .with({ type: "keypress", key: "Enter" }, () => "Enter pressed")
    .with({ type: "keypress" }, ({ key }) => `Key ${key} pressed`)
    .with({ type: "scroll", delta: P.when((d) => d > 0) }, () => "Scrolled down")
    .with({ type: "scroll" }, () => "Scrolled up")
    .exhaustive();
```

## Performance Tips

### Avoid Deep Nesting

```typescript
// ❌ SLOW: Deep nesting requires more checks
const result = match(data)
  .with({ a: { b: { c: { d: { e: P.select() } } } } }, (e) => e)
  .otherwise(() => null);

// ✅ FASTER: Extract early if possible
const result = data?.a?.b?.c?.d?.e ?? null;
```

### Use Guards Sparingly

```typescript
// ❌ SLOW: Guard on every pattern
const result = match(value)
  .with(
    P.when((v) => typeof v === "string"),
    (v) => `string: ${v}`
  )
  .with(
    P.when((v) => typeof v === "number"),
    (v) => `number: ${v}`
  )
  .otherwise(() => "other");

// ✅ FASTER: Use specific patterns
const result = match(value)
  .with(P.string, (v) => `string: ${v}`)
  .with(P.number, (v) => `number: ${v}`)
  .otherwise(() => "other");
```

## Common Patterns

### API Response Handling

```typescript
type ApiResponse<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

const handleResponse = <T>(response: ApiResponse<T>) =>
  match(response)
    .with({ ok: true, data: P.select() }, (data) => ({ type: "success" as const, data }))
    .with({ ok: false, status: 401 }, () => ({ type: "unauthorized" as const }))
    .with({ ok: false, status: 404 }, () => ({ type: "not_found" as const }))
    .with({ ok: false, error: P.select() }, (error) => ({ type: "error" as const, error }))
    .exhaustive();
```

### State Machine Transitions

```typescript
type State =
  | { status: "idle" }
  | { status: "loading"; startTime: number }
  | { status: "success"; data: any; endTime: number }
  | { status: "error"; error: Error };

type Action = { type: "start" } | { type: "succeed"; data: any } | { type: "fail"; error: Error };

const reducer = (state: State, action: Action): State =>
  match([state, action] as const)
    .with([{ status: "idle" }, { type: "start" }], () => ({
      status: "loading" as const,
      startTime: Date.now(),
    }))
    .with([{ status: "loading" }, { type: "succeed" }], ([_, action]) => ({
      status: "success" as const,
      data: action.data,
      endTime: Date.now(),
    }))
    .with([{ status: "loading" }, { type: "fail" }], ([_, action]) => ({
      status: "error" as const,
      error: action.error,
    }))
    .otherwise(([state]) => state); // No transition
```
