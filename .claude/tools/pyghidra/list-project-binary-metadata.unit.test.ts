/**
 * Unit tests for list_project_binary_metadata wrapper
 *
 * CRITICAL SECURITY FEATURE: Complete omission of file_path and project_path fields
 * Token reduction: 75% (800 → 200 tokens) by removing path information
 *
 * Test Categories:
 * 1. Input Validation (6 tests)
 * 2. MCP Integration (3 tests)
 * 3. Response Filtering (6 tests) _ CRITICAL PATH OMISSION
 * 4. Security (5 tests) _ CRITICAL PATH TRAVERSAL PREVENTION
 * 5. Edge Cases (4 tests)
 * 6. Error Handling (3 tests)
 *
 * Total: 27 tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execute } from './list_project_binary_metadata.js';

// Mock MCP client
vi.mock('../config/lib/mcp_client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { callMCPTool } from '../config/lib/mcp_client.js';
const mockCallMCPTool = vi.mocked(callMCPTool);

// ==========================
// Test Data Types
// ==========================

interface RawBinaryMetadata {
  binary_name: string;
  size: number;
  md5?: string;
  import_timestamp?: string;
  file_path: string;  // MUST BE OMITTED from response
  project_path: string;  // MUST BE OMITTED from response
}

// ==========================
// Helper Functions
// ==========================

/**
 * Helper to mock successful MCP responses
 */
function mockMcpSuccess(metadata: RawBinaryMetadata) {
  mockCallMCPTool.mockResolvedValueOnce(metadata);
}

/**
 * Helper to mock MCP errors
 */
function mockMcpError(error: Error) {
  mockCallMCPTool.mockRejectedValueOnce(error);
}

// ==========================
// Test Fixtures
// ==========================

const VALID_METADATA: RawBinaryMetadata = {
  binary_name: 'kernel32.dll',
  size: 2048,
  md5: 'abc123def456789',
  import_timestamp: '2024_01_01T12:00:00Z',
  file_path: '/tmp/projects/project1/kernel32.dll',
  project_path: '/tmp/projects/project1',
};

// ==========================
// Test Suite
// ==========================

