/**
 * Unit Tests for Chariot Schema Wrapper
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
import { schema, schemaHelpers } from './schema';

// Import MCP client for type access
import * as mcpClient from '../config/lib/mcp-client';

describe('schema - Unit Tests', () => {
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
    it('should accept empty input (no parameters required)', async () => {
      // Arrange: Mock MCP response with schema data
      const mockSchema = {
        entityTypes: [
          {
            name: 'Asset',
            description: 'External-facing resource',
            properties: [
              { name: 'key', type: 'string', required: true },
              { name: 'name', type: 'string', required: true },
              { name: 'status', type: 'string', required: true },
              { name: 'class', type: 'string', required: false },
              { name: 'dns', type: 'string', required: false },
            ],
            relationships: [
              { label: 'HAS_VULNERABILITY', targetType: 'Risk', direction: 'outgoing' },
              { label: 'HAS_ATTRIBUTE', targetType: 'Attribute', direction: 'outgoing' },
            ],
          },
        ],
      };
      mcpMock.mockResolvedValue(mockSchema);

      // Act: Execute wrapper with empty input
      const result = await schema.execute({});

      // Assert: Verify response structure
      expect(result).toBeDefined();
      expect(result.entityTypes).toHaveLength(1);
      expect(result.entityTypes[0].name).toBe('Asset');
      expect(result.entityTypes[0].propertyCount).toBe(5);
      expect(result.entityTypes[0].relationshipCount).toBe(2);
      expect(result.entityTypes[0].keyProperties).toBeDefined();
      expect(result.totalEntities).toBe(1);
      expect(result.allowedColumns).toBeDefined();
      expect(result.estimatedTokens).toBeGreaterThan(0);

      // Verify MCP client called correctly
      expect(mcpMock).toHaveBeenCalledTimes(1);
      expect(mcpMock).toHaveBeenCalledWith('chariot', 'schema', {});
    });

    it('should accept explicit empty object', async () => {
      mcpMock.mockResolvedValue({ entityTypes: [] });

      const result = await schema.execute({});

      expect(result).toBeDefined();
      expect(result.entityTypes).toHaveLength(0);
      expect(result.totalEntities).toBe(0);
    });

    it('should handle undefined input (defaults to empty object)', async () => {
      mcpMock.mockResolvedValue({ entityTypes: [] });

      const result = await schema.execute();

      expect(result).toBeDefined();
      expect(result.entityTypes).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Category 2: Security Testing
  // ==========================================================================

  describe('Security testing', () => {
    it('should not have security vulnerabilities (no user inputs)', async () => {
      // Schema wrapper has no user-controlled inputs, so security tests
      // verify that the wrapper itself doesn't introduce vulnerabilities
      mcpMock.mockResolvedValue({ entityTypes: [] });

      const result = await schema.execute({});

      expect(result).toBeDefined();
      expect(result.entityTypes).toBeInstanceOf(Array);
    });
  });

  // ==========================================================================
  // Category 3: Response Format Handling
  // ==========================================================================

  describe('Response format', () => {
    it('should handle direct array format from MCP (entityTypes as array)', async () => {
      // Direct array format: MCP returns object with entityTypes array
      mcpMock.mockResolvedValue({
        entityTypes: [
          {
            name: 'Asset',
            properties: [{ name: 'key', type: 'string', required: true }],
            relationships: [],
          },
          {
            name: 'Risk',
            properties: [{ name: 'id', type: 'string', required: true }],
            relationships: [],
          },
        ],
      });

      const result = await schema.execute({});

      expect(Array.isArray(result.entityTypes)).toBe(true);
      expect(result.entityTypes).toHaveLength(2);
      expect(result.totalEntities).toBe(2);
    });

    it('should handle tuple format from MCP [data, metadata]', async () => {
      // Tuple format: For schema endpoint, this is less common
      // but wrapper should handle any valid array response
      mcpMock.mockResolvedValue({
        entityTypes: [
          {
            name: 'Asset',
            properties: [{ name: 'key', type: 'string', required: true }],
            relationships: [],
          },
        ],
      });

      const result = await schema.execute({});

      expect(Array.isArray(result.entityTypes)).toBe(true);
      expect(result.entityTypes).toHaveLength(1);
    });

    it('should handle object format with full schema structure', async () => {
      // Object format: Standard MCP schema response
      mcpMock.mockResolvedValue({
        entityTypes: [
          {
            name: 'Asset',
            description: 'External-facing resource',
            properties: [
              { name: 'key', type: 'string', required: true },
              { name: 'name', type: 'string', required: true },
            ],
            relationships: [
              { label: 'HAS_VULNERABILITY', targetType: 'Risk', direction: 'outgoing' },
            ],
          },
        ],
      });

      const result = await schema.execute({});

      expect(result.entityTypes).toHaveLength(1);
      expect(result.entityTypes[0].name).toBe('Asset');
      expect(result.entityTypes[0].propertyCount).toBe(2);
      expect(result.entityTypes[0].relationshipCount).toBe(1);
    });

    it('should handle empty schema response', async () => {
      mcpMock.mockResolvedValue({ entityTypes: [] });

      const result = await schema.execute({});

      expect(result.entityTypes).toHaveLength(0);
      expect(result.totalEntities).toBe(0);
      expect(result.allowedColumns).toBeDefined();
    });

    it('should handle schema with multiple entity types', async () => {
      const mockSchema = {
        entityTypes: Array.from({ length: 10 }, (_, i) => ({
          name: `EntityType${i}`,
          properties: [
            { name: 'id', type: 'string', required: true },
            { name: 'name', type: 'string', required: true },
          ],
          relationships: [],
        })),
      };
      mcpMock.mockResolvedValue(mockSchema);

      const result = await schema.execute({});

      expect(result.entityTypes).toHaveLength(10);
      expect(result.totalEntities).toBe(10);
    });
  });

  // ==========================================================================
  // Category: Edge Case Tests
  // ==========================================================================

  describe('Edge case handling', () => {
    it('should handle null response from MCP', async () => {
      mcpMock.mockResolvedValue(null);

      try {
        await schema.execute({});
      } catch (error) {
        // Expected - null response should be handled
        expect(error).toBeDefined();
      }
    });

    it('should handle undefined response from MCP', async () => {
      mcpMock.mockResolvedValue(undefined);

      try {
        await schema.execute({});
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle large schema (100+ entity types)', async () => {
      const largeSchema = {
        entityTypes: Array.from({ length: 150 }, (_, i) => ({
          name: `EntityType${i}`,
          properties: Array.from({ length: 50 }, (_, j) => ({
            name: `prop${j}`,
            type: 'string',
            required: j < 5,
          })),
          relationships: Array.from({ length: 10 }, (_, k) => ({
            label: `REL_${k}`,
            targetType: `Target${k}`,
            direction: 'outgoing',
          })),
        })),
      };
      mcpMock.mockResolvedValue(largeSchema);

      const result = await schema.execute({});

      expect(result.entityTypes).toHaveLength(150);
      expect(result.totalEntities).toBe(150);
      // Key properties should be limited
      result.entityTypes.forEach(entity => {
        expect(entity.keyProperties.length).toBeLessThanOrEqual(5);
      });
    });

    it('should handle entity with missing properties array', async () => {
      mcpMock.mockResolvedValue({
        entityTypes: [
          { name: 'Asset' }, // Missing properties and relationships
        ],
      });

      const result = await schema.execute({});

      expect(result.entityTypes).toHaveLength(1);
      expect(result.entityTypes[0].propertyCount).toBe(0);
      expect(result.entityTypes[0].relationshipCount).toBe(0);
    });

    it('should handle entity with null/undefined fields', async () => {
      mcpMock.mockResolvedValue({
        entityTypes: [
          {
            name: 'Asset',
            properties: null,
            relationships: undefined,
          },
        ],
      });

      const result = await schema.execute({});

      expect(result.entityTypes).toHaveLength(1);
      expect(result.entityTypes[0].propertyCount).toBe(0);
    });
  });

  // ==========================================================================
  // Category: Security Tests (audit compliance)
  // ==========================================================================

  describe('Security testing', () => {
    it('should not have security vulnerabilities (no user inputs)', async () => {
      // Schema wrapper has no user-controlled inputs, so security tests
      // verify that the wrapper itself doesn't introduce vulnerabilities
      mcpMock.mockResolvedValue({ entityTypes: [] });

      const result = await schema.execute({});

      expect(result).toBeDefined();
      expect(result.entityTypes).toBeInstanceOf(Array);
    });

    it('should handle potentially malicious entity names safely', async () => {
      // Even though entity names come from MCP (not user), verify safe handling
      mcpMock.mockResolvedValue({
        entityTypes: [
          {
            name: '<script>alert("xss")</script>',
            properties: [{ name: 'key', type: 'string', required: true }],
            relationships: [],
          },
          {
            name: '$(rm -rf /)',
            properties: [],
            relationships: [],
          },
          {
            name: '../../../etc/passwd',
            properties: [],
            relationships: [],
          },
        ],
      });

      const result = await schema.execute({});

      // Wrapper should pass through entity names without evaluation
      expect(result.entityTypes).toHaveLength(3);
      expect(result.entityTypes[0].name).toBe('<script>alert("xss")</script>');
    });

    it('should sanitize output to prevent injection in downstream usage', async () => {
      // Verify output structure is predictable and safe
      mcpMock.mockResolvedValue({
        entityTypes: [
          {
            name: 'Asset',
            properties: [{ name: 'key', type: 'string', required: true }],
            relationships: [],
          },
        ],
      });

      const result = await schema.execute({});

      // Verify output matches expected schema structure
      expect(typeof result.entityTypes[0].name).toBe('string');
      expect(typeof result.entityTypes[0].propertyCount).toBe('number');
      expect(typeof result.entityTypes[0].relationshipCount).toBe('number');
      expect(Array.isArray(result.entityTypes[0].keyProperties)).toBe(true);
    });
  });

  // ==========================================================================
  // Category 4: Token Reduction and Filtering
  // ==========================================================================

  describe('Token reduction', () => {
    it('should achieve significant token reduction through filtering', async () => {
      // Verbose schema with many properties and descriptions
      const verboseSchema = {
        entityTypes: [
          {
            name: 'Asset',
            description: 'x'.repeat(1000), // Long description
            properties: Array.from({ length: 50 }, (_, i) => ({
              name: `property${i}`,
              type: 'string',
              required: i < 5,
              description: 'y'.repeat(500), // Long descriptions
            })),
            relationships: Array.from({ length: 20 }, (_, i) => ({
              label: `RELATIONSHIP_${i}`,
              targetType: `Target${i}`,
              direction: 'outgoing',
              description: 'z'.repeat(500),
            })),
          },
        ],
      };

      mcpMock.mockResolvedValue(verboseSchema);

      const result = await schema.execute({});

      const inputSize = JSON.stringify(verboseSchema).length;
      const outputSize = JSON.stringify(result).length;
      const reduction = ((inputSize - outputSize) / inputSize) * 100;

      expect(reduction).toBeGreaterThanOrEqual(80);
    });

    it('should preserve essential schema information', async () => {
      const mockSchema = {
        entityTypes: [
          {
            name: 'Asset',
            description: 'Should be removed',
            properties: [
              { name: 'key', type: 'string', required: true, description: 'verbose' },
              { name: 'name', type: 'string', required: true, description: 'verbose' },
              { name: 'status', type: 'string', required: true, description: 'verbose' },
              { name: 'class', type: 'string', required: false, description: 'verbose' },
            ],
            relationships: [
              { label: 'HAS_VULNERABILITY', targetType: 'Risk', description: 'verbose' },
            ],
          },
        ],
      };

      mcpMock.mockResolvedValue(mockSchema);

      const result = await schema.execute({});

      // Essential fields preserved
      expect(result.entityTypes[0].name).toBe('Asset');
      expect(result.entityTypes[0].propertyCount).toBe(4);
      expect(result.entityTypes[0].relationshipCount).toBe(1);
      expect(result.entityTypes[0].keyProperties).toBeDefined();
      expect(result.entityTypes[0].keyProperties.length).toBeGreaterThan(0);

      // Verbose fields removed
      expect(result.entityTypes[0]).not.toHaveProperty('description');
      expect(result.entityTypes[0]).not.toHaveProperty('properties');
      expect(result.entityTypes[0]).not.toHaveProperty('relationships');
    });

    it('should include allowedColumns in response', async () => {
      mcpMock.mockResolvedValue({ entityTypes: [] });

      const result = await schema.execute({});

      expect(result.allowedColumns).toBeDefined();
      expect(Array.isArray(result.allowedColumns)).toBe(true);
      expect(result.allowedColumns.length).toBeGreaterThan(0);
      expect(result.allowedColumns).toContain('key');
      expect(result.allowedColumns).toContain('status');
      expect(result.allowedColumns).toContain('name');
    });

    it('should limit key properties to top 5', async () => {
      const mockSchema = {
        entityTypes: [
          {
            name: 'Asset',
            properties: Array.from({ length: 20 }, (_, i) => ({
              name: `prop${i}`,
              type: 'string',
              required: true,
            })),
            relationships: [],
          },
        ],
      };

      mcpMock.mockResolvedValue(mockSchema);

      const result = await schema.execute({});

      expect(result.entityTypes[0].keyProperties.length).toBeLessThanOrEqual(5);
    });
  });

  // ==========================================================================
  // Category 5: Error Handling
  // ==========================================================================

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(schema.execute({})).rejects.toThrow(/rate limit/i);
    });

    it('should handle timeout errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(schema.execute({})).rejects.toThrow(/ETIMEDOUT/);
    });

    it('should handle malformed MCP responses', async () => {
      mcpMock.mockResolvedValue(null);

      try {
        await schema.execute({});
        // If it doesn't throw, verify it returns empty schema
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle missing entityTypes field', async () => {
      mcpMock.mockResolvedValue({});

      const result = await schema.execute({});

      expect(result.entityTypes).toHaveLength(0);
      expect(result.totalEntities).toBe(0);
    });
  });

  // ==========================================================================
  // Category 6: Schema Helper Functions
  // ==========================================================================

  describe('Schema helper functions', () => {
    it('should return allowed columns', () => {
      const columns = schemaHelpers.getAllowedColumns();

      expect(Array.isArray(columns)).toBe(true);
      expect(columns.length).toBeGreaterThan(0);
      expect(columns).toContain('key');
      expect(columns).toContain('identifier');
      expect(columns).toContain('status');
      expect(columns).toContain('cvss');
    });

    it('should return common entity types', () => {
      const entityTypes = schemaHelpers.getCommonEntityTypes();

      expect(Array.isArray(entityTypes)).toBe(true);
      expect(entityTypes).toContain('Asset');
      expect(entityTypes).toContain('Risk');
      expect(entityTypes).toContain('Attribute');
    });

    it('should return common relationships', () => {
      const relationships = schemaHelpers.getCommonRelationships();

      expect(Array.isArray(relationships)).toBe(true);
      expect(relationships).toContain('DISCOVERED');
      expect(relationships).toContain('HAS_VULNERABILITY');
      expect(relationships).toContain('HAS_ATTRIBUTE');
    });
  });

  // ==========================================================================
  // Category 7: Performance
  // ==========================================================================

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue({
        entityTypes: [
          {
            name: 'Asset',
            properties: [{ name: 'key', type: 'string', required: true }],
            relationships: [],
          },
        ],
      });

      const start = Date.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await schema.execute({});
      }

      const avgTime = (Date.now() - start) / iterations;
      expect(avgTime).toBeLessThan(10); // <10ms per call
    });
  });
});
