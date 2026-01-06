/**
 * Integration test for Serena semantic routing
 *
 * Tests that semanticContext correctly routes to module-scoped projects
 * instead of scanning the entire super-repo.
 *
 * Usage:
 *   npx tsx tools/serena/semantic-routing-test.ts
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { routeToSerena } from './semantic-router.js';

const SUPER_REPO = '/Users/nathansportsman/chariot-development-platform2';
const TIMEOUT_MS = 60_000;

interface TestResult {
  name: string;
  semanticContext: string | undefined;
  routedTo: string;
  timeMs: number;
  success: boolean;
  error?: string;
}

async function testWithRouting(
  semanticContext: string | undefined,
  testName: string
): Promise<TestResult> {
  console.log(`\n=== ${testName} ===`);

  let args: string[];
  let routedTo: string;

  if (semanticContext) {
    const routing = routeToSerena(semanticContext, SUPER_REPO);
    args = [
      '--from', 'git+https://github.com/oraios/serena',
      'serena', 'start-mcp-server',
      '--context', 'claude-code',
      ...routing.args
    ];
    routedTo = routing.scopeDescription;
    console.log(`Semantic context: "${semanticContext}"`);
    console.log(`Routed to: ${routedTo}`);
  } else {
    args = [
      '--from', 'git+https://github.com/oraios/serena',
      'serena', 'start-mcp-server',
      '--context', 'claude-code',
      '--project-from-cwd'
    ];
    routedTo = 'Full super-repo (--project-from-cwd)';
    console.log('No semantic context - using full super-repo scan');
  }

  console.log(`Args: ${args.slice(4).join(' ')}`);

  const transport = new StdioClientTransport({
    command: 'uvx',
    args,
    env: { ...process.env, PWD: SUPER_REPO },
  });

  const client = new Client(
    { name: 'semantic-routing-test', version: '1.0.0' },
    { capabilities: {} }
  );

  const start = Date.now();

  try {
    // Set timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
    });

    // Connect and make a simple call
    console.log(`[${Date.now() - start}ms] Connecting...`);
    await Promise.race([client.connect(transport), timeoutPromise]);
    console.log(`[${Date.now() - start}ms] Connected`);

    console.log(`[${Date.now() - start}ms] Calling list_dir...`);
    await Promise.race([
      client.callTool({ name: 'list_dir', arguments: { relative_path: '.', recursive: false } }),
      timeoutPromise
    ]);

    const elapsed = Date.now() - start;
    console.log(`[${elapsed}ms] Complete ✓`);

    return {
      name: testName,
      semanticContext,
      routedTo,
      timeMs: elapsed,
      success: true,
    };

  } catch (error) {
    const elapsed = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`[${elapsed}ms] FAILED: ${errorMsg}`);

    return {
      name: testName,
      semanticContext,
      routedTo,
      timeMs: elapsed,
      success: false,
      error: errorMsg,
    };

  } finally {
    try {
      await client.close();
    } catch {
      // Ignore
    }
  }
}

async function main() {
  console.log('========================================');
  console.log('SEMANTIC ROUTING INTEGRATION TEST');
  console.log('========================================');
  console.log('');
  console.log('This tests that semanticContext correctly routes');
  console.log('Serena to a specific module for faster initialization.');
  console.log('');

  const results: TestResult[] = [];

  // Test 1: With semantic context (should be fast ~5-10s)
  results.push(await testWithRouting(
    'Find React components in the assets page',
    'Test 1: With semanticContext (chariot module)'
  ));

  // Test 2: Different module
  results.push(await testWithRouting(
    'Update Python CLI command',
    'Test 2: With semanticContext (praetorian-cli module)'
  ));

  // Test 3: Without semantic context (likely timeout or very slow)
  // Uncomment to test - WARNING: This may take >60s or timeout
  // results.push(await testWithRouting(
  //   undefined,
  //   'Test 3: Without semanticContext (full super-repo)'
  // ));

  // Summary
  console.log('\n\n========================================');
  console.log('SUMMARY');
  console.log('========================================');

  for (const r of results) {
    const status = r.success ? '✓' : '✗';
    console.log(`\n${status} ${r.name}`);
    console.log(`  Context: ${r.semanticContext || '(none)'}`);
    console.log(`  Routed:  ${r.routedTo}`);
    console.log(`  Time:    ${r.timeMs}ms`);
    if (r.error) {
      console.log(`  Error:   ${r.error}`);
    }
  }

  console.log('\n\n========================================');
  console.log('EXPECTED RESULTS');
  console.log('========================================');
  console.log('');
  console.log('With semanticContext:    ~5,000-15,000ms (module-scoped)');
  console.log('Without semanticContext: >60,000ms TIMEOUT (full super-repo)');
  console.log('');
  console.log('If WITH context times out, the routing may not be working.');
  console.log('If WITHOUT context is fast, the super-repo may have been cached.');
}

main().catch(console.error);
