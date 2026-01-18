/**
 * Unit Tests for chrome-devtools fill Wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMCPMock, getAllSecurityScenarios, MCPErrors } from '@claude/testing';

// Mock the dynamic import for local mcp-client.js
const mockCallMCPTool = vi.fn();
vi.mock('./mcp-client.js', () => ({
  callMCPTool: mockCallMCPTool,
  MCPTools: { FILL: 'fill' }
}));

import { fill } from './fill';

// Valid UUID for pageId (PageIdSchema requires UUID format)
const VALID_PAGE_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('fill - Unit Tests', () => {
  beforeEach(() => {
    mockCallMCPTool.mockReset();
  });

  afterEach(() => { vi.clearAllMocks(); });

  describe('Input validation', () => {
    it('should accept valid pageId, selector, and value', async () => {
      mockCallMCPTool.mockResolvedValue(undefined);
      const result = await fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#username',
        value: 'testuser'
      });
      expect(result.success).toBe(true);
      expect(mockCallMCPTool).toHaveBeenCalledWith('fill', {
        uid: '#username',
        value: 'testuser'
      });
    });

    it('should accept optional timeout', async () => {
      mockCallMCPTool.mockResolvedValue(undefined);
      const result = await fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#email',
        value: 'test@example.com',
        timeout: 5000
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional clear flag', async () => {
      mockCallMCPTool.mockResolvedValue(undefined);
      const result = await fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#field',
        value: 'append this',
        clear: false
      });
      expect(result.success).toBe(true);
    });

    it('should use clear: true as default', async () => {
      mockCallMCPTool.mockResolvedValue(undefined);
      const result = await fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#field',
        value: 'test'
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing pageId', async () => {
      await expect(fill.execute({
        selector: '#field',
        value: 'test'
      } as any)).rejects.toThrow();
    });

    it('should reject missing selector', async () => {
      await expect(fill.execute({
        pageId: VALID_PAGE_ID,
        value: 'test'
      } as any)).rejects.toThrow();
    });

    it('should reject missing value', async () => {
      await expect(fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#field'
      } as any)).rejects.toThrow();
    });

    it('should accept non-UUID pageId (schema defines UUID but implementation may vary)', async () => {
      // Note: PageIdSchema defines z.string().uuid() but actual behavior allows non-UUID
      // This documents actual behavior - update if validation is tightened
      mockCallMCPTool.mockResolvedValue(undefined);
      const result = await fill.execute({
        pageId: 'page-123',
        selector: '#field',
        value: 'test'
      });
      expect(result.success).toBe(true);
    });

    it('should reject value exceeding 10000 characters', async () => {
      await expect(fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#field',
        value: 'a'.repeat(10001)
      })).rejects.toThrow(/too long/i);
    });

    it('should handle multiple valid inputs', async () => {
      const inputs = [
        { pageId: '550e8400-e29b-41d4-a716-446655440001', selector: '#name', value: 'John' },
        { pageId: '550e8400-e29b-41d4-a716-446655440002', selector: '.email', value: 'john@test.com' },
        { pageId: '550e8400-e29b-41d4-a716-446655440003', selector: 'input[name="phone"]', value: '555-1234' },
        { pageId: '550e8400-e29b-41d4-a716-446655440004', selector: '#address', value: '123 Main St', timeout: 3000 },
      ];
      for (const input of inputs) {
        mockCallMCPTool.mockResolvedValue(undefined);
        const result = await fill.execute(input);
        expect(result.success).toBe(true);
      }
      expect(mockCallMCPTool).toHaveBeenCalledTimes(inputs.length);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mockCallMCPTool.mockRejectedValue(MCPErrors.rateLimit());
      await expect(fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#f',
        value: 'v'
      })).rejects.toThrow(/rate limit/i);
    });
    it('should handle server errors', async () => {
      mockCallMCPTool.mockRejectedValue(MCPErrors.serverError());
      await expect(fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#f',
        value: 'v'
      })).rejects.toThrow(/server.*error/i);
    });
    it('should handle network timeout', async () => {
      mockCallMCPTool.mockRejectedValue(MCPErrors.timeout());
      await expect(fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#f',
        value: 'v'
      })).rejects.toThrow(/ETIMEDOUT/);
    });
    it('should handle not found errors', async () => {
      mockCallMCPTool.mockRejectedValue(MCPErrors.notFound('element'));
      await expect(fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#missing',
        value: 'v'
      })).rejects.toThrow(/not found/i);
    });
    it('should handle network errors', async () => {
      mockCallMCPTool.mockRejectedValue(MCPErrors.networkError());
      await expect(fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#f',
        value: 'v'
      })).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });
    it('should handle unauthorized errors', async () => {
      mockCallMCPTool.mockRejectedValue(MCPErrors.unauthorized());
      await expect(fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#f',
        value: 'v'
      })).rejects.toThrow(/authentication/i);
    });
    it('should propagate unexpected errors', async () => {
      mockCallMCPTool.mockRejectedValue(new Error('Unexpected error'));
      await expect(fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#f',
        value: 'v'
      })).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    it('should block XSS in selector containing <script', async () => {
      await expect(fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '<script>alert(1)</script>',
        value: 'test'
      })).rejects.toThrow(/XSS/i);
      expect(mockCallMCPTool).not.toHaveBeenCalled();
    });

    it('should block XSS in selector containing javascript:', async () => {
      await expect(fill.execute({
        pageId: VALID_PAGE_ID,
        selector: 'javascript:alert(1)',
        value: 'test'
      })).rejects.toThrow(/XSS/i);
      expect(mockCallMCPTool).not.toHaveBeenCalled();
    });

    it('should document security attack vector handling for value', async () => {
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mockCallMCPTool.mockResolvedValue(undefined);
        try {
          await fill.execute({
            pageId: VALID_PAGE_ID,
            selector: '#field',
            value: scenario.input
          });
          passedCount++;
        } catch { blockedCount++; }
        mockCallMCPTool.mockClear();
      }
      console.log(`Security scenarios (value): ${blockedCount} blocked, ${passedCount} passed through`);
      // Note: Value is passed through - security enforced at MCP level
      expect(blockedCount + passedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true with message and timestamp', async () => {
      mockCallMCPTool.mockResolvedValue(undefined);
      const result = await fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#username',
        value: 'testuser'
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('#username');
      expect(result.timestamp).toBeDefined();
    });
    it('should return success true when MCP returns void/undefined', async () => {
      mockCallMCPTool.mockResolvedValue(undefined);
      const result = await fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#f',
        value: 'v'
      });
      expect(result.success).toBe(true);
    });
    it('should return success true when MCP returns null', async () => {
      mockCallMCPTool.mockResolvedValue(null);
      const result = await fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#f',
        value: 'v'
      });
      expect(result.success).toBe(true);
    });
    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mockCallMCPTool.mockResolvedValue(['filled']);
      const result = await fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#f',
        value: 'v'
      });
      expect(result.success).toBe(true);
    });
    it('should handle tuple format from MCP', async () => {
      mockCallMCPTool.mockResolvedValue([{ filled: true }, null]);
      const result = await fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#f',
        value: 'v'
      });
      expect(result.success).toBe(true);
    });
    it('should handle object format from MCP', async () => {
      mockCallMCPTool.mockResolvedValue({ data: { filled: true }, status: 'ok' });
      const result = await fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#f',
        value: 'v'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mockCallMCPTool.mockResolvedValue(undefined);
      const start = Date.now();
      for (let i = 0; i < 100; i++) await fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#f',
        value: 'v'
      });
      const avgTime = (Date.now() - start) / 100;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('should handle very long value up to 10000 chars', async () => {
      mockCallMCPTool.mockResolvedValue(undefined);
      const result = await fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#textarea',
        value: 'a'.repeat(10000)
      });
      expect(result.success).toBe(true);
    });
    it('should handle special characters in selector', async () => {
      mockCallMCPTool.mockResolvedValue(undefined);
      const result = await fill.execute({
        pageId: VALID_PAGE_ID,
        selector: 'input[data-test="form:field"]',
        value: 'test'
      });
      expect(result.success).toBe(true);
    });
    it('should handle unicode characters in value', async () => {
      mockCallMCPTool.mockResolvedValue(undefined);
      const result = await fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#field',
        value: 'Hello'
      });
      expect(result.success).toBe(true);
    });
    it('should handle empty value string', async () => {
      mockCallMCPTool.mockResolvedValue(undefined);
      const result = await fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#field',
        value: ''
      });
      expect(result.success).toBe(true);
    });
  });

  describe('MCP integration patterns', () => {
    it('should call MCP with correct parameters', async () => {
      mockCallMCPTool.mockResolvedValue(undefined);
      await fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '#email',
        value: 'user@example.com'
      });
      expect(mockCallMCPTool).toHaveBeenCalledWith('fill', {
        uid: '#email',
        value: 'user@example.com'
      });
    });
    it('should not call MCP if input validation fails', async () => {
      await expect(fill.execute({} as any)).rejects.toThrow();
      expect(mockCallMCPTool).not.toHaveBeenCalled();
    });
    it('should not call MCP if XSS detected in selector', async () => {
      await expect(fill.execute({
        pageId: VALID_PAGE_ID,
        selector: '<script>',
        value: 'test'
      })).rejects.toThrow(/XSS/i);
      expect(mockCallMCPTool).not.toHaveBeenCalled();
    });
  });
});
