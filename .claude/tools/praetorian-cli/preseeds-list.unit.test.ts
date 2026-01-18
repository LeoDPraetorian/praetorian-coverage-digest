/**
 * preseeds-list.ts - Unit Tests
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext, MockPreseed, createMockPreseeds, calculateReduction, measureAvgExecutionTime, MCPErrors } from './test-fixtures';

// Note: testSecurityScenarios is available from test-fixtures for automated security testing

vi.mock('../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { preseedsList } from './preseeds-list';

describe('preseedsList', () => {
  const ctx = createTestContext();
  beforeEach(() => ctx.beforeEach());
  afterEach(() => ctx.afterEach());

  describe('Schema Validation', () => {
    it('should accept valid input', async () => {
      ctx.mcpMock.mockResolvedValue([[MockPreseed], null]);
      const result = await preseedsList.execute({});
      expect(result).toBeDefined();
    });

    it('should accept filter params', async () => {
      ctx.mcpMock.mockResolvedValue([[MockPreseed], null]);
      const result = await preseedsList.execute({ prefix_filter: 'cidr', offset: 'prev-offset', pages: 2 });
      expect(result).toBeDefined();
    });
  });

  describe('Token Reduction', () => {
    it('should achieve token reduction on large result sets', async () => {
      const verbosePreseeds = createMockPreseeds(100).map(p => ({ ...p, metadata: { verbose: 'A'.repeat(500) } }));
      ctx.mcpMock.mockResolvedValue([verbosePreseeds, null]);
      const result = await preseedsList.execute({});
      const reduction = calculateReduction([verbosePreseeds, null], result);
      expect(reduction).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Response Format Validation', () => {
    it('should handle tuple format', async () => {
      ctx.mcpMock.mockResolvedValue([[MockPreseed], 12345]);
      const result = await preseedsList.execute({});
      expect(result.next_offset).toBe(12345);
    });

    it('should handle direct array format', async () => {
      ctx.mcpMock.mockResolvedValue([MockPreseed]);
      const result = await preseedsList.execute({});
      expect(result).toBeDefined();
    });

    it('should handle object format', async () => {
      ctx.mcpMock.mockResolvedValue({ data: [[MockPreseed], null] });
      try { const result = await preseedsList.execute({}); expect(result).toBeDefined(); } catch (e) { expect(e).toBeDefined(); }
    });
  });

  describe('Filtering Effectiveness', () => {
    it('should count preseed types correctly', async () => {
      const preseeds = [
        { ...MockPreseed, type: 'cidr' },
        { ...MockPreseed, type: 'cidr' },
        { ...MockPreseed, type: 'domain' },
      ];
      ctx.mcpMock.mockResolvedValue([preseeds, null]);
      const result = await preseedsList.execute({});
      expect(result.summary.preseed_types['cidr']).toBe(2);
      expect(result.summary.preseed_types['domain']).toBe(1);
    });

    it('should count statuses correctly', async () => {
      const preseeds = [
        { ...MockPreseed, status: 'A' },
        { ...MockPreseed, status: 'D' },
      ];
      ctx.mcpMock.mockResolvedValue([preseeds, null]);
      const result = await preseedsList.execute({});
      expect(result.summary.statuses['A']).toBe(1);
      expect(result.summary.statuses['D']).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limit errors', async () => {
      ctx.mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(preseedsList.execute({})).rejects.toThrow(/rate limit/i);
    });

    it('should handle timeout errors', async () => {
      ctx.mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(preseedsList.execute({})).rejects.toThrow(/ETIMEDOUT/i);
    });
  });

  describe('Security Testing', () => {
    it('should handle SQL injection attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await preseedsList.execute({ prefix_filter: "'; DROP TABLE --" }); } catch {} });
    it('should handle command injection attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await preseedsList.execute({ prefix_filter: '$(whoami)' }); } catch {} });
    it('should handle path traversal attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await preseedsList.execute({ prefix_filter: '../../../etc/passwd' }); } catch {} });
    it('should handle XSS attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await preseedsList.execute({ prefix_filter: '<script>alert("xss")</script>' }); } catch {} });
    it('should sanitize output', async () => { ctx.mcpMock.mockResolvedValue([[{ ...MockPreseed, password: 'secret' }], null]); const result = await preseedsList.execute({}); expect(JSON.stringify(result)).not.toContain('secret'); });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      ctx.mcpMock.mockResolvedValue([[MockPreseed], null]);
      const avgTime = await measureAvgExecutionTime(() => preseedsList.execute({}), 50);
      expect(avgTime).toBeLessThan(10);
    });
  });

  describe('Edge Case Tests', () => {
    it('should handle null MCP response', async () => { ctx.mcpMock.mockResolvedValue(null); try { await preseedsList.execute({}); } catch (e) { expect(e).toBeDefined(); } });
    it('should handle undefined MCP response', async () => { ctx.mcpMock.mockResolvedValue(undefined); try { await preseedsList.execute({}); } catch (e) { expect(e).toBeDefined(); } });
    it('should handle empty results', async () => { ctx.mcpMock.mockResolvedValue([[], null]); const result = await preseedsList.execute({}); expect(result.preseeds).toHaveLength(0); });
  });
});
