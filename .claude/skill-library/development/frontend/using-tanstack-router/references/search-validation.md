# Search Parameter Validation with Zod Adapter

## Overview

TanStack Router provides the `@tanstack/zod-adapter` package for robust search parameter validation with enhanced error recovery and type safety.

## Installation

```bash
npm install @tanstack/zod-adapter zod
```

## Basic Usage

### Using zodValidator

The `zodValidator` wrapper provides seamless integration between Zod schemas and TanStack Router:

```typescript
import { zodValidator, fallback } from '@tanstack/zod-adapter'
import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'

const searchSchema = z.object({
  page: z.number().int().positive().default(1),
  filter: z.enum(['all', 'published', 'draft']).default('all'),
  search: z.string().default(''),
})

export const Route = createFileRoute('/posts')({
  validateSearch: zodValidator(searchSchema),
  component: PostsList,
})

function PostsList() {
  const search = Route.useSearch()
  // search is fully type-safe with inferred types
  // search.page: number
  // search.filter: 'all' | 'published' | 'draft'
  // search.search: string
  return <div>Page {search.page}</div>
}
```

## .default() vs .catch()

Understanding when to use each method is crucial for proper error handling:

### `.default()` - Missing Values

Use `.default()` when the search parameter is **not present** in the URL:

```typescript
const searchSchema = z.object({
  sortBy: z.enum(["date", "name", "size"]).default("date"),
  // URL: /files → sortBy = 'date' (missing, uses default)
  // URL: /files?sortBy=name → sortBy = 'name'
});
```

**When it triggers:**

- Parameter doesn't exist in query string
- Parameter key is present but value is empty

### `.catch()` - Invalid Values

Use `.catch()` when validation **fails** and you want to recover with a fallback:

```typescript
const searchSchema = z.object({
  sortBy: z.enum(["date", "name", "size"]).catch("date"),
  // URL: /files?sortBy=invalid → sortBy = 'date' (invalid, catches and uses fallback)
  // URL: /files?sortBy=name → sortBy = 'name'
  // URL: /files → sortBy = undefined (missing, not caught)
});
```

**When it triggers:**

- Parameter exists but fails validation
- Wrong type (string when number expected)
- Invalid enum value
- Constraint violations (min/max, regex, etc.)

### Combining Both

For comprehensive error handling, combine `.default()` and `.catch()`:

```typescript
const searchSchema = z.object({
  page: z.number().int().positive().catch(1).default(1),
  // URL: /posts → page = 1 (missing, default)
  // URL: /posts?page=5 → page = 5 (valid)
  // URL: /posts?page=-1 → page = 1 (invalid, catch)
  // URL: /posts?page=abc → page = 1 (invalid type, catch)
});
```

## fallback() Utility

The `fallback()` utility combines `.default()` and `.catch()` behaviors in one call:

```typescript
import { zodValidator, fallback } from "@tanstack/zod-adapter";

const searchSchema = z.object({
  page: fallback(z.number().int().positive(), 1),
  pageSize: fallback(z.number().int().min(10).max(100), 20),
  sortBy: fallback(z.enum(["date", "name", "size"]), "date"),
});

// Equivalent to:
// page: z.number().int().positive().catch(1).default(1)
```

**Benefits of `fallback()`:**

- More concise syntax
- Handles both missing and invalid values
- Clear intent (single source of truth for default value)
- Recommended for production applications

## Complete Example

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";

// Production-ready search schema
const assetsSearchSchema = z.object({
  // Pagination
  page: fallback(z.number().int().positive(), 1),
  pageSize: fallback(z.number().int().min(10).max(100), 20),

  // Filtering
  status: fallback(z.enum(["active", "inactive", "all"]), "all"),
  category: z.string().optional(),

  // Sorting
  sortBy: fallback(z.enum(["name", "created", "updated"]), "created"),
  sortOrder: fallback(z.enum(["asc", "desc"]), "desc"),

  // Search
  query: z.string().default(""),

  // Boolean flags
  includeArchived: z.boolean().catch(false).default(false),
});

export const Route = createFileRoute("/assets")({
  validateSearch: zodValidator(assetsSearchSchema),
  loader: async ({ search }) => {
    // All search params are validated and type-safe
    return fetchAssets({
      page: search.page,
      pageSize: search.pageSize,
      status: search.status,
      sortBy: search.sortBy,
      sortOrder: search.sortOrder,
      query: search.query,
    });
  },
  component: AssetsList,
});
```

## Error Handling with User Feedback

Show user-friendly error messages when validation fails:

```typescript
const searchSchema = z.object({
  price: z
    .number()
    .positive()
    .catch((ctx) => {
      console.warn("Invalid price parameter:", ctx.error);
      return 0;
    }),
});

// Or use .default() with .catch() to show error but continue
const searchSchemaWithError = z.object({
  price: z
    .number()
    .positive()
    .catch((ctx) => {
      console.error("Price validation failed:", ctx.input);
      return 0;
    })
    .default(0),
});
```

## Type Inference

The adapter automatically infers TypeScript types:

```typescript
const schema = z.object({
  page: fallback(z.number(), 1),
  status: z.enum(["active", "inactive"]).optional(),
});

type SearchParams = z.infer<typeof schema>;
// type SearchParams = {
//   page: number
//   status?: 'active' | 'inactive'
// }
```

## Best Practices

1. **Use `fallback()` for required params** - Handles both missing and invalid gracefully
2. **Use `.optional()` for truly optional params** - No fallback needed
3. **Use `.default()` for missing values only** - When invalid values should throw
4. **Use `.catch()` for validation failures** - When missing values should remain undefined
5. **Validate constraints** - Use `.min()`, `.max()`, `.regex()` for business rules
6. **Type all enums** - Prevents typos and provides autocomplete

## Common Patterns

### Pagination with Constraints

```typescript
const paginationSchema = z.object({
  page: fallback(z.number().int().positive(), 1),
  pageSize: fallback(z.number().int().min(10).max(100), 20),
});
```

### Multi-Select Filters

```typescript
const filtersSchema = z.object({
  tags: z.array(z.string()).catch([]).default([]),
  // URL: /posts?tags=react&tags=typescript
  // Parsed: { tags: ['react', 'typescript'] }
});
```

### Date Range Validation

```typescript
const dateRangeSchema = z
  .object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    { message: "Start date must be before end date" }
  );
```

## Related

- [TanStack Router Search Params Validation](https://tanstack.com/router/latest/docs/framework/react/how-to/validate-search-params)
- [Zod Documentation](https://zod.dev)
- Main skill: [using-tanstack-router](../SKILL.md)
