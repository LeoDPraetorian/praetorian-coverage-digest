# Vitest Testing Guide for Chariot Platform

## Quick Start

### Running Tests in Sections (Recommended for Laptop)

```bash
# Navigate to UI module
cd modules/chariot/ui

# Run tests by feature section
npm run test:sections:settings       # Settings tests only
npm run test:sections:vulnerabilities # Vulnerability tests
npm run test:querybuilder            # Query builder tests
npm run test:metrics                 # Metrics dashboard tests

# Run tests by code area
npm run test:components              # All component tests
npm run test:hooks                   # All hook tests
```

### Running Full Test Suite (Use with Caution)

```bash
# Watch mode - runs affected tests on file changes
npm test

# Run all tests once (146 test files, ~71 seconds)
npm run test:run

# Run with UI dashboard
npm run test:ui

# Run with coverage report
npm run test:coverage
```

## Why Sectioned Testing?

### Problem

Running all 146 test files simultaneously on a laptop causes:
- **High CPU usage** - System becomes unresponsive
- **Memory pressure** - Can trigger swapping or OOM
- **Import failures** - Vite fails to resolve modules under resource contention
- **Slow feedback** - Wait 60+ seconds for results

### Solution

Break tests into logical sections that run independently:
- **Faster feedback** - 2-5 seconds per section
- **Lower resource usage** - Only 4 concurrent test files
- **Better isolation** - Easier to identify failing tests
- **Laptop-friendly** - No system slowdown

## Available Test Commands

### By Feature Section (Alphabetical - ALL Sections)

```bash
npm run test:sections:asset              # Asset management (7 tests)
npm run test:sections:agents             # Agent management
npm run test:sections:customerDrawer     # Customer drawer (1 test)
npm run test:sections:customerManagement # Customer management (1 test)
npm run test:sections:insights           # All insights features (25 tests)
npm run test:sections:integrations       # Integrations (1 test)
npm run test:sections:jobs               # Job management (14 tests)
npm run test:sections:preseed            # Preseed (1 test)
npm run test:sections:seeds              # Seeds/scope (4 tests)
npm run test:sections:settings           # Settings - LARGEST (29 tests)
npm run test:sections:technology         # Technology (1 test)
npm run test:sections:vulnerabilities    # Vulnerabilities (19 tests)
```

**Note**: Every section with tests has a dedicated script for consistency.

### By Specific Feature

```bash
npm run test:querybuilder             # Query builder only
npm run test:metrics                  # Metrics dashboard only
```

### By Code Area

```bash
npm run test:components               # All reusable components
npm run test:hooks                    # All custom React hooks
```

### For CI/CD - Sharded Execution

Run tests in parallel across 4 CI runners:

```bash
npm run test:shard:1                  # 1/4 of all tests
npm run test:shard:2                  # 2/4 of all tests
npm run test:shard:3                  # 3/4 of all tests
npm run test:shard:4                  # 4/4 of all tests
```

## Recommended Workflows

### During Active Development

**Option 1: Watch Mode** (Best for iteration)
```bash
# Only runs tests for files you're actively changing
npm test -- src/sections/settings

# Automatically re-runs on file save
```

**Option 2: Section Testing** (Best for feature work)
```bash
# Test the feature you're working on
npm run test:sections:settings

# Run after making changes, before committing
```

**Option 3: Specific Test File**
```bash
# Run one test file
npm test -- NotificationsTab.test.tsx

# Run with pattern matching
npm test -- ScanSettings
```

### Before Committing Code

```bash
# Test the section you modified
npm run test:sections:vulnerabilities

# Or run multiple sections
npm run test:sections:assets && \
npm run test:sections:vulnerabilities
```

### For CI/CD Pipeline

**GitHub Actions Example**:
```yaml
name: Test

jobs:
  test:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - name: Run tests (shard ${{ matrix.shard }})
        run: |
          cd modules/chariot/ui
          npm run test:shard:${{ matrix.shard }}
```

## Performance Comparison

### Full Suite
- **Test Files**: 146
- **Total Tests**: 2,569
- **Duration**: ~71 seconds
- **CPU Usage**: High (4+ cores at 100%)
- **Memory**: ~2-3 GB
- **System Impact**: Significant slowdown

