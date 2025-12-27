---
name: using-shadcn-ui
description: Use when building React UI with shadcn/ui components - accessible primitives, Sonner notifications, and shadcnblocks patterns
allowed-tools: "Read, Write, Edit, Bash, Grep"
---

# Using shadcn/ui

## Overview

shadcn/ui is a collection of re-usable, accessible React components built on Radix UI and Tailwind CSS. Unlike traditional component libraries, shadcn/ui copies components directly into your project, giving you full ownership and customization control.

**Core principle:** Components live in your codebase. You own the code. No package.json dependency.

> **You MUST use TodoWrite** to track component installation and customization steps when working with multiple components.

## Version Compatibility (2025)

| Environment | Command | Notes |
|-------------|---------|-------|
| **New projects (React 19 + Tailwind v4)** | `npx shadcn@canary init` | Uses OKLCH colors, tw-animate-css |
| **Existing projects (React 18 + Tailwind v3)** | `npx shadcn@latest init` | Non-breaking, still supported |
| **Upgrade existing** | Follow official guide | See [Version Compatibility](references/version-compatibility.md) |

**Key 2024-2025 Changes:**
- **Tailwind v4**: OKLCH colors, `@theme` directive, `data-slot` attributes
- **React 19**: `forwardRef` removed from primitives, ref is now a prop
- **Deprecations**: Toast → Sonner, tailwindcss-animate → tw-animate-css, "Default" style removed

**Full migration guide:** [Version Compatibility](references/version-compatibility.md)

## December 2025 Major Updates

shadcn/ui introduced significant customization and flexibility improvements:

### npx shadcn create

Create fully customized projects with `npx shadcn create`:
- **Component library**: Choose between Radix UI or Base UI
- **Visual styles**: 5 new styles (Vega, Nova, Maia, Lyra, Mira)
- **Icons**: Select from multiple icon libraries
- **Base color**: Customize theme foundation
- **Fonts**: Pick typography system

**Framework support:** Next.js, Vite, TanStack Start, v0

### Base UI Component Library

Every component rebuilt for Base UI while maintaining full compatibility:
- Same API and abstraction layer
- Works with existing Radix components
- Full type safety maintained

### New Field Components

Form field components work with all component libraries:
- Compatible with Radix, Base UI, and React Aria
- Unified form abstraction
- Consistent validation patterns

### Registry Directory

Published registry directory for browsing and pulling code:
- Community registries
- Custom component collections
- Namespace support (`@acme/button`)

### CLI Improvements

- **Custom Tailwind prefix**: Auto-prefixes utility classes when adding components
- **Registry URLs**: Install from custom registries and local files
- **Monorepo support**: Understands Turborepo/pnpm workspaces

