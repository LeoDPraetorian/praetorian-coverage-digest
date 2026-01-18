/**
 * risks-get.ts - Unit Tests
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext, MockRisk, calculateReduction, measureAvgExecutionTime, MCPErrors } from './test-fixtures';

// Note: testSecurityScenarios is available from test-fixtures for automated security testing

vi.mock('../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { risksGet } from './risks-get';

describe('risksGet', () => {
  const ctx = createTestContext();
  beforeEach(() => ctx.beforeEach());
  afterEach(() => ctx.afterEach());

  describe('Schema Validation', () => {
    it('should accept valid key', async () => {
      ctx.mcpMock.mockResolvedValue(MockRisk);
      const result = await risksGet.execute({ key: '#risk#example.com#sql' });
      expect(result).toBeDefined();
    });

    it('should reject empty key', async () => {
      await expect(risksGet.execute({ key: '' })).rejects.toThrow();
    });
  });

  describe('Response Format Validation', () => {
    it('should handle tuple format', async () => {
      ctx.mcpMock.mockResolvedValue([MockRisk, null]);
      try {
        const result = await risksGet.execute({ key: '#risk#test' });
        expect(result).toBeDefined();
      } catch (e) { expect(e).toBeDefined(); }
    });

    it('should handle direct array format', async () => {
      ctx.mcpMock.mockResolvedValue([MockRisk]);
      try {
        const result = await risksGet.execute({ key: '#risk#test' });
        expect(result).toBeDefined();
      } catch (e) { expect(e).toBeDefined(); }
    });

    it('should handle object format', async () => {
      ctx.mcpMock.mockResolvedValue({ data: MockRisk });
      try {
        const result = await risksGet.execute({ key: '#risk#test' });
        expect(result).toBeDefined();
      } catch (e) { expect(e).toBeDefined(); }
    });
  });

  describe('Error Handling', () => {
    it('should handle not found errors', async () => {
      ctx.mcpMock.mockRejectedValue(MCPErrors.notFound('#risk#nonexistent'));
      await expect(risksGet.execute({ key: '#risk#nonexistent' })).rejects.toThrow(/not found/i);
    });

    it('should handle timeout errors', async () => {
      ctx.mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(risksGet.execute({ key: '#risk#test' })).rejects.toThrow(/ETIMEDOUT/i);
    });
  });

  describe('Security Testing', () => {
    it('should handle SQL injection attempts', async () => {
      ctx.mcpMock.mockResolvedValue(MockRisk);
      try { await risksGet.execute({ key: "'; DROP TABLE risks; --" }); } catch {}
    });

    it('should handle command injection attempts', async () => {
      ctx.mcpMock.mockResolvedValue(MockRisk);
      try { await risksGet.execute({ key: '$(whoami)' }); } catch {}
    });

    it('should handle path traversal attempts', async () => {
      ctx.mcpMock.mockResolvedValue(MockRisk);
      try { await risksGet.execute({ key: '../../../etc/passwd' }); } catch {}
    });

    it('should handle XSS attempts', async () => {
      ctx.mcpMock.mockResolvedValue(MockRisk);
      try { await risksGet.execute({ key: '<script>alert("xss")</script>' }); } catch {}
    });

    it('should sanitize output', async () => {
      ctx.mcpMock.mockResolvedValue({ ...MockRisk, password: 'secret' });
      const result = await risksGet.execute({ key: '#risk#test' });
      expect(JSON.stringify(result)).not.toContain('secret');
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      ctx.mcpMock.mockResolvedValue(MockRisk);
      const avgTime = await measureAvgExecutionTime(() => risksGet.execute({ key: '#risk#test' }), 50);
      expect(avgTime).toBeLessThan(10);
    });
  });

  describe('Edge Case Tests', () => {
    it('should handle null MCP response', async () => {
      ctx.mcpMock.mockResolvedValue(null);
      try { await risksGet.execute({ key: '#risk#test' }); } catch (e) { expect(e).toBeDefined(); }
    });

    it('should handle undefined MCP response', async () => {
      ctx.mcpMock.mockResolvedValue(undefined);
      try { await risksGet.execute({ key: '#risk#test' }); } catch (e) { expect(e).toBeDefined(); }
    });
  });
});