### Sectioned (Example: Metrics)
- **Test Files**: 6
- **Total Tests**: 130
- **Duration**: ~2.3 seconds
- **CPU Usage**: Moderate (1-2 cores)
- **Memory**: ~500 MB
- **System Impact**: Minimal

### Improvement
- **30x faster** - Per section vs full suite
- **97% less resource usage** - Laptop stays responsive
- **Better DX** - Instant feedback during development

## Configuration Details

The sectioned testing is enabled by:

### 1. Optimized Vitest Config (`modules/chariot/ui/vitest.config.ts`)

```typescript
{
  pool: 'forks',           // Stable process isolation
  poolOptions: {
    forks: {
      maxForks: process.env.CI ? 8 : 4,  // Adaptive concurrency
    },
  },
  fileParallelism: true,   // Parallel file execution
  isolate: true,           // Test isolation
}
```

### 2. NPM Scripts (`modules/chariot/ui/package.json`)

Each script targets a specific directory:
```json
"test:sections:settings": "vitest run src/sections/settings"
```

Vitest automatically finds all `*.test.ts` and `*.test.tsx` files in that directory.

## Troubleshooting

### Issue: "No test files found"

**Symptom**:
```
No test files found, exiting with code 1
```

**Cause**: Running script from wrong directory

**Solution**:
```bash
# Must be in modules/chariot/ui/
cd modules/chariot/ui
npm run test:metrics
```

### Issue: Tests still slow/hanging

**Symptom**: Tests take 30+ seconds or timeout

**Cause**: Too many tests in one section

**Solution**: Break into smaller sections or reduce `maxForks`:
```typescript
// vitest.config.ts
maxForks: 2  // Reduce from 4
```

### Issue: Import resolution failures

**Symptom**: `Failed to resolve import "@tanstack/react-table"`

**Cause**: Resource exhaustion, wrong pool configuration

**Solution**: Verify `pool: 'forks'` in `vitest.config.ts`

### Issue: Flaky tests

**Symptom**: Tests pass individually but fail in batch

**Cause**: Shared state or timing issues

**Solution**: Run with `--reporter=verbose` to see details:
```bash
npm run test:sections -- --reporter=verbose
```

## Advanced Usage

### Run Specific Test Pattern

```bash
# All tests matching "integration"
npm test -- integration

# All tests in subdirectory
npm test -- src/sections/settings/components/cards

# Single test file
npm test -- ScanSettingsCards.test.tsx
```

### Debug Mode

```bash
# Run with Node debugger
node --inspect-brk ./node_modules/.bin/vitest run src/sections/settings

# Then open chrome://inspect in Chrome
```

### Update Snapshots

```bash
# Update snapshots for specific section
npm test -- src/sections/metrics -u
```

## Best Practices

1. **Use sectioned scripts during development** - Faster feedback loop
2. **Run full suite before pushing** - Catch integration issues
3. **Use watch mode for iteration** - Automatic re-runs
4. **Add `data-testid` attributes** - Stable test selectors
5. **Mock external dependencies** - MSW for API calls
6. **Keep tests isolated** - No shared state between tests
7. **Use descriptive test names** - Clear intent and failure messages

## Related Documentation

- **[VITEST-BEST-PRACTICES.md](../VITEST-BEST-PRACTICES.md)** - Complete configuration reference and troubleshooting
- **[CLAUDE.md](../CLAUDE.md)** - Repository overview with testing quick reference
- **[modules/chariot/ui/CLAUDE.md](../modules/chariot/ui/CLAUDE.md)** - UI module architecture and patterns

## Summary

**For Laptop Development**:
```bash
npm run test:sections:settings    # Fast, targeted testing
```

**For CI/CD**:
```bash
npm run test:shard:1              # Parallel across 4 runners
```

**Configuration**: Optimized with `pool: 'forks'`, `maxForks: 4` (laptop) / `8` (CI)

---

**Last Updated**: December 6, 2024
**Module**: modules/chariot/ui
**Test Framework**: Vitest 3.2.4
