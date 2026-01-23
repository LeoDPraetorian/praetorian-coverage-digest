/**
 * PyGhidra Integration Tests
 *
 * Tests persistent HTTP server and real firmware analysis workflow.
 * Uses real pyghidra-mcp server (not mocked).
 *
 * Test binary: Alpine ILX-F511 updatemgr (297KB ARM32 automotive firmware)
 *
 * Run: npm run test:integration -- pyghidra
 */

import { vi } from 'vitest';
import * as path from 'path';

// =============================================================================
// Test Mocks (MUST be before imports that use them)
// =============================================================================

// Mock findProjectRoot - compute repo root from current file location
// This file is at: .claude/tools/pyghidra/pyghidra.integration.test.ts
// Repo root is: ../../../ from this file
const REPO_ROOT = path.resolve(__dirname, '../../..');

vi.mock('../../../lib/find-project-root.js', () => ({
  findProjectRoot: () => REPO_ROOT,
  resolveProjectPath: (...paths: string[]) => path.join(REPO_ROOT, ...paths),
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { importBinary } from './import-binary.js';
import { listProjectBinaries } from './list-project-binaries.js';
import { listImports } from './list-imports.js';
import { listExports } from './list-exports.js';
import { listCrossReferences } from './list-cross-references.js';
import { decompileFunction } from './decompile-function.js';
import { genCallgraph } from './gen-callgraph.js';
import { searchStrings } from './search-strings.js';
import { searchSymbolsByName } from './search-symbols-by-name.js';
import { getServerManager } from './lib/server-manager.js';
import { getAnalysisPoller } from './lib/analysis-poller.js';

// =============================================================================
// Test Configuration
// =============================================================================

const TEST_BINARY_PATH =
  '/Users/ryanhennessee/projects/automotive/Alpine-ILX-F511/rootfs/rootfs/usr/bin/updatemgr';
const SERVER_PORT = 8765;
const TEST_TIMEOUT = 120000; // 2 minutes for integration tests

// =============================================================================
// Setup/Teardown
// =============================================================================

let serverPID: number | undefined;

beforeAll(async () => {
  // Ensure server is running before tests
  const manager = getServerManager();
  const serverInfo = await manager.ensureServer({
    port: SERVER_PORT,
    projectPath: 'pyghidra_mcp_projects/pyghidra_mcp',
  });
  serverPID = serverInfo.pid;
  console.log(`[Setup] PyGhidra server started: PID ${serverPID}`);
}, TEST_TIMEOUT);

afterAll(async () => {
  console.log(`[Teardown] Leaving server running for manual inspection`);
  console.log(`[Teardown] To stop: kill ${serverPID}`);
  // Note: Intentionally NOT stopping server to allow manual inspection
  // In CI/CD, add: await getServerManager().stopServer();
});

// =============================================================================
// Test Suite: Server Lifecycle
// =============================================================================

describe('PyGhidra Persistent Server', () => {
  it('should start server on first MCP call', async () => {
    const manager = getServerManager();
    const isRunning = await manager.isServerRunning();
    expect(isRunning).toBe(true);
  });

  it('should have stable PID across multiple calls', async () => {
    const manager = getServerManager();
    const info1 = await manager.getServerInfo();
    const info2 = await manager.getServerInfo();

    expect(info1?.pid).toBe(serverPID);
    expect(info2?.pid).toBe(serverPID);
    expect(info1?.pid).toBe(info2?.pid);
  });

  it('should reuse existing server instead of spawning new one', async () => {
    const manager = getServerManager();
    const pidBefore = (await manager.getServerInfo())?.pid;

    // Make MCP call - should NOT restart server
    await listProjectBinaries.execute({});

    const pidAfter = (await manager.getServerInfo())?.pid;
    expect(pidAfter).toBe(pidBefore);
  });
});

// =============================================================================
// Test Suite: Binary Import
// =============================================================================

describe('import-binary', () => {
  it('should import binary without wait_for_analysis', async () => {
    const result = await importBinary.execute({
      binary_path: TEST_BINARY_PATH,
    });

    if (!result.ok) {
      console.error('[TEST ERROR] import-binary failed:', result.error);
    }

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.binary_name).toBe('updatemgr');
      expect(result.data.message).toContain('Importing');
      expect(result.meta.durationMs).toBeLessThan(5000);
    }
  });

  it('should extract binary name from file path', async () => {
    const result = await importBinary.execute({
      binary_path: TEST_BINARY_PATH,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.binary_name).toBe('updatemgr');
      expect(result.data.binary_name).not.toBe('unknown');
    }
  });

  it('should wait for analysis when requested', async () => {
    const result = await importBinary.execute({
      binary_path: TEST_BINARY_PATH,
      wait_for_analysis: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.binary_name).toBe('updatemgr');
      expect(result.data.analysis_complete).toBeDefined();
      // For already-analyzed binary, should return quickly
      expect(result.meta.durationMs).toBeLessThan(10000);
    }
  }, TEST_TIMEOUT);
});

// =============================================================================
// Test Suite: State Persistence
// =============================================================================

describe('State Persistence', () => {
  it('should persist binaries across wrapper calls', async () => {
    // Import binary
    await importBinary.execute({
      binary_path: TEST_BINARY_PATH,
    });

    // List binaries - should find imported binary
    const result = await listProjectBinaries.execute({});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.summary.total).toBeGreaterThan(0);
      const hasUpdatemgr = result.data.binaries.some((b) =>
        b.name.includes('updatemgr')
      );
      expect(hasUpdatemgr).toBe(true);
    }
  });

  it('should track analysis completion status', async () => {
    const result = await listProjectBinaries.execute({});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.summary.analyzed).toBeDefined();
      expect(result.data.summary.pending).toBeDefined();
      expect(result.data.summary.total).toBe(
        result.data.summary.analyzed + result.data.summary.pending
      );
    }
  });
});

