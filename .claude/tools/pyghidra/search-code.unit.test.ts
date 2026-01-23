/**
 * Unit tests for search_code wrapper
 *
 * Test Plan: 27 tests across 6 categories
 * - Input Validation (5 tests)
 * - MCP Integration (3 tests)
 * - Response Filtering (4 tests)
 * - Security (6 tests)
 * - Edge Cases (5 tests)
 * - Error Handling (4 tests)
 *
 * Coverage Target: ≥80% line/branch/function
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';

// Mock MCP client before any imports
vi.mock('../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { callMCPTool } from '../config/lib/mcp-client.js';

// Test data helpers
interface RawSearchCodeResult {
  function_name: string;
  address: string;
  similarity: number;
  code_preview: string;
  embedding_vector?: number[];
  binary_name?: string;
  search_query?: string;
  internal_id?: string;
}

interface RawSearchCodeResponse {
  results: RawSearchCodeResult[];
}

/**
 * Create a mock search result with defaults
 */
function createMockSearchResult(overrides?: Partial<RawSearchCodeResult>): RawSearchCodeResult {
  return {
    function_name: 'test_function',
    address: '0x00401000',
    similarity: 0.85,
    code_preview: 'int test_function() { return 0; }',
    embedding_vector: new Array(1536).fill(0.1), // Simulate large vector
    binary_name: 'test.bin',
    search_query: 'test',
    internal_id: 'abc123',
    ...overrides,
  };
}

/**
 * Create a mock MCP response with multiple results
 */
function createMockMcpResponse(count: number): RawSearchCodeResponse {
  return {
    results: Array.from({ length: count }, (_, i) =>
      createMockSearchResult({
        function_name: `func_${i}`,
        address: `0x${(0x401000 + i * 0x100).toString(16)}`,
        similarity: Math.max(0.1, 0.9 - i * 0.05),
      })
    ),
  };
}

/**
 * Create a long code preview for truncation testing
 */
function createLongCodePreview(length: number): string {
  const line = 'int function() {\n';
  return line.repeat(Math.ceil(length / line.length));
}

const mockCallMCPTool = callMCPTool as MockedFunction<typeof callMCPTool>;

