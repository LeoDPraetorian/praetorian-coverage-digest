# Documentation Analysis Patterns

## Overview

After fetching documentation from Context7, analyze the markdown content to extract actionable information for skill creation.

---

## Analysis Phases

### Phase 1: Structure Discovery

**Identify documentation sections**:

1. **Quick Reference** - High-level API overview
2. **Installation** - Setup instructions
3. **API Documentation** - Detailed function/hook signatures
4. **Code Examples** - Usage patterns
5. **Migration Guides** - Version-specific changes
6. **Best Practices** - Recommended patterns
7. **Troubleshooting** - Common issues

**Scan for headers**:

```markdown
# Quick Reference

## Installation

## API Documentation

### useQuery

### useMutation

## Examples

## Migration from v4 to v5

## Best Practices
```

---

### Phase 2: API Extraction

**Extract function/hook signatures with types**:

```typescript
// Example from @tanstack/react-query docs
function useQuery<TData, TError>(
  options: UseQueryOptions<TData, TError>
): UseQueryResult<TData, TError>;

interface UseQueryOptions {
  queryKey: QueryKey;
  queryFn: QueryFunction<TData>;
  staleTime?: number;
  cacheTime?: number;
  enabled?: boolean;
  onSuccess?: (data: TData) => void;
  onError?: (error: TError) => void;
}
```

**Key information to capture**:

- Function/hook name
- Type parameters (generics)
- Required vs optional parameters
- Return types
- Interface definitions

**Output table**:

| API           | Purpose              | Required Params   | Optional Params                    | Return Type       |
| ------------- | -------------------- | ----------------- | ---------------------------------- | ----------------- |
| useQuery()    | Fetch and cache data | queryKey, queryFn | staleTime, cacheTime, enabled, ... | UseQueryResult    |
| useMutation() | Modify server data   | mutationFn        | onSuccess, onError, onSettled, ... | UseMutationResult |

---

### Phase 3: Pattern Recognition

**Identify common patterns in examples**:

#### Pattern 1: Query Keys

```typescript
// Array-based hierarchy
const queryKey = ["todos", { status: "active" }];
const queryKey = ["user", userId];
```

**Pattern**: Query keys are arrays with hierarchical structure for cache organization.

#### Pattern 2: Error Handling

```typescript
const { data, error, isError } = useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
  onError: (error) => {
    console.error("Failed to fetch todos:", error);
  },
});
```

**Pattern**: Error handling via onError callback and isError boolean.

#### Pattern 3: Loading States

```typescript
if (isLoading) return <Spinner />;
if (isError) return <Error error={error} />;
return <TodoList data={data} />;
```

**Pattern**: Check loading/error states before rendering data.

---

### Phase 4: Version-Specific Changes

**Extract breaking changes** from migration guides:

```markdown
## Migration from v4 to v5

### Breaking Changes

1. **QueryCache is no longer exported**
   - v4: `import { QueryCache } from 'react-query'`
   - v5: Use `queryClient.getQueryCache()` instead

2. **useQuery hook signature changed**
   - v4: `useQuery(queryKey, queryFn, options)`
   - v5: `useQuery({ queryKey, queryFn, ...options })`

3. **cacheTime renamed to gcTime**
   - v4: `cacheTime: 5 * 60 * 1000`
   - v5: `gcTime: 5 * 60 * 1000`
```

**Output table**:

| Change Category | v4 (Old)                  | v5 (New)                          |
| --------------- | ------------------------- | --------------------------------- |
| Import          | `import { QueryCache }`   | `queryClient.getQueryCache()`     |
| Hook signature  | `useQuery(key, fn, opts)` | `useQuery({ queryKey, queryFn })` |
| Option naming   | `cacheTime`               | `gcTime`                          |

---

### Phase 5: Anti-Pattern Detection

**Identify what NOT to do** from documentation warnings:

```markdown
⚠️ **Warning**: Do not use query keys without arrays

❌ Bad: `queryKey: 'todos'`
✅ Good: `queryKey: ['todos']`

⚠️ **Warning**: Do not mutate queryFn return values

❌ Bad:
```

typescript
queryFn: async () => {
const data = await fetchTodos()
data.push(...) // Mutation!
return data
}

````

✅ Good:
```typescript
queryFn: async () => {
const data = await fetchTodos()
return [...data, ...] // New array
}
````

````

**Anti-patterns table**:

| Anti-Pattern                           | Why It Fails                        | Correct Approach                  |
| -------------------------------------- | ----------------------------------- | --------------------------------- |
| Query keys without arrays              | Type mismatch, cache invalidation   | Always use arrays: ['todos']      |
| Mutating queryFn return values         | Breaks referential equality         | Return new objects/arrays         |
| Conditional hook calls                 | Violates Rules of Hooks            | Use enabled option instead        |

---

## Extraction Templates

### Template 1: Quick Reference Section

```markdown
## Quick Reference

**Most Common APIs**:

| API | Purpose | Example |
| --- | ------- | ------- |
| useQuery() | Fetch data | useQuery({ queryKey: ['todos'], queryFn: fetchTodos }) |
| useMutation() | Modify data | useMutation({ mutationFn: createTodo }) |
| useQueryClient() | Access client | const queryClient = useQueryClient() |

