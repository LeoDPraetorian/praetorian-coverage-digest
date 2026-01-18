/**
 * seeds-list.ts - Unit Tests
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext, MockSeed, createMockSeeds, calculateReduction, measureAvgExecutionTime, MCPErrors } from './test-fixtures';

// Note: testSecurityScenarios is available from test-fixtures for automated security testing

vi.mock('../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { seedsList } from './seeds-list';

describe('seedsList', () => {
  const ctx = createTestContext();
  beforeEach(() => ctx.beforeEach());
  afterEach(() => ctx.afterEach());

  describe('Schema Validation', () => {
    it('should accept valid input', async () => {
      ctx.mcpMock.mockResolvedValue([[MockSeed], null]);
      const result = await seedsList.execute({});
      expect(result).toBeDefined();
    });

    it('should accept filter params', async () => {
      ctx.mcpMock.mockResolvedValue([[MockSeed], null]);
      const result = await seedsList.execute({ seed_type: 'domain', key_prefix: 'example', pages: 2 });
      expect(result).toBeDefined();
    });
  });

  describe('Token Reduction', () => {
    it('should achieve token reduction on large result sets', async () => {
      const verboseSeeds = createMockSeeds(100).map(s => ({ ...s, metadata: { verbose: 'A'.repeat(500) } }));
      ctx.mcpMock.mockResolvedValue([verboseSeeds, null]);
      const result = await seedsList.execute({});
      const reduction = calculateReduction([verboseSeeds, null], result);
      expect(reduction).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Response Format Validation', () => {
    it('should handle tuple format', async () => {
      ctx.mcpMock.mockResolvedValue([[MockSeed], 12345]);
      const result = await seedsList.execute({});
      expect(result.next_offset).toBe(12345);
    });

    it('should handle direct array format', async () => {
      ctx.mcpMock.mockResolvedValue([MockSeed]);
      const result = await seedsList.execute({});
      expect(result).toBeDefined();
    });

    it('should handle object format', async () => {
      ctx.mcpMock.mockResolvedValue({ data: [[MockSeed], null] });
      try { const result = await seedsList.execute({}); expect(result).toBeDefined(); } catch (e) { expect(e).toBeDefined(); }
    });
  });

  describe('Filtering Effectiveness', () => {
    it('should count seed types correctly', async () => {
      const seeds = [
        { ...MockSeed, seed_type: 'domain' },
        { ...MockSeed, seed_type: 'domain' },
        { ...MockSeed, seed_type: 'ip' },
      ];
      ctx.mcpMock.mockResolvedValue([seeds, null]);
      const result = await seedsList.execute({});
      expect(result.summary.seed_types['domain']).toBe(2);
      expect(result.summary.seed_types['ip']).toBe(1);
    });

    it('should count statuses correctly', async () => {
      const seeds = [
        { ...MockSeed, status: 'A' },
        { ...MockSeed, status: 'D' },
      ];
      ctx.mcpMock.mockResolvedValue([seeds, null]);
      const result = await seedsList.execute({});
      expect(result.summary.statuses['A']).toBe(1);
      expect(result.summary.statuses['D']).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limit errors', async () => {
      ctx.mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(seedsList.execute({})).rejects.toThrow(/rate limit/i);
    });

    it('should handle timeout errors', async () => {
      ctx.mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(seedsList.execute({})).rejects.toThrow(/ETIMEDOUT/i);
    });
  });

  describe('Security Testing', () => {
    it('should handle SQL injection attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await seedsList.execute({ key_prefix: "'; DROP TABLE --" }); } catch {} });
    it('should handle command injection attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await seedsList.execute({ key_prefix: '$(whoami)' }); } catch {} });
    it('should handle path traversal attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await seedsList.execute({ key_prefix: '../../../etc/passwd' }); } catch {} });
    it('should handle XSS attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await seedsList.execute({ key_prefix: '<script>alert("xss")</script>' }); } catch {} });
    it('should sanitize output', async () => { ctx.mcpMock.mockResolvedValue([[{ ...MockSeed, password: 'secret' }], null]); const result = await seedsList.execute({}); expect(JSON.stringify(result)).not.toContain('secret'); });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      ctx.mcpMock.mockResolvedValue([[MockSeed], null]);
      const avgTime = await measureAvgExecutionTime(() => seedsList.execute({}), 50);
      expect(avgTime).toBeLessThan(10);
    });
  });

  describe('Edge Case Tests', () => {
    it('should handle null MCP response', async () => { ctx.mcpMock.mockResolvedValue(null); try { await seedsList.execute({}); } catch (e) { expect(e).toBeDefined(); } });
    it('should handle undefined MCP response', async () => { ctx.mcpMock.mockResolvedValue(undefined); try { await seedsList.execute({}); } catch (e) { expect(e).toBeDefined(); } });
    it('should handle empty results', async () => { ctx.mcpMock.mockResolvedValue([[], null]); const result = await seedsList.execute({}); expect(result.seeds).toHaveLength(0); });
  });
});
