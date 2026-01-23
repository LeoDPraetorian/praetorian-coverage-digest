/**
 * Unit tests for list_exports wrapper
 *
 * Test Plan: 31 tests across 6 categories
 * _ Input Validation (8 tests)
 * _ MCP Integration (3 tests)
 * _ Response Filtering (4 tests)
 * _ Security (7 tests) 🔴 CRITICAL: ReDoS protection
 * _ Edge Cases (5 tests)
 * _ Error Handling (4 tests)
 *
 * Coverage Target: ≥80% line/branch/function
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';

// Mock MCP client before any imports
vi.mock('../config/lib/mcp_client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { callMCPTool } from '../config/lib/mcp_client.js';

// Test data helpers
interface RawExport {
  name: string;
  address: string;
  type?: string;
  ordinal?: number; // Should be omitted in output
  internal_id?: string; // Should be omitted in output
}

interface RawListExportsResponse {
  exports: RawExport[];
  total_count: number;
  matching_count?: number;
}

/**
 * Create a mock export with defaults
 */
function createMockExport(overrides?: Partial<RawExport>): RawExport {
  return {
    name: 'CreateFileA',
    address: '0x00401000',
    type: 'function',
    ordinal: 42, // Should be filtered out
    internal_id: 'abc123', // Should be filtered out
    ...overrides,
  };
}

/**
 * Create a mock MCP response with multiple exports
 */
function createMockMcpResponse(
  count: number,
  total: number,
  matching?: number
): RawListExportsResponse {
  return {
    exports: Array.from({ length: count }, (_, i) =>
      createMockExport({
        name: `export_${i}`,
        address: `0x${(0x1000 + i).toString(16)}`,
      })
    ),
    total_count: total,
    matching_count: matching,
  };
}

const mockCallMCPTool = callMCPTool as MockedFunction<typeof callMCPTool>;