describe('list_project_binary_metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================
  // 1. INPUT VALIDATION TESTS (6 tests)
  // ==========================

  describe('Input Validation', () => {
    it('rejects empty binary_name', async () => {
      const result = await execute({ binary_name: '' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Binary name');
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('rejects binary_name with path traversal (double_dot)', async () => {
      const result = await execute({ binary_name: '../etc/passwd' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Invalid binary name');
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('rejects binary_name with control characters', async () => {
      const result = await execute({ binary_name: 'binary\x00.dll' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Control characters not allowed');
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('accepts valid binary_name with allowed characters', async () => {
      mockMcpSuccess({
        binary_name: 'fw@v1.2.3_beta_release.bin',
        size: 1024,
        md5: 'abc123',
        import_timestamp: '2024_01_01T00:00:00Z',
        file_path: '/tmp/projects/project1/fw@v1.2.3_beta_release.bin',
        project_path: '/tmp/projects/project1',
      });

      const result = await execute({ binary_name: 'fw@v1.2.3_beta_release.bin' });

      expect(result.ok).toBe(true);
    });

    it('rejects binary_name with path separator (forward slash)', async () => {
      const result = await execute({ binary_name: 'kernel32/evil.dll' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Invalid binary name');
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('rejects binary_name exceeding 255 characters', async () => {
      const longName = 'a'.repeat(256) + '.dll';

      const result = await execute({ binary_name: longName });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Binary name too long');
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  // ==========================
  // 2. MCP INTEGRATION TESTS (3 tests)
  // ==========================

  describe('MCP Integration', () => {
    it('passes binary_name parameter to MCP', async () => {
      mockMcpSuccess(VALID_METADATA);

      await execute({ binary_name: 'kernel32.dll' });

      expect(mockCallMCPTool).toHaveBeenCalledWith('list_project_binary_metadata', {
        binary_name: 'kernel32.dll',
      });
    });

    it('uses correct tool name in MCP call', async () => {
      mockMcpSuccess({
        binary_name: 'test.bin',
        size: 512,
        md5: 'ghi789',
        import_timestamp: '2024_01_01T00:00:00Z',
        file_path: '/tmp/test.bin',
        project_path: '/tmp/project',
      });

      await execute({ binary_name: 'test.bin' });

      const toolName = mockCallMCPTool.mock.calls[0]?.[0];
      expect(toolName).toBe('list_project_binary_metadata');
    });

    it('calls MCP exactly once per request', async () => {
      mockMcpSuccess({
        binary_name: 'test.bin',
        size: 512,
        md5: 'jkl012',
        import_timestamp: '2024_01_01T00:00:00Z',
        file_path: '/tmp/test.bin',
        project_path: '/tmp/project',
      });

      await execute({ binary_name: 'test.bin' });

      expect(mockCallMCPTool).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================
  // 3. RESPONSE FILTERING TESTS (6 tests) 🔴 CRITICAL
  // ==========================

  describe('Response Filtering (CRITICAL SECURITY)', () => {
    it('omits file_path from response', async () => {
      mockMcpSuccess({
        binary_name: 'kernel32.dll',
        size: 2048,
        md5: 'abc123def456',
        import_timestamp: '2024_01_01T12:00:00Z',
        file_path: '/sensitive/projects/project1/binaries/kernel32.dll',  // MUST BE OMITTED
        project_path: '/sensitive/projects/project1',
      });

      const result = await execute({ binary_name: 'kernel32.dll' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Verify NO file_path field in any naming convention
        expect(result.data).not.toHaveProperty('file_path');
        expect(result.data).not.toHaveProperty('filePath');

        // Verify path string not in JSON output
        const jsonOutput = JSON.stringify(result);
        expect(jsonOutput).not.toContain('/sensitive/projects');
      }
    });

    it('omits project_path from response', async () => {
      mockMcpSuccess({
        binary_name: 'kernel32.dll',
        size: 2048,
        md5: 'abc123def456',
        import_timestamp: '2024_01_01T12:00:00Z',
        file_path: '/sensitive/projects/project1/binaries/kernel32.dll',
        project_path: '/sensitive/projects/project1',  // MUST BE OMITTED
      });

      const result = await execute({ binary_name: 'kernel32.dll' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Verify NO project_path field in any naming convention
        expect(result.data).not.toHaveProperty('project_path');
        expect(result.data).not.toHaveProperty('projectPath');

        // Verify path string not in JSON output
        const jsonOutput = JSON.stringify(result);
        expect(jsonOutput).not.toContain('/sensitive/projects');
      }
    });

    it('includes only safe metadata fields', async () => {
      mockMcpSuccess(VALID_METADATA);

      const result = await execute({ binary_name: 'kernel32.dll' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Verify expected fields present
        expect(result.data.binary_name).toBe('kernel32.dll');
        expect(result.data.size).toBe(2048);
        expect(result.data.md5).toBe('abc123def456789');
        expect(result.data.import_timestamp).toBe('2024_01_01T12:00:00Z');

        // Verify no additional fields leaked (only allowed fields)
        const allowedFields = ['binary_name', 'size', 'md5', 'import_timestamp'];
        const dataFields = Object.keys(result.data);
        const unexpectedFields = dataFields.filter(f => !allowedFields.includes(f));
        expect(unexpectedFields).toEqual([]);
      }
    });

    it('achieves 75% token reduction through field omission', async () => {
      mockMcpSuccess({
        binary_name: 'very_long_firmware_name_v1.2.3_beta_release.bin',
        size: 1048576,
        md5: 'abcdef1234567890abcdef1234567890',
        import_timestamp: '2024_01_01T12:34:56.789Z',
        file_path: '/home/user/ghidra_projects/reverse_engineering_2024/project1/binaries/very_long_firmware_name_v1.2.3_beta_release.bin',
        project_path: '/home/user/ghidra_projects/reverse_engineering_2024/project1',
      });

      const result = await execute({ binary_name: 'very_long_firmware_name_v1.2.3_beta_release.bin' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Expected: ~200 tokens (without paths)
        // Unfiltered would be: ~800 tokens (with paths)
        // Reduction: 75%
        expect(result.meta.estimatedTokens).toBeLessThan(250);
        expect(result.meta.estimatedTokens).toBeGreaterThan(150);
      }
    });

    it('includes estimatedTokens in response metadata', async () => {
      mockMcpSuccess({
        binary_name: 'test.bin',
        size: 512,
        md5: '123456',
        import_timestamp: '2024_01_01T00:00:00Z',
        file_path: '/tmp/test.bin',
        project_path: '/tmp/project',
      });

      const result = await execute({ binary_name: 'test.bin' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.meta.estimatedTokens).toBeDefined();
        expect(typeof result.meta.estimatedTokens).toBe('number');
        expect(result.meta.estimatedTokens).toBeGreaterThan(0);
      }
    });

    it('handles MCP response with missing optional fields gracefully', async () => {
      mockMcpSuccess({
        binary_name: 'minimal.bin',
        size: 256,
        // md5 missing
        // import_timestamp missing
        file_path: '/tmp/minimal.bin',
        project_path: '/tmp/project',
      });

      const result = await execute({ binary_name: 'minimal.bin' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.binary_name).toBe('minimal.bin');
        expect(result.data.size).toBe(256);
        expect(result.data.md5).toBeUndefined();
        expect(result.data.import_timestamp).toBeUndefined();
      }
    });
  });

  // ==========================
  // 4. SECURITY TESTS (5 tests) 🔴 CRITICAL
  // ==========================

  describe('Security (CRITICAL)', () => {
    it('rejects binary_name with double_dot path traversal', async () => {
      const result = await execute({ binary_name: '../../../etc/shadow' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Invalid binary name');
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('rejects binary_name with backslash path separator (Windows)', async () => {
      const result = await execute({ binary_name: '..\\windows\\system32\\evil.dll' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Invalid binary name');
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('error messages do not leak file paths', async () => {
      const mcpError = new Error('Binary not found at /home/user/projects/project1/test.bin');
      mockMcpError(mcpError);

      const result = await execute({ binary_name: 'test.bin' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Error message should NOT contain actual file path
        expect(result.error.message).not.toContain('/home/user/projects');
        // Binary name is safe to include
        expect(result.error.message).toContain('test.bin');
      }
    });

    it('rejects binary_name with null byte', async () => {
      const result = await execute({ binary_name: 'test.bin\x00.txt' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Control characters not allowed');
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('response contains no path_like strings', async () => {
      mockMcpSuccess({
        binary_name: 'kernel32.dll',
        size: 2048,
        md5: 'abc123',
        import_timestamp: '2024_01_01T00:00:00Z',
        file_path: '/home/user/projects/analysis/binaries/kernel32.dll',
        project_path: '/home/user/projects/analysis',
      });

      const result = await execute({ binary_name: 'kernel32.dll' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const resultString = JSON.stringify(result);

        // No path separators in response
        expect(resultString).not.toMatch(/\/[a_zA_Z]/);  // Unix paths
        expect(resultString).not.toMatch(/\\[a_zA_Z]/);  // Windows paths (escaped in JSON)

        // No common path prefixes
        expect(resultString).not.toContain('/home/');
        expect(resultString).not.toContain('/tmp/');
        expect(resultString).not.toContain('/var/');
        expect(resultString).not.toContain('C:\\\\');  // Escaped backslash in JSON
      }
    });
  });

  // ==========================
  // 5. EDGE CASES TESTS (4 tests)
  // ==========================

  describe('Edge Cases', () => {
    it('throws BinaryNotFoundError for non_existent binary', async () => {
      mockMcpError(new Error('Binary "nonexistent.bin" not found in project'));

      const result = await execute({ binary_name: 'nonexistent.bin' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('handles binary with missing md5', async () => {
      mockMcpSuccess({
        binary_name: 'unknown_hash.bin',
        size: 1024,
        import_timestamp: '2024_01_01T00:00:00Z',
        file_path: '/tmp/unknown_hash.bin',
        project_path: '/tmp/project',
        // md5 missing
      });

      const result = await execute({ binary_name: 'unknown_hash.bin' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.binary_name).toBe('unknown_hash.bin');
        expect(result.data.size).toBe(1024);
        expect(result.data.md5).toBeUndefined();
      }
    });

    it('handles very large binary size values', async () => {
      mockMcpSuccess({
        binary_name: 'huge_firmware.bin',
        size: 9007199254740991,  // Number.MAX_SAFE_INTEGER
        md5: 'abc123',
        import_timestamp: '2024_01_01T00:00:00Z',
        file_path: '/tmp/huge_firmware.bin',
        project_path: '/tmp/project',
      });

      const result = await execute({ binary_name: 'huge_firmware.bin' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.size).toBe(9007199254740991);
        expect(typeof result.data.size).toBe('number');
      }
    });

    it('handles binary name with allowed special characters', async () => {
      mockMcpSuccess({
        binary_name: 'fw@v1.2.3_beta_test.bin',
        size: 512,
        md5: 'def456',
        import_timestamp: '2024_01_01T00:00:00Z',
        file_path: '/tmp/fw@v1.2.3_beta_test.bin',
        project_path: '/tmp/project',
      });

      const result = await execute({ binary_name: 'fw@v1.2.3_beta_test.bin' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.binary_name).toBe('fw@v1.2.3_beta_test.bin');
      }
    });
  });

  // ==========================
  // 6. ERROR HANDLING TESTS (3 tests)
  // ==========================

  describe('Error Handling', () => {
    it('wraps MCP validation errors', async () => {
      mockMcpError(new Error('Invalid binary name format'));

      const result = await execute({ binary_name: 'test.bin' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('handles MCP timeout gracefully', async () => {
      mockMcpError(new Error('Operation timed out'));

      const result = await execute({ binary_name: 'huge_binary.exe' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('timed out');
        expect(result.error.code).toBe('TIMEOUT');
      }
    });

    it('provides helpful error message for binary not found', async () => {
      const error = new Error('Binary "kernl32.dll" not found');
      mockMcpError(error);

      const result = await execute({ binary_name: 'kernl32.dll' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('kernl32.dll');
        expect(result.error.message).toContain('not found');
        // Should NOT contain file paths
        expect(result.error.message).not.toMatch(/\/[a_zA_Z]/);
      }
    });
  });
});
