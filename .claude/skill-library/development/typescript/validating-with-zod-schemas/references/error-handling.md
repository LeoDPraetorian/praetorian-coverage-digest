# Zod Error Handling Patterns

## Error Structure

```typescript
const result = schema.safeParse(input);
if (!result.success) {
  // ZodError contains issues array
  result.error.issues.forEach((issue) => {
    console.log(issue.code); // Error code
    console.log(issue.path); // Path to error
    console.log(issue.message); // Error message
  });
}
```

## Flattening Errors

```typescript
const result = schema.safeParse(input);
if (!result.success) {
  const flat = result.error.flatten();
  // {
  //   formErrors: string[],        // Root-level errors
  //   fieldErrors: {
  //     [field]: string[]          // Field-specific errors
  //   }
  // }
}

// With custom error type
const flat = result.error.flatten((issue) => ({
  message: issue.message,
  code: issue.code,
}));
```

## Formatting Errors

```typescript
const result = schema.safeParse(input);
if (!result.success) {
  const formatted = result.error.format();
  // Nested structure matching input shape
  // Each field has _errors: string[]
}
```

## Custom Error Map (Global)

```typescript
const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.expected === "string") {
        return { message: "This field must be text" };
      }
      break;
    case z.ZodIssueCode.too_small:
      if (issue.type === "string") {
        return { message: `Minimum ${issue.minimum} characters required` };
      }
      break;
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === "email") {
        return { message: "Please enter a valid email address" };
      }
      break;
  }
  return { message: ctx.defaultError };
};

// Set globally
z.setErrorMap(customErrorMap);
```

## Schema-Level Error Map

```typescript
const schema = z.string().min(3, { message: "Too short" }).email({
  message: "Invalid email",
});

// Or with errorMap option
const result = schema.safeParse(input, {
  errorMap: customErrorMap,
});
```

## Localization Pattern

```typescript
const messages = {
  en: {
    required: "This field is required",
    email: "Invalid email address",
  },
  es: {
    required: "Este campo es obligatorio",
    email: "Dirección de correo inválida",
  },
};

function createLocalizedErrorMap(locale: "en" | "es"): z.ZodErrorMap {
  const t = messages[locale];
  return (issue, ctx) => {
    switch (issue.code) {
      case z.ZodIssueCode.invalid_type:
        if (issue.received === "undefined") {
          return { message: t.required };
        }
        break;
      case z.ZodIssueCode.invalid_string:
        if (issue.validation === "email") {
          return { message: t.email };
        }
        break;
    }
    return { message: ctx.defaultError };
  };
}
```

## API Error Response Pattern

```typescript
interface ApiError {
  code: string;
  message: string;
  field?: string;
}

function zodToApiErrors(error: z.ZodError): ApiError[] {
  return error.issues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    field: issue.path.join(".") || undefined,
  }));
}

// Usage in handler
const result = schema.safeParse(req.body);
if (!result.success) {
  return Response.json({ errors: zodToApiErrors(result.error) }, { status: 400 });
}
```

## Collecting All Errors

By default, Zod stops at the first error. Use `parseAsync` with abort early disabled:

```typescript
// This is a workaround - Zod v3 doesn't have native "collect all errors"
// Use flatten() or format() which do collect all errors from safeParse
const result = schema.safeParse(input);
if (!result.success) {
  // flatten() gives all errors, not just first
  const allErrors = result.error.flatten();
}
```
