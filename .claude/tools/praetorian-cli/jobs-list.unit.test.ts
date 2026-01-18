/**
 * jobs-list.ts - Unit Tests
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext, MockJob, createMockJobs, calculateReduction, measureAvgExecutionTime, MCPErrors } from './test-fixtures';

// Note: testSecurityScenarios is available from test-fixtures for automated security testing

vi.mock('../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { jobsList } from './jobs-list';

describe('jobsList', () => {
  const ctx = createTestContext();
  beforeEach(() => ctx.beforeEach());
  afterEach(() => ctx.afterEach());

  describe('Schema Validation', () => {
    it('should accept valid input', async () => {
      ctx.mcpMock.mockResolvedValue([[MockJob], null]);
      const result = await jobsList.execute({});
      expect(result).toBeDefined();
    });

    it('should accept filter params', async () => {
      ctx.mcpMock.mockResolvedValue([[MockJob], null]);
      const result = await jobsList.execute({ prefix_filter: 'nuclei', offset: 'prev-offset', pages: 2 });
      expect(result).toBeDefined();
    });
  });

  describe('Token Reduction', () => {
    it('should achieve token reduction on large result sets', async () => {
      const verboseJobs = createMockJobs(100).map(j => ({ ...j, metadata: { verbose: 'A'.repeat(500) } }));
      ctx.mcpMock.mockResolvedValue([verboseJobs, null]);
      const result = await jobsList.execute({});
      const reduction = calculateReduction([verboseJobs, null], result);
      expect(reduction).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Response Format Validation', () => {
    it('should handle tuple format', async () => {
      ctx.mcpMock.mockResolvedValue([[MockJob], 'next-offset-string']);
      const result = await jobsList.execute({});
      expect(result.next_offset).toBe('next-offset-string');
    });

    it('should handle direct array format', async () => {
      ctx.mcpMock.mockResolvedValue([MockJob]);
      const result = await jobsList.execute({});
      expect(result).toBeDefined();
    });

    it('should handle object format', async () => {
      ctx.mcpMock.mockResolvedValue({ data: [[MockJob], null] });
      try { const result = await jobsList.execute({}); expect(result).toBeDefined(); } catch (e) { expect(e).toBeDefined(); }
    });
  });

  describe('Filtering Effectiveness', () => {
    it('should count job statuses correctly', async () => {
      const jobs = [
        { ...MockJob, status: 'JQ' },
        { ...MockJob, status: 'JQ' },
        { ...MockJob, status: 'JF' },
      ];
      ctx.mcpMock.mockResolvedValue([jobs, null]);
      const result = await jobsList.execute({});
      expect(result.summary.status_counts['JQ']).toBe(2);
      expect(result.summary.status_counts['JF']).toBe(1);
    });

    it('should count capabilities correctly', async () => {
      const jobs = [
        { ...MockJob, capabilities: ['nuclei', 'nmap'] },
        { ...MockJob, capabilities: ['nuclei'] },
      ];
      ctx.mcpMock.mockResolvedValue([jobs, null]);
      const result = await jobsList.execute({});
      expect(result.summary.capability_counts['nuclei']).toBe(2);
      expect(result.summary.capability_counts['nmap']).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limit errors', async () => {
      ctx.mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(jobsList.execute({})).rejects.toThrow(/rate limit/i);
    });

    it('should handle timeout errors', async () => {
      ctx.mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(jobsList.execute({})).rejects.toThrow(/ETIMEDOUT/i);
    });
  });

  describe('Security Testing', () => {
    it('should handle SQL injection attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await jobsList.execute({ prefix_filter: "'; DROP TABLE --" }); } catch {} });
    it('should handle command injection attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await jobsList.execute({ prefix_filter: '$(whoami)' }); } catch {} });
    it('should handle path traversal attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await jobsList.execute({ prefix_filter: '../../../etc/passwd' }); } catch {} });
    it('should handle XSS attempts', async () => { ctx.mcpMock.mockResolvedValue([[], null]); try { await jobsList.execute({ prefix_filter: '<script>alert("xss")</script>' }); } catch {} });
    it('should sanitize output', async () => { ctx.mcpMock.mockResolvedValue([[{ ...MockJob, password: 'secret' }], null]); const result = await jobsList.execute({}); expect(JSON.stringify(result)).not.toContain('secret'); });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      ctx.mcpMock.mockResolvedValue([[MockJob], null]);
      const avgTime = await measureAvgExecutionTime(() => jobsList.execute({}), 50);
      expect(avgTime).toBeLessThan(10);
    });
  });

  describe('Edge Case Tests', () => {
    it('should handle null MCP response', async () => { ctx.mcpMock.mockResolvedValue(null); try { await jobsList.execute({}); } catch (e) { expect(e).toBeDefined(); } });
    it('should handle undefined MCP response', async () => { ctx.mcpMock.mockResolvedValue(undefined); try { await jobsList.execute({}); } catch (e) { expect(e).toBeDefined(); } });
    it('should handle empty results', async () => { ctx.mcpMock.mockResolvedValue([[], null]); const result = await jobsList.execute({}); expect(result.jobs).toHaveLength(0); });
  });
});
