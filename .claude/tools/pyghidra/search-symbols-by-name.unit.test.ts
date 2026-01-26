/**
 * Unit tests for search_symbols_by_name wrapper
 *
 * Test Plan: 27 tests across 6 categories
 * _ Input Validation (9 tests) 🔴 CRITICAL: query REQUIRED
 * _ MCP Integration (3 tests)
 * _ Response Filtering (3 tests)
 * _ Security (5 tests)
 * _ Edge Cases (4 tests)
 * _ Error Handling (3 tests)
 *
 * Coverage Target: ≥80% line/branch/function
 *
 * Key Differences from list_exports:
 * _ query parameter is REQUIRED (min 1 char)
 * _ Uses SearchQuerySchema (NOT regex _ no ReDoS tests)
 * _ Searches by symbol name (substring/pattern matching)
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';

// Mock MCP client before any imports
vi.mock('../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { callMCPTool } from '../config/lib/mcp-client.js';

// Test data helpers
interface RawSymbol {
  name: string;
  address: string;
  type?: string;
  internal_id?: string; // Should be omitted in output
}

interface RawSearchResponse {
  symbols: RawSymbol[];
  total_count: number;
  matching_count?: number;
}

/**
 * Create a mock symbol with defaults
 */
function createMockSymbol(overrides?: Partial<RawSymbol>): RawSymbol {
  return {
    name: 'CreateFileA',
    address: '0x00401000',
    type: 'function',
    internal_id: 'abc123', // Should be filtered out
    ...overrides,
  };
}

/**
 * Create a mock MCP response with multiple symbols
 */
function createMockMcpResponse(
  count: number,
  total: number,
  matching?: number
): RawSearchResponse {
  return {
    symbols: Array.from({ length: count }, (_, i) =>
      createMockSymbol({
        name: `symbol_${i}`,
        address: `0x${(0x1000 + i).toString(16)}`,
      })
    ),
    total_count: total,
    matching_count: matching,
  };
}

/**
 * Helper to mock successful MCP responses
 */
function mockMcpSuccess(symbols: RawSymbol[], total: number, matching?: number) {
  mockCallMCPTool.mockResolvedValueOnce({
    symbols,
    total_count: total,
    matching_count: matching ?? total,
  });
}

/**
 * Helper to mock MCP errors
 */
function mockMcpError(error: Error) {
  mockCallMCPTool.mockRejectedValueOnce(error);
}

const mockCallMCPTool = callMCPTool as MockedFunction<typeof callMCPTool>;

