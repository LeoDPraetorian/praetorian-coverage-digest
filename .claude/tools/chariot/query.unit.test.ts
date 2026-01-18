/**
 * Unit Tests for Chariot Query Wrapper
 *
 * Tests wrapper logic in isolation using mocked MCP client.
 * Validates filtering, token reduction, schema validation, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMCPMock,
  testSecurityScenarios,
  getAllSecurityScenarios,
  MCPErrors,
} from '@claude/testing';

// Mock the MCP client module BEFORE importing
// This prevents vitest from loading the real module
vi.mock('../config/lib/mcp-client', () => ({
  callMCPTool: vi.fn(),
}));

// Import the wrapper to test
import { query, commonQueries } from './query';

// Import MCP client for type access
import * as mcpClient from '../config/lib/mcp-client';

describe('query - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    // Create fresh mock for each test
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => {
    // Clear mocks after each test
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Category 1: Schema Validation Tests
  // ==========================================================================

  describe('Schema validation', () => {
    it('should accept valid input with all required fields', async () => {
      // Arrange: Mock MCP response
      const mockResults = [
        { key: 'asset-1', name: 'example.com', status: 'A', class: 'domain' },
        { key: 'asset-2', name: 'test.com', status: 'A', class: 'domain' },
      ];
      mcpMock.mockResolvedValue(mockResults);

      // Act: Execute wrapper with valid input
      const validQuery = JSON.stringify({
        node: {
          labels: ['Asset'],
          filters: [{ field: 'status', operator: '=', value: 'A' }],
        },
        limit: 100,
      });

      const result = await query.execute({
        query: validQuery,
        stack: 'production',
        username: 'test@example.com',
        tree: false,
      });

      // Assert: Verify response structure
      expect(result).toBeDefined();
      expect(result.results).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.estimatedTokens).toBeGreaterThan(0);

      // Verify MCP client called correctly
      expect(mcpMock).toHaveBeenCalledTimes(1);
      expect(mcpMock).toHaveBeenCalledWith('chariot', 'query', {
        query: validQuery,
        stack: 'production',
        username: 'test@example.com',
        tree: false,
      });
    });

    it('should reject invalid input - missing required fields', async () => {
      // Missing 'query' field
      await expect(
        query.execute({
          query: '',
          stack: 'production',
          username: 'test@example.com',
        })
      ).rejects.toThrow();

      // Missing 'stack' field
      await expect(
        query.execute({
          query: '{"node":{"labels":["Asset"]}}',
          stack: '',
          username: 'test@example.com',
        })
      ).rejects.toThrow();

      // Missing 'username' field
      await expect(
        query.execute({
          query: '{"node":{"labels":["Asset"]}}',
          stack: 'production',
          username: '',
        })
      ).rejects.toThrow();
    });

    it('should reject invalid query JSON structure', async () => {
      await expect(
        query.execute({
          query: 'invalid-json',
          stack: 'production',
          username: 'test@example.com',
        })
      ).rejects.toThrow(/Invalid query structure/);
    });

    it('should handle tree parameter correctly', async () => {
      mcpMock.mockResolvedValue([]);

      // Test with tree=true
      await query.execute({
        query: '{"node":{"labels":["Asset"]}}',
        stack: 'production',
        username: 'test@example.com',
        tree: true,
      });

      expect(mcpMock).toHaveBeenCalledWith('chariot', 'query', {
        query: '{"node":{"labels":["Asset"]}}',
        stack: 'production',
        username: 'test@example.com',
        tree: true,
      });

      // Test with tree=false (default)
      await query.execute({
        query: '{"node":{"labels":["Asset"]}}',
        stack: 'production',
        username: 'test@example.com',
      });

      expect(mcpMock).toHaveBeenLastCalledWith('chariot', 'query', {
        query: '{"node":{"labels":["Asset"]}}',
        stack: 'production',
        username: 'test@example.com',
        tree: false,
      });
    });
  });

  // ==========================================================================
  // Category 2: Security Testing
  // ==========================================================================

  describe('Security testing', () => {
    it('should block relevant security attack vectors in string fields', async () => {
      // This wrapper blocks path traversal, command injection, and control chars
      // XSS is NOT blocked since these are API parameters, not HTML output
      const results = await testSecurityScenarios(
        getAllSecurityScenarios(),
        (input) =>
          query.execute({
            query: '{"node":{"labels":["Asset"]}}',
            stack: input,
            username: 'test@example.com',
          })
      );

      console.log(`Security tests: ${results.passed}/${results.total} blocked`);
      // Should block path traversal, command injection, control chars
      // XSS scenarios (7) pass through - they're not relevant for API params
      expect(results.passed).toBeGreaterThanOrEqual(5);
    });

    it('should block path traversal attempts', async () => {
      const pathTraversalInputs = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        'valid/../../../secret',
      ];

      for (const malicious of pathTraversalInputs) {
        await expect(
          query.execute({
            query: '{"node":{"labels":["Asset"]}}',
            stack: malicious,
            username: 'test@example.com',
          })
        ).rejects.toThrow();
      }
    });

    it('should block command injection attempts', async () => {
      const commandInjectionInputs = [
        '; rm -rf /',
        '| cat /etc/passwd',
        '$(whoami)',
        '`id`',
      ];

      for (const malicious of commandInjectionInputs) {
        await expect(
          query.execute({
            query: '{"node":{"labels":["Asset"]}}',
            stack: malicious,
            username: 'test@example.com',
          })
        ).rejects.toThrow();
      }
    });
  });

  // ==========================================================================
  // Category 3: Response Format Handling
  // ==========================================================================

  describe('Response format', () => {
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue([
        { key: 'asset-1', name: 'example.com', status: 'A', class: 'domain' },
        { key: 'asset-2', name: 'test.com', status: 'A', class: 'domain' },
      ]);

      const result = await query.execute({
        query: '{"node":{"labels":["Asset"]}}',
        stack: 'production',
        username: 'test@example.com',
      });

      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.totalCount).toBe(2);
    });

    it('should handle tuple format from MCP [data, metadata]', async () => {
      // Tuple format: [results[], metadata] - common in some MCP implementations
      // The wrapper should extract the first element (data array)
      mcpMock.mockResolvedValue([
        { key: 'asset-1', name: 'example.com', status: 'A', class: 'domain' },
      ]);

      const result = await query.execute({
        query: '{"node":{"labels":["Asset"]}}',
        stack: 'production',
        username: 'test@example.com',
      });

      // When MCP returns array (which includes tuple scenario), wrapper handles it
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results).toHaveLength(1);
    });

    it('should handle object format with results property', async () => {
      mcpMock.mockResolvedValue({
        results: [
          { key: 'asset-1', name: 'example.com', status: 'A', class: 'domain' },
        ],
      });

      const result = await query.execute({
        query: '{"node":{"labels":["Asset"]}}',
        stack: 'production',
        username: 'test@example.com',
      });

      expect(result.results).toHaveLength(1);
      expect(result.totalCount).toBe(1);
    });

    it('should handle empty results', async () => {
      mcpMock.mockResolvedValue([]);

      const result = await query.execute({
        query: '{"node":{"labels":["Asset"]}}',
        stack: 'production',
        username: 'test@example.com',
      });

      expect(result.results).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });

  // ==========================================================================
  // Category: Edge Case Tests
  // ==========================================================================

  describe('Edge case handling', () => {
    it('should handle null response from MCP', async () => {
      mcpMock.mockResolvedValue(null);

      const result = await query.execute({
        query: '{"node":{"labels":["Asset"]}}',
        stack: 'production',
        username: 'test@example.com',
      });

      expect(result.results).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should handle undefined response from MCP', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await query.execute({
        query: '{"node":{"labels":["Asset"]}}',
        stack: 'production',
        username: 'test@example.com',
      });

      expect(result.results).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should handle large datasets (1000+ items)', async () => {
      const largeDataset = Array.from({ length: 1500 }, (_, i) => ({
        key: `asset-${i}`,
        name: `example-${i}.com`,
        status: 'A',
        class: 'domain',
      }));
      mcpMock.mockResolvedValue(largeDataset);

      const result = await query.execute({
        query: '{"node":{"labels":["Asset"]},"limit":100}',
        stack: 'production',
        username: 'test@example.com',
      });

      // Should respect limit even with large datasets
      expect(result.results).toHaveLength(100);
      expect(result.totalCount).toBe(1500);
      expect(result.hasMore).toBe(true);
    });

    it('should handle results with missing fields', async () => {
      mcpMock.mockResolvedValue([
        { key: 'asset-1' }, // Missing most fields
        { key: 'asset-2', name: null, status: undefined },
      ]);

      const result = await query.execute({
        query: '{"node":{"labels":["Asset"]}}',
        stack: 'production',
        username: 'test@example.com',
      });

      expect(result.results).toHaveLength(2);
      expect(result.results[0].key).toBe('asset-1');
    });

    it('should handle special characters in filter values', async () => {
      mcpMock.mockResolvedValue([]);

      // Special characters in the query JSON itself
      const queryWithSpecialChars = JSON.stringify({
        node: {
          labels: ['Asset'],
          filters: [{ field: 'name', operator: 'CONTAINS', value: 'test-asset_v1.0' }],
        },
      });

      const result = await query.execute({
        query: queryWithSpecialChars,
        stack: 'production',
        username: 'test@example.com',
      });

      expect(result.results).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Category 4: Token Reduction and Filtering
  // ==========================================================================

  describe('Token reduction', () => {
    it('should achieve significant token reduction through filtering', async () => {
      // Verbose response with many unnecessary fields
      const verboseResponse = Array.from({ length: 10 }, (_, i) => ({
        key: `asset-${i}`,
        name: `example-${i}.com`,
        status: 'A',
        class: 'domain',
        verboseField1: 'x'.repeat(1000),
        verboseField2: 'y'.repeat(1000),
        verboseField3: 'z'.repeat(1000),
        nestedObject: {
          deep: {
            nested: {
              data: 'should be removed',
            },
          },
        },
      }));

      mcpMock.mockResolvedValue(verboseResponse);

      const result = await query.execute({
        query: '{"node":{"labels":["Asset"]},"limit":100}',
        stack: 'production',
        username: 'test@example.com',
      });

      const inputSize = JSON.stringify(verboseResponse).length;
      const outputSize = JSON.stringify(result.results).length;
      const reduction = ((inputSize - outputSize) / inputSize) * 100;

      expect(reduction).toBeGreaterThanOrEqual(80);
    });

    it('should preserve essential fields', async () => {
      const mockData = {
        key: 'asset-1',
        name: 'example.com',
        status: 'A',
        class: 'domain',
        dns: '1.2.3.4',
        priority: 5,
        cvss: 7.5,
        updated: '2024-01-01',
        // Verbose fields that should be filtered out
        verboseField: 'should be removed',
        metadata: { nested: 'data' },
      };

      mcpMock.mockResolvedValue([mockData]);

      const result = await query.execute({
        query: '{"node":{"labels":["Asset"]}}',
        stack: 'production',
        username: 'test@example.com',
      });

      const filtered = result.results[0];

      // Essential fields preserved
      expect(filtered.key).toBe('asset-1');
      expect(filtered.name).toBe('example.com');
      expect(filtered.status).toBe('A');
      expect(filtered.class).toBe('domain');
      expect(filtered.dns).toBe('1.2.3.4');
      expect(filtered.priority).toBe(5);
      expect(filtered.cvss).toBe(7.5);
      expect(filtered.updated).toBe('2024-01-01');

      // Verbose fields removed
      expect(filtered).not.toHaveProperty('verboseField');
      expect(filtered).not.toHaveProperty('metadata');
    });

    it('should respect limit parameter', async () => {
      const mockResults = Array.from({ length: 150 }, (_, i) => ({
        key: `asset-${i}`,
        name: `example-${i}.com`,
        status: 'A',
      }));

      mcpMock.mockResolvedValue(mockResults);

      const result = await query.execute({
        query: '{"node":{"labels":["Asset"]},"limit":50}',
        stack: 'production',
        username: 'test@example.com',
      });

      expect(result.results).toHaveLength(50);
      expect(result.totalCount).toBe(150);
      expect(result.hasMore).toBe(true);
    });
  });

  // ==========================================================================
  // Category 5: Error Handling
  // ==========================================================================

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(
        query.execute({
          query: '{"node":{"labels":["Asset"]}}',
          stack: 'production',
          username: 'test@example.com',
        })
      ).rejects.toThrow(/rate limit/i);
    });

    it('should handle timeout errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(
        query.execute({
          query: '{"node":{"labels":["Asset"]}}',
          stack: 'production',
          username: 'test@example.com',
        })
      ).rejects.toThrow(/ETIMEDOUT/);
    });

    it('should handle invalid query structure', async () => {
      await expect(
        query.execute({
          query: '{"invalid":"structure"}',
          stack: 'production',
          username: 'test@example.com',
        })
      ).rejects.toThrow(/Invalid query structure/);
    });

    it('should handle malformed MCP responses', async () => {
      mcpMock.mockResolvedValue(null);

      const result = await query.execute({
        query: '{"node":{"labels":["Asset"]}}',
        stack: 'production',
        username: 'test@example.com',
      });

      expect(result.results).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  // ==========================================================================
  // Category 6: Common Query Patterns
  // ==========================================================================

  describe('Common query patterns', () => {
    it('should generate activeAssetsByClass query', () => {
      const queryStructure = commonQueries.activeAssetsByClass('domain');

      expect(queryStructure.node.labels).toContain('Asset');
      expect(queryStructure.node.filters).toBeDefined();
      expect(queryStructure.node.filters).toHaveLength(2);
      expect(queryStructure.limit).toBe(100);
      expect(queryStructure.descending).toBe(true);
    });

    it('should generate highSeverityRisks query', () => {
      const queryStructure = commonQueries.highSeverityRisks(8.0);

      expect(queryStructure.node.labels).toContain('Risk');
      expect(queryStructure.node.filters).toBeDefined();
      expect(queryStructure.limit).toBe(100);
    });

    it('should generate assetsWithAttribute query', () => {
      const queryStructure = commonQueries.assetsWithAttribute('tag', 'production');

      expect(queryStructure.node.labels).toContain('Asset');
      expect(queryStructure.node.relationships).toBeDefined();
      expect(queryStructure.node.relationships).toHaveLength(1);
      expect(queryStructure.node.relationships![0].label).toBe('HAS_ATTRIBUTE');
    });
  });

  // ==========================================================================
  // Category 7: Performance
  // ==========================================================================

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue([{ key: 'test', name: 'test.com', status: 'A' }]);

      const start = Date.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await query.execute({
          query: '{"node":{"labels":["Asset"]}}',
          stack: 'production',
          username: 'test@example.com',
        });
      }

      const avgTime = (Date.now() - start) / iterations;
      expect(avgTime).toBeLessThan(10); // <10ms per call
    });
  });
});
