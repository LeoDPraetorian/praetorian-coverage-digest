# React Modernization - Migration Checklist

Complete step-by-step checklist for React version upgrades. Copy this checklist and check off items as you complete them.

## Phase 1: Pre-Migration Setup

```
Migration Preparation:
- [ ] Create feature branch for migration work
- [ ] Ensure all tests are passing on current version
- [ ] Document current React version and dependencies
- [ ] Review React upgrade guide for target version
- [ ] Backup current package-lock.json/yarn.lock
- [ ] Commit all pending changes
- [ ] Set up StrictMode in development if not enabled
```

## Phase 2: Dependency Upgrades

### React 17 → 18 Upgrade

```
Package Updates:
- [ ] Update react to 18.3.x (recommended before React 19)
- [ ] Update react-dom to 18.3.x
- [ ] Update @types/react and @types/react-dom if using TypeScript
- [ ] Update testing libraries (React Testing Library, etc.)
- [ ] Run npm install / yarn install
- [ ] Verify development server starts

Breaking Changes:
- [ ] Update root API from ReactDOM.render to createRoot
- [ ] Test automatic batching behavior in async code
- [ ] Verify no event pooling issues (removed in React 17)
- [ ] Check for hydration mismatches with Suspense
- [ ] Test StrictMode with double-invoking effects
```

### React 18 → 19 Upgrade

```
Package Updates:
- [ ] Update react to 19.x
- [ ] Update react-dom to 19.x
- [ ] Update @types/react and @types/react-dom
- [ ] Update testing libraries for React 19 compatibility
- [ ] Run npm install / yarn install

Breaking Changes (Run codemods first):
- [ ] Remove all ReactDOM.render usage (use createRoot)
- [ ] Remove all forwardRef usage (ref is now regular prop)
- [ ] Remove propTypes from function components
- [ ] Convert defaultProps to default parameters
- [ ] Replace string refs with useRef
```

## Phase 3: Automated Codemods

```
Run Codemods:
- [ ] Run: npx codemod react/19/migration-recipe (all-in-one)
  OR run individual codemods:
  - [ ] npx codemod react/19/replace-reactdom-render
  - [ ] npx codemod react/19/replace-string-refs
  - [ ] npx codemod react/19/remove-proptypes
  - [ ] npx codemod react/19/replace-default-props
  - [ ] npx codemod react/19/remove-forwardref

TypeScript Updates:
- [ ] Run: npx types-react-codemod preset-19
- [ ] Fix any remaining type errors
- [ ] Update custom type definitions if needed

Verification:
- [ ] Review all codemod changes in git diff
- [ ] Test application builds successfully
- [ ] Run test suite to catch breaking changes
- [ ] Fix any test failures from codemods
```

## Phase 4: Manual Component Migration

### Class to Hooks Migration

```
For each class component:
- [ ] Identify component candidates (start with leaf components)
- [ ] Convert constructor state to useState
- [ ] Convert componentDidMount to useEffect
- [ ] Convert componentDidUpdate to useEffect with dependencies
- [ ] Convert componentWillUnmount to useEffect cleanup
- [ ] Convert instance methods to functions
- [ ] Convert refs from createRef to useRef
- [ ] Test component behavior matches original
- [ ] Update component tests
```

### Context Migration

```
Context Updates:
- [ ] Convert class contextType to useContext
- [ ] Convert Context.Consumer to useContext
- [ ] Replace HOC patterns with custom hooks
- [ ] Test context value changes propagate correctly
```

## Phase 5: React 19 Feature Adoption

### Form Actions

```
Form Modernization:
- [ ] Identify forms with manual state/loading/error handling
- [ ] Convert to useActionState pattern
- [ ] Replace manual loading states with isPending
- [ ] Replace manual error handling with state.error
- [ ] Test form submissions with loading states
- [ ] Test error handling and display
```

### Optimistic Updates

```
Optimistic UI:
- [ ] Identify operations needing instant feedback
- [ ] Implement useOptimistic for relevant operations
- [ ] Add pending state indicators
- [ ] Test rollback behavior on errors
- [ ] Verify server sync after optimistic update
```

### Ref as Regular Prop

```
Ref Cleanup:
- [ ] Remove all forwardRef wrappers (if codemod missed any)
- [ ] Update components to accept ref as regular prop
- [ ] Update TypeScript types for ref prop
- [ ] Test ref forwarding still works
```

## Phase 6: React Compiler (Optional)