describe('search_symbols_by_name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Input Validation Tests (9 tests)', () => {
    it('1.1: rejects empty binary_name', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');

      await expect(
        searchSymbolsByName.execute({
          binary_name: '',
          query: 'malloc',
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/binary.*name.*required/i);
    });

    it('1.2: rejects binary_name with path traversal', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');

      await expect(
        searchSymbolsByName.execute({
          binary_name: '../etc/passwd',
          query: 'malloc',
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/invalid.*binary.*name|path.*traversal/i);
    });

    it('1.3: rejects binary_name with control characters', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');

      await expect(
        searchSymbolsByName.execute({
          binary_name: 'binary\x00.dll',
          query: 'malloc',
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/control.*character|invalid.*character/i);
    });

    it('1.4: accepts valid binary_name with allowed characters', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');
      mockMcpSuccess([], 0);

      await expect(
        searchSymbolsByName.execute({
          binary_name: 'fw@v1.2.3_beta_release.bin',
          query: 'malloc',
          offset: 0,
          limit: 25,
        })
      ).resolves.toBeDefined();
    });

    it('1.5: rejects empty query string (REQUIRED field)', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');

      await expect(
        searchSymbolsByName.execute({
          binary_name: 'kernel32.dll',
          query: '',
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/query.*required/i);
    });

    it('1.6: rejects query with control characters', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');

      await expect(
        searchSymbolsByName.execute({
          binary_name: 'kernel32.dll',
          query: 'malloc\x00test',
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/control.*character|invalid.*character/i);
    });

    it('1.7: rejects query exceeding 500 character limit', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');
      const longQuery = 'A'.repeat(501);

      await expect(
        searchSymbolsByName.execute({
          binary_name: 'kernel32.dll',
          query: longQuery,
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/query.*too.*long|max.*500/i);
    });

    it('1.8: rejects limit below minimum', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');

      await expect(
        searchSymbolsByName.execute({
          binary_name: 'kernel32.dll',
          query: 'malloc',
          offset: 0,
          limit: 0,
        })
      ).rejects.toThrow(/limit.*must.*be.*at.*least.*1/i);
    });

    it('1.9: rejects limit above maximum', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');

      await expect(
        searchSymbolsByName.execute({
          binary_name: 'kernel32.dll',
          query: 'malloc',
          offset: 0,
          limit: 101,
        })
      ).rejects.toThrow(/limit.*too.*large|max.*100/i);
    });
  });

  describe('2. MCP Integration Tests (3 tests)', () => {
    it('2.1: passes query parameter to MCP for server_side search', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');
      mockMcpSuccess([], 1500, 12);

      await searchSymbolsByName.execute({
        binary_name: 'kernel32.dll',
        query: 'CreateFile',
        offset: 0,
        limit: 25,
      });

      expect(mockCallMCPTool).toHaveBeenCalledWith('pyghidra', 'search_symbols_by_name', {
        binary_name: 'kernel32.dll',
        query: 'CreateFile',
        offset: 0,
        limit: 25,
      });
    });

    it('2.2: passes server_side pagination parameters to MCP', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');
      mockMcpSuccess([], 1500);

      await searchSymbolsByName.execute({
        binary_name: 'kernel32.dll',
        query: 'malloc',
        offset: 100,
        limit: 50,
      });

      expect(mockCallMCPTool).toHaveBeenCalledWith('pyghidra', 'search_symbols_by_name', {
        binary_name: 'kernel32.dll',
        query: 'malloc',
        offset: 100,
        limit: 50,
      });
    });

    it('2.3: respects MCP pagination (does not fetch_all_then_filter)', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');

      const symbols = Array.from({ length: 25 }, (_, i) => ({
        name: `symbol_${i}`,
        address: `0x${(0x1000 + i).toString(16)}`,
      }));
      mockMcpSuccess(symbols, 1500);

      const result = await searchSymbolsByName.execute({
        binary_name: 'kernel32.dll',
        query: 'symbol',
        offset: 0,
        limit: 25,
      });

      expect(result.items).toHaveLength(25);
      expect(mockCallMCPTool).toHaveBeenCalledTimes(1); // Only one MCP call
    });
  });

  describe('3. Response Filtering Tests (3 tests)', () => {
    it('3.1: filters response to minimal schema (omits internal_id)', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');

      mockMcpSuccess([
        {
          name: 'CreateFileA',
          address: '0x00401000',
          type: 'function',
          internal_id: 'abc123', // Should be omitted
        },
      ], 1500);

      const result = await searchSymbolsByName.execute({
        binary_name: 'kernel32.dll',
        query: 'CreateFile',
        offset: 0,
        limit: 25,
      });

      expect(result.items[0]).toEqual({
        name: 'CreateFileA',
        address: '0x00401000',
        type: 'function',
      });
      expect(result.items[0]).not.toHaveProperty('internal_id');
    });

    it('3.2: includes accurate pagination metadata', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');

      const symbols = Array.from({ length: 25 }, (_, i) => ({
        name: `malloc_${i}`,
        address: `0x${(0x1000 + i).toString(16)}`,
      }));
      mockMcpSuccess(symbols, 1500, 87); // total=1500, matching=87

      const result = await searchSymbolsByName.execute({
        binary_name: 'libc.so',
        query: 'malloc',
        offset: 0,
        limit: 25,
      });

      expect(result.summary).toEqual({
        total: 1500,
        totalMatching: 87,
        returned: 25,
        hasMore: true, // 87 > 0 + 25
        offset: 0,
        limit: 25,
      });
    });

    it('3.3: includes estimatedTokens field in response', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');
      mockMcpSuccess([], 0);

      const result = await searchSymbolsByName.execute({
        binary_name: 'kernel32.dll',
        query: 'CreateFile',
        offset: 0,
        limit: 25,
      });

      expect(result).toHaveProperty('estimatedTokens');
      expect(typeof result.estimatedTokens).toBe('number');
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });
  });

  describe('4. Security Tests (5 tests)', () => {
    it('4.1: rejects binary_name with path separator', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');

      await expect(
        searchSymbolsByName.execute({
          binary_name: 'kernel32/evil.dll',
          query: 'malloc',
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/invalid.*binary.*name|path.*separator/i);
    });

    it('4.2: rejects binary_name exceeding 255 characters', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');
      const longName = 'a'.repeat(256) + '.dll';

      await expect(
        searchSymbolsByName.execute({
          binary_name: longName,
          query: 'malloc',
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/binary.*name.*too.*long|max.*255/i);
    });

    it('4.3: rejects query with newline characters', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');

      await expect(
        searchSymbolsByName.execute({
          binary_name: 'kernel32.dll',
          query: 'malloc\ntest',
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/control.*character|invalid.*character/i);
    });

    it('4.4: rejects negative offset', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');

      await expect(
        searchSymbolsByName.execute({
          binary_name: 'kernel32.dll',
          query: 'malloc',
          offset: -1,
          limit: 25,
        })
      ).rejects.toThrow(/offset.*must.*be.*non.*negative/i);
    });

    it('4.5: rejects offset above maximum', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');

      await expect(
        searchSymbolsByName.execute({
          binary_name: 'kernel32.dll',
          query: 'malloc',
          offset: 100001,
          limit: 25,
        })
      ).rejects.toThrow(/offset.*too.*large/i);
    });
  });

  describe('5. Edge Cases Tests (4 tests)', () => {
    it('5.1: returns empty array when no symbols match query', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');
      mockMcpSuccess([], 1500, 0); // total=1500, matching=0

      const result = await searchSymbolsByName.execute({
        binary_name: 'kernel32.dll',
        query: 'NoSuchSymbol',
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

    it('5.2: handles offset beyond total count (returns empty array)', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');
      mockMcpSuccess([], 150); // total=150

      const result = await searchSymbolsByName.execute({
        binary_name: 'small.dll',
        query: 'malloc',
        offset: 200, // Beyond total
        limit: 25,
      });

      expect(result.items).toEqual([]);
      expect(result.summary).toMatchObject({
        total: 150,
        returned: 0,
        hasMore: false,
        offset: 200,
        limit: 25,
      });
    });

    it('5.3: sets hasMore=false on last page', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');

      const symbols = Array.from({ length: 10 }, (_, i) => ({
        name: `malloc_${i}`,
        address: `0x${(0x1000 + i).toString(16)}`,
      }));
      mockMcpSuccess(symbols, 100, 35); // total=100, matching=35

      const result = await searchSymbolsByName.execute({
        binary_name: 'libc.so',
        query: 'malloc',
        offset: 25, // Last 10 symbols
        limit: 25,
      });

      expect(result.summary.hasMore).toBe(false); // 35 <= 25 + 10
    });

    it('5.4: respects case sensitivity for symbol search', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');

      const symbols = [
        { name: 'CreateFileA', address: '0x1000', type: 'function' },
        { name: 'createFileA', address: '0x2000', type: 'function' },
      ];
      mockMcpSuccess(symbols, 2);

      await searchSymbolsByName.execute({
        binary_name: 'kernel32.dll',
        query: 'CreateFileA',
        offset: 0,
        limit: 25,
      });

      // Verify MCP handles case sensitivity (wrapper passes query as_is)
      expect(mockCallMCPTool).toHaveBeenCalledWith('pyghidra', 'search_symbols_by_name', {
        binary_name: 'kernel32.dll',
        query: 'CreateFileA',
        offset: 0,
        limit: 25,
      });
    });
  });

  describe('6. Error Handling Tests (3 tests)', () => {
    it('6.1: throws BinaryNotFoundError for non_existent binary', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');

      // Mock a "Binary not found" error from MCP
      mockMcpError(new Error('Binary not found: kernel33.dll'));

      await expect(
        searchSymbolsByName.execute({
          binary_name: 'kernel33.dll',
          query: 'malloc',
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/binary.*not.*found/i);
    });

    it('6.2: throws ValidationError for malformed input', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');

      await expect(
        searchSymbolsByName.execute({
          binary_name: 'kernel32.dll',
          query: '\x00', // Control character
          offset: 0,
          limit: 25,
        })
      ).rejects.toThrow(/control.*character|invalid.*character|validation/i);
    });

    it('6.3: handles MCP timeout gracefully', async () => {
      const { searchSymbolsByName } = await import('./search-symbols-by-name.js');

      mockMcpError(new Error('Operation timed out'));

      await expect(
        searchSymbolsByName.execute({
          binary_name: 'huge_binary.exe',
          query: 'symbol',
          offset: 0,
          limit: 100,
        })
      ).rejects.toThrow(/operation.*timed.*out|timeout/i);
    });
  });
});
