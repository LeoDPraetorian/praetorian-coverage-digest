---
name: implementing-react-hook-form-zod
description: Use when building type-safe React forms with React Hook Form + Zod validation - handles nested objects, arrays, conditional validation, server errors
allowed-tools: Read, Grep, Bash, TodoWrite
---

# React Hook Form + Zod Validation

**Status**: Production Ready ✅
**Last Updated**: 2025-12-24
**Dependencies**: react-hook-form@7.65.0, zod@4.1.12, @hookform/resolvers@5.2.2

---

## Quick Start (10 Minutes)

> **IMPORTANT**: You MUST use TodoWrite before starting to track all implementation steps. This skill covers 13+ concepts (form setup, schema validation, error handling, accessibility, server validation, etc.) and agents WILL skip critical steps without external tracking.

### 1. Install Packages

```bash
npm install react-hook-form@7.65.0 zod@4.1.12 @hookform/resolvers@5.2.2
```

**Why These Packages**:

- **react-hook-form**: Performant form library with minimal re-renders
- **zod**: TypeScript-first schema validation with type inference
- **@hookform/resolvers**: Adapter connecting Zod to React Hook Form

### 2. Create Your First Form

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// 1. Define validation schema
const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

// 2. Infer TypeScript type from schema
type LoginFormData = z.infer<typeof loginSchema>

