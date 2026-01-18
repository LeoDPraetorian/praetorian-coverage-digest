/**
 * Integration test for Serena wrappers with semantic routing
 *
 * Tests that wrappers correctly pass semanticContext through to the MCP client.
 *
 * Usage:
 *   npx tsx tools/serena/wrapper-integration-test.ts
 */

import { findSymbol } from './find-symbol.js';
import { listDir } from './list-dir.js';
import { searchForPattern } from './search-for-pattern.js';

const TIMEOUT_MS = 60_000;

interface TestResult {
  wrapper: string;
  semanticContext: string;
  timeMs: number;
  success: boolean;
  resultSummary?: string;
  error?: string;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

async function testWrapper(
  name: string,
  semanticContext: string,
  fn: () => Promise<any>
): Promise<TestResult> {
  console.log(`\n--- ${name} ---`);
  console.log(`Context: "${semanticContext}"`);

  const start = Date.now();

  try {
    const result = await withTimeout(fn(), TIMEOUT_MS);
    const elapsed = Date.now() - start;

    let summary = '';
    if (result.count !== undefined) {
      summary = `${result.count} results`;
    } else if (result.totalItems !== undefined) {
      summary = `${result.totalItems} items`;
    } else if (result.symbols) {
      summary = `${result.symbols.length} symbols`;
    }

    console.log(`[${elapsed}ms] ✓ ${summary}`);

    return {
      wrapper: name,
      semanticContext,
      timeMs: elapsed,
      success: true,
      resultSummary: summary,
    };

  } catch (error) {
    const elapsed = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`[${elapsed}ms] ✗ ${errorMsg}`);

    return {
      wrapper: name,
      semanticContext,
      timeMs: elapsed,
      success: false,
      error: errorMsg,
    };
  }
}

async function main() {
  console.log('========================================');
  console.log('WRAPPER INTEGRATION TEST');
  console.log('========================================');
  console.log('');
  console.log('Tests that wrappers work with semanticContext');
  console.log('for module-scoped Serena initialization.');
  console.log('');

  const results: TestResult[] = [];

  // Test findSymbol with semantic context
  results.push(await testWrapper(
    'findSymbol',
    'Find Asset class in React frontend',
    () => findSymbol.execute({
      name_path_pattern: 'Asset',
      relative_path: '',
      include_kinds: [],
      exclude_kinds: [],
      max_answer_chars: 10000,
      depth: 3,
      include_body: false,
      substring_matching: false,
      semanticContext: 'Find Asset class in React frontend',
    })
  ));

  // Test listDir with semantic context
  results.push(await testWrapper(
    'listDir',
    'List Python CLI source files',
    () => listDir.execute({
      relative_path: '.',
      recursive: false,
      skip_ignored_files: true,
      max_answer_chars: 10000,
      semanticContext: 'List Python CLI source files',
    })
  ));

  // Test searchForPattern with semantic context
  results.push(await testWrapper(
    'searchForPattern',
    'Search for import statements in Nuclei templates',
    () => searchForPattern.execute({
      pattern: 'import',
      relative_path: '.',
      max_answer_chars: 10000,
      semanticContext: 'Search for import statements in Nuclei templates',
    })
  ));

  // Summary
  console.log('\n\n========================================');
  console.log('SUMMARY');
  console.log('========================================');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\nPassed: ${passed}/${results.length}`);
  if (failed > 0) {
    console.log(`Failed: ${failed}/${results.length}`);
  }

  console.log('\nDetails:');
  for (const r of results) {
    const status = r.success ? '✓' : '✗';
    console.log(`  ${status} ${r.wrapper}: ${r.timeMs}ms ${r.resultSummary || r.error || ''}`);
  }

  console.log('\n========================================');
  console.log('PERFORMANCE EXPECTATION');
  console.log('========================================');
  console.log('');
  console.log('Each call should complete in ~5-15 seconds');
  console.log('(module-scoped cold start + operation)');
  console.log('');
  console.log('If calls timeout (>60s), check:');
  console.log('1. semantic-router.ts routing logic');
  console.log('2. mcp-client.ts getSerenaArgs() function');
  console.log('3. Serena server availability');
}

main().catch(console.error);
