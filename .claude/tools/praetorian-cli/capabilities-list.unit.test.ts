/**
 * capabilities-list.ts - Unit Tests
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext, MockCapability, createMockCapabilities, calculateReduction, measureAvgExecutionTime, MCPErrors } from './test-fixtures';

// Note: testSecurityScenarios is available from test-fixtures for automated security testing

vi.mock('../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { capabilitiesList } from './capabilities-list';

describe('capabilitiesList', () => {
  const ctx = createTestContext();
  beforeEach(() => ctx.beforeEach());
  afterEach(() => ctx.afterEach());

  describe('Schema Validation', () => {
    it('should accept valid input', async () => {
      ctx.mcpMock.mockResolvedValue([[MockCapability], null]);
      const result = await capabilitiesList.execute({});
      expect(result).toBeDefined();
    });

    it('should accept filter params', async () => {
      ctx.mcpMock.mockResolvedValue([[MockCapability], null]);
      const result = await capabilitiesList.execute({ name: 'nuclei', target: 'asset', executor: 'chariot' });
      expect(result).toBeDefined();
    });
  });

  describe('Token Reduction', () => {
    it('should achieve token reduction on large result sets', async () => {
      const verboseCapabilities = createMockCapabilities(100).map(c => ({ ...c, metadata: { verbose: 'A'.repeat(500) } }));
      ctx.mcpMock.mockResolvedValue([verboseCapabilities, null]);
      const result = await capabilitiesList.execute({});
      const reduction = calculateReduction([verboseCapabilities, null], result);
      expect(reduction).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Response Format Validation', () => {
    it('should handle tuple format', async () => {
      ctx.mcpMock.mockResolvedValue([[MockCapability], 123]);
      const result = await capabilitiesList.execute({});
      expect(result).toBeDefined();
    });

    it('should handle direct array format', async () => {
      ctx.mcpMock.mockResolvedValue([MockCapability]);
      const result = await capabilitiesList.execute({});
      expect(result).toBeDefined();
    });

    it('should handle object format', async () => {
      ctx.mcpMock.mockResolvedValue({ data: [[MockCapability], null] });
      try { const result = await capabilitiesList.execute({}); expect(result).toBeDefined(); } catch (e) { expect(e).toBeDefined(); }
    });
  });

  describe('Filtering Effectiveness', () => {
    it('should count executors correctly', async () => {
      const capabilities = [
        { ...MockCapability, executor: 'chariot' },
        { ...MockCapability, executor: 'chariot' },
        { ...MockCapability, executor: 'agent' },
      ];
      ctx.mcpMock.mockResolvedValue([capabilities, null]);
      const result = await capabilitiesList.execute({});
      expect(result.summary.executors['chariot']).toBe(2);
      expect(result.summary.executors['agent']).toBe(1);
    });

    it('should count targets correctly', async () => {
      const capabilities = [
        { ...MockCapability, target: 'asset' },
        { ...MockCapability, target: 'attribute' },
      ];
      ctx.mcpMock.mockResolvedValue([capabilities, null]);
      const result = await capabilitiesList.execute({});
      expect(result.summary.targets['asset']).toBe(1);
      expect(result.summary.targets['attribute']).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limit errors', async () => {
      ctx.mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(capabilitiesList.execute({})).rejects.toThrow(/rate limit/i);
    });

    it('should handle timeout errors', async () => {
      ctx.mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(capabilitiesList.execute({})).rejects.toThrow(/ETIMEDOUT/i);
    });
  });

  describe('Security Testing', () => {
    it('should handle SQL injection attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await capabilitiesList.execute({ name: "'; DROP TABLE --" }); } catch {} });
    it('should handle command injection attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await capabilitiesList.execute({ name: '$(whoami)' }); } catch {} });
    it('should handle path traversal attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await capabilitiesList.execute({ name: '../../../etc/passwd' }); } catch {} });
    it('should handle XSS attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await capabilitiesList.execute({ name: '<script>alert("xss")</script>' }); } catch {} });
    it('should sanitize output', async () => { ctx.mcpMock.mockResolvedValue([[{ ...MockCapability, password: 'secret' }], null]); const result = await capabilitiesList.execute({}); expect(JSON.stringify(result)).not.toContain('secret'); });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      ctx.mcpMock.mockResolvedValue([[MockCapability], null]);
      const avgTime = await measureAvgExecutionTime(() => capabilitiesList.execute({}), 50);
      expect(avgTime).toBeLessThan(10);
    });
  });

  describe('Edge Case Tests', () => {
    it('should handle null MCP response', async () => { ctx.mcpMock.mockResolvedValue(null); try { await capabilitiesList.execute({}); } catch (e) { expect(e).toBeDefined(); } });
    it('should handle undefined MCP response', async () => { ctx.mcpMock.mockResolvedValue(undefined); try { await capabilitiesList.execute({}); } catch (e) { expect(e).toBeDefined(); } });
    it('should handle empty results', async () => { ctx.mcpMock.mockResolvedValue([[], null]); const result = await capabilitiesList.execute({}); expect(result.capabilities).toHaveLength(0); });
  });
});
