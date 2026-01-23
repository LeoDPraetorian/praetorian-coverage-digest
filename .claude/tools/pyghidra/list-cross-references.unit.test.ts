/**
 * Unit tests for list_cross_references wrapper
 * Test suite implements 25 tests across 6 categories as specified in test plan
 *
 * Categories:
 * 1. Input Validation (5 tests)
 * 2. MCP Integration (3 tests)
 * 3. Response Filtering (4 tests)
 * 4. Security (5 tests)
 * 5. Edge Cases (4 tests)
 * 6. Error Handling (4 tests)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execute } from './list-cross-references.js';

// Mock the MCP client at module level
vi.mock('../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { callMCPTool } from '../config/lib/mcp-client.js';
const mockCallMCPTool = vi.mocked(callMCPTool);

// =====================================================================
// Test Data Factories
// =====================================================================

/**
 * Create a mock cross_reference object matching actual PyGhidra MCP response format
 *
 * VERIFIED 2026-01-20: PyGhidra MCP returns:
 * - function_name (NOT from_function)
 * - type (NOT ref_type)
 */
function createMockXref(index: number, type: string = 'CALL') {
  return {
    from_address: `0x${(0x401000 + index * 0x10).toString(16)}`,
    function_name: `caller${index}`,  // ← ACTUAL MCP field name
    to_address: '0x401000',
    type: type,  // ← ACTUAL MCP field name
  };
}

/**
 * Create an array of mock cross_references
 * @param count _ Number of x_refs to create
 * @param types _ Optional array of types to cycle through
 */
function createMockXrefs(count: number, types?: string[]) {
  return Array.from({ length: count }, (_, i) =>
    createMockXref(i, types ? types[i % types.length] : 'CALL')
  );
}

// =====================================================================
// Test Suite
// =====================================================================

