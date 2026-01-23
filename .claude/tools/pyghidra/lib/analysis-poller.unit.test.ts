/**
 * Unit tests for analysis polling utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAnalysisPoller,
  AnalysisTimeoutError,
  BinaryNotFoundError,
} from './analysis-poller.js';

// Mock the MCP client
vi.mock('../../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { callMCPTool } from '../../config/lib/mcp-client.js';

const mockCallMCPTool = callMCPTool as ReturnType<typeof vi.fn>;

describe('analysis-poller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAnalysisPoller', () => {
    it('should return an AnalysisPoller instance', () => {
      const poller = getAnalysisPoller();

      expect(poller).toBeTruthy();
      expect(poller.isAnalysisComplete).toBeInstanceOf(Function);
      expect(poller.waitForBinary).toBeInstanceOf(Function);
      expect(poller.getAnalysisStatus).toBeInstanceOf(Function);
    });

    it('should return the same instance (singleton behavior)', () => {
      const poller1 = getAnalysisPoller();
      const poller2 = getAnalysisPoller();

      // Both should be instances with the same methods
      expect(poller1.isAnalysisComplete).toBe(poller2.isAnalysisComplete);
      expect(poller1.waitForBinary).toBe(poller2.waitForBinary);
      expect(poller1.getAnalysisStatus).toBe(poller2.getAnalysisStatus);
    });
  });

  describe('isAnalysisComplete', () => {
    it('should return true when binary is analyzed', async () => {
      mockCallMCPTool.mockResolvedValueOnce({
        binaries: [
          { name: 'test-binary', analyzed: true },
        ],
      });

      const poller = getAnalysisPoller();
      const result = await poller.isAnalysisComplete('test-binary');

      expect(result).toBe(true);
      expect(mockCallMCPTool).toHaveBeenCalledWith('pyghidra', 'list_project_binaries', {});
    });

    it('should return false when binary is not analyzed', async () => {
      mockCallMCPTool.mockResolvedValueOnce({
        binaries: [
          { name: 'test-binary', analyzed: false },
        ],
      });

      const poller = getAnalysisPoller();
      const result = await poller.isAnalysisComplete('test-binary');

      expect(result).toBe(false);
    });

    it('should throw BinaryNotFoundError when binary not in project', async () => {
      // Mock for first call
      mockCallMCPTool.mockResolvedValueOnce({
        binaries: [
          { name: 'other-binary', analyzed: true },
        ],
      });

      // Mock for second call (duplicate assertion)
      mockCallMCPTool.mockResolvedValueOnce({
        binaries: [
          { name: 'other-binary', analyzed: true },
        ],
      });

      const poller = getAnalysisPoller();

      await expect(
        poller.isAnalysisComplete('missing-binary')
      ).rejects.toThrow(BinaryNotFoundError);

      await expect(
        poller.isAnalysisComplete('missing-binary')
      ).rejects.toThrow("Binary 'missing-binary' not found in project");
    });

    it('should support partial name matching', async () => {
      mockCallMCPTool.mockResolvedValueOnce({
        binaries: [
          { name: '/path/to/updatemgr-e100d8', analyzed: true },
        ],
      });

      const poller = getAnalysisPoller();
      const result = await poller.isAnalysisComplete('updatemgr');

      expect(result).toBe(true);
    });

    it('should support case-insensitive matching', async () => {
      mockCallMCPTool.mockResolvedValueOnce({
        binaries: [
          { name: 'MyBinary', analyzed: true },
        ],
      });

      const poller = getAnalysisPoller();
      const result = await poller.isAnalysisComplete('mybinary');

      expect(result).toBe(true);
    });

    it('should prefer exact match over partial match', async () => {
      mockCallMCPTool.mockResolvedValueOnce({
        binaries: [
          { name: 'test', analyzed: false },
          { name: 'test-long', analyzed: true },
        ],
      });

      const poller = getAnalysisPoller();
      const result = await poller.isAnalysisComplete('test');

      // Should match exact 'test' (analyzed: false), not 'test-long'
      expect(result).toBe(false);
    });
  });

  describe('waitForBinary', () => {
    it('should return immediately when binary already analyzed', async () => {
      mockCallMCPTool.mockResolvedValueOnce({
        binaries: [
          { name: 'test-binary', analyzed: true },
        ],
      });

      const poller = getAnalysisPoller();
      const startTime = Date.now();
      const result = await poller.waitForBinary('test-binary');

      const elapsed = Date.now() - startTime;

      expect(result.name).toBe('test-binary');
      expect(result.analyzed).toBe(true);
      expect(elapsed).toBeLessThan(1000); // Should be immediate
    });

    it('should poll until analysis completes', async () => {
      // First call: not analyzed
      mockCallMCPTool.mockResolvedValueOnce({
        binaries: [
          { name: 'test-binary', analyzed: false },
        ],
      });

      // Second call: analyzed
      mockCallMCPTool.mockResolvedValueOnce({
        binaries: [
          { name: 'test-binary', analyzed: true },
        ],
      });

      const poller = getAnalysisPoller();
      const result = await poller.waitForBinary('test-binary', {
        pollIntervalMs: 100, // Fast polling for test
      });

      expect(result.name).toBe('test-binary');
      expect(result.analyzed).toBe(true);
      expect(mockCallMCPTool).toHaveBeenCalledTimes(2);
    });

    it('should throw BinaryNotFoundError when binary not in project', async () => {
      mockCallMCPTool.mockResolvedValueOnce({
        binaries: [],
      });

      const poller = getAnalysisPoller();

      await expect(
        poller.waitForBinary('missing-binary', { pollIntervalMs: 100 })
      ).rejects.toThrow(BinaryNotFoundError);
    });

    it('should throw AnalysisTimeoutError when timeout exceeded', async () => {
      // Always return not analyzed
      mockCallMCPTool.mockResolvedValue({
        binaries: [
          { name: 'slow-binary', analyzed: false },
        ],
      });

      const poller = getAnalysisPoller();

      await expect(
        poller.waitForBinary('slow-binary', {
          timeoutMs: 500,
          pollIntervalMs: 100,
        })
      ).rejects.toThrow(AnalysisTimeoutError);

      await expect(
        poller.waitForBinary('slow-binary', {
          timeoutMs: 500,
          pollIntervalMs: 100,
        })
      ).rejects.toThrow(/Analysis did not complete for 'slow-binary' within \d+ms/);
    });

    it('should throw AnalysisTimeoutError when max attempts exceeded', async () => {
      // Always return not analyzed
      mockCallMCPTool.mockResolvedValue({
        binaries: [
          { name: 'slow-binary', analyzed: false },
        ],
      });

      const poller = getAnalysisPoller();

      await expect(
        poller.waitForBinary('slow-binary', {
          maxAttempts: 3,
          pollIntervalMs: 100,
        })
      ).rejects.toThrow(AnalysisTimeoutError);

      // Should have tried 3 times
      expect(mockCallMCPTool).toHaveBeenCalledTimes(3);
    });

    it('should respect custom polling interval', async () => {
      // First two calls: not analyzed
      mockCallMCPTool.mockResolvedValueOnce({
        binaries: [{ name: 'test-binary', analyzed: false }],
      });
      mockCallMCPTool.mockResolvedValueOnce({
        binaries: [{ name: 'test-binary', analyzed: false }],
      });

      // Third call: analyzed
      mockCallMCPTool.mockResolvedValueOnce({
        binaries: [{ name: 'test-binary', analyzed: true }],
      });

      const poller = getAnalysisPoller();
      const startTime = Date.now();

      await poller.waitForBinary('test-binary', {
        pollIntervalMs: 200,
      });

      const elapsed = Date.now() - startTime;

      // Should have waited ~400ms (2 intervals of 200ms)
      expect(elapsed).toBeGreaterThanOrEqual(350);
      expect(elapsed).toBeLessThan(600);
    });

    it('should use default options when none provided', async () => {
      mockCallMCPTool.mockResolvedValueOnce({
        binaries: [{ name: 'test-binary', analyzed: true }],
      });

      const poller = getAnalysisPoller();
      const result = await poller.waitForBinary('test-binary');

      expect(result.name).toBe('test-binary');
    });

    it('should support partial name matching in wait', async () => {
      mockCallMCPTool.mockResolvedValueOnce({
        binaries: [
          { name: '/path/to/updatemgr-e100d8', analyzed: true },
        ],
      });

      const poller = getAnalysisPoller();
      const result = await poller.waitForBinary('updatemgr');

      expect(result.name).toBe('/path/to/updatemgr-e100d8');
      expect(result.analyzed).toBe(true);
    });
  });

  describe('getAnalysisStatus', () => {
    it('should return correct status counts', async () => {
      mockCallMCPTool.mockResolvedValueOnce({
        binaries: [
          { name: 'binary1', analyzed: true },
          { name: 'binary2', analyzed: true },
          { name: 'binary3', analyzed: false },
          { name: 'binary4', analyzed: false },
          { name: 'binary5', analyzed: false },
        ],
      });

      const poller = getAnalysisPoller();
      const status = await poller.getAnalysisStatus();

      expect(status.total).toBe(5);
      expect(status.analyzed).toBe(2);
      expect(status.pending).toBe(3);
      expect(status.binaries).toHaveLength(5);
    });

    it('should return empty status for empty project', async () => {
      mockCallMCPTool.mockResolvedValueOnce({
        binaries: [],
      });

      const poller = getAnalysisPoller();
      const status = await poller.getAnalysisStatus();

      expect(status.total).toBe(0);
      expect(status.analyzed).toBe(0);
      expect(status.pending).toBe(0);
      expect(status.binaries).toEqual([]);
    });

    it('should include all binaries in the list', async () => {
      const mockBinaries = [
        { name: 'binary1', analyzed: true },
        { name: 'binary2', analyzed: false },
      ];

      mockCallMCPTool.mockResolvedValueOnce({
        binaries: mockBinaries,
      });

      const poller = getAnalysisPoller();
      const status = await poller.getAnalysisStatus();

      expect(status.binaries).toEqual(mockBinaries);
    });

    it('should handle all analyzed binaries', async () => {
      mockCallMCPTool.mockResolvedValueOnce({
        binaries: [
          { name: 'binary1', analyzed: true },
          { name: 'binary2', analyzed: true },
        ],
      });

      const poller = getAnalysisPoller();
      const status = await poller.getAnalysisStatus();

      expect(status.total).toBe(2);
      expect(status.analyzed).toBe(2);
      expect(status.pending).toBe(0);
    });

    it('should handle all pending binaries', async () => {
      mockCallMCPTool.mockResolvedValueOnce({
        binaries: [
          { name: 'binary1', analyzed: false },
          { name: 'binary2', analyzed: false },
        ],
      });

      const poller = getAnalysisPoller();
      const status = await poller.getAnalysisStatus();

      expect(status.total).toBe(2);
      expect(status.analyzed).toBe(0);
      expect(status.pending).toBe(2);
    });
  });

  describe('error types', () => {
    it('should create AnalysisTimeoutError with correct message', () => {
      const error = new AnalysisTimeoutError('test-binary', 5000);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AnalysisTimeoutError);
      expect(error.name).toBe('AnalysisTimeoutError');
      expect(error.message).toBe("Analysis did not complete for 'test-binary' within 5000ms");
    });

    it('should create BinaryNotFoundError with correct message', () => {
      const error = new BinaryNotFoundError('missing-binary');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BinaryNotFoundError);
      expect(error.name).toBe('BinaryNotFoundError');
      expect(error.message).toBe("Binary 'missing-binary' not found in project");
    });
  });
});
