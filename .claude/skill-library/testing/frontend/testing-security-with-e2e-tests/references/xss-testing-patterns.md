# XSS Testing Patterns for E2E Tests

**Comprehensive cross-site scripting (XSS) testing strategies using Playwright for React frontends.**

## Overview

XSS testing validates that user input is properly sanitized and cannot execute malicious scripts in the browser. This reference provides practical Playwright patterns for testing XSS prevention in E2E tests.

## XSS Attack Categories

### 1. Reflected XSS

Script injected via URL parameters or form inputs that is immediately reflected in the response.

### 2. Stored XSS

Malicious script stored in database and executed when viewed by users (most dangerous).

### 3. DOM-Based XSS

Payload executed through client-side JavaScript manipulation of the DOM.

## Malicious Payload Fixtures

### Standard XSS Payloads

```typescript
// fixtures/xss-payloads.ts
export const XSS_PAYLOADS = {
  // Basic script injection
  BASIC_SCRIPT: '<script>alert("XSS")</script>',

  // Image tag with onerror
  IMG_ONERROR: '<img src=x onerror=alert("XSS")>',

  // SVG with embedded script
  SVG_SCRIPT: '<svg onload=alert("XSS")>',

  // JavaScript protocol
  JS_PROTOCOL: 'javascript:alert("XSS")',

  // HTML entities
  HTML_ENTITIES: '&lt;script&gt;alert("XSS")&lt;/script&gt;',

  // Event handlers
  EVENT_HANDLERS: [
    '<body onload=alert("XSS")>',
    '<input onfocus=alert("XSS") autofocus>',
    '<select onfocus=alert("XSS") autofocus>',
    '<textarea onfocus=alert("XSS") autofocus>',
  ],

  // Context-specific payloads
  ATTRIBUTE_CONTEXT: '" onmouseover="alert(\'XSS\')" x="',
  CSS_CONTEXT: 'expression(alert("XSS"))',

  // Advanced bypasses
  ENCODED: '%3Cscript%3Ealert("XSS")%3C/script%3E',
  DOUBLE_ENCODED: '%253Cscript%253Ealert("XSS")%253C/script%253E',

  // Obfuscated
  OBFUSCATED: [
    '<scr<script>ipt>alert("XSS")</scr</script>ipt>',
    '<img src="x" onerror="&#97;&#108;&#101;&#114;&#116;&#40;&#39;&#88;&#83;&#83;&#39;&#41;">',
  ],
};

export const XSS_DETECTION_MARKERS = {
  // Use unique markers to detect execution
  CONSOLE_ERROR: '<script>console.error("XSS_TEST_MARKER_12345")</script>',
  DOM_MUTATION: "<img src=x onerror=\"document.body.setAttribute('data-xss','detected')\">",
  WINDOW_PROPERTY: "<script>window.xssTriggered = true;</script>",
};
```

### Context-Aware Payload Library

```typescript
// fixtures/context-aware-payloads.ts
export const CONTEXT_PAYLOADS = {
  // HTML context (between tags)
  HTML: [
    '<script>alert("XSS")</script>',
    '<svg/onload=alert("XSS")>',
    "<iframe src=\"javascript:alert('XSS')\">",
  ],

  // Attribute context (inside tag attributes)
  ATTRIBUTE: [
    '" onmouseover="alert(\'XSS\')">',
    "' onclick='alert(\"XSS\")//'>",
    '"><svg/onload=alert("XSS")>',
  ],

  // JavaScript context (inside script tags or event handlers)
  JAVASCRIPT: [
    '\';alert("XSS");//',
    "'-alert(\"XSS\")-'",
    '</script><script>alert("XSS")</script>',
  ],

  // URL context
  URL: [
    'javascript:alert("XSS")',
    'data:text/html,<script>alert("XSS")</script>',
    'vbscript:msgbox("XSS")',
  ],

  // CSS context
  CSS: [
    '</style><script>alert("XSS")</script>',
    'expression(alert("XSS"))',
    "url(\"javascript:alert('XSS')\")",
  ],
};
```

## Testing Patterns

### Pattern 1: Input Field XSS Testing

