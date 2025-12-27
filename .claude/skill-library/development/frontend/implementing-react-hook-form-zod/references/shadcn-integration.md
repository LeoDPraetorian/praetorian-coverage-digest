# shadcn/ui Integration Guide

Complete guide for using shadcn/ui with React Hook Form + Zod.

---

## Table of Contents

1. **[Field Component (Recommended)](#field-component-recommended)** ✅ - Modern primitives with Standard Schema support
2. **[Form Component (Legacy)](#form-component-legacy)** ⚠️ - Older pattern, not actively developed

---

## Form Component (Legacy)

**Status**: ⚠️ **LEGACY** - Not actively developed (per shadcn/ui documentation)
**Recommendation**: Use **Field component** for all new projects (see below)

### Installation

```bash
npx shadcn@latest add form
```

### Basic Usage

```typescript
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const schema = z.object({
  username: z.string().min(2),
})

function ProfileForm() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { username: '' },
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
              <FormDescription>
                Your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
```

---

## Form Component Anatomy

### FormField

```typescript
<FormField
  control={form.control}  // Required
  name="fieldName"        // Required
  render={({ field, fieldState, formState }) => (
    // Your field component
  )}
/>
```

### FormItem

Container for field, label, description, and message.

```typescript
<FormItem>
  <FormLabel>Email</FormLabel>
  <FormControl>
    <Input {...field} />
  </FormControl>
  <FormDescription>Helper text</FormDescription>
  <FormMessage />
</FormItem>
```

### FormControl

Wraps the actual input component.

```typescript
<FormControl>
  <Input {...field} />
</FormControl>
```

### FormLabel

Accessible label with automatic linking to input.

```typescript
<FormLabel>Email Address</FormLabel>
```

### FormDescription

Helper text for the field.

```typescript
<FormDescription>
  We'll never share your email.
</FormDescription>
```

### FormMessage

Displays validation errors.

```typescript
<FormMessage />
```

---

## Common Patterns

### Input Field

```typescript
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input type="email" placeholder="you@example.com" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Textarea

```typescript
<FormField
  control={form.control}
  name="bio"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Bio</FormLabel>
      <FormControl>
        <Textarea {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Select

```typescript
<FormField
  control={form.control}
  name="role"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Role</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="user">User</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Checkbox

```typescript
<FormField
  control={form.control}
  name="newsletter"
  render={({ field }) => (
    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
      <FormControl>
        <Checkbox
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel>Subscribe to newsletter</FormLabel>
        <FormDescription>
          Receive email updates about new products.
        </FormDescription>
      </div>
    </FormItem>
  )}
/>
```

### Radio Group

```typescript
<FormField
  control={form.control}
  name="plan"
  render={({ field }) => (
    <FormItem className="space-y-3">
      <FormLabel>Select a plan</FormLabel>
      <FormControl>
        <RadioGroup
          onValueChange={field.onChange}
          defaultValue={field.value}
        >
          <FormItem className="flex items-center space-x-3 space-y-0">
            <FormControl>
              <RadioGroupItem value="free" />
            </FormControl>
            <FormLabel className="font-normal">Free</FormLabel>
          </FormItem>
          <FormItem className="flex items-center space-x-3 space-y-0">
            <FormControl>
              <RadioGroupItem value="pro" />
            </FormControl>
            <FormLabel className="font-normal">Pro</FormLabel>
          </FormItem>
        </RadioGroup>
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Switch

```typescript
<FormField
  control={form.control}
  name="notifications"
  render={({ field }) => (
    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5">
        <FormLabel className="text-base">
          Email Notifications
        </FormLabel>
        <FormDescription>
          Receive emails about your account activity.
        </FormDescription>
      </div>
      <FormControl>
        <Switch
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
    </FormItem>
  )}
/>
```

---

## Nested Objects

```typescript
const schema = z.object({
  user: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
})

<FormField
  control={form.control}
  name="user.name"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Name</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## Arrays

```typescript
const { fields, append, remove } = useFieldArray({
  control: form.control,
  name: 'items',
})

{fields.map((field, index) => (
  <FormField
    key={field.id}
    control={form.control}
    name={`items.${index}.name`}
    render={({ field }) => (
      <FormItem>
        <FormControl>
          <Input {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
))}
```

---

## Custom Validation

```typescript
<FormField
  control={form.control}
  name="username"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Username</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      {/* Custom error styling */}
      {errors.username && (
        <div className="text-sm font-medium text-destructive">
          {errors.username.message}
        </div>
      )}
    </FormItem>
  )}
/>
```

---

## Field Component (Recommended)

**Status**: ✅ Production Ready - Recommended for all new implementations

The Field component primitives provide a more flexible, composable approach to form building with full Standard Schema support (including Zod, Yup, ArkType, etc.).

### Installation

```bash
npx shadcn@latest add field
```

### Basic Usage with Controller

```typescript
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

const schema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
})

function ProfileForm() {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', email: '' },
  })

  const onSubmit = (data: z.infer<typeof schema>) => {
    console.log(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field>
        <FieldLabel>Username</FieldLabel>
        <Controller
          name="username"
          control={control}
          render={({ field }) => <Input {...field} />}
        />
        <FieldDescription>Your public display name.</FieldDescription>
        <FieldError errors={errors.username} />
      </Field>

      <Field>
        <FieldLabel>Email</FieldLabel>
        <Controller
          name="email"
          control={control}
          render={({ field }) => <Input type="email" {...field} />}
        />
        <FieldError errors={errors.email} />
      </Field>

      <button type="submit">Submit</button>
    </form>
  )
}
```

### Field Component Anatomy

#### Field

Container for field primitives. Provides context for labels, descriptions, and errors.

```typescript
<Field>
  {/* Field primitives go here */}
</Field>
```

#### FieldLabel

Accessible label automatically linked to the input.

```typescript
<FieldLabel>Email Address</FieldLabel>
```

**Optional attributes**:
```typescript
<FieldLabel required>Email Address</FieldLabel>
```

#### FieldDescription

Helper text for the field.

```typescript
<FieldDescription>
  We'll never share your email with anyone.
</FieldDescription>
```

#### FieldError (Standard Schema Support)

Displays validation errors from any Standard Schema-compatible validator (Zod, Yup, ArkType, etc.).

**Accepts errors in multiple formats**:

```typescript
// 1. React Hook Form FieldError object
<FieldError errors={errors.email} />

// 2. Array of error messages (Standard Schema)
<FieldError errors={['Invalid email', 'Email already taken']} />

// 3. Single error message
<FieldError errors="This field is required" />
```

**Standard Schema Integration**:
```typescript
// FieldError automatically handles Standard Schema error formats
type StandardSchemaError = {
  message: string
  path?: (string | number)[]
}

// Works with Zod
const zodErrors = errors.email // { message: string, type: string }

// Works with Yup
const yupErrors = errors.email // { message: string, type: string }

// Works with ArkType
const arkErrors = errors.email // { message: string }

// All are compatible with FieldError
<FieldError errors={zodErrors} />
```

### Common Patterns with Field

#### Input Field

```typescript
<Field>
  <FieldLabel>Email</FieldLabel>
  <Controller
    name="email"
    control={control}
    render={({ field }) => (
      <Input type="email" placeholder="you@example.com" {...field} />
    )}
  />
  <FieldError errors={errors.email} />
</Field>
```

#### Textarea

```typescript
<Field>
  <FieldLabel>Bio</FieldLabel>
  <Controller
    name="bio"
    control={control}
    render={({ field }) => <Textarea {...field} />}
  />
  <FieldDescription>Tell us about yourself.</FieldDescription>
  <FieldError errors={errors.bio} />
</Field>
```

#### Select

```typescript
<Field>
  <FieldLabel>Role</FieldLabel>
  <Controller
    name="role"
    control={control}
    render={({ field }) => (
      <Select onValueChange={field.onChange} value={field.value}>
        <SelectTrigger>
          <SelectValue placeholder="Select a role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="user">User</SelectItem>
        </SelectContent>
      </Select>
    )}
  />
  <FieldError errors={errors.role} />
</Field>
```

#### Checkbox

```typescript
<Field>
  <div className="flex items-center space-x-2">
    <Controller
      name="newsletter"
      control={control}
      render={({ field }) => (
        <Checkbox
          id="newsletter"
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      )}
    />
    <FieldLabel htmlFor="newsletter">Subscribe to newsletter</FieldLabel>
  </div>
  <FieldDescription>
    Receive email updates about new products.
  </FieldDescription>
  <FieldError errors={errors.newsletter} />
</Field>
```

#### Custom Error Handling

```typescript
<Field>
  <FieldLabel>Password</FieldLabel>
  <Controller
    name="password"
    control={control}
    render={({ field }) => <Input type="password" {...field} />}
  />
  {/* Multiple error messages */}
  <FieldError
    errors={[
      errors.password?.message,
      serverErrors?.password,
    ].filter(Boolean)}
  />
</Field>
```

### Nested Objects with Field

```typescript
const schema = z.object({
  user: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
})

<Field>
  <FieldLabel>Name</FieldLabel>
  <Controller
    name="user.name"
    control={control}
    render={({ field }) => <Input {...field} />}
  />
  <FieldError errors={errors.user?.name} />
</Field>

<Field>
  <FieldLabel>Email</FieldLabel>
  <Controller
    name="user.email"
    control={control}
    render={({ field }) => <Input type="email" {...field} />}
  />
  <FieldError errors={errors.user?.email} />
</Field>
```

### Arrays with Field

```typescript
const { fields, append, remove } = useFieldArray({
  control,
  name: 'items',
})

{fields.map((field, index) => (
  <Field key={field.id}>
    <FieldLabel>Item {index + 1}</FieldLabel>
    <Controller
      name={`items.${index}.name`}
      control={control}
      render={({ field }) => <Input {...field} />}
    />
    <FieldError errors={errors.items?.[index]?.name} />
  </Field>
))}
```

### Migration from Form to Field

**Before (Form component)**:
```typescript
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
          <FormDescription>Your display name.</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

**After (Field primitives)**:
```typescript
<form onSubmit={handleSubmit(onSubmit)}>
  <Field>
    <FieldLabel>Username</FieldLabel>
    <Controller
      name="username"
      control={control}
      render={({ field }) => <Input {...field} />}
    />
    <FieldDescription>Your display name.</FieldDescription>
    <FieldError errors={errors.username} />
  </Field>
</form>
```

**Key differences**:
- ✅ **Less nesting** - No Form wrapper, FormItem, FormControl
- ✅ **More explicit** - Direct Controller usage
- ✅ **Standard Schema support** - FieldError accepts any error format
- ✅ **Better composition** - Primitives can be rearranged
- ✅ **Simpler mental model** - Clear separation of concerns

---

## Tips

### For Field Component (Recommended) ✅

1. **Always spread {...field}** in Controller render prop
2. **Use Controller** for all inputs (consistent pattern)
3. **FieldError accepts multiple formats** - errors object, array, or string
4. **Standard Schema support** - Works with Zod, Yup, ArkType, etc.
5. **Composable primitives** - Arrange Field, FieldLabel, FieldDescription, FieldError as needed

### For Form Component (Legacy) ⚠️

1. **Use only for existing projects** - Not recommended for new projects
2. **Migration path available** - See "Migration from Form to Field" section above
3. **Form component still works** - But not actively developed per shadcn/ui docs

---

**Official Docs**:

- shadcn/ui Field: https://ui.shadcn.com/docs/components/field (Recommended)
- shadcn/ui Form: https://ui.shadcn.com/docs/components/form (Legacy)
- React Hook Form: https://react-hook-form.com/
