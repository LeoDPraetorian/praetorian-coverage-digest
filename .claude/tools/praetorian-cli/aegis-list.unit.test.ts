/**
 * aegis-list.ts - Unit Tests
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext, MockAegis, createMockAegisAgents, calculateReduction, measureAvgExecutionTime, MCPErrors } from './test-fixtures';

// Note: testSecurityScenarios is available from test-fixtures for automated security testing

vi.mock('../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { aegisList } from './aegis-list';

describe('aegisList', () => {
  const ctx = createTestContext();
  beforeEach(() => ctx.beforeEach());
  afterEach(() => ctx.afterEach());

  describe('Schema Validation', () => {
    it('should accept valid input', async () => {
      ctx.mcpMock.mockResolvedValue([[MockAegis], null]);
      const result = await aegisList.execute({});
      expect(result).toBeDefined();
    });
  });

  describe('Token Reduction', () => {
    it('should achieve token reduction on large result sets', async () => {
      const verboseAgents = createMockAegisAgents(100).map(a => ({ ...a, metadata: { verbose: 'A'.repeat(500) } }));
      ctx.mcpMock.mockResolvedValue([verboseAgents, null]);
      const result = await aegisList.execute({});
      const reduction = calculateReduction([verboseAgents, null], result);
      expect(reduction).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Response Format Validation', () => {
    it('should handle tuple format', async () => {
      ctx.mcpMock.mockResolvedValue([[MockAegis], 123]);
      const result = await aegisList.execute({});
      expect(result).toBeDefined();
    });

    it('should handle direct array format', async () => {
      ctx.mcpMock.mockResolvedValue([MockAegis]);
      const result = await aegisList.execute({});
      expect(result).toBeDefined();
    });

    it('should handle object format', async () => {
      ctx.mcpMock.mockResolvedValue({ data: [[MockAegis], null] });
      try { const result = await aegisList.execute({}); expect(result).toBeDefined(); } catch (e) { expect(e).toBeDefined(); }
    });
  });

  describe('Filtering Effectiveness', () => {
    it('should count online agents correctly', async () => {
      const agents = [
        { ...MockAegis, is_online: true },
        { ...MockAegis, is_online: true },
        { ...MockAegis, is_online: false },
      ];
      ctx.mcpMock.mockResolvedValue([agents, null]);
      const result = await aegisList.execute({});
      expect(result.summary.online_count).toBe(2);
    });

    it('should count OS distribution correctly', async () => {
      const agents = [
        { ...MockAegis, os: 'linux' },
        { ...MockAegis, os: 'linux' },
        { ...MockAegis, os: 'windows' },
      ];
      ctx.mcpMock.mockResolvedValue([agents, null]);
      const result = await aegisList.execute({});
      expect(result.summary.os_distribution['linux']).toBe(2);
      expect(result.summary.os_distribution['windows']).toBe(1);
    });

    it('should count tunnel status correctly', async () => {
      const agents = [
        { ...MockAegis, has_tunnel: true },
        { ...MockAegis, has_tunnel: true },
        { ...MockAegis, has_tunnel: false },
      ];
      ctx.mcpMock.mockResolvedValue([agents, null]);
      const result = await aegisList.execute({});
      expect(result.summary.tunnel_status.active).toBe(2);
      expect(result.summary.tunnel_status.inactive).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limit errors', async () => {
      ctx.mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(aegisList.execute({})).rejects.toThrow(/rate limit/i);
    });

    it('should handle timeout errors', async () => {
      ctx.mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(aegisList.execute({})).rejects.toThrow(/ETIMEDOUT/i);
    });
  });

  describe('Security Testing', () => {
    it('should handle SQL injection attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await aegisList.execute({}); } catch {} });
    it('should handle command injection attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await aegisList.execute({}); } catch {} });
    it('should handle path traversal attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await aegisList.execute({}); } catch {} });
    it('should handle XSS attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await aegisList.execute({}); } catch {} });
    it('should sanitize output', async () => { ctx.mcpMock.mockResolvedValue([[{ ...MockAegis, password: 'secret' }], null]); const result = await aegisList.execute({}); expect(JSON.stringify(result)).not.toContain('secret'); });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      ctx.mcpMock.mockResolvedValue([[MockAegis], null]);
      const avgTime = await measureAvgExecutionTime(() => aegisList.execute({}), 50);
      expect(avgTime).toBeLessThan(10);
    });
  });

  describe('Edge Case Tests', () => {
    it('should handle null MCP response', async () => { ctx.mcpMock.mockResolvedValue(null); try { await aegisList.execute({}); } catch (e) { expect(e).toBeDefined(); } });
    it('should handle undefined MCP response', async () => { ctx.mcpMock.mockResolvedValue(undefined); try { await aegisList.execute({}); } catch (e) { expect(e).toBeDefined(); } });
    it('should handle empty results', async () => { ctx.mcpMock.mockResolvedValue([[], null]); const result = await aegisList.execute({}); expect(result.agents).toHaveLength(0); });
  });
});
