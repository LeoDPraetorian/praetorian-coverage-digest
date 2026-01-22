# Input Validation in React

**Client-side input validation patterns for React applications.**

---

## Core Principle

**Client-side validation is for UX, not security.**

```
✅ Client validates → Better UX, immediate feedback
✅ Server validates → Security enforcement
❌ Client only → Trivially bypassed
```

Always validate on BOTH client (UX) and server (security).

---

## Validation Libraries

| Library | Best For | Bundle Size |
|---------|----------|-------------|
| **Zod** | TypeScript-first, runtime types | ~12KB |
| **Yup** | Formik integration, mature | ~22KB |
| **Valibot** | Minimal bundle, modular | ~5KB |
| **validator.js** | String validation utilities | ~15KB |

---

## Zod Validation

### Schema Definition

```typescript
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  age: z.number().min(18, 'Must be 18 or older').max(120),
  website: z.string().url().optional(),
});

type UserInput = z.infer<typeof userSchema>;

// Validation
function validateUser(input: unknown): UserInput {
  return userSchema.parse(input); // Throws on invalid
}

// Safe validation (no throw)
function validateUserSafe(input: unknown) {
  const result = userSchema.safeParse(input);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }
  return { data: result.data };
}
```

### With React Hook Form

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    // data is type-safe and validated
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}

      <input {...register('password')} type="password" />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit">Login</button>
    </form>
  );
}
```

---

## Common Validation Patterns

### Email Validation

```typescript
import { z } from 'zod';

const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(254, 'Email too long')
  .refine(
    (email) => !email.includes('+'), // Optional: block plus addressing
    'Plus addressing not allowed'
  );
```

### Password Strength

```typescript
const passwordSchema = z
  .string()
  .min(8, 'Minimum 8 characters')
  .max(128, 'Maximum 128 characters')
  .regex(/[A-Z]/, 'Requires uppercase')
  .regex(/[a-z]/, 'Requires lowercase')
  .regex(/[0-9]/, 'Requires number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Requires special character');

// Password confirmation
const passwordFormSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
```

### Phone Number

```typescript
const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number (E.164 format)');

// Or with formatting
const usPhoneSchema = z
  .string()
  .regex(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/, 'Invalid US phone');
```

### URL Validation

```typescript
const urlSchema = z
  .string()
  .url('Invalid URL')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    'Only HTTP/HTTPS URLs allowed'
  );
```

### Date Validation

```typescript
const dateSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), 'Invalid date')
  .transform((val) => new Date(val));

const futureDateSchema = z
  .date()
  .min(new Date(), 'Date must be in the future');

const ageSchema = z
  .date()
  .max(
    new Date(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000),
    'Must be 18 or older'
  );
```

---

## Sanitization vs Validation

| Concept | Purpose | Example |
|---------|---------|---------|
| **Validation** | Reject invalid input | Email must match pattern |
| **Sanitization** | Clean/transform input | Trim whitespace, remove HTML |

```typescript
import DOMPurify from 'dompurify';

const sanitizedInputSchema = z
  .string()
  .transform((val) => val.trim())
  .transform((val) => DOMPurify.sanitize(val))
  .refine((val) => val.length > 0, 'Input required');
```

---

## XSS-Safe Input Handling

```typescript
// Validate and sanitize user-provided HTML
const htmlContentSchema = z
  .string()
  .max(10000, 'Content too long')
  .transform((html) =>
    DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'],
      ALLOWED_ATTR: ['href'],
    })
  );

// URL with protocol allowlist
const safeUrlSchema = z
  .string()
  .url()
  .refine((url) => {
    try {
      const { protocol } = new URL(url);
      return ['http:', 'https:', 'mailto:'].includes(protocol);
    } catch {
      return false;
    }
  }, 'Invalid or unsafe URL');
```

---

## Form-Level Validation

```typescript
const registrationSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string(),
    acceptTerms: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.acceptTerms === true, {
    message: 'You must accept the terms',
    path: ['acceptTerms'],
  });
```

---

## Custom Validation Hook

```typescript
import { useState, useCallback } from 'react';
import { z, ZodSchema } from 'zod';

interface ValidationResult<T> {
  data: T | null;
  errors: Record<string, string[]>;
  isValid: boolean;
}

export function useValidation<T>(schema: ZodSchema<T>) {
  const [result, setResult] = useState<ValidationResult<T>>({
    data: null,
    errors: {},
    isValid: false,
  });

  const validate = useCallback(
    (input: unknown): ValidationResult<T> => {
      const parsed = schema.safeParse(input);

      if (parsed.success) {
        const newResult = { data: parsed.data, errors: {}, isValid: true };
        setResult(newResult);
        return newResult;
      }

      const errors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
      const newResult = { data: null, errors, isValid: false };
      setResult(newResult);
      return newResult;
    },
    [schema]
  );

  return { ...result, validate };
}
```

---

## Security Checklist

- [ ] All inputs validated on server (security)
- [ ] Client validation for UX feedback
- [ ] Schemas shared between client and server when possible
- [ ] HTML content sanitized with DOMPurify
- [ ] URLs validated against protocol allowlist
- [ ] File uploads validated (type, size, content)
- [ ] Length limits on all string inputs

---

## Related Resources

- [Zod Documentation](https://zod.dev/)
- [React Hook Form](https://react-hook-form.com/)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