**Installation**:

\`\`\`bash
npm install @tanstack/react-query
\`\`\`

**Basic Setup**:

\`\`\`tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  )
}
\`\`\`
````

---

### Template 2: API Reference Section

```markdown
## API Reference

### useQuery()

**Purpose**: Fetch and cache data from a query function.

**Signature**:

\`\`\`typescript
function useQuery<TData, TError>(
options: UseQueryOptions<TData, TError>
): UseQueryResult<TData, TError>
\`\`\`

**Options**:

| Option    | Type          | Required | Default | Description                |
| --------- | ------------- | -------- | ------- | -------------------------- |
| queryKey  | QueryKey      | ✅       | -       | Unique key for cache       |
| queryFn   | QueryFunction | ✅       | -       | Function that fetches data |
| staleTime | number        | ❌       | 0       | Time before data is stale  |
| enabled   | boolean       | ❌       | true    | Enable/disable query       |

**Returns**:

| Property  | Type    | Description                  |
| --------- | ------- | ---------------------------- |
| data      | TData   | Cached data                  |
| error     | TError  | Error object if query failed |
| isLoading | boolean | True if first fetch          |
| isError   | boolean | True if query failed         |

**Example**:

\`\`\`typescript
const { data, error, isLoading } = useQuery({
queryKey: ['todos'],
queryFn: () => fetch('/api/todos').then(r => r.json()),
staleTime: 5 _ 60 _ 1000, // 5 minutes
})
\`\`\`
```

---

### Template 3: Common Patterns Section

```markdown
## Common Patterns

### Pattern 1: Query Key Hierarchy

Organize cache with array-based query keys:

\`\`\`typescript
// All todos
['todos']

// Filtered todos
['todos', { status: 'active' }]

// Single todo
['todos', todoId]
\`\`\`

**Why**: Enables precise cache invalidation:

\`\`\`typescript
// Invalidate all todo queries
queryClient.invalidateQueries({ queryKey: ['todos'] })

// Invalidate only active todos
queryClient.invalidateQueries({ queryKey: ['todos', { status: 'active' }] })
\`\`\`

---

### Pattern 2: Error Handling

Handle errors at query level or globally:

\`\`\`typescript
// Query-level
const { data, error } = useQuery({
queryKey: ['todos'],
queryFn: fetchTodos,
onError: (error) => {
toast.error(\`Failed: \${error.message}\`)
}
})

// Global
const queryClient = new QueryClient({
defaultOptions: {
queries: {
onError: (error) => {
console.error('Query failed:', error)
}
}
}
})
\`\`\`
```

---

### Template 4: Migration Guide Section

```markdown
## Migration Guide

### Upgrading from v4 to v5

**Breaking Changes**:

1. **Hook signature changed**:

   \`\`\`typescript
   // v4
   useQuery(queryKey, queryFn, options)

   // v5
   useQuery({ queryKey, queryFn, ...options })
   \`\`\`

2. **cacheTime renamed to gcTime**:

   \`\`\`typescript
   // v4
   { cacheTime: 5 _ 60 _ 1000 }

   // v5
   { gcTime: 5 _ 60 _ 1000 }
   \`\`\`

3. **QueryCache no longer exported**:

   \`\`\`typescript
   // v4
   import { QueryCache } from 'react-query'

   // v5
   const cache = queryClient.getQueryCache()
   \`\`\`

**New Features**:

- Suspense support (experimental)
- Improved TypeScript inference
- Better devtools integration
```

---

## Analysis Checklist

When analyzing Context7 documentation:

- [ ] Identified main sections (Quick Reference, API, Examples, Migration)
- [ ] Extracted all function/hook signatures with types
- [ ] Captured required vs optional parameters
- [ ] Documented return types and interfaces
- [ ] Found code examples for common use cases
- [ ] Noted version-specific changes (breaking changes)
- [ ] Identified anti-patterns and warnings
- [ ] Extracted best practices and recommendations
- [ ] Organized findings in structured tables
- [ ] Saved synthesis to research output directory

---

## Output Format for Skill Creation

**Output location depends on invocation mode:**

**Mode 1: Standalone** - Save to `$ROOT/.claude/.output/research/${TIMESTAMP}-${LIBRARY}-context7/SYNTHESIS.md`

**Mode 2: Orchestrated** - Save to `${OUTPUT_DIR}/context7.md` (parent provides OUTPUT_DIR)

```markdown
## Context7 Research: {library-name}

### Library Info

- Package: {package-name}
- Version: {version}
- Context7 ID: {library-id}
- Estimated Tokens: {tokens}
- Fetched: {date}

### Key APIs Discovered

[Insert API table]

### Common Patterns

[Insert pattern examples]

### Anti-Patterns

[Insert anti-pattern warnings]

### Migration Notes

[Insert version-specific changes]

### Recommendations for Skill

- [What to include in Quick Reference]
- [What to explain in detail]
- [What patterns to emphasize]
- [What warnings to highlight]
```

This structured output feeds directly into skill creation workflow.
