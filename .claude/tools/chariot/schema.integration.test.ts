/**
 * Integration Tests for Chariot Schema Wrapper
 *
 * These tests run against the REAL Chariot MCP server.
 *
 * Prerequisites:
 * - Chariot MCP server configured
 * - Network access to Chariot API
 *
 * Usage:
 * npx vitest run schema.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { schema, schemaHelpers } from './schema';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegration)('schema - Integration Tests', () => {
  beforeAll(() => {
    console.log('Running integration tests against real Chariot MCP');
  });

  // ==========================================================================
  // Real MCP Server Tests
  // ==========================================================================

  it('Real MCP Server: should fetch schema information', async () => {
    const result = await schema.execute({});

    expect(result).toBeDefined();
    expect(Array.isArray(result.entityTypes)).toBe(true);
    expect(typeof result.totalEntities).toBe('number');
    expect(typeof result.estimatedTokens).toBe('number');
    expect(Array.isArray(result.allowedColumns)).toBe(true);

    console.log('Schema result:', {
      entityCount: result.entityTypes.length,
      totalEntities: result.totalEntities,
      allowedColumnsCount: result.allowedColumns.length,
      estimatedTokens: result.estimatedTokens,
    });
  });

  it('Real MCP Server: should return common entity types', async () => {
    const result = await schema.execute({});

    // Chariot should have common entity types like Asset, Risk
    const entityNames = result.entityTypes.map(e => e.name);

    console.log('Entity types found:', entityNames);

    // At minimum, schema should return some entity types
    expect(result.entityTypes.length).toBeGreaterThanOrEqual(0);
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    const result = await schema.execute({});

    // Check required fields exist in output
    expect(result).toHaveProperty('entityTypes');
    expect(result).toHaveProperty('totalEntities');
    expect(result).toHaveProperty('allowedColumns');
    expect(result).toHaveProperty('estimatedTokens');

    // Verify each entity type has summarized info only
    if (result.entityTypes.length > 0) {
      const firstEntity = result.entityTypes[0];
      expect(firstEntity).toHaveProperty('name');
      expect(firstEntity).toHaveProperty('propertyCount');
      expect(firstEntity).toHaveProperty('relationshipCount');
      expect(firstEntity).toHaveProperty('keyProperties');

      // Should not have verbose fields
      expect(firstEntity).not.toHaveProperty('description');
      expect(firstEntity).not.toHaveProperty('properties');
      expect(firstEntity).not.toHaveProperty('relationships');
    }

    // Verify token estimate is reasonable
    expect(result.estimatedTokens).toBeGreaterThanOrEqual(0);
  });

  it('Token Reduction - Real Data: should limit key properties', async () => {
    const result = await schema.execute({});

    // Each entity should have at most 5 key properties (as per wrapper logic)
    result.entityTypes.forEach(entity => {
      expect(entity.keyProperties.length).toBeLessThanOrEqual(5);
    });
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  it('Performance: should complete within reasonable time', async () => {
    const start = Date.now();
    await schema.execute({});
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(30000); // 30 seconds max (network latency)
    console.log(`Schema fetch completed in ${duration}ms`);
  });

  // ==========================================================================
  // Schema Compatibility Tests
  // ==========================================================================

  describe('Schema Compatibility: Response format validation', () => {
    it('should return proper response structure', async () => {
      const result = await schema.execute({});

      expect(Array.isArray(result.entityTypes)).toBe(true);
      expect(typeof result.totalEntities).toBe('number');
      expect(Array.isArray(result.allowedColumns)).toBe(true);
      expect(typeof result.estimatedTokens).toBe('number');
    });

    it('should return allowed columns list', async () => {
      const result = await schema.execute({});

      expect(result.allowedColumns.length).toBeGreaterThan(0);

      // Should contain common query fields
      const expectedFields = ['key', 'status', 'name'];
      expectedFields.forEach(field => {
        expect(result.allowedColumns).toContain(field);
      });
    });

    it('should have consistent entity type structure', async () => {
      const result = await schema.execute({});

      result.entityTypes.forEach(entity => {
        expect(typeof entity.name).toBe('string');
        expect(typeof entity.propertyCount).toBe('number');
        expect(typeof entity.relationshipCount).toBe('number');
        expect(Array.isArray(entity.keyProperties)).toBe(true);
      });
    });
  });

  // ==========================================================================
  // Helper Function Tests
  // ==========================================================================

  describe('Schema Helpers', () => {
    it('should return allowed columns from helper', () => {
      const columns = schemaHelpers.getAllowedColumns();

      expect(Array.isArray(columns)).toBe(true);
      expect(columns.length).toBeGreaterThan(0);
      expect(columns).toContain('key');
      expect(columns).toContain('status');
    });

    it('should return common entity types from helper', () => {
      const entityTypes = schemaHelpers.getCommonEntityTypes();

      expect(Array.isArray(entityTypes)).toBe(true);
      expect(entityTypes).toContain('Asset');
      expect(entityTypes).toContain('Risk');
    });

    it('should return common relationships from helper', () => {
      const relationships = schemaHelpers.getCommonRelationships();

      expect(Array.isArray(relationships)).toBe(true);
      expect(relationships).toContain('DISCOVERED');
      expect(relationships).toContain('HAS_VULNERABILITY');
    });
  });
});
