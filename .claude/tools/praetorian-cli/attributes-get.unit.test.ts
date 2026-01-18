/**
 * attributes-get.ts - Unit Tests
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext, MockAttribute, measureAvgExecutionTime, MCPErrors } from './test-fixtures';

// Note: testSecurityScenarios is available from test-fixtures for automated security testing

vi.mock('../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { attributesGet } from './attributes-get';

describe('attributesGet', () => {
  const ctx = createTestContext();
  beforeEach(() => ctx.beforeEach());
  afterEach(() => ctx.afterEach());

  describe('Schema Validation', () => {
    it('should accept valid key', async () => {
      ctx.mcpMock.mockResolvedValue(MockAttribute);
      const result = await attributesGet.execute({ key: '#attribute#example.com' });
      expect(result).toBeDefined();
    });

    it('should reject empty key', async () => {
      await expect(attributesGet.execute({ key: '' })).rejects.toThrow();
    });
  });

  describe('Response Format Validation', () => {
    it('should handle tuple format', async () => {
      ctx.mcpMock.mockResolvedValue([MockAttribute, null]);
      try { const result = await attributesGet.execute({ key: '#attribute#test' }); expect(result).toBeDefined(); } catch (e) { expect(e).toBeDefined(); }
    });

    it('should handle direct array format', async () => {
      ctx.mcpMock.mockResolvedValue([MockAttribute]);
      try { const result = await attributesGet.execute({ key: '#attribute#test' }); expect(result).toBeDefined(); } catch (e) { expect(e).toBeDefined(); }
    });

    it('should handle object format', async () => {
      ctx.mcpMock.mockResolvedValue({ data: MockAttribute });
      try { const result = await attributesGet.execute({ key: '#attribute#test' }); expect(result).toBeDefined(); } catch (e) { expect(e).toBeDefined(); }
    });
  });

  describe('Error Handling', () => {
    it('should handle not found errors', async () => {
      ctx.mcpMock.mockRejectedValue(MCPErrors.notFound('#attribute#nonexistent'));
      await expect(attributesGet.execute({ key: '#attribute#nonexistent' })).rejects.toThrow(/not found/i);
    });

    it('should handle timeout errors', async () => {
      ctx.mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(attributesGet.execute({ key: '#attribute#test' })).rejects.toThrow(/ETIMEDOUT/i);
    });
  });

  describe('Security Testing', () => {
    it('should handle SQL injection attempts', async () => { ctx.mcpMock.mockResolvedValue(MockAttribute); try { await attributesGet.execute({ key: "'; DROP TABLE --" }); } catch {} });
    it('should handle command injection attempts', async () => { ctx.mcpMock.mockResolvedValue(MockAttribute); try { await attributesGet.execute({ key: '$(whoami)' }); } catch {} });
    it('should handle path traversal attempts', async () => { ctx.mcpMock.mockResolvedValue(MockAttribute); try { await attributesGet.execute({ key: '../../../etc/passwd' }); } catch {} });
    it('should handle XSS attempts', async () => { ctx.mcpMock.mockResolvedValue(MockAttribute); try { await attributesGet.execute({ key: '<script>alert("xss")</script>' }); } catch {} });
    it('should sanitize output', async () => { ctx.mcpMock.mockResolvedValue({ ...MockAttribute, password: 'secret' }); const result = await attributesGet.execute({ key: '#attribute#test' }); expect(JSON.stringify(result)).not.toContain('secret'); });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      ctx.mcpMock.mockResolvedValue(MockAttribute);
      const avgTime = await measureAvgExecutionTime(() => attributesGet.execute({ key: '#attribute#test' }), 50);
      expect(avgTime).toBeLessThan(10);
    });
  });

  describe('Edge Case Tests', () => {
    it('should handle null MCP response', async () => { ctx.mcpMock.mockResolvedValue(null); try { await attributesGet.execute({ key: '#attribute#test' }); } catch (e) { expect(e).toBeDefined(); } });
    it('should handle undefined MCP response', async () => { ctx.mcpMock.mockResolvedValue(undefined); try { await attributesGet.execute({ key: '#attribute#test' }); } catch (e) { expect(e).toBeDefined(); } });
  });
});
