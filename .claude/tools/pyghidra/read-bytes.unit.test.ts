/**
 * Unit tests for read_bytes wrapper
 *
 * Test Plan: 24 tests across 6 categories
 * _ Input Validation (7 tests)
 * _ Address Normalization (3 tests)
 * _ Size Limits (4 tests) _ DoS prevention
 * _ MCP Integration (3 tests)
 * _ Edge Cases (4 tests)
 * _ Error Handling (3 tests)
 *
 * Coverage Target: ≥80% line/branch/function
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';

// Mock MCP client before any imports
vi.mock('../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { callMCPTool } from '../config/lib/mcp-client.js';

// Mock helpers for standard responses
const mockCallMCPTool = callMCPTool as MockedFunction<typeof callMCPTool>;

function mockMcpSuccess(hexData: string, bytesRead?: number) {
  mockCallMCPTool.mockResolvedValueOnce({
    hex_data: hexData,
    bytes_read: bytesRead ?? hexData.length / 2,
  });
}

function mockMcpError(error: Error) {
  mockCallMCPTool.mockRejectedValueOnce(error);
}

describe('read_bytes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Input Validation Tests', () => {
    it('1.1: rejects empty binary_name', async () => {
      const { readBytes } = await import('./read-bytes.js');

      await expect(
        readBytes.execute({
          binary_name: '',
          address: '0x00401000',
          size: 32,
        })
      ).rejects.toThrow(/binary.*name.*required/i);
    });

    it('1.2: rejects binary_name with path traversal', async () => {
      const { readBytes } = await import('./read-bytes.js');

      await expect(
        readBytes.execute({
          binary_name: '../etc/passwd',
          address: '0x00401000',
          size: 32,
        })
      ).rejects.toThrow(/path.*traversal|invalid.*binary.*name/i);
    });

    it('1.3: rejects binary_name with control characters', async () => {
      const { readBytes } = await import('./read-bytes.js');

      await expect(
        readBytes.execute({
          binary_name: 'binary\x00.dll',
          address: '0x00401000',
          size: 32,
        })
      ).rejects.toThrow(/control.*character/i);
    });

    it('1.4: rejects empty address', async () => {
      const { readBytes } = await import('./read-bytes.js');

      await expect(
        readBytes.execute({
          binary_name: 'test.exe',
          address: '',
          size: 32,
        })
      ).rejects.toThrow(/address.*required/i);
    });

    it('1.5: rejects invalid hex address format', async () => {
      const { readBytes } = await import('./read-bytes.js');

      await expect(
        readBytes.execute({
          binary_name: 'test.exe',
          address: 'ZZZZZZ', // Invalid hex
          size: 32,
        })
      ).rejects.toThrow(/invalid.*hex.*address/i);
    });

    it('1.6: rejects address longer than 20 characters', async () => {
      const { readBytes } = await import('./read-bytes.js');

      await expect(
        readBytes.execute({
          binary_name: 'test.exe',
          address: '0x123456789012345678901', // 21 chars
          size: 32,
        })
      ).rejects.toThrow(/address.*too.*long/i);
    });

    it('1.7: accepts valid hex address with mixed case', async () => {
      const { readBytes } = await import('./read-bytes.js');
      mockMcpSuccess('48656c6c6f');

      const result = await readBytes.execute({
        binary_name: 'test.exe',
        address: '0x00AbCdEf',
        size: 5,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.hex_data).toBe('48656c6c6f');
      }
      expect(mockCallMCPTool).toHaveBeenCalledWith('pyghidra', 'read_bytes', {
        binary_name: 'test.exe',
        address: '0x00abcdef', // Normalized to lowercase
        size: 5,
      });
    });
  });

  describe('2. Address Normalization Tests', () => {
    it('2.1: adds 0x prefix when missing', async () => {
      const { readBytes } = await import('./read-bytes.js');
      mockMcpSuccess('48656c6c6f');

      await readBytes.execute({
        binary_name: 'test.exe',
        address: '00401000', // No 0x prefix
        size: 5,
      });

      expect(mockCallMCPTool).toHaveBeenCalledWith('pyghidra', 'read_bytes', {
        binary_name: 'test.exe',
        address: '0x00401000', // Prefix added
        size: 5,
      });
    });

    it('2.2: preserves 0x prefix when present', async () => {
      const { readBytes } = await import('./read-bytes.js');
      mockMcpSuccess('48656c6c6f');

      await readBytes.execute({
        binary_name: 'test.exe',
        address: '0x00401000', // Has 0x prefix
        size: 5,
      });

      expect(mockCallMCPTool).toHaveBeenCalledWith('pyghidra', 'read_bytes', {
        binary_name: 'test.exe',
        address: '0x00401000', // Unchanged
        size: 5,
      });
    });

    it('2.3: normalizes uppercase hex to lowercase', async () => {
      const { readBytes } = await import('./read-bytes.js');
      mockMcpSuccess('48656c6c6f');

      await readBytes.execute({
        binary_name: 'test.exe',
        address: '0xDEADBEEF', // Uppercase
        size: 5,
      });

      expect(mockCallMCPTool).toHaveBeenCalledWith('pyghidra', 'read_bytes', {
        binary_name: 'test.exe',
        address: '0xdeadbeef', // Normalized to lowercase
        size: 5,
      });
    });
  });

  describe('3. Size Limits Tests (DoS Prevention)', () => {
    it('3.1: rejects size = 0', async () => {
      const { readBytes } = await import('./read-bytes.js');

      await expect(
        readBytes.execute({
          binary_name: 'test.exe',
          address: '0x00401000',
          size: 0,
        })
      ).rejects.toThrow(/size.*must.*at least.*1/i);
    });

    it('3.2: rejects negative size', async () => {
      const { readBytes } = await import('./read-bytes.js');

      await expect(
        readBytes.execute({
          binary_name: 'test.exe',
          address: '0x00401000',
          size: -100,
        })
      ).rejects.toThrow(/size.*must.*positive/i);
    });

    it('3.3: rejects size > 8192 (DoS limit)', async () => {
      const { readBytes } = await import('./read-bytes.js');

      await expect(
        readBytes.execute({
          binary_name: 'test.exe',
          address: '0x00401000',
          size: 8193, // Exceeds limit
        })
      ).rejects.toThrow(/size.*exceeds.*maximum.*8192/i);
    });

    it('3.4: accepts size = 8192 (boundary)', async () => {
      const { readBytes } = await import('./read-bytes.js');
      const hexData = 'a'.repeat(16384); // 8192 bytes = 16384 hex chars
      mockMcpSuccess(hexData, 8192);

      const result = await readBytes.execute({
        binary_name: 'test.exe',
        address: '0x00401000',
        size: 8192, // Exactly at limit
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.hex_data).toBe(hexData);
        expect(result.data.bytes_read).toBe(8192);
      }
    });
  });

  describe('4. MCP Integration Tests', () => {
    it('4.1: passes normalized parameters to MCP', async () => {
      const { readBytes } = await import('./read-bytes.js');
      mockMcpSuccess('48656c6c6f');

      await readBytes.execute({
        binary_name: 'test.exe',
        address: 'deadbeef', // No prefix, uppercase
        size: 5,
      });

      expect(mockCallMCPTool).toHaveBeenCalledWith('pyghidra', 'read_bytes', {
        binary_name: 'test.exe',
        address: '0xdeadbeef', // Normalized
        size: 5,
      });
    });

    it('4.2: returns hex data from MCP response', async () => {
      const { readBytes } = await import('./read-bytes.js');
      mockMcpSuccess('48656c6c6f576f726c64', 10); // "HelloWorld" in hex

      const result = await readBytes.execute({
        binary_name: 'test.exe',
        address: '0x00401000',
        size: 10,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.hex_data).toBe('48656c6c6f576f726c64');
        expect(result.data.bytes_read).toBe(10);
      }
    });

    it('4.3: uses default size = 32 when omitted', async () => {
      const { readBytes } = await import('./read-bytes.js');
      const hexData = 'a'.repeat(64); // 32 bytes
      mockMcpSuccess(hexData, 32);

      await readBytes.execute({
        binary_name: 'test.exe',
        address: '0x00401000',
        // size omitted
      });

      expect(mockCallMCPTool).toHaveBeenCalledWith('pyghidra', 'read_bytes', {
        binary_name: 'test.exe',
        address: '0x00401000',
        size: 32, // Default from schema
      });
    });
  });

  describe('5. Edge Cases Tests', () => {
    it('5.1: handles zero_byte response', async () => {
      const { readBytes } = await import('./read-bytes.js');
      mockMcpSuccess('', 0); // Empty hex data

      const result = await readBytes.execute({
        binary_name: 'test.exe',
        address: '0x00401000',
        size: 1,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.hex_data).toBe('');
        expect(result.data.bytes_read).toBe(0);
      }
    });

    it('5.2: handles minimum size = 1', async () => {
      const { readBytes } = await import('./read-bytes.js');
      mockMcpSuccess('48', 1); // 1 byte

      const result = await readBytes.execute({
        binary_name: 'test.exe',
        address: '0x00401000',
        size: 1,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.hex_data).toBe('48');
        expect(result.data.bytes_read).toBe(1);
      }
    });

    it('5.3: handles minimal address (0x0)', async () => {
      const { readBytes } = await import('./read-bytes.js');
      mockMcpSuccess('00000000', 4);

      await readBytes.execute({
        binary_name: 'test.exe',
        address: '0x0',
        size: 4,
      });

      expect(mockCallMCPTool).toHaveBeenCalledWith('pyghidra', 'read_bytes', {
        binary_name: 'test.exe',
        address: '0x0',
        size: 4,
      });
    });

    it('5.4: handles maximum 64_bit address', async () => {
      const { readBytes } = await import('./read-bytes.js');
      mockMcpSuccess('ffffffff', 4);

      await readBytes.execute({
        binary_name: 'test.exe',
        address: '0xffffffffffffffff', // Max 64_bit
        size: 4,
      });

      expect(mockCallMCPTool).toHaveBeenCalledWith('pyghidra', 'read_bytes', {
        binary_name: 'test.exe',
        address: '0xffffffffffffffff',
        size: 4,
      });
    });
  });

  describe('6. Error Handling Tests', () => {
    it('6.1: handles BinaryNotFoundError from MCP', async () => {
      const { readBytes } = await import('./read-bytes.js');
      mockMcpError(new Error('Binary not found: nonexistent.exe'));

      await expect(
        readBytes.execute({
          binary_name: 'nonexistent.exe',
          address: '0x00401000',
          size: 32,
        })
      ).rejects.toThrow(/binary.*not.*found/i);
    });

    it('6.2: handles InvalidAddressError from MCP', async () => {
      const { readBytes } = await import('./read-bytes.js');
      mockMcpError(new Error('Invalid address: 0xdeadbeef not in binary'));

      await expect(
        readBytes.execute({
          binary_name: 'test.exe',
          address: '0xdeadbeef',
          size: 32,
        })
      ).rejects.toThrow(/invalid.*address/i);
    });

    it('6.3: handles MCP timeout gracefully', async () => {
      const { readBytes } = await import('./read-bytes.js');
      mockMcpError(new Error('MCP timeout after 30s'));

      await expect(
        readBytes.execute({
          binary_name: 'large.exe',
          address: '0x00401000',
          size: 8192,
        })
      ).rejects.toThrow(/mcp.*timeout/i);
    });
  });
});
