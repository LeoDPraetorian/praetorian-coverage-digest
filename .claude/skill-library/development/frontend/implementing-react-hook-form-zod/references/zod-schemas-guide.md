# Comprehensive Zod Schemas Guide

Complete reference for all Zod schema types and patterns.

---

## ⚠️ Zod v4 Breaking Changes

### 1. String Format Validators (Top-Level Functions)

**String format validators** moved from methods to top-level functions:

| Deprecated (v3) | Current (v4) | Notes |
|-----------------|--------------|-------|
| `z.string().email()` | `z.email()` | Method deprecated, will be removed |
| `z.string().url()` | `z.url()` | Method deprecated, will be removed |
| `z.string().uuid()` | `z.uuid()` | Now RFC 9562/4122 strict |
| N/A | `z.guid()` | New: Permissive UUID-like validation |

**Why the change**: Top-level functions are less verbose, more tree-shakable, and string formats are now subclasses of ZodString instead of refinements.

### 2. UUID Validation Strictness

**`z.uuid()` is now RFC 9562/4122 compliant** - variant bits must be `10` per the spec.

```typescript
// Zod v4 - Strict RFC compliance
z.uuid()  // Only accepts valid UUIDs with correct variant bits

// For permissive validation (any 8-4-4-4-12 hex pattern)
z.guid()  // Accepts UUID-like strings without strict RFC validation
```

**Migration**: If your UUIDs fail validation after upgrading, use `z.guid()` for the previous behavior.

### 3. Error Customization API Changes

**`message` parameter deprecated** - use `error` instead:

```typescript
// Deprecated (still works but will be removed)
z.string().min(3, { message: "Too short" })

// Recommended
z.string().min(3, { error: "Too short" })
```

**`invalid_type_error` and `required_error` dropped**:

```typescript
// ❌ No longer works in v4
z.string({
  required_error: "Name is required",
  invalid_type_error: "Name must be text"
})

// ✅ Use error customization API instead
z.string().min(1, { error: "Name is required" })
```

---

## Primitives

```typescript
// String
z.string();
z.string().min(3, "Min 3 characters");
z.string().max(100, "Max 100 characters");
z.string().length(10, "Exactly 10 characters");
z.string().regex(/pattern/, "Does not match pattern");
z.string().trim(); // Trim whitespace
z.string().toLowerCase(); //Convert to lowercase
z.string().toUpperCase(); // Convert to uppercase

// String format validators (Zod v4 top-level functions)
z.email("Invalid email");       // Use instead of z.string().email()
z.url("Invalid URL");            // Use instead of z.string().url()
z.uuid("Invalid UUID");          // Use instead of z.string().uuid() - RFC 9562/4122 strict
z.guid("Invalid GUID");          // Permissive UUID-like pattern (8-4-4-4-12)

// Number
z.number();
z.number().int("Must be integer");
z.number().positive("Must be positive");
z.number().negative("Must be negative");
z.number().min(0, "Min is 0");
z.number().max(100, "Max is 100");
z.number().multipleOf(5, "Must be multiple of 5");
z.number().finite(); // No Infinity or NaN
z.number().safe(); // Within JS safe integer range

// Boolean
z.boolean();

// Date
z.date();
z.date().min(new Date("2020-01-01"), "Too old");
z.date().max(new Date(), "Cannot be in future");

// BigInt
z.bigint();
```

---

## Objects

```typescript
// Basic object
const userSchema = z.object({
  name: z.string(),
  age: z.number(),
});

// Nested object
const profileSchema = z.object({
  user: userSchema,
  address: z.object({
    street: z.string(),
    city: z.string(),
  }),
});

// Note: Use z.email() instead of z.string().email() for email fields in Zod v4

// Partial (all fields optional)
const partialUserSchema = userSchema.partial();

// Deep Partial (recursively optional)
const deepPartialSchema = profileSchema.deepPartial();

// Pick specific fields
const nameOnlySchema = userSchema.pick({ name: true });

// Omit specific fields
const withoutAgeSchema = userSchema.omit({ age: true });

// Merge objects
const extendedUserSchema = userSchema.merge(
  z.object({
    email: z.email(),
  })
);

// Passthrough (allow extra fields)
const passthroughSchema = userSchema.passthrough();

// Strict (no extra fields)
const strictSchema = userSchema.strict();

// Catchall (type for extra fields)
const catchallSchema = userSchema.catchall(z.string());
```

---

## Arrays

```typescript
// Array of strings
z.array(z.string());

// With length constraints
z.array(z.string()).min(1, "At least one item required");
z.array(z.string()).max(10, "Max 10 items");
z.array(z.string()).length(5, "Exactly 5 items");
z.array(z.string()).nonempty("Array cannot be empty");

// Array of objects
z.array(
  z.object({
    name: z.string(),
    age: z.number(),
  })
);
```

---

## Tuples

```typescript
// Fixed-length array with specific types
z.tuple([z.string(), z.number(), z.boolean()]);

// With rest
z.tuple([z.string(), z.number()]).rest(z.boolean());
```

---

## Enums and Literals

