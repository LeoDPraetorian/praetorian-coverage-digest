# Vitest Best Practices for Chariot Platform

## Document Purpose

This document captures Vitest configuration best practices learned from optimizing the Chariot UI test suite (146 test files, 2,569 tests). These patterns apply across all frontend modules in the Chariot platform.

**For practical commands and workflows**, see [VITEST-TESTING-GUIDE.md](VITEST-TESTING-GUIDE.md).

## Problem Context

### Initial Issues (December 2024)

When running the full test suite on developer laptops:

- **Resource exhaustion** - 146 test files with only 2 threads caused severe contention
- **Import resolution failures** - `@tanstack/react-table` and other modules failed to resolve under load
- **System impact** - High CPU usage, memory pressure, system slowdown
- **Test failures** - 28 test files failed due to Vite import resolution timeouts

### Root Cause

Original configuration used `pool: 'threads'` with `maxThreads: 2`, which:

1. Created resource bottlenecks for large test suites
2. Caused module loading failures under memory pressure
3. Did not distinguish between laptop and CI/CD environments

## Solution: Research-Backed Configuration

### Core Principle

**"Optimize for developer experience on laptops, scale for CI/CD"**

Sources:

- [Vitest Performance Guide](https://vitest.dev/guide/improving-performance)
- [Optimize Thread Usage in CI/CD](https://willmendesneto.com/posts/optimize-thread-usage-in-vitest-for-ci-cd-environments/)
- [Pool Strategy Discussion](https://github.com/vitest-dev/vitest/discussions/4914)

## Recommended Configuration

### 1. Pool Strategy: Use `forks` over `threads`

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    pool: "forks", // NOT 'threads'
    poolOptions: {
      forks: {
        singleFork: false,
        maxForks: process.env.CI ? 8 : 4, // Adaptive based on environment
        minForks: 1,
      },
    },
  },
});
```

**Rationale**:

- **Better Stability**: Vitest now defaults to `forks` due to `worker_threads` compatibility issues
- **Stronger Isolation**: Child processes provide better module isolation than workers
- **Import Reliability**: Prevents Vite import resolution failures under resource pressure
- **Trade-off**: Slightly slower than threads but much more reliable

**Reference**: [Why is pool: 'forks' not default?](https://github.com/vitest-dev/vitest/discussions/4914)

### 2. Dynamic Thread/Fork Allocation

```typescript
maxForks: process.env.CI ? 8 : 4;
```

**Laptop (Local)**:

- 4 concurrent test files maximum
- Prevents resource exhaustion
- Reduces memory pressure
- Maintains system responsiveness

**CI/CD**:

- 8 concurrent test files
- Leverages cloud resources
- Faster overall execution
- Better for automated pipelines

**Calculation**: [Use 1/4 of detected cores in CI environments](https://willmendesneto.com/posts/optimize-thread-usage-in-vitest-for-ci-cd-environments/)

### 3. Isolation Configuration

```typescript
{
  fileParallelism: true,   // Run files in parallel (within maxForks limit)
  isolate: true,           // Each file in isolated context (safer)
  testTimeout: 10000,      // 10 second timeout per test
  teardownTimeout: 5000,   // 5 second cleanup timeout
}
```

**Performance Note**: Setting `isolate: false` can provide 3-8x speedup but requires careful test design to avoid cross-test contamination.

**Reference**: [Isolation Performance Trade-offs](https://vitest.dev/guide/improving-performance)

### 4. Mock Heavy Dependencies

```typescript
{
  alias: {
    jszip: path.resolve(__dirname, './src/test/mocks/jszip.mock.ts'),
    xlsx: path.resolve(__dirname, './src/test/mocks/xlsx.mock.ts'),
    papaparse: path.resolve(__dirname, './src/test/mocks/papaparse.mock.ts'),
  },
}
```

**Purpose**: Mock file processing libraries that aren't needed in test environment to reduce dependency load.

## Sectioned Testing Strategy

### Problem with "Run All Tests"

Large test suites (100+ files) overwhelm laptop resources even with optimized configuration.

### Solution: Logical Test Sections

Create npm scripts that run tests by feature area:

```json
{
  "scripts": {
    // By feature section
    "test:sections:assets": "vitest run src/sections/assets",
    "test:sections:vulnerabilities": "vitest run src/sections/vulnerabilities",
    "test:sections:settings": "vitest run src/sections/settings",
    "test:querybuilder": "vitest run src/sections/insights/queryBuilder",
    "test:metrics": "vitest run src/sections/insights/metrics",

    // By code area
    "test:components": "vitest run src/components",
    "test:hooks": "vitest run src/hooks",

    // For CI/CD parallelization
    "test:shard:1": "vitest run --exclude='e2e/**' --shard=1/4",
    "test:shard:2": "vitest run --exclude='e2e/**' --shard=2/4",
    "test:shard:3": "vitest run --exclude='e2e/**' --shard=3/4",
    "test:shard:4": "vitest run --exclude='e2e/**' --shard=4/4"
  }
}
```

**Reference**: [Test Sharding Guide](https://vitest.dev/guide/cli)

### Performance Comparison

**Full Suite** (146 files, 2,569 tests):

- Duration: ~71 seconds
- Resource usage: High CPU, high memory
- System impact: Significant slowdown

**Sectioned** (Metrics: 6 files, 130 tests):

- Duration: ~2.3 seconds
- Resource usage: Minimal
- System impact: None

## Development Workflows

### For Active Development (Laptop)

**Option 1: Watch Mode** (Recommended)

```bash
# Only runs tests affected by file changes
npm test -- src/sections/settings
```

**Option 2: Section-by-Section**

```bash
# Test the feature you're working on
npm run test:sections:settings
npm run test:querybuilder
```

**Option 3: Sharded Testing**

```bash
# Run tests in smaller batches
npm run test:shard:1
npm run test:shard:2
npm run test:shard:3
npm run test:shard:4
```

### For CI/CD Pipelines

**Parallel Execution Across Runners** (Recommended):

```yaml
# GitHub Actions example
strategy:
  matrix:
    shard: [1, 2, 3, 4]