```
Enable React Compiler:
- [ ] Install babel-plugin-react-compiler
- [ ] Update vite.config.js or webpack config
- [ ] Enable compiler in build configuration
- [ ] Test application with compiler enabled
- [ ] Remove unnecessary useMemo/useCallback/React.memo
- [ ] Verify performance improvements in DevTools
- [ ] Check for compiler warnings in console
```

## Phase 7: Performance Optimization

### Without React Compiler

```
Manual Optimization:
- [ ] Identify expensive calculations with DevTools Profiler
- [ ] Add useMemo for expensive calculations
- [ ] Add useCallback for callback props
- [ ] Wrap expensive child components with React.memo
- [ ] Profile before and after optimizations
```

### Code Splitting

```
Bundle Optimization:
- [ ] Identify large routes/components for lazy loading
- [ ] Implement React.lazy for route components
- [ ] Add Suspense boundaries with loading fallbacks
- [ ] Test lazy-loaded routes load correctly
- [ ] Verify bundle size reduction
```

## Phase 8: Testing & Verification

### Test Suite Updates

```
Test Updates:
- [ ] Update test setup files for React 19
- [ ] Fix deprecation warnings in tests
- [ ] Update snapshot tests if needed
- [ ] Add tests for new React 19 features used
- [ ] Ensure all tests pass with new React version
- [ ] Run tests in CI/CD pipeline
```

### Browser Testing

```
Manual Testing:
- [ ] Test all critical user flows
- [ ] Test on supported browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test mobile responsive behavior
- [ ] Verify no console errors or warnings
- [ ] Test form submissions and validation
- [ ] Test lazy-loaded routes
- [ ] Verify loading states and error boundaries
```

### Performance Testing

```
Performance Verification:
- [ ] Run Lighthouse audit (target score 90+)
- [ ] Profile with React DevTools Profiler
- [ ] Measure time to interactive (TTI)
- [ ] Check bundle sizes (npm run build)
- [ ] Verify no performance regressions
- [ ] Test with React DevTools Profiler recording
```

## Phase 9: Production Deployment

```
Pre-Deployment:
- [ ] Update CHANGELOG with migration notes
- [ ] Update documentation for React version
- [ ] Create rollback plan if issues occur
- [ ] Stage deployment to test environment
- [ ] Run smoke tests on staging
- [ ] Monitor error tracking tools (Sentry, etc.)

Deployment:
- [ ] Deploy to production with monitoring
- [ ] Monitor error rates in first 24 hours
- [ ] Check performance metrics vs. baseline
- [ ] Verify no increase in client-side errors
- [ ] Collect user feedback on stability

Post-Deployment:
- [ ] Document any issues encountered
- [ ] Update migration guide with lessons learned
- [ ] Plan next phase if incremental migration
- [ ] Clean up deprecated code patterns
```

## Common Issues Checklist

```
Troubleshooting:
- [ ] If build fails: Check for incompatible dependencies
- [ ] If tests fail: Update test setup for new React version
- [ ] If types fail: Run types-react-codemod again
- [ ] If hydration errors: Check for mismatches in SSR
- [ ] If performance degrades: Profile and add memoization
- [ ] If refs break: Ensure forwardRef removed correctly
- [ ] If forms break: Verify useActionState implementation
```

## React 19 Verification Commands

```bash
# Verify no deprecated patterns remain
grep -r "ReactDOM.render" src/
grep -r "forwardRef" src/
grep -r "propTypes" src/
grep -r "defaultProps" src/

# Check package versions
npm list react react-dom

# Run full test suite
npm test

# Build for production
npm run build

# Check bundle size
npm run build && ls -lh dist/
```

## Version-Specific Notes

### React 18 Specific

- Automatic batching now works in async code (setTimeout, promises)
- StrictMode double-invokes effects in development (expected behavior)
- Suspense on server requires framework support (Next.js 13+)
- useId for generating unique IDs (SSR-safe)

### React 19 Specific

- ref is now a regular prop (no forwardRef needed)
- React Compiler is separate package (opt-in)
- useActionState replaces useFormState
- useOptimistic for instant UI updates
- useEffectEvent (experimental) for stable callbacks
- Server Components stable (requires framework)

## Migration Time Estimates

- **Small app (< 50 components)**: 1-2 days
- **Medium app (50-200 components)**: 3-5 days
- **Large app (200+ components)**: 1-2 weeks
- **Enterprise app with testing**: 2-4 weeks

Add 20-30% time if migrating multiple versions (e.g., 16 → 19).