**Learn more:** [Changelog](https://ui.shadcn.com/docs/changelog)

## When to Use

**Use shadcn/ui when:**

- Building React applications with Tailwind CSS
- Need accessible, customizable UI components
- Want pre-built patterns without library lock-in
- Implementing common UI patterns (forms, dialogs, sidebars)
- Starting new projects that need design system foundation

**shadcnblocks.com integration:** 829 blocks across 42 categories for rapid prototyping. See [shadcnblocks categories](references/shadcnblocks-categories.md).

**Don't use for:**

- Non-React projects
- Projects without Tailwind CSS
- When you need a locked, versioned component library

## TanStack Integrations

shadcn/ui integrates seamlessly with TanStack libraries for modern React development:

### TanStack Router

Type-safe, file-based routing with shadcn/ui components:

```bash
# Install TanStack Router
npm install @tanstack/react-router

# Use shadcn/ui components in routes
npx shadcn@latest add button navigation-menu sidebar
```

**Key patterns:**
- Root layouts with Navigation Menu and Sidebar components
- Loading states with Skeleton components
- Error boundaries with Alert components
- Form routes with validation and toast notifications

**Full guide:** [TanStack Router Integration](references/tanstack-router-integration.md)

### TanStack Table

Enterprise-grade data tables with sorting, filtering, and pagination:

```bash
# Install TanStack Table
npm install @tanstack/react-table

# Add required components
npx shadcn@latest add table button dropdown-menu
```

**Key patterns:**
- Data tables with sorting and pagination
- Server-side operations for large datasets
- Row selection with Checkbox components
- Column visibility toggles
- Faceted filters and search

**Full guide:** [TanStack Table Integration](references/tanstack-table-integration.md)

**Official resources:**
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/data-table)
- [shadcn/ui TanStack Router Setup](https://ui.shadcn.com/docs/installation/tanstack-router)

## Installation

### Initialize shadcn/ui

```bash
# New projects with React 19 + Tailwind v4
npx shadcn@canary init

# Existing projects or React 18 + Tailwind v3
npx shadcn@latest init
```

**Configuration prompts:**

- Style: new-york (default, "Default" style is deprecated)
- Color: Slate, Gray, Zinc, etc.
- CSS variables: Yes (recommended)

### Add Components

```bash
# Add specific components
npx shadcn@latest add button dialog form sidebar

# Add multiple at once
npx shadcn@latest add button card dialog dropdown-menu input sonner

# Add from community registry
npx shadcn@latest add @registry/component-name

# Add from URL (custom registry)
npx shadcn@latest add https://example.com/registry/navbar.json
```

**Components install to:** `components/ui/`

## Quick Reference

### Component Categories

| Category         | Common Use Cases       | Key Components                              |
| ---------------- | ---------------------- | ------------------------------------------- |
| **Forms**        | User input, validation | Input, Form, Select, Checkbox, Field        |
| **Overlays**     | Modals, popovers       | Dialog, Popover, Tooltip, Sheet             |
| **Navigation**   | Menus, sidebars        | Sidebar, Dropdown Menu, Navigation Menu     |
| **Feedback**     | Notifications          | Sonner (toast), Alert, Progress, Skeleton   |
| **Data Display** | Tables, charts, cards  | Table, Card, Badge, Avatar, Chart           |
| **Layout**       | Containers, panels     | Separator, Resizable, Scroll Area           |
| **New (2025)**   | Enhanced inputs        | Spinner, Kbd, Button Group, Input Group     |

**Full reference:** [Component Categories](references/component-categories.md)

### The `cn` Utility

shadcn/ui uses a `cn` utility for class merging:

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- **clsx**: Conditional class handling
- **tailwind-merge**: Resolves Tailwind class conflicts

## Common Patterns

### Button Usage

```typescript
import { Button } from "@/components/ui/button"

<Button variant="default">Click me</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Subtle</Button>
```

**Variants:** `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
**Sizes:** `default`, `sm`, `lg`, `icon`

### Sonner (Toast Notifications)

> **Note:** The Toast component is deprecated. Use Sonner instead.

```bash
npx shadcn@latest add sonner
```

```typescript
// In layout.tsx - add Toaster
import { Toaster } from "@/components/ui/sonner"

export default function Layout({ children }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}

// In components - use toast
import { toast } from "sonner"

// Success
toast.success("Changes saved!")

// Error
toast.error("Something went wrong")

// With promise (loading → success/error)
toast.promise(saveData(), {
  loading: "Saving...",
  success: "Saved!",
  error: "Failed to save",
})

// With action
toast("File deleted", {
  action: {
    label: "Undo",
    onClick: () => restoreFile(),
  },
})
```

**More patterns:** [Common Patterns](examples/common-patterns.md)

### Form Pattern

```bash
npx shadcn@latest add form input button
npm install react-hook-form @hookform/resolvers zod
```

```typescript
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"

const schema = z.object({ email: z.string().email() })

function MyForm() {
  const form = useForm({ resolver: zodResolver(schema) })
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </form>
    </Form>
  )
}
```

**Full example:** [Forms](examples/forms.md)

### Sidebar Component (October 2024)

```bash
npx shadcn@latest add sidebar
```

25 composable parts for building all kinds of sidebars:

```typescript
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader />
        <SidebarContent>
          <SidebarGroup />
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
      <SidebarTrigger />
    </SidebarProvider>
  )
}
```

### Dialog Pattern

```bash
npx shadcn@latest add dialog button
```

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger asChild><Button>Open</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

**Full example:** [Dialogs](examples/dialogs.md)

## CLI 3.0 Features (August 2025)

```bash
# Search for components
npx shadcn@latest search button

# View component code before adding
npx shadcn@latest view button

