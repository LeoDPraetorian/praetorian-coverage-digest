---
name: frontend-architecture
description: Use when designing scalable React 19 applications - component architecture, state management with TanStack Query + Zustand, Tailwind CSS 4 patterns, TypeScript 5 best practices, and React Compiler optimization
category: frontend
tags: [architecture, design-patterns, components, scalability, modules, state-management, react-19, typescript-5, tailwind-4]
version: 2.0.0
allowed-tools: Read
---

# Frontend Architecture Skill

## When to Use This Skill

Use this skill when you need to:

- **Design scalable application architecture** - Structure large-scale React 19 applications with maintainable patterns
- **Choose architectural patterns** - Select appropriate design patterns for React applications
- **Implement state management** - Design state architecture with TanStack Query and Zustand
- **Structure component hierarchies** - Create reusable, composable component systems with React 19
- **Optimize build processes** - Configure Vite for optimal performance
- **Design module systems** - Implement code splitting, lazy loading, and module boundaries
- **Scale codebases** - Establish conventions for growing teams and applications
- **Refactor legacy code** - Migrate to modern React 19 patterns
- **Performance optimization** - Leverage React Compiler for automatic optimization

## Tech Stack Context

This skill is aligned with the **Chariot Development Platform** tech stack:

- **React 19.1**: Function components with React Compiler for automatic optimization
- **TypeScript 5.9**: Strict mode enabled for type safety
- **Vite 7.1**: Build tool with HTTPS development server
- **TanStack Query 5.90**: Data fetching, caching, and state management
- **Tailwind CSS 4.1**: Utility-first styling with CSS variables and custom theme
- **Zustand 4.5**: Simple, unopinionated state management

## Quick Start

### Basic Component Structure

```typescript
// Modern React 19 function component
function UserProfile({ userId }: { userId: string }) {
  // TanStack Query for server state
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  if (isLoading) return <Loading />;
  if (!user) return <NotFound />;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
      <p className="text-sm text-gray-600">{user.email}</p>
    </div>
  );
}
```

### State Management Pattern

```typescript
// Server state with TanStack Query
const { data, isLoading } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  gcTime: 5 * 60 * 1000, // Note: gcTime replaces cacheTime in v5
});

// Client state with Zustand
import { create } from 'zustand';

const useStore = create<State>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

### Tailwind CSS Styling

```typescript
function Button({ variant = 'primary', children }: ButtonProps) {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-lg font-medium transition-colors',
        variant === 'primary' && 'bg-brand text-white hover:bg-brand-dark',
        variant === 'secondary' && 'bg-gray-200 text-gray-900 hover:bg-gray-300'
      )}
    >
      {children}
    </button>
  );
}
```

## Table of Contents

This skill is organized into detailed reference documents. Read them as needed:

### Core Architecture Patterns

- **[React 19 Patterns](references/react-19-patterns.md)** - Component design principles, composition patterns, hooks best practices
- **[Design Patterns](references/design-patterns.md)** - MVC, MVVM, Flux, Observer, Factory, and Module patterns for React
- **[State Management](references/state-management.md)** - TanStack Query v5 and Zustand 4.x patterns for server and client state

### Build & Performance

- **[Build Tools](references/build-tools.md)** - Vite 7 configuration, bundle optimization, code splitting
- **[Performance Optimization](references/performance.md)** - React Compiler usage, lazy loading, memoization strategies

### Code Organization

- **[Module Systems](references/module-systems.md)** - Code splitting, lazy loading, barrel exports, module boundaries
- **[Scalability Patterns](references/scalability.md)** - Team collaboration, conventions, folder structures, code ownership

## Core Architecture Principles

### 1. Component Hierarchy

Organize components in a clear hierarchy:

```
src/
├── sections/           # Feature-based page sections
│   ├── assets/        # Asset management views
│   ├── vulnerabilities/ # Vulnerability tracking
│   └── insights/      # Analytics dashboards
├── components/        # Reusable UI components
│   ├── modals/       # Modal dialogs
│   └── tables/       # Data table components
└── hooks/            # Custom React hooks
    ├── api/          # API integration hooks
    └── useAssets.tsx # Domain-specific hooks
