# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Location Context

You are in `/modules/chariot/e2e/src/tests/` - the test specification directory of the Chariot E2E testing suite. For complete E2E setup and configuration, see `../../CLAUDE.md`.

## Running Tests from This Directory

```bash
# From this directory, navigate to e2e root first
cd ../..

# Run specific test file
npx playwright test --project chromium -- src/tests/attack/index.spec.ts
npx playwright test --project chromium -- src/tests/auth/login.spec.ts

# Run with debugging
npx playwright test --project chromium --debug -- src/tests/<path-to-test>

# Run in headed mode
npx playwright test --project chromium --headed -- src/tests/<path-to-test>
```

## Test Structure

Tests are organized by feature domain:
- `attack/` - Attack path creation, editing, deletion
- `auth/` - Authentication and login flows
- `assets/` - Asset management operations
- `capabilities/` - Security capability tests
- `settings/` - Platform settings and configuration
- `users/` - User management workflows
- `global-setup/` - Initial test environment setup

## Writing Tests

### Fixture-Based Pattern

All tests use custom fixtures from `src/fixtures/index.ts`:

```typescript
import { user_tests } from 'src/fixtures';

user_tests.TEST_USER_1.describe('Feature name', () => {
  user_tests.TEST_USER_1('test description', async ({ page, components, steps }) => {
    // page - Pre-authenticated Playwright page
    // components - Reusable UI component helpers
    // steps - Domain-specific page objects
  });
});
```

### Available User Fixtures

- `user_tests.TEST_USER_1` - Primary test user (most tests use this)
- `user_tests.TEST_USER_2` - Secondary test user
- `user_tests.LONG_TERM_USER` - Stable long-term account
- `user_tests.TEST_USER_MFA` - MFA-enabled user

### Component Helpers (`components`)

Access via `components` fixture for common UI interactions:

```typescript
await components.navigation.goTo('Assets');
await components.filters.searchFor('example.com');
await components.filters.applyFilter('Status', ['Active']);
await components.table.verifyRowsMinCount(1);
await components.toast.verifyMessage('Success');
await components.modal.close();
await components.drawer.open();
```

Available components: `advanceExport`, `drawer`, `dropdown`, `filters`, `modal`, `navigation`, `notes`, `sortableColumn`, `table`, `tag`, `timeline`, `toast`

### Page Objects (`steps`)

Access via `steps` fixture for domain-specific workflows:

```typescript
await steps.assetPage.goto();
await steps.settingsPage.toggleCyberThreatIntel();
await steps.userPage.addUser('user@example.com');
await steps.jobPage.verifyJobStatus('completed');
await steps.seedPage.createSeed('example.com');
```

Available pages: `agentsPage`, `assetPage`, `integrationPage`, `jobPage`, `loginPage`, `metricsPage`, `seedPage`, `settingsPage`, `technologyPage`, `threatIntelPage`, `userPage`, `vulnerabilityPage`

## Test Development Best Practices

### Selector Strategy
1. Use `data-testid` attributes (preferred)
2. Use `getByRole()` for semantic elements
3. Use `getByText()` for unique text content
4. Avoid brittle CSS selectors or complex xpath

### Async Operations
- Use `waitForAllLoader(page)` after navigation/actions
- Rely on Playwright's auto-waiting
- Only add explicit waits when necessary

### Test Organization
```typescript
// Group related tests with describe
user_tests.TEST_USER_1.describe('Attack paths', () => {
  user_tests.TEST_USER_1('Create attack path', async ({ page }) => {
    // Single responsibility - only test creation
  });

  user_tests.TEST_USER_1('Delete attack path', async ({ page }) => {
    // Single responsibility - only test deletion
  });
});

// Use .serial for dependent tests
user_tests.TEST_USER_1.describe.serial('Sequential workflow', () => {
  // Tests run in order, not parallel
});
```

### Import Paths
Always use absolute imports from `src/`:
```typescript
✅ import { user_tests } from 'src/fixtures';
✅ import { waitForAllLoader } from 'src/helpers/loader';
❌ import { user_tests } from '../../fixtures';
```

## Common Patterns in Existing Tests

### Attack Path Tests (`attack/`)
- Create/edit/delete attack paths
- Copy-paste attack path JSON
- Verify attack path visualization
- Test asset and technique connections

### Settings Tests (`settings/`)
- API key management
- Password reset workflows
- Reporting configuration
- Integration toggles

### Asset Tests (`assets/`)
- Asset search and filtering
- Asset detail verification
- Status and attribute updates

### Authentication Tests (`auth/`)
- Login flows
- MFA verification
- Session management
- Password resets

## Debugging Tips

### When Tests Fail
1. Check HTML report: `cd ../.. && npm run report`
2. View traces in `test-results/` directory
3. Watch videos of test execution
4. Use `--debug` flag to step through test

### Adding Debug Information
```typescript
// Log to console
console.log('Debug info:', await element.textContent());

// Take screenshots
await page.screenshot({ path: 'debug.png' });

// Add explicit waits when debugging timing issues
await page.waitForTimeout(1000); // Remove after debugging
```

## Test Data Management

Test data should be stored in:
- `src/data.ts` - Shared test data fixtures
- `src/data/` - Structured test datasets
- Individual test files - Only test-specific constants

Example:
```typescript
import { testAssets, testUsers } from 'src/data';

user_tests.TEST_USER_1('test', async ({ page }) => {
  const asset = testAssets.exampleDomain;
  // Use shared test data
});
```

## Adding New Tests

1. Identify feature domain (or create new directory)
2. Create `<feature>.spec.ts` file (must end with `.spec.ts`)
3. Use appropriate user fixture (`TEST_USER_1` most common)
4. Leverage `components` and `steps` fixtures
5. Add `data-testid` attributes to UI components if needed
6. Write single-responsibility tests with clear descriptions

## CI/CD Considerations

Tests run in CI with:
- `process.env.CI` set to true
- Headless browser mode
- 10 parallel workers
- 1 automatic retry
- Full trace/video/screenshot capture
