---
name: frontend-react-hook-form-zod
description: Use when building type-safe validated forms with React Hook Form and Zod schema validation, implementing useForm with zodResolver, handling complex validation scenarios (nested objects, arrays, conditional validation), or fixing common issues
allowed-tools: Read, Grep, Bash, TodoWrite
---

# React Hook Form + Zod Validation

**Status**: Production Ready ✅
**Last Updated**: 2025-10-23
**Dependencies**: react-hook-form@7.65.0, zod@4.1.12, @hookform/resolvers@5.2.2

---

## Quick Start (10 Minutes)

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
  email: z.string().email('Invalid email address'),
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
import { z } from 'zod'

// SAME schema on server
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function loginHandler(req: Request) {
  try {
    // Parse and validate request body
    const data = loginSchema.parse(await req.json())

    // Data is type-safe and validated
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten().fieldErrors }
    }
    throw error
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
  register,           // Register input fields
  handleSubmit,       // Wrap onSubmit handler
  watch,              // Watch field values
  formState,          // Form state (errors, isValid, isDirty)
  setValue,           // Set field value programmatically
  control,            // For Controller/useController
} = useForm<FormData>({
  resolver: zodResolver(schema),
  mode: 'onSubmit',              // When to validate
  defaultValues: {},             // Initial values (REQUIRED)
})
```

**Validation Modes**:
- `onSubmit` - Best performance, validate on submit
- `onBlur` - Good balance, validate when field loses focus
- `onChange` - Live feedback, validates on every change
- `all` - Most responsive, highest cost

**Complete API Reference:** [rhf-api-reference.md](references/rhf-api-reference.md)

### Zod Schema Basics

```typescript
import { z } from 'zod'

// Basic validation
const userSchema = z.object({
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be 18+').max(120),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
})

// Type inference
type User = z.infer<typeof userSchema>

// Nested objects
const profileSchema = z.object({
  name: z.string(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    zipCode: z.string().regex(/^\d{5}$/),
  }),
})

// Arrays
const tagsSchema = z.array(z.string())
const usersSchema = z.array(userSchema)

// Optional and nullable
const optionalField = z.string().optional()    // string | undefined
const nullableField = z.string().nullable()    // string | null
```

**Comprehensive Schema Guide:** [zod-schemas-guide.md](references/zod-schemas-guide.md)

### Custom Validation (Refinements)

```typescript
// Password confirmation
const passwordSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

// Async validation
const usernameSchema = z.string().refine(async (username) => {
  const response = await fetch(`/api/check-username?username=${username}`)
  const { available } = await response.json()
  return available
}, {
  message: 'Username is already taken',
})
```

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

**When to Use Controller**:
- ✅ Third-party UI libraries (Material-UI, Ant Design)
- ✅ Custom components without ref
- ✅ Need fine-grained control over field behavior

### Pattern 3: useController (Reusable Components)

```typescript
import { useController } from 'react-hook-form'

function CustomInput({ name, control, label }) {
  const {
    field,
    fieldState: { error },
  } = useController({ name, control })

  return (
    <div>
      <label>{label}</label>
      <input {...field} />
      {error && <span>{error.message}</span>}
    </div>
  )
}
```

---

## Error Handling

### Display Errors

```typescript
const { formState: { errors } } = useForm()

// Simple display
{errors.email && <span>{errors.email.message}</span>}

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
const { setError } = useForm()

const onSubmit = async (data) => {
  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const { errors: serverErrors } = await response.json()

      // Map server errors to form fields
      Object.entries(serverErrors).forEach(([field, message]) => {
        setError(field, { type: 'server', message })
      })
    }
  } catch (error) {
    setError('root', {
      type: 'server',
      message: 'An error occurred. Please try again.',
    })
  }
}
```

**Complete Error Handling Guide:** [error-handling.md](references/error-handling.md)

---

## Advanced Patterns

### Dynamic Fields (useFieldArray)

```typescript
import { useFieldArray } from 'react-hook-form'

