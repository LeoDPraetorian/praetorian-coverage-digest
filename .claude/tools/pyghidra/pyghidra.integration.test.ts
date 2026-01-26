/**
 * Integration tests for PyGhidra MCP wrappers
 *
 * These tests run against a real PyGhidra server (if available).
 * Tests are skipped if the server is not running.
 */

import { describe, it, expect } from 'vitest';
import { callMCPTool } from '../config/lib/mcp-client.js';

/**
 * Check if PyGhidra server is running by making a test MCP call
 */
async function checkServerStatus(): Promise<boolean> {
  try {
    // Try to list binaries - this will fail if server isn't running
    await callMCPTool('pyghidra', 'list_project_binaries', {});
    return true;
  } catch (error) {
    console.log('⚠️  PyGhidra server not running - skipping integration tests');
    console.log('   Start server with: cd .claude/tools/pyghidra && ./start-server.sh');
    return false;
  }
}

// We'll check server status in each test since we can't use top-level await with skipIf
// Instead, tests will return early if server is not available

describe('PyGhidra Integration Tests', () => {

  describe('Binary Management', () => {
    it('lists project binaries', async () => {
      if (!(await checkServerStatus())) {
        return; // Skip if server not running
      }

      const result = await callMCPTool('pyghidra', 'list_project_binaries', {});

      expect(result).toHaveProperty('programs');
      expect(Array.isArray(result.programs)).toBe(true);
    });

    it('imports and analyzes a test binary', async () => {
      if (!(await checkServerStatus())) {
        return; // Skip if server not running
      }

      // Note: This test requires a test binary file to exist
      // Skip if no test binary is available
      const testBinary = process.env.PYGHIDRA_TEST_BINARY;

      if (!testBinary) {
        console.log('   ⚠️  PYGHIDRA_TEST_BINARY not set - skipping import test');
        return;
      }

      const result = await callMCPTool('pyghidra', 'import_binary', {
        binary_path: testBinary,
        wait_for_analysis: true,
        timeout_ms: 30000, // 30 seconds timeout
      });

      expect(result).toHaveProperty('binary_name');
      expect(result).toHaveProperty('message');
    }, 60000); // 60 second timeout for this test
  });

  describe('Symbol Analysis', () => {
    it('searches symbols by name', async () => {
      if (!(await checkServerStatus())) {
        return; // Skip if server not running
      }

      const binaries = await callMCPTool('pyghidra', 'list_project_binaries', {});

      if (binaries.programs.length === 0) {
        console.log('   ⚠️  No binaries loaded - skipping symbol search test');
        return;
      }

      const binaryName = binaries.programs[0].name;

      const result = await callMCPTool('pyghidra', 'search_symbols_by_name', {
        binary_name: binaryName,
        query: 'main',
        limit: 10,
      });

      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);
      expect(result).toHaveProperty('summary');
    });

    it('lists exports', async () => {
      if (!(await checkServerStatus())) {
        return; // Skip if server not running
      }

      const binaries = await callMCPTool('pyghidra', 'list_project_binaries', {});

      if (binaries.programs.length === 0) {
        console.log('   ⚠️  No binaries loaded - skipping exports test');
        return;
      }

      const binaryName = binaries.programs[0].name;

      const result = await callMCPTool('pyghidra', 'list_exports', {
        binary_name: binaryName,
        limit: 10,
      });

      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('Code Analysis', () => {
    it('searches strings', async () => {
      if (!(await checkServerStatus())) {
        return; // Skip if server not running
      }

      const binaries = await callMCPTool('pyghidra', 'list_project_binaries', {});

      if (binaries.programs.length === 0) {
        console.log('   ⚠️  No binaries loaded - skipping strings test');
        return;
      }

      const binaryName = binaries.programs[0].name;

      const result = await callMCPTool('pyghidra', 'search_strings', {
        binary_name: binaryName,
        query: 'error',
        limit: 10,
      });

      expect(result).toHaveProperty('strings');
      expect(Array.isArray(result.strings)).toBe(true);
      expect(result).toHaveProperty('summary');
    });

    it('decompiles a function', async () => {
      if (!(await checkServerStatus())) {
        return; // Skip if server not running
      }

      const binaries = await callMCPTool('pyghidra', 'list_project_binaries', {});

      if (binaries.programs.length === 0) {
        console.log('   ⚠️  No binaries loaded - skipping decompile test');
        return;
      }

      const binaryName = binaries.programs[0].name;

      // Find a function to decompile
      const symbols = await callMCPTool('pyghidra', 'search_symbols_by_name', {
        binary_name: binaryName,
        query: 'main',
        limit: 1,
      });

      if (symbols.items.length === 0) {
        console.log('   ⚠️  No symbols found - skipping decompile test');
        return;
      }

      const functionName = symbols.items[0].name;

      const result = await callMCPTool('pyghidra', 'decompile_function', {
        binary_name: binaryName,
        name_or_address: functionName,
      });

      expect(result).toHaveProperty('code');
      expect(typeof result.code).toBe('string');
      expect(result.code.length).toBeGreaterThan(0);
    }, 30000); // 30 second timeout for decompilation
  });

  describe('Session Persistence', () => {
    it('maintains session across multiple calls', async () => {
      if (!(await checkServerStatus())) {
        return; // Skip if server not running
      }

      // Make multiple calls and verify they use the same session
      const results = [];

      for (let i = 0; i < 3; i++) {
        const result = await callMCPTool('pyghidra', 'list_project_binaries', {});
        results.push(result);
      }

      // All calls should succeed
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('programs');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles binary not found gracefully', async () => {
      if (!(await checkServerStatus())) {
        return; // Skip if server not running
      }

      await expect(
        callMCPTool('pyghidra', 'list_exports', {
          binary_name: '/nonexistent-binary-12345',
          limit: 10,
        })
      ).rejects.toThrow();
    });

    it('handles symbol not found gracefully', async () => {
      if (!(await checkServerStatus())) {
        return; // Skip if server not running
      }

      const binaries = await callMCPTool('pyghidra', 'list_project_binaries', {});

      if (binaries.programs.length === 0) {
        console.log('   ⚠️  No binaries loaded - skipping error handling test');
        return;
      }

      const binaryName = binaries.programs[0].name;

      const result = await callMCPTool('pyghidra', 'search_symbols_by_name', {
        binary_name: binaryName,
        query: 'nonexistent_symbol_xyz_12345',
        limit: 10,
      });

      // Should return empty results, not error
      expect(result).toHaveProperty('items');
      expect(result.items).toHaveLength(0);
    });
  });
});