```

### 2. Separation of Concerns

**Layer Architecture:**
- **Presentation Layer**: Components, Views, UI (React components)
- **Application Layer**: State Management, Routing, Hooks (TanStack Query, Zustand)
- **Domain Layer**: Business Logic, Entities (TypeScript classes, types)
- **Infrastructure Layer**: API, Storage, Services (axios, API clients)

### 3. State Management Strategy

**Choose the right tool for the job:**

| State Type | Tool | Example |
|------------|------|---------|
| **Server state** | TanStack Query | User data, API responses |
| **Global client state** | Zustand | Theme, auth status, UI preferences |
| **Local component state** | useState | Form inputs, modal state |
| **URL state** | React Router | Filters, pagination, tabs |

## Common Workflows

### Creating a New Feature

1. **Design component hierarchy** - Identify containers and presentational components
2. **Set up state management** - Choose TanStack Query for server data, Zustand for global state
3. **Implement UI components** - Use Tailwind CSS for styling
4. **Add routing** - Configure React Router paths
5. **Optimize performance** - Let React Compiler handle most optimization

See [React 19 Patterns](references/react-19-patterns.md) for detailed component design.

### Refactoring Legacy Code

1. **Remove React.FC** - Convert to plain function declarations
2. **Update TanStack Query** - Change `cacheTime` to `gcTime` (v5 API)
3. **Update Zustand** - Change to named `create` import
4. **Simplify memoization** - Remove unnecessary `useMemo`/`useCallback` (React Compiler handles this)
5. **Modernize styling** - Migrate to Tailwind CSS 4 with CSS variables

See [Performance Optimization](references/performance.md) for React Compiler guidance.

### Implementing State Management

1. **Identify state type** - Server data or client state?
2. **For server state** - Use TanStack Query with proper cache configuration
3. **For client state** - Use Zustand for global, useState for local
4. **Configure caching** - Set appropriate `gcTime` and `staleTime`
5. **Handle loading/error states** - Use TanStack Query's built-in states

See [State Management](references/state-management.md) for detailed patterns.

## Best Practices

### Component Design

- ✅ Use function declarations (not React.FC)
- ✅ Single responsibility per component
- ✅ Composition over inheritance
- ✅ Container/Presentational pattern
- ❌ Don't mix data fetching with UI logic
- ❌ Don't create unnecessary abstractions

### State Management

- ✅ Use TanStack Query for all server state
- ✅ Use Zustand for global client state
- ✅ Use useState for local component state
- ✅ Set appropriate cache times (`gcTime`, `staleTime`)
- ❌ Don't use Redux for new projects (use Zustand instead)
- ❌ Don't fetch data in useEffect (use TanStack Query)

### Styling with Tailwind CSS 4

- ✅ Use utility classes for styling
- ✅ Use CSS variables for theme values
- ✅ Use `cn()` utility for conditional classes
- ✅ Follow design system spacing/colors
- ❌ Don't use inline styles
- ❌ Don't create CSS files for component styles

### TypeScript

- ✅ Enable strict mode
- ✅ Define explicit prop types
- ✅ Use `interface` for objects, `type` for unions
- ✅ Leverage type inference where possible
- ❌ Don't use `any` (use `unknown` instead)
- ❌ Don't disable strict checks

### Performance

- ✅ Let React Compiler handle optimization
- ✅ Use `useMemo` only for expensive computations (>100ms)
- ✅ Use virtualization for large lists (>1000 items)
- ✅ Use code splitting for routes
- ❌ Don't prematurely optimize with `React.memo`
- ❌ Don't use `useCallback` for every function

## Critical Rules

### React 19 Patterns

1. **Always use function declarations** - Never React.FC
2. **Let React Compiler optimize** - Don't add manual memoization unless profiling shows need
3. **Use TanStack Query for server state** - Never fetch in useEffect

### TanStack Query v5

1. **Use `gcTime` not `cacheTime`** - API changed in v5
2. **Set appropriate cache times** - Don't use staleTime: 0 (defeats caching)
3. **Invalidate queries on mutations** - Use `queryClient.invalidateQueries()`

### Zustand 4.x

1. **Use named import** - `import { create } from 'zustand'` (not default)
2. **Keep stores focused** - One store per domain
3. **Don't use for server state** - Use TanStack Query instead

### Tailwind CSS 4

1. **Use CSS variables** - `bg-brand` uses `var(--brand)` under the hood
2. **Follow design system** - Use predefined colors, spacing, breakpoints
3. **Use `cn()` for conditionals** - Handles class name merging properly

## Troubleshooting

### Common Issues

**Issue**: "React Compiler not optimizing my component"
- **Solution**: Ensure component is a pure function with no side effects in render

**Issue**: "TanStack Query not caching properly"
- **Solution**: Check `gcTime` and `staleTime` settings, ensure consistent query keys

**Issue**: "Zustand state not updating"
- **Solution**: Use functional update form: `set((state) => ({ count: state.count + 1 }))`

**Issue**: "Tailwind classes not applying"
- **Solution**: Verify CSS variables are defined, check `tailwind.config.js` extends

**Issue**: "TypeScript errors with TanStack Query"
- **Solution**: Ensure proper typing of `queryFn` return value, use generics

## Related Skills

- `gateway-frontend` - Access all frontend development skills
- `gateway-testing` - Testing patterns for React applications
- `frontend-tanstack-query` - Deep dive into TanStack Query patterns
- `frontend-zustand-state-management` - Zustand state management patterns
- `frontend-tailwind-styling` - Tailwind CSS patterns and best practices
- `react-performance-optimization` - Performance tuning strategies

---

**Note**: Testing patterns (unit tests, integration tests, E2E tests, Vitest configuration) are covered in separate testing skills. See `gateway-testing` for comprehensive testing guidance.
