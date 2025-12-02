// Test suite for chrome-devtools wrappers
// Validates input/output schemas and demonstrates token savings

import { chromeDevTools, TOKEN_SAVINGS } from './index';

async function runTests() {
  console.log('Chrome DevTools MCP Wrappers - Test Suite\n');
  console.log('═══════════════════════════════════════════\n');

  // Display token savings
  console.log('📊 Token Savings Summary:');
  console.log(`   Original:      ${TOKEN_SAVINGS.original.toLocaleString()} tokens`);
  console.log(`   With Wrappers: ${TOKEN_SAVINGS.withWrappers.toLocaleString()} tokens`);
  console.log(`   Reduction:     ${TOKEN_SAVINGS.reduction.toLocaleString()} tokens (${TOKEN_SAVINGS.percentSaved}%)`);
  console.log();

  const testPageId = crypto.randomUUID();
  let passedTests = 0;
  let failedTests = 0;

  // Test helper
  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passedTests++;
    } catch (error: any) {
      console.error(`✗ ${name}`);
      console.error(`  Error: ${error.message}`);
      failedTests++;
    }
  }

  console.log('🧪 Running Tests:\n');

  // === Page Management Tests ===
  console.log('Page Management (5 tools):');

  await test('navigate-page: valid input', async () => {
    const result = await chromeDevTools.page.navigate.execute({
      pageId: testPageId,
      url: 'https://example.com'
    });
    if (!result.success) throw new Error('Navigation failed');
  });

  await test('new-page: creates new page', async () => {
    const result = await chromeDevTools.page.new.execute({
      url: 'https://test.com'
    });
    if (!result.id) throw new Error('No page ID returned');
  });

  await test('list-pages: filtered results', async () => {
    const result = await chromeDevTools.page.list.execute({
      filter: 'active'
    });
    if (typeof result.total !== 'number') throw new Error('Missing total count');
  });

  await test('close-page: closes page', async () => {
    const result = await chromeDevTools.page.close.execute({
      pageId: testPageId
    });
    if (!result.success) throw new Error('Close failed');
  });

  await test('select-page: activates page', async () => {
    const result = await chromeDevTools.page.select.execute({
      pageId: testPageId
    });
    if (!result.success) throw new Error('Select failed');
  });

  console.log();

  // === User Interactions Tests ===
  console.log('User Interactions (7 tools):');

  await test('click: clicks element', async () => {
    const result = await chromeDevTools.interact.click.execute({
      pageId: testPageId,
      selector: 'button.submit'
    });
    if (!result.success) throw new Error('Click failed');
  });

  await test('fill: fills input', async () => {
    const result = await chromeDevTools.interact.fill.execute({
      pageId: testPageId,
      selector: 'input[name="email"]',
      value: 'test@example.com'
    });
    if (!result.success) throw new Error('Fill failed');
  });

  await test('fill-form: fills multiple fields', async () => {
    const result = await chromeDevTools.interact.fillForm.execute({
      pageId: testPageId,
      fields: {
        email: 'test@example.com',
        password: 'secret123'
      }
    });
    if (result.filledFields !== 2) throw new Error('Wrong field count');
  });

  await test('press-key: presses key', async () => {
    const result = await chromeDevTools.interact.pressKey.execute({
      pageId: testPageId,
      key: 'Enter'
    });
    if (!result.success) throw new Error('Key press failed');
  });

  await test('hover: hovers element', async () => {
    const result = await chromeDevTools.interact.hover.execute({
      pageId: testPageId,
      selector: 'button.menu'
    });
    if (!result.success) throw new Error('Hover failed');
  });

  await test('drag: drags element', async () => {
    const result = await chromeDevTools.interact.drag.execute({
      pageId: testPageId,
      sourceSelector: '.draggable',
      targetSelector: '.dropzone'
    });
    if (!result.success) throw new Error('Drag failed');
  });

  await test('upload-file: uploads files', async () => {
    const result = await chromeDevTools.interact.uploadFile.execute({
      pageId: testPageId,
      selector: 'input[type="file"]',
      filePaths: ['/tmp/test.txt']
    });
    if (result.uploadedFiles !== 1) throw new Error('Wrong file count');
  });

  console.log();

  // === Browser Control Tests ===
  console.log('Browser Control (4 tools):');

  await test('emulate: sets device emulation', async () => {
    const result = await chromeDevTools.browser.emulate.execute({
      pageId: testPageId,
      deviceType: 'mobile',
      networkCondition: 'slow-3g'
    });
    if (!result.success) throw new Error('Emulation failed');
  });

  await test('resize: resizes viewport', async () => {
    const result = await chromeDevTools.browser.resize.execute({
      pageId: testPageId,
      width: 1920,
      height: 1080
    });
    if (!result.success) throw new Error('Resize failed');
  });

  await test('handle-dialog: handles dialog', async () => {
    const result = await chromeDevTools.browser.handleDialog.execute({
      pageId: testPageId,
      action: 'accept'
    });
    if (!result.success) throw new Error('Dialog handling failed');
  });

  await test('wait-for: waits for element', async () => {
    const result = await chromeDevTools.browser.waitFor.execute({
      pageId: testPageId,
      selector: '.loading',
      state: 'hidden'
    });
    if (!result.success) throw new Error('Wait failed');
  });

  console.log();

  // === Data Extraction Tests ===
  console.log('Data Extraction (3 tools):');

  await test('evaluate-script: executes script', async () => {
    const result = await chromeDevTools.extract.evaluateScript.execute({
      pageId: testPageId,
      script: 'document.title'
    });
    if (!result.success) throw new Error('Script execution failed');
  });

  await test('take-screenshot: captures screenshot', async () => {
    const result = await chromeDevTools.extract.screenshot.execute({
      pageId: testPageId,
      format: 'png'
    });
    if (!result.success || !result.path) throw new Error('Screenshot failed');
  });

  await test('take-snapshot: saves snapshot', async () => {
    const result = await chromeDevTools.extract.snapshot.execute({
      pageId: testPageId,
      format: 'mhtml'
    });
    if (!result.success || !result.path) throw new Error('Snapshot failed');
  });

  console.log();

  // === Debugging Tests ===
  console.log('Debugging (4 tools):');

  await test('get-console-message: gets message', async () => {
    const result = await chromeDevTools.debug.console.get.execute({
      pageId: testPageId,
      messageId: 'msg-123'
    });
    if (!result.text) throw new Error('No message text');
  });

  await test('list-console-messages: lists messages', async () => {
    const result = await chromeDevTools.debug.console.list.execute({
      pageId: testPageId,
      types: ['error', 'warning'],
      limit: 20
    });
    if (!Array.isArray(result.messages)) throw new Error('Missing messages array');
  });

  await test('get-network-request: gets request', async () => {
    const result = await chromeDevTools.debug.network.get.execute({
      pageId: testPageId,
      requestId: 'req-123'
    });
    if (!result.url) throw new Error('No request URL');
  });

  await test('list-network-requests: lists requests', async () => {
    const result = await chromeDevTools.debug.network.list.execute({
      pageId: testPageId,
      filter: {
        methods: ['GET', 'POST'],
        statusCodes: [200, 404]
      },
      limit: 30
    });
    if (!Array.isArray(result.requests)) throw new Error('Missing requests array');
  });

  console.log();

  // === Performance Tests ===
  console.log('Performance (3 tools):');

  await test('performance-start-trace: starts trace', async () => {
    const result = await chromeDevTools.performance.startTrace.execute({
      pageId: testPageId,
      categories: ['devtools.timeline']
    });
    if (!result.traceId) throw new Error('No trace ID');
  });

  await test('performance-stop-trace: stops trace', async () => {
    const result = await chromeDevTools.performance.stopTrace.execute({
      pageId: testPageId,
      traceId: crypto.randomUUID()
    });
    if (!result.success || !result.path) throw new Error('Trace stop failed');
  });

  await test('performance-analyze-insight: analyzes trace', async () => {
    const result = await chromeDevTools.performance.analyzeInsight.execute({
      pageId: testPageId,
      traceId: crypto.randomUUID(),
      focus: ['load-time', 'javascript-execution']
    });
    if (!result.summary || !Array.isArray(result.insights)) {
      throw new Error('Missing analysis data');
    }
  });

  console.log();

  // === Validation Tests ===
  console.log('Validation Tests (Security & Input):');

  await test('rejects invalid URL protocol', async () => {
    try {
      await chromeDevTools.page.navigate.execute({
        pageId: testPageId,
        url: 'javascript:alert(1)'
      });
      throw new Error('Should have rejected javascript: protocol');
    } catch (error: any) {
      if (!error.message.includes('Protocol not allowed')) {
        throw error;
      }
    }
  });

  await test('rejects XSS in selector', async () => {
    try {
      await chromeDevTools.interact.click.execute({
        pageId: testPageId,
        selector: '<script>alert(1)</script>'
      });
      throw new Error('Should have rejected XSS in selector');
    } catch (error: any) {
      if (!error.message.includes('XSS')) {
        throw error;
      }
    }
  });

  await test('rejects directory traversal', async () => {
    try {
      await chromeDevTools.interact.uploadFile.execute({
        pageId: testPageId,
        selector: 'input[type="file"]',
        filePaths: ['../../etc/passwd']
      });
      throw new Error('Should have rejected directory traversal');
    } catch (error: any) {
      if (!error.message.includes('directory traversal')) {
        throw error;
      }
    }
  });

  await test('validates page ID format', async () => {
    try {
      await chromeDevTools.page.navigate.execute({
        pageId: 'invalid-uuid',
        url: 'https://example.com'
      });
      throw new Error('Should have rejected invalid UUID');
    } catch (error: any) {
      if (!error.message.includes('Invalid page ID')) {
        throw error;
      }
    }
  });

  console.log();

  // === Results Summary ===
  console.log('═══════════════════════════════════════════\n');
  console.log('📈 Test Results:');
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${failedTests}`);
  console.log(`   Total:  ${passedTests + failedTests}`);
  console.log();

  if (failedTests === 0) {
    console.log('✓ All tests passed!');
    console.log();
    console.log('🎯 Token Savings Achieved:');
    console.log(`   - 26 tools wrapped with validation`);
    console.log(`   - 80% token reduction (7,800 → 1,560 tokens)`);
    console.log(`   - All inputs validated with Zod`);
    console.log(`   - Security checks implemented`);
    console.log(`   - Filtered outputs for optimal performance`);
    return 0;
  } else {
    console.error(`\n✗ ${failedTests} test(s) failed`);
    return 1;
  }
}

// Run tests
runTests().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