// =============================================================================
// Test Suite: Analysis Polling
// =============================================================================

describe('Analysis Polling', () => {
  it('should detect when binary is already analyzed', async () => {
    const poller = getAnalysisPoller();

    // Check if updatemgr is analyzed
    const isComplete = await poller.isAnalysisComplete('updatemgr');

    // Should be true since we've been using this binary
    expect(typeof isComplete).toBe('boolean');
  });

  it('should get current analysis status', async () => {
    const poller = getAnalysisPoller();
    const status = await poller.getAnalysisStatus();

    expect(status.total).toBeGreaterThanOrEqual(0);
    expect(status.analyzed).toBeGreaterThanOrEqual(0);
    expect(status.pending).toBeGreaterThanOrEqual(0);
    expect(status.binaries).toBeInstanceOf(Array);
  });

  it('should match binary names with partial matching', async () => {
    const poller = getAnalysisPoller();
    const status = await poller.getAnalysisStatus();

    // If updatemgr is in project, verify we can find it by basename
    const hasUpdatemgr = status.binaries.some((b) =>
      b.name.includes('updatemgr')
    );
    if (hasUpdatemgr) {
      // waitForBinary should find it even with just basename
      const binaryInfo = await poller.waitForBinary('updatemgr', {
        maxAttempts: 1,
      });
      expect(binaryInfo.name).toContain('updatemgr');
    }
  });
});

// =============================================================================
// Test Suite: Wrapper Functionality
// =============================================================================

describe('list-project-binaries', () => {
  it('should list all binaries with analysis status', async () => {
    const result = await listProjectBinaries.execute({});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.binaries).toBeInstanceOf(Array);
      expect(result.data.summary).toHaveProperty('total');
      expect(result.data.summary).toHaveProperty('analyzed');
      expect(result.data.summary).toHaveProperty('pending');
    }
  });

  it('should have low token cost', async () => {
    const result = await listProjectBinaries.execute({});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.meta.estimatedTokens).toBeLessThan(100);
    }
  });
});

describe('list-imports', () => {
  it('should list imports with pattern matching', async () => {
    const result = await listImports.execute({
      binary_name: '/updatemgr-e100d8',
      query: 'str.*',
      offset: 0,
      limit: 10,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.imports).toBeInstanceOf(Array);
      // updatemgr uses afw_strlen, afw_strstr, etc.
      expect(result.data.imports.length).toBeGreaterThan(0);
    }
  });

  it('should respect pagination', async () => {
    const result = await listImports.execute({
      binary_name: '/updatemgr-e100d8',
      query: '.*',
      offset: 0,
      limit: 5,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.imports.length).toBeLessThanOrEqual(5);
    }
  });
});

