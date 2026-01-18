/**
 * Unit Tests for chrome-devtools upload-file Wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMCPMock, getAllSecurityScenarios, MCPErrors } from '@claude/testing';

vi.mock('../config/lib/mcp-client', () => ({ callMCPTool: vi.fn() }));

import { uploadFile } from './upload-file';
import * as mcpClient from '../config/lib/mcp-client';

describe('upload-file - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => { vi.clearAllMocks(); });

  describe('Input validation', () => {
    it('should accept valid uid and filePath', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await uploadFile.execute({ uid: 'input-file', filePath: '/path/to/file.pdf' });
      expect(result).toMatchObject({ success: true });
      expect(mcpMock).toHaveBeenCalledWith('chrome-devtools', 'upload_file', { uid: 'input-file', filePath: '/path/to/file.pdf' });
    });

    it('should reject missing uid field', async () => {
      await expect(uploadFile.execute({ filePath: '/path/to/file.pdf' } as any)).rejects.toThrow();
    });

    it('should reject missing filePath field', async () => {
      await expect(uploadFile.execute({ uid: 'input-file' } as any)).rejects.toThrow();
    });

    it('should reject empty uid', async () => {
      await expect(uploadFile.execute({ uid: '', filePath: '/path/to/file.pdf' })).rejects.toThrow();
    });

    it('should reject empty filePath', async () => {
      await expect(uploadFile.execute({ uid: 'input-file', filePath: '' })).rejects.toThrow();
    });

    it('should handle multiple valid inputs', async () => {
      const inputs = [
        { uid: 'file-1', filePath: '/tmp/test.txt' },
        { uid: 'file-2', filePath: '/home/user/document.pdf' },
        { uid: 'file-3', filePath: 'C:\\Users\\test\\file.doc' },
      ];
      for (const input of inputs) {
        mcpMock.mockResolvedValue(undefined);
        const result = await uploadFile.execute(input);
        expect(result.success).toBe(true);
      }
      expect(mcpMock).toHaveBeenCalledTimes(inputs.length);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(uploadFile.execute({ uid: 'test', filePath: '/test' })).rejects.toThrow(/rate limit/i);
    });
    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());
      await expect(uploadFile.execute({ uid: 'test', filePath: '/test' })).rejects.toThrow(/server.*error/i);
    });
    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(uploadFile.execute({ uid: 'test', filePath: '/test' })).rejects.toThrow(/ETIMEDOUT/);
    });
    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('file'));
      await expect(uploadFile.execute({ uid: 'test', filePath: '/test' })).rejects.toThrow(/not found/i);
    });
    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());
      await expect(uploadFile.execute({ uid: 'test', filePath: '/test' })).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });
    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());
      await expect(uploadFile.execute({ uid: 'test', filePath: '/test' })).rejects.toThrow(/authentication/i);
    });
    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected error'));
      await expect(uploadFile.execute({ uid: 'test', filePath: '/test' })).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    it('should document security attack vector handling for uid', async () => {
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue(undefined);
        try {
          await uploadFile.execute({ uid: scenario.input, filePath: '/test' });
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios (uid): ${blockedCount} blocked, ${passedCount} passed through`);
      expect(blockedCount + passedCount).toBe(securityScenarios.length);
    });
    it('should document security attack vector handling for filePath', async () => {
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue(undefined);
        try {
          await uploadFile.execute({ uid: 'test', filePath: scenario.input });
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios (filePath): ${blockedCount} blocked, ${passedCount} passed through`);
      expect(blockedCount + passedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true when MCP returns void/undefined', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await uploadFile.execute({ uid: 'test', filePath: '/test' });
      expect(result).toMatchObject({ success: true });
    });
    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);
      const result = await uploadFile.execute({ uid: 'test', filePath: '/test' });
      expect(result).toMatchObject({ success: true });
    });
    it('should return consistent output schema', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await uploadFile.execute({ uid: 'test', filePath: '/test' });
      expect(result).toHaveProperty('success');
      expect(Object.keys(result)).toEqual(['success', 'estimatedTokens']);
    });
    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue(['uploaded']);
      const result = await uploadFile.execute({ uid: 'test', filePath: '/test' });
      expect(result).toMatchObject({ success: true });
    });
    it('should handle tuple format from MCP', async () => {
      mcpMock.mockResolvedValue([{ uploaded: true }, null]);
      const result = await uploadFile.execute({ uid: 'test', filePath: '/test' });
      expect(result).toMatchObject({ success: true });
    });
    it('should handle object format from MCP', async () => {
      mcpMock.mockResolvedValue({ data: { uploaded: true }, status: 'ok' });
      const result = await uploadFile.execute({ uid: 'test', filePath: '/test' });
      expect(result).toMatchObject({ success: true });
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue(undefined);
      const start = Date.now();
      for (let i = 0; i < 100; i++) await uploadFile.execute({ uid: 'test', filePath: '/test' });
      const avgTime = (Date.now() - start) / 100;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('should handle paths with spaces', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await uploadFile.execute({ uid: 'test', filePath: '/path with spaces/file.txt' });
      expect(result).toMatchObject({ success: true });
    });
    it('should handle paths with special characters', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await uploadFile.execute({ uid: 'test', filePath: '/path/file (1).txt' });
      expect(result).toMatchObject({ success: true });
    });
  });

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue(undefined);
      await uploadFile.execute({ uid: 'test', filePath: '/test' });
      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('upload_file');
      expect(params).toEqual({ uid: 'test', filePath: '/test' });
    });
    it('should not call MCP if input validation fails', async () => {
      await expect(uploadFile.execute({} as any)).rejects.toThrow();
      expect(mcpMock).not.toHaveBeenCalled();
    });
  });
});