steps:
  - name: Run tests
    run: npm run test:shard:${{ matrix.shard }}
```

**Sequential Sections** (Alternative):

```yaml
- run: npm run test:components
- run: npm run test:hooks
- run: npm run test:sections:assets
- run: npm run test:sections:vulnerabilities
- run: npm run test:sections:settings
```

**Reference**: [Maximizing CI/CD Performance with Nx Workspace](https://www.satellytes.com/blog/post/monorepo-performance-nx-workspace-on-jenkins-parallelization/)

## Common Patterns & Anti-Patterns

### ✅ DO: Use Test Projects for Large Codebases

```typescript
// vitest.workspace.ts (Vitest 3.2+)
export default defineWorkspace([
  {
    test: {
      name: "unit",
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      exclude: ["e2e/**"],
    },
  },
  {
    test: {
      name: "integration",
      include: ["src/**/*.integration.{test,spec}.{ts,tsx}"],
    },
  },
  {
    test: {
      name: "e2e",
      include: ["e2e/**/*.{test,spec}.{ts,tsx}"],
      testTimeout: 30000,
    },
  },
]);
```

**Reference**: [Test Projects Guide](https://vitest.dev/guide/projects)

### ✅ DO: Profile Slow Tests

```bash
# Generate performance profile
vitest run --reporter=verbose --profile

# View results
open vitest-profile.json
```

**Reference**: [Profiling Test Performance](https://vitest.dev/guide/profiling-test-performance)

### ❌ DON'T: Use `threads` Pool Without Good Reason

```typescript
// ❌ Avoid
pool: "threads";

// ✅ Prefer
pool: "forks";
```

**Exception**: Use `threads` only if you have specific performance benchmarks showing benefits in your environment.

### ❌ DON'T: Set `maxThreads/maxForks` Too High

```typescript
// ❌ Bad: Will overwhelm laptop
maxForks: 16;

// ✅ Good: Adaptive to environment
maxForks: process.env.CI ? 8 : 4;
```

### ❌ DON'T: Disable Isolation Without Careful Testing

```typescript
// ❌ Risky: Can cause test pollution
isolate: false;

