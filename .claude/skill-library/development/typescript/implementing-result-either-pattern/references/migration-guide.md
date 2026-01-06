# Migration Guide: Try-Catch to Result Pattern

## Identifying Migration Candidates

**Good candidates for Result pattern:**

- Functions with expected failures (validation, parsing, network requests)
- Operations at system boundaries (API handlers, file I/O)
- Functions where errors are part of normal flow
- Code with nested try-catch blocks

**Poor candidates:**

- Internal implementation details
- Programmer errors (null checks, array bounds)
- Performance-critical hot paths
- Code where exceptions are truly exceptional

## Migration Steps

### Step 1: Identify Error Cases

Before:

```typescript
function parseConfig(path: string): Config {
  // What can fail?
  // - File doesn't exist
  // - File not readable
  // - Invalid JSON
  // - JSON doesn't match Config shape
  const content = fs.readFileSync(path, "utf-8");
  const json = JSON.parse(content);
  return validateConfig(json);
}
```

### Step 2: Define Error Types

Create explicit error types:

```typescript
type ConfigError =
  | { type: "FileNotFound"; path: string }
  | { type: "InvalidJSON"; message: string }
  | { type: "ValidationError"; errors: string[] };
```

### Step 3: Convert Return Type

```typescript
// Before
function parseConfig(path: string): Config;

// After
function parseConfig(path: string): Result<Config, ConfigError>;
```

### Step 4: Wrap Operations

```typescript
function parseConfig(path: string): Result<Config, ConfigError> {
  // Wrap file read
  let content: string;
  try {
    content = fs.readFileSync(path, "utf-8");
  } catch (e) {
    return Err({ type: "FileNotFound", path });
  }

  // Wrap JSON parse
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch (e) {
    return Err({ type: "InvalidJSON", message: String(e) });
  }

  // Wrap validation (already returns Result)
  return validateConfig(json);
}
```

### Step 5: Update Callers

Before:

```typescript
try {
  const config = parseConfig("./config.json");
  startServer(config);
} catch (e) {
  console.error("Failed to load config:", e);
  process.exit(1);
}
```

After:

```typescript
const configResult = parseConfig("./config.json");

if (configResult.ok) {
  startServer(configResult.value);
} else {
  const { error } = configResult;
  switch (error.type) {
    case "FileNotFound":
      console.error(`Config file not found: ${error.path}`);
      break;
    case "InvalidJSON":
      console.error(`Invalid JSON: ${error.message}`);
      break;
    case "ValidationError":
      console.error("Validation errors:", error.errors);
      break;
  }
  process.exit(1);
}
```

## Common Migration Patterns

### Pattern 1: Nested Try-Catch

Before:

```typescript
function processUser(id: string): User {
  try {
    const userData = fetchUser(id);
    try {
      const validated = validateUser(userData);
      try {
        return transformUser(validated);
      } catch (e) {
        throw new Error(`Transform failed: ${e}`);
      }
    } catch (e) {
      throw new Error(`Validation failed: ${e}`);
    }
  } catch (e) {
    throw new Error(`Fetch failed: ${e}`);
  }
}
```

After:

```typescript
function processUser(id: string): Result<User, Error> {
  return fetchUser(id)
    .andThen(validateUser)
    .andThen(transformUser)
    .mapErr((e) => new Error(`User processing failed: ${e}`));
}
```

### Pattern 2: Multiple Independent Operations

Before:

```typescript
function loadData(): Data {
  const config = loadConfig();
  const users = loadUsers();
  const settings = loadSettings();
  return { config, users, settings };
}
```

After:

```typescript
function loadData(): Result<Data, Error> {
  const configResult = loadConfig();
  if (!configResult.ok) return configResult;

  const usersResult = loadUsers();
  if (!usersResult.ok) return usersResult;

  const settingsResult = loadSettings();
  if (!settingsResult.ok) return settingsResult;

  return Ok({
    config: configResult.value,
    users: usersResult.value,
    settings: settingsResult.value,
  });
}

// Or with combining (collects all errors)
function loadData(): Result<Data, Error[]> {
  return combineResults([loadConfig(), loadUsers(), loadSettings()]).map(
    ([config, users, settings]) => ({ config, users, settings })
  );
}
```

### Pattern 3: Early Returns

Before:

```typescript
function validate(data: unknown): User {
  if (typeof data !== "object") {
    throw new Error("Must be object");
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.email !== "string") {
    throw new Error("Email must be string");
  }

  if (!obj.email.includes("@")) {
    throw new Error("Invalid email");
  }

  return obj as User;
}
```

After:

```typescript
function validate(data: unknown): Result<User, string> {
  if (typeof data !== "object") {
    return Err("Must be object");
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.email !== "string") {
    return Err("Email must be string");
  }

  if (!obj.email.includes("@")) {
    return Err("Invalid email");
  }

  return Ok(obj as User);
}
```

## Incremental Migration

You don't have to migrate everything at once:

### Boundary Pattern

Migrate external boundaries first, keep internal code unchanged:

```typescript
// External API - uses Result
export function apiHandler(req: Request): Result<Response, Error> {
  return parseRequest(req)
    .andThen((data) => {
      try {
        // Internal code can still throw
        const result = processData(data);
        return Ok(result);
      } catch (e) {
        return Err(e as Error);
      }
    })
    .map((data) => createResponse(data));
}
```

### Adapter Pattern

Create adapters between Result-based and throw-based code:

```typescript
// Adapter: Result -> throws
function unwrap<T>(result: Result<T, Error>): T {
  if (result.ok) return result.value;
  throw result.error;
}

// Adapter: throws -> Result
function safe<T>(fn: () => T): Result<T, Error> {
  try {
    return Ok(fn());
  } catch (e) {
    return Err(e as Error);
  }
}
```

## Testing

Result pattern makes testing explicit error cases easier:

```typescript
describe("parseConfig", () => {
  it("returns error for missing file", () => {
    const result = parseConfig("./nonexistent.json");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe("FileNotFound");
    }
  });

  it("returns error for invalid JSON", () => {
    const result = parseConfig("./invalid.json");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe("InvalidJSON");
    }
  });

  it("returns config for valid file", () => {
    const result = parseConfig("./valid.json");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.port).toBe(3000);
    }
  });
});
```
