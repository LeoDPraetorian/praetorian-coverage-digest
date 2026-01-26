/**
 * Integration Tests for getProjects Wrapper
 *
 * Tests wrapper with real Currents MCP server.
 * Run with: RUN_INTEGRATION_TESTS=true npm run test:integration -- currents/get-projects
 *
 * Prerequisites:
 * - Valid Currents API key in 1Password vault "Claude Code Tools" (primary)
 *   Item: "Currents API Key", Field: password
 * - OR: CURRENTS_API_KEY environment variable (CI environments)
 * - DEPRECATED: credentials.json is no longer supported
 * - At least one project in Currents account
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getProjects } from './get-projects';

// Skip integration tests unless explicitly enabled
const integrationTest = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

integrationTest('getProjects - Integration Tests (Real MCP)', () => {
  beforeAll(() => {
    // Verify credentials are available
    if (!process.env.CURRENTS_API_KEY) {
      console.warn('CURRENTS_API_KEY not set. Integration tests may fail.');
    }
  });

  // ==========================================================================
  // Category 1: Real MCP Server
  // ==========================================================================

  describe('Real MCP Server', () => {
    it('should fetch projects from real Currents API', async () => {
      // Act: Execute against real MCP server (no input parameters)
      const result = await getProjects.execute({});

      // Assert: Verify response structure
      expect(result).toBeDefined();
      expect(result.projects).toBeDefined();
      expect(Array.isArray(result.projects)).toBe(true);
      expect(result.totalProjects).toBeGreaterThanOrEqual(0);
      expect(result.estimatedTokens).toBeGreaterThanOrEqual(0);

      // Log result for manual verification
      console.log(`Fetched ${result.projects.length} projects`);
      console.log('Sample Project:', result.projects[0] ? JSON.stringify(result.projects[0], null, 2) : 'No projects');
    }, 30000); // 30 second timeout for real API

    it('should return valid project data structure', async () => {
      // Act
      const result = await getProjects.execute({});

      // Assert: Verify structure even if no projects
      expect(result.projects).toBeDefined();
      expect(result.totalProjects).toBeDefined();
      expect(result.estimatedTokens).toBeDefined();

      // If projects exist, verify field types
      if (result.projects.length > 0) {
        const project = result.projects[0];
        expect(typeof project.id).toBe('string');
        expect(typeof project.name).toBe('string');
        expect(project.id.length).toBeGreaterThan(0);
        expect(project.name.length).toBeGreaterThan(0);
      }
    }, 30000);

    it('should filter out extra metadata fields', async () => {
      // Act
      const result = await getProjects.execute({});

      // Assert: Verify only essential fields are returned
      if (result.projects.length > 0) {
        const project = result.projects[0];

        // Should not have verbose fields
        expect(project).not.toHaveProperty('description');
        expect(project).not.toHaveProperty('settings');
        expect(project).not.toHaveProperty('configuration');
        expect(project).not.toHaveProperty('metadata');
        expect(project).not.toHaveProperty('createdAt');
        expect(project).not.toHaveProperty('updatedAt');

        // Only these fields should exist
        const allowedFields = ['id', 'name'];

        Object.keys(project).forEach((key) => {
          expect(allowedFields).toContain(key);
        });
      }
    }, 30000);
  });

  // ==========================================================================
  // Category 2: Schema Compatibility
  // ==========================================================================

  describe('Schema Compatibility', () => {
    it('should match discovered schema structure', async () => {
      // Act
      const result = await getProjects.execute({});

      // Assert: Verify response matches discovered schema
      expect(result).toMatchObject({
        projects: expect.any(Array),
        totalProjects: expect.any(Number),
        estimatedTokens: expect.any(Number),
      });

      // If projects exist, verify project structure
      if (result.projects.length > 0) {
        expect(result.projects[0]).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
        });
      }

      console.log('Schema validation passed');
    }, 30000);

    it('should handle API response format consistently', async () => {
      // Act: Call multiple times to verify consistency
      const result1 = await getProjects.execute({});
      const result2 = await getProjects.execute({});

      // Assert: Both calls should have same structure
      expect(Object.keys(result1)).toEqual(Object.keys(result2));
      expect(result1.totalProjects).toBe(result2.totalProjects);

      console.log('Consistency check passed');
    }, 60000);
  });

  // ==========================================================================
  // Category 3: Token Reduction - Real Data
  // ==========================================================================

  describe('Token Reduction - Real Data', () => {
    it('should reduce token count vs raw MCP response', async () => {
      // Act
      const result = await getProjects.execute({});

      // Assert: Token count should be reasonable for filtered data
      expect(result.estimatedTokens).toBeGreaterThanOrEqual(0);

      // Should be compact - only id and name per project
      // Estimate: ~20 tokens per project (id + name with minimal JSON overhead)
      if (result.projects.length > 0) {
        const tokensPerProject = result.estimatedTokens / result.projects.length;
        expect(tokensPerProject).toBeLessThan(50);
        console.log(`Average tokens per project: ${tokensPerProject.toFixed(1)}`);
      }

      console.log(`Token estimate: ${result.estimatedTokens} tokens for ${result.projects.length} projects`);
    }, 30000);

    it('should verify token estimation accuracy', async () => {
      // Act
      const result = await getProjects.execute({});

      // Calculate actual size
      const actualSize = JSON.stringify(result.projects).length;
      const calculatedTokens = result.projects.length === 0 ? 0 : Math.ceil(actualSize / 4);

      // Assert: Estimated tokens should match calculation
      expect(result.estimatedTokens).toBe(calculatedTokens);

      console.log(`Actual size: ${actualSize} chars, Tokens: ${calculatedTokens}`);
    }, 30000);

    it('should demonstrate token reduction from filtered fields', async () => {
      // Act
      const result = await getProjects.execute({});

      // Assert: Each project should have only 2 fields (id, name)
      if (result.projects.length > 0) {
        result.projects.forEach((project) => {
          const fieldCount = Object.keys(project).length;
          expect(fieldCount).toBe(2);
        });

        // Raw API typically returns 5-10 fields per project
        // Our filtered response should be ~70-80% smaller
        console.log(`Projects filtered to ${Object.keys(result.projects[0]).length} fields each`);
      }
    }, 30000);
  });

  // ==========================================================================
  // Category 4: Performance
  // ==========================================================================

  describe('Performance', () => {
    it('should complete within reasonable time', async () => {
      // Arrange
      const start = Date.now();

      // Act
      await getProjects.execute({});

      // Assert: Should complete within 10 seconds for real API
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10000);

      console.log(`Real API response time: ${duration}ms`);
    }, 15000);

    it('should handle response efficiently', async () => {
      // Arrange
      const start = Date.now();

      // Act: Multiple calls to measure wrapper overhead
      for (let i = 0; i < 3; i++) {
        await getProjects.execute({});
      }

      // Assert: Should complete all calls within reasonable time
      const totalDuration = Date.now() - start;
      const avgDuration = totalDuration / 3;

      expect(avgDuration).toBeLessThan(10000);

      console.log(`Average response time: ${avgDuration.toFixed(0)}ms`);
    }, 45000);
  });
});

// ==========================================================================
// Manual Testing Instructions
// ==========================================================================

/**
 * To run these integration tests:
 *
 * 1. Set up Currents API credentials:
 *    - Get API key from 1Password vault "Claude Code Tools" (primary)
 *    - OR: Add CURRENTS_API_KEY to .env (CI environments)
 *    - Get an API key from https://currents.dev/
 *
 * 2. Run integration tests:
 *    ```bash
 *    cd .claude/tools/currents
 *    RUN_INTEGRATION_TESTS=true npm run test:integration -- get-projects
 *    ```
 *
 * 3. Verify results:
 *    - Check console output for project details
 *    - Verify token estimates are reasonable
 *    - Confirm filtering removed metadata
 */
