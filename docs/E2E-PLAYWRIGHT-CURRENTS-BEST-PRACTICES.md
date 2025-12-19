# Playwright E2E Testing with GitHub Actions & Currents.dev

Best practices for configuring Playwright E2E tests with GitHub Actions CI and Currents.dev orchestration.

## Table of Contents

- [Overview](#overview)
- [Playwright Configuration](#playwright-configuration)
- [Currents.dev Integration](#currentsdev-integration)
- [GitHub Actions Workflow](#github-actions-workflow)
- [Parallelization Strategies](#parallelization-strategies)
- [Fixtures & Authentication](#fixtures--authentication)
- [Reporting & Artifacts](#reporting--artifacts)
- [Common Issues & Solutions](#common-issues--solutions)
- [Performance Optimization](#performance-optimization)
- [Security Considerations](#security-considerations)
- [Sources](#sources)

---

## Overview

### What is Currents.dev?

[Currents.dev](https://currents.dev) provides intelligent test orchestration and reporting for Playwright:

- **35-50% faster** execution through smart test distribution
- **Centralized dashboard** for debugging (one-click trace viewer)
- **Flaky test detection** with historical analytics
- **No manual sharding** - Currents distributes tests automatically

### Orchestration vs Native Sharding

| Aspect | Native Sharding | Currents Orchestration |
|--------|-----------------|------------------------|
| Test Distribution | Static matrix assignment | Dynamic, intelligent balancing |
| Performance | Baseline (100%) | Up to 40% faster |
| Runner Re-runs | Select "Re-run failed jobs" | Must select "Re-run all jobs" |
| Configuration | Matrix strategy in YAML | `pwc-p` command invocation |
| Load Balancing | Manual shard sizing | Automatic optimization |

---

## Playwright Configuration

### Recommended `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests',

  // Enable test-level parallelization for better shard distribution
  fullyParallel: true,

  // Prevent accidental .only commits in CI
  forbidOnly: !!process.env.CI,

  // Retry failed tests in CI (not locally)
  retries: process.env.CI ? 2 : 0,

  // Workers: GitHub Actions has 2 CPU cores
  // Use 2 workers per CI machine for optimal parallelization
  workers: process.env.CI ? 2 : undefined,

  // Reporter configuration
  // CI: blob for shard merging + list for logs
  // Local: HTML for interactive viewing
  reporter: process.env.CI
    ? [['blob'], ['list']]
    : [['html', { open: 'never' }], ['list']],

  timeout: 60000,

  expect: {
    timeout: 10000,
  },

  use: {
    // Support both HTTP (CI) and HTTPS (local)
    baseURL: process.env.BASE_URL || 'https://localhost:3000',

    // Capture traces on first retry for debugging
    trace: 'on-first-retry',

    // Screenshots and video only on failure to save resources
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Required for local HTTPS with self-signed certs
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

### Key Configuration Options

| Option | Recommended Value | Why |
|--------|-------------------|-----|
| `fullyParallel` | `true` | Enables test-level distribution across shards |
| `workers` | `2` in CI | GitHub Actions has 2 CPU cores |
| `retries` | `2` in CI, `0` locally | Handle flaky tests without masking bugs |
| `forbidOnly` | `true` in CI | Prevent accidental `.only` commits |
| `reporter` | `blob` in CI | Enables report merging across shards |

---

## Currents.dev Integration

### Installation

```bash
npm install -D @currents/playwright
```

Requires:
- Node.js 14.0.0+
- Playwright 1.22.2+
- For fixtures: @currents/playwright 1.7.0+

### Configuration File (`currents.config.ts`)

```typescript
import { CurrentsConfig } from '@currents/playwright';

const config: CurrentsConfig = {
  // Required: From Currents dashboard
  recordKey: process.env.CURRENTS_RECORD_KEY ?? '',
  projectId: process.env.CURRENTS_PROJECT_ID ?? '',

  // Required for CI: Coordinates parallel runs
  ciBuildId: process.env.CURRENTS_CI_BUILD_ID,

  // Optional: Tag runs for filtering in dashboard
  tag: process.env.GITHUB_REF_NAME
    ? [process.env.GITHUB_REF_NAME]
    : [],

  // Enable for debugging
  disableVideoUpload: false,
  disableCapturedOutput: false,

  // Optional: Cancel run after too many failures
  // cancelAfterFailures: 10,
};

export default config;
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CURRENTS_RECORD_KEY` | Yes | Secret key from Currents dashboard |
| `CURRENTS_PROJECT_ID` | Yes | Project ID from Currents dashboard |
| `CURRENTS_CI_BUILD_ID` | Yes (CI) | Unique build identifier |
| `GITHUB_REF_NAME` | No | Branch name for tagging |

### Commands

| Command | Purpose |
|---------|---------|
| `pwc` | Run with Currents reporter (uses native sharding) |
| `pwc-p` | Run with Currents orchestration (recommended) |

```bash
# Basic orchestration run
npx pwc-p --key <record-key> --project-id <id> --ci-build-id <build-id>

# With additional Playwright flags
npx pwc-p --key <key> --project-id <id> -- --workers 2 --grep smoke
```

### Fixtures Integration

For full Currents features (code coverage, actions), integrate fixtures:

```typescript
// src/fixtures/fixtures.ts
import { test as base } from '@playwright/test';
import {
  CurrentsFixtures,
  CurrentsWorkerFixtures,
  fixtures as currentsFixtures,
} from '@currents/playwright';

// Extend with Currents fixtures
const testWithCurrents = base.extend<
  CurrentsFixtures,
  CurrentsWorkerFixtures
>({
  ...currentsFixtures.baseFixtures,
});

// Then extend with your custom fixtures
export const test = testWithCurrents.extend<YourFixtures>({
  // Your fixtures here
});
```

---

## GitHub Actions Workflow

### Complete Workflow Example

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: read

jobs:
  # Filter to only run on relevant changes
  changes:
    runs-on: ubuntu-latest
    outputs:
      should-run: ${{ steps.filter.outputs.e2e-relevant }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            e2e-relevant:
              - 'ui/**'
              - 'e2e/**'

  # Run E2E tests with Currents orchestration
  e2e-tests:
    name: E2E Tests (Machine ${{ matrix.machine }})
    needs: changes
    if: needs.changes.outputs.should-run == 'true'
    runs-on: ubuntu-latest
    timeout-minutes: 30

    strategy:
      fail-fast: false
      matrix:
        # Currents automatically distributes tests across machines
        machine: [1, 2, 3]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: e2e/package-lock.json

      # Cache Playwright browsers
      - name: Cache Playwright browsers
        uses: actions/cache@v4
        id: playwright-cache
        with:
          path: ~/.cache/ms-playwright
          key: ${{ runner.os }}-playwright-${{ hashFiles('e2e/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-playwright-

      - name: Install dependencies
        run: npm ci
        working-directory: e2e

      - name: Install Playwright browsers
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps chromium
        working-directory: e2e

      - name: Install Playwright system dependencies
        if: steps.playwright-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps chromium
        working-directory: e2e

      # Build and serve your application
      - name: Build application
        run: npm run build
        working-directory: ui

      - name: Start preview server
        working-directory: ui
        run: |
          npx serve -s build -l 3000 &
          timeout 30 bash -c 'until curl -s http://localhost:3000 > /dev/null; do sleep 1; done'

      # Get failed tests from previous run (for re-run scenarios)
      - name: Get failed tests from previous run
        id: last-failed
        uses: currents-dev/playwright-last-failed@v1
        with:
          or8n: true
          pw-output-dir: test-results
          matrix-index: ${{ matrix.machine }}
          matrix-total: ${{ strategy.job-total }}

      # Run tests with Currents orchestration
      - name: Run E2E tests
        working-directory: e2e
        run: |
          npx pwc-p \
            --key "$CURRENTS_RECORD_KEY" \
            --project-id "$CURRENTS_PROJECT_ID" \
            --ci-build-id "${{ github.run_id }}-${{ github.run_attempt }}" \
            ${{ steps.last-failed.outputs.extra-pw-flags }}
        env:
          CURRENTS_RECORD_KEY: ${{ secrets.CURRENTS_RECORD_KEY }}
          CURRENTS_PROJECT_ID: ${{ secrets.CURRENTS_PROJECT_ID }}
          CURRENTS_CI_BUILD_ID: ${{ github.run_id }}-${{ github.run_attempt }}
          BASE_URL: http://localhost:3000
          CI: true

      # Upload blob report for merging
      - name: Upload blob report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: blob-report-${{ matrix.machine }}
          path: e2e/blob-report/
          retention-days: 7

      # Upload test results for debugging
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-results-${{ matrix.machine }}
          path: e2e/test-results/
          retention-days: 7

  # Merge reports from all shards
  merge-reports:
    name: Merge E2E Reports
    needs: [changes, e2e-tests]
    if: always() && needs.changes.outputs.should-run == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Playwright
        run: npm install -D @playwright/test

      - name: Download blob reports
        uses: actions/download-artifact@v4
        with:
          pattern: blob-report-*
          path: all-blob-reports
          merge-multiple: true

      - name: Merge reports
        run: npx playwright merge-reports --reporter html ./all-blob-reports

      - name: Upload merged HTML report
        uses: actions/upload-artifact@v4
        with:
          name: html-report-merged
          path: playwright-report/
          retention-days: 14
```

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `CURRENTS_RECORD_KEY` | Currents.dev record key |
| `CURRENTS_PROJECT_ID` | Currents.dev project ID |
| `E2E_TEST_USER_EMAIL` | Test user email |
| `E2E_TEST_USER_PASSWORD` | Test user password |
| `E2E_TEST_USER_MFA_SECRET` | TOTP secret (if MFA enabled) |

---

## Parallelization Strategies

### Native Playwright Sharding

Use when not using Currents:

```yaml
strategy:
  fail-fast: false
  matrix:
    shardIndex: [1, 2, 3, 4]
    shardTotal: [4]

# In test step:
run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
```

### Currents Orchestration (Recommended)

```yaml
strategy:
  fail-fast: false
  matrix:
    machine: [1, 2, 3]  # Just specify count

# Currents handles distribution automatically
run: npx pwc-p --key $KEY --project-id $ID --ci-build-id $BUILD_ID
```

### `fullyParallel` Impact

| Setting | Behavior | Best For |
|---------|----------|----------|
| `true` | Tests distributed individually | Even load distribution |
| `false` | Tests distributed by file | Files with dependencies |

**Recommendation**: Use `fullyParallel: true` for best shard balance.

---

## Fixtures & Authentication

### Global Setup Pattern

```typescript
// global-setup.ts
async function globalSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Perform login
  await page.goto('/login');
  await page.fill('#email', process.env.TEST_USER_EMAIL);
  await page.fill('#password', process.env.TEST_USER_PASSWORD);
  await page.click('button[type="submit"]');

  // Save storage state
  await context.storageState({ path: '.auth/user.json' });
  await browser.close();
}
```

### Storage State Reuse

```typescript
// playwright.config.ts
use: {
  storageState: '.auth/user.json',
}
```

### Multi-Machine Considerations

In sharded runs, each machine runs global setup independently. This is fine if:
- Credentials are passed via environment variables
- Login is idempotent (can run multiple times)

For slow logins, consider caching auth state as an artifact.

---

## Reporting & Artifacts

### Blob Reporter (CI)

The blob reporter captures comprehensive test data for merging:
- Test results and outcomes
- Traces and screenshots
- Video recordings
- Console output

```typescript
reporter: process.env.CI ? [['blob'], ['list']] : [['html']]
```

### Merging Reports

After all shards complete:

```bash
npx playwright merge-reports --reporter html ./all-blob-reports
```

### Artifact Retention

| Artifact | Retention | Purpose |
|----------|-----------|---------|
| Blob reports | 7 days | Report merging |
| HTML report | 14 days | Human review |
| Test results | 7 days | Debugging failures |

---

## Common Issues & Solutions

### Tests Pass Locally, Fail in CI

**Causes:**
- Resource constraints (2 CPU cores in GitHub Actions)
- Network timing differences
- Missing system dependencies

**Solutions:**
- Reduce workers: `workers: 2`
- Add explicit waits: `await page.waitForLoadState('networkidle')`
- Install system deps: `npx playwright install-deps chromium`

### Storage State Not Found

**Cause:** Each shard runs independently, can't share files.

**Solution:**
- Run global setup on each machine (idempotent login)
- Or cache auth state as artifact and download

### Timeout Errors

**Causes:**
- Slow CI environment
- Network latency
- Resource contention

**Solutions:**
```typescript
// Increase timeouts
timeout: 60000,
expect: { timeout: 10000 },

// Add navigation timeout
await page.goto('/', { timeout: 30000 });
```

### Preview Server HTTPS Issues

**Cause:** Vite preview doesn't serve HTTPS by default.

**Solution:** Use HTTP in CI:
```yaml
- run: npx serve -s build -l 3000 &

env:
  BASE_URL: http://localhost:3000
```

### Flaky Tests

**Causes:**
- Race conditions
- Unstable selectors
- State contamination
- Network unpredictability

**Solutions:**
1. Use explicit waits instead of arbitrary timeouts
2. Use stable selectors (`data-testid`)
3. Ensure test isolation
4. Configure retries: `retries: process.env.CI ? 2 : 0`

---

## Performance Optimization

### Browser Caching

```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: ${{ runner.os }}-playwright-${{ hashFiles('package-lock.json') }}
```

### Conditional Browser Install

```yaml
- name: Install Playwright browsers
  if: steps.playwright-cache.outputs.cache-hit != 'true'
  run: npx playwright install --with-deps chromium

- name: Install system dependencies only
  if: steps.playwright-cache.outputs.cache-hit == 'true'
  run: npx playwright install-deps chromium
```

### Limit Failures

```typescript
// Stop early if too many failures
maxFailures: process.env.CI ? 10 : undefined,
```

### Worker Optimization

```typescript
// GitHub Actions: 2 CPU cores
// More workers = resource contention
workers: process.env.CI ? 2 : undefined,
```

---

## Security Considerations

### Secrets Management

- Never hardcode credentials
- Use GitHub Secrets for sensitive data
- Reference via environment variables

```yaml
env:
  CURRENTS_RECORD_KEY: ${{ secrets.CURRENTS_RECORD_KEY }}
```

### Artifact Security

Artifacts may contain sensitive data:
- User credentials in traces
- Access tokens
- Application source code

**Best Practices:**
- Set appropriate retention periods
- Don't upload artifacts from forked PRs (they can't access secrets anyway)
- Consider encrypting sensitive artifacts

### Forked PRs

Workflows from forked PRs don't have access to secrets:
- Artifact upload steps may fail
- Consider skip conditions for forks

---

## Sources

### Official Documentation
- [Playwright CI Setup](https://playwright.dev/docs/ci-intro)
- [Playwright Sharding](https://playwright.dev/docs/test-sharding)
- [Playwright Parallelism](https://playwright.dev/docs/test-parallel)

### Currents.dev Documentation
- [Currents GitHub Actions](https://docs.currents.dev/getting-started/ci-setup/github-actions/playwright-github-actions)
- [Currents Orchestration](https://docs.currents.dev/guides/ci-optimization/playwright-orchestration)
- [Currents Configuration](https://docs.currents.dev/resources/reporters/currents-playwright/configuration)
- [Currents Fixtures](https://docs.currents.dev/resources/reporters/currents-playwright/playwright-fixtures)

### Community Resources
- [Currents Demo Repository](https://github.com/currents-dev/playwright-gh-actions-demo)
- [Avoiding Flaky Tests](https://betterstack.com/community/guides/testing/avoid-flaky-playwright-tests/)
- [Playwright Storage State Issues](https://github.com/microsoft/playwright/issues/27012)

---

## Chariot Implementation

Our implementation can be found in:
- `modules/chariot/ui/e2e/playwright.config.ts`
- `modules/chariot/ui/e2e/currents.config.ts`
- `modules/chariot/.github/workflows/e2e-tests.yml`
- `modules/chariot/ui/e2e/src/fixtures/fixtures.ts`

Last updated: December 2024
