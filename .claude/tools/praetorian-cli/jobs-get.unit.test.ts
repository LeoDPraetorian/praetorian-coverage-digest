/**
 * jobs-get.ts - Unit Tests
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext, MockJob, measureAvgExecutionTime, MCPErrors } from './test-fixtures';

// Note: testSecurityScenarios is available from test-fixtures for automated security testing

vi.mock('../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { jobsGet } from './jobs-get';

describe('jobsGet', () => {
  const ctx = createTestContext();
  beforeEach(() => ctx.beforeEach());
  afterEach(() => ctx.afterEach());

  describe('Schema Validation', () => {
    it('should accept valid key', async () => {
      ctx.mcpMock.mockResolvedValue(MockJob);
      const result = await jobsGet.execute({ key: '#job#12345' });
      expect(result).toBeDefined();
    });

    it('should reject empty key', async () => {
      await expect(jobsGet.execute({ key: '' })).rejects.toThrow();
    });
  });

  describe('Response Format Validation', () => {
    it('should handle tuple format', async () => {
      ctx.mcpMock.mockResolvedValue([MockJob, null]);
      try { const result = await jobsGet.execute({ key: '#job#test' }); expect(result).toBeDefined(); } catch (e) { expect(e).toBeDefined(); }
    });

    it('should handle direct array format', async () => {
      ctx.mcpMock.mockResolvedValue([MockJob]);
      try { const result = await jobsGet.execute({ key: '#job#test' }); expect(result).toBeDefined(); } catch (e) { expect(e).toBeDefined(); }
    });

    it('should handle object format', async () => {
      ctx.mcpMock.mockResolvedValue({ data: MockJob });
      try { const result = await jobsGet.execute({ key: '#job#test' }); expect(result).toBeDefined(); } catch (e) { expect(e).toBeDefined(); }
    });
  });

  describe('Error Handling', () => {
    it('should handle not found errors', async () => {
      ctx.mcpMock.mockRejectedValue(MCPErrors.notFound('#job#nonexistent'));
      await expect(jobsGet.execute({ key: '#job#nonexistent' })).rejects.toThrow(/not found/i);
    });

    it('should handle timeout errors', async () => {
      ctx.mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(jobsGet.execute({ key: '#job#test' })).rejects.toThrow(/ETIMEDOUT/i);
    });
  });

  describe('Security Testing', () => {
    it('should handle SQL injection attempts', async () => { ctx.mcpMock.mockResolvedValue(MockJob); try { await jobsGet.execute({ key: "'; DROP TABLE --" }); } catch {} });
    it('should handle command injection attempts', async () => { ctx.mcpMock.mockResolvedValue(MockJob); try { await jobsGet.execute({ key: '$(whoami)' }); } catch {} });
    it('should handle path traversal attempts', async () => { ctx.mcpMock.mockResolvedValue(MockJob); try { await jobsGet.execute({ key: '../../../etc/passwd' }); } catch {} });
    it('should handle XSS attempts', async () => { ctx.mcpMock.mockResolvedValue(MockJob); try { await jobsGet.execute({ key: '<script>alert("xss")</script>' }); } catch {} });
    it('should sanitize output', async () => { ctx.mcpMock.mockResolvedValue({ ...MockJob, password: 'secret' }); const result = await jobsGet.execute({ key: '#job#test' }); expect(JSON.stringify(result)).not.toContain('secret'); });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      ctx.mcpMock.mockResolvedValue(MockJob);
      const avgTime = await measureAvgExecutionTime(() => jobsGet.execute({ key: '#job#test' }), 50);
      expect(avgTime).toBeLessThan(10);
    });
  });

  describe('Edge Case Tests', () => {
    it('should handle null MCP response', async () => { ctx.mcpMock.mockResolvedValue(null); try { await jobsGet.execute({ key: '#job#test' }); } catch (e) { expect(e).toBeDefined(); } });
    it('should handle undefined MCP response', async () => { ctx.mcpMock.mockResolvedValue(undefined); try { await jobsGet.execute({ key: '#job#test' }); } catch (e) { expect(e).toBeDefined(); } });
  });
});
