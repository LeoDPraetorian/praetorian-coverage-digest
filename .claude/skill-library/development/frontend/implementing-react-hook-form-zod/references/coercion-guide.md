# Type Coercion with z.coerce

Modern approach to converting form input types with Zod.

---

## Overview

HTML forms always submit strings. `z.coerce` automatically converts these strings to the desired type **before validation**, making form handling simpler.

**When to use:**
- Form inputs (convert "42" → 42)
- Query parameters (URL strings → numbers/booleans)
- Environment variables (string → typed values)

---

## Basic Coercion

### z.coerce.number()

```typescript
const ageSchema = z.coerce.number().min(18, "Must be 18 or older");

// Input: "25" → Output: 25 (number)
// Input: "17" → Validation error: "Must be 18 or older"
```

**How it works**: Uses `Number(input)` under the hood.

### z.coerce.boolean()

```typescript
const newsletterSchema = z.coerce.boolean();

// Input: "true" → Output: true
// Input: "false" → Output: false
// Input: "1" → Output: true
// Input: "0" → Output: false
// Input: "" → Output: false
```

**How it works**: Uses `Boolean(input)` - any truthy value becomes `true`.

### z.coerce.date()

```typescript
const birthdateSchema = z.coerce.date();

// Input: "2024-01-15" → Output: Date object
// Input: "invalid" → Validation error
```

**How it works**: Creates `new Date(input)`.

---

## Critical Gotcha: Empty Strings → 0

### The Problem

```typescript
const schema = z.object({
  age: z.coerce.number().min(1, "Age required"),
});

// User leaves field empty
schema.parse({ age: "" });
// ❌ PASSES with age: 0 (false positive!)
```

**Why**: `Number("")` returns `0`, so the validation passes even though the field is empty.

---

## Solutions

### Solution 1: Pipe with Refinement

```typescript
const schema = z.object({
  age: z
    .string()
    .min(1, "Age is required")
    .pipe(z.coerce.number().min(18, "Must be 18+")),
});

// "" → Fails at string.min(1) ✅
// "17" → Passes string check, fails number check ✅
// "25" → Passes both checks ✅
```

**How .pipe() works**:
1. Input validated against first schema (`z.string().min(1)`)
2. If valid, output piped to second schema (`z.coerce.number()`)

### Solution 2: Transform Empty to Undefined

```typescript
const schema = z.object({
  age: z
    .string()
    .transform((val) => (val === "" ? undefined : val))
    .pipe(z.coerce.number().min(18)),
});

// "" → undefined → Validation error ✅
```

### Solution 3: Custom Coercion Helper

```typescript
const zodInputNumber = (message: string = "Required") =>
  z
    .string()
    .min(1, message)
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val), "Must be a number");

const schema = z.object({
  age: zodInputNumber("Age is required").min(18, "Must be 18+"),
});
```

---

## Form Integration

### React Hook Form Example

```typescript
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
  // String field - no coercion
  name: z.string().min(1, "Name required"),

  // Number with empty string handling
  age: z
    .string()
    .min(1, "Age required")
    .pipe(z.coerce.number().min(18, "Must be 18+")),

  // Boolean (checkbox)
  subscribe: z.coerce.boolean(),

  // Date
  birthdate: z.coerce.date(),
});

const form = useForm({
  resolver: zodResolver(formSchema),
  defaultValues: {
    name: "",
    age: "",
    subscribe: false,
    birthdate: new Date(),
  },
});
```

---

## When NOT to Use z.coerce

### ❌ API Request Bodies

```typescript
// BAD - Coercing user input from API
const apiSchema = z.object({
  userId: z.coerce.number(), // ❌ Accept whatever type sent
});

// GOOD - Strict validation
const apiSchema = z.object({
  userId: z.number(), // ✅ Require number, reject strings
});
```

**Why**: APIs should enforce strict types. Coercion hides type mismatches.

### ❌ Database Records

```typescript
// BAD - Coercing stored data
const dbSchema = z.object({
  createdAt: z.coerce.date(), // ❌ Fix DB, don't coerce
});

// GOOD - Expect correct type
const dbSchema = z.object({
  createdAt: z.date(), // ✅ Database should store Date
});
```

**Why**: Your database should store the correct types. If it doesn't, fix the data model.

---

## z.coerce vs z.preprocess

| Feature | z.coerce | z.preprocess |
|---------|----------|--------------|
| **Use case** | Simple type conversion | Complex transformations |
| **Verbosity** | Concise (`z.coerce.number()`) | Verbose (function required) |
| **Tree-shaking** | Better optimization | Less optimized |
| **When to use** | Form inputs, query params | Custom logic needed |

### Use z.coerce for:
```typescript
z.coerce.number()  // String → Number
z.coerce.boolean() // String → Boolean
z.coerce.date()    // String → Date
```

### Use z.preprocess for:
```typescript
// Complex transformation
z.preprocess(
  (val) => typeof val === "string" ? val.split(",").map(Number) : val,
  z.array(z.number())
)
```

---

## Complete Example

```typescript
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Form schema with proper coercion
const registrationSchema = z.object({
  email: z.email("Invalid email"),

  age: z
    .string()
    .min(1, "Age is required")
    .pipe(z.coerce.number().int().min(18, "Must be 18 or older")),

  salary: z
    .string()
    .optional()
    .transform((val) => (val === "" ? undefined : val))
    .pipe(z.coerce.number().positive().optional()),

  termsAccepted: z.coerce.boolean().refine((val) => val === true, {
    message: "You must accept terms",
  }),

  startDate: z.coerce.date().min(new Date(), "Start date must be future"),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

function RegistrationForm() {
  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      email: "",
      age: "",
      salary: "",
      termsAccepted: false,
      startDate: new Date(),
    },
  });

  const onSubmit = (data: RegistrationForm) => {
    console.log(data);
    // All types are correct:
    // - age is number
    // - termsAccepted is boolean
    // - startDate is Date object
  };

  return <form onSubmit={form.handleSubmit(onSubmit)}>{/* ... */}</form>;
}
```

---

## Key Takeaways

1. **Use z.coerce** for form inputs - it's simpler than z.preprocess
2. **Empty strings → 0** is the critical gotcha - use `.pipe()` or `.transform()`
3. **Don't coerce API/DB data** - enforce strict types there
4. **Coercion happens before validation** - important for understanding behavior

---

**Related**: [zod-schemas-guide.md](zod-schemas-guide.md) for preprocess/transform details
