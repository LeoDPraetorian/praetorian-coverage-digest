# Chariot E2E Infrastructure Integration

**Leverage Chariot's existing E2E test infrastructure for security testing.**

## Overview

Chariot has a mature E2E testing infrastructure in `modules/chariot/ui/e2e/` with established patterns for authentication, MFA handling, Page Object Models, and test organization. This reference shows how to integrate security tests with these existing patterns.

## Directory Structure

```
modules/chariot/ui/e2e/
├── src/
│   ├── tests/                    # Test specifications
│   │   ├── auth/                # Authentication tests
│   │   │   └── post-auth-redirect.spec.ts
│   │   ├── security/            # Security-specific tests (add here)
│   │   │   ├── xss-prevention.spec.ts
│   │   │   ├── authentication-flows.spec.ts
│   │   │   ├── authorization-boundaries.spec.ts
│   │   │   └── csrf-protection.spec.ts
│   │   ├── assets/              # Asset management tests
│   │   ├── vulnerabilities/     # Vulnerability tests
│   │   └── settings/            # Settings tests
│   ├── fixtures/                # Test fixtures
│   │   ├── fixtures.ts          # Main fixture extensions
│   │   └── security-payloads.ts # Malicious payloads (add)
│   ├── pages/                   # Page Object Models
│   │   └── SecurityTestPage.ts  # Security test helpers (add)
│   └── helpers/                 # Test utilities
├── playwright.config.ts         # Playwright configuration
└── .env                         # Environment variables
```

## Authentication Fixtures

### Chariot's Authentication Pattern

Chariot uses a comprehensive authentication system with MFA support:

```typescript
// Existing pattern from modules/chariot/ui/e2e/src/tests/auth/post-auth-redirect.spec.ts

/**
 * Get test credentials from environment
 */
function getTestCredentials() {
  const email = process.env.TEST_USER_1_EMAIL;
  const password = process.env.TEST_USER_1_PASSWORD;
  const totpSecret = process.env.TEST_USER_1_TOTP_SECRET;

  if (!email || !password) {
    throw new Error(
      "Test credentials not configured.\n\n" +
        "Please set up your credentials in e2e/.env:\n" +
        "  TEST_USER_1_EMAIL=your-test-email@example.com\n" +
        "  TEST_USER_1_PASSWORD=your-password\n" +
        "  TEST_USER_1_TOTP_SECRET=your-totp-secret (if MFA enabled)\n\n" +
        "See e2e/.env.example for details."
    );
  }

  return { email, password, totpSecret };
}

/**
 * Generate TOTP code from secret
 */
async function generateTOTP(secret: string): Promise<string> {
  const { TOTP } = await import("otpauth");
  const totp = new TOTP({
    issuer: "Chariot",
    label: "E2E Test",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: secret,
  });
  return totp.generate();
}

/**
 * Perform login with email and password, handling MFA if required
 */
async function performLogin(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
  totpSecret?: string
): Promise<void> {
  // Fill email
  const emailInput = page.getByLabel("Business Email Address");
  await emailInput.waitFor({ state: "visible", timeout: 10000 });
  await emailInput.clear();
  await emailInput.fill(email);

  // Fill password
  const passwordInput = page.getByLabel("Password");
  await passwordInput.clear();
  await passwordInput.fill(password);

  // Click Continue
  const submitButton = page.getByRole("button", { name: "Continue" });
  await submitButton.click();

  // Wait for response
  await page.waitForLoadState("networkidle", { timeout: 30000 });

  // Check for MFA modal
  const mfaHeading = page.locator("text=MFA Setup");
  let isMfaRequired = false;

  try {
    await mfaHeading.waitFor({ state: "visible", timeout: 5000 });
    isMfaRequired = true;
    console.log("MFA modal detected, handling TOTP...");
  } catch {
    // No MFA required
  }

  if (isMfaRequired) {
    if (!totpSecret) {
      throw new Error("MFA is required but TEST_USER_1_TOTP_SECRET is not configured in .env");
    }

    // Generate and enter TOTP code
    const totpCode = await generateTOTP(totpSecret);
    console.log("Entering TOTP code...");

    // Wait for modal to be interactive
    await page.waitForTimeout(500);

    // Find OTP inputs - they are typically 6 separate input boxes
    const otpInputs = page
      .locator("input:visible")
      .filter({ hasNot: page.locator('[type="email"], [type="password"]') });
    const inputCount = await otpInputs.count();

    if (inputCount >= 6) {
      // Fill each digit
      for (let i = 0; i < 6; i++) {
        await otpInputs.nth(i).fill(totpCode[i]);
        await page.waitForTimeout(50);
      }
    } else {
      // Fallback: type code directly
      await otpInputs.first().click();
      await page.keyboard.type(totpCode, { delay: 50 });
    }

    // Try to click Submit if available (may auto-submit)
    try {
      const mfaSubmit = page.getByRole("button", { name: /submit/i });
      await mfaSubmit.click({ timeout: 3000 });
    } catch {
      // Auto-submitted
    }

    await page.waitForLoadState("networkidle", { timeout: 30000 });
  }
}
```

