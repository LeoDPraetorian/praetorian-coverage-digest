/**
 * Unit tests for import_binary wrapper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execute } from './import-binary.js';

// Mock MCP client
vi.mock('../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn(),
}));

// Mock fs/promises to control filesystem behavior
vi.mock('fs/promises', () => ({
  realpath: vi.fn(),
  stat: vi.fn(),
  access: vi.fn(),
  constants: { R_OK: 4 },
}));

// Mock analysis poller
vi.mock('./lib/analysis-poller.js', () => ({
  getAnalysisPoller: vi.fn(),
}));

import { callMCPTool } from '../config/lib/mcp-client.js';
import { realpath, stat, access } from 'fs/promises';
import { getAnalysisPoller } from './lib/analysis-poller.js';

const mockCallMCPTool = vi.mocked(callMCPTool);
const mockRealpath = vi.mocked(realpath);
const mockStat = vi.mocked(stat);
const mockAccess = vi.mocked(access);
const mockGetAnalysisPoller = vi.mocked(getAnalysisPoller);

describe('import_binary', () => {
  // Helper to set up successful filesystem mocks
  const mockSuccessfulFilesystem = (resolvedPath: string, sizeBytes = 1048576) => {
    mockRealpath.mockResolvedValue(resolvedPath);
    mockStat.mockResolvedValue({
      isFile: () => true,
      isDirectory: () => false,
      size: sizeBytes,
    } as any);
    mockAccess.mockResolvedValue(undefined);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('rejects empty path', async () => {
      const result = await execute({ binary_path: '' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toMatch(/Binary path is required/i);
      }
    });

    it('rejects path with traversal (../)', async () => {
      const result = await execute({ binary_path: '/tmp/../etc/passwd' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toMatch(/path traversal/i);
      }
    });

    it('rejects path with traversal (~)', async () => {
      const result = await execute({ binary_path: '~/sensitive.bin' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toMatch(/Home directory expansion/i);
      }
    });

    it('rejects relative path', async () => {
      const result = await execute({ binary_path: 'firmware.bin' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toMatch(/absolute/i);
      }
    });

    it('rejects path with control characters', async () => {
      const result = await execute({ binary_path: '/tmp/\x00null.bin' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toMatch(/control/i);
      }
    });

    it('accepts valid absolute path', async () => {
      mockSuccessfulFilesystem('/tmp/firmware.bin');
      mockCallMCPTool.mockResolvedValue("Binary 'firmware.bin' imported successfully");

      const result = await execute({ binary_path: '/tmp/firmware.bin' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.binary_name).toBe('firmware.bin');
      }
    });
  });

  describe('successful operations', () => {
    it('successfully imports binary', async () => {
      mockSuccessfulFilesystem('/project/test.bin');
      mockCallMCPTool.mockResolvedValue("Binary 'test.bin' imported successfully");

      const result = await execute({ binary_path: '/project/test.bin' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.message).toContain('imported');
        expect(result.data.binary_name).toBe('test.bin');
        expect(result.meta.durationMs).toBeGreaterThanOrEqual(0);
        expect(result.meta.estimatedTokens).toBeGreaterThan(0);
      }
    });

    it('extracts binary name correctly', async () => {
      mockSuccessfulFilesystem('/opt/complex_name.elf');
      mockCallMCPTool.mockResolvedValue("Binary 'complex_name.elf' imported");

      const result = await execute({ binary_path: '/opt/complex_name.elf' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.binary_name).toBe('complex_name.elf');
      }
    });
  });

  describe('error handling', () => {
    it('handles NOT_FOUND error from filesystem', async () => {
      const error = new Error('File not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockRealpath.mockRejectedValue(error);

      const result = await execute({ binary_path: '/tmp/missing.bin' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
        expect(result.meta?.durationMs).toBeGreaterThanOrEqual(0);
      }
    });

    it('handles error from MCP (generic import error)', async () => {
      mockSuccessfulFilesystem('/tmp/large.bin');
      mockCallMCPTool.mockRejectedValue(new Error('Operation timed out'));

      const result = await execute({ binary_path: '/tmp/large.bin' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('IMPORT_ERROR');
        expect(result.error.message).toContain('timed out');
      }
    });

    it('handles unexpected error from MCP', async () => {
      mockSuccessfulFilesystem('/tmp/test.bin');
      mockCallMCPTool.mockRejectedValue(new Error('Unexpected error'));

      const result = await execute({ binary_path: '/tmp/test.bin' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('IMPORT_ERROR');
        expect(result.error.message).toContain('Unexpected error');
      }
    });

    it('handles PERMISSION_DENIED error from filesystem', async () => {
      const error = new Error('Permission denied') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      mockRealpath.mockRejectedValue(error);

      const result = await execute({ binary_path: '/tmp/noperm.bin' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });

    it('rejects directory path', async () => {
      mockRealpath.mockResolvedValue('/tmp');
      mockStat.mockResolvedValue({
        isFile: () => false,
        isDirectory: () => true,
      } as any);

      const result = await execute({ binary_path: '/tmp' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toMatch(/regular file/i);
      }
    });
  });

  describe('edge cases', () => {
    it('handles paths with spaces', async () => {
      mockSuccessfulFilesystem('/tmp/my firmware.bin');
      mockCallMCPTool.mockResolvedValue("Binary 'my firmware.bin' imported");

      const result = await execute({ binary_path: '/tmp/my firmware.bin' });

      expect(result.ok).toBe(true);
    });

    it('handles paths with special characters', async () => {
      mockSuccessfulFilesystem('/tmp/fw@v1.2.3.bin');
      mockCallMCPTool.mockResolvedValue("Binary 'fw@v1.2.3.bin' imported");

      const result = await execute({ binary_path: '/tmp/fw@v1.2.3.bin' });

      expect(result.ok).toBe(true);
    });
  });

  describe('directory whitelist removal', () => {
    it('accepts path in any directory (no whitelist)', async () => {
      // Test paths that would have been rejected by the old whitelist
      const testPaths = [
        '/opt/binaries/test.bin',
        '/usr/local/bin/test.bin',
        '/home/user/custom/test.bin',
        '/var/lib/test.bin',
      ];

      for (const testPath of testPaths) {
        mockSuccessfulFilesystem(testPath);
        mockCallMCPTool.mockResolvedValue(`Binary imported successfully`);

        const result = await execute({ binary_path: testPath });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.data.binary_name).toBe('test.bin');
        }
      }
    });
  });

  describe('new features: size and time estimation', () => {
    it('includes size_bytes in response', async () => {
      const binarySize = 5242880; // 5MB
      mockSuccessfulFilesystem('/tmp/test.bin', binarySize);
      mockCallMCPTool.mockResolvedValue("Binary imported");

      const result = await execute({ binary_path: '/tmp/test.bin' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.size_bytes).toBe(binarySize);
      }
    });

    it('includes estimated_analysis_time in response', async () => {
      mockSuccessfulFilesystem('/tmp/test.bin', 1048576); // 1MB
      mockCallMCPTool.mockResolvedValue("Binary imported");

      const result = await execute({ binary_path: '/tmp/test.bin' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.estimated_analysis_time).toBeTruthy();
        expect(typeof result.data.estimated_analysis_time).toBe('string');
      }
    });

    it('continues without size/estimation if stat fails', async () => {
      mockRealpath.mockResolvedValue('/tmp/test.bin');
      // First stat call succeeds for validateAndResolveBinaryPath
      // Second stat call fails for size detection
      mockStat
        .mockResolvedValueOnce({
          isFile: () => true,
          isDirectory: () => false,
        } as any)
        .mockRejectedValueOnce(new Error('stat failed'));
      mockAccess.mockResolvedValue(undefined);
      mockCallMCPTool.mockResolvedValue("Binary imported");

      const result = await execute({ binary_path: '/tmp/test.bin' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Should still succeed, just without size/estimation
        expect(result.data.size_bytes).toBeUndefined();
        expect(result.data.estimated_analysis_time).toBeUndefined();
      }
    });
  });

  describe('new features: analysis waiting', () => {
    it('does not wait for analysis by default', async () => {
      mockSuccessfulFilesystem('/tmp/test.bin');
      mockCallMCPTool.mockResolvedValue("Binary imported");

      const result = await execute({ binary_path: '/tmp/test.bin' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.analysis_complete).toBeUndefined();
        expect(result.data.analysis_wait_time_ms).toBeUndefined();
      }
      expect(mockGetAnalysisPoller).not.toHaveBeenCalled();
    });

    it('waits for analysis when wait_for_analysis=true', async () => {
      mockSuccessfulFilesystem('/tmp/test.bin');
      mockCallMCPTool.mockResolvedValue("Binary imported");

      const mockPoller = {
        waitForBinary: vi.fn().mockResolvedValue({ name: 'test.bin', analyzed: true }),
      };
      mockGetAnalysisPoller.mockReturnValue(mockPoller as any);

      const result = await execute({
        binary_path: '/tmp/test.bin',
        wait_for_analysis: true,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.analysis_complete).toBe(true);
        expect(result.data.analysis_wait_time_ms).toBeGreaterThanOrEqual(0);
        expect(result.data.message).toContain('analyzed');
      }
      expect(mockGetAnalysisPoller).toHaveBeenCalled();
      expect(mockPoller.waitForBinary).toHaveBeenCalledWith('test.bin', {
        timeoutMs: 120000, // Default timeout
      });
    });

    it('respects custom timeout_ms', async () => {
      mockSuccessfulFilesystem('/tmp/test.bin');
      mockCallMCPTool.mockResolvedValue("Binary imported");

      const mockPoller = {
        waitForBinary: vi.fn().mockResolvedValue({ name: 'test.bin', analyzed: true }),
      };
      mockGetAnalysisPoller.mockReturnValue(mockPoller as any);

      await execute({
        binary_path: '/tmp/test.bin',
        wait_for_analysis: true,
        timeout_ms: 60000,
      });

      expect(mockPoller.waitForBinary).toHaveBeenCalledWith('test.bin', {
        timeoutMs: 60000,
      });
    });

    it('handles analysis timeout gracefully (partial success)', async () => {
      mockSuccessfulFilesystem('/tmp/test.bin');
      mockCallMCPTool.mockResolvedValue("Binary imported");

      const mockPoller = {
        waitForBinary: vi.fn().mockRejectedValue(new Error('Timeout')),
      };
      mockGetAnalysisPoller.mockReturnValue(mockPoller as any);

      const result = await execute({
        binary_path: '/tmp/test.bin',
        wait_for_analysis: true,
      });

      // Import succeeds even if analysis times out
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.analysis_complete).toBe(false);
        expect(result.data.analysis_wait_time_ms).toBeGreaterThanOrEqual(0);
        expect(result.data.message).not.toContain('analyzed');
      }
    });

    it('validates timeout_ms bounds', async () => {
      // Too small
      let result = await execute({
        binary_path: '/tmp/test.bin',
        wait_for_analysis: true,
        timeout_ms: 1000, // Below min of 5000
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toMatch(/at least 5 seconds/i);
      }

      // Too large
      result = await execute({
        binary_path: '/tmp/test.bin',
        wait_for_analysis: true,
        timeout_ms: 2000000, // Above max of 1800000
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toMatch(/not exceed 30 minutes/i);
      }
    });
  });

  describe('backwards compatibility', () => {
    it('existing calls without new params still work', async () => {
      mockSuccessfulFilesystem('/tmp/test.bin');
      mockCallMCPTool.mockResolvedValue("Binary imported");

      const result = await execute({ binary_path: '/tmp/test.bin' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.binary_name).toBe('test.bin');
        expect(result.data.message).toContain('imported');
      }
    });
  });
});