# Compare with upstream (see what changed)
npx shadcn@latest diff button
npx shadcn@latest diff  # all components

# Namespaced registries
npx shadcn@latest add @shadcn/sidebar
npx shadcn@latest add @acme/custom-component
```

**Full CLI reference:** [CLI Features](references/cli-features.md)

## Customization

### Theme Colors (OKLCH - Tailwind v4)

Edit `globals.css`:

```css
@theme {
  --color-primary: oklch(0.6 0.2 250);
  --color-primary-foreground: oklch(0.98 0.01 250);
  --color-destructive: oklch(0.55 0.2 25);
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.15 0.02 250);
}

.dark {
  --color-background: oklch(0.15 0.02 250);
  --color-foreground: oklch(0.98 0.01 250);
}
```

> **Note:** Tailwind v3 projects still use HSL. See [Version Compatibility](references/version-compatibility.md).

### Adding Variants with CVA

Edit component files directly in `components/ui/`:

```typescript
// components/ui/button.tsx
const buttonVariants = cva("...", {
  variants: {
    variant: {
      // ... existing
      success: "bg-green-600 text-white hover:bg-green-700",
    },
  },
})
```

**Full guide:** [Customization](examples/customization.md)

## Common Mistakes

| Mistake                       | Fix                                                          |
| ----------------------------- | ------------------------------------------------------------ |
| Installing as npm package     | Run `npx shadcn@latest add [component]` - it copies code     |
| Using deprecated Toast        | Use Sonner instead: `npx shadcn@latest add sonner`           |
| HSL colors in Tailwind v4     | Use OKLCH format: `oklch(0.6 0.2 250)`                       |
| Using "Default" style         | Use "new-york" - Default style is deprecated                 |
| Importing from `shadcn`       | Import from `@/components/ui/[component]`                    |
| Skipping shadcnblocks.com     | Don't build common sections from scratch - use ready blocks  |

## Workflow Summary

**Starting new project:**

1. `npx shadcn@canary init` (React 19 + Tailwind v4)
2. Add components: `npx shadcn@latest add button card sidebar sonner`
3. Browse shadcnblocks.com for section blocks
4. Copy blocks, install dependencies, customize

**Adding new feature:**

1. Search: `npx shadcn@latest search [keyword]`
2. View: `npx shadcn@latest view [component]`
3. Add: `npx shadcn@latest add [components]`
4. Check shadcnblocks.com for patterns
5. Customize colors and content

## Resources

- **Official Docs:** https://ui.shadcn.com
- **Changelog:** https://ui.shadcn.com/docs/changelog
- **React 19 Guide:** https://ui.shadcn.com/docs/react-19
- **Tailwind v4 Guide:** https://ui.shadcn.com/docs/tailwind-v4
- **shadcnblocks.com:** https://www.shadcnblocks.com/blocks
- **Registry Directory:** https://ui.shadcn.com/docs/directory

## Integration

Works seamlessly with: Next.js, Remix, Astro, Vite + React, Laravel, React Hook Form, Zod, TanStack Table, Recharts.

**Monorepo support:** CLI understands Turborepo/pnpm workspaces. See [CLI Features](references/cli-features.md).

## Examples & References

| Topic | Location |
|-------|----------|
| **TanStack Integration** | |
| TanStack Router | [references/tanstack-router-integration.md](references/tanstack-router-integration.md) |
| TanStack Table | [references/tanstack-table-integration.md](references/tanstack-table-integration.md) |
| **Component References** | |
| Component categories | [references/component-categories.md](references/component-categories.md) |
| Version compatibility | [references/version-compatibility.md](references/version-compatibility.md) |
| CLI features | [references/cli-features.md](references/cli-features.md) |
| shadcnblocks catalog | [references/shadcnblocks-categories.md](references/shadcnblocks-categories.md) |
| **Code Examples** | |
| Basic components | [examples/basic-components.md](examples/basic-components.md) |
| Forms | [examples/forms.md](examples/forms.md) |
| Dialogs | [examples/dialogs.md](examples/dialogs.md) |
| Block usage | [examples/blocks-usage.md](examples/blocks-usage.md) |
| Customization | [examples/customization.md](examples/customization.md) |
| Common patterns | [examples/common-patterns.md](examples/common-patterns.md) |
