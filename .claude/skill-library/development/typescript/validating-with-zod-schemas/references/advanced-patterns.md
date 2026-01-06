# Advanced Zod Schema Patterns

## Recursive Schemas

```typescript
// Self-referencing type (e.g., tree structure)
interface Category {
  name: string;
  subcategories: Category[];
}

const categorySchema: z.ZodType<Category> = z.lazy(() =>
  z.object({
    name: z.string(),
    subcategories: z.array(categorySchema),
  })
);
```

## Branded Types

```typescript
// Create nominal types for type safety
const UserId = z.string().uuid().brand<"UserId">();
const PostId = z.string().uuid().brand<"PostId">();

type UserId = z.infer<typeof UserId>;
type PostId = z.infer<typeof PostId>;

// Now these are incompatible at compile time
function getUser(id: UserId) {}
function getPost(id: PostId) {}

const userId = UserId.parse("123e4567-e89b-12d3-a456-426614174000");
getUser(userId); // OK
// getPost(userId); // Type error!
```

## Preprocessing

```typescript
// Transform input before validation
const trimmedString = z.preprocess(
  (val) => (typeof val === "string" ? val.trim() : val),
  z.string()
);

// Parse JSON strings
const jsonSchema = z.preprocess(
  (val) => {
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  },
  z.object({ data: z.any() })
);
```

## Passthrough and Strict

```typescript
// Allow extra fields (pass through)
const looseSchema = z.object({ name: z.string() }).passthrough();
looseSchema.parse({ name: "test", extra: "kept" }); // { name: 'test', extra: 'kept' }

// Strip extra fields (default behavior)
const stripSchema = z.object({ name: z.string() });
stripSchema.parse({ name: "test", extra: "removed" }); // { name: 'test' }

// Error on extra fields
const strictSchema = z.object({ name: z.string() }).strict();
strictSchema.parse({ name: "test", extra: "error" }); // Throws!
```

## Conditional Validation (Refinements)

```typescript
const passwordSchema = z
  .object({
    password: z.string(),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

// Multiple refinements
const dateRangeSchema = z
  .object({
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });
```

## Async Validation

```typescript
const uniqueEmailSchema = z
  .string()
  .email()
  .refine(
    async (email) => {
      const exists = await db.users.findByEmail(email);
      return !exists;
    },
    { message: "Email already in use" }
  );

// Use parseAsync for async refinements
const result = await uniqueEmailSchema.safeParseAsync(email);
```

## Union vs Discriminated Union

```typescript
// Regular union - tries each option until one works
const regularUnion = z.union([
  z.object({ type: z.literal("a"), a: z.string() }),
  z.object({ type: z.literal("b"), b: z.number() }),
]);

// Discriminated union - uses discriminator for O(1) lookup
const discriminatedUnion = z.discriminatedUnion("type", [
  z.object({ type: z.literal("a"), a: z.string() }),
  z.object({ type: z.literal("b"), b: z.number() }),
]);

// Discriminated union is faster and gives better error messages
```

## Nullable vs Optional vs Nullish

```typescript
// Optional: field can be omitted
z.string().optional(); // string | undefined

// Nullable: field can be null
z.string().nullable(); // string | null

// Nullish: field can be null, undefined, or omitted
z.string().nullish(); // string | null | undefined
```