```typescript
// tests/security/xss-prevention.spec.ts
import { test, expect } from "@playwright/test";
import { XSS_PAYLOADS, XSS_DETECTION_MARKERS } from "../fixtures/xss-payloads";

test.describe("XSS Prevention", () => {
  test("search input sanitizes XSS payloads", async ({ page }) => {
    await page.goto("/assets");

    // Test each payload type
    for (const [type, payload] of Object.entries(XSS_PAYLOADS)) {
      // Fill search input with malicious payload
      await page.fill('[data-testid="search"]', payload);
      await page.click('[data-testid="search-button"]');

      // Wait for results to render
      await page.waitForLoadState("networkidle");

      // Verify script did NOT execute
      const xssTriggered = await page.evaluate(() => window.xssTriggered);
      expect(xssTriggered).toBeUndefined();

      // Verify payload is safely rendered (as text, not HTML)
      const pageContent = await page.content();
      expect(pageContent).not.toContain("<script>");

      // Check console for XSS error messages
      const consoleErrors = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      expect(consoleErrors).not.toContain("XSS");
    }
  });
});
```

### Pattern 2: Console Monitoring for XSS Detection

```typescript
test("monitors console for XSS execution", async ({ page }) => {
  const consoleMessages: string[] = [];
  const consoleErrors: string[] = [];

  // Capture all console output
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
    consoleMessages.push(msg.text());
  });

  await page.goto("/assets");
  await page.fill('[data-testid="asset-name"]', XSS_DETECTION_MARKERS.CONSOLE_ERROR);
  await page.click('[data-testid="save-button"]');

  await page.waitForTimeout(1000); // Allow time for execution

  // Verify XSS marker did NOT execute
  expect(consoleErrors).not.toContain("XSS_TEST_MARKER_12345");
  expect(consoleMessages).not.toContain("XSS_TEST_MARKER_12345");
});
```

### Pattern 3: DOM Mutation Detection

```typescript
test("prevents DOM mutations via XSS", async ({ page }) => {
  await page.goto("/vulnerabilities");

  // Inject payload that attempts DOM mutation
  await page.fill('[data-testid="comment"]', XSS_DETECTION_MARKERS.DOM_MUTATION);
  await page.click('[data-testid="submit-comment"]');

  await page.waitForLoadState("networkidle");

  // Verify DOM attribute was NOT set
  const bodyAttr = await page.locator("body").getAttribute("data-xss");
  expect(bodyAttr).toBeNull();

  // Verify payload rendered as text
  const commentText = await page.locator('[data-testid="comment-text"]').textContent();
  expect(commentText).toContain("<img"); // Raw text, not rendered
});
```

### Pattern 4: URL Parameter XSS Testing

```typescript
test("sanitizes XSS in URL parameters", async ({ page }) => {
  // Attempt reflected XSS via URL parameter
  const xssPayload = encodeURIComponent('<script>alert("XSS")</script>');
  await page.goto(`/search?q=${xssPayload}`);

  // Verify script did not execute
  const xssTriggered = await page.evaluate(() => window.xssTriggered);
  expect(xssTriggered).toBeUndefined();

  // Verify search term displayed as text (not rendered HTML)
  const searchDisplay = await page.locator('[data-testid="search-term"]').textContent();
  expect(searchDisplay).toBe('<script>alert("XSS")</script>'); // Text only

  // Verify no script tags in DOM
  const scriptTags = await page.locator('script:has-text("alert")').count();
  expect(scriptTags).toBe(0);
});
```

### Pattern 5: Stored XSS Testing

```typescript
test("prevents stored XSS in user-generated content", async ({ page }) => {
  await page.goto("/settings/profile");

  // Store XSS payload in profile bio
  await page.fill('[data-testid="bio"]', XSS_PAYLOADS.SVG_SCRIPT);
  await page.click('[data-testid="save-profile"]');

  // Wait for save to complete
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

  // Navigate away and back to trigger stored XSS
  await page.goto("/dashboard");
  await page.goto("/settings/profile");

  // Verify XSS did not execute
  const xssTriggered = await page.evaluate(() => window.xssTriggered);
  expect(xssTriggered).toBeUndefined();

  // Verify bio displayed as text
  const bioText = await page.locator('[data-testid="bio-display"]').textContent();
  expect(bioText).toContain("<svg"); // Raw text
});
```

## Advanced Testing Strategies

### Context-Based Testing Matrix