function LoginForm() {
  // 3. Initialize form with zodResolver
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // 4. Handle form submission
  const onSubmit = async (data: LoginFormData) => {
    console.log('Valid data:', data)
    // Make API call
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" {...register('email')} />
        {errors.email && (
          <span role="alert" className="error">
            {errors.email.message}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input id="password" type="password" {...register('password')} />
        {errors.password && (
          <span role="alert" className="error">
            {errors.password.message}
          </span>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  )
}
```

**CRITICAL**:

- Always set `defaultValues` to prevent "uncontrolled to controlled" warnings
- Use `zodResolver(schema)` to connect Zod validation
- Type form with `z.infer<typeof schema>` for full type safety
- Validate on both client AND server (never trust client validation alone)

### 3. Add Server-Side Validation

```typescript
// server/api/login.ts
import { z } from "zod";

// SAME schema on server
const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function loginHandler(req: Request) {
  try {
    // Parse and validate request body
    const data = loginSchema.parse(await req.json());

    // Data is type-safe and validated
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten().fieldErrors };
    }
    throw error;
  }
}
```

**Why Server Validation**:

- Client validation can be bypassed (inspect element, Postman, curl)
- Server validation is your security layer
- Same Zod schema = single source of truth
- Type safety across frontend and backend

---

## Core Concepts

### useForm Hook

```typescript
const {
  register, // Register input fields
  handleSubmit, // Wrap onSubmit handler
  watch, // Watch field values
  formState, // Form state (errors, isValid, isDirty)
  setValue, // Set field value programmatically
  control, // For Controller/useController
} = useForm<FormData>({
  resolver: zodResolver(schema),
  mode: "onSubmit", // When to validate
  defaultValues: {}, // Initial values (REQUIRED)
});
```

**Validation Modes**: `onSubmit` (best performance), `onBlur` (good balance), `onChange` (live feedback), `all` (most responsive)

**Complete API Reference:** [rhf-api-reference.md](references/rhf-api-reference.md)

### Zod Schema Basics

```typescript
import { z } from "zod";

// Basic validation
const userSchema = z.object({
  email: z.email("Invalid email"),
  age: z.number().min(18, "Must be 18+").max(120),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/),
});

// Type inference
type User = z.infer<typeof userSchema>;
```

**⚠️ Zod v4 Note**: String format validators have moved to top-level functions. Use `z.email()`, `z.uuid()`, `z.url()` instead of method chaining.

**Comprehensive Schema Guide:** [zod-schemas-guide.md](references/zod-schemas-guide.md) - Covers nested objects, arrays, optional/nullable fields, custom validation, async validation, and refinements.

---

## Form Registration Patterns

### Pattern 1: Simple Registration

```typescript
// For standard HTML inputs - use register
<input {...register('email')} />
<input {...register('password')} />
```

### Pattern 2: Controller (Custom Components)

Use when component doesn't expose `ref` (React Select, date pickers, etc.):

```typescript
import { Controller } from 'react-hook-form'

<Controller
  name="category"
  control={control}
  render={({ field }) => (
    <CustomSelect {...field} options={options} />
  )}
/>
```

### Pattern 3: useController (Reusable Components)

For creating reusable form components with encapsulated error handling.

**Complete patterns and examples:** [rhf-api-reference.md](references/rhf-api-reference.md#registration-patterns)

---

## Error Handling

### Display Errors

```typescript
const { formState: { errors } } = useForm()

// Accessible display
{errors.email && (
  <span role="alert" className="error">
    {errors.email.message}
  </span>
)}

// With aria-invalid
<input
  {...register('email')}
  aria-invalid={errors.email ? 'true' : 'false'}
  aria-describedby={errors.email ? 'email-error' : undefined}
/>
```

### Server Error Integration

```typescript
const { setError } = useForm();

const onSubmit = async (data) => {
  try {
    const response = await fetch("/api/submit", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const { errors: serverErrors } = await response.json();

      // Map server errors to form fields
      Object.entries(serverErrors).forEach(([field, message]) => {
        setError(field, { type: "server", message });
      });
    }
  } catch (error) {
    setError("root", {
      type: "server",
      message: "An error occurred. Please try again.",
    });
  }
};
```

**Complete Error Handling Guide:** [error-handling.md](references/error-handling.md) - Covers error formatting, accessibility patterns, and server error mapping strategies.

---

## Advanced Patterns

**For detailed implementations, see:**

- **Dynamic Fields (useFieldArray)**: [rhf-api-reference.md](references/rhf-api-reference.md#usefieldarray)
- **Multi-Step Forms**: [zod-schemas-guide.md](references/zod-schemas-guide.md#multi-step-forms)
- **Conditional Validation**: [zod-schemas-guide.md](references/zod-schemas-guide.md#conditional-validation)

**Key Points**:
- Use `field.id` as key (not array index) for useFieldArray
- Use `trigger()` for partial validation in multi-step forms
- Use discriminated unions for conditional validation

---

## shadcn/ui Integration

```typescript
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'

function ProfileForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { username: '', email: '' },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
```

**Note**: shadcn/ui now recommends using Field component for new implementations.

**Complete Integration Guide:** [shadcn-integration.md](references/shadcn-integration.md)

---

## Performance Optimization

**Key strategies:**
- Use `mode: "onSubmit"` for best performance
- Prefer `register` over `Controller` when possible
- Watch specific fields, not all values: `watch("email")` not `watch()`

**Complete Performance Guide:** [performance-optimization.md](references/performance-optimization.md)

---

## Accessibility Best Practices

**Essential patterns:**
- Use `aria-invalid` and `aria-describedby` on inputs
- Add `role="alert"` to error messages
- Focus first error field on validation failure

**Complete Accessibility Guide:** [accessibility.md](references/accessibility.md)

---

## Critical Rules

### Always Do ✅

1. **Set defaultValues** to prevent warnings
2. **Use zodResolver** for Zod integration
3. **Type forms with z.infer** for type safety
4. **Validate on both client AND server** (security)
5. **Use formState.errors** for error display
6. **Add ARIA attributes** for accessibility
7. **Use field.id for useFieldArray keys**
8. **Debounce async validation**

### Never Do ❌

1. **Skip server-side validation** (security risk!)
2. **Forget to spread {...field}** in Controller
3. **Mutate form values directly** (use setValue)
4. **Use inline validation without debouncing**
5. **Mix controlled and uncontrolled inputs**
6. **Use index as key** in useFieldArray
7. **Forget defaultValues** for all fields

---

## Known Issues Prevention

This skill prevents **12** documented issues including:

- Zod v4 Type Inference Errors
- Uncontrolled to Controlled Warning
- Nested Object Validation Errors
- Array Field Re-renders
- Async Validation Race Conditions
- Server Error Mapping Issues

**Detailed Solutions:** [top-errors.md](references/top-errors.md)

---

## Templates

Working examples in `templates/` directory:

1. `basic-form.tsx` - Simple login/signup form
2. `advanced-form.tsx` - Nested objects, arrays, conditional fields
3. `shadcn-form.tsx` - shadcn/ui integration
4. `server-validation.ts` - Server-side validation
5. `async-validation.tsx` - Async validation with debouncing
6. `dynamic-fields.tsx` - useFieldArray examples
7. `multi-step-form.tsx` - Wizard with validation
8. `custom-error-display.tsx` - Error formatting

---

## References

Complete documentation in `references/` directory:

1. **[zod-schemas-guide.md](references/zod-schemas-guide.md)** - Comprehensive Zod patterns
2. **[rhf-api-reference.md](references/rhf-api-reference.md)** - Complete React Hook Form API
3. **[error-handling.md](references/error-handling.md)** - Error messages and accessibility
4. **[accessibility.md](references/accessibility.md)** - WCAG compliance and ARIA
5. **[performance-optimization.md](references/performance-optimization.md)** - Form modes and strategies
6. **[shadcn-integration.md](references/shadcn-integration.md)** - shadcn/ui patterns
7. **[top-errors.md](references/top-errors.md)** - 12 common errors with solutions
8. **[links-to-official-docs.md](references/links-to-official-docs.md)** - Official documentation

---

## Check Latest Versions

```bash
npm view react-hook-form zod @hookform/resolvers version
```

---

## Official Documentation

- **React Hook Form**: https://react-hook-form.com/
- **Zod**: https://zod.dev/
- **@hookform/resolvers**: https://github.com/react-hook-form/resolvers
- **shadcn/ui Form**: https://ui.shadcn.com/docs/components/form