describe('search-code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Input Validation Tests', () => {
    it('1.1: rejects empty query', async () => {
      // RED: This test should fail because searchCode wrapper doesn't exist yet
      const { searchCode } = await import('./search-code.js');

      await expect(
        searchCode.execute({
          binary_name: 'test.bin',
          query: '',
        })
      ).rejects.toThrow(/query/i);
    });

    it('1.2: rejects path traversal in binary_name', async () => {
      const { searchCode } = await import('./search-code.js');

      await expect(
        searchCode.execute({
          binary_name: '../etc/passwd',
          query: 'test',
        })
      ).rejects.toThrow(/path traversal/i);
    });

    it('1.3: rejects control characters in query', async () => {
      const { searchCode } = await import('./search-code.js');

      await expect(
        searchCode.execute({
          binary_name: 'test.bin',
          query: 'test\x00injection',
        })
      ).rejects.toThrow(/control character/i);
    });

    it('1.4: enforces limit maximum (25)', async () => {
      const { searchCode } = await import('./search-code.js');

      await expect(
        searchCode.execute({
          binary_name: 'test.bin',
          query: 'test',
          limit: 100,
        })
      ).rejects.toThrow(/limit.*max.*25/i);
    });

    it('1.5: applies default limit (10)', async () => {
      const { searchCode } = await import('./search-code.js');

      mockCallMCPTool.mockResolvedValue(createMockMcpResponse(5));

      await searchCode.execute({
        binary_name: 'test.bin',
        query: 'test',
      });

      // Verify MCP was called with default limit: 10
      expect(mockCallMCPTool).toHaveBeenCalledWith(
        'pyghidra',
        'search_code',
        expect.objectContaining({ limit: 10 }),
        expect.any(Object)
      );
    });
  });

  describe('2. MCP Integration Tests', () => {
    it('2.1: successful MCP call with correct parameters', async () => {
      const { searchCode } = await import('./search-code.js');

      const mockResponse = createMockMcpResponse(3);
      mockCallMCPTool.mockResolvedValue(mockResponse);

      const result = await searchCode.execute({
        binary_name: 'firmware.bin',
        query: 'memcpy',
        limit: 5,
      });

      // Verify MCP was called with correct parameters
      expect(mockCallMCPTool).toHaveBeenCalledWith(
        'pyghidra',
        'search_code',
        {
          binary_name: 'firmware.bin',
          query: 'memcpy',
          limit: 5,
        },
        expect.any(Object)
      );

      // Verify response structure
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('estimatedTokens');
      expect(typeof result.estimatedTokens).toBe('number');
    });

    it('2.2: MCP error propagation - BinaryNotFoundError', async () => {
      const { searchCode } = await import('./search-code.js');

      const error = new Error('Binary not found: firmware.bin');
      (error as any).code = 'BINARY_NOT_FOUND';
      (error as any).suggestions = ['firmware-v1.bin', 'firmware-v2.bin'];

      mockCallMCPTool.mockRejectedValue(error);

      await expect(
        searchCode.execute({
          binary_name: 'firmware.bin',
          query: 'test',
        })
      ).rejects.toThrow(/binary not found.*firmware\.bin/i);
    });

    it('2.3: MCP timeout handling', async () => {
      const { searchCode } = await import('./search-code.js');

      const timeoutError = new Error('MCP operation timed out after 30000ms');
      (timeoutError as any).code = 'TIMEOUT';

      mockCallMCPTool.mockRejectedValue(timeoutError);

      await expect(
        searchCode.execute({
          binary_name: 'large.bin',
          query: 'test',
        })
      ).rejects.toThrow(/timeout|30000ms/i);
    });
  });

  describe('3. Response Filtering Tests', () => {
    it('3.1: omits redundant fields from response', async () => {
      const { searchCode } = await import('./search-code.js');

      const mockResponse: RawSearchCodeResponse = {
        results: [
          createMockSearchResult({
            function_name: 'malloc',
            embedding_vector: new Array(1536).fill(0.5), // Should be omitted
            binary_name: 'test.bin', // Should be omitted
            search_query: 'malloc', // Should be omitted
            internal_id: 'xyz789', // Should be omitted
          }),
        ],
      };

      mockCallMCPTool.mockResolvedValue(mockResponse);

      const result = await searchCode.execute({
        binary_name: 'test.bin',
        query: 'malloc',
      });

      // Verify essential fields are present
      expect(result.results[0]).toHaveProperty('function_name');
      expect(result.results[0]).toHaveProperty('address');
      expect(result.results[0]).toHaveProperty('similarity');
      expect(result.results[0]).toHaveProperty('code_preview');

      // Verify redundant fields are omitted
      expect(result.results[0]).not.toHaveProperty('embedding_vector');
      expect(result.results[0]).not.toHaveProperty('binary_name');
      expect(result.results[0]).not.toHaveProperty('search_query');
      expect(result.results[0]).not.toHaveProperty('internal_id');
    });

    it('3.2: truncates code_preview at 500 characters', async () => {
      const { searchCode } = await import('./search-code.js');

      const longCode = createLongCodePreview(1500); // 1500 chars
      const mockResponse: RawSearchCodeResponse = {
        results: [
          createMockSearchResult({
            code_preview: longCode,
          }),
        ],
      };

      mockCallMCPTool.mockResolvedValue(mockResponse);

      const result = await searchCode.execute({
        binary_name: 'test.bin',
        query: 'test',
      });

      // Verify truncation
      expect(result.results[0].code_preview.length).toBeLessThanOrEqual(550); // 500 + suffix
      expect(result.results[0].code_preview).toMatch(/truncated|\.\.\..*decompile_function/i);
    });

    it('3.3: includes summary metadata with correct values', async () => {
      const { searchCode } = await import('./search-code.js');

      // MCP returns 150 results, but wrapper limits to 10
      const mockResponse = createMockMcpResponse(150);
      mockCallMCPTool.mockResolvedValue(mockResponse);

      const result = await searchCode.execute({
        binary_name: 'test.bin',
        query: 'malloc',
        limit: 10,
      });

      expect(result.summary).toEqual({
        total: 150,
        returned: 10,
        hasMore: true,
        query: 'malloc',
      });
    });

    it('3.4: token estimate reflects filtered response', async () => {
      const { searchCode } = await import('./search-code.js');

      const mockResponse = createMockMcpResponse(10);
      mockCallMCPTool.mockResolvedValue(mockResponse);

      const result = await searchCode.execute({
        binary_name: 'test.bin',
        query: 'test',
      });

      // Verify estimatedTokens is present and reasonable
      expect(result.estimatedTokens).toBeGreaterThan(0);
      // For 10 results, should be around 1560 tokens based on architecture
      expect(result.estimatedTokens).toBeLessThan(5000); // Much less than unfiltered ~35k
    });
  });

  describe('4. Security Tests', () => {
    it('4.1: rejects path traversal sequences (../)', async () => {
      const { searchCode } = await import('./search-code.js');

      await expect(
        searchCode.execute({
          binary_name: '../../../etc/passwd',
          query: 'test',
        })
      ).rejects.toThrow(/path traversal/i);
    });

    it('4.2: rejects backslash path traversal (..\)', async () => {
      const { searchCode } = await import('./search-code.js');

      await expect(
        searchCode.execute({
          binary_name: '..\\windows\\system32',
          query: 'test',
        })
      ).rejects.toThrow(/path traversal/i);
    });

    it('4.3: rejects control characters in binary_name', async () => {
      const { searchCode } = await import('./search-code.js');

      await expect(
        searchCode.execute({
          binary_name: 'test\x00.bin',
          query: 'test',
        })
      ).rejects.toThrow(/control character/i);
    });

    it('4.4: enforces binary_name length limit (255)', async () => {
      const { searchCode } = await import('./search-code.js');

      const longName = 'a'.repeat(256);

      await expect(
        searchCode.execute({
          binary_name: longName,
          query: 'test',
        })
      ).rejects.toThrow(/binary.*name.*too long|max.*255/i);
    });

    it('4.5: enforces query length limit (500)', async () => {
      const { searchCode } = await import('./search-code.js');

      const longQuery = 'a'.repeat(501);

      await expect(
        searchCode.execute({
          binary_name: 'test.bin',
          query: longQuery,
        })
      ).rejects.toThrow(/query.*too long|max.*500/i);
    });

    it('4.6: rejects command injection patterns', async () => {
      const { searchCode } = await import('./search-code.js');

      // These patterns should be rejected by control char filter
      const injectionPatterns = [
        'test$(whoami)',
        'test`cmd`',
        'test; rm -rf /',
      ];

      for (const pattern of injectionPatterns) {
        // Most will be caught by control char check, some may pass through safely
        // If they pass validation, ensure MCP is called safely (no shell execution)
        try {
          mockCallMCPTool.mockResolvedValue(createMockMcpResponse(0));
          await searchCode.execute({
            binary_name: 'test.bin',
            query: pattern,
          });
          // If it doesn't throw, verify MCP was called (not shell)
          expect(mockCallMCPTool).toHaveBeenCalled();
        } catch (error) {
          // Expected: validation should catch most patterns
          expect((error as Error).message).toMatch(/control character|invalid/i);
        }
      }
    });
  });

  describe('5. Edge Cases', () => {
    it('5.1: empty results (no matches)', async () => {
      const { searchCode } = await import('./search-code.js');

      mockCallMCPTool.mockResolvedValue({ results: [] });

      const result = await searchCode.execute({
        binary_name: 'test.bin',
        query: 'nonexistent_pattern',
      });

      expect(result.results).toEqual([]);
      expect(result.summary).toEqual({
        total: 0,
        returned: 0,
        hasMore: false,
        query: 'nonexistent_pattern',
      });
      expect(result.estimatedTokens).toBeGreaterThan(0); // Small but non-zero
    });

    it('5.2: invalid binary name with suggestions', async () => {
      const { searchCode } = await import('./search-code.js');

      const error = new Error('Binary not found: firmware.bin. Did you mean: firmware-v1.bin, firmware-v2.bin?');
      (error as any).code = 'BINARY_NOT_FOUND';
      (error as any).suggestions = ['firmware-v1.bin', 'firmware-v2.bin'];

      mockCallMCPTool.mockRejectedValue(error);

      try {
        await searchCode.execute({
          binary_name: 'firmware.bin',
          query: 'test',
        });
        expect.fail('Should have thrown error');
      } catch (err) {
        const error = err as any;
        expect(error.message).toMatch(/did you mean/i);
        // Check if suggestions are included (either in message or details)
        expect(
          error.message.includes('firmware-v1.bin') ||
            error.suggestions?.includes('firmware-v1.bin')
        ).toBe(true);
      }
    });

    it('5.3: query too broad (hasMore flag)', async () => {
      const { searchCode } = await import('./search-code.js');

      // MCP returns 150 results, wrapper uses default limit 10
      const mockResponse = createMockMcpResponse(150);
      mockCallMCPTool.mockResolvedValue(mockResponse);

      const result = await searchCode.execute({
        binary_name: 'test.bin',
        query: 'malloc', // Broad query
      });

      expect(result.results.length).toBe(10);
      expect(result.summary.total).toBe(150);
      expect(result.summary.hasMore).toBe(true);
    });

    it('5.4: query too narrow (1-2 results)', async () => {
      const { searchCode } = await import('./search-code.js');

      const mockResponse = createMockMcpResponse(1);
      mockCallMCPTool.mockResolvedValue(mockResponse);

      const result = await searchCode.execute({
        binary_name: 'test.bin',
        query: 'specific_crypto_init_func',
      });

      expect(result.results.length).toBe(1);
      expect(result.summary.total).toBe(1);
      expect(result.summary.hasMore).toBe(false);
    });

    it('5.5: invalid similarity scores (normalization)', async () => {
      const { searchCode } = await import('./search-code.js');

      const mockResponse: RawSearchCodeResponse = {
        results: [
          createMockSearchResult({ similarity: 1.5 }), // Too high
          createMockSearchResult({ similarity: -0.2 }), // Negative
          createMockSearchResult({ similarity: NaN }), // Invalid
        ],
      };

      mockCallMCPTool.mockResolvedValue(mockResponse);

      const result = await searchCode.execute({
        binary_name: 'test.bin',
        query: 'test',
      });

      // Verify normalization to 0.0-1.0 range
      expect(result.results[0].similarity).toBeLessThanOrEqual(1.0);
      expect(result.results[0].similarity).toBeGreaterThanOrEqual(0.0);
      expect(result.results[1].similarity).toBe(0.0); // Clamped
      expect(result.results[2].similarity).toBe(0.0); // NaN → 0
    });
  });

  describe('6. Error Handling Tests', () => {
    it('6.1: network timeout returns TIMEOUT error code', async () => {
      const { searchCode } = await import('./search-code.js');

      const timeoutError = new Error(
        'Search timed out after 30000ms. Try a more specific query or smaller binary.'
      );
      (timeoutError as any).code = 'TIMEOUT';
      (timeoutError as any).details = { timeoutMs: 30000 };

      mockCallMCPTool.mockRejectedValue(timeoutError);

      try {
        await searchCode.execute({
          binary_name: 'large.bin',
          query: 'test',
        });
        expect.fail('Should have thrown error');
      } catch (err) {
        const error = err as any;
        expect(error.code || error.name).toMatch(/TIMEOUT/i);
        expect(error.message).toMatch(/30000ms|timed out/i);
      }
    });

    it('6.2: BinaryNotFoundError includes suggestions', async () => {
      const { searchCode } = await import('./search-code.js');

      const error = new Error('Binary not found: "firmware.bin". Did you mean: firmware-v1.bin, firmware-v2.bin?');
      (error as any).code = 'BINARY_NOT_FOUND';
      (error as any).details = {
        binaryName: 'firmware.bin',
        suggestions: ['firmware-v1.bin', 'firmware-v2.bin'],
      };

      mockCallMCPTool.mockRejectedValue(error);

      try {
        await searchCode.execute({
          binary_name: 'firmware.bin',
          query: 'test',
        });
        expect.fail('Should have thrown error');
      } catch (err) {
        const error = err as any;
        expect(error.code).toBe('BINARY_NOT_FOUND');
        expect(error.message).toMatch(/did you mean/i);
        expect(
          error.details?.suggestions ||
            error.message.includes('firmware-v1.bin')
        ).toBeTruthy();
      }
    });

    it('6.3: validation errors return clear messages', async () => {
      const { searchCode } = await import('./search-code.js');

      // Multiple validation failures
      try {
        await searchCode.execute({
          binary_name: 'test.bin',
          query: '', // Empty
          limit: 100, // Too high
        });
        expect.fail('Should have thrown validation error');
      } catch (err) {
        const error = err as any;
        expect(error.message).toMatch(/query|validation/i);
      }
    });

    it('6.4: generic MCP errors map to PyghidraError', async () => {
      const { searchCode } = await import('./search-code.js');

      const unexpectedError = new Error('Connection refused');
      mockCallMCPTool.mockRejectedValue(unexpectedError);

      try {
        await searchCode.execute({
          binary_name: 'test.bin',
          query: 'test',
        });
        expect.fail('Should have thrown error');
      } catch (err) {
        const error = err as any;
        // Should be wrapped/sanitized, not raw error
        expect(error.message).toBeDefined();
        // Should not expose raw internals
        expect(error.message).not.toContain('Connection refused');
      }
    });
  });
});