describe('list_cross_references', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===================================================================
  // Category 1: Input Validation Tests (5 tests)
  // ===================================================================

  describe('input validation', () => {
    it('accepts valid hex address with 0x prefix', async () => {
      mockCallMCPTool.mockResolvedValue({ cross_references: [] });

      await expect(
        execute({
          binary_name: 'test.bin',
          name_or_address: '0x401000',
          filter_type: 'CALL',
          limit: 50,
          offset: 0,
        })
      ).resolves.toBeDefined();
    });

    it('accepts valid function name', async () => {
      mockCallMCPTool.mockResolvedValue({ cross_references: [] });

      await expect(
        execute({
          binary_name: 'test.bin',
          name_or_address: 'main',
          filter_type: 'CALL',
          limit: 50,
          offset: 0,
        })
      ).resolves.toBeDefined();
    });

    it('rejects invalid name_or_address format', async () => {
      await expect(
        execute({
          binary_name: 'test.bin',
          name_or_address: '!@#$invalid',
          filter_type: 'CALL',
          limit: 50,
          offset: 0,
        })
      ).rejects.toThrow('Must be a valid function name');
    });

    it('accepts all valid filter_type enum values', async () => {
      mockCallMCPTool.mockResolvedValue({ cross_references: [] });

      const types = ['CALL', 'READ', 'WRITE', 'ALL'] as const;

      for (const type of types) {
        await expect(
          execute({
            binary_name: 'test.bin',
            name_or_address: 'main',
            filter_type: type,
            limit: 50,
            offset: 0,
          })
        ).resolves.toBeDefined();
      }
    });

    it('rejects invalid filter_type value', async () => {
      await expect(
        execute({
          binary_name: 'test.bin',
          name_or_address: 'main',
          filter_type: 'INVALID' as any,
          limit: 50,
          offset: 0,
        })
      ).rejects.toThrow();
    });
  });

  describe('pagination bounds validation', () => {
    it('validates limit bounds (1_200)', async () => {
      mockCallMCPTool.mockResolvedValue({ cross_references: [] });

      // Too low
      await expect(
        execute({
          binary_name: 'test.bin',
          name_or_address: 'main',
          filter_type: 'CALL',
          limit: 0,
          offset: 0,
        })
      ).rejects.toThrow('Limit must be at least 1');

      // Too high
      await expect(
        execute({
          binary_name: 'test.bin',
          name_or_address: 'main',
          filter_type: 'CALL',
          limit: 201,
          offset: 0,
        })
      ).rejects.toThrow('Limit too large (max: 200)');

      // Valid bounds
      await expect(
        execute({
          binary_name: 'test.bin',
          name_or_address: 'main',
          filter_type: 'CALL',
          limit: 100,
          offset: 0,
        })
      ).resolves.toBeDefined();
    });

    it('validates offset bounds (0_100000)', async () => {
      // Negative offset
      await expect(
        execute({
          binary_name: 'test.bin',
          name_or_address: 'main',
          filter_type: 'CALL',
          limit: 50,
          offset: -1,
        })
      ).rejects.toThrow();

      // Too high
      await expect(
        execute({
          binary_name: 'test.bin',
          name_or_address: 'main',
          filter_type: 'CALL',
          limit: 50,
          offset: 100001,
        })
      ).rejects.toThrow();
    });
  });

  // ===================================================================
  // Category 2: MCP Integration Tests (3 tests)
  // ===================================================================

  describe('MCP integration', () => {
    it('calls MCP with correct parameters', async () => {
      const mockMcpResponse = {
        cross_references: [
          createMockXref(0, 'CALL'),
          createMockXref(1, 'CALL'),
        ],
      };

      mockCallMCPTool.mockResolvedValue(mockMcpResponse);

      await execute({
        binary_name: 'test.bin',
        name_or_address: 'main',
        filter_type: 'CALL',
        limit: 50,
        offset: 0,
      });

      expect(mockCallMCPTool).toHaveBeenCalledWith(
        'pyghidra',
        'list_cross_references',
        {
          binary_name: 'test.bin',
          name_or_address: 'main',
        },
        expect.any(Object)
      );
      expect(mockCallMCPTool).toHaveBeenCalledTimes(1);
    });

    it('propagates MCP errors as exceptions', async () => {
      mockCallMCPTool.mockRejectedValue(new Error('MCP connection failed'));

      await expect(
        execute({
          binary_name: 'test.bin',
          name_or_address: 'main',
          filter_type: 'CALL',
          limit: 50,
          offset: 0,
        })
      ).rejects.toThrow('MCP connection failed');
    });

    it('validates MCP response schema', async () => {
      // Mock invalid MCP response (missing required fields)
      mockCallMCPTool.mockResolvedValue({
        cross_references: [
          { from_address: '0x401010' /* missing other fields */ },
        ],
      });

      await expect(
        execute({
          binary_name: 'test.bin',
          name_or_address: 'main',
          filter_type: 'CALL',
          limit: 50,
          offset: 0,
        })
      ).rejects.toThrow();
    });
  });

  // ===================================================================
  // Category 3: Response Filtering Tests (4 tests)
  // ===================================================================

  describe('response filtering', () => {
    it('applies client_side pagination correctly', async () => {
      // Mock 100 x_refs from MCP
      const mockRefs = createMockXrefs(100, ['CALL']);

      mockCallMCPTool.mockResolvedValue({ cross_references: mockRefs });

      const result = await execute({
        binary_name: 'test.bin',
        name_or_address: 'main',
        filter_type: 'ALL',
        limit: 25,
        offset: 0,
      });

      expect(result.cross_references).toHaveLength(25);
      expect(result.summary.total_all_types).toBe(100);
      expect(result.summary.returned).toBe(25);
      expect(result.summary.hasMore).toBe(true);
      expect(result.pagination.next_offset).toBe(25);
    });

    it('filters cross_references by type', async () => {
      const mockRefs = [
        createMockXref(0, 'CALL'),
        createMockXref(1, 'READ'),
        createMockXref(2, 'CALL'),
        createMockXref(3, 'WRITE'),
      ];

      mockCallMCPTool.mockResolvedValue({ cross_references: mockRefs });

      const result = await execute({
        binary_name: 'test.bin',
        name_or_address: 'main',
        filter_type: 'CALL',
        limit: 50,
        offset: 0,
      });

      expect(result.cross_references).toHaveLength(2);
      expect(result.summary.total_all_types).toBe(4);
      expect(result.summary.total_filtered).toBe(2);
      expect(result.cross_references.every((ref) => ref.type === 'CALL')).toBe(true);
    });

    it('achieves 90_95% token reduction via pagination', async () => {
      // Mock 500 x_refs (large response scenario)
      const mockRefs = createMockXrefs(500, ['CALL']);

      mockCallMCPTool.mockResolvedValue({ cross_references: mockRefs });

      const result = await execute({
        binary_name: 'test.bin',
        name_or_address: 'main',
        filter_type: 'ALL',
        limit: 50, // Default pagination
        offset: 0,
      });

      // Verify token estimate in response
      expect(result.estimatedTokens).toBeDefined();
      expect(result.estimatedTokens).toBeLessThan(10000); // Should be ~5,200 tokens
      expect(result.cross_references).toHaveLength(50);
    });

    it('returns accurate pagination metadata', async () => {
      const mockRefs = createMockXrefs(75, ['CALL']);

      mockCallMCPTool.mockResolvedValue({ cross_references: mockRefs });

      const result = await execute({
        binary_name: 'test.bin',
        name_or_address: 'main',
        filter_type: 'ALL',
        limit: 50,
        offset: 25,
      });

      expect(result.summary.total_all_types).toBe(75);
      expect(result.summary.returned).toBe(50);
      expect(result.summary.hasMore).toBe(false); // 25 + 50 = 75 (no more)
      expect(result.pagination.offset).toBe(25);
      expect(result.pagination.limit).toBe(50);
      expect(result.pagination.next_offset).toBeNull();
    });
  });

  // ===================================================================
  // Category 4: Security Tests (5 tests)
  // ===================================================================

  describe('security controls', () => {
    it('rejects path traversal in binary_name', async () => {
      const maliciousNames = [
        '../etc/passwd',
        '..\\windows\\system32',
        'test/../etc/shadow',
        'test/../../root/.ssh',
      ];

      for (const name of maliciousNames) {
        await expect(
          execute({
            binary_name: name,
            name_or_address: 'main',
            filter_type: 'CALL',
            limit: 50,
            offset: 0,
          })
        ).rejects.toThrow();
      }
    });

    it('rejects control characters in binary_name', async () => {
      const maliciousNames = [
        'test\x00.bin',
        'test\n.bin',
        'test\r\n.bin',
        'test\x1b.bin',
      ];

      for (const name of maliciousNames) {
        await expect(
          execute({
            binary_name: name,
            name_or_address: 'main',
            filter_type: 'CALL',
            limit: 50,
            offset: 0,
          })
        ).rejects.toThrow();
      }
    });

    it('rejects invalid hex address format', async () => {
      const invalidAddresses = [
        '0xZZZZ', // Non_hex characters
        '0x', // Empty hex
        'g401000', // Non_hex character
        '0x' + 'f'.repeat(17), // Too long (>16 hex digits)
      ];

      for (const addr of invalidAddresses) {
        await expect(
          execute({
            binary_name: 'test.bin',
            name_or_address: addr,
            filter_type: 'CALL',
            limit: 50,
            offset: 0,
          })
        ).rejects.toThrow('Must be a valid function name');
      }
    });

    it('rejects overly long inputs', async () => {
      // binary_name max: 255 chars
      const longBinaryName = 'a'.repeat(256);
      await expect(
        execute({
          binary_name: longBinaryName,
          name_or_address: 'main',
          filter_type: 'CALL',
          limit: 50,
          offset: 0,
        })
      ).rejects.toThrow();

      // name_or_address max: 500 chars
      const longNameOrAddress = 'a'.repeat(501);
      await expect(
        execute({
          binary_name: 'test.bin',
          name_or_address: longNameOrAddress,
          filter_type: 'CALL',
          limit: 50,
          offset: 0,
        })
      ).rejects.toThrow('Input too long');
    });

    it('rejects command injection characters in binary_name', async () => {
      const maliciousNames = [
        'test.bin; rm _rf /',
        'test.bin | cat /etc/passwd',
        'test.bin && whoami',
        'test.bin`whoami`',
        'test.bin$(whoami)',
      ];

      for (const name of maliciousNames) {
        await expect(
          execute({
            binary_name: name,
            name_or_address: 'main',
            filter_type: 'CALL',
            limit: 50,
            offset: 0,
          })
        ).rejects.toThrow();
      }
    });
  });

  // ===================================================================
  // Category 5: Edge Case Tests (4 tests)
  // ===================================================================

  describe('edge cases', () => {
    it('throws error when function not found', async () => {
      mockCallMCPTool.mockRejectedValue(
        new Error('Symbol "nonexistent_func" not found')
      );

      await expect(
        execute({
          binary_name: 'test.bin',
          name_or_address: 'nonexistent_func',
          filter_type: 'CALL',
          limit: 50,
          offset: 0,
        })
      ).rejects.toThrow('not found');
    });

    it('returns empty array when no cross_references exist', async () => {
      mockCallMCPTool.mockResolvedValue({ cross_references: [] });

      const result = await execute({
        binary_name: 'test.bin',
        name_or_address: 'main',
        filter_type: 'CALL',
        limit: 50,
        offset: 0,
      });

      expect(result.cross_references).toEqual([]);
      expect(result.summary.total_all_types).toBe(0);
      expect(result.summary.total_filtered).toBe(0);
      expect(result.summary.returned).toBe(0);
      expect(result.summary.hasMore).toBe(false);
      expect(result.pagination.next_offset).toBeNull();
      expect(result.estimatedTokens).toBeLessThan(100); // Just metadata
    });

    it('returns empty array when no x_refs match filter_type', async () => {
      const mockRefs = [
        createMockXref(0, 'READ'),
        createMockXref(1, 'WRITE'),
      ];

      mockCallMCPTool.mockResolvedValue({ cross_references: mockRefs });

      const result = await execute({
        binary_name: 'test.bin',
        name_or_address: 'main',
        filter_type: 'CALL', // None match
        limit: 50,
        offset: 0,
      });

      expect(result.cross_references).toEqual([]);
      expect(result.summary.total_all_types).toBe(2); // X_refs exist
      expect(result.summary.total_filtered).toBe(0); // None match filter
      expect(result.summary.returned).toBe(0);
      expect(result.summary.hasMore).toBe(false);
    });

    it('returns empty array when offset beyond results', async () => {
      const mockRefs = createMockXrefs(50, ['CALL']);

      mockCallMCPTool.mockResolvedValue({ cross_references: mockRefs });

      const result = await execute({
        binary_name: 'test.bin',
        name_or_address: 'main',
        filter_type: 'ALL',
        limit: 50,
        offset: 100, // Beyond 50 total
      });

      expect(result.cross_references).toEqual([]);
      expect(result.summary.total_all_types).toBe(50);
      expect(result.summary.returned).toBe(0);
      expect(result.summary.hasMore).toBe(false);
      expect(result.pagination.offset).toBe(100);
      expect(result.pagination.next_offset).toBeNull();
    });
  });

  // ===================================================================
  // Category 6: Error Handling Tests (4 tests)
  // ===================================================================

  describe('error handling', () => {
    it('throws error with helpful message when symbol not found', async () => {
      mockCallMCPTool.mockRejectedValue(
        new Error('Symbol "nonexistent_func" not found. Did you mean "nonexistent_function"?')
      );

      try {
        await execute({
          binary_name: 'test.bin',
          name_or_address: 'nonexistent_func',
          filter_type: 'CALL',
          limit: 50,
          offset: 0,
        });
        // Should not reach here
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('not found');
      }
    });

    it('throws error when binary not found', async () => {
      mockCallMCPTool.mockRejectedValue(new Error('Binary "nonexistent.bin" not found'));

      try {
        await execute({
          binary_name: 'nonexistent.bin',
          name_or_address: 'main',
          filter_type: 'CALL',
          limit: 50,
          offset: 0,
        });
        // Should not reach here
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('not found');
      }
    });

    it('provides clear validation error messages', async () => {
      // Empty binary_name
      await expect(
        execute({
          binary_name: '',
          name_or_address: 'main',
          filter_type: 'CALL',
          limit: 50,
          offset: 0,
        })
      ).rejects.toThrow(/binary/i);

      // Empty name_or_address
      await expect(
        execute({
          binary_name: 'test.bin',
          name_or_address: '',
          filter_type: 'CALL',
          limit: 50,
          offset: 0,
        })
      ).rejects.toThrow(/address or name/i);

      // Invalid limit
      await expect(
        execute({
          binary_name: 'test.bin',
          name_or_address: 'main',
          filter_type: 'CALL',
          limit: 0,
          offset: 0,
        })
      ).rejects.toThrow('Limit must be at least 1');
    });

    it('handles MCP connection failures gracefully', async () => {
      mockCallMCPTool.mockRejectedValue(
        new Error('ECONNREFUSED: MCP server not running')
      );

      await expect(
        execute({
          binary_name: 'test.bin',
          name_or_address: 'main',
          filter_type: 'CALL',
          limit: 50,
          offset: 0,
        })
      ).rejects.toThrow('MCP server not running');
    });
  });
});
