---
name: validating-with-zod-schemas
description: Use when implementing input validation, API request/response validation, or schema-first development - covers Zod patterns beyond forms including safeParse, schema composition, discriminated unions, and error customization
allowed-tools: Read, Glob, Grep
---

# Validating with Zod Schemas

**Type-safe runtime validation for TypeScript applications beyond form handling.**

## When to Use

Use this skill when:

- Validating API request/response payloads
- Implementing schema-first development patterns
- Building type-safe data transformations
- Creating discriminated unions for state management
- Need runtime validation with TypeScript type inference

**Not for forms**: For React Hook Form + Zod integration, see `implementing-react-hook-form-zod` skill.

## Quick Reference

### safeParse vs parse

```typescript
// ❌ parse() throws - use in controlled contexts only
const data = schema.parse(input); // Throws ZodError

// ✅ safeParse() returns Result - use at boundaries
const result = schema.safeParse(input);
if (!result.success) {
  return { error: result.error.flatten() };
}
return { data: result.data };
```

**Rule**: Use `safeParse()` at system boundaries (API handlers, user input). Use `parse()` only when you control the input and want to fail fast.

### Schema Composition

```typescript
// Base schema
const baseUser = z.object({ id: z.string(), name: z.string() });

// Extend with additional fields
const adminUser = baseUser.extend({ permissions: z.array(z.string()) });

// Make all fields optional
const partialUser = baseUser.partial();

// Pick specific fields
const pickedUser = baseUser.pick({ name: true });

// Omit specific fields
const omittedUser = baseUser.omit({ id: true });

// Merge two schemas
const merged = baseUser.merge(z.object({ email: z.string() }));
```

### Discriminated Unions (Tagged Unions)

```typescript
// API response pattern
const apiResponse = z.discriminatedUnion("status", [
  z.object({ status: z.literal("success"), data: z.any() }),
  z.object({ status: z.literal("error"), message: z.string() }),
]);

// State machine pattern
const loadingState = z.discriminatedUnion("state", [
  z.object({ state: z.literal("idle") }),
  z.object({ state: z.literal("loading") }),
  z.object({ state: z.literal("success"), data: z.array(z.string()) }),
  z.object({ state: z.literal("error"), error: z.string() }),
]);
```

### Custom Error Messages

```typescript
const schema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email({ message: "Invalid email format" })
    .refine((val) => !val.includes("+"), {
      message: "Plus aliases not allowed",
    }),
  age: z.number().min(18, { message: "Must be 18 or older" }),
});
```

### Transform and Coerce

```typescript
// Transform during validation
const dateSchema = z.string().transform((str) => new Date(str));

// Coerce primitives (converts input type)
const numberSchema = z.coerce.number(); // '123' -> 123
const boolSchema = z.coerce.boolean(); // 'true' -> true
const dateCoerce = z.coerce.date(); // '2024-01-01' -> Date
```

### Type Inference

```typescript
// Infer TypeScript type from schema
const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});
type User = z.infer<typeof UserSchema>;
// Result: { name: string; email: string }

// Input vs Output types (for transforms)
type UserInput = z.input<typeof UserSchema>;
type UserOutput = z.output<typeof UserSchema>;
```

## Common Patterns

### API Validation Pattern

```typescript
// Define request/response schemas
const CreateUserRequest = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const CreateUserResponse = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string(),
  createdAt: z.string().datetime(),
});

// Validate in handler
export async function createUser(req: Request) {
  const result = CreateUserRequest.safeParse(req.body);
  if (!result.success) {
    return Response.json({ errors: result.error.flatten() }, { status: 400 });
  }
  // result.data is typed correctly
  const user = await db.users.create(result.data);
  return Response.json(user);
}
```

### Environment Variable Validation

```typescript
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(32),
  PORT: z.coerce.number().default(3000),
});

// Validate at startup - fail fast with parse()
export const env = envSchema.parse(process.env);
```

### Optional with Defaults

```typescript
const configSchema = z.object({
  timeout: z.number().default(5000),
  retries: z.number().default(3),
  debug: z.boolean().default(false),
});

// Partial input, full output
const config = configSchema.parse({}); // { timeout: 5000, retries: 3, debug: false }
```

## Error Handling

### Flattening Errors

```typescript
const result = schema.safeParse(input);
if (!result.success) {
  const flat = result.error.flatten();
  // { formErrors: string[], fieldErrors: { [field]: string[] } }
}
```

### Custom Error Maps

```typescript
const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type) {
    return { message: `Expected ${issue.expected}, got ${issue.received}` };
  }
  return { message: ctx.defaultError };
};

z.setErrorMap(customErrorMap);
```

## References

For advanced patterns:

- [Advanced Schema Patterns](references/advanced-patterns.md) - Recursive schemas, branded types, preprocessing
- [Error Handling Patterns](references/error-handling.md) - Custom error maps, localization, error formatting

## External Resources

- [Zod Documentation](https://zod.dev)
- [Zod GitHub](https://github.com/colinhacks/zod)