### Using Authentication in Security Tests

```typescript
// tests/security/xss-prevention.spec.ts
import { test, expect } from "@playwright/test";
import { performLogin, getTestCredentials } from "../helpers/auth";

test.describe("XSS Prevention with Authentication", () => {
  // Use fresh browser context without storage state
  test.use({ storageState: { cookies: [], origins: [] } });

  test("prevents XSS in authenticated user profile", async ({ page }) => {
    const { email, password, totpSecret } = getTestCredentials();

    // Navigate to profile page (will redirect to login)
    await page.goto("/settings/profile");

    // Perform login with MFA
    await performLogin(page, email, password, totpSecret);

    // Now authenticated - test XSS in profile bio
    await page.fill('[data-testid="bio"]', '<script>alert("XSS")</script>');
    await page.click('[data-testid="save-profile"]');

    // Verify XSS did not execute
    const xssTriggered = await page.evaluate(() => window.xssTriggered);
    expect(xssTriggered).toBeUndefined();
  });
});
```

## Environment Configuration

### .env File Setup

```bash
# modules/chariot/ui/e2e/.env

# Test User Credentials
TEST_USER_1_EMAIL=test-user@praetorian.com
TEST_USER_1_PASSWORD=SecurePassword123!
TEST_USER_1_TOTP_SECRET=JBSWY3DPEHPK3PXP  # Base32 encoded secret for MFA

# Additional test users for authorization testing
TEST_USER_2_EMAIL=readonly-user@praetorian.com
TEST_USER_2_PASSWORD=SecurePassword456!

TEST_ADMIN_EMAIL=admin-user@praetorian.com
TEST_ADMIN_PASSWORD=AdminPassword789!
TEST_ADMIN_TOTP_SECRET=JBSWY3DPEHPK3PXQ

# Backend Configuration
VITE_API_URL=https://localhost:8080  # Local backend
# VITE_API_URL=https://api-uat.chariot.praetorian.com  # UAT backend
```

### Loading Environment Variables

```typescript
// At the top of test files
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
```

## Playwright Configuration

### Chariot's Configuration Pattern

```typescript
// playwright.config.ts (from modules/chariot/ui/e2e/)
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./src/tests",
  timeout: 60000, // 60 seconds per test (security tests may take longer)
  expect: {
    timeout: 5000,
  },
  fullyParallel: false, // Security tests should run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined, // Single worker in CI
  reporter: [["html"], ["list"], ["junit", { outputFile: "test-results/junit.xml" }]],
  use: {
    baseURL: "https://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-slow-mo",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          slowMo: 500, // Helpful for debugging security tests
        },
      },
    },
  ],
  // Run local dev server before tests
  webServer: {
    command: "npm start",
    url: "https://localhost:3000",
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
});
```

## Page Object Model Patterns

### Security Test Page Object

```typescript
// pages/SecurityTestPage.ts
import { Page, expect } from "@playwright/test";

export class SecurityTestPage {
  constructor(private page: Page) {}

  /**
   * Test XSS prevention in an input field
   */
  async testXSSPrevention(
    inputSelector: string,
    submitSelector: string,
    payload: string
  ): Promise<void> {
    // Fill input with XSS payload
    await this.page.fill(inputSelector, payload);
    await this.page.click(submitSelector);
    await this.page.waitForLoadState("networkidle");

    // Verify script did not execute
    const xssTriggered = await this.page.evaluate(() => window.xssTriggered);
    expect(xssTriggered).toBeUndefined();

    // Verify no script tags in DOM
    const scriptTags = await this.page.locator('script:has-text("alert")').count();
    expect(scriptTags).toBe(0);
  }

  /**
   * Test authorization boundary - attempt unauthorized access
   */
  async testUnauthorizedAccess(protectedRoute: string, expectedRedirect: string): Promise<void> {
    await this.page.goto(protectedRoute);
    await this.page.waitForLoadState("networkidle");

    // Should redirect to expected page (login or error)
    const currentUrl = this.page.url();
    expect(currentUrl).toContain(expectedRedirect);
  }

  /**
   * Test CSRF token presence
   */
  async verifyCsrfToken(formSelector: string): Promise<void> {
    const csrfToken = await this.page.locator(`${formSelector} [name="csrf_token"]`).inputValue();
    expect(csrfToken).toBeTruthy();
    expect(csrfToken.length).toBeGreaterThan(20);
  }

  /**
   * Monitor console for XSS execution
   */
  async monitorConsoleForXSS(): Promise<string[]> {
    const consoleErrors: string[] = [];

    this.page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("XSS")) {
        consoleErrors.push(msg.text());
      }
    });

    return consoleErrors;
  }
}
```

