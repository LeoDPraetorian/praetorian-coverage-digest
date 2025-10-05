# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **E2E testing suite** for the Chariot platform, built on Playwright. Tests validate core functionality across UAT and Production environments using stable, long-term test accounts managed in 1Password.

## Essential Commands

### Setup and Environment Configuration

```bash
# Initial setup (interactive environment selection)
npm run setup                           # Configure test environment and credentials
npx ts-node script/setup-test.ts --env=local-uat  # Setup for specific environment

# Environment options: prod, uat, local-uat, local-prod, local-be
npm run setup:local-uat                 # Setup local-uat environment specifically
```

### Running Tests

```bash
# Full test execution (setup + run)
npm test                                # Run all tests with auto-setup
npm run test:local-uat                  # Test against local UAT backend
npm run test:prod                       # Test against production
npm run test:uat                        # Test against UAT

# Direct test execution (setup already done)
npm start                               # Run all tests (Chromium only)
npm start -- --headed                   # Run tests in headed mode
npm start -- --debug                    # Debug tests with Playwright Inspector

# Run specific tests
npx playwright test --project chromium -- src/tests/attack/attack-paths-import.spec.ts
npm start -- --grep "login"             # Run tests matching pattern
npm start -- --workers=4                # Run with specific worker count

# AI-powered tests only
npm start:ai                            # Run tests tagged for AI generation
```

### Test Development

```bash
# Test generation and development
npm run dev:setup                       # Prepare for codegen (disables global setup)
npm run dev                             # Launch Playwright codegen with authentication
npm run auto-generate-tests             # Auto-generate tests via Claude AI

# View test results
npm run report                          # Open HTML report (kills port 9323 first)

# Cleanup
npm run reset                           # Remove .env, output/, and test-results/
npm run kill                            # Kill all ports except 3000
```

### Linting

```bash
npx eslint src/                         # Lint all source files
npx eslint --fix src/                   # Auto-fix linting issues
```

## Architecture

### Test Structure

```
e2e/
├── src/
│   ├── fixtures/           # Custom Playwright fixtures with user contexts
│   ├── pages/              # Page Object Models (POM)
│   │   ├── components/     # Reusable UI components (table, filters, toast, etc.)
│   │   └── *.page.ts       # Domain-specific page objects
│   ├── tests/              # Test specs organized by feature
│   │   ├── attack/
│   │   ├── capabilities/
│   │   ├── settings/
│   │   └── *.spec.ts       # All test files must use .spec.ts extension
│   ├── helpers/            # Utility functions (loaders, status, console)
│   ├── data/               # Test data and fixtures
│   ├── utils/              # Generic utilities
│   ├── global-setup.ts     # Pre-test initialization (login, API setup)
│   ├── global-teardown.ts  # Post-test cleanup
│   ├── constant.ts         # Environment configuration constants
│   └── type.ts             # TypeScript type definitions
├── script/
│   ├── setup-test.ts       # Environment setup and keychain configuration
│   ├── auto-generate-tests.ts  # AI-powered test generation
│   └── codegen-auth.ts     # Authenticated Playwright codegen
└── playwright.config.ts    # Playwright configuration
```

### Custom Fixtures System

The test suite uses custom fixtures that extend Playwright's base test with pre-configured user contexts and helper utilities:

**Available Test Fixtures** (`user_tests` from `src/fixtures/index.ts`):
- `user_tests.TEST_USER_1` - Primary test user with full setup
- `user_tests.TEST_USER_2` - Secondary test user
- `user_tests.LONG_TERM_USER` - Stable long-term account
- `user_tests.TEST_USER_MFA` - MFA-enabled user (no storage state)

**Built-in Fixture Properties**:
- `page` - Auto-navigated and authenticated Playwright Page
- `steps` - Access to all page objects via `StepsPage`
- `components` - Access to reusable UI components via `ComponentsPage`

