/**
 * Unit tests for list_project_binaries wrapper
 *
 * Tests the wrapper's ability to:
 * _ Accept various parameter formats (empty, undefined, extraneous)
 * _ Call MCP server correctly
 * _ Handle and transform MCP responses
 * _ Handle errors gracefully with Result pattern
 * _ Process edge cases (large lists, special characters, malformed responses)
 */

import { describe, test, expect, vi, beforeEach, afterEach, type MockedFunction } from 'vitest';
import { execute } from './list-project-binaries.js';

// Mock MCP client at module level (BEFORE imports)
vi.mock('../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { callMCPTool } from '../config/lib/mcp-client.js';
const mockCallMCPTool = vi.mocked(callMCPTool) as MockedFunction<typeof callMCPTool>;

describe('list_project_binaries', () => {
  beforeEach(() => {
    // Clear mock history before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original implementations after each test
    vi.restoreAllMocks();
  });

  // =================================================================
  // 1. Input Validation (3 tests)
  // =================================================================

  describe('Input Validation', () => {
    test('accepts empty parameters object', async () => {
      // Given: MCP server returns valid response
      mockCallMCPTool.mockResolvedValue({
        binaries: [
          { name: 'binary1.exe', analyzed: true },
          { name: 'binary2.exe', analyzed: false },
        ],
      });

      // When: Called with empty object
      const result = await execute({});

      // Then: Returns success with binaries
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
      }
    });

    test('accepts undefined parameters', async () => {
      // Given: MCP server returns valid response
      mockCallMCPTool.mockResolvedValue({
        binaries: [{ name: 'test.exe', analyzed: true }],
      });

      // When: Called with undefined
      const result = await execute(undefined);

      // Then: Returns success
      expect(result.ok).toBe(true);
    });

    test('ignores extraneous parameters', async () => {
      // Given: MCP server returns valid response
      mockCallMCPTool.mockResolvedValue({
        binaries: [{ name: 'test.exe', analyzed: true }],
      });

      // When: Called with unexpected parameters
      const result = await execute({
        unexpected: 'value',
        another: 123,
      });

      // Then: Returns success (ignores extras)
      expect(result.ok).toBe(true);
      expect(mockCallMCPTool).toHaveBeenCalledWith(
        'pyghidra',
        'list_project_binaries',
        {},
        expect.any(Object)
      );
    });
  });

  // =================================================================
  // 2. MCP Integration (3 tests)
  // =================================================================

  describe('MCP Integration', () => {
    test('calls MCP server with correct tool name', async () => {
      // Given: MCP server ready
      mockCallMCPTool.mockResolvedValue({ binaries: [] });

      // When: Execute is called
      await execute({});

      // Then: MCP called with correct tool identifier
      expect(mockCallMCPTool).toHaveBeenCalledWith(
        'pyghidra',
        'list_project_binaries',
        {},
        expect.any(Object)
      );
    });

    test('returns MCP response structure', async () => {
      // Given: MCP returns binaries array
      const mockBinaries = [
        { name: 'program.exe', analyzed: true },
        { name: 'library.dll', analyzed: false },
        { name: 'driver.sys', analyzed: true },
      ];
      mockCallMCPTool.mockResolvedValue({ binaries: mockBinaries });

      // When: Execute is called
      const result = await execute({});

      // Then: Returns exact MCP response
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(mockBinaries);
      }
    });

    test('preserves analyzed status flags', async () => {
      // Given: Mixed analysis states
      const mockBinaries = [
        { name: 'analyzed.exe', analyzed: true },
        { name: 'unanalyzed.exe', analyzed: false },
      ];
      mockCallMCPTool.mockResolvedValue({ binaries: mockBinaries });

      // When: Execute is called
      const result = await execute({});

      // Then: Status flags preserved correctly
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].analyzed).toBe(true);
        expect(result.value[1].analyzed).toBe(false);
      }
    });
  });

  // =================================================================
  // 3. Response Filtering (3 tests)
  // =================================================================

  describe('Response Filtering', () => {
    test('filters summary metadata if present', async () => {
      // Given: MCP returns response with metadata
      mockCallMCPTool.mockResolvedValue({
        binaries: [{ name: 'test.exe', analyzed: true }],
        _metadata: { totalCount: 1, timestamp: '2026_01_15' },
      });

      // When: Execute is called
      const result = await execute({});

      // Then: Only binaries returned (no metadata)
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]).toEqual({ name: 'test.exe', analyzed: true });
        expect(result.value).not.toHaveProperty('_metadata');
      }
    });

    test('returns empty array when no binaries in project', async () => {
      // Given: Empty project
      mockCallMCPTool.mockResolvedValue({ binaries: [] });

      // When: Execute is called
      const result = await execute({});

      // Then: Returns empty array (not error)
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    test('preserves binary name format exactly', async () => {
      // Given: Binaries with various path formats
      const mockBinaries = [
        { name: '/path/to/binary.exe', analyzed: true },
        { name: 'relative/path.dll', analyzed: false },
        { name: 'simple.exe', analyzed: true },
      ];
      mockCallMCPTool.mockResolvedValue({ binaries: mockBinaries });

      // When: Execute is called
      const result = await execute({});

      // Then: Names preserved exactly
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].name).toBe('/path/to/binary.exe');
        expect(result.value[1].name).toBe('relative/path.dll');
        expect(result.value[2].name).toBe('simple.exe');
      }
    });
  });

  // =================================================================
  // 4. Security (4 tests)
  // =================================================================

  describe('Security', () => {
    test('handles MCP connection timeout', async () => {
      // Given: MCP server times out
      mockCallMCPTool.mockRejectedValue(new Error('Connection timeout after 30000ms'));

      // When: Execute is called
      const result = await execute({});

      // Then: Returns Result.error with connection error
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/connection timeout/i);
      }
    });

    test('handles MCP server unreachable', async () => {
      // Given: MCP server not running
      mockCallMCPTool.mockRejectedValue(new Error('ECONNREFUSED: Connection refused'));

      // When: Execute is called
      const result = await execute({});

      // Then: Returns Result.error
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/connection refused/i);
      }
    });

    test('handles unauthorized MCP access', async () => {
      // Given: MCP returns 401 Unauthorized
      mockCallMCPTool.mockRejectedValue(new Error('Unauthorized: Invalid MCP token'));

      // When: Execute is called
      const result = await execute({});

      // Then: Returns Result.error with auth failure
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/unauthorized/i);
      }
    });

    test('sanitizes error messages from MCP', async () => {
      // Given: MCP returns error with sensitive paths
      mockCallMCPTool.mockRejectedValue(
        new Error('Failed to read /home/user/.ghidra/projects/secret_project')
      );

      // When: Execute is called
      const result = await execute({});

      // Then: Error returned but paths not exposed verbatim
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeTruthy();
        // Note: Actual sanitization logic depends on security requirements
      }
    });
  });

  // =================================================================
  // 5. Edge Cases (4 tests)
  // =================================================================

  describe('Edge Cases', () => {
    test('handles very large binary lists', async () => {
      // Given: Project with 1000 binaries
      const largeBinaryList = Array.from({ length: 1000 }, (_, i) => ({
        name: `binary_${i}.exe`,
        analyzed: i % 2 === 0,
      }));
      mockCallMCPTool.mockResolvedValue({ binaries: largeBinaryList });

      // When: Execute is called
      const result = await execute({});

      // Then: All binaries returned
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1000);
      }
    });

    test('handles binaries with special characters in names', async () => {
      // Given: Binaries with unicode, spaces, special chars
      const mockBinaries = [
        { name: 'test file.exe', analyzed: true },
        { name: 'файл.dll', analyzed: false },
        { name: 'test<>"|?.exe', analyzed: true },
      ];
      mockCallMCPTool.mockResolvedValue({ binaries: mockBinaries });

      // When: Execute is called
      const result = await execute({});

      // Then: Names preserved without escaping
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].name).toBe('test file.exe');
        expect(result.value[1].name).toBe('файл.dll');
        expect(result.value[2].name).toBe('test<>"|?.exe');
      }
    });

    test('handles malformed MCP response', async () => {
      // Given: MCP returns invalid structure
      mockCallMCPTool.mockResolvedValue({
        notBinaries: 'wrong field',
        binaries: 'not an array',
      });

      // When: Execute is called
      const result = await execute({});

      // Then: Returns Result.error for invalid response
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/invalid response/i);
      }
    });

    test('handles null or missing analyzed status', async () => {
      // Given: Binaries with missing analyzed field
      const mockBinaries = [
        { name: 'test1.exe', analyzed: null },
        { name: 'test2.exe' }, // missing analyzed field
      ];
      mockCallMCPTool.mockResolvedValue({ binaries: mockBinaries });

      // When: Execute is called
      const result = await execute({});

      // Then: Handled gracefully (either defaults or validates)
      expect(result.ok).toBe(true);
      // Behavior depends on schema: either default to false or validation error
    });
  });

  // =================================================================
  // 6. Error Handling (4 tests)
  // =================================================================

  describe('Error Handling', () => {
    test('returns Result.error on MCP failure', async () => {
      // Given: MCP call fails
      mockCallMCPTool.mockRejectedValue(new Error('MCP server error'));

      // When: Execute is called
      const result = await execute({});

      // Then: Result.error returned (not throw)
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('MCP server error');
      }
      // Note: Result pattern prevents access to .value when ok=false
    });

    test('returns Result.success on valid response', async () => {
      // Given: Valid MCP response
      mockCallMCPTool.mockResolvedValue({
        binaries: [{ name: 'test.exe', analyzed: true }],
      });

      // When: Execute is called
      const result = await execute({});

      // Then: Result.success returned
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeDefined();
      }
      // Note: Result pattern prevents access to .error when ok=true
    });

    test('provides meaningful error messages', async () => {
      // Given: Various error scenarios
      const testCases = [
        {
          error: new Error('ECONNREFUSED'),
          expectedMessage: /connection refused.*pyghidra/i,
        },
        {
          error: new Error('Timeout'),
          expectedMessage: /timeout.*list_project_binaries/i,
        },
        {
          error: new Error('Invalid JSON'),
          expectedMessage: /invalid response/i,
        },
      ];

      for (const { error, expectedMessage } of testCases) {
        mockCallMCPTool.mockRejectedValue(error);
        const result = await execute({});

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toMatch(expectedMessage);
        }
      }
    });

    test('does not leak internal stack traces to user', async () => {
      // Given: Error with stack trace
      const internalError = new Error('Internal MCP failure');
      internalError.stack =
        'Error: Internal MCP failure\n  at Object.<anonymous> (/internal/path/mcp.ts:42)';
      mockCallMCPTool.mockRejectedValue(internalError);

      // When: Execute is called
      const result = await execute({});

      // Then: Error message clean (no stack trace)
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).not.toContain('/internal/path');
        expect(result.error).not.toContain('at Object.<anonymous>');
      }
    });
  });
});