describe('list_exports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Input Validation Tests', () => {
    it('1.1: rejects empty binary_name', async () => {
      const { listExports } = await import('./list-exports.js');

      await expect(
        listExports.execute({
          binary_name: '',
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/binary.*name.*required/i);
    });

    it('1.2: rejects binary_name with path traversal', async () => {
      const { listExports } = await import('./list-exports.js');

      await expect(
        listExports.execute({
          binary_name: '../etc/passwd',
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/path traversal|invalid.*binary.*name/i);
    });

    it('1.3: rejects binary_name with control characters', async () => {
      const { listExports } = await import('./list-exports.js');

      await expect(
        listExports.execute({
          binary_name: 'binary\x00.dll',
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/control character/i);
    });

    it('1.4: accepts valid binary_name with allowed characters', async () => {
      const { listExports } = await import('./list-exports.js');

      mockCallMCPTool.mockResolvedValue(createMockMcpResponse(0, 0));

      const result = await listExports.execute({
        binary_name: 'fw@v1.2.3_beta_release.bin',
        offset: 0,
        limit: 25,
      });

      expect(result).toBeDefined();
      expect(mockCallMCPTool).toHaveBeenCalled();
    });

    it('1.5: rejects limit below minimum (0)', async () => {
      const { listExports } = await import('./list-exports.js');

      await expect(
        listExports.execute({
          binary_name: 'kernel32.dll',
          offset: 0,
          limit: 0,
        })
      ).rejects.toThrow(/limit.*between.*1.*500/i);
    });

    it('1.6: rejects limit above maximum (501)', async () => {
      const { listExports } = await import('./list-exports.js');

      await expect(
        listExports.execute({
          binary_name: 'kernel32.dll',
          offset: 0,
          limit: 501,
        })
      ).rejects.toThrow(/limit.*between.*1.*500/i);
    });

    it('1.7: rejects negative offset', async () => {
      const { listExports } = await import('./list-exports.js');

      await expect(
        listExports.execute({
          binary_name: 'kernel32.dll',
          offset: _1,
          limit: 25,
        })
      ).rejects.toThrow(/offset.*non_negative/i);
    });

    it('1.8: rejects offset above maximum (100001)', async () => {
      const { listExports } = await import('./list-exports.js');

      await expect(
        listExports.execute({
          binary_name: 'kernel32.dll',
          offset: 100001,
          limit: 25,
        })
      ).rejects.toThrow(/offset.*exceeds maximum|offset.*max/i);
    });
  });

  describe('2. MCP Integration Tests', () => {
    it('2.1: passes server_side pagination parameters to MCP', async () => {
      const { listExports } = await import('./list-exports.js');

      mockCallMCPTool.mockResolvedValue(createMockMcpResponse(50, 1500));

      await listExports.execute({
        binary_name: 'kernel32.dll',
        offset: 100,
        limit: 50,
      });

      expect(mockCallMCPTool).toHaveBeenCalledWith(
        'pyghidra',
        'list_exports',
        expect.objectContaining({
          binary_name: 'kernel32.dll',
          query: undefined,
          offset: 100,
          limit: 50,
        }),
        expect.any(Object)
      );
    });

    it('2.2: passes query parameter to MCP for server_side filtering', async () => {
      const { listExports } = await import('./list-exports.js');

      mockCallMCPTool.mockResolvedValue(createMockMcpResponse(12, 1500, 12));

      await listExports.execute({
        binary_name: 'kernel32.dll',
        query: '^SSL_',
        offset: 0,
        limit: 25,
      });

      expect(mockCallMCPTool).toHaveBeenCalledWith(
        'pyghidra',
        'list_exports',
        expect.objectContaining({
          binary_name: 'kernel32.dll',
          query: '^SSL_',
          offset: 0,
          limit: 25,
        }),
        expect.any(Object)
      );
    });

    it('2.3: respects MCP pagination (does not fetch_all_then_filter)', async () => {
      const { listExports } = await import('./list-exports.js');

      mockCallMCPTool.mockResolvedValue(createMockMcpResponse(25, 1500));

      const result = await listExports.execute({
        binary_name: 'kernel32.dll',
        offset: 0,
        limit: 25,
      });

      expect(result.items).toHaveLength(25);
      expect(mockCallMCPTool).toHaveBeenCalledTimes(1); // Only one MCP call
    });
  });

  describe('3. Response Filtering Tests', () => {
    it('3.1: filters response to minimal schema (omits ordinal, internal_id)', async () => {
      const { listExports } = await import('./list-exports.js');

      const mockResponse: RawListExportsResponse = {
        exports: [
          {
            name: 'CreateFileA',
            address: '0x00401000',
            type: 'function',
            ordinal: 42, // Should be omitted
            internal_id: 'abc123', // Should be omitted
          },
        ],
        total_count: 1500,
      };

      mockCallMCPTool.mockResolvedValue(mockResponse);

      const result = await listExports.execute({
        binary_name: 'kernel32.dll',
        offset: 0,
        limit: 25,
      });

      // Verify essential fields are present
      expect(result.items[0]).toEqual({
        name: 'CreateFileA',
        address: '0x00401000',
        type: 'function',
      });

      // Verify redundant fields are omitted
      expect(result.items[0]).not.toHaveProperty('ordinal');
      expect(result.items[0]).not.toHaveProperty('internal_id');
    });

    it('3.2: includes accurate pagination metadata', async () => {
      const { listExports } = await import('./list-exports.js');

      mockCallMCPTool.mockResolvedValue(createMockMcpResponse(25, 1500, 1500));

      const result = await listExports.execute({
        binary_name: 'kernel32.dll',
        offset: 0,
        limit: 25,
      });

      expect(result.summary).toEqual({
        total: 1500,
        totalMatching: 1500,
        returned: 25,
        hasMore: true, // 1500 > 0 + 25
        offset: 0,
        limit: 25,
      });
    });

    it('3.3: achieves 97% token reduction through pagination', async () => {
      const { listExports } = await import('./list-exports.js');

      const exports = Array.from({ length: 25 }, (_, i) =>
        createMockExport({
          name: `export_function_${i}`,
          address: `0x${(0x1000 + i * 16).toString(16)}`,
          type: 'function',
        })
      );

      mockCallMCPTool.mockResolvedValue({
        exports,
        total_count: 1500,
      });

      const result = await listExports.execute({
        binary_name: 'kernel32.dll',
        offset: 0,
        limit: 25,
      });

      // Expected: ~900 tokens (25 exports)
      // Unfiltered would be: ~45,000 tokens (1500 exports)
      // Reduction: 97%
      expect(result.estimatedTokens).toBeLessThan(1000);
      expect(result.estimatedTokens).toBeGreaterThan(800);
    });

    it('3.4: includes estimatedTokens field in response', async () => {
      const { listExports } = await import('./list-exports.js');

      mockCallMCPTool.mockResolvedValue(createMockMcpResponse(0, 0));

      const result = await listExports.execute({
        binary_name: 'kernel32.dll',
        offset: 0,
        limit: 25,
      });

      expect(result).toHaveProperty('estimatedTokens');
      expect(typeof result.estimatedTokens).toBe('number');
    });
  });

  describe('4. Security Tests 🔴 CRITICAL', () => {
    it('4.1: rejects query with nested quantifiers (ReDoS)', async () => {
      const { listExports } = await import('./list-exports.js');

      await expect(
        listExports.execute({
          binary_name: 'kernel32.dll',
          query: '(a+)+b', // Nested quantifiers cause catastrophic backtracking
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/unsafe.*regex.*pattern|redos/i);
    });

    it('4.2: rejects query with multiple greedy wildcards (ReDoS)', async () => {
      const { listExports } = await import('./list-exports.js');

      await expect(
        listExports.execute({
          binary_name: 'kernel32.dll',
          query: '.*.*.*SSL', // Multiple greedy wildcards
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/unsafe.*regex.*pattern|redos/i);
    });

    it('4.3: rejects query with deeply nested groups (ReDoS)', async () => {
      const { listExports } = await import('./list-exports.js');

      await expect(
        listExports.execute({
          binary_name: 'kernel32.dll',
          query: '((((SSL_))))', // 4+ nested groups
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/unsafe.*regex.*pattern|redos/i);
    });

    it('4.4: rejects query exceeding 128 character limit', async () => {
      const { listExports } = await import('./list-exports.js');

      const longQuery = 'A'.repeat(129);

      await expect(
        listExports.execute({
          binary_name: 'kernel32.dll',
          query: longQuery,
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/regex.*query.*too long|max.*128/i);
    });

    it('4.5: rejects query with control characters', async () => {
      const { listExports } = await import('./list-exports.js');

      await expect(
        listExports.execute({
          binary_name: 'kernel32.dll',
          query: 'SSL_\x00Init', // Null byte
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/control character/i);
    });

    it('4.6: rejects binary_name with path separator', async () => {
      const { listExports } = await import('./list-exports.js');

      await expect(
        listExports.execute({
          binary_name: 'kernel32/evil.dll',
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/path traversal|invalid.*binary.*name/i);
    });

    it('4.7: rejects binary_name exceeding 255 characters', async () => {
      const { listExports } = await import('./list-exports.js');

      const longName = 'a'.repeat(256) + '.dll';

      await expect(
        listExports.execute({
          binary_name: longName,
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/binary.*name.*too long|max.*255/i);
    });
  });

  describe('5. Edge Cases', () => {
    it('5.1: returns empty array when no exports match query', async () => {
      const { listExports } = await import('./list-exports.js');

      mockCallMCPTool.mockResolvedValue({
        exports: [],
        total_count: 1500,
        matching_count: 0,
      });

      const result = await listExports.execute({
        binary_name: 'kernel32.dll',
        query: '^NoSuchFunction',
        offset: 0,
        limit: 25,
      });

      expect(result.items).toEqual([]);
      expect(result.summary).toEqual({
        total: 1500,
        totalMatching: 0,
        returned: 0,
        hasMore: false,
        offset: 0,
        limit: 25,
      });
    });

    it('5.2: returns empty array when binary has no exports', async () => {
      const { listExports } = await import('./list-exports.js');

      mockCallMCPTool.mockResolvedValue({
        exports: [],
        total_count: 0,
      });

      const result = await listExports.execute({
        binary_name: 'stripped_binary.elf',
        offset: 0,
        limit: 25,
      });

      expect(result.items).toEqual([]);
      expect(result.summary.total).toBe(0);
    });

    it('5.3: handles offset beyond total count (returns empty array)', async () => {
      const { listExports } = await import('./list-exports.js');

      mockCallMCPTool.mockResolvedValue({
        exports: [],
        total_count: 1500,
      });

      const result = await listExports.execute({
        binary_name: 'kernel32.dll',
        offset: 5000, // Beyond total
        limit: 25,
      });

      expect(result.items).toEqual([]);
      expect(result.summary).toEqual({
        total: 1500,
        returned: 0,
        hasMore: false,
        offset: 5000,
        limit: 25,
      });
    });

    it('5.4: handles invalid regex pattern (caught by validation)', async () => {
      const { listExports } = await import('./list-exports.js');

      await expect(
        listExports.execute({
          binary_name: 'kernel32.dll',
          query: '[unclosed', // Invalid regex syntax
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/invalid.*regex|regex.*pattern/i);
    });

    it('5.5: sets hasMore=false on last page', async () => {
      const { listExports } = await import('./list-exports.js');

      mockCallMCPTool.mockResolvedValue(createMockMcpResponse(10, 100));

      const result = await listExports.execute({
        binary_name: 'small.dll',
        offset: 90, // Last 10 exports
        limit: 25,
      });

      expect(result.summary.hasMore).toBe(false); // 100 <= 90 + 10
    });
  });

  describe('6. Error Handling Tests', () => {
    it('6.1: throws BinaryNotFoundError for non_existent binary', async () => {
      const { listExports } = await import('./list-exports.js');

      const error = new Error('Binary not found: kernel33.dll');
      (error as any).code = 'BINARY_NOT_FOUND';

      mockCallMCPTool.mockRejectedValue(error);

      await expect(
        listExports.execute({
          binary_name: 'kernel33.dll',
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/binary not found/i);
    });

    it('6.2: throws ValidationError for invalid regex from MCP', async () => {
      const { listExports } = await import('./list-exports.js');

      const error = new Error('invalid regex: unterminated group');
      mockCallMCPTool.mockRejectedValue(error);

      await expect(
        listExports.execute({
          binary_name: 'kernel32.dll',
          query: '(unterminated',
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/invalid.*regex|unterminated/i);
    });

    it('6.3: handles MCP timeout gracefully', async () => {
      const { listExports } = await import('./list-exports.js');

      const timeoutError = new Error('Operation timed out');
      (timeoutError as any).code = 'TIMEOUT';

      mockCallMCPTool.mockRejectedValue(timeoutError);

      await expect(
        listExports.execute({
          binary_name: 'huge_binary.exe',
          offset: 0,
          limit: 500,
        })
      ).rejects.toThrow(/timeout|timed out/i);
    });

    it('6.4: provides helpful error message with suggestions for typos', async () => {
      const { listExports } = await import('./list-exports.js');

      const error = new Error(
        'Binary not found: "kernl32.dll". Did you mean: kernel32.dll, kernelbase.dll?'
      );
      (error as any).code = 'BINARY_NOT_FOUND';
      (error as any).details = {
        suggestions: ['kernel32.dll', 'kernelbase.dll'],
      };

      mockCallMCPTool.mockRejectedValue(error);

      try {
        await listExports.execute({
          binary_name: 'kernl32.dll',
          offset: 0,
          limit: 25,
        });
        expect.fail('Should have thrown error');
      } catch (err) {
        const error = err as any;
        expect(error.message).toMatch(/did you mean.*kernel32\.dll/i);
      }
    });
  });
});