**Example Test Structure**:
```typescript
import { user_tests } from 'src/fixtures';

user_tests.TEST_USER_1.describe('Feature name', () => {
  user_tests.TEST_USER_1('test description', async ({ page, components, steps }) => {
    // Use components for reusable UI interactions
    await components.filters.searchFor('example.com');
    await components.table.verifyRowsMinCount(1);
    await components.navigation.goTo('Assets');
    await components.toast.verifyMessage('Success');
    
    // Use steps for page-specific workflows
    await steps.assetPage.goto();
    await steps.settingsPage.toggleCyberThreatIntel();
  });
});
```

### Page Object Model (POM) Architecture

**Component-Based Design** (`src/pages/components/`):
- `table.ts` - Table operations (row counts, cell verification, sorting)
- `filters.ts` - Search and filter interactions
- `toast.ts` - Toast notification assertions
- `navigation.ts` - Navigation menu interactions
- `drawer.ts` - Drawer/modal operations
- `sortableColumn.ts` - Column sorting utilities
- `advanceExport.ts` - Export functionality
- `modal.ts` - Modal dialog interactions
- `dropdown.ts` - Dropdown menu operations
- `notes.ts` - Note-taking components
- `tag.ts` - Tag management
- `timeline.ts` - Timeline component interactions

**Domain-Specific Pages** (`src/pages/*.page.ts`):
- Page objects for specific features (assets, jobs, seeds, users, settings, etc.)
- Each extends base Page with domain-specific methods
- All pages accessible via `steps` fixture

### Environment Configuration

**Configuration Sources**:
1. **Keychain file** (`~/.praetorian/keychain.ini`): Environment-specific credentials from 1Password
2. **.env file** (generated): Runtime configuration populated by `setup-test.ts`
3. **playwright.config.ts**: Base URL detection (localhost:3000 or UAT fallback)

**Environment Variables** (`src/constant.ts`):
- `BASE_URL` - Frontend URL (auto-detected or configured)
- `api` - Backend API endpoint
- `client_id` / `user_pool_id` - AWS Cognito configuration
- `USERS` - Test user credentials (JSON-encoded)
- `OPENAI_API_KEY` - For AI-powered test generation
- `PLEXTRAC_USERNAME` / `PLEXTRAC_PASSWORD` - PlexTrac integration

### Global Setup Flow

**Pre-test Initialization** (`src/global-setup.ts` → `src/tests/global-setup/initialSetup.ts`):
1. Load environment configuration from `.env`
2. Launch headless browser
3. Login all configured test users and save storage states
4. Perform API-based data setup for TEST_USER_1
5. Store initialization status for test validation

**Global Teardown** (`src/global-teardown.ts`):
- Conditionally runs based on test failures
- Disabled when `disableGlobalTeardown=true`

### Test Data Management

**Shared Test Environment**:
- Uses stable, long-term accounts (no per-run data injection)
- All account details managed in 1Password: "Regression Test Setup E2E (UAT and Prod)"
- `src/data.ts` contains test data fixtures
- `src/data/` directory for structured test datasets

## Playwright Configuration

**Key Settings** (`playwright.config.ts`):
- **Workers**: 10 parallel workers
- **Retries**: 1 automatic retry per test
- **Timeout**: 5 minutes per test
- **Expect Timeout**: 30 seconds for assertions
- **Headless**: true by default
- **Test ID Attribute**: `data-testid`
- **Trace/Video/Screenshot**: Always enabled for debugging
- **Viewport**: 1920x1080
- **Browser**: Chromium only (default project)

**Reporters**:
- HTML report (output/report/)
- List reporter (console)
- CTRF JSON reporter (for CI/CD integration)
- Currents reporter (when CURRENTS_PROJECT_ID configured)

## AI-Powered Test Generation

**Auto-generation Script** (`script/auto-generate-tests.ts`):
- Uses Claude AI to generate tests by discovering application routes
- Reads `playwright-codegen-transform.md` for test transformation rules
- Requires `OPENAI_API_KEY` environment variable
- Command: `npm run auto-generate-tests`