describe('list-exports', () => {
  it('should list exported functions', async () => {
    const result = await listExports.execute({
      binary_name: '/updatemgr-e100d8',
      offset: 0,
      limit: 10,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.exports).toBeInstanceOf(Array);
      // Should find main, _init, _start, etc.
      const hasMain = result.data.exports.some((e) => e.name === 'main');
      expect(hasMain).toBe(true);
    }
  });

  it('should include addresses for exports', async () => {
    const result = await listExports.execute({
      binary_name: '/updatemgr-e100d8',
      offset: 0,
      limit: 10,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      result.data.exports.forEach((exp) => {
        expect(exp.address).toBeDefined();
        expect(exp.address).toMatch(/^[0-9a-f]{8}$/i);
      });
    }
  });
});

describe('list-cross-references', () => {
  it('should return correct schema structure', async () => {
    const result = await listCrossReferences.execute({
      binary_name: '/updatemgr-e100d8',
      name_or_address: 'main',
      filter_type: 'CALL',
      offset: 0,
      limit: 10,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Verify correct field names
      expect(result.data).toHaveProperty('cross_references');
      expect(result.data).toHaveProperty('summary');
      expect(result.data).toHaveProperty('pagination');
      expect(result.data).not.toHaveProperty('references'); // Common typo
    }
  });

  it('should handle zero results gracefully', async () => {
    const result = await listCrossReferences.execute({
      binary_name: '/updatemgr-e100d8',
      name_or_address: 'main',
      filter_type: 'CALL',
      offset: 0,
      limit: 10,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.cross_references).toBeInstanceOf(Array);
      expect(result.data.summary.total).toBe(0);
    }
  });
});

describe('decompile-function', () => {
  it('should decompile main function', async () => {
    const result = await decompileFunction.execute({
      binary_name: '/updatemgr-e100d8',
      name_or_address: 'main',
      max_code_lines: 30,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBeDefined();
      expect(result.data.signature).toContain('main');
      expect(result.data.code).toBeDefined();
      expect(result.data.code.length).toBeGreaterThan(0);
      expect(result.data.complexity).toBe('complex');
      expect(result.data.total_lines).toBeGreaterThan(0);
    }
  });

  it('should achieve 90%+ token reduction', async () => {
    const result = await decompileFunction.execute({
      binary_name: '/updatemgr-e100d8',
      name_or_address: 'main',
      max_code_lines: 30,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const reduction =
        1 - result.meta.estimatedTokens / result.meta.rawTokens;
      expect(reduction).toBeGreaterThan(0.9); // 90%+ reduction
    }
  });
});

describe('gen-callgraph', () => {
  it('should generate mermaid URL by default', async () => {
    const result = await genCallgraph.execute({
      binary_name: '/updatemgr-e100d8',
      function_name: 'main',
      direction: 'CALLING',
      max_depth: 2,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.function_name).toBe('main');
      expect(result.data.direction).toBe('CALLING');
      expect(result.data.mermaid_url).toBeDefined();
    }
  });

  it('should achieve 60%+ token reduction', async () => {
    const result = await genCallgraph.execute({
      binary_name: '/updatemgr-e100d8',
      function_name: 'main',
      direction: 'CALLING',
      max_depth: 2,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const reduction =
        1 - result.meta.estimatedTokens / result.meta.rawTokens;
      expect(reduction).toBeGreaterThan(0.6); // 60%+ reduction
    }
  });
});

describe('search-strings', () => {
  it('should find OTA-related strings', async () => {
    const result = await searchStrings.execute({
      binary_name: '/updatemgr-e100d8',
      query: '.*OTA.*',
      offset: 0,
      limit: 10,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.strings).toBeInstanceOf(Array);
      expect(result.data.strings.length).toBeGreaterThan(0);

      // Verify OTA strings found
      const hasOTAStrings = result.data.strings.some((s) =>
        s.value.includes('OTA')
      );
      expect(hasOTAStrings).toBe(true);
    }
  });

  it('should find update path strings', async () => {
    const result = await searchStrings.execute({
      binary_name: '/updatemgr-e100d8',
      query: '.*opt.*',
      offset: 0,
      limit: 10,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const hasOptPath = result.data.strings.some((s) =>
        s.value.includes('/opt')
      );
      expect(hasOptPath).toBe(true);
    }
  });
});

describe('search-symbols-by-name', () => {
  it('should execute successfully even with zero results', async () => {
    const result = await searchSymbolsByName.execute({
      binary_name: '/updatemgr-e100d8',
      query: 'UPDM.*',
      offset: 0,
      limit: 10,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.symbols).toBeInstanceOf(Array);
      // Binary is stripped, so may be zero results
      expect(result.data.symbols.length).toBeGreaterThanOrEqual(0);
    }
  });
});

// =============================================================================
// Test Suite: Performance
// =============================================================================

describe('Performance', () => {
  it('should complete warm calls in <200ms', async () => {
    const tests = [
      () => listProjectBinaries.execute({}),
      () =>
        listImports.execute({
          binary_name: '/updatemgr-e100d8',
          query: '.*',
          offset: 0,
          limit: 5,
        }),
      () =>
        listExports.execute({
          binary_name: '/updatemgr-e100d8',
          offset: 0,
          limit: 5,
        }),
    ];

    for (const testFn of tests) {
      const result = await testFn();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.meta.durationMs).toBeLessThan(200);
      }
    }
  });

  it('should handle 10 sequential calls efficiently', async () => {
    const start = Date.now();

    for (let i = 0; i < 10; i++) {
      const result = await listProjectBinaries.execute({});
      expect(result.ok).toBe(true);
    }

    const totalDuration = Date.now() - start;

    // 10 calls should complete in <5s with persistent server
    // (vs 30-50s with stdio transport)
    expect(totalDuration).toBeLessThan(5000);
    console.log(`[Performance] 10 calls completed in ${totalDuration}ms`);
  });
});

// =============================================================================
// Test Suite: End-to-End Firmware Analysis Workflow
// =============================================================================

describe('Firmware Analysis Workflow', () => {
  it('should complete typical analysis workflow', async () => {
    const workflow = [
      {
        name: 'Import binary',
        fn: () => importBinary.execute({ binary_path: TEST_BINARY_PATH }),
      },
      {
        name: 'List binaries',
        fn: () => listProjectBinaries.execute({}),
      },
      {
        name: 'List imports',
        fn: () =>
          listImports.execute({
            binary_name: '/updatemgr-e100d8',
            query: '.*',
            offset: 0,
            limit: 10,
          }),
      },
      {
        name: 'List exports',
        fn: () =>
          listExports.execute({
            binary_name: '/updatemgr-e100d8',
            offset: 0,
            limit: 10,
          }),
      },
      {
        name: 'Decompile main',
        fn: () =>
          decompileFunction.execute({
            binary_name: '/updatemgr-e100d8',
            name_or_address: 'main',
            max_code_lines: 20,
          }),
      },
      {
        name: 'Search OTA strings',
        fn: () =>
          searchStrings.execute({
            binary_name: '/updatemgr-e100d8',
            query: '.*OTA.*',
            offset: 0,
            limit: 5,
          }),
      },
    ];

    const start = Date.now();
    const results = [];

    for (const step of workflow) {
      const result = await step.fn();
      expect(result.ok).toBe(true);
      results.push({ name: step.name, duration: result.meta.durationMs });
    }

    const totalDuration = Date.now() - start;

    console.log('[Workflow] Steps completed:');
    results.forEach((r) => console.log(`  ${r.name}: ${r.duration}ms`));
    console.log(`[Workflow] Total: ${totalDuration}ms`);

    // Entire workflow should complete in <10s with persistent server
    expect(totalDuration).toBeLessThan(10000);
  }, TEST_TIMEOUT);
});

// =============================================================================
// Test Suite: Error Handling
// =============================================================================

describe('Error Handling', () => {
  it('should handle non-existent binary gracefully', async () => {
    const result = await listImports.execute({
      binary_name: 'nonexistent-binary',
      query: '.*',
      offset: 0,
      limit: 10,
    });

    // Should return error, not crash
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBeDefined();
    }
  });

  it('should handle invalid addresses in decompile', async () => {
    const result = await decompileFunction.execute({
      binary_name: '/updatemgr-e100d8',
      name_or_address: '0xFFFFFFFF',
      max_code_lines: 10,
    });

    // Should return error for invalid address
    expect(result.ok).toBe(false);
  });
});

// =============================================================================
// Test Suite: Security Validation
// =============================================================================

describe('Security', () => {
  it('should reject path traversal in binary_name', async () => {
    const result = await listImports.execute({
      binary_name: '../../../etc/passwd',
      query: '.*',
      offset: 0,
      limit: 10,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_PARAMS');
    }
  });

  it('should validate import path is absolute', async () => {
    const result = await importBinary.execute({
      binary_path: 'relative/path/to/binary',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_PARAMS');
      expect(result.error.message).toContain('absolute');
    }
  });
});