const contactSchema = z.object({
  contacts: z.array(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
    })
  ).min(1, 'At least one contact required'),
})

function ContactForm() {
  const { control, register } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { contacts: [{ name: '', email: '' }] },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'contacts',
  })

  return (
    <form>
      {fields.map((field, index) => (
        <div key={field.id}>
          <input {...register(`contacts.${index}.name`)} />
          <input {...register(`contacts.${index}.email`)} />
          <button type="button" onClick={() => remove(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={() => append({ name: '', email: '' })}>
        Add Contact
      </button>
    </form>
  )
}
```

**IMPORTANT**: Use `field.id` as key, not array index.

### Multi-Step Forms

```typescript
// Step schemas
const step1Schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

const step2Schema = z.object({
  address: z.string().min(1),
  city: z.string().min(1),
})

// Combined schema
const fullSchema = step1Schema.merge(step2Schema)

function MultiStepForm() {
  const [step, setStep] = useState(1)
  const { trigger } = useForm({ resolver: zodResolver(fullSchema) })

  const nextStep = async () => {
    const fieldsToValidate = step === 1 ? ['name', 'email'] : ['address', 'city']
    const isValid = await trigger(fieldsToValidate)
    if (isValid) setStep(step + 1)
  }

  // Render appropriate step...
}
```

### Conditional Validation

```typescript
const formSchema = z.discriminatedUnion('accountType', [
  z.object({
    accountType: z.literal('personal'),
    name: z.string().min(1),
  }),
  z.object({
    accountType: z.literal('business'),
    companyName: z.string().min(1),
    taxId: z.string().regex(/^\d{9}$/),
  }),
])
```

---

## shadcn/ui Integration

### Using Form Component

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

### Validation Mode Selection

```typescript
// Best performance
mode: 'onSubmit'      // Validate only on submit

// Good balance
mode: 'onBlur'        // Validate when field loses focus

// Live feedback
mode: 'onChange'      // Validate on every change
```

### Use register Over Controller

```typescript
// Better performance - uncontrolled
<input {...register('email')} />

// Use only when necessary
<Controller
  name="email"
  control={control}
  render={({ field }) => <CustomInput {...field} />}
/>
```

### Watch Specific Fields

```typescript
// BAD: Watches ALL fields
const values = watch()

// GOOD: Watch specific field
const email = watch('email')
```

**Complete Performance Guide:** [performance-optimization.md](references/performance-optimization.md)

---

## Accessibility Best Practices

### ARIA Attributes

```typescript
<input
  {...register('email')}
  aria-invalid={errors.email ? 'true' : 'false'}
  aria-describedby={errors.email ? 'email-error' : undefined}
/>
{errors.email && (
  <span id="email-error" role="alert">
    {errors.email.message}
  </span>
)}
```

### Focus Management

```typescript
useEffect(() => {
  if (Object.keys(errors).length > 0) {
    firstErrorRef.current?.focus()
  }
}, [errors])
```

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

This skill prevents **12** documented issues:

1. **Zod v4 Type Inference Errors** - Use `z.infer<typeof schema>`
2. **Uncontrolled to Controlled Warning** - Set defaultValues
3. **Nested Object Validation Errors** - Use optional chaining
4. **Array Field Re-renders** - Use `field.id` as key
5. **Async Validation Race Conditions** - Debounce validation
6. **Server Error Mapping** - Use setError() correctly
7. **Default Values Not Applied** - Set in useForm options
8. **Controller Field Not Updating** - Spread {...field}
9. **useFieldArray Key Warnings** - Use field.id
10. **Schema Refinement Error Paths** - Specify path option
11. **Transform vs Preprocess Confusion** - Use correct method
12. **Multiple Resolver Conflicts** - Use single resolver

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

## Official Documentation

- **React Hook Form**: https://react-hook-form.com/
- **Zod**: https://zod.dev/
- **@hookform/resolvers**: https://github.com/react-hook-form/resolvers
- **shadcn/ui Form**: https://ui.shadcn.com/docs/components/form