**AI Test Identification**:
- Tests tagged with `AI_ONLY=true` can be filtered via environment variable
- Run AI-generated tests only: `npm start:ai`

## Development Workflow

### Writing New Tests

1. **Setup environment**: `npm run setup:local-uat`
2. **Use fixtures**: Import `user_tests` from `src/fixtures`
3. **Follow POM pattern**: Use existing page objects or create new ones
4. **Test file naming**: Must end with `.spec.ts`
5. **Use data-testid**: Prefer `data-testid` attributes for selectors
6. **Import helpers**: Use `waitForAllLoader()` for async operations

### Running Single Test During Development

```bash
# Specific test file
npx playwright test --project chromium -- src/tests/attack/attack-paths-import.spec.ts

# With debugging
npx playwright test --project chromium --debug -- src/tests/attack/attack-paths-import.spec.ts

# With headed browser
npx playwright test --project chromium --headed -- src/tests/attack/attack-paths-import.spec.ts
```

### Using Codegen for Test Development

```bash
npm run dev:setup    # Run once to set up global state
npm run dev          # Launch authenticated Playwright codegen
```

This opens Playwright Inspector with pre-authenticated session, allowing you to record interactions.

## Testing Best Practices

### Selector Strategy
1. **Prefer**: `data-testid` attributes
2. **Fallback**: Stable CSS selectors or text content
3. **Avoid**: Complex xpath or brittle selectors

### Test Organization
- Group related tests with `user_tests.TEST_USER_1.describe()`
- One assertion/workflow per test (single responsibility)
- Use descriptive test names that explain the workflow
- Keep test files under 200 lines when possible

### Async Operations
- Always use `waitForAllLoader(page)` after navigation/interactions
- Leverage Playwright's auto-waiting (don't add manual waits unless necessary)
- Use `expect` with timeout options for flaky elements

### Component Reuse
- Use `components` fixture for common UI patterns (tables, filters, toasts)
- Create new component classes in `src/pages/components/` for reusable patterns
- Page objects should encapsulate domain-specific workflows

### Data Management
- Store test data in `src/data.ts` or `src/data/` directory
- Don't hardcode test data in spec files
- Use data fixtures for consistent test scenarios

## Import Path Configuration

The project uses **absolute imports** with `src` as the base path:
- ✅ `import { user_tests } from 'src/fixtures';`
- ✅ `import { waitForAllLoader } from 'src/helpers/loader';`
- ❌ `import { user_tests } from '../../fixtures';` (relative imports not allowed)

ESLint enforces this via `no-relative-import-paths` rule.

## Debugging Failed Tests

1. **View HTML report**: `npm run report`
2. **Check traces**: Playwright captures full traces in `test-results/`
3. **Watch videos**: Video recordings available in `test-results/`
4. **Screenshots**: On-failure screenshots in `test-results/`
5. **Debug mode**: `npm start -- --debug` for step-by-step execution
6. **Headed mode**: `npm start -- --headed` to watch browser execution

## CI/CD Integration

**Test Failure Tracking**:
- `src/helpers/status.ts` tracks test failures for conditional teardown
- Tests set `test_failed` flag on failure after all retries
- Use `check-test-failures.js` for CI reporting

**Environment Detection**:
- `ENV.DEBUG` is false in CI environments (when `process.env.CI` is set)
- Adjust behaviors based on `ENV.DEBUG` flag

## Prerequisites for Development

1. **AWS CLI**: Configure with `aws configure` (playground environment)
2. **1Password**: Access to "Regression Test Setup E2E (UAT and Prod)" entry
3. **Node.js**: Install dependencies with `npm install`
4. **Playwright**: Install browsers with `npx playwright install`
5. **OpenAI API Key**: Required for AI-powered features (optional)

## Common Issues

**Keychain not found**: Run `npm run setup` and paste keychain content from 1Password
**Tests fail immediately**: Verify `.env` file exists and contains valid credentials
**localhost:3000 not detected**: Ensure Chariot UI is running or setup will use UAT
**Global setup errors**: Check `test_user_initialized` status in global setup logs