```typescript
// Comprehensive context testing
const INPUT_CONTEXTS = [
  { name: "Search", selector: '[data-testid="search"]', context: "HTML" },
  { name: "Profile Bio", selector: '[data-testid="bio"]', context: "HTML" },
  { name: "Asset Name", selector: '[data-testid="asset-name"]', context: "ATTRIBUTE" },
  { name: "Comment", selector: '[data-testid="comment"]', context: "HTML" },
  { name: "URL Field", selector: '[data-testid="url"]', context: "URL" },
];

test("tests XSS prevention across all input contexts", async ({ page }) => {
  for (const input of INPUT_CONTEXTS) {
    const payloads = CONTEXT_PAYLOADS[input.context];

    for (const payload of payloads) {
      await page.goto("/test-page");
      await page.fill(input.selector, payload);
      await page.click('[data-testid="submit"]');

      // Verify no XSS execution
      const xssTriggered = await page.evaluate(() => window.xssTriggered);
      expect(
        xssTriggered,
        `XSS triggered for ${input.name} with payload: ${payload}`
      ).toBeUndefined();
    }
  }
});
```

### Bypass Detection Testing

```typescript
test("detects XSS filter bypass attempts", async ({ page }) => {
  const BYPASS_ATTEMPTS = [
    '<scr<script>ipt>alert("XSS")</scr</script>ipt>', // Nested tags
    '<img src="x" onerror="&#97;lert(\'XSS\')">', // HTML entity encoding
    "<svg/onload=alert`XSS`>", // Template literals
    '<<SCRIPT>alert("XSS");//<</SCRIPT>', // Case variation
  ];

  for (const bypass of BYPASS_ATTEMPTS) {
    await page.fill('[data-testid="input"]', bypass);
    await page.click('[data-testid="submit"]');

    const xssTriggered = await page.evaluate(() => window.xssTriggered);
    expect(xssTriggered).toBeUndefined();
  }
});
```

## Integration with Chariot E2E Infrastructure

```typescript
// Use Chariot's authentication fixtures
import { test as base } from "../fixtures/fixtures";

export const test = base.extend<{
  xssTest: (input: string, payload: string) => Promise<void>;
}>({
  xssTest: async ({ page }, use) => {
    const xssTest = async (input: string, payload: string) => {
      await page.fill(input, payload);
      await page.click('[data-testid="submit"]');
      await page.waitForLoadState("networkidle");

      const xssTriggered = await page.evaluate(() => window.xssTriggered);
      expect(xssTriggered).toBeUndefined();
    };

    await use(xssTest);
  },
});
```

## CI/CD Integration

```yaml
# .github/workflows/security-tests.yml
name: XSS Security Tests
on: [push, pull_request]

jobs:
  xss-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run XSS E2E Tests
        run: |
          cd ui/e2e
          npx playwright test tests/security/xss-prevention.spec.ts

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: xss-test-results
          path: ui/e2e/test-results/
```

## Sources & References

### OWASP Resources

- [OWASP XSS Testing Guide](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/01-Testing_for_Reflected_Cross_Site_Scripting)
- [OWASP XSS Prevention Cheat Sheet](https://owasp.org/www-community/attacks/xss/)

### Testing Tools & Approaches

- [XSS Testing with BrowserStack](https://www.browserstack.com/guide/xss-testing)
- [XSStrike - Advanced XSS Scanner](https://github.com/s0md3v/XSStrike)
- [Automated XSS Detection in CI/CD](https://www.oreilly.com/content/automating-xss-detection-in-the-ci-cd-pipeline-with-xss-checkmate/)

### Research Papers

- [Detecting XSS through Automated Unit Testing](https://arxiv.org/pdf/1804.00755)

## Best Practices

1. **Test All Input Fields**: Every user input should be tested with XSS payloads
2. **Context-Aware Testing**: Use payloads appropriate for rendering context (HTML, JS, CSS, URL)
3. **Detection Methods**: Use console monitoring, DOM mutation detection, window property checks
4. **Unique Markers**: Include unique identifiers in payloads for debugging
5. **Comprehensive Coverage**: Test reflected, stored, and DOM-based XSS scenarios
6. **Bypass Testing**: Test filter evasion techniques
7. **CI/CD Integration**: Run XSS tests automatically in deployment pipeline
8. **Real-World Payloads**: Use payload libraries from OWASP and security research
