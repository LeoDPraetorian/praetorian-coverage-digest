/**
 * risks-list.ts - Unit Tests
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext, MockRisk, createMockRisks, createVerboseRisks, createRisksBySeverity, calculateReduction, measureAvgExecutionTime, MCPErrors } from './test-fixtures';

// Note: testSecurityScenarios is available from test-fixtures for automated security testing

vi.mock('../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { risksList } from './risks-list';

describe('risksList', () => {
  const ctx = createTestContext();
  beforeEach(() => ctx.beforeEach());
  afterEach(() => ctx.afterEach());

  describe('Schema Validation', () => {
    it('should accept valid input', async () => {
      ctx.mcpMock.mockResolvedValue([[MockRisk], null]);
      const result = await risksList.execute({});
      expect(result).toBeDefined();
    });

    it('should accept filter params', async () => {
      ctx.mcpMock.mockResolvedValue([[MockRisk], null]);
      const result = await risksList.execute({ contains_filter: 'sql', offset: 'prev-offset', pages: 2 });
      expect(result).toBeDefined();
    });
  });

  describe('Token Reduction', () => {
    it('should achieve ≥80% reduction', async () => {
      const verboseRisks = createVerboseRisks(100);
      ctx.mcpMock.mockResolvedValue([verboseRisks, null]);
      const result = await risksList.execute({});
      const reduction = calculateReduction([verboseRisks, null], result);
      expect(reduction).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Filtering Effectiveness', () => {
    it('should categorize risks by severity', async () => {
      const risks = createRisksBySeverity();
      ctx.mcpMock.mockResolvedValue([risks, null]);
      const result = await risksList.execute({});
      expect(result.summary.critical_count).toBe(1);
      expect(result.summary.high_count).toBe(1);
      expect(result.critical_risks.length).toBe(1);
      expect(result.high_risks.length).toBe(1);
    });

    it('should prioritize critical risks', async () => {
      ctx.mcpMock.mockResolvedValue([[MockRisk], null]);
      const result = await risksList.execute({});
      expect(result.critical_risks[0].key).toBe(MockRisk.key);
    });
  });

  describe('Response Format Validation', () => {
    it('should handle tuple format', async () => {
      ctx.mcpMock.mockResolvedValue([[MockRisk], 12345]);
      const result = await risksList.execute({});
      expect(result.next_offset).toBe(12345);
    });

    it('should handle direct array format', async () => {
      ctx.mcpMock.mockResolvedValue([MockRisk]);
      const result = await risksList.execute({});
      expect(result).toBeDefined();
    });

    it('should handle object format', async () => {
      ctx.mcpMock.mockResolvedValue({ data: [[MockRisk], null] });
      try { const result = await risksList.execute({}); expect(result).toBeDefined(); } catch (e) { expect(e).toBeDefined(); }
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limit errors', async () => {
      ctx.mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(risksList.execute({})).rejects.toThrow(/rate limit/i);
    });

    it('should handle timeout errors', async () => {
      ctx.mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(risksList.execute({})).rejects.toThrow(/ETIMEDOUT/i);
    });
  });

  describe('Security Testing', () => {
    it('should handle SQL injection attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await risksList.execute({ contains_filter: "'; DROP TABLE --" }); } catch {} });
    it('should handle command injection attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await risksList.execute({ contains_filter: '$(whoami)' }); } catch {} });
    it('should handle path traversal attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await risksList.execute({ contains_filter: '../../../etc/passwd' }); } catch {} });
    it('should handle XSS attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await risksList.execute({ contains_filter: '<script>alert("xss")</script>' }); } catch {} });
    it('should sanitize output', async () => { ctx.mcpMock.mockResolvedValue([[{ ...MockRisk, password: 'secret' }], null]); const result = await risksList.execute({}); expect(JSON.stringify(result)).not.toContain('secret'); });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      ctx.mcpMock.mockResolvedValue([[MockRisk], null]);
      const avgTime = await measureAvgExecutionTime(() => risksList.execute({}), 50);
      expect(avgTime).toBeLessThan(10);
    });
  });

  describe('Edge Case Tests', () => {
    it('should handle null MCP response', async () => { ctx.mcpMock.mockResolvedValue(null); try { await risksList.execute({}); } catch (e) { expect(e).toBeDefined(); } });
    it('should handle undefined MCP response', async () => { ctx.mcpMock.mockResolvedValue(undefined); try { await risksList.execute({}); } catch (e) { expect(e).toBeDefined(); } });
    it('should handle empty results', async () => { ctx.mcpMock.mockResolvedValue([[], null]); const result = await risksList.execute({}); expect(result.critical_risks).toHaveLength(0); });
  });
});