### Usage in Tests

```typescript
// tests/security/xss-prevention.spec.ts
import { test, expect } from "@playwright/test";
import { SecurityTestPage } from "../pages/SecurityTestPage";
import { XSS_PAYLOADS } from "../fixtures/security-payloads";

test.describe("XSS Prevention", () => {
  let securityPage: SecurityTestPage;

  test.beforeEach(async ({ page }) => {
    securityPage = new SecurityTestPage(page);
    await page.goto("/assets");
  });

  test("prevents XSS in search input", async ({ page }) => {
    await securityPage.testXSSPrevention(
      '[data-testid="search"]',
      '[data-testid="search-button"]',
      XSS_PAYLOADS.BASIC_SCRIPT
    );
  });
});
```

## Test Data Management

### Security Payload Fixtures

```typescript
// fixtures/security-payloads.ts
export const XSS_PAYLOADS = {
  BASIC_SCRIPT: '<script>alert("XSS")</script>',
  IMG_ONERROR: '<img src=x onerror=alert("XSS")>',
  SVG_SCRIPT: '<svg onload=alert("XSS")>',
  // ... more payloads from xss-testing-patterns.md
};

export const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "'; DROP TABLE users--",
  "1' UNION SELECT * FROM users--",
];

export const AUTHORIZATION_TEST_USERS = {
  REGULAR_USER: {
    email: process.env.TEST_USER_1_EMAIL!,
    password: process.env.TEST_USER_1_PASSWORD!,
    role: "user",
  },
  ADMIN_USER: {
    email: process.env.TEST_ADMIN_EMAIL!,
    password: process.env.TEST_ADMIN_PASSWORD!,
    role: "admin",
  },
  READONLY_USER: {
    email: process.env.TEST_USER_2_EMAIL!,
    password: process.env.TEST_USER_2_PASSWORD!,
    role: "readonly",
  },
};
```

## Fixture Extensions

### Extending Chariot's Fixtures

```typescript
// fixtures/security-fixtures.ts
import { test as base, expect } from "@playwright/test";
import { SecurityTestPage } from "../pages/SecurityTestPage";
import { performLogin, getTestCredentials } from "../helpers/auth";

type SecurityFixtures = {
  securityPage: SecurityTestPage;
  authenticatedPage: Page;
};

export const test = base.extend<SecurityFixtures>({
  securityPage: async ({ page }, use) => {
    const securityPage = new SecurityTestPage(page);
    await use(securityPage);
  },

  authenticatedPage: async ({ page }, use) => {
    const { email, password, totpSecret } = getTestCredentials();
    await page.goto("/");
    await performLogin(page, email, password, totpSecret);
    await use(page);
  },
});

export { expect };
```

### Usage

```typescript
// tests/security/authenticated-xss.spec.ts
import { test, expect } from "../fixtures/security-fixtures";

test("XSS prevention in authenticated context", async ({ authenticatedPage, securityPage }) => {
  // authenticatedPage is already logged in
  await authenticatedPage.goto("/settings/profile");

  // Use security page helper
  await securityPage.testXSSPrevention(
    '[data-testid="bio"]',
    '[data-testid="save-button"]',
    '<script>alert("XSS")</script>'
  );
});
```

## Test Organization Best Practices

### Security Test Structure

```
tests/security/
├── xss-prevention.spec.ts          # XSS tests across all inputs
├── authentication-flows.spec.ts    # Login, logout, MFA, session expiry
├── authorization-boundaries.spec.ts # RBAC, privilege escalation
├── csrf-protection.spec.ts         # CSRF token validation
├── input-validation.spec.ts        # Boundary testing, malicious inputs
└── secure-redirects.spec.ts        # Open redirect prevention
```

### Naming Conventions

**Chariot patterns:**

- Test files: `kebab-case.spec.ts`
- Test suites: `describe('Feature Name', () => {})`
- Test cases: `test('should do specific thing', async () => {})`

**Security test naming:**