// ✅ Safe: Isolated by default
isolate: true;
```

**Only disable isolation if**:

1. Tests are carefully designed to avoid shared state
2. You've measured 3-8x performance improvement
3. You have high test coverage to catch pollution issues

## Performance Optimization Checklist

### Configuration

- [ ] Using `pool: 'forks'` for stability
- [ ] Adaptive `maxForks` based on `process.env.CI`
- [ ] Reasonable timeouts (10s test, 5s teardown)
- [ ] `isolate: true` unless proven safe to disable

### Test Organization

- [ ] Sectioned test scripts by feature area
- [ ] Sharding configuration for CI/CD
- [ ] Test projects for different test types (unit, integration, e2e)
- [ ] Mock heavy dependencies (file processing, etc.)

### Developer Experience

- [ ] Watch mode for active development
- [ ] Fast feedback loops (<5s for single section)
- [ ] Minimal system impact on laptop
- [ ] Clear test failure messages

### CI/CD Pipeline

- [ ] Parallel execution with sharding or test projects
- [ ] Higher thread/fork count (8-16)
- [ ] Proper resource limits in containerized environments
- [ ] Test result aggregation across shards

## Troubleshooting Guide

### Issue: Import Resolution Failures

**Symptom**: `Failed to resolve import "@tanstack/react-table"`

**Causes**:

1. Too many concurrent test files for available resources
2. Using `threads` pool under memory pressure
3. Insufficient `maxThreads/maxForks` configuration

**Solution**:

```typescript
pool: 'forks',
poolOptions: {
  forks: {
    maxForks: 4,  // Reduce if still failing
  },
},
```

### Issue: Tests Hang or Timeout

**Symptom**: Tests never complete or timeout at 30s+

**Causes**:

1. Missing `teardownTimeout` configuration
2. Test not properly cleaning up async operations
3. Blocked event loop in test

**Solution**:

```typescript
testTimeout: 10000,      // Fail tests after 10s
teardownTimeout: 5000,   // Force cleanup after 5s
```

### Issue: Flaky Tests in CI but Not Locally

**Symptom**: Tests pass locally, fail in CI

**Causes**:

1. Different `maxForks` causing race conditions
2. Shared state between tests (need `isolate: true`)
3. Timing-dependent tests

**Solution**:

```typescript
isolate: true,           // Ensure isolation
fileParallelism: false,  // Run sequentially if needed
```

### Issue: Out of Memory Errors

**Symptom**: `JavaScript heap out of memory`

**Causes**:

1. Too many concurrent test files
2. Memory leaks in tests
3. Large fixtures or mocks

**Solution**:

```bash
# Increase Node.js memory limit
NODE_OPTIONS='--max-old-space-size=8192' npm test

# Or reduce concurrent files
maxForks: 2  # In vitest.config.ts
```

## Migration Guide

### From Threads to Forks

```typescript
// Before
{
  pool: 'threads',
  poolOptions: {
    threads: {
      maxThreads: 2,
      minThreads: 1,
    },
  },
}

// After
{
  pool: 'forks',
  poolOptions: {
    forks: {
      maxForks: process.env.CI ? 8 : 4,
      minForks: 1,
    },
  },
}
```

### Adding Test Sections

1. Identify logical feature boundaries
2. Add npm scripts for each section
3. Update CI/CD pipeline to use sections
4. Document in project README

### Vitest 3.2+ Workspace to Projects

```typescript
// Old: vitest.workspace.ts (deprecated)
export default defineWorkspace([...])

// New: vitest.config.ts with projects
export default defineConfig({
  projects: [
    { test: { name: 'unit', include: ['src/**/*.test.ts'] } },
    { test: { name: 'e2e', include: ['e2e/**/*.test.ts'] } },
  ],
})
```

**Reference**: [Workspace → Projects Migration](https://vitest.dev/guide/projects)

## Key Takeaways

1. **Use `pool: 'forks'`** - More stable than threads for large test suites
2. **Adaptive Configuration** - 4 forks (laptop), 8+ forks (CI/CD)
3. **Section Your Tests** - Don't force developers to run all 100+ files
4. **Shard for CI/CD** - Parallel execution across multiple runners
5. **Profile and Optimize** - Use Vitest's profiling tools to find bottlenecks

## Additional Resources

### Official Documentation

- [Vitest Configuration](https://vitest.dev/config/)
- [Improving Performance](https://vitest.dev/guide/improving-performance)
- [Parallelism Guide](https://vitest.dev/guide/parallelism)
- [Test Projects](https://vitest.dev/guide/projects)
- [Profiling Tests](https://vitest.dev/guide/profiling-test-performance)

### Community Resources

- [Optimize Thread Usage in Vitest for CI/CD](https://willmendesneto.com/posts/optimize-thread-usage-in-vitest-for-ci-cd-environments/)
- [How to Speed Up Vitest](https://buildpulse.io/blog/how-to-speed-up-vitest)
- [Improving Vitest Performance](https://dev.to/thejaredwilcurt/improving-vitest-performance-42c6)
- [Vitest vs Jest Performance](https://github.com/vitest-dev/vitest/issues/579)

### GitHub Discussions

- [Why is pool: 'forks' not default?](https://github.com/vitest-dev/vitest/discussions/4914)
- [maxConcurrency vs maxThreads](https://github.com/vitest-dev/vitest/discussions/4356)
- [Manual Shard Configuration](https://github.com/vitest-dev/vitest/discussions/5480)

## Changelog

### December 2024 - Initial Optimization

- Migrated from `threads` to `forks` pool
- Implemented adaptive fork configuration (4 local, 8 CI)
- Created sectioned test scripts for feature areas
- Added sharding support for CI/CD parallelization
- **Result**: 97%+ reduction in resource usage, stable test execution

---

**Last Updated**: December 6, 2024
**Applies To**: Vitest 3.2+, Node.js 20+
**Maintained By**: Chariot Platform Team
