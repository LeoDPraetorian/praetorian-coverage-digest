---
name: frontend-react-modernization
description: Use when modernizing React codebases, migrating to React Hooks, upgrading to React 19, or adopting automatic memoization with React Compiler - covers upgrading React applications to React 19, migrating class components to hooks, adopting concurrent features, and leveraging React Compiler for automatic optimization
allowed-tools: 'Read, Write, Edit, Bash, Grep'
---

# React Modernization

Master React version upgrades, class to hooks migration, concurrent features adoption, React 19 features, and React Compiler optimization.

## When to Use This Skill

- Upgrading React applications to React 19
- Migrating class components to functional components with hooks
- Adopting concurrent React features (Suspense, transitions)
- Enabling React Compiler for automatic memoization
- Using new React 19 hooks (useActionState, useOptimistic, useEffectEvent)
- Migrating forms to Actions pattern
- Adopting Server Components (Next.js/Remix)
- Removing forwardRef (ref is now a regular prop in React 19)
- Applying codemods for automated refactoring
- Modernizing state management patterns

## Version Upgrade Path

### React 16 → 17 → 18 → 19

**React 17:** Event delegation changes, no event pooling, new JSX transform

**React 18:** Automatic batching, concurrent rendering, new root API (createRoot), Suspense on server

**React 19:** Removed ReactDOM.render/hydrate, removed propTypes/defaultProps for functions, removed forwardRef (ref is regular prop), React Compiler for automatic optimization, Actions and new hooks, Server Components stable

## Migration Workflow

### 1. Pre-Migration Setup
- Update dependencies incrementally (React 17 → 18 → 19)
- Review breaking changes for target version
- Set up comprehensive testing suite
- Create feature branch for migration work

### 2. Apply Codemods
Use automated codemods for mechanical transformations:
```bash
# React 19 all-in-one migration
npx codemod react/19/migration-recipe

# Or individual codemods
npx codemod react/19/replace-reactdom-render
npx codemod react/19/remove-forwardref
npx types-react-codemod preset-19  # TypeScript
```

**See @codemods.md for complete codemod reference and custom codemod examples.**

### 3. Migrate Components
- Start with leaf components (no children)
- Convert class components to hooks (see @migration-patterns.md)
- Update lifecycle methods to useEffect patterns
- Replace HOCs with custom hooks
- Test each component after conversion

### 4. Adopt Modern Patterns
**React 19 Features:**
- **useActionState**: Replace manual form state/error/pending management
- **useOptimistic**: Instant UI feedback for async operations
- **useEffectEvent**: Stable event handlers (solves dependency issues)
- **Ref as prop**: Remove forwardRef usage
- **React Compiler**: Enable for automatic memoization (25-40% fewer re-renders)

**See @migration-patterns.md for detailed before/after code examples.**

### 5. Verify and Test
- Run full test suite with StrictMode enabled
- Check console for deprecation warnings
- Test all critical user flows
- Performance profiling with React DevTools

## Quick Reference

| Pattern | React 18 | React 19 |
|---------|----------|----------|
| Root API | `ReactDOM.render()` | `createRoot().render()` |
| Forward Refs | `forwardRef()` | ref as regular prop |
| Form State | Manual state/error/pending | `useActionState()` |
| Optimistic UI | Manual state management | `useOptimistic()` |
| Event Handlers | `useCallback()` with deps | `useEffectEvent()` |
| Memoization | Manual `useMemo/useCallback` | React Compiler (automatic) |

## Best Practices

### Migration Strategy
1. **Incremental**: Don't migrate everything at once
2. **Test Thoroughly**: Comprehensive testing at each step
3. **Automate First**: Use codemods for mechanical changes
4. **Start Simple**: Begin with leaf components

### React 19 Patterns
1. **Upgrade to 18.3 First**: Get helpful warnings before React 19
2. **Run Codemods First**: Automate breaking changes
3. **Use Actions for Forms**: Simplify async form handling
4. **Treat ref as Regular Prop**: No more forwardRef
5. **Enable React Compiler**: Automatic optimization (optional but recommended)
6. **Simplify Memoization**: React 19 handles re-renders better

## Common Pitfalls

**React 19 Specific:**
- Using removed APIs (ReactDOM.render, propTypes, forwardRef)
- Over-memoizing with React Compiler enabled (unnecessary)
- Not running codemods before manual migration
- Skipping React 18.3 upgrade (misses helpful warnings)
- Assuming React Compiler is included (it's separate, opt-in)

## Reference Files

- **@migration-patterns.md**: Complete before/after code examples for all migration patterns
- **@codemods.md**: All codemod commands and custom codemod examples
- **@checklist.md**: Detailed step-by-step migration checklist