```typescript
test.describe("XSS Prevention", () => {
  test("prevents XSS in search input", async ({ page }) => {});
  test("prevents XSS in profile bio", async ({ page }) => {});
  test("prevents stored XSS in comments", async ({ page }) => {});
});

test.describe("Authorization Boundaries", () => {
  test("prevents regular user from accessing admin panel", async ({ page }) => {});
  test("prevents user from editing other users profiles", async ({ page }) => {});
});
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/security-e2e-tests.yml
name: Security E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  security-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "20"

      - name: Install dependencies
        run: |
          cd modules/chariot/ui/e2e
          npm install

      - name: Install Playwright browsers
        run: |
          cd modules/chariot/ui/e2e
          npx playwright install chromium

      - name: Run security E2E tests
        run: |
          cd modules/chariot/ui/e2e
          npx playwright test tests/security/
        env:
          TEST_USER_1_EMAIL: ${{ secrets.TEST_USER_1_EMAIL }}
          TEST_USER_1_PASSWORD: ${{ secrets.TEST_USER_1_PASSWORD }}
          TEST_USER_1_TOTP_SECRET: ${{ secrets.TEST_USER_1_TOTP_SECRET }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: security-test-results
          path: modules/chariot/ui/e2e/test-results/

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: modules/chariot/ui/e2e/playwright-report/
```

## Debugging Security Tests

### Chariot's Debug Patterns

```bash
# Run tests in headed mode with slow motion
cd modules/chariot/ui/e2e
npx playwright test --project chromium-slow-mo --headed

# Debug specific test
npx playwright test tests/security/xss-prevention.spec.ts --debug

# Run with trace
npx playwright test --trace on

# Show Playwright UI
npx playwright test --ui
```

### Console Logging

```typescript
// Add console logging for debugging
test("debug XSS prevention", async ({ page }) => {
  page.on("console", (msg) => console.log("BROWSER:", msg.text()));

  await page.goto("/assets");
  await page.fill('[data-testid="search"]', '<script>alert("XSS")</script>');
  await page.click('[data-testid="search-button"]');

  // Check browser console output
  await page.waitForTimeout(1000);
});
```

## Integration Checklist

When adding security tests to Chariot E2E suite:

- [ ] Use existing `performLogin()` helper for authentication
- [ ] Handle MFA with `generateTOTP()` for authenticated tests
- [ ] Load credentials from `.env` using `getTestCredentials()`
- [ ] Organize tests in `tests/security/` directory
- [ ] Create Page Object Models in `pages/` for reusable patterns
- [ ] Store malicious payloads in `fixtures/security-payloads.ts`
- [ ] Extend fixtures in `fixtures/security-fixtures.ts` if needed
- [ ] Follow Chariot's naming conventions (`kebab-case.spec.ts`)
- [ ] Use `storageState: { cookies: [], origins: [] }` for unauthenticated tests
- [ ] Add security tests to CI/CD pipeline
- [ ] Use Playwright configuration timeouts (60s for security tests)
- [ ] Add console monitoring for XSS detection
- [ ] Test with `chromium-slow-mo` project for debugging

## Real-World Example

### Complete Security Test with Chariot Integration

```typescript
// tests/security/profile-security.spec.ts
import { test, expect } from "@playwright/test";
import { performLogin, getTestCredentials } from "../helpers/auth";
import { SecurityTestPage } from "../pages/SecurityTestPage";
import { XSS_PAYLOADS } from "../fixtures/security-payloads";

test.describe("Profile Security Tests", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  let securityPage: SecurityTestPage;

  test.beforeEach(async ({ page }) => {
    securityPage = new SecurityTestPage(page);

    // Authenticate with MFA
    const { email, password, totpSecret } = getTestCredentials();
    await page.goto("/settings/profile");
    await performLogin(page, email, password, totpSecret);

    // Wait for profile page to load
    await page.waitForLoadState("networkidle");
  });

  test("prevents XSS in profile bio", async ({ page }) => {
    await securityPage.testXSSPrevention(
      '[data-testid="bio"]',
      '[data-testid="save-button"]',
      XSS_PAYLOADS.BASIC_SCRIPT
    );
  });

  test("validates CSRF token in profile form", async ({ page }) => {
    await securityPage.verifyCsrfToken('[data-testid="profile-form"]');
  });

  test("prevents unauthorized profile edits", async ({ page }) => {
    // Try to access another user's profile
    await securityPage.testUnauthorizedAccess(
      "/u/another-user@example.com/settings/profile",
      "/u/" + getTestCredentials().email
    );
  });
});
```

## Summary

Chariot's E2E infrastructure provides:

- ✅ **Robust authentication** with MFA/TOTP support
- ✅ **Environment-based configuration** for flexible testing
- ✅ **Page Object Model patterns** for maintainable tests
- ✅ **Fixture extensions** for reusable test setup
- ✅ **CI/CD integration** with GitHub Actions
- ✅ **Comprehensive debugging tools** via Playwright

Leverage these patterns to build security tests that integrate seamlessly with Chariot's existing E2E infrastructure!
