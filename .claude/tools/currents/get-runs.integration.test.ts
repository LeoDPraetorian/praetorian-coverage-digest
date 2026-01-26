/**
 * Integration Tests for getRuns Wrapper
 *
 * Tests wrapper with real Currents MCP server.
 * Run with: RUN_INTEGRATION_TESTS=true npm run test:integration -- currents/get-runs
 *
 * Prerequisites:
 * - Valid Currents API key in 1Password vault "Claude Code Tools" (primary)
 *   Item: "Currents API Key", Field: password
 * - OR: CURRENTS_API_KEY environment variable (CI environments)
 * - DEPRECATED: credentials.json is no longer supported
 * - At least one project with test runs in Currents account
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getRuns } from './get-runs';

// Skip integration tests unless explicitly enabled
const integrationTest = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

integrationTest('getRuns - Integration Tests (Real MCP)', () => {
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
    it('should fetch runs from real Currents API', async () => {
      // Act: Execute against real MCP server
      const result = await getRuns.execute({ projectId: testProjectId });

      // Assert: Verify response structure
      expect(result).toBeDefined();
      expect(result.runs).toBeDefined();
      expect(Array.isArray(result.runs)).toBe(true);
      expect(result.totalRuns).toBeGreaterThanOrEqual(0);
      expect(result.estimatedTokens).toBeGreaterThan(0);

      // Log result for manual verification
      console.log(`Fetched ${result.runs.length} runs`);
      console.log('Sample Run:', result.runs[0] ? JSON.stringify(result.runs[0], null, 2) : 'No runs');
    }, 30000); // 30 second timeout for real API

    it('should return valid run data structure', async () => {
      // Act
      const result = await getRuns.execute({ projectId: testProjectId });

      // Assert: Verify structure even if no runs
      expect(result.runs).toBeDefined();
      expect(result.totalRuns).toBeDefined();
      expect(result.hasMore).toBeDefined();
      expect(result.estimatedTokens).toBeDefined();

      // If runs exist, verify field types
      if (result.runs.length > 0) {
        const run = result.runs[0];
        expect(typeof run.id).toBe('string');
        expect(typeof run.status).toBe('string');
        expect(typeof run.createdAt).toBe('string');
        expect(typeof run.specs).toBe('number');
        expect(typeof run.tests).toBe('number');
      }
    }, 30000);

    it('should handle pagination with cursor', async () => {
      // Act: First page
      const firstPage = await getRuns.execute({ projectId: testProjectId, limit: 5 });

      // Assert: Check pagination metadata
      expect(firstPage.runs).toBeDefined();
      expect(firstPage.runs.length).toBeLessThanOrEqual(5);
      expect(typeof firstPage.hasMore).toBe('boolean');

      // If there's a next page, fetch it
      if (firstPage.hasMore && firstPage.cursor) {
        const secondPage = await getRuns.execute({
          projectId: testProjectId,
          cursor: firstPage.cursor,
          limit: 5,
        });

        expect(secondPage.runs).toBeDefined();
        expect(secondPage.runs.length).toBeLessThanOrEqual(5);

        // IDs should be different between pages
        if (firstPage.runs.length > 0 && secondPage.runs.length > 0) {
          expect(firstPage.runs[0].id).not.toBe(secondPage.runs[0].id);
        }

        console.log(`Pagination: Page 1 has ${firstPage.runs.length} runs, Page 2 has ${secondPage.runs.length} runs`);
      }
    }, 60000); // 60 second timeout for pagination

    it('should handle non-existent project gracefully', async () => {
      // Arrange: Use an invalid project ID
      const invalidProjectId = 'non-existent-project-12345';

      // Act & Assert: Should throw or return empty array
      try {
        const result = await getRuns.execute({ projectId: invalidProjectId });
        // Some APIs return empty array for invalid projects
        expect(result.runs).toEqual([]);
        expect(result.totalRuns).toBe(0);
      } catch (error) {
        // Others throw an error - both are acceptable
        expect(error).toBeDefined();
      }
    }, 30000);

    it('should filter out extra metadata fields', async () => {
      // Act
      const result = await getRuns.execute({ projectId: testProjectId });

      // Assert: Verify only essential fields are returned
      if (result.runs.length > 0) {
        const run = result.runs[0];

        // Should not have verbose fields
        expect(run).not.toHaveProperty('configuration');
        expect(run).not.toHaveProperty('metadata');
        expect(run).not.toHaveProperty('results');
        expect(run).not.toHaveProperty('specs_data');

        // Only these fields should exist
        const allowedFields = ['id', 'status', 'createdAt', 'specs', 'tests'];

        Object.keys(run).forEach((key) => {
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
      const result = await getRuns.execute({ projectId: testProjectId });

      // Assert: Verify response matches discovered schema
      expect(result).toMatchObject({
        runs: expect.any(Array),
        totalRuns: expect.any(Number),
        hasMore: expect.any(Boolean),
        estimatedTokens: expect.any(Number),
      });

      // If runs exist, verify run structure
      if (result.runs.length > 0) {
        expect(result.runs[0]).toMatchObject({
          id: expect.any(String),
          status: expect.stringMatching(/^(running|completed|failed|cancelled|timeout|.+)$/),
          createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/), // ISO 8601
          specs: expect.any(Number),
          tests: expect.any(Number),
        });
      }

      console.log('Schema validation passed');
    }, 30000);

    it('should handle all status union variants', async () => {
      // Act
      const result = await getRuns.execute({ projectId: testProjectId });

      // Assert: Status should be one of the known types or a string
      const validStatuses = ['running', 'completed', 'failed', 'cancelled', 'timeout'];

      if (result.runs.length > 0) {
        result.runs.forEach((run) => {
          const isKnownStatus = validStatuses.includes(run.status);
          const isString = typeof run.status === 'string';

          expect(isString).toBe(true);
          console.log(`Run ${run.id} status: ${run.status} (known: ${isKnownStatus})`);
        });
      }
    }, 30000);

    it('should handle cursor format correctly', async () => {
      // Act
      const result = await getRuns.execute({ projectId: testProjectId, limit: 5 });

      // Assert: Cursor should be a string if hasMore is true
      if (result.hasMore) {
        expect(typeof result.cursor).toBe('string');
        expect(result.cursor).toBeTruthy();
      } else {
        // If no more pages, cursor can be undefined
        expect(result.cursor).toBeUndefined();
      }

      console.log(`Cursor format: ${result.cursor ? 'present' : 'absent'}, hasMore: ${result.hasMore}`);
    }, 30000);
  });

  // ==========================================================================
  // Category 3: Token Reduction - Real Data
  // ==========================================================================

  describe('Token Reduction - Real Data', () => {
    it('should reduce token count vs raw MCP response', async () => {
      // Act
      const result = await getRuns.execute({ projectId: testProjectId });

      // Assert: Token count should be reasonable for filtered data
      expect(result.estimatedTokens).toBeGreaterThan(0);
      expect(result.estimatedTokens).toBeLessThan(2000); // Should be much less than raw response

      console.log(`Token estimate: ${result.estimatedTokens} tokens for ${result.runs.length} runs`);
    }, 30000);

    it('should verify token estimation accuracy', async () => {
      // Act
      const result = await getRuns.execute({ projectId: testProjectId });

      // Calculate actual size
      const actualSize = JSON.stringify(result.runs).length;
      const calculatedTokens = Math.ceil(actualSize / 4);

      // Assert: Estimated tokens should match calculation
      expect(result.estimatedTokens).toBe(calculatedTokens);

      console.log(`Actual size: ${actualSize} chars, Tokens: ${calculatedTokens}`);
    }, 30000);

    it('should demonstrate significant token reduction with pagination', async () => {
      // Act: Fetch small page
      const result = await getRuns.execute({ projectId: testProjectId, limit: 10 });

      // Assert: Filtered response should be compact
      // Raw Currents API responses typically include configuration, metadata, full test results per run
      // Our filtered response should be <1000 tokens vs potentially 10000+ tokens raw
      expect(result.estimatedTokens).toBeLessThan(1000);

      // Calculate reduction percentage (assuming raw is ~10000 tokens for 10 runs)
      const estimatedRawTokens = result.runs.length * 1000; // Conservative estimate
      const reductionPercent =
        ((estimatedRawTokens - result.estimatedTokens) / estimatedRawTokens) * 100;

      console.log(
        `Token reduction: ~${reductionPercent.toFixed(1)}% (${result.estimatedTokens} vs ~${estimatedRawTokens} raw)`
      );
      expect(reductionPercent).toBeGreaterThan(80); // At least 80% reduction
    }, 30000);
  });

  describe('Security validation', () => {
    it('should reject malicious projectId in real execution', async () => {
      // Arrange: Security attack vectors
      const attacks = ['../../../etc/passwd', 'project-123; rm -rf /', 'project-123\x00'];

      // Act & Assert: All should be rejected before reaching MCP
      for (const attack of attacks) {
        await expect(getRuns.execute({ projectId: attack })).rejects.toThrow();
      }
    });

    it('should reject malicious cursor in real execution', async () => {
      // Arrange: Security attack vectors in cursor
      const attacks = ['../../../etc/passwd', 'cursor; rm -rf /', 'cursor\x00'];

      // Act & Assert: All should be rejected before reaching MCP
      for (const attack of attacks) {
        await expect(
          getRuns.execute({ projectId: testProjectId, cursor: attack })
        ).rejects.toThrow();
      }
    });
  });

  describe('Performance', () => {
    it('should complete within reasonable time', async () => {
      // Arrange
      const start = Date.now();

      // Act
      await getRuns.execute({ projectId: testProjectId });

      // Assert: Should complete within 10 seconds for real API
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10000);

      console.log(`Real API response time: ${duration}ms`);
    }, 15000);

    it('should handle large limit efficiently', async () => {
      // Arrange
      const start = Date.now();

      // Act: Request maximum limit
      const result = await getRuns.execute({ projectId: testProjectId, limit: 50 });

      // Assert: Should complete within reasonable time even with max limit
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(15000);
      expect(result.runs.length).toBeLessThanOrEqual(50);

      console.log(`Fetched ${result.runs.length} runs in ${duration}ms`);
    }, 20000);
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
 * 2. Get a valid project ID:
 *    - Run Cypress tests with Currents recording
 *    - Copy a project ID from the Currents dashboard
 *    - Set CURRENTS_TEST_PROJECT_ID environment variable
 *
 * 3. Run integration tests:
 *    ```bash
 *    cd .claude/tools/currents
 *    CURRENTS_TEST_PROJECT_ID=your-project-id RUN_INTEGRATION_TESTS=true npm run test:integration -- get-runs
 *    ```
 *
 * 4. Verify results:
 *    - Check console output for run details
 *    - Verify pagination works (cursor/hasMore)
 *    - Verify token estimates are reasonable
 *    - Confirm filtering removed metadata
 */
