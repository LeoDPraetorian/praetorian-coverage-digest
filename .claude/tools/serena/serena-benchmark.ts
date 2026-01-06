/**
 * Serena MCP Benchmark: Measures actual initialization time
 *
 * Tests:
 * 1. Cold start time (connect + first call) - small project
 * 2. Cold start time (connect + first call) - super-repo
 * 3. Warm call time (same connection)
 * 4. Whether connection reuse helps
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const SMALL_PROJECT = '/tmp/serena-test';
const SUPER_REPO = '/Users/nathansportsman/chariot-development-platform2';

interface BenchmarkResult {
  project: string;
  connectTimeMs: number;
  firstCallTimeMs: number;
  secondCallTimeMs: number;
  thirdCallTimeMs: number;
  totalTimeMs: number;
}

async function ensureTestProject() {
  const fs = await import('fs');
  const path = await import('path');

  // Create minimal test project if it doesn't exist
  if (!fs.existsSync(SMALL_PROJECT)) {
    fs.mkdirSync(SMALL_PROJECT, { recursive: true });
    fs.writeFileSync(path.join(SMALL_PROJECT, 'test.ts'), `
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
}
`);
  }
}

async function benchmark(projectPath: string, label: string): Promise<BenchmarkResult> {
  console.log(`\n=== Benchmark: ${label} ===`);
  console.log(`Project: ${projectPath}`);

  const transport = new StdioClientTransport({
    command: 'uvx',
    args: [
      '--from', 'git+https://github.com/oraios/serena',
      'serena', 'start-mcp-server',
      '--context', 'claude-code',
      '--project', projectPath
    ],
  });

  const client = new Client(
    { name: 'serena-benchmark', version: '1.0.0' },
    { capabilities: {} }
  );

  const timestamps: number[] = [];

  try {
    // Phase 1: Connect
    console.log('[0ms] Starting connection...');
    timestamps.push(Date.now()); // 0: start

    await client.connect(transport);
    timestamps.push(Date.now()); // 1: connected
    console.log(`[${timestamps[1] - timestamps[0]}ms] Connected`);

    // Phase 2: First call (may trigger indexing)
    console.log(`[${Date.now() - timestamps[0]}ms] First call (list_memories)...`);
    await client.callTool({ name: 'list_memories', arguments: {} });
    timestamps.push(Date.now()); // 2: first call done
    console.log(`[${timestamps[2] - timestamps[0]}ms] First call complete`);

    // Phase 3: Second call (same connection)
    console.log(`[${Date.now() - timestamps[0]}ms] Second call (get_current_config)...`);
    await client.callTool({ name: 'get_current_config', arguments: {} });
    timestamps.push(Date.now()); // 3: second call done
    console.log(`[${timestamps[3] - timestamps[0]}ms] Second call complete`);

    // Phase 4: Third call (symbol operation)
    console.log(`[${Date.now() - timestamps[0]}ms] Third call (list_dir)...`);
    await client.callTool({ name: 'list_dir', arguments: { relative_path: '.', recursive: false } });
    timestamps.push(Date.now()); // 4: third call done
    console.log(`[${timestamps[4] - timestamps[0]}ms] Third call complete`);

    const result: BenchmarkResult = {
      project: label,
      connectTimeMs: timestamps[1] - timestamps[0],
      firstCallTimeMs: timestamps[2] - timestamps[1],
      secondCallTimeMs: timestamps[3] - timestamps[2],
      thirdCallTimeMs: timestamps[4] - timestamps[3],
      totalTimeMs: timestamps[4] - timestamps[0],
    };

    console.log('\n--- Results ---');
    console.log(`Connect:     ${result.connectTimeMs}ms`);
    console.log(`First call:  ${result.firstCallTimeMs}ms`);
    console.log(`Second call: ${result.secondCallTimeMs}ms`);
    console.log(`Third call:  ${result.thirdCallTimeMs}ms`);
    console.log(`TOTAL:       ${result.totalTimeMs}ms`);

    return result;

  } finally {
    try {
      await client.close();
    } catch {
      // Ignore close errors
    }
  }
}

async function main() {
  console.log('========================================');
  console.log('SERENA MCP INITIALIZATION BENCHMARK');
  console.log('========================================');
  console.log('');
  console.log('This measures ACTUAL initialization time to determine');
  console.log('what timeout value is needed for the super-repo.');
  console.log('');

  await ensureTestProject();

  const results: BenchmarkResult[] = [];

  // Test 1: Small project (baseline)
  try {
    const small = await benchmark(SMALL_PROJECT, 'Small Project (baseline)');
    results.push(small);
  } catch (e) {
    console.error('Small project failed:', e);
  }

  // Test 2: Super-repo (the problematic case)
  try {
    const superRepo = await benchmark(SUPER_REPO, 'Super-Repo (16 submodules)');
    results.push(superRepo);
  } catch (e) {
    console.error('Super-repo failed:', e);
  }

  // Summary
  console.log('\n\n========================================');
  console.log('SUMMARY');
  console.log('========================================');

  for (const r of results) {
    console.log(`\n${r.project}:`);
    console.log(`  Connect + First Call: ${r.connectTimeMs + r.firstCallTimeMs}ms`);
    console.log(`  Subsequent calls:     ${r.secondCallTimeMs}ms, ${r.thirdCallTimeMs}ms`);
    console.log(`  Recommended timeout:  ${Math.ceil((r.connectTimeMs + r.firstCallTimeMs) * 1.5 / 1000) * 1000}ms (1.5x buffer)`);
  }

  console.log('\n\n========================================');
  console.log('ARCHITECTURE INSIGHT');
  console.log('========================================');
  console.log('');
  console.log('The current mcp-client.ts creates a NEW connection for EVERY call.');
  console.log('This means EVERY call pays the full initialization cost.');
  console.log('');
  console.log('If subsequent calls are much faster than connect+first:');
  console.log('  -> Connection pooling would drastically improve performance');
  console.log('');
  console.log('If subsequent calls are similar to first call:');
  console.log('  -> Connection pooling won\'t help much');
}

main().catch(console.error);