```typescript
// Enum
z.enum(["red", "green", "blue"]);

// Native enum
enum Color {
  Red,
  Green,
  Blue,
}
z.nativeEnum(Color);

// Literal
z.literal("hello");
z.literal(42);
z.literal(true);
```

---

## Unions and Discriminated Unions

```typescript
// Union
z.union([z.string(), z.number()]);

// Discriminated union (recommended for better errors)
z.discriminatedUnion("type", [
  z.object({ type: z.literal("user"), name: z.string() }),
  z.object({ type: z.literal("admin"), permissions: z.array(z.string()) }),
]);
```

---

## Optional and Nullable

```typescript
// Optional (value | undefined)
z.string().optional();
z.optional(z.string()); // Same as above

// Nullable (value | null)
z.string().nullable();
z.nullable(z.string()); // Same as above

// Nullish (value | null | undefined)
z.string().nullish();
```

---

## Default Values

```typescript
z.string().default("default value");
z.number().default(0);
z.boolean().default(false);
z.array(z.string()).default([]);
```

---

## Refinements (Custom Validation)

```typescript
// Basic refinement
z.string().refine((val) => val.length > 5, {
  message: "String must be longer than 5 characters",
});

// With custom path
z.object({
  password: z.string(),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Multiple refinements
z.string()
  .refine((val) => val.length >= 8, "Min 8 characters")
  .refine((val) => /[A-Z]/.test(val), "Must contain uppercase")
  .refine((val) => /[0-9]/.test(val), "Must contain number");

// Async refinement
z.string().refine(async (val) => {
  const available = await checkAvailability(val);
  return available;
}, "Already taken");
```

---

## Transforms

```typescript
// String to number
z.string().transform((val) => parseInt(val, 10));

// Trim whitespace
z.string().transform((val) => val.trim());

// Parse date
z.string().transform((val) => new Date(val));

// Chain transform and refine
z.string()
  .transform((val) => parseInt(val, 10))
  .refine((val) => !isNaN(val), "Must be a number");
```

---

## Preprocess

```typescript
// Process before validation
z.preprocess((val) => (val === "" ? undefined : val), z.string().optional());

// Convert to number
z.preprocess((val) => Number(val), z.number());
```

---

## Coercion (Zod v4)

**Recommended for form inputs** - simpler than preprocess for common type conversions.

```typescript
// String → Number
z.coerce.number()

// String → Boolean
z.coerce.boolean()

// String → Date
z.coerce.date()
```

**Critical gotcha**: `z.coerce.number()` converts empty strings to `0`, causing false positives on required fields.

**Solution** - Use pipe pattern:
```typescript
z.string().min(1, "Required").pipe(z.coerce.number().min(18))
```

**For complete coercion guide including empty string handling, when NOT to use coercion, and z.coerce vs z.preprocess comparison, see [coercion-guide.md](coercion-guide.md)**

---

## Intersections

```typescript
const baseUser = z.object({ name: z.string() });
const withEmail = z.object({ email: z.email() });

// Intersection (combines both)
const userWithEmail = baseUser.and(withEmail);
// OR
const userWithEmail = z.intersection(baseUser, withEmail);
```

---

## Records and Maps

```typescript
// Record (object with dynamic keys)
z.record(z.string()); // { [key: string]: string }
z.record(z.string(), z.number()); // { [key: string]: number }

// Map
z.map(z.string(), z.number());
```

---

## Sets

```typescript
z.set(z.string());
z.set(z.number()).min(1, "At least one item");
z.set(z.string()).max(10, "Max 10 items");
```

---

## Promises

```typescript
z.promise(z.string());
z.promise(z.object({ data: z.string() }));
```

---

## Custom Error Messages

```typescript
// Field-level
z.string({ required_error: "Name is required" });
z.number({ invalid_type_error: "Must be a number" });

// Validation-level
z.string().min(3, { message: "Min 3 characters" });
z.email({ message: "Invalid email format" });

// Custom error map
const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type) {
    if (issue.expected === "string") {
      return { message: "Please enter text" };
    }
  }
  return { message: ctx.defaultError };
};

z.setErrorMap(customErrorMap);
```

---

## Type Inference

```typescript
const userSchema = z.object({
  name: z.string(),
  age: z.number(),
});

// Infer TypeScript type
type User = z.infer<typeof userSchema>;
// Result: { name: string; age: number }

// Input type (before transforms)
type UserInput = z.input<typeof transformSchema>;

// Output type (after transforms)
type UserOutput = z.output<typeof transformSchema>;
```

---

## Parsing Methods

```typescript
// .parse() - throws on error
const result = schema.parse(data);

// .safeParse() - returns result object
const result = schema.safeParse(data);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}

// .parseAsync() - async validation
const result = await schema.parseAsync(data);

// .safeParseAsync() - async with result object
const result = await schema.safeParseAsync(data);
```

---

## Error Handling

```typescript
try {
  schema.parse(data);
} catch (error) {
  if (error instanceof z.ZodError) {
    // Formatted errors
    console.log(error.format());

    // Flattened errors (for forms)
    console.log(error.flatten());

    // Individual issues
    console.log(error.issues);
  }
}
```

---

**Official Docs**: https://zod.dev
