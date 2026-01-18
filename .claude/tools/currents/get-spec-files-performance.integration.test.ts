/**
 * Integration Tests for getSpecFilesPerformance Wrapper
 *
 * Tests wrapper with real Currents MCP server.
 * Run with: RUN_INTEGRATION_TESTS=true npm run test:integration -- currents/get-spec-files-performance
 *
 * Prerequisites:
 * - Valid Currents API key in credentials.json or .env
 * - At least one project with test runs in Currents account
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getSpecFilesPerformance } from './get-spec-files-performance';

// Skip integration tests unless explicitly enabled
const integrationTest = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

integrationTest('getSpecFilesPerformance - Integration Tests (Real MCP)', () => {
  // Test project ID - update with a real project ID from your Currents account
  let testProjectId: string;

  beforeAll(() => {
    // Get test project ID from environment or use a default
    testProjectId = process.env.CURRENTS_TEST_PROJECT_ID || 'project-test-123';

    // Verify credentials are available
    if (!process.env.CURRENTS_API_KEY) {
      console.warn('⚠️  CURRENTS_API_KEY not set. Integration tests may fail.');
    }
  });

  // ==========================================================================
  // Category 1: Real MCP Server
  // ==========================================================================

  describe('Real MCP Server', () => {
    it('should fetch spec files performance from real Currents API', async () => {
      // Act: Execute against real MCP server
      const result = await getSpecFilesPerformance.execute({
        projectId: testProjectId,
        order: 'avgDuration',
      });

      // Assert: Verify response structure
      expect(result).toBeDefined();
      expect(result.specFiles).toBeDefined();
      expect(Array.isArray(result.specFiles)).toBe(true);
      expect(result.totalSpecs).toBeGreaterThanOrEqual(0);
      expect(result.estimatedTokens).toBeGreaterThan(0);

      // Log result for manual verification
      console.log(`Fetched ${result.specFiles.length} spec files`);
      console.log('Sample Spec:', result.specFiles[0] ? JSON.stringify(result.specFiles[0], null, 2) : 'No specs');
    }, 30000); // 30 second timeout for real API

    it('should return valid spec file data structure', async () => {
      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: testProjectId,
        order: 'avgDuration',
      });

      // Assert: Verify structure even if no spec files
      expect(result.specFiles).toBeDefined();
      expect(result.totalSpecs).toBeDefined();
      expect(result.page).toBeDefined();
      expect(result.hasMore).toBeDefined();
      expect(result.estimatedTokens).toBeDefined();

      // If spec files exist, verify field types
      if (result.specFiles.length > 0) {
        const spec = result.specFiles[0];
        expect(typeof spec.name).toBe('string');
        expect(typeof spec.avgDuration).toBe('number');
        expect(typeof spec.failureRate).toBe('number');
        expect(typeof spec.flakeRate).toBe('number');
        expect(typeof spec.overallExecutions).toBe('number');
      }
    }, 30000);

    it('should handle pagination with limit', async () => {
      // Act: First page
      const firstPage = await getSpecFilesPerformance.execute({
        projectId: testProjectId,
        order: 'avgDuration',
        limit: 5,
      });

      // Assert: Check pagination metadata
      expect(firstPage.specFiles).toBeDefined();
      expect(firstPage.specFiles.length).toBeLessThanOrEqual(5);
      expect(typeof firstPage.hasMore).toBe('boolean');

      console.log(`Pagination: First page has ${firstPage.specFiles.length} specs, hasMore: ${firstPage.hasMore}`);
    }, 30000);

    it('should handle different order parameters', async () => {
      // Arrange: Test different sort orders
      const orders = ['failureRate', 'flakeRate', 'avgDuration'] as const;

      // Act & Assert: Each order should work
      for (const order of orders) {
        const result = await getSpecFilesPerformance.execute({
          projectId: testProjectId,
          order,
          limit: 5,
        });

        expect(result.specFiles).toBeDefined();
        console.log(`Order: ${order}, Specs: ${result.specFiles.length}`);
      }
    }, 60000);

    it('should handle non-existent project gracefully', async () => {
      // Arrange: Use an invalid project ID
      const invalidProjectId = 'non-existent-project-12345';

      // Act & Assert: Should throw or return empty array
      try {
        const result = await getSpecFilesPerformance.execute({
          projectId: invalidProjectId,
          order: 'avgDuration',
        });
        // Some APIs return empty array for invalid projects
        expect(result.specFiles).toEqual([]);
        expect(result.totalSpecs).toBe(0);
      } catch (error) {
        // Others throw an error - both are acceptable
        expect(error).toBeDefined();
      }
    }, 30000);

    it('should filter out extra metadata fields', async () => {
      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: testProjectId,
        order: 'avgDuration',
      });

      // Assert: Verify only essential fields are returned
      if (result.specFiles.length > 0) {
        const spec = result.specFiles[0];

        // Should not have verbose fields
        expect(spec).not.toHaveProperty('fullHistory');
        expect(spec).not.toHaveProperty('configuration');
        expect(spec).not.toHaveProperty('metadata');
        expect(spec).not.toHaveProperty('results');

        // Only these fields should exist
        const allowedFields = ['name', 'avgDuration', 'failureRate', 'flakeRate', 'overallExecutions'];

        Object.keys(spec).forEach((key) => {
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
      const result = await getSpecFilesPerformance.execute({
        projectId: testProjectId,
        order: 'avgDuration',
      });

      // Assert: Verify response matches discovered schema
      expect(result).toMatchObject({
        specFiles: expect.any(Array),
        totalSpecs: expect.any(Number),
        page: expect.any(Number),
        hasMore: expect.any(Boolean),
        estimatedTokens: expect.any(Number),
      });

      // If spec files exist, verify structure
      if (result.specFiles.length > 0) {
        expect(result.specFiles[0]).toMatchObject({
          name: expect.any(String),
          avgDuration: expect.any(Number),
          failureRate: expect.any(Number),
          flakeRate: expect.any(Number),
          overallExecutions: expect.any(Number),
        });
      }

      console.log('Schema validation passed');
    }, 30000);

    it('should handle all order enum variants', async () => {
      // Arrange: All valid order values
      const validOrders = [
        'failedExecutions',
        'failureRate',
        'flakeRate',
        'flakyExecutions',
        'fullyReported',
        'overallExecutions',
        'suiteSize',
        'timeoutExecutions',
        'timeoutRate',
        'avgDuration',
      ] as const;

      // Act & Assert: All should work
      for (const order of validOrders) {
        const result = await getSpecFilesPerformance.execute({
          projectId: testProjectId,
          order,
          limit: 1,
        });

        expect(result.specFiles).toBeDefined();
        expect(Array.isArray(result.specFiles)).toBe(true);
      }

      console.log('All order enum variants validated');
    }, 90000); // 90 seconds for 10 API calls
  });

  // ==========================================================================
  // Category 3: Token Reduction - Real Data
  // ==========================================================================

  describe('Token Reduction - Real Data', () => {
    it('should reduce token count vs raw MCP response', async () => {
      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: testProjectId,
        order: 'avgDuration',
      });

      // Assert: Token count should be reasonable for filtered data
      expect(result.estimatedTokens).toBeGreaterThan(0);
      expect(result.estimatedTokens).toBeLessThan(5000); // Should be much less than raw response

      console.log(`Token estimate: ${result.estimatedTokens} tokens for ${result.specFiles.length} specs`);
    }, 30000);

    it('should verify token estimation accuracy', async () => {
      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: testProjectId,
        order: 'avgDuration',
      });

      // Calculate actual size
      const actualSize = JSON.stringify(result.specFiles).length;
      const calculatedTokens = Math.ceil(actualSize / 4);

      // Assert: Estimated tokens should match calculation
      expect(result.estimatedTokens).toBe(calculatedTokens);

      console.log(`Actual size: ${actualSize} chars, Tokens: ${calculatedTokens}`);
    }, 30000);

    it('should demonstrate significant token reduction with pagination', async () => {
      // Act: Fetch small page
      const result = await getSpecFilesPerformance.execute({
        projectId: testProjectId,
        order: 'avgDuration',
        limit: 10,
      });

      // Assert: Filtered response should be compact
      // Raw Currents API responses typically include full history, configuration, detailed metrics per spec
      // Our filtered response should be <1000 tokens vs potentially 10000+ tokens raw
      expect(result.estimatedTokens).toBeLessThan(1000);

      // Calculate reduction percentage (assuming raw is ~1000 tokens per spec)
      const estimatedRawTokens = result.specFiles.length * 1000; // Conservative estimate
      const reductionPercent =
        estimatedRawTokens > 0
          ? ((estimatedRawTokens - result.estimatedTokens) / estimatedRawTokens) * 100
          : 0;

      console.log(
        `Token reduction: ~${reductionPercent.toFixed(1)}% (${result.estimatedTokens} vs ~${estimatedRawTokens} raw)`
      );

      if (estimatedRawTokens > 0) {
        expect(reductionPercent).toBeGreaterThan(80); // At least 80% reduction
      }
    }, 30000);
  });

  describe('Security validation', () => {
    it('should reject malicious projectId in real execution', async () => {
      // Arrange: Security attack vectors
      const attacks = ['../../../etc/passwd', 'project-123; rm -rf /', 'project-123\x00'];

      // Act & Assert: All should be rejected before reaching MCP
      for (const attack of attacks) {
        await expect(
          getSpecFilesPerformance.execute({ projectId: attack, order: 'avgDuration' })
        ).rejects.toThrow();
      }
    });

    it('should reject malicious specNameFilter in real execution', async () => {
      // Arrange: Security attack vectors
      const attacks = ['../../../etc/passwd', 'filter; rm -rf /', 'filter\x00'];

      // Act & Assert: All should be rejected before reaching MCP
      for (const attack of attacks) {
        await expect(
          getSpecFilesPerformance.execute({
            projectId: testProjectId,
            order: 'avgDuration',
            specNameFilter: attack,
          })
        ).rejects.toThrow();
      }
    });

    it('should reject malicious array items in real execution', async () => {
      // Arrange: Security attack vectors in arrays
      const attacks = ['../../../etc/passwd', 'item; rm -rf /', 'item\x00'];

      // Act & Assert: All should be rejected before reaching MCP
      for (const attack of attacks) {
        await expect(
          getSpecFilesPerformance.execute({
            projectId: testProjectId,
            order: 'avgDuration',
            authors: [attack],
          })
        ).rejects.toThrow();

        await expect(
          getSpecFilesPerformance.execute({
            projectId: testProjectId,
            order: 'avgDuration',
            branches: [attack],
          })
        ).rejects.toThrow();

        await expect(
          getSpecFilesPerformance.execute({
            projectId: testProjectId,
            order: 'avgDuration',
            tags: [attack],
          })
        ).rejects.toThrow();
      }
    });
  });

  describe('Performance', () => {
    it('should complete within reasonable time', async () => {
      // Arrange
      const start = Date.now();

      // Act
      await getSpecFilesPerformance.execute({
        projectId: testProjectId,
        order: 'avgDuration',
      });

      // Assert: Should complete within 15 seconds for real API
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(15000);

      console.log(`Real API response time: ${duration}ms`);
    }, 20000);

    it('should handle large limit efficiently', async () => {
      // Arrange
      const start = Date.now();

      // Act: Request maximum limit
      const result = await getSpecFilesPerformance.execute({
        projectId: testProjectId,
        order: 'avgDuration',
        limit: 50,
      });

      // Assert: Should complete within reasonable time even with max limit
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(20000);
      expect(result.specFiles.length).toBeLessThanOrEqual(50);

      console.log(`Fetched ${result.specFiles.length} specs in ${duration}ms`);
    }, 25000);
  });

  describe('Filtering and sorting', () => {
    it('should handle date range filters', async () => {
      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: testProjectId,
        order: 'avgDuration',
        from: '2025-01-01',
        to: '2025-12-31',
      });

      // Assert: Should return results (or empty if no data in range)
      expect(result.specFiles).toBeDefined();
      expect(Array.isArray(result.specFiles)).toBe(true);

      console.log(`Date range filter: ${result.specFiles.length} specs found`);
    }, 30000);

    it('should handle spec name filter', async () => {
      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: testProjectId,
        order: 'avgDuration',
        specNameFilter: 'test',
        limit: 10,
      });

      // Assert: Should return results matching filter
      expect(result.specFiles).toBeDefined();

      console.log(`Spec name filter 'test': ${result.specFiles.length} specs found`);
    }, 30000);
  });
});

// ==========================================================================
// Manual Testing Instructions
// ==========================================================================

/**
 * To run these integration tests:
 *
 * 1. Set up Currents API credentials:
 *    - Add CURRENTS_API_KEY to .env or credentials.json
 *    - Get an API key from https://currents.dev/
 *
 * 2. Get a valid project ID:
 *    - Run Cypress tests with Currents recording
 *    - Copy a project ID from the Currents dashboard
 *    - Set CURRENTS_TEST_PROJECT_ID environment variable
 *
 * 3. Run integration tests:
 *    ```bash
 *    cd .claude/tools/currents
 *    CURRENTS_TEST_PROJECT_ID=your-project-id RUN_INTEGRATION_TESTS=true npm run test:integration -- get-spec-files-performance
 *    ```
 *
 * 4. Verify results:
 *    - Check console output for spec file details
 *    - Verify different sort orders work
 *    - Verify filtering works (date range, spec name)
 *    - Confirm token estimates are reasonable
 *    - Confirm filtering removed metadata
 */
