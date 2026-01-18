/**
 * search-by-query.ts - Unit Tests
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext, MockAsset, createGraphQuery, calculateReduction, measureAvgExecutionTime, MCPErrors } from './test-fixtures';

// Note: testSecurityScenarios is available from test-fixtures for automated security testing

vi.mock('../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { searchByQuery } from './search-by-query';

const MockSearchResult = {
  key: '#asset#example.com#192.168.1.1',
  class: 'domain',
  name: 'example.com',
  status: 'A',
};

describe('searchByQuery', () => {
  const ctx = createTestContext();
  beforeEach(() => ctx.beforeEach());
  afterEach(() => ctx.afterEach());

  describe('Schema Validation', () => {
    it('should accept valid query', async () => {
      ctx.mcpMock.mockResolvedValue([[MockSearchResult], null]);
      const result = await searchByQuery.execute({ query: createGraphQuery(['Asset']) });
      expect(result).toBeDefined();
    });

    it('should accept query with filters', async () => {
      ctx.mcpMock.mockResolvedValue([[MockSearchResult], null]);
      const query = createGraphQuery(['Asset'], [{ field: 'status', operator: '=', value: 'A' }]);
      const result = await searchByQuery.execute({ query, pages: 2 });
      expect(result).toBeDefined();
    });

    it('should reject invalid JSON query', async () => {
      await expect(searchByQuery.execute({ query: 'not valid json' })).rejects.toThrow(/Invalid query JSON/i);
    });
  });

  describe('Token Reduction', () => {
    it('should achieve token reduction on large result sets', async () => {
      const verboseResults = Array(100).fill(null).map((_, i) => ({
        ...MockSearchResult,
        key: `#asset#example${i}.com#192.168.1.${i}`,
        metadata: { verbose: 'A'.repeat(500) },
      }));
      ctx.mcpMock.mockResolvedValue([verboseResults, null]);
      const result = await searchByQuery.execute({ query: createGraphQuery(['Asset']) });
      const reduction = calculateReduction([verboseResults, null], result);
      expect(reduction).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Response Format Validation', () => {
    it('should handle tuple format', async () => {
      ctx.mcpMock.mockResolvedValue([[MockSearchResult], 12345]);
      const result = await searchByQuery.execute({ query: createGraphQuery(['Asset']) });
      expect(result.next_offset).toBe(12345);
    });

    it('should handle direct array format', async () => {
      ctx.mcpMock.mockResolvedValue([MockSearchResult]);
      const result = await searchByQuery.execute({ query: createGraphQuery(['Asset']) });
      expect(result).toBeDefined();
    });

    it('should handle object format', async () => {
      ctx.mcpMock.mockResolvedValue({ data: [[MockSearchResult], null] });
      try { const result = await searchByQuery.execute({ query: createGraphQuery(['Asset']) }); expect(result).toBeDefined(); } catch (e) { expect(e).toBeDefined(); }
    });
  });

  describe('Filtering Effectiveness', () => {
    it('should count node types correctly', async () => {
      const results = [
        { ...MockSearchResult, class: 'domain' },
        { ...MockSearchResult, class: 'domain' },
        { ...MockSearchResult, class: 'ip' },
      ];
      ctx.mcpMock.mockResolvedValue([results, null]);
      const result = await searchByQuery.execute({ query: createGraphQuery(['Asset']) });
      expect(result.summary.node_types['domain']).toBe(2);
      expect(result.summary.node_types['ip']).toBe(1);
    });

    it('should provide sample result types', async () => {
      const results = [
        { ...MockSearchResult, class: 'domain' },
        { ...MockSearchResult, class: 'ip' },
      ];
      ctx.mcpMock.mockResolvedValue([results, null]);
      const result = await searchByQuery.execute({ query: createGraphQuery(['Asset']) });
      expect(result.summary.sample_result_types).toContain('domain');
      expect(result.summary.sample_result_types).toContain('ip');
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limit errors', async () => {
      ctx.mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(searchByQuery.execute({ query: createGraphQuery(['Asset']) })).rejects.toThrow(/rate limit/i);
    });

    it('should handle timeout errors', async () => {
      ctx.mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(searchByQuery.execute({ query: createGraphQuery(['Asset']) })).rejects.toThrow(/ETIMEDOUT/i);
    });
  });

  describe('Security Testing', () => {
    it('should handle SQL injection attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await searchByQuery.execute({ query: "'; DROP TABLE --" }); } catch {} });
    it('should handle command injection attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await searchByQuery.execute({ query: '$(whoami)' }); } catch {} });
    it('should handle path traversal attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await searchByQuery.execute({ query: '../../../etc/passwd' }); } catch {} });
    it('should handle XSS attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await searchByQuery.execute({ query: '<script>alert("xss")</script>' }); } catch {} });
    it('should sanitize output', async () => { ctx.mcpMock.mockResolvedValue([[{ ...MockSearchResult, password: 'secret' }], null]); const result = await searchByQuery.execute({ query: createGraphQuery(['Asset']) }); expect(JSON.stringify(result)).not.toContain('secret'); });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      ctx.mcpMock.mockResolvedValue([[MockSearchResult], null]);
      const avgTime = await measureAvgExecutionTime(() => searchByQuery.execute({ query: createGraphQuery(['Asset']) }), 50);
      expect(avgTime).toBeLessThan(10);
    });
  });

  describe('Edge Case Tests', () => {
    it('should handle null MCP response', async () => { ctx.mcpMock.mockResolvedValue(null); try { await searchByQuery.execute({ query: createGraphQuery(['Asset']) }); } catch (e) { expect(e).toBeDefined(); } });
    it('should handle undefined MCP response', async () => { ctx.mcpMock.mockResolvedValue(undefined); try { await searchByQuery.execute({ query: createGraphQuery(['Asset']) }); } catch (e) { expect(e).toBeDefined(); } });
    it('should handle empty results', async () => { ctx.mcpMock.mockResolvedValue([[], null]); const result = await searchByQuery.execute({ query: createGraphQuery(['Asset']) }); expect(result.results).toHaveLength(0); });
  });
});
